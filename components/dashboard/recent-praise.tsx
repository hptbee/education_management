import { Trophy, Star } from 'lucide-react'

export function RecentPraise() {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <Trophy className="size-5 text-amber-400" />
        <h3 className="font-display text-base font-extrabold text-slate-800">
          TUYÊN DƯƠNG GẦN ĐÂY
        </h3>
      </header>

      <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
        <img
          src="/avatar-boy-1.png"
          alt="Nguyễn Minh Quân"
          className="size-11 shrink-0 rounded-full object-cover ring-2 ring-amber-200"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-amber-700">Nguyễn Minh Quân</p>
            <span className="shrink-0 text-[11px] font-semibold text-slate-400">Hôm nay</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-600">
            <Star className="size-3.5 fill-star text-star" />
            Học sinh tích cực
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Tích cực phát biểu xây dựng bài!
          </p>
        </div>
      </div>
    </section>
  )
}
