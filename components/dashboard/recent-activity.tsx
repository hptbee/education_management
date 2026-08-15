'use client'

import { Bell } from 'lucide-react'
import { ClassroomCard } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { buildClassroomActivity } from '@/src/utils/activityHistory'
import { getStudentAvatar } from '@/src/utils/student'

const DISPLAY_COUNT = 5

export function RecentActivity() {
  const { data } = useAppData()
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
            const avatar = student ? getStudentAvatar(student) : '/placeholder.svg'
            const label = entry.subtitle
              ? `${entry.title}: ${entry.subtitle}`
              : entry.title

            return (
              <li key={entry.id} className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-2.5 py-2">
                <img
                  src={avatar}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
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
    </ClassroomCard>
  )
}
