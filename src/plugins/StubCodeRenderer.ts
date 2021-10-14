import {CodeRenderer} from '../RenderOptions'
import {RenderContext} from '../parser'
import {EscapeUtils} from '../utils'
import {fakeCodeMirrorTagGenerator} from './fakeCodeMirrorTagGenerator'

type OptionsType = ReturnType<typeof StubCodeRenderer.getDefaultOptions>

export default class StubCodeRenderer implements CodeRenderer {
  public static readonly getDefaultOptions = () => ({
    displayLineNumbers: false,
  })

  private options: OptionsType

  constructor(
    options?: OptionsType,
  ) {
    this.options = Object.assign(StubCodeRenderer.getDefaultOptions(), options)
  }

  render(code: string, language: string | undefined, context: RenderContext): string {
    if (context.renderOptions.vanillaHTML) {
      return `<pre><code>${EscapeUtils.escapeHtml(code)}\n</code></pre>\n`
    } else {
      return fakeCodeMirrorTagGenerator(code.split('\n'), this.options.displayLineNumbers)
    }
  }

}
