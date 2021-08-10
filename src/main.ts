import * as fs from 'fs/promises'

(async () => {
  const md = await fs.readFile('test.md', {encoding: 'utf8'})
  console.log(md)

})()
