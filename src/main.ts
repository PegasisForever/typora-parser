import * as fs from 'fs/promises'
import {Block, blockTypes} from './Block'
import {last} from './utils'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  let lines = md.split('\n')
  console.log(lines)

  const blocks: Block[] = []
  out:
    while (lines.length > 0) {
      let newLines
      if (blocks.length > 0 && last(blocks).isOpen && (newLines = last(blocks).append(lines))) {
        lines = newLines
        continue
      }

      for (const blockType of blockTypes) {
        let matchResult = blockType.match(lines)
        if (matchResult) {
          blocks.push(matchResult[0])
          lines = matchResult[1]
          continue out
        }
      }

      throw new Error(`No match for lines: ${lines}`)
    }

  console.log(blocks)

})()
