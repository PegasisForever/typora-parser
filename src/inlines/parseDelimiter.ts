const punctuationRegex = /[!"#$%&'()+,-./:;<=>?@\[\\\]^_`{|}~]/
const whiteSpaceRegex = /\s|^$/

function analyzeBeforeAfterChar(beforeChar: string, afterChar: string): { bWhiteSpace: boolean, bPunctuation: boolean, aWhiteSpace: boolean, aPunctuation: boolean } {
  return {
    bWhiteSpace: !!beforeChar.match(whiteSpaceRegex),
    bPunctuation: !!beforeChar.match(punctuationRegex),
    aWhiteSpace: !!afterChar.match(whiteSpaceRegex),
    aPunctuation: !!afterChar.match(punctuationRegex),
  }
}

export function isLeftDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
  let {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

  // no intraword "_" emphasis
  if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
    return false
  }

  // preceded by whitespace or punctuation, followed by punctuation
  if ((bWhiteSpace || bPunctuation) && aPunctuation) {
    return true
  }

  // not followed by whitespace or punctuation
  if (!aWhiteSpace && !aPunctuation) {
    return true
  }

  return false
}

export function isRightDelimiter(beforeChar: string, delimiterRun: string, afterChar: string): boolean {
  let {bWhiteSpace, bPunctuation, aWhiteSpace, aPunctuation} = analyzeBeforeAfterChar(beforeChar, afterChar)

  // no intraword "_" emphasis
  if (delimiterRun[0] === '_' && !bWhiteSpace && !bPunctuation && !aWhiteSpace && !aPunctuation) {
    return false
  }

  // preceded by punctuation, followed by whitespace or punctuation
  if (bPunctuation && (aWhiteSpace || aPunctuation)) {
    return true
  }

  // not preceded by whitespace or punctuation
  if (!bWhiteSpace && !bPunctuation) {
    return true
  }

  return false
}
