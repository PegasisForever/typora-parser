import {RootNode} from './inlineNode'

export function inlineParser(line): RootNode {
  let rootNode = new RootNode(line)
  return rootNode
}
