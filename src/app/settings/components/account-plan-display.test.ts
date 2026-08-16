import { describe, expect, it } from 'vitest'
import {
  formatLicenseExpiryDate,
  formatSidebarCloudLine,
  getCloudBackupStatusText,
  getPlanBadgeLabel,
  getPlanDisplayName,
  getPlanPresentation,
  getPublicComparisonPlans,
  getRemainingUsageLabel,
  INTERNAL_SUPPORTED_PLANS,
  PUBLIC_VISIBLE_PLANS,
  remainingDaysUntil,
} from './account-plan-display'

describe('account-plan-display', () => {
  it('defines internal and public plan lists', () => {
    expect(INTERNAL_SUPPORTED_PLANS).toEqual(['trial', 'basic', 'premium', 'lifetime'])
    expect(PUBLIC_VISIBLE_PLANS).toEqual(['trial', 'basic', 'premium'])
    expect(getPublicComparisonPlans().map((p) => p.id)).toEqual(['trial', 'basic', 'premium'])
  })

  it('maps plan to badge and display labels', () => {
    expect(getPlanBadgeLabel('trial')).toBe('GÓI DÙNG THỬ')
    expect(getPlanBadgeLabel('basic')).toBe('GÓI CƠ BẢN')
    expect(getPlanBadgeLabel('premium')).toBe('PREMIUM 1 NĂM')
    expect(getPlanBadgeLabel('lifetime')).toBe('GÓI TRỌN ĐỜI')
    expect(getPlanDisplayName('premium')).toBe('⭐ Premium 1 năm')
    expect(getPlanDisplayName('lifetime')).toBe('👑 Gói Trọn đời')
  })

  it('keeps premium plan id while changing display name only', () => {
    const presentation = getPlanPresentation('premium')
    expect(presentation?.id).toBe('premium')
    expect(presentation?.displayName).toContain('Premium 1 năm')
  })

  it('hides lifetime from public comparison but keeps presentation', () => {
    const lifetime = getPlanPresentation('lifetime')
    expect(lifetime?.visibleInComparison).toBe(false)
    expect(lifetime?.badgeLabel).toBe('GÓI TRỌN ĐỜI')
    expect(getPublicComparisonPlans().some((p) => p.id === 'lifetime')).toBe(false)
  })

  it('computes remaining whole days until expiry', () => {
    const now = new Date('2026-08-16T12:00:00.000Z')
    expect(remainingDaysUntil('2026-08-17T00:00:00.000Z', now)).toBe(1)
    expect(remainingDaysUntil('2026-08-16T12:00:00.000Z', now)).toBe(0)
    expect(remainingDaysUntil(null, now)).toBeNull()
  })

  it('formats expiry date in vi-VN', () => {
    expect(formatLicenseExpiryDate('2026-09-15T00:00:00.000Z')).toMatch(/15\/09\/2026/)
  })

  it('describes cloud backup entitlement text', () => {
    expect(getCloudBackupStatusText(false)).toBe('Chưa có trong gói hiện tại')
    expect(getCloudBackupStatusText(true)).toBe('Đã có trong gói')
  })

  it('formats sidebar cloud line with plan badge', () => {
    expect(formatSidebarCloudLine('trial', 'Chưa có trong gói')).toBe(
      'GÓI DÙNG THỬ · Cloud: Chưa có trong gói',
    )
    expect(formatSidebarCloudLine('premium', 'Đang sao lưu...')).toBe(
      'PREMIUM 1 NĂM · Cloud: Đang sao lưu...',
    )
  })

  it('uses plan-specific remaining usage labels', () => {
    const now = new Date('2026-08-16T12:00:00.000Z')
    expect(getRemainingUsageLabel('trial', '2026-09-15T00:00:00.000Z', now)).toMatch(
      /^Còn \d+ ngày trải nghiệm$/,
    )
    expect(getRemainingUsageLabel('premium', '2026-09-15T00:00:00.000Z', now)).toMatch(
      /^Còn \d+ ngày sử dụng$/,
    )
    expect(getRemainingUsageLabel('lifetime', '2026-09-15T00:00:00.000Z', now)).toBeNull()
  })
})
