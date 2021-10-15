<div align="center">
  <h1>Typora Parser</h1>
  <p>Convert Typora flavoured markdown to HTML.<br/>This package aims to have the exact same output as Typora, with more options for advanced usage.</p>
  <p>
    <img src="https://img.shields.io/npm/v/typora-parser?style=for-the-badge"/>
    <img src="https://img.shields.io/github/license/PegasisForever/typora-parser?style=for-the-badge">
  </p>
</div>

<table>
  <tr>
    <th><h3>⚠️</h3></th>
    <th><h3>This package does not sanitize the output HTML, Please use a sanitize library like <a href="https://github.com/cure53/DOMPurify">DOMPurify</a>!</h3></th>
    <th><h3>⚠️</h3></th>
  </tr>
</table>

## CLI Usage

1. Install.

   ```sh
   npm install -g typora-parser
   # or any other package manager of your choice
   ```

2. (Optional) Extract CSS from your local Typora installation.

3. ```
   $ typora-export -h
   Usage: typoraExport [options] <file>
   
   Arguments:
     file                               input markdown filename
   
   Options:
     -V, --version                      output the version number
     -o, --output <file>                output file name
     -n, --vanilla-html                 no typora-specific classes, corresponds to typora "export HTML (without styles)"
     -e, --exclude-head                 don't include head and body tag
     -t, --title <title>                title of the html, no effect when --exclude-head, defaults to file name without extension
     -g, --extra-head-tags <file>       extra tags add to the head tag, no effect when --exclude-head
     -l, --code-display-line-numbers    show line numbers on code block, no effect when --vanilla-html
     -b, --math-auto-numbering          auto numbering math blocks
     -k, --math-dont-apply-line-breaks  don't apply line break at \\ and \newline in math block, see https://support.typora.io/Math/#line-breaking
     -h, --help                         display help for command
   
   ```

4. Here is a typical usage example: read markdown from `in.md`, use extracted CSS tags (from step 2) `tags.txt` and output to `out.html`.

   ```sh
   typora-export -g tags.txt -o out.html in.md
   ```

## API Usage

1. Install.

   ```sh
   npm install typora-parser
   # or any other package manager of your choice
   ```

2. (Optional) Extract CSS from your local Typora installation.

3. Import, due to bundle size considerations, this package is separated in to many components.

   ```javascript
   // base, 25kb gzipped
   import TyporaParser from 'typora-parser'
   
   // optional fenced code highlighting, +280kb gzipped
   import HighlightJsRenderer from 'typora-parser/build/src/plugins/HighlightJsRenderer'
   
   // optional latex rendering, +590kb gzipped
   import MathJaxRenderer from 'typora-parser/build/src/plugins/MathJaxRenderer'
   ```

4. Parse markdown, at this step you can alter the abstract syntax tree and read [front matter](https://support.typora.io/YAML/) information. [code]()

   ```javascript
   const parseResult = TyporaParser.parse(md)
   
   // print front matter
   console.log(parseResult.frontMatter)
   
   // print abstract syntax tree
   console.log(inspect(parseResult.ast, false, null, true))
   ```

5. Render to HTML, at this step you can specify [render options]().

   ```javascript
   // use default options (no latex rendering, no code highlighting)
   const html = parseResult.renderHTML()
   
   // this is the full default options written out explicitly, equivalent to the code above
   const html = parseResult.renderHTML({
     vanillaHTML: false,  // true -> no typora-specific classes, corresponds to typora "export HTML (without styles)"
     includeHead: false,  // true -> include head and body tag
     title: null,         // title of the html page, only used when includeHead = true
     extraHeadTags: null, // extra tags add to the head tag, only used when includeHead = true
     codeRenderer: new StubCodeRenderer(),   // this renderer produces a code block without any highlighting
     latexRenderer: new StubLatexRenderer(), // this renderer treats latex as normal text
     urlResolver: new SimpleUrlResolver(),   // this url resolver keeps the url as-is
   })
   
   // render latex and highlight code
   const html = parseResult.renderHTML({
     latexRenderer: new MathJaxRenderer(),
     codeRenderer: new HighlightJsRenderer(),
   })
   
   // render latex and highlight code with explicit default options, equivalent to the code above
   const html = parseResult.renderHTML({
     latexRenderer: new MathJaxRenderer({
       applyLineBreaks: true,       // apply line breaks at \\ and \newline in math block, see https://support.typora.io/Math/#line-breaking
       autoNumbering: false,        // auto numbering math blocks
     }),
     codeRenderer: new HighlightJsRenderer({
       displayLineNumbers: false,   // display line numbers on code block, no effect when vanillaHTML: true
     }),
   })
   
   // include head and body tag, use extra head tags from tags.txt (see step 2), render latex and highlight code with line numbers
   const html = parseResult.renderHTML({
     includeHead: true,
     extraHeadTags: await fs.readFile('tags.txt', {encoding: 'utf8'}),
     latexRenderer: new MathJaxRenderer(),
     codeRenderer: new HighlightJsRenderer({displayLineNumbers: true}),
   })
   
   // you can implement a custom url resolver to transform url in the markdown
   const html = parseResult.renderHTML({
     urlResolver: {
       resolve: (url, type) => {
         // type can be 'link' or 'image' or 'email'
         return 'your-transformed-url'
       },
     },
   })
   ```


## Feature Status

- [x] Standard markdown stuff you'd expect
- [x] Footnotes
- [x] Checkbox list
- [x] Math block and inline math (LaTeX)
  - [x] Auto numbering
  - [ ] Chemical equations
  - [ ] Extra tex packages
- [x] [YAML front matter](https://support.typora.io/YAML/)
- [x] Table of contents
- [x] Fenced code highlighting
- [x] Emoji
- [x] Highlight
- [x] Subscript
- [x] Superscript
- [x] Allow empty paragraphs
- [ ] Diagrams
  - [ ] Sequence Diagrams
  - [ ] Flowcharts
  - [ ] Mermaid

## TODO

- Complete features
- More, proper tests

## Known Differences

- Typora and this package don't parse emphasis the same way as spec. There may be slight differences when parsing emphasis between this package and Typora. When in doubt, use escape.
- Automatic URL detection is not exactly the same. When in doubt, use link syntax (`[text](url)`).
- Typora uses [CodeMirror](https://codemirror.net/) to highlight code, however it only runs in a browser environment. This package uses [highlight.js](https://highlightjs.org/) to highlight code then swap highlight.js classes to CodeMirror classes. The result is very similar to Typora's output.
- I'm not very familiar to the usage of [MathJax](https://www.mathjax.org/) or LaTeX, the configuration of MathJax is probably slightly different between this package and Typora.

## Bug Report

When reporting a bug, please make sure your markdown can be created only using Typora's WYSIWYG interface (no raw markdown editing). 
