export function last<T>(array: T[]): T
export function last(array: string): string
export function last<T>(array: { length: number }): T {
  return array[array.length - 1]
}

export function removeAt<T>(array: T[], i: number): void {
  array.splice(i, 1)
}

export function any<T>(list: T[], condition: (it: T) => boolean): boolean {
  for (const item of list) {
    if (condition(item)) return true
  }

  return false
}

export function replaceAll(target: string, oldStr: string, newStr: string): string {
  const escapedOldStr = oldStr.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
  return target.replace(new RegExp(escapedOldStr, 'g'), newStr)
}

// replace escape characters with reserved unicode so it get treated like normal text characters while parsing
const mdEscapableChars = '!"#$&\'()*+-.<=>[\\]^_`{|}~'
const mdEscapableCharReplaces = String.fromCodePoint(...Array.from(mdEscapableChars).map((_, i) => 0xE000 + i))

function getUnicodePoint(char: string): string {
  const hex = char.codePointAt(0).toString(16)
  return '\\u' + '0000'.substring(0, 4 - hex.length) + hex
}

const mdPunctuationRegex = `[!"#$%&'()+,-./:;<=>?@[\\\\\\]^_\`{|}~${getUnicodePoint(mdEscapableCharReplaces[0])}-${getUnicodePoint(last(mdEscapableCharReplaces))}]`

const htmlEscapableChars = '&\'"<>'
const htmlEscapableCharReplaces = ['&amp;', '&#39;', '&quot;', '&lt;', '&gt;']

export const EscapeUtils = {
  mdEscapableChars,
  mdEscapableCharReplaces,
  mdPunctuationRegex,
  htmlEscapableChars,
  htmlEscapableCharReplaces,
  escapeHtml: (str: string): string => {
    for (let i = 0; i < htmlEscapableChars.length; i++) {
      str = replaceAll(str, htmlEscapableChars[i], htmlEscapableCharReplaces[i])
    }
    return str
  },
  unEscapeMarkdown: (str: string, restoreBackSlash?: boolean): string => {
    for (let i = 0; i < mdEscapableChars.length; i++) {
      str = replaceAll(str, mdEscapableCharReplaces[i], EscapeUtils.escapeHtml((restoreBackSlash ? '\\' : '') + mdEscapableChars[i]))
    }
    return str
  },
  escapeMarkdown: (str: string): string => {
    let markdown = ''
    let i = 0
    let escape = false
    while (i < str.length) {
      const char = str[i]
      if (escape) {
        const escapedCharIndex = EscapeUtils.mdEscapableChars.indexOf(char)
        if (escapedCharIndex >= 0) {
          markdown += EscapeUtils.mdEscapableCharReplaces[escapedCharIndex]
        } else {
          markdown += '\\' + char
        }
        escape = false
      } else if (char === '\\') {
        escape = true
      } else {
        markdown += char
      }
      i++
    }

    return markdown
  },
}
