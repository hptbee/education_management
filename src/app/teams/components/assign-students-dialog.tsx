'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Search, Check } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'
import { IconTouchButton } from '@/src/components/classroom'

interface AssignStudentsDialogProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (studentIds: string[]) => void
  team: Team | null
  allStudents: Student[]
}

export function AssignStudentsDialog({ isOpen, onClose, onAssign, team, allStudents }: AssignStudentsDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set())
      setSearch('')
    }
  }, [isOpen])

  // Must be before any early return to follow Rules of Hooks
  const eligible = useMemo(() => {
    if (!team) return []
    return allStudents.filter(s => s.teamId !== team.id && s.name.toLowerCase().includes(search.toLowerCase()))
  }, [allStudents, team, search])

  if (!isOpen || !team) return null

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    onAssign(Array.from(selected))
    setSelected(new Set())
    setSearch('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-800">Thêm học sinh</h2>
            <p className="text-xs font-semibold text-slate-400">vào {team.avatar} {team.name}</p>
          </div>
          <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm học sinh..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-brand-purple/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
          {eligible.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-slate-400">
              {search ? 'Không tìm thấy học sinh' : 'Tất cả học sinh đã có tổ'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {eligible.map(s => {
                const isSelected = selected.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                      isSelected ? 'border-brand-purple bg-brand-purple/5' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <img
                      src={getStudentAvatar(s)}
                      alt={s.name}
                      className="size-9 rounded-full object-cover ring-2 ring-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs font-semibold text-slate-400">
                        {s.teamId ? '🔄 Từ tổ khác' : '⊕ Chưa có tổ'}
                      </p>
                    </div>
                    <div className={`flex size-5 items-center justify-center rounded-full border-2 transition ${isSelected ? 'border-brand-purple bg-brand-purple' : 'border-slate-300'}`}>
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 p-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-purple-dark"
          >
            Thêm {selected.size > 0 ? `${selected.size} học sinh` : ''}
          </button>
        </footer>
      </div>
    </div>
  )
}
