'use client'

import { User, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RankingMode = 'students' | 'teams'

export function RankingModeToggle({
  mode,
  onChange,
}: {
  mode: RankingMode
  onChange: (mode: RankingMode) => void
}) {
  return (
    <div className="inline-flex rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('students')}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition',
          mode === 'students'
            ? 'bg-brand text-white shadow-sm'
            : 'text-slate-600 hover:bg-brand-soft',
        )}
      >
        <User className="size-4" />
        Học sinh
      </button>
      <button
        type="button"
        onClick={() => onChange('teams')}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition',
          mode === 'teams'
            ? 'bg-brand text-white shadow-sm'
            : 'text-slate-600 hover:bg-brand-soft',
        )}
      >
        <UsersRound className="size-4" />
        Tổ
      </button>
    </div>
  )
}
