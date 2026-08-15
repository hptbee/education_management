'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { formatClassLabel } from '@/src/utils/classroom'
import { cn } from '@/lib/utils'

function formatSchoolYear(schoolYear?: string) {
  const year = schoolYear?.trim()
  if (!year) return ''
  if (/^năm học\b/i.test(year)) return year
  return `Năm học ${year}`
}

export function SidebarClassContext() {
  const pathname = usePathname()
  const { classroom, teacher } = useActiveClassroom()

  const teacherName = teacher?.name?.trim() || 'Giáo viên'
  const classLabel = classroom ? formatClassLabel(classroom.className) : ''
  const schoolYearLabel = classroom ? formatSchoolYear(classroom.schoolYear) : ''
  const isSettings = pathname === '/settings' || pathname.startsWith('/settings/')

  return (
    <div className="shrink-0 px-3 pt-4 pb-2">
      <Link
        href="/settings"
        aria-current={isSettings ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 shadow-sm transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          isSettings
            ? 'border-brand/25 bg-white'
            : 'border-sky-100 bg-white/80 hover:border-brand/20 hover:bg-white',
        )}
      >
        <TeacherAvatar
          src={teacher?.avatar}
          name={teacherName}
          className="size-16 shrink-0 rounded-2xl text-3xl shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-sm font-extrabold leading-tight text-slate-800" title={teacherName}>
            {teacherName}
          </p>
          {classLabel ? (
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600" title={classLabel}>
              {classLabel}
            </p>
          ) : null}
          {schoolYearLabel ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400" title={schoolYearLabel}>
              {schoolYearLabel}
            </p>
          ) : null}
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
        <span className="sr-only">Quản lý lớp</span>
      </Link>
    </div>
  )
}
