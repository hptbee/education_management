'use client'

import { useState } from 'react'
import { useAppData } from '@/src/store/AppDataContext'
import { LuckyWheelDialog } from './lucky-wheel-dialog'
import { WheelPreview } from './named-wheel'

export function LuckyWheelTool() {
  const { data } = useAppData()
  const students = data?.students ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4">
          <h2 className="font-display text-base font-extrabold text-slate-800">Vòng quay may mắn</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Chọn ngẫu nhiên một học sinh trong lớp.</p>
        </header>

        {students.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-400">Chưa có học sinh</p>
        ) : (
          <div className="flex flex-col items-center">
            <WheelPreview size={140} />
            <p className="mt-4 text-xs font-semibold text-slate-400">Mở vòng quay để chọn học sinh</p>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-4 w-full rounded-2xl bg-brand-purple py-3 text-sm font-extrabold text-white transition hover:bg-brand-purple-dark"
            >
              QUAY NGAY
            </button>
          </div>
        )}
      </section>

      <LuckyWheelDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        students={students}
      />
    </>
  )
}
