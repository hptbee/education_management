'use client'

import { Check } from 'lucide-react'
import type { Badge, Student } from '@/src/types/models'
import { studentHasBadge } from '@/src/utils/badges'

interface BadgeToggleGridProps {
  badges: Badge[]
  student: Student | null
  onToggle: (badgeId: string) => void
  disabled?: boolean
  compact?: boolean
}

export function BadgeToggleGrid({
  badges,
  student,
  onToggle,
  disabled = false,
  compact = false,
}: BadgeToggleGridProps) {
  if (badges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-8 text-center text-sm font-semibold text-amber-800">
        Chưa có huy hiệu nào. Thêm danh hiệu ở danh mục phía trên để tạo huy hiệu tương ứng.
      </div>
    )
  }

  return (
    <div
      className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}
    >
      {badges.map((badge) => {
        const awarded = student ? studentHasBadge(student, badge.id) : false
        const actionLabel = awarded ? 'Thu hồi huy hiệu' : 'Trao huy hiệu'
        return (
          <button
            key={badge.id}
            type="button"
            disabled={disabled || !student}
            aria-pressed={awarded}
            aria-label={`${badge.name}: ${actionLabel}`}
            onClick={() => onToggle(badge.id)}
            className={`relative flex flex-col items-center rounded-2xl border-2 text-center transition motion-safe-hover:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 ${
              compact ? 'p-3' : 'p-4'
            } ${
              awarded
                ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-yellow-50 shadow-md'
                : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm'
            }`}
          >
            {awarded ? (
              <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
            <span className={`leading-none ${compact ? 'text-3xl' : 'text-4xl'}`}>
              {badge.icon ?? '🏅'}
            </span>
            <p className={`mt-2 font-extrabold text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>
              {badge.name}
            </p>
            <p className={`mt-1 text-xs font-bold ${awarded ? 'text-amber-600' : 'text-slate-400'}`}>
              {awarded ? 'Đã trao' : 'Chưa trao'}
            </p>
          </button>
        )
      })}
    </div>
  )
}
