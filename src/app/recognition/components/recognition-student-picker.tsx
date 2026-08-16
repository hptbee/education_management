'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { ClassroomRole, Student, Team } from '@/src/types/models'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { IconTouchButton } from '@/src/components/classroom'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'

interface RecognitionStudentPickerProps {
  students: Student[]
  teams: Team[]
  classroomRoles: ClassroomRole[]
  mode: 'single' | 'multiple'
  onModeChange: (mode: 'single' | 'multiple') => void
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function RecognitionStudentPicker({
  students,
  teams,
  classroomRoles,
  mode,
  onModeChange,
  selectedIds,
  onChange,
}: RecognitionStudentPickerProps) {
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

  const selectedStudents = useMemo(
    () => selectedIds.map((id) => students.find((s) => s.id === id)).filter((s): s is Student => Boolean(s)),
    [selectedIds, students],
  )

  const toggleStudent = (studentId: string) => {
    if (mode === 'single') {
      onChange([studentId])
      return
    }
    if (selectedIds.includes(studentId)) {
      onChange(selectedIds.filter((id) => id !== studentId))
    } else {
      onChange([...selectedIds, studentId])
    }
  }

  const removeStudent = (studentId: string) => {
    onChange(selectedIds.filter((id) => id !== studentId))
  }

  const getTeamName = (teamId?: string) => teams.find((t) => t.id === teamId)?.name

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onModeChange('single')
            onChange(selectedIds.slice(0, 1))
          }}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            mode === 'single'
              ? 'bg-brand text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-sky-100 hover:bg-brand-soft'
          }`}
        >
          Một học sinh
        </button>
        <button
          type="button"
          onClick={() => onModeChange('multiple')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            mode === 'multiple'
              ? 'bg-brand text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-sky-100 hover:bg-brand-soft'
          }`}
        >
          Nhiều học sinh
        </button>
      </div>

      {selectedStudents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map((student) => (
            <span
              key={student.id}
              className="inline-flex items-center gap-2 rounded-2xl bg-pastel-pink px-3 py-1.5 text-sm font-bold text-slate-800 ring-1 ring-accent-pink/30"
            >
              <img
                src={getStudentAvatar(student)}
                alt=""
                className="size-6 rounded-full object-cover ring-1 ring-white"
              />
              {student.name}
              {mode === 'multiple' ? (
                <button
                  type="button"
                  onClick={() => removeStudent(student.id)}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-rose-500"
                  aria-label={`Bỏ chọn ${student.name}`}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

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
              const isSelected = selectedIds.includes(student.id)
              const team = teams.find((t) => t.id === student.teamId)
              const teamIndex = team ? teams.findIndex((t) => t.id === team.id) : 0
              const teamStyle = getTeamPastelStyle(teamIndex)
              const roles = getStudentClassroomRoles(student, classroomRoles)

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'bg-pastel-pink ring-2 ring-accent-pink/50'
                      : 'bg-white hover:bg-brand-soft'
                  }`}
                >
                  <img
                    src={getStudentAvatar(student)}
                    alt={student.name}
                    className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-800">{student.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {team ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${teamStyle.badge}`}>
                          {team.name}
                        </span>
                      ) : null}
                      <ClassroomRoleBadges roles={roles} size="sm" className="justify-start" />
                    </div>
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
