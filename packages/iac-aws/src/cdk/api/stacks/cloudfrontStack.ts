/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as route53 from '@aws-cdk/aws-route53'
import * as targets from '@aws-cdk/aws-route53-targets'
import { Options, resourceName } from '#/app/options'

export class CloudFrontStack extends cdk.Stack {
  private readonly options: Options
  private distribution!: cloudfront.CloudFrontWebDistribution
  private readonly certificate?: acm.ICertificate

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to cognito stack
    super(scope, resourceName(options, 'cloudfront-api'), {
      description: '',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    })

    this.options = options

    const certificateArn = ` arn:aws:acm:us-east-1:${
      this.account
    }:certificate/${this.options.config?.cloudFront?.api?.certificateId ?? ''}`
    this.certificate = this.options.config?.cloudFront?.api?.domainName
      ? acm.Certificate.fromCertificateArn(
        this,
        resourceName(this.options, 'cert'),
        certificateArn,
      )
      : undefined

    this.createApiDistribution()
    this.updateRoute53Records()
  }

  private createApiDistribution () {
    if (!this.options.config?.cloudFront?.api) {
      return
    }
    for (const apiGateway of this.options.config?.cloudFront?.api?.origins
      ?.apiGateway ?? []) {
      const distName = resourceName(
        this.options,
        `dist-api-${apiGateway.cloudFormationExportName}`,
      )
      const restApiId = cdk.Fn.importValue(apiGateway.cloudFormationExportName)
      const stageName = this.options.stage
      this.distribution = new cloudfront.CloudFrontWebDistribution(
        this,
        distName,
        {
          originConfigs: [
            {
              customOriginSource: {
                domainName: `${restApiId}.execute-api.${this.region}.amazonaws.com`,
                originPath: `/${stageName}`,
              },
              behaviors: [
                {
                  compress: false,
                  isDefaultBehavior: true,
                  allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                  cachedMethods:
                    cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD,
                },
              ],
            },
          ],
          defaultRootObject: '',
          enableIpV6: true,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          httpVersion: cloudfront.HttpVersion.HTTP2,
          ...(this.options.config?.cloudFront?.api?.domainName
            ? {
                viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
                  this.certificate!,
                  {
                    securityPolicy:
                      cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
                    aliases: [this.options.config?.cloudFront?.api?.domainName],
                  },
                ),
              }
            : {}),
        },
      )
    }

    const distributionIdExportName = resourceName(
      this.options,
      'api-distributionId',
    )
    new cdk.CfnOutput(this, distributionIdExportName, {
      value: this.distribution.distributionId,
      exportName: distributionIdExportName,
    })

    const distributionDomainNameExportName = resourceName(
      this.options,
      'api-distributionDomainName',
    )
    new cdk.CfnOutput(this, distributionDomainNameExportName, {
      value: this.distribution.distributionDomainName,
      exportName: distributionDomainNameExportName,
    })
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
            new targets.CloudFrontTarget(this.distribution),
          ),
          ttl: cdk.Duration.seconds(300),
        },
      )
    }
  }
}
