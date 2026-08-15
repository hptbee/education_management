'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Info } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentBadges, studentHasBadge } from '@/src/utils/badges'
import { StudentSearchPicker } from '@/src/app/badges/components/student-search-picker'
import { ClassroomCard } from '@/src/components/classroom'

interface BadgeRosterSectionProps {
  initialStudentId?: string
}

export function BadgeRosterSection({ initialStudentId }: BadgeRosterSectionProps) {
  const { data, toggleStudentBadge } = useAppData()
  const searchParams = useSearchParams()

  const students = data?.students ?? []
  const badges = data?.badges ?? []

  const [selectedStudentId, setSelectedStudentId] = useState('')

  useEffect(() => {
    const fromQuery = searchParams?.get('studentId') ?? initialStudentId
    if (fromQuery && students.some((s) => s.id === fromQuery)) {
      setSelectedStudentId(fromQuery)
      return
    }
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id)
    }
  }, [searchParams, initialStudentId, students, selectedStudentId])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  )

  const awardedBadges = selectedStudent ? getStudentBadges(selectedStudent, badges) : []

  if (students.length === 0) {
    return (
      <ClassroomCard className="py-16 text-center">
        <p className="text-4xl">🧑‍🎓</p>
        <p className="mt-3 font-bold text-slate-700">Chưa có học sinh nào trong lớp</p>
        <p className="mt-1 text-sm text-slate-500">Hãy thêm học sinh trước khi trao huy hiệu.</p>
      </ClassroomCard>
    )
  }

  return (
    <ClassroomCard>
      <div className="mb-4">
        <h2 className="font-display text-lg font-extrabold text-slate-800">Huy hiệu học sinh</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Trao hoặc thu hồi huy hiệu nhanh — quản lý danh mục ở tab Danh mục
        </p>
      </div>

      <label className="mb-2 block text-sm font-bold text-slate-700">Học sinh</label>
      <StudentSearchPicker
        students={students}
        selectedStudentId={selectedStudentId}
        onSelect={setSelectedStudentId}
      />

      {selectedStudent ? (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {selectedStudent.name} — {awardedBadges.length} huy hiệu
        </p>
      ) : null}

      {badges.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-10 text-center text-sm font-semibold text-amber-800">
          Chưa có huy hiệu nào. Thêm danh hiệu ở tab Danh mục để tạo huy hiệu tương ứng.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => {
            const awarded = selectedStudent ? studentHasBadge(selectedStudent, badge.id) : false
            return (
              <button
                key={badge.id}
                type="button"
                disabled={!selectedStudent}
                onClick={() => selectedStudent && toggleStudentBadge(selectedStudent.id, badge.id)}
                className={`relative flex flex-col items-center rounded-2xl border-2 p-4 text-center transition hover:-translate-y-0.5 ${
                  awarded
                    ? 'border-amber-300 bg-gradient-to-b from-amber-50 to-yellow-50 shadow-md'
                    : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm'
                }`}
              >
                {awarded ? (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : null}
                <span className="text-4xl leading-none">{badge.icon ?? '🏅'}</span>
                <p className="mt-3 text-sm font-extrabold text-slate-800">{badge.name}</p>
                <p className={`mt-2 text-xs font-bold ${awarded ? 'text-amber-600' : 'text-slate-400'}`}>
                  {awarded ? 'Đã trao' : 'Chưa trao'}
                </p>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        Huy hiệu cập nhật ngay trên hồ sơ học sinh. Tuyên dương mới cũng có thể trao huy hiệu tự động.
      </div>
    </ClassroomCard>
  )
}
