'use client'

import { AlertTriangle } from 'lucide-react'
import type { Team } from '@/src/types/models'
import { ClassroomButton, ClassroomDialogFrame } from '@/src/components/classroom'

interface DeleteTeamDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  team: Team | null
  memberCount: number
}

export function DeleteTeamDialog({ isOpen, onClose, onConfirm, team, memberCount }: DeleteTeamDialogProps) {
  return (
    <ClassroomDialogFrame
      open={isOpen && Boolean(team)}
      onClose={onClose}
      role="alertdialog"
      ariaLabelledBy="delete-team-title"
      panelClassName="max-w-md"
    >
      {team ? (
        <div className="w-full rounded-3xl bg-white p-6 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 text-red-500">
            <AlertTriangle className="size-8" />
          </div>

          <h2 id="delete-team-title" className="font-display text-xl font-extrabold text-slate-800">Xóa tổ này?</h2>

          <div className="mt-3 space-y-1">
            <p className="text-sm text-slate-600">
              Bạn sắp xóa <strong className="text-slate-800">{team.avatar} {team.name}</strong>
            </p>
            {memberCount > 0 && (
              <p className="text-sm font-semibold text-amber-600">
                ⚠️ Tổ này hiện có <strong>{memberCount} học sinh</strong>. Các học sinh sẽ trở thành chưa chia tổ.
              </p>
            )}
            <p className="text-sm text-red-500 font-semibold">Hành động này không thể hoàn tác.</p>
          </div>

          <div className="mt-6 flex gap-3">
            <ClassroomButton variant="ghost" className="flex-1" onClick={onClose}>
              Hủy bỏ
            </ClassroomButton>
            <ClassroomButton
              className="flex-1 border-0 bg-red-500 text-white hover:bg-red-600"
              onClick={() => { onConfirm(); onClose() }}
            >
              Xóa tổ
            </ClassroomButton>
          </div>
        </div>
      ) : null}
    </ClassroomDialogFrame>
  )
}
