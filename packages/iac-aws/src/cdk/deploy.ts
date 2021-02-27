import { Container } from 'typedi'
import { Options } from '#/app/options'
import { compile } from '#/app/webpack'
import { pack } from '#/app/pack'
import { cdk, deployStacks } from './cdk'

export async function deploy (
  options: Options,
  deployOptions?: { noBuild: boolean, promote: boolean },
) {
  Container.set('options', options)

  if (!deployOptions?.noBuild) {
    const bundles = await compile(options)
    if (options.config?.app?.type === 'api') {
      await pack(options, bundles)
    }
  }

  const { cli, configuration, sdkProvider } = await cdk(options)

  await deployStacks({
    cli,
    configuration,
    sdkProvider,
    options,
    promote: !!deployOptions?.promote,
  })
}
