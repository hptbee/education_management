'use client'

import { CloudDownload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ClassroomButton, ClassroomCard, useClassroomDialog } from '@/src/components/classroom'
import { listCloudClassrooms, restoreCloudClassroom } from '@/src/auth/api'
import { isCloudBackupConfigured } from '@/src/database/backup/cloud-backup.service'
import type { ClassroomDatabase } from '@/src/database/types'
import { useAuth } from '@/src/store/AuthContext'

interface CloudRestoreCardProps {
  /** Re-import cloud JSON into local storage (e.g. AppData or databaseService). */
  importFromCloudPayload: (payload: unknown) => Promise<ClassroomDatabase>
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
  const { showConfirm } = useClassroomDialog()
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [cloudClassrooms, setCloudClassrooms] = useState<
    { classroomId: string; updatedAt: string | null; size: number }[]
  >([])
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const hasCloudBackupPermission = permissions?.cloudBackup === true
  const showCloudFeatures = cloudConfigured && hasCloudBackupPermission
  const showCloudUpgradeNote = Boolean(entitlement) && !hasCloudBackupPermission

  useEffect(() => {
    void isCloudBackupConfigured().then(setCloudConfigured)
  }, [entitlement, reloadKey])

  useEffect(() => {
    if (!cloudConfigured || !entitlement || !hasCloudBackupPermission) {
      setCloudClassrooms([])
      return
    }

    setLoadingCloud(true)
    setCloudError(null)
    void listCloudClassrooms(entitlement)
      .then(setCloudClassrooms)
      .catch(() => setCloudError('Không tải được danh sách lớp trên đám mây.'))
      .finally(() => setLoadingCloud(false))
  }, [cloudConfigured, entitlement, hasCloudBackupPermission, reloadKey])

  const handleRestoreFromCloud = async (classroomId: string) => {
    if (!entitlement) return
    const confirmed = await showConfirm(
      `Khôi phục lớp "${classroomId}" từ đám mây? Dữ liệu sẽ được nhập vào thiết bị này (không ghi đè lớp trùng mã).`,
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
      const db = await importFromCloudPayload(payload)
      await onRestored?.(db)
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Khôi phục thất bại.')
    } finally {
      setRestoringId(null)
    }
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

  if (!showCloudFeatures) {
    return null
  }

  return (
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
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '—'}
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
  )
}
