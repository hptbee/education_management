import { Star, Minus, Gift, Disc3, Gamepad2, Trophy } from 'lucide-react'

type Action = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const actions: Action[] = [
  { label: 'Tích điểm', icon: Star, className: 'bg-gradient-to-b from-emerald-400 to-green-500' },
  { label: 'Điểm trừ', icon: Minus, className: 'bg-gradient-to-b from-red-400 to-red-500' },
  { label: 'Quà tặng', icon: Gift, className: 'bg-gradient-to-b from-amber-400 to-orange-500' },
  { label: 'Vòng quay', icon: Disc3, className: 'bg-gradient-to-b from-violet-400 to-purple-500' },
  { label: 'Trò chơi', icon: Gamepad2, className: 'bg-gradient-to-b from-sky-400 to-blue-500' },
  { label: 'Tuyên dương', icon: Trophy, className: 'bg-gradient-to-b from-pink-400 to-rose-500' },
]

export function QuickActions() {
  return (
    <div className="w-[320px] shrink-0 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur">
      <h3 className="mb-3 text-center text-sm font-extrabold tracking-wide text-brand-purple">
        THAO TÁC NHANH
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] ${action.className}`}
            >
              <Icon className="size-4" />
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
