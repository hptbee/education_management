'use client'

import { Star, Trophy } from 'lucide-react'
import type { RankedTeam } from '@/src/utils/ranking'
import { RANK_BADGE_CLASS, RANK_MEDAL, RANK_ROW_CLASS } from '@/src/utils/ranking'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import { EmptyState } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

export function TeamRankingList({
  entries,
  allTeams,
  memberCounts,
}: {
  entries: RankedTeam[]
  allTeams: { id: string }[]
  memberCounts: Map<string, number>
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        emoji="🏆"
        title="Chưa có tổ nào"
        description="Tạo tổ trong mục Tổ / Nhóm để bắt đầu thi đua."
      />
    )
  }

  const highestScore = entries.reduce((max, entry) => Math.max(max, entry.score), 0)

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const { team, rank, score } = entry
        const originalIndex = allTeams.findIndex((t) => t.id === team.id)
        const color = getTeamPastelStyle(originalIndex >= 0 ? originalIndex : index)
        const memberCount = memberCounts.get(team.id) ?? 0
        const pct = highestScore > 0 ? Math.min(100, (score / highestScore) * 100) : 0
        const medal = RANK_MEDAL[rank]
        const rowClass = RANK_ROW_CLASS[rank] ?? 'border-sky-50 bg-slate-50/70'
        const badgeClass = RANK_BADGE_CLASS[rank] ?? 'bg-white text-slate-500'

        return (
          <li
            key={team.id}
            className={cn('rounded-2xl border p-4', rowClass, color.bg)}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                  badgeClass,
                )}
              >
                {medal ?? rank}
              </span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                {team.avatar ? (
                  <span className="text-xl leading-none">{team.avatar}</span>
                ) : (
                  <Trophy className={cn('size-4', color.text)} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-extrabold text-slate-800">
                  {team.name}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">{memberCount} thành viên</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 font-extrabold text-amber-700">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-display text-base">{score.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
              <div
                className={cn('h-full rounded-full transition-all duration-500', color.bar)}
                style={{ width: pct > 0 ? `${Math.max(pct, 8)}%` : '0%' }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
