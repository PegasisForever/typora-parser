import {Blocks, BlockMatchResult} from './blocks'
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
