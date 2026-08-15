'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Search, Star, X } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import type { Student } from '@/src/types/models'
import { StudentPointsDialog, type PointsDialogMode } from './components/student-points-dialog'
import { PointActionsCatalogSection } from './components/point-actions-catalog-section'

const RECENT_HISTORY_LIMIT = 8

export default function PointsPage() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogStudent, setDialogStudent] = useState<Student | null>(null)
  const [dialogMode, setDialogMode] = useState<PointsDialogMode>('add')

  const students = data?.students ?? []
  const pointHistory = data?.pointHistory ?? []

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedStudents
    return sortedStudents.filter((student) => student.name.toLowerCase().includes(q))
  }, [sortedStudents, searchQuery])

  const recentHistory = useMemo(() => {
    return pointHistory.slice(0, RECENT_HISTORY_LIMIT).map((entry) => {
      const student = students.find((s) => s.id === entry.studentId)
      return { ...entry, studentName: student?.name ?? 'Học sinh' }
    })
  }, [pointHistory, students])

  const openDialog = (student: Student, mode: PointsDialogMode) => {
    setDialogStudent(student)
    setDialogMode(mode)
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-gray-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-5">
        <header className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg">
            <Star className="size-6 fill-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black text-slate-800">Tích điểm</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cộng hoặc trừ điểm nhanh cho từng học sinh
            </p>
          </div>
        </header>

        {students.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
            <p className="text-4xl">🧑‍🎓</p>
            <p className="mt-3 font-bold text-slate-700">Chưa có học sinh nào trong lớp</p>
            <p className="mt-1 text-sm text-slate-500">Hãy thêm học sinh trước khi tích điểm.</p>
          </div>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            {filteredStudents.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">Không tìm thấy học sinh</p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <img
                      src={getStudentAvatar(student)}
                      alt={student.name}
                      className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-slate-800">{student.name}</p>
                      <p className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {student.points} điểm
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openDialog(student, 'add')}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
                      >
                        <Plus className="size-3.5" /> Cộng điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => openDialog(student, 'subtract')}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
                      >
                        <Minus className="size-3.5" /> Trừ điểm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {recentHistory.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-black text-slate-800">Hoạt động gần đây</h2>
            <p className="mb-4 text-sm font-semibold text-slate-500">8 lần cộng/trừ điểm mới nhất</p>
            <div className="flex flex-col gap-2">
              {recentHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{entry.studentName}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{entry.actionName}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                      entry.points > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <PointActionsCatalogSection />
      </div>

      <StudentPointsDialog
        student={dialogStudent}
        mode={dialogMode}
        isOpen={dialogStudent !== null}
        onClose={() => setDialogStudent(null)}
      />
    </div>
  )
}
