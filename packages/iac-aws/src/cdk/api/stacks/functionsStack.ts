import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as s3 from '@aws-cdk/aws-s3'
// import path from 'path'
import { Container } from 'typedi'
import { OpenAPIV3 } from 'openapi-types'
import { Options, resourceName } from '#/app/options'
import { isHttpMethod, manageFunctionMetadata } from '@onhand/openapi'

export class FunctionsStack extends cdk.Stack {
  private readonly options: Options
  private readonly openapi: OpenAPIV3.Document
  private readonly bucket?: s3.IBucket

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to function stack
    super(scope, resourceName(options, 'functions', true), {
      description: '',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
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
    this.createSeedFunction()
  }

  private createFunctions () {
    const functions = []
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
        } = manageFunctionMetadata(operation).get()
        // const { appSrcDir } = this.options
        // const fileExt = path.extname(absoluteFilePath)
        // const fileName = path.basename(absoluteFilePath, fileExt)
        // const fileDir = path.dirname(absoluteFilePath)
        // const srcRelativeFilePath = path.relative(appSrcDir, fileDir)
        // const handler = `${srcRelativeFilePath}/${fileName}.${handlerName}`
        const handler = `index.${handlerName}`
        const functionName = operationId ?? className
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
          memorySize: 256,
          reservedConcurrentExecutions: undefined,
          timeout: cdk.Duration.minutes(15),
        })
        if (this.options.packageVersion) {
          func.currentVersion.addAlias(
            this.options.packageVersion.replace(/\./g, '_'),
          )
        }
        functions.push({ function: func, functionName })
      }
    }
    Container.set('functions', functions)
  }

  private createSeedFunction () {
    const functionName = 'seedFunction'
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
