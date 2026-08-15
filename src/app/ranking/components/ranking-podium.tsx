'use client'

import { Star } from 'lucide-react'
import type { RankedStudent } from '@/src/utils/ranking'
import { RANK_MEDAL } from '@/src/utils/ranking'
import { getStudentAvatar } from '@/src/utils/student'
import { cn } from '@/lib/utils'

const PODIUM_STYLE: Record<number, { card: string; label: string }> = {
  1: {
    card: 'border-amber-200 bg-gradient-to-b from-pastel-yellow/80 to-white',
    label: 'Hạng 1',
  },
  2: {
    card: 'border-slate-200 bg-gradient-to-b from-slate-100 to-white',
    label: 'Hạng 2',
  },
  3: {
    card: 'border-orange-200 bg-gradient-to-b from-pastel-peach/60 to-white',
    label: 'Hạng 3',
  },
}

export function RankingPodium({
  entries,
  onStudentClick,
}: {
  entries: RankedStudent[]
  onStudentClick?: (entry: RankedStudent) => void
}) {
  const topThree = entries.slice(0, 3)
  if (topThree.length === 0) return null

  const order = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
      {order.map((entry) => {
        const style = PODIUM_STYLE[entry.rank] ?? PODIUM_STYLE[3]
        const isFirst = entry.rank === 1

        const card = (
          <div
            className={cn(
              'flex flex-col items-center rounded-2xl border px-4 py-4 text-center shadow-sm transition',
              style.card,
              isFirst ? 'sm:pb-6 sm:pt-5' : 'sm:pb-4',
              onStudentClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : '',
            )}
          >
            <span className="text-2xl leading-none">{RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}</span>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              {style.label}
            </p>
            <img
              src={getStudentAvatar(entry.student)}
              alt={entry.student.name}
              className={cn(
                'mt-3 rounded-full object-cover ring-4 ring-white',
                isFirst ? 'size-16' : 'size-14',
              )}
            />
            <p className="mt-3 line-clamp-2 font-display text-sm font-extrabold leading-tight text-slate-800">
              {entry.student.name}
            </p>
            <div className="mt-2 flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-display text-sm font-extrabold text-slate-800">
                {entry.points} điểm
              </span>
            </div>
          </div>
        )

        if (onStudentClick) {
          return (
            <button
              key={entry.student.id}
              type="button"
              onClick={() => onStudentClick(entry)}
              className="text-left"
            >
              {card}
            </button>
          )
        }

        return <div key={entry.student.id}>{card}</div>
      })}
    </div>
  )
}
