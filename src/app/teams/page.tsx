'use client'

import { useState, useMemo } from 'react'
import { Plus, Trophy, Users, Star, Medal, Edit2, Trash2 } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Team, Student } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'

import { TeamFormDialog } from './components/team-form-dialog'
import { DeleteTeamDialog } from './components/delete-team-dialog'
import { TeamPointsDialog } from './components/team-points-dialog'
import { TeamDetails } from './components/team-details'

// ─── Medal renderer ──────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']
const RANK_COLORS = [
  'from-amber-400/20 to-yellow-100 border-amber-300',
  'from-slate-300/30 to-slate-100 border-slate-300',
  'from-orange-300/20 to-orange-50 border-orange-200',
]

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`flex flex-1 min-w-[130px] flex-col items-center justify-center rounded-2xl border p-4 text-center ${color}`}>
      <span className="text-2xl">{emoji}</span>
      <p className="mt-1.5 text-2xl font-black text-slate-800 leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-tight">{label}</p>
    </div>
  )
}

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({
  team, members, rank,
  onView, onEdit, onDelete, onPoints,
}: {
  team: Team
  members: Student[]
  rank: number
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onPoints: () => void
}) {
  const medal = MEDALS[rank] ?? null
  const previewAvatars = members.slice(0, 4)
  const extra = members.length - previewAvatars.length

  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-4 pb-4 pt-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Hover edit/delete */}
      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onEdit} title="Chỉnh sửa" className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-purple/10 hover:text-brand-purple">
          <Edit2 className="size-3.5" />
        </button>
        <button onClick={onDelete} title="Xóa tổ" className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Medal badge */}
      {medal && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{medal}</span>
      )}

      {/* Avatar */}
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-purple/10 text-4xl">
        {team.avatar || '🏆'}
      </div>

      {/* Name */}
      <h3 className="mt-3 text-sm font-extrabold text-slate-800 line-clamp-2" title={team.name}>{team.name}</h3>

      {/* Score */}
      <button
        onClick={onPoints}
        className="mt-2 flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-extrabold text-amber-600 transition hover:bg-amber-100"
        title="Quản lý điểm tổ"
      >
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {team.score} điểm
      </button>

      {/* Members preview */}
      <div className="mt-3 flex items-center justify-center gap-1">
        {members.length === 0 ? (
          <span className="text-xs font-semibold text-slate-400">Chưa có thành viên</span>
        ) : (
          <>
            <div className="flex -space-x-2">
              {previewAvatars.map(s => (
                <img key={s.id} src={getStudentAvatar(s)} alt={s.name}
                  className="size-7 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            {extra > 0 && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">+{extra}</span>
            )}
          </>
        )}
      </div>

      <p className="mt-1 text-xs font-semibold text-slate-400">👩‍🎓 {members.length} học sinh</p>

      {/* View button */}
      <div className="mt-3 flex w-full gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={onView}
          className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 transition hover:bg-brand-purple hover:text-white"
        >
          Xem tổ
        </button>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-purple/20 bg-gradient-to-b from-brand-purple/5 to-transparent px-8 py-16 text-center">
      <div className="mb-4 text-6xl select-none">🏆</div>
      <h3 className="font-display text-xl font-black text-slate-700">Lớp mình chưa chia tổ nào!</h3>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-relaxed text-slate-500">
        Chia các bạn thành những đội thật vui để cùng nhau thi đua nhé!
      </p>
      <button
        onClick={onAdd}
        className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-purple px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-purple-dark"
      >
        <Plus className="size-4" /> Tạo tổ đầu tiên
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const { data, saveTeam, deleteTeam, saveStudent } = useAppData()
  const { classroom, isLoaded } = useActiveClassroom()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPointsOpen, setIsPointsOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const teams = data?.teams ?? []
  const students = data?.students ?? []
  const teamHistory = data?.teamScoreHistory ?? []

  // Sorted by score DESC, then name
  const sortedTeams = useMemo(() =>
    [...teams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    [teams]
  )

  const getMembers = (teamId: string) => students.filter(s => s.teamId === teamId)

  // Summary stats
  const totalScore = teams.reduce((sum, t) => sum + t.score, 0)
  const leader = sortedTeams[0]
  const assignedCount = students.filter(s => !!s.teamId).length

  // Handlers
  const handleSaveTeam = (team: Team) => saveTeam(team)

  const handleOpenEdit = (team: Team) => {
    setSelectedTeam(team)
    setIsFormOpen(true)
  }

  const handleOpenDelete = (team: Team) => {
    setSelectedTeam(team)
    setIsDeleteOpen(true)
  }

  const handleOpenPoints = (team: Team) => {
    setSelectedTeam(team)
    setIsPointsOpen(true)
  }

  const handleOpenDetails = (team: Team) => {
    setSelectedTeam(team)
    setIsDetailsOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedTeam) deleteTeam(selectedTeam.id)
    setSelectedTeam(null)
  }

  const handleAssign = (studentIds: string[]) => {
    if (!selectedTeam) return
    studentIds.forEach(id => {
      const s = students.find(st => st.id === id)
      if (s) saveStudent({ ...s, teamId: selectedTeam.id, updatedAt: new Date().toISOString() })
    })
  }

  const handleMove = (studentId: string, newTeamId: string | undefined) => {
    const s = students.find(st => st.id === studentId)
    if (s) saveStudent({ ...s, teamId: newTeamId, updatedAt: new Date().toISOString() })
  }

  const handleRemove = (studentId: string) => {
    const s = students.find(st => st.id === studentId)
    if (s) saveStudent({ ...s, teamId: undefined, updatedAt: new Date().toISOString() })
  }

  if (!isLoaded || !classroom) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pb-10 scrollbar-thin">

        {/* ── HEADER ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100">
              <Trophy className="size-5 text-amber-600" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-slate-800">Thi đua tổ / nhóm</h1>
              <p className="text-xs font-semibold text-slate-400">
                {classroom.className} · Năm học {classroom.schoolYear}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedTeam(null); setIsFormOpen(true) }}
            className="flex items-center gap-2 self-start rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-purple-dark"
          >
            <Plus className="size-4" /> Tạo tổ mới
          </button>
        </header>

        {/* ── SUMMARY CARDS ── */}
        {teams.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <SummaryCard emoji="🏆" label="Tổng số tổ" value={teams.length} color="bg-amber-50 border-amber-100" />
            <SummaryCard emoji="👩‍🎓" label="Học sinh có tổ" value={`${assignedCount}/${students.length}`} color="bg-sky-50 border-sky-100" />
            <SummaryCard emoji="⭐" label="Tổng điểm tổ" value={totalScore.toLocaleString()} color="bg-brand-purple/5 border-brand-purple/10" />
            <SummaryCard
              emoji="🥇"
              label="Đang dẫn đầu"
              value={leader ? leader.name : '—'}
              color="bg-emerald-50 border-emerald-100"
            />
          </div>
        )}

        {/* ── RANKING ── */}
        {teams.length > 0 && (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-display text-base font-extrabold text-slate-700">🏆 Bảng xếp hạng thi đua</h2>
            <div className="flex flex-col gap-2">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  className={`flex items-center gap-3 rounded-xl border bg-gradient-to-r px-4 py-3 ${RANK_COLORS[idx] ?? 'from-slate-50 to-white border-slate-100'}`}
                >
                  <span className="text-xl w-8 text-center">{MEDALS[idx] ?? `${idx + 1}️⃣`}</span>
                  <span className="text-2xl">{team.avatar || '🏆'}</span>
                  <span className="flex-1 text-sm font-extrabold text-slate-800">{team.name}</span>
                  <span className="flex items-center gap-1 text-sm font-extrabold text-amber-600">
                    <Star className="size-3.5 fill-amber-400" />
                    {team.score.toLocaleString()} điểm
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {getMembers(team.id).length} hs
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── TEAM GRID / EMPTY STATE ── */}
        {teams.length === 0 ? (
          <EmptyState onAdd={() => { setSelectedTeam(null); setIsFormOpen(true) }} />
        ) : (
          <section>
            <p className="mb-3 text-sm font-bold text-slate-500">
              <span className="text-brand-purple">{teams.length}</span> tổ
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sortedTeams.map((team, idx) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  members={getMembers(team.id)}
                  rank={idx}
                  onView={() => handleOpenDetails(team)}
                  onEdit={() => handleOpenEdit(team)}
                  onDelete={() => handleOpenDelete(team)}
                  onPoints={() => handleOpenPoints(team)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── MODALS ── */}
      <TeamFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveTeam}
        initialData={selectedTeam}
      />

      <DeleteTeamDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        team={selectedTeam}
        memberCount={selectedTeam ? getMembers(selectedTeam.id).length : 0}
      />

      <TeamPointsDialog
        isOpen={isPointsOpen}
        onClose={() => setIsPointsOpen(false)}
        team={selectedTeam}
      />

      <TeamDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        team={selectedTeam}
        members={selectedTeam ? getMembers(selectedTeam.id) : []}
        allStudents={students}
        allTeams={teams}
        pointHistory={teamHistory}
        onAssign={handleAssign}
        onMove={handleMove}
        onRemove={handleRemove}
        onEditTeam={() => { setIsDetailsOpen(false); selectedTeam && handleOpenEdit(selectedTeam) }}
        onOpenPoints={() => { setIsDetailsOpen(false); selectedTeam && handleOpenPoints(selectedTeam) }}
      />
    </div>
  )
}
