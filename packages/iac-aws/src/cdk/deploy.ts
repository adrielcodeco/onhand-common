import 'reflect-metadata'
import 'source-map-support/register'
import './localstack'
import { SdkProvider } from 'aws-cdk/lib/api/aws-auth'
import { Configuration, Arguments, Command } from 'aws-cdk/lib/settings'
import { CloudFormationDeployments } from 'aws-cdk/lib/api/cloudformation-deployments'
import { CloudExecutable } from 'aws-cdk/lib/api/cxapp/cloud-executable'
import { execProgram } from 'aws-cdk/lib/api/cxapp/exec'
import { CdkToolkit } from 'aws-cdk/lib/cdk-toolkit'
import { RequireApproval } from 'aws-cdk/lib/diff'
import { Container } from 'typedi'
import { Options, resourceName } from '#/app/options'
import { pack } from '#/app/pack'
import { buildApp } from '#/cdk/app'
import { publishAssets } from './s3-assets'

export async function deploy (
  options: Options,
  deployOptions?: { noBuild: boolean },
) {
  Container.set('options', options)

  if (!deployOptions?.noBuild) {
    await pack(options)
  }

  buildApp()

  const argv: Arguments = {
    _: [Command.DEPLOY],
    // eslint-disable-next-line node/no-path-concat
    app: `node -e "require('${__dirname}/app').buildApp()"`,
    context: [
      '@aws-cdk/core:enableStackNameDuplicates=true',
      'aws-cdk:enableDiffNoFail=true',
      'options=' + JSON.stringify(options),
    ],
  }
  const configuration = new Configuration({ commandLineArguments: argv })
  await configuration.load()

  const sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({
    profile: options.awsProfile,
    ...{ localstack: options.localstack },
  })

  const cloudFormation = new CloudFormationDeployments({ sdkProvider })

  const cloudExecutable = new CloudExecutable({
    configuration,
    sdkProvider,
    synthesizer: execProgram,
  })

  const cli = new CdkToolkit({
    cloudExecutable,
    cloudFormation,
    verbose: options.verbose,
    ignoreErrors: options.ignoreErrors,
    strict: true,
    configuration,
    sdkProvider,
  })

  await cli.deploy({
    stackNames: [resourceName(options.appName, 's3-assets')],
    requireApproval: RequireApproval.Never,
  })

  await publishAssets(options)

  await cli.deploy({
    stackNames: [resourceName(options.appName, 'apigateway')],
    requireApproval: RequireApproval.Never,
  })
}
