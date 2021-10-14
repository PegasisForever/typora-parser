import hljs from 'highlight.js'
import {CodeRenderer} from '../RenderOptions'
import {EscapeUtils, replaceAll} from '../utils'
import {RenderContext} from '../parser'
import {fakeCodeMirrorTagGenerator} from './fakeCodeMirrorTagGenerator'

type OptionsType = ReturnType<typeof HighlightJsRenderer.getDefaultOptions>

export default class HighlightJsRenderer implements CodeRenderer {
  private static readonly classMap = {
    'hljs-doctag': '',
    'hljs-keyword': 'cm-keyword',
    'hljs-meta': 'cm-meta',
    'hljs-template-tag': '',
    'hljs-template-variable': '',
    'hljs-type': 'cm-variable-3',
    'hljs-variable': 'cm-variable',
    'hljs-title': '',
    'hljs-attr': 'cm-attribute',
    'hljs-attribute': 'cm-attribute',
    'hljs-literal': '',
    'hljs-number': 'cm-number',
    'hljs-operator': 'cm-operator',
    'hljs-selector-attr': '',
    'hljs-selector-class': '',
    'hljs-selector-id': '',
    'hljs-regexp': '',
    'hljs-string': 'cm-string',
    'hljs-built_in': 'cm-builtin',
    'hljs-symbol': '',
    'hljs-comment': 'cm-comment',
    'hljs-code': '',
    'hljs-formula': '',
    'hljs-name': '',
    'hljs-quote': 'cm-quote',
    'hljs-selector-tag': '',
    'hljs-selector-pseudo': '',
    'hljs-subst': '',
    'hljs-section': '',
    'hljs-bullet': '',
    'hljs-emphasis': 'cm-em',
    'hljs-strong': 'cm-strong',
    'hljs-addition': '',
    'hljs-deletion': '',
    'hljs-char': '',
    'hljs-link': 'cm-link',
    'hljs-params': '',
    'hljs-property': 'cm-property',
    'hljs-punctuation': '',
    'hljs-tag': 'cm-tag',
  }
  public static readonly getDefaultOptions = () => ({
    displayLineNumbers: false,
  })

  private options: OptionsType

  constructor(
    options?: Partial<OptionsType>,
  ) {
    this.options = Object.assign(HighlightJsRenderer.getDefaultOptions(), options)
  }

  render(code: string, language: string | undefined, context: RenderContext): string {
    if (context.renderOptions.vanillaHTML) {
      return `<pre><code>${EscapeUtils.escapeHtml(code)}\n</code></pre>\n`
    } else {
      const html = hljs.listLanguages().includes(language) ? hljs.highlight(code, {language}).value : hljs.highlightAuto(code).value
      const lines = html.split('\n').map(line => {
        for (const [hljsTag, cmTag] of Object.entries(HighlightJsRenderer.classMap)) {
          line = replaceAll(line, `<span class="${hljsTag}">`, cmTag === '' ? '<span>' : `<span class="${cmTag}">`)
        }
        return line
      })
      return fakeCodeMirrorTagGenerator(lines, this.options.displayLineNumbers)
    }
  }
}
