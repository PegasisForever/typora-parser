import {last} from './utils'

export abstract class Block {
  public lines: string[] = []
  private _isOpen = true
  public get isOpen() {
    return this._isOpen
  }

  close() {
    this._isOpen = false
  }

  // return consumed string[] if successfully appended
  abstract append(lines: string[]): string[] | null
}

export type BlockMatchResult = [Block, string[]] | null

export class ParagraphBlock extends Block {
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
}

export class DividerBlock extends Block {
  private static regex = /^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/

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
}

export class HeadingBlock extends Block {
  private static regex = /^ {0,3}#{1,6}[ \t]+(.*?)([ \t]+#+)?[ \t]*$/
  public content = ''

  static match(lines: string[]): BlockMatchResult {
    let regexMatchResult
    if (lines.length >= 2 && lines[1] === '' && (regexMatchResult = lines[0].match(this.regex))) {
      const heading = new HeadingBlock()
      heading.lines.push(lines[0])
      heading.content = regexMatchResult[1]
      heading.close()
      return [heading, lines.slice(2)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    return null
  }
}

export class FencedCodeBlock extends Block {
  private static startRegex = /^( {0,3})(`{3,}|~{3,}) *(.*?) *$/
  private _indent = 0
  set indent(value) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {0,${this.indent}}`)
  }

  get indent() {
    return this._indent
  }

  private indentRegex: RegExp
  public startToken = ''
  public infoString = ''

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
}

abstract class ContainerBlock extends Block {
  children: Block[] = []

  protected constructChildren(lines: string[]): Block[] {
    let blockTypesExceptParagraph = blockTypes.filter(it => it !== ParagraphBlock)
    let children: Block[] = []
    out:
      while (lines.length > 0) {
        if (children.length > 0 && last(children) instanceof ParagraphBlock && last(children).isOpen) {
          for (const blockType of blockTypesExceptParagraph) {
            let matchResult = blockType.match(lines)
            if (matchResult) {
              last(children).close()
              children.push(matchResult[0])
              lines = matchResult[1]
              continue out
            }
          }

          lines = last(children).append(lines)
          console.assert(lines !== null)
        } else {
          let newLines
          if (children.length > 0 && last(children).isOpen && (newLines = last(children).append(lines))) {
            lines = newLines
            continue
          }

          for (const blockType of blockTypes) {
            let matchResult = blockType.match(lines)
            if (matchResult) {
              children.push(matchResult[0])
              lines = matchResult[1]
              continue out
            }
          }

          throw new Error(`No match for lines: ${lines}`)
        }
      }
    if (last(children).isOpen) last(children).close()
    return children
  }
}

export class RootBlock extends ContainerBlock {
  constructor(lines: string[]) {
    super()
    this.lines = lines
  }

  close() {
    super.close()
    this.children = this.constructChildren(this.lines)
  }

  append(lines: string[]): string[] | null {
    this.lines.push(...lines)
    return []
  }
}

export class QuoteBlock extends ContainerBlock {
  private static quoteMarkerRegex = /^ {0,3}> ?/

  static match(lines: string[]): BlockMatchResult {
    if (lines[0].match(this.quoteMarkerRegex)) {
      const quote = new QuoteBlock()
      quote.lines.push(lines[0])
      return [quote, lines.slice(1)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    if (lines[0].match(QuoteBlock.quoteMarkerRegex)) {
      this.lines.push(lines[0])
      return lines.slice(1)
    } else {
      console.assert(lines[0] === '')
      this.close()
      return lines.slice(1)
    }
  }

  close() {
    super.close()
    const lines = this.lines.map(it => it.replace(QuoteBlock.quoteMarkerRegex, ''))
    this.children = this.constructChildren(lines)
  }
}

export class ListItem extends ContainerBlock {
  private static unorderedMarkerRegex = /^[-+*] /
  private static orderedMarkerRegex = /^(\d{1,9}). /

  private _indent = 0
  set indent(value) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {${this.indent}}`)
  }

  get indent() {
    return this._indent
  }

  private indentRegex: RegExp
  public ordered = true
  public order = 0

  static match(lines: string[]): BlockMatchResult {
    let matchResult
    if ((matchResult = lines[0].match(this.orderedMarkerRegex))) {
      const listItem = new ListItem()
      listItem.indent = matchResult[0].length
      listItem.ordered = true
      listItem.order = parseInt(matchResult[1], 10)
      listItem.lines.push(lines[0])
      return [listItem, lines.slice(1)]
    } else if ((matchResult = lines[0].match(this.unorderedMarkerRegex))) {
      const listItem = new ListItem()
      listItem.indent = matchResult[0].length
      listItem.ordered = false
      listItem.lines.push(lines[0])
      return [listItem, lines.slice(1)]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    if (lines[0] === '') {
      if (last(this.lines) === '') {
        this.close()
        return null
      } else {
        this.lines.push(lines[0])
        return lines.slice(1)
      }
    } else if (lines[0].match(this.indentRegex)) {
      this.lines.push(lines[0])
      return lines.slice(1)
    } else {
      this.close()
      return null
    }
  }

  close() {
    super.close()
    const lines = []
    lines.push(this.lines[0].replace(this.ordered ? ListItem.orderedMarkerRegex : ListItem.unorderedMarkerRegex, ''))
    for (let i = 1; i < this.lines.length; i++) {
      lines.push(this.lines[i].replace(this.indentRegex, ''))
    }
    this.children = this.constructChildren(lines)
  }
}


export const leafBlockTypes = [
  FencedCodeBlock,
  HeadingBlock,
  DividerBlock,
  ParagraphBlock,
]

export const containerBlockTypes = [
  QuoteBlock,
  ListItem,
]

export const blockTypes = [
  ...containerBlockTypes,
  ...leafBlockTypes,
]
