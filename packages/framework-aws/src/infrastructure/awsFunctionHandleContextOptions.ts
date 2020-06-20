export const AWSFunctionHandleContextOptionsToken = Symbol.for(
  'AWSFunctionHandleContextOptions',
)

export interface AWSFunctionHandleContextOptions {
  initSSM: boolean
  authenticated: boolean
}
