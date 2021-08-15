import * as fs from 'fs/promises'
import {inspect} from 'util'
import parse from './parser'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})

  const parseResult = parse(md)

  console.log(inspect(parseResult.ast, false, null, true))
  console.log(inspect(parseResult.linkReferences, false, null, true))
  console.log(inspect(parseResult.tocEntries, false, null, true))
  await fs.writeFile('out.html', parseResult.renderHTML())
})()
