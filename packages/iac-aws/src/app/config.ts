export type Config = {
  build: {
    outputFolder?: string
    packFiles?: string[]
  }
  deploy: {
    appName?: string
    verbose?: boolean
    ignoreErrors?: boolean
    localstack?: boolean
    buildFolder?: string
  }
  app: {
    authorizer?: Array<{ any: string }>
    src?: string
    openApi?: string
  }
  db: {
    config?: string
    migrations?: string
    seeds?: string
  }
}
