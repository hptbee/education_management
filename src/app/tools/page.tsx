'use client'

import { Suspense } from 'react'
import { MonitorPlay, Sparkles } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { PresentationChrome } from '@/src/components/PresentationChrome'
import { LuckyWheelTool } from './components/lucky-wheel-tool'
import { StudyTimerTool } from './components/study-timer-tool'
import { RandomStudentTool } from './components/random-student-tool'
import { PointsChallengeStrip } from './components/points-challenge-strip'
import { ClassroomButton, PageHeader } from '@/src/components/classroom'

export default function ToolsPage() {
  const { isLoaded } = useActiveClassroom()
  const { isPresentationMode, enterPresentationMode } = usePresentationMode()

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (isPresentationMode) {
    return (
      <PresentationChrome title="Thử thách & Công cụ" subtitle="Hoạt động vui nhộn cho cả lớp">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-3">
          <Suspense fallback={null}>
            <LuckyWheelTool />
          </Suspense>
          <StudyTimerTool />
          <RandomStudentTool />
        </div>
      </PresentationChrome>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-5">
        <div className="flex items-start gap-6">
          <PageHeader
            icon={Sparkles}
            title="Thử thách & Công cụ"
            subtitle="Vòng quay, đồng hồ học tập và chọn học sinh ngẫu nhiên cho lớp học"
            className="flex-1"
            actions={
              <ClassroomButton variant="secondary" onClick={enterPresentationMode}>
                <MonitorPlay className="size-4" aria-hidden /> Trình chiếu
              </ClassroomButton>
            }
          />
          <img
            src="/banner-girl.png"
            alt=""
            className="hidden h-24 w-auto shrink-0 object-contain mix-blend-multiply lg:block"
          />
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={null}>
            <LuckyWheelTool />
          </Suspense>
          <StudyTimerTool />
          <RandomStudentTool />
        </div>

        <PointsChallengeStrip />
      </div>
    </div>
  )
}
