'use client'

import { Star, Eye, Edit2, Trash2 } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'

const TEAM_COLORS = [
  { ring: 'ring-tot-1/30', badge: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400' },
  { ring: 'ring-tot-2/30', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { ring: 'ring-tot-3/30', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { ring: 'ring-tot-4/30', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  { ring: 'ring-sky-200', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400' },
]

const GENDER_META: Record<string, { emoji: string; label: string; ring: string }> = {
  female: { emoji: '👧', label: 'Nữ', ring: 'ring-pink-200' },
  male:   { emoji: '👦', label: 'Nam', ring: 'ring-sky-200' },
  other:  { emoji: '🧒', label: 'Khác', ring: 'ring-slate-200' },
  unknown:{ emoji: '🧒', label: '', ring: 'ring-slate-200' },
}

interface StudentCardProps {
  student: Student
  teams: Team[]
  onView: (student: Student) => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
}

export function StudentCard({ student, teams, onView, onEdit, onDelete }: StudentCardProps) {
  const gender = GENDER_META[student.gender ?? 'unknown'] ?? GENDER_META.unknown

  const team = teams.find(t => t.id === student.teamId)
  const teamIdx = team ? teams.findIndex(t => t.id === student.teamId) : -1
  const teamColor = teamIdx >= 0 ? TEAM_COLORS[teamIdx % TEAM_COLORS.length] : null

  const dobFormatted = student.dateOfBirth
    ? (() => {
        const d = new Date(student.dateOfBirth)
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
        }
        return student.dateOfBirth
      })()
    : null

  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-4 pb-4 pt-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand-purple/20">
      {/* Hover actions */}
      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          onClick={() => onEdit(student)}
          title="Chỉnh sửa"
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-purple/10 hover:text-brand-purple"
        >
          <Edit2 className="size-3.5" />
        </button>
        <button
          onClick={() => onDelete(student)}
          title="Xóa học sinh"
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Avatar */}
      <div className="relative">
        <img
          src={getStudentAvatar(student)}
          alt={student.name}
          className={`size-20 rounded-full border-2 border-white object-cover ring-4 shadow-sm ${gender.ring}`}
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }}
        />
        {student.gender && student.gender !== 'unknown' && (
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-white text-sm shadow-sm">
            {gender.emoji}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="mt-3 w-full text-sm font-extrabold leading-tight text-slate-800 line-clamp-2" title={student.name}>
        {student.name}
      </h3>

      {/* DOB */}
      {dobFormatted && (
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          🎂 {dobFormatted}
        </p>
      )}

      {/* Team badge */}
      <div className="mt-2.5">
        {team && teamColor ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${teamColor.badge}`}>
            <span className={`size-1.5 rounded-full ${teamColor.dot}`} />
            {team.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            Chưa có tổ
          </span>
        )}
      </div>

      {/* Points + View */}
      <div className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1 text-sm font-extrabold text-amber-500">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span>{student.points}</span>
          <span className="text-[11px] font-semibold text-slate-400">điểm</span>
        </div>
        <button
          onClick={() => onView(student)}
          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-brand-purple hover:text-white"
        >
          <Eye className="size-3" /> Xem
        </button>
      </div>
    </div>
  )
}
