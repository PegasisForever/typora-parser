import * as fs from 'fs/promises'
import {inspect} from 'util'
import parse from './parser'
// import {parseInline} from './inlines/parseInline'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})

  // const rootNode = parseInline(md.replaceAll('\n', ''))
  // console.log(inspect(rootNode, false, null, true))
  // console.log(rootNode.render(undefined))
  // return

  const parseResult = parse(md)

  console.log(inspect(parseResult.ast, false, null, true))
  console.log(inspect(parseResult.linkReferences, false, null, true))
  console.log(inspect(parseResult.tocEntries, false, null, true))
  const html = parseResult.renderHTML()
  console.log(html)
  await fs.writeFile('out.html', html)
})()
