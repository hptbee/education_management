'use client'

import { Suspense } from 'react'
import { MonitorPlay, Sparkles } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { PresentationChrome } from '@/src/components/PresentationChrome'
import { LuckyWheelTool } from './components/lucky-wheel-tool'
import { DuckRaceTool } from './components/duck-race-tool'
import { PointsWheelTool } from './components/points-wheel-tool'
import { StudyTimerTool } from './components/study-timer-tool'
import { RandomStudentTool } from './components/random-student-tool'
import { PointsChallengeStrip } from './components/points-challenge-strip'
import { ToolsSection } from './components/tool-card-shell'
import { ClassroomButton, PageHeader } from '@/src/components/classroom'

function ToolsContent() {
  return (
    <>
      <ToolsSection title="Trò chơi" description="Mở hoạt động toàn lớp trên màn hình lớn">
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          <Suspense fallback={null}>
            <LuckyWheelTool />
          </Suspense>
          <Suspense fallback={null}>
            <DuckRaceTool />
          </Suspense>
          <Suspense fallback={null}>
            <PointsWheelTool />
          </Suspense>
        </div>
      </ToolsSection>

      <ToolsSection title="Công cụ nhanh" description="Dùng ngay trong lớp, không cần mở cửa sổ riêng">
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
          <StudyTimerTool />
          <RandomStudentTool />
        </div>
      </ToolsSection>

      <PointsChallengeStrip />
    </>
  )
}

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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {isPresentationMode ? (
        <PresentationChrome
          variant="overlay"
          title="Thử thách & Công cụ"
          subtitle="Hoạt động vui nhộn cho cả lớp"
        />
      ) : null}

      <div
        className={`flex-1 overflow-y-auto scrollbar-thin ${
          isPresentationMode ? 'pt-[5.5rem]' : ''
        }`}
      >
        <div
          className={
            isPresentationMode
              ? 'mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-10'
              : 'classroom-page--workspace-loose'
          }
        >
          {!isPresentationMode ? (
            <div className="flex items-start gap-6">
              <PageHeader
                icon={Sparkles}
                title="Thử thách & Công cụ"
                subtitle="Hoạt động vui và công cụ nhanh cho giờ học"
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
          ) : null}

          <ToolsContent />
        </div>
      </div>
    </div>
  )
}
