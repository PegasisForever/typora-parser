import * as fs from 'fs/promises'
import {inspect} from 'util'
import {RootBlock} from './blocks/containerBlocks'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  let lines = md.split('\n')

  const rootBlock = new RootBlock(lines)
  rootBlock.close()
  console.log(inspect(rootBlock, false, null, true))
  const html = rootBlock.render()
  console.log(html)
  await fs.writeFile('out.html', html)
})()
