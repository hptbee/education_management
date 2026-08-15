'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, Search, Star, X } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import type { Student } from '@/src/types/models'
import { StudentPointsDialog, type PointsDialogMode } from './components/student-points-dialog'
import { PointActionsCatalogSection } from './components/point-actions-catalog-section'
import { PageHeader, ClassroomCard, EmptyState } from '@/src/components/classroom'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'

const RECENT_HISTORY_LIMIT = 8

export default function PointsPage() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogStudent, setDialogStudent] = useState<Student | null>(null)
  const [dialogMode, setDialogMode] = useState<PointsDialogMode>('add')

  const students = data?.students ?? []
  const teams = data?.teams ?? []
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
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <PageHeader
          icon={Star}
          title="Tích điểm"
          subtitle="Cộng hoặc trừ điểm nhanh cho từng học sinh"
          iconClassName="from-amber-400 to-yellow-500"
        />

        {students.length === 0 ? (
          <EmptyState
            emoji="🧑‍🎓"
            title="Chưa có học sinh nào trong lớp"
            description="Hãy thêm học sinh trước khi tích điểm."
          />
        ) : (
          <ClassroomCard>
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên..."
                className="classroom-search-field rounded-2xl py-2.5"
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
                {filteredStudents.map((student) => {
                  const teamIdx = teams.findIndex((t) => t.id === student.teamId)
                  const team = teamIdx >= 0 ? teams[teamIdx] : undefined
                  const teamColor = team ? getTeamPastelStyle(teamIdx) : null

                  return (
                    <div
                      key={student.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white px-3 py-2.5"
                    >
                      <img
                        src={getStudentAvatar(student)}
                        alt={student.name}
                        className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold text-slate-800">{student.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-pastel-yellow px-2 py-0.5 text-xs font-extrabold text-amber-800">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {student.points}
                          </span>
                          {team && teamColor ? (
                            <span className={`truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${teamColor.badge}`}>
                              {team.name}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                              Chưa có tổ
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openDialog(student, 'add')}
                          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-200"
                        >
                          <Plus className="size-3.5" /> Cộng
                        </button>
                        <button
                          type="button"
                          onClick={() => openDialog(student, 'subtract')}
                          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-pastel-pink px-3.5 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-100"
                        >
                          <Minus className="size-3.5" /> Trừ
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ClassroomCard>
        )}

        {recentHistory.length > 0 ? (
          <ClassroomCard>
            <h2 className="font-display text-lg font-black text-slate-800">Hoạt động gần đây</h2>
            <p className="mb-4 text-sm font-semibold text-slate-500">8 lần cộng/trừ điểm mới nhất</p>
            <div className="flex flex-col gap-2">
              {recentHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-sky-50 bg-slate-50/80 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{entry.studentName}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{entry.actionName}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                      entry.points > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-pastel-pink text-rose-800'
                    }`}
                  >
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          </ClassroomCard>
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
