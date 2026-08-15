'use client'

import { Star } from 'lucide-react'
import type { ClassroomRole, Team } from '@/src/types/models'
import type { RankedStudent } from '@/src/utils/ranking'
import { RANK_BADGE_CLASS, RANK_MEDAL, RANK_ROW_CLASS } from '@/src/utils/ranking'
import { getStudentAvatar } from '@/src/utils/student'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'
import { cn } from '@/lib/utils'

export function RankingRow({
  entry,
  teams,
  classroomRoles,
  onClick,
}: {
  entry: RankedStudent
  teams: Team[]
  classroomRoles: ClassroomRole[]
  onClick?: () => void
}) {
  const { student, rank, points } = entry
  const team = teams.find((t) => t.id === student.teamId)
  const roles = getStudentClassroomRoles(student, classroomRoles)
  const medal = RANK_MEDAL[rank]
  const rowClass = RANK_ROW_CLASS[rank] ?? 'border-sky-50 bg-slate-50/70'
  const badgeClass = RANK_BADGE_CLASS[rank] ?? 'bg-white text-slate-500'

  const content = (
    <>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
          badgeClass,
        )}
      >
        {medal ?? rank}
      </span>
      <img
        src={getStudentAvatar(student)}
        alt={student.name}
        className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-800">{student.name}</p>
        <p className="truncate text-[11px] font-bold text-slate-500">
          {team ? team.name : 'Chưa có tổ'}
        </p>
        {roles.length > 0 ? (
          <ClassroomRoleBadges roles={roles.slice(0, 1)} className="mt-1 justify-start" size="sm" />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1">
        <Star className="size-3.5 fill-star text-star" />
        <span className="font-display text-sm font-extrabold text-slate-800">{points}</span>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm',
          rowClass,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border px-3 py-3', rowClass)}>
      {content}
    </div>
  )
}
