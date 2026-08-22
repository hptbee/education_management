'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Disc3, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { LuckyWheelDialog } from './lucky-wheel-dialog'
import { useGameDialogForceClose } from './game-dialog-portal'
import { WheelPreview } from './named-wheel'
import { ToolCardShell } from './tool-card-shell'
import { ClassroomButton, EmptyState } from '@/src/components/classroom'

export function LuckyWheelTool() {
  const { data } = useAppData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const tool = searchParams?.get('tool')
    if (tool === 'wheel' || tool === 'lucky-wheel') {
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)

    const tool = searchParams?.get('tool')
    if (tool !== 'wheel' && tool !== 'lucky-wheel') return

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
        icon={Disc3}
        iconBg="bg-pastel-sky"
        title="Vòng quay may mắn"
        description="Quay vòng lớn để cả lớp cùng xem."
      >
        {students.length === 0 ? (
          <EmptyState
            compact
            icon={Sparkles}
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu quay vòng may mắn."
            action={
              <Link
                href="/students"
                className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                Thêm học sinh
              </Link>
            }
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
              Quay ngay
            </ClassroomButton>
          </div>
        )}
      </ToolCardShell>

      <LuckyWheelDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        students={students}
        teams={teams}
      />
    </>
  )
}
