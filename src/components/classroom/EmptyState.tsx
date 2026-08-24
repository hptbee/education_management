'use client'

import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { cn } from '@/lib/utils'
import { fadeUpVariants, motionTransition } from '@/src/utils/motion'

interface EmptyStateProps {
  icon?: LucideIcon
  iconClassName?: string
  imageSrc?: string
  imageAlt?: string
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  iconClassName,
  imageSrc,
  imageAlt,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const motionEnabled = useMotionEnabled()
  const transition = motionEnabled ? motionTransition('normal') : { duration: 0 }

  return (
    <motion.div
      initial={motionEnabled ? 'initial' : false}
      animate="animate"
      variants={fadeUpVariants}
      transition={transition}
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
      ) : Icon ? (
        <motion.div
          initial={motionEnabled ? { opacity: 0, scale: 0.95 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionEnabled ? motionTransition('fast') : { duration: 0 }}
          className={cn(
            'mb-4 flex items-center justify-center rounded-2xl bg-pastel-sky text-brand shadow-sm',
            compact ? 'size-14' : 'size-16',
            iconClassName,
          )}
        >
          <Icon className={compact ? 'size-7' : 'size-8'} aria-hidden />
        </motion.div>
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
    </motion.div>
  )
}
