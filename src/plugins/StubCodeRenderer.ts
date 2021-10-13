import {CodeRenderer} from '../RenderOption'
import {RenderContext} from '../parser'
import {EscapeUtils} from '../utils'

export default class StubCodeRenderer implements CodeRenderer {
  render(code: string, language: string | undefined, context: RenderContext): string {
    if (context.renderOption.vanillaHTML) {
      return `<pre><code>${EscapeUtils.escapeHtml(code)}\n</code></pre>\n`
    } else {
      let html = code
      html = html.split('\n').map(line => {
        line = `<span role="presentation" style="padding-right: 0.1px;">${line}</span>`
        line = `<pre class=" CodeMirror-line " role="presentation">${line}</pre>`
        line = `<div class="" style="position: relative;">${line}</div>`
        return line
      }).join('')
      html = `<pre lang="${language}" spellcheck="false" class="md-fences md-end-block ty-contain-cm modeLoaded"><div class="CodeMirror cm-s-inner cm-s-null-scroll CodeMirror-wrap" lang="java"><div style="overflow: hidden; position: relative; width: 3px; height: 0px; top: 9.11111px; left: 8px;"><textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" style="position: absolute; bottom: -1em; padding: 0px; width: 1000px; height: 1em; outline: none;"></textarea></div><div class="CodeMirror-scrollbar-filler" cm-not-content="true"></div><div class="CodeMirror-gutter-filler" cm-not-content="true"></div><div class="CodeMirror-scroll" tabindex="-1"><div class="CodeMirror-sizer" style="margin-left: 0px; margin-bottom: 0px; border-right-width: 0px; padding-right: 0px; padding-bottom: 0px;"><div style="position: relative; top: 0px;"><div class="CodeMirror-lines" role="presentation"><div role="presentation" style="position: relative; outline: none;"><div class="CodeMirror-measure"><pre>x</pre></div><div class="CodeMirror-measure"></div><div style="position: relative; z-index: 1;"></div><div class="CodeMirror-code" role="presentation">${html}`
      html = `${html}</div></div></div></div></div><div style="position: absolute; height: 0px; width: 1px; border-bottom: 0px solid transparent; top: 44px;"></div><div class="CodeMirror-gutters" style="display: none; height: 44px;"></div></div></div></pre>`
      return html
    }
  }

}
