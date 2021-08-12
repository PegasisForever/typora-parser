import * as fs from 'fs/promises'
import {RootBlock} from './Block'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  let lines = md.split('\n')
  console.log(lines)

  const rootBlock = new RootBlock(lines)
  rootBlock.close()

  console.log(rootBlock)
})()
