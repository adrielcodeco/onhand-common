/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as s3 from '@aws-cdk/aws-s3'
// import path from 'path'
import * as iam from '@aws-cdk/aws-iam'
import * as logs from '@aws-cdk/aws-logs'
import { Container } from 'typedi'
import { OpenAPIV3 } from 'openapi-types'
import { Options, resourceName } from '#/app/options'
import {
  isHttpMethod,
  manageFunctionMetadata,
  FunctionMetadata,
} from '@onhand/openapi'
// eslint-disable-next-line max-len
import {
  PoliciesMetadata,
  Policy,
} from '@onhand/common-framework-aws/#/infrastructure/apigateway/metadata/policiesMetadata'

export class FunctionsStack extends cdk.Stack {
  private readonly options: Options
  private readonly openapi: OpenAPIV3.Document
  private readonly bucket?: s3.IBucket

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to function stack
    super(scope, resourceName(options, 'functions', true), {
      description: '',
      env: {
        account: options.awsAccount,
        region: options.awsRegion,
      },
    })

    this.options = options
    this.openapi = Container.get<OpenAPIV3.Document>('openapi')
    const s3AssetsArn = Container.get<string>('s3-api')
    this.bucket = s3.Bucket.fromBucketArn(
      this,
      resourceName(this.options, 's3-api', true),
      s3AssetsArn,
    )

    this.createFunctions()
    this.createAuthorizerFunctions()
    this.createSeedFunction()
  }

  private createFunctions () {
    for (const routePath in this.openapi.paths) {
      if (
        !Object.prototype.hasOwnProperty.call(this.openapi.paths, routePath)
      ) {
        continue
      }
      const pathItemObject: OpenAPIV3.PathItemObject = this.openapi.paths[
        routePath
      ]!
      for (const method in pathItemObject) {
        if (!Object.prototype.hasOwnProperty.call(pathItemObject, method)) {
          continue
        }
        if (!isHttpMethod(method)) {
          continue
        }
        const operation: OpenAPIV3.OperationObject = pathItemObject[method]!
        const { operationId, description } = operation
        const {
          // functionFileAbsolutePath: absoluteFilePath,
          className,
          handlerName,
          policies,
        } = manageFunctionMetadata<FunctionMetadata & PoliciesMetadata>(
          operation,
        ).get()
        // const { appSrcDir } = this.options
        // const fileExt = path.extname(absoluteFilePath)
        // const fileName = path.basename(absoluteFilePath, fileExt)
        // const fileDir = path.dirname(absoluteFilePath)
        // const srcRelativeFilePath = path.relative(appSrcDir, fileDir)
        // const handler = `${srcRelativeFilePath}/${fileName}.${handlerName}`
        const handler = `index.${handlerName}`
        const functionName = operationId ?? className
        const lambdaRole = new iam.Role(this, `func-${functionName}-role`, {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        })
        const logPolicy: Policy = {
          inlinePolicy: {
            actions: ['logs:*'],
            effect: 'Allow',
            resources: [
              `arn:aws:logs:${this.region}:${
                this.account
              }:log-group:/aws/lambda/${resourceName(
                this.options,
                functionName,
                true,
              )}:*`,
            ],
          },
        }
        for (const policy of (policies ?? []).concat([logPolicy])) {
          if ('managedPolicy' in policy) {
            lambdaRole.addManagedPolicy(
              iam.ManagedPolicy.fromAwsManagedPolicyName(policy.managedPolicy),
            )
          }
          if ('inlinePolicy' in policy) {
            lambdaRole.attachInlinePolicy(
              new iam.Policy(
                this,
                `policy-${functionName}-${policies.indexOf(policy)}`,
                {
                  document: new iam.PolicyDocument({
                    statements: [
                      new iam.PolicyStatement({
                        actions: policy.inlinePolicy.actions,
                        effect: policy.inlinePolicy.effect as any,
                        resources: policy.inlinePolicy.resources,
                      }),
                    ],
                  }),
                },
              ),
            )
          }
        }
        const func = new lambda.Function(this, `func-${functionName}`, {
          handler,
          runtime: lambda.Runtime.NODEJS_12_X,
          description: `${description} - deployed on: ${new Date().toISOString()}`,
          functionName: resourceName(this.options, functionName, true),
          code: lambda.Code.fromBucket(
            this.bucket!,
            `${this.options.packageName ?? ''}-${
              this.options.packageVersion ?? ''
            }/${functionName}.zip`,
            undefined,
          ),
          currentVersionOptions: {
            description: this.options.packageVersion,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            retryAttempts: 1,
          },
          environment: {
            STAGE: this.options.stage,
          },
          logRetention: logs.RetentionDays.ONE_WEEK,
          role: lambdaRole,
          memorySize: 256,
          reservedConcurrentExecutions: undefined,
          timeout: cdk.Duration.minutes(15),
        })
        if (this.options.packageVersion) {
          func.currentVersion.addAlias(
            this.options.packageVersion.replace(/\./g, '_'),
          )
        }
      }
    }
  }

  private createAuthorizerFunctions () {
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
      const { className, handlerName, policies } = manageFunctionMetadata<
      FunctionMetadata & PoliciesMetadata
      >(sec).get()
      const handler = `index.${handlerName}`
      const functionName = className
      const lambdaRole = new iam.Role(this, `func-${functionName}-role`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      })
      const logPolicy: Policy = {
        inlinePolicy: {
          actions: ['logs:*'],
          effect: 'Allow',
          resources: [
            `arn:aws:logs:${this.region}:${
              this.account
            }:log-group:/aws/lambda/${resourceName(
              this.options,
              functionName,
              true,
            )}:*`,
          ],
        },
      }
      for (const policy of (policies ?? []).concat([logPolicy])) {
        if ('managedPolicy' in policy) {
          lambdaRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(policy.managedPolicy),
          )
        }
        if ('inlinePolicy' in policy) {
          lambdaRole.attachInlinePolicy(
            new iam.Policy(
              this,
              `policy-${functionName}-${policies.indexOf(policy)}`,
              {
                document: new iam.PolicyDocument({
                  statements: [
                    new iam.PolicyStatement({
                      actions: policy.inlinePolicy.actions,
                      effect: policy.inlinePolicy.effect as any,
                      resources: policy.inlinePolicy.resources,
                    }),
                  ],
                }),
              },
            ),
          )
        }
      }
      new lambda.Function(this, resourceName(this.options, functionName), {
        handler,
        runtime: lambda.Runtime.NODEJS_12_X,
        description: `deployed on: ${new Date().toISOString()}`,
        functionName: resourceName(this.options, functionName, true),
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
        environment: {
          STAGE: this.options.stage,
        },
        role: lambdaRole,
        memorySize: 128,
        reservedConcurrentExecutions: undefined,
        timeout: cdk.Duration.seconds(10),
      })
    }
  }

  private createSeedFunction () {
    const functionName = 'onhand-seed-function'
    const lambdaARole = new iam.Role(this, `func-${functionName}-role`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })
    lambdaARole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
    )
    lambdaARole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
    )
    const func = new lambda.Function(this, `func-${functionName}`, {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      description: `seeds the database - deployed on: ${new Date().toISOString()}`,
      functionName: resourceName(this.options, functionName, true),
      code: lambda.Code.fromBucket(
        this.bucket!,
        `${this.options.packageName ?? ''}-${
          this.options.packageVersion ?? ''
        }/${functionName}.zip`,
        undefined,
      ),
      currentVersionOptions: {
        description: this.options.packageVersion,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        retryAttempts: 1,
      },
      environment: {
        STAGE: this.options.stage,
      },
      role: lambdaARole,
      memorySize: 256,
      reservedConcurrentExecutions: undefined,
      timeout: cdk.Duration.minutes(15),
    })
    if (this.options.packageVersion) {
      func.currentVersion.addAlias(
        this.options.packageVersion.replace(/\./g, '_'),
      )
    }
    Container.set(`${functionName}Arn`, func.functionArn)
  }
}
