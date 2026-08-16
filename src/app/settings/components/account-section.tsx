'use client'

import {
  AppWindow,
  CircleCheck,
  Cloud,
  Hourglass,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LicensePlan } from '@/src/auth/types'
import { Avatar } from '@/src/components/Avatar'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import { useAppData } from '@/src/store/AppDataContext'
import { useAuth } from '@/src/store/AuthContext'
import { cn } from '@/lib/utils'
import {
  formatLicenseExpiryDate,
  getCloudBackupStatusText,
  getPlanDisplayName,
  getPlanPresentation,
  getPublicComparisonPlans,
  getRemainingUsageLabel,
  showsExpiryCountdown,
} from './account-plan-display'

function formatDateFromUnix(seconds: number | null): string {
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function PlanBenefitsDialog({
  open,
  currentPlan,
  onClose,
}: {
  open: boolean
  currentPlan: LicensePlan | string | undefined
  onClose: () => void
}) {
  if (!open) return null

  const currentPresentation = getPlanPresentation(currentPlan)
  const comparisonPlans = getPublicComparisonPlans()
  const isLifetimeUser = currentPlan === 'lifetime'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-benefits-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 id="plan-benefits-title" className="font-display text-xl font-extrabold text-slate-800">
          Quyền lợi theo gói
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Liên hệ quản trị viên để nâng cấp Premium 1 năm.
        </p>

        {isLifetimeUser && currentPresentation ? (
          <div className="mt-4 rounded-2xl border border-brand/40 bg-brand-soft/40 px-4 py-3 text-sm font-semibold text-slate-800">
            <p className="font-extrabold">{currentPresentation.displayName}</p>
            <p className="mt-1 text-brand-dark">Gói hiện tại</p>
            <ul className="mt-2 space-y-1">
              {currentPresentation.featureBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="mt-4 space-y-2">
          {comparisonPlans.map((row) => {
            const isCurrent = !isLifetimeUser && row.id === currentPlan
            return (
              <li
                key={row.id}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-semibold',
                  isCurrent
                    ? 'border-brand/40 bg-brand-soft/40 text-slate-800'
                    : 'border-sky-100 bg-surface-soft text-slate-600',
                )}
              >
                <p className="font-extrabold text-slate-800">
                  {row.displayName}
                  {isCurrent ? ' — Gói hiện tại' : ''}
                </p>
                <ul className="mt-2 space-y-1">
                  {row.featureBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
        <div className="mt-6">
          <ClassroomButton className="w-full" onClick={onClose}>
            Đã hiểu
          </ClassroomButton>
        </div>
      </div>
    </div>
  )
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
  const [benefitsOpen, setBenefitsOpen] = useState(false)

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

  const hasCloudBackup = permissions?.cloudBackup === true
  const planPresentation = getPlanPresentation(license?.plan)
  const planDisplayName = getPlanDisplayName(license?.plan)
  const isLifetime = license?.plan === 'lifetime'
  const remainingLabel = getRemainingUsageLabel(license?.plan, license?.expiresAt)
  const expiryDate = formatLicenseExpiryDate(license?.expiresAt)
  const showExpiryBlock = showsExpiryCountdown(license?.plan) && remainingLabel !== null
  const cloudStatusText = isLifetime
    ? (planPresentation?.cloudAvailableLine ?? getCloudBackupStatusText(hasCloudBackup))
    : getCloudBackupStatusText(hasCloudBackup)
  const isOfflineGrace = accessState === 'OFFLINE_GRACE'
  const isActive = accessState === 'AUTHENTICATED_AND_ACTIVE' || isOfflineGrace

  return (
    <>
      <ClassroomCard>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            src={user.avatarUrl ?? undefined}
            name={user.displayName ?? user.email ?? 'Giáo viên'}
            size="md"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="font-display text-xl font-black text-slate-800">
                {user.displayName ?? 'Giáo viên'}
              </h2>
              <p className="text-sm font-semibold text-slate-500">{user.email ?? '—'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-yellow px-3 py-1 text-xs font-extrabold tracking-wide text-amber-900">
                {planDisplayName}
              </span>
              {isLifetime ? (
                <span className="text-xs font-extrabold text-brand-dark">Gói hiện tại</span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <AppWindow className="size-4" aria-hidden />
                Đang sử dụng ứng dụng
              </span>
            </div>

            {isLifetime && planPresentation?.unlimitedUsageLine ? (
              <p className="text-sm font-bold text-slate-700">{planPresentation.unlimitedUsageLine}</p>
            ) : null}

            {showExpiryBlock ? (
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                  <Hourglass className="size-4" aria-hidden />
                  {remainingLabel}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Hiệu lực đến {expiryDate}
                </p>
              </div>
            ) : null}

            <div className="flex items-start gap-2">
              <Cloud
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  hasCloudBackup ? 'text-sky-500' : 'text-amber-600',
                )}
                aria-hidden
              />
              <div>
                <p className="text-sm font-bold text-slate-700">Sao lưu đám mây</p>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    hasCloudBackup ? 'text-emerald-600' : 'text-amber-700',
                  )}
                >
                  {cloudStatusText}
                </p>
              </div>
            </div>

            <ClassroomButton
              variant="secondary"
              className="mt-1 min-h-11 px-4"
              onClick={() => setBenefitsOpen(true)}
            >
              <Sparkles className="size-4" aria-hidden />
              Xem quyền lợi
            </ClassroomButton>
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

        <hr className="my-6 border-sky-100" />

        <div className="space-y-1">
          <p
            className={cn(
              'flex items-center gap-1.5 text-sm font-bold',
              isOfflineGrace ? 'text-amber-600' : isActive ? 'text-emerald-600' : 'text-slate-500',
            )}
          >
            <CircleCheck className="size-4" aria-hidden />
            {isOfflineGrace
              ? 'Đang sử dụng ngoại tuyến'
              : isActive
                ? 'Tài khoản đang hoạt động'
                : 'Tài khoản chưa sẵn sàng'}
          </p>
          {lastVerifiedAt ? (
            <p className="text-xs font-semibold text-slate-400">
              Đã xác minh: {new Date(lastVerifiedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
          {isOfflineGrace && offlineValidUntil ? (
            <p className="text-xs font-semibold text-slate-400">
              Cần xác minh lại trước: {formatDateFromUnix(offlineValidUntil)}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <ClassroomButton variant="outline" onClick={() => void refreshSession()}>
            Xác minh lại
          </ClassroomButton>
          <ClassroomButton variant="outline" onClick={() => void logout()}>
            <LogOut className="size-4" />
            Đăng xuất
          </ClassroomButton>
        </div>
      </ClassroomCard>

      <PlanBenefitsDialog
        open={benefitsOpen}
        currentPlan={license?.plan}
        onClose={() => setBenefitsOpen(false)}
      />
    </>
  )
}
