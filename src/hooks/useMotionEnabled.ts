'use client'

import { useReducedMotion } from 'framer-motion'
import { useAppData } from '@/src/store/AppDataContext'
import { canAnimate } from '@/src/utils/motion'

export function useMotionEnabled(): boolean {
  const { data } = useAppData()
  const reducedMotion = useReducedMotion()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  return canAnimate(animationsEnabled) && !reducedMotion
}
