import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as s3 from '@aws-cdk/aws-s3'
import path from 'path'
import { Container } from 'typedi'
import { OpenAPIV3 } from 'openapi-types'
import { Options, resourceName } from '#/app/options'
import { isHttpMethod, manageFunctionMetadata } from '@onhand/openapi'

export class FunctionsStack extends cdk.Stack {
  private readonly options: Options
  private readonly openapi: OpenAPIV3.Document
  private readonly bucket?: s3.IBucket

  constructor (scope: cdk.Construct, appName: string, stage: string) {
    // TODO: add description to function stack
    super(scope, resourceName(appName, 'functions'), {
      description: '',
    })

    this.options = Container.get<Options>('options')
    this.openapi = Container.get<OpenAPIV3.Document>('openapi')
    const s3AssetsArn = Container.get<string>('s3-assets')
    this.bucket = s3.Bucket.fromBucketArn(
      this,
      resourceName(this.options.appName, 'assets'),
      s3AssetsArn,
    )

    this.createFunctions()
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
          functionFileAbsolutePath: absoluteFilePath,
          className,
          handlerName,
        } = manageFunctionMetadata(operation).get()
        const { appSrcDir } = this.options
        const fileExt = path.extname(absoluteFilePath)
        const fileName = path.basename(absoluteFilePath, fileExt)
        const fileDir = path.dirname(absoluteFilePath)
        const srcRelativeFilePath = path.relative(appSrcDir, fileDir)
        const handler = `${srcRelativeFilePath}/${fileName}.${handlerName}`
        const functionName = operationId ?? className
        const func = new lambda.Function(
          this,
          `func-${this.options.stage}-${functionName}`,
          {
            handler,
            runtime: lambda.Runtime.NODEJS_12_X,
            description,
            functionName,
            code: lambda.Code.fromBucket(
              this.bucket!,
              `${this.options.packageName ?? ''}-${
                this.options.packageVersion ?? ''
              }.zip`,
              undefined,
            ),
            currentVersionOptions: {
              removalPolicy: cdk.RemovalPolicy.RETAIN,
              retryAttempts: 1,
            },
            memorySize: 256,
            reservedConcurrentExecutions: undefined,
            timeout: undefined,
          },
        )
        functions.push({ function: func, functionName })
      }
    }
    Container.set('functions', functions)
  }
}
