import { Megaphone, Bell } from 'lucide-react'

export function Announcements() {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="size-5 text-rose-400" />
          <h3 className="font-display text-base font-extrabold text-slate-800">
            THÔNG BÁO
          </h3>
        </div>
        <button className="text-xs font-bold text-brand-purple hover:text-brand-purple-dark">
          Xem tất cả
        </button>
      </header>

      <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Bell className="size-4 text-amber-500" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-extrabold text-amber-700">Nhắc nhở</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Các con nhớ ôn bài và chuẩn bị bài đầy đủ nhé!
          </p>
        </div>
        <img
          src="/banner-girl.png"
          alt=""
          className="hidden h-12 w-auto object-contain mix-blend-multiply sm:block"
        />
      </div>
    </section>
  )
}
