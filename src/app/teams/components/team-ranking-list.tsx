import { useState } from 'react'
import { Trophy, Medal, ChevronDown } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { getStudentAvatar, getStudentRosterOrder } from '@/src/utils/student'
import { timeAgo } from '@/src/utils/teams'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import {
  getTeamLeadershipRole,
  TeamLeadershipAvatarOverlay,
  TeamLeadershipBadge,
} from './team-leadership-badge'

interface TeamRankingListProps {
  teams: Team[]
  allTeams: Team[]
  roster: Student[]
  getMembers: (teamId: string) => Student[]
}

export function TeamRankingList({ teams, allTeams, roster, getMembers }: TeamRankingListProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set([teams[0]?.id]))

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
        const isExpanded = expandedTeams.has(team.id)
        const colorIndex = Math.max(0, allTeams.findIndex((t) => t.id === team.id))
        const color = getTeamPastelStyle(colorIndex)

        const byPoints = [...members].sort((a, b) => (b.points || 0) - (a.points || 0))
        const maxPoints = byPoints.length > 0 ? byPoints[0].points || 0 : 0
        const championsCount = byPoints.filter(m => (m.points || 0) === maxPoints && maxPoints > 0).length
        const pointRankById = new Map(byPoints.map((student, i) => [student.id, i]))

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
                        <th className="px-4 py-2.5 font-semibold">STT</th>
                        <th className="px-4 py-2.5 font-semibold">Học sinh</th>
                        <th className="px-4 py-2.5 font-semibold">Điểm</th>
                        <th className="px-4 py-2.5 font-semibold">Thành tích</th>
                        <th className="px-4 py-2.5 font-semibold">Hoạt động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-50">
                      {members.map((student) => {
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
                                  <img
                                    src={getStudentAvatar(student)}
                                    alt={student.name}
                                    className={`size-9 rounded-full border-2 object-cover ${
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
