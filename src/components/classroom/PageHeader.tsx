import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  iconClassName?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  iconClassName,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex items-start gap-4', className)}>
      <div
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-light text-white shadow-sm',
          iconClassName,
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-black text-slate-800">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
