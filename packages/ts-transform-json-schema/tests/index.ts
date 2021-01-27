// import { Transformer } from 'ts-transformer-testing-library'
import getTransformer from '../src/transform'
// import * as ts from 'typescript'
import path from 'path'
import * as ts from 'typescript'

// const transformer = new Transformer().addTransformer(getTransformer).addMock({
//   name: '@onhand/ts-transform-json-schema',
//   content: `
//     export function definitionOf<T> (instance?: T) {
//       throw new Error('definitionOf should not be used at runtime')
//     }`,
// })

// const result = transformer.transform(`
//     import { definitionOf } from "@onhand/ts-transform-json-schema"
//     export class Test {
//       id!: number
//       name!: string
//     }
//     class Action {
//       input = Test
//     }
//     const action = new Action()
//     export const schema = definitionOf(action.input)
//   `)

const program = ts.createProgram([path.resolve(__dirname, './test.ts')], {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  importHelpers: true,
  alwaysStrict: true,
  noImplicitAny: true,
  noImplicitThis: true,
  removeComments: true,
  outDir: './tests/out',
  sourceMap: false,
  declaration: false,
  noEmit: false,
  lib: ['lib.es2017.d.ts'],
  experimentalDecorators: true,
  noEmitOnError: true,
})

const transformers = {
  before: [getTransformer(program)],
}
const result = program.emit(
  undefined,
  undefined,
  undefined,
  false,
  transformers,
)

// function transformSourceFile (
//   sourceText: string,
//   transformers: Array<ts.TransformerFactory<ts.SourceFile>>,
// ) {
//   const transformed = ts.transform(
//     ts.createSourceFile('source.ts', sourceText, ts.ScriptTarget.Latest),
//     transformers,
//   )
//   const printer = ts.createPrinter()
//   const result = printer.printFile(transformed.transformed[0])
//   transformed.dispose()
//   return result
// }

// const result = transformSourceFile(
//   `
//     import { definitionOf } from "@onhand/ts-transform-json-schema"
//     export class Test {
//       id!: number
//       name!: string
//     }
//     class Action {
//       input = Test
//     }
//     const action = new Action()
//     export const schema = definitionOf(action.input)
//   `,
//   [getTransformer(program)],
// )

console.log(result)
