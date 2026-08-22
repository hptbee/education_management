'use client'

import { Search } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import type { PickerScope } from '@/src/utils/pickerSession'
import {
  DUCK_RACE_DURATION_PRESETS_SEC,
  DUCK_RACE_MAX_RACERS,
} from '@/src/utils/duckRaceSimulation'
import { ClassroomButton } from '@/src/components/classroom'
import { StudentAvatar } from '@/src/components/StudentAvatar'

interface DuckRaceSetupProps {
  teams: Team[]
  scopedStudents: Student[]
  filteredStudents: Student[]
  selectedIds: Set<string>
  scopeType: PickerScope
  teamId?: string
  preventRepeat: boolean
  raceDurationSec: number
  searchQuery: string
  classroomId?: string
  isBusy: boolean
  onSearchChange: (value: string) => void
  onScopeChange: (scope: PickerScope) => void
  onTeamChange: (teamId: string) => void
  onPreventRepeatChange: (value: boolean) => void
  onRaceDurationSecChange: (seconds: number) => void
  onToggleStudent: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onStart: () => void
}

export function DuckRaceSetup({
  teams,
  scopedStudents,
  filteredStudents,
  selectedIds,
  scopeType,
  teamId,
  preventRepeat,
  raceDurationSec,
  searchQuery,
  classroomId,
  isBusy,
  onSearchChange,
  onScopeChange,
  onTeamChange,
  onPreventRepeatChange,
  onRaceDurationSecChange,
  onToggleStudent,
  onSelectAll,
  onDeselectAll,
  onStart,
}: DuckRaceSetupProps) {
  const selectedCount = selectedIds.size
  const canStart =
    selectedCount > 0 && selectedCount <= DUCK_RACE_MAX_RACERS && !isBusy

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-purple">Phạm vi</p>
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="duck-race-scope"
              checked={scopeType === 'classroom'}
              disabled={isBusy}
              onChange={() => onScopeChange('classroom')}
            />
            Cả lớp
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="duck-race-scope"
              checked={scopeType === 'team'}
              disabled={isBusy || teams.length === 0}
              onChange={() => onScopeChange('team')}
            />
            Theo tổ
          </label>
          {scopeType === 'team' ? (
            <select
              value={teamId ?? ''}
              disabled={isBusy}
              onChange={(e) => onTeamChange(e.target.value)}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
            >
              <option value="">Chọn tổ...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={preventRepeat}
            disabled={isBusy}
            onChange={(e) => onPreventRepeatChange(e.target.checked)}
          />
          Không trùng người thắng trong vòng hiện tại
        </label>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-purple">
            Thời gian đua
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DUCK_RACE_DURATION_PRESETS_SEC.map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={isBusy}
                onClick={() => onRaceDurationSecChange(sec)}
                className={`min-h-11 rounded-xl px-2.5 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  raceDurationSec === sec
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
            Vịt về đích nhanh hơn khi thời gian ngắn hơn.
          </p>
        </div>
      </div>

      <div className="relative">
        <label htmlFor="duck-race-student-search" className="sr-only">
          Tìm học sinh
        </label>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="duck-race-student-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm học sinh..."
          disabled={isBusy}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">
          {selectedCount} / {scopedStudents.length} vịt đua
          {selectedCount > DUCK_RACE_MAX_RACERS
            ? ` (tối đa ${DUCK_RACE_MAX_RACERS})`
            : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onSelectAll}
            className="text-xs font-bold text-brand hover:underline"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDeselectAll}
            className="text-xs font-bold text-slate-500 hover:underline"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-2 scrollbar-thin">
        {filteredStudents.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm font-semibold text-slate-500">
            Không có học sinh phù hợp.
          </p>
        ) : (
          filteredStudents.map((student) => {
            const checked = selectedIds.has(student.id)
            return (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isBusy}
                  onChange={() => onToggleStudent(student.id)}
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

      <ClassroomButton size="lg" className="w-full shadow-md" disabled={!canStart} onClick={onStart}>
        Bắt đầu đua
      </ClassroomButton>
    </div>
  )
}
