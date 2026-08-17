let trapStack: number[] = []
let nextTrapId = 0

export function pushTrapStack(): number {
  const id = nextTrapId++
  trapStack.push(id)
  return id
}

export function removeTrapStack(id: number): void {
  trapStack = trapStack.filter((entry) => entry !== id)
}

export function isTopTrap(id: number): boolean {
  return trapStack.length > 0 && trapStack[trapStack.length - 1] === id
}

/** Reset stack between tests. */
export function clearTrapStackForTests(): void {
  trapStack = []
  nextTrapId = 0
}
