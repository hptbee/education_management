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
  return (student.classroomRoleIds?.length ?? 0) > 0
}

export function sortStudentsByClassroomRoleThenStt(students: Student[], roster: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const aHasRole = studentHasClassroomRole(a)
    const bHasRole = studentHasClassroomRole(b)
    if (aHasRole !== bHasRole) return aHasRole ? -1 : 1
    return getStudentRosterOrder(a, roster) - getStudentRosterOrder(b, roster)
  })
}

export type StudentSortOption =
  | 'role-stt'
  | 'name-asc'
  | 'name-desc'
  | 'points-desc'
  | 'points-asc'
  | 'newest'
  | 'team'

export function sortStudents(
  students: Student[],
  roster: Student[],
  sortBy: StudentSortOption,
  teams: Team[] = [],
): Student[] {
  const list = [...students]

  switch (sortBy) {
    case 'role-stt':
      return sortStudentsByClassroomRoleThenStt(list, roster)
    case 'name-asc':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    case 'name-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name, 'vi'))
    case 'points-desc':
      return list.sort(
        (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'vi'),
      )
    case 'points-asc':
      return list.sort(
        (a, b) => a.points - b.points || a.name.localeCompare(b.name, 'vi'),
      )
    case 'newest':
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    case 'team': {
      const teamOrder = new Map(teams.map((team, index) => [team.id, index]))
      return list.sort((a, b) => {
        const aRank = a.teamId ? (teamOrder.get(a.teamId) ?? 999) : 999
        const bRank = b.teamId ? (teamOrder.get(b.teamId) ?? 999) : 999
        if (aRank !== bRank) return aRank - bRank
        return a.name.localeCompare(b.name, 'vi')
      })
    }
    default:
      return list
  }
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
