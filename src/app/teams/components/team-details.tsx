'use client'

import { useState } from 'react'
import { X, Plus, Star, ArrowLeftRight, UserMinus, History } from 'lucide-react'
import type { Student, Team, TeamScoreHistory } from '@/src/types/models'
import { AssignStudentsDialog } from './assign-students-dialog'
import { MoveStudentDialog } from './move-student-dialog'

interface TeamDetailsProps {
  team: Team | null
  isOpen: boolean
  onClose: () => void
  members: Student[]
  allStudents: Student[]
  allTeams: Team[]
  pointHistory: TeamScoreHistory[]
  onAssign: (studentIds: string[]) => void
  onMove: (studentId: string, newTeamId: string | undefined) => void
  onRemove: (studentId: string) => void
  onEditTeam: () => void
  onOpenPoints: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`
}

export function TeamDetails({
  team, isOpen, onClose, members, allStudents, allTeams, pointHistory,
  onAssign, onMove, onRemove, onEditTeam, onOpenPoints,
}: TeamDetailsProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'history'>('members')
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [moveStudent, setMoveStudent] = useState<Student | null>(null)

  if (!isOpen || !team) return null

  const teamHistory = pointHistory.filter(h => h.teamId === team.id).slice(0, 50)

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-purple/10 text-4xl">
              {team.avatar || '🏆'}
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-800">{team.name}</h2>
              <div className="mt-1 flex items-center gap-3 text-sm font-semibold">
                <span className="text-amber-500">⭐ {team.score} điểm</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">👩‍🎓 {members.length} học sinh</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
          <button
            onClick={onOpenPoints}
            className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-200"
          >
            <Star className="size-4" /> Điểm tổ
          </button>
          <button
            onClick={() => setIsAssignOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-purple/10 px-3 py-2 text-sm font-bold text-brand-purple transition hover:bg-brand-purple/20"
          >
            <Plus className="size-4" /> Thêm thành viên
          </button>
          <button
            onClick={onEditTeam}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            Chỉnh sửa
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {(['members', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold transition ${
                activeTab === tab
                  ? 'border-b-2 border-brand-purple text-brand-purple'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'members' ? <><span>👩‍🎓</span> Thành viên</> : <><History className="size-4" /> Lịch sử điểm</>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'members' ? (
            <div className="p-4 flex flex-col gap-2">
              {members.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl">👥</p>
                  <p className="mt-2 text-sm font-bold text-slate-500">Tổ chưa có thành viên</p>
                  <button
                    onClick={() => setIsAssignOpen(true)}
                    className="mt-3 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white hover:bg-brand-purple-dark"
                  >
                    + Thêm học sinh
                  </button>
                </div>
              ) : (
                members.map(student => (
                  <div key={student.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                    <img
                      src={student.avatar || '/placeholder.svg'}
                      alt={student.name}
                      className="size-10 rounded-full object-cover ring-2 ring-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                      <p className="text-xs font-semibold text-amber-500">⭐ {student.points} điểm cá nhân</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setMoveStudent(student)}
                        title="Chuyển tổ"
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-purple"
                      >
                        <ArrowLeftRight className="size-4" />
                      </button>
                      <button
                        onClick={() => onRemove(student.id)}
                        title="Bỏ khỏi tổ"
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              {teamHistory.length === 0 ? (
                <p className="py-10 text-center text-sm font-semibold text-slate-400">Chưa có lịch sử điểm</p>
              ) : (
                teamHistory.map(h => (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${h.points >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700">{h.actionName}</p>
                      <p className="text-xs font-semibold text-slate-400">{formatDate(h.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AssignStudentsDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssign={onAssign}
        team={team}
        allStudents={allStudents}
      />

      <MoveStudentDialog
        isOpen={!!moveStudent}
        onClose={() => setMoveStudent(null)}
        onMove={onMove}
        student={moveStudent}
        teams={allTeams}
      />
    </>
  )
}
