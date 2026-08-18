'use client'

import { Users, Edit2, Trash2, UserMinus } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { getTeamMotivationMessage } from '@/src/utils/teams'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import { getTeamLeadershipRole, TeamLeadershipAvatarOverlay } from './team-leadership-badge'
import { ClassroomButton } from '@/src/components/classroom'

interface TeamCardProps {
  team: Team
  members: Student[]
  rank: number
  totalTeams: number
  highestScore: number
  colorIndex: number
  onEdit: () => void
  onDelete: () => void
  onClearAllMembers: () => void
  onViewDetails: () => void
  onViewMembers: () => void
}

const RANK_PILL: Record<number, string> = {
  0: 'bg-pastel-yellow text-amber-800',
  1: 'bg-slate-100 text-slate-600',
  2: 'bg-pastel-peach text-orange-800',
}

export function TeamCard({
  team,
  members,
  rank,
  totalTeams,
  highestScore,
  colorIndex,
  onEdit,
  onDelete,
  onClearAllMembers,
  onViewDetails,
}: TeamCardProps) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const color = getTeamPastelStyle(colorIndex)
  const previewAvatars = members.slice(0, 5)
  const extra = members.length - previewAvatars.length

  const maxPointsInTeam = members.length > 0 ? Math.max(...members.map(m => m.points || 0)) : 0
  const championsCount = members.filter(m => m.points === maxPointsInTeam && maxPointsInTeam > 0).length

  const message = getTeamMotivationMessage(rank, totalTeams, championsCount)
  const progressPercent = highestScore > 0 ? Math.min(100, (team.score / highestScore) * 100) : 0

  return (
    <article className={`flex flex-col rounded-3xl border border-white/80 p-4 shadow-sm transition hover:shadow-md ${color.bg}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {team.avatar || <Users className="size-5 text-slate-400" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-lg font-extrabold text-slate-800">{team.name}</h3>
              {rank < 3 ? (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${RANK_PILL[rank]}`}>
                  #{rank + 1}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">{members.length} thành viên</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          {members.length > 0 ? (
            <button
              type="button"
              onClick={onClearAllMembers}
              className="flex size-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-amber-600"
              title="Bỏ hết thành viên"
            >
              <UserMinus className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="flex size-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-brand-dark"
            title="Sửa nhóm"
          >
            <Edit2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex size-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-rose-500"
            title="Xóa nhóm"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/80 px-3 py-2 text-center">
          <p className={`font-display text-2xl font-black ${color.text}`}>{team.score.toLocaleString()}</p>
          <p className="text-[11px] font-semibold text-slate-500">Tổng điểm</p>
        </div>
        <div className="rounded-2xl bg-white/80 px-3 py-2 text-center">
          <p className={`font-display text-2xl font-black ${color.text}`}>{members.length}</p>
          <p className="text-[11px] font-semibold text-slate-500">Thành viên</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full ${color.bar} transition-all duration-500`}
            style={{ width: progressPercent > 0 ? `${Math.max(progressPercent, 8)}%` : '0%' }}
          />
        </div>
        <p className={`mt-2 text-[11px] font-bold ${color.text}`}>{message}</p>
      </div>

      <div className="mb-4 flex min-h-8 items-center">
        {members.length === 0 ? (
          <span className="text-xs font-semibold text-slate-500">Chưa có thành viên</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {previewAvatars.map((s, i) => {
                const leadershipRole = getTeamLeadershipRole(team, s.id)
                return (
                  <div key={s.id} className="relative" style={{ zIndex: 10 - i }}>
                    <StudentAvatar
                      student={s}
                      classroomId={classroomId}
                      alt={s.name}
                      className={`size-8 rounded-full border-2 border-white shadow-sm ring-1 ${
                        leadershipRole === 'leader'
                          ? 'ring-amber-300'
                          : leadershipRole === 'vice'
                            ? 'ring-sky-300'
                            : 'ring-black/5'
                      }`}
                    />
                    {leadershipRole ? <TeamLeadershipAvatarOverlay role={leadershipRole} /> : null}
                  </div>
                )
              })}
            </div>
            {extra > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-white px-2 text-[10px] font-bold text-slate-500">
                +{extra}
              </span>
            )}
          </div>
        )}
      </div>

      <ClassroomButton className="mt-auto w-full" onClick={onViewDetails}>
        Xem tổ
      </ClassroomButton>
    </article>
  )
}
