'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { useClassroomDialog } from './ClassroomDialogProvider'
import { ClassroomButton } from './ClassroomButton'

function SaveErrorNotifier() {
  const { saveError, clearSaveError } = useAppData()
  const { showAlert } = useClassroomDialog()

  useEffect(() => {
    if (!saveError) return
    void showAlert(saveError, { variant: 'error' }).finally(clearSaveError)
  }, [saveError, clearSaveError, showAlert])

  return null
}

export function AppDataShell({ children }: { children: ReactNode }) {
  const { data, isLoading, initError, retryInit } = useAppData()
  const pathname = usePathname()
  const router = useRouter()
  const onSettings = pathname === '/settings'

  useEffect(() => {
    if (isLoading || initError || data || onSettings) return
    router.replace('/settings')
  }, [data, initError, isLoading, onSettings, router])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-3 font-display text-xl font-extrabold text-slate-800">Không thể tải dữ liệu</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{initError}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ClassroomButton onClick={() => void retryInit()}>Thử lại</ClassroomButton>
            <ClassroomButton variant="outline" onClick={() => router.push('/settings')}>
              Mở cài đặt
            </ClassroomButton>
          </div>
        </div>
      </div>
    )
  }

  if (!data && !onSettings) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang chuyển đến cài đặt...</p>
      </div>
    )
  }

  return (
    <>
      <SaveErrorNotifier />
      {children}
    </>
  )
}
