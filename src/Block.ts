export abstract class Block {
  public lines: string[] = []
  public isOpen = true

  // return consumed string[] if successfully appended
  abstract append(lines: string[]): string[] | null
}

export type BlockMatchResult = [Block, string[]] | null

export class ParagraphBlock extends Block {
  static match(lines: string[]): BlockMatchResult {
    const paragraph = new ParagraphBlock()
    if (lines.length >= 2 && lines[0] === '' && lines[1] === '') {
      paragraph.isOpen = false
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
      this.isOpen = false
      return lines.slice(1)
    } else {
      this.lines.push(lines[0])
      return lines.slice(1)
    }
  }
}

export const blockTypes = [
  ParagraphBlock,
]
