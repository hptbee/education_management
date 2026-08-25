'use client'

import { useState, useMemo } from 'react'
import { Plus, Users, Search, Shuffle, X, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import type { Team, Student } from '@/src/types/models'
import { sortTeamMembersByLeadershipThenStt } from '@/src/utils/student'
import { rankTeams } from '@/src/utils/ranking'

import { TeamFormDialog } from './components/team-form-dialog'
import { DeleteTeamDialog } from './components/delete-team-dialog'
import { TeamPointsDialog } from './components/team-points-dialog'
import { TeamDetails } from './components/team-details'
import { RandomizeDialog } from './components/randomize-dialog'

import { TeamCard } from './components/team-card'
import { TeamRankingList } from './components/team-ranking-list'
import { PageHeader, ClassroomCard, EmptyState, ClassroomButton, useClassroomDialog, IconTouchButton, AnimatedEntrance } from '@/src/components/classroom'

export default function TeamsPage() {
  const { data, saveTeam, deleteTeam, saveStudent, saveStudents } = useAppData()
  const { classroom, isLoaded } = useActiveClassroom()
  const { showAlert, showConfirm } = useClassroomDialog()

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
  const sortedTeams = useMemo(
    () => rankTeams(filteredTeams).map((entry) => entry.team),
    [filteredTeams],
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
    const now = new Date().toISOString()
    const updates = studentIds
      .map((id) => students.find((st) => st.id === id))
      .filter((student): student is Student => !!student)
      .map((student) => ({ ...student, teamId: selectedTeam.id, updatedAt: now }))
    saveStudents(updates)
  }

  const handleMove = (studentId: string, newTeamId: string | undefined) => {
    const s = students.find(st => st.id === studentId)
    if (s) saveStudent({ ...s, teamId: newTeamId, updatedAt: new Date().toISOString() })
  }

  const handleRemove = (studentId: string) => {
    const s = students.find(st => st.id === studentId)
    if (s) saveStudent({ ...s, teamId: undefined, updatedAt: new Date().toISOString() })
  }

  const handleClearAllMembers = async (team: Team) => {
    const members = students.filter((student) => student.teamId === team.id)
    if (members.length === 0) return

    const confirmed = await showConfirm(
      `Bỏ ${members.length} học sinh khỏi tổ "${team.name}"? Các học sinh sẽ trở thành chưa chia tổ.`,
      {
        title: 'Bỏ hết thành viên',
        confirmLabel: 'Bỏ hết',
        variant: 'warning',
      },
    )
    if (!confirmed) return

    const now = new Date().toISOString()
    saveStudents(members.map((student) => ({ ...student, teamId: undefined, updatedAt: now })))
  }

  const handleRandomize = async () => {
    const unassigned = students.filter(s => !s.teamId)
    if (teams.length === 0) {
      await showAlert('Vui lòng tạo ít nhất 1 nhóm trước khi chia.', { variant: 'warning' })
      return
    }
    if (unassigned.length === 0) {
      await showAlert('Tất cả học sinh đã có nhóm.', { variant: 'info' })
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
    const updates = shuffled.map((student) => {
      teamSizes.sort((a, b) => a.count - b.count)
      const targetTeamId = teamSizes[0].id
      teamSizes[0].count++
      return { ...student, teamId: targetTeamId, updatedAt: now }
    })

    saveStudents(updates)
  }

  const unassignedCount = students.filter((s) => !s.teamId).length

  if (!isLoaded || !classroom) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Đang chuẩn bị dữ liệu lớp...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        <div className="classroom-page--management">

        <PageHeader
          icon={Users}
          title="Quản lý nhóm"
          subtitle="Quản lý thành viên, điểm và bảng xếp hạng từng tổ trong lớp."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClassroomButton onClick={() => { setSelectedTeam(null); setIsFormOpen(true) }}>
                <Plus className="size-4" /> Thêm nhóm
              </ClassroomButton>
              <ClassroomButton variant="outline" onClick={handleRandomize}>
                <Shuffle className="size-4" /> Chia ngẫu nhiên
              </ClassroomButton>
            </div>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm nhóm hoặc tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="classroom-search-field rounded-2xl py-2.5"
            />
            {searchQuery ? (
              <IconTouchButton
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </IconTouchButton>
            ) : null}
          </div>
          {unassignedCount > 0 ? (
            <p className="text-sm font-semibold text-rose-600">
              {unassignedCount} học sinh chưa có tổ
            </p>
          ) : null}
        </div>

        {/* ── TOP SECTION: TEAM CARDS ── */}
        <section>
          {sortedTeams.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={searchQuery ? 'Không tìm thấy nhóm nào' : 'Chưa có tổ nào'}
              description={
                searchQuery
                  ? 'Thử thay đổi từ khóa tìm kiếm.'
                  : 'Tạo tổ đầu tiên để bắt đầu thi đua trong lớp nhé!'
              }
              action={
                !searchQuery ? (
                  <ClassroomButton onClick={() => { setSelectedTeam(null); setIsFormOpen(true) }}>
                    <Plus className="size-4" /> Tạo tổ
                  </ClassroomButton>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedTeams.map((team, idx) => (
                <AnimatedEntrance key={team.id} variant="random" staggerIndex={idx}>
                  <TeamCard
                    team={team}
                    members={getMembers(team.id)}
                    rank={idx}
                    totalTeams={sortedTeams.length}
                    highestScore={highestScore}
                    colorIndex={Math.max(0, teams.findIndex((t) => t.id === team.id))}
                    onEdit={() => handleOpenEdit(team)}
                    onDelete={() => handleOpenDelete(team)}
                    onClearAllMembers={() => void handleClearAllMembers(team)}
                    onViewDetails={() => handleOpenDetails(team)}
                    onViewMembers={() => handleOpenDetails(team)}
                  />
                </AnimatedEntrance>
              ))}
            </div>
          )}
        </section>

        {/* ── BOTTOM SECTION: RANKING LIST ── */}
        {teams.length > 0 && (
          <AnimatedEntrance variant="random" staggerIndex={0}>
            <ClassroomCard>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-pastel-yellow text-lg">
                🏆
              </div>
              <h2 className="font-display text-xl font-black text-slate-800">Bảng xếp hạng nhóm</h2>
            </div>

            <TeamRankingList 
              teams={sortedTeams}
              allTeams={teams}
              roster={students}
              getMembers={getMembers}
            />
          </ClassroomCard>
          </AnimatedEntrance>
        )}
        </div>
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
        onClearAllMembers={() => selectedTeam && void handleClearAllMembers(selectedTeam)}
        onEditTeam={() => { setIsDetailsOpen(false); selectedTeam && handleOpenEdit(selectedTeam) }}
        onOpenPoints={() => { setIsDetailsOpen(false); selectedTeam && handleOpenPoints(selectedTeam) }}
        onUpdateLeadership={handleUpdateLeadership}
      />
    </div>
  )
}
