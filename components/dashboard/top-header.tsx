'use client'

import { MonitorPlay, Bell, ChevronDown } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'

export function TopHeader() {
  const { teacher } = useActiveClassroom()
  const teacherNameStr = teacher?.name || 'Giáo viên'

  return (
    <div className="flex items-center justify-end gap-3">
      <button className="flex items-center gap-2 rounded-xl border border-black/5 bg-white/90 px-4 py-2.5 text-sm font-bold text-brand-purple shadow-sm backdrop-blur transition hover:bg-white">
        <MonitorPlay className="size-4" />
        Chế độ trình chiếu
      </button>

      <button className="relative flex size-11 items-center justify-center rounded-xl border border-black/5 bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white">
        <Bell className="size-5" />
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-red-500" />
      </button>

      <button className="flex items-center gap-1.5 rounded-xl border border-black/5 bg-white/90 py-1.5 pl-1.5 pr-2.5 shadow-sm backdrop-blur transition hover:bg-white">
        <img
          src="/avatar-teacher.png"
          alt={teacherNameStr}
          title={teacherNameStr}
          className="size-8 rounded-lg object-cover"
        />
        <ChevronDown className="size-4 text-slate-400 shrink-0" />
      </button>
    </div>
  )
}
