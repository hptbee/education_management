'use client'

import { Shuffle, AlertCircle } from 'lucide-react'

interface RandomizeDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  unassignedCount: number
  teamCount: number
}

export function RandomizeDialog({ isOpen, onClose, onConfirm, unassignedCount, teamCount }: RandomizeDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-left shadow-2xl">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple">
          <Shuffle className="size-6" />
        </div>

        <h3 className="font-display text-xl font-black text-slate-800">
          Chia nhóm ngẫu nhiên
        </h3>

        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-500">
            Bạn có chắc chắn muốn chia ngẫu nhiên <strong className="text-slate-700">{unassignedCount} học sinh</strong> chưa có nhóm vào <strong className="text-slate-700">{teamCount} nhóm</strong> hiện tại không?
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>Hệ thống sẽ cố gắng chia đều số lượng thành viên cho các nhóm.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark"
          >
            <Shuffle className="size-4" /> Xác nhận chia
          </button>
        </div>
      </div>
    </div>
  )
}
