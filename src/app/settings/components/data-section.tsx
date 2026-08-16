'use client'

import { CloudDownload, Copy, Download, FolderOpen, PencilLine, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Field, Input } from '@/src/components/ui'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { listCloudClassrooms, restoreCloudClassroom } from '@/src/auth/api'
import { databaseService } from '@/src/database/database.service'
import { isCloudBackupConfigured } from '@/src/database/backup/cloud-backup.service'
import type { ClassroomDatabase, DatabaseSummary } from '@/src/database/types'
import { useAuth } from '@/src/store/AuthContext'
import { ClassroomList } from './classroom-list'

interface DataSectionProps {
  data: ClassroomDatabase
  renameDraft: { className: string; schoolYear: string }
  dupDraft: { className: string; schoolYear: string; mode: 'settings-only' | 'full-copy' }
  renaming: boolean
  duplicating: boolean
  onRenameDraftChange: (draft: { className: string; schoolYear: string }) => void
  onDupDraftChange: (draft: { className: string; schoolYear: string; mode: 'settings-only' | 'full-copy' }) => void
  onRename: () => void
  onDuplicate: () => void
  onExport: () => void
  onOpenDataFolder: () => void
  onSwitchDatabase: (id: string) => void
  onCloseDatabase: () => void
  onCloudBackupEnabledChange: (enabled: boolean) => void
}

export function DataSection({
  data,
  renameDraft,
  dupDraft,
  renaming,
  duplicating,
  onRenameDraftChange,
  onDupDraftChange,
  onRename,
  onDuplicate,
  onExport,
  onOpenDataFolder,
  onSwitchDatabase,
  onCloseDatabase,
  onCloudBackupEnabledChange,
}: DataSectionProps) {
  const { entitlement, permissions } = useAuth()
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [cloudClassrooms, setCloudClassrooms] = useState<
    { classroomId: string; updatedAt: string | null; size: number }[]
  >([])
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)

  useEffect(() => {
    void isCloudBackupConfigured().then(setCloudConfigured)
  }, [data.metadata.id, data.appSettings.cloudBackupEnabled, entitlement])

  useEffect(() => {
    void databaseService.listDatabases().then(setDatabases)
  }, [data.metadata.id])

  useEffect(() => {
    if (!cloudConfigured || !entitlement) {
      setCloudClassrooms([])
      return
    }

    setLoadingCloud(true)
    setCloudError(null)
    void listCloudClassrooms(entitlement)
      .then(setCloudClassrooms)
      .catch(() => setCloudError('Không tải được danh sách lớp trên đám mây.'))
      .finally(() => setLoadingCloud(false))
  }, [cloudConfigured, entitlement, data.metadata.id])

  const handleRestoreFromCloud = async (classroomId: string) => {
    if (!entitlement) return
    const confirmed = window.confirm(
      `Khôi phục lớp "${classroomId}" từ đám mây? Dữ liệu sẽ được nhập vào thiết bị này (không ghi đè lớp trùng mã).`,
    )
    if (!confirmed) return

    setRestoringId(classroomId)
    setCloudError(null)
    try {
      const payload = await restoreCloudClassroom(entitlement, classroomId)
      if (!payload) {
        throw new Error('Không tìm thấy bản sao lưu trên đám mây.')
      }
      await databaseService.importDatabaseFromJson(payload)
      const refreshed = await databaseService.listDatabases()
      setDatabases(refreshed)
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Khôi phục thất bại.')
    } finally {
      setRestoringId(null)
    }
  }

  const otherClasses = databases.filter((db) => db.id !== data.metadata.id)
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
        {otherClasses.length > 0 ? (
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
          Tạo / nhập lớp khác
        </ClassroomButton>
      </ClassroomCard>

      <div className="grid gap-4 lg:grid-cols-2">
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
          <h2 className="font-display text-lg font-extrabold text-slate-800">Nhân bản database</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Tạo lớp mới từ lớp hiện tại</p>
          <div className="mt-4 grid gap-3">
            <Field label="Tên lớp mới">
              <Input
                value={dupDraft.className}
                onChange={(e) => onDupDraftChange({ ...dupDraft, className: e.target.value })}
                placeholder="VD: Lớp 3A"
              />
            </Field>
            <Field label="Năm học">
              <Input
                value={dupDraft.schoolYear}
                onChange={(e) => onDupDraftChange({ ...dupDraft, schoolYear: e.target.value })}
                placeholder="VD: 2025-2026"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              {(['settings-only', 'full-copy'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onDupDraftChange({ ...dupDraft, mode })}
                  className={`min-h-11 rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${
                    dupDraft.mode === mode
                      ? 'border-emerald-500 bg-emerald-50 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  {mode === 'settings-only' ? 'Chỉ cài đặt' : 'Bản sao đầy đủ'}
                </button>
              ))}
            </div>
            <ClassroomButton
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={onDuplicate}
              disabled={duplicating || !dupDraft.className.trim()}
            >
              <Copy className="size-4" />
              {duplicating ? 'Đang nhân bản...' : 'Nhân bản'}
            </ClassroomButton>
          </div>
        </ClassroomCard>
      </div>

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
                Gói hiện tại không bao gồm sao lưu đám mây. Liên hệ quản trị viên để nâng cấp Premium.
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

      {showCloudFeatures ? (
        <ClassroomCard>
          <h2 className="font-display text-lg font-extrabold text-slate-800">Khôi phục từ đám mây</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Tải lớp đã sao lưu trên tài khoản của cô về thiết bị này.
          </p>
          {cloudError ? (
            <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {cloudError}
            </p>
          ) : null}
          {loadingCloud ? (
            <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải danh sách...</p>
          ) : cloudClassrooms.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-soft px-4 py-3 text-sm font-semibold text-slate-500">
              Chưa có lớp nào được sao lưu trên đám mây.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {cloudClassrooms.map((item) => (
                <li
                  key={item.classroomId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-surface-soft px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.classroomId}</p>
                    <p className="text-xs font-semibold text-slate-400">
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleString('vi-VN')
                        : '—'}
                      {' · '}
                      {Math.round(item.size / 1024)} KB
                    </p>
                  </div>
                  <ClassroomButton
                    variant="outline"
                    disabled={restoringId === item.classroomId}
                    onClick={() => void handleRestoreFromCloud(item.classroomId)}
                  >
                    <CloudDownload className="size-4" />
                    {restoringId === item.classroomId ? 'Đang khôi phục...' : 'Khôi phục'}
                  </ClassroomButton>
                </li>
              ))}
            </ul>
          )}
        </ClassroomCard>
      ) : null}
    </div>
  )
}
