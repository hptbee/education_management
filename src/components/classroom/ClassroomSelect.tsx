import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variantClasses = {
  inline:
    'bg-transparent text-sm font-semibold text-slate-700',
  field:
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700',
  filter:
    'w-full cursor-pointer bg-transparent text-sm font-bold text-slate-800',
} as const

const focusClasses =
  'outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-sm'

export type ClassroomSelectVariant = keyof typeof variantClasses

export interface ClassroomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  variant?: ClassroomSelectVariant
}

export function ClassroomSelect({
  variant = 'inline',
  className,
  ...props
}: ClassroomSelectProps) {
  return (
    <select
      className={cn(variantClasses[variant], focusClasses, className)}
      {...props}
    />
  )
}
