import { Config } from '#/app/config'

export interface Options {
  stage: string
  appName: string
  packageName?: string
  packageVersion?: string
  awsProfile?: string
  cwd: string
  verbose: boolean
  openApiFilePath?: string
  ignoreErrors: boolean
  appSrcDir: string
  enableFlagr: boolean
  localstack: boolean
  buildFolder: string
  buildFiles: string[]
  envFilePath?: string
  localServerPort?: string
  config?: Partial<Config>
}

export function isOptions (obj: any): obj is Options {
  return (
    typeof obj === 'object' &&
    !!obj &&
    'stage' in obj &&
    'appName' in obj &&
    obj.stage &&
    obj.appName
  )
}

export function resourceName (options: Options, resourceKey: string): string
export function resourceName (appName: string, resourceKey: string): string
export function resourceName (
  appName: string,
  stage: string,
  resourceKey: string,
): string
export function resourceName (
  optionsOrAppName: Options | string,
  resourceKeyOrStage: string,
  resourceKey?: string,
): string {
  let appName = ''
  let stage = ''
  if (
    typeof optionsOrAppName === 'string' &&
    typeof resourceKeyOrStage === 'string' &&
    optionsOrAppName
  ) {
    appName = optionsOrAppName
    if (resourceKeyOrStage) {
      if (resourceKey) {
        stage = resourceKeyOrStage
      } else {
        resourceKey = resourceKeyOrStage
      }
    }
  }
  if (
    isOptions(optionsOrAppName) &&
    typeof resourceKeyOrStage === 'string' &&
    resourceKeyOrStage
  ) {
    appName = optionsOrAppName.appName
    stage = optionsOrAppName.stage
    resourceKey = resourceKeyOrStage
  }
  if (appName && resourceKey) {
    return `${appName}${stage ? '-' : ''}${stage}-${resourceKey}`
  }
  // eslint-disable-next-line prefer-rest-params
  throw new Error(`invalid arguments: ${JSON.stringify(arguments)}`)
}
