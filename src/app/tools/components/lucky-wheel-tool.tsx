'use client'

import { useState } from 'react'
import { useAppData } from '@/src/store/AppDataContext'
import { LuckyWheelDialog } from './lucky-wheel-dialog'
import { WheelPreview } from './named-wheel'
import { ClassroomCard, ClassroomButton, EmptyState } from '@/src/components/classroom'

export function LuckyWheelTool() {
  const { data } = useAppData()
  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <ClassroomCard className="flex flex-col">
        <header className="mb-4">
          <h2 className="font-display text-lg font-extrabold text-slate-800">Vòng quay may mắn</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Chọn ngẫu nhiên một học sinh trong lớp.</p>
        </header>

        {students.length === 0 ? (
          <EmptyState
            compact
            emoji="🎡"
            title="Chưa có học sinh"
            description="Thêm học sinh để bắt đầu quay vòng may mắn."
          />
        ) : (
          <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-pastel-sky/50 via-white to-pastel-pink/40 px-4 py-6">
            <WheelPreview size={180} />
            <p className="mt-5 text-sm font-bold text-brand-purple/70">Mở vòng quay để chọn học sinh</p>
            <ClassroomButton size="lg" className="mt-4 w-full shadow-md shadow-brand-purple/25" onClick={() => setDialogOpen(true)}>
              QUAY NGAY
            </ClassroomButton>
          </div>
        )}
      </ClassroomCard>

      <LuckyWheelDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        students={students}
        teams={teams}
      />
    </>
  )
}
