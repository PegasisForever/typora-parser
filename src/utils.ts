export function last<T>(array: T[]): T
export function last(array: string): string
export function last<T>(array: any): T {
  return array[array.length - 1]
}

export function any<T>(list: T[], condition: (it: T) => boolean): boolean {
  for (const item of list) {
    if (condition(item)) return true
  }

  return false
}

export function findIndexOfLast<T>(list: T[], condition: (it: T) => boolean): number | null {
  for (let i = list.length - 1; i >= 0; i--) {
    if (condition(list[i])) {
      return i
    }
  }

  return null
}
