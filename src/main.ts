import * as fs from 'fs/promises'
import {RootBlock} from './Block'
import {inspect} from 'util'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  let lines = md.split('\n')
  console.log(lines)

  const rootBlock = new RootBlock(lines)
  rootBlock.close()

  console.log(inspect(rootBlock, false, null, true))
})()
