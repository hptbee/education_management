/**
 * Curated pastel palette helpers for teams, roles, and avatars.
 * Presentation-only — no persistence.
 * Cycle: pink, sky, lavender, peach, yellow
 */

export interface PastelSurfaceStyle {
  bg: string
  text: string
  dot: string
  badge: string
  ring?: string
  bar?: string
}

const TEAM_PALETTE: PastelSurfaceStyle[] = [
  { bg: 'bg-pastel-pink', text: 'text-rose-800', dot: 'bg-tot-1', badge: 'bg-pastel-pink text-rose-800', ring: 'ring-tot-1/30', bar: 'bg-tot-1' },
  { bg: 'bg-pastel-sky', text: 'text-sky-800', dot: 'bg-tot-2', badge: 'bg-pastel-sky text-sky-800', ring: 'ring-tot-2/30', bar: 'bg-tot-2' },
  { bg: 'bg-pastel-lavender', text: 'text-violet-800', dot: 'bg-tot-3', badge: 'bg-pastel-lavender text-violet-800', ring: 'ring-tot-3/30', bar: 'bg-tot-3' },
  { bg: 'bg-pastel-peach', text: 'text-orange-800', dot: 'bg-tot-4', badge: 'bg-pastel-peach text-orange-800', ring: 'ring-tot-4/30', bar: 'bg-tot-4' },
  { bg: 'bg-pastel-yellow', text: 'text-amber-800', dot: 'bg-star', badge: 'bg-pastel-yellow text-amber-800', ring: 'ring-star/30', bar: 'bg-star' },
]

const ROLE_PALETTE: Array<{ badge: string }> = [
  { badge: 'bg-pastel-sky text-sky-800' },
  { badge: 'bg-pastel-pink text-rose-800' },
  { badge: 'bg-pastel-lavender text-violet-800' },
  { badge: 'bg-pastel-peach text-orange-800' },
  { badge: 'bg-pastel-yellow text-amber-800' },
]

const AVATAR_PALETTE = [
  'bg-pastel-sky',
  'bg-pastel-pink',
  'bg-pastel-lavender',
  'bg-pastel-peach',
  'bg-pastel-yellow',
] as const

export function getTeamPastelStyle(index: number): PastelSurfaceStyle {
  return TEAM_PALETTE[index % TEAM_PALETTE.length]
}

export function getRolePastelStyle(index: number): { badge: string } {
  return ROLE_PALETTE[index % ROLE_PALETTE.length]
}

export function getAvatarPastelClass(seed: string | number): string {
  const index = typeof seed === 'number' ? seed : seed.length
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length]
}
