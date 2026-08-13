'use client'

import { Users, Search, Plus, Star, ArrowRight } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Student } from '@/src/types/models'

// Temporary colors mapping to use teamId instead of 'tot'
const teamColors = [
  { bg: 'bg-rose-100 text-rose-600' },
  { bg: 'bg-emerald-100 text-emerald-600' },
  { bg: 'bg-sky-100 text-sky-600' },
  { bg: 'bg-amber-100 text-amber-600' },
]

function StudentCard({ student, index }: { student: Student, index: number }) {
  // Use teamId or fallback to index color
  const color = teamColors[index % teamColors.length]
  const teamName = student.teamId ? `Team ${student.teamId}` : 'Chưa có nhóm'
  
  return (
    <div className="flex flex-col items-center rounded-2xl border border-black/5 bg-white p-3 text-center shadow-sm">
      <img
        src={student.avatar || '/placeholder.svg'}
        alt={student.name}
        className={`size-16 rounded-full object-cover ring-2 ${
          student.gender === 'female' ? 'ring-pink-200' : 'ring-sky-200'
        }`}
      />
      <p className="mt-2 text-sm font-extrabold text-slate-800 line-clamp-1" title={student.name}>{student.name}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
        {student.gender === 'female' ? 'Nữ' : student.gender === 'male' ? 'Nam' : ''} {student.dateOfBirth ? `• ${student.dateOfBirth}` : ''}
      </p>
      <span
        className={`mt-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${color.bg}`}
      >
        {teamName}
      </span>
      <div className="mt-2 flex items-center gap-1 text-sm font-extrabold text-slate-700">
        <Star className="size-4 fill-star text-star" />
        {student.points} điểm
      </div>
    </div>
  )
}

export function StudentList() {
  const { database } = useActiveClassroom()
  const students = database?.students || []
  
  return (
    <section className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-purple/10">
          <Users className="size-4 text-brand-purple" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">
          DANH SÁCH HỌC SINH ({students.length})
        </h3>
      </header>

      <div className="mb-4 flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-purple/40"
          />
        </div>
        <button className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark">
          <Plus className="size-4" />
          Thêm học sinh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {students.slice(0, 8).map((student, i) => (
          <StudentCard key={student.id} student={student} index={i} />
        ))}
      </div>

      <button className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-bold text-brand-purple transition hover:text-brand-purple-dark">
        Xem tất cả học sinh
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
