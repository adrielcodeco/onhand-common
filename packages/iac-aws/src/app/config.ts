type PartialDeep<T> = {
  [P in keyof T]?: Partial<T[P]>
}

export type Config = {
  app: {
    projectName: string
    name: string
    type: 'api' | 'site'
    src?: string
    openApi?: string
  }
  db: {
    config?: string
    migrations?: string
    seeds?: string
  }
  build: {
    webpack?: string
    outputFolder?: string
  }
  package: {
    name?: string
    files?: Array<string | { root: string, pattern: string }>
    outputFolder?: string
  }
  deploy: {
    verbose?: boolean
    ignoreErrors?: boolean
    awsProfile?: string
    awsRegion?: string
    files?: Array<string | { root: string, pattern: string }>
  }
  cloudFront: {
    site: {
      zoneName?: string
      domainAliases?: string[]
      certificateId?: string
    }
    api: {
      zoneName?: string
      domainName?: string
      certificateId?: string
      origins?: {
        apiGateway: Array<{ cloudFormationExportName: string, path: string }>
      }
    }
  }
  defaultEnv: any
}

export const defaultConfig: PartialDeep<Config> = {
  app: {
    src: 'src',
  },
  build: {
    outputFolder: '#',
  },
  package: {
    name: 'package',
    outputFolder: 'deploy',
  },
  deploy: {
    verbose: false,
    ignoreErrors: false,
  },
}

export function getConfigOrDefault<T> (
  config: Partial<Config> | undefined,
  key: (config: Partial<Config>) => T,
): T | undefined {
  if (!config) {
    return undefined
  }
  try {
    const value = key(config)
    return value
  } catch {
    try {
      const value = key(defaultConfig as Config)
      return value
    } catch {
      return undefined
    }
  }
}
