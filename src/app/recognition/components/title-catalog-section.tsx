'use client'

import { useCallback, useEffect, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import type { RecognitionTitle } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'
import { EmojiIconPicker } from '@/src/components/EmojiIconPicker'
import { RECOGNITION_EMOJI_OPTIONS } from '@/src/utils/recognition'
import { ClassroomButton, useModalFocusTrap } from '@/src/components/classroom'

function TitleFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (title: RecognitionTitle) => void
  initialData?: RecognitionTitle | null
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🌟')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '')
      setIcon(initialData?.icon ?? '🌟')
      setDescription(initialData?.description ?? '')
      setIsActive(initialData?.isActive ?? true)
    }
  }, [isOpen, initialData])

  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="title-form-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        <header className="border-b border-slate-100 p-5">
          <h2 id="title-form-title" className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa danh hiệu' : 'Thêm danh hiệu mới'}
          </h2>
        </header>
        <form
          className="grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const now = new Date().toISOString()
            onSave({
              id: initialData?.id ?? createId('recognition-title'),
              name: name.trim(),
              icon: icon.trim() || undefined,
              description: description.trim() || undefined,
              isActive,
              createdAt: initialData?.createdAt ?? now,
            })
            onClose()
          }}
        >
          <EmojiIconPicker value={icon} onChange={setIcon} options={RECOGNITION_EMOJI_OPTIONS} />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên danh hiệu *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Ngôi sao chăm chỉ"
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
          <p className="text-xs font-semibold text-slate-500">
            Mỗi danh hiệu tự động tạo một huy hiệu tương ứng trên hồ sơ học sinh.
          </p>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Đang sử dụng
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>
            <ClassroomButton type="submit">Lưu danh hiệu</ClassroomButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TitleCatalogSection() {
  const { data, saveRecognitionTitle, deleteRecognitionTitle } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<RecognitionTitle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecognitionTitle | null>(null)
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])
  const deleteDialogRef = useModalFocusTrap(deleteTarget !== null, cancelDelete)

  const titles = data?.recognitionTitles ?? []
  const recognitions = data?.recognitions ?? []

  const handleDelete = (title: RecognitionTitle) => {
    deleteRecognitionTitle(title.id)
    setDeleteTarget(null)
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-slate-800">Danh mục tuyên dương</h2>
          <p className="text-sm font-semibold text-slate-500">
            Mỗi danh hiệu tự động có huy hiệu — dùng khi tuyên dương hoặc gán ở tab Huy hiệu
          </p>
        </div>
        <ClassroomButton
          onClick={() => {
            setEditingTitle(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Thêm danh hiệu
        </ClassroomButton>
      </div>

      {titles.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft px-4 py-8 text-center text-sm font-semibold text-brand-dark">
          Chưa có danh hiệu nào. Bấm Thêm danh hiệu để tạo loại đầu tiên.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {titles.map((title) => (
              <div
                key={title.id}
                className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                  title.isActive
                    ? 'border-sky-100 bg-brand-soft/60 hover:border-accent-pink/40 hover:bg-pastel-pink/50'
                    : 'border-dashed border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  {title.icon ?? '🌟'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{title.name}</p>
                  {title.description ? (
                    <p className="truncate text-xs text-slate-500">{title.description}</p>
                  ) : null}
                  {!title.isActive ? (
                    <p className="text-[10px] font-bold text-slate-400">Đã tắt</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTitle(title)
                    setFormOpen(true)
                  }}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-brand"
                  title="Sửa"
                >
                  <PencilLine className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(title)}
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
        <TitleFormDialog
          isOpen={formOpen}
          initialData={editingTitle}
          onClose={() => setFormOpen(false)}
          onSave={(title) => {
            saveRecognitionTitle(title)
            setFormOpen(false)
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 id="delete-title-title" className="text-lg font-black text-rose-600">
              {recognitions.some((r) => r.titleId === deleteTarget.id)
                ? 'Tắt danh hiệu?'
                : 'Xóa danh hiệu?'}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {recognitions.some((r) => r.titleId === deleteTarget.id) ? (
                <>
                  Danh hiệu <strong>{deleteTarget.name}</strong> đã được dùng trong lịch sử tuyên dương.
                  Danh hiệu sẽ được tắt nhưng các bản ghi cũ vẫn hiển thị bình thường.
                </>
              ) : (
                <>
                  Danh hiệu <strong>{deleteTarget.name}</strong> sẽ bị xóa vĩnh viễn. Huy hiệu liên kết vẫn giữ trên học sinh đã được trao.
                </>
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                {recognitions.some((r) => r.titleId === deleteTarget.id) ? 'Tắt danh hiệu' : 'Xóa danh hiệu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
