import {parse, TyporaParseResult} from './parser'
import {CodeRenderer, LatexRenderer, RenderOption, UrlResolver} from './RenderOption'

const TyporaParser = {
  parse,
}

export default TyporaParser

export {CodeRenderer, LatexRenderer, UrlResolver, RenderOption, TyporaParseResult}
