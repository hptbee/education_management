import type { LicensePlan } from '@/src/auth/types'

export const INTERNAL_SUPPORTED_PLANS = ['trial', 'basic', 'premium', 'lifetime'] as const
export const PUBLIC_VISIBLE_PLANS = ['trial', 'basic', 'premium'] as const

export type SupportedPlan = (typeof INTERNAL_SUPPORTED_PLANS)[number]

export interface PlanPresentation {
  id: LicensePlan
  displayName: string
  badgeLabel: string
  visibleInComparison: boolean
  featureBullets: string[]
  /** Shown on account card when plan has no expiry countdown (lifetime). */
  unlimitedUsageLine?: string
  /** Shown on account card for plans with cloud backup in entitlement. */
  cloudAvailableLine?: string
}

const PLAN_PRESENTATIONS: Record<LicensePlan, PlanPresentation> = {
  trial: {
    id: 'trial',
    displayName: '🌱 Dùng thử',
    badgeLabel: 'GÓI DÙNG THỬ',
    visibleInComparison: true,
    featureBullets: [
      '✨ Trải nghiệm ứng dụng trong 7 ngày',
      '🚫 Chưa bao gồm sao lưu đám mây',
    ],
  },
  basic: {
    id: 'basic',
    displayName: '🌸 Gói Cơ bản',
    badgeLabel: 'GÓI CƠ BẢN',
    visibleInComparison: true,
    featureBullets: [
      '✨ Sử dụng đầy đủ ứng dụng',
      '🚫 Không bao gồm sao lưu đám mây',
    ],
  },
  premium: {
    id: 'premium',
    displayName: '⭐ Premium 1 năm',
    badgeLabel: 'PREMIUM 1 NĂM',
    visibleInComparison: true,
    featureBullets: [
      '✨ Sử dụng đầy đủ ứng dụng',
      '☁️ Sao lưu dữ liệu đám mây',
      '🛡️ Bảo vệ dữ liệu khi đổi hoặc mất máy',
      '📅 Sử dụng trong 1 năm',
    ],
  },
  lifetime: {
    id: 'lifetime',
    displayName: '👑 Gói Trọn đời',
    badgeLabel: 'GÓI TRỌN ĐỜI',
    visibleInComparison: false,
    featureBullets: [
      '♾️ Sử dụng không giới hạn thời gian',
      '☁️ Sao lưu dữ liệu đám mây đang khả dụng',
    ],
    unlimitedUsageLine: '♾️ Sử dụng không giới hạn thời gian',
    cloudAvailableLine: '☁️ Sao lưu dữ liệu đám mây đang khả dụng',
  },
}

export function getPlanPresentation(plan: LicensePlan | string | undefined): PlanPresentation | null {
  if (!plan || !(plan in PLAN_PRESENTATIONS)) return null
  return PLAN_PRESENTATIONS[plan as LicensePlan]
}

export function getPublicComparisonPlans(): PlanPresentation[] {
  return PUBLIC_VISIBLE_PLANS.map((id) => PLAN_PRESENTATIONS[id])
}

export function getPlanBadgeLabel(plan: LicensePlan | string | undefined): string {
  const presentation = getPlanPresentation(plan)
  if (presentation) return presentation.badgeLabel
  if (!plan) return '—'
  return String(plan).toUpperCase()
}

export function getPlanDisplayName(plan: LicensePlan | string | undefined): string {
  const presentation = getPlanPresentation(plan)
  if (presentation) return presentation.displayName
  if (!plan) return '—'
  return String(plan)
}

export function remainingDaysUntil(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return null
  const diffMs = expiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

export function formatLicenseExpiryDate(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '—'
  return new Date(expiresAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getRemainingUsageLabel(
  plan: LicensePlan | string | undefined,
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (plan === 'lifetime') return null
  const days = remainingDaysUntil(expiresAt, now)
  if (days === null) return null
  if (plan === 'trial') return `Còn ${days} ngày trải nghiệm`
  if (plan === 'premium') return `Còn ${days} ngày sử dụng`
  return `Còn ${days} ngày`
}

/** @deprecated Use getRemainingUsageLabel */
export function getTrialRemainingLabel(
  plan: LicensePlan | string | undefined,
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  return getRemainingUsageLabel(plan, expiresAt, now)
}

export function getCloudBackupStatusText(hasCloudBackup: boolean): string {
  return hasCloudBackup ? 'Đã có trong gói' : 'Chưa có trong gói hiện tại'
}

export function formatSidebarCloudLine(
  plan: LicensePlan | string | undefined,
  cloudLabel: string,
): string {
  return `${getPlanBadgeLabel(plan)} · Cloud: ${cloudLabel}`
}

export function showsExpiryCountdown(plan: LicensePlan | string | undefined): boolean {
  return plan === 'trial' || plan === 'premium' || plan === 'basic'
}
