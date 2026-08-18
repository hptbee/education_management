'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Settings, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Field, Input } from '@/src/components/ui'
import { ClassroomButton, ClassroomCard, PageHeader } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomRolesSection } from './classroom-roles-section'
import { DataSection } from './data-section'
import { ProfileSection } from './profile-section'
import { AccountSection } from './account-section'
import { SETTINGS_TABS } from './settings-flags'
import { SettingsTabs, parseSettingsTab, type SettingsTab } from './settings-tabs'

export function SettingsPage() {
  const {
    data,
    updateClassroomSettings,
    updateAppSettings,
    updateTeacherProfile,
    renameDatabase,
    deleteDatabase,
    closeDatabase,
    switchDatabase,
  } = useAppData()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = useMemo(
    () => parseSettingsTab(searchParams?.get('tab') ?? null),
    [searchParams],
  )
  const setActiveTab = useCallback(
    (tab: SettingsTab) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (tab === 'account') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname ?? '/settings'}?${qs}` : (pathname ?? '/settings'))
    },
    [pathname, router, searchParams],
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teacherDraft, setTeacherDraft] = useState({ name: data!.classroomSettings.teacher.name })
  const [classroomDraft, setClassroomDraft] = useState({ className: data!.classroomSettings.className })
  const [renameDraft, setRenameDraft] = useState({
    className: data!.classroomSettings.className,
    schoolYear: data!.classroomSettings.schoolYear,
  })
  const [renaming, setRenaming] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!data) return
    setTeacherDraft({ name: data.classroomSettings.teacher.name })
    setClassroomDraft({ className: data.classroomSettings.className })
    setRenameDraft({
      className: data.classroomSettings.className,
      schoolYear: data.classroomSettings.schoolYear,
    })
  }, [data?.metadata.id])

  const isProfileDirty = useMemo(() => {
    if (!data) return false
    return (
      teacherDraft.name.trim() !== data.classroomSettings.teacher.name.trim() ||
      classroomDraft.className.trim() !== data.classroomSettings.className.trim()
    )
  }, [data, teacherDraft, classroomDraft])

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveProfile = () => {
    const name = teacherDraft.name.trim()
    const className = classroomDraft.className.trim()
    if (!name || !className) return

    if (name !== data!.classroomSettings.teacher.name.trim()) {
      updateTeacherProfile({ name })
    }
    if (className !== data!.classroomSettings.className.trim()) {
      updateClassroomSettings({ ...data!.classroomSettings, className })
    }
    showSaved()
  }

  const handleRename = async () => {
    setError(null)
    setRenaming(true)
    try {
      await renameDatabase(renameDraft.className.trim(), renameDraft.schoolYear.trim())
      showSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể đổi tên database.')
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (deleteInput !== data!.classroomSettings.className) return
    setDeleting(true)
    try {
      await deleteDatabase(data!.metadata.id)
      closeDatabase()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể xóa lớp học.')
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setError(null)
    try {
      const { databaseService } = await import('@/src/database/database.service')
      await databaseService.exportDatabase(data!)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể xuất dữ liệu.')
    }
  }

  const handleOpenDataFolder = async () => {
    try {
      const { databaseService } = await import('@/src/database/database.service')
      const dir = await databaseService.getDataDirectory()
      if (!dir) {
        setError('Chức năng này chỉ khả dụng khi chạy ứng dụng Tauri.')
        return
      }
      const { tauriFs } = await import('@/src/database/tauri-fs.service')
      if (!tauriFs.openPath) {
        setError('Chức năng này chỉ khả dụng khi chạy ứng dụng Tauri.')
        return
      }
      await tauriFs.openPath(dir)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể mở thư mục dữ liệu.')
    }
  }

  const showProfileSection = activeTab === 'profile'
  const showRolesSection =
    !SETTINGS_TABS.mergeProfileAndRoles && activeTab === 'roles'

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={Settings}
        title="Cài đặt"
        subtitle={`${data!.classroomSettings.className} · ${data!.classroomSettings.schoolYear}`}
      />

      <SettingsTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab)
          setError(null)
        }}
      />

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700"
        >
          <Sparkles className="size-4" />
          Đã lưu thay đổi thành công!
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700"
        >
          <AlertTriangle className="size-4" />
          {error}
        </motion.div>
      )}

      {showProfileSection && (
        <ProfileSection
          teacherDraft={teacherDraft}
          classroomDraft={classroomDraft}
          schoolYear={data!.classroomSettings.schoolYear}
          isDirty={isProfileDirty}
          onTeacherDraftChange={setTeacherDraft}
          onClassroomDraftChange={setClassroomDraft}
          onSaveProfile={handleSaveProfile}
          onSaved={showSaved}
          onError={setError}
          onGoToDataTab={SETTINGS_TABS.showDataTab ? () => setActiveTab('data') : undefined}
        />
      )}

      {showRolesSection && <ClassroomRolesSection />}

      {activeTab === 'account' && <AccountSection />}

      {SETTINGS_TABS.showDataTab && activeTab === 'data' && (
        <DataSection
          data={data!}
          renameDraft={renameDraft}
          renaming={renaming}
          onRenameDraftChange={setRenameDraft}
          onRename={() => void handleRename()}
          onExport={() => void handleExport()}
          onOpenDataFolder={() => void handleOpenDataFolder()}
          onSwitchDatabase={(id) => void switchDatabase(id)}
          onCloseDatabase={() => router.push('/classrooms')}
          onCloudBackupEnabledChange={(enabled) => updateAppSettings({ cloudBackupEnabled: enabled })}
        />
      )}

      {SETTINGS_TABS.showDangerTab && activeTab === 'danger' && (
        <ClassroomCard className="border-2 border-rose-200">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
              <AlertTriangle className="size-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-rose-600">Vùng nguy hiểm</h2>
              <p className="text-sm font-semibold text-slate-500">Các thao tác không thể hoàn tác</p>
            </div>
          </div>

          <p className="mb-4 text-sm font-semibold text-slate-600">
            Nên xuất JSON ở tab <strong>Dữ liệu</strong> trước khi xóa lớp học.
          </p>

          <div className="grid gap-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-5">
            <div>
              <p className="text-lg font-extrabold text-rose-700">Xóa lớp học này</p>
              <p className="mt-1 text-sm font-semibold text-rose-600">
                Xóa vĩnh viễn <strong>{data!.classroomSettings.className}</strong> (
                {data!.classroomSettings.schoolYear}). Bao gồm {data!.students.length} học sinh và toàn bộ lịch
                sử.
              </p>
            </div>

            {!deleteConfirm ? (
              <ClassroomButton
                variant="danger"
                className="w-full bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => setDeleteConfirm(true)}
              >
                Tôi muốn xóa lớp này
              </ClassroomButton>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm font-bold text-rose-700">
                  Nhập tên lớp{' '}
                  <strong className="font-extrabold">&quot;{data!.classroomSettings.className}&quot;</strong> để
                  xác nhận:
                </p>
                <Field label="Xác nhận tên lớp">
                  <Input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={data!.classroomSettings.className}
                    className="border-rose-300"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <ClassroomButton
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirm(false)
                      setDeleteInput('')
                    }}
                  >
                    Hủy bỏ
                  </ClassroomButton>
                  <ClassroomButton
                    className="bg-rose-600 text-white hover:bg-rose-700"
                    onClick={() => void handleDelete()}
                    disabled={deleteInput !== data!.classroomSettings.className || deleting}
                  >
                    {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                  </ClassroomButton>
                </div>
              </div>
            )}
          </div>
        </ClassroomCard>
      )}
    </div>
  )
}
