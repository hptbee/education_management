'use client'

import { Star, Eye, Edit2, Trash2 } from 'lucide-react'
import type { Badge, ClassroomRole, Student, Team } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { getStudentBadges } from '@/src/utils/badges'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'
import { StudentBadgeIcons } from '@/src/components/StudentBadgeIcons'
import { IconTouchButton } from '@/src/components/classroom'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'

const GENDER_META: Record<string, { emoji: string; ring: string }> = {
  female: { emoji: '👧', ring: 'ring-pink-200' },
  male:   { emoji: '👦', ring: 'ring-sky-200' },
  other:  { emoji: '🧒', ring: 'ring-slate-200' },
  unknown:{ emoji: '🧒', ring: 'ring-slate-200' },
}

interface StudentCardProps {
  student: Student
  teams: Team[]
  classroomRoles: ClassroomRole[]
  badges: Badge[]
  onView: (student: Student) => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
}

export function StudentCard({ student, teams, classroomRoles, badges, onView, onEdit, onDelete }: StudentCardProps) {
  const gender = GENDER_META[student.gender ?? 'unknown'] ?? GENDER_META.unknown

  const team = teams.find(t => t.id === student.teamId)
  const teamIdx = team ? teams.findIndex(t => t.id === student.teamId) : -1
  const teamColor = teamIdx >= 0 ? getTeamPastelStyle(teamIdx) : null
  const assignedRoles = getStudentClassroomRoles(student, classroomRoles).slice(0, 1)
  const awardedBadges = getStudentBadges(student, badges)

  return (
    <div
      className="group relative flex flex-col items-center rounded-3xl border border-sky-100 bg-white px-3 pb-3 pt-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md focus-within:ring-2 focus-within:ring-brand/30"
    >
      <div className="absolute right-1 top-1 z-10 flex gap-0.5 sm:right-2 sm:top-2">
        <IconTouchButton
          onClick={() => onEdit(student)}
          aria-label={`Chỉnh sửa ${student.name}`}
          className="bg-white/90 text-slate-500 shadow-sm hover:text-brand"
        >
          <Edit2 className="size-4" />
        </IconTouchButton>
        <IconTouchButton
          onClick={() => onDelete(student)}
          aria-label={`Xóa ${student.name}`}
          className="bg-white/90 text-slate-500 shadow-sm hover:text-rose-500"
        >
          <Trash2 className="size-4" />
        </IconTouchButton>
      </div>

      <button
        type="button"
        onClick={() => onView(student)}
        className="flex w-full flex-col items-center rounded-2xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <div className="relative">
          <img
            src={getStudentAvatar(student)}
            alt=""
            className={`size-[4.5rem] rounded-full border-2 border-white object-cover ring-4 shadow-sm ${gender.ring}`}
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }}
          />
          {student.gender && student.gender !== 'unknown' && (
            <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-white text-sm shadow-sm">
              {gender.emoji}
            </span>
          )}
        </div>

        <h3 className="mt-2.5 line-clamp-2 min-h-10 w-full text-sm font-extrabold leading-tight text-slate-800" title={student.name}>
          {student.name}
        </h3>

        <ClassroomRoleBadges roles={assignedRoles} className="mt-1.5" />
        <StudentBadgeIcons badges={awardedBadges} className="mt-1.5" />

        <div className="mt-2">
          {team && teamColor ? (
            <span className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-0.5 text-[11px] font-bold ${teamColor.badge}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${teamColor.dot}`} />
              {team.name}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
              Chưa có tổ
            </span>
          )}
        </div>
      </button>

      <div className="mt-auto flex w-full items-center justify-between gap-2 pt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-pastel-yellow px-2.5 py-1 text-sm font-extrabold text-amber-800">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          {student.points}
        </span>
        <button
          type="button"
          onClick={() => onView(student)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-dark transition hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Eye className="size-3" aria-hidden /> Xem
        </button>
      </div>
    </div>
  )
}
