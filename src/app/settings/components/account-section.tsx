'use client'

import { LogOut, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import { useAppData } from '@/src/store/AppDataContext'
import { useAuth } from '@/src/store/AuthContext'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Dùng thử',
  basic: 'Cơ bản',
  premium: 'Premium',
  lifetime: 'Trọn đời',
}

function formatDateFromUnix(seconds: number | null): string {
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function AccountSection() {
  const { data, updateAppSettings } = useAppData()
  const {
    user,
    license,
    permissions,
    accessState,
    lastVerifiedAt,
    offlineValidUntil,
    refreshSession,
    logout,
  } = useAuth()
  const [localClassCount, setLocalClassCount] = useState(0)
  const [backupPromptDismissed, setBackupPromptDismissed] = useState(false)

  useEffect(() => {
    void databaseService.listDatabases().then((list) => setLocalClassCount(list.length))
  }, [data?.metadata.id])

  if (!user) {
    return (
      <ClassroomCard>
        <p className="text-sm font-semibold text-slate-500">Chưa có thông tin tài khoản.</p>
      </ClassroomCard>
    )
  }

  const planLabel = license ? PLAN_LABELS[license.plan] ?? license.plan : '—'
  const hasCloudBackup = permissions?.cloudBackup === true
  const statusColor =
    accessState === 'OFFLINE_GRACE'
      ? 'text-amber-600'
      : accessState === 'AUTHENTICATED_AND_ACTIVE'
        ? 'text-emerald-600'
        : 'text-slate-500'

  return (
    <ClassroomCard>
      <div className="flex flex-wrap items-start gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName ?? 'Giáo viên'}
            className="size-16 rounded-full object-cover ring-4 ring-white"
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-pastel-sky ring-4 ring-white">
            <UserCircle className="size-8 text-brand" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-black text-slate-800">
            {user.displayName ?? 'Giáo viên'}
          </h2>
          <p className="text-sm font-semibold text-slate-500">{user.email ?? '—'}</p>
          <p className={`mt-2 text-sm font-bold ${statusColor}`}>
            {accessState === 'OFFLINE_GRACE' ? '🟠 Đang sử dụng ngoại tuyến' : `🟢 Gói ${planLabel}`}
          </p>
          {lastVerifiedAt ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Đã xác minh: {new Date(lastVerifiedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
          {offlineValidUntil ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Cần xác minh lại trước: {formatDateFromUnix(offlineValidUntil)}
            </p>
          ) : null}
          {license?.expiresAt ? (
            <p className="mt-1 text-xs font-semibold text-amber-600">
              ⚠️ Gói sử dụng sẽ hết hạn vào:{' '}
              {new Date(license.expiresAt).toLocaleDateString('vi-VN')}
            </p>
          ) : null}
          {!hasCloudBackup ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Gói hiện tại không bao gồm sao lưu đám mây.
            </p>
          ) : null}
        </div>
      </div>

      {hasCloudBackup && localClassCount > 0 && !data?.appSettings.cloudBackupEnabled && !backupPromptDismissed ? (
        <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-700">
            Cô có {localClassCount} lớp trên thiết bị này. Muốn sao lưu lớp hiện tại lên tài khoản đám mây?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ClassroomButton
              className="bg-sky-500 hover:bg-sky-600"
              onClick={() => {
                void updateAppSettings({ cloudBackupEnabled: true })
                setBackupPromptDismissed(true)
              }}
            >
              Bật sao lưu đám mây cho lớp này
            </ClassroomButton>
            <ClassroomButton variant="outline" onClick={() => setBackupPromptDismissed(true)}>
              Để sau
            </ClassroomButton>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <ClassroomButton variant="outline" onClick={() => void refreshSession()}>
          Xác minh lại
        </ClassroomButton>
        <ClassroomButton variant="outline" onClick={() => void logout()}>
          <LogOut className="size-4" />
          Đăng xuất
        </ClassroomButton>
      </div>
    </ClassroomCard>
  )
}
