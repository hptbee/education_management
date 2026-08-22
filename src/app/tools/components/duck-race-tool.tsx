'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bird, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { DuckRaceDialog } from './duck-race-dialog'
import { DuckRacePreview } from './duck-race-preview'
import { ToolCardShell } from './tool-card-shell'
import { ClassroomButton, EmptyState } from '@/src/components/classroom'

export function DuckRaceTool() {
  const { data } = useAppData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (searchParams?.get('tool') === 'duck-race') {
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)

    if (searchParams?.get('tool') !== 'duck-race') return

    const params = new URLSearchParams(searchParams.toString())
    params.delete('tool')
    const query = params.toString()
    router.replace(query ? `/tools?${query}` : '/tools')
  }, [router, searchParams])

  return (
    <>
      <ToolCardShell
        icon={Bird}
        iconBg="bg-pastel-pink"
        title="Đua vịt"
        description="Cuộc đua vui nhộn để cả lớp cùng cổ vũ."
      >
        {students.length === 0 ? (
          <EmptyState
            compact
            icon={Sparkles}
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu đua vịt."
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center rounded-2xl bg-gradient-to-b from-pastel-pink/50 via-white to-pastel-sky/40 px-4 py-5">
            <div className="flex flex-1 items-center justify-center">
              <DuckRacePreview size={180} />
            </div>
            <p className="mt-4 text-sm font-bold text-brand-purple/70">Mở đường đua để chọn học sinh</p>
            <ClassroomButton
              size="lg"
              className="mt-4 min-h-11 w-full shadow-md shadow-brand-purple/25"
              onClick={() => setDialogOpen(true)}
            >
              Đua ngay
            </ClassroomButton>
          </div>
        )}
      </ToolCardShell>

      <DuckRaceDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        students={students}
        teams={teams}
      />
    </>
  )
}
