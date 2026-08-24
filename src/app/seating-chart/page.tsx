'use client'

import { LayoutGrid, MonitorPlay } from 'lucide-react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { PresentationChrome } from '@/src/components/PresentationChrome'
import { ClassroomButton, PageHeader } from '@/src/components/classroom'
import { SeatingChartWorkspace } from './components/seating-chart-workspace'

export default function SeatingChartPage() {
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isPresentationMode ? (
        <PresentationChrome
          variant="overlay"
          title="Sơ đồ lớp"
          subtitle="Bố trí chỗ ngồi cho học sinh"
        />
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          isPresentationMode ? 'pt-[5.5rem]' : ''
        }`}
      >
        {!isPresentationMode ? (
          <div className="mx-auto w-full max-w-[1400px] shrink-0 px-5 pt-5">
            <PageHeader
              icon={LayoutGrid}
              title="Sơ đồ lớp"
              subtitle="Sắp xếp chỗ ngồi trực quan cho lớp học — phù hợp quản lý lớp và trình chiếu."
              iconClassName="from-pastel-mint to-brand"
              actions={
                <ClassroomButton type="button" onClick={enterPresentationMode}>
                  <MonitorPlay className="size-4" />
                  Trình chiếu
                </ClassroomButton>
              }
            />
          </div>
        ) : null}

        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-5 pb-4 pt-4">
          <SeatingChartWorkspace presentation={isPresentationMode} />
        </div>
      </div>
    </div>
  )
}
