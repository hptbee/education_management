'use client'

import { Star } from 'lucide-react'
import type { RankedStudent } from '@/src/utils/ranking'
import { getPodiumEntries, groupRankedByRank } from '@/src/utils/ranking'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { cn } from '@/lib/utils'

const PODIUM_STYLE: Record<number, { card: string; label: string; header: string }> = {
  1: {
    card: 'border-amber-200 bg-gradient-to-b from-pastel-yellow/90 to-white shadow-amber-100/80',
    label: 'Hạng 1',
    header: 'bg-pastel-yellow text-amber-800',
  },
  2: {
    card: 'border-slate-200 bg-gradient-to-b from-slate-100 to-white shadow-slate-100/80',
    label: 'Hạng 2',
    header: 'bg-slate-100 text-slate-600',
  },
  3: {
    card: 'border-orange-200 bg-gradient-to-b from-pastel-peach/70 to-white shadow-orange-100/80',
    label: 'Hạng 3',
    header: 'bg-pastel-peach text-orange-800',
  },
}

const MEDAL_STYLE: Record<number, { fill: string; text: string; ring: string }> = {
  1: { fill: 'from-amber-200 to-amber-400', text: 'text-amber-900', ring: 'ring-amber-300' },
  2: { fill: 'from-slate-100 to-slate-300', text: 'text-slate-700', ring: 'ring-slate-300' },
  3: { fill: 'from-orange-200 to-orange-400', text: 'text-orange-900', ring: 'ring-orange-300' },
}

function RankMedal({ rank, large }: { rank: number; large?: boolean }) {
  const style = MEDAL_STYLE[rank] ?? MEDAL_STYLE[3]

  return (
    <span className="inline-flex flex-col items-center" aria-hidden>
      <span
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full bg-gradient-to-b font-extrabold shadow-sm ring-2',
          style.fill,
          style.text,
          style.ring,
          large ? 'size-11 text-lg' : 'size-9 text-sm',
        )}
      >
        {rank}
      </span>
      <span className="-mt-1 flex items-start gap-px">
        <span className="h-3.5 w-2.5 origin-top -rotate-12 rounded-b-sm bg-brand" />
        <span className="h-3.5 w-2.5 origin-top rotate-12 rounded-b-sm bg-brand-dark" />
      </span>
    </span>
  )
}

function canUseClassicPodium(groups: Map<number, RankedStudent[]>): boolean {
  const rank1 = groups.get(1) ?? []
  const rank2 = groups.get(2) ?? []
  const rank3 = groups.get(3) ?? []

  return rank1.length === 1 && rank2.length <= 2 && rank3.length <= 1
}

function buildClassicOrder(groups: Map<number, RankedStudent[]>): RankedStudent[] {
  const rank1 = groups.get(1) ?? []
  const rank2 = groups.get(2) ?? []
  const rank3 = groups.get(3) ?? []

  if (rank2.length >= 2) {
    return [rank2[0], rank1[0], rank2[1]]
  }

  if (rank2.length === 1 && rank3.length === 1) {
    return [rank2[0], rank1[0], rank3[0]]
  }

  if (rank2.length === 1) {
    return [rank2[0], rank1[0]]
  }

  if (rank3.length === 1) {
    return [rank1[0], rank3[0]]
  }

  return rank1
}

function podiumGridClass(count: number, isFirst: boolean): string {
  if (isFirst && count === 1) return 'mx-auto grid w-full max-w-[13.5rem] grid-cols-1'
  if (count === 1) return 'mx-auto grid w-full max-w-[12rem] grid-cols-1'
  if (count === 2) return 'mx-auto grid w-full max-w-[28rem] grid-cols-2'
  if (count === 3) return 'mx-auto grid w-full max-w-[42rem] grid-cols-2 sm:grid-cols-3'
  return 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
}

function PodiumCard({
  entry,
  onStudentClick,
  compact,
}: {
  entry: RankedStudent
  onStudentClick?: (entry: RankedStudent) => void
  compact?: boolean
}) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const style = PODIUM_STYLE[entry.rank] ?? PODIUM_STYLE[3]
  const isFirst = entry.rank === 1 && !compact
  const label = `${style.label}, ${entry.student.name}, ${entry.points} điểm`

  const card = (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center rounded-2xl border px-3 py-4 text-center shadow-sm transition',
        style.card,
        isFirst ? 'px-4 py-5 sm:pb-6' : 'sm:py-4',
        onStudentClick
          ? 'motion-safe-hover cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
          : '',
      )}
    >
      <RankMedal rank={entry.rank} large={isFirst} />
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        {style.label}
      </p>
      <StudentAvatar
        student={entry.student}
        classroomId={classroomId}
        alt=""
        className={cn(
          'mt-3 rounded-full ring-4 ring-white',
          isFirst ? 'size-16' : 'size-14',
        )}
      />
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] font-display text-sm font-extrabold leading-tight text-slate-800">
        {entry.student.name}
      </p>
      <div className="mt-auto flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1">
        <Star className="size-3.5 fill-star text-star" aria-hidden />
        <span className="font-display text-sm font-extrabold text-slate-800">
          {entry.points} điểm
        </span>
      </div>
    </div>
  )

  if (onStudentClick) {
    return (
      <button
        type="button"
        onClick={() => onStudentClick(entry)}
        aria-label={label}
        className="flex h-full w-full min-h-11 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {card}
      </button>
    )
  }

  return (
    <div className="h-full w-full" aria-label={label}>
      {card}
    </div>
  )
}

function PodiumTier({
  rank,
  entries,
  onStudentClick,
}: {
  rank: number
  entries: RankedStudent[]
  onStudentClick?: (entry: RankedStudent) => void
}) {
  const style = PODIUM_STYLE[rank] ?? PODIUM_STYLE[3]
  const tied = entries.length > 1
  const isFirst = rank === 1
  const groupLabel = tied
    ? `${style.label}, đồng hạng ${entries.length} học sinh`
    : style.label

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="flex flex-col items-center gap-3"
    >
      {tied || !isFirst ? (
        <p
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide',
            style.header,
          )}
        >
          {style.label}
          {tied ? <span className="font-bold opacity-80">· đồng hạng ×{entries.length}</span> : null}
        </p>
      ) : null}
      <div className={cn('w-full gap-3', podiumGridClass(entries.length, isFirst))}>
        {entries.map((entry) => (
          <PodiumCard
            key={entry.student.id}
            entry={entry}
            onStudentClick={onStudentClick}
            compact={tied || !isFirst}
          />
        ))}
      </div>
    </div>
  )
}

export function RankingPodium({
  entries,
  onStudentClick,
}: {
  entries: RankedStudent[]
  onStudentClick?: (entry: RankedStudent) => void
}) {
  const podiumEntries = getPodiumEntries(entries)
  if (podiumEntries.length === 0) return null

  const groups = groupRankedByRank(podiumEntries)

  if (canUseClassicPodium(groups)) {
    const order = buildClassicOrder(groups)

    return (
      <section aria-label="Top 3 bảng xếp hạng">
        <div
          className={cn(
            'grid grid-cols-1 gap-3 sm:items-end',
            order.length === 1 ? 'sm:grid-cols-1 sm:justify-items-center' : 'sm:grid-cols-3',
          )}
        >
          {order.map((entry) => (
            <div
              key={entry.student.id}
              className={cn(order.length === 1 ? 'w-full max-w-[13.5rem]' : 'h-full')}
            >
              <PodiumCard entry={entry} onStudentClick={onStudentClick} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  const tiers = [1, 2, 3].filter((rank) => (groups.get(rank)?.length ?? 0) > 0)

  return (
    <section aria-label="Top 3 bảng xếp hạng" className="flex flex-col gap-6">
      {tiers.map((rank) => (
        <PodiumTier
          key={rank}
          rank={rank}
          entries={groups.get(rank) ?? []}
          onStudentClick={onStudentClick}
        />
      ))}
    </section>
  )
}
