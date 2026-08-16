'use client'

import Link from 'next/link'
import { UsersRound, Star, ArrowRight, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomCard, EmptyState } from '@/src/components/classroom'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'

export function TeamCompetition() {
  const { data } = useAppData()
  const teams = data?.teams || []
  const students = data?.students || []

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
  const highestScore = sortedTeams.reduce((max, team) => Math.max(max, team.score), 0)

  return (
    <ClassroomCard className="flex flex-col">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-pink">
          <UsersRound className="size-4 text-rose-600" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">Thi đua tổ</h3>
      </header>

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {sortedTeams.length === 0 ? (
          <li>
            <EmptyState
              compact
              icon={Trophy}
              title="Chưa có tổ nào"
              description="Tạo tổ để bắt đầu thi đua trong lớp nhé!"
              action={
                <Link
                  href="/teams"
                  className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  + Tạo tổ
                </Link>
              }
            />
          </li>
        ) : (
          sortedTeams.map((team, i) => {
            const originalIndex = teams.findIndex((t) => t.id === team.id)
            const color = getTeamPastelStyle(originalIndex >= 0 ? originalIndex : i)
            const memberCount = students.filter((s) => s.teamId === team.id).length
            const pct = highestScore > 0 ? Math.min(100, (team.score / highestScore) * 100) : 0

            return (
              <li key={team.id} className={`rounded-2xl border border-white/80 p-3 ${color.bg}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      {team.avatar ? (
                        <span className="text-lg leading-none">{team.avatar}</span>
                      ) : (
                        <Trophy className={`size-4 ${color.text}`} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-extrabold text-slate-800">{team.name}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{memberCount} thành viên</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 font-extrabold text-amber-700">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-display text-base">{team.score.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80">
                  <div
                    className={`h-full rounded-full ${color.bar} transition-all duration-500`}
                    style={{ width: pct > 0 ? `${Math.max(pct, 8)}%` : '0%' }}
                  />
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Link
        href="/teams"
        className="mt-4 flex items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark"
      >
        Xem chi tiết
        <ArrowRight className="size-4" />
      </Link>
    </ClassroomCard>
  )
}
