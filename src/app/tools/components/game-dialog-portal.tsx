'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { backdropVariants, motionTransition, reducedMotionTransition } from '@/src/utils/motion'

interface GameDialogPortalProps {
  children: React.ReactNode
  open?: boolean
}

/** Portals full-screen game dialogs to document.body so they cover sidebar and presentation chrome. */
export function GameDialogPortal({ children, open = true }: GameDialogPortalProps) {
  const [mounted, setMounted] = useState(false)
  const motionEnabled = useMotionEnabled()
  const transition = motionEnabled ? motionTransition('normal') : reducedMotionTransition()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !open) return
    const body = document.body
    const count = Number.parseInt(body.dataset.gameDialogCount ?? '0', 10) + 1
    body.dataset.gameDialogCount = String(count)
    body.dataset.gameDialogOpen = 'true'
    return () => {
      const next = Math.max(0, Number.parseInt(body.dataset.gameDialogCount ?? '1', 10) - 1)
      body.dataset.gameDialogCount = String(next)
      if (next === 0) {
        delete body.dataset.gameDialogOpen
        delete body.dataset.gameDialogCount
      }
    }
  }, [mounted, open])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="game-dialog-chrome"
          className="contents"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={backdropVariants}
          transition={transition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export function isGameDialogOpen(): boolean {
  if (typeof document === 'undefined') return false
  return document.body.dataset.gameDialogOpen === 'true'
}

export const GAME_DIALOG_FORCE_CLOSE_EVENT = 'classroom:game-dialog-force-close'

export function requestCloseOpenGameDialogs(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GAME_DIALOG_FORCE_CLOSE_EVENT))
}

export function useGameDialogForceClose(onClose: () => void): void {
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener(GAME_DIALOG_FORCE_CLOSE_EVENT, handler)
    return () => window.removeEventListener(GAME_DIALOG_FORCE_CLOSE_EVENT, handler)
  }, [onClose])
}
