import { assert } from 'console'
import { Operation } from '@onhand/common-controller/lib/operation'
import { AWSFunctionContainerContext } from '#/infrastructure/awsFunctionContainerContext'
import { AWSFunctionHandleContext } from '#/infrastructure/awsFunctionHandleContext'

export type AWSFunctionOptions = {
  permissions?: string[]
  authenticated?: boolean
}

export abstract class AWSFunction<E, I, O> {
  abstract get operation (): Operation<I, O>

  constructor (
    private readonly options: AWSFunctionOptions,
    private readonly containerContextInitialization: AWSFunctionContainerContext,
    private readonly handleContextInitialization: AWSFunctionHandleContext<E>,
  ) {
    if (
      Reflect.has(this.options, 'authenticated') &&
      typeof this.options.authenticated === 'boolean'
    ) {
      this.handleContextInitialization.options.authenticated = options.authenticated!
    }
  }

  abstract inputAdapter (event: E): Promise<I>

  async handle (event: E): Promise<O> {
    assert(this.operation)
    await this.containerContextInitialization.init()
    await this.handleContextInitialization.init(event)
    const input = await this.inputAdapter(event)
    return this.operation.run(input)
  }
}
