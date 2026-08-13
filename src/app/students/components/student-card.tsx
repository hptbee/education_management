'use client'

import { Star, Eye, Edit2, Trash2 } from 'lucide-react'
import type { Student } from '@/src/types/models'

const teamColors = [
  { bg: 'bg-rose-100 text-rose-600' },
  { bg: 'bg-emerald-100 text-emerald-600' },
  { bg: 'bg-sky-100 text-sky-600' },
  { bg: 'bg-amber-100 text-amber-600' },
]

interface StudentCardProps {
  student: Student;
  index: number;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function StudentCard({ student, index, onView, onEdit, onDelete }: StudentCardProps) {
  const color = teamColors[index % teamColors.length]
  const teamName = student.teamId ? `Team ${student.teamId}` : 'Chưa có nhóm'
  
  let genderDisplay = ''
  if (student.gender === 'female') genderDisplay = '👧 Nữ'
  else if (student.gender === 'male') genderDisplay = '👦 Nam'
  else if (student.gender === 'other') genderDisplay = 'Khác'
  else genderDisplay = 'Chưa rõ'

  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      {/* Actions */}
      <div className="absolute right-2 top-2 flex opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => onEdit(student)} className="p-1.5 text-slate-400 hover:text-brand-purple" title="Sửa">
          <Edit2 className="size-4" />
        </button>
        <button onClick={() => onDelete(student)} className="p-1.5 text-slate-400 hover:text-red-500" title="Xóa">
          <Trash2 className="size-4" />
        </button>
      </div>

      <img
        src={student.avatar || '/placeholder.svg'}
        alt={student.name}
        className={`size-20 rounded-full object-cover ring-4 ${
          student.gender === 'female' ? 'ring-pink-100' : 'ring-sky-100'
        }`}
      />
      <h3 className="mt-3 text-base font-extrabold text-slate-800 line-clamp-1" title={student.name}>
        {student.name}
      </h3>
      <p className="mt-1 text-[13px] font-semibold text-slate-500">
        {genderDisplay} {student.dateOfBirth ? `• 🎂 ${student.dateOfBirth}` : ''}
      </p>
      
      <span className={`mt-2 rounded-md px-2.5 py-1 text-xs font-bold ${color.bg}`}>
        {teamName}
      </span>
      
      <div className="mt-3 flex items-center justify-between w-full border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-sm font-extrabold text-amber-500">
          <Star className="size-4 fill-amber-500 text-amber-500" />
          {student.points} điểm
        </div>
        <button 
          onClick={() => onView(student)} 
          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-brand-purple hover:text-white"
        >
          <Eye className="size-3.5" /> Xem
        </button>
      </div>
    </div>
  )
}
