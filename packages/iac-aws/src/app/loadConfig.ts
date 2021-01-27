import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { Options } from './options'
import { Config } from './config'

const defaultOptions: Options = {
  stage: 'dev',
  appName: 'app',
  cwd: process.cwd(),
  verbose: false,
  appSrcDir: '',
  ignoreErrors: false,
  enableFlagr: false,
  localstack: false,
  buildFolder: 'build',
  buildFiles: ['#', 'package.json'],
}

export function loadConfig (configPath?: string): Options {
  if (!configPath) {
    configPath = `${process.cwd()}/onhand.yml`
  }
  try {
    const options: Partial<Options> = {}
    const configPathResolved = path.resolve(process.cwd(), configPath)
    options.cwd = path.dirname(configPathResolved)
    const configFile = fs.readFileSync(configPathResolved, 'utf8')
    const configJson = YAML.parse(configFile) as Partial<Config>
    options.config = configJson
    if (
      typeof configJson === 'object' &&
      !!configJson &&
      'build' in configJson &&
      configJson.build
    ) {
      load(options, ['buildFolder', 'outputFolder'], configJson.build)
      load(options, ['buildFiles', 'packFiles'], configJson.build)
    }
    if (
      typeof configJson === 'object' &&
      !!configJson &&
      'deploy' in configJson &&
      configJson.deploy
    ) {
      load(options, ['appName'], configJson.deploy)
      load(options, ['verbose'], configJson.deploy)
      load(options, ['ignoreErrors'], configJson.deploy)
      load(options, ['localstack'], configJson.deploy)
      load(options, ['buildFolder'], configJson.deploy)
    }
    if (
      typeof configJson === 'object' &&
      !!configJson &&
      'app' in configJson &&
      configJson.app
    ) {
      if (
        typeof configJson === 'object' &&
        !!configJson &&
        'openApi' in configJson.app &&
        configJson.app.openApi
      ) {
        const openApiFilePath = path.resolve(
          options.cwd,
          configJson.app.openApi,
        )
        options.openApiFilePath = openApiFilePath
        options.appSrcDir = path.resolve(options.cwd, configJson.app?.src!)
      }
    }
    const pkgJsonPath = path.resolve(process.cwd(), 'package.json')
    const pkg = fs.readFileSync(pkgJsonPath, 'utf8')
    const packageJson = JSON.parse(pkg)
    options.packageName = packageJson.name
    options.packageVersion = packageJson.version
    return Object.assign({}, defaultOptions, options)
  } catch (err) {
    return defaultOptions
  }
}

function load (
  options: Partial<Options>,
  property: [string, string?],
  from: any,
) {
  const originProperty = property[0]
  const destinyProperty = property.length === 1 ? property[0] : property[1]!
  if (originProperty in from && from[originProperty]) {
    Reflect.set(options, destinyProperty, from[originProperty])
  }
}
