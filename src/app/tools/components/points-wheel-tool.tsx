'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleDollarSign, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { PointsWheelDialog } from './points-wheel-dialog'
import { useGameDialogForceClose } from './game-dialog-portal'
import { ValueWheelPreview } from './value-wheel'
import { ToolCardShell } from './tool-card-shell'
import { ClassroomButton, EmptyState } from '@/src/components/classroom'

export function PointsWheelTool() {
  const { data } = useAppData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const students = data?.students ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (searchParams?.get('tool') === 'points-wheel') {
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)

    if (searchParams?.get('tool') !== 'points-wheel') return

    const params = new URLSearchParams(searchParams.toString())
    params.delete('tool')
    const query = params.toString()
    router.replace(query ? `/tools?${query}` : '/tools')
  }, [router, searchParams])

  useGameDialogForceClose(() => {
    if (dialogOpen) handleDialogClose()
  })

  return (
    <>
      <ToolCardShell
        icon={CircleDollarSign}
        iconBg="bg-pastel-peach"
        title="Vòng quay điểm"
        description="Quay ngẫu nhiên điểm thưởng cho học sinh."
      >
        {students.length === 0 ? (
          <EmptyState
            compact
            icon={Sparkles}
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu vòng quay điểm."
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center rounded-2xl bg-gradient-to-b from-pastel-peach/60 via-white to-pastel-sky/40 px-4 py-5">
            <div className="flex flex-1 items-center justify-center">
              <ValueWheelPreview size={180} />
            </div>
            <p className="mt-4 text-sm font-bold text-brand-purple/70">Mở vòng quay để quay điểm</p>
            <ClassroomButton
              size="lg"
              className="mt-4 min-h-11 w-full shadow-md shadow-brand-purple/25"
              onClick={() => setDialogOpen(true)}
            >
              Quay điểm
            </ClassroomButton>
          </div>
        )}
      </ToolCardShell>

      <PointsWheelDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        students={students}
      />
    </>
  )
}
