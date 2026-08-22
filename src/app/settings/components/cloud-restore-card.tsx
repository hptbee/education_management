'use client'

import { CloudDownload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ClassroomButton, ClassroomCard, useClassroomDialog } from '@/src/components/classroom'
import { listCloudClassrooms, restoreCloudClassroom, restoreCloudClassroomAssets } from '@/src/auth/api'
import {
  getCloudBackupUrl,
  isEntitlementConfigured,
} from '@/src/database/backup/cloud-backup.service'
import type { ClassroomDatabase } from '@/src/database/types'
import { useAuth } from '@/src/store/AuthContext'
import { logCloudTrace } from '@/src/logging/app-log'

interface CloudRestoreCardProps {
  /** Re-import cloud JSON into local storage (e.g. AppData or databaseService). */
  importFromCloudPayload: (
    payload: unknown,
    cloudAssets?: Array<{ path: string; content: string; encoding?: string }>,
  ) => Promise<ClassroomDatabase>
  /** Called after a successful import (e.g. refresh local list or open class). */
  onRestored?: (db: ClassroomDatabase) => void | Promise<void>
  /** Bumps cloud list reload when local classroom context changes. */
  reloadKey?: string
}

export function CloudRestoreCard({
  importFromCloudPayload,
  onRestored,
  reloadKey,
}: CloudRestoreCardProps) {
  const { entitlement, permissions } = useAuth()
  const { showConfirm, showAlert } = useClassroomDialog()
  const [cloudClassrooms, setCloudClassrooms] = useState<
    { classroomId: string; updatedAt: string | null; size: number; name?: string | null; schoolYear?: string | null }[]
  >([])
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const hasCloudBackupPermission = permissions?.cloudBackup === true
  const hasWorkerUrl = Boolean(getCloudBackupUrl())
  const hasPublicKey = isEntitlementConfigured()
  const cloudEnvReady = hasWorkerUrl && hasPublicKey
  const canUseCloudRestore = Boolean(entitlement) && hasCloudBackupPermission && cloudEnvReady
  const showCloudUpgradeNote = Boolean(entitlement) && !hasCloudBackupPermission

  useEffect(() => {
    if (!canUseCloudRestore || !entitlement) {
      setCloudClassrooms([])
      return
    }

    setLoadingCloud(true)
    setCloudError(null)
    void listCloudClassrooms(entitlement)
      .then(setCloudClassrooms)
      .catch(() => setCloudError('Không tải được danh sách lớp trên đám mây.'))
      .finally(() => setLoadingCloud(false))
  }, [canUseCloudRestore, entitlement, reloadKey])

  const handleRestoreFromCloud = async (classroomId: string) => {
    if (!entitlement) return
    const confirmed = await showConfirm(
      `Khôi phục lớp "${classroomId}" từ đám mây? Dữ liệu local của lớp này sẽ được thay bằng bản trên đám mây.`,
      {
        title: 'Khôi phục từ đám mây',
        confirmLabel: 'Khôi phục',
        cancelLabel: 'Hủy bỏ',
        variant: 'warning',
      },
    )
    if (!confirmed) return

    setRestoringId(classroomId)
    setCloudError(null)
    try {
      const payload = await restoreCloudClassroom(entitlement, classroomId)
      if (!payload) {
        throw new Error('Không tìm thấy bản sao lưu trên đám mây.')
      }
      const assets = await restoreCloudClassroomAssets(entitlement, classroomId)
      logCloudTrace('info', 'cloud-restore', 'CloudRestoreCard importing', {
        classroomId,
        assetCount: assets.length,
        paths: assets.map((item) => item.path),
      })
      const db = await importFromCloudPayload(payload, assets)
      await onRestored?.(db)
      const assetNote =
        assets.length > 0
          ? ` (${assets.length} ảnh)`
          : ' — không có ảnh trên đám mây; chỉ khôi phục dữ liệu JSON.'
      void showAlert(
        `Đã khôi phục lớp "${db.classroomSettings.className}" (${db.classroomSettings.schoolYear}) từ đám mây${assetNote}`,
        { variant: 'info' },
      )
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Khôi phục thất bại.')
    } finally {
      setRestoringId(null)
    }
  }

  if (!entitlement) {
    return null
  }

  if (showCloudUpgradeNote) {
    return (
      <ClassroomCard>
        <h2 className="font-display text-lg font-extrabold text-slate-800">Khôi phục từ đám mây</h2>
        <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Gói hiện tại không bao gồm sao lưu đám mây. Liên hệ quản trị viên để nâng cấp Premium 1 năm.
        </p>
      </ClassroomCard>
    )
  }

  if (!cloudEnvReady) {
    return (
      <ClassroomCard>
        <h2 className="font-display text-lg font-extrabold text-slate-800">Khôi phục từ đám mây</h2>
        <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Sao lưu đám mây chưa cấu hình trong bản cài này
          {!hasWorkerUrl ? ' (thiếu URL Worker)' : ''}
          {!hasPublicKey ? ' (thiếu khóa entitlement)' : ''}. Với bản .exe, hãy build lại sau khi cập nhật
          `.env.local`, hoặc đăng xuất và đăng nhập lại.
        </p>
      </ClassroomCard>
    )
  }

  return (
    <ClassroomCard>
      <h2 className="font-display text-lg font-extrabold text-slate-800">Khôi phục từ đám mây</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Tải lại dữ liệu lớp từ đám mây (ghi đè bản local). Danh sách lớp được đồng bộ tự động khi đăng nhập.
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
          Chưa có lớp nào được sao lưu trên đám mây. Trên máy cũ, bật sao lưu đám mây cho lớp và lưu
          lại trước khi khôi phục ở đây.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {cloudClassrooms.map((item) => (
            <li
              key={item.classroomId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-surface-soft px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {item.name?.trim() ? item.name : item.classroomId}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {item.schoolYear ? `Năm học ${item.schoolYear} · ` : ''}
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '—'}
                  {item.size > 0 ? ` · ${Math.round(item.size / 1024)} KB` : ''}
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
  )
}
