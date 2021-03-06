import * as cdk from '@aws-cdk/core'
import * as apigateway from '@aws-cdk/aws-apigateway'
import * as lambda from '@aws-cdk/aws-lambda'
import * as cr from '@aws-cdk/custom-resources'
import * as iam from '@aws-cdk/aws-iam'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as route53 from '@aws-cdk/aws-route53'
import * as targets from '@aws-cdk/aws-route53-targets'
import Container, { Service } from 'typedi'
import { OpenAPIV3 } from 'openapi-types'
import { Options, resourceName } from '#/app/options'
import { isHttpMethod, manageFunctionMetadata } from '@onhand/openapi'

@Service()
export class ApiGatewayStack extends cdk.Stack {
  private readonly options: Options
  private readonly openapi: OpenAPIV3.Document
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

    this.createRole()
    this.createApiGateway()
    this.createAuthorizerFunction()
    this.createRoutes()
    this.updateRoute53Records()
    if (this.options.stage === 'prd') {
      this.disableApigatewayDefaultEndpoint()
    }
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
    const domainNamePart: any = {}
    if (this.options.config?.cloudFront?.api?.domainName) {
      const certificateArn = ` arn:aws:acm:us-east-1:${
        this.account
      }:certificate/${
        this.options.config?.cloudFront?.api?.certificateId ?? ''
      }`
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        resourceName(this.options, 'cert'),
        certificateArn,
      )
      domainNamePart.domainName = {
        domainName: this.options.config?.cloudFront?.api?.domainName,
        certificate: certificate,
        endpointType: apigateway.EndpointType.EDGE,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      }
    }

    const restApiName = resourceName(this.options, 'api')
    this.api = new apigateway.RestApi(this, restApiName, {
      restApiName,
      deployOptions: {
        stageName: this.options.stage,
        variables: {
          stage: this.options.stage,
        },
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        dataTraceEnabled: true,
      },
      ...domainNamePart,
      endpointConfiguration: {
        types: [apigateway.EndpointType.EDGE],
      },
      defaultCorsPreflightOptions: {
        allowCredentials:
          this.options.config?.apiGateway?.accessControlAllowCredentials ===
          undefined
            ? true
            : this.options.config?.apiGateway?.accessControlAllowCredentials,
        allowOrigins:
          this.options.config?.apiGateway?.accessControlAllowOrigin ??
          apigateway.Cors.ALL_ORIGINS,
        allowMethods:
          this.options.config?.apiGateway?.accessControlAllowMethods ??
          apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(
          this.options.config?.apiGateway?.accessControlAllowHeaders ?? [],
        ),
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
      const { className } = manageFunctionMetadata(sec).get()
      const functionName = className
      const authorizerFunc = lambda.Function.fromFunctionArn(
        this,
        resourceName(this.options, functionName),
        `arn:aws:lambda:${this.region}:${this.account}:function:${resourceName(
          this.options,
          functionName,
          true,
        )}`,
      )
      this.createAuthAuthorizers(className, authorizerFunc)
    }
  }

  private createAuthAuthorizers (
    authorizer: string,
    authorizerFunction: lambda.IFunction,
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
    const routeLambda = lambda.Function.fromFunctionArn(
      this,
      `func-${functionName}`,
      `arn:aws:lambda:${this.region}:${this.account}:function:${resourceName(
        this.options,
        functionName,
        true,
      )}`,
    )
    resource.addMethod(
      method,
      new apigateway.LambdaIntegration(routeLambda, {
        proxy: true,
        allowTestInvoke: true,
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

  private disableApigatewayDefaultEndpoint () {
    const executeApi = resourceName(this.options, 'api-execute-api-resource')
    const executeApiResource = new cr.AwsCustomResource(this, executeApi, {
      functionName: 'disable-execute-api-endpoint',
      onCreate: {
        service: 'APIGateway',
        action: 'updateRestApi',
        parameters: {
          restApiId: this.api.restApiId,
          patchOperations: [
            {
              op: 'replace',
              path: '/disableExecuteApiEndpoint',
              value: 'True',
            },
          ],
        },
        physicalResourceId: cr.PhysicalResourceId.of(executeApi),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['apigateway:PATCH'],
          resources: ['arn:aws:apigateway:*::/*'],
        }),
      ]),
    })
    executeApiResource.node.addDependency(this.api)
  }

  private updateRoute53Records () {
    if (this.options.config?.cloudFront?.api?.zoneName) {
      const zone = route53.PublicHostedZone.fromLookup(
        this,
        resourceName(this.options, 'hz-api'),
        {
          domainName: this.options.config?.cloudFront?.api?.zoneName,
        },
      )
      // eslint-disable-next-line no-new
      new route53.ARecord(
        this,
        resourceName(this.options, 'domain-record-api'),
        {
          zone: zone,
          recordName: this.options.config?.cloudFront?.api?.domainName,
          target: route53.RecordTarget.fromAlias(
            new targets.ApiGateway(this.api),
          ),
          ttl: cdk.Duration.seconds(300),
        },
      )
    }
  }
}
