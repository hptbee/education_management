'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Settings } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'

function formatClassLabel(className?: string) {
  const name = className?.trim()
  if (!name) return 'Lớp'
  if (/^lớp\b/i.test(name)) return name
  return `Lớp ${name}`
}

function formatSchoolYear(schoolYear?: string) {
  const year = schoolYear?.trim()
  if (!year) return 'Năm học'
  if (/^năm học\b/i.test(year)) return year
  return `Năm học ${year}`
}

function ClassAvatar({ src, label }: { src?: string; label: string }) {
  const [broken, setBroken] = useState(false)
  const resolved = src?.trim() || '/class-photo.png'

  useEffect(() => {
    setBroken(false)
  }, [resolved])

  if (broken) {
    return (
      <div
        className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pastel-sky to-pastel-pink text-brand shadow-sm ring-2 ring-white"
        aria-hidden
      >
        <GraduationCap className="size-6" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={label}
      onError={() => setBroken(true)}
      className="size-12 shrink-0 rounded-2xl object-cover shadow-sm ring-2 ring-white"
    />
  )
}

export function SidebarClassContext() {
  const { classroom, teacher } = useActiveClassroom()

  const classLabel = formatClassLabel(classroom?.className)
  const teacherName = teacher?.name?.trim() || 'Giáo viên'
  const schoolYearLabel = formatSchoolYear(classroom?.schoolYear)
  const avatarSrc = classroom?.classAvatar?.trim() || undefined

  return (
    <div className="px-4 pb-4">
      <div className="rounded-2xl border border-sky-100 bg-white/80 px-3 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <ClassAvatar src={avatarSrc} label={classLabel} />
          <div className="min-w-0">
            <p className="font-display truncate text-sm font-extrabold leading-tight text-slate-800" title={classLabel}>
              {classLabel}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500" title={teacherName}>
              {teacherName}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400" title={schoolYearLabel}>
              {schoolYearLabel}
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-pastel-sky/80 px-2 py-1.5 text-[11px] font-bold text-brand-dark transition hover:bg-brand/15"
        >
          <Settings className="size-3" />
          Quản lý lớp
        </Link>
      </div>
    </div>
  )
}
