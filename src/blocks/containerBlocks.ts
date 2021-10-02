import {Block, BlockMatchResult} from './block'
import {any, last} from '../utils'
import {
  DividerBlock,
  FencedCodeBlock,
  HeadingBlock,
  HTMLBlock,
  LinkRefDefBlock,
  MathBlock,
  ParagraphBlock,
  TableBlock,
  TOCBlock,
} from './leafBlocks'

export abstract class ContainerBlock extends Block {
  children: Block[] = []

  protected constructChildren(lines: string[]): Block[] {
    const blockTypes = [
      MathBlock,
      QuoteBlock,
      ListBlock,
      TableBlock,
      LinkRefDefBlock,
      TOCBlock,
      HTMLBlock.HTMLBlock,
      FencedCodeBlock,
      HeadingBlock,
      DividerBlock,
      ParagraphBlock,
    ]
    const blockTypesExceptParagraph = blockTypes.filter(it => it !== ParagraphBlock)
    const children: Block[] = []
    out:
      while (lines.length > 0) {
        // if last children is an open paragraph
        if (children.length > 0 && last(children) instanceof ParagraphBlock && last(children).isOpen) {

          // if any other block type matches this new line, close the paragraph
          for (const blockType of blockTypesExceptParagraph) {
            const matchResult = blockType.match(lines)
            if (matchResult) {
              last(children).close()
              children.push(matchResult.block)
              lines = matchResult.remaining
              continue out
            }
          }

          // if no other block type matches this new line, append this line to the paragraph
          lines = last(children).append(lines)
          console.assert(lines !== null && lines !== undefined)
        } else {

          // try to append new line to the last open children
          let newLines
          if (children.length > 0 && last(children).isOpen && (newLines = last(children).append(lines))) {
            lines = newLines
            continue
          }

          // try to find a block type that matches the new line
          for (const blockType of blockTypes) {
            const matchResult = blockType.match(lines)
            if (matchResult) {
              children.push(matchResult.block)
              lines = matchResult.remaining
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

  close(): void {
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
  private static readonly quoteMarkerRegex = /^ {0,3}> ?/

  static match(lines: string[]): BlockMatchResult | null {
    if (lines[0].match(this.quoteMarkerRegex)) {
      const quote = new QuoteBlock()
      quote.lines.push(lines[0])
      return {
        block: quote,
        remaining: lines.slice(1),
      }
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

  close(): void {
    super.close()
    const lines = this.lines.map(it => it.replace(QuoteBlock.quoteMarkerRegex, ''))
    this.children = this.constructChildren(lines)
  }

  render(): string {
    return `<blockquote>${this.renderChildren()}</blockquote>\n`
  }
}

export type ListMarkerType = '-' | '+' | '*' | '.' | ')'

export class ListItemBlock extends ContainerBlock {
  private static readonly unorderedMarkerRegex = /^([-+*]) (\[([ x])] )?/
  private static readonly orderedMarkerRegex = /^(\d{1,9})([.)]) /

  private _indent = 0
  set indent(value: number) {
    this._indent = value
    this.indentRegex = new RegExp(`^ {${this.indent}}`)
  }

  get indent(): number {
    return this._indent
  }

  private indentRegex: RegExp
  isOrdered = true
  order = 0
  listMarkerType: ListMarkerType
  isCheckbox = false
  isChecked = false

  _isLoose: boolean | null = null

  set isLoose(value: boolean) {
    this._isLoose = value
  }

  get isLoose(): boolean {
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

  static match(lines: string[]): BlockMatchResult | null {
    let matchResult
    if ((matchResult = lines[0].match(this.orderedMarkerRegex))) {
      const listItem = new ListItemBlock()
      listItem.indent = matchResult[0].length
      listItem.isOrdered = true
      listItem.lines.push(lines[0].substring(matchResult[0].length))
      listItem.order = parseInt(matchResult[1], 10)
      listItem.listMarkerType = matchResult[2]
      return {
        block: listItem,
        remaining: lines.slice(1),
      }
    } else if ((matchResult = lines[0].match(this.unorderedMarkerRegex))) {
      const listItem = new ListItemBlock()
      listItem.indent = 2
      listItem.isOrdered = false
      listItem.lines.push(lines[0].substring(matchResult[0].length))
      listItem.listMarkerType = matchResult[1]
      if (matchResult[2]) {
        listItem.isCheckbox = true
        listItem.isChecked = matchResult[3] === 'x'
      }
      return {
        block: listItem,
        remaining: lines.slice(1),
      }
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
      this.lines.push(lines[0].replace(this.indentRegex, ''))
      return lines.slice(1)
    } else {
      this.close()
      return null
    }
  }

  close(): void {
    super.close()
    this.children = this.constructChildren(this.lines)
  }

  render(): string {
    const checkboxStr = this.isCheckbox ? `<input type='checkbox' ${this.isChecked ? 'checked' : ''}/>` : ''
    return `<li>${checkboxStr}${this.renderChildren()}</li>\n`
  }
}

export class ListBlock extends ContainerBlock {
  children: ListItemBlock[] = []

  _isLoose: boolean | null = null

  set isLoose(value: boolean) {
    this._isLoose = value
    for (const listItem of this.children) {
      listItem.isLoose = value
    }
  }

  get isLoose(): boolean {
    if (!this._isLoose) {
      this._isLoose = any(this.children, it => it.isLoose)
    }
    return this._isLoose
  }

  get startNumber(): number {
    return this.children[0].order
  }

  get isOrdered(): boolean {
    return this.children[0].isOrdered
  }

  get listMarkerType(): ListMarkerType {
    return this.children[0].listMarkerType
  }

  static match(lines: string[]): BlockMatchResult | null {
    const matchResult = ListItemBlock.match(lines)
    if (matchResult) {
      const listBlock = new ListBlock()
      listBlock.children.push(matchResult.block as ListItemBlock)
      return {
        block: listBlock,
        remaining: matchResult.remaining,
      }
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
      const {block, remaining} = matchResult
      const newChild = block as ListItemBlock
      if (newChild.listMarkerType === this.listMarkerType) {
        this.children.push(block as ListItemBlock)
        return remaining
      }
    }

    this.close()
    return null
  }

  close(): void {
    super.close()
    if (last(this.children).isOpen) last(this.children).close()
    // eslint-disable-next-line no-self-assign
    this.isLoose = this.isLoose
  }

  render(): string {
    if (this.isOrdered) {
      const startStr = this.startNumber !== 1 ? ` start='${this.startNumber}' ` : ''
      return `<ol${startStr}>\n${this.renderChildren()}\n</ol>\n`
    } else {
      return `<ul>\n${this.renderChildren()}\n</ul>\n`
    }
  }
}
