'use client'

import { useEffect } from 'react'
import { initDesktopAppLogging } from '@/src/logging/app-log'

export function DesktopLoggingInit() {
  useEffect(() => {
    initDesktopAppLogging()
  }, [])

  return null
}
