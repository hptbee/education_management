import type { Transition, Variants } from 'framer-motion'

/** Duration tokens in milliseconds (for CSS). */
export const MOTION_DURATION_MS = {
  fast: 120,
  normal: 180,
  smooth: 250,
  entrance: 320,
  emphasis: 350,
  page: 1500,
} as const

/** Duration tokens in seconds (for Framer Motion). */
export const MOTION_DURATION_S = {
  fast: MOTION_DURATION_MS.fast / 1000,
  normal: MOTION_DURATION_MS.normal / 1000,
  smooth: MOTION_DURATION_MS.smooth / 1000,
  entrance: MOTION_DURATION_MS.entrance / 1000,
  emphasis: MOTION_DURATION_MS.emphasis / 1000,
  page: MOTION_DURATION_MS.page / 1000,
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
export function staggerDelay(index: number, stepMs = 60, capMs = 160): number {
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

/** Component entrance presets — subtle opacity/transform only. */
export const ENTRANCE_PRESETS = ['fade', 'fadeUp', 'fadeScale'] as const

export type EntrancePreset = (typeof ENTRANCE_PRESETS)[number]

export type EntranceVariant = EntrancePreset | 'random'

export const MAX_ENTRANCE_ANIMATED_ITEMS = 8

export const entranceFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

export const entranceFadeUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

export const entranceFadeScaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
}

export const ENTRANCE_VARIANT_MAP: Record<EntrancePreset, Variants> = {
  fade: entranceFadeVariants,
  fadeUp: entranceFadeUpVariants,
  fadeScale: entranceFadeScaleVariants,
}

export const ENTRANCE_DURATION_MAP: Record<EntrancePreset, keyof typeof MOTION_DURATION_S> = {
  fade: 'entrance',
  fadeUp: 'emphasis',
  fadeScale: 'emphasis',
}

export function pickEntrancePreset(rng: () => number = Math.random): EntrancePreset {
  const index = Math.floor(rng() * ENTRANCE_PRESETS.length)
  return ENTRANCE_PRESETS[Math.min(index, ENTRANCE_PRESETS.length - 1)]
}

export function resolveEntrancePreset(
  variant: EntranceVariant,
  stored?: EntrancePreset | null,
  rng: () => number = Math.random,
): EntrancePreset {
  if (variant !== 'random') return variant
  return stored ?? pickEntrancePreset(rng)
}

export function shouldAnimateEntranceItem(index?: number): boolean {
  if (index === undefined) return true
  return index < MAX_ENTRANCE_ANIMATED_ITEMS
}

/** Playful page transitions — same language, small transforms, short-lived decor. */
export const PAGE_TRANSITION_PRESETS = [
  'bouncyPop',
  'colorfulSlide',
  'bubbleReveal',
  'sparkleReveal',
] as const

export type PageTransitionPreset = (typeof PAGE_TRANSITION_PRESETS)[number]

export interface PagePersonality {
  preferred: PageTransitionPreset
  colors: readonly string[]
}

export interface PageTransitionPick {
  path: string
  preset: PageTransitionPreset
  slideDir: 1 | -1
}

const DEFAULT_PAGE_PERSONALITY: PagePersonality = {
  preferred: 'bouncyPop',
  colors: ['bg-brand/30', 'bg-brand-light/40', 'bg-accent-pink/30'],
}

export const PAGE_PERSONALITY: Record<string, PagePersonality> = {
  '/': { preferred: 'sparkleReveal', colors: ['bg-star/50', 'bg-accent-pink/40', 'bg-brand/30'] },
  '/students': { preferred: 'bouncyPop', colors: ['bg-brand/30', 'bg-brand-soft', 'bg-accent-sky/40'] },
  '/points': { preferred: 'colorfulSlide', colors: ['bg-star/50', 'bg-warning/40', 'bg-accent-peach/40'] },
  '/rewards': { preferred: 'sparkleReveal', colors: ['bg-accent-pink/40', 'bg-accent-peach/40', 'bg-star/40'] },
  '/ranking': { preferred: 'sparkleReveal', colors: ['bg-star/50', 'bg-tier-gold/50', 'bg-accent-peach/30'] },
  '/teams': { preferred: 'colorfulSlide', colors: ['bg-tot-1/60', 'bg-tot-2/60', 'bg-tot-3/60'] },
  '/classrooms': { preferred: 'bubbleReveal', colors: ['bg-brand/30', 'bg-brand-light/40', 'bg-pastel-sky'] },
  '/seating-chart': { preferred: 'colorfulSlide', colors: ['bg-brand/30', 'bg-accent-sky/40', 'bg-brand-soft'] },
  '/tools': { preferred: 'bouncyPop', colors: ['bg-brand/30', 'bg-brand-purple/30', 'bg-tot-3/50'] },
  '/settings': { preferred: 'colorfulSlide', colors: ['bg-brand/25', 'bg-muted', 'bg-brand-soft'] },
  '/recognition': { preferred: 'sparkleReveal', colors: ['bg-star/50', 'bg-accent-pink/30', 'bg-brand/30'] },
}

export function personalityForPath(pathname: string): PagePersonality {
  if (pathname === '/' || pathname === '') return PAGE_PERSONALITY['/']
  const prefixes = Object.keys(PAGE_PERSONALITY)
    .filter((key) => key !== '/')
    .sort((a, b) => b.length - a.length)
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return PAGE_PERSONALITY[prefix]
    }
  }
  return DEFAULT_PAGE_PERSONALITY
}

export function pickPageTransition(
  pathname: string,
  rng: () => number = Math.random,
): PageTransitionPick {
  const personality = personalityForPath(pathname)
  const preferredRoll = rng()
  let preset: PageTransitionPreset
  if (preferredRoll < 0.5) {
    preset = personality.preferred
  } else {
    const index = Math.floor(rng() * PAGE_TRANSITION_PRESETS.length)
    preset = PAGE_TRANSITION_PRESETS[Math.min(index, PAGE_TRANSITION_PRESETS.length - 1)]
  }
  const slideDir: 1 | -1 = rng() < 0.5 ? -1 : 1
  return { path: pathname, preset, slideDir }
}

export function resolvePageTransition(
  pathname: string,
  stored?: PageTransitionPick | null,
  rng: () => number = Math.random,
): PageTransitionPick {
  if (stored && stored.path === pathname) return stored
  return pickPageTransition(pathname, rng)
}

export const PAGE_DECOR_DURATION_S = 0.36

export function pageContentVariants(pick: PageTransitionPick): Variants {
  switch (pick.preset) {
    case 'bouncyPop':
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: [0.96, 1.02, 1] },
      }
    case 'colorfulSlide':
      return {
        initial: { opacity: 0, x: 20 * pick.slideDir },
        animate: { opacity: 1, x: 0 },
      }
    case 'bubbleReveal':
      return {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
      }
    case 'sparkleReveal':
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      }
  }
}

export function pageContentTransition(preset: PageTransitionPreset): Transition {
  if (preset === 'bouncyPop') {
    return {
      duration: MOTION_DURATION_S.page,
      times: [0, 0.62, 1],
      ease: MOTION_EASING.enter as Transition['ease'],
    }
  }
  return motionTransition('page')
}
