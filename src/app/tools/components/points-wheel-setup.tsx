'use client'

import { Plus, Minus, Search, Trash2 } from 'lucide-react'
import type { PointsWheelSegment, Student } from '@/src/types/models'
import {
  POINTS_WHEEL_MAX_SEGMENTS,
  POINTS_WHEEL_MAX_VALUE,
  POINTS_WHEEL_MIN_VALUE,
} from '@/src/utils/pointsWheelConfig'
import { formatPointsWheelLabel } from '@/src/utils/pointsWheelSpin'
import { ClassroomButton } from '@/src/components/classroom'
import { StudentAvatar } from '@/src/components/StudentAvatar'

interface PointsWheelSetupProps {
  filteredStudents: Student[]
  selectedStudentId?: string
  segments: PointsWheelSegment[]
  searchQuery: string
  classroomId?: string
  isBusy: boolean
  onSearchChange: (value: string) => void
  onSelectStudent: (id: string) => void
  onSegmentValueChange: (id: string, value: number) => void
  onSegmentEnabledChange: (id: string, enabled: boolean) => void
  onAddSegment: () => void
  onRemoveSegment: (id: string) => void
  onStart: () => void
}

export function PointsWheelSetup({
  filteredStudents,
  selectedStudentId,
  segments,
  searchQuery,
  classroomId,
  isBusy,
  onSearchChange,
  onSelectStudent,
  onSegmentValueChange,
  onSegmentEnabledChange,
  onAddSegment,
  onRemoveSegment,
  onStart,
}: PointsWheelSetupProps) {
  const enabledSegments = segments.filter((s) => s.enabled)
  const enabledCount = enabledSegments.length
  const canStart = Boolean(selectedStudentId) && enabledCount > 0 && !isBusy
  const canAddSegment = segments.length < POINTS_WHEEL_MAX_SEGMENTS

  const adjustValue = (id: string, current: number, delta: number) => {
    onSegmentValueChange(id, current + delta)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5 scrollbar-thin">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-purple">
            Giá trị điểm
          </p>

          {enabledCount > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {enabledSegments.map((segment) => (
                <span
                  key={segment.id}
                  className="rounded-full bg-pastel-peach/80 px-2.5 py-0.5 text-xs font-extrabold text-amber-800"
                >
                  {formatPointsWheelLabel(segment.value)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-2 text-xs font-semibold text-rose-500">Cần ít nhất một ô đang bật</p>
          )}

          <div className="max-h-[11.5rem] space-y-1.5 overflow-y-auto scrollbar-thin">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={segment.enabled}
                  disabled={isBusy}
                  onChange={(e) => onSegmentEnabledChange(segment.id, e.target.checked)}
                  aria-label={`Bật ${formatPointsWheelLabel(segment.value)}`}
                  className="shrink-0"
                />
                <button
                  type="button"
                  disabled={isBusy || segment.value <= POINTS_WHEEL_MIN_VALUE}
                  onClick={() => adjustValue(segment.id, segment.value, -1)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Giảm điểm"
                >
                  <Minus className="size-3.5" />
                </button>
                <input
                  type="number"
                  value={segment.value}
                  disabled={isBusy}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10)
                    if (!Number.isNaN(parsed)) onSegmentValueChange(segment.id, parsed)
                  }}
                  className="w-12 shrink-0 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center text-sm font-extrabold outline-none focus:border-brand"
                  aria-label="Giá trị điểm"
                />
                <button
                  type="button"
                  disabled={isBusy || segment.value >= POINTS_WHEEL_MAX_VALUE}
                  onClick={() => adjustValue(segment.id, segment.value, 1)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Tăng điểm"
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isBusy || segments.length <= 1}
                  onClick={() => onRemoveSegment(segment.id)}
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                  aria-label="Xóa ô điểm"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={isBusy || !canAddSegment}
            onClick={onAddSegment}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-bold text-brand hover:bg-pastel-sky/40 disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            Thêm ô điểm
          </button>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
            {enabledCount} ô đang bật · tối đa {POINTS_WHEEL_MAX_SEGMENTS} ô
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-purple">
            Chọn một học sinh
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm học sinh..."
              disabled={isBusy}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand"
            />
          </div>
        </div>

        <div
          className="max-h-[min(28vh,240px)] space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-2 scrollbar-thin lg:max-h-[min(36vh,280px)]"
          role="radiogroup"
          aria-label="Chọn học sinh"
        >
          {filteredStudents.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm font-semibold text-slate-500">
              Không có học sinh phù hợp.
            </p>
          ) : (
            filteredStudents.map((student) => {
              const checked = selectedStudentId === student.id
              return (
                <label
                  key={student.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition ${
                    checked ? 'bg-pastel-peach/60 ring-1 ring-pastel-peach' : 'hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="points-wheel-student"
                    checked={checked}
                    disabled={isBusy}
                    onChange={() => onSelectStudent(student.id)}
                  />
                  <StudentAvatar
                    student={student}
                    classroomId={classroomId}
                    className="size-8 shrink-0 rounded-full text-xs"
                  />
                  <span className="truncate text-sm font-bold text-slate-700" title={student.name}>
                    {student.name}
                  </span>
                </label>
              )
            })
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 pt-3">
        <ClassroomButton size="lg" className="w-full shadow-md" disabled={!canStart} onClick={onStart}>
          Bắt đầu
        </ClassroomButton>
      </div>
    </div>
  )
}
