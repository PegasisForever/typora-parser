import {isLeftDelimiter, isRightDelimiter, parseNestedBrackets, ParseNestedBracketsResult} from './delimiterUtils'
import {EscapeUtils, last} from '../utils'
import {mathJax} from '../mathJax'
import {RenderContext} from '../parser'

export type InlineNodeMatchResult = { node: InlineNode | InlineNode[], remaining: string }

type InlineNodeConstructor =
  typeof InlineNode
  | typeof TextNode
  | typeof CodeSpanNode
  | typeof AutolinkNode
  | typeof RawHTMLNode
  | typeof ContainerInlineNode
  | typeof RootNode
  | typeof EmphNode.EmphNode
  | typeof LinkNode.LinkNode

export abstract class InlineNode {
  constructor(
    public text: string,
  ) {
  }

  static higherPriorityNodeTypes: InlineNodeConstructor[] = []

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static match(line: string): InlineNodeMatchResult | null {
    throw new Error('Not Implemented')
  }

  abstract rawText(context: RenderContext): string

  abstract render(context: RenderContext): string
}

export class TextNode extends InlineNode {
  static higherPriorityNodeTypes = []

  rawText(): string {
    return this.text
  }

  render(): string {
    return EscapeUtils.escapeHtml(this.text)
  }
}

export class CodeSpanNode extends InlineNode {
  private static readonly backtickRegex = /^`+/
  static higherPriorityNodeTypes = []

  static match(line: string): InlineNodeMatchResult | null {
    line = EscapeUtils.unEscapeMarkdown(line, true)
    const delimiterRun = line.match(this.backtickRegex)?.[0]
    if (!delimiterRun) return null

    const endIndex = line.indexOf(delimiterRun, delimiterRun.length)
    if (endIndex === -1) return null

    return {
      node: new CodeSpanNode(line.substring(delimiterRun.length, endIndex)),
      remaining: EscapeUtils.escapeMarkdown(line.substring(endIndex + delimiterRun.length)),
    }
  }

  rawText(): string {
    return this.text
  }

  render(): string {
    return `<code>${EscapeUtils.escapeHtml(this.text)}</code>`
  }
}

export class MathNode extends InlineNode {
  constructor(text: string) {
    super(EscapeUtils.unEscapeMarkdown(text, true))
  }

  static higherPriorityNodeTypes = []

  static match(line: string): InlineNodeMatchResult | null {
    let delimiterRun = ''
    if (line.indexOf('$$') === 0) {
      delimiterRun = '$$'
    } else if (line.indexOf('$') === 0) {
      delimiterRun = '$'
    } else {
      return null
    }

    const endIndex = line.indexOf(delimiterRun, delimiterRun.length)
    if (endIndex === -1 || endIndex === delimiterRun.length) return null

    return {
      node: new MathNode(line.substring(delimiterRun.length, endIndex)),
      remaining: line.substring(endIndex + delimiterRun.length),
    }
  }

  rawText(): string {
    // todo
    return ''
  }

  render(): string {
    if (mathJax) {
      return mathJax.latexToHTML(this.text)
    } else {
      return EscapeUtils.escapeHtml(this.text)
    }
  }
}

export class AutolinkNode extends InlineNode {
  constructor(
    url: string,
    public isEmail: boolean,
  ) {
    super(url)
  }

  private static readonly bracketAutolinkRegex = /^<(([a-z0-9+.\-_]{2,32}:)|(www\.))[^ <>()]+>/i
  private static readonly noBracketAutolinkRegex = /^((https:|http:)[^ <>()]+)|(www\.[^ <>()]+\.[^ <>()]+)/i
  private static readonly bracketAutolinkEmailRegex = /^<[a-z0-9+.\-_]+@[a-z0-9+.\-_]+>/
  private static readonly noBracketAutolinkEmailRegex = /^[a-z0-9+.\-_]+@[a-z0-9+.\-_]+\.(com|edu|net|org|au|ca|cn|co|de|fm|io|jp|me|ru|tv|us)/i
  static higherPriorityNodeTypes = []

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
    const escapedText = EscapeUtils.escapeHtml(this.text)
    if (this.isEmail) {
      return `<a href='mailto:${escapedText}' target='_blank' class='url'>${escapedText}</a>`
    } else {
      return `<a href='${escapedText}' target='_blank' class='url'>${escapedText}</a>`
    }
  }
}

export class RawHTMLNode extends InlineNode {
  private static readonly tagNameRegex = '([a-z][a-z0-9\\-]*)'
  private static readonly attributeNameRegex = '([a-z_:][a-z0-9_\\.:\\-]*)'
  private static readonly attributeValueRegex = '(([^\\s"\'=<>`]+)|(\'[^\']*\')|("[^"]*"))'
  private static readonly attributeValueSpecificationRegex = `(\\s*=\\s*${RawHTMLNode.attributeValueRegex})`
  private static readonly attributeRegex = `(\\s+${RawHTMLNode.attributeNameRegex}${RawHTMLNode.attributeValueSpecificationRegex}?)`
  private static readonly openTagRegex = new RegExp(`^<${RawHTMLNode.tagNameRegex}${RawHTMLNode.attributeRegex}*\\s*/?>`, 'i')
  private static readonly closeTagRegex = new RegExp(`^</${RawHTMLNode.tagNameRegex}\\s*>`, 'i')
  private static readonly htmlCommentRegex = /^<!--.*?-->/
  private static readonly processingInstructionRegex = /^<\?.*?\?>/
  private static readonly cdataSectionRegex = /^<!\[CDATA\[.*?]]>/
  private static readonly htmlTagRegexes = [
    RawHTMLNode.openTagRegex,
    RawHTMLNode.closeTagRegex,
    RawHTMLNode.htmlCommentRegex,
    RawHTMLNode.processingInstructionRegex,
    RawHTMLNode.cdataSectionRegex,
  ]
  static higherPriorityNodeTypes = []

  static match(line: string): InlineNodeMatchResult | null {
    for (const regex of RawHTMLNode.htmlTagRegexes) {
      const matchResult = line.match(regex)
      if (matchResult) {
        return {
          node: new RawHTMLNode(matchResult[0]),
          remaining: line.substring(matchResult[0].length),
        }
      }
    }
    return null
  }

  rawText(): string {
    return ''
  }

  render(): string {
    return EscapeUtils.escapeHtml(this.text)
  }
}

export abstract class ContainerInlineNode extends InlineNode {
  static higherPriorityNodeTypes = []
  children: InlineNode[] = []

  protected constructChildren(text: string): InlineNode[] {
    const inlineNodeTypes = [
      MathNode,
      RawHTMLNode,
      AutolinkNode,
      CodeSpanNode,
      HighlightNode,
      SubScriptNode,
      SuperScriptNode,
      LinkNode.LinkNode,
      EmphNode.EmphNode,
    ]

    const inlineNodes: InlineNode[] = []
    let buffer = ''
    out: while (text.length > 0) {
      for (const inlineNodeType of inlineNodeTypes) {
        const matchResult = inlineNodeType.match(text)
        if (!matchResult) continue
        const {node, remaining} = matchResult

        // todo optimize this
        function breakByHigherPriorityBlockInside(): boolean {
          if (inlineNodeType.higherPriorityNodeTypes.length === 0) return false

          for (let i = 1; i < text.length - remaining.length; i++) {
            for (const higherPriorityNodeType of inlineNodeType.higherPriorityNodeTypes) {
              const insideMatchResult = higherPriorityNodeType.match(text.substring(i))
              if (!insideMatchResult) continue

              if (insideMatchResult.remaining.length < remaining.length) {
                return true
              }
            }
          }

          return false
        }

        if (breakByHigherPriorityBlockInside()) continue

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

  rawText(context: RenderContext): string {
    return this.children.map(it => {
      context.parent = this
      return it.rawText(context)
    }).join('')
  }

  render(context: RenderContext): string {
    return this.children.map(it => {
      context.parent = this
      return it.render(context)
    }).join('')
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

export abstract class DecoratorNode extends ContainerInlineNode {
  protected constructor(text: string) {
    super(text)
    this.children = this.constructChildren(text)
  }

  static delimiterRun = '?' // override me

  protected static findFirstDelimiter(str: string, flanking: 'left' | 'right', findBeforeI = Infinity): { before: string, delimiterRun: string, after: string } | null {
    let i = 0
    while (i <= str.length) {
      i = str.substring(0, findBeforeI).indexOf(this.delimiterRun, i) // todo check
      if (i === -1) return null
      const before = str.substring(0, i)

      i += this.delimiterRun.length

      const result = {
        before,
        delimiterRun: this.delimiterRun,
        after: str.substring(i),
      }

      const flankingTestFunction = flanking === 'left' ? isLeftDelimiter : isRightDelimiter
      if (flankingTestFunction(last(before) ?? '', result.delimiterRun, result.after[0] ?? '')) {
        return result
      }
    }
    return null
  }

  static match(line: string): InlineNodeMatchResult | null {
    const leftDelimiterResult = this.findFirstDelimiter(line, 'left', 2)
    if (!leftDelimiterResult || leftDelimiterResult.before !== '') return null
    const {delimiterRun, after: afterLeft} = leftDelimiterResult

    const rightDelimiterResult = this.findFirstDelimiter(afterLeft, 'right')

    if (rightDelimiterResult) {
      const {before: decorated, after: afterRight} = rightDelimiterResult
      return this.generateInlineNodeMatchResult(decorated, afterRight)
    } else {
      return {
        // node: new TextNode(beforeLeft + delimiterRun),
        node: new TextNode(delimiterRun),
        remaining: afterLeft,
      }
    }
  }

  // override me
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static generateInlineNodeMatchResult(decoratedStr: string, remaining: string): InlineNodeMatchResult | null {
    return null
  }
}

export class HighlightNode extends DecoratorNode {
  static delimiterRun = '=='
  static higherPriorityNodeTypes = []

  static generateInlineNodeMatchResult(decoratedStr: string, remaining: string): InlineNodeMatchResult | null {
    return {
      node: new HighlightNode(decoratedStr),
      remaining,
    }
  }

  render(context: RenderContext): string {
    return `<mark>${super.render(context)}</mark>`
  }
}

export class SubScriptNode extends DecoratorNode {
  static delimiterRun = '~'
  static higherPriorityNodeTypes = []

  static generateInlineNodeMatchResult(decoratedStr: string, remaining: string): InlineNodeMatchResult | null {
    return {
      node: new SubScriptNode(decoratedStr),
      remaining,
    }
  }

  render(context: RenderContext): string {
    return `<sub>${super.render(context)}</sub>`
  }
}

export class SuperScriptNode extends DecoratorNode {
  static delimiterRun = '^'
  static higherPriorityNodeTypes = []

  static generateInlineNodeMatchResult(decoratedStr: string, remaining: string): InlineNodeMatchResult | null {
    return {
      node: new SuperScriptNode(decoratedStr),
      remaining,
    }
  }

  render(context: RenderContext): string {
    return `<sup>${super.render(context)}</sup>`
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

  export class EmphNode extends DecoratorNode {
    constructor(
      text: string,
      public emphasisType: EmphasisType,
    ) {
      super(text)
      this.children = this.constructChildren(text)
    }

    static higherPriorityNodeTypes = []

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

    render(context: RenderContext): string {
      const tag = this.emphasisType === EmphasisType.ITALIC ? 'em' : 'strong'
      return `<${tag}>${super.render(context)}</${tag}>`
    }
  }
}

namespace LinkNode {
  // todo link may not contain other links
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
      const {inside, remaining} = parseResult
      return {
        node: new LinkTextNode(inside, isImage),
        remaining,
      }
    }
  }

  class LinkDestinationNode extends ContainerInlineNode {
    constructor(
      public url: string,
      public title?: string,
    ) {
      super(title ?? url)
    }

    private static readonly destinationTitleRegex = /^(.*?)(( '(.*[^\\])')|( "(.*[^\\])"))?$/

    static match(line: string): InlineNodeMatchResult | null {
      const parsedResult = parseNestedBrackets(line, '(', ')')
      if (parsedResult) {
        const {inside, remaining} = parseNestedBrackets(line, '(', ')')
        const matchResult = inside.match(this.destinationTitleRegex)
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
      public destination: { url: string, title?: string } | string,
      text: string,
    ) {
      super(text)
      this.children = [linkTextNode]
    }

    get linkTextNode(): LinkTextNode {
      return this.children[0] as LinkTextNode
    }

    static higherPriorityNodeTypes = []

    static match(line: string): InlineNodeMatchResult | null {
      const linkTextMatchResult = LinkTextNode.match(line)
      if (!linkTextMatchResult) return null

      const linkDestinationMatchResult = LinkDestinationNode.match(linkTextMatchResult.remaining)
      if (linkDestinationMatchResult) {
        const remaining = linkDestinationMatchResult.remaining
        const nodeText = line.substring(0, line.length - remaining.length)

        return {
          node: new LinkNode(
            linkTextMatchResult.node as LinkTextNode,
            linkDestinationMatchResult.node as LinkDestinationNode,
            nodeText,
          ),
          remaining,
        }
      }

      const linkReferenceMatchResult = LinkTextNode.match(linkTextMatchResult.remaining)
      if (linkReferenceMatchResult) {
        const remaining = linkReferenceMatchResult.remaining
        const nodeText = line.substring(0, line.length - remaining.length)
        const linkTextNode = linkTextMatchResult.node as LinkTextNode

        let refText = (linkReferenceMatchResult.node as LinkTextNode).text
        if (refText === '') refText = linkTextNode.text

        return {
          node: new LinkNode(
            linkTextNode,
            refText,
            nodeText,
          ),
          remaining,
        }
      }

      return null
    }

    rawText(context: RenderContext): string {
      return this.linkTextNode.rawText(context)
    }

    render(context: RenderContext): string {
      let url = ''
      let title: string | undefined = ''
      if (typeof this.destination === 'string') {
        const reference = context.linkReferences.get(this.destination)
        if (!reference) {
          return `[${this.linkTextNode.render(context)}][${this.destination}]`
        }
        url = reference.url
        title = reference.title
      } else {
        url = this.destination.url
        title = this.destination.title
      }

      if (this.linkTextNode.isImage) {
        const srcText = ` src="${EscapeUtils.escapeHtml(url)}"`
        const altText = this.linkTextNode.text ? ` alt="${EscapeUtils.escapeHtml(this.linkTextNode.text)}"` : ''
        const titleText = title ? ` title="${EscapeUtils.escapeHtml(title)}"` : ''

        return `<img${srcText} referrerpolicy="no-referrer"${altText}${titleText}>`
      } else {
        const hrefText = ` href='${EscapeUtils.escapeHtml(url)}'`
        const titleText = title ? ` title='${EscapeUtils.escapeHtml(title)}'` : ''

        return `<a${hrefText}${titleText}>${this.linkTextNode.render(context)}</a>`
      }
    }
  }
}

// inline node precedence
// 1. raw html, autolink, code span
// 2. highlight, subscript, superscript
// 3. link
// 4. emphasis

const nodePrecedenceGroups = [
  [RawHTMLNode, AutolinkNode, CodeSpanNode],
  [HighlightNode, SubScriptNode, SuperScriptNode],
  [LinkNode.LinkNode],
  [EmphNode.EmphNode],
]

for (let precedence = 0; precedence < nodePrecedenceGroups.length; precedence++) {
  const group = nodePrecedenceGroups[precedence]
  for (let i = 0; i < precedence; i++) {
    group.forEach((nodeType) => nodeType.higherPriorityNodeTypes.push(...nodePrecedenceGroups[i]))
  }
}
