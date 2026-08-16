import { cn } from '@/lib/utils'

interface ClassroomSkeletonProps {
  className?: string
  rows?: number
}

export function ClassroomSkeleton({ className, rows = 3 }: ClassroomSkeletonProps) {
  return (
    <div className={cn('mx-auto w-full max-w-md space-y-4 p-6', className)} aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-2/3 animate-pulse rounded-xl bg-slate-200/80" />
      <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
