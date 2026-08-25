'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { cn } from '@/lib/utils'
import {
  ENTRANCE_DURATION_MAP,
  ENTRANCE_VARIANT_MAP,
  type EntrancePreset,
  type EntranceVariant,
  motionTransition,
  resolveEntrancePreset,
  shouldAnimateEntranceItem,
  staggerDelay,
} from '@/src/utils/motion'

interface AnimatedEntranceProps {
  children: ReactNode
  variant?: EntranceVariant
  staggerIndex?: number
  className?: string
}

export function AnimatedEntrance({
  children,
  variant = 'random',
  staggerIndex,
  className,
}: AnimatedEntranceProps) {
  const motionEnabled = useMotionEnabled()
  const { isPresentationMode } = usePresentationMode()
  const skipMotion =
    !motionEnabled ||
    isPresentationMode ||
    !shouldAnimateEntranceItem(staggerIndex)

  const presetRef = useRef<EntrancePreset | null>(null)

  if (skipMotion) {
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  if (presetRef.current === null) {
    presetRef.current = resolveEntrancePreset(variant, presetRef.current)
  }

  const preset = presetRef.current
  const variants = ENTRANCE_VARIANT_MAP[preset]
  const duration = ENTRANCE_DURATION_MAP[preset]
  const delaySeconds = staggerDelay(staggerIndex ?? 0) / 1000

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{
        ...motionTransition(duration),
        delay: delaySeconds,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
