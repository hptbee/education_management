'use client'

import Link from 'next/link'
import { UsersRound, Star, ArrowRight, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'

const medalColor: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-400',
  3: 'text-orange-400',
  4: 'text-violet-400',
}

export function TeamCompetition() {
  const { data } = useAppData()
  const teams = data?.teams || []

  // Sort teams by score
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
  const highestScore = sortedTeams.length > 0 ? Math.max(1, sortedTeams[0].score) : 1

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

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {sortedTeams.length === 0 ? (
          <li className="p-4 text-center text-sm font-semibold text-slate-400">Chưa có tổ nào</li>
        ) : sortedTeams.map((team, i) => {
          const pct = Math.min(100, Math.max(5, (team.score / highestScore) * 100))
          return (
            <li key={team.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/50">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {team.avatar ? (
                    <span className="text-xl">{team.avatar}</span>
                  ) : (
                    <Trophy className={`size-5 ${medalColor[i + 1] || 'text-slate-400'}`} />
                  )}
                  <span className="font-display text-base font-extrabold text-slate-800">
                    {team.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-display text-lg font-extrabold">
                    {team.score.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-purple transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <Link href="/teams" className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-bold text-brand-purple transition hover:text-brand-purple-dark">
        Xem chi tiết
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
