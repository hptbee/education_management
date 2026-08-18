'use client'

import { useEffect } from 'react'
import { initSoundSystem } from '@/src/utils/sounds'

export function SoundInit() {
  useEffect(() => {
    initSoundSystem()
  }, [])

  return null
}
