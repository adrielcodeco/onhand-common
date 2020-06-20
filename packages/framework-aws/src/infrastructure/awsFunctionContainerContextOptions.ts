export const AWSFunctionContainerContextOptionsToken = Symbol.for(
  'AWSFunctionContainerContextOptions',
)

export interface AWSFunctionContainerContextOptions {
  initSSM: boolean
  initLogger: boolean
  globalRequestTimeout: string
}
