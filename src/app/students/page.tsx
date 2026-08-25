'use client'

import { useState, useMemo } from 'react'
import {
  Plus, FileSpreadsheet, Download, GraduationCap,
  Search, X, ArrowUpDown, Filter, ChevronDown, Crown, Medal, Star, UserCheck, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { useAppData } from '@/src/store/AppDataContext'
import type { Student } from '@/src/types/models'
import { sortStudents, type StudentSortOption } from '@/src/utils/student'
import { downloadStudentExcelTemplate } from '@/src/utils/studentExcel'
import { cn } from '@/lib/utils'

import { StudentCard } from './components/student-card'
import { StudentFormModal } from './components/student-form-modal'
import { StudentDetailsModal } from './components/student-details-modal'
import { DeleteConfirmModal } from './components/delete-confirm-modal'
import { ImportModal } from './components/import-modal'
import { PageHeader, EmptyState, ClassroomButton, ClassroomCard, IconTouchButton, ClassroomMenuSelect, AnimatedEntrance } from '@/src/components/classroom'

const STUDENT_SORT_OPTIONS: { value: StudentSortOption; label: string }[] = [
  { value: 'role-stt', label: 'Vai trò → STT' },
  { value: 'name-asc', label: 'Tên A → Z' },
  { value: 'name-desc', label: 'Tên Z → A' },
  { value: 'points-desc', label: 'Điểm cao → thấp' },
  { value: 'points-asc', label: 'Điểm thấp → cao' },
  { value: 'team', label: 'Theo tổ' },
  { value: 'newest', label: 'Mới thêm gần đây' },
]

// ─── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({
  emoji, label, value, sub, color,
}: { emoji: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl px-4 py-3 ${color}`}>
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-black leading-none text-slate-800">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          {sub ? `${sub} · ` : ''}{label}
        </p>
      </div>
    </div>
  )
}

function QuickFilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  active,
  options,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  active: boolean
  options: { value: string; label: string }[]
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label

  return (
    <ClassroomMenuSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      aria-label={label}
      className="min-w-[160px] flex-1"
      triggerClassName={cn(
        'rounded-xl border px-3 py-2 transition',
        active
          ? 'border-brand/40 bg-white ring-1 ring-brand/15'
          : 'border-slate-200/80 bg-white/80 hover:border-sky-200 hover:bg-white',
      )}
    >
      {(open) => (
        <>
          <Icon className={cn('size-3.5 shrink-0', active ? 'text-brand' : 'text-slate-400')} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {label}
            </span>
            <span className="block truncate text-sm font-bold text-slate-800">{selectedLabel}</span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </>
      )}
    </ClassroomMenuSelect>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function StudentsEmptyState({
  filtered,
  onAdd,
  onImport,
  onDownloadTemplate,
}: {
  filtered: boolean
  onAdd: () => void
  onImport: () => void
  onDownloadTemplate: () => void
}) {
  if (filtered) {
    return (
      <EmptyState
        icon={Search}
        title="Không tìm thấy học sinh nào"
        description="Thử thay đổi từ khóa hoặc bỏ bộ lọc"
      />
    )
  }

  return (
    <EmptyState
      imageSrc="/banner-boy.png"
      imageAlt="Học sinh"
      title="Lớp mình chưa có học sinh nào!"
      description="Hãy thêm học sinh đầu tiên hoặc nhập danh sách từ file Excel nhé."
      action={
        <>
          <ClassroomButton onClick={onAdd}>
            <Plus className="size-4" />
            Thêm học sinh
          </ClassroomButton>
          <ClassroomButton variant="outline" onClick={onImport}>
            <FileSpreadsheet className="size-4 text-green-600" />
            Nhập Excel
          </ClassroomButton>
          <button
            onClick={onDownloadTemplate}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand-purple/70 underline underline-offset-2 transition hover:text-brand-purple"
          >
            <Download className="size-3.5" />
            Tải file mẫu
          </button>
        </>
      }
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { classroom, database, saveStudent, deleteStudent, isLoaded } = useActiveClassroom()
  const { saveStudents } = useAppData()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterBadge, setFilterBadge] = useState('all')
  const [filterPoints, setFilterPoints] = useState('all')
  const [sortBy, setSortBy] = useState<StudentSortOption>('role-stt')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const students = database?.students || []
  const teams = database?.teams || []
  const classroomRoles = database?.classroomRoles || []
  const badges = database?.badges || []

  // ── Summary stats
  const totalMale = students.filter(s => s.gender === 'male').length
  const totalFemale = students.filter(s => s.gender === 'female').length
  const totalAssigned = students.filter(s => !!s.teamId).length

  // ── Filtered list
  const filteredStudents = useMemo(() => {
    const filtered = students.filter(s => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.hometown?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.parent?.fullName?.toLowerCase().includes(q) ||
        s.parent?.phoneNumber?.toLowerCase().includes(q)

      const matchesGender = filterGender === 'all' || s.gender === filterGender
      const matchesTeam =
        filterTeam === 'all' ||
        (filterTeam === 'none' ? !s.teamId : s.teamId === filterTeam)

      const roleIds = s.classroomRoleIds ?? []
      const matchesRole =
        filterRole === 'all' ||
        (filterRole === 'none' ? roleIds.length === 0 : roleIds.includes(filterRole))

      const badgeIds = s.badgeIds ?? []
      const matchesBadge =
        filterBadge === 'all' ||
        (filterBadge === 'none' ? badgeIds.length === 0 : badgeIds.includes(filterBadge))

      const matchesPoints =
        filterPoints === 'all' ||
        (filterPoints === 'has' ? s.points > 0 : filterPoints === 'none' ? s.points === 0 : true)

      return matchesSearch && matchesGender && matchesTeam && matchesRole && matchesBadge && matchesPoints
    })

    return sortStudents(filtered, students, sortBy, teams)
  }, [students, teams, searchQuery, filterGender, filterTeam, filterRole, filterBadge, filterPoints, sortBy])

  const activeQuickFilterCount = [
    filterGender !== 'all',
    filterTeam !== 'all',
    filterRole !== 'all',
    filterBadge !== 'all',
    filterPoints !== 'all',
  ].filter(Boolean).length

  const hasActiveFilter =
    searchQuery !== '' ||
    activeQuickFilterCount > 0 ||
    sortBy !== 'role-stt'

  // ── Handlers
  const handleOpenAdd = () => { setSelectedStudent(null); setIsFormOpen(true) }
  const handleOpenEdit = (s: Student) => { setSelectedStudent(s); setIsFormOpen(true) }
  const handleOpenDetails = (s: Student) => { setSelectedStudent(s); setIsDetailsOpen(true) }
  const handleOpenDelete = (s: Student) => { setSelectedStudent(s); setIsDeleteOpen(true) }
  const handleSaveStudent = (s: Student) => saveStudent(s)
  const handleDeleteConfirm = (id: string) => deleteStudent(id)
  const handleImportSuccess = (newStudents: Student[]) => saveStudents(newStudents)

  const handleDownloadTemplate = () => {
    void downloadStudentExcelTemplate()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterGender('all')
    setFilterTeam('all')
    setFilterRole('all')
    setFilterBadge('all')
    setFilterPoints('all')
    setSortBy('role-stt')
  }

  if (!isLoaded || !classroom) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Đang chuẩn bị dữ liệu lớp...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        <div className="classroom-page--management">

        <PageHeader
          icon={GraduationCap}
          title="Quản lý học sinh"
          subtitle={`${classroom.className} · Năm học ${classroom.schoolYear}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClassroomButton variant="outline" onClick={handleDownloadTemplate}>
                <Download className="size-4" /> Tải file mẫu
              </ClassroomButton>
              <ClassroomButton variant="outline" onClick={() => setIsImportOpen(true)}>
                <FileSpreadsheet className="size-4 text-emerald-600" /> Nhập Excel
              </ClassroomButton>
              <ClassroomButton onClick={handleOpenAdd}>
                <Plus className="size-4" /> Thêm học sinh
              </ClassroomButton>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AnimatedEntrance variant="random" staggerIndex={0}>
            <SummaryCard
              emoji="👩‍🏫"
              label="Tổng số"
              value={students.length}
              sub="học sinh"
              color="bg-pastel-sky"
            />
          </AnimatedEntrance>
          <AnimatedEntrance variant="random" staggerIndex={1}>
            <SummaryCard
              emoji="👦"
              label="Nam"
              value={totalMale}
              sub="học sinh"
              color="bg-brand-soft"
            />
          </AnimatedEntrance>
          <AnimatedEntrance variant="random" staggerIndex={2}>
            <SummaryCard
              emoji="👧"
              label="Nữ"
              value={totalFemale}
              sub="học sinh"
              color="bg-pastel-pink"
            />
          </AnimatedEntrance>
          <AnimatedEntrance variant="random" staggerIndex={3}>
            <SummaryCard
              emoji="🏆"
              label="Đã chia tổ"
              value={`${totalAssigned}/${students.length}`}
              color="bg-pastel-yellow"
            />
          </AnimatedEntrance>
        </div>

        <ClassroomCard className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="students-search" className="sr-only">
                Tìm học sinh
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="students-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, quê quán, SĐT, phụ huynh..."
                className="classroom-search-field min-h-11"
              />
              {searchQuery ? (
                <IconTouchButton
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </IconTouchButton>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="students-quick-filters"
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                  filtersOpen || activeQuickFilterCount > 0
                    ? 'border-brand/30 bg-brand-soft text-brand-dark'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-slate-50',
                )}
              >
                <Filter className="size-4 shrink-0 text-brand" aria-hidden />
                Lọc
                {activeQuickFilterCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-black text-white">
                    {activeQuickFilterCount}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-slate-400 transition-transform',
                    filtersOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              <ClassroomMenuSelect
                id="students-sort"
                value={sortBy}
                onChange={(next) => setSortBy(next as StudentSortOption)}
                options={STUDENT_SORT_OPTIONS}
                aria-label="Sắp xếp học sinh"
                className="shrink-0"
                triggerClassName="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {(open) => (
                  <>
                    <ArrowUpDown className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0 truncate">
                      {STUDENT_SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
                    </span>
                    <ChevronDown
                      className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
                      aria-hidden
                    />
                  </>
                )}
              </ClassroomMenuSelect>

              {hasActiveFilter ? (
                <ClassroomButton
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="min-h-11 shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <X className="size-3.5" />
                  Xóa lọc
                </ClassroomButton>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div
              id="students-quick-filters"
              className="flex flex-wrap gap-2 rounded-xl border border-sky-100 bg-brand-soft/40 p-2"
            >
              <QuickFilterSelect
                id="students-filter-gender"
                label="Giới tính"
                icon={Users}
                value={filterGender}
                onChange={setFilterGender}
                active={filterGender !== 'all'}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'male', label: 'Nam' },
                  { value: 'female', label: 'Nữ' },
                ]}
              />

              {teams.length > 0 ? (
                <QuickFilterSelect
                  id="students-filter-team"
                  label="Tổ"
                  icon={UserCheck}
                  value={filterTeam}
                  onChange={setFilterTeam}
                  active={filterTeam !== 'all'}
                  options={[
                    { value: 'all', label: 'Tất cả tổ' },
                    { value: 'none', label: 'Chưa có tổ' },
                    ...teams.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
              ) : null}

              {classroomRoles.length > 0 ? (
                <QuickFilterSelect
                  id="students-filter-role"
                  label="Vai trò"
                  icon={Crown}
                  value={filterRole}
                  onChange={setFilterRole}
                  active={filterRole !== 'all'}
                  options={[
                    { value: 'all', label: 'Tất cả vai trò' },
                    { value: 'none', label: 'Chưa có vai trò' },
                    ...classroomRoles.map((role) => ({
                      value: role.id,
                      label: role.icon ? `${role.icon} ${role.name}` : role.name,
                    })),
                  ]}
                />
              ) : null}

              {badges.length > 0 ? (
                <QuickFilterSelect
                  id="students-filter-badge"
                  label="Huy hiệu"
                  icon={Medal}
                  value={filterBadge}
                  onChange={setFilterBadge}
                  active={filterBadge !== 'all'}
                  options={[
                    { value: 'all', label: 'Tất cả huy hiệu' },
                    { value: 'none', label: 'Chưa có huy hiệu' },
                    ...badges.map((badge) => ({
                      value: badge.id,
                      label: badge.icon ? `${badge.icon} ${badge.name}` : badge.name,
                    })),
                  ]}
                />
              ) : null}

              <QuickFilterSelect
                id="students-filter-points"
                label="Điểm"
                icon={Star}
                value={filterPoints}
                onChange={setFilterPoints}
                active={filterPoints !== 'all'}
                options={[
                  { value: 'all', label: 'Tất cả điểm' },
                  { value: 'has', label: 'Có điểm' },
                  { value: 'none', label: 'Chưa có điểm' },
                ]}
              />
            </div>
          ) : null}
        </ClassroomCard>

        {/* ── STUDENT GRID / EMPTY STATE ── */}
        {filteredStudents.length === 0 ? (
          <StudentsEmptyState
            filtered={hasActiveFilter}
            onAdd={handleOpenAdd}
            onImport={() => setIsImportOpen(true)}
            onDownloadTemplate={handleDownloadTemplate}
          />
        ) : (
          <>
            {/* Count label */}
            <div className="flex items-center justify-between rounded-2xl bg-white/60 px-1 py-1">
              <p className="text-sm font-bold text-slate-500">
                <span className="font-display text-lg text-brand">{filteredStudents.length}</span>
                {' '}học sinh
                {hasActiveFilter ? (
                  <span className="ml-1 text-xs font-semibold text-slate-400">(đã lọc)</span>
                ) : null}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredStudents.map((student, index) => (
                <AnimatedEntrance key={student.id} variant="random" staggerIndex={index} className="h-full">
                  <StudentCard
                    student={student}
                    teams={teams}
                    classroomRoles={classroomRoles}
                    badges={badges}
                    onView={handleOpenDetails}
                    onEdit={handleOpenEdit}
                    onDelete={handleOpenDelete}
                  />
                </AnimatedEntrance>
              ))}
            </div>
          </>
        )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <StudentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveStudent}
        initialData={selectedStudent}
      />
      <StudentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        student={selectedStudent}
        onEdit={(s) => {
          setIsDetailsOpen(false)
          handleOpenEdit(s)
        }}
        onDelete={(s) => {
          setIsDetailsOpen(false)
          handleOpenDelete(s)
        }}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        student={selectedStudent}
      />
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportSuccess}
        existingStudents={students}
      />
    </div>
  )
}
