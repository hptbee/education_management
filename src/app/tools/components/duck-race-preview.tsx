'use client'

import { Bird, Flag } from 'lucide-react'

const DUCK_COLORS = ['text-sky-500', 'text-pink-400', 'text-violet-400'] as const

interface DuckRacePreviewProps {
  size?: number
}

/** Decorative Lucide-based preview for the duck race tool card. */
export function DuckRacePreview({ size = 180 }: DuckRacePreviewProps) {
  const scale = size / 180

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size * 0.55 }}
      aria-hidden
    >
      <div
        className="absolute inset-x-0 bottom-[18%] h-1 rounded-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        style={{ transform: `scaleX(${scale})` }}
      />
      <div
        className="absolute bottom-[22%] right-[8%] flex flex-col items-center"
        style={{ transform: `scale(${scale})` }}
      >
        <Flag className="size-8 text-rose-500 fill-rose-100" strokeWidth={2} />
        <span className="mt-0.5 h-8 w-0.5 rounded-full bg-slate-300" />
      </div>
      {DUCK_COLORS.map((color, index) => (
        <div
          key={color}
          className="absolute bottom-[24%] drop-shadow-md"
          style={{
            left: `${18 + index * 28}%`,
            transform: `scale(${0.85 + index * 0.08}) rotate(${index === 0 ? -8 : index === 1 ? 4 : 12}deg)`,
          }}
        >
          <Bird className={`size-10 ${color}`} strokeWidth={2.25} />
        </div>
      ))}
    </div>
  )
}
