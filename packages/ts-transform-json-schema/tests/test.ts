function definitionOf (args: any) {
  // do nothing
}

export class Test {
  id!: number
  name!: string
  childs!: Test[]
}

class Action {
  input = Test
}

const action = new Action()

const schema = definitionOf(action.input)

console.log(schema)
