import { Container } from 'typedi'
import { Options } from '#/app/options'
import { cdk, deployStacks } from './cdk'

export async function init (options: Options) {
  Container.set('options', options)
  const { cli, configuration, sdkProvider } = await cdk(options)
  await deployStacks({
    cli,
    configuration,
    sdkProvider,
    options,
    promote: true,
  })
}
