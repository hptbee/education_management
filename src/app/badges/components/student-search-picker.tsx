'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { IconTouchButton } from '@/src/components/classroom'

interface StudentSearchPickerProps {
  students: Student[]
  selectedStudentId: string
  onSelect: (studentId: string) => void
}

export function StudentSearchPicker({ students, selectedStudentId, onSelect }: StudentSearchPickerProps) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const [searchQuery, setSearchQuery] = useState('')

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedStudents
    return sortedStudents.filter((student) => student.name.toLowerCase().includes(q))
  }, [sortedStudents, searchQuery])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm học sinh theo tên..."
          className="classroom-search-field rounded-2xl py-2.5"
        />
        {searchQuery ? (
          <IconTouchButton
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Xóa tìm kiếm"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="size-4" />
          </IconTouchButton>
        ) : null}
      </div>

      <div className="max-h-56 overflow-y-auto rounded-2xl border border-sky-100 bg-slate-50/70 p-2 scrollbar-thin">
        {filteredStudents.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-slate-400">
            {searchQuery ? 'Không tìm thấy học sinh' : 'Chưa có học sinh'}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredStudents.map((student) => {
              const isSelected = student.id === selectedStudentId
              const badgeCount = (student.badgeIds ?? []).length
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => onSelect(student.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'bg-pastel-pink ring-2 ring-accent-pink/50'
                      : 'bg-white hover:bg-brand-soft'
                  }`}
                >
                  <StudentAvatar
                    student={student}
                    classroomId={classroomId}
                    alt={student.name}
                    className="size-9 shrink-0 rounded-full ring-2 ring-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-800">{student.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{badgeCount} huy hiệu</p>
                  </div>
                  {isSelected ? (
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      Đang chọn
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
