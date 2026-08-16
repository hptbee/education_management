'use client'

import { useAppData } from '@/src/store/AppDataContext'
import { cn } from '@/lib/utils'

export function SidebarPersistenceStatus() {
  const { localSaveStatus, cloudBackupState, saveError, retrySave } = useAppData()
  const cloudEnabled = cloudBackupState !== 'disabled'

  const localLabel =
    localSaveStatus === 'saving'
      ? 'Đang lưu...'
      : localSaveStatus === 'error'
        ? 'Lỗi lưu'
        : 'Đã lưu'

  const localTone =
    localSaveStatus === 'error'
      ? 'text-rose-600'
      : localSaveStatus === 'saving'
        ? 'text-amber-600'
        : 'text-emerald-600'

  const cloudLabel =
    cloudBackupState === 'disabled'
      ? null
      : cloudBackupState === 'uploading' || cloudBackupState === 'pending'
        ? 'Đang sao lưu...'
        : cloudBackupState === 'synced'
          ? 'Đã sao lưu'
          : 'Chưa sao lưu'

  const cloudTone =
    cloudBackupState === 'synced'
      ? 'text-emerald-600'
      : cloudBackupState === 'uploading' || cloudBackupState === 'pending'
        ? 'text-amber-600'
        : 'text-orange-500'

  if (!cloudEnabled && localSaveStatus === 'saved' && !saveError) {
    return null
  }

  return (
    <div className="space-y-1.5 px-1 pb-2 text-[11px] font-bold leading-tight">
      <p className={cn('flex items-center gap-1.5', localTone)}>
        <span aria-hidden>🟢</span>
        <span>Local: {localLabel}</span>
      </p>
      {cloudEnabled && cloudLabel ? (
        <p className={cn('flex items-center gap-1.5', cloudTone)}>
          <span aria-hidden>
            {cloudBackupState === 'synced' ? '🟢' : cloudBackupState === 'failed' ? '🟠' : '🟡'}
          </span>
          <span>Cloud: {cloudLabel}</span>
        </p>
      ) : null}
      {saveError ? (
        <div className="space-y-1.5">
          <p className="text-rose-600">{saveError}</p>
          {localSaveStatus === 'error' ? (
            <button
              type="button"
              onClick={() => void retrySave()}
              className="w-full rounded-xl border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
