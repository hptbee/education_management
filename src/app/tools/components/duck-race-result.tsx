'use client'

import { Trophy, X } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { ClassroomButton } from '@/src/components/classroom'

interface DuckRaceResultProps {
  winner: Student
  onReplay: () => void
  onReselect: () => void
  onClose: () => void
}

/** Compact winner banner + bottom controls — race field stays visible behind. */
export function DuckRaceResult({ winner, onReplay, onReselect, onClose }: DuckRaceResultProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-2 sm:p-3"
      role="status"
      aria-live="polite"
      aria-label={`Chiến thắng: ${winner.name}`}
    >
      <div className="pointer-events-none flex justify-center pt-1 sm:pt-2">
        <div className="pointer-events-auto max-w-[min(100%,22rem)] rounded-xl border border-amber-200/90 bg-white/90 px-3 py-2 text-center shadow-md shadow-amber-100/50 backdrop-blur-sm ring-1 ring-white/90 sm:px-4 sm:py-2.5">
          <p className="flex items-center justify-center gap-1.5 font-display text-sm font-extrabold text-amber-600 sm:text-base">
            <Trophy className="size-4 shrink-0 text-amber-500" aria-hidden />
            Chiến thắng!
          </p>
          <h3
            className="mt-0.5 truncate font-display text-lg font-extrabold text-slate-800 sm:text-xl"
            title={winner.name}
          >
            {winner.name}
          </h3>
        </div>
      </div>

      <div className="pointer-events-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-2">
          <ClassroomButton className="min-h-11 flex-1 shadow-md sm:max-w-[10rem]" onClick={onReplay}>
            Đua lại
          </ClassroomButton>
          <ClassroomButton variant="secondary" className="min-h-11 flex-1 sm:max-w-[12rem]" onClick={onReselect}>
            Chọn lại người chơi
          </ClassroomButton>
        </div>
        <ClassroomButton
          variant="outline"
          className="min-h-11 shrink-0 sm:ml-2 sm:w-auto"
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
          Đóng
        </ClassroomButton>
      </div>
    </div>
  )
}
