import { isTauri } from '@/src/database/tauri-fs.service'

export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AppLogEntry {
  level: AppLogLevel
  category: string
  message: string
  detail?: string
}

const MAX_FIELD_CHARS = 4_096
const MAX_DETAIL_CHARS = 8_192
const FLUSH_DELAY_MS = 100
const MAX_BATCH_SIZE = 20

let initialized = false
let flushing = false
const pending: AppLogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

export function sanitizeLogField(value: string, maxChars = MAX_FIELD_CHARS): string {
  const collapsed = value.replace(/[\r\n]+/g, ' ').trim()
  if (collapsed.length <= maxChars) return collapsed
  return `${collapsed.slice(0, maxChars)}…`
}

function normalizeDetail(detail: unknown): string | undefined {
  if (detail == null) return undefined
  if (detail instanceof Error) {
    const stack = detail.stack ?? detail.message
    return sanitizeLogField(stack, MAX_DETAIL_CHARS)
  }
  if (typeof detail === 'string') {
    const trimmed = detail.trim()
    return trimmed ? sanitizeLogField(trimmed, MAX_DETAIL_CHARS) : undefined
  }
  try {
    return sanitizeLogField(JSON.stringify(detail), MAX_DETAIL_CHARS)
  } catch {
    return sanitizeLogField(String(detail), MAX_DETAIL_CHARS)
  }
}

async function invokeAppend(entries: AppLogEntry[]): Promise<void> {
  if (!isTauri() || entries.length === 0) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('append_app_logs', { entries })
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPendingLogs()
  }, FLUSH_DELAY_MS)
}

export async function flushPendingLogs(): Promise<void> {
  if (!isTauri() || flushing || pending.length === 0) return
  flushing = true
  try {
    while (pending.length > 0) {
      const batch = pending.splice(0, MAX_BATCH_SIZE)
      await invokeAppend(batch)
    }
  } catch (error) {
    console.error('[app-log] failed to write local log file:', error)
  } finally {
    flushing = false
    if (pending.length > 0) {
      scheduleFlush()
    }
  }
}

export function logAppEvent(
  level: AppLogLevel,
  category: string,
  message: string,
  detail?: unknown,
): void {
  if (!isTauri()) return

  pending.push({
    level,
    category: sanitizeLogField(category, 64),
    message: sanitizeLogField(message, MAX_FIELD_CHARS),
    detail: normalizeDetail(detail),
  })
  scheduleFlush()
}

export async function readRecentAppLogs(maxLines = 200): Promise<string[]> {
  if (!isTauri()) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string[]>('read_app_log_tail', { maxLines })
}

export async function clearAppLogs(): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('clear_app_logs')
}

export async function getAppLogDirectory(): Promise<string | null> {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('get_app_log_directory')
}

export async function openAppLogDirectory(): Promise<void> {
  const dir = await getAppLogDirectory()
  if (!dir) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('open_path', { path: dir })
}

function wrapConsoleMethod(
  level: AppLogLevel,
  original: (...args: unknown[]) => void,
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    original(...args)
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return arg.message
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      })
      .join(' ')
    const detailArg = args.find((arg) => arg instanceof Error) ?? (args.length > 1 ? args.slice(1) : undefined)
    logAppEvent(level, 'console', message, detailArg)
  }
}

export function initDesktopAppLogging(): void {
  if (initialized || typeof window === 'undefined' || !isTauri()) return
  initialized = true

  logAppEvent('info', 'app', 'Desktop logging initialized')

  window.addEventListener('error', (event) => {
    logAppEvent(
      'error',
      'window.error',
      event.message || 'Unhandled error',
      [
        event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : null,
        event.error instanceof Error ? event.error.stack : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    logAppEvent('error', 'unhandledrejection', 'Unhandled promise rejection', event.reason)
  })

  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)
  console.error = wrapConsoleMethod('error', originalError)
  console.warn = wrapConsoleMethod('warn', originalWarn)

  window.addEventListener('beforeunload', () => {
    void flushPendingLogs()
  })
}
