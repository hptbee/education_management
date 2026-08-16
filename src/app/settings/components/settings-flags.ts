/**
 * Settings UI feature flags — flip to re-enable tabs without rewriting sections.
 */
export const SETTINGS_TABS = {
  /** Hồ sơ + Vai trò on one page; no separate tab buttons for either. */
  mergeProfileAndRoles: true,
  /** Dữ liệu tab (switch class, export, rename DB, …) */
  showDataTab: true,
  /** Nguy hiểm tab (delete classroom) */
  showDangerTab: false,
} as const
