import { Crown, Shield } from 'lucide-react'
import type { Team } from '@/src/types/models'

export type TeamLeadershipRole = 'leader' | 'vice'

export function getTeamLeadershipRole(team: Team, studentId: string): TeamLeadershipRole | null {
  if (team.leaderStudentId === studentId) return 'leader'
  if (team.viceLeaderStudentId === studentId) return 'vice'
  return null
}

export function TeamLeadershipBadge({ role }: { role: TeamLeadershipRole }) {
  if (role === 'leader') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
        <Crown className="size-3 fill-amber-500 text-amber-500" />
        Tổ trưởng
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-100 to-blue-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">
      <Shield className="size-3 fill-sky-400 text-sky-500" />
      Tổ phó
    </span>
  )
}

export function TeamLeadershipAvatarOverlay({ role }: { role: TeamLeadershipRole }) {
  if (role === 'leader') {
    return (
      <span
        className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md ring-2 ring-white"
        title="Tổ trưởng"
      >
        <Crown className="size-3 fill-white text-white" />
      </span>
    )
  }

  return (
    <span
      className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md ring-2 ring-white"
      title="Tổ phó"
    >
      <Shield className="size-3 fill-white text-white" />
    </span>
  )
}
