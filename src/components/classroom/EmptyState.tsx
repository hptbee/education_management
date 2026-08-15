import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  emoji?: string
  imageSrc?: string
  imageAlt?: string
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  emoji,
  imageSrc,
  imageAlt,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/20 bg-gradient-to-b from-pastel-sky/50 via-white to-pastel-pink/30 text-center',
        compact ? 'px-6 py-10' : 'px-8 py-16',
        className,
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt ?? ''}
          className={cn('mb-4 object-contain', compact ? 'h-24' : 'h-32')}
        />
      ) : emoji ? (
        <div className={cn('mb-4 select-none leading-none', compact ? 'text-4xl' : 'text-5xl')}>
          {emoji}
        </div>
      ) : null}

      <h3 className={cn('font-display font-black text-slate-700', compact ? 'text-lg' : 'text-xl')}>
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  )
}
