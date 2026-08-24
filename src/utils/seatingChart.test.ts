import { describe, expect, it } from 'vitest'
import type { Student } from '@/src/types/models'
import {
  applyLayoutChange,
  assignStudentToSeat,
  autoArrange,
  buildSeatGrid,
  clearAllSeatAssignments,
  DEFAULT_SEATING_CHART_CONFIG,
  deskCapacity,
  generateSeatIds,
  getUnassignedStudentIds,
  makeSeatId,
  normalizeSeatingChartConfig,
  randomArrange,
  reconcileSeatingChart,
  removeStudentFromAllSeats,
  totalSeatCapacity,
} from './seatingChart'

function makeStudent(id: string): Student {
  return {
    id,
    name: `Student ${id}`,
    classroomRoleIds: [],
    badgeIds: [],
    points: 0,
    totalRewards: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

describe('seatingChart seat generation', () => {
  it('generates stable seat ids for groups rows columns', () => {
    const ids = generateSeatIds({ groups: 2, rows: 3, columnsPerGroup: 2 })
    expect(ids).toEqual([
      'g0-r0-c0',
      'g0-r0-c1',
      'g0-r1-c0',
      'g0-r1-c1',
      'g0-r2-c0',
      'g0-r2-c1',
      'g1-r0-c0',
      'g1-r0-c1',
      'g1-r1-c0',
      'g1-r1-c1',
      'g1-r2-c0',
      'g1-r2-c1',
    ])
  })

  it('computes total capacity by desk type', () => {
    expect(totalSeatCapacity({ ...DEFAULT_SEATING_CHART_CONFIG, deskType: 'individual' })).toBe(20)
    expect(totalSeatCapacity({ ...DEFAULT_SEATING_CHART_CONFIG, deskType: 'pair' })).toBe(40)
    expect(totalSeatCapacity({ ...DEFAULT_SEATING_CHART_CONFIG, deskType: 'group' })).toBe(80)
    expect(deskCapacity('pair')).toBe(2)
  })

  it('builds grouped grid with aisles metadata', () => {
    const grid = buildSeatGrid({ ...DEFAULT_SEATING_CHART_CONFIG, groups: 2, rows: 1, columnsPerGroup: 2 })
    expect(grid).toHaveLength(2)
    expect(grid[0]?.[0]).toHaveLength(2)
    expect(grid[1]?.[0]?.[0]?.seatId).toBe(makeSeatId(1, 0, 0))
  })
})

describe('normalizeSeatingChartConfig', () => {
  it('returns defaults when raw is missing', () => {
    const config = normalizeSeatingChartConfig(undefined)
    expect(config.groups).toBe(DEFAULT_SEATING_CHART_CONFIG.groups)
    expect(config.seats).toHaveLength(generateSeatIds(config).length)
  })

  it('drops assignments for seats outside layout', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 1,
      deskType: 'individual',
      seats: [
        { seatId: 'g0-r0-c0', studentIds: ['s1'] },
        { seatId: 'g9-r9-c9', studentIds: ['s2'] },
      ],
    })
    expect(config.seats).toHaveLength(1)
    expect(config.seats[0]?.studentIds).toEqual(['s1'])
  })
})

describe('reconcileSeatingChart', () => {
  it('preserves valid assignments and returns overflow on shrink', () => {
    const base = normalizeSeatingChartConfig({
      groups: 2,
      rows: 2,
      columnsPerGroup: 2,
      deskType: 'individual',
      seats: [
        { seatId: 'g0-r0-c0', studentIds: ['s1'] },
        { seatId: 'g0-r0-c1', studentIds: ['s2'] },
        { seatId: 'g1-r0-c0', studentIds: ['s3'] },
      ],
    })

    const { config, overflowStudentIds } = applyLayoutChange(
      base,
      { groups: 1, rows: 1, columnsPerGroup: 1 },
      new Set(['s1', 's2', 's3']),
    )

    expect(config.seats.find((s) => s.seatId === 'g0-r0-c0')?.studentIds).toEqual(['s1'])
    expect(overflowStudentIds.sort()).toEqual(['s2', 's3'])
  })

  it('strips unknown student ids', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 1,
      deskType: 'individual',
      seats: [{ seatId: 'g0-r0-c0', studentIds: ['missing'] }],
    })
    const { config: reconciled, overflowStudentIds } = reconcileSeatingChart(config, new Set(['s1']))
    expect(reconciled.seats[0]?.studentIds).toEqual([])
    expect(overflowStudentIds).toEqual([])
  })

  it('trims desk capacity overflow when desk type changes', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 1,
      deskType: 'group',
      seats: [{ seatId: 'g0-r0-c0', studentIds: ['a', 'b', 'c', 'd', 'e'] }],
    })
    const { config: next, overflowStudentIds } = applyLayoutChange(
      config,
      { deskType: 'individual' },
      new Set(['a', 'b', 'c', 'd', 'e']),
    )
    expect(next.deskType).toBe('individual')
    expect(next.seats[0]?.studentIds).toEqual(['a'])
    expect(overflowStudentIds.sort()).toEqual(['b', 'c', 'd', 'e'])
  })
})

describe('autoArrange and randomArrange', () => {
  it('fills seats in stable order', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 3,
      deskType: 'individual',
      seats: [],
    })
    const arranged = autoArrange(config, ['a', 'b', 'c', 'd'])
    expect(arranged.seats.map((s) => s.studentIds[0])).toEqual(['a', 'b', 'c'])
    expect(getUnassignedStudentIds(arranged, ['a', 'b', 'c', 'd'].map(makeStudent))).toEqual(['d'])
  })

  it('randomArrange is deterministic with seeded rng', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 2,
      deskType: 'individual',
      seats: [],
    })
    let i = 0
    const sequence = [0.9, 0.1]
    const arranged = randomArrange(config, ['a', 'b'], () => sequence[i++] ?? 0)
    expect(arranged.seats.flatMap((s) => s.studentIds).sort()).toEqual(['a', 'b'])
  })
})

describe('assignStudentToSeat', () => {
  it('swaps two seated students on individual desks', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 2,
      deskType: 'individual',
      seats: [
        { seatId: 'g0-r0-c0', studentIds: ['a'] },
        { seatId: 'g0-r0-c1', studentIds: ['b'] },
      ],
    })
    const next = assignStudentToSeat(config, 'g0-r0-c1', 'a', { swap: true })
    expect(next?.seats.find((s) => s.seatId === 'g0-r0-c0')?.studentIds).toEqual(['b'])
    expect(next?.seats.find((s) => s.seatId === 'g0-r0-c1')?.studentIds).toEqual(['a'])
  })

  it('moves unassigned student onto occupied individual seat and unassigns displaced', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 2,
      deskType: 'individual',
      seats: [{ seatId: 'g0-r0-c0', studentIds: ['a'] }],
    })
    const next = assignStudentToSeat(config, 'g0-r0-c0', 'b', { swap: true })
    expect(next?.seats.find((s) => s.seatId === 'g0-r0-c0')?.studentIds).toEqual(['b'])
    expect(getUnassignedStudentIds(next!, ['a', 'b'].map(makeStudent))).toEqual(['a'])
  })
})

describe('removeStudentFromAllSeats', () => {
  it('removes student from every seat', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 2,
      deskType: 'pair',
      seats: [
        { seatId: 'g0-r0-c0', studentIds: ['s1', 's2'] },
        { seatId: 'g0-r0-c1', studentIds: ['s3'] },
      ],
    })
    const next = removeStudentFromAllSeats(config, 's2')
    expect(next.seats[0]?.studentIds).toEqual(['s1'])
  })
})

describe('clearAllSeatAssignments', () => {
  it('empties every seat while keeping layout', () => {
    const config = normalizeSeatingChartConfig({
      groups: 1,
      rows: 1,
      columnsPerGroup: 2,
      deskType: 'individual',
      seats: [
        { seatId: 'g0-r0-c0', studentIds: ['a'] },
        { seatId: 'g0-r0-c1', studentIds: ['b'] },
      ],
    })
    const next = clearAllSeatAssignments(config)
    expect(next.groups).toBe(config.groups)
    expect(next.seats.every((seat) => seat.studentIds.length === 0)).toBe(true)
  })
})
