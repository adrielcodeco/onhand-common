import { mapper } from '#/modules/mapper'

describe('mapper', () => {
  test('map the origin to destiny creating destiny instance', async () => {
    class Foo1 {
      a!: number
    }
    class Foo2 {
      b!: number
    }
    const fooMapper = mapper(Foo1, Foo2).map(o => o.a, 'b')

    const foo1: Foo1 = { a: 2 }
    const result = fooMapper.from(foo1).to()

    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Foo2)
    expect(result.b).toEqual(2)
  })

  test('map the origin to an existing destiny instance', async () => {
    class Foo1 {
      a!: number
    }
    class Foo2 {
      b!: number
    }
    const fooMapper = mapper(Foo1, Foo2).map(o => o.a, 'b')

    const foo1: Foo1 = { a: 2 }
    const result = fooMapper.from(foo1).to(new Foo2())

    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Foo2)
    expect(result.b).toEqual(2)
  })
})
