'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/src/types/models'
import { getWheelDisplayName } from '@/src/utils/wheelSpin'

const SEGMENT_COLORS = [
  { fill: '#6bcb77', text: '#111827' },
  { fill: '#ffd93d', text: '#111827' },
  { fill: '#ff6b6b', text: '#ffffff' },
  { fill: '#4d96ff', text: '#ffffff' },
] as const

const SIZE = 560
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = SIZE / 2 - 6
const HUB_RADIUS = 42

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
  const segmentAngle = count > 0 ? 360 / count : 360
  const fontSize = count > 16 ? 14 : count > 12 ? 16 : count > 8 ? 18 : 22

  return (
    <div className="relative size-full">
      {/* Fixed pointer at 3 o'clock */}
      <motion.div
        className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2"
        style={{ right: -18 }}
        aria-hidden
        animate={isSpinning ? { x: [0, 4, 0] } : { x: 0 }}
        transition={isSpinning ? { duration: 0.18, repeat: Infinity } : { duration: 0.2 }}
      >
        <svg width="44" height="48" viewBox="0 0 44 48" fill="none">
          <path
            d="M4 24L38 6v10.5L42 24l-4 7.5V42L4 24Z"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible">
        <motion.g
          animate={{ rotate: rotation }}
          transition={{ duration: isSpinning ? spinDurationSec : 0, ease: spinEase }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
        <circle cx={CX} cy={CY} r={RADIUS + 2} fill="none" stroke="#1f2937" strokeWidth={2} />

        {count === 0 ? (
          <circle cx={CX} cy={CY} r={RADIUS} fill="#e2e8f0" />
        ) : (
          students.map((student, index) => {
            const startAngle = index * segmentAngle
            const endAngle = (index + 1) * segmentAngle
            const midAngle = startAngle + segmentAngle / 2
            const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length]
            const labelPos = polarToCartesian(midAngle, RADIUS * 0.62)
            const displayName = getWheelDisplayName(student.name)

            return (
              <g key={student.id}>
                <path
                  d={wedgePath(startAngle, endAngle)}
                  fill={color.fill}
                  stroke="#1f2937"
                  strokeWidth={1.5}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={color.text}
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
                >
                  {displayName}
                </text>
              </g>
            )
          })
        )}

        <circle cx={CX} cy={CY} r={HUB_RADIUS} fill="#ffffff" stroke="#1f2937" strokeWidth={2} />
        </motion.g>
      </svg>
    </div>
  )
}

/** Small static preview for the card (no labels). */
export function WheelPreview({ size = 120 }: { size?: number }) {
  const segmentAngle = 90
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} className="drop-shadow-sm">
      {SEGMENT_COLORS.map((color, index) => {
        const startAngle = index * segmentAngle
        const endAngle = (index + 1) * segmentAngle
        return (
          <path
            key={color.fill}
            d={wedgePath(startAngle, endAngle)}
            fill={color.fill}
            stroke="#1f2937"
            strokeWidth={1.5}
          />
        )
      })}
      <circle cx={CX} cy={CY} r={HUB_RADIUS * 0.7} fill="#ffffff" stroke="#1f2937" strokeWidth={2} />
    </svg>
  )
}
