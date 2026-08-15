'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Info, Medal } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { getStudentBadges, studentHasBadge } from '@/src/utils/badges'
import { BadgeCatalogSection } from './components/badge-catalog-section'
import { StudentSearchPicker } from './components/student-search-picker'

export default function BadgesPage() {
  const { data, toggleStudentBadge } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const searchParams = useSearchParams()

  const students = data?.students ?? []
  const badges = data?.badges ?? []

  const [selectedStudentId, setSelectedStudentId] = useState('')

  useEffect(() => {
    const fromQuery = searchParams?.get('studentId')
    if (fromQuery && students.some((s) => s.id === fromQuery)) {
      setSelectedStudentId(fromQuery)
      return
    }
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id)
    }
  }, [searchParams, students, selectedStudentId])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  )

  const awardedBadges = selectedStudent ? getStudentBadges(selectedStudent, badges) : []

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
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Medal className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black text-slate-800">Kho huy hiệu</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Trao hoặc thu hồi huy hiệu nhanh cho từng học sinh
            </p>
          </div>
        </header>

        {students.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
            <p className="text-4xl">🧑‍🎓</p>
            <p className="mt-3 font-bold text-slate-700">Chưa có học sinh nào trong lớp</p>
            <p className="mt-1 text-sm text-slate-500">Hãy thêm học sinh trước khi trao huy hiệu.</p>
          </div>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                Chưa có huy hiệu nào. Thêm huy hiệu trong phần quản lý danh mục bên dưới.
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
              Huy hiệu sẽ được cập nhật ngay lập tức trong hồ sơ học sinh
            </div>
          </section>
        )}

        <BadgeCatalogSection />
      </div>
    </div>
  )
}
