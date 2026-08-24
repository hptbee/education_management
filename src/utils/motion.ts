import type { Transition, Variants } from 'framer-motion'

/** Duration tokens in milliseconds (for CSS). */
export const MOTION_DURATION_MS = {
  fast: 120,
  normal: 180,
  smooth: 250,
  emphasis: 350,
} as const

/** Duration tokens in seconds (for Framer Motion). */
export const MOTION_DURATION_S = {
  fast: MOTION_DURATION_MS.fast / 1000,
  normal: MOTION_DURATION_MS.normal / 1000,
  smooth: MOTION_DURATION_MS.smooth / 1000,
  emphasis: MOTION_DURATION_MS.emphasis / 1000,
} as const

export const MOTION_EASING = {
  enter: [0.16, 1, 0.3, 1] as const,
  exit: 'easeIn' as const,
  interactive: 'easeOut' as const,
} as const

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function canAnimate(animationsEnabled = true): boolean {
  return animationsEnabled && !prefersReducedMotion()
}

/** Stagger delay capped so large lists never queue long entrance animations. */
export function staggerDelay(index: number, stepMs = 40, capMs = 160): number {
  return Math.min(index * stepMs, capMs)
}

export function motionTransition(
  duration: keyof typeof MOTION_DURATION_S = 'normal',
  ease: keyof typeof MOTION_EASING = 'enter',
): Transition {
  const easeValue = MOTION_EASING[ease]
  return {
    duration: MOTION_DURATION_S[duration],
    ease: easeValue as Transition['ease'],
  }
}

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
}

export const dialogVariants: Variants = {
  initial: { opacity: 0, y: 6, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
}

export const popoverVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
}

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export function reducedMotionTransition(): Transition {
  return { duration: 0 }
}

/** Keep point bursts scoped to the classroom active at spawn time. */
export function filterBurstsForClassroom<T extends { classroomId: string }>(
  bursts: T[],
  currentClassroomId: string | undefined,
): T[] {
  if (!currentClassroomId) return []
  return bursts.filter((burst) => burst.classroomId === currentClassroomId)
}

export function resolveTransition(
  allowMotion: boolean,
  duration: keyof typeof MOTION_DURATION_S = 'normal',
): Transition {
  return allowMotion ? motionTransition(duration) : reducedMotionTransition()
}
