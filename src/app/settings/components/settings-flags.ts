/**
 * Settings UI feature flags — flip to re-enable tabs without rewriting sections.
 */
export const SETTINGS_TABS = {
  /** Hồ sơ embeds Vai trò; hide the separate Vai trò tab. */
  mergeProfileAndRoles: true,
  /** Dữ liệu tab (switch class, export, rename DB, …) */
  showDataTab: false,
  /** Nguy hiểm tab (delete classroom) */
  showDangerTab: false,
} as const
