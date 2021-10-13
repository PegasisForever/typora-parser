import {RenderContext} from '../parser'
import {EscapeUtils} from '../utils'
import {Block} from '../blocks/block'
import {LatexRenderer} from '../RenderOption'

export default class StubLatexRenderer implements LatexRenderer {
  render(str: string, context: RenderContext): string {
    if (context.parent instanceof Block) {
      return `<pre><code>${EscapeUtils.escapeHtml(str)}</code></pre>`
    } else {
      return `$${EscapeUtils.escapeHtml(str)}$`
    }
  }
}
