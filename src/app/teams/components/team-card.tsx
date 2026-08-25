'use client'

import { Users } from 'lucide-react'
import type { Team, Student } from '@/src/types/models'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { getTeamMotivationMessage } from '@/src/utils/teams'
import { getTeamPastelStyle } from '@/src/utils/pastelPalette'
import { getTeamLeadershipRole, TeamLeadershipAvatarOverlay } from './team-leadership-badge'
import { ClassroomButton } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

interface TeamCardProps {
  team: Team
  members: Student[]
  rank: number
  totalTeams: number
  highestScore: number
  colorIndex: number
  onViewDetails: () => void
  onViewMembers: () => void
}

const RANK_PILL: Record<number, string> = {
  0: 'bg-pastel-yellow text-amber-800',
  1: 'bg-slate-100 text-slate-600',
  2: 'bg-pastel-peach text-orange-800',
}

function uniqueById(students: Student[]): Student[] {
  const seen = new Set<string>()
  return students.filter((student) => {
    if (seen.has(student.id)) return false
    seen.add(student.id)
    return true
  })
}

export function TeamCard({
  team,
  members,
  rank,
  totalTeams,
  highestScore,
  colorIndex,
  onViewDetails,
  onViewMembers,
}: TeamCardProps) {
  const { data } = useAppData()
  const classroomId = data?.metadata.id
  const color = getTeamPastelStyle(colorIndex)
  const uniqueMembers = uniqueById(members)
  const previewAvatars = uniqueMembers.slice(0, 5)
  const extra = uniqueMembers.length - previewAvatars.length

  const maxPointsInTeam = members.length > 0 ? Math.max(...members.map(m => m.points || 0)) : 0
  const championsCount = members.filter(m => m.points === maxPointsInTeam && maxPointsInTeam > 0).length

  const message = getTeamMotivationMessage(rank, totalTeams, championsCount)
  const progressPercent = highestScore > 0 ? Math.min(100, (team.score / highestScore) * 100) : 0
  const displayProgress = Math.round(progressPercent)

  return (
    <article
      className={cn(
        'motion-safe-hover flex h-full flex-col rounded-3xl border border-white/80 p-4 shadow-sm',
        color.bg,
      )}
    >
      <div className="mb-3 flex min-w-0 items-start gap-2.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          {team.avatar || <Users className="size-5 text-slate-400" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            title={team.name}
            className="line-clamp-2 font-display text-lg font-extrabold leading-tight text-slate-800"
          >
            {team.name}
          </h3>
          <span
            className={cn(
              'mt-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
              RANK_PILL[rank] ?? 'bg-white/80 text-slate-500',
            )}
          >
            #{rank + 1}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl bg-white/80 px-3 py-2 text-center">
          <p className={cn('font-display text-2xl font-black tabular-nums', color.text)}>
            {team.score.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-slate-500">Tổng điểm</p>
        </div>
        <div className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl bg-white/80 px-3 py-2 text-center">
          <p className={cn('font-display text-2xl font-black tabular-nums', color.text)}>
            {members.length}
          </p>
          <p className="text-[11px] font-semibold text-slate-500">Thành viên</p>
        </div>
      </div>

      <div className="mb-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayProgress}
          aria-label={`Điểm tổ đạt ${displayProgress}% so với tổ dẫn đầu`}
          className="h-2 w-full overflow-hidden rounded-full bg-white/80"
        >
          <div
            className={cn('h-full rounded-full motion-safe:transition-all motion-safe:duration-500', color.bar)}
            style={{ width: progressPercent > 0 ? `${Math.max(progressPercent, 8)}%` : '0%' }}
          />
        </div>
        <p className={cn('mt-2 min-h-4 text-[11px] font-bold', color.text)}>{message}</p>
      </div>

      <div className="mb-4 flex min-h-9 items-center">
        {members.length === 0 ? (
          <span className="text-xs font-semibold text-slate-500">Chưa có thành viên</span>
        ) : (
          <button
            type="button"
            onClick={onViewMembers}
            aria-label={`Xem thành viên ${team.name}`}
            className="flex items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <div className="flex -space-x-1.5">
              {previewAvatars.map((s, i) => {
                const leadershipRole = getTeamLeadershipRole(team, s.id)
                const ringClass = leadershipRole === 'leader'
                  ? 'ring-amber-300'
                  : leadershipRole === 'vice'
                    ? 'ring-sky-300'
                    : 'ring-black/5'

                return (
                  <div key={s.id} className="relative" style={{ zIndex: 10 - i }} title={s.name}>
                    <StudentAvatar
                      student={s}
                      classroomId={classroomId}
                      alt={s.name}
                      className={cn(
                        'size-8 rounded-full border-2 border-white shadow-sm ring-1',
                        ringClass,
                      )}
                    />
                    {leadershipRole ? <TeamLeadershipAvatarOverlay role={leadershipRole} /> : null}
                  </div>
                )
              })}
            </div>
            {extra > 0 ? (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[10px] font-bold text-slate-500 shadow-sm">
                +{extra}
              </span>
            ) : null}
          </button>
        )}
      </div>

      <ClassroomButton className="mt-auto w-full" onClick={onViewDetails}>
        Xem tổ
      </ClassroomButton>
    </article>
  )
}
