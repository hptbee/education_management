import type { Recognition, BadgeAwardHistory } from '../types/models'
import type { ClassroomDatabase } from '../database/types'
import { createId } from './id'

export interface RecognizeStudentsInput {
  studentIds: string[]
  titleId: string
  message?: string
  awardedPoints?: number
}

export type RecognitionTimeFilter = 'today' | 'week' | 'month' | 'all'

export function getRecognitionTimeRange(filter: RecognitionTimeFilter): { start: Date | null; end: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  if (filter === 'all') {
    return { start: null, end }
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  if (filter === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
  } else if (filter === 'month') {
    start.setDate(1)
  }

  return { start, end }
}

export function filterRecognitionsByTime(
  recognitions: Recognition[],
  filter: RecognitionTimeFilter,
): Recognition[] {
  const { start, end } = getRecognitionTimeRange(filter)
  return recognitions.filter((item) => {
    const date = new Date(item.createdAt)
    if (date > end) return false
    if (start && date < start) return false
    return true
  })
}

export function formatRecognitionRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  if (date >= todayStart) return 'Hôm nay'
  if (date >= yesterdayStart) return 'Hôm qua'

  const weekStart = new Date(todayStart)
  const day = weekStart.getDay()
  const diff = day === 0 ? 6 : day - 1
  weekStart.setDate(weekStart.getDate() - diff)
  if (date >= weekStart) return 'Tuần này'

  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const RECOGNITION_EMOJI_OPTIONS = [
  '🌟', '📚', '🤝', '😊', '🎨', '🔥', '🧹', '💪', '🏆', '⭐', '✨', '🎉',
  '👏', '💡', '🎯', '🌈', '🦋', '🌸', '🎓', '❤️', '🔬', '🎵', '🏅', '😄',
]

export function resolveBadgeIdForTitle(
  title: { name: string; badgeId?: string },
  badges: { id: string; name: string }[],
): string | undefined {
  if (title.badgeId && badges.some((b) => b.id === title.badgeId)) {
    return title.badgeId
  }
  const normalized = title.name.trim().toLowerCase()
  const match = badges.find((b) => b.name.trim().toLowerCase() === normalized)
  return match?.id
}

function awardBadgeToStudent(
  students: ClassroomDatabase['students'],
  studentId: string,
  badgeId: string,
  now: string,
): ClassroomDatabase['students'] {
  return students.map((s) => {
    if (s.id !== studentId) return s
    const badgeIds = s.badgeIds ?? []
    if (badgeIds.includes(badgeId)) return s
    return { ...s, badgeIds: [...badgeIds, badgeId], updatedAt: now }
  })
}

export function buildRecognizeStudentsUpdate(
  current: ClassroomDatabase,
  input: RecognizeStudentsInput,
): { next: ClassroomDatabase; created: Recognition[] } | null {
  const title = current.recognitionTitles.find((item) => item.id === input.titleId)
  if (!title) return null

  const uniqueIds = [...new Set(input.studentIds)]
  const validStudents = uniqueIds
    .map((id) => current.students.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))

  if (validStudents.length === 0) return null

  const now = new Date().toISOString()
  const pointsAmount =
    input.awardedPoints !== undefined && input.awardedPoints > 0
      ? Math.trunc(input.awardedPoints)
      : 0
  const badgeIdToAward = resolveBadgeIdForTitle(title, current.badges)
  const newRecognitions: Recognition[] = []
  const newPointHistory: typeof current.pointHistory = []
  const newlyAwardedStudentIds: string[] = []
  let students = [...current.students]

  for (const student of validStudents) {
    let pointHistoryId: string | undefined
    if (pointsAmount > 0) {
      const historyId = createId('points')
      pointHistoryId = historyId
      newPointHistory.push({
        id: historyId,
        studentId: student.id,
        actionName: `Tuyên dương - ${title.name}`,
        points: pointsAmount,
        source: 'recognition',
        createdAt: now,
        note: input.message?.trim() || undefined,
      })
      students = students.map((s) =>
        s.id === student.id ? { ...s, points: s.points + pointsAmount, updatedAt: now } : s,
      )
    }

    if (badgeIdToAward) {
      const hadBadge = (student.badgeIds ?? []).includes(badgeIdToAward)
      students = awardBadgeToStudent(students, student.id, badgeIdToAward, now)
      if (!hadBadge) {
        newlyAwardedStudentIds.push(student.id)
      }
    }

    newRecognitions.push({
      id: createId('recognition'),
      studentId: student.id,
      studentName: student.name,
      teamId: student.teamId,
      type: 'Tuyên dương',
      title: title.name,
      titleId: title.id,
      titleIcon: title.icon,
      message: input.message?.trim() || undefined,
      awardedPoints: pointsAmount > 0 ? pointsAmount : undefined,
      pointHistoryId,
      awardedBadgeId: badgeIdToAward,
      createdAt: now,
    })
  }

  let badgeAwardHistory = current.badgeAwardHistory ?? []
  if (badgeIdToAward && newlyAwardedStudentIds.length > 0) {
    const badge = current.badges.find((item) => item.id === badgeIdToAward)
    const historyEntry: BadgeAwardHistory = {
      id: createId('badge-award'),
      badgeId: badgeIdToAward,
      badgeName: badge?.name ?? title.name,
      badgeIcon: badge?.icon ?? title.icon,
      studentIds: newlyAwardedStudentIds,
      note: input.message?.trim() || undefined,
      createdAt: now,
    }
    badgeAwardHistory = [historyEntry, ...badgeAwardHistory]
  }

  return {
    created: newRecognitions,
    next: {
      ...current,
      students,
      recognitions: [...newRecognitions, ...current.recognitions],
      pointHistory: [...newPointHistory, ...current.pointHistory],
      badgeAwardHistory,
    },
  }
}

/** Deduplicate recognition items by student for presentation (one card per student). */
export function dedupeRecognitionsByStudent(recognitions: Recognition[]): Recognition[] {
  const seen = new Set<string>()
  return recognitions.filter((rec) => {
    if (seen.has(rec.studentId)) return false
    seen.add(rec.studentId)
    return true
  })
}
