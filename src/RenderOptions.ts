import StubCodeRenderer from './plugins/StubCodeRenderer'
import StubLatexRenderer from './plugins/StubLatexRenderer'
import SimpleUrlResolver from './plugins/SimpleUrlResolver'
import {RenderContext} from './parser'

export interface CodeRenderer {
  render: (code: string, language: string | undefined, context: RenderContext) => string,
}

export interface LatexRenderer {
  render: (str: string, context: RenderContext) => string,
}

export type UrlType = 'link' | 'image' | 'email'

export interface UrlResolver {
  resolve: (url: string, type: UrlType) => string,
}

export type RenderOptions = {
  vanillaHTML: boolean,     // true -> no typora-specific classes, corresponds to typora "export HTML (without styles)"
  includeHead: boolean,     // true -> include head and body tag
  title: string | null,     // title of the html page, only used when includeHead = true
  extraHeadTags: string | null,         // extra tags add to the head tag, only used when includeHead = true
  codeRenderer: CodeRenderer,
  latexRenderer: LatexRenderer,
  urlResolver: UrlResolver,
}

export const getDefaultRenderOptions = (): RenderOptions => ({
  vanillaHTML: false,
  includeHead: false,
  title: null,
  extraHeadTags: null,
  codeRenderer: new StubCodeRenderer(),
  latexRenderer: new StubLatexRenderer(),
  urlResolver: new SimpleUrlResolver(),
})
