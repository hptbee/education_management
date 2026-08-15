'use client'

import { useEffect, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import type { Badge } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'
import { EmojiIconPicker } from '@/src/components/EmojiIconPicker'
import { BADGE_EMOJI_OPTIONS } from '@/src/utils/emojiIcons'
import { ClassroomButton } from '@/src/components/classroom'

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
              className="classroom-field px-4"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="classroom-field px-4"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
              Hủy
            </button>
            <ClassroomButton type="submit">Lưu</ClassroomButton>
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
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-slate-800">Quản lý danh mục huy hiệu</h2>
          <p className="text-sm font-semibold text-slate-500">Thêm, sửa hoặc xóa loại huy hiệu trong lớp</p>
        </div>
        <ClassroomButton onClick={() => { setEditingBadge(null); setFormOpen(true) }}>
          <Plus className="size-4" /> Thêm huy hiệu
        </ClassroomButton>
      </div>

      {badges.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft px-4 py-8 text-center text-sm font-semibold text-brand-dark">
          Chưa có huy hiệu nào. Bấm Thêm huy hiệu để tạo loại đầu tiên.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="group flex items-center gap-3 rounded-2xl border border-sky-100 bg-brand-soft/60 p-3 transition hover:border-accent-pink/40 hover:bg-pastel-pink/50"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                {badge.icon ?? '🏅'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-800">{badge.name}</p>
                {badge.description ? <p className="truncate text-xs text-slate-500">{badge.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => { setEditingBadge(badge); setFormOpen(true) }}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-brand"
                title="Sửa"
              >
                <PencilLine className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(badge)}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-500"
                title="Xóa"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
