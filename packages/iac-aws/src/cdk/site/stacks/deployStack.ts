/* eslint-disable no-new */
import path from 'path'
import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
import { Container } from 'typedi'
import { Options, resourceName } from '#/app/options'
import { getConfigOrDefault } from '#/app/config'

export class DeploySiteStack extends cdk.Stack {
  private readonly options: Options

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to cognito stack
    super(scope, resourceName(options, 'deploy-site'), {
      description: '',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    })

    this.options = options

    this.deployment()
  }

  private deployment () {
    const s3SiteArn = Container.get<string>('s3-site')
    const bucket = s3.Bucket.fromBucketArn(
      this,
      resourceName(this.options, 'site'),
      s3SiteArn,
    )

    const distributionIdExportName = resourceName(
      this.options,
      'site-distributionId',
    )
    const distributionDomainNameExportName = resourceName(
      this.options,
      'site-distributionDomainName',
    )
    const distribution = cloudfront.CloudFrontWebDistribution.fromDistributionAttributes(
      this,
      resourceName(this.options, 'dist-site'),
      {
        distributionId: cdk.Fn.importValue(distributionIdExportName),
        domainName: cdk.Fn.importValue(distributionDomainNameExportName),
      },
    )

    const buildOutput = getConfigOrDefault(
      this.options.config,
      c => c?.build?.outputFolder,
    )
    new s3Deployment.BucketDeployment(
      this,
      resourceName(this.options, 'site-deployment'),
      {
        sources: [
          s3Deployment.Source.asset(
            path.resolve(this.options.cwd, buildOutput!),
          ),
        ],
        destinationBucket: bucket,
        distribution: distribution,
        retainOnDelete: false,
      },
    )
  }
}
