import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

export type Config = {
  verbose?: boolean
  bail?: boolean
  setup?: string
  testSetup?: string
  teardown?: string
  testRegex?: string[]
  ignore?: string[]
  report?: boolean
  cwd: string
}

export function loadOnhandFile (filePath?: string): Config {
  if (!filePath) {
    filePath = path.resolve(process.cwd(), './onhand.yml')
  }
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath)
  }
  const cwd = path.dirname(filePath)
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const configJson = YAML.parse(fileContent)
  if ('test' in configJson) {
    return {
      ...configJson.test,
      cwd,
    }
  }
  return { cwd }
}
