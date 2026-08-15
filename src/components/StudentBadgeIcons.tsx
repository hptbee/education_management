import type { Badge } from '@/src/types/models'

interface StudentBadgeIconsProps {
  badges: Badge[]
  className?: string
  maxVisible?: number
}

export function StudentBadgeIcons({ badges, className = '', maxVisible = 4 }: StudentBadgeIconsProps) {
  if (badges.length === 0) return null

  const visible = badges.slice(0, maxVisible)
  const extra = badges.length - visible.length

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1 ${className}`}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-yellow-100 text-base ring-1 ring-amber-200 shadow-sm"
        >
          {badge.icon ?? '🏅'}
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
