'use client'

import { Camera, Pencil } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'

export function ClassInfoCard() {
  const { classroom, teacher } = useActiveClassroom()

  const classNameStr = classroom?.className || 'Lớp'
  const teacherNameStr = teacher?.name || 'Giáo viên'
  const schoolYearStr = classroom?.schoolYear || 'Năm học'

  return (
    <div className="flex w-[270px] shrink-0 items-center gap-3 self-start rounded-2xl border border-black/5 bg-white/90 p-3 shadow-sm backdrop-blur">
      <img
        src="/class-photo.png"
        alt="Ảnh lớp học"
        className="size-20 shrink-0 rounded-xl object-cover"
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-lg font-extrabold text-slate-800 line-clamp-1">
            {classNameStr} – {teacherNameStr}
          </h2>
          <Pencil className="size-3.5 text-slate-400 shrink-0" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Năm học: {schoolYearStr}</p>
        <button className="mt-1 flex w-fit items-center gap-1.5 rounded-lg bg-brand-purple/10 px-2.5 py-1.5 text-xs font-bold text-brand-purple transition hover:bg-brand-purple/20">
          <Camera className="size-3.5" />
          Đổi ảnh lớp
        </button>
      </div>
    </div>
  )
}
