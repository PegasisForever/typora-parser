import {ContainerBlock, FootnotesAreaBlock, RootBlock} from './blocks/containerBlocks'
import {FootnoteDefBlock, FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'
import {EscapeUtils, replaceAll} from './utils'
import {InlineNode} from './inlines/inlineNode'
import {getDefaultRenderOptions, RenderOptions} from './RenderOptions'

export type LinkReference = {
  url: string,
  title?: string,
}

export type FootnoteReference = {
  index: number,
  referencedPlaces: Array<{ refHref: string, defHref: string }>,
}

export class RenderContext {
  parent: Block | InlineNode | null = null
  stage: 'normal' | 'footnote'
  footnoteReferences: Map<string, FootnoteReference>

  constructor(
    public linkReferences: Map<string, LinkReference>,
    public renderOptions: RenderOptions,
    public tocEntries: HeadingBlock[],
    footnoteDefBlocks: FootnoteDefBlock[],
  ) {
    this.footnoteReferences = new Map(footnoteDefBlocks.map((it, i) => [it.label, {
      index: i + 1,
      referencedPlaces: [],
    }]))
  }
}

export class TyporaParseResult {
  ast: RootBlock
  frontMatter: string | null = null
  linkReferences: Map<string, LinkReference>
  footnoteDefBlocks: FootnoteDefBlock[]
  tocEntries: HeadingBlock[]
  headings: HeadingBlock[]

  private genHeadingIDs(context: RenderContext) {
    // heading id to a list of headings have the same id
    const buckets = new Map<string, HeadingBlock[]>()

    for (const heading of this.headings) {
      heading.genID(context)
      const bucket = buckets.get(heading.id)
      if (bucket) {
        bucket.push(heading)
      } else {
        buckets.set(heading.id, [heading])
      }
    }

    for (const [id, headings] of buckets.entries()) {
      if (headings.length > 1) {
        headings.forEach((heading, i) => {
          heading.id = `${id}-${i + 1}`
        })
      }
    }
  }

  renderHTML(options?: Partial<RenderOptions>): string {
    const context = new RenderContext(this.linkReferences, Object.assign(getDefaultRenderOptions(), options), this.tocEntries, this.footnoteDefBlocks)
    this.genHeadingIDs(context)
    let html = this.ast.render(context)
    html += new FootnotesAreaBlock(this.footnoteDefBlocks).render(context)
    html = EscapeUtils.unEscapeMarkdown(html)
    if (!context.renderOptions.vanillaHTML) {
      html = `<div class='typora-export-content'>\n<div id='write'  class=''>${html}</div></div>\n`
    }
    if (context.renderOptions.includeHead) {
      const titleHtml = context.renderOptions.title === null ? '' : `<title>${context.renderOptions.title}</title>`
      if (context.renderOptions.vanillaHTML) {
        html = `<!doctype html>
<html>
<head>
<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>
${context.renderOptions.extraHeadTags ?? ''}
${titleHtml}
</head>
<body>${html}</body>
</html>`
      } else {
        html = `<!doctype html>
<html>
<head>
<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>
${context.renderOptions.extraHeadTags ?? ''}
${titleHtml}
</head>
<body class='typora-export'>${html}</body>
</html>`
      }
    }
    return html
  }
}

const newLineRegex = /\r\n|\n/

export function parse(markdown: string): TyporaParseResult {
  markdown = replaceAll(markdown, '\u0000', '\uFFFD')
  markdown = EscapeUtils.escapeMarkdown(markdown)

  let lines = markdown.split(newLineRegex)

  const {frontMatter, remaining} = FrontMatterBlock.process(lines)
  lines = remaining

  const rootBlock = new RootBlock(lines)
  rootBlock.close()

  const linkReferences = new Map<string, LinkReference>()
  const footnoteDefBlocks: FootnoteDefBlock[] = []
  const headings: HeadingBlock[] = []
  {
    const walk = function (block: Block) {
      if (block instanceof LinkRefDefBlock) {
        linkReferences.set(block.label, block.def)
      } else if (block instanceof FootnoteDefBlock) {
        footnoteDefBlocks.push(block)
      } else if (block instanceof HeadingBlock) {
        headings.push(block)
      } else if (block instanceof ContainerBlock) {
        for (const child of block.children) {
          walk(child)
        }
      }
    }

    walk(rootBlock)
  }

  const tocEntries = rootBlock.children.filter(it => it instanceof HeadingBlock) as HeadingBlock[]

  const result = new TyporaParseResult()
  result.ast = rootBlock
  result.linkReferences = linkReferences
  result.headings = headings
  result.tocEntries = tocEntries
  result.footnoteDefBlocks = footnoteDefBlocks

  if (frontMatter) {
    result.frontMatter = frontMatter.lines.join('\n')
  }
  return result
}
