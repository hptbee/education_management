'use client'

import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown,
  ChevronDown,
  Crown,
  Filter,
  Medal,
  Search,
  SlidersHorizontal,
  Star,
  UserCheck,
  X,
} from 'lucide-react'
import type { Badge, ClassroomRole, Team } from '@/src/types/models'
import type { StudentSortOption } from '@/src/utils/student'
import { cn } from '@/lib/utils'

function FilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  active,
  children,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  active: boolean
  children: ReactNode
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
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="size-3 shrink-0" />
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer bg-transparent text-sm font-bold text-slate-800 outline-none"
      >
        {children}
      </select>
    </label>
  )
}

const SORT_LABELS: Record<StudentSortOption, string> = {
  'role-stt': 'Vai trò → STT',
  'name-asc': 'Tên A → Z',
  'name-desc': 'Tên Z → A',
  'points-desc': 'Điểm cao → thấp',
  'points-asc': 'Điểm thấp → cao',
  team: 'Theo tổ',
  newest: 'Mới thêm',
}

export interface StudentsFilterState {
  searchQuery: string
  filterGender: string
  filterTeam: string
  filterRole: string
  filterBadge: string
  filterPoints: string
  sortBy: StudentSortOption
}

interface StudentsFilterBarProps extends StudentsFilterState {
  teams: Team[]
  classroomRoles: ClassroomRole[]
  badges: Badge[]
  totalCount: number
  filteredCount: number
  onSearchChange: (value: string) => void
  onFilterGenderChange: (value: string) => void
  onFilterTeamChange: (value: string) => void
  onFilterRoleChange: (value: string) => void
  onFilterBadgeChange: (value: string) => void
  onFilterPointsChange: (value: string) => void
  onSortChange: (value: StudentSortOption) => void
  onClearAll: () => void
}

export function StudentsFilterBar({
  searchQuery,
  filterGender,
  filterTeam,
  filterRole,
  filterBadge,
  filterPoints,
  sortBy,
  teams,
  classroomRoles,
  badges,
  totalCount,
  filteredCount,
  onSearchChange,
  onFilterGenderChange,
  onFilterTeamChange,
  onFilterRoleChange,
  onFilterBadgeChange,
  onFilterPointsChange,
  onSortChange,
  onClearAll,
}: StudentsFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(true)

  const activeFilterCount = [
    searchQuery !== '',
    filterGender !== 'all',
    filterTeam !== 'all',
    filterRole !== 'all',
    filterBadge !== 'all',
    filterPoints !== 'all',
    sortBy !== 'role-stt',
  ].filter(Boolean).length

  const quickFilterCount = [
    filterGender !== 'all',
    filterTeam !== 'all',
    filterRole !== 'all',
    filterBadge !== 'all',
    filterPoints !== 'all',
  ].filter(Boolean).length

  const hasActiveFilter = activeFilterCount > 0

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (searchQuery) {
    chips.push({ key: 'search', label: `Tìm: “${searchQuery}”`, onRemove: () => onSearchChange('') })
  }
  if (filterGender !== 'all') {
    chips.push({
      key: 'gender',
      label: filterGender === 'male' ? '👦 Nam' : '👧 Nữ',
      onRemove: () => onFilterGenderChange('all'),
    })
  }
  if (filterTeam !== 'all') {
    const label =
      filterTeam === 'none'
        ? 'Chưa có tổ'
        : (teams.find((t) => t.id === filterTeam)?.name ?? 'Tổ')
    chips.push({ key: 'team', label, onRemove: () => onFilterTeamChange('all') })
  }
  if (filterRole !== 'all') {
    const role =
      filterRole === 'none'
        ? 'Chưa có vai trò'
        : classroomRoles.find((r) => r.id === filterRole)
    chips.push({
      key: 'role',
      label: typeof role === 'string' ? role : `${role?.icon ?? ''} ${role?.name ?? 'Vai trò'}`.trim(),
      onRemove: () => onFilterRoleChange('all'),
    })
  }
  if (filterBadge !== 'all') {
    const badge =
      filterBadge === 'none'
        ? 'Chưa có huy hiệu'
        : badges.find((b) => b.id === filterBadge)
    chips.push({
      key: 'badge',
      label: typeof badge === 'string' ? badge : `${badge?.icon ?? ''} ${badge?.name ?? 'Huy hiệu'}`.trim(),
      onRemove: () => onFilterBadgeChange('all'),
    })
  }
  if (filterPoints !== 'all') {
    chips.push({
      key: 'points',
      label: filterPoints === 'has' ? 'Có điểm' : 'Chưa có điểm',
      onRemove: () => onFilterPointsChange('all'),
    })
  }
  if (sortBy !== 'role-stt') {
    chips.push({
      key: 'sort',
      label: `Sắp xếp: ${SORT_LABELS[sortBy]}`,
      onRemove: () => onSortChange('role-stt'),
    })
  }

  return (
    <section
      aria-label="Tìm kiếm và lọc học sinh"
      className="overflow-hidden rounded-3xl border-2 border-brand/25 bg-white shadow-md ring-1 ring-brand/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/15 bg-brand-soft/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-brand/20">
            <SlidersHorizontal className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold text-slate-800">Tìm & lọc học sinh</p>
            <p className="text-xs font-semibold text-slate-500">
              {hasActiveFilter
                ? `Đang hiển thị ${filteredCount} / ${totalCount} học sinh`
                : `${totalCount} học sinh trong lớp`}
            </p>
          </div>
        </div>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-sky-100 transition hover:bg-pastel-pink/40 hover:text-rose-700"
          >
            <X className="size-3.5" />
            Xóa tất cả
          </button>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="student-search"
              placeholder="Tìm theo tên, quê quán, SĐT, phụ huynh..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="classroom-search-field rounded-2xl py-2.5"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <label
            htmlFor="sort-students"
            className={cn(
              'flex min-w-[200px] flex-col justify-center gap-1 rounded-2xl border px-3 py-2 lg:w-52',
              sortBy !== 'role-stt'
                ? 'border-brand/40 bg-brand-soft/80'
                : 'border-sky-100 bg-slate-50/80',
            )}
          >
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <ArrowUpDown className="size-3" />
              Sắp xếp
            </span>
            <select
              id="sort-students"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as StudentSortOption)}
              className="w-full cursor-pointer bg-transparent text-sm font-bold text-slate-800 outline-none"
            >
              <option value="role-stt">Vai trò → STT</option>
              <option value="name-asc">Tên A → Z</option>
              <option value="name-desc">Tên Z → A</option>
              <option value="points-desc">Điểm cao → thấp</option>
              <option value="points-asc">Điểm thấp → cao</option>
              <option value="team">Theo tổ</option>
              <option value="newest">Mới thêm gần đây</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="students-filter-panel"
          className="flex w-full items-center justify-between rounded-2xl border border-sky-100 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-sky-200 hover:bg-white"
        >
          <span className="flex items-center gap-2">
            <Filter className="size-3.5 shrink-0 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Bộ lọc nhanh</span>
            {quickFilterCount > 0 ? (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                {quickFilterCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-slate-400 transition-transform',
              filtersOpen && 'rotate-180',
            )}
          />
        </button>

        {filtersOpen ? (
          <div id="students-filter-panel" className="space-y-3">
            <div
              className={cn(
                'grid gap-2',
                teams.length > 0 && classroomRoles.length > 0 && badges.length > 0
                  ? 'sm:grid-cols-2 lg:grid-cols-5'
                  : 'sm:grid-cols-2 lg:grid-cols-3',
              )}
            >
          <FilterSelect
            id="filter-gender"
            label="Giới tính"
            icon={Filter}
            value={filterGender}
            onChange={onFilterGenderChange}
            active={filterGender !== 'all'}
          >
            <option value="all">Tất cả</option>
            <option value="male">👦 Nam</option>
            <option value="female">👧 Nữ</option>
          </FilterSelect>

          {teams.length > 0 ? (
            <FilterSelect
              id="filter-team"
              label="Tổ / Nhóm"
              icon={UserCheck}
              value={filterTeam}
              onChange={onFilterTeamChange}
              active={filterTeam !== 'all'}
            >
              <option value="all">Tất cả tổ</option>
              <option value="none">Chưa có tổ</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FilterSelect>
          ) : null}

          {classroomRoles.length > 0 ? (
            <FilterSelect
              id="filter-role"
              label="Vai trò"
              icon={Crown}
              value={filterRole}
              onChange={onFilterRoleChange}
              active={filterRole !== 'all'}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="none">Chưa có vai trò</option>
              {classroomRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.icon ? `${role.icon} ` : ''}
                  {role.name}
                </option>
              ))}
            </FilterSelect>
          ) : null}

          {badges.length > 0 ? (
            <FilterSelect
              id="filter-badge"
              label="Huy hiệu"
              icon={Medal}
              value={filterBadge}
              onChange={onFilterBadgeChange}
              active={filterBadge !== 'all'}
            >
              <option value="all">Tất cả huy hiệu</option>
              <option value="none">Chưa có huy hiệu</option>
              {badges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {badge.icon ? `${badge.icon} ` : ''}
                  {badge.name}
                </option>
              ))}
            </FilterSelect>
          ) : null}

          <FilterSelect
            id="filter-points"
            label="Điểm"
            icon={Star}
            value={filterPoints}
            onChange={onFilterPointsChange}
            active={filterPoints !== 'all'}
          >
            <option value="all">Tất cả điểm</option>
            <option value="has">Có điểm (&gt; 0)</option>
            <option value="none">Chưa có điểm</option>
          </FilterSelect>
            </div>

            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-sky-100/80 pt-3">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1 rounded-full bg-pastel-pink/70 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-accent-pink/25 transition hover:bg-pastel-pink"
                  >
                    {chip.label}
                    <X className="size-3 opacity-60" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!filtersOpen && chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 rounded-full bg-pastel-pink/70 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-accent-pink/25 transition hover:bg-pastel-pink"
              >
                {chip.label}
                <X className="size-3 opacity-60" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
