'use client'

import Link from 'next/link'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { ToolCardShell } from './tool-card-shell'
import { classroomButtonVariants } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

export function SeatingChartTool() {
  return (
    <ToolCardShell
      icon={LayoutGrid}
      iconBg="bg-pastel-mint"
      title="Sơ đồ lớp"
      description="Sắp xếp chỗ ngồi trực quan, kéo thả học sinh và trình chiếu lên màn hình lớn."
    >
      <div className="mt-auto flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Mỗi lớp có sơ đồ riêng — đổi lớp sẽ tải bố cục tương ứng.
        </p>
        <Link href="/seating-chart" className={cn(classroomButtonVariants({ variant: 'primary', size: 'md' }), 'w-full')}>
          Mở sơ đồ lớp
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </ToolCardShell>
  )
}
