'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode, Ref } from 'react'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { cn } from '@/lib/utils'
import {
  backdropVariants,
  dialogVariants,
  motionTransition,
  reducedMotionTransition,
} from '@/src/utils/motion'
import { useModalFocusTrap } from './useModalFocusTrap'

export interface ClassroomDialogFrameProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** dialog | alertdialog */
  role?: 'dialog' | 'alertdialog'
  /** id of the labelled heading inside the panel */
  ariaLabelledBy?: string
  className?: string
  panelClassName?: string
  zIndexClassName?: string
}

export function ClassroomDialogFrame({
  open,
  onClose,
  children,
  role = 'dialog',
  ariaLabelledBy,
  className,
  panelClassName,
  zIndexClassName = 'z-50',
}: ClassroomDialogFrameProps) {
  const motionEnabled = useMotionEnabled()
  const dialogRef = useModalFocusTrap(open, onClose)
  const transition = motionEnabled ? motionTransition('normal') : reducedMotionTransition()

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="classroom-dialog-overlay"
          className={cn(
            'fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm',
            zIndexClassName,
            className,
          )}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={backdropVariants}
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef as Ref<HTMLDivElement>}
            role={role}
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
            tabIndex={-1}
            className={cn('w-full outline-none', panelClassName)}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={dialogVariants}
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
