/* eslint-disable no-new */
// import path from 'path'
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
// import * as s3 from '@aws-cdk/aws-s3'
// import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
import { Container } from 'typedi'
import { Options, resourceName } from '#/app/options'
// import { getConfigOrDefault } from '#/app/config'

export class DeployStack extends cdk.Stack {
  private readonly options: Options

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to cognito stack
    super(scope, resourceName(options, 'deploy-api'), {
      description: '',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    })

    this.options = options

    this.sow()
  }

  // private deployment () {
  //   const s3ApiArn = Container.get<string>('s3-api')
  //   const bucket = s3.Bucket.fromBucketArn(
  //     this,
  //     resourceName(this.options, 'api'),
  //     s3ApiArn,
  //   )

  //   const distributionIdExportName = resourceName(
  //     this.options,
  //     'api-distributionId',
  //   )
  //   const distributionDomainNameExportName = resourceName(
  //     this.options,
  //     'api-distributionDomainName',
  //   )
  //   const distribution = cloudfront.CloudFrontWebDistribution.fromDistributionAttributes(
  //     this,
  //     resourceName(this.options, 'dist-api'),
  //     {
  //       distributionId: cdk.Fn.importValue(distributionIdExportName),
  //       domainName: cdk.Fn.importValue(distributionDomainNameExportName),
  //     },
  //   )

  //   const buildOutput = getConfigOrDefault(
  //     this.options.config,
  //     c => c?.build?.outputFolder,
  //   )
  //   new s3Deployment.BucketDeployment(
  //     this,
  //     resourceName(this.options, 'api-deployment'),
  //     {
  //       sources: [
  //         s3Deployment.Source.asset(
  //           path.resolve(this.options.cwd, buildOutput!),
  //         ),
  //       ],
  //       destinationBucket: bucket,
  //       distribution: distribution,
  //       retainOnDelete: false,
  //     },
  //   )
  // }

  private sow () {
    const functionName = 'seedFunction'
    const functionArn = Container.get<string>(`${functionName}Arn`)
    new tasks.LambdaInvoke(this, resourceName(this.options, functionName), {
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        `func-${functionName}`,
        functionArn,
      ),
    })
  }
}
