import * as fs from 'fs/promises'
import {inspect} from 'util'
import {RootBlock} from './blocks/containerBlocks'
import {FrontMatterBlock} from './blocks/leafBlocks'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  let lines = md.split('\n')

  const processResult = FrontMatterBlock.process(lines)
  lines = processResult[0]
  const frontMatter = processResult[1]

  const rootBlock = new RootBlock(lines)
  rootBlock.close()
  console.log(inspect(rootBlock, false, null, true))
  console.log(inspect(frontMatter))
  const html = rootBlock.render()
  console.log(html)
  await fs.writeFile('out.html', html)
})()
