'use client'

import { useState, useMemo } from 'react'
import { Plus, Users, Search, Shuffle, FilterX } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Team, Student } from '@/src/types/models'
import { sortTeamMembersByLeadershipThenStt } from '@/src/utils/student'

import { TeamFormDialog } from './components/team-form-dialog'
import { DeleteTeamDialog } from './components/delete-team-dialog'
import { TeamPointsDialog } from './components/team-points-dialog'
import { TeamDetails } from './components/team-details'
import { RandomizeDialog } from './components/randomize-dialog'

import { TeamCard } from './components/team-card'
import { TeamRankingList } from './components/team-ranking-list'

export default function TeamsPage() {
  const { data, saveTeam, deleteTeam, saveStudent } = useAppData()
  const { classroom, isLoaded } = useActiveClassroom()

  const [searchQuery, setSearchQuery] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPointsOpen, setIsPointsOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isRandomizeOpen, setIsRandomizeOpen] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const teams = data?.teams ?? []
  const students = data?.students ?? []
  const teamHistory = data?.teamScoreHistory ?? []

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students
    const q = searchQuery.toLowerCase()
    return students.filter(s => s.name.toLowerCase().includes(q))
  }, [students, searchQuery])

  // Filter teams based on search (team name matches, or a member matches)
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams
    const q = searchQuery.toLowerCase()
    return teams.filter(t => {
      const matchesName = t.name.toLowerCase().includes(q)
      const hasMatchingStudent = filteredStudents.some(s => s.teamId === t.id)
      return matchesName || hasMatchingStudent
    })
  }, [teams, filteredStudents, searchQuery])

  // Sorted teams for the Top Cards (could be score, or just alphabetical as before)
  const sortedTeams = useMemo(() =>
    [...filteredTeams].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    [filteredTeams]
  )

  const getMembers = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    const members = students.filter((s) => s.teamId === teamId)
    if (!team) return members
    return sortTeamMembersByLeadershipThenStt(members, team, students)
  }

  const highestScore = teams.length > 0 ? Math.max(...teams.map(t => t.score || 0)) : 0

  // Handlers
  const handleSaveTeam = (team: Team) => saveTeam(team)

  const handleUpdateLeadership = (leaderStudentId?: string, viceLeaderStudentId?: string) => {
    if (!selectedTeam) return
    saveTeam({
      ...selectedTeam,
      leaderStudentId,
      viceLeaderStudentId,
      updatedAt: new Date().toISOString(),
    })
    setSelectedTeam((current) =>
      current
        ? { ...current, leaderStudentId, viceLeaderStudentId, updatedAt: new Date().toISOString() }
        : current,
    )
  }

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

  const handleRandomize = () => {
    const unassigned = students.filter(s => !s.teamId)
    if (teams.length === 0) {
      alert("Vui lòng tạo ít nhất 1 nhóm trước khi chia.")
      return
    }
    if (unassigned.length === 0) {
      alert("Tất cả học sinh đã có nhóm.")
      return
    }
    setIsRandomizeOpen(true)
  }

  const handleRandomizeConfirm = () => {
    const unassigned = students.filter(s => !s.teamId)
    if (unassigned.length === 0 || teams.length === 0) return

    // Create a shuffled copy of unassigned students
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5)

    // Track current team sizes
    const teamSizes = teams.map(t => ({ id: t.id, count: getMembers(t.id).length }))

    const now = new Date().toISOString()

    shuffled.forEach(student => {
      // Find the team with the minimum members
      teamSizes.sort((a, b) => a.count - b.count)
      const targetTeamId = teamSizes[0].id

      // Update student
      saveStudent({ ...student, teamId: targetTeamId, updatedAt: now })

      // Increment size for the next iteration
      teamSizes[0].count++
    })
  }

  if (!isLoaded || !classroom) return null

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa]">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pb-10 scrollbar-thin">

        {/* ── HEADER ── */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-purple text-white">
              <Users className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-black uppercase text-slate-800">Quản lý nhóm</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Quản lý thành viên, điểm và bảng xếp hạng từng tổ trong lớp.
          </p>
        </header>

        {/* ── TOOLBAR ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm nhóm hoặc tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
            />
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => { setSelectedTeam(null); setIsFormOpen(true) }}
              className="flex items-center gap-2 rounded-xl bg-[#5944d4] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4833b5]"
            >
              <Plus className="size-4" /> Thêm nhóm
            </button>
            <button
              onClick={handleRandomize}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Shuffle className="size-4" /> Chia ngẫu nhiên
            </button>
          </div>
        </div>

        {/* ── TOP SECTION: TEAM CARDS ── */}
        <section>
          {sortedTeams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">Không tìm thấy nhóm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedTeams.map((team, idx) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  members={getMembers(team.id)}
                  rank={idx}
                  totalTeams={sortedTeams.length}
                  highestScore={highestScore}
                  onEdit={() => handleOpenEdit(team)}
                  onDelete={() => handleOpenDelete(team)}
                  onViewDetails={() => handleOpenDetails(team)}
                  onViewMembers={() => handleOpenDetails(team)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── BOTTOM SECTION: RANKING LIST ── */}
        {teams.length > 0 && (
          <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-500">
                  <span className="text-lg">🏆</span>
                </div>
                <h2 className="font-display text-xl font-black uppercase text-slate-800">BXH Nhóm</h2>
              </div>
            </div>

            <TeamRankingList 
              teams={sortedTeams}
              roster={students}
              getMembers={getMembers}
            />
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

      <RandomizeDialog
        isOpen={isRandomizeOpen}
        onClose={() => setIsRandomizeOpen(false)}
        onConfirm={handleRandomizeConfirm}
        unassignedCount={students.filter(s => !s.teamId).length}
        teamCount={teams.length}
      />

      <TeamDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        team={selectedTeam ? teams.find((t) => t.id === selectedTeam.id) ?? selectedTeam : null}
        members={selectedTeam ? getMembers(selectedTeam.id) : []}
        allStudents={students}
        allTeams={teams}
        pointHistory={teamHistory}
        onAssign={handleAssign}
        onMove={handleMove}
        onRemove={handleRemove}
        onEditTeam={() => { setIsDetailsOpen(false); selectedTeam && handleOpenEdit(selectedTeam) }}
        onOpenPoints={() => { setIsDetailsOpen(false); selectedTeam && handleOpenPoints(selectedTeam) }}
        onUpdateLeadership={handleUpdateLeadership}
      />
    </div>
  )
}
