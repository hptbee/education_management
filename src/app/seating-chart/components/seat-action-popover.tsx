'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { ClassroomButton } from '@/src/components/classroom'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { motionTransition, popoverVariants, reducedMotionTransition } from '@/src/utils/motion'

interface SeatActionPopoverProps {
  seatLabel: string
  students: Student[]
  classroomId?: string
  onClose: () => void
  onPickStudent: () => void
  onMoveStudent: (studentId: string) => void
  onRemoveStudent: (studentId: string) => void
}

export function SeatActionPopover({
  seatLabel,
  students,
  classroomId,
  onClose,
  onPickStudent,
  onMoveStudent,
  onRemoveStudent,
}: SeatActionPopoverProps) {
  const motionEnabled = useMotionEnabled()
  const transition = motionEnabled ? motionTransition('fast') : reducedMotionTransition()

  return (
    <motion.div
      data-seat-popover
      initial={motionEnabled ? 'initial' : false}
      animate="animate"
      exit="exit"
      variants={popoverVariants}
      transition={transition}
      className="absolute left-1/2 top-4 z-30 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-extrabold text-slate-800">{seatLabel}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-slate-400 hover:text-slate-600"
        >
          Đóng
        </button>
      </div>

      {students.length === 0 ? (
        <>
          <p className="mb-3 text-sm font-semibold text-slate-500">Ghế trống</p>
          <ClassroomButton type="button" className="w-full" onClick={onPickStudent}>
            Chọn học sinh
          </ClassroomButton>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li key={student.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-2">
              <div className="flex items-center gap-2">
                <StudentAvatar
                  student={student}
                  classroomId={classroomId}
                  alt={student.name}
                  className="size-9 rounded-full ring-2 ring-white"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{student.name}</p>
              </div>
              <div className="flex gap-2">
                <ClassroomButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => onMoveStudent(student.id)}
                >
                  Đổi chỗ
                </ClassroomButton>
                <ClassroomButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => onRemoveStudent(student.id)}
                >
                  Bỏ
                </ClassroomButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
