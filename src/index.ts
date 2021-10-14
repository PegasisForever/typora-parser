import {parse, TyporaParseResult} from './parser'
import {CodeRenderer, LatexRenderer, RenderOptions, UrlResolver} from './RenderOptions'

const TyporaParser = {
  parse,
}

export default TyporaParser

export {CodeRenderer, LatexRenderer, UrlResolver, RenderOptions, TyporaParseResult}
