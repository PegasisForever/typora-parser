import {Block, BlockMatchResult} from './block'
import {ListItemBlock} from './containerBlocks'
import {any, EscapeUtils, replaceAll} from '../utils'
import {LinkReference, RenderContext} from '../parser'
import {parseInline} from '../inlines/parseInline'
import {RootNode} from '../inlines/inlineNode'

export class ParagraphBlock extends Block {
  static match(lines: string[]): BlockMatchResult | null {
    const paragraph = new ParagraphBlock()
    if (lines.length >= 2 && lines[0] === '' && lines[1] === '') {
      paragraph.close()
      return {
        block: paragraph,
        remaining: lines.slice(2),
      }
    } else {
      paragraph.lines.push(lines[0])
      return {
        block: paragraph,
        remaining: lines.slice(1),
      }
    }
  }

  append(lines: string[]): string[] | null {
    if (!this.isOpen) {
      return null
    } else if (lines[0] === '') {
      this.close()
      return lines.slice(1)
    } else {
      this.lines.push(lines[0])
      return lines.slice(1)
    }
  }

  close(): void {
    super.close()
    this.inlineNode = parseInline(this.lines.join('\n'))
  }

  render(context: RenderContext): string {
    if (context.parent instanceof ListItemBlock && !context.parent.isLoose) {
      return this.renderChildren(context)
    } else {
      const newLine = context.renderOption.vanillaHTML ? '\n' : ''
      if (this.lines.length === 0 || (this.lines.length === 1 && this.lines[0] === '')) {
        return `<p>&nbsp;</p>${newLine}`
      } else {
        return `<p>${this.renderChildren(context)}</p>${newLine}`
      }
    }
  }
}

export class DividerBlock extends Block {
  private static readonly regex = /^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/

  static match(lines: string[]): BlockMatchResult | null {
    const matchResult = lines[0].match(this.regex)
    if (matchResult) {
      const divider = new DividerBlock()
      divider.lines.push(lines[0])
      divider.close()

      if (lines.length > 1 && lines[1] === '') {
        return {
          block: divider,
          remaining: lines.slice(2),
        }
      } else {
        return {
          block: divider,
          remaining: lines.slice(1),
        }
      }
    }

    return null
  }

  append(): string[] | null {
    return null
  }

  render(context: RenderContext): string {
    const newLine = context.renderOption.vanillaHTML ? '\n' : ''
    return `<hr />${newLine}`
  }
}

export class HeadingBlock extends Block {
  private static readonly regex = /^ {0,3}(#{1,6})[ \t]+(.*?)([ \t]+#+)?[ \t]*$/
  private static readonly htmlEscapeChars = [' ', '<', '>', '&', '\'', '"', '\u00A0']
  content = ''
  level: 1 | 2 | 3 | 4 | 5 | 6
  id: string | null = null

  static match(lines: string[]): BlockMatchResult | null {
    let regexMatchResult
    if ((regexMatchResult = lines[0].match(this.regex))) {
      const heading = new HeadingBlock()
      heading.lines.push(lines[0])
      heading.content = regexMatchResult[2]
      heading.level = regexMatchResult[1].length
      heading.close()

      if (lines.length > 1 && lines[1] === '') {
        return {
          block: heading,
          remaining: lines.slice(2),
        }
      } else {
        return {
          block: heading,
          remaining: lines.slice(1),
        }
      }

    } else {
      return null
    }
  }

  append(): string[] | null {
    return null
  }

  close(): void {
    super.close()
    this.inlineNode = parseInline(this.content)
  }

  genID(context: RenderContext): void {
    this.id = this.inlineNode.rawText(context).toLowerCase()
    this.id = this.id.trim()
    // todo also replace punctuations, trim '-'
    for (const char of HeadingBlock.htmlEscapeChars) {
      this.id = replaceAll(this.id, char, '-')
    }
  }

  render(context: RenderContext): string {
    if (context.parent instanceof TOCBlock && !context.renderOption.vanillaHTML) {
      let html = this.renderChildren(context)
      html = `<a class="md-toc-inner" href="#${this.id}">${html}</a>`
      html = `<span role="listitem" class="md-toc-item md-toc-h${this.level}">${html}</span>`
      return html
    } else {
      const newLine = context.renderOption.vanillaHTML ? '\n' : ''
      return `<h${this.level} id='${this.id}'>${this.renderChildren(context)}</h${this.level}>${newLine}`
    }
  }
}

export class FencedCodeBlock extends Block {
  private static readonly startRegex = /^( {0,3})(`{3,}|~{3,}) *(.*?) *$/
  private _indent = 0
  private indentRegex: RegExp

  set indent(value: number) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {0,${this.indent}}`)
  }

  get indent(): number {
    return this._indent
  }

  startToken = ''
  infoString = ''

  static match(lines: string[]): BlockMatchResult | null {
    const regexMatchResult = lines[0].match(this.startRegex)
    if (regexMatchResult) {
      const fencedCode = new FencedCodeBlock()
      fencedCode.indent = regexMatchResult[1].length
      fencedCode.startToken = regexMatchResult[2]
      fencedCode.infoString = regexMatchResult[3]
      return {
        block: fencedCode,
        remaining: lines.slice(1),
      }
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    const line = lines[0].replace(this.indentRegex, '')
    if (line === this.startToken) {
      this.close()
      if (lines.length > 1 && lines[1] === '') {
        return lines.slice(2)
      } else {
        return lines.slice(1)
      }
    } else {
      this.lines.push(line)
      return lines.slice(1)
    }
  }

  protected renderChildren(): string {
    return EscapeUtils.unEscapeMarkdown(this.lines.join('\n'), true)
  }

  render(context: RenderContext): string {
    context.parent = this
    return context.renderOption.codeRenderer.render(this.renderChildren(), this.infoString === '' ? undefined : this.infoString, context)
  }
}

export class MathBlock extends Block {
  // todo what are these two for?
  public startInfo: string | undefined
  public endInfo: string | undefined

  private static readonly startEndRegex = /^\$\$\s*({([^}]*)})?\s*$/

  static match(lines: string[]): BlockMatchResult | null {
    const matchResult = lines[0].match(this.startEndRegex)
    if (matchResult) {
      const block = new MathBlock()
      block.startInfo = matchResult[2]
      return {
        block,
        remaining: lines.slice(1),
      }
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    const matchResult = lines[0].match(MathBlock.startEndRegex)
    if (matchResult) {
      this.endInfo = matchResult[2]
      this.close()
      if (lines.length > 1 && lines[1] === '') {
        return lines.slice(2)
      } else {
        return lines.slice(1)
      }
    } else {
      this.lines.push(lines[0])
      return lines.slice(1)
    }
  }

  close(): void {
    super.close()
    this.lines = this.lines.map(line => EscapeUtils.unEscapeMarkdown(line, true))
  }

  render(context: RenderContext): string {
    const newLine = context.renderOption.vanillaHTML ? '\n' : ''
    context.parent = this
    return context.renderOption.latexRenderer.render(this.lines.join('\n'), context) + newLine
  }
}

enum TableCellAlign {
  LEFT,
  CENTER,
  RIGHT
}

export class TableBlock extends Block {
  private static readonly delimiterCellRegex = /^\| *(:?)-+(:?) */
  columnAlign: TableCellAlign[] = []
  rows: string[][] = []
  rowsNodes: RootNode[][] = []

  private static splitRow(line: string): string[] {
    const pipeIndexes: number[] = []
    let escape = false
    for (let i = 0; i < line.length; i++) {
      if (escape) {
        escape = false
      } else if (line[i] === '\\') {
        escape = true
      } else if (line[i] === '|') {
        pipeIndexes.push(i)
      }
    }

    const result: string[] = []
    for (let i = 0; i < pipeIndexes.length - 1; i++) {
      result.push(line.slice(pipeIndexes[i] + 1, pipeIndexes[i + 1]).trim())
    }
    return result
  }

  static match(lines: string[]): BlockMatchResult | null {
    if (lines.length >= 2) {
      let delimiterRow = lines[1]
      const columnAlign: TableCellAlign[] = []
      let matchResult
      while ((matchResult = delimiterRow.match(this.delimiterCellRegex))) {
        const colon1 = matchResult[1] === ':'
        const colon2 = matchResult[2] === ':'
        if (colon1 && colon2) {
          columnAlign.push(TableCellAlign.CENTER)
        } else if (!colon1 && colon2) {
          columnAlign.push(TableCellAlign.RIGHT)
        } else {
          columnAlign.push(TableCellAlign.LEFT)
        }
        delimiterRow = delimiterRow.slice(matchResult[0].length)
      }
      if (columnAlign.length < 2 || delimiterRow !== '|') {
        return null
      }

      const titleRow = this.splitRow(lines[0])
      if (titleRow.length !== columnAlign.length) {
        return null
      }

      const tableBlock = new TableBlock()
      tableBlock.columnAlign = columnAlign
      tableBlock.rows.push(titleRow)
      tableBlock.lines.push(lines[0], lines[1])
      return {
        block: tableBlock,
        remaining: lines.slice(2),
      }
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    if (lines[0][0] === '|') {
      this.rows.push(TableBlock.splitRow(lines[0]))
      return lines.slice(1)
    } else {
      console.assert(lines[0] === '')
      this.close()
      return lines.slice(1)
    }
  }

  close(): void {
    super.close()
    for (const row of this.rows) {
      this.rowsNodes.push(row.map((cell) => parseInline(cell)))
    }
  }

  private renderRow(i: number, context: RenderContext): string {
    const tag = i === 0 ? 'th' : 'td'

    function getAlignStyle(align: TableCellAlign): string {
      switch (align) {
        case TableCellAlign.LEFT:
          return ''
        case TableCellAlign.CENTER:
          return ' style=\'text-align:center;\' '
        case TableCellAlign.RIGHT:
          return ' style=\'text-align:right;\' '
      }
    }

    return `<tr>${this.rowsNodes[i].map((node, i) => {
      context.parent = this
      let html = node.render(context)
      if (html === '') html = '&nbsp;'
      return `<${tag}${getAlignStyle(this.columnAlign[i])}>${html}</${tag}>`
    }).join('')}</tr>`
  }

  render(context: RenderContext): string {
    const newLine = context.renderOption.vanillaHTML ? '\n' : ''
    const titleStr = `<thead>${newLine}${this.renderRow(0, context)}</thead>${newLine}`
    let bodyStr = ''
    for (let i = 1; i < this.rows.length; i++) {
      bodyStr += this.renderRow(i, context)
    }
    bodyStr = `<tbody>${bodyStr}</tbody>${newLine}`
    return `<figure><table>${newLine}${titleStr}${bodyStr}</table></figure>${newLine}`
  }
}

export class FrontMatterBlock extends Block {
  static process(lines: string[]): { frontMatter: FrontMatterBlock | null, remaining: string[] } {
    const matchResult = FrontMatterBlock.match(lines)
    if (matchResult) {
      // eslint-disable-next-line prefer-const
      let {block: frontMatter, remaining} = matchResult
      while (frontMatter.isOpen) {
        remaining = frontMatter.append(remaining)
      }
      return {
        frontMatter: frontMatter as FrontMatterBlock,
        remaining,
      }
    } else {
      return {
        frontMatter: null,
        remaining: lines,
      }
    }
  }

  static match(lines: string[]): BlockMatchResult | null {
    if (lines[0] === '---' && any(lines.slice(1), line => line === '---' || line === '...')) {
      const frontMatter = new FrontMatterBlock()
      return {
        block: frontMatter,
        remaining: lines.slice(),
      }
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    if (lines[0] === '---' || lines[0] === '...') {
      this.close()
      if (lines.length > 0 && lines[1] === '') {
        return lines.slice(2)
      } else {
        return lines.slice(1)
      }
    } else {
      this.lines.push(lines[0])
      return lines.slice(1)
    }
  }

  render(): string {
    return ''
  }
}

export namespace HTMLBlock {
  abstract class HTMLBlockCondition {
    startRegex: RegExp
    endRegex: RegExp

    start(line: string): boolean {
      return !!line.match(this.startRegex)
    }

    end(line: string): boolean {
      return !!line.match(this.endRegex)
    }
  }

  export class HTMLBlock extends Block {
    // according to the conditions on https://spec.commonmark.org/0.30/#html-blocks.
    // Some conditions are missing because typora doesn't support them.
    private static readonly conditions: HTMLBlockCondition[] = [
      // condition 1
      new class extends HTMLBlockCondition {
        startRegex = /^<(pre|script|style|textarea)( |\t|>|$)/i
        endRegex = /<\/pre>|<\/script>|<\/style>|<\/textarea>/i
      },
      // condition 2
      new class extends HTMLBlockCondition {
        startRegex = /^<!--/
        endRegex = /-->/
      },
      // condition 6
      new class extends HTMLBlockCondition {
        startRegex = /^<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)( |\t|$|\/?>)/i
        endRegex = /^$/
      },
    ]

    condition: HTMLBlockCondition

    static match(lines: string[]): BlockMatchResult | null {
      for (const condition of this.conditions) {
        if (condition.start(lines[0])) {
          const htmlBlock = new HTMLBlock()
          htmlBlock.condition = condition
          htmlBlock.lines.push(lines[0])
          if (condition.end(lines[0])) {
            htmlBlock.close()
            if (lines.length > 1 && lines[1] === '') {
              return {
                block: htmlBlock,
                remaining: lines.slice(2),
              }
            } else {
              return {
                block: htmlBlock,
                remaining: lines.slice(1),
              }
            }
          } else {
            return {
              block: htmlBlock,
              remaining: lines.slice(1),
            }
          }
        }
      }

      return null
    }

    append(lines: string[]): string[] | null {
      if (this.condition.end(lines[0])) {
        if (lines[0] !== '') this.lines.push(lines[0])
        this.close()
        if (lines.length > 1 && lines[1] === '') {
          return lines.slice(2)
        } else {
          return lines.slice(1)
        }
      } else {
        this.lines.push(lines[0])
        return lines.slice(1)
      }
    }

    render(context: RenderContext): string {
      const newLine = context.renderOption.vanillaHTML ? '\n' : ''
      return this.lines.join('\n') + newLine
    }
  }
}

export class LinkRefDefBlock extends Block {
  private static readonly regex = /^ {0,3}\[(.*?[^\\])] {0,3}: *([^ ]+)( *"(.*?[^\\])")?$/
  label: string
  def: LinkReference

  static match(lines: string[]): BlockMatchResult | null {
    const matchResult = lines[0].match(this.regex)
    if (matchResult) {
      const def = {
        url: matchResult[2],
        title: matchResult[4],
      }
      const defBlock = new LinkRefDefBlock()
      defBlock.label = matchResult[1]
      defBlock.def = def
      defBlock.close()

      if (lines.length > 1 && lines[1] === '') {
        return {
          block: defBlock,
          remaining: lines.slice(2),
        }
      } else {
        return {
          block: defBlock,
          remaining: lines.slice(1),
        }
      }
    }
    return null
  }

  append(): string[] | null {
    return null
  }

  render(): string {
    return ''
  }
}

export class FootnoteDefBlock extends Block {
  label: string
  private static readonly regex = /^\[\^([^\]]+)]: *(.+)$/

  static match(lines: string[]): BlockMatchResult | null {
    const matchResult = lines[0].match(this.regex)
    if (matchResult) {
      const block = new FootnoteDefBlock()
      block.label = matchResult[1]
      block.lines.push(matchResult[2])
      block.close()

      if (lines.length > 1 && lines[1] === '') {
        return {
          block,
          remaining: lines.slice(2),
        }
      } else {
        return {
          block,
          remaining: lines.slice(1),
        }
      }
    }
    return null
  }

  close(): void {
    super.close()
    this.inlineNode = parseInline(this.lines[0])
  }

  append(): string[] | null {
    return null
  }

  render(context: RenderContext): string {
    if (context.stage === 'footnote') {
      const footnoteRefs = context.footnoteReferences.get(this.label)!
      let html = this.renderChildren(context)
      html = `<span class='md-fn-count'>${footnoteRefs.index}</span> ${html}`
      for (const {refHref, defHref} of footnoteRefs.referencedPlaces) {
        html += ` <a name='${defHref}' href='#${refHref}' title='back to document' class='reversefootnote' >↩</a>`
      }
      html = `<div class='footnote-line'>${html}</div>`
      return html
    } else {
      return ''
    }
  }
}

export class TOCBlock extends Block {
  private static readonly regex = /^ *\[toc] *$/i

  static match(lines: string[]): BlockMatchResult | null {
    if (lines[0].match(this.regex)) {
      const toc = new TOCBlock()
      toc.close()
      if (lines.length > 1 && lines[1] === '') {
        return {
          block: toc,
          remaining: lines.slice(2),
        }
      } else {
        return {
          block: toc,
          remaining: lines.slice(1),
        }
      }
    } else {
      return null
    }
  }

  append(): string[] | null {
    return null
  }

  render(context: RenderContext): string {
    if (context.renderOption.vanillaHTML) {
      return '<div>[TOC]</div>\n'
    } else {
      let html = context.tocEntries.map(heading => {
        context.parent = this
        return heading.render(context)
      }).join('')
      html = `<div class='md-toc' mdtype='toc'><p class="md-toc-content" role="list">${html}</p></div>`
      return html
    }
  }
}
