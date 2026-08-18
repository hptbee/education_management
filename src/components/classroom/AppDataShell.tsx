'use client'

import { useEffect, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomButton } from './ClassroomButton'
import { ClassroomSkeleton } from './ClassroomSkeleton'

const NO_CLASS_ROUTES = ['/settings', '/classrooms'] as const

function isNoClassRoute(pathname: string) {
  return NO_CLASS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function InitErrorBanner({ onRetry }: { onRetry: () => void }) {
  const { initError } = useAppData()
  if (!initError) return null

  return (
    <div className="border-b border-rose-200 bg-rose-50 px-5 py-3">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-rose-700">
          Không thể khởi tạo dữ liệu: {initError}
        </p>
        <ClassroomButton variant="outline" onClick={() => void onRetry()}>
          Thử lại
        </ClassroomButton>
      </div>
    </div>
  )
}

export function AppDataShell({ children }: { children: ReactNode }) {
  const { data, isLoading, initError, retryInit } = useAppData()
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const allowWithoutClass = isNoClassRoute(pathname)

  useEffect(() => {
    if (isLoading || initError || data || allowWithoutClass) return
    router.replace('/classrooms')
  }, [data, initError, isLoading, allowWithoutClass, router])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ClassroomSkeleton />
      </div>
    )
  }

  if (initError && allowWithoutClass) {
    return (
      <>
        <InitErrorBanner onRetry={retryInit} />
        {children}
      </>
    )
  }

  if (initError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-500">
            <AlertTriangle className="size-7" aria-hidden />
          </div>
          <h1 className="mt-3 font-display text-xl font-extrabold text-slate-800">Không thể tải dữ liệu</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{initError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ClassroomButton onClick={() => void retryInit()}>Thử lại</ClassroomButton>
            <ClassroomButton variant="outline" onClick={() => router.push('/classrooms')}>
              Quản lý lớp
            </ClassroomButton>
          </div>
        </div>
      </div>
    )
  }

  if (!data && !allowWithoutClass) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ClassroomSkeleton rows={2} />
      </div>
    )
  }

  return <>{children}</>
}
