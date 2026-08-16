'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Info } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentBadges } from '@/src/utils/badges'
import { StudentSearchPicker } from '@/src/app/badges/components/student-search-picker'
import { ClassroomCard } from '@/src/components/classroom'
import { BadgeToggleGrid } from './badge-toggle-grid'

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
    <ClassroomCard id="badge-roster-section">
      <div className="mb-4">
        <h2 className="font-display text-lg font-extrabold text-slate-800">Trao huy hiệu học sinh</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Bật hoặc tắt huy hiệu cho từng học sinh — mỗi danh hiệu ở trên tự có huy hiệu đôi
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

      <div className="mt-6">
        <BadgeToggleGrid
          badges={badges}
          student={selectedStudent}
          onToggle={(badgeId) => {
            if (selectedStudent) toggleStudentBadge(selectedStudent.id, badgeId)
          }}
        />
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        Huy hiệu cập nhật ngay trên hồ sơ học sinh. Tuyên dương mới cũng có thể trao huy hiệu tự động.
      </div>
    </ClassroomCard>
  )
}
