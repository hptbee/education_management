'use client'

import { useState } from 'react'
import { Trophy, Medal, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentRosterOrder } from '@/src/utils/student'
import { timeAgo } from '@/src/utils/teams'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import {
  getTeamLeadershipRole,
  TeamLeadershipAvatarOverlay,
  TeamLeadershipBadge,
} from './team-leadership-badge'

type MemberSortColumn = 'stt' | 'name' | 'points' | 'achievement' | 'activity'
type SortDirection = 'asc' | 'desc'

type TeamSortState = {
  column: MemberSortColumn | null
  direction: SortDirection
}

const DEFAULT_TEAM_SORT: TeamSortState = { column: null, direction: 'asc' }

function defaultSortDirection(column: MemberSortColumn): SortDirection {
  return column === 'points' || column === 'activity' ? 'desc' : 'asc'
}

function buildPointRanking(members: Student[]) {
  const byPoints = [...members].sort((a, b) => (b.points || 0) - (a.points || 0))
  const maxPoints = byPoints.length > 0 ? byPoints[0].points || 0 : 0
  const championsCount = byPoints.filter((m) => (m.points || 0) === maxPoints && maxPoints > 0).length
  const pointRankById = new Map(byPoints.map((student, i) => [student.id, i]))
  return { maxPoints, championsCount, pointRankById }
}

function achievementRank(
  student: Student,
  pointRankById: Map<string, number>,
  maxPoints: number,
  championsCount: number,
): number {
  const pts = student.points || 0
  if (pts === 0) return 100
  const sIdx = pointRankById.get(student.id) ?? 999
  if (pts === maxPoints && maxPoints > 0) return 0
  if (sIdx === championsCount) return 1
  if (sIdx === championsCount + 1) return 2
  return 10 + sIdx
}

function sortTeamMembers(
  members: Student[],
  roster: Student[],
  column: MemberSortColumn,
  direction: SortDirection,
): Student[] {
  const { maxPoints, championsCount, pointRankById } = buildPointRanking(members)
  const multiplier = direction === 'asc' ? 1 : -1

  return [...members].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'stt':
        cmp = getStudentRosterOrder(a, roster) - getStudentRosterOrder(b, roster)
        break
      case 'name':
        cmp = a.name.localeCompare(b.name, 'vi')
        break
      case 'points':
        cmp = (a.points || 0) - (b.points || 0) || a.name.localeCompare(b.name, 'vi')
        break
      case 'achievement':
        cmp =
          achievementRank(a, pointRankById, maxPoints, championsCount) -
          achievementRank(b, pointRankById, maxPoints, championsCount)
        break
      case 'activity':
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }
    return cmp * multiplier
  })
}

interface SortableHeaderProps {
  label: string
  column: MemberSortColumn
  activeColumn: MemberSortColumn | null
  direction: SortDirection
  onSort: (column: MemberSortColumn) => void
  className?: string
}

function SortableHeader({ label, column, activeColumn, direction, onSort, className }: SortableHeaderProps) {
  const isActive = activeColumn === column
  const SortIcon = isActive ? (direction === 'asc' ? ChevronUp : ChevronDown) : ArrowUpDown

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 rounded-lg px-1 py-0.5 transition hover:bg-white/60 hover:text-slate-700 ${
          isActive ? 'text-brand-dark' : ''
        }`}
      >
        {label}
        <SortIcon className={`size-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-slate-300'}`} />
      </button>
    </th>
  )
}

interface TeamRankingListProps {
  teams: Team[]
  allTeams: Team[]
  roster: Student[]
  getMembers: (teamId: string) => Student[]
}

export function TeamRankingList({ teams, allTeams, roster, getMembers }: TeamRankingListProps) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set([teams[0]?.id]))
  const [sortByTeam, setSortByTeam] = useState<Record<string, TeamSortState>>({})

  const handleSort = (teamId: string, column: MemberSortColumn) => {
    setSortByTeam((prev) => {
      const current = prev[teamId] ?? DEFAULT_TEAM_SORT
      if (current.column === column) {
        return {
          ...prev,
          [teamId]: { column, direction: current.direction === 'asc' ? 'desc' : 'asc' },
        }
      }
      return {
        ...prev,
        [teamId]: { column, direction: defaultSortDirection(column) },
      }
    })
  }

  const toggleTeam = (teamId: string) => {
    const next = new Set(expandedTeams)
    if (next.has(teamId)) next.delete(teamId)
    else next.add(teamId)
    setExpandedTeams(next)
  }

  return (
    <section className="flex flex-col gap-3">
      {teams.map((team, index) => {
        const members = getMembers(team.id)
        const teamSort = sortByTeam[team.id] ?? DEFAULT_TEAM_SORT
        const displayedMembers =
          teamSort.column === null
            ? members
            : sortTeamMembers(members, roster, teamSort.column, teamSort.direction)
        const isExpanded = expandedTeams.has(team.id)
        const colorIndex = Math.max(0, allTeams.findIndex((t) => t.id === team.id))
        const color = getTeamPastelStyle(colorIndex)

        const { maxPoints, championsCount, pointRankById } = buildPointRanking(members)

        return (
          <div key={team.id} className={`overflow-hidden rounded-2xl border border-sky-100 ${isExpanded ? 'bg-white shadow-sm' : color.bg}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/50"
              onClick={() => toggleTeam(team.id)}
              aria-expanded={isExpanded}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  {index === 0 ? <Trophy className="size-5 fill-amber-400 text-amber-500" /> :
                   index === 1 ? <Medal className="size-5 text-slate-400" /> :
                   index === 2 ? <Medal className="size-5 text-orange-400" /> :
                   <span className="text-sm font-extrabold text-slate-500">{index + 1}</span>}
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  {team.avatar || '🏆'}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-extrabold text-slate-800">{team.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {championsCount > 0 ? `${championsCount} quán quân · ` : ''}{members.length} thành viên
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className={`rounded-full bg-white/80 px-2.5 py-1 text-sm font-extrabold ${color.text}`}>
                  {team.score.toLocaleString()} điểm
                </span>
                <ChevronDown className={`size-5 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isExpanded && members.length > 0 && (
              <div className="border-t border-sky-100 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-brand-soft/60 text-xs font-bold text-slate-500">
                      <tr>
                        <SortableHeader
                          label="STT"
                          column="stt"
                          activeColumn={teamSort.column}
                          direction={teamSort.direction}
                          onSort={(column) => handleSort(team.id, column)}
                          className="px-4 py-2.5 font-semibold"
                        />
                        <SortableHeader
                          label="Học sinh"
                          column="name"
                          activeColumn={teamSort.column}
                          direction={teamSort.direction}
                          onSort={(column) => handleSort(team.id, column)}
                          className="px-4 py-2.5 font-semibold"
                        />
                        <SortableHeader
                          label="Điểm"
                          column="points"
                          activeColumn={teamSort.column}
                          direction={teamSort.direction}
                          onSort={(column) => handleSort(team.id, column)}
                          className="px-4 py-2.5 font-semibold"
                        />
                        <SortableHeader
                          label="Thành tích"
                          column="achievement"
                          activeColumn={teamSort.column}
                          direction={teamSort.direction}
                          onSort={(column) => handleSort(team.id, column)}
                          className="px-4 py-2.5 font-semibold"
                        />
                        <SortableHeader
                          label="Hoạt động"
                          column="activity"
                          activeColumn={teamSort.column}
                          direction={teamSort.direction}
                          onSort={(column) => handleSort(team.id, column)}
                          className="px-4 py-2.5 font-semibold"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-50">
                      {displayedMembers.map((student) => {
                        const pts = student.points || 0
                        const sIdx = pointRankById.get(student.id) ?? 0
                        const leadershipRole = getTeamLeadershipRole(team, student.id)

                        let rankLabel = '—'
                        let rankClass = 'bg-slate-100 text-slate-500'

                        if (pts > 0) {
                          if (pts === maxPoints) {
                            rankLabel = '🏆 Quán quân'
                            rankClass = 'bg-pastel-yellow text-amber-800'
                          } else if (sIdx === championsCount) {
                            rankLabel = '🥈 Á quân'
                            rankClass = 'bg-slate-100 text-slate-600'
                          } else if (sIdx === championsCount + 1) {
                            rankLabel = '🥉 Hạng 3'
                            rankClass = 'bg-pastel-peach text-orange-800'
                          }
                        }

                        return (
                          <tr
                            key={student.id}
                            className={
                              leadershipRole === 'leader'
                                ? 'bg-amber-50/50'
                                : leadershipRole === 'vice'
                                  ? 'bg-sky-50/50'
                                  : 'hover:bg-slate-50/70'
                            }
                          >
                            <td className="px-4 py-3 font-semibold text-slate-400">
                              {getStudentRosterOrder(student, roster) + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <StudentAvatar
                                    student={student}
                                    classroomId={classroomId}
                                    alt={student.name}
                                    className={`size-9 rounded-full border-2 ${
                                      leadershipRole === 'leader'
                                        ? 'border-amber-300'
                                        : leadershipRole === 'vice'
                                          ? 'border-sky-300'
                                          : 'border-white'
                                    }`}
                                  />
                                  {leadershipRole ? <TeamLeadershipAvatarOverlay role={leadershipRole} /> : null}
                                </div>
                                <div className="flex min-w-0 flex-col gap-1">
                                  <span className="font-bold text-slate-800">{student.name}</span>
                                  {leadershipRole ? <TeamLeadershipBadge role={leadershipRole} /> : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-extrabold text-brand-dark">{pts}</span>
                              <span className="ml-1 text-xs font-semibold text-slate-400">điểm</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${rankClass}`}>
                                {rankLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-400">
                              {timeAgo(student.updatedAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isExpanded && members.length === 0 && (
              <div className="border-t border-sky-100 bg-white p-8 text-center text-sm font-semibold text-slate-400">
                Chưa có học sinh nào trong tổ này
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
