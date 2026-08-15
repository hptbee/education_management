import Link from 'next/link'
import { Star, Minus, Gift, Disc3, Gamepad2, Trophy } from 'lucide-react'

type Action = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const actions: Action[] = [
  { label: 'Tích điểm', href: '/points', icon: Star, className: 'bg-brand text-white hover:bg-brand-dark' },
  { label: 'Điểm trừ', href: '/points', icon: Minus, className: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  { label: 'Quà tặng', href: '/rewards', icon: Gift, className: 'bg-pastel-pink text-rose-800 hover:bg-rose-100' },
  { label: 'Vòng quay', href: '/tools', icon: Disc3, className: 'bg-brand text-white hover:bg-brand-dark' },
  { label: 'Trò chơi', href: '/games', icon: Gamepad2, className: 'bg-brand-soft text-brand-dark hover:bg-pastel-sky' },
  { label: 'Tuyên dương', href: '/recognition', icon: Trophy, className: 'bg-pastel-pink text-rose-800 hover:bg-rose-100' },
]

export function QuickActions() {
  return (
    <div className="w-full rounded-2xl border border-sky-100 bg-white p-3.5 shadow-sm">
      <h3 className="mb-3 text-center text-xs font-extrabold tracking-wide text-brand-dark">
        Thao tác nhanh
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold shadow-sm transition hover:brightness-105 active:scale-[0.98] motion-safe-hover ${action.className}`}
            >
              <Icon className="size-4" />
              {action.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
