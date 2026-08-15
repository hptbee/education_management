'use client'

import { Trophy, Star } from 'lucide-react'
import { ClassroomCard } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { formatRecognitionRelativeDate } from '@/src/utils/recognition'
import { getStudentAvatar } from '@/src/utils/student'

export function RecentPraise() {
  const { data } = useAppData()
  const recognitions = data?.recognitions ?? []
  const latest = [...recognitions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]

  const student =
    latest && data ? data.students.find((s) => s.id === latest.studentId) : undefined
  const studentName = latest?.studentName ?? student?.name ?? 'Học sinh'

  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-yellow">
          <Trophy className="size-4 text-amber-600" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Tuyên dương gần đây</h3>
      </header>

      {!latest ? (
        <p className="rounded-2xl bg-pastel-yellow/40 px-3 py-4 text-center text-xs font-semibold text-slate-400">
          Chưa có lượt tuyên dương nào.
        </p>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-pastel-yellow/70 p-3">
          <img
            src={student ? getStudentAvatar(student) : '/placeholder.svg'}
            alt={studentName}
            className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-extrabold text-slate-800">{studentName}</p>
              <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                {formatRecognitionRelativeDate(latest.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-amber-800">
              <Star className="size-3.5 fill-star text-star" />
              {latest.titleIcon ? `${latest.titleIcon} ` : ''}
              {latest.title}
            </p>
            {latest.message ? (
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{latest.message}</p>
            ) : null}
          </div>
        </div>
      )}
    </ClassroomCard>
  )
}
