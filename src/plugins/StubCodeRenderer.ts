import {CodeRenderer} from '../RenderOption'
import {RenderContext} from '../parser'
import {EscapeUtils} from '../utils'
import {fakeCodeMirrorTagGenerator} from './fakeCodeMirrorTagGenerator'

export default class StubCodeRenderer implements CodeRenderer {
  constructor(
    public displayLineNumbers = false,
  ) {
  }

  render(code: string, language: string | undefined, context: RenderContext): string {
    if (context.renderOption.vanillaHTML) {
      return `<pre><code>${EscapeUtils.escapeHtml(code)}\n</code></pre>\n`
    } else {
      return fakeCodeMirrorTagGenerator(code.split('\n'), this.displayLineNumbers)
    }
  }

}
