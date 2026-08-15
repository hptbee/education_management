'use client'

import { MonitorPlay, Bell } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'

export function TopHeader() {
  const { teacher } = useActiveClassroom()
  const teacherNameStr = teacher?.name || 'Giáo viên'

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-brand-soft"
      >
        <MonitorPlay className="size-4" />
        Trình chiếu
      </button>

      <button
        type="button"
        className="relative flex size-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-500 shadow-sm transition hover:bg-brand-soft"
        aria-label="Thông báo"
      >
        <Bell className="size-5" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-400" />
      </button>

      <button
        type="button"
        className="flex items-center rounded-xl border border-sky-100 bg-white p-1 shadow-sm transition hover:bg-brand-soft"
        title={teacherNameStr}
      >
        <TeacherAvatar
          src={teacher?.avatar}
          name={teacherNameStr}
          className="size-8 rounded-lg text-lg"
        />
      </button>
    </div>
  )
}
