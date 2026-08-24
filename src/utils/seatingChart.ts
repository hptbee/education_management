import type { BoardPosition, DeskType, SeatAssignment, SeatingChartConfig, Student } from '@/src/types/models'

export type { BoardPosition, DeskType, SeatAssignment, SeatingChartConfig }

export const SEATING_CHART_MIN_GROUPS = 1
export const SEATING_CHART_MAX_GROUPS = 6
export const SEATING_CHART_MIN_ROWS = 1
export const SEATING_CHART_MAX_ROWS = 12
export const SEATING_CHART_MIN_COLUMNS = 1
export const SEATING_CHART_MAX_COLUMNS = 8
export const SEATING_CHART_MIN_GROUP_GAP = 1
export const SEATING_CHART_MAX_GROUP_GAP = 5

export const DEFAULT_SEATING_CHART_CONFIG: SeatingChartConfig = {
  version: 1,
  groups: 2,
  rows: 5,
  columnsPerGroup: 2,
  groupGap: 3,
  deskType: 'individual',
  boardPosition: 'front',
  seats: [],
}

export function deskCapacity(deskType: DeskType): number {
  switch (deskType) {
    case 'pair':
      return 2
    case 'group':
      return 4
    default:
      return 1
  }
}

export function makeSeatId(group: number, row: number, column: number): string {
  return `g${group}-r${row}-c${column}`
}

export function parseSeatId(seatId: string): { group: number; row: number; column: number } | null {
  const match = /^g(\d+)-r(\d+)-c(\d+)$/.exec(seatId)
  if (!match) return null
  return {
    group: Number(match[1]),
    row: Number(match[2]),
    column: Number(match[3]),
  }
}

export function clampLayoutValue(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function generateSeatIds(config: Pick<SeatingChartConfig, 'groups' | 'rows' | 'columnsPerGroup'>): string[] {
  const ids: string[] = []
  for (let g = 0; g < config.groups; g += 1) {
    for (let r = 0; r < config.rows; r += 1) {
      for (let c = 0; c < config.columnsPerGroup; c += 1) {
        ids.push(makeSeatId(g, r, c))
      }
    }
  }
  return ids
}

export function totalSeatCapacity(config: Pick<SeatingChartConfig, 'groups' | 'rows' | 'columnsPerGroup' | 'deskType'>): number {
  return generateSeatIds(config).length * deskCapacity(config.deskType)
}

function sanitizeDeskType(raw: unknown): DeskType {
  if (raw === 'pair' || raw === 'group') return raw
  return 'individual'
}

function sanitizeBoardPosition(raw: unknown): BoardPosition {
  if (raw === 'back' || raw === 'left' || raw === 'right') return raw
  return 'front'
}

function sanitizeSeatAssignment(raw: unknown): SeatAssignment | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.seatId !== 'string' || !record.seatId) return null
  const studentIds = Array.isArray(record.studentIds)
    ? record.studentIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  const unique = [...new Set(studentIds)]
  return { seatId: record.seatId, studentIds: unique }
}

export function normalizeSeatingChartConfig(
  raw: unknown,
  validStudentIds?: Set<string>,
): SeatingChartConfig {
  if (!raw || typeof raw !== 'object') {
    const defaults = { ...DEFAULT_SEATING_CHART_CONFIG }
    return {
      ...defaults,
      seats: generateSeatIds(defaults).map((seatId) => ({ seatId, studentIds: [] })),
    }
  }

  const record = raw as Record<string, unknown>
  const deskType = sanitizeDeskType(record.deskType)

  const groups = clampLayoutValue(
    typeof record.groups === 'number' ? record.groups : DEFAULT_SEATING_CHART_CONFIG.groups,
    SEATING_CHART_MIN_GROUPS,
    SEATING_CHART_MAX_GROUPS,
  )
  const rows = clampLayoutValue(
    typeof record.rows === 'number' ? record.rows : DEFAULT_SEATING_CHART_CONFIG.rows,
    SEATING_CHART_MIN_ROWS,
    SEATING_CHART_MAX_ROWS,
  )
  const columnsPerGroup = clampLayoutValue(
    typeof record.columnsPerGroup === 'number'
      ? record.columnsPerGroup
      : DEFAULT_SEATING_CHART_CONFIG.columnsPerGroup,
    SEATING_CHART_MIN_COLUMNS,
    SEATING_CHART_MAX_COLUMNS,
  )
  const groupGap = clampLayoutValue(
    typeof record.groupGap === 'number' ? record.groupGap : DEFAULT_SEATING_CHART_CONFIG.groupGap,
    SEATING_CHART_MIN_GROUP_GAP,
    SEATING_CHART_MAX_GROUP_GAP,
  )

  const layout = { groups, rows, columnsPerGroup, deskType }
  const validIds = new Set(generateSeatIds(layout))
  const seatsById = new Map<string, SeatAssignment>()

  if (Array.isArray(record.seats)) {
    for (const entry of record.seats) {
      const seat = sanitizeSeatAssignment(entry)
      if (!seat || !validIds.has(seat.seatId)) continue
      seatsById.set(seat.seatId, seat)
    }
  }

  const seats = generateSeatIds(layout).map((seatId) => seatsById.get(seatId) ?? { seatId, studentIds: [] })

  const base: SeatingChartConfig = {
    version: 1,
    groups,
    rows,
    columnsPerGroup,
    groupGap,
    deskType,
    boardPosition: sanitizeBoardPosition(record.boardPosition),
    seats,
  }

  if (validStudentIds) {
    return reconcileSeatingChart(base, validStudentIds).config
  }

  return base
}

export function getAssignedStudentIds(config: SeatingChartConfig): string[] {
  const ids: string[] = []
  for (const seat of config.seats) {
    for (const studentId of seat.studentIds) {
      if (!ids.includes(studentId)) ids.push(studentId)
    }
  }
  return ids
}

export function getUnassignedStudentIds(config: SeatingChartConfig, students: Student[]): string[] {
  const assigned = new Set(getAssignedStudentIds(config))
  return students.map((s) => s.id).filter((id) => !assigned.has(id))
}

export function getSeatById(config: SeatingChartConfig, seatId: string): SeatAssignment | undefined {
  return config.seats.find((seat) => seat.seatId === seatId)
}

export function getSeatForStudent(config: SeatingChartConfig, studentId: string): SeatAssignment | undefined {
  return config.seats.find((seat) => seat.studentIds.includes(studentId))
}

export function removeStudentFromAllSeats(config: SeatingChartConfig, studentId: string): SeatingChartConfig {
  return {
    ...config,
    seats: config.seats.map((seat) => ({
      ...seat,
      studentIds: seat.studentIds.filter((id) => id !== studentId),
    })),
  }
}

export interface ReconcileResult {
  config: SeatingChartConfig
  overflowStudentIds: string[]
}

export function reconcileSeatingChart(
  config: SeatingChartConfig,
  validStudentIds: Set<string>,
): ReconcileResult {
  const capacity = deskCapacity(config.deskType)
  const validIds = new Set(generateSeatIds(config))
  const overflowStudentIds: string[] = []
  const seen = new Set<string>()

  const seats = generateSeatIds(config).map((seatId) => {
    const existing = config.seats.find((seat) => seat.seatId === seatId)
    const kept: string[] = []
    for (const studentId of existing?.studentIds ?? []) {
      if (!validStudentIds.has(studentId)) continue
      if (seen.has(studentId)) {
        overflowStudentIds.push(studentId)
        continue
      }
      if (kept.length >= capacity) {
        overflowStudentIds.push(studentId)
        continue
      }
      kept.push(studentId)
      seen.add(studentId)
    }
    return { seatId, studentIds: kept }
  })

  for (const seat of config.seats) {
    if (!validIds.has(seat.seatId)) {
      for (const studentId of seat.studentIds) {
        if (validStudentIds.has(studentId) && !seen.has(studentId)) {
          overflowStudentIds.push(studentId)
          seen.add(studentId)
        } else if (validStudentIds.has(studentId) && seen.has(studentId)) {
          overflowStudentIds.push(studentId)
        }
      }
    }
  }

  return {
    config: { ...config, seats },
    overflowStudentIds: [...new Set(overflowStudentIds)],
  }
}

export function applyLayoutChange(
  config: SeatingChartConfig,
  patch: Partial<Pick<SeatingChartConfig, 'groups' | 'rows' | 'columnsPerGroup' | 'groupGap' | 'deskType' | 'boardPosition'>>,
  validStudentIds: Set<string>,
): ReconcileResult {
  const layoutBase = normalizeSeatingChartConfig({
    ...config,
    ...patch,
    seats: [],
  })
  return reconcileSeatingChart(
    { ...layoutBase, seats: config.seats },
    validStudentIds,
  )
}

export function assignStudentToSeat(
  config: SeatingChartConfig,
  seatId: string,
  studentId: string,
  options?: { swap?: boolean },
): SeatingChartConfig | null {
  const capacity = deskCapacity(config.deskType)
  const target = getSeatById(config, seatId)
  if (!target) return null
  if (target.studentIds.includes(studentId)) return config

  const sourceSeat = getSeatForStudent(config, studentId)

  if (capacity === 1) {
    if (target.studentIds.length > 0) {
      if (!options?.swap) return null
      const displaced = target.studentIds[0]
      if (!displaced || displaced === studentId) return config

      return {
        ...config,
        seats: config.seats.map((seat) => {
          if (seat.seatId === seatId) return { ...seat, studentIds: [studentId] }
          if (sourceSeat && seat.seatId === sourceSeat.seatId) {
            return { ...seat, studentIds: [displaced] }
          }
          if (seat.studentIds.includes(studentId)) {
            return { ...seat, studentIds: seat.studentIds.filter((id) => id !== studentId) }
          }
          return seat
        }),
      }
    }

    return {
      ...config,
      seats: config.seats.map((seat) => {
        if (seat.seatId === seatId) return { ...seat, studentIds: [studentId] }
        if (seat.studentIds.includes(studentId)) {
          return { ...seat, studentIds: seat.studentIds.filter((id) => id !== studentId) }
        }
        return seat
      }),
    }
  }

  if (target.studentIds.length >= capacity) return null

  return {
    ...config,
    seats: config.seats.map((seat) => {
      if (seat.seatId === seatId) {
        return { ...seat, studentIds: [...seat.studentIds.filter((id) => id !== studentId), studentId] }
      }
      if (seat.studentIds.includes(studentId)) {
        return { ...seat, studentIds: seat.studentIds.filter((id) => id !== studentId) }
      }
      return seat
    }),
  }
}

export function unassignStudentFromSeat(
  config: SeatingChartConfig,
  seatId: string,
  studentId?: string,
): SeatingChartConfig {
  return {
    ...config,
    seats: config.seats.map((seat) => {
      if (seat.seatId !== seatId) return seat
      if (!studentId) return { ...seat, studentIds: [] }
      return { ...seat, studentIds: seat.studentIds.filter((id) => id !== studentId) }
    }),
  }
}

export function clearAllSeatAssignments(config: SeatingChartConfig): SeatingChartConfig {
  return {
    ...config,
    seats: config.seats.map((seat) => ({ seatId: seat.seatId, studentIds: [] })),
  }
}

export function autoArrange(
  config: SeatingChartConfig,
  orderedStudentIds: string[],
): SeatingChartConfig {
  const capacity = deskCapacity(config.deskType)
  const ids = [...orderedStudentIds]
  let index = 0

  const seats = generateSeatIds(config).map((seatId) => {
    const studentIds: string[] = []
    while (studentIds.length < capacity && index < ids.length) {
      studentIds.push(ids[index]!)
      index += 1
    }
    return { seatId, studentIds }
  })

  return { ...config, seats }
}

export function randomArrange(
  config: SeatingChartConfig,
  studentIds: string[],
  rng: () => number = Math.random,
): SeatingChartConfig {
  const shuffled = [...studentIds]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return autoArrange(config, shuffled)
}

export function getSeatDisplayIndex(seatId: string, config: SeatingChartConfig): number {
  const ids = generateSeatIds(config)
  const index = ids.indexOf(seatId)
  return index >= 0 ? index + 1 : 0
}

export interface SeatGridCell {
  seatId: string
  group: number
  row: number
  column: number
}

export function buildSeatGrid(config: SeatingChartConfig): SeatGridCell[][][] {
  const grid: SeatGridCell[][][] = []
  for (let g = 0; g < config.groups; g += 1) {
    const groupRows: SeatGridCell[][] = []
    for (let r = 0; r < config.rows; r += 1) {
      const rowCells: SeatGridCell[] = []
      for (let c = 0; c < config.columnsPerGroup; c += 1) {
        rowCells.push({
          seatId: makeSeatId(g, r, c),
          group: g,
          row: r,
          column: c,
        })
      }
      groupRows.push(rowCells)
    }
    grid.push(groupRows)
  }
  return grid
}
