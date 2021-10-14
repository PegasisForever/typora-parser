#!/usr/bin/env node
import {Command} from 'commander'
import {version} from '../package.json'
import fs from 'fs/promises'
import TyporaParser from '../src'
import MathJaxRenderer from '../src/plugins/MathJaxRenderer'
import HighlightJsRenderer from '../src/plugins/HighlightJsRenderer'

type Options = {
  output: string,
  vanillaHtml?: boolean,
  excludeHead?: boolean,
  title?: string,
  extraHeadTags?: string,
}

new Command()
  .version(version)
  .argument('<file>', 'input markdown filename')
  .requiredOption('-o, --output <file>', 'output file name')
  .option('-n, --vanilla-html', 'no typora-specific classes, correspond to typora "export HTML (without styles)"')
  .option('-e, --exclude-head', 'dont\' include head and body tag')
  .option('-t, --title <title>', 'title of the html, no effect when --exclude-head')
  .option('-g, --extra-head-tags <file>', 'extra tags add to the head tag, no effect when --exclude-head')
  .action(async (inputFileName, options: Options) => {
    const parseResult = TyporaParser.parse(await fs.readFile(inputFileName, {encoding: 'utf8'}))
    const html = parseResult.renderHTML({
      vanillaHTML: options.vanillaHtml === true,
      includeHead: options.excludeHead !== true,
      title: options.title === undefined ? null : options.title,
      extraHeadTags: options.extraHeadTags ? await fs.readFile(options.extraHeadTags, {encoding: 'utf8'}) : null,
      latexRenderer: new MathJaxRenderer(),
      codeRenderer: new HighlightJsRenderer(),
    })
    await fs.writeFile(options.output, html)
  })
  .parse()

