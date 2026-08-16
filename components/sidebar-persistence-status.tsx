'use client'

import Link from 'next/link'
import {
  formatSidebarCloudLine,
  getPlanBadgeLabel,
} from '@/src/app/settings/components/account-plan-display'
import { useAppData } from '@/src/store/AppDataContext'
import type { LocalSaveStatus } from '@/src/store/AppDataContext'
import { useAuth } from '@/src/store/AuthContext'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ACCOUNT_SETTINGS_HREF = '/settings?tab=account'

type StatusIconConfig = {
  icon: LucideIcon
  tone: string
  spin?: boolean
}

function getLocalStatus(localSaveStatus: LocalSaveStatus): { label: string; icon: StatusIconConfig } {
  if (localSaveStatus === 'saving') {
    return {
      label: 'Đang lưu...',
      icon: { icon: Loader2, tone: 'text-amber-600', spin: true },
    }
  }
  if (localSaveStatus === 'error') {
    return {
      label: 'Lỗi lưu',
      icon: { icon: AlertCircle, tone: 'text-rose-600' },
    }
  }
  return {
    label: 'Đã lưu',
    icon: { icon: CheckCircle2, tone: 'text-emerald-600' },
  }
}

function getCloudStatus(
  hasCloudBackupPermission: boolean,
  classroomOptIn: boolean,
  cloudBackupState: string,
): { label: string; tone: string; icon: StatusIconConfig } {
  if (!hasCloudBackupPermission) {
    return {
      label: 'Chưa có trong gói',
      tone: 'text-amber-600',
      icon: { icon: CloudOff, tone: 'text-amber-600' },
    }
  }
  if (!classroomOptIn) {
    return {
      label: 'Chưa bật',
      tone: 'text-slate-500',
      icon: { icon: CloudOff, tone: 'text-slate-400' },
    }
  }
  if (cloudBackupState === 'uploading' || cloudBackupState === 'pending') {
    return {
      label: 'Đang sao lưu...',
      tone: 'text-amber-600',
      icon: { icon: Loader2, tone: 'text-amber-600', spin: true },
    }
  }
  if (cloudBackupState === 'synced') {
    return {
      label: 'Đã sao lưu',
      tone: 'text-emerald-600',
      icon: { icon: CheckCircle2, tone: 'text-emerald-600' },
    }
  }
  return {
    label: 'Chưa sao lưu',
    tone: 'text-orange-500',
    icon: { icon: CloudOff, tone: 'text-orange-500' },
  }
}

function StatusIcon({ config }: { config: StatusIconConfig }) {
  const Icon = config.icon
  return (
    <Icon
      className={cn('h-3.5 w-3.5 shrink-0', config.tone, config.spin && 'animate-spin')}
      aria-hidden
    />
  )
}

export function SidebarPersistenceStatus() {
  const { localSaveStatus, cloudBackupState, saveError, retrySave, data } = useAppData()
  const { permissions, license } = useAuth()
  const hasCloudBackupPermission = permissions?.cloudBackup === true
  const classroomOptIn = Boolean(data?.appSettings?.cloudBackupEnabled)

  const local = getLocalStatus(localSaveStatus)
  const cloud = getCloudStatus(hasCloudBackupPermission, classroomOptIn, cloudBackupState)
  const cloudLine = formatSidebarCloudLine(license?.plan, cloud.label)
  const planLabel = getPlanBadgeLabel(license?.plan)

  return (
    <div className="space-y-1.5 px-1 pb-2 text-xs font-bold leading-tight">
      <Link
        href={ACCOUNT_SETTINGS_HREF}
        className="block rounded-xl px-1 py-1 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Mở cài đặt tài khoản"
      >
        {planLabel !== '—' ? (
          <p className="text-xs font-extrabold tracking-wide text-amber-900">{planLabel}</p>
        ) : null}
        <p
          className={cn('flex items-center gap-1.5', local.icon.tone)}
          aria-label={`Lưu cục bộ: ${local.label}`}
        >
          <StatusIcon config={local.icon} />
          <span>Local: {local.label}</span>
        </p>
        <p
          className={cn('flex items-center gap-1.5', cloud.tone)}
          aria-label={`Sao lưu đám mây: ${cloudLine}`}
        >
          <StatusIcon config={cloud.icon} />
          <span>{cloudLine}</span>
        </p>
      </Link>
      {saveError ? (
        <div className="space-y-1.5">
          <p className="text-rose-600">{saveError}</p>
          {localSaveStatus === 'error' ? (
            <button
              type="button"
              onClick={() => void retrySave()}
              className="min-h-11 w-full cursor-pointer rounded-xl border border-rose-200 bg-white px-2 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
