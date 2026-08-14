'use client'

import { useState, useMemo } from 'react'
import {
  Users, Search, Plus, FileSpreadsheet, Download,
  Filter, X, GraduationCap, UserCheck,
} from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Student } from '@/src/types/models'
import * as XLSX from 'xlsx'

import { StudentCard } from './components/student-card'
import { StudentFormModal } from './components/student-form-modal'
import { StudentDetailsModal } from './components/student-details-modal'
import { DeleteConfirmModal } from './components/delete-confirm-modal'
import { ImportModal } from './components/import-modal'

// ─── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({
  emoji, label, value, sub, color,
}: { emoji: string; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`relative flex flex-1 min-w-[120px] flex-col items-center justify-center overflow-hidden rounded-2xl p-4 text-center ${color}`}>
      <span className="text-2xl leading-none">{emoji}</span>
      <p className="mt-1.5 text-2xl font-black leading-none text-slate-800">{value}</p>
      {sub && <p className="text-[11px] font-bold text-slate-500">{sub}</p>}
      <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-tight">{label}</p>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({
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
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <div className="mb-4 text-5xl leading-none select-none">🔍</div>
        <p className="text-base font-bold text-slate-700">Không tìm thấy học sinh nào</p>
        <p className="mt-1 text-sm font-semibold text-slate-400">Thử thay đổi từ khóa hoặc bỏ bộ lọc</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-purple/20 bg-gradient-to-b from-brand-purple/5 to-transparent px-8 py-16 text-center">
      {/* Decorative illustration */}
      <div className="mb-5 flex items-end justify-center gap-1 leading-none select-none">
        <span className="text-5xl animate-[bounce_2s_ease-in-out_infinite]">🧒</span>
        <span className="text-4xl animate-[bounce_2s_ease-in-out_0.3s_infinite]">👧</span>
        <span className="text-5xl animate-[bounce_2s_ease-in-out_0.6s_infinite]">👦</span>
      </div>

      <h3 className="font-display text-xl font-black text-slate-700">
        Lớp mình chưa có học sinh nào!
      </h3>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-relaxed text-slate-500">
        Hãy thêm học sinh đầu tiên hoặc nhập danh sách từ file Excel nhé 📋
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-2xl bg-brand-purple px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-purple-dark hover:shadow-brand-purple/30"
        >
          <Plus className="size-4" />
          Thêm học sinh
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <FileSpreadsheet className="size-4 text-green-600" />
          Nhập Excel
        </button>
        <button
          onClick={onDownloadTemplate}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-purple/70 underline underline-offset-2 transition hover:text-brand-purple"
        >
          <Download className="size-3.5" />
          Tải file mẫu
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { classroom, database, saveStudent, deleteStudent, isLoaded } = useActiveClassroom()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const students = database?.students || []
  const teams = database?.teams || []

  // ── Summary stats
  const totalMale = students.filter(s => s.gender === 'male').length
  const totalFemale = students.filter(s => s.gender === 'female').length
  const totalAssigned = students.filter(s => !!s.teamId).length

  // ── Filtered list
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.hometown?.toLowerCase().includes(q) ||
          s.parent?.fullName?.toLowerCase().includes(q) ||
          s.parent?.phoneNumber?.toLowerCase().includes(q) ||
          s.parent?.zalo?.toLowerCase().includes(q)

        const matchesGender = filterGender === 'all' || s.gender === filterGender
        const matchesTeam =
          filterTeam === 'all' ||
          (filterTeam === 'none' ? !s.teamId : s.teamId === filterTeam)

        return matchesSearch && matchesGender && matchesTeam
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [students, searchQuery, filterGender, filterTeam])

  const hasActiveFilter =
    searchQuery !== '' || filterGender !== 'all' || filterTeam !== 'all'

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
      ['Họ và tên', 'Ngày sinh', 'Giới tính', 'Quê quán', 'Họ tên phụ huynh', 'Năm sinh phụ huynh', 'SĐT phụ huynh', 'Zalo phụ huynh'],
      ['Nguyễn Văn A', '10/03/2018', 'Nam', 'Hà Nội', 'Nguyễn Văn B', '1990', '0901234567', '0901234567']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh')
    
    const wsGuide = XLSX.utils.aoa_to_sheet([
      ['Hướng dẫn nhập liệu'],
      [''],
      ['Cột', 'Yêu cầu', 'Ví dụ'],
      ['Họ và tên', 'Bắt buộc. Tên đầy đủ của học sinh.', 'Nguyễn Văn A'],
      ['Ngày sinh', 'Tuỳ chọn. Định dạng ngày/tháng/năm.', '10/03/2018'],
      ['Giới tính', 'Tuỳ chọn. Nam hoặc Nữ.', 'Nam'],
      ['Quê quán', 'Tuỳ chọn.', 'Hà Nội'],
      ['Họ tên phụ huynh', 'Tuỳ chọn.', 'Nguyễn Văn B'],
      ['Năm sinh phụ huynh', 'Tuỳ chọn.', '1990'],
      ['SĐT phụ huynh', 'Tuỳ chọn. Bắt đầu bằng số 0.', '0901234567'],
      ['Zalo phụ huynh', 'Tuỳ chọn.', '0901234567'],
    ])
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng dẫn')

    XLSX.writeFile(wb, 'DanhSachHocSinh_Template.xlsx')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterGender('all')
    setFilterTeam('all')
  }

  if (!isLoaded || !classroom) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pb-10 scrollbar-thin">

        {/* ── HEADER ── */}
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
          {/* Left: title + identity */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10">
                <GraduationCap className="size-5 text-brand-purple" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-black leading-tight text-slate-800">
                  Quản lý Học sinh
                </h1>
                <p className="text-xs font-semibold text-slate-400">
                  Quản lý danh sách học sinh của lớp
                </p>
              </div>
            </div>

            {/* Classroom identity badge */}
            <div className="ml-12 mt-1 flex items-center gap-2">
              {classroom.classAvatar ? (
                <img
                  src={classroom.classAvatar}
                  alt={classroom.className}
                  className="size-6 rounded-full object-cover ring-1 ring-brand-purple/20"
                />
              ) : (
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-purple/10 text-xs">
                  🏫
                </span>
              )}
              <span className="text-sm font-bold text-slate-700">
                {classroom.className}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-semibold text-slate-500">
                Năm học {classroom.schoolYear}
              </span>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Tải file Excel mẫu"
            >
              <Download className="size-4 text-slate-400" />
              <span className="hidden sm:inline">Tải file mẫu</span>
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <FileSpreadsheet className="size-4 text-green-600" />
              Nhập Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-purple/20 transition hover:bg-brand-purple-dark"
            >
              <Plus className="size-4" />
              Thêm học sinh
            </button>
          </div>
        </header>

        {/* ── SUMMARY CARDS ── */}
        <div className="flex flex-wrap gap-3">
          <SummaryCard
            emoji="👩‍🏫"
            label="Tổng số học sinh"
            value={students.length}
            sub="học sinh"
            color="bg-brand-purple/5 border border-brand-purple/10"
          />
          <SummaryCard
            emoji="👦"
            label="Học sinh Nam"
            value={totalMale}
            color="bg-sky-50 border border-sky-100"
          />
          <SummaryCard
            emoji="👧"
            label="Học sinh Nữ"
            value={totalFemale}
            color="bg-pink-50 border border-pink-100"
          />
          <SummaryCard
            emoji="🏆"
            label="Đã chia tổ"
            value={`${totalAssigned} / ${students.length}`}
            color="bg-amber-50 border border-amber-100"
          />
        </div>

        {/* ── SEARCH + FILTER TOOLBAR ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="student-search"
                placeholder="Tìm học sinh theo tên, quê quán, sđt, phụ huynh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-purple/40 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Gender filter */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Filter className="size-3.5 text-slate-400" />
              <select
                id="filter-gender"
                value={filterGender}
                onChange={e => setFilterGender(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="all">Tất cả giới tính</option>
                <option value="male">👦 Nam</option>
                <option value="female">👧 Nữ</option>
              </select>
            </div>

            {/* Team filter — only shown when teams exist */}
            {teams.length > 0 && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <UserCheck className="size-3.5 text-slate-400" />
                <select
                  id="filter-team"
                  value={filterTeam}
                  onChange={e => setFilterTeam(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="all">Tất cả tổ</option>
                  <option value="none">Chưa có tổ</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear filters */}
            {hasActiveFilter && (
              <button
                onClick={handleClearFilters}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="size-3.5" />
                Xóa lọc
              </button>
            )}
          </div>

          {/* Result count */}
          {hasActiveFilter && (
            <p className="mt-2 px-1 text-xs font-semibold text-slate-400">
              Hiển thị {filteredStudents.length} / {students.length} học sinh
            </p>
          )}
        </div>

        {/* ── STUDENT GRID / EMPTY STATE ── */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            filtered={hasActiveFilter}
            onAdd={handleOpenAdd}
            onImport={() => setIsImportOpen(true)}
            onDownloadTemplate={handleDownloadTemplate}
          />
        ) : (
          <>
            {/* Count label */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500">
                <span className="text-brand-purple">{filteredStudents.length}</span> học sinh
                {hasActiveFilter && ' (đã lọc)'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredStudents.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  teams={teams}
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
