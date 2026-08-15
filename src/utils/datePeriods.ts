export function getMondayWeekStart(now = new Date()): Date {
  const from = new Date(now)
  const day = from.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  from.setDate(from.getDate() + diffToMonday)
  from.setHours(0, 0, 0, 0)
  return from
}

export function getMonthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
}
