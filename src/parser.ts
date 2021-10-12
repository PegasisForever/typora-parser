import {ContainerBlock, FootnotesAreaBlock, RootBlock} from './blocks/containerBlocks'
import {FootnoteDefBlock, FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'
import {EscapeUtils} from './utils'
import {loadMathJax} from './mathJax'
import GithubSlugger from 'github-slugger'
import {InlineNode} from './inlines/inlineNode'

export type FootnoteReference = {
  index: number,
  referencedPlaces: Array<{ refHref: string, defHref: string }>,
}

export class RenderContext {
  parent: Block | InlineNode | null = null
  stage: 'normal' | 'footnote'
  private slugger = new GithubSlugger()
  footnoteReferences: Map<string, FootnoteReference>

  constructor(
    public linkReferences: Map<string, LinkReference>,
    footnoteDefBlocks: FootnoteDefBlock[],
  ) {
    this.footnoteReferences = new Map(footnoteDefBlocks.map((it, i) => [it.label, {
      index: i + 1,
      referencedPlaces: [],
    }]))
  }

  slug(str: string): string {
    return this.slugger.slug(str)
  }
}

export class MarkdownParseResult {
  ast: RootBlock
  frontMatter: string | null = null
  linkReferences: Map<string, LinkReference>
  footnoteDefBlocks: FootnoteDefBlock[]
  tocEntries: HeadingBlock[]

  renderHTML(): string {
    const context = new RenderContext(this.linkReferences, this.footnoteDefBlocks)
    for (const heading of this.tocEntries) {
      // todo also nested headings, don't use github slugger
      heading.genID(context)
    }
    let html = this.ast.render(context)
    html += new FootnotesAreaBlock(this.footnoteDefBlocks).render(context)
    return EscapeUtils.unEscapeMarkdown(html)
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
  const footnoteDefBlocks: FootnoteDefBlock[] = []
  {
    const walk = function (block: Block) {
      if (block instanceof LinkRefDefBlock) {
        linkReferences.set(block.label, block.def)
      } else if (block instanceof FootnoteDefBlock) {
        footnoteDefBlocks.push(block)
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
  result.footnoteDefBlocks = footnoteDefBlocks

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
