import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IconTouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  children: ReactNode
}

export function IconTouchButton({
  className,
  type = 'button',
  children,
  ...props
}: IconTouchButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
