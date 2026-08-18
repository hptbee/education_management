'use client'

import { Crown, Database, UserCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SETTINGS_TABS } from '@/src/app/settings/components/settings-flags'

export type ClassroomManageTab = 'profile' | 'roles' | 'data'

const ALL_TAB_ITEMS: {
  id: ClassroomManageTab
  label: string
  icon: LucideIcon
}[] = [
  { id: 'profile', label: 'Hồ sơ', icon: UserCircle },
  { id: 'roles', label: 'Vai trò', icon: Crown },
  { id: 'data', label: 'Dữ liệu', icon: Database },
]

function getVisibleTabs() {
  return ALL_TAB_ITEMS.filter((tab) => {
    if (SETTINGS_TABS.mergeProfileAndRoles && tab.id === 'roles') return false
    return true
  })
}

export function parseClassroomManageTab(value: string | null): ClassroomManageTab {
  const visibleIds = getVisibleTabs().map((tab) => tab.id)
  if (value && visibleIds.includes(value as ClassroomManageTab)) {
    return value as ClassroomManageTab
  }
  return 'profile'
}

interface ClassroomManageTabsProps {
  activeTab: ClassroomManageTab
  onChange: (tab: ClassroomManageTab) => void
}

export function ClassroomManageTabs({ activeTab, onChange }: ClassroomManageTabsProps) {
  const visibleTabs = getVisibleTabs()

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
              isActive ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
