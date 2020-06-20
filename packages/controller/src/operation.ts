export abstract class Operation<I, O> {
  abstract run(input: I): Promise<O>
}
