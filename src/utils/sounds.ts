export type SoundId =
  | 'click'
  | 'success'
  | 'wrong-answer'
  | 'wheel-tick'
  | 'wheel-result'
  | 'recognition'
  | 'applause'

const SOUND_PATHS: Record<SoundId, string> = {
  click: '/sounds/click.wav',
  success: '/sounds/success.wav',
  'wrong-answer': '/sounds/wrong-answer.wav',
  'wheel-tick': '/sounds/wheel-tick.wav',
  'wheel-result': '/sounds/wheel-result.wav',
  recognition: '/sounds/recognition.wav',
  applause: '/sounds/applause.wav',
}

const DEFAULT_VOLUMES: Partial<Record<SoundId, number>> = {
  applause: 0.55,
  recognition: 0.7,
  'wheel-tick': 0.35,
  'wheel-result': 0.65,
  success: 0.6,
  'wrong-answer': 0.55,
  click: 0.4,
}

export interface PlaySoundOptions {
  enabled?: boolean
  volume?: number
}

export function playSound(id: SoundId, options: PlaySoundOptions = {}): void {
  if (options.enabled === false) return
  if (typeof window === 'undefined') return

  const audio = new Audio(SOUND_PATHS[id])
  audio.volume = options.volume ?? DEFAULT_VOLUMES[id] ?? 0.6
  void audio.play().catch(() => {
    // Autoplay blocked or missing asset — ignore.
  })
}

const WHEEL_TICK_INTERVAL_MS = 140

/** Plays wheel tick SFX on an interval for the spin duration. Returns a cleanup function. */
export function startWheelTicks(durationMs: number, enabled = true): () => void {
  if (!enabled || durationMs <= 0 || typeof window === 'undefined') {
    return () => {}
  }

  playSound('wheel-tick', { enabled })

  const intervalId = window.setInterval(() => {
    playSound('wheel-tick', { enabled })
  }, WHEEL_TICK_INTERVAL_MS)

  const timeoutId = window.setTimeout(() => {
    window.clearInterval(intervalId)
  }, durationMs)

  return () => {
    window.clearInterval(intervalId)
    window.clearTimeout(timeoutId)
  }
}
