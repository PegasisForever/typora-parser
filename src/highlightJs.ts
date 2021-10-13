import hljs from 'highlight.js'
import {CodeRenderer} from './parser'

const highlightJsRenderer: CodeRenderer = {
  render: (code: string, language?: string): string => {
    return hljs.highlight('System.out.println("hello");\nint a = 1 + 2;', {language}).value
  },
}

export default highlightJsRenderer
