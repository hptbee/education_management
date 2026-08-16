import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const classroomButtonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 motion-safe-hover',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
        secondary: 'bg-brand-soft text-brand-dark hover:bg-pastel-sky',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-surface-soft',
        ghost: 'text-slate-600 hover:bg-slate-100',
        danger: 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ClassroomButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof classroomButtonVariants> {}

export function ClassroomButton({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ClassroomButtonProps) {
  return (
    <button
      type={type}
      className={cn(classroomButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
