export function last<T>(array: T[]): T {
  return array[array.length - 1]
}

export function any<T>(list: T[], condition: (it: T) => boolean): boolean {
  for (const item of list) {
    if (condition(item)) return true
  }

  return false
}
