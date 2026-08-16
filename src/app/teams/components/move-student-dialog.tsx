'use client'

import { useEffect, useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { Student, Team } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'
import { IconTouchButton } from '@/src/components/classroom'

interface MoveStudentDialogProps {
  isOpen: boolean
  onClose: () => void
  onMove: (studentId: string, newTeamId: string | undefined) => void
  student: Student | null
  teams: Team[]
}

export function MoveStudentDialog({ isOpen, onClose, onMove, student, teams }: MoveStudentDialogProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none')

  useEffect(() => {
    if (!isOpen || !student) return
    setSelectedTeamId(student.teamId ?? 'none')
  }, [isOpen, student])

  if (!isOpen || !student) return null

  const currentTeam = teams.find(t => t.id === student.teamId)
  const otherTeams = teams.filter(t => t.id !== student.teamId)

  const handleConfirm = () => {
    const newTeamId = selectedTeamId === 'none' ? undefined : selectedTeamId
    onMove(student.id, newTeamId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">Chuyển tổ</h2>
          <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <div className="p-5 flex flex-col gap-4">
          {/* Student info */}
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <img
              src={getStudentAvatar(student)}
              alt={student.name}
              className="size-11 rounded-full object-cover ring-2 ring-white"
            />
            <div>
              <p className="font-bold text-slate-800">{student.name}</p>
              <p className="text-xs font-semibold text-slate-400">
                Hiện tại: {currentTeam ? `${currentTeam.avatar} ${currentTeam.name}` : 'Chưa có tổ'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="size-5 text-slate-300" />
          </div>

          {/* Target team select */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Chuyển sang tổ</label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedTeamId('none')}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${selectedTeamId === 'none' ? 'border-brand-purple bg-brand-purple/5' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
              >
                <span className="text-xl">🚫</span>
                <span className="text-sm font-bold text-slate-600">Bỏ khỏi tổ (Chưa chia tổ)</span>
              </button>
              {otherTeams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${selectedTeamId === t.id ? 'border-brand-purple bg-brand-purple/5' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <span className="text-xl">{t.avatar || '🏆'}</span>
                  <span className="text-sm font-bold text-slate-700">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex gap-3 border-t border-slate-100 p-5">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-brand-purple py-2.5 text-sm font-bold text-white hover:bg-brand-purple-dark"
          >
            Xác nhận
          </button>
        </footer>
      </div>
    </div>
  )
}
