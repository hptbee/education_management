'use client'

import { Star } from 'lucide-react'
import type { ClassroomRole, Team } from '@/src/types/models'
import type { RankedStudent } from '@/src/utils/ranking'
import { RANK_BADGE_CLASS, RANK_MEDAL, RANK_ROW_CLASS } from '@/src/utils/ranking'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'
import { cn } from '@/lib/utils'

export function RankingRow({
  entry,
  teams,
  classroomRoles,
  onClick,
  presentation = false,
}: {
  entry: RankedStudent
  teams: Team[]
  classroomRoles: ClassroomRole[]
  onClick?: () => void
  presentation?: boolean
}) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
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
          'flex shrink-0 items-center justify-center rounded-full font-extrabold',
          badgeClass,
          presentation ? 'size-9 text-sm' : 'size-8 text-xs',
        )}
      >
        {medal ?? rank}
      </span>
      <StudentAvatar
        student={student}
        classroomId={classroomId}
        alt={student.name}
        className={cn(
          'shrink-0 rounded-full ring-2 ring-white',
          presentation ? 'size-12' : 'size-11',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-extrabold text-slate-800', presentation ? 'text-base' : 'text-sm')}>
          {student.name}
        </p>
        <p className={cn('truncate font-bold text-slate-500', presentation ? 'text-sm' : 'text-[11px]')}>
          {team ? team.name : 'Chưa có tổ'}
        </p>
        {roles.length > 0 ? (
          <ClassroomRoleBadges roles={roles.slice(0, 1)} className="mt-1 justify-start" size="sm" />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2.5 py-1">
        <Star className="size-3.5 fill-star text-star" />
        <span className={cn('font-display font-extrabold text-slate-800', presentation ? 'text-base' : 'text-sm')}>
          {points}
        </span>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
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
