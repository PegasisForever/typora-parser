import {any, last} from './utils'

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

  protected renderChildren(): string {
    return this.lines.join('')
  }

  abstract render(parent: Block): string
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

  render(parent: Block): string {
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

  render(parent: Block): string {
    return `<hr />\n`
  }
}

export class HeadingBlock extends Block {
  private static regex = /^ {0,3}(#{1,6})[ \t]+(.*?)([ \t]+#+)?[ \t]*$/
  public content = ''
  public level: 1 | 2 | 3 | 4 | 5 | 6

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

  render(parent: Block): string {
    // todo id
    return `<h${this.level} id='${this.content.replaceAll(' ', '-').toLowerCase()}'>${this.renderChildren()}</h${this.level}>\n`
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

  protected renderChildren(): string {
    return this.lines.join('\n') + '\n'
  }

  render(parent: Block): string {
    return `<pre><code>${this.renderChildren()}</code></pre>\n`
  }
}

abstract class ContainerBlock extends Block {
  children: Block[] = []

  protected constructChildren(lines: string[]): Block[] {
    const blockTypes = [
      QuoteBlock,
      ListBlock,
      FencedCodeBlock,
      HeadingBlock,
      DividerBlock,
      ParagraphBlock,
    ]
    let blockTypesExceptParagraph = blockTypes.filter(it => it !== ParagraphBlock)
    let children: Block[] = []
    out:
      while (lines.length > 0) {
        // if last children is an open paragraph
        if (children.length > 0 && last(children) instanceof ParagraphBlock && last(children).isOpen) {

          // if any other block type matches this new line, close the paragraph
          for (const blockType of blockTypesExceptParagraph) {
            let matchResult = blockType.match(lines)
            if (matchResult) {
              last(children).close()
              children.push(matchResult[0])
              lines = matchResult[1]
              continue out
            }
          }

          // if no other block type matches this new line, append this line to the paragraph
          lines = last(children).append(lines)
          console.assert(lines !== null)
        } else {

          // try to append new line to the last open children
          let newLines
          if (children.length > 0 && last(children).isOpen && (newLines = last(children).append(lines))) {
            lines = newLines
            continue
          }

          // try to find a block type that matches the new line
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

  protected renderChildren(): string {
    return this.children.map(it => it.render(this)).join('')
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

  render(): string {
    return this.renderChildren()
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

  render(parent: Block): string {
    return `<blockquote>${this.renderChildren()}</blockquote>\n`
  }
}

export type ListMarkerType = '-' | '+' | '*' | '.' | ')'

export class ListItemBlock extends ContainerBlock {
  private static readonly unorderedMarkerRegex = /^([-+*]) /
  private static readonly orderedMarkerRegex = /^(\d{1,9})([.)]) /

  private _indent = 0
  set indent(value) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {${this.indent}}`)
  }

  get indent() {
    return this._indent
  }

  private indentRegex: RegExp
  public isOrdered = true
  public order = 0
  public listMarkerType: ListMarkerType

  _isLoose: boolean | null = null

  set isLoose(value: boolean) {
    this._isLoose = value
  }

  get isLoose() {
    if (!this._isLoose) {
      if (this.children.length === 1 && this.children[0] instanceof ParagraphBlock) {
        this._isLoose = false
      } else {
        this._isLoose = any(this.children, it => {
          if (it instanceof ListBlock) {
            return it.isLoose
          } else {
            return true
          }
        })
      }
    }

    return this._isLoose
  }

  static match(lines: string[]): BlockMatchResult {
    let matchResult
    if ((matchResult = lines[0].match(this.orderedMarkerRegex))) {
      const listItem = new ListItemBlock()
      listItem.indent = matchResult[0].length
      listItem.isOrdered = true
      listItem.order = parseInt(matchResult[1], 10)
      listItem.lines.push(lines[0])
      listItem.listMarkerType = matchResult[2]
      return [listItem, lines.slice(1)]
    } else if ((matchResult = lines[0].match(this.unorderedMarkerRegex))) {
      const listItem = new ListItemBlock()
      listItem.indent = matchResult[0].length
      listItem.isOrdered = false
      listItem.lines.push(lines[0])
      listItem.listMarkerType = matchResult[1]
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
    lines.push(this.lines[0].replace(this.isOrdered ? ListItemBlock.orderedMarkerRegex : ListItemBlock.unorderedMarkerRegex, ''))
    for (let i = 1; i < this.lines.length; i++) {
      lines.push(this.lines[i].replace(this.indentRegex, ''))
    }
    this.children = this.constructChildren(lines)
  }

  render(parent: ListBlock): string {
    if (parent.isLoose) {
      return `<li>${this.renderChildren()}</li>\n`
    } else {
      return `<li>${this.renderChildren()}</li>\n`
    }
  }
}

class ListBlock extends ContainerBlock {
  children: ListItemBlock[] = []

  _isLoose: boolean | null = null

  set isLoose(value: boolean) {
    this._isLoose = value
    for (const listItem of this.children) {
      listItem.isLoose = value
    }
  }

  get isLoose() {
    if (!this._isLoose) {
      this._isLoose = any(this.children, it => it.isLoose)
    }
    return this._isLoose
  }

  get startNumber() {
    return this.children[0].order
  }

  get isOrdered() {
    return this.children[0].isOrdered
  }

  get listMarkerType(): ListMarkerType {
    return this.children[0].listMarkerType
  }

  static match(lines: string[]): BlockMatchResult {
    const matchResult = ListItemBlock.match(lines)
    if (matchResult) {
      const listBlock = new ListBlock()
      listBlock.children.push(matchResult[0] as ListItemBlock)
      return [listBlock, matchResult[1]]
    } else {
      return null
    }
  }

  append(lines: string[]): string[] | null {
    if (last(this.children).isOpen) {
      const newLines = last(this.children).append(lines)
      if (newLines) {
        return newLines
      }
    }

    console.assert(!last(this.children).isOpen)
    const matchResult = ListItemBlock.match(lines)
    if (matchResult) {
      const newChild = matchResult[0] as ListItemBlock
      if (newChild.listMarkerType === this.listMarkerType) {
        this.children.push(matchResult[0] as ListItemBlock)
        return matchResult[1]
      }
    }

    this.close()
    return null
  }

  close() {
    super.close()
    if (last(this.children).isOpen) last(this.children).close()
    this.isLoose = this.isLoose
  }

  render(parent: Block): string {
    if (this.isOrdered) {
      const startStr = this.startNumber !== 1 ? ` start='${this.startNumber}' ` : ''
      return `<ol${startStr}>\n${this.renderChildren()}\n</ol>\n`
    } else {
      return `<ul>\n${this.renderChildren()}\n</ul>\n`
    }
  }
}
