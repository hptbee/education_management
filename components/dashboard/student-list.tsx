'use client'

import { useMemo, useState } from 'react'
import { Users, Search, Star, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import type { Student, Team } from '@/src/types/models'
import { ClassroomCard, EmptyState } from '@/src/components/classroom'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'

function StudentCard({
  student,
  team,
  teamIndex,
}: {
  student: Student
  team?: Team
  teamIndex: number
}) {
  const color = team ? getTeamPastelStyle(teamIndex) : null

  return (
    <Link
      href="/students"
      className="motion-safe-hover flex flex-col items-center rounded-2xl border border-sky-100 bg-white px-3 pb-3 pt-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
    >
      <img
        src={getStudentAvatar(student)}
        alt={student.name}
        className={`size-14 rounded-full object-cover ring-2 ring-offset-2 ${
          student.gender === 'female' ? 'ring-pink-200' : 'ring-sky-200'
        }`}
      />
      <p className="mt-2.5 line-clamp-2 min-h-10 text-sm font-extrabold leading-tight text-slate-800" title={student.name}>
        {student.name}
      </p>
      <span
        className={`mt-2 max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${
          color ? `${color.bg} ${color.text}` : 'bg-slate-100 text-slate-500'
        }`}
      >
        {team ? team.name : 'Chưa có tổ'}
      </span>
      <div className="mt-2.5 flex items-center gap-1 rounded-full bg-pastel-yellow/80 px-2 py-0.5 text-xs font-extrabold text-amber-800">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {student.points}
      </div>
    </Link>
  )
}

export function StudentList() {
  const { data } = useAppData()
  const [searchQuery, setSearchQuery] = useState('')
  const students = data?.students || []
  const teams = data?.teams || []

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const sorted = sortStudentsByClassroomRoleThenStt(students, students)
    if (!q) return sorted
    return sorted.filter((student) => student.name.toLowerCase().includes(q))
  }, [students, searchQuery])

  const displayedStudents = filteredStudents.slice(0, 8)

  return (
    <ClassroomCard className="flex flex-col">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-sky">
            <Users className="size-4 text-brand" />
          </span>
          <h3 className="font-display text-lg font-extrabold text-slate-800">Danh sách học sinh</h3>
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-extrabold text-brand-dark">
          {students.length}
        </span>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm học sinh..."
          className="classroom-field py-2.5 pl-9 pr-10"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Xóa tìm kiếm"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {displayedStudents.length === 0 ? (
        <EmptyState
          compact
          emoji={searchQuery ? '🔍' : '🌱'}
          title={searchQuery ? 'Không tìm thấy học sinh' : 'Chưa có học sinh nào'}
          description={
            searchQuery
              ? 'Thử thay đổi từ khóa tìm kiếm.'
              : 'Thêm học sinh đầu tiên để bắt đầu xây dựng lớp học nhé!'
          }
          action={
            !searchQuery ? (
              <Link
                href="/students"
                className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
              >
                + Thêm học sinh
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {displayedStudents.map((student) => {
            const teamIdx = teams.findIndex((t) => t.id === student.teamId)
            return (
              <StudentCard
                key={student.id}
                student={student}
                team={teamIdx >= 0 ? teams[teamIdx] : undefined}
                teamIndex={Math.max(0, teamIdx)}
              />
            )
          })}
        </div>
      )}

      <Link
        href="/students"
        className="mt-4 flex items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark"
      >
        Xem tất cả học sinh
        <ArrowRight className="size-4" />
      </Link>
    </ClassroomCard>
  )
}
