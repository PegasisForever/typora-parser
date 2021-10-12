import {ContainerBlock, RootBlock} from './blocks/containerBlocks'
import {FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'
import {EscapeUtils} from './utils'
import {loadMathJax} from './mathJax'
import GithubSlugger from 'github-slugger'
import {InlineNode} from './inlines/inlineNode'

export class RenderContext {
  parent: Block | InlineNode | null = null
  private slugger = new GithubSlugger()

  constructor(
    public linkReferences: Map<string, LinkReference>
  ) {
  }

  slug(str: string): string {
    return this.slugger.slug(str)
  }
}

export class MarkdownParseResult {
  ast: RootBlock
  frontMatter: string | null = null
  linkReferences: Map<string, LinkReference>
  tocEntries: HeadingBlock[]

  renderHTML(): string {
    const context = new RenderContext(this.linkReferences)
    for (const heading of this.tocEntries) {
      heading.genID(context)
    }
    return EscapeUtils.unEscapeMarkdown(this.ast.render(context))
  }
}

export type LinkReference = {
  url: string,
  title?: string,
}

const newLineRegex = /\r\n|\n/

function parse(markdown: string): MarkdownParseResult {
  markdown = markdown.replaceAll('\u0000', '\uFFFD')
  markdown = EscapeUtils.escapeMarkdown(markdown)

  let lines = markdown.split(newLineRegex)

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

const TyporaParser = {
  parse,
  initLatex: loadMathJax,
}

export default TyporaParser
