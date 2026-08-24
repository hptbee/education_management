'use client'

import { useState } from 'react'
import { X, Plus, Minus, Trophy } from 'lucide-react'
import { IconTouchButton, ClassroomDialogFrame } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import type { Team } from '@/src/types/models'
import { playSound } from '@/src/utils/sounds'

const QUICK_AMOUNTS = [5, 10, 20, 50]

interface TeamPointsDialogProps {
  team: Team | null
  isOpen: boolean
  onClose: () => void
}

export function TeamPointsDialog({ team, isOpen, onClose }: TeamPointsDialogProps) {
  const { data, updateTeamScore } = useAppData()
  const soundEnabled = data?.appSettings.soundEnabled ?? true
  const [customAmount, setCustomAmount] = useState('')
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'add' | 'subtract'>('add')

  const handleQuick = (amount: number) => {
    if (!team) return
    const delta = mode === 'add' ? amount : -amount
    if (team.score + delta < 0) return
    updateTeamScore(team.id, delta, note.trim() || undefined)
    playSound(mode === 'add' ? 'success' : 'wrong-answer', { enabled: soundEnabled })
    setNote('')
    onClose()
  }

  const handleCustom = () => {
    if (!team) return
    const n = parseInt(customAmount, 10)
    if (isNaN(n) || n <= 0) return
    const delta = mode === 'add' ? n : -n
    if (team.score + delta < 0) return
    updateTeamScore(team.id, delta, note.trim() || undefined)
    playSound(mode === 'add' ? 'success' : 'wrong-answer', { enabled: soundEnabled })
    setCustomAmount('')
    setNote('')
    onClose()
  }

  return (
    <ClassroomDialogFrame
      open={isOpen && Boolean(team)}
      onClose={onClose}
      ariaLabelledBy="team-points-title"
      panelClassName="max-w-sm"
    >
      {team ? (
        <div className="w-full rounded-3xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <h2 id="team-points-title" className="font-display text-lg font-extrabold text-slate-800">Điểm tổ — {team.name}</h2>
            </div>
            <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100">
              <X className="size-5" />
            </IconTouchButton>
          </header>

          <div className="p-5 flex flex-col gap-4">
            <div className="rounded-2xl bg-amber-50 py-4 text-center">
              <p className="text-xs font-bold uppercase text-amber-500 tracking-wider">Điểm hiện tại</p>
              <p className="text-4xl font-black text-amber-600 mt-1">{team.score}</p>
            </div>

            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setMode('add')}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition ${mode === 'add' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Plus className="size-4" /> Cộng điểm
              </button>
              <button
                onClick={() => setMode('subtract')}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-bold transition ${mode === 'subtract' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Minus className="size-4" /> Trừ điểm
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleQuick(amt)}
                  disabled={mode === 'subtract' && team.score < amt}
                  className={`rounded-xl py-3 text-sm font-extrabold transition disabled:opacity-40 ${
                    mode === 'add'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  }`}
                >
                  {mode === 'add' ? '+' : '-'}{amt}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="team-points-note" className="sr-only">
                Ghi chú (tùy chọn)
              </label>
              <input
                id="team-points-note"
                type="text"
                placeholder="Ghi chú (tùy chọn)..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple/50 focus-visible:ring-2 focus-visible:ring-brand/40"
                onKeyDown={e => e.key === 'Enter' && customAmount && handleCustom()}
              />
            </div>

            <div className="flex gap-2">
              <label htmlFor="team-points-custom" className="sr-only">
                Số điểm tùy chỉnh
              </label>
              <input
                id="team-points-custom"
                type="number"
                min="1"
                placeholder="Số điểm tuỳ chỉnh..."
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple/50 focus-visible:ring-2 focus-visible:ring-brand/40"
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
              />
              <button
                onClick={handleCustom}
                disabled={!customAmount || parseInt(customAmount) <= 0}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40 ${mode === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ClassroomDialogFrame>
  )
}
