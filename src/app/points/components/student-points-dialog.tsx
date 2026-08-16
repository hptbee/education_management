'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { PointAction, PointHistorySource, Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { IconTouchButton, useModalFocusTrap } from '@/src/components/classroom'
import { createId } from '@/src/utils/id'

export type PointsDialogMode = 'add' | 'subtract'

interface StudentPointsDialogProps {
  student: Student | null
  mode: PointsDialogMode
  isOpen: boolean
  onClose: () => void
}

export function StudentPointsDialog({ student, mode, isOpen, onClose }: StudentPointsDialogProps) {
  const { data, applyPoints } = useAppData()
  const [reason, setReason] = useState('')
  const [pointValue, setPointValue] = useState(1)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)

  const pointActions = data?.pointActions ?? []
  const presets = useMemo(
    () =>
      pointActions.filter(
        (action) => action.isActive && action.type === (mode === 'add' ? 'reward' : 'penalty'),
      ),
    [pointActions, mode],
  )

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setPointValue(1)
      setSelectedActionId(null)
    }
  }, [isOpen, student?.id, mode])

  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen || !student) return null

  const isAdd = mode === 'add'
  const title = isAdd ? `Cộng điểm: ${student.name}` : `Trừ điểm: ${student.name}`
  const pointLabel = isAdd ? 'Điểm cộng' : 'Điểm trừ'
  const reasonPlaceholder = isAdd ? 'Nhập lý do cộng điểm...' : 'Nhập lý do trừ điểm...'
  const submitLabel = isAdd ? 'Cộng điểm' : 'Trừ điểm'

  const handlePresetSelect = (action: PointAction) => {
    setSelectedActionId(action.id)
    setReason(action.name)
    setPointValue(Math.abs(action.points))
  }

  const handleReasonChange = (value: string) => {
    setReason(value)
    const selected = presets.find((action) => action.id === selectedActionId)
    if (selected && value.trim() !== selected.name) {
      setSelectedActionId(null)
    }
  }

  const handlePointChange = (value: number) => {
    const next = Math.max(1, value)
    setPointValue(next)
    const selected = presets.find((action) => action.id === selectedActionId)
    if (selected && Math.abs(selected.points) !== next) {
      setSelectedActionId(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedReason = reason.trim()
    if (!trimmedReason) return

    const selected = presets.find((action) => action.id === selectedActionId)
    const matchesCatalog =
      selected &&
      trimmedReason === selected.name &&
      Math.abs(selected.points) === pointValue

    let action: PointAction
    let source: PointHistorySource = 'action'

    if (matchesCatalog && selected) {
      action = selected
    } else {
      action = {
        id: createId('manual'),
        name: trimmedReason,
        points: isAdd ? pointValue : -pointValue,
        type: isAdd ? 'reward' : 'penalty',
        isActive: true,
      }
      source = 'manual'
    }

    applyPoints(student.id, action, undefined, source)
    onClose()
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-points-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 id="student-points-title" className="font-display text-lg font-extrabold text-slate-800">{title}</h2>
          <IconTouchButton
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-rose-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 scrollbar-thin">
          {presets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presets.map((action) => {
                const isSelected = selectedActionId === action.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handlePresetSelect(action)}
                    className={`flex min-h-[88px] flex-col items-center justify-between rounded-2xl border-2 p-3 text-center transition ${
                      isSelected
                        ? 'border-sky-400 bg-sky-50 shadow-sm'
                        : 'border-sky-100 bg-sky-50/60 hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold leading-tight text-slate-800">{action.name}</span>
                    <span className="mt-2 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-sky-600 shadow-sm">
                      {isAdd ? '+' : '-'}{Math.abs(action.points)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tùy chỉnh</label>
            <input
              required
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">{pointLabel}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePointChange(pointValue - 1)}
                disabled={pointValue <= 1}
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <div className="flex h-11 min-w-[72px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-800">
                {pointValue}
              </div>
              <button
                type="button"
                onClick={() => handlePointChange(pointValue + 1)}
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!reason.trim()}
            className={`mt-2 w-full rounded-2xl py-3.5 text-sm font-extrabold text-white shadow-md transition disabled:opacity-50 ${
              isAdd
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  )
}
