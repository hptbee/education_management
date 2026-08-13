import { Bell } from 'lucide-react'
import { activities } from '@/lib/mock-data'

export function RecentActivity() {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <Bell className="size-5 text-brand-purple" />
        <h3 className="font-display text-base font-extrabold text-slate-800">
          HOẠT ĐỘNG GẦN ĐÂY
        </h3>
      </header>

      <ul className="flex flex-col gap-3">
        {activities.map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <img
              src={a.avatar || '/placeholder.svg'}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
            />
            <p className="flex-1 text-xs font-semibold text-slate-600">{a.text}</p>
            <span
              className={`shrink-0 text-sm font-extrabold ${
                a.delta > 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {a.delta > 0 ? `+${a.delta}` : a.delta}
            </span>
            <span className="w-20 shrink-0 text-right text-[11px] font-semibold text-slate-400">
              {a.time}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
