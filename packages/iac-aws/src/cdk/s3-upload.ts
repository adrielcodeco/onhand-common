import fs from 'fs'
import path from 'path'
import sdk from 'aws-sdk'
import glob from 'glob'
import { Options, resourceName } from '#/app/options'
import { getConfigOrDefault } from '#/app/config'

export async function publishAssets (
  options: Options,
  credentials: sdk.Credentials,
) {
  if (options.config?.app?.type === 'api') {
    const s3 = new sdk.S3({ credentials })
    await deployApi(s3, options)
  }
}

async function deployApi (s3: sdk.S3, options: Options) {
  const buildOutput = getConfigOrDefault(
    options.config,
    c => c?.package?.outputFolder,
  )
  const outputFolder = path.resolve(options.cwd, buildOutput!)
  const bundles = glob.sync('*', { cwd: outputFolder, nodir: true })
  for (const bundle of bundles) {
    const Body = fs.createReadStream(path.resolve(outputFolder, bundle))
    await s3
      .upload({
        Bucket: resourceName(options, 's3-api', true),
        Key: `${options.packageName ?? ''}-${
          options.packageVersion ?? ''
        }/${bundle}`,
        Body,
      })
      .promise()
  }
}
