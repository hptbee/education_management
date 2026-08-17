'use client'

import { useCallback, useEffect, useState } from 'react'
import { Disc3, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { LuckyWheelDialog } from './lucky-wheel-dialog'
import { WheelPreview } from './named-wheel'
import { ClassroomCard, ClassroomButton, EmptyState } from '@/src/components/classroom'

export function LuckyWheelTool() {
  const { data } = useAppData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (searchParams?.get('tool') === 'wheel') {
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)

    if (searchParams?.get('tool') !== 'wheel') return

    const params = new URLSearchParams(searchParams.toString())
    params.delete('tool')
    const query = params.toString()
    router.replace(query ? `/tools?${query}` : '/tools')
  }, [router, searchParams])

  return (
    <>
      <ClassroomCard className="flex h-full flex-col">
        <header className="mb-4 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-sky">
            <Disc3 className="size-5 text-brand-dark" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Vòng quay may mắn</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Quay vòng lớn để cả lớp cùng xem.
            </p>
          </div>
        </header>

        {students.length === 0 ? (
          <EmptyState
            compact
            icon={Sparkles}
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu quay vòng may mắn."
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center rounded-2xl bg-gradient-to-b from-pastel-sky/50 via-white to-pastel-pink/40 px-4 py-5">
            <div className="flex flex-1 items-center justify-center">
              <WheelPreview size={180} />
            </div>
            <p className="mt-4 text-sm font-bold text-brand-purple/70">Mở vòng quay để chọn học sinh</p>
            <ClassroomButton
              size="lg"
              className="mt-4 min-h-11 w-full shadow-md shadow-brand-purple/25"
              onClick={() => setDialogOpen(true)}
            >
              QUAY NGAY
            </ClassroomButton>
          </div>
        )}
      </ClassroomCard>

      <LuckyWheelDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        students={students}
        teams={teams}
      />
    </>
  )
}
