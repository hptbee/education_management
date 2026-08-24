'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Pause, Play, RotateCcw } from 'lucide-react'
import { ToolCardShell } from './tool-card-shell'
import { ClassroomButton } from '@/src/components/classroom'

const PRESETS = [1, 2, 5, 10] as const
const STORAGE_KEY = 'education-management:study-timer'
const DEFAULT_MINUTES = 5

type TimerSelection = (typeof PRESETS)[number] | 'custom'

interface PersistedStudyTimer {
  selection: TimerSelection
  customMinutes: number
  secondsLeft: number
  isRunning: boolean
  isFinished: boolean
  endAt: number | null
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_MINUTES
  return Math.min(180, Math.max(1, Math.round(value)))
}

function getDurationSeconds(selection: TimerSelection, customMinutes: number) {
  return (selection === 'custom' ? customMinutes : selection) * 60
}

function loadPersistedState(): PersistedStudyTimer | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PersistedStudyTimer>
    const selection: TimerSelection =
      parsed.selection === 'custom' || PRESETS.includes(parsed.selection as (typeof PRESETS)[number])
        ? (parsed.selection as TimerSelection)
        : DEFAULT_MINUTES
    const customMinutes = clampMinutes(parsed.customMinutes ?? DEFAULT_MINUTES)
    const isRunning = Boolean(parsed.isRunning)
    const isFinished = Boolean(parsed.isFinished)
    const endAt = typeof parsed.endAt === 'number' ? parsed.endAt : null

    let secondsLeft =
      typeof parsed.secondsLeft === 'number'
        ? Math.max(0, Math.round(parsed.secondsLeft))
        : getDurationSeconds(selection, customMinutes)

    if (isRunning && endAt) {
      secondsLeft = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
    }

    return {
      selection,
      customMinutes,
      secondsLeft,
      isRunning: isRunning && secondsLeft > 0,
      isFinished: isFinished || (isRunning && secondsLeft <= 0),
      endAt: isRunning && secondsLeft > 0 ? endAt : null,
    }
  } catch {
    return null
  }
}

function savePersistedState(state: PersistedStudyTimer) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function StudyTimerTool() {
  const [selection, setSelection] = useState<TimerSelection>(DEFAULT_MINUTES)
  const [customMinutes, setCustomMinutes] = useState(DEFAULT_MINUTES)
  const [customInput, setCustomInput] = useState(String(DEFAULT_MINUTES))
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    const saved = loadPersistedState()
    if (saved) {
      setSelection(saved.selection)
      setCustomMinutes(saved.customMinutes)
      setCustomInput(String(saved.customMinutes))
      setSecondsLeft(saved.secondsLeft)
      setIsRunning(saved.isRunning)
      setIsFinished(saved.isFinished)
      setEndAt(saved.endAt)
    }
    setIsHydrated(true)
    return clearTimer
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    savePersistedState({
      selection,
      customMinutes,
      secondsLeft,
      isRunning,
      isFinished,
      endAt,
    })
  }, [selection, customMinutes, secondsLeft, isRunning, isFinished, endAt, isHydrated])

  useEffect(() => {
    if (!isRunning || endAt === null) return

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearTimer()
        setIsRunning(false)
        setIsFinished(true)
        setEndAt(null)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isRunning, endAt])

  const applySelection = (nextSelection: TimerSelection, minutes?: number) => {
    if (isRunning) return

    const nextCustomMinutes = minutes ?? customMinutes
    setSelection(nextSelection)
    if (nextSelection === 'custom') {
      setCustomMinutes(nextCustomMinutes)
      setCustomInput(String(nextCustomMinutes))
    }
    setSecondsLeft(getDurationSeconds(nextSelection, nextCustomMinutes))
    setIsFinished(false)
    setEndAt(null)
  }

  const applyCustomInput = () => {
    const parsed = Number(customInput)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomInput(String(customMinutes))
      return
    }

    applySelection('custom', clampMinutes(parsed))
  }

  const handleStart = () => {
    if (secondsLeft <= 0) return
    setIsFinished(false)
    setIsRunning(true)
    setEndAt(Date.now() + secondsLeft * 1000)
  }

  const handlePause = () => {
    setIsRunning(false)
    setEndAt(null)
    clearTimer()
  }

  const handleReset = () => {
    setIsRunning(false)
    clearTimer()
    setIsFinished(false)
    setEndAt(null)
    setSecondsLeft(getDurationSeconds(selection, customMinutes))
  }

  return (
    <ToolCardShell
      icon={Clock}
      iconBg="bg-pastel-yellow"
      title="Đếm giờ học tập"
      description="Đặt thời gian rồi bắt đầu."
    >
      <div
        className={`flex min-h-[120px] flex-1 items-center justify-center rounded-2xl py-8 text-center transition ${
          isFinished ? 'bg-rose-50 ring-2 ring-rose-200' : 'bg-pastel-yellow/70'
        }`}
      >
        <p className={`font-display text-6xl font-black tabular-nums ${isFinished ? 'text-rose-600' : 'text-amber-600'}`}>
          {formatTime(secondsLeft)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PRESETS.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => applySelection(min)}
            disabled={isRunning}
            className={`min-h-11 rounded-xl px-1 text-xs font-bold transition disabled:opacity-40 ${
              selection === min
                ? 'bg-brand-purple text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {min} phút
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="study-timer-custom" className="shrink-0 text-xs font-bold text-slate-500">
          Tùy chỉnh
        </label>
        <input
          id="study-timer-custom"
          type="number"
          min={1}
          max={180}
          value={customInput}
          disabled={isRunning}
          onChange={(event) => setCustomInput(event.target.value)}
          onFocus={() => {
            if (!isRunning) applySelection('custom')
          }}
          onBlur={applyCustomInput}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          className={`min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-bold tabular-nums outline-none transition disabled:opacity-40 ${
            selection === 'custom'
              ? 'border-brand bg-brand-soft text-brand-dark ring-1 ring-brand/30'
              : 'border-slate-200 bg-white text-slate-700 focus:border-brand focus:ring-1 focus:ring-brand/30'
          }`}
        />
        <span className="shrink-0 text-xs font-bold text-slate-500">phút</span>
      </div>

      <ClassroomButton
        size="lg"
        className="mt-4 min-h-11 w-full"
        onClick={isRunning ? handlePause : handleStart}
        disabled={secondsLeft <= 0 && !isRunning}
      >
        <span className="inline-flex items-center gap-2">
          {isRunning ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          {isRunning ? 'Tạm dừng' : 'Bắt đầu'}
        </span>
      </ClassroomButton>

      <ClassroomButton variant="outline" size="lg" className="mt-2 min-h-11 w-full" onClick={handleReset}>
        <span className="inline-flex items-center gap-2">
          <RotateCcw className="size-4" aria-hidden />
          Đặt lại
        </span>
      </ClassroomButton>
    </ToolCardShell>
  )
}
