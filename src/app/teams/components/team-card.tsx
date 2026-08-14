import { Users, Edit2, Trash2 } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'
import { getTeamMotivationMessage } from '@/src/utils/teams'

interface TeamCardProps {
  team: Team
  members: Student[]
  rank: number
  totalTeams: number
  highestScore: number
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
  onViewMembers: () => void
}

export function TeamCard({
  team,
  members,
  rank,
  totalTeams,
  highestScore,
  onEdit,
  onDelete,
  onViewDetails,
  onViewMembers,
}: TeamCardProps) {
  const previewAvatars = members.slice(0, 4)
  const extra = members.length - previewAvatars.length

  // Calculate champions (students with highest points in the team, or just arbitrary top scorers)
  const maxPointsInTeam = members.length > 0 ? Math.max(...members.map(m => m.points || 0)) : 0
  const championsCount = members.filter(m => m.points === maxPointsInTeam && maxPointsInTeam > 0).length
  
  const message = getTeamMotivationMessage(rank, totalTeams, championsCount)
  const progressPercent = highestScore > 0 ? Math.min(100, Math.max(10, (team.score / highestScore) * 100)) : 0

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]">
      
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {team.avatar ? (
            <span className="flex size-7 items-center justify-center rounded-xl bg-slate-100 text-lg">
              {team.avatar}
            </span>
          ) : (
            <div className="flex size-7 items-center justify-center rounded-xl bg-slate-100">
              <Users className="size-4 text-slate-500" />
            </div>
          )}
          <h3 className="font-display text-lg font-extrabold text-slate-800">{team.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/10"
            title="Sửa nhóm"
          >
            <Edit2 className="size-3.5" />
            Sửa
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            title="Xóa nhóm"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 divide-x divide-slate-100">
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-brand-purple">{team.score.toLocaleString()}</span>
          <span className="mt-0.5 text-xs font-semibold text-slate-500">Tổng điểm</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-brand-purple">{members.length}</span>
          <span className="mt-0.5 text-xs font-semibold text-slate-500">Thành viên</span>
        </div>
      </div>

      {/* Progress & Message */}
      <div className="mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-purple/10">
          <div 
            className="h-full rounded-full bg-brand-purple transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-bold text-brand-purple/70">
          {message}
        </p>
      </div>

      {/* Avatars */}
      <div className="mb-5 flex h-8 items-center">
        {members.length === 0 ? (
          <span className="text-xs font-semibold text-slate-400">Chưa có thành viên</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {previewAvatars.map((s, i) => (
                <img 
                  key={s.id} 
                  src={getStudentAvatar(s)} 
                  alt={s.name}
                  className="size-8 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-black/5" 
                  style={{ zIndex: 10 - i }}
                />
              ))}
            </div>
            {extra > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-bold text-slate-500">
                +{extra}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          onClick={onViewDetails}
          className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-brand-purple"
        >
          Chi tiết
        </button>
        <button
          onClick={onViewMembers}
          className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-brand-purple"
        >
          Thành viên
        </button>
      </div>

    </div>
  )
}
