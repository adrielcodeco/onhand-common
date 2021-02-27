import { loadConfig } from '#/app/loadConfig'
import { deploy } from '#/cdk/deploy'

export async function deployCommand (
  configPath?: string,
  options?: { noBuild: boolean },
) {
  const config = loadConfig({}, configPath)
  const deployOptions = {
    noBuild: !!options?.noBuild,
    promote: false,
  }
  await deploy(config, deployOptions)
}
