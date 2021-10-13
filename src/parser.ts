import {ContainerBlock, FootnotesAreaBlock, RootBlock} from './blocks/containerBlocks'
import {FootnoteDefBlock, FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'
import {EscapeUtils, matchAll, merge, replaceAll} from './utils'
import {InlineNode} from './inlines/inlineNode'

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
    public renderOption: RenderOption,
    public tocEntries: HeadingBlock[],
    footnoteDefBlocks: FootnoteDefBlock[],
  ) {
    this.footnoteReferences = new Map(footnoteDefBlocks.map((it, i) => [it.label, {
      index: i + 1,
      referencedPlaces: [],
    }]))
  }
}

export type UrlResolver = (url: string, type: 'link' | 'image' | 'email') => string

export type RenderOption = {
  vanillaHTML: boolean,     // true -> no typora-specific classes, typora export HTML (without styles)
  includeHead: boolean,     // true -> include head and body tag
  title: string | null,     // only used when includeHead = true
  extraHeadTags: string | null,         // only used when includeHead = true
  codeRenderer: CodeRenderer | null,    // only used when vanillaHTML = false
  latexRenderer: LatexRenderer | null,  // only used when vanillaHTML = false
  urlResolver: UrlResolver,
}

const defaultRenderOption: RenderOption = {
  vanillaHTML: false,
  includeHead: false,
  title: null,
  extraHeadTags: null,
  codeRenderer: null,
  latexRenderer: null,
  urlResolver: (url: string, type: 'link' | 'image' | 'email') => {
    if (type === 'email') {
      return `mailto:${url}`
    } else {
      return url
    }
  },
}

export class TyporaParseResult {
  private static readonly includeWhenExportRegex = /^\s*@include-when-export\s+url\((.+)\);\s*$/gm
  private static readonly fontFaceRegex = /@font-face\s+{.*?}/gs
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

  private getCSSTags(css: string | null): string {
    if (css === null) return ''
    const includeWhenExportUrls: string[] = []
    for (const [, includeWhenExportUrl] of matchAll(css, TyporaParseResult.includeWhenExportRegex)) {
      includeWhenExportUrls.push(includeWhenExportUrl)
    }

    css = css.replace(TyporaParseResult.fontFaceRegex, '')
    return `${includeWhenExportUrls.map(url => `<link href='${url}' rel='stylesheet' type='text/css' />`).join('\n')}
<style type='text/css'>
${css}
</style>`
  }

  renderHTML(option?: Partial<RenderOption>): string {
    const context = new RenderContext(this.linkReferences, merge(defaultRenderOption, option), this.tocEntries, this.footnoteDefBlocks)
    this.genHeadingIDs(context)
    let html = this.ast.render(context)
    html += new FootnotesAreaBlock(this.footnoteDefBlocks).render(context)
    html = EscapeUtils.unEscapeMarkdown(html)
    if (!context.renderOption.vanillaHTML) {
      html = `<div class='typora-export-content'>\n<div id='write'  class=''>${html}</div></div>\n`
    }
    if (context.renderOption.includeHead) {
      const titleHtml = context.renderOption.title === null ? '' : `<title>${context.renderOption.title}</title>`
      if (context.renderOption.vanillaHTML) {
        html = `<!doctype html>
<html>
<head>
<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>
${context.renderOption.extraHeadTags ?? ''}
${titleHtml}
</head>
<body>${html}</body>
</html>`
      } else {
        html = `<!doctype html>
<html>
<head>
<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>
${context.renderOption.extraHeadTags ?? ''}
${titleHtml}
</head>
<body class='typora-export'>${html}</body>
</html>`
      }
    }
    return html
  }
}

export type LinkReference = {
  url: string,
  title?: string,
}

const newLineRegex = /\r\n|\n/

function parse(markdown: string): TyporaParseResult {
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

export interface CodeRenderer {
  render: (code: string, language: string | undefined, context: RenderContext) => string,
}

export interface LatexRenderer {
  render: (str: string, block: boolean, context: RenderContext) => string,
}

const TyporaParser = {
  parse,
}

export {TyporaParser}

