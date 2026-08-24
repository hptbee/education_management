'use client'

import { Fragment, useEffect, useRef, type RefObject } from 'react'
import { LayoutGroup } from 'framer-motion'
import type { Student } from '@/src/types/models'
import type { SeatingChartConfig } from '@/src/types/models'
import { buildSeatGrid, getSeatDisplayIndex } from '@/src/utils/seatingChart'
import { SeatingDesk } from './seating-desk'

interface SeatingCanvasProps {
  config: SeatingChartConfig
  studentsById: Map<string, Student>
  classroomId?: string
  className?: string
  presentation?: boolean
  readOnly?: boolean
  selectedStudentId: string | null
  activeSeatId: string | null
  transform: { scale: number; x: number; y: number }
  onSeatClick: (seatId: string) => void
  onAssignStudent: (seatId: string, studentId: string) => void
  onDropStudent: (seatId: string, studentId: string) => void
  onPanChange: (x: number, y: number) => void
  containerRef?: RefObject<HTMLDivElement | null>
  contentRef?: RefObject<HTMLDivElement | null>
  layoutStaggerToken?: number
}

function ClassroomBoard({ position }: { position: SeatingChartConfig['boardPosition'] }) {
  const shared =
    'flex items-center justify-center rounded-2xl border border-brand/20 bg-gradient-to-b from-pastel-sky to-brand-soft px-6 py-3 text-center font-display text-sm font-extrabold uppercase tracking-[0.15em] text-brand-purple shadow-sm'

  if (position === 'left' || position === 'right') {
    return (
      <div
        className={`${shared} min-h-[12rem] w-14 shrink-0 [writing-mode:vertical-rl] rotate-180`}
        aria-label="Bảng lớp học"
      >
        Bảng
      </div>
    )
  }

  return (
    <div className={`${shared} w-full`} aria-label="Bảng lớp học">
      Bảng
    </div>
  )
}

const PAN_THRESHOLD_PX = 6

export function SeatingCanvas({
  config,
  studentsById,
  classroomId,
  className,
  presentation,
  readOnly,
  selectedStudentId,
  activeSeatId,
  transform,
  onSeatClick,
  onAssignStudent,
  onDropStudent,
  onPanChange,
  containerRef,
  contentRef,
  layoutStaggerToken = 0,
}: SeatingCanvasProps) {
  const grid = buildSeatGrid(config)
  const gapPx = config.groupGap * 16
  const panRef = useRef({
    tracking: false,
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  })

  useEffect(() => {
    const endPan = () => {
      panRef.current.tracking = false
      panRef.current.active = false
    }
    window.addEventListener('pointerup', endPan)
    window.addEventListener('pointercancel', endPan)
    return () => {
      window.removeEventListener('pointerup', endPan)
      window.removeEventListener('pointercancel', endPan)
    }
  }, [])

  const layoutClass =
    config.boardPosition === 'left' || config.boardPosition === 'right'
      ? 'flex-row items-stretch min-h-full'
      : 'flex-col min-h-full'

  const boardFirst = config.boardPosition === 'front' || config.boardPosition === 'left'

  const floor = (
    <LayoutGroup id="seating-floor">
    <div className="flex w-full flex-row items-start justify-center">
      {grid.map((groupRows, groupIndex) => (
        <Fragment key={`group-wrap-${groupIndex}`}>
          {groupIndex > 0 ? (
            <div
              className="shrink-0 self-stretch rounded-full bg-slate-200/50"
              style={{ width: Math.max(8, gapPx * 0.35), marginLeft: gapPx * 0.32, marginRight: gapPx * 0.32 }}
              aria-hidden
            />
          ) : null}
          <div className="flex flex-col gap-3">
            {groupRows.map((row, rowIndex) => (
              <div key={`group-${groupIndex}-row-${rowIndex}`} className="flex justify-center gap-3">
                {row.map((cell) => {
                  const seat = config.seats.find((item) => item.seatId === cell.seatId)
                  if (!seat) return null
                  return (
                    <SeatingDesk
                      key={cell.seatId}
                      seat={seat}
                      deskType={config.deskType}
                      studentsById={studentsById}
                      classroomId={classroomId}
                      seatIndex={getSeatDisplayIndex(cell.seatId, config)}
                      selectedStudentId={selectedStudentId}
                      activeSeatId={activeSeatId}
                      presentation={presentation}
                      readOnly={readOnly}
                      onSeatClick={onSeatClick}
                      onAssignStudent={onAssignStudent}
                      onDropStudent={onDropStudent}
                      layoutStaggerToken={layoutStaggerToken}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
    </LayoutGroup>
  )

  const board = <ClassroomBoard position={config.boardPosition} />

  return (
    <div
      ref={containerRef}
      data-seating-canvas
      className={`relative h-full min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-page to-pastel-sky/25 ${className ?? ''}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const target = event.target as HTMLElement | null
        if (
          target?.closest(
            '[data-seat], [data-seat-popover], button, [draggable="true"], a, input, select, textarea, label',
          )
        ) {
          return
        }
        panRef.current = {
          tracking: true,
          active: false,
          startX: event.clientX,
          startY: event.clientY,
          originX: transform.x,
          originY: transform.y,
        }
      }}
      onPointerMove={(event) => {
        if (!panRef.current.tracking) return
        const dx = event.clientX - panRef.current.startX
        const dy = event.clientY - panRef.current.startY
        if (!panRef.current.active) {
          if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
          panRef.current.active = true
        }
        onPanChange(panRef.current.originX + dx, panRef.current.originY + dy)
      }}
    >
      <div
        className="flex min-h-full w-full justify-center px-4 pb-4 pt-3"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          ref={contentRef}
          className={`flex w-full min-h-full max-w-none gap-4 rounded-[2rem] border border-white/80 bg-white/40 p-4 shadow-inner backdrop-blur-sm sm:gap-6 sm:p-6 ${layoutClass} items-start`}
        >
          {boardFirst ? (
            <>
              {board}
              <div className="flex w-full flex-1 flex-col items-center justify-start">{floor}</div>
            </>
          ) : (
            <>
              <div className="flex w-full flex-1 flex-col items-center justify-start">{floor}</div>
              {board}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
