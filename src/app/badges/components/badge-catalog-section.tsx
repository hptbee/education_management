'use client'

import { useEffect, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import type { Badge } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'
import { EmojiIconPicker } from '@/src/components/EmojiIconPicker'
import { BADGE_EMOJI_OPTIONS } from '@/src/utils/emojiIcons'

function BadgeFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (badge: Badge) => void
  initialData?: Badge | null
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏅')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '')
      setIcon(initialData?.icon ?? '🏅')
      setDescription(initialData?.description ?? '')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu mới'}
          </h2>
        </header>
        <form
          className="grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const now = new Date().toISOString()
            onSave({
              id: initialData?.id ?? createId('badge'),
              name: name.trim(),
              icon: icon.trim() || undefined,
              description: description.trim() || undefined,
              createdAt: initialData?.createdAt ?? now,
            })
            onClose()
          }}
        >
          <EmojiIconPicker value={icon} onChange={setIcon} options={BADGE_EMOJI_OPTIONS} />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên huy hiệu *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Yêu sách"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
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

export function BadgeCatalogSection() {
  const { data, saveBadge, deleteBadge } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null)

  const badges = data?.badges ?? []

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-slate-800">Quản lý danh mục huy hiệu</h2>
          <p className="text-sm font-semibold text-slate-500">Thêm, sửa hoặc xóa loại huy hiệu trong lớp</p>
        </div>
        <button
          onClick={() => { setEditingBadge(null); setFormOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="size-4" /> Thêm huy hiệu
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => (
          <div key={badge.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">{badge.icon ?? '🏅'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-800">{badge.name}</p>
              {badge.description ? <p className="truncate text-xs text-slate-500">{badge.description}</p> : null}
            </div>
            <button onClick={() => { setEditingBadge(badge); setFormOpen(true) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-purple">
              <PencilLine className="size-4" />
            </button>
            <button onClick={() => setDeleteTarget(badge)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-500">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {formOpen ? (
        <BadgeFormDialog
          isOpen={formOpen}
          initialData={editingBadge}
          onClose={() => setFormOpen(false)}
          onSave={(badge) => { saveBadge(badge); setFormOpen(false) }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-rose-600">Xóa huy hiệu?</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Huy hiệu <strong>{deleteTarget.name}</strong> sẽ bị xóa và gỡ khỏi tất cả học sinh đang có.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Hủy</button>
              <button
                onClick={() => { deleteBadge(deleteTarget.id); setDeleteTarget(null) }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                Xóa huy hiệu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
