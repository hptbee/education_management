'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/src/types/models'
import { getWheelDisplayName } from '@/src/utils/wheelSpin'

const RADIANT_SEGMENTS = [
  { from: '#b8dff5', to: '#93c5fd', text: '#1e3a5f', glow: '#dbeafe' },
  { from: '#f0b8d0', to: '#e8a0b8', text: '#6b2d4a', glow: '#fce4ec' },
  { from: '#d4c8f0', to: '#c4b5fd', text: '#4c1d95', glow: '#ede9fe' },
  { from: '#fde8d8', to: '#f5d4b8', text: '#7c2d12', glow: '#fff7ed' },
  { from: '#fef3c7', to: '#fde68a', text: '#78350f', glow: '#fffbeb' },
  { from: '#dbeafe', to: '#bfdbfe', text: '#1e40af', glow: '#eff6ff' },
] as const

const SIZE = 560
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = SIZE / 2 - 14
const HUB_RADIUS = 44
const ID_PREFIX = 'radiant-wheel'

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

function wedgePath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle, RADIUS)
  const end = polarToCartesian(endAngle, RADIUS)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function WheelDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <radialGradient id={`${idPrefix}-hub`} cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f0f7ff" />
        <stop offset="100%" stopColor="#dbeafe" />
      </radialGradient>

      <linearGradient id={`${idPrefix}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#f9a8d4" />
        <stop offset="100%" stopColor="#b8dff5" />
      </linearGradient>

      <linearGradient id={`${idPrefix}-pointer`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f0b8d0" />
      </linearGradient>

      <filter id={`${idPrefix}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id={`${idPrefix}-soft-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#4ba3e8" floodOpacity="0.22" />
      </filter>

      {RADIANT_SEGMENTS.map((segment, index) => (
        <linearGradient
          key={segment.from}
          id={`${idPrefix}-seg-${index}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={segment.from} />
          <stop offset="100%" stopColor={segment.to} />
        </linearGradient>
      ))}
    </defs>
  )
}

function WheelPointer({ isSpinning, idPrefix = ID_PREFIX }: { isSpinning?: boolean; idPrefix?: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2"
      style={{ right: -20 }}
      aria-hidden
      animate={isSpinning ? { x: [0, 5, 0] } : { x: 0 }}
      transition={isSpinning ? { duration: 0.18, repeat: Infinity } : { duration: 0.2 }}
    >
      <svg width="48" height="52" viewBox="0 0 48 52" fill="none" className="drop-shadow-lg">
        <defs>
          <linearGradient id={`${idPrefix}-pointer-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <path
          d="M4 26L40 6v11L44 26l-4 9v11L4 26Z"
          fill={`url(#${idPrefix}-pointer-fill)`}
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  )
}

function WheelSegments({
  count,
  students,
  idPrefix,
  fontSize,
  showLabels,
}: {
  count: number
  students: Student[]
  idPrefix: string
  fontSize: number
  showLabels: boolean
}) {
  const segmentAngle = count > 0 ? 360 / count : 90

  if (count === 0) {
    return (
      <>
        {RADIANT_SEGMENTS.map((_, index) => {
          const startAngle = index * 90
          const endAngle = (index + 1) * 90
          return (
            <path
              key={index}
              d={wedgePath(startAngle, endAngle)}
              fill={`url(#${idPrefix}-seg-${index % RADIANT_SEGMENTS.length})`}
              stroke="#ffffff"
              strokeWidth={2}
              strokeOpacity={0.65}
            />
          )
        })}
      </>
    )
  }

  return (
    <>
      {students.map((student, index) => {
        const startAngle = index * segmentAngle
        const endAngle = (index + 1) * segmentAngle
        const midAngle = startAngle + segmentAngle / 2
        const color = RADIANT_SEGMENTS[index % RADIANT_SEGMENTS.length]
        const labelPos = polarToCartesian(midAngle, RADIUS * 0.62)
        const displayName = getWheelDisplayName(student.name)

        return (
          <g key={student.id}>
            <path
              d={wedgePath(startAngle, endAngle)}
              fill={`url(#${idPrefix}-seg-${index % RADIANT_SEGMENTS.length})`}
              stroke="#ffffff"
              strokeWidth={2}
              strokeOpacity={0.7}
            />
            {showLabels ? (
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill={color.text}
                fontSize={fontSize}
                fontWeight={800}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
              >
                {displayName}
              </text>
            ) : null}
          </g>
        )
      })}
    </>
  )
}

function WheelCore({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <circle
        cx={CX}
        cy={CY}
        r={RADIUS + 8}
        fill="none"
        stroke={`url(#${idPrefix}-rim)`}
        strokeWidth={5}
        opacity={0.9}
      />
      <circle
        cx={CX}
        cy={CY}
        r={RADIUS + 3}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.85}
      />
      <circle
        cx={CX}
        cy={CY}
        r={HUB_RADIUS}
        fill={`url(#${idPrefix}-hub)`}
        stroke="#ffffff"
        strokeWidth={3}
      />
      <circle cx={CX} cy={CY} r={HUB_RADIUS - 10} fill="#ffffff" fillOpacity={0.35} />
      <circle cx={CX - 8} cy={CY - 8} r={6} fill="#ffffff" fillOpacity={0.55} />
    </>
  )
}

interface NamedWheelProps {
  students: Student[]
  rotation: number
  isSpinning: boolean
  spinDurationSec: number
  spinEase: [number, number, number, number]
  size?: number
}

export function NamedWheel({
  students,
  rotation,
  isSpinning,
  spinDurationSec,
  spinEase,
}: NamedWheelProps) {
  const count = students.length
  const fontSize = count > 16 ? 14 : count > 12 ? 16 : count > 8 ? 18 : 22

  return (
    <div className="relative size-full">
      <WheelPointer isSpinning={isSpinning} />

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible">
        <WheelDefs idPrefix={ID_PREFIX} />

        <g filter={`url(#${ID_PREFIX}-soft-shadow)`}>
          <motion.g
            animate={{ rotate: rotation }}
            transition={{ duration: isSpinning ? spinDurationSec : 0, ease: spinEase }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            <WheelSegments
              count={count}
              students={students}
              idPrefix={ID_PREFIX}
              fontSize={fontSize}
              showLabels
            />
            <WheelCore idPrefix={ID_PREFIX} />
          </motion.g>
        </g>
      </svg>
    </div>
  )
}

/** Radiant static preview for the tools card. */
export function WheelPreview({ size = 160 }: { size?: number }) {
  const previewId = `${ID_PREFIX}-preview`

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-300/40 via-fuchsia-200/30 to-sky-200/40 blur-2xl"
        aria-hidden
      />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={size}
        height={size}
        className="relative drop-shadow-xl"
        style={{ filter: 'drop-shadow(0 8px 24px rgba(109, 92, 231, 0.35))' }}
      >
        <WheelDefs idPrefix={previewId} />
        <g filter={`url(#${previewId}-soft-shadow)`}>
          <WheelSegments count={0} students={[]} idPrefix={previewId} fontSize={0} showLabels={false} />
          <WheelCore idPrefix={previewId} />
        </g>
        {/* Mini pointer */}
        <path
          d="M538 280L560 268v8l4 12v12l-26-20Z"
          fill={`url(#${previewId}-pointer)`}
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
