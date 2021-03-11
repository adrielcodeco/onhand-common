import * as cdk from '@aws-cdk/core'
import * as apigateway from '@aws-cdk/aws-apigateway'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import Container, { Service } from 'typedi'
import { OpenAPIV3 } from 'openapi-types'
import { Options, resourceName } from '#/app/options'
import { isHttpMethod, manageFunctionMetadata } from '@onhand/openapi'

type FunctionsType = Array<{ function: lambda.Function, functionName: string }>

@Service()
export class ApiGatewayStack extends cdk.Stack {
  private readonly options: Options
  private readonly openapi: OpenAPIV3.Document
  private readonly bucket?: s3.IBucket
  private readonly functions: FunctionsType
  private apiResource!: apigateway.IResource
  private apiGatewayRole!: iam.Role
  private api!: apigateway.RestApi
  private readonly authorizers = new Map<string, apigateway.IAuthorizer>()

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to apigateway stack
    super(scope, resourceName(options, 'apigateway'), {
      description: '',
      env: {
        account: options.awsAccount,
        region: options.awsRegion,
      },
    })

    this.options = options
    this.openapi = Container.get<OpenAPIV3.Document>('openapi')
    this.functions = Container.get<FunctionsType>('functions')
    const s3AssetsArn = Container.get<string>('s3-api')
    this.bucket = s3.Bucket.fromBucketArn(
      this,
      resourceName(this.options, 's3-api', true),
      s3AssetsArn,
    )

    this.createRole()
    this.createApiGateway()
    this.createAuthorizerFunction()
    this.createRoutes()
  }

  private createRole () {
    this.apiGatewayRole = new iam.Role(
      this,
      resourceName(this.options, 'api-authorizer-Role'),
      {
        assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      },
    )
  }

  private createApiGateway () {
    const restApiName = resourceName(this.options, 'api')
    this.api = new apigateway.RestApi(this, restApiName, {
      restApiName,
      deployOptions: {
        stageName: this.options.stage,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        dataTraceEnabled: true,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.EDGE],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })
    Container.set('restApi', this.api)
    Container.set('restApiId', this.api.restApiId)

    this.apiResource = this.api.root

    const apiIdExportName = resourceName(this.options, 'api-Id')
    const apiRootResourceIdExportName = resourceName(
      this.options,
      'api-rootResourceId',
    )
    // eslint-disable-next-line no-new
    new cdk.CfnOutput(this, apiIdExportName, {
      value: this.api.restApiId,
      exportName: apiIdExportName,
    })
    // eslint-disable-next-line no-new
    new cdk.CfnOutput(this, apiRootResourceIdExportName, {
      value: this.api.restApiRootResourceId,
      exportName: apiRootResourceIdExportName,
    })
  }

  private createAuthorizerFunction () {
    for (const secKey in this.openapi.components?.securitySchemes ?? {}) {
      if (
        !Object.prototype.hasOwnProperty.call(
          this.openapi.components?.securitySchemes!,
          secKey,
        )
      ) {
        continue
      }
      const sec = this.openapi.components?.securitySchemes![secKey]
      const { className, handlerName } = manageFunctionMetadata(sec).get()
      const handler = `index.${handlerName}`
      const functionName = className
      const authorizerFunc = new lambda.Function(
        this,
        resourceName(this.options, functionName),
        {
          handler,
          runtime: lambda.Runtime.NODEJS_12_X,
          description: `deployed on: ${new Date().toISOString()}`,
          functionName: resourceName(this.options, functionName),
          code: lambda.Code.fromBucket(
            this.bucket!,
            `${this.options.packageName ?? ''}-${
              this.options.packageVersion ?? ''
            }/${functionName}.zip`,
            undefined,
          ),
          currentVersionOptions: {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            retryAttempts: 1,
          },
          memorySize: 128,
          reservedConcurrentExecutions: undefined,
          timeout: cdk.Duration.seconds(10),
        },
      )
      this.createAuthAuthorizers(className, authorizerFunc)
    }
  }

  private createAuthAuthorizers (
    authorizer: string,
    authorizerFunction: lambda.Function,
  ) {
    const authorizerName = resourceName(
      this.options,
      `authorizer-${authorizer}`,
    )
    const auth = new apigateway.RequestAuthorizer(this, authorizerName, {
      handler: authorizerFunction,
      identitySources: [
        apigateway.IdentitySource.header('Authorization'),
        apigateway.IdentitySource.header('scope'),
        apigateway.IdentitySource.header('deviceId'),
      ],
      assumeRole: this.apiGatewayRole,
      authorizerName,
      resultsCacheTtl: cdk.Duration.seconds(300),
    })
    this.authorizers.set(authorizer, auth)
  }

  private createRoutes () {
    for (const routePath in this.openapi.paths) {
      if (
        !Object.prototype.hasOwnProperty.call(this.openapi.paths, routePath)
      ) {
        continue
      }
      let parentResource: apigateway.IResource = this.apiResource
      const parts = routePath.split('/').filter(p => !!p)
      for (const part of parts) {
        const resourceFound = parentResource.getResource(part)
        if (resourceFound) {
          parentResource = resourceFound
        } else {
          parentResource = this.addResource(parentResource, part)
        }
      }
      const pathObject = this.openapi.paths[routePath]
      for (const method in pathObject) {
        if (!Object.prototype.hasOwnProperty.call(pathObject, method)) {
          continue
        }
        if (!isHttpMethod(method)) {
          continue
        }
        const operation: OpenAPIV3.OperationObject = pathObject[method]!
        if (!operation.operationId) {
          throw new Error('invalid operationId')
        }
        const authorizer = operation.security
          ? ((Reflect.ownKeys(operation.security) || [''])[0] as string)
          : ''
        this.addMethod(
          parentResource,
          method,
          operation.operationId,
          authorizer,
        )
      }
    }
  }

  private addResource (resource: apigateway.IResource, name: string) {
    return resource.addResource(name)
  }

  private addMethod (
    resource: apigateway.IResource,
    method: string,
    functionName: string,
    authorizer: string,
  ) {
    const routeLambda = this.functions.find(
      f => f.functionName === functionName,
    )!
    resource.addMethod(
      method,
      new apigateway.LambdaIntegration(routeLambda.function, {
        proxy: true,
        allowTestInvoke: false,
      }),
      {
        operationName: functionName,
        authorizationType: authorizer
          ? apigateway.AuthorizationType.CUSTOM
          : undefined,
        authorizer: authorizer ? this.authorizers.get(authorizer) : undefined,
      },
    )
  }
}