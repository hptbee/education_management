import type { PointHistory, Student, Team, TeamScoreHistory } from '@/src/types/models'

export type RankingPeriod = 'all-time' | 'week' | 'month'

export interface RankedStudent {
  student: Student
  rank: number
  points: number
}

export interface RankedTeam {
  team: Team
  rank: number
  score: number
}

export const RANKING_PERIOD_LABELS: Record<RankingPeriod, string> = {
  'all-time': 'Toàn thời gian',
  week: 'Tuần này',
  month: 'Tháng này',
}

function compareStudentNames(a: Student, b: Student): number {
  return a.name.localeCompare(b.name, 'vi')
}

function compareTeamNames(a: Team, b: Team): number {
  return a.name.localeCompare(b.name, 'vi')
}

function assignDenseRanks<T>(
  sorted: T[],
  getValue: (item: T) => number,
): { item: T; rank: number; value: number }[] {
  if (sorted.length === 0) return []

  const result: { item: T; rank: number; value: number }[] = []
  let rank = 1

  for (let i = 0; i < sorted.length; i++) {
    const value = getValue(sorted[i])
    if (i > 0 && value !== getValue(sorted[i - 1])) {
      rank += 1
    }
    result.push({ item: sorted[i], rank, value })
  }

  return result
}

export function rankStudents(
  students: Student[],
  options?: { getPoints?: (student: Student) => number },
): RankedStudent[] {
  const getPoints = options?.getPoints ?? ((student) => student.points)

  const sorted = [...students].sort((a, b) => {
    const diff = getPoints(b) - getPoints(a)
    if (diff !== 0) return diff
    return compareStudentNames(a, b)
  })

  return assignDenseRanks(sorted, getPoints).map(({ item, rank, value }) => ({
    student: item,
    rank,
    points: value,
  }))
}

export function rankTeams(
  teams: Team[],
  options?: { getScore?: (team: Team) => number },
): RankedTeam[] {
  const getScore = options?.getScore ?? ((team) => team.score)

  const sorted = [...teams].sort((a, b) => {
    const diff = getScore(b) - getScore(a)
    if (diff !== 0) return diff
    return compareTeamNames(a, b)
  })

  return assignDenseRanks(sorted, getScore).map(({ item, rank, value }) => ({
    team: item,
    rank,
    score: value,
  }))
}

export function sumPointsByStudent(
  history: PointHistory[],
  from?: Date,
  to?: Date,
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const entry of history) {
    const at = new Date(entry.createdAt)
    if (from && at < from) continue
    if (to && at > to) continue
    totals.set(entry.studentId, (totals.get(entry.studentId) ?? 0) + entry.points)
  }

  return totals
}

export function sumScoresByTeam(
  history: TeamScoreHistory[],
  from?: Date,
  to?: Date,
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const entry of history) {
    const at = new Date(entry.createdAt)
    if (from && at < from) continue
    if (to && at > to) continue
    totals.set(entry.teamId, (totals.get(entry.teamId) ?? 0) + entry.points)
  }

  return totals
}

export function getRankingPeriodRange(period: RankingPeriod, now = new Date()): {
  from?: Date
  to?: Date
} {
  if (period === 'all-time') {
    return {}
  }

  if (period === 'week') {
    const from = new Date(now)
    const day = from.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    from.setDate(from.getDate() + diffToMonday)
    from.setHours(0, 0, 0, 0)
    return { from, to: now }
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  return { from, to: now }
}

export function buildStudentRanking(
  students: Student[],
  pointHistory: PointHistory[],
  period: RankingPeriod,
): RankedStudent[] {
  if (period === 'all-time') {
    return rankStudents(students)
  }

  const { from, to } = getRankingPeriodRange(period)
  const totals = sumPointsByStudent(pointHistory, from, to)
  return rankStudents(students, {
    getPoints: (student) => totals.get(student.id) ?? 0,
  })
}

export function buildTeamRanking(
  teams: Team[],
  teamScoreHistory: TeamScoreHistory[],
  period: RankingPeriod,
): RankedTeam[] {
  if (period === 'all-time') {
    return rankTeams(teams)
  }

  const { from, to } = getRankingPeriodRange(period)
  const totals = sumScoresByTeam(teamScoreHistory, from, to)
  return rankTeams(teams, {
    getScore: (team) => totals.get(team.id) ?? 0,
  })
}

export function filterRankedStudents(
  ranked: RankedStudent[],
  filters: {
    searchQuery?: string
    teamId?: string
    gender?: string
  },
): RankedStudent[] {
  const q = filters.searchQuery?.trim().toLowerCase() ?? ''

  return ranked.filter(({ student }) => {
    if (q && !student.name.toLowerCase().includes(q)) return false

    if (filters.teamId && filters.teamId !== 'all') {
      if (filters.teamId === 'none') {
        if (student.teamId) return false
      } else if (student.teamId !== filters.teamId) {
        return false
      }
    }

    if (filters.gender && filters.gender !== 'all') {
      if (student.gender !== filters.gender) return false
    }

    return true
  })
}

export const RANK_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export const RANK_BADGE_CLASS: Record<number, string> = {
  1: 'bg-pastel-yellow text-amber-800 ring-2 ring-amber-200',
  2: 'bg-slate-100 text-slate-600 ring-2 ring-slate-200',
  3: 'bg-pastel-peach text-orange-800 ring-2 ring-orange-200',
}

export const RANK_ROW_CLASS: Record<number, string> = {
  1: 'border-amber-100 bg-pastel-yellow/50',
  2: 'border-slate-100 bg-slate-50',
  3: 'border-orange-100 bg-pastel-peach/40',
}
