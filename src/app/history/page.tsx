'use client'

import { useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import {
  ACTIVITY_KIND_EMOJI,
  ACTIVITY_KIND_LABELS,
  buildClassroomActivity,
  filterActivityEntries,
  formatActivityDate,
  type ActivityFilter,
} from '@/src/utils/activityHistory'
import { PageHeader, ClassroomCard, EmptyState } from '@/src/components/classroom'

const FILTER_OPTIONS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'points', label: 'Tích điểm' },
  { id: 'reward', label: 'Đổi quà' },
  { id: 'recognition', label: 'Tuyên dương' },
  { id: 'team-score', label: 'Điểm tổ' },
  { id: 'lucky-wheel', label: 'Vòng quay' },
  { id: 'badge', label: 'Huy hiệu' },
]

export default function HistoryPage() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const [kindFilter, setKindFilter] = useState<ActivityFilter>('all')
  const [studentFilter, setStudentFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const students = data?.students ?? []
  const teams = data?.teams ?? []

  const allActivity = useMemo(
    () => (data ? buildClassroomActivity(data) : []),
    [data],
  )

  const filteredActivity = useMemo(
    () =>
      filterActivityEntries(allActivity, {
        kind: kindFilter,
        studentId: studentFilter,
        teamId: teamFilter,
        searchQuery,
      }),
    [allActivity, kindFilter, studentFilter, teamFilter, searchQuery],
  )

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <PageHeader
          icon={History}
          title="Lịch sử hoạt động"
          subtitle="Nhật ký tích điểm, đổi quà, tuyên dương, điểm tổ, vòng quay và huy hiệu"
        />

        <ClassroomCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setKindFilter(option.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  kindFilter === option.id
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, hành động..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Tất cả học sinh</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Tất cả tổ</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </ClassroomCard>

        {filteredActivity.length === 0 ? (
          <EmptyState
            emoji="📋"
            title={allActivity.length === 0 ? 'Chưa có hoạt động nào' : 'Không tìm thấy hoạt động'}
            description={
              allActivity.length === 0
                ? 'Các lần tích điểm, đổi quà, tuyên dương, vòng quay và huy hiệu sẽ hiển thị tại đây.'
                : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
            }
          />
        ) : (
          <ClassroomCard>
            <ul className="divide-y divide-sky-50">
              {filteredActivity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <span aria-hidden>{ACTIVITY_KIND_EMOJI[entry.kind]}</span>
                      {entry.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {ACTIVITY_KIND_LABELS[entry.kind]}
                      {entry.studentName ? ` · ${entry.studentName}` : ''}
                      {entry.teamName ? ` · ${entry.teamName}` : ''}
                    </p>
                    {entry.subtitle ? (
                      <p className="mt-1 text-xs font-medium text-slate-400">{entry.subtitle}</p>
                    ) : null}
                    {entry.detail ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{entry.detail}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {formatActivityDate(entry.createdAt)}
                    </p>
                  </div>
                  {entry.points !== undefined ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                        entry.points > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.points < 0
                            ? 'bg-pastel-pink text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.points > 0 ? '+' : ''}
                      {entry.points}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </ClassroomCard>
        )}
      </div>
    </div>
  )
}
