'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Pause, Play, RotateCcw } from 'lucide-react'

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
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer()
          setIsRunning(false)
          setIsFinished(true)
          setEndAt(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [isRunning])

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
    <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <Clock className="size-5 text-amber-500" />
        <div>
          <h2 className="font-display text-base font-extrabold text-slate-800">Đếm giờ học tập</h2>
          <p className="text-xs font-semibold text-slate-500">Đặt thời gian rồi bắt đầu.</p>
        </div>
      </header>

      <div
        className={`rounded-2xl py-6 text-center transition ${
          isFinished ? 'animate-pulse bg-rose-50 ring-2 ring-rose-300' : 'bg-amber-50'
        }`}
      >
        <p className={`font-display text-5xl font-black tabular-nums ${isFinished ? 'text-rose-600' : 'text-amber-600'}`}>
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
            className={`rounded-xl py-2 text-xs font-bold transition disabled:opacity-40 ${
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
          className={`w-full rounded-xl border px-3 py-2 text-sm font-bold tabular-nums outline-none transition disabled:opacity-40 ${
            selection === 'custom'
              ? 'border-brand-purple bg-violet-50 text-brand-purple ring-1 ring-brand-purple/30'
              : 'border-slate-200 bg-white text-slate-700 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30'
          }`}
        />
        <span className="shrink-0 text-xs font-bold text-slate-500">phút</span>
      </div>

      <button
        type="button"
        onClick={isRunning ? handlePause : handleStart}
        disabled={secondsLeft <= 0 && !isRunning}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple py-3 text-sm font-extrabold text-white transition hover:bg-brand-purple-dark disabled:opacity-50"
      >
        {isRunning ? (
          <>
            <Pause className="size-4" /> Tạm dừng
          </>
        ) : (
          <>
            <Play className="size-4" /> Bắt đầu
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleReset}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <RotateCcw className="size-4" /> Đặt lại
      </button>
    </section>
  )
}
