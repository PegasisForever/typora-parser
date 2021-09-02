import {parseNestedBrackets} from './parseNestedBrackets'

export type InlineNodeMatchResult<T extends InlineNode> = { node?: T, remaining?: string }

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
      LinkNode,
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
            inlineNodes.push(node)
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

export class BoldNode extends ContainerInlineNode {
  render(parent: InlineNode): string {
    return `<strong>${super.render(parent)}</strong>`
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
  static match(line: string): InlineNodeMatchResult<LinkTextNode> {
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

  static match(line: string): InlineNodeMatchResult<LinkDestinationNode> {
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

  static match(line: string): InlineNodeMatchResult<LinkNode> {
    const {node: linkTextNode, remaining: r1} = LinkTextNode.match(line)
    if (r1 === undefined) return {}
    const {node: linkDestinationNode, remaining: r2} = LinkDestinationNode.match(r1)
    if (r2 === undefined) return {}

    return {
      node: new LinkNode(linkTextNode, linkDestinationNode),
      remaining: r2,
    }
  }

  render(parent: InlineNode): string {
    let hrefText = ` href='${this.linkDestinationNode.destination}'`
    let titleText = this.linkDestinationNode.title ? ` title='${this.linkDestinationNode.title}'` : ''
    return `<a${hrefText}${titleText}>${this.linkTextNode.render(this)}</a>`
  }
}
