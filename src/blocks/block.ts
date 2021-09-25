export type BlockMatchResult = { block: Block, remaining: string[] }

export abstract class Block {
  lines: string[] = []
  private _isOpen = true
  get isOpen(): boolean {
    return this._isOpen
  }

  close(): void {
    this._isOpen = false
  }

  // return consumed string[] if successfully appended
  abstract append(lines: string[]): string[] | null

  protected renderChildren(): string {
    return this.lines.join('')
  }

  abstract render(parent: Block): string
}