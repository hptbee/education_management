'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface GameDialogPortalProps {
  children: React.ReactNode
}

/** Portals full-screen game dialogs to document.body so they cover sidebar and presentation chrome. */
export function GameDialogPortal({ children }: GameDialogPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
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
  }, [mounted])

  if (!mounted) return null
  return createPortal(children, document.body)
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
