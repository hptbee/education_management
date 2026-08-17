'use client'

import {
  AppWindow,
  CircleCheck,
  Cloud,
  Hourglass,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LicensePlan } from '@/src/auth/types'
import { Avatar } from '@/src/components/Avatar'
import { ClassroomButton, ClassroomCard, useClassroomDialog, useModalFocusTrap } from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import { useAppData } from '@/src/store/AppDataContext'
import { useAuth } from '@/src/store/AuthContext'
import { cn } from '@/lib/utils'
import { AppLogSection } from './app-log-section'
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
  const dialogRef = useModalFocusTrap(open, onClose)

  if (!open) return null

  const currentPresentation = getPlanPresentation(currentPlan)
  const comparisonPlans = getPublicComparisonPlans()
  const isLifetimeUser = currentPlan === 'lifetime'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-benefits-title"
        tabIndex={-1}
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
  const { showConfirm, showAlert } = useClassroomDialog()
  const [localClassCount, setLocalClassCount] = useState(0)
  const [backupPromptDismissed, setBackupPromptDismissed] = useState(false)
  const [benefitsOpen, setBenefitsOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [classListError, setClassListError] = useState<string | null>(null)

  useEffect(() => {
    void databaseService
      .listDatabases()
      .then((list) => {
        setLocalClassCount(list.length)
        setClassListError(null)
      })
      .catch((error) => {
        setClassListError(error instanceof Error ? error.message : 'Không thể tải danh sách lớp học.')
      })
  }, [data?.metadata.id])

  const actionsBusy = isVerifying || isLoggingOut

  const handleRefresh = async () => {
    if (actionsBusy) return
    setIsVerifying(true)
    try {
      await refreshSession()
    } catch {
      await showAlert('Không thể xác minh lúc này. Vui lòng kiểm tra kết nối mạng rồi thử lại.', {
        title: 'Xác minh thất bại',
        variant: 'error',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogout = async () => {
    if (actionsBusy) return
    const confirmed = await showConfirm(
      'Cô sẽ cần đăng nhập Google lại để tiếp tục dùng ứng dụng. Dữ liệu lớp trên máy vẫn được giữ nguyên.',
      {
        title: 'Đăng xuất?',
        confirmLabel: 'Đăng xuất',
        cancelLabel: 'Ở lại',
        variant: 'warning',
      },
    )
    if (!confirmed) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

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

        {classListError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {classListError}
          </div>
        ) : null}

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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ClassroomButton
            variant="outline"
            className="min-h-11 w-full border-sky-200 text-brand-dark hover:bg-brand-soft sm:w-auto"
            disabled={actionsBusy}
            aria-busy={isVerifying}
            onClick={() => void handleRefresh()}
          >
            {isVerifying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            {isVerifying ? 'Đang xác minh...' : 'Xác minh lại'}
          </ClassroomButton>
          <ClassroomButton
            variant="danger"
            className="min-h-11 w-full sm:w-auto"
            disabled={actionsBusy}
            aria-busy={isLoggingOut}
            onClick={() => void handleLogout()}
          >
            {isLoggingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4" aria-hidden />
            )}
            {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </ClassroomButton>
        </div>
      </ClassroomCard>

      <PlanBenefitsDialog
        open={benefitsOpen}
        currentPlan={license?.plan}
        onClose={() => setBenefitsOpen(false)}
      />

      <AppLogSection />
    </>
  )
}
