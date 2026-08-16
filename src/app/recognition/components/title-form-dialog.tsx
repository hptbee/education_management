'use client'

import { useEffect, useState } from 'react'
import type { RecognitionTitle } from '@/src/types/models'
import { createId } from '@/src/utils/id'
import { EmojiIconPicker } from '@/src/components/EmojiIconPicker'
import { RECOGNITION_EMOJI_OPTIONS } from '@/src/utils/recognition'
import { ClassroomButton, useModalFocusTrap } from '@/src/components/classroom'

export function TitleFormDialog({
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
