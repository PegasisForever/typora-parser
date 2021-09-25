import {last} from '../utils'

export type ParseNestedBracketsResult = { parsed: string, remaining: string }

export function parseNestedBrackets(line: string, startChar: string, endChar: string): ParseNestedBracketsResult | null {
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
      parsed: parsed.substring(1, parsed.length - 1),
      remaining: line.substring(i + 1),
    }
  } else {
    return null
  }
}
