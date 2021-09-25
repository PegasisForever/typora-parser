import {parseNestedBrackets, ParseNestedBracketsResult} from './parseNestedBrackets'
import {last} from '../utils'

export type InlineNodeMatchResult = { node: InlineNode | InlineNode[], remaining: string }

export abstract class InlineNode {
  constructor(
    public text: string,
  ) {
  }

  abstract rawText(parent: InlineNode): string

  abstract render(parent: InlineNode): string
}

export class TextNode extends InlineNode {
  rawText(): string {
    return this.text
  }

  render(): string {
    return this.text
  }
}

export class CodeSpanNode extends InlineNode {
  private static readonly backtickRegex = /^`+/

  static match(line: string): InlineNodeMatchResult | null {
    const backtickStr = line.match(this.backtickRegex)?.[0]
    if (!backtickStr) return null
    const {parsed, remaining} = parseNestedBrackets(line, backtickStr, backtickStr)
    if (parsed) {
      return {
        node: new CodeSpanNode(parsed),
        remaining,
      }
    } else {
      return null
    }
  }

  rawText(): string {
    return this.text
  }

  render(): string {
    return `<code>${this.text}</code>`
  }
}

export class AutolinkNode extends InlineNode {
  constructor(
    url: string,
    public isEmail: boolean,
  ) {
    super(url)
  }

  private static readonly bracketAutolinkRegex = /^<(([a-z0-9+.\-_]{2,32}:)|(www\.))[^ <>]+>/i
  private static readonly noBracketAutolinkRegex = /^((https:|http:)[^ <>]+)|(www\.[^ <>]+\.[^ <>]+)/i
  private static readonly bracketAutolinkEmailRegex = /^<[a-z0-9+.\-_]+@[a-z0-9+.\-_]+>/
  private static readonly noBracketAutolinkEmailRegex = /^[a-z0-9+.\-_]+@[a-z0-9+.\-_]+\.(com|edu|net|org|au|ca|cn|co|de|fm|io|jp|me|ru|tv|us)/i

  private static matchSingle(line: string, regex: RegExp, isEmail: boolean): InlineNodeMatchResult | null {
    const matchResult = line.match(regex)
    if (!matchResult) return null
    let url = matchResult[0]
    const remaining = line.substring(url.length)
    if (url[0] === '<') url = url.substring(1, url.length - 1)

    return {
      node: new AutolinkNode(url, isEmail),
      remaining,
    }
  }

  static match(line: string): InlineNodeMatchResult | null {
    return this.matchSingle(line, this.bracketAutolinkEmailRegex, true) ??
      this.matchSingle(line, this.noBracketAutolinkEmailRegex, true) ??
      this.matchSingle(line, this.bracketAutolinkRegex, false) ??
      this.matchSingle(line, this.noBracketAutolinkRegex, false)
  }

  rawText(): string {
    return this.text
  }

  render(): string {
    if (this.isEmail) {
      return `<a href='mailto:${this.text}' target='_blank' class='url'>${this.text}</a>`
    } else {
      return `<a href='${this.text}' target='_blank' class='url'>${this.text}</a>`
    }
  }

}

export abstract class ContainerInlineNode extends InlineNode {
  children: InlineNode[] = []

  protected constructChildren(text: string): InlineNode[] {
    const inlineNodeTypes = [
      CodeSpanNode,
      LinkNode,
      AutolinkNode,
      EmphNode.EmphNode,
    ]

    const inlineNodes: InlineNode[] = []
    let buffer = ''
    out: while (text.length > 0) {
      for (const inlineNodeType of inlineNodeTypes) {
        const matchResult = inlineNodeType.match(text)
        if (!matchResult) continue
        const {node, remaining} = matchResult

        if (buffer !== '') {
          inlineNodes.push(new TextNode(buffer))
          buffer = ''
        }
        if (node instanceof InlineNode) {
          inlineNodes.push(node)
        } else {
          inlineNodes.push(...node)
        }
        text = remaining
        continue out
      }

      buffer += text[0]
      text = text.substring(1)
    }

    if (buffer !== '') {
      inlineNodes.push(new TextNode(buffer))
    }
    return inlineNodes
  }

  rawText(): string {
    return this.children.map(it => it.rawText(this)).join('')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(parent: InlineNode): string {
    return this.children.map(it => it.render(this)).join('')
  }
}

export class RootNode extends ContainerInlineNode {
  constructor(
    text: string,
  ) {
    super(text)
    this.children = this.constructChildren(text)
  }
}

namespace EmphNode {
  export enum EmphasisType {
    NONE,
    ITALIC,
    BOLD,
  }

  enum DelimiterFlanking {
    LEFT,
    RIGHT,
  }

  type DelimiterChar = '*' | '_'
  type FindDelimiterResult = { before: string, delimiterRun: string, after: string }

  const punctuationRegex = /[!"#$%&'()+,-./:;<=>?@[\\\]^_`{|}~]/
  const whiteSpaceRegex = /\s|^$/

  function analyzeBeforeAfterChar(beforeChar: string, afterChar: string): { bWhiteSpace: boolean, bPunctuation: boolean, aWhiteSpace: boolean, aPunctuation: boolean } {
    return {
      bWhiteSpace: !!beforeChar.match(whiteSpaceRegex),
      bPunctuation: !!beforeChar.match(punctuationRegex),
      aWhiteSpace: !!afterChar.match(whiteSpaceRegex),
      aPunctuation: !!afterChar.match(punctuationRegex),
    }
  }

  function isLeftDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
    const {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

    // no intraword "_" emphasis
    if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
      return false
    }

    // preceded by whitespace or punctuation, followed by punctuation
    if ((bWhiteSpace || bPunctuation) && aPunctuation) {
      return true
    }

    // not followed by whitespace or punctuation
    // noinspection RedundantIfStatementJS
    if (!aWhiteSpace && !aPunctuation) {
      return true
    }

    return false
  }

  function isRightDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
    const {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

    // no intraword "_" emphasis
    if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
      return false
    }

    // preceded by punctuation, followed by whitespace or punctuation
    if (bPunctuation && (aWhiteSpace || aPunctuation)) {
      return true
    }

    // not preceded by whitespace or punctuation
    // noinspection RedundantIfStatementJS
    if (!bWhiteSpace && !bPunctuation) {
      return true
    }

    return false
  }

  function toDelimiterChar(str: string): DelimiterChar | undefined {
    if (str === '*' || str === '_') {
      return str
    } else {
      return undefined
    }
  }

  function findFirstDelimiter(str: string, flanking: DelimiterFlanking, delimiterRun?: string, inputDelimiterChar?: DelimiterChar, findBeforeI = Infinity, allowSplitDelimiterRun?: boolean): FindDelimiterResult | undefined {
    let i = 0
    while (i <= str.length) {
      let delimiterChar: DelimiterChar | undefined = undefined
      while (delimiterChar === undefined) {
        if (i >= findBeforeI) return undefined
        if (i >= str.length) return undefined
        delimiterChar = toDelimiterChar(str[i])
        if (inputDelimiterChar !== undefined && delimiterChar !== inputDelimiterChar) delimiterChar = undefined
        i++
      }
      let before = str.substring(0, i - 1)

      let delimiterCount = 1
      while (str[i] === delimiterChar) {
        delimiterCount++
        i++
      }
      if (allowSplitDelimiterRun && delimiterRun && delimiterCount > delimiterRun.length) {
        before += delimiterChar.repeat(delimiterCount - delimiterRun.length)
        delimiterCount = delimiterRun.length
      }

      const result = {
        before,
        delimiterRun: delimiterChar.repeat(delimiterCount),
        after: str.substring(i),
      }

      const flankingTestFunction = flanking === DelimiterFlanking.LEFT ? isLeftDelimiter : isRightDelimiter
      if ((delimiterRun === undefined || result.delimiterRun === delimiterRun) && flankingTestFunction(last(before) ?? '', result.delimiterRun, result.after[0] ?? '')) {
        return result
      }
    }
  }

  export class EmphNode extends ContainerInlineNode {
    constructor(
      text: string,
      public emphasisType: EmphasisType,
    ) {
      super(text)
      this.children = this.constructChildren(text)
    }

    static match(line: string): InlineNodeMatchResult | null {
      const leftDelimiterResult = findFirstDelimiter(line, DelimiterFlanking.LEFT, undefined, undefined, 2)
      if (!leftDelimiterResult) return null
      const {before: beforeLeft, delimiterRun, after: afterLeft} = leftDelimiterResult

      const nearest2RightDelimiter: Array<FindDelimiterResult | null> = [null, null]
      {
        nearest2RightDelimiter[0] = findFirstDelimiter(afterLeft, DelimiterFlanking.RIGHT, undefined, delimiterRun[0] as DelimiterChar)
        if (nearest2RightDelimiter[0]) {
          nearest2RightDelimiter[1] = findFirstDelimiter(nearest2RightDelimiter[0].after, DelimiterFlanking.RIGHT, undefined, delimiterRun[0] as DelimiterChar)
        }
      }

      function checkDelimiterLength(a: number, b: number, c: number): boolean {
        return delimiterRun.length === a && nearest2RightDelimiter[0]?.delimiterRun?.length === b && nearest2RightDelimiter[1]?.delimiterRun?.length === c
      }

      if (checkDelimiterLength(1, 2, 3) || checkDelimiterLength(3, 2, 1)) {
        // *a**b*** or ***a**b*
        return {
          node: [new TextNode(beforeLeft), new EmphNode(line.substring(beforeLeft.length + 1, line.length - nearest2RightDelimiter[1]!.after.length - 1), EmphasisType.ITALIC)],
          remaining: nearest2RightDelimiter[1]!.after,
        }
      } else if (checkDelimiterLength(2, 1, 3) || checkDelimiterLength(3, 1, 2)) {
        // **a*b*** or ***a*b**
        return {
          node: [new TextNode(beforeLeft), new EmphNode(line.substring(beforeLeft.length + 2, line.length - nearest2RightDelimiter[1]!.after.length - 2), EmphasisType.BOLD)],
          remaining: nearest2RightDelimiter[1]!.after,
        }
      }

      if (delimiterRun.length >= 4) {
        return {
          node: new TextNode(beforeLeft + delimiterRun),
          remaining: afterLeft,
        }
      }

      const rightDelimiterResult = findFirstDelimiter(afterLeft, DelimiterFlanking.RIGHT, delimiterRun) ?? findFirstDelimiter(afterLeft, DelimiterFlanking.RIGHT, delimiterRun, undefined, Infinity, true)
      if (rightDelimiterResult) {
        const {before: emphasised, after: afterRight} = rightDelimiterResult
        if (delimiterRun.length === 3) {
          const node = new EmphNode('', EmphasisType.ITALIC)
          node.children.push(new EmphNode(emphasised, EmphasisType.BOLD))
          return {
            node: [new TextNode(beforeLeft), node],
            remaining: afterRight,
          }
        } else {
          return {
            node: [new TextNode(beforeLeft), new EmphNode(emphasised, delimiterRun.length === 1 ? EmphasisType.ITALIC : EmphasisType.BOLD)],
            remaining: afterRight,
          }
        }
      } else {
        return {
          node: new TextNode(beforeLeft + delimiterRun),
          remaining: afterLeft,
        }
      }
    }

    render(parent: InlineNode): string {
      const tag = this.emphasisType === EmphasisType.ITALIC ? 'em' : 'strong'
      return `<${tag}>${super.render(parent)}</${tag}>`
    }
  }
}

// todo link may not contain other links
// priority lower than code spans, auto links, raw html tags
//          higher than emphasis and strong emphasis
class LinkTextNode extends ContainerInlineNode {
  constructor(
    text: string,
    public isImage: boolean,
  ) {
    super(text)
    this.children = this.constructChildren(text)
  }

  static match(line: string): InlineNodeMatchResult | null {
    let isImage: boolean
    let parseResult: ParseNestedBracketsResult | null
    if (line[0] === '!') {
      isImage = true
      parseResult = parseNestedBrackets(line.substring(1), '[', ']')
    } else {
      isImage = false
      parseResult = parseNestedBrackets(line, '[', ']')
    }
    if (!parseResult) return null
    const {parsed, remaining} = parseResult
    return {
      node: new LinkTextNode(parsed, isImage),
      remaining,
    }
  }
}

class LinkDestinationNode extends ContainerInlineNode {
  constructor(
    public destination: string,
    public title?: string,
  ) {
    super(title ?? destination)
  }

  private static readonly destinationTitleRegex = /^(.*?)(( '(.*[^\\])')|( "(.*[^\\])"))?$/

  static match(line: string): InlineNodeMatchResult | null {
    const {parsed, remaining} = parseNestedBrackets(line, '(', ')')
    if (parsed) {
      const matchResult = parsed.match(this.destinationTitleRegex)
      return {
        node: new LinkDestinationNode(matchResult[1], matchResult[4] ?? matchResult[6]),
        remaining,
      }
    } else {
      return null
    }
  }
}

export class LinkNode extends ContainerInlineNode {
  constructor(
    linkTextNode: LinkTextNode,
    linkDestinationNode: LinkDestinationNode,
  ) {
    super('')
    this.children = [linkTextNode, linkDestinationNode]
  }

  get linkTextNode(): LinkTextNode {
    return this.children[0] as LinkTextNode
  }

  get linkDestinationNode(): LinkDestinationNode {
    return this.children[1] as LinkDestinationNode
  }

  static match(line: string): InlineNodeMatchResult | null {
    const linkTextMatchResult = LinkTextNode.match(line)
    if (!linkTextMatchResult) return null
    const linkDestinationMatchResult = LinkDestinationNode.match(linkTextMatchResult.remaining)
    if (!linkDestinationMatchResult) return null

    return {
      node: new LinkNode(linkTextMatchResult.node as LinkTextNode, linkDestinationMatchResult.node as LinkDestinationNode),
      remaining: linkDestinationMatchResult.remaining,
    }
  }

  render(): string {
    if (this.linkTextNode.isImage) {
      const srcText = ` src="${this.linkDestinationNode.destination}"`
      const altText = this.linkTextNode.text ? ` alt="${this.linkTextNode.text}"` : ''
      const titleText = this.linkDestinationNode.title ? ` title="${this.linkDestinationNode.title}"` : ''

      return `<img${srcText} referrerpolicy="no-referrer"${altText}${titleText}>`
    } else {
      const hrefText = ` href='${this.linkDestinationNode.destination}'`
      const titleText = this.linkDestinationNode.title ? ` title='${this.linkDestinationNode.title}'` : ''

      return `<a${hrefText}${titleText}>${this.linkTextNode.render(this)}</a>`
    }
  }
}
