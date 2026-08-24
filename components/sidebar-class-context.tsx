'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Plus, School } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { useClassroomList } from '@/src/hooks/useClassroomList'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { formatClassLabel } from '@/src/utils/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { cn } from '@/lib/utils'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { motionTransition, popoverVariants, reducedMotionTransition } from '@/src/utils/motion'

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
  const switcherLabel = [teacherName, classLabel, schoolYearLabel].filter(Boolean).join('. ')
  const isClassrooms = pathname === '/classrooms' || pathname.startsWith('/classrooms/')

  const activeClassrooms = useMemo(() => classrooms.filter((item) => !item.archived), [classrooms])
  const motionEnabled = useMotionEnabled()
  const popoverTransition = motionEnabled ? motionTransition('fast') : reducedMotionTransition()

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
    <div ref={containerRef} className="relative shrink-0 px-3 pt-3 pb-2">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${switcherLabel}. Chuyển lớp học`}
        disabled={switching}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left shadow-sm transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          open || isClassrooms
            ? 'border-brand/25 bg-white'
            : 'border-sky-100 bg-white/80 hover:border-brand/20 hover:bg-white',
        )}
      >
        <TeacherAvatar
          assetKey={teacher?.avatarAssetKey}
          classroomId={database?.metadata.id}
          name={teacherName}
          className="size-[72px] shrink-0 rounded-2xl text-4xl shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold leading-snug text-slate-800" title={teacherName}>
            {teacherName}
          </p>
          <p className="mt-0.5 text-xs font-bold leading-snug text-slate-600">{classLabel}</p>
          {schoolYearLabel ? (
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-500">{schoolYearLabel}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-slate-400 transition', open && 'rotate-180 text-brand')}
          aria-hidden
        />
      </button>

      <AnimatePresence>
      {open ? (
        <motion.div
          role="menu"
          initial={motionEnabled ? 'initial' : false}
          animate="animate"
          exit="exit"
          variants={popoverVariants}
          transition={popoverTransition}
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
                  <span className="min-w-0 truncate">
                    {item.className} · {item.schoolYear}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.hydrated === false ? (
                      <span className="text-[10px] font-extrabold uppercase text-amber-700">Chưa tải về</span>
                    ) : null}
                    {isCurrent ? (
                      <span className="text-[10px] font-extrabold uppercase text-brand">Đang mở</span>
                    ) : null}
                  </span>
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
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  )
}
