'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar, sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { pickWithoutRepeat } from '@/src/utils/randomSelection'
import { createRandomSpinPlan, getWinnerRotation, type WheelSpinPlan } from '@/src/utils/wheelSpin'
import { NamedWheel } from './named-wheel'

const LIST_REVEAL_DELAY_MS = 3000
const LIST_HIDE_DURATION_MS = 450

interface LuckyWheelDialogProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
}

export function LuckyWheelDialog({ isOpen, onClose, students }: LuckyWheelDialogProps) {
  const { data, setWheelStudentBag } = useAppData()
  const bag = data?.wheelStudentBag ?? []

  const sortedStudents = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students),
    [students],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [initialized, setInitialized] = useState(false)
  const [winner, setWinner] = useState<Student | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [showStudentList, setShowStudentList] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [spinPlan, setSpinPlan] = useState<WheelSpinPlan>(() => createRandomSpinPlan())
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = null
    }
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current)
      spinTimeoutRef.current = null
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  useEffect(() => {
    if (isOpen && !initialized && students.length > 0) {
      setSelectedIds(new Set(students.map((s) => s.id)))
      setInitialized(true)
    }
  }, [isOpen, initialized, students])

  useEffect(() => {
    if (!isOpen) {
      clearTimers()
      setWinner(null)
      setIsSpinning(false)
      setIsPreparing(false)
      setShowStudentList(true)
    }
  }, [isOpen])

  useEffect(() => () => clearTimers(), [])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedStudents
    return sortedStudents.filter((s) => s.name.toLowerCase().includes(q))
  }, [sortedStudents, searchQuery])

  const selectedStudents = useMemo(
    () => sortedStudents.filter((s) => selectedIds.has(s.id)),
    [sortedStudents, selectedIds],
  )

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(students.map((s) => s.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const spin = () => {
    if (isSpinning || isPreparing || selectedStudents.length === 0) return

    const result = pickWithoutRepeat(selectedStudents, bag)
    if (!result.selected) return

    const winnerIndex = selectedStudents.findIndex((s) => s.id === result.selected!.id)
    if (winnerIndex < 0) return

    clearTimers()
    setIsPreparing(true)
    setShowStudentList(false)
    setWinner(null)
    setWheelStudentBag(result.nextBag)

    hideTimeoutRef.current = setTimeout(() => {
      const plan = createRandomSpinPlan()
      setSpinPlan(plan)
      setIsPreparing(false)
      setIsSpinning(true)
      setRotation((current) =>
        getWinnerRotation(current, winnerIndex, selectedStudents.length, plan.extraTurns),
      )

      spinTimeoutRef.current = setTimeout(() => {
        setWinner(result.selected ?? null)
        setIsSpinning(false)
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.45 } })
        revealTimeoutRef.current = setTimeout(() => {
          setShowStudentList(true)
        }, LIST_REVEAL_DELAY_MS)
      }, plan.durationMs)
    }, LIST_HIDE_DURATION_MS)
  }

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
                animate={{ width: 288, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="h-full shrink-0 overflow-hidden border-r border-slate-100"
              >
                <div className="flex h-full w-72 flex-col bg-slate-50/70 p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm học sinh..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand-purple"
                  />
                </div>

                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-500">
                    {selectedIds.size} / {students.length} học sinh
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs font-bold text-brand-purple hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 scrollbar-thin">
                  {filteredStudents.length === 0 ? (
                    <p className="py-6 text-center text-sm font-semibold text-slate-400">Không tìm thấy</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-violet-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="size-4 rounded border-slate-300 text-brand-purple"
                          />
                          <img
                            src={getStudentAvatar(student)}
                            alt=""
                            className="size-7 rounded-full object-cover"
                          />
                          <span className="truncate text-sm font-bold text-slate-800">{student.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudents.length === 0 ? (
                  <p className="mt-2 text-xs font-semibold text-rose-500">Chọn ít nhất 1 học sinh</p>
                ) : null}
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-gradient-to-b from-violet-50/40 to-white px-6 py-4">
            <motion.div
              animate={{
                width: showStudentList ? 400 : 640,
                height: showStudentList ? 400 : 640,
              }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="relative"
            >
              <NamedWheel
                students={selectedStudents}
                rotation={rotation}
                isSpinning={isSpinning}
                spinDurationSec={spinPlan.durationSec}
                spinEase={spinPlan.ease}
              />
            </motion.div>

            <div className="mt-3 flex h-28 shrink-0 flex-col items-center justify-start">
              <AnimatePresence mode="wait">
                {winner ? (
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
                      className="size-16 rounded-full object-cover ring-4 ring-amber-300 shadow-lg"
                      initial={{ rotate: -12 }}
                      animate={{ rotate: 0 }}
                    />
                    <p className="text-lg font-extrabold text-slate-800">{winner.name}</p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-3 text-sm font-semibold text-slate-400"
                  >
                    {isSpinning || isPreparing
                      ? 'Đang quay...'
                      : selectedStudents.length > 0
                        ? 'Nhấn quay để chọn học sinh'
                        : 'Thêm học sinh vào vòng quay'}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="button"
                onClick={spin}
                disabled={isSpinning || isPreparing || selectedStudents.length === 0}
                whileTap={{ scale: isSpinning || isPreparing ? 1 : 0.97 }}
                className="mt-3 w-full max-w-xs rounded-2xl bg-brand-purple py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-brand-purple-dark disabled:opacity-50"
              >
                {isSpinning || isPreparing ? 'Đang quay...' : 'QUAY NGAY'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

