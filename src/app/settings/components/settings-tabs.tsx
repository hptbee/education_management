'use client'

import { AlertTriangle, Crown, Database, UserCircle, UserCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SETTINGS_TABS } from './settings-flags'

export type SettingsTab = 'profile' | 'roles' | 'account' | 'data' | 'danger'

const ALL_TAB_ITEMS: {
  id: SettingsTab
  label: string
  icon: LucideIcon
  danger?: boolean
}[] = [
  { id: 'profile', label: 'Hồ sơ', icon: UserCircle },
  { id: 'account', label: 'Tài khoản', icon: UserCircle2 },
  { id: 'roles', label: 'Vai trò', icon: Crown },
  { id: 'data', label: 'Dữ liệu', icon: Database },
  { id: 'danger', label: 'Nguy hiểm', icon: AlertTriangle, danger: true },
]

function getVisibleTabs() {
  return ALL_TAB_ITEMS.filter((tab) => {
    if (SETTINGS_TABS.mergeProfileAndRoles && tab.id === 'roles') return false
    if (tab.id === 'data' && !SETTINGS_TABS.showDataTab) return false
    if (tab.id === 'danger' && !SETTINGS_TABS.showDangerTab) return false
    return true
  })
}

export function parseSettingsTab(value: string | null): SettingsTab {
  const visibleIds = getVisibleTabs().map((tab) => tab.id)
  if (value && visibleIds.includes(value as SettingsTab)) {
    return value as SettingsTab
  }
  return 'account'
}


interface SettingsTabsProps {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  const visibleTabs = getVisibleTabs()
  if (visibleTabs.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              isActive && tab.danger && 'bg-rose-500 text-white',
              isActive && !tab.danger && 'bg-brand text-white',
              !isActive && tab.danger && 'bg-rose-50 text-rose-600 hover:bg-rose-100',
              !isActive && !tab.danger && 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
