import {ContainerBlock, RootBlock} from './blocks/containerBlocks'
import {FrontMatterBlock, HeadingBlock, LinkRefDefBlock} from './blocks/leafBlocks'
import {Block} from './blocks/block'
import {EscapeUtils} from './utils'
import {loadMathJax} from './mathJax'

export class MarkdownParseResult {
  ast: RootBlock
  frontMatter: string | null = null
  linkReferences: Map<string, LinkReference>
  tocEntries: HeadingBlock[]

  renderHTML(): string {
    return EscapeUtils.unEscapeMarkdown(this.ast.render())
  }
}

export type LinkReference = {
  destination: string,
  title?: string,
}

function parse(markdown: string): MarkdownParseResult {
  markdown = markdown.replaceAll('\u0000', '\uFFFD')
  {
    let newMarkdown = ''
    let i = 0
    let escape = false
    while (i < markdown.length) {
      const char = markdown[i]
      if (escape) {
        const escapedCharIndex = EscapeUtils.mdEscapableChars.indexOf(char)
        if (escapedCharIndex >= 0) {
          newMarkdown += EscapeUtils.mdEscapableCharReplaces[escapedCharIndex]
        } else {
          newMarkdown += '\\' + char
        }
        escape = false
      } else if (char === '\\') {
        escape = true
      } else {
        newMarkdown += char
      }
      i++
    }

    markdown = newMarkdown
  }

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

const TyporaParser = {
  parse,
  initLatex: loadMathJax,
}

export default TyporaParser
