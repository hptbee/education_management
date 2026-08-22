'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { useClassroomDialog, IconTouchButton } from '@/src/components/classroom'
import { sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import {
  getScopedStudents,
  sanitizeStudentIds,
  type PickerScope,
} from '@/src/utils/pickerSession'
import { canAnimate } from '@/src/utils/motion'
import { playSound } from '@/src/utils/sounds'
import { toastInfo } from '@/src/utils/toast'
import {
  assignDuckRaceFieldYs,
  clampDuckRaceDurationMs,
  DUCK_RACE_DEFAULT_DURATION_SEC,
  DUCK_RACE_MAX_RACERS,
  duckRaceVisualTier,
  generateRacePlan,
  hasWinnerReachedFinish,
  sampleRaceFinishFrame,
  sampleRaceProgress,
  type DuckRacePlan,
} from '@/src/utils/duckRaceSimulation'
import { DuckRaceSetup } from './duck-race-setup'
import { DuckRaceTrack } from './duck-race-track'
import { DuckRaceResult } from './duck-race-result'

type RacePhase = 'setup' | 'ready' | 'racing' | 'result'

/** Finish layout — duck leading edge meets stripe while body stays on-screen. */
const FINISH_START_INSET_PX = 16 // left-4 anchor
const FINISH_END_INSET_PX = 32 // right-5 (20px) + stripe w-3 (12px)
const FINISH_CROWN_SLACK_PX = 28 // crown + winner chip above duck
const FINISH_WINNER_SCALE = 1.2

/** Approximate duck glyph width (px) per visual tier — matches tailwind w-* on SVG. */
const DUCK_BODY_WIDTH_PX: Record<ReturnType<typeof duckRaceVisualTier>, number> = {
  large: 56,
  medium: 40,
  small: 28,
  compact: 20,
}

function computeDuckMaxTravel(fieldWidthPx: number, tier: ReturnType<typeof duckRaceVisualTier>): number {
  const duckWidth = DUCK_BODY_WIDTH_PX[tier] * FINISH_WINNER_SCALE
  const reserved =
    FINISH_START_INSET_PX + FINISH_END_INSET_PX + duckWidth + FINISH_CROWN_SLACK_PX
  return Math.max(fieldWidthPx - reserved, 48)
}

function wobblePx(studentId: string, elapsedMs: number): number {
  let hash = 0
  for (let i = 0; i < studentId.length; i++) hash = (hash + studentId.charCodeAt(i) * (i + 1)) % 360
  return Math.sin(elapsedMs / 280 + hash) * 3.5
}

interface DuckRaceDialogProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
  teams: Team[]
}

export function DuckRaceDialog({ isOpen, onClose, students, teams }: DuckRaceDialogProps) {
  const { data, setDuckRaceStudentBag, recordDuckRaceResult } = useAppData()
  const classroomId = data?.metadata.id
  const { showConfirm } = useClassroomDialog()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  const soundEnabled = data?.appSettings.soundEnabled ?? true
  const allowMotion = canAnimate(animationsEnabled)
  const bagRef = useRef<string[]>([])
  const duckRaceStudentBag = data?.duckRaceStudentBag

  useEffect(() => {
    bagRef.current = duckRaceStudentBag ?? []
  }, [duckRaceStudentBag])

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const [phase, setPhase] = useState<RacePhase>('setup')
  const [scopeType, setScopeType] = useState<PickerScope>('classroom')
  const [teamId, setTeamId] = useState<string | undefined>()
  const [preventRepeat, setPreventRepeat] = useState(true)
  const [raceDurationSec, setRaceDurationSec] = useState(DUCK_RACE_DEFAULT_DURATION_SEC)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [initialized, setInitialized] = useState(false)
  const [racers, setRacers] = useState<Student[]>([])
  const [fieldYs, setFieldYs] = useState<Record<string, number>>({})
  const [winner, setWinner] = useState<Student | null>(null)
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null)
  const [raceGeneration, setRaceGeneration] = useState(0)
  const [spotlightWinnerId, setSpotlightWinnerId] = useState<string | null>(null)

  const duckRefs = useRef<Array<HTMLDivElement | null>>([])
  const fieldElRef = useRef<HTMLDivElement | null>(null)
  const fieldYsRef = useRef<Record<string, number>>({})
  const rafRef = useRef<number | null>(null)
  const countdownTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const planRef = useRef<DuckRacePlan | null>(null)
  const trackWidthRef = useRef(0)
  const winnerAnnouncedRef = useRef(false)
  /** Last frozen progress snapshot — re-applied after React re-renders so winner stays at finish. */
  const frozenProgressRef = useRef<Record<string, number> | null>(null)
  const frozenRacersRef = useRef<Student[]>([])

  const clearAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    for (const timer of countdownTimersRef.current) clearTimeout(timer)
    countdownTimersRef.current = []
    setCountdownLabel(null)
  }, [])

  const resetDucksToStart = useCallback(() => {
    frozenProgressRef.current = null
    frozenRacersRef.current = []
    for (const node of duckRefs.current) {
      if (node) node.style.transform = 'translate3d(0, -50%, 0)'
    }
  }, [])

  const resetToSetup = useCallback(() => {
    clearAnimation()
    planRef.current = null
    winnerAnnouncedRef.current = false
    fieldYsRef.current = {}
    setFieldYs({})
    setPhase('setup')
    setRacers([])
    setWinner(null)
    setSpotlightWinnerId(null)
    resetDucksToStart()
  }, [clearAnimation, resetDucksToStart])

  useEffect(() => {
    if (!isOpen) {
      clearAnimation()
      winnerAnnouncedRef.current = false
      frozenProgressRef.current = null
      frozenRacersRef.current = []
      setPhase('setup')
      setWinner(null)
      setRacers([])
      setFieldYs({})
      fieldYsRef.current = {}
      setSpotlightWinnerId(null)
      setCountdownLabel(null)
      setInitialized(false)
      return
    }

    if (!initialized) {
      setSelectedIds(new Set(sortedStudents.map((s) => s.id)))
      setScopeType('classroom')
      setTeamId(undefined)
      setPreventRepeat(true)
      setRaceDurationSec(DUCK_RACE_DEFAULT_DURATION_SEC)
      setSearchQuery('')
      setInitialized(true)
      setPhase('setup')
    }
  }, [isOpen, initialized, sortedStudents, clearAnimation])

  useEffect(() => () => clearAnimation(), [clearAnimation])

  const scopedStudents = useMemo(
    () => getScopedStudents(sortedStudents, scopeType, teamId),
    [sortedStudents, scopeType, teamId],
  )

  useEffect(() => {
    const valid = new Set(scopedStudents.map((s) => s.id))
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)))
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev
      return next
    })
  }, [scopedStudents])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return scopedStudents
    return scopedStudents.filter((s) => s.name.toLowerCase().includes(q))
  }, [scopedStudents, searchQuery])

  const applyFieldProgress = useCallback(
    (progressById: Record<string, number>, racerList: Student[], elapsedMs = 0) => {
      const tier = duckRaceVisualTier(racerList.length)
      const maxTravel = computeDuckMaxTravel(trackWidthRef.current, tier)
      racerList.forEach((student, index) => {
        const node = duckRefs.current[index]
        if (!node) return
        const progress = progressById[student.id] ?? 0
        const wobble = elapsedMs > 0 ? wobblePx(student.id, elapsedMs) : 0
        node.style.transform = `translate3d(${progress * maxTravel}px, calc(-50% + ${wobble}px), 0)`
      })
    },
    [],
  )

  const raceGenerationRef = useRef(0)
  useEffect(() => {
    raceGenerationRef.current = raceGeneration
  }, [raceGeneration])

  /** Hard-stop: freeze finish-frame positions, cancel rAF, announce winner. No settle. */
  const finishRaceImmediately = useCallback(
    (plan: DuckRacePlan, racerList: Student[], generation: number, elapsedMs: number) => {
      if (generation !== raceGenerationRef.current) return
      if (winnerAnnouncedRef.current) return
      winnerAnnouncedRef.current = true

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      const winnerStudent = racerList.find((s) => s.id === plan.winnerId) ?? null
      if (!winnerStudent) return

      const finishProgress = sampleRaceFinishFrame(plan, elapsedMs)
      frozenProgressRef.current = finishProgress
      frozenRacersRef.current = racerList
      applyFieldProgress(finishProgress, racerList, 0)

      setSpotlightWinnerId(plan.winnerId)
      setWinner(winnerStudent)
      setPhase('result')
      recordDuckRaceResult({
        winnerId: plan.winnerId,
        winnerIds: plan.winnerIds,
        participantIds: plan.racerIds,
      })

      if (preventRepeat) {
        const available = racerList.map((s) => s.id)
        let bag = bagRef.current.filter((id) => available.includes(id))
        if (bag.length === 0) bag = available
        const next = bag.filter((id) => id !== plan.winnerId)
        bagRef.current = next
        setDuckRaceStudentBag(next)
      }

      playSound('success', { enabled: soundEnabled })
      playSound('applause', { enabled: soundEnabled })
      if (allowMotion) {
        void confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#4ba3e8', '#efa3bc', '#f7c948', '#ffffff'],
        })
      }
    },
    [allowMotion, applyFieldProgress, preventRepeat, recordDuckRaceResult, setDuckRaceStudentBag, soundEnabled],
  )

  // After winner highlight re-render, re-apply frozen transforms so the duck stays at the finish.
  useEffect(() => {
    if (phase !== 'result') return
    const progress = frozenProgressRef.current
    const list = frozenRacersRef.current
    if (!progress || list.length === 0) return
    const id = requestAnimationFrame(() => {
      applyFieldProgress(progress, list, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [phase, spotlightWinnerId, applyFieldProgress])

  const runRaceAnimation = useCallback(
    (plan: DuckRacePlan, racerList: Student[], generation: number) => {
      planRef.current = plan
      winnerAnnouncedRef.current = false
      setPhase('racing')
      playSound('success', { enabled: soundEnabled })

      const winnerProfile = plan.profiles.find((p) => p.studentId === plan.winnerId)
      const winnerFinishMs = winnerProfile?.finishMs ?? plan.durationMs

      if (!allowMotion) {
        finishRaceImmediately(plan, racerList, generation, winnerFinishMs)
        return
      }

      const startedAt = performance.now()

      const tick = (now: number) => {
        if (generation !== raceGenerationRef.current) return
        if (winnerAnnouncedRef.current) return

        const elapsed = now - startedAt

        // Hard stop on the first frame the winner reaches the finish — no next rAF.
        if (hasWinnerReachedFinish(plan, elapsed) || elapsed >= plan.durationMs) {
          finishRaceImmediately(plan, racerList, generation, Math.min(elapsed, winnerFinishMs))
          return
        }

        applyFieldProgress(sampleRaceProgress(plan, elapsed), racerList, elapsed)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [allowMotion, applyFieldProgress, finishRaceImmediately, soundEnabled],
  )

  const measureField = useCallback(() => {
    const el = fieldElRef.current
    trackWidthRef.current = el?.clientWidth ?? 480
  }, [])

  const beginCountdownThenRace = useCallback(
    (plan: DuckRacePlan, racerList: Student[], generation: number) => {
      clearAnimation()
      winnerAnnouncedRef.current = false
      resetDucksToStart()
      setRacers(racerList)
      setWinner(null)
      setSpotlightWinnerId(null)
      setPhase('ready')

      requestAnimationFrame(() => {
        measureField()
        resetDucksToStart()
      })

      if (!allowMotion) {
        runRaceAnimation(plan, racerList, generation)
        return
      }

      const steps = ['3', '2', '1', 'GO!']
      steps.forEach((label, index) => {
        const timer = setTimeout(() => {
          if (generation !== raceGenerationRef.current) return
          setCountdownLabel(label)
          playSound('click', { enabled: soundEnabled })
          if (index === steps.length - 1) {
            const goTimer = setTimeout(() => {
              if (generation !== raceGenerationRef.current) return
              setCountdownLabel(null)
              measureField()
              runRaceAnimation(plan, racerList, generation)
            }, 450)
            countdownTimersRef.current.push(goTimer)
          }
        }, index * 650)
        countdownTimersRef.current.push(timer)
      })
    },
    [allowMotion, clearAnimation, measureField, resetDucksToStart, runRaceAnimation, soundEnabled],
  )

  const startRace = useCallback(() => {
    if (phase !== 'setup' && phase !== 'result') return

    const selected = scopedStudents.filter((s) => selectedIds.has(s.id))
    if (selected.length === 0) return
    if (selected.length > DUCK_RACE_MAX_RACERS) {
      toastInfo(`Tối đa ${DUCK_RACE_MAX_RACERS} vịt mỗi vòng. Bỏ chọn bớt học sinh rồi thử lại.`)
      return
    }

    let winnerId: string
    if (preventRepeat) {
      const result = pickWithoutRepeat(
        selected.map((s) => ({ id: s.id })),
        bagRef.current,
      )
      winnerId = result.selected?.id ?? selected[0]!.id
    } else {
      winnerId = selected[Math.floor(Math.random() * selected.length)]!.id
    }

    const racerList = selected
    const plan = generateRacePlan({
      racerIds: racerList.map((s) => s.id),
      winnerId,
      durationMs: clampDuckRaceDurationMs(raceDurationSec * 1000),
    })
    const layoutSeed = (Math.random() * 0xffffffff) >>> 0
    const ys = assignDuckRaceFieldYs(plan.racerIds, layoutSeed)
    fieldYsRef.current = ys
    setFieldYs(ys)

    const generation = raceGeneration + 1
    setRaceGeneration(generation)
    duckRefs.current = []
    beginCountdownThenRace(plan, racerList, generation)
  }, [
    beginCountdownThenRace,
    phase,
    preventRepeat,
    raceDurationSec,
    raceGeneration,
    scopedStudents,
    selectedIds,
  ])

  const handleScopeChange = (scope: PickerScope) => {
    setScopeType(scope)
    if (scope === 'team' && !teamId && teams[0]) {
      setTeamId(teams[0].id)
    }
  }

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isBusy = phase === 'ready' || phase === 'racing'

  const requestClose = useCallback(async () => {
    if (isBusy) {
      const ok = await showConfirm('Đang đua vịt. Đóng cửa sổ sẽ hủy cuộc đua. Tiếp tục?', {
        variant: 'warning',
        confirmLabel: 'Đóng',
      })
      if (!ok) return
    }
    clearAnimation()
    onClose()
  }, [clearAnimation, isBusy, onClose, showConfirm])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, requestClose])

  if (!isOpen) return null

  const validSelected = new Set(
    sanitizeStudentIds([...selectedIds], new Set(scopedStudents.map((s) => s.id))),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm"
      onClick={() => void requestClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duck-race-title"
        className="flex h-[min(900px,94vh)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="duck-race-title" className="font-display text-xl font-extrabold text-slate-800">
              Đua vịt
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Chọn học sinh và bắt đầu cuộc đua vui nhộn
            </p>
          </div>
          <IconTouchButton
            onClick={() => void requestClose()}
            aria-label="Đóng"
            className="text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {phase === 'setup' ? (
            <aside className="shrink-0 border-b border-slate-100 lg:h-full lg:w-[320px] lg:border-b-0 lg:border-r">
              <div className="flex h-full max-h-[50vh] flex-col overflow-hidden bg-slate-50/70 p-3 lg:max-h-none">
                <DuckRaceSetup
                  teams={teams}
                  scopedStudents={scopedStudents}
                  filteredStudents={filteredStudents}
                  selectedIds={validSelected}
                  scopeType={scopeType}
                  teamId={teamId}
                  preventRepeat={preventRepeat}
                  raceDurationSec={raceDurationSec}
                  searchQuery={searchQuery}
                  classroomId={classroomId}
                  isBusy={isBusy}
                  onSearchChange={setSearchQuery}
                  onScopeChange={handleScopeChange}
                  onTeamChange={setTeamId}
                  onPreventRepeatChange={setPreventRepeat}
                  onRaceDurationSecChange={setRaceDurationSec}
                  onToggleStudent={toggleStudent}
                  onSelectAll={() => setSelectedIds(new Set(scopedStudents.map((s) => s.id)))}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onStart={startRace}
                />
              </div>
            </aside>
          ) : null}

          <main className="min-h-0 flex-1 p-4">
            {phase === 'setup' ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50 to-pastel-pink/40 p-6 text-center">
                <p className="font-display text-2xl font-extrabold text-slate-700">Sẵn sàng xuất phát!</p>
                <p className="mt-2 max-w-md text-sm font-semibold text-slate-500">
                  Chọn các vịt đua ở cột bên trái, rồi nhấn <strong>Bắt đầu đua</strong>. Tối đa{' '}
                  {DUCK_RACE_MAX_RACERS} vịt cùng đua trong một sân chung.
                </p>
              </div>
            ) : null}

            {phase === 'ready' || phase === 'racing' || phase === 'result' ? (
              <div className="relative h-full min-h-0">
                <DuckRaceTrack
                  racers={racers}
                  fieldYs={fieldYs}
                  duckRefs={duckRefs}
                  fieldRef={fieldElRef}
                  countdownLabel={countdownLabel}
                  winnerId={spotlightWinnerId}
                />
                {phase === 'result' && winner ? (
                  <DuckRaceResult
                    winner={winner}
                    onReplay={startRace}
                    onReselect={resetToSetup}
                    onClose={() => void requestClose()}
                  />
                ) : null}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
