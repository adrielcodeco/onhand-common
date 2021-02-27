/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as iam from '@aws-cdk/aws-iam'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import { Container } from 'typedi'
import { Options, resourceName } from '#/app/options'

export class S3SiteStack extends cdk.Stack {
  private readonly options: Options
  private bucket!: s3.Bucket

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to s3-site stack
    super(scope, resourceName(options, 's3-site'), {
      description: '',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    })

    this.options = options

    this.createBucket()
    this.createOriginAccessIdentity()
  }

  private createBucket () {
    const name = resourceName(this.options, 'site')
    this.bucket = new s3.Bucket(this, name, {
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: name,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: false,
    })
    Container.set('s3-site', this.bucket.bucketArn)
  }

  private createOriginAccessIdentity () {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      resourceName(this.options, 'dist-site-oai'),
      {},
    )
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [originAccessIdentity.grantPrincipal],
      }),
    )
    Container.set(
      's3-site-originAccessIdentityName',
      originAccessIdentity.originAccessIdentityName,
    )
  }
}
