export type SoundId =
  | 'click'
  | 'success'
  | 'wrong-answer'
  | 'wheel-tick'
  | 'wheel-result'
  | 'recognition'
  | 'applause'
  | 'quack'

const SOUND_PATHS: Record<SoundId, string> = {
  click: '/sounds/click.wav',
  success: '/sounds/success.wav',
  'wrong-answer': '/sounds/wrong-answer.wav',
  'wheel-tick': '/sounds/wheel-tick.wav',
  'wheel-result': '/sounds/wheel-result.wav',
  recognition: '/sounds/recognition.wav',
  applause: '/sounds/applause.wav',
  quack: '/sounds/quack.wav',
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
  quack: 0.22,
}

/** Randomized gap between Duck Race ambient quack events (ms). */
export const DUCK_RACE_QUACK_MIN_MS = 800
export const DUCK_RACE_QUACK_MAX_MS = 2000

/** Short gap between the two quacks in an occasional double-quack (ms). */
export const DUCK_RACE_DOUBLE_QUACK_GAP_MIN_MS = 150
export const DUCK_RACE_DOUBLE_QUACK_GAP_MAX_MS = 300

/** Chance each quack event is a sequential "quack quack" pair. */
export const DUCK_RACE_DOUBLE_QUACK_CHANCE = 0.3

export function nextDuckRaceQuackDelayMs(random = Math.random): number {
  return DUCK_RACE_QUACK_MIN_MS + random() * (DUCK_RACE_QUACK_MAX_MS - DUCK_RACE_QUACK_MIN_MS)
}

export function nextDuckRaceDoubleQuackGapMs(random = Math.random): number {
  return (
    DUCK_RACE_DOUBLE_QUACK_GAP_MIN_MS +
    random() * (DUCK_RACE_DOUBLE_QUACK_GAP_MAX_MS - DUCK_RACE_DOUBLE_QUACK_GAP_MIN_MS)
  )
}

export function shouldPlayDuckRaceDoubleQuack(random = Math.random): boolean {
  return random() < DUCK_RACE_DOUBLE_QUACK_CHANCE
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

/** Duck Race — race actually begins (after countdown). */
export function playDuckRaceStart(enabled = true): void {
  if (!enabled) return
  playSound('success', { enabled })
}

/** Duck Race — first duck crosses finish (once per race). */
export function playDuckRaceFinish(enabled = true): void {
  if (!enabled) return
  playSound('wheel-result', { enabled })
  window.setTimeout(() => {
    playSound('applause', { enabled })
  }, 400)
}

/**
 * Occasional ambient quacks while Duck Race is running.
 * Random 0.8–2s gaps; ~30% double-quack pairs; never overlaps; returns stop/cleanup.
 */
export function startDuckRaceQuacks(enabled = true): () => void {
  if (!enabled || typeof window === 'undefined') {
    return () => {}
  }

  let stopped = false
  let timeoutId: number | null = null
  let gapTimeoutId: number | null = null
  let activeAudio: HTMLAudioElement | null = null
  let releaseActivePlay: (() => void) | null = null

  const clearTimer = () => {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
    if (gapTimeoutId != null) {
      window.clearTimeout(gapTimeoutId)
      gapTimeoutId = null
    }
  }

  const stop = () => {
    stopped = true
    clearTimer()
    releaseActivePlay?.()
    releaseActivePlay = null
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.src = ''
      activeAudio = null
    }
  }

  const schedule = () => {
    if (stopped) return
    clearTimer()
    timeoutId = window.setTimeout(() => {
      timeoutId = null
      void playEvent()
    }, nextDuckRaceQuackDelayMs())
  }

  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      gapTimeoutId = window.setTimeout(() => {
        gapTimeoutId = null
        resolve()
      }, ms)
    })

  const playQuackOnce = async (): Promise<void> => {
    if (stopped || activeAudio) return

    const url = await loadSoundUrl('quack')
    if (!url || stopped) return

    await new Promise<void>((resolve) => {
      const audio = new Audio(url)
      audio.volume = DEFAULT_VOLUMES.quack ?? 0.22
      activeAudio = audio

      const onDone = () => {
        releaseActivePlay = null
        if (activeAudio === audio) activeAudio = null
        resolve()
      }

      releaseActivePlay = onDone

      audio.addEventListener('ended', onDone, { once: true })
      audio.addEventListener('error', onDone, { once: true })

      void audio.play().catch(onDone)
    })
  }

  const playEvent = async () => {
    if (stopped) return
    if (activeAudio) {
      schedule()
      return
    }

    await playQuackOnce()
    if (stopped) return

    if (shouldPlayDuckRaceDoubleQuack()) {
      await waitMs(nextDuckRaceDoubleQuackGapMs())
      if (stopped) return
      await playQuackOnce()
    }

    if (!stopped) schedule()
  }

  schedule()
  return stop
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
