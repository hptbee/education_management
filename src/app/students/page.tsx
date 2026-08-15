'use client'

import { useState, useMemo } from 'react'
import {
  Plus, FileSpreadsheet, Download, GraduationCap,
  Search, X, ArrowUpDown, Filter, ChevronDown, Crown, Medal, Star, UserCheck,
} from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Student } from '@/src/types/models'
import { sortStudents, type StudentSortOption } from '@/src/utils/student'
import * as XLSX from 'xlsx'

import { StudentCard } from './components/student-card'
import { StudentFormModal } from './components/student-form-modal'
import { StudentDetailsModal } from './components/student-details-modal'
import { DeleteConfirmModal } from './components/delete-confirm-modal'
import { ImportModal } from './components/import-modal'
import { PageHeader, EmptyState, ClassroomButton, ClassroomCard } from '@/src/components/classroom'

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
        emoji="🔍"
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

  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterBadge, setFilterBadge] = useState('all')
  const [filterPoints, setFilterPoints] = useState('all')
  const [sortBy, setSortBy] = useState<StudentSortOption>('role-stt')
  const [filtersOpen, setFiltersOpen] = useState(true)

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

  const hasActiveFilter =
    searchQuery !== '' ||
    filterGender !== 'all' ||
    filterTeam !== 'all' ||
    filterRole !== 'all' ||
    filterBadge !== 'all' ||
    filterPoints !== 'all' ||
    sortBy !== 'role-stt'

  // ── Handlers
  const handleOpenAdd = () => { setSelectedStudent(null); setIsFormOpen(true) }
  const handleOpenEdit = (s: Student) => { setSelectedStudent(s); setIsFormOpen(true) }
  const handleOpenDetails = (s: Student) => { setSelectedStudent(s); setIsDetailsOpen(true) }
  const handleOpenDelete = (s: Student) => { setSelectedStudent(s); setIsDeleteOpen(true) }
  const handleSaveStudent = (s: Student) => saveStudent(s)
  const handleDeleteConfirm = (id: string) => deleteStudent(id)
  const handleImportSuccess = (newStudents: Student[]) => newStudents.forEach(saveStudent)

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Stt', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Quê quán', 'Họ tên phụ huynh', 'Số điện thoại di động', 'Địa chỉ'],
      ['1', 'Nguyễn Minh Anh', '10/03/2018', 'Nữ', 'TP. Hồ Chí Minh', 'Nguyễn Thị Lan', '0901234567', 'Phú Nhuận, TP. Hồ Chí Minh']
    ])
    
    ws['!cols'] = [
      { wch: 5 },  // Stt
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Ngày sinh
      { wch: 10 }, // Giới tính
      { wch: 20 }, // Quê quán
      { wch: 25 }, // Họ tên phụ huynh
      { wch: 20 }, // Số điện thoại di động
      { wch: 40 }, // Địa chỉ
    ]
    
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh')

    XLSX.writeFile(wb, 'DanhSachHocSinh_Template.xlsx')
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

  if (!isLoaded || !classroom) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pb-10 scrollbar-thin">

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
          <SummaryCard
            emoji="👩‍🏫"
            label="Tổng số"
            value={students.length}
            sub="học sinh"
            color="bg-pastel-sky"
          />
          <SummaryCard
            emoji="👦"
            label="Nam"
            value={totalMale}
            sub="học sinh"
            color="bg-brand-soft"
          />
          <SummaryCard
            emoji="👧"
            label="Nữ"
            value={totalFemale}
            sub="học sinh"
            color="bg-pastel-pink"
          />
          <SummaryCard
            emoji="🏆"
            label="Đã chia tổ"
            value={`${totalAssigned}/${students.length}`}
            color="bg-pastel-yellow"
          />
        </div>

        <ClassroomCard className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, quê quán, SĐT, phụ huynh..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <ArrowUpDown className="size-3.5 shrink-0 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StudentSortOption)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="role-stt">Vai trò → STT</option>
                <option value="name-asc">Tên A → Z</option>
                <option value="name-desc">Tên Z → A</option>
                <option value="points-desc">Điểm cao → thấp</option>
                <option value="points-asc">Điểm thấp → cao</option>
                <option value="team">Theo tổ</option>
                <option value="newest">Mới thêm gần đây</option>
              </select>
            </div>

            {hasActiveFilter ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="size-3.5" />
                Xóa lọc
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="flex w-full items-center justify-between rounded-xl border border-sky-100 bg-brand-soft/50 px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Filter className="size-4 text-brand" />
              Bộ lọc nhanh
            </span>
            <ChevronDown className={`size-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {filtersOpen ? (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Filter className="size-3.5 text-slate-400" />
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="all">Tất cả giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>

              {teams.length > 0 ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <UserCheck className="size-3.5 text-slate-400" />
                  <select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">Tất cả tổ</option>
                    <option value="none">Chưa có tổ</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {classroomRoles.length > 0 ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Crown className="size-3.5 text-slate-400" />
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="none">Chưa có vai trò</option>
                    {classroomRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.icon ? `${role.icon} ` : ''}{role.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {badges.length > 0 ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Medal className="size-3.5 text-slate-400" />
                  <select
                    value={filterBadge}
                    onChange={(e) => setFilterBadge(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">Tất cả huy hiệu</option>
                    <option value="none">Chưa có huy hiệu</option>
                    {badges.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.icon ? `${badge.icon} ` : ''}{badge.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Star className="size-3.5 text-amber-500" />
                <select
                  value={filterPoints}
                  onChange={(e) => setFilterPoints(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="all">Tất cả điểm</option>
                  <option value="has">Có điểm</option>
                  <option value="none">Chưa có điểm</option>
                </select>
              </div>
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
              {filteredStudents.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  teams={teams}
                  classroomRoles={classroomRoles}
                  badges={badges}
                  onView={handleOpenDetails}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              ))}
            </div>
          </>
        )}
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
