'use client'

import { Sparkles } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { LuckyWheelTool } from './components/lucky-wheel-tool'
import { StudyTimerTool } from './components/study-timer-tool'
import { LuckyStarTool } from './components/lucky-star-tool'
import { PointsChallengeStrip } from './components/points-challenge-strip'

export default function ToolsPage() {
  const { isLoaded } = useActiveClassroom()

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-gray-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-5">
        <header className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-lg">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black text-slate-800">Thử thách & Công cụ</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Các công cụ vui nhộn để tổ chức hoạt động học tập trong lớp
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <LuckyWheelTool />
          <StudyTimerTool />
          <LuckyStarTool />
        </div>

        <PointsChallengeStrip />
      </div>
    </div>
  )
}
