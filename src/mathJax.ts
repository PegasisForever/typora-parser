export interface MathJaxWrapper {
  latexToHTML: (str: string) => string,
}

export async function loadMathJax(): Promise<void> {
  if (mathJax !== null) return
  const {mathjax} = await require('mathjax-full/js/mathjax.js')
  const {TeX} = await require('mathjax-full/js/input/tex.js')
  const {SVG} = await require('mathjax-full/js/output/svg.js')
  const {liteAdaptor} = await require('mathjax-full/js/adaptors/liteAdaptor.js')
  const {RegisterHTMLHandler} = await require('mathjax-full/js/handlers/html.js')

  const {AllPackages} = await require('mathjax-full/js/input/tex/AllPackages.js')

  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)

  const tex = new TeX({packages: AllPackages})
  const svg = new SVG({fontCache: 'none'})
  const html = mathjax.document('', {InputJax: tex, OutputJax: svg})

  mathJax = {
    latexToHTML: (str: string): string => {
      const node = html.convert(str, {
        display: false,
        em: 16,
        ex: 8,
        containerWidth: 8 * 16,
      })

      return `<mjx-container class="MathJax" jax="SVG" style="position: relative;">${adaptor.innerHTML(node)}</mjx-container><script type="math/tex">${str}</script>`
    },
  }
}

export let mathJax: MathJaxWrapper | null = null
