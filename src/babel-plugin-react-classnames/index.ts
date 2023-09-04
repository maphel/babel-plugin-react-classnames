import { NodePath, Visitor } from "@babel/traverse"
import {
  callExpression,
  Expression,
  identifier,
  jsxAttribute,
  JSXAttribute,
  jsxExpressionContainer,
  JSXExpressionContainer,
  jsxIdentifier,
  JSXOpeningElement,
  Program,
  stringLiteral,
  SpreadElement,
  JSXNamespacedName,
  ArgumentPlaceholder,
  importSpecifier,
  ImportDeclaration,
  importDeclaration,
} from "@babel/types"

const visitor: Visitor = {
  Program(path: NodePath<Program>) {
    const importSpec = importSpecifier(identifier("classes"), identifier("classes"))
    const importDecl: ImportDeclaration = importDeclaration([importSpec], stringLiteral("@maphel/classes"))

    path.node.body.unshift(importDecl)
  },
  JSXOpeningElement(path: NodePath<JSXOpeningElement>) {
    let shouldReplace = false
    let classNamesAttr: NodePath<JSXAttribute> | null = null
    let classNameAttr: NodePath<JSXAttribute> | null = null

    // Find the 'classNames' and 'className' attributes if they exist
    for (const attr of path.get("attributes")) {
      const jsxAttributeNode = attr.node as unknown as JSXAttribute
      if (jsxAttributeNode.name.type === "JSXIdentifier") {
        if (attr.isJSXAttribute() && "name" in (attr.node as any) && (attr.node as any).name.name === "classNames") {
          classNamesAttr = attr as unknown as NodePath<JSXAttribute>
          shouldReplace = true
        } else if (
          attr.isJSXAttribute() &&
          "name" in (attr.node as any) &&
          (attr.node as any).name.name === "className"
        ) {
          classNameAttr = attr as unknown as NodePath<JSXAttribute>
        }
      }
    }

    // If we found a 'classNames' attribute, replace or merge it
    if (shouldReplace && classNamesAttr) {
      const originalValue = classNamesAttr.node.value
      const originalExpression =
        originalValue && originalValue.type === "JSXExpressionContainer"
          ? (originalValue as JSXExpressionContainer).expression
          : stringLiteral(originalValue as any)

      let processedValue = callExpression(identifier("c"), [originalExpression as any] as (
        | Expression
        | SpreadElement
        | JSXNamespacedName
        | ArgumentPlaceholder
      )[])

      // If a className attribute already exists, merge it with classNames
      if (classNameAttr) {
        const existingClassNameValue = classNameAttr.node.value
        const existingExpression =
          existingClassNameValue && existingClassNameValue.type === "JSXExpressionContainer"
            ? (existingClassNameValue as JSXExpressionContainer).expression
            : stringLiteral(existingClassNameValue as any)

        processedValue = callExpression(identifier("c"), [existingExpression as any, processedValue])
      }

      const newClassNameAttr: JSXAttribute = jsxAttribute(
        jsxIdentifier("className"),
        jsxExpressionContainer(processedValue),
      )

      // Remove the old attributes and add the new 'className' attribute
      if (classNamesAttr) classNamesAttr.remove()
      if (classNameAttr) classNameAttr.remove()
      path.node.attributes.push(newClassNameAttr)
    }
  },
}

export default function (): { visitor: Visitor } {
  return { visitor }
}
