'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Team } from '@/src/types/models'
import { createId } from '@/src/utils/id'
import { IconTouchButton, useModalFocusTrap } from '@/src/components/classroom'
import { EmojiIconPicker } from '@/src/components/EmojiIconPicker'
import { TEAM_EMOJI_OPTIONS } from '@/src/utils/emojiIcons'

const PRESET_THEMES = [
  { icon: '🌞', name: 'Tổ Mặt Trời' },
  { icon: '🌈', name: 'Tổ Cầu Vồng' },
  { icon: '⭐', name: 'Tổ Ngôi Sao' },
  { icon: '🦸', name: 'Tổ Siêu Nhân' },
  { icon: '🌻', name: 'Tổ Hoa Hướng Dương' },
  { icon: '🦅', name: 'Tổ Đại Bàng' },
  { icon: '🚀', name: 'Tổ Phi Thuyền' },
  { icon: '🐉', name: 'Tổ Rồng Vàng' },
]

interface TeamFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (team: Team) => void
  initialData?: Team | null
}

export function TeamFormDialog({ isOpen, onClose, onSave, initialData }: TeamFormDialogProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏆')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '')
      setIcon(initialData?.avatar ?? '🏆')
    }
  }, [isOpen, initialData])

  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  const handlePreset = (preset: { icon: string; name: string }) => {
    setIcon(preset.icon)
    if (!name) setName(preset.name)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const now = new Date().toISOString()
    onSave({
      id: initialData?.id ?? createId('team'),
      name: name.trim(),
      avatar: icon,
      score: initialData?.score ?? 0,
      leaderStudentId: initialData?.leaderStudentId,
      viceLeaderStudentId: initialData?.viceLeaderStudentId,
      createdAt: initialData?.createdAt ?? now,
      updatedAt: now,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-form-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 id="team-form-title" className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa tổ' : 'Tạo tổ mới'}
          </h2>
          <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <form id="team-form" onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {/* Preset themes */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Chủ đề gợi ý</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_THEMES.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition hover:border-brand-purple/40 ${icon === p.icon ? 'border-brand-purple bg-brand-purple/5' : 'border-transparent bg-slate-50'}`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-[10px] font-semibold text-slate-500 leading-tight line-clamp-2">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <EmojiIconPicker value={icon} onChange={setIcon} options={TEAM_EMOJI_OPTIONS} />

          {/* Team name */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên tổ *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Tổ Mặt Trời"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple/50"
            />
          </div>
        </form>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">
            Hủy
          </button>
          <button
            form="team-form"
            type="submit"
            className="rounded-xl bg-brand-purple px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-purple-dark"
          >
            {initialData ? 'Lưu thay đổi' : 'Tạo tổ'}
          </button>
        </footer>
      </div>
    </div>
  )
}
