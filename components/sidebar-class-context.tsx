'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Plus, School } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { useClassroomList } from '@/src/hooks/useClassroomList'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { formatClassLabel } from '@/src/utils/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { cn } from '@/lib/utils'

function formatSchoolYear(schoolYear?: string) {
  const year = schoolYear?.trim()
  if (!year) return ''
  if (/^năm học\b/i.test(year)) return year
  return `Năm học ${year}`
}

export function SidebarClassContext() {
  const pathname = usePathname() ?? ''
  const { classroom, teacher, database } = useActiveClassroom()
  const { switchDatabase } = useAppData()
  const { classrooms, refresh } = useClassroomList()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const teacherName = teacher?.name?.trim() || 'Giáo viên'
  const classLabel = classroom ? formatClassLabel(classroom.className) : 'Chưa chọn lớp'
  const schoolYearLabel = classroom ? formatSchoolYear(classroom.schoolYear) : ''
  const isClassrooms = pathname === '/classrooms' || pathname.startsWith('/classrooms/')

  const activeClassrooms = useMemo(() => classrooms.filter((item) => !item.archived), [classrooms])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const handleSwitch = async (id: string) => {
    setSwitching(true)
    setOpen(false)
    try {
      await switchDatabase(id)
      refresh()
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0 px-3 pt-4 pb-2">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={switching}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left shadow-sm transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          open || isClassrooms
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
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-600" title={classLabel}>
            {classLabel}
          </p>
          {schoolYearLabel ? (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400" title={schoolYearLabel}>
              {schoolYearLabel}
            </p>
          ) : null}
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-slate-300 transition', open && 'rotate-180')} aria-hidden />
        <span className="sr-only">Chuyển lớp học</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-3 right-3 top-full z-50 mt-1 rounded-2xl border border-sky-100 bg-white p-1 shadow-lg"
        >
          <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Lớp đang hoạt động
          </p>
          {activeClassrooms.length === 0 ? (
            <p className="px-3 pb-2 text-xs font-semibold text-slate-500">Chưa có lớp nào</p>
          ) : (
            activeClassrooms.map((item) => {
              const isCurrent = item.id === database?.metadata.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition hover:bg-surface-soft',
                    isCurrent && 'bg-brand-soft/40 text-brand-dark',
                  )}
                  onClick={() => {
                    if (!isCurrent) {
                      void handleSwitch(item.id)
                    } else {
                      setOpen(false)
                    }
                  }}
                >
                  <span className="truncate">
                    {item.className} · {item.schoolYear}
                  </span>
                  {isCurrent ? (
                    <span className="shrink-0 text-[10px] font-extrabold uppercase text-brand">Đang mở</span>
                  ) : null}
                </button>
              )
            })
          )}
          <div className="my-1 border-t border-sky-100" />
          <Link
            href="/classrooms?create=1"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-surface-soft"
            onClick={() => setOpen(false)}
          >
            <Plus className="size-4 text-brand" />
            Thêm lớp mới
          </Link>
          <Link
            href="/classrooms"
            role="menuitem"
            aria-current={isClassrooms ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-surface-soft',
              isClassrooms && 'bg-brand-soft/30 text-brand-dark',
            )}
            onClick={() => setOpen(false)}
          >
            <School className="size-4" />
            Quản lý lớp
          </Link>
        </div>
      ) : null}
    </div>
  )
}
