'use client'

import { Check, Sparkles, X } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { formatPointsWheelLabel } from '@/src/utils/pointsWheelSpin'
import { ClassroomButton } from '@/src/components/classroom'

interface PointsWheelResultProps {
  student: Student
  pointValue: number
  pointsApplied: boolean
  isBusy: boolean
  onApply: () => void
  onSpinAgain: () => void
  onSkip: () => void
  onPickAnother: () => void
  onClose: () => void
}

export function PointsWheelResult({
  student,
  pointValue,
  pointsApplied,
  isBusy,
  onApply,
  onSpinAgain,
  onSkip,
  onPickAnother,
  onClose,
}: PointsWheelResultProps) {
  const label = formatPointsWheelLabel(pointValue)
  const isPositive = pointValue > 0
  const isNegative = pointValue < 0

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-2 sm:p-4"
      role="status"
      aria-live="polite"
      aria-label={`Kết quả: ${label} điểm cho ${student.name}`}
    >
      <div className="pointer-events-none flex justify-center pt-2 sm:pt-4">
        <div
          className={`pointer-events-auto max-w-[min(100%,24rem)] rounded-2xl border px-4 py-3 text-center shadow-lg backdrop-blur-sm ring-1 ring-white/90 sm:px-6 sm:py-4 ${
            isNegative
              ? 'border-rose-200/90 bg-white/95 shadow-rose-100/50'
              : 'border-amber-200/90 bg-white/95 shadow-amber-100/50'
          }`}
        >
          <p
            className={`flex items-center justify-center gap-2 font-display text-2xl font-extrabold sm:text-3xl ${
              isNegative ? 'text-rose-600' : isPositive ? 'text-amber-600' : 'text-slate-600'
            }`}
          >
            {isPositive ? <Sparkles className="size-7 shrink-0 text-amber-500" aria-hidden /> : null}
            {label.toUpperCase()} ĐIỂM!
          </p>
          <p className="mt-1 text-sm font-bold text-slate-600 sm:text-base">
            <span className="font-extrabold text-slate-800">{student.name}</span> nhận được{' '}
            <span className={isNegative ? 'text-rose-600' : 'text-brand-purple'}>{label} điểm</span>
          </p>
          {pointsApplied ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-sm font-extrabold text-emerald-600">
              <Check className="size-4" aria-hidden />
              Đã cộng {label} điểm
            </p>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-auto flex w-full flex-col gap-2">
        {!pointsApplied ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <ClassroomButton
                className="min-h-11 flex-1 shadow-md sm:max-w-[14rem]"
                disabled={isBusy}
                onClick={onApply}
              >
                Áp dụng {label} điểm
              </ClassroomButton>
              <ClassroomButton
                variant="secondary"
                className="min-h-11 flex-1 sm:max-w-[10rem]"
                disabled={isBusy}
                onClick={onSpinAgain}
              >
                Quay lại
              </ClassroomButton>
              <ClassroomButton
                variant="outline"
                className="min-h-11 flex-1 sm:max-w-[10rem]"
                disabled={isBusy}
                onClick={onSkip}
              >
                Bỏ qua
              </ClassroomButton>
            </div>
            <div className="flex justify-end">
              <ClassroomButton variant="outline" className="min-h-10" disabled={isBusy} onClick={onClose}>
                <X className="size-4" aria-hidden />
                Đóng
              </ClassroomButton>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <ClassroomButton
                className="min-h-11 flex-1 shadow-md sm:max-w-[14rem]"
                disabled={isBusy}
                onClick={onPickAnother}
              >
                Chọn học sinh khác
              </ClassroomButton>
              <ClassroomButton
                variant="secondary"
                className="min-h-11 flex-1 sm:max-w-[10rem]"
                disabled={isBusy}
                onClick={onSpinAgain}
              >
                Quay lại
              </ClassroomButton>
            </div>
            <ClassroomButton
              variant="outline"
              className="min-h-11 shrink-0"
              disabled={isBusy}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
              Đóng
            </ClassroomButton>
          </div>
        )}
      </div>
    </div>
  )
}
