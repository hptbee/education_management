'use client'

import {
  Home,
  Users,
  UsersRound,
  Star,
  Gift,
  Medal,
  Sparkles,
  Gamepad2,
  Trophy,
  History,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { SidebarClassContext } from './sidebar-class-context'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  wrapLabel?: boolean
}

const navItems: NavItem[] = [
  { label: 'Trang chủ', href: '/', icon: Home },
  { label: 'Học sinh', href: '/students', icon: Users },
  { label: 'Tổ / Nhóm', href: '/teams', icon: UsersRound },
  { label: 'Tích điểm', href: '/points', icon: Star },
  { label: 'Quà tặng', href: '/rewards', icon: Gift },
  { label: 'Huy hiệu', href: '/badges', icon: Medal },
  { label: 'Thử thách & Công cụ', href: '/tools', icon: Sparkles, wrapLabel: true },
  { label: 'Trò chơi', href: '/games', icon: Gamepad2 },
  { label: 'Tuyên dương', href: '/recognition', icon: Trophy },
  { label: 'Lịch sử', href: '/history', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()
  const { teacher } = useActiveClassroom()

  const displayName = teacher?.name 
    ? teacher.name.toUpperCase() 
    : 'LÊ THƯ'

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sky-100 bg-surface-soft">
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 px-6 pt-5 pb-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pastel-sky to-pastel-pink shadow-sm">
          <span className="text-3xl">📖</span>
        </div>
        <h1 className="font-display text-xl font-extrabold leading-tight text-center text-slate-800 line-clamp-2">
          {displayName}
        </h1>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
          CÔ GIÁO NHỎ 4.0
        </p>
      </div>

      <SidebarClassContext />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1.5 px-4 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-bold transition ${
                isActive
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-slate-600 hover:bg-white/70 hover:text-brand-dark'
              }`}
            >
              <Icon className={`size-5 shrink-0 ${isActive ? 'text-brand' : 'text-slate-400'}`} />
              <span className={item.wrapLabel ? 'leading-tight' : 'truncate'}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-slate-200/80 px-4 py-4 shrink-0">
        <Link 
          href="/settings" 
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-bold transition ${
            pathname === '/settings' 
              ? 'bg-white text-brand-dark shadow-sm' 
              : 'text-slate-600 hover:bg-white/70 hover:text-brand-dark'
          }`}
        >
          <Settings className={`size-5 shrink-0 ${pathname === '/settings' ? 'text-brand' : 'text-slate-400'}`} />
          <span className="truncate">Cài đặt</span>
        </Link>
      </div>
    </aside>
  )
}
