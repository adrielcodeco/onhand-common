import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import { Container } from 'typedi'
import { Options } from '#/app/options'

export class S3AssetsStack extends cdk.Stack {
  private readonly options: Options

  constructor (scope: cdk.Construct, appName: string) {
    // TODO: add description to s3-assets stack
    super(scope, `${appName}-s3-assets`, { description: '' })

    this.options = Container.get<Options>('options')

    this.createBucket()
  }

  private createBucket () {
    const bucket = new s3.Bucket(this, `${this.options.appName}-assets`, {
      bucketName: `${this.options.appName}-assets`,
      versioned: false,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    })
    Container.set('s3-assets', bucket.bucketArn)
  }
}
