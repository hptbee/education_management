'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import {
  pageContentTransition,
  pageContentVariants,
  personalityForPath,
  reducedMotionTransition,
  resolvePageTransition,
} from '@/src/utils/motion'
import { PageTransitionDecor } from './PageTransitionDecor'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const motionEnabled = useMotionEnabled()
  const { isPresentationMode } = usePresentationMode()
  const skipMotion = isPresentationMode

  const pick = useMemo(() => {
    if (!motionEnabled || skipMotion) return null
    return resolvePageTransition(pathname, null)
  }, [pathname, motionEnabled, skipMotion])

  if (!motionEnabled || skipMotion || !pick) {
    return <>{children}</>
  }

  const personality = personalityForPath(pathname)
  const variants = pageContentVariants(pick)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageTransitionDecor preset={pick.preset} colors={personality.colors} />
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        variants={variants}
        transition={motionEnabled ? pageContentTransition(pick.preset) : reducedMotionTransition()}
        className="relative z-10 flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </div>
  )
}
