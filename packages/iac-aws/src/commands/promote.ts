import { loadConfig } from '#/app/loadConfig'
import { deploy } from '#/cdk/deploy'

export async function promoteCommand (configPath?: string) {
  const config = loadConfig({}, configPath)
  await deploy(config, { noBuild: true, promote: true })
}
