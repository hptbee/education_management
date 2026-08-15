import type { Student, Team } from '@/src/types/models'

export function getStudentAvatar(student: Partial<Student>): string {
  if (student.avatar && student.avatar.trim() !== '') {
    return student.avatar;
  }
  
  const idHash = (student.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = (idHash % 2) + 1; // 1 or 2
  
  if (student.gender === 'male') {
    return `/avatar-boy-${variant}.png`;
  } else if (student.gender === 'female') {
    return `/avatar-girl-${variant}.png`;
  } else {
    return '/placeholder.svg';
  }
}

/** Roster order (STT) — position in the full class list */
export function getStudentRosterOrder(student: Student, roster: Student[]): number {
  const idx = roster.findIndex((s) => s.id === student.id)
  if (idx >= 0) return idx
  return roster.length + new Date(student.createdAt).getTime()
}

export function studentHasClassroomRole(student: Student): boolean {
  if ((student.classroomRoleIds?.length ?? 0) > 0) return true
  return Boolean(student.classroomRole?.trim())
}

export function sortStudentsByClassroomRoleThenStt(students: Student[], roster: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const aHasRole = studentHasClassroomRole(a)
    const bHasRole = studentHasClassroomRole(b)
    if (aHasRole !== bHasRole) return aHasRole ? -1 : 1
    return getStudentRosterOrder(a, roster) - getStudentRosterOrder(b, roster)
  })
}

export function sortTeamMembersByLeadershipThenStt(
  members: Student[],
  team: Team,
  roster: Student[],
): Student[] {
  const leadershipRank = (student: Student) => {
    if (team.leaderStudentId === student.id) return 0
    if (team.viceLeaderStudentId === student.id) return 1
    return 2
  }

  return [...members].sort((a, b) => {
    const rankDiff = leadershipRank(a) - leadershipRank(b)
    if (rankDiff !== 0) return rankDiff
    return getStudentRosterOrder(a, roster) - getStudentRosterOrder(b, roster)
  })
}
