'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ClassroomCard } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

interface ToolCardShellProps {
  icon: LucideIcon
  iconBg: string
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function ToolCardShell({
  icon: Icon,
  iconBg,
  title,
  description,
  children,
  className,
}: ToolCardShellProps) {
  return (
    <ClassroomCard className={cn('flex h-full min-h-[320px] flex-col', className)}>
      <header className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            iconBg,
          )}
        >
          <Icon className="size-5 text-brand-dark" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold text-slate-800">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </ClassroomCard>
  )
}

interface ToolsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ToolsSection({ title, description, children, className }: ToolsSectionProps) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div>
        <h2 className="font-display text-base font-extrabold uppercase tracking-wide text-brand-purple">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm font-semibold text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
