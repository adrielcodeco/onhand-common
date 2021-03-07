/* eslint-disable no-new */
// import path from 'path'
import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
// import * as s3Deployment from '@aws-cdk/aws-s3-deployment'
import { Container } from 'typedi'
import { Options, resourceName } from '#/app/options'
// import { getConfigOrDefault } from '#/app/config'

export class S3Stack extends cdk.Stack {
  private readonly options: Options
  private bucket!: s3.Bucket

  constructor (scope: cdk.Construct, options: Options) {
    // TODO: add description to s3-assets stack
    super(scope, resourceName(options, 's3-api'), {
      description: '',
      env: {
        account: options.awsAccount,
        region: options.awsRegion,
      },
    })

    this.options = options

    this.createBucket()
    this.deployment()
  }

  private createBucket () {
    const name = resourceName(this.options, 's3-api', true)
    this.bucket = new s3.Bucket(this, name, {
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: name,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: false,
    })
    Container.set('s3-api', this.bucket.bucketArn)
  }

  private deployment () {
    // const buildOutput = getConfigOrDefault(
    //   this.options.config,
    //   c => c?.package?.outputFolder,
    // )
    // new s3Deployment.BucketDeployment(
    //   this,
    //   resourceName(this.options, 'api-deployment'),
    //   {
    //     sources: [
    //       s3Deployment.Source.asset(
    //         path.resolve(this.options.cwd, buildOutput!),
    //       ),
    //     ],
    //     destinationBucket: this.bucket,
    //     destinationKeyPrefix: `${this.options.packageName ?? ''}-${
    //       this.options.packageVersion ?? ''
    //     }`,
    //     retainOnDelete: false,
    //   },
    // )
  }
}
