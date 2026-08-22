'use client'

import { Search, X } from 'lucide-react'
import type { Team } from '@/src/types/models'
import type { RankingPeriod } from '@/src/utils/ranking'
import { RANKING_PERIOD_LABELS } from '@/src/utils/ranking'
import type { RankingMode } from './ranking-mode-toggle'
import { IconTouchButton, ClassroomSelect } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

export interface RankingFilterState {
  searchQuery: string
  filterTeam: string
  filterGender: string
  period: RankingPeriod
}

interface RankingFiltersProps extends RankingFilterState {
  mode: RankingMode
  teams: Team[]
  onSearchChange: (value: string) => void
  onFilterTeamChange: (value: string) => void
  onFilterGenderChange: (value: string) => void
  onPeriodChange: (value: RankingPeriod) => void
  onClearAll: () => void
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  active,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex flex-col gap-1 rounded-2xl border px-3 py-2 transition',
        active
          ? 'border-brand/40 bg-brand-soft/80 ring-1 ring-brand/15'
          : 'border-sky-100 bg-slate-50/80 hover:border-sky-200 hover:bg-white',
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <ClassroomSelect
        id={id}
        variant="filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {children}
      </ClassroomSelect>
    </label>
  )
}

export function RankingFilters({
  mode,
  searchQuery,
  filterTeam,
  filterGender,
  period,
  teams,
  onSearchChange,
  onFilterTeamChange,
  onFilterGenderChange,
  onPeriodChange,
  onClearAll,
}: RankingFiltersProps) {
  const hasActiveFilter =
    searchQuery !== '' ||
    filterTeam !== 'all' ||
    filterGender !== 'all' ||
    period !== 'all-time'

  return (
    <div className="flex flex-col gap-3">
      {mode === 'students' ? (
        <div className="relative">
          <label htmlFor="ranking-student-search" className="sr-only">
            Tìm học sinh
          </label>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="ranking-student-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm học sinh..."
            className="classroom-search-field"
          />
          {searchQuery ? (
            <IconTouchButton
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Xóa tìm kiếm"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </IconTouchButton>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          id="ranking-period"
          label="Thời gian"
          value={period}
          onChange={(v) => onPeriodChange(v as RankingPeriod)}
          active={period !== 'all-time'}
        >
          {(Object.keys(RANKING_PERIOD_LABELS) as RankingPeriod[]).map((key) => (
            <option key={key} value={key}>
              {RANKING_PERIOD_LABELS[key]}
            </option>
          ))}
        </FilterSelect>

        {mode === 'students' ? (
          <>
            <FilterSelect
              id="ranking-team"
              label="Tổ"
              value={filterTeam}
              onChange={onFilterTeamChange}
              active={filterTeam !== 'all'}
            >
              <option value="all">Tất cả tổ</option>
              <option value="none">Chưa có tổ</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="ranking-gender"
              label="Giới tính"
              value={filterGender}
              onChange={onFilterGenderChange}
              active={filterGender !== 'all'}
            >
              <option value="all">Tất cả</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </FilterSelect>
          </>
        ) : null}
      </div>

      {hasActiveFilter ? (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-xs font-bold text-brand transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  )
}
