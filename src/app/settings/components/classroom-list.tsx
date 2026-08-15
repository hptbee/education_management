'use client'

import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/src/components/Avatar'
import { Badge } from '@/src/components/ui'
import { ClassroomCard } from '@/src/components/classroom'
import type { DatabaseSummary } from '@/src/database/types'
import { cn } from '@/lib/utils'

interface ClassroomListProps {
  databases: DatabaseSummary[]
  currentId?: string
  onSelect: (id: string) => void
  className?: string
}

export function ClassroomList({ databases, currentId, onSelect, className }: ClassroomListProps) {
  return (
    <div className={cn('grid gap-3', className)}>
      {databases.map((db) => {
        const isCurrent = currentId === db.id
        return (
          <button
            key={db.id}
            type="button"
            onClick={() => onSelect(db.id)}
            className="w-full text-left"
          >
            <ClassroomCard
              className={cn(
                'flex items-center justify-between gap-3 transition hover:border-brand/30 hover:shadow-md',
                isCurrent && 'border-brand/40 bg-brand-soft/30 ring-2 ring-brand/20',
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={db.className} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-800">{db.className}</p>
                  <p className="truncate text-sm font-semibold text-slate-500">
                    {db.schoolYear} · {db.teacherName}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>{db.studentCount} HS</Badge>
                {isCurrent ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                    Đang mở
                  </span>
                ) : (
                  <ChevronRight className="size-4 text-slate-300" aria-hidden />
                )}
              </div>
            </ClassroomCard>
          </button>
        )
      })}
    </div>
  )
}
