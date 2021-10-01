import {EscapeUtils, last} from '../utils'

export type ParseNestedBracketsResult = { inside: string, remaining: string }

export function delimiterUtils(line: string, startChar: string, endChar: string): ParseNestedBracketsResult | null {
  let parsed = ''
  let isEscape = false
  let i = 0
  let extraStartCharCount = 0
  while (i < line.length) {
    const char = line[i]
    if (parsed === '') {
      if (char === startChar) {
        parsed = startChar
      } else {
        return null
      }
    } else if (isEscape) {
      parsed += char
    } else if (char === '\\') {
      isEscape = true
    } else if (char === endChar) {
      if (extraStartCharCount === 0) {
        parsed += char
        break
      } else {
        extraStartCharCount--
        parsed += char
      }
    } else if (char === startChar) {
      extraStartCharCount++
      parsed += char
    } else {
      parsed += char
    }
    i++
  }

  if (parsed.length >= 2 && last(parsed) === endChar) {
    return {
      inside: parsed.substring(1, parsed.length - 1),
      remaining: line.substring(i + 1),
    }
  } else {
    return null
  }
}

const punctuationRegex = new RegExp(EscapeUtils.mdPunctuationRegex)
const whiteSpaceRegex = /\s|^$/

export function analyzeBeforeAfterChar(beforeChar: string, afterChar: string): { bWhiteSpace: boolean, bPunctuation: boolean, aWhiteSpace: boolean, aPunctuation: boolean } {
  return {
    bWhiteSpace: !!beforeChar.match(whiteSpaceRegex),
    bPunctuation: !!beforeChar.match(punctuationRegex),
    aWhiteSpace: !!afterChar.match(whiteSpaceRegex),
    aPunctuation: !!afterChar.match(punctuationRegex),
  }
}

export function isLeftDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
  const {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

  // no intraword "_" emphasis
  if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
    return false
  }

  // preceded by whitespace or punctuation, followed by punctuation
  if ((bWhiteSpace || bPunctuation) && aPunctuation) {
    return true
  }

  // not followed by whitespace or punctuation
  // noinspection RedundantIfStatementJS
  if (!aWhiteSpace && !aPunctuation) {
    return true
  }

  return false
}

export function isRightDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
  const {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

  // no intraword "_" emphasis
  if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
    return false
  }

  // preceded by punctuation, followed by whitespace or punctuation
  if (bPunctuation && (aWhiteSpace || aPunctuation)) {
    return true
  }

  // not preceded by whitespace or punctuation
  // noinspection RedundantIfStatementJS
  if (!bWhiteSpace && !bPunctuation) {
    return true
  }

  return false
}
