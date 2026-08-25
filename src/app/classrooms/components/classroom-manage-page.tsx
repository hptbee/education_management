'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, School, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ClassroomButton, PageHeader, AnimatedEntrance } from '@/src/components/classroom'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomRolesSection } from '@/src/app/settings/components/classroom-roles-section'
import { DataSection } from '@/src/app/settings/components/data-section'
import { ProfileSection } from '@/src/app/settings/components/profile-section'
import { SETTINGS_TABS } from '@/src/app/settings/components/settings-flags'
import {
  ClassroomManageTabs,
  parseClassroomManageTab,
  type ClassroomManageTab,
} from './classroom-manage-tabs'

export function ClassroomManagePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const classroomId = searchParams?.get('id')?.trim() ?? ''

  const {
    data,
    isLoading,
    switchDatabase,
    updateAppSettings,
    updateTeacherProfile,
    updateClassroomSettings,
    renameDatabase,
    closeDatabase,
  } = useAppData()

  const activeTab = useMemo(
    () => parseClassroomManageTab(searchParams?.get('tab') ?? null),
    [searchParams],
  )

  const setActiveTab = useCallback(
    (tab: ClassroomManageTab) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (!params.get('id') && classroomId) {
        params.set('id', classroomId)
      }
      if (tab === 'profile') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const qs = params.toString()
      const base = pathname ?? '/classrooms/manage'
      router.replace(qs ? `${base}?${qs}` : `${base}?id=${encodeURIComponent(classroomId)}`)
    },
    [classroomId, pathname, router, searchParams],
  )

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  const [teacherDraft, setTeacherDraft] = useState({ name: '' })
  const [classroomDraft, setClassroomDraft] = useState({ className: '' })
  const [renameDraft, setRenameDraft] = useState({ className: '', schoolYear: '' })
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    if (!classroomId) {
      router.replace('/classrooms')
    }
  }, [classroomId, router])

  useEffect(() => {
    if (!classroomId) return
    if (data?.metadata.id === classroomId) return
    setSwitching(true)
    void switchDatabase(classroomId).finally(() => setSwitching(false))
  }, [classroomId, data?.metadata.id, switchDatabase])

  useEffect(() => {
    if (!data || data.metadata.id !== classroomId) return
    setTeacherDraft({ name: data.classroomSettings.teacher.name })
    setClassroomDraft({ className: data.classroomSettings.className })
    setRenameDraft({
      className: data.classroomSettings.className,
      schoolYear: data.classroomSettings.schoolYear,
    })
  }, [data, classroomId])

  const isProfileDirty = useMemo(() => {
    if (!data || data.metadata.id !== classroomId) return false
    return (
      teacherDraft.name.trim() !== data.classroomSettings.teacher.name.trim() ||
      classroomDraft.className.trim() !== data.classroomSettings.className.trim()
    )
  }, [data, classroomId, teacherDraft, classroomDraft])

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveProfile = () => {
    if (!data || data.metadata.id !== classroomId) return
    const name = teacherDraft.name.trim()
    const className = classroomDraft.className.trim()
    if (!name || !className) return

    if (name !== data.classroomSettings.teacher.name.trim()) {
      updateTeacherProfile({ name })
    }
    if (className !== data.classroomSettings.className.trim()) {
      updateClassroomSettings({ ...data.classroomSettings, className })
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

  const handleExport = async () => {
    if (!data) return
    setError(null)
    try {
      const { databaseService } = await import('@/src/database/database.service')
      await databaseService.exportDatabase(data)
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

  if (!classroomId) {
    return (
      <p className="text-sm font-semibold text-slate-500">Không tìm thấy mã lớp học.</p>
    )
  }

  if (isLoading || switching || !data || data.metadata.id !== classroomId) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm font-semibold text-slate-500">Đang mở lớp học...</p>
      </div>
    )
  }

  const showProfileSection = activeTab === 'profile'
  const showRolesSection = !SETTINGS_TABS.mergeProfileAndRoles && activeTab === 'roles'

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
        >
          <ArrowLeft className="size-4" />
          Quản lý lớp
        </Link>
      </div>

      <PageHeader
        icon={School}
        title="Cài đặt lớp"
        subtitle={`${data.classroomSettings.className} · ${data.classroomSettings.schoolYear}`}
      />

      <ClassroomManageTabs
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
        <AnimatedEntrance variant="random">
          <ProfileSection
          teacherDraft={teacherDraft}
          classroomDraft={classroomDraft}
          schoolYear={data.classroomSettings.schoolYear}
          isDirty={isProfileDirty}
          onTeacherDraftChange={setTeacherDraft}
          onClassroomDraftChange={setClassroomDraft}
          onSaveProfile={handleSaveProfile}
          onSaved={showSaved}
          onError={setError}
          onGoToDataTab={() => setActiveTab('data')}
        />
        </AnimatedEntrance>
      )}

      {showRolesSection && (
        <AnimatedEntrance variant="random">
          <ClassroomRolesSection />
        </AnimatedEntrance>
      )}

      {activeTab === 'data' && (
        <AnimatedEntrance variant="random">
          <DataSection
          data={data}
          renameDraft={renameDraft}
          renaming={renaming}
          onRenameDraftChange={setRenameDraft}
          onRename={() => void handleRename()}
          onExport={() => void handleExport()}
          onOpenDataFolder={() => void handleOpenDataFolder()}
          onSwitchDatabase={(id) =>
            router.push(`/classrooms/manage?id=${encodeURIComponent(id)}`)
          }
          onCloseDatabase={() => {
            void closeDatabase()
            router.push('/classrooms')
          }}
          onCloudBackupEnabledChange={(enabled) => updateAppSettings({ cloudBackupEnabled: enabled })}
        />
        </AnimatedEntrance>
      )}
    </div>
  )
}
