'use client'

import { MonitorPlay, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/src/components/Avatar'
import { Badge, Button, Card, Field, Input } from '@/src/components/ui'
import { useClassroomDialog } from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import type { DatabaseSummary } from '@/src/database/types'
import { useAppData } from '@/src/store/AppDataContext'

export function ClassroomSelectorScreen() {
  const { switchDatabase, createDatabase, importDatabase, data, isLoading } = useAppData()
  const { showAlert } = useClassroomDialog()
  const [draft, setDraft] = useState({ className: '', teacherName: '', schoolYear: '' })
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])

  useEffect(() => {
    if (isLoading) return
    void databaseService.listDatabases().then(setDatabases)
  }, [data, isLoading])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importDatabase(file).catch((err) => {
        void showAlert(err instanceof Error ? err.message : 'Không thể nhập dữ liệu.', { variant: 'error' })
      })
    }
    e.target.value = ''
  }

  return (
    <div className="grid min-h-[60vh] place-items-center p-4">
      <Card className="w-full max-w-4xl bg-white/95">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-purple">
            🎉 Chào mừng đến với Lớp Học Vui!
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-800">Chọn hoặc tạo lớp học mới</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-bold">Tạo lớp học mới</h2>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                const now = new Date().toISOString()
                createDatabase({
                  className: draft.className,
                  schoolYear: draft.schoolYear,
                  teacher: {
                    id: `teacher-${Date.now()}`,
                    name: draft.teacherName,
                    createdAt: now,
                    updatedAt: now,
                  },
                }).catch((err) => {
                  void showAlert(err instanceof Error ? err.message : 'Không thể tạo lớp học.', {
                    variant: 'error',
                  })
                })
              }}
            >
              <Field label="🏫 Tên lớp">
                <Input
                  required
                  value={draft.className}
                  onChange={(e) => setDraft({ ...draft, className: e.target.value })}
                />
              </Field>
              <Field label="👩‍🏫 Tên giáo viên">
                <Input
                  required
                  value={draft.teacherName}
                  onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })}
                />
              </Field>
              <Field label="📅 Năm học">
                <Input
                  required
                  value={draft.schoolYear}
                  onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })}
                />
              </Field>
              <Button type="submit" className="w-full">
                <Rocket size={18} />
                Bắt đầu
              </Button>
            </form>

            <div className="mt-6 border-t pt-6">
              <h2 className="mb-4 text-xl font-bold">Nhập dữ liệu</h2>
              <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-surface-soft py-6 hover:bg-brand-soft">
                <div className="flex flex-col items-center justify-center pb-2 pt-1 text-brand-purple">
                  <MonitorPlay size={32} className="mb-2" />
                  <p className="text-sm font-bold">Bấm để tải tệp JSON lên</p>
                </div>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-bold">Lớp học gần đây</h2>
            <div className="grid h-full max-h-[400px] gap-3 overflow-y-auto pr-2">
              {databases.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-brand-purple/20 bg-gradient-to-b from-pastel-lavender/40 to-transparent p-8 text-center">
                  <p className="text-4xl">📚</p>
                  <p className="mt-3 font-bold text-slate-700">Chưa có dữ liệu lớp học nào</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Tạo lớp mới hoặc nhập dữ liệu JSON để bắt đầu.
                  </p>
                </div>
              ) : (
                databases.map((db) => (
                  <Card
                    key={db.id}
                    className="cursor-pointer transition-colors hover:border-brand-purple"
                    onClick={() => switchDatabase(db.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={db.className} size="md" />
                        <div>
                          <p className="font-bold text-slate-800">{db.className}</p>
                          <p className="text-sm text-gray-500">
                            {db.schoolYear} • {db.teacherName}
                          </p>
                        </div>
                      </div>
                      <Badge>{db.studentCount} HS</Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
