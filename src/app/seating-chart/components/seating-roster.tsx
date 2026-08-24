'use client'

import type { Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { getWheelDisplayName } from '@/src/utils/wheelSpin'
import { sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const DRAG_TYPE = 'application/x-seating-student'

interface SeatingRosterProps {
  students: Student[]
  roster: Student[]
  classroomId?: string
  selectedStudentId: string | null
  onSelectStudent: (studentId: string | null) => void
  onDropToUnassigned: (studentId: string) => void
  focusToken?: number
  readOnly?: boolean
}

export function SeatingRoster({
  students,
  roster,
  classroomId,
  selectedStudentId,
  onSelectStudent,
  onDropToUnassigned,
  focusToken = 0,
  readOnly = false,
}: SeatingRosterProps) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusToken <= 0) return
    searchRef.current?.focus()
  }, [focusToken])

  const unassigned = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, roster),
    [students, roster],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return unassigned
    return unassigned.filter((student) => student.name.toLowerCase().includes(q))
  }, [unassigned, query])

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-72">
      <div>
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-brand-purple">
          Học sinh chưa xếp
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">{unassigned.length} học sinh</p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm học sinh..."
          disabled={readOnly}
          className="classroom-search-field w-full rounded-xl pl-9"
        />
      </label>

      <div
        className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin"
        onDragOver={(event) => {
          if (readOnly) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(event) => {
          if (readOnly) return
          event.preventDefault()
          const studentId = event.dataTransfer.getData(DRAG_TYPE)
          if (studentId) onDropToUnassigned(studentId)
        }}
      >
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-400">
            {unassigned.length === 0 ? 'Tất cả học sinh đã có chỗ.' : 'Không tìm thấy học sinh'}
          </p>
        ) : (
          filtered.map((student) => {
            const selected = selectedStudentId === student.id
            return (
              <button
                key={student.id}
                type="button"
                draggable={!readOnly}
                onDragStart={(event) => {
                  if (readOnly) return
                  event.dataTransfer.setData(DRAG_TYPE, student.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => {
                  if (readOnly) return
                  onSelectStudent(selected ? null : student.id)
                }}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
                  selected
                    ? 'bg-pastel-pink ring-2 ring-accent-pink/50'
                    : 'bg-slate-50 hover:bg-pastel-sky/40'
                }`}
                aria-pressed={selected}
              >
                <StudentAvatar
                  student={student}
                  classroomId={classroomId}
                  alt={student.name}
                  className="size-9 shrink-0 rounded-full ring-2 ring-white"
                />
                <span className="min-w-0 truncate text-sm font-bold text-slate-700">
                  {getWheelDisplayName(student.name)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}

export { DRAG_TYPE }
