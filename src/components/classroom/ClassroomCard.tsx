import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function ClassroomCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'motion-safe-hover rounded-3xl border border-sky-100 bg-white p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
