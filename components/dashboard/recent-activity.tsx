'use client'

import Link from 'next/link'
import { ArrowRight, Bell } from 'lucide-react'
import { ClassroomCard } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { buildClassroomActivity } from '@/src/utils/activityHistory'
import { StudentAvatar } from '@/src/components/StudentAvatar'

const DISPLAY_COUNT = 5

export function RecentActivity() {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const entries = data ? buildClassroomActivity(data).slice(0, DISPLAY_COUNT) : []

  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-sky">
          <Bell className="size-4 text-brand" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Hoạt động gần đây</h3>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-2xl bg-slate-50/80 px-3 py-4 text-center text-xs font-semibold text-slate-400">
          Chưa có hoạt động nào trong lớp.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const student =
              entry.studentId && data
                ? data.students.find((s) => s.id === entry.studentId)
                : undefined
            const label = entry.subtitle
              ? `${entry.title}: ${entry.subtitle}`
              : entry.title

            return (
              <li key={entry.id} className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-2.5 py-2">
                {student ? (
                  <StudentAvatar
                    student={student}
                    classroomId={classroomId}
                    alt=""
                    className="size-9 shrink-0 rounded-full ring-2 ring-white"
                  />
                ) : (
                  <img
                    src="/placeholder.svg"
                    alt=""
                    className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                  />
                )}
                <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-slate-600">{label}</p>
                {entry.points !== undefined && entry.points !== 0 ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                      entry.points > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <Link
        href="/history"
        className="mt-4 flex min-h-11 items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg"
      >
        Xem lịch sử
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </ClassroomCard>
  )
}
