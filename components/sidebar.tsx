'use client'

import {
  Home,
  Users,
  UsersRound,
  Star,
  Gift,
  Disc3,
  Gamepad2,
  Trophy,
  History,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const navItems: NavItem[] = [
  { label: 'Trang chủ', href: '/', icon: Home, color: 'text-orange-500' },
  { label: 'Học sinh', href: '/students', icon: Users, color: 'text-sky-500' },
  { label: 'Tổ / Nhóm', href: '/teams', icon: UsersRound, color: 'text-pink-500' },
  { label: 'Tích điểm', href: '/points', icon: Star, color: 'text-amber-400' },
  { label: 'Quà tặng', href: '/rewards', icon: Gift, color: 'text-rose-400' },
  { label: 'Vòng quay', href: '/lucky-wheel', icon: Disc3, color: 'text-violet-400' },
  { label: 'Trò chơi', href: '/games', icon: Gamepad2, color: 'text-indigo-400' },
  { label: 'Tuyên dương', href: '/recognition', icon: Trophy, color: 'text-yellow-400' },
  { label: 'Lịch sử', href: '/history', icon: History, color: 'text-teal-400' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { teacher } = useActiveClassroom()

  const displayName = teacher?.name 
    ? teacher.name.toUpperCase() 
    : 'LÊ THƯ'

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-gradient-to-b from-brand-purple-light to-brand-purple-dark text-white">
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 px-6 pt-6 pb-5">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
          <span className="text-3xl">📖</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase line-clamp-1 break-all text-center">{displayName}</h1>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-white/70">
          CÔ GIÁO NHỎ 4.0
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1.5 px-4 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-bold transition ${
                isActive
                  ? 'bg-white text-brand-purple-dark shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Icon className={`size-5 shrink-0 ${isActive ? item.color : 'text-white'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-white/15 px-4 py-4 shrink-0">
        <Link 
          href="/settings" 
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-bold transition ${
            pathname === '/settings' 
              ? 'bg-white text-brand-purple-dark shadow-md' 
              : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <Settings className={`size-5 shrink-0 ${pathname === '/settings' ? 'text-brand-purple' : 'text-white'}`} />
          <span className="truncate">Cài đặt</span>
        </Link>
      </div>
    </aside>
  )
}
