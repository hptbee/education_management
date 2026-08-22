'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import type { PointsWheelSegment, Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useClassroomDialog, IconTouchButton, ClassroomButton } from '@/src/components/classroom'
import { sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { createRandomSpinPlan, getWinnerRotation, type WheelSpinPlan } from '@/src/utils/wheelSpin'
import { canAnimate } from '@/src/utils/motion'
import { playSound, startWheelTicks } from '@/src/utils/sounds'
import { createId } from '@/src/utils/id'
import { toastError } from '@/src/utils/toast'
import {
  createPointsWheelSegment,
  getEnabledSegments,
  validatePointsWheelConfig,
  validateSegmentValue,
} from '@/src/utils/pointsWheelConfig'
import { formatPointsWheelLabel, pickWinningSegmentIndex } from '@/src/utils/pointsWheelSpin'
import { ValueWheel, ValueWheelPreview } from './value-wheel'
import { PointsWheelSetup } from './points-wheel-setup'
import { PointsWheelResult } from './points-wheel-result'
import { GameDialogPortal } from './game-dialog-portal'

const LIST_HIDE_DURATION_MS = 450

type PointsWheelPhase = 'setup' | 'ready' | 'spinning' | 'result'

interface PointsWheelDialogProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
}

export function PointsWheelDialog({ isOpen, onClose, students }: PointsWheelDialogProps) {
  const { data, applyPoints, setPointsWheelConfig } = useAppData()
  const classroomId = data?.metadata.id
  const segments = data?.pointsWheelConfig ?? []
  const { showConfirm } = useClassroomDialog()
  const animationsEnabled = data?.appSettings.animationsEnabled ?? true
  const soundEnabled = data?.appSettings.soundEnabled ?? true
  const allowMotion = canAnimate(animationsEnabled)
  const applyLockRef = useRef(false)

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const [phase, setPhase] = useState<PointsWheelPhase>('setup')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>()
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [winnerValue, setWinnerValue] = useState(0)
  const [pointsApplied, setPointsApplied] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinPlan, setSpinPlan] = useState<WheelSpinPlan>(() => createRandomSpinPlan())

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopWheelTicksRef = useRef<(() => void) | null>(null)

  const enabledSegments = useMemo(() => getEnabledSegments(segments), [segments])

  const clearTimers = useCallback(() => {
    stopWheelTicksRef.current?.()
    stopWheelTicksRef.current = null
    ;[spinTimeoutRef, hideTimeoutRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current)
        ref.current = null
      }
    })
  }, [])

  const goToSetup = useCallback(() => {
    clearTimers()
    setPhase('setup')
    setCurrentStudent(null)
    setWinnerValue(0)
    setPointsApplied(false)
    setIsSpinning(false)
    setIsPreparing(false)
    applyLockRef.current = false
  }, [clearTimers])

  useEffect(() => {
    if (!isOpen) {
      clearTimers()
      goToSetup()
      setSearchQuery('')
      setSelectedStudentId(undefined)
    }
  }, [isOpen, clearTimers, goToSetup])

  useEffect(() => () => clearTimers(), [clearTimers])

  const studentIdSet = useMemo(() => new Set(sortedStudents.map((s) => s.id)), [sortedStudents])

  useEffect(() => {
    if (selectedStudentId && !studentIdSet.has(selectedStudentId)) {
      setSelectedStudentId(undefined)
    }
  }, [studentIdSet, selectedStudentId])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedStudents
    return sortedStudents.filter((s) => s.name.toLowerCase().includes(q))
  }, [sortedStudents, searchQuery])

  const persistSegments = useCallback(
    (next: PointsWheelSegment[]) => {
      const error = validatePointsWheelConfig(next)
      if (error) {
        toastError(error)
        return false
      }
      setPointsWheelConfig(next)
      return true
    },
    [setPointsWheelConfig],
  )

  const handleSegmentValueChange = (id: string, value: number) => {
    const valueError = validateSegmentValue(value)
    if (valueError) {
      toastError(valueError)
      return
    }
    const next = segments.map((segment) =>
      segment.id === id ? { ...segment, value } : segment,
    )
    const configError = validatePointsWheelConfig(next)
    if (configError) {
      toastError(configError)
      return
    }
    setPointsWheelConfig(next)
  }

  const handleSegmentEnabledChange = (id: string, enabled: boolean) => {
    const next = segments.map((segment) =>
      segment.id === id ? { ...segment, enabled } : segment,
    )
    const configError = validatePointsWheelConfig(next)
    if (configError) {
      toastError(configError)
      return
    }
    setPointsWheelConfig(next)
  }

  const handleAddSegment = () => {
    const next = [...segments, createPointsWheelSegment(1)]
    if (!persistSegments(next)) return
  }

  const handleRemoveSegment = (id: string) => {
    if (segments.length <= 1) {
      toastError('Cần ít nhất một ô điểm.')
      return
    }
    const next = segments.filter((segment) => segment.id !== id)
    if (!persistSegments(next)) return
  }

  const startSession = useCallback(() => {
    const configError = validatePointsWheelConfig(segments)
    if (configError) {
      toastError(configError)
      return
    }

    if (!selectedStudentId) {
      toastError('Chọn một học sinh để quay điểm.')
      return
    }

    const student = sortedStudents.find((s) => s.id === selectedStudentId)
    if (!student) {
      toastError('Học sinh không còn trong lớp.')
      return
    }

    setCurrentStudent(student)
    setWinnerValue(0)
    setPointsApplied(false)
    applyLockRef.current = false
    setPhase('ready')
    playSound('click', { enabled: soundEnabled })
  }, [sortedStudents, selectedStudentId, segments, soundEnabled])

  const runSpin = useCallback(() => {
    if (!currentStudent || enabledSegments.length === 0) return

    const winnerIndex = pickWinningSegmentIndex(enabledSegments)
    const value = enabledSegments[winnerIndex]?.value ?? 0

    clearTimers()
    setIsPreparing(true)
    setPointsApplied(false)
    applyLockRef.current = false
    setWinnerValue(value)

    const finishSpin = () => {
      stopWheelTicksRef.current?.()
      stopWheelTicksRef.current = null
      setIsSpinning(false)
      setPhase('result')
      playSound('wheel-result', { enabled: soundEnabled })
      if (allowMotion && value > 0) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.45 } })
      }
    }

    if (!allowMotion) {
      setIsPreparing(false)
      setRotation((current) =>
        getWinnerRotation(current, winnerIndex, enabledSegments.length, 0),
      )
      finishSpin()
      return
    }

    hideTimeoutRef.current = setTimeout(() => {
      const plan = createRandomSpinPlan()
      setSpinPlan(plan)
      setIsPreparing(false)
      setIsSpinning(true)
      setPhase('spinning')
      setRotation((current) =>
        getWinnerRotation(current, winnerIndex, enabledSegments.length, plan.extraTurns),
      )
      stopWheelTicksRef.current = startWheelTicks(plan.durationMs, soundEnabled)

      spinTimeoutRef.current = setTimeout(() => {
        finishSpin()
      }, plan.durationMs)
    }, LIST_HIDE_DURATION_MS)

    playSound('click', { enabled: soundEnabled })
  }, [allowMotion, clearTimers, currentStudent, enabledSegments, soundEnabled])

  const handleApply = useCallback(() => {
    if (!currentStudent || pointsApplied || applyLockRef.current) return
    applyLockRef.current = true

    const signedValue = winnerValue
    const action = {
      id: createId('points-wheel'),
      name: 'Vòng quay điểm',
      points: signedValue,
      type: signedValue >= 0 ? ('reward' as const) : ('penalty' as const),
      isActive: true,
    }

    applyPoints(
      currentStudent.id,
      action,
      `Vòng quay điểm: ${formatPointsWheelLabel(signedValue)}`,
      'game',
    )
    setPointsApplied(true)
    playSound(signedValue >= 0 ? 'success' : 'wrong-answer', { enabled: soundEnabled })
  }, [applyPoints, currentStudent, pointsApplied, soundEnabled, winnerValue])

  const handleSpinAgain = useCallback(() => {
    clearTimers()
    setIsSpinning(false)
    setIsPreparing(false)
    setPointsApplied(false)
    applyLockRef.current = false
    setPhase('ready')
  }, [clearTimers])

  const handleSkip = useCallback(() => {
    goToSetup()
  }, [goToSetup])

  const isBusy = isSpinning || isPreparing

  const requestClose = useCallback(async () => {
    if (isBusy) {
      const ok = await showConfirm('Vòng quay đang chạy. Đóng cửa sổ sẽ hủy lượt quay. Tiếp tục?', {
        variant: 'warning',
        confirmLabel: 'Đóng',
      })
      if (!ok) return
    }
    clearTimers()
    onClose()
  }, [clearTimers, isBusy, onClose, showConfirm])

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

  const showWheel = phase === 'ready' || phase === 'spinning' || phase === 'result'

  return (
    <GameDialogPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm"
        onClick={() => void requestClose()}
        role="presentation"
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="points-wheel-title"
        className="flex h-[min(900px,94vh)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="points-wheel-title" className="font-display text-xl font-extrabold text-slate-800">
              Vòng quay điểm
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Chọn một học sinh, quay điểm — xác nhận trước khi cộng
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
            <aside className="flex min-h-0 shrink-0 flex-col border-b border-slate-100 lg:h-full lg:w-[320px] lg:border-b-0 lg:border-r">
              <div className="flex h-full max-h-[55vh] min-h-0 flex-col overflow-hidden bg-slate-50/70 p-3 lg:max-h-none">
                <PointsWheelSetup
                  filteredStudents={filteredStudents}
                  selectedStudentId={selectedStudentId}
                  segments={segments}
                  searchQuery={searchQuery}
                  classroomId={classroomId}
                  isBusy={isBusy}
                  onSearchChange={setSearchQuery}
                  onSelectStudent={setSelectedStudentId}
                  onSegmentValueChange={handleSegmentValueChange}
                  onSegmentEnabledChange={handleSegmentEnabledChange}
                  onAddSegment={handleAddSegment}
                  onRemoveSegment={handleRemoveSegment}
                  onStart={startSession}
                />
              </div>
            </aside>
          ) : null}

          <main className="relative min-h-0 flex-1 p-4">
            {phase === 'setup' ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-violet-200 bg-gradient-to-b from-violet-50 to-pastel-sky/40 p-6 text-center">
                <ValueWheelPreview size={220} segments={enabledSegments} />
                <p className="mt-6 font-display text-2xl font-extrabold text-slate-700">Sẵn sàng quay điểm!</p>
                <p className="mt-2 max-w-md text-sm font-semibold text-slate-500">
                  Cấu hình các ô điểm và chọn <strong>một học sinh</strong> ở cột bên trái, rồi nhấn{' '}
                  <strong>Bắt đầu</strong>.
                </p>
              </div>
            ) : null}

            {showWheel ? (
              <div className="relative flex h-full min-h-0 flex-col">
                {currentStudent ? (
                  <div className="mb-4 flex shrink-0 items-center justify-center">
                    <div className="flex items-center gap-3 rounded-full border border-pastel-peach/80 bg-gradient-to-r from-pastel-peach/50 via-white to-pastel-sky/40 px-5 py-2.5 shadow-sm">
                      <StudentAvatar
                        student={currentStudent}
                        classroomId={classroomId}
                        className="size-12 rounded-full ring-2 ring-white"
                      />
                      <div className="text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-purple">
                          Đang chơi
                        </p>
                        <p className="font-display text-lg font-extrabold text-slate-800">
                          {currentStudent.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center justify-center">
                  <div className="aspect-square w-full max-w-[min(100%,28rem)]">
                    <ValueWheel
                      segments={enabledSegments}
                      rotation={rotation}
                      isSpinning={isSpinning}
                      spinDurationSec={spinPlan.durationSec}
                      spinEase={spinPlan.ease}
                    />
                  </div>

                  {phase === 'result' && currentStudent ? (
                    <PointsWheelResult
                      student={currentStudent}
                      pointValue={winnerValue}
                      pointsApplied={pointsApplied}
                      isBusy={isBusy}
                      onApply={handleApply}
                      onSpinAgain={handleSpinAgain}
                      onSkip={handleSkip}
                      onPickAnother={goToSetup}
                      onClose={() => void requestClose()}
                    />
                  ) : null}
                </div>

                {phase === 'ready' ? (
                  <div className="mt-4 flex shrink-0 justify-center gap-3">
                    <ClassroomButton
                      size="lg"
                      className="min-h-12 min-w-[12rem] shadow-md shadow-brand-purple/25"
                      disabled={isBusy || enabledSegments.length === 0}
                      onClick={runSpin}
                    >
                      Quay điểm
                    </ClassroomButton>
                    <ClassroomButton
                      variant="outline"
                      size="lg"
                      className="min-h-12"
                      disabled={isBusy}
                      onClick={goToSetup}
                    >
                      Chọn lại
                    </ClassroomButton>
                  </div>
                ) : null}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
    </GameDialogPortal>
  )
}
