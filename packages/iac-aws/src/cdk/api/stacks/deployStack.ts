/* eslint-disable no-new */
// import path from 'path'
import * as cdk from '@aws-cdk/core'
import * as route53 from '@aws-cdk/aws-route53'
import * as targets from '@aws-cdk/aws-route53-targets'
// import * as s3 from '@aws-cdk/aws-s3'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
// import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
// import { Container } from 'typedi'
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

    this.updateRoute53Records()
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

  private updateRoute53Records () {
    if (this.options.config?.cloudFront?.api?.zoneName) {
      const distributionIdExportName = resourceName(
        this.options,
        'api-distributionId',
      )
      const distributionDomainNameExportName = resourceName(
        this.options,
        'api-distributionDomainName',
      )
      const distribution = cloudfront.CloudFrontWebDistribution.fromDistributionAttributes(
        this,
        resourceName(this.options, 'dist-api'),
        {
          distributionId: cdk.Fn.importValue(distributionIdExportName),
          domainName: cdk.Fn.importValue(distributionDomainNameExportName),
        },
      )
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
            new targets.CloudFrontTarget(distribution),
          ),
          ttl: cdk.Duration.seconds(300),
        },
      )
    }
  }
}
