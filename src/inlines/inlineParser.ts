import {RootNode} from './inlineNode'

export function inlineParser(line:string): RootNode {
  return new RootNode(line)
}
