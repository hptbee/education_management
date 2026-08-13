import { UsersRound, Star, ArrowRight, Trophy } from 'lucide-react'
import { teams, totColors } from '@/lib/mock-data'

const medalColor: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-400',
  3: 'text-orange-400',
  4: 'text-violet-400',
}

export function TeamCompetition() {
  return (
    <section className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-purple/10">
          <UsersRound className="size-4 text-brand-purple" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">
          THI ĐUA TỔ / NHÓM
        </h3>
      </header>

      <ul className="flex flex-1 flex-col gap-3">
        {teams.map((team, i) => {
          const tot = totColors[team.id]
          const pct = Math.round((team.points / team.max) * 100)
          return (
            <li key={team.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className={`size-5 ${medalColor[i + 1]}`} />
                  <span className="font-display text-base font-extrabold text-slate-800">
                    {team.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="size-4 fill-star text-star" />
                  <span className="font-display text-lg font-extrabold text-slate-800">
                    {team.points}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${tot.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <button className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-bold text-brand-purple transition hover:text-brand-purple-dark">
        Xem chi tiết
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
