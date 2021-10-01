import {RootNode} from './inlineNode'

export function parseInline(line: string): RootNode {
  return new RootNode(line)
}
