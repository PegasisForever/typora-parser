import {mathjax} from 'mathjax-full/js/mathjax'
import {TeX} from 'mathjax-full/js/input/tex'
import {SVG} from 'mathjax-full/js/output/svg'
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor'
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html'
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages'

export interface MathJaxWrapper {
  latexToHTML: (str: string, display?: boolean) => string,
}

const texMacros = {
  'AA': 'Å',
  'alef': '\\aleph',
  'alefsym': '\\aleph',
  'Alpha': '\\mathrm{A}',
  'and': '\\land',
  'ang': '\\angle',
  'Bbb': '\\mathbb',
  'Beta': '\\mathrm{B}',
  'bold': '\\mathbf',
  'bull': '\\bullet',
  'C': '\\mathbb{C}',
  'Chi': '\\mathrm{X}',
  'clubs': '\\clubsuit',
  'cnums': '\\mathbb{C}',
  'Complex': '\\mathbb{C}',
  'coppa': 'ϙ',
  'Coppa': 'Ϙ',
  'Dagger': '\\ddagger',
  'Digamma': 'Ϝ',
  'darr': '\\downarrow',
  'dArr': '\\Downarrow',
  'Darr': '\\Downarrow',
  'diamonds': '\\diamondsuit',
  'empty': '\\emptyset',
  'Epsilon': '\\mathrm{E}',
  'Eta': '\\mathrm{H}',
  'euro': '€',
  'exist': '\\exists',
  'geneuro': '€',
  'geneuronarrow': '€',
  'geneurowide': '€',
  'H': '\\mathbb{H}',
  'hAar': '\\Leftrightarrow',
  'harr': '\\leftrightarrow',
  'Harr': '\\Leftrightarrow',
  'hearts': '\\heartsuit',
  'image': '\\Im',
  'infin': '\\infty',
  'Iota': '\\mathrm{I}',
  'isin': '\\in',
  'Kappa': '\\mathrm{K}',
  'koppa': 'ϟ',
  'Koppa': 'Ϟ',
  'lang': '\\langle',
  'larr': '\\leftarrow',
  'Larr': '\\Leftarrow',
  'lArr': '\\Leftarrow',
  'lrarr': '\\leftrightarrow',
  'Lrarr': '\\Leftrightarrow',
  'lrArr': '\\Leftrightarrow',
  'Mu': '\\mathrm{M}',
  'N': '\\mathbb{N}',
  'natnums': '\\mathbb{N}',
  'Nu': '\\mathrm{N}',
  'O': '\\emptyset',
  'officialeuro': '€',
  'Omicron': '\\mathrm{O}',
  'or': '\\lor',
  'P': '¶',
  'pagecolor': ['', 1],
  'part': '\\partial',
  'plusmn': '\\pm',
  'Q': '\\mathbb{Q}',
  'R': '\\mathbb{R}',
  'rang': '\\rangle',
  'rarr': '\\rightarrow',
  'Rarr': '\\Rightarrow',
  'rArr': '\\Rightarrow',
  'real': '\\Re',
  'reals': '\\mathbb{R}',
  'Reals': '\\mathbb{R}',
  'Rho': '\\mathrm{P}',
  'sdot': '\\cdot',
  'sampi': 'ϡ',
  'Sampi': 'Ϡ',
  'sect': '\\S',
  'spades': '\\spadesuit',
  'stigma': 'ϛ',
  'Stigma': 'Ϛ',
  'sub': '\\subset',
  'sube': '\\subseteq',
  'supe': '\\supseteq',
  'Tau': '\\mathrm{T}',
  'textvisiblespace': '␣',
  'thetasym': '\\vartheta',
  'uarr': '\\uparrow',
  'uArr': '\\Uparrow',
  'Uarr': '\\Uparrow',
  'varcoppa': 'ϙ',
  'varstigma': 'ϛ',
  'vline': '\\smash{\\large\\lvert}',
  'weierp': '\\wp',
  'Z': '\\mathbb{Z}',
  'Zeta': '\\mathrm{Z}',
  'dashint': '\\unicodeInt{x2A0D}',
  'ddashint': '\\unicodeInt{x2A0E}',
  'oiint': '\\unicodeInt{x222F}',
  'oiiint': '\\unicodeInt{x2230}',
  'ointctrclockwise': '\\unicodeInt{x2233}',
  'unicodeInt': ['\\mathop{\\vcenter{\\mathchoice{\\huge\\unicode{#1}\\,}{\\unicode{#1}}{\\unicode{#1}}{\\unicode{#1}}}\\,}\\nolimits', 1],
  'varointclockwise': '\\unicodeInt{x2232}',
  'div': ['\\divsymbol'],
  'Re': ['\\mathfrak{R}'],
}

// todo find and install mathjax extensions
const texPackages = ['require', 'base', 'action', 'ams', 'amscd', 'bbox', 'boldsymbol', 'braket', 'bussproofs', 'cancel', 'cases', 'centernot', 'color', 'colortbl', 'empheq', 'enclose', 'extpfeil', 'gensymb', 'html', 'mathtools', 'mhchem', 'newcommand', 'noerrors', 'noundefined', 'upgreek', 'unicode', 'verb', 'configmacros', 'tagformat', 'textcomp', 'textmacros', 'noundefined', 'autoload', 'physics', 'textmacros', 'xypic']

export function loadMathJax(): void {
  if (mathJax !== null) return

  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)

  const tex = new TeX({packages: AllPackages, useLabelIds: true, macros: texMacros})
  const svg = new SVG()
  const document = mathjax.document('', {InputJax: tex, OutputJax: svg})

  mathJax = {
    latexToHTML: (str: string, display?: boolean): string => {
      const node = document.convert(str, {
        display: true,
        em: 16,
        ex: 8,
        containerWidth: 8 * 16,
      })

      let html = adaptor.innerHTML(node)
      html = `<mjx-container class="MathJax" jax="SVG" style="position: relative;">${html}</mjx-container>`
      if (display) {
        html = `<div class="md-rawblock-container md-math-container" contenteditable="false" tabindex="-1">${html}</div>`
        html = `<div contenteditable="false" spellcheck="false" class="mathjax-block md-end-block md-math-block md-rawblock" mdtype="math_block">${html}</div>`
      } else {
        html += `<script type="math/tex">${str}</script>`
      }

      return html
    },
  }
}

export let mathJax: MathJaxWrapper | null = null
