'use client'

import { useState, useMemo } from 'react'
import { Users, Search, Plus, FileSpreadsheet, Filter } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Student } from '@/src/types/models'

import { StudentCard } from './components/student-card'
import { StudentFormModal } from './components/student-form-modal'
import { StudentDetailsModal } from './components/student-details-modal'
import { DeleteConfirmModal } from './components/delete-confirm-modal'
import { ImportModal } from './components/import-modal'

export default function StudentsPage() {
  const { classroom, database, saveStudent, deleteStudent, isLoaded } = useActiveClassroom()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('all')
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const students = database?.students || []
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Name, Phone, Hometown, Parent match
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || (
        s.name.toLowerCase().includes(q) ||
        s.hometown?.toLowerCase().includes(q) ||
        s.phoneNumber?.toLowerCase().includes(q) ||
        s.father?.fullName?.toLowerCase().includes(q) ||
        s.mother?.fullName?.toLowerCase().includes(q)
      )
      
      const matchesGender = filterGender === 'all' || s.gender === filterGender

      return matchesSearch && matchesGender
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [students, searchQuery, filterGender])

  const handleOpenAdd = () => {
    setSelectedStudent(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (s: Student) => {
    setSelectedStudent(s)
    setIsFormOpen(true)
  }

  const handleOpenDetails = (s: Student) => {
    setSelectedStudent(s)
    setIsDetailsOpen(true)
  }

  const handleOpenDelete = (s: Student) => {
    setSelectedStudent(s)
    setIsDeleteOpen(true)
  }

  const handleSaveStudent = (s: Student) => {
    saveStudent(s)
  }

  const handleDeleteConfirm = (id: string) => {
    deleteStudent(id)
  }

  const handleImportSuccess = (newStudents: Student[]) => {
    newStudents.forEach(saveStudent)
  }

  if (!isLoaded || !classroom) return null

  return (
    <div className="flex h-full flex-col p-6">
      <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <Users className="size-5" />
            </span>
            <h1 className="font-display text-2xl font-black text-slate-800">Quản lý Học sinh</h1>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {classroom.className} • Năm học {classroom.schoolYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="size-4 text-green-600" />
            Nhập Excel
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark"
          >
            <Plus className="size-4" />
            Thêm học sinh
          </button>
        </div>
      </header>

      <section className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, quê quán, sđt, tên phụ huynh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-brand-purple/50"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Filter className="size-4 text-slate-400" />
          <select 
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto pb-10 scrollbar-none">
        {filteredStudents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
            <Users className="size-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-500">Không tìm thấy học sinh nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredStudents.map((student, idx) => (
              <StudentCard
                key={student.id}
                student={student}
                index={idx}
                onView={handleOpenDetails}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}
      </div>

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
