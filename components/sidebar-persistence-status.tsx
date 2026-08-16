'use client'

import {
  formatSidebarCloudLine,
  getPlanBadgeLabel,
} from '@/src/app/settings/components/account-plan-display'
import { useAppData } from '@/src/store/AppDataContext'
import { useAuth } from '@/src/store/AuthContext'
import { cn } from '@/lib/utils'

export function SidebarPersistenceStatus() {
  const { localSaveStatus, cloudBackupState, saveError, retrySave, data } = useAppData()
  const { permissions, license } = useAuth()
  const hasCloudBackupPermission = permissions?.cloudBackup === true
  const classroomOptIn = Boolean(data?.appSettings?.cloudBackupEnabled)

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

  let cloudLabel: string
  let cloudTone: string
  let cloudDot: string

  if (!hasCloudBackupPermission) {
    cloudLabel = 'Chưa có trong gói'
    cloudTone = 'text-amber-600'
    cloudDot = '🟠'
  } else if (!classroomOptIn) {
    cloudLabel = 'Chưa bật'
    cloudTone = 'text-slate-500'
    cloudDot = '⚪'
  } else if (cloudBackupState === 'uploading' || cloudBackupState === 'pending') {
    cloudLabel = 'Đang sao lưu...'
    cloudTone = 'text-amber-600'
    cloudDot = '🟡'
  } else if (cloudBackupState === 'synced') {
    cloudLabel = 'Đã sao lưu'
    cloudTone = 'text-emerald-600'
    cloudDot = '🟢'
  } else if (cloudBackupState === 'failed') {
    cloudLabel = 'Chưa sao lưu'
    cloudTone = 'text-orange-500'
    cloudDot = '🟠'
  } else {
    cloudLabel = 'Chưa sao lưu'
    cloudTone = 'text-orange-500'
    cloudDot = '🟠'
  }

  const planLabel = getPlanBadgeLabel(license?.plan)

  return (
    <div className="space-y-1.5 px-1 pb-2 text-[11px] font-bold leading-tight">
      {planLabel !== '—' ? (
        <p className="text-[10px] font-extrabold tracking-wide text-amber-900">{planLabel}</p>
      ) : null}
      <p className={cn('flex items-center gap-1.5', localTone)}>
        <span aria-hidden>🟢</span>
        <span>Local: {localLabel}</span>
      </p>
      <p className={cn('flex items-center gap-1.5', cloudTone)}>
        <span aria-hidden>{cloudDot}</span>
        <span>{formatSidebarCloudLine(license?.plan, cloudLabel)}</span>
      </p>
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
