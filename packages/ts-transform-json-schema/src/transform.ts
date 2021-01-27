import * as ts from 'typescript'
import * as tjs from 'typescript-json-schema'

const options: tjs.PartialArgs = {
  ref: true,
  aliasRef: true,
  defaultProps: true,
  noExtraProps: true,
  required: true,
  typeOfKeyword: true,
  excludePrivate: true,
}

export default function getTransformer (program: ts.Program) {
  const transformerFactory: ts.TransformerFactory<ts.SourceFile> = context => {
    return file => visitSourceFile(program, file, context)
  }
  return transformerFactory
}

export function visitSourceFile (
  program: ts.Program,
  sourceFile: ts.SourceFile,
  context: ts.TransformationContext,
) {
  const typeChecker = program.getTypeChecker()
  const tjsGenerator = tjs.buildGenerator(program, options)!

  function visitNodeAndChildren (node: ts.Node): ts.Node {
    if (node == null) return node

    if (ts.isCallExpression(node)) {
      const schema = processCallExpression(node, typeChecker, tjsGenerator)
      if (schema) {
        return schema
      }
    }

    if (ts.isClassDeclaration(node)) {
      node = processClassDeclaration(node, typeChecker, tjsGenerator)
    }

    if (ts.isImportDeclaration(node)) {
      const rawSpec = node.moduleSpecifier.getText()
      const spec = rawSpec.substring(1, rawSpec.length - 1)
      // remove import of the dummy function
      if (spec === '@onhand/ts-transform-json-schema') {
        return (null as any) as ts.Node
      }
    }

    return ts.visitEachChild(node, visitNodeAndChildren, context)
  }

  const newSourceFile = ts.visitNode(sourceFile, visitNodeAndChildren)
  return newSourceFile
}

function processCallExpression (
  node: ts.CallExpression,
  typeChecker: ts.TypeChecker,
  tjsGenerator: tjs.JsonSchemaGenerator,
) {
  if ((node.expression as any).escapedText !== 'definitionOf') {
    return
  }
  if (!node.typeArguments?.length && !node.arguments.length) {
    return
  }
  const signature = typeChecker.getResolvedSignature(node)
  if (!signature?.declaration) {
    return
  }
  const type = getType(node, typeChecker)

  const schema = tjsGenerator.getSchemaForSymbol(type)
  return toLiteral(schema)
}

function getType (node: ts.CallExpression, typeChecker: ts.TypeChecker): string {
  return node.typeArguments?.length
    ? getGenericType(node, typeChecker)
    : getArgType(node, typeChecker)
}

function getGenericType (
  node: ts.CallExpression,
  typeChecker: ts.TypeChecker,
): string {
  const type = typeChecker.getTypeFromTypeNode(node.typeArguments![0])
  const symbol = type.aliasSymbol ?? type.symbol
  if (typeof symbol === 'undefined' || symbol === null) {
    throw new Error('Could not find symbol for passed type')
  }
  return symbol.name
}

function getArgType (
  node: ts.CallExpression,
  typeChecker: ts.TypeChecker,
): string {
  return getNodeType(node.arguments[0], typeChecker)
}

function getNodeType (node: ts.Node, typeChecker: ts.TypeChecker): string {
  const type = typeChecker.getTypeAtLocation(node)
  const symbol = type.aliasSymbol ?? type.symbol
  if (typeof symbol === 'undefined' || symbol === null) {
    throw new Error('Could not find symbol for passed type')
  }
  return symbol.name
}

function toLiteral (input: any): ts.PrimaryExpression {
  if (typeof input === 'number') {
    return ts.factory.createNumericLiteral(input)
  }
  if (typeof input === 'boolean') {
    return input ? ts.factory.createTrue() : ts.factory.createFalse()
  }
  if (typeof input === 'string') {
    return ts.factory.createStringLiteral(input)
  }

  if (Array.isArray(input)) {
    return ts.factory.createArrayLiteralExpression(input.map(toLiteral))
  }

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return ts.factory.createObjectLiteralExpression(
      Object.keys(input).map(key =>
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier(key),
          toLiteral(input[key]),
        ),
      ),
    )
  }

  return ts.factory.createNull()
}

function processClassDeclaration (
  node: ts.ClassDeclaration,
  typeChecker: ts.TypeChecker,
  tjsGenerator: tjs.JsonSchemaGenerator,
): ts.Node {
  const type = getNodeType(node, typeChecker)
  const symbols = tjsGenerator.getSymbols(type)
  const schema = tjsGenerator.getSchemaForSymbol(symbols[0].name, false)
  const schemaExpression = toLiteral(schema)
  const expression: ts.Expression = ts.factory.createCallExpression(
    ts.factory.createIdentifier('DefinitionMetadata'),
    undefined,
    [schemaExpression],
  )
  if (!node.decorators?.length) {
    ts.factory.updateClassDeclaration(
      node,
      [ts.factory.createDecorator(expression)],
      node.modifiers,
      node.name,
      node.typeParameters,
      node.heritageClauses,
      node.members,
    )
  } else {
    const definitionMetadataDecorator = node.decorators.find(
      d => d.getText().replace('@', '').split('(')[0] === '',
    )
    ts.factory.updateDecorator(definitionMetadataDecorator!, expression)
  }
  return node
}
