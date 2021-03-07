import { SdkProvider } from 'aws-cdk/lib/api/aws-auth'
import { Configuration, Arguments, Command } from 'aws-cdk/lib/settings'
import { CloudFormationDeployments } from 'aws-cdk/lib/api/cloudformation-deployments'
import { StackActivityProgress } from 'aws-cdk/lib/api/util/cloudformation/stack-activity-monitor'
import { CloudExecutable } from 'aws-cdk/lib/api/cxapp/cloud-executable'
import { execProgram } from 'aws-cdk/lib/api/cxapp/exec'
import { CdkToolkit } from 'aws-cdk/lib/cdk-toolkit'
import { RequireApproval } from 'aws-cdk/lib/diff'
import { Bootstrapper, ToolkitInfo } from 'aws-cdk/lib'
import { Options, resourceName } from '#/app/options'
import { publishAssets } from './s3-upload'

export async function cdk (options: Options) {
  const argv: Arguments = {
    _: [Command.DEPLOY],
    region: options.awsRegion,
    // eslint-disable-next-line node/no-path-concat
    app: `npx ${__dirname}/${options.config?.app?.type}/importer.js`,
    context: [
      '@aws-cdk/core:enableStackNameDuplicates=true',
      'aws-cdk:enableDiffNoFail=true',
      'options=' + JSON.stringify(options),
    ],
  }
  const configuration = new Configuration({
    commandLineArguments: argv,
    readUserContext: false,
  })
  await configuration.load()

  const sdkProvider = await SdkProvider.withAwsCliCompatibleDefaults({
    profile: options.awsProfile ?? configuration.settings.get(['profile']),
    ...{ localstack: false },
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

  const bootstrapper = new Bootstrapper({ source: 'default' })

  const toolkitStackName = ToolkitInfo.determineName(
    configuration.settings.get(['toolkitStackName']),
  )

  await cli.bootstrap([], bootstrapper, {
    toolkitStackName,
    tags: configuration.settings.get(['tags']),
    parameters: {
      bucketName: configuration.settings.get(['toolkitBucket', 'bucketName']),
      kmsKeyId: configuration.settings.get(['toolkitBucket', 'kmsKeyId']),
    },
  })

  return {
    configuration,
    sdkProvider,
    cli,
  }
}

export async function deployStacks (args: {
  cli: CdkToolkit
  configuration: Configuration
  sdkProvider: SdkProvider
  options: Options
  promote: boolean
}) {
  const { cli, configuration, options, sdkProvider } = args
  const s3Stack = `s3-${options.config?.app?.type}`
  const principalStack = `${args.promote ? 'cloudfront' : 'deploy'}-${
    options.config?.app?.type
  }`

  const toolkitStackName = ToolkitInfo.determineName(
    configuration.settings.get(['toolkitStackName']),
  )

  await cli.deploy({
    toolkitStackName,
    stackNames: [resourceName(options, s3Stack)],
    requireApproval: RequireApproval.Never,
    progress: StackActivityProgress.EVENTS,
    ci: true,
  })

  if (!args.promote) {
    await publishAssets(
      options,
      await (sdkProvider as any).defaultCredentials(),
    )
  }

  await cli.deploy({
    toolkitStackName,
    stackNames: [resourceName(options, principalStack)],
    requireApproval: RequireApproval.Never,
    progress: StackActivityProgress.EVENTS,
    ci: true,
  })
}
