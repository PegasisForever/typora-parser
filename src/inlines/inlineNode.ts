import {parseNestedBrackets} from './parseNestedBrackets'
import {isLeftDelimiter, isRightDelimiter} from './parseDelimiter'
import {last} from '../utils'

export type InlineNodeMatchResult = { node?: InlineNode | InlineNode[], remaining?: string }

export abstract class InlineNode {
  constructor(
    public text: string,
  ) {
  }

  abstract rawText(parent: InlineNode): string

  abstract render(parent: InlineNode): string
}

export class TextNode extends InlineNode {
  rawText(parent: InlineNode): string {
    return this.text
  }

  render(parent: InlineNode): string {
    return this.text
  }
}

export class CodeSpanNode extends InlineNode {
  private static readonly backtickRegex = /^`+/

  static match(line: string): InlineNodeMatchResult {
    let backtickStr = line.match(this.backtickRegex)?.[0]
    if (!backtickStr) return {}
    let {parsed, remaining} = parseNestedBrackets(line, backtickStr, backtickStr)
    if (parsed) {
      return {
        node: new CodeSpanNode(parsed),
        remaining,
      }
    } else {
      return {}
    }
  }

  rawText(parent: InlineNode): string {
    return this.text
  }

  render(parent: InlineNode): string {
    return `<code>${this.text}</code>`
  }
}


export abstract class ContainerInlineNode extends InlineNode {
  children: InlineNode[] = []

  protected constructChildren(text: string): InlineNode[] {
    const inlineNodeTypes = [
      CodeSpanNode,
      LinkNode,
      EmphNode,
    ]

    const inlineNodes: InlineNode[] = []
    let buffer = ''
    out:
      while (text.length > 0) {

        for (const inlineNodeType of inlineNodeTypes) {
          const {node, remaining} = inlineNodeType.match(text)
          if (node) {
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
        }

        buffer += text[0]
        text = text.substring(1)
      }

    if (buffer !== '') {
      inlineNodes.push(new TextNode(buffer))
    }
    return inlineNodes
  }

  rawText(parent: InlineNode): string {
    return this.children.map(it => it.rawText(this)).join('')
  }

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

enum EmphasisType {
  NONE,
  ITALIC,
  BOLD,
}

enum DelimiterFlanking {
  LEFT,
  RIGHT,
}

type DelimiterChar = '*' | '_'

export class EmphNode extends ContainerInlineNode {
  constructor(
    text: string,
    public emphasisType: EmphasisType,
  ) {
    super(text)
    this.children = this.constructChildren(text)
  }

  private static toDelimiterChar(str: string): DelimiterChar | undefined {
    if (str === '*' || str === '_') {
      return str
    } else {
      return undefined
    }
  }

  private static findFirstDelimiter(str: string, flanking: DelimiterFlanking, findBeforeI: number = Infinity, delimiterRun?: string): { before: string, delimiterRun: string, after: string } | undefined {
    let i = 0
    while (i <= str.length) {
      let delimiterChar: DelimiterChar | undefined
      while (delimiterChar === undefined) {
        if (i >= findBeforeI) return undefined
        if (i >= str.length) return undefined
        delimiterChar = this.toDelimiterChar(str[i])
        i++
      }
      const before = str.substring(0, i - 1)

      let delimiterCount = 1
      while (str[i] === delimiterChar) {
        delimiterCount++
        i++
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

  static match(line: string): InlineNodeMatchResult {
    const leftDelimiterResult = this.findFirstDelimiter(line, DelimiterFlanking.LEFT, 2)
    if (!leftDelimiterResult) return {}
    let {before: beforeLeft, delimiterRun, after: afterLeft} = leftDelimiterResult

    let emphasisType = EmphasisType.NONE
    if (delimiterRun.length === 1) {
      emphasisType = EmphasisType.ITALIC
    } else if (delimiterRun.length === 2) {
      emphasisType = EmphasisType.BOLD
    } else {
      // TODO
    }

    if (emphasisType === EmphasisType.NONE) {
      // TODO
    }

    const rightDelimiterResult = this.findFirstDelimiter(afterLeft, DelimiterFlanking.RIGHT, Infinity, delimiterRun)
    if (rightDelimiterResult) {
      let {before: emphasised, after: afterRight} = rightDelimiterResult
      return {
        node: [new TextNode(beforeLeft), new EmphNode(emphasised, emphasisType)],
        remaining: afterRight,
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

export class ItalicNode extends ContainerInlineNode {
  render(parent: InlineNode): string {
    return `<em>${super.render(parent)}</em>`
  }
}

// todo link may not contain other links
// priority lower than code spans, auto links, raw html tags
//          higher than emphasis and strong emphasis
class LinkTextNode extends ContainerInlineNode {
  static match(line: string): InlineNodeMatchResult {
    const {parsed, remaining} = parseNestedBrackets(line, '[', ']')
    if (parsed) {
      return {
        node: new LinkTextNode(parsed),
        remaining,
      }
    } else {
      return {}
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

  static match(line: string): InlineNodeMatchResult {
    const {parsed, remaining} = parseNestedBrackets(line, '(', ')')
    if (parsed) {
      const matchResult = parsed.match(this.destinationTitleRegex)
      return {
        node: new LinkDestinationNode(matchResult[1], matchResult[4] ?? matchResult[6]),
        remaining,
      }
    } else {
      return {}
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

  static match(line: string): InlineNodeMatchResult {
    const {node: linkTextNode, remaining: r1} = LinkTextNode.match(line)
    if (r1 === undefined) return {}
    const {node: linkDestinationNode, remaining: r2} = LinkDestinationNode.match(r1)
    if (r2 === undefined) return {}

    return {
      node: new LinkNode(linkTextNode as LinkTextNode, linkDestinationNode as LinkDestinationNode),
      remaining: r2,
    }
  }

  render(parent: InlineNode): string {
    let hrefText = ` href='${this.linkDestinationNode.destination}'`
    let titleText = this.linkDestinationNode.title ? ` title='${this.linkDestinationNode.title}'` : ''
    return `<a${hrefText}${titleText}>${this.linkTextNode.render(this)}</a>`
  }
}
