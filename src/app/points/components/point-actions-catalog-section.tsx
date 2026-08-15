'use client'

import { useEffect, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import type { PointAction } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'

function PointActionFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (action: PointAction) => void
  initialData?: PointAction | null
}) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState(1)
  const [type, setType] = useState<'reward' | 'penalty'>('reward')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '')
      setPoints(Math.abs(initialData?.points ?? 1))
      setType(initialData?.type ?? 'reward')
      setIsActive(initialData?.isActive ?? true)
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa hành động điểm' : 'Thêm hành động điểm'}
          </h2>
        </header>
        <form
          className="grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const signedPoints = type === 'reward' ? points : -points
            onSave({
              id: initialData?.id ?? createId('action'),
              name: name.trim(),
              points: signedPoints,
              type,
              isActive,
            })
            onClose()
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Loại</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setType('reward')}
                className={`flex-1 py-2.5 text-sm font-bold transition ${
                  type === 'reward' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Cộng điểm
              </button>
              <button
                type="button"
                onClick={() => setType('penalty')}
                className={`flex-1 py-2.5 text-sm font-bold transition ${
                  type === 'penalty' ? 'bg-pastel-pink text-rose-800' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Trừ điểm
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên hành động *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Tích cực phát biểu"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Số điểm *</label>
            <input
              required
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Hiển thị trong danh sách nhanh
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
              Hủy
            </button>
            <button type="submit" className="rounded-xl bg-brand-purple px-5 py-2 text-sm font-bold text-white hover:bg-brand-purple-dark">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PointActionsCatalogSection() {
  const { data, savePointAction, deletePointAction } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingAction, setEditingAction] = useState<PointAction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PointAction | null>(null)

  const pointActions = data?.pointActions ?? []
  const rewards = pointActions.filter((action) => action.type === 'reward')
  const penalties = pointActions.filter((action) => action.type === 'penalty')

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-slate-800">Quản lý hành động điểm</h2>
          <p className="text-sm font-semibold text-slate-500">Thêm, sửa hoặc tắt các lý do cộng/trừ điểm</p>
        </div>
        <button
          onClick={() => { setEditingAction(null); setFormOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="size-4" /> Thêm hành động
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">Cộng điểm</h3>
          <div className="grid gap-2">
            {rewards.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onEdit={() => { setEditingAction(action); setFormOpen(true) }}
                onDelete={() => setDeleteTarget(action)}
              />
            ))}
            {rewards.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">Chưa có hành động cộng điểm</p>
            ) : null}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-600">Trừ điểm</h3>
          <div className="grid gap-2">
            {penalties.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onEdit={() => { setEditingAction(action); setFormOpen(true) }}
                onDelete={() => setDeleteTarget(action)}
              />
            ))}
            {penalties.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">Chưa có hành động trừ điểm</p>
            ) : null}
          </div>
        </div>
      </div>

      {formOpen ? (
        <PointActionFormDialog
          isOpen={formOpen}
          initialData={editingAction}
          onClose={() => setFormOpen(false)}
          onSave={(action) => { savePointAction(action); setFormOpen(false) }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-rose-600">Xóa hành động điểm?</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Hành động <strong>{deleteTarget.name}</strong> sẽ bị xóa khỏi danh sách nhanh. Lịch sử điểm cũ vẫn được giữ.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Hủy</button>
              <button
                onClick={() => { deletePointAction(deleteTarget.id); setDeleteTarget(null) }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ActionRow({
  action,
  onEdit,
  onDelete,
}: {
  action: PointAction
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-black ${
          action.type === 'reward' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}
      >
        {action.points > 0 ? '+' : ''}{action.points}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-800">{action.name}</p>
        {!action.isActive ? (
          <p className="text-xs font-semibold text-slate-400">Đang ẩn</p>
        ) : null}
      </div>
      <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-purple">
        <PencilLine className="size-4" />
      </button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-500">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
