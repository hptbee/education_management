'use client'

import { forwardRef, type MutableRefObject, type Ref } from 'react'
import { Crown, Flag, Play, Trophy } from 'lucide-react'
import type { Student } from '@/src/types/models'
import {
  duckRaceLabelMode,
  duckRaceVisualTier,
  shortDuckRaceLabel,
  type DuckRaceVisualTier,
} from '@/src/utils/duckRaceSimulation'

const DUCK_SIZE: Record<DuckRaceVisualTier, string> = {
  large: 'h-11 w-14',
  medium: 'h-8 w-10',
  small: 'h-6 w-7',
  compact: 'h-4 w-5',
}

const LABEL_TEXT: Record<DuckRaceVisualTier, string> = {
  large: 'text-xs',
  medium: 'text-[10px]',
  small: 'text-[9px]',
  compact: 'text-[8px]',
}

const CROWN_SIZE: Record<DuckRaceVisualTier, string> = {
  large: 'size-5',
  medium: 'size-4',
  small: 'size-3.5',
  compact: 'size-3',
}

/** Soft pastel body colors — distinct per index, classroom-friendly (not neon). */
function duckColorsForIndex(index: number): { body: string; beak: string; wing: string; chip: string } {
  const hue = (index * 137.508) % 360
  return {
    body: `hsl(${hue.toFixed(1)} 58% 68%)`,
    beak: `hsl(${((hue + 22) % 360).toFixed(1)} 70% 55%)`,
    wing: `hsl(${((hue + 345) % 360).toFixed(1)} 48% 58%)`,
    chip: `hsl(${hue.toFixed(1)} 45% 94%)`,
  }
}

function DuckGlyph({
  className,
  body,
  beak,
  wing,
}: {
  className?: string
  body: string
  beak: string
  wing: string
}) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden>
      <ellipse cx="30" cy="32" rx="19" ry="11" fill={body} />
      <circle cx="44" cy="18" r="10" fill={body} />
      <circle cx="47.5" cy="16" r="2.4" fill="#334155" />
      <circle cx="48.2" cy="15.4" r="0.7" fill="#fff" />
      <path d="M53 18.5 L62 21 L53 24 Z" fill={beak} />
      <ellipse cx="22" cy="34" rx="6" ry="3" fill={wing} opacity="0.92" />
    </svg>
  )
}

interface DuckRaceSpriteProps {
  student: Student
  fieldY: number
  label: string | null
  isWinner: boolean
  tier: DuckRaceVisualTier
  colorIndex: number
}

const DuckRaceSprite = forwardRef<HTMLDivElement, DuckRaceSpriteProps>(function DuckRaceSprite(
  { student, fieldY, label, isWinner, tier, colorIndex },
  ref,
) {
  const colors = duckColorsForIndex(colorIndex)
  const winnerChip = shortDuckRaceLabel(student.name)

  return (
    <div
      className="pointer-events-none absolute left-4"
      style={{ top: `${4 + fieldY * 92}%` }}
      title={student.name}
    >
      {/*
        Outer ref owns translate3d from the rAF loop.
        Never put Tailwind transform utilities (e.g. scale-*) on this node.
      */}
      <div
        ref={ref}
        className={`will-change-transform ${isWinner ? 'z-40' : 'z-10'}`}
      >
        {isWinner ? (
          <div className="flex flex-col items-center">
            <Crown
              className={`${CROWN_SIZE[tier]} mb-0.5 text-amber-500 drop-shadow-sm motion-safe:animate-bounce`}
              style={{ animationDuration: '1.8s' }}
              aria-hidden
            />
            <span
              className="mb-0.5 max-w-[9rem] truncate rounded-md bg-amber-50 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-amber-900 ring-1 ring-amber-200/80 sm:text-xs"
              title={student.name}
            >
              {winnerChip}
            </span>
            <span
              className="relative shrink-0 rounded-full ring-2 ring-amber-300/90 ring-offset-1 ring-offset-white/80"
              style={{
                transform: 'scale(1.2)',
                filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.65))',
              }}
            >
              <DuckGlyph className={DUCK_SIZE[tier]} {...colors} />
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
                <Trophy className="size-2.5" aria-hidden />
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            {label ? (
              <span
                className={`mr-0.5 max-w-[6.5rem] truncate rounded-md px-1.5 py-0.5 font-extrabold tracking-tight text-slate-600 ring-1 ring-white/80 ${LABEL_TEXT[tier]}`}
                style={{
                  backgroundColor: colors.chip,
                  color: '#475569',
                  boxShadow: `inset 3px 0 0 ${colors.body}`,
                }}
              >
                {label}
              </span>
            ) : null}
            <DuckGlyph className={DUCK_SIZE[tier]} {...colors} />
          </div>
        )}
      </div>
    </div>
  )
})

interface DuckRaceTrackProps {
  racers: Student[]
  fieldYs: Record<string, number>
  duckRefs: MutableRefObject<Array<HTMLDivElement | null>>
  fieldRef?: Ref<HTMLDivElement>
  countdownLabel: string | null
  winnerId?: string | null
}

export function DuckRaceTrack({
  racers,
  fieldYs,
  duckRefs,
  fieldRef,
  countdownLabel,
  winnerId,
}: DuckRaceTrackProps) {
  const count = racers.length
  const tier = duckRaceVisualTier(count)
  const labelMode = duckRaceLabelMode(count)

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-sky-100/80 bg-gradient-to-b from-[#e8f4fc] via-white to-[#fce8f0] p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
            <Play className="size-3 fill-current" aria-hidden />
            Xuất phát
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-sky-100">
            {count} vịt đua
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-rose-600">
          Đích
          <Flag className="size-3.5" aria-hidden />
        </span>
      </div>

      <div
        ref={fieldRef}
        className="relative min-h-[240px] flex-1 overflow-visible rounded-2xl bg-[linear-gradient(180deg,#dbeafe_0%,#f0f9ff_35%,#fdf2f8_100%)] ring-1 ring-sky-100/80"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0, transparent 18px, rgba(255,255,255,0.45) 18px, rgba(255,255,255,0.45) 19px)',
          }}
          aria-hidden
        />

        <div
          className="absolute inset-y-3 left-0 z-0 w-3 rounded-r-lg bg-gradient-to-r from-emerald-400/80 to-emerald-300/20"
          aria-hidden
        />
        <div
          className="absolute inset-y-3 right-5 z-0 flex w-3 flex-col overflow-hidden rounded-l-md shadow-sm"
          aria-hidden
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, #fb7185 0 8px, #fff 8px 16px)',
            }}
          />
        </div>
        <div className="pointer-events-none absolute top-2.5 right-2 z-0 flex size-8 items-center justify-center rounded-full bg-rose-400 text-white shadow-md shadow-rose-200/80">
          <Flag className="size-4" aria-hidden />
        </div>

        {racers.map((student, index) => {
          const isWinner = winnerId === student.id
          let label: string | null = null
          if (!isWinner && (labelMode === 'full' || labelMode === 'short')) {
            label = shortDuckRaceLabel(student.name)
          }

          return (
            <DuckRaceSprite
              key={student.id}
              student={student}
              fieldY={fieldYs[student.id] ?? index / Math.max(count - 1, 1)}
              label={label}
              isWinner={isWinner}
              tier={tier}
              colorIndex={index}
              ref={(node) => {
                duckRefs.current[index] = node
              }}
            />
          )
        })}
      </div>

      {countdownLabel ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
          <p className="font-display text-7xl font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)] md:text-8xl">
            {countdownLabel}
          </p>
        </div>
      ) : null}
    </div>
  )
}
