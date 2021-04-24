import { assert } from 'console'
import { validate } from 'class-validator'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { Operation } from '@onhand/common-controller/#/operation'
import { container } from '@onhand/common-business/#/ioc/container'
import {
  AFunction,
  HttpMethods,
} from '@onhand/common-framework/#/infrastructure/aFunction'
import { Unauthorized, UnprocessableEntity } from '@onhand/jsend'
import { manageParameterMetadata } from '@onhand/openapi'
import { Ctor } from '@onhand/utils'
import { ACRule } from '@onhand/accesscontrol'
// eslint-disable-next-line max-len
import { CheckGrantUseCase } from '@onhand/common-business-aws/#/useCases/accessControl/checkGrantUseCase'
import { AWSFunctionContainerContext } from '#/infrastructure/awsFunctionContainerContext'
import { AWSFunctionHandleContext } from '#/infrastructure/awsFunctionHandleContext'
import { Output } from '#/infrastructure/apigateway/apigatewayOutput'
import { CORS } from '#/infrastructure/apigateway/apigatewayCORS'
import { Ownership } from '@onhand/common-business/#/ownership'
import { UserContext } from '@onhand/common-business/#/dto/userContext'

export type AWSFunctionOptions = {
  permissions?: ACRule[]
  authenticated?: boolean
}

type E = APIGatewayProxyEvent

export abstract class ApiGatewayFunction extends AFunction {
  abstract get inputAdapterType (): any
  abstract get operation (): Ctor<Operation>

  permissions?: ACRule[]
  authenticated?: boolean
  httpMethod: HttpMethods = HttpMethods.GET
  ownership?: Ctor<Ownership<any>>

  constructor (
    private readonly options: AWSFunctionOptions,
    private containerContextInitialization: AWSFunctionContainerContext,
    private handleContextInitialization: AWSFunctionHandleContext<E>,
  ) {
    super()
    this.options = this.options ?? {}
    if (this.permissions) {
      this.options.permissions = this.permissions
    }
    if (this.authenticated) {
      this.options.authenticated = this.authenticated
    }
    if (
      Reflect.has(this.options, 'authenticated') &&
      typeof this.options.authenticated === 'boolean'
    ) {
      this.handleContextInitialization.options.authenticated = options.authenticated!
    }
  }

  protected async inputAdapter (event: E): Promise<any> {
    const input: any = {}
    const InputAdapterType = this.inputAdapterType
    const parameterMetadata = manageParameterMetadata(this).get()
    if (parameterMetadata?.body) {
      Object.assign(input, event.body)
    }
    if (parameterMetadata?.query) {
      Object.assign(
        input,
        event.queryStringParameters,
        event.multiValueQueryStringParameters,
      )
    }
    if (parameterMetadata?.path) {
      Object.assign(input, event.pathParameters)
    }
    if (parameterMetadata?.cookie) {
      // TODO: implement cookie parameters
    }
    const inputAdapter = new InputAdapterType()
    Object.assign(inputAdapter, input)
    const errors = await validate(inputAdapter, {
      skipUndefinedProperties: false,
      skipNullProperties: false,
      skipMissingProperties: false,
      forbidUnknownValues: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
    if (errors?.length) {
      throw UnprocessableEntity(
        errors.map(i => ({
          property: i.property,
          constraints: i.constraints,
        })),
      )
    }
    return inputAdapter
  }

  public async init (): Promise<void> {
    try {
      if (!this.containerContextInitialization) {
        this.containerContextInitialization = container.resolve(
          AWSFunctionContainerContext,
        )
      }
      await this.containerContextInitialization.init()
      if (!this.handleContextInitialization) {
        this.handleContextInitialization = container.resolve(
          AWSFunctionHandleContext,
        )
        if (
          Reflect.has(this.options, 'authenticated') &&
          typeof this.options.authenticated === 'boolean'
        ) {
          this.handleContextInitialization.options.authenticated = this.options.authenticated
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  public async handle (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> {
    assert(this.operation)
    try {
      await this.handleContextInitialization.init(event)
      const input = await this.inputAdapter(event)
      let hasOwnership = false
      if (this.authenticated && this.permissions?.length) {
        const role = event.requestContext.authorizer?.userRole
        let granted = !!role
        if (granted) {
          const checkGrantUseCase = container.resolve(CheckGrantUseCase)
          granted &&= await checkGrantUseCase.exec({
            role,
            rules: this.permissions,
            ownership: async (): Promise<boolean> => {
              if (!this.ownership) {
                return false
              }
              const ownership = container.resolve<Ownership<any>>(
                this.ownership,
              )
              hasOwnership = !!ownership
              return (
                !!ownership &&
                ownership.owner(
                  input,
                  event.requestContext.authorizer as UserContext,
                )
              )
            },
          })
        }
        if (!granted) {
          if (
            !hasOwnership &&
            this.permissions?.find(p => p.possession === 'own')
          ) {
            console.error(
              'this request have an "own" possession for some permission ' +
                ' but the handle not have an ownership implementation,' +
                ' maybe its need an ownership implementation',
            )
          }
          throw Unauthorized("You don't have permission to execute this action")
        }
      }
      const operation = container.resolve<Operation>(this.operation)
      const result = await operation.run(input)
      const headers = {}
      CORS(event.headers, headers)
      return Output(result, headers)
    } catch (err) {
      return Output(err)
    }
  }
}
