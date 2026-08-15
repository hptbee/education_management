import type {
  ClassroomDatabase,
  PointHistory,
  Recognition,
  RewardHistory,
  TeamScoreHistory,
} from '@/src/types/models'

export type ActivityKind = 'points' | 'reward' | 'recognition' | 'team-score'

export type ActivityFilter = 'all' | ActivityKind

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  createdAt: string
  title: string
  subtitle?: string
  points?: number
  studentId?: string
  studentName?: string
  teamId?: string
  teamName?: string
}

function studentNameById(students: ClassroomDatabase['students'], studentId: string) {
  return students.find((s) => s.id === studentId)?.name ?? 'Học sinh'
}

function teamNameById(teams: ClassroomDatabase['teams'], teamId: string) {
  return teams.find((t) => t.id === teamId)?.name ?? 'Tổ'
}

export function buildClassroomActivity(database: ClassroomDatabase): ActivityEntry[] {
  const { students, teams, pointHistory, rewardHistory, recognitions, teamScoreHistory } = database

  const pointEntries: ActivityEntry[] = pointHistory.map((entry: PointHistory) => ({
    id: `points-${entry.id}`,
    kind: 'points',
    createdAt: entry.createdAt,
    title: entry.actionName,
    subtitle: entry.note,
    points: entry.points,
    studentId: entry.studentId,
    studentName: studentNameById(students, entry.studentId),
  }))

  const rewardEntries: ActivityEntry[] = rewardHistory.map((entry: RewardHistory) => ({
    id: `reward-${entry.id}`,
    kind: 'reward',
    createdAt: entry.createdAt,
    title: `Đổi quà: ${entry.rewardName}`,
    points: -entry.pointsSpent,
    studentId: entry.studentId,
    studentName: studentNameById(students, entry.studentId),
  }))

  const recognitionEntries: ActivityEntry[] = recognitions.map((entry: Recognition) => ({
    id: `recognition-${entry.id}`,
    kind: 'recognition',
    createdAt: entry.createdAt,
    title: `Tuyên dương: ${entry.title}`,
    subtitle: entry.message,
    points: entry.awardedPoints,
    studentId: entry.studentId,
    studentName: entry.studentName ?? studentNameById(students, entry.studentId),
  }))

  const teamEntries: ActivityEntry[] = teamScoreHistory.map((entry: TeamScoreHistory) => ({
    id: `team-${entry.id}`,
    kind: 'team-score',
    createdAt: entry.createdAt,
    title: entry.actionName,
    subtitle: entry.note,
    points: entry.points,
    teamId: entry.teamId,
    teamName: teamNameById(teams, entry.teamId),
  }))

  return [...pointEntries, ...rewardEntries, ...recognitionEntries, ...teamEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
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
    if (filters.studentId && filters.studentId !== 'all' && entry.studentId !== filters.studentId) {
      return false
    }
    if (filters.teamId && filters.teamId !== 'all' && entry.teamId !== filters.teamId) return false
    if (!q) return true

    const haystack = [entry.title, entry.subtitle, entry.studentName, entry.teamName]
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
}

export const ACTIVITY_KIND_EMOJI: Record<ActivityKind, string> = {
  points: '⭐',
  reward: '🎁',
  recognition: '🏆',
  'team-score': '👥',
}
