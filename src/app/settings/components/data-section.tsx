'use client'

import { Download, FolderOpen, PencilLine, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Field, Input } from '@/src/components/ui'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { databaseService } from '@/src/database/database.service'
import { isCloudBackupConfigured } from '@/src/database/backup/cloud-backup.service'
import type { ClassroomDatabase, DatabaseSummary } from '@/src/database/types'
import { useAuth } from '@/src/store/AuthContext'
import { ClassroomList } from './classroom-list'
import { CloudRestoreCard } from './cloud-restore-card'

interface DataSectionProps {
  data: ClassroomDatabase
  renameDraft: { className: string; schoolYear: string }
  renaming: boolean
  onRenameDraftChange: (draft: { className: string; schoolYear: string }) => void
  onRename: () => void
  onExport: () => void
  onOpenDataFolder: () => void
  onSwitchDatabase: (id: string) => void
  onCloseDatabase: () => void
  onCloudBackupEnabledChange: (enabled: boolean) => void
}

export function DataSection({
  data,
  renameDraft,
  renaming,
  onRenameDraftChange,
  onRename,
  onExport,
  onOpenDataFolder,
  onSwitchDatabase,
  onCloseDatabase,
  onCloudBackupEnabledChange,
}: DataSectionProps) {
  const { entitlement, permissions } = useAuth()
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const loadDatabases = useCallback(async () => {
    setListError(null)
    try {
      const list = await databaseService.listDatabases()
      setDatabases(list)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Không thể tải danh sách lớp học.')
    }
  }, [])

  useEffect(() => {
    void isCloudBackupConfigured().then(setCloudConfigured)
  }, [data.metadata.id, data.appSettings.cloudBackupEnabled, entitlement])

  useEffect(() => {
    void loadDatabases()
  }, [data.metadata.id, loadDatabases])

  const otherClasses = databases.filter((db) => db.id !== data.metadata.id && !db.archived)
  const hasCloudBackupPermission = permissions?.cloudBackup === true
  const showCloudFeatures = cloudConfigured && hasCloudBackupPermission
  const showCloudUpgradeNote = Boolean(entitlement) && !hasCloudBackupPermission

  return (
    <div className="grid gap-4">
      <ClassroomCard>
        <h2 className="font-display text-lg font-extrabold text-slate-800">Chuyển lớp</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Mở lớp khác hoặc quay lại màn hình chọn lớp
        </p>
        {listError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-semibold text-rose-700">{listError}</p>
            <ClassroomButton className="mt-3" variant="outline" onClick={() => void loadDatabases()}>
              Thử lại
            </ClassroomButton>
          </div>
        ) : null}
        {listError ? null : otherClasses.length > 0 ? (
          <div className="mt-4 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
            <ClassroomList
              databases={otherClasses}
              currentId={data.metadata.id}
              onSelect={onSwitchDatabase}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-soft px-4 py-3 text-sm font-semibold text-slate-500">
            Chỉ có một lớp học trong thiết bị này.
          </p>
        )}
        <ClassroomButton variant="outline" className="mt-4 w-full" onClick={onCloseDatabase}>
          <Plus className="size-4" />
          Quản lý / tạo lớp khác
        </ClassroomButton>
      </ClassroomCard>

      <ClassroomCard>
        <h2 className="font-display text-lg font-extrabold text-slate-800">Đổi tên / Năm học</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Tạo mã lớp mới — khác với đổi tên hiển thị ở tab Hồ sơ
        </p>
        <div className="mt-4 grid gap-3">
          <Field label="Tên lớp mới">
            <Input
              value={renameDraft.className}
              onChange={(e) => onRenameDraftChange({ ...renameDraft, className: e.target.value })}
            />
          </Field>
          <Field label="Năm học mới">
            <Input
              value={renameDraft.schoolYear}
              onChange={(e) => onRenameDraftChange({ ...renameDraft, schoolYear: e.target.value })}
              placeholder="VD: 2025-2026"
            />
          </Field>
          <ClassroomButton
            className="w-full"
            onClick={onRename}
            disabled={renaming || !renameDraft.className.trim() || !renameDraft.schoolYear.trim()}
          >
            <PencilLine className="size-4" />
            {renaming ? 'Đang xử lý...' : 'Đổi tên database'}
          </ClassroomButton>
        </div>
      </ClassroomCard>

      <ClassroomCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Sao lưu & thư mục</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Xuất JSON hoặc mở thư mục dữ liệu (Tauri). Sao lưu đám mây là tùy chọn — chỉ gửi JSON lớp khi bật.
            </p>
            {showCloudFeatures ? (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-sky-100 bg-surface-soft px-4 py-3">
                <input
                  type="checkbox"
                  className="size-5 rounded border-slate-300 text-brand focus:ring-brand"
                  checked={data.appSettings.cloudBackupEnabled}
                  onChange={(e) => onCloudBackupEnabledChange(e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700">
                  Tự động sao lưu lớp này lên đám mây sau khi lưu cục bộ
                </span>
              </label>
            ) : showCloudUpgradeNote ? (
              <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Gói hiện tại không bao gồm sao lưu đám mây. Liên hệ quản trị viên để nâng cấp Premium 1 năm.
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Sao lưu đám mây chưa cấu hình (cần URL Worker, khóa công khai entitlement và đăng nhập Google).
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ClassroomButton variant="outline" onClick={onExport}>
              <Download className="size-4" />
              Xuất JSON
            </ClassroomButton>
            <ClassroomButton variant="outline" onClick={onOpenDataFolder}>
              <FolderOpen className="size-4" />
              Mở thư mục
            </ClassroomButton>
          </div>
        </div>
      </ClassroomCard>

      <CloudRestoreCard
        reloadKey={data.metadata.id}
        importFromCloudPayload={(payload) => databaseService.importDatabaseFromJson(payload)}
        onRestored={() => loadDatabases()}
      />
    </div>
  )
}
