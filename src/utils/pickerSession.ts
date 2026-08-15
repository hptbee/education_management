import type { Student } from '@/src/types/models'

export type PickerMode = 'single' | 'multiple' | 'sequential'
export type PickerScope = 'classroom' | 'team'

export interface PickerSession {
  mode: PickerMode
  scopeType: PickerScope
  teamId?: string
  quantity: number
  preventRepeat: boolean
  selectedStudentIds: string[]
  pendingRevealIds: string[]
  startedAt: string
}

export function createDefaultPickerSession(): PickerSession {
  return {
    mode: 'single',
    scopeType: 'classroom',
    teamId: undefined,
    quantity: 2,
    preventRepeat: true,
    selectedStudentIds: [],
    pendingRevealIds: [],
    startedAt: new Date().toISOString(),
  }
}

export function getScopedStudents(students: Student[], scopeType: PickerScope, teamId?: string): Student[] {
  if (scopeType === 'team') {
    if (!teamId) return []
    return students.filter((s) => s.teamId === teamId)
  }
  return students
}

export function sanitizeStudentIds(ids: string[], validIds: Set<string>): string[] {
  return ids.filter((id) => validIds.has(id))
}

export function getEligibleStudents(
  pool: Student[],
  sessionSelectedIds: string[],
  preventRepeat: boolean,
): Student[] {
  if (!preventRepeat) return pool
  const picked = new Set(sessionSelectedIds)
  return pool.filter((s) => !picked.has(s.id))
}

export function pickUniqueStudents(eligible: Student[], count: number): Student[] {
  if (count <= 0 || eligible.length === 0) return []
  const shuffled = [...eligible]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function clampQuantity(quantity: number, eligibleCount: number): number {
  if (eligibleCount <= 0) return 2
  const max = Math.max(2, eligibleCount)
  const min = Math.min(2, eligibleCount)
  return Math.min(max, Math.max(min, quantity))
}

export function getMaxQuantity(eligibleCount: number): number {
  return Math.max(2, eligibleCount)
}
