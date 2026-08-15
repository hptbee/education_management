import { Bell } from 'lucide-react'
import { activities } from '@/lib/mock-data'
import { ClassroomCard } from '@/src/components/classroom'

export function RecentActivity() {
  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-sky">
          <Bell className="size-4 text-brand" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Hoạt động gần đây</h3>
      </header>

      <ul className="flex flex-col gap-2">
        {activities.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-2.5 py-2">
            <img
              src={a.avatar || '/placeholder.svg'}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
            />
            <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-slate-600">{a.text}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                a.delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {a.delta > 0 ? `+${a.delta}` : a.delta}
            </span>
          </li>
        ))}
      </ul>
    </ClassroomCard>
  )
}
