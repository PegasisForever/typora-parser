#!/usr/bin/env node
import {Command} from 'commander'
import {version} from '../package.json'
import fs from 'fs/promises'
import path from 'path'
import TyporaParser from '../src'
import MathJaxRenderer from '../src/plugins/MathJaxRenderer'
import HighlightJsRenderer from '../src/plugins/HighlightJsRenderer'

type OptionsType = {
  output: string,
  vanillaHtml?: boolean,
  excludeHead?: boolean,
  title?: string,
  extraHeadTags?: string,
  codeDisplayLineNumbers?: boolean,
  mathAutoNumbering?: boolean,
  mathDontApplyLineBreaks?: boolean,
}

new Command()
  .version(version)
  .name('typora-export')
  .argument('<file>', 'input markdown filename')
  .requiredOption('-o, --output <file>', 'output file name')
  .option('-n, --vanilla-html', 'no typora-specific classes, corresponds to typora "export HTML (without styles)"')
  .option('-e, --exclude-head', 'don\'t include head and body tag')
  .option('-t, --title <title>', 'title of the html page, no effect when --exclude-head, defaults to file name without extension')
  .option('-g, --extra-head-tags <file>', 'extra tags add to the head tag, no effect when --exclude-head')
  .option('-l, --code-display-line-numbers', 'display line numbers on code block, no effect when --vanilla-html')
  .option('-b, --math-auto-numbering', 'auto numbering math blocks')
  .option('-k, --math-dont-apply-line-breaks', 'don\'t apply line breaks at \\\\ and \\newline in math block, see https://support.typora.io/Math/#line-breaking')
  .action(async (inputFileName, options: OptionsType) => {
    const parseResult = TyporaParser.parse(await fs.readFile(inputFileName, {encoding: 'utf8'}))
    const html = parseResult.renderHTML({
      vanillaHTML: options.vanillaHtml === true,
      includeHead: options.excludeHead !== true,
      title: options.title === undefined ? path.parse(inputFileName).name : options.title,
      extraHeadTags: options.extraHeadTags ? await fs.readFile(options.extraHeadTags, {encoding: 'utf8'}) : null,
      latexRenderer: new MathJaxRenderer({
        autoNumbering: options.mathAutoNumbering === true,
        applyLineBreaks: options.mathDontApplyLineBreaks !== true,
      }),
      codeRenderer: new HighlightJsRenderer({
        displayLineNumbers: options.codeDisplayLineNumbers === true,
      }),
    })
    await fs.writeFile(options.output, html)
  })
  .parse()

