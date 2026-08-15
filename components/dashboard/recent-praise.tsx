import { Trophy, Star } from 'lucide-react'
import { ClassroomCard } from '@/src/components/classroom'

export function RecentPraise() {
  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-yellow">
          <Trophy className="size-4 text-amber-600" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Tuyên dương gần đây</h3>
      </header>

      <div className="flex items-center gap-3 rounded-2xl bg-pastel-yellow/70 p-3">
        <img
          src="/avatar-boy-1.png"
          alt="Nguyễn Minh Quân"
          className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-extrabold text-slate-800">Nguyễn Minh Quân</p>
            <span className="shrink-0 text-[11px] font-semibold text-slate-400">Hôm nay</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-amber-800">
            <Star className="size-3.5 fill-star text-star" />
            Học sinh tích cực
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Tích cực phát biểu xây dựng bài!</p>
        </div>
      </div>
    </ClassroomCard>
  )
}
