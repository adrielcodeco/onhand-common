import fs from 'fs'
import path from 'path'
import sdk from 'aws-sdk'
import { Options } from '#/app/options'

export async function publishAssets (options: Options) {
  const s3 = new sdk.S3()
  const bundlePath = path.resolve(options.cwd, './build/package.zip')
  if (!fs.existsSync(bundlePath)) {
    throw new Error('Bundle not found')
  }
  const Body = fs.createReadStream(bundlePath)
  await s3
    .upload({
      Bucket: `${options.appName}-assets`,
      Key: `${options.packageName ?? ''}-${options.packageVersion ?? ''}.zip`,
      Body,
    })
    .promise()
}
