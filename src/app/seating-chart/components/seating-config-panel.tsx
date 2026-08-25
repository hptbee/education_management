'use client'

import { Minus, Plus } from 'lucide-react'
import type { BoardPosition, DeskType, SeatingChartConfig } from '@/src/types/models'
import { ClassroomButton, ClassroomSelect } from '@/src/components/classroom'
import {
  generateSeatIds,
  SEATING_CHART_MAX_COLUMNS,
  SEATING_CHART_MAX_GROUPS,
  SEATING_CHART_MAX_GROUP_GAP,
  SEATING_CHART_MAX_ROWS,
  SEATING_CHART_MIN_COLUMNS,
  SEATING_CHART_MIN_GROUPS,
  SEATING_CHART_MIN_GROUP_GAP,
  SEATING_CHART_MIN_ROWS,
  totalSeatCapacity,
} from '@/src/utils/seatingChart'

interface SeatingConfigPanelProps {
  config: SeatingChartConfig
  onChange: (patch: Partial<SeatingChartConfig>) => void
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <ClassroomButton
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-9 min-w-9 px-0"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Giảm ${label}`}
        >
          <Minus className="size-4" />
        </ClassroomButton>
        <span className="min-w-8 text-center text-sm font-extrabold text-slate-800">{value}</span>
        <ClassroomButton
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-9 min-w-9 px-0"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Tăng ${label}`}
        >
          <Plus className="size-4" />
        </ClassroomButton>
      </div>
    </div>
  )
}

const BOARD_OPTIONS: { value: BoardPosition; label: string }[] = [
  { value: 'front', label: 'Bảng ở phía trước' },
  { value: 'back', label: 'Bảng ở phía sau' },
  { value: 'left', label: 'Bảng bên trái' },
  { value: 'right', label: 'Bảng bên phải' },
]

const DESK_OPTIONS: { value: DeskType; label: string }[] = [
  { value: 'individual', label: 'Cá nhân' },
  { value: 'pair', label: 'Bàn đôi' },
  { value: 'group', label: 'Bàn nhóm' },
]

export function SeatingConfigPanel({ config, onChange }: SeatingConfigPanelProps) {
  const deskCount = generateSeatIds(config).length
  const seatCapacity = totalSeatCapacity(config)

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-center text-sm font-bold text-slate-600">
        {deskCount} bàn · {seatCapacity} chỗ
      </p>

      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
        <Stepper
          label="Số dãy"
          value={config.groups}
          min={SEATING_CHART_MIN_GROUPS}
          max={SEATING_CHART_MAX_GROUPS}
          onChange={(groups) => onChange({ groups })}
        />
        <Stepper
          label="Số hàng"
          value={config.rows}
          min={SEATING_CHART_MIN_ROWS}
          max={SEATING_CHART_MAX_ROWS}
          onChange={(rows) => onChange({ rows })}
        />
        <Stepper
          label="Số cột mỗi dãy"
          value={config.columnsPerGroup}
          min={SEATING_CHART_MIN_COLUMNS}
          max={SEATING_CHART_MAX_COLUMNS}
          onChange={(columnsPerGroup) => onChange({ columnsPerGroup })}
        />
      </div>

      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <label htmlFor="group-gap" className="text-sm font-bold text-slate-600">
          Khoảng cách dãy
        </label>
        <input
          id="group-gap"
          type="range"
          min={SEATING_CHART_MIN_GROUP_GAP}
          max={SEATING_CHART_MAX_GROUP_GAP}
          value={config.groupGap}
          onChange={(event) => onChange({ groupGap: Number(event.target.value) })}
          className="w-full accent-brand"
        />
      </div>

      <fieldset className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <legend className="mb-1 text-sm font-bold text-slate-600">Kiểu bàn</legend>
        <div className="grid grid-cols-3 gap-2">
          {DESK_OPTIONS.map((option) => {
            const selected = config.deskType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ deskType: option.value })}
                className={`rounded-xl border px-2 py-2.5 text-center text-xs font-bold transition ${
                  selected
                    ? 'border-brand bg-brand-soft/80 text-brand-purple ring-2 ring-brand/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-pastel-sky/40'
                }`}
                aria-pressed={selected}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="board-position" className="text-sm font-bold text-slate-600">
          Hướng bảng
        </label>
        <ClassroomSelect
          id="board-position"
          variant="field"
          value={config.boardPosition}
          onChange={(event) => onChange({ boardPosition: event.target.value as BoardPosition })}
          aria-label="Hướng bảng"
          className="w-full rounded-xl"
        >
          {BOARD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ClassroomSelect>
      </div>
    </div>
  )
}
