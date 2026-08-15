import type {
  PointHistory,
  Recognition,
  RewardHistory,
  Student,
  Team,
  TeamScoreHistory,
} from '@/src/types/models'
import type { ClassroomDatabase } from '@/src/database/types'

export type ActivityKind =
  | 'points'
  | 'reward'
  | 'recognition'
  | 'team-score'
  | 'lucky-wheel'
  | 'badge'

export type ActivityFilter = 'all' | ActivityKind

export type ActivityReferenceType = ActivityKind

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  referenceType: ActivityReferenceType
  referenceId: string
  createdAt: string
  title: string
  subtitle?: string
  detail?: string
  points?: number
  studentId?: string
  studentIds?: string[]
  studentName?: string
  studentNames?: string[]
  teamId?: string
  teamName?: string
}

function studentNameById(students: Student[], studentId: string) {
  return students.find((s) => s.id === studentId)?.name ?? 'Học sinh'
}

function teamNameById(teams: Team[], teamId: string) {
  return teams.find((t) => t.id === teamId)?.name ?? 'Tổ'
}

function resolveStudentNames(students: Student[], studentIds: string[]) {
  return studentIds.map((id) => studentNameById(students, id))
}

export function buildClassroomActivity(database: ClassroomDatabase): ActivityEntry[] {
  const {
    students,
    teams,
    pointHistory,
    rewardHistory,
    recognitions,
    teamScoreHistory,
    luckyWheelHistory,
    badgeAwardHistory,
  } = database

  const pointEntries: ActivityEntry[] = pointHistory.map((entry: PointHistory) => ({
    id: `points-${entry.id}`,
    kind: 'points',
    referenceType: 'points',
    referenceId: entry.id,
    createdAt: entry.createdAt,
    title: entry.actionName,
    subtitle: entry.note,
    points: entry.points,
    studentId: entry.studentId,
    studentIds: [entry.studentId],
    studentName: studentNameById(students, entry.studentId),
    studentNames: [studentNameById(students, entry.studentId)],
  }))

  const rewardEntries: ActivityEntry[] = rewardHistory.map((entry: RewardHistory) => ({
    id: `reward-${entry.id}`,
    kind: 'reward',
    referenceType: 'reward',
    referenceId: entry.id,
    createdAt: entry.createdAt,
    title: `Đổi quà: ${entry.rewardName}`,
    points: -entry.pointsSpent,
    studentId: entry.studentId,
    studentIds: [entry.studentId],
    studentName: studentNameById(students, entry.studentId),
    studentNames: [studentNameById(students, entry.studentId)],
  }))

  const recognitionEntries: ActivityEntry[] = recognitions.map((entry: Recognition) => ({
    id: `recognition-${entry.id}`,
    kind: 'recognition',
    referenceType: 'recognition',
    referenceId: entry.id,
    createdAt: entry.createdAt,
    title: `Tuyên dương: ${entry.title}`,
    subtitle: entry.message,
    points: entry.awardedPoints,
    studentId: entry.studentId,
    studentIds: [entry.studentId],
    studentName: entry.studentName ?? studentNameById(students, entry.studentId),
    studentNames: [entry.studentName ?? studentNameById(students, entry.studentId)],
  }))

  const teamEntries: ActivityEntry[] = teamScoreHistory.map((entry: TeamScoreHistory) => ({
    id: `team-${entry.id}`,
    kind: 'team-score',
    referenceType: 'team-score',
    referenceId: entry.id,
    createdAt: entry.createdAt,
    title: entry.actionName,
    subtitle: entry.note,
    points: entry.points,
    teamId: entry.teamId,
    teamName: teamNameById(teams, entry.teamId),
  }))

  const wheelEntries: ActivityEntry[] = (luckyWheelHistory ?? []).map((entry) => {
    const studentIds = entry.studentIds?.length ? entry.studentIds : [entry.studentId]
    const studentNames = resolveStudentNames(students, studentIds)
    const isMultiple = studentIds.length > 1

    return {
      id: `lucky-wheel-${entry.id}`,
      kind: 'lucky-wheel',
      referenceType: 'lucky-wheel',
      referenceId: entry.id,
      createdAt: entry.createdAt,
      title: 'Vòng quay may mắn',
      subtitle: isMultiple
        ? `Đã chọn ${studentIds.length} học sinh`
        : `Đã chọn: ${studentNames[0]}`,
      detail: isMultiple ? studentNames.join(', ') : undefined,
      studentId: studentIds[0],
      studentIds,
      studentName: studentNames[0],
      studentNames,
    }
  })

  const badgeEntries: ActivityEntry[] = (badgeAwardHistory ?? []).map((entry) => {
    const studentNames = resolveStudentNames(students, entry.studentIds)
    const isMultiple = entry.studentIds.length > 1

    return {
      id: `badge-${entry.id}`,
      kind: 'badge',
      referenceType: 'badge',
      referenceId: entry.id,
      createdAt: entry.createdAt,
      title: isMultiple ? 'Trao huy hiệu' : 'Nhận huy hiệu',
      subtitle: isMultiple
        ? `"${entry.badgeName}"`
        : `${entry.badgeIcon ?? '🏅'} ${entry.badgeName}`,
      detail: isMultiple ? `Cho ${entry.studentIds.length} học sinh` : undefined,
      studentId: entry.studentIds[0],
      studentIds: entry.studentIds,
      studentName: isMultiple ? undefined : studentNames[0],
      studentNames,
    }
  })

  return [
    ...pointEntries,
    ...rewardEntries,
    ...recognitionEntries,
    ...teamEntries,
    ...wheelEntries,
    ...badgeEntries,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function filterActivityEntries(
  entries: ActivityEntry[],
  filters: {
    kind?: ActivityFilter
    studentId?: string
    teamId?: string
    searchQuery?: string
  },
): ActivityEntry[] {
  const q = filters.searchQuery?.trim().toLowerCase() ?? ''

  return entries.filter((entry) => {
    if (filters.kind && filters.kind !== 'all' && entry.kind !== filters.kind) return false

    if (filters.studentId && filters.studentId !== 'all') {
      const matchesPrimary = entry.studentId === filters.studentId
      const matchesAny = entry.studentIds?.includes(filters.studentId) ?? false
      if (!matchesPrimary && !matchesAny) return false
    }

    if (filters.teamId && filters.teamId !== 'all' && entry.teamId !== filters.teamId) return false
    if (!q) return true

    const haystack = [
      entry.title,
      entry.subtitle,
      entry.detail,
      entry.studentName,
      entry.teamName,
      ...(entry.studentNames ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
}

export function formatActivityDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Không xác định'

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  points: 'Tích điểm',
  reward: 'Đổi quà',
  recognition: 'Tuyên dương',
  'team-score': 'Điểm tổ',
  'lucky-wheel': 'Vòng quay',
  badge: 'Huy hiệu',
}

export const ACTIVITY_KIND_EMOJI: Record<ActivityKind, string> = {
  points: '⭐',
  reward: '🎁',
  recognition: '🏆',
  'team-score': '👥',
  'lucky-wheel': '🎡',
  badge: '🏅',
}
