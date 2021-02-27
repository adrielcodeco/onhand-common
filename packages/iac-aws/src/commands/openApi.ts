import fs from 'fs'
import path from 'path'
import { loadConfig } from '#/app/loadConfig'
import { getOpenAPI } from '#/app/getOpenApi'
import { getConfigOrDefault } from '#/app/config'

export function openApiCommand (configPath?: string, output?: string) {
  const options = loadConfig({}, configPath)
  const openApiFilePath = getConfigOrDefault(
    options.config,
    c => c.app?.openApi,
  )
  const openApi = getOpenAPI(path.resolve(options.cwd, openApiFilePath ?? ''))
  if (!output) {
    console.log(openApi)
  } else {
    fs.writeFileSync(output, openApi, 'utf-8')
  }
}
