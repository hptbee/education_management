'use client'

import { Search } from 'lucide-react'
import type { ClassroomRole, Team } from '@/src/types/models'
import type { RankedStudent } from '@/src/utils/ranking'
import { EmptyState } from '@/src/components/classroom'
import { RankingRow } from './ranking-row'

export function RankingList({
  entries,
  teams,
  classroomRoles,
  onStudentClick,
  presentation = false,
  emptyTitle = 'Không tìm thấy học sinh phù hợp',
  emptyDescription = 'Thử thay đổi từ khóa hoặc bỏ bộ lọc.',
}: {
  entries: RankedStudent[]
  teams: Team[]
  classroomRoles: ClassroomRole[]
  onStudentClick?: (entry: RankedStudent) => void
  presentation?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (entries.length === 0) {
    return (
      <EmptyState compact icon={Search} title={emptyTitle} description={emptyDescription} />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.student.id}>
          <RankingRow
            entry={entry}
            teams={teams}
            classroomRoles={classroomRoles}
            onClick={onStudentClick ? () => onStudentClick(entry) : undefined}
            presentation={presentation}
          />
        </li>
      ))}
    </ul>
  )
}
