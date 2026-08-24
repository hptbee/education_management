'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { isPresentationPath } from '@/src/utils/presentationPaths'
import { fadeUpVariants, motionTransition, reducedMotionTransition } from '@/src/utils/motion'

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const motionEnabled = useMotionEnabled()
  const { isPresentationMode } = usePresentationMode()
  const skipMotion = isPresentationMode || isPresentationPath(pathname)

  if (!motionEnabled || skipMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      key={pathname}
      initial="initial"
      animate="animate"
      variants={fadeUpVariants}
      transition={motionEnabled ? motionTransition('normal') : reducedMotionTransition()}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}
