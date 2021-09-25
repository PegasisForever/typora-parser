import * as fs from 'fs/promises'
import {inspect} from 'util'
import parse from './parser'
import {inlineParser} from './inlines/inlineParser'

(async () => {

  const md = await fs.readFile('test.md', {encoding: 'utf8'})

  const rootNode = inlineParser(md.replaceAll('\n', ''))
  console.log(inspect(rootNode, false, null, true))
  console.log(rootNode.render(undefined))
  return

  const parseResult = parse(md)

  console.log(inspect(parseResult.ast, false, null, true))
  console.log(inspect(parseResult.linkReferences, false, null, true))
  console.log(inspect(parseResult.tocEntries, false, null, true))
  await fs.writeFile('out.html', parseResult.renderHTML())
})()
