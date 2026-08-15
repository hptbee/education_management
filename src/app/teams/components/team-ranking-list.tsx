import { useState } from 'react'
import { Trophy, MoreVertical, Medal } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { getStudentAvatar, getStudentRosterOrder } from '@/src/utils/student'
import { timeAgo } from '@/src/utils/teams'
import {
  getTeamLeadershipRole,
  TeamLeadershipAvatarOverlay,
  TeamLeadershipBadge,
} from './team-leadership-badge'

interface TeamRankingListProps {
  teams: Team[]
  roster: Student[]
  getMembers: (teamId: string) => Student[]
}

export function TeamRankingList({ teams, roster, getMembers }: TeamRankingListProps) {
  // Store expanded team IDs
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set([teams[0]?.id]))

  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeams(newExpanded)
  }

  return (
    <section className="flex flex-col gap-4">
      {teams.map((team, index) => {
        const members = getMembers(team.id)
        const isExpanded = expandedTeams.has(team.id)

        const sortedMembers = members

        // Point-based achievement labels (independent of display order)
        const byPoints = [...members].sort((a, b) => (b.points || 0) - (a.points || 0))
        const maxPoints = byPoints.length > 0 ? byPoints[0].points || 0 : 0
        const championsCount = byPoints.filter(m => (m.points || 0) === maxPoints && maxPoints > 0).length
        const pointRankById = new Map(byPoints.map((student, index) => [student.id, index]))

        return (
          <div key={team.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all">
            
            {/* Header / Accordion Trigger */}
            <div 
              className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-50"
              onClick={() => toggleTeam(team.id)}
            >
              <div className="flex items-center gap-4">
                {/* Trophy or STT */}
                <div className="flex size-8 items-center justify-center text-xl">
                  {index === 0 ? <Trophy className="size-6 text-amber-500 fill-amber-500" /> : 
                   index === 1 ? <Medal className="size-6 text-slate-400" /> :
                   index === 2 ? <Medal className="size-6 text-amber-700" /> : 
                   <Trophy className="size-6 text-amber-500" />}
                </div>
                
                {/* Team Info */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {team.avatar && <span className="text-xl">{team.avatar}</span>}
                    <h3 className="font-display text-lg font-black text-slate-800">{team.name}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {championsCount > 0 ? `${championsCount} quán quân • ` : ''}{members.length} thành viên
                  </span>
                </div>
              </div>

              {/* Right Side Stats */}
              <div className="flex items-center gap-6">
                <span className="text-sm font-black text-brand-purple">{team.score.toLocaleString()} điểm</span>
                <span className="text-sm font-semibold text-slate-500">{members.length} thành viên</span>
                <button 
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  onClick={(e) => { e.stopPropagation(); /* TODO: Open context menu if needed */ }}
                >
                  <MoreVertical className="size-5" />
                </button>
              </div>
            </div>

            {/* Expanded Body */}
            {isExpanded && members.length > 0 && (
              <div className="border-t border-slate-100 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">STT</th>
                      <th className="px-6 py-3 font-semibold">HỌC SINH</th>
                      <th className="px-6 py-3 font-semibold">ĐIỂM</th>
                      <th className="px-6 py-3 font-semibold">THÀNH TÍCH</th>
                      <th className="px-6 py-3 font-semibold">HOẠT ĐỘNG GẦN NHẤT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedMembers.map((student) => {
                      const pts = student.points || 0
                      const sIdx = pointRankById.get(student.id) ?? 0
                      const leadershipRole = getTeamLeadershipRole(team, student.id)
                      
                      let rankLabel = '—'
                      let rankIcon = ''
                      let rankColor = 'text-slate-400'

                      if (pts > 0) {
                        if (pts === maxPoints) {
                          rankLabel = 'Quán quân'
                          rankIcon = '🏆'
                          rankColor = 'text-amber-500'
                        } else if (sIdx === championsCount) {
                          rankLabel = 'Á quân'
                          rankIcon = '🥈'
                          rankColor = 'text-slate-400'
                        } else if (sIdx === championsCount + 1) {
                          rankLabel = 'Hạng 3'
                          rankIcon = '🥉'
                          rankColor = 'text-amber-700'
                        }
                      }

                      return (
                        <tr key={student.id} className={`transition-colors hover:bg-slate-50/50 ${leadershipRole === 'leader' ? 'bg-amber-50/40' : leadershipRole === 'vice' ? 'bg-sky-50/40' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-slate-500">{getStudentRosterOrder(student, roster) + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img 
                                  src={getStudentAvatar(student)} 
                                  alt={student.name}
                                  className={`size-8 rounded-full border-2 object-cover ${
                                    leadershipRole === 'leader'
                                      ? 'border-amber-300 ring-2 ring-amber-100'
                                      : leadershipRole === 'vice'
                                        ? 'border-sky-300 ring-2 ring-sky-100'
                                        : 'border-slate-200'
                                  }`}
                                />
                                {leadershipRole ? <TeamLeadershipAvatarOverlay role={leadershipRole} /> : null}
                              </div>
                              <div className="flex min-w-0 flex-col gap-1">
                                <span className="font-bold text-slate-700">{student.name}</span>
                                {leadershipRole ? <TeamLeadershipBadge role={leadershipRole} /> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-brand-purple">
                            {pts} điểm
                          </td>
                          <td className={`px-6 py-4 font-bold flex items-center gap-1.5 ${rankColor}`}>
                            {rankIcon && <span>{rankIcon}</span>}
                            <span>{rankLabel}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                            {timeAgo(student.updatedAt)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {isExpanded && members.length === 0 && (
              <div className="border-t border-slate-100 p-8 text-center text-sm font-semibold text-slate-400">
                Chưa có học sinh nào trong tổ này
              </div>
            )}
            
          </div>
        )
      })}
    </section>
  )
}
