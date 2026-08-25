'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SeatingChartConfig } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import {
  ClassroomButton,
  IconTouchButton,
  useClassroomDialog,
  ClassroomDialogFrame,
  AnimatedEntrance,
} from '@/src/components/classroom'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import {
  applyLayoutChange,
  assignStudentToSeat,
  autoArrange,
  clearAllSeatAssignments,
  deskCapacity,
  getSeatById,
  getSeatDisplayIndex,
  getSeatForStudent,
  getUnassignedStudentIds,
  randomArrange,
  reconcileSeatingChart,
  unassignStudentFromSeat,
} from '@/src/utils/seatingChart'
import { sortStudentsByClassroomRoleThenStt } from '@/src/utils/student'
import { SeatingConfigPanel } from './seating-config-panel'
import { SeatingCanvas } from './seating-canvas'
import { SeatingRoster } from './seating-roster'
import { SeatActionPopover } from './seat-action-popover'
import { LayoutGrid, Minus, Plus, RotateCcw, Shuffle, SlidersHorizontal, UserMinus, Wand2, X } from 'lucide-react'

interface RandomPreviewState {
  classroomId: string
  config: SeatingChartConfig
}

interface SeatingChartWorkspaceProps {
  presentation?: boolean
}

export function SeatingChartWorkspace({ presentation = false }: SeatingChartWorkspaceProps) {
  const { data, setSeatingChartConfig } = useAppData()
  const dialog = useClassroomDialog()
  const students = data?.students ?? []
  const classroomId = data?.metadata.id
  const config = data?.seatingChartConfig

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [overflowCount, setOverflowCount] = useState(0)
  const [assignHint, setAssignHint] = useState<string | null>(null)
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const [rosterFocusToken, setRosterFocusToken] = useState(0)
  const [randomPreview, setRandomPreview] = useState<RandomPreviewState | null>(null)
  const [layoutStaggerToken, setLayoutStaggerToken] = useState(0)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasContentRef = useRef<HTMLDivElement>(null)
  const manualZoomRef = useRef(false)

  const studentIdSet = useMemo(() => new Set(students.map((student) => student.id)), [students])
  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students])
  const rosterOrder = useMemo(
    () => sortStudentsByClassroomRoleThenStt(students, students).map((student) => student.id),
    [students],
  )

  const activeRandomPreview =
    randomPreview && classroomId && randomPreview.classroomId === classroomId ? randomPreview.config : null

  const unassignedIds = useMemo(() => {
    const source = activeRandomPreview ?? config
    return source ? getUnassignedStudentIds(source, students) : []
  }, [activeRandomPreview, config, students])

  const unassignedStudents = useMemo(
    () => unassignedIds.map((id) => studentsById.get(id)).filter(Boolean) as typeof students,
    [unassignedIds, studentsById, students],
  )

  const selectedStudent = selectedStudentId ? studentsById.get(selectedStudentId) : null

  const applyConfig = useCallback(
    (next: SeatingChartConfig, options?: { overflow?: number; keepSelection?: string | null }) => {
      setRandomPreview(null)
      setSeatingChartConfig(next)
      setOverflowCount(options?.overflow ?? 0)
      setAssignHint(null)
      if (options && 'keepSelection' in options) {
        setSelectedStudentId(options.keepSelection ?? null)
      } else {
        setSelectedStudentId(null)
      }
      setActiveSeatId(null)
    },
    [setSeatingChartConfig],
  )

  const handleLayoutPatch = useCallback(
    (patch: Partial<SeatingChartConfig>) => {
      if (!config || activeRandomPreview) return
      const { config: next, overflowStudentIds } = applyLayoutChange(config, patch, studentIdSet)
      manualZoomRef.current = false
      applyConfig(next, { overflow: overflowStudentIds.length })
    },
    [applyConfig, activeRandomPreview, config, studentIdSet],
  )

  const handleAssign = useCallback(
    (seatId: string, studentId: string, swap = true) => {
      if (!config || activeRandomPreview) return
      const seat = getSeatById(config, seatId)
      if (!seat) return
      if (seat.studentIds.length >= deskCapacity(config.deskType) && !seat.studentIds.includes(studentId)) {
        if (config.deskType !== 'individual') {
          setAssignHint('Bàn này đã đủ chỗ. Bỏ một học sinh trước hoặc chọn bàn khác.')
          setActiveSeatId(seatId)
          return
        }
      }
      const next = assignStudentToSeat(config, seatId, studentId, { swap })
      if (!next) {
        setAssignHint('Không thể xếp vào ghế này.')
        setActiveSeatId(seatId)
        return
      }
      applyConfig(next)
    },
    [activeRandomPreview, applyConfig, config],
  )

  const handleUnassign = useCallback(
    (seatId: string, studentId?: string, keepSelection?: string | null) => {
      if (!config || activeRandomPreview) return
      applyConfig(unassignStudentFromSeat(config, seatId, studentId), {
        keepSelection: keepSelection === undefined ? null : keepSelection,
      })
    },
    [activeRandomPreview, applyConfig, config],
  )

  const handleAutoArrange = useCallback(() => {
    if (!config || activeRandomPreview) return
    applyConfig(autoArrange(config, rosterOrder))
    setLayoutStaggerToken((token) => token + 1)
  }, [activeRandomPreview, applyConfig, config, rosterOrder])

  const handleRandomArrange = useCallback(() => {
    if (!config || !classroomId) return
    setRandomPreview({
      classroomId,
      config: randomArrange(config, rosterOrder),
    })
    setSelectedStudentId(null)
    setActiveSeatId(null)
    setAssignHint(null)
    manualZoomRef.current = false
  }, [classroomId, config, rosterOrder])

  const applyRandomPreview = useCallback(() => {
    if (!activeRandomPreview || !classroomId || randomPreview?.classroomId !== classroomId) return
    applyConfig(activeRandomPreview)
    setLayoutStaggerToken((token) => token + 1)
  }, [activeRandomPreview, applyConfig, classroomId, randomPreview?.classroomId])

  const cancelRandomPreview = useCallback(() => {
    setRandomPreview(null)
  }, [])

  useEffect(() => {
    setRandomPreview(null)
    setSelectedStudentId(null)
    setActiveSeatId(null)
    setOverflowCount(0)
    setAssignHint(null)
    setConfigOpen(false)
    manualZoomRef.current = false
  }, [classroomId])

  useEffect(() => {
    if (!activeRandomPreview) return
    const { config: reconciled } = reconcileSeatingChart(activeRandomPreview, studentIdSet)
    const seatsMatch =
      reconciled.seats.length === activeRandomPreview.seats.length &&
      reconciled.seats.every((seat, index) => {
        const prev = activeRandomPreview.seats[index]
        return (
          prev &&
          seat.seatId === prev.seatId &&
          seat.studentIds.length === prev.studentIds.length &&
          seat.studentIds.every((id, i) => id === prev.studentIds[i])
        )
      })
    if (!seatsMatch && classroomId) {
      setRandomPreview({ classroomId, config: reconciled })
    }
  }, [activeRandomPreview, classroomId, studentIdSet])

  const assignedCount = useMemo(
    () => config?.seats.reduce((sum, seat) => sum + seat.studentIds.length, 0) ?? 0,
    [config],
  )

  const handleClearAll = useCallback(async () => {
    if (!config || assignedCount === 0 || activeRandomPreview) return
    const confirmed = await dialog.showConfirm(
      'Tất cả học sinh sẽ được bỏ khỏi ghế. Bạn có muốn tiếp tục?',
      {
        title: 'Bỏ hết chỗ?',
        confirmLabel: 'Bỏ hết chỗ',
        cancelLabel: 'Hủy',
        variant: 'warning',
      },
    )
    if (confirmed) applyConfig(clearAllSeatAssignments(config))
  }, [activeRandomPreview, applyConfig, assignedCount, config, dialog])

  const fitToScreen = useCallback(() => {
    const container = canvasContainerRef.current
    const content = canvasContentRef.current
    if (!container || !content) return

    const padding = 24
    const availableW = Math.max(0, container.clientWidth - padding)
    const availableH = Math.max(0, container.clientHeight - padding)
    const contentW = content.scrollWidth || content.offsetWidth
    const contentH = content.scrollHeight || content.offsetHeight
    if (contentW <= 0 || contentH <= 0 || availableW <= 0 || availableH <= 0) return

    const nextScale = Math.min(1, availableW / contentW, availableH / contentH)
    manualZoomRef.current = false
    setTransform({ scale: Math.max(0.12, nextScale), x: 0, y: 0 })
  }, [])

  const bumpZoom = useCallback((delta: number) => {
    manualZoomRef.current = true
    setTransform((current) => ({
      ...current,
      scale: Math.min(1.6, Math.max(0.12, Number((current.scale + delta).toFixed(2)))),
    }))
  }, [])

  useEffect(() => {
    let cancelled = false
    let frame2 = 0
    const run = () => {
      if (cancelled || manualZoomRef.current) return
      fitToScreen()
    }
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(run)
    })

    const container = canvasContainerRef.current
    const observer =
      container && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!manualZoomRef.current) requestAnimationFrame(run)
          })
        : null
    if (container && observer) observer.observe(container)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      observer?.disconnect()
    }
  }, [
    config?.groups,
    config?.rows,
    config?.columnsPerGroup,
    config?.deskType,
    config?.groupGap,
    config?.boardPosition,
    activeRandomPreview,
    fitToScreen,
  ])

  useEffect(() => {
    if (!activeRandomPreview) return
    manualZoomRef.current = false
    const frame = requestAnimationFrame(() => fitToScreen())
    return () => cancelAnimationFrame(frame)
  }, [activeRandomPreview, fitToScreen])

  useEffect(() => {
    if (!activeSeatId) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-seat-popover], [data-seat]')) return
      setActiveSeatId(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [activeSeatId])

  if (!config) return null

  const canvasConfig = activeRandomPreview ?? config

  const activeSeat = activeSeatId ? config.seats.find((seat) => seat.seatId === activeSeatId) : null
  const activeStudents =
    activeSeat?.studentIds.map((id) => studentsById.get(id)).filter(Boolean) ?? []

  const zoomPercent = Math.round(transform.scale * 100)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!presentation ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {overflowCount > 0 ? (
              <p className="rounded-xl bg-pastel-peach/60 px-3 py-2 text-sm font-bold text-amber-800">
                {overflowCount} học sinh chưa được xếp chỗ sau khi đổi bố cục
              </p>
            ) : null}
            {selectedStudent ? (
              <div className="flex items-center gap-2 rounded-xl bg-pastel-pink/70 px-3 py-2 text-sm font-bold text-slate-700">
                <StudentAvatar
                  student={selectedStudent}
                  classroomId={classroomId}
                  alt={selectedStudent.name}
                  className="size-8 shrink-0 rounded-full ring-2 ring-white"
                />
                <span className="min-w-0 flex-1 truncate">
                  Đang chọn: {selectedStudent.name} — bấm ghế trống để xếp
                </span>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-white/70"
                  aria-label="Bỏ chọn học sinh"
                  onClick={() => setSelectedStudentId(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}
            {assignHint ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{assignHint}</p>
            ) : null}
            {activeRandomPreview ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-pastel-sky/80 px-3 py-2">
                <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">
                  Xem trước xếp ngẫu nhiên — bấm Áp dụng để lưu hoặc Hủy để quay lại
                </span>
                <ClassroomButton type="button" size="sm" onClick={applyRandomPreview}>
                  Áp dụng
                </ClassroomButton>
                <ClassroomButton type="button" variant="secondary" size="sm" onClick={cancelRandomPreview}>
                  Hủy
                </ClassroomButton>
              </div>
            ) : null}
          </div>
          <ClassroomButton
            type="button"
            variant="secondary"
            onClick={() => setConfigOpen(true)}
            disabled={Boolean(activeRandomPreview)}
          >
            <SlidersHorizontal className="size-4" />
            Bố cục
          </ClassroomButton>
          <ClassroomButton
            type="button"
            variant="secondary"
            onClick={handleAutoArrange}
            disabled={Boolean(activeRandomPreview)}
          >
            <Wand2 className="size-4" />
            Tự xếp
          </ClassroomButton>
          <ClassroomButton type="button" variant="secondary" onClick={handleRandomArrange}>
            <Shuffle className="size-4" />
            Xếp ngẫu nhiên
          </ClassroomButton>
          <ClassroomButton
            type="button"
            variant="secondary"
            onClick={handleClearAll}
            disabled={assignedCount === 0 || Boolean(activeRandomPreview)}
          >
            <UserMinus className="size-4" />
            Bỏ hết chỗ
          </ClassroomButton>
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <ClassroomButton
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-9 min-w-9 px-0"
              onClick={() => bumpZoom(-0.1)}
              aria-label="Thu nhỏ"
            >
              <Minus className="size-4" />
            </ClassroomButton>
            <span
              className="min-w-[2.75rem] px-1 text-center text-xs font-extrabold text-slate-600"
              aria-live="polite"
            >
              {zoomPercent}%
            </span>
            <ClassroomButton
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-9 min-w-9 px-0"
              onClick={() => bumpZoom(0.1)}
              aria-label="Phóng to"
            >
              <Plus className="size-4" />
            </ClassroomButton>
            <ClassroomButton type="button" variant="secondary" size="sm" onClick={fitToScreen}>
              <LayoutGrid className="size-4" />
              Vừa màn hình
            </ClassroomButton>
            <ClassroomButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                manualZoomRef.current = true
                setTransform({ scale: 1, x: 0, y: 0 })
              }}
            >
              <RotateCcw className="size-4" />
              Đặt lại
            </ClassroomButton>
          </div>
        </div>
      ) : null}

      <AnimatedEntrance variant="random" staggerIndex={0} className="relative flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={`relative flex min-h-0 flex-1 flex-col gap-3 ${presentation ? '' : 'lg:flex-row'}`}
      >
        {!presentation ? (
          <SeatingRoster
            students={unassignedStudents}
            roster={students}
            classroomId={classroomId}
            selectedStudentId={activeRandomPreview ? null : selectedStudentId}
            readOnly={Boolean(activeRandomPreview)}
            onSelectStudent={(studentId) => {
              if (activeRandomPreview) return
              setAssignHint(null)
              setSelectedStudentId(studentId)
              setActiveSeatId(null)
            }}
            focusToken={rosterFocusToken}
            onDropToUnassigned={(studentId) => {
              if (activeRandomPreview || !config) return
              const seat = getSeatForStudent(config, studentId)
              if (seat) handleUnassign(seat.seatId, studentId)
            }}
          />
        ) : null}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <SeatingCanvas
            config={canvasConfig}
            studentsById={studentsById}
            classroomId={classroomId}
            presentation={presentation}
            readOnly={Boolean(activeRandomPreview)}
            selectedStudentId={activeRandomPreview ? null : selectedStudentId}
            activeSeatId={activeRandomPreview ? null : activeSeatId}
            transform={transform}
            containerRef={canvasContainerRef}
            contentRef={canvasContentRef}
            layoutStaggerToken={layoutStaggerToken}
            onSeatClick={(seatId) => {
              if (activeRandomPreview) return
              setAssignHint(null)
              setActiveSeatId((current) => (current === seatId ? null : seatId))
            }}
            onAssignStudent={(seatId, studentId) => {
              if (activeRandomPreview) return
              handleAssign(seatId, studentId)
            }}
            onDropStudent={(seatId, studentId) => {
              if (activeRandomPreview) return
              handleAssign(seatId, studentId)
            }}
            onPanChange={(x, y) => {
              manualZoomRef.current = true
              setTransform((current) => ({ ...current, x, y }))
            }}
          />

          {activeSeatId && !presentation && !activeRandomPreview ? (
            <SeatActionPopover
              seatLabel={`Ghế ${getSeatDisplayIndex(activeSeatId, config)}`}
              students={activeStudents as typeof students}
              classroomId={classroomId}
              onClose={() => setActiveSeatId(null)}
              onPickStudent={() => {
                setActiveSeatId(null)
                setRosterFocusToken((token) => token + 1)
              }}
              onMoveStudent={(studentId) => handleUnassign(activeSeatId, studentId, studentId)}
              onRemoveStudent={(studentId) => handleUnassign(activeSeatId, studentId)}
            />
          ) : null}
        </div>
      </div>
      </AnimatedEntrance>

      <ClassroomDialogFrame
        open={configOpen && !presentation && !activeRandomPreview}
        onClose={() => setConfigOpen(false)}
        ariaLabelledBy="seating-config-title"
        panelClassName="max-w-md"
      >
        <div className="rounded-3xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 id="seating-config-title" className="font-display text-xl font-extrabold text-slate-800">
              Bố cục lớp
            </h2>
            <IconTouchButton
              onClick={() => setConfigOpen(false)}
              aria-label="Đóng"
              className="text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </IconTouchButton>
          </header>
          <div className="p-5">
            <SeatingConfigPanel config={config} onChange={handleLayoutPatch} />
          </div>
        </div>
      </ClassroomDialogFrame>
    </div>
  )
}
