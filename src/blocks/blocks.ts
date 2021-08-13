export type BlockMatchResult = [Blocks, string[]] | null

export abstract class Blocks {
  lines: string[] = []
  private _isOpen = true
  get isOpen() {
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

  abstract render(parent: Blocks): string
}
