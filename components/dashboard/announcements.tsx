import { Megaphone } from 'lucide-react'
import { ClassroomCard } from '@/src/components/classroom'

export function Announcements() {
  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-pink">
          <Megaphone className="size-4 text-rose-600" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Thông báo</h3>
      </header>

      <div className="flex items-center gap-3 rounded-2xl bg-pastel-peach/70 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
          📌
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-slate-800">Nhắc nhở</p>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">
            Các con nhớ ôn bài và chuẩn bị bài đầy đủ nhé!
          </p>
        </div>
        <img
          src="/banner-girl.png"
          alt=""
          className="hidden h-14 w-auto object-contain mix-blend-multiply sm:block"
        />
      </div>
    </ClassroomCard>
  )
}
