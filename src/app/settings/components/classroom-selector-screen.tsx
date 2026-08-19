'use client'

import { Calendar, BookOpen, Rocket, School, Upload, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Field, Input } from '@/src/components/ui'
import {
  ClassroomButton,
  ClassroomCard,
  EmptyState,
  PageHeader,
  useClassroomDialog,
} from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import type { DatabaseSummary } from '@/src/database/types'
import { useAppData } from '@/src/store/AppDataContext'
import { Settings } from 'lucide-react'
import { ClassroomList } from './classroom-list'
import { CloudRestoreCard } from './cloud-restore-card'

export function ClassroomSelectorScreen() {
  const { switchDatabase, createDatabase, importDatabase, restoreFromCloudPayload, data, isLoading } =
    useAppData()
  const { showAlert } = useClassroomDialog()
  const [draft, setDraft] = useState({ className: '', teacherName: '', schoolYear: '' })
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)

  const loadDatabases = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const list = await databaseService.listDatabases()
      setDatabases(list)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Không thể tải danh sách lớp học.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoading) return
    void loadDatabases()
  }, [data, isLoading, loadDatabases])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importDatabase(file).catch((err) => {
        void showAlert(err instanceof Error ? err.message : 'Không thể nhập dữ liệu.', { variant: 'error' })
      })
    }
    e.target.value = ''
  }

  const hasClasses = databases.length > 0

  const cloudRestoreCard = (
    <CloudRestoreCard
      reloadKey={databases.map((db) => db.id).join(',')}
      importFromCloudPayload={(payload, cloudAssets) => restoreFromCloudPayload(payload, cloudAssets)}
      onRestored={() => void loadDatabases()}
    />
  )

  const createForm = (
    <ClassroomCard>
      <h2 className="font-display text-lg font-extrabold text-slate-800">Tạo lớp học mới</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">Nhập thông tin cơ bản để bắt đầu</p>
      <form
        className="mt-5 grid gap-4"
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
        <Field label="Tên lớp">
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              required
              className="pl-10"
              value={draft.className}
              onChange={(e) => setDraft({ ...draft, className: e.target.value })}
              placeholder="Ví dụ: Lớp 2C"
            />
          </div>
        </Field>
        <Field label="Tên giáo viên">
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              required
              className="pl-10"
              value={draft.teacherName}
              onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })}
              placeholder="Ví dụ: Cô Thu"
            />
          </div>
        </Field>
        <Field label="Năm học">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              required
              className="pl-10"
              value={draft.schoolYear}
              onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })}
              placeholder="VD: 2025-2026"
            />
          </div>
        </Field>
        <ClassroomButton type="submit" className="w-full" size="lg">
          <Rocket className="size-4" />
          Bắt đầu
        </ClassroomButton>
      </form>
    </ClassroomCard>
  )

  const importCard = (
    <ClassroomCard>
      <h2 className="font-display text-lg font-extrabold text-slate-800">Nhập dữ liệu</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">Khôi phục lớp học từ file JSON</p>
      <label className="mt-5 flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-surface-soft transition hover:border-brand/30 hover:bg-brand-soft/40">
        <Upload className="mb-2 size-8 text-brand" />
        <p className="text-sm font-bold text-slate-700">Bấm để tải tệp JSON lên</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">Tối đa 25 MB</p>
        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
      </label>
    </ClassroomCard>
  )

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
      <PageHeader
        icon={Settings}
        title="Cài đặt"
        subtitle="Chọn, tạo hoặc nhập lớp học"
      />

      {listError ? (
        <ClassroomCard className="border-rose-200 bg-rose-50">
          <p className="text-sm font-semibold text-rose-700">{listError}</p>
          <ClassroomButton className="mt-3" variant="outline" onClick={() => void loadDatabases()}>
            Thử lại
          </ClassroomButton>
        </ClassroomCard>
      ) : null}

      {listLoading && databases.length === 0 ? (
        <ClassroomCard>
          <p className="text-sm font-semibold text-slate-500">Đang tải danh sách lớp học...</p>
        </ClassroomCard>
      ) : null}

      {hasClasses ? (
        <div className="grid gap-6">
          <ClassroomCard>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Lớp học gần đây</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Chọn lớp để tiếp tục làm việc</p>
            <div className="mt-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              <ClassroomList databases={databases} onSelect={(id) => void switchDatabase(id)} />
            </div>
          </ClassroomCard>

          <div className="grid gap-6 md:grid-cols-2">
            {createForm}
            {importCard}
          </div>
          {cloudRestoreCard}
        </div>
      ) : listError ? (
        <div className="grid gap-6">
          {createForm}
          {importCard}
          {cloudRestoreCard}
        </div>
      ) : listLoading ? null : (
        <div className="grid gap-6">
          <EmptyState
            icon={BookOpen}
            title="Chưa có lớp học nào"
            description="Tạo lớp mới, nhập JSON, hoặc khôi phục từ đám mây để bắt đầu."
            compact
          />
          {createForm}
          {importCard}
          {cloudRestoreCard}
        </div>
      )}
    </div>
  )
}
