'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Star, X } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { createRandomSpinPlan, getWinnerRotation, type WheelSpinPlan } from '@/src/utils/wheelSpin'
import {
  clampQuantity,
  createDefaultPickerSession,
  getEligibleStudents,
  getScopedStudents,
  pickUniqueStudents,
  sanitizeStudentIds,
  type PickerMode,
  type PickerScope,
  type PickerSession,
} from '@/src/utils/pickerSession'
import { NamedWheel } from './named-wheel'
import { PickerConfigPanel } from './picker-config-panel'
import { useClassroomDialog } from '@/src/components/classroom'

const LIST_REVEAL_DELAY_MS = 3000
const LIST_HIDE_DURATION_MS = 450
const MULTIPLE_AUTO_ADVANCE_MS = 2200

interface LuckyWheelDialogProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
  teams: Team[]
}

export function LuckyWheelDialog({ isOpen, onClose, students, teams }: LuckyWheelDialogProps) {
  const { data, setWheelStudentBag, recordLuckyWheelSelection } = useAppData()
  const { showConfirm } = useClassroomDialog()
  const bagRef = useRef<string[]>([])
  bagRef.current = data?.wheelStudentBag ?? []

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const [session, setSession] = useState<PickerSession>(() => createDefaultPickerSession())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [initialized, setInitialized] = useState(false)
  const [winner, setWinner] = useState<Student | null>(null)
  const [multipleResults, setMultipleResults] = useState<Student[]>([])
  const [multipleRevealIndex, setMultipleRevealIndex] = useState(0)
  const [multipleComplete, setMultipleComplete] = useState(false)
  const [isBatchActive, setIsBatchActive] = useState(false)
  const [showCalledList, setShowCalledList] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [showStudentList, setShowStudentList] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [spinPlan, setSpinPlan] = useState<WheelSpinPlan>(() => createRandomSpinPlan())
  const [quantityError, setQuantityError] = useState<string | null>(null)

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    ;[revealTimeoutRef, spinTimeoutRef, hideTimeoutRef, autoAdvanceRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current)
        ref.current = null
      }
    })
  }, [])

  const resetRoundState = useCallback(() => {
    clearTimers()
    setWinner(null)
    setMultipleResults([])
    setMultipleRevealIndex(0)
    setMultipleComplete(false)
    setIsBatchActive(false)
    setQuantityError(null)
    setIsSpinning(false)
    setIsPreparing(false)
    setShowStudentList(true)
    setSession((prev) => ({
      ...prev,
      selectedStudentIds: [],
      pendingRevealIds: [],
      startedAt: new Date().toISOString(),
    }))
  }, [clearTimers])

  const confirmResetIfNeeded = useCallback(async (): Promise<boolean> => {
    if (session.selectedStudentIds.length > 0 || session.pendingRevealIds.length > 0 || isBatchActive) {
      return showConfirm('Bắt đầu lượt mới sẽ xóa danh sách đã chọn. Tiếp tục?', {
        variant: 'warning',
        confirmLabel: 'Tiếp tục',
      })
    }
    return true
  }, [session.selectedStudentIds.length, session.pendingRevealIds.length, isBatchActive, showConfirm])

  useEffect(() => {
    if (isOpen && !initialized && students.length > 0) {
      setSelectedIds(new Set(students.map((s) => s.id)))
      setInitialized(true)
    }
  }, [isOpen, initialized, students])

  useEffect(() => {
    if (!isOpen) {
      clearTimers()
      resetRoundState()
      setSession(createDefaultPickerSession())
      setSearchQuery('')
      setShowCalledList(false)
    }
  }, [isOpen, clearTimers, resetRoundState])

  useEffect(() => () => clearTimers(), [clearTimers])

  const scopedStudents = useMemo(
    () => getScopedStudents(sortedStudents, session.scopeType, session.teamId),
    [sortedStudents, session.scopeType, session.teamId],
  )

  const scopedIdSet = useMemo(() => new Set(scopedStudents.map((s) => s.id)), [scopedStudents])

  const sanitizedSessionIds = useMemo(
    () => sanitizeStudentIds(session.selectedStudentIds, scopedIdSet),
    [session.selectedStudentIds, scopedIdSet],
  )

  const sanitizedPendingIds = useMemo(
    () => sanitizeStudentIds(session.pendingRevealIds, scopedIdSet),
    [session.pendingRevealIds, scopedIdSet],
  )

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const base = scopedStudents
    if (!q) return base
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [scopedStudents, searchQuery])

  const poolStudents = useMemo(
    () => scopedStudents.filter((s) => selectedIds.has(s.id)),
    [scopedStudents, selectedIds],
  )

  const eligibleStudents = useMemo(
    () => getEligibleStudents(poolStudents, sanitizedSessionIds, session.preventRepeat),
    [poolStudents, sanitizedSessionIds, session.preventRepeat],
  )

  const wheelStudents = poolStudents.length > 0 ? poolStudents : eligibleStudents

  const calledStudents = useMemo(
    () =>
      sanitizedSessionIds
        .map((id) => students.find((s) => s.id === id))
        .filter((s): s is Student => Boolean(s))
        .map((s) => ({ id: s.id, name: s.name })),
    [sanitizedSessionIds, students],
  )

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInScope = () => setSelectedIds(new Set(scopedStudents.map((s) => s.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const applyScopeSelection = (scopeType: PickerScope, teamId?: string) => {
    const scoped = getScopedStudents(sortedStudents, scopeType, teamId)
    setSelectedIds(new Set(scoped.map((s) => s.id)))
  }

  const handleModeChange = async (mode: PickerMode) => {
    if (mode === session.mode) return
    if (!(await confirmResetIfNeeded())) return
    resetRoundState()
    setSession((prev) => ({ ...prev, mode, quantity: clampQuantity(prev.quantity, eligibleStudents.length) }))
  }

  const handleScopeChange = async (scopeType: PickerScope) => {
    if (scopeType === session.scopeType) return
    if (!(await confirmResetIfNeeded())) return
    resetRoundState()
    const teamId = scopeType === 'team' ? teams[0]?.id : undefined
    setSession((prev) => ({ ...prev, scopeType, teamId }))
    applyScopeSelection(scopeType, teamId)
  }

  const handleTeamChange = async (teamId: string) => {
    if (!teamId || teamId === session.teamId) return
    if (!(await confirmResetIfNeeded())) return
    resetRoundState()
    setSession((prev) => ({ ...prev, teamId }))
    applyScopeSelection('team', teamId)
  }

  const handlePreventRepeatChange = async (preventRepeat: boolean) => {
    if (preventRepeat === session.preventRepeat) return
    if (!(await confirmResetIfNeeded())) return
    resetRoundState()
    setSession((prev) => ({ ...prev, preventRepeat }))
  }

  const handleQuantityChange = (quantity: number) => {
    setQuantityError(null)
    setSession((prev) => ({
      ...prev,
      quantity: clampQuantity(quantity, eligibleStudents.length),
    }))
  }

  const handleResetRound = async () => {
    if (!(await confirmResetIfNeeded())) return
    resetRoundState()
  }

  const runSpinToStudent = useCallback(
    (target: Student, onComplete: () => void) => {
      const wheelPool = wheelStudents
      const winnerIndex = wheelPool.findIndex((s) => s.id === target.id)
      if (winnerIndex < 0) {
        onComplete()
        return
      }

      clearTimers()
      setIsPreparing(true)
      setShowStudentList(false)
      setWinner(null)

      hideTimeoutRef.current = setTimeout(() => {
        const plan = createRandomSpinPlan()
        setSpinPlan(plan)
        setIsPreparing(false)
        setIsSpinning(true)
        setRotation((current) => getWinnerRotation(current, winnerIndex, wheelPool.length, plan.extraTurns))

        spinTimeoutRef.current = setTimeout(() => {
          setWinner(target)
          setIsSpinning(false)
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.45 } })
          onComplete()
        }, plan.durationMs)
      }, LIST_HIDE_DURATION_MS)
    },
    [clearTimers, wheelStudents],
  )

  const recordSessionPick = useCallback((studentId: string) => {
    if (!session.preventRepeat) return
    setSession((prev) => ({
      ...prev,
      selectedStudentIds: [...prev.selectedStudentIds, studentId],
    }))
  }, [session.preventRepeat])

  const updateBagForStudent = useCallback(
    (student: Student) => {
      const result = pickWithoutRepeat([student], bagRef.current)
      setWheelStudentBag(result.nextBag)
    },
    [setWheelStudentBag],
  )

  const revealNextInBatch = useCallback(
    (pendingIds: string[], index: number, accumulated: Student[]) => {
      const nextId = pendingIds[index]
      const nextStudent = students.find((s) => s.id === nextId)
      if (!nextStudent) {
        if (index + 1 < pendingIds.length) {
          revealNextInBatch(pendingIds, index + 1, accumulated)
        } else {
          setMultipleComplete(true)
          setIsBatchActive(false)
          setShowStudentList(true)
        }
        return
      }

      setMultipleRevealIndex(index)
      runSpinToStudent(nextStudent, () => {
        updateBagForStudent(nextStudent)
        recordSessionPick(nextStudent.id)
        const updated = [...accumulated, nextStudent]
        setMultipleResults(updated)

        if (index + 1 >= pendingIds.length) {
          setMultipleComplete(true)
          setIsBatchActive(false)
          recordLuckyWheelSelection(updated.map((student) => student.id))
          revealTimeoutRef.current = setTimeout(() => setShowStudentList(true), LIST_REVEAL_DELAY_MS)
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } })
          return
        }

        autoAdvanceRef.current = setTimeout(() => {
          revealNextInBatch(pendingIds, index + 1, updated)
        }, MULTIPLE_AUTO_ADVANCE_MS)
      })
    },
    [recordSessionPick, runSpinToStudent, students, updateBagForStudent, recordLuckyWheelSelection],
  )

  const startMultipleBatch = () => {
    if (eligibleStudents.length < 2) {
      setQuantityError('Cần ít nhất 2 học sinh để chọn nhiều bạn.')
      return
    }
    if (session.quantity > eligibleStudents.length) {
      setQuantityError(`Chỉ còn ${eligibleStudents.length} bạn chưa được chọn.`)
      return
    }

    setQuantityError(null)
    const picked = pickUniqueStudents(eligibleStudents, session.quantity)
    const pendingIds = picked.map((s) => s.id)
    setSession((prev) => ({ ...prev, pendingRevealIds: pendingIds }))
    setMultipleResults([])
    setMultipleComplete(false)
    setIsBatchActive(true)
    setMultipleRevealIndex(0)
    revealNextInBatch(pendingIds, 0, [])
  }

  const spinSingleOrSequential = () => {
    if (eligibleStudents.length === 0) return

    const result = pickWithoutRepeat(eligibleStudents, bagRef.current)
    if (!result.selected) return

    runSpinToStudent(result.selected, () => {
      setWheelStudentBag(result.nextBag)
      recordSessionPick(result.selected!.id)
      recordLuckyWheelSelection([result.selected!.id])
      revealTimeoutRef.current = setTimeout(() => setShowStudentList(true), LIST_REVEAL_DELAY_MS)
    })
  }

  const handlePrimaryAction = () => {
    if (isSpinning || isPreparing) return

    if (session.mode === 'multiple') {
      if (multipleComplete) return
      if (isBatchActive) {
        clearTimers()
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
        const nextIndex = multipleRevealIndex + 1
        if (nextIndex < sanitizedPendingIds.length) {
          revealNextInBatch(sanitizedPendingIds, nextIndex, multipleResults)
        }
        return
      }
      startMultipleBatch()
      return
    }

    spinSingleOrSequential()
  }

  const isBusy = isSpinning || isPreparing
  const noStudents = students.length === 0
  const emptyTeam =
    session.scopeType === 'team' && session.teamId && scopedStudents.length === 0
  const noEligible = eligibleStudents.length === 0 && !noStudents && !emptyTeam
  const allPicked = noEligible && sanitizedSessionIds.length > 0

  const primaryLabel = (() => {
    if (isBusy) return 'Đang quay...'
    if (session.mode === 'sequential') return 'Chọn bạn tiếp theo'
    if (session.mode === 'multiple') {
      if (multipleComplete) return 'Hoàn tất'
      if (isBatchActive && multipleRevealIndex < sanitizedPendingIds.length - 1) {
        return 'Chọn bạn tiếp theo'
      }
      return 'QUAY NGAY'
    }
    return 'QUAY NGAY'
  })()

  const hintText = (() => {
    if (noStudents) return 'Chưa có học sinh nào để quay'
    if (emptyTeam) return 'Tổ này chưa có thành viên.'
    if (allPicked) return 'Tất cả các bạn đã được chọn!'
    if (isBusy) return 'Đang quay...'
    if (session.mode === 'multiple' && isBatchActive && !multipleComplete) {
      return `Đang chọn bạn thứ ${multipleRevealIndex + 1}...`
    }
    if (poolStudents.length === 0) return 'Chọn ít nhất 1 học sinh'
    if (session.mode === 'sequential') return 'Nhấn để gọi bạn tiếp theo'
    if (session.mode === 'multiple') return 'Nhấn quay để chọn nhiều bạn'
    return 'Nhấn quay để chọn học sinh'
  })()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="flex h-[min(900px,94vh)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-800">Vòng quay may mắn</h2>
            <p className="text-xs font-semibold text-slate-500">Chọn học sinh và quay để chọn ngẫu nhiên</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <AnimatePresence initial={false}>
            {showStudentList ? (
              <motion.aside
                key="student-list"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="h-full shrink-0 overflow-hidden border-r border-slate-100"
              >
                <div className="flex h-full w-[300px] flex-col overflow-y-auto bg-slate-50/70 p-3 scrollbar-thin">
                  <PickerConfigPanel
                    session={{ ...session, selectedStudentIds: sanitizedSessionIds, pendingRevealIds: sanitizedPendingIds }}
                    teams={teams}
                    eligibleCount={eligibleStudents.length}
                    poolCount={poolStudents.length}
                    calledCount={sanitizedSessionIds.length}
                    isBusy={isBusy || isBatchActive}
                    showCalledList={showCalledList}
                    calledStudents={calledStudents}
                    onModeChange={handleModeChange}
                    onScopeChange={handleScopeChange}
                    onTeamChange={handleTeamChange}
                    onPreventRepeatChange={handlePreventRepeatChange}
                    onQuantityChange={handleQuantityChange}
                    onResetRound={handleResetRound}
                    onToggleCalledList={() => setShowCalledList((v) => !v)}
                  />

                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm học sinh..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand-purple"
                    />
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-500">
                      {selectedIds.size} / {scopedStudents.length} học sinh
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllInScope} className="text-xs font-bold text-brand-purple hover:underline">
                        Chọn tất cả
                      </button>
                      <button type="button" onClick={deselectAll} className="text-xs font-bold text-slate-500 hover:underline">
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[120px] flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 scrollbar-thin">
                    {filteredStudents.length === 0 ? (
                      <p className="py-6 text-center text-sm font-semibold text-slate-400">
                        {emptyTeam ? 'Tổ này chưa có thành viên.' : 'Không tìm thấy'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-brand-soft"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(student.id)}
                              onChange={() => toggleStudent(student.id)}
                              className="size-4 rounded border-slate-300 text-brand-purple"
                            />
                            <img src={getStudentAvatar(student)} alt="" className="size-6 rounded-full object-cover" />
                            <span className="truncate text-xs font-bold text-slate-800">{student.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-gradient-to-b from-pastel-sky/50 via-white to-pastel-pink/30 px-6 py-4">
            <motion.div
              animate={{
                width: showStudentList ? 380 : 620,
                height: showStudentList ? 380 : 620,
              }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="relative"
            >
              <NamedWheel
                students={wheelStudents}
                rotation={rotation}
                isSpinning={isSpinning}
                spinDurationSec={spinPlan.durationSec}
                spinEase={spinPlan.ease}
              />
            </motion.div>

            <div className={`mt-3 flex w-full max-w-md shrink-0 flex-col items-center ${multipleComplete ? 'min-h-[200px]' : 'min-h-[120px]'}`}>
              <AnimatePresence mode="wait">
                {multipleComplete && multipleResults.length > 0 ? (
                  <motion.div
                    key="multi-result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-2xl border border-brand-purple/20 bg-white/90 p-4 text-center shadow-sm"
                  >
                    <p className="font-display text-lg font-black text-brand-purple">Các bạn được chọn!</p>
                    <ul className="mt-3 space-y-1.5 text-left">
                      {multipleResults.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : winner ? (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, scale: 0.6, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.img
                      src={getStudentAvatar(winner)}
                      alt={winner.name}
                      className="size-20 rounded-full object-cover ring-4 ring-amber-300 shadow-lg"
                    />
                    <p className="font-display text-3xl font-black text-slate-800">{winner.name}</p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-2 text-center text-sm font-semibold text-slate-500"
                  >
                    {hintText}
                  </motion.p>
                )}
              </AnimatePresence>

              {quantityError ? (
                <p className="mt-2 text-center text-xs font-semibold text-rose-500">{quantityError}</p>
              ) : null}

              {noStudents ? (
                <Link
                  href="/students"
                  className="mt-3 text-sm font-bold text-brand-purple underline underline-offset-2"
                >
                  Đi đến danh sách học sinh
                </Link>
              ) : null}

              {allPicked ? (
                <button
                  type="button"
                  onClick={handleResetRound}
                  className="mt-3 text-sm font-bold text-brand-purple underline underline-offset-2"
                >
                  Bắt đầu lượt mới
                </button>
              ) : null}

              <motion.button
                type="button"
                onClick={handlePrimaryAction}
                disabled={
                  isBusy ||
                  noStudents ||
                  emptyTeam ||
                  (noEligible && !multipleComplete) ||
                  poolStudents.length === 0 ||
                  multipleComplete
                }
                whileTap={{ scale: isBusy ? 1 : 0.97 }}
                className="mt-3 w-full max-w-xs rounded-2xl bg-brand-purple py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-brand-purple-dark disabled:opacity-50"
              >
                {primaryLabel}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
