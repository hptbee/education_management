'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface NavSidebarContextValue {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const NavSidebarContext = createContext<NavSidebarContextValue | null>(null)

export function NavSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value)
  }, [])

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed }),
    [collapsed, toggleCollapsed],
  )

  return <NavSidebarContext.Provider value={value}>{children}</NavSidebarContext.Provider>
}

export function useNavSidebar(): NavSidebarContextValue {
  const ctx = useContext(NavSidebarContext)
  if (!ctx) {
    throw new Error('useNavSidebar must be used within NavSidebarProvider')
  }
  return ctx
}
