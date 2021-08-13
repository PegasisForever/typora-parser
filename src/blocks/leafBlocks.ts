import {BlockMatchResult, Blocks} from './blocks'
import {ListItemBlock} from './containerBlocks'

export class ParagraphBlock extends Blocks {
  static match(lines: string[]): BlockMatchResult {
    const paragraph = new ParagraphBlock()
    if (lines.length >= 2 && lines[0] === '' && lines[1] === '') {
      paragraph.close()
      return [paragraph, lines.slice(2)]
    } else {
      paragraph.lines.push(lines[0])
      return [paragraph, lines.slice(1)]
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

  render(parent: Blocks): string {
    if (parent instanceof ListItemBlock && !parent.isLoose) {
      return this.renderChildren()
    } else {
      if (this.lines.length === 0 || (this.lines.length === 1 && this.lines[0] === '')) {
        return `<p>&nbsp;</p>\n`
      } else {
        return `<p>${this.renderChildren()}</p>\n`
      }
    }
  }
}

export class DividerBlock extends Blocks {
  private static readonly regex = /^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/

  static match(lines: string[]): BlockMatchResult {
    if (lines.length >= 2 && lines[1] === '' && lines[0].match(this.regex)) {
      const divider = new DividerBlock()
      divider.lines.push(lines[0])
      divider.close()
      return [divider, lines.slice(2)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    return null
  }

  render(parent: Blocks): string {
    return `<hr />\n`
  }
}

export class HeadingBlock extends Blocks {
  private static readonly regex = /^ {0,3}(#{1,6})[ \t]+(.*?)([ \t]+#+)?[ \t]*$/
  content = ''
  level: 1 | 2 | 3 | 4 | 5 | 6

  static match(lines: string[]): BlockMatchResult {
    let regexMatchResult
    if (lines.length >= 2 && lines[1] === '' && (regexMatchResult = lines[0].match(this.regex))) {
      const heading = new HeadingBlock()
      heading.lines.push(lines[0])
      heading.content = regexMatchResult[2]
      heading.level = regexMatchResult[1].length
      heading.close()
      return [heading, lines.slice(2)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    return null
  }

  protected renderChildren(): string {
    return this.content
  }

  render(parent: Blocks): string {
    return `<h${this.level} id='${this.content.replaceAll(' ', '-').toLowerCase()}'>${this.renderChildren()}</h${this.level}>\n`
  }
}

export class FencedCodeBlock extends Blocks {
  private static readonly startRegex = /^( {0,3})(`{3,}|~{3,}) *(.*?) *$/
  private _indent = 0
  private indentRegex: RegExp

  set indent(value) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {0,${this.indent}}`)
  }

  get indent() {
    return this._indent
  }

  startToken = ''
  infoString = ''

  static match(lines: string[]): BlockMatchResult {
    let regexMatchResult = lines[0].match(this.startRegex)
    if (regexMatchResult) {
      const fencedCode = new FencedCodeBlock()
      fencedCode.indent = regexMatchResult[1].length
      fencedCode.startToken = regexMatchResult[2]
      fencedCode.infoString = regexMatchResult[3]
      return [fencedCode, lines.slice(1)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    const line = lines[0].replace(this.indentRegex, '')
    if (lines.length >= 2 && line === this.startToken && lines[1] === '') {
      this.close()
      return lines.slice(2)
    } else {
      this.lines.push(line)
      return lines.slice(1)
    }
  }

  protected renderChildren(): string {
    return this.lines.join('\n') + '\n'
  }

  render(parent: Blocks): string {
    return `<pre><code>${this.renderChildren()}</code></pre>\n`
  }
}

enum TableCellAlign {
  LEFT,
  CENTER,
  RIGHT
}

export class TableBlock extends Blocks {
  private static readonly delimiterCellRegex = /^\| *(:?)-+(:?) */
  columnAlign: TableCellAlign[] = []
  rows: string[][] = []

  private static splitRow(line: string): string[] {
    let pipeIndexes: number[] = []
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

    let result: string[] = []
    for (let i = 0; i < pipeIndexes.length - 1; i++) {
      result.push(line.slice(pipeIndexes[i] + 1, pipeIndexes[i + 1]).trim())
    }
    return result
  }

  static match(lines: string[]): BlockMatchResult {
    if (lines.length >= 2) {
      let delimiterRow = lines[1]
      let columnAlign: TableCellAlign[] = []
      let matchResult
      while (matchResult = delimiterRow.match(this.delimiterCellRegex)) {
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

      let titleRow = this.splitRow(lines[0])
      if (titleRow.length !== columnAlign.length) {
        return null
      }

      const tableBlock = new TableBlock()
      tableBlock.columnAlign = columnAlign
      tableBlock.rows.push(titleRow)
      tableBlock.lines.push(lines[0], lines[1])
      return [tableBlock, lines.slice(2)]
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

  private renderRow(i: number): string {
    const tag = i === 0 ? 'th' : 'td'

    function getAlignStyle(align: TableCellAlign): string {
      switch (align) {
        case TableCellAlign.LEFT:
          return ''
        case TableCellAlign.CENTER:
          return ` style='text-align:center;' `
        case TableCellAlign.RIGHT:
          return ` style='text-align:right;' `
      }
    }

    return `<tr>${this.rows[i].map((cellText, i) => `<${tag}${getAlignStyle(this.columnAlign[i])}>${cellText}</${tag}>`).join('')}</tr>`
  }

  render(parent: Blocks): string {
    const titleStr = `<thead>\n${this.renderRow(0)}</thead>\n`
    let bodyStr = ''
    for (let i = 1; i < this.rows.length; i++) {
      bodyStr += this.renderRow(i)
    }
    bodyStr = `<tbody>${bodyStr}</tbody>\n`
    return `<figure><table>\n${titleStr}${bodyStr}</table></figure>\n`
  }
}
