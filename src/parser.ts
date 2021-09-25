import {ContainerBlock, RootBlock} from './blocks/containerBlocks'
import {FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'

export class MarkdownParseResult {
  ast: RootBlock
  frontMatter: string | null = null
  linkReferences: Map<string, LinkReference>
  tocEntries: HeadingBlock[]

  renderHTML(): string {
    return this.ast.render()
  }
}

export type LinkReference = {
  destination: string,
  title?: string,
}

export default function parse(markdown: string): MarkdownParseResult {
  let lines = markdown.split('\n')

  const {frontMatter, remaining} = FrontMatterBlock.process(lines)
  lines = remaining

  const rootBlock = new RootBlock(lines)
  rootBlock.close()

  const linkReferences = new Map<string, LinkReference>()
  {
    const walk = function (block: Block) {
      if (block instanceof LinkRefDefBlock) {
        linkReferences.set(block.label, block.def)
      } else if (block instanceof ContainerBlock) {
        for (const child of block.children) {
          walk(child)
        }
      }
    }

    walk(rootBlock)
  }

  const tocEntries = rootBlock.children.filter(it => it instanceof HeadingBlock) as HeadingBlock[]

  const result = new MarkdownParseResult()
  result.ast = rootBlock
  result.linkReferences = linkReferences
  result.tocEntries = tocEntries
  if (frontMatter) {
    result.frontMatter = frontMatter.lines.join('\n')
  }
  return result
}
