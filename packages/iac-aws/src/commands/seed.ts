import { loadConfig } from '#/app/loadConfig'
import { seed } from '#/app/seed'

export async function seedCommand (configPath?: string) {
  const options = loadConfig({}, configPath)
  await seed(options)
}
