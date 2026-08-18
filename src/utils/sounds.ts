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

const SOUND_MIME = 'audio/wav'

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

const blobUrlCache = new Map<SoundId, string>()
let preloadStarted = false
let audioUnlocked = false

/** Resolve a public-folder path against the current page origin (Tauri + static export). */
export function resolvePublicAssetPath(path: string): string {
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).href
}

async function loadSoundUrl(id: SoundId): Promise<string | null> {
  const cached = blobUrlCache.get(id)
  if (cached) return cached

  const assetUrl = resolvePublicAssetPath(SOUND_PATHS[id])
  try {
    const response = await fetch(assetUrl)
    if (!response.ok) {
      console.warn(`[sounds] Failed to load ${assetUrl}: HTTP ${response.status}`)
      return null
    }
    const buffer = await response.arrayBuffer()
    const blob = new Blob([buffer], { type: SOUND_MIME })
    const blobUrl = URL.createObjectURL(blob)
    blobUrlCache.set(id, blobUrl)
    return blobUrl
  } catch (error) {
    console.warn(`[sounds] Failed to fetch ${assetUrl}:`, error)
    return null
  }
}

/** Preload bundled sounds into blob URLs (explicit MIME helps Tauri WebView2). */
export function preloadSounds(): void {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true
  const ids = Object.keys(SOUND_PATHS) as SoundId[]
  void Promise.all(ids.map((id) => loadSoundUrl(id)))
}

/**
 * Unlock HTML audio after the first user gesture so delayed SFX (wheel, overlay) can play.
 * Safe to call multiple times.
 */
export function unlockSounds(): void {
  if (audioUnlocked || typeof window === 'undefined') return
  audioUnlocked = true
  preloadSounds()
  void loadSoundUrl('click').then((url) => {
    if (!url) return
    const audio = new Audio(url)
    audio.volume = 0.001
    void audio.play().catch(() => {
      // Strict autoplay — later play() calls may still work after explicit actions.
    })
  })
}

export function initSoundSystem(): void {
  if (typeof window === 'undefined') return

  const onFirstGesture = () => {
    unlockSounds()
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
  }

  window.addEventListener('pointerdown', onFirstGesture, { passive: true })
  window.addEventListener('keydown', onFirstGesture, { passive: true })
  preloadSounds()
}

export function playSound(id: SoundId, options: PlaySoundOptions = {}): void {
  if (options.enabled === false) return
  if (typeof window === 'undefined') return

  void (async () => {
    const url = await loadSoundUrl(id)
    if (!url) return

    const audio = new Audio(url)
    audio.volume = options.volume ?? DEFAULT_VOLUMES[id] ?? 0.6
    try {
      await audio.play()
    } catch (error) {
      console.warn(`[sounds] play() blocked for ${id}:`, error)
    }
  })()
}

/** Recognition ceremony sting — call from the submit click handler (user gesture). */
export function playRecognitionCelebration(enabled = true): void {
  if (!enabled) return
  playSound('recognition', { enabled })
  window.setTimeout(() => {
    playSound('applause', { enabled })
  }, 400)
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
