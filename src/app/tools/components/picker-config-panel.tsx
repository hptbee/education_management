'use client'

import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react'
import type { Team } from '@/src/types/models'
import type { PickerMode, PickerScope, PickerSession } from '@/src/utils/pickerSession'
import { ClassroomButton, ClassroomSelect } from '@/src/components/classroom'

const MODE_OPTIONS: Array<{ id: PickerMode; label: string; emoji: string }> = [
  { id: 'single', label: 'Một bạn', emoji: '🎯' },
  { id: 'multiple', label: 'Nhiều bạn', emoji: '👥' },
  { id: 'sequential', label: 'Lần lượt', emoji: '🔄' },
]

interface PickerConfigPanelProps {
  session: PickerSession
  teams: Team[]
  eligibleCount: number
  poolCount: number
  calledCount: number
  isBusy: boolean
  showCalledList: boolean
  calledStudents: Array<{ id: string; name: string }>
  onModeChange: (mode: PickerMode) => void
  onScopeChange: (scope: PickerScope) => void
  onTeamChange: (teamId: string) => void
  onPreventRepeatChange: (value: boolean) => void
  onQuantityChange: (quantity: number) => void
  onResetRound: () => void
  onToggleCalledList: () => void
}

export function PickerConfigPanel({
  session,
  teams,
  eligibleCount,
  poolCount,
  calledCount,
  isBusy,
  showCalledList,
  calledStudents,
  onModeChange,
  onScopeChange,
  onTeamChange,
  onPreventRepeatChange,
  onQuantityChange,
  onResetRound,
  onToggleCalledList,
}: PickerConfigPanelProps) {
  const progressPct = poolCount > 0 ? Math.round((calledCount / poolCount) * 100) : 0

  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-purple">Chế độ chọn</p>

      <div className="flex flex-col gap-1.5">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={isBusy}
            onClick={() => onModeChange(opt.id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              session.mode === opt.id
                ? 'bg-brand-purple text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-pastel-sky/60'
            }`}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-bold text-slate-600">Phạm vi</p>
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="picker-scope"
              checked={session.scopeType === 'classroom'}
              disabled={isBusy}
              onChange={() => onScopeChange('classroom')}
              className="text-brand-purple"
            />
            Cả lớp
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="picker-scope"
              checked={session.scopeType === 'team'}
              disabled={isBusy}
              onChange={() => onScopeChange('team')}
              className="text-brand-purple"
            />
            Theo tổ
          </label>
        </div>

        {session.scopeType === 'team' ? (
          <div className="mt-2">
            <ClassroomSelect
              variant="field"
              value={session.teamId ?? ''}
              disabled={isBusy || teams.length === 0}
              onChange={(e) => onTeamChange(e.target.value)}
              aria-label="Chọn tổ"
              className="rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="">Chọn tổ</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.avatar ? `${team.avatar} ` : ''}{team.name}
                </option>
              ))}
            </ClassroomSelect>
          </div>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2 border-t border-slate-100 pt-3">
        <input
          type="checkbox"
          checked={session.preventRepeat}
          disabled={isBusy}
          onChange={(e) => onPreventRepeatChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-slate-300 text-brand-purple"
        />
        <span className="text-xs font-semibold leading-snug text-slate-700">
          Không chọn lại học sinh đã được gọi
        </span>
      </label>

      {session.mode === 'multiple' ? (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-bold text-slate-600">Số lượng</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={isBusy || session.quantity <= 2}
              onClick={() => onQuantityChange(session.quantity - 1)}
              aria-label="Giảm số lượng"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-black text-brand-purple">{session.quantity}</span>
            <button
              type="button"
              disabled={isBusy || session.quantity >= eligibleCount}
              onClick={() => onQuantityChange(session.quantity + 1)}
              aria-label="Tăng số lượng"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
          {eligibleCount < session.quantity ? (
            <p className="mt-2 text-center text-[11px] font-semibold text-rose-500">
              Chỉ còn {eligibleCount} bạn chưa được chọn.
            </p>
          ) : null}
        </div>
      ) : null}

      {session.mode === 'sequential' ? (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-bold text-slate-700">
            Đã gọi: {calledCount} / {poolCount}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-purple transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">Còn lại: {eligibleCount} bạn</p>
          {calledStudents.length > 0 ? (
            <button
              type="button"
              onClick={onToggleCalledList}
              className="mt-2 flex w-full items-center justify-between text-xs font-bold text-brand-purple"
            >
              Đã chọn ({calledStudents.length})
              <ChevronDown className={`size-4 transition ${showCalledList ? 'rotate-180' : ''}`} />
            </button>
          ) : null}
          {showCalledList && calledStudents.length > 0 ? (
            <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-[11px] font-semibold text-slate-600">
              {calledStudents.map((s) => (
                <li key={s.id}>✓ {s.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ClassroomButton
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isBusy}
        onClick={onResetRound}
      >
        <RotateCcw className="size-3.5" />
        Bắt đầu lượt mới
      </ClassroomButton>
    </div>
  )
}
