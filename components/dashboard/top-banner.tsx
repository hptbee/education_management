import { ClassInfoCard } from './class-info-card'
import { HeroBanner } from './hero-banner'
import { QuickActions } from './quick-actions'
import { TopHeader } from './top-header'

const confetti = [
  { left: '20%', top: '12%', color: 'bg-pink-400', rotate: 'rotate-12' },
  { left: '34%', top: '30%', color: 'bg-amber-300', rotate: '-rotate-12' },
  { left: '45%', top: '8%', color: 'bg-sky-300', rotate: 'rotate-45' },
  { left: '58%', top: '22%', color: 'bg-emerald-300', rotate: '-rotate-6' },
  { left: '66%', top: '10%', color: 'bg-violet-300', rotate: 'rotate-12' },
  { left: '40%', top: '78%', color: 'bg-rose-300', rotate: 'rotate-45' },
  { left: '55%', top: '82%', color: 'bg-amber-300', rotate: '-rotate-12' },
]

export function TopBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100 p-4">
      {/* Confetti */}
      {confetti.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className={`absolute size-2.5 rounded-[3px] ${c.color} ${c.rotate}`}
          style={{ left: c.left, top: c.top }}
        />
      ))}

      <div className="relative flex items-stretch gap-4">
        <ClassInfoCard />
        <HeroBanner />
        <div className="flex w-[320px] shrink-0 flex-col gap-3">
          <TopHeader />
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
