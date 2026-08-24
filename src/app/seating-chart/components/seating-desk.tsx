'use client'

import type { DragEvent, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import type { DeskType, SeatAssignment, Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { getWheelDisplayName } from '@/src/utils/wheelSpin'
import { deskCapacity } from '@/src/utils/seatingChart'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { motionTransition, reducedMotionTransition, staggerDelay } from '@/src/utils/motion'
import { DRAG_TYPE } from './seating-roster'
import { Plus } from 'lucide-react'

interface SeatingDeskProps {
  seat: SeatAssignment
  deskType: DeskType
  studentsById: Map<string, Student>
  classroomId?: string
  seatIndex: number
  selectedStudentId: string | null
  activeSeatId: string | null
  presentation?: boolean
  readOnly?: boolean
  layoutStaggerToken?: number
  onSeatClick: (seatId: string) => void
  onAssignStudent: (seatId: string, studentId: string) => void
  onDropStudent: (seatId: string, studentId: string) => void
}

export function SeatingDesk({
  seat,
  deskType,
  studentsById,
  classroomId,
  seatIndex,
  selectedStudentId,
  activeSeatId,
  presentation,
  readOnly,
  layoutStaggerToken = 0,
  onSeatClick,
  onAssignStudent,
  onDropStudent,
}: SeatingDeskProps) {
  const motionEnabled = useMotionEnabled()
  const capacity = deskCapacity(deskType)
  const occupants = seat.studentIds.map((id) => studentsById.get(id)).filter(Boolean) as Student[]
  const slots = Array.from({ length: capacity }, (_, index) => occupants[index])
  const canAcceptSelected = Boolean(selectedStudentId) && occupants.length < capacity

  const layoutTransition = motionEnabled
    ? {
        ...motionTransition('smooth'),
        delay: layoutStaggerToken > 0 ? staggerDelay(Math.min(seatIndex - 1, 8)) / 1000 : 0,
      }
    : reducedMotionTransition()

  const activate = () => {
    if (readOnly) return
    if (selectedStudentId) {
      onAssignStudent(seat.seatId, selectedStudentId)
      return
    }
    onSeatClick(seat.seatId)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  const widthClass =
    deskType === 'group'
      ? 'min-w-[7rem] sm:min-w-[8rem]'
      : deskType === 'pair'
        ? 'min-w-[6rem] sm:min-w-[7.5rem]'
        : 'min-w-[4.5rem] sm:min-w-[5.5rem]'

  const avatarSize = presentation ? 'size-12 sm:size-14' : 'size-8 sm:size-9'
  const nameSize = presentation ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'

  return (
    <motion.div
      layout={motionEnabled ? 'position' : false}
      transition={{ layout: layoutTransition }}
      data-seat={seat.seatId}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? -1 : 0}
      onClick={activate}
      onKeyDown={onKeyDown}
      onDragOver={(event) => {
        if (readOnly) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        if (readOnly) return
        event.preventDefault()
        event.stopPropagation()
        const studentId = event.dataTransfer.getData(DRAG_TYPE)
        if (studentId) onDropStudent(seat.seatId, studentId)
      }}
      className={`relative rounded-2xl border bg-gradient-to-b from-amber-50 to-amber-100/80 p-2 shadow-sm outline-none transition-[box-shadow,ring-color,border-color] duration-[var(--motion-fast)] focus-visible:ring-2 focus-visible:ring-brand/40 ${widthClass} ${
        readOnly ? 'cursor-default' : 'cursor-pointer'
      } ${activeSeatId === seat.seatId ? 'border-brand ring-2 ring-brand/30' : 'border-amber-200/80'} ${occupants.length === 0 ? 'border-dashed bg-white/70' : ''} ${
        canAcceptSelected ? 'ring-2 ring-accent-pink/40' : ''
      }`}
      aria-label={`Ghế ${seatIndex}${occupants[0] ? `, ${occupants.map((s) => s.name).join(', ')}` : ', trống'}`}
    >
      <span
        className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500 shadow-sm"
      >
        #{seatIndex}
      </span>
      <div
        className={`grid gap-1.5 ${
          deskType === 'group' || deskType === 'pair' ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {slots.map((student, index) => (
          <div
            key={`${seat.seatId}-${index}`}
            className={`flex min-h-[3.5rem] flex-col items-center justify-center rounded-xl border border-dashed px-1 sm:min-h-[4rem] ${
              student
                ? 'border-slate-200/60 bg-white/70'
                : 'border-brand/30 bg-brand-soft/40 text-brand/60'
            }`}
          >
            {student ? (
              <motion.div
                layoutId={motionEnabled ? `seat-student-${student.id}` : undefined}
                layout={motionEnabled ? 'position' : false}
                transition={{ layout: layoutTransition }}
                className="flex w-full flex-col items-center gap-1"
              >
                <div
                  draggable={!presentation && !readOnly}
                  onDragStart={(event: DragEvent) => {
                    event.stopPropagation()
                    event.dataTransfer.setData(DRAG_TYPE, student.id)
                    event.dataTransfer.effectAllowed = 'move'
                    const el = event.currentTarget as HTMLElement
                    el.dataset.seatingDragging = 'true'
                  }}
                  onDragEnd={(event: DragEvent) => {
                    const el = event.currentTarget as HTMLElement
                    delete el.dataset.seatingDragging
                  }}
                  className="flex w-full cursor-grab flex-col items-center gap-1 transition-transform duration-[var(--motion-fast)] active:cursor-grabbing data-[seating-dragging=true]:scale-[1.04] data-[seating-dragging=true]:shadow-md"
                >
                  <StudentAvatar
                    student={student}
                    classroomId={classroomId}
                    alt={student.name}
                    className={`rounded-full ring-2 ring-white ${avatarSize}`}
                  />
                  <span
                    title={student.name}
                    className={`line-clamp-2 max-w-full text-center font-bold leading-tight text-slate-700 ${nameSize}`}
                  >
                    {getWheelDisplayName(student.name)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <>
                <Plus className={presentation ? 'size-5' : 'size-5 sm:size-6'} aria-hidden />
                <span className="sr-only">Ghế trống</span>
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
