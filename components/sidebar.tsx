'use client'

import {
  Home,
  Users,
  UsersRound,
  Star,
  Gift,
  Crown,
  Sparkles,
  Trophy,
  History,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarClassContext } from './sidebar-class-context'
import { SidebarPersistenceStatus } from './sidebar-persistence-status'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  title?: string
}

type NavSection = {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [{ label: 'Trang chủ', href: '/', icon: Home }],
  },
  {
    label: 'Lớp học',
    items: [
      { label: 'Học sinh', href: '/students', icon: Users },
      { label: 'Tổ / Nhóm', href: '/teams', icon: UsersRound },
    ],
  },
  {
    label: 'Điểm & quà',
    items: [
      { label: 'Tích điểm', href: '/points', icon: Star },
      { label: 'Bảng xếp hạng', href: '/ranking', icon: Crown },
      { label: 'Quà tặng', href: '/rewards', icon: Gift },
    ],
  },
  {
    label: 'Hoạt động',
    items: [
      { label: 'Công cụ', href: '/tools', icon: Sparkles, title: 'Thử thách & Công cụ' },
      { label: 'Tuyên dương', href: '/recognition', icon: Trophy },
      { label: 'Lịch sử', href: '/history', icon: History },
    ],
  },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  title,
  active,
  onNavigate,
}: NavItem & { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      aria-current={active ? 'page' : undefined}
      title={title ?? label}
      className={cn(
        'relative flex min-h-10 items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-bold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        active
          ? 'bg-white text-brand-dark shadow-sm'
          : 'text-slate-600 hover:bg-white/80 hover:text-brand-dark',
      )}
    >
      {active ? (
        <span className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand" aria-hidden />
      ) : null}
      <Icon className={cn('size-5 shrink-0', active ? 'text-brand' : 'text-slate-400')} />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? ''
  const settingsActive = isNavActive(pathname, '/settings')

  return (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col border-r border-sky-100 bg-surface-soft',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      <SidebarClassContext />

      <nav aria-label="Điều hướng lớp học" className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-1 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label ?? section.items[0]?.href} className="flex flex-col gap-0.5">
            {section.label ? (
              <p className="px-3 pb-1 pt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => (
              <SidebarNavLink
                key={item.href}
                {...item}
                active={isNavActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sky-100/80 px-3 py-3">
        <SidebarPersistenceStatus />
        <SidebarNavLink
          href="/settings"
          label="Cài đặt"
          icon={Settings}
          active={settingsActive}
          onNavigate={onNavigate}
        />
        <p className="mt-3 px-3 text-[11px] font-semibold text-slate-400">
          <a
            href="https://www.facebook.com/10t03/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded"
          >
            Copyright by Tùng Huỳnh
          </a>
        </p>
      </div>
    </aside>
  )
}
