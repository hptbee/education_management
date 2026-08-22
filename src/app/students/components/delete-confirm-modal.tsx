'use client'

import { AlertTriangle } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { ClassroomButton, useModalFocusTrap } from '@/src/components/classroom'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (studentId: string) => void
  student: Student | null
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, student }: DeleteConfirmModalProps) {
  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen || !student) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-student-title"
        tabIndex={-1}
        className="flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-center items-center"
      >
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 text-red-500">
          <AlertTriangle className="size-8" />
        </div>
        
        <h2 id="delete-student-title" className="font-display text-xl font-extrabold text-slate-800">
          Xóa học sinh này?
        </h2>
        
        <p className="mt-2 text-sm text-slate-500">
          Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-800">{student.name}</strong> khỏi lớp học?
        </p>
        <p className="mt-1 text-sm text-red-500 font-semibold">
          Hành động này không thể hoàn tác. Dữ liệu điểm thưởng sẽ bị xóa.
        </p>

        <div className="mt-6 flex w-full gap-3">
          <ClassroomButton variant="ghost" className="flex-1" onClick={onClose}>
            Hủy bỏ
          </ClassroomButton>
          <ClassroomButton
            className="flex-1 border-0 bg-red-500 text-white hover:bg-red-600"
            onClick={() => {
              onConfirm(student.id)
              onClose()
            }}
          >
            Đồng ý Xóa
          </ClassroomButton>
        </div>
      </div>
    </div>
  )
}
