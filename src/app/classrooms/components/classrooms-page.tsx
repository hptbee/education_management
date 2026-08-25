'use client'

import {
  Archive,
  ArchiveRestore,
  Calendar,
  Copy,
  MoreVertical,
  Plus,
  School,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Field, Input } from '@/src/components/ui'
import {
  ClassroomButton,
  ClassroomCard,
  ClassroomDialogFrame,
  EmptyState,
  IconTouchButton,
  PageHeader,
  useClassroomDialog,
  AnimatedEntrance,
} from '@/src/components/classroom'
import { useClassroomList } from '@/src/hooks/useClassroomList'
import type { DatabaseSummary } from '@/src/database/types'
import { useAppData } from '@/src/store/AppDataContext'
import { formatRelativeUpdatedAt } from '@/src/utils/relativeTime'
import { CloudRestoreCard } from '@/src/app/settings/components/cloud-restore-card'
import { backupMetadataService } from '@/src/database/backup/backup-metadata.service'
import { useAuth } from '@/src/store/AuthContext'
import { cn } from '@/lib/utils'

type ModalKind = 'create' | 'duplicate' | 'archive' | 'delete' | 'switch-prompt' | null

function defaultSchoolYear() {
  const year = new Date().getFullYear()
  return `${year}-${year + 1}`
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <ClassroomDialogFrame
      open={open}
      onClose={onClose}
      ariaLabelledBy="classroom-modal-title"
      panelClassName="max-w-md"
      zIndexClassName="z-[120]"
    >
      <div className="w-full rounded-3xl border border-sky-100 bg-white p-6 shadow-xl">
        <h2 id="classroom-modal-title" className="font-display text-xl font-extrabold text-slate-800">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </ClassroomDialogFrame>
  )
}

function ClassroomCardMenu({
  classroom,
  isActive,
  onManage,
  onDuplicate,
  onArchive,
  onDelete,
  onRestore,
}: {
  classroom: DatabaseSummary
  isActive: boolean
  onManage: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <IconTouchButton
        aria-label="Tùy chọn lớp"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl border border-sky-100 text-slate-500 hover:border-brand/30 hover:text-brand"
      >
        <MoreVertical className="size-4" />
      </IconTouchButton>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-2xl border border-sky-100 bg-white p-1 shadow-lg">
            {classroom.archived ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-surface-soft"
                  onClick={() => {
                    setOpen(false)
                    onRestore()
                  }}
                >
                  <ArchiveRestore className="size-4 text-emerald-500" />
                  Khôi phục
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setOpen(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="size-4" />
                  Xóa vĩnh viễn
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-surface-soft"
                  onClick={() => {
                    setOpen(false)
                    onManage()
                  }}
                >
                  <Settings className="size-4 text-brand" />
                  Cài đặt lớp
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-surface-soft"
                  onClick={() => {
                    setOpen(false)
                    onDuplicate()
                  }}
                >
                  <Copy className="size-4 text-emerald-500" />
                  Nhân bản
                </button>
                <button
                  type="button"
                  disabled={isActive}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    if (isActive) return
                    setOpen(false)
                    onArchive()
                  }}
                >
                  <Archive className="size-4 text-amber-500" />
                  Lưu trữ
                </button>
                <button
                  type="button"
                  disabled={isActive}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    if (isActive) return
                    setOpen(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="size-4" />
                  Xóa
                </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function ClassroomManagementCard({
  classroom,
  isActive,
  busy,
  hydrateError,
  hasCloudBackupPermission,
  onRetryHydrate,
  onSwitch,
  onManage,
  onDuplicate,
  onArchive,
  onDelete,
  onRestore,
}: {
  classroom: DatabaseSummary
  isActive: boolean
  busy: boolean
  hydrateError?: string
  hasCloudBackupPermission: boolean
  onRetryHydrate?: () => void
  onSwitch: () => void
  onManage: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const [cloudLabel, setCloudLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!hasCloudBackupPermission || classroom.hydrated === false) {
      setCloudLabel(null)
      return
    }

    let cancelled = false
    void backupMetadataService.getClassroomMeta(classroom.id).then((meta) => {
      if (cancelled) return
      if (meta.lastCloudBackupStatus === 'success') {
        setCloudLabel('Đã sao lưu')
      } else if (meta.lastCloudBackupStatus === 'failed') {
        setCloudLabel('Sao lưu thất bại')
      } else if (meta.lastCloudBackupStatus === 'pending') {
        setCloudLabel('Đang sao lưu')
      } else {
        setCloudLabel('Chỉ trên máy này')
      }
    })

    return () => {
      cancelled = true
    }
  }, [classroom.id, classroom.hydrated, classroom.updatedAt, hasCloudBackupPermission])

  return (
    <ClassroomCard className={cn(isActive && !classroom.archived && 'border-brand/30 ring-2 ring-brand/15')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-extrabold text-slate-800">{classroom.className}</h3>
            {isActive && !classroom.archived ? (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                Đang sử dụng
              </span>
            ) : null}
            {classroom.archived ? (
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                Đã lưu trữ
              </span>
            ) : null}
            {classroom.hydrated === false ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                Chưa tải về
              </span>
            ) : null}
            {hydrateError ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-700">
                Không tải được
              </span>
            ) : null}
            {cloudLabel && !hydrateError ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sky-800">
                {cloudLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">Năm học {classroom.schoolYear}</p>
          {hydrateError ? (
            <p className="mt-2 text-xs font-semibold text-rose-600">{hydrateError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {classroom.studentCount} học sinh
            </span>
            <span>Cập nhật {formatRelativeUpdatedAt(classroom.updatedAt)}</span>
          </div>
        </div>
        <ClassroomCardMenu
          classroom={classroom}
          isActive={isActive}
          onManage={onManage}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      </div>

      {!classroom.archived ? (
        <div className="mt-4 grid gap-2">
          {hydrateError && onRetryHydrate ? (
            <ClassroomButton variant="outline" disabled={busy} onClick={onRetryHydrate}>
              Thử tải lại
            </ClassroomButton>
          ) : null}
          {isActive ? (
            <ClassroomButton variant="outline" className="w-full" disabled>
              Đang sử dụng
            </ClassroomButton>
          ) : (
            <ClassroomButton className="w-full" disabled={busy} onClick={onSwitch}>
              Chuyển sang lớp này
            </ClassroomButton>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ClassroomButton variant="outline" disabled={busy} onClick={onRestore}>
            Khôi phục
          </ClassroomButton>
          <ClassroomButton
            variant="danger"
            className="bg-rose-500 text-white hover:bg-rose-600"
            disabled={busy}
            onClick={onDelete}
          >
            Xóa vĩnh viễn
          </ClassroomButton>
        </div>
      )}
    </ClassroomCard>
  )
}

export function ClassroomsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showAlert } = useClassroomDialog()
  const { permissions } = useAuth()
  const {
    data,
    switchDatabase,
    createDatabase,
    duplicateDatabase,
    archiveClassroom,
    restoreClassroom,
    deleteDatabase,
    restoreFromCloudPayload,
    hydrateErrors,
    retryHydrateClassroom,
  } = useAppData()

  const hasCloudBackupPermission = permissions?.cloudBackup === true

  const [refreshKey, setRefreshKey] = useState(0)
  const { classrooms, loading, error, refresh } = useClassroomList(refreshKey)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const [target, setTarget] = useState<DatabaseSummary | null>(null)
  const [createdClassroom, setCreatedClassroom] = useState<DatabaseSummary | null>(null)

  const [createDraft, setCreateDraft] = useState({ className: '', schoolYear: defaultSchoolYear() })
  const [dupDraft, setDupDraft] = useState({
    className: '',
    schoolYear: defaultSchoolYear(),
    mode: 'settings-only' as 'settings-only' | 'full-copy',
  })
  const [deleteInput, setDeleteInput] = useState('')

  const activeId = data?.metadata.id ?? null
  const activeClassrooms = useMemo(() => classrooms.filter((item) => !item.archived), [classrooms])
  const archivedClassrooms = useMemo(() => classrooms.filter((item) => item.archived), [classrooms])
  const hasAnyClass = classrooms.length > 0

  const openCreateModal = () => {
    setCreateDraft({ className: '', schoolYear: defaultSchoolYear() })
    setModal('create')
  }

  useEffect(() => {
    if (searchParams?.get('create') === '1') {
      openCreateModal()
      router.replace('/classrooms')
    }
  }, [searchParams, router])

  const bumpList = () => setRefreshKey((value) => value + 1)

  const closeModal = () => {
    setModal(null)
    setTarget(null)
    setDeleteInput('')
  }

  const openCreate = () => {
    openCreateModal()
  }

  const handleCreate = async () => {
    const className = createDraft.className.trim()
    const schoolYear = createDraft.schoolYear.trim()
    if (!className || !schoolYear) return

    setBusy(true)
    try {
      const now = new Date().toISOString()
      const teacher = data?.classroomSettings.teacher ?? {
        id: `teacher-${Date.now()}`,
        name: 'Giáo viên',
        createdAt: now,
        updatedAt: now,
      }
      const activate = !data
      const created = await createDatabase({ className, schoolYear, teacher }, { activate })
      bumpList()
      closeModal()
      if (!activate) {
        setCreatedClassroom({
          id: created.metadata.id,
          className: created.classroomSettings.className,
          schoolYear: created.classroomSettings.schoolYear,
          teacherName: teacher.name,
          studentCount: 0,
          createdAt: created.metadata.createdAt,
          updatedAt: created.metadata.updatedAt,
          archived: false,
        })
        setModal('switch-prompt')
      } else {
        router.push('/')
      }
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể tạo lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async () => {
    if (!target) return
    const className = dupDraft.className.trim()
    const schoolYear = dupDraft.schoolYear.trim()
    if (!className || !schoolYear) return

    setBusy(true)
    try {
      await duplicateDatabase(target.id, className, schoolYear, dupDraft.mode, { activate: false })
      bumpList()
      closeModal()
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể nhân bản lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!target) return
    setBusy(true)
    try {
      await archiveClassroom(target.id)
      bumpList()
      closeModal()
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể lưu trữ lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleRestore = async (classroom: DatabaseSummary) => {
    setBusy(true)
    try {
      await restoreClassroom(classroom.id)
      bumpList()
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể khôi phục lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!target) return
    if (deleteInput !== target.className) return

    setBusy(true)
    try {
      await deleteDatabase(target.id)
      bumpList()
      closeModal()
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể xóa lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleSwitch = async (id: string) => {
    setBusy(true)
    try {
      await switchDatabase(id)
      router.push('/')
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể chuyển lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleSwitchToCreated = async () => {
    if (!createdClassroom) return
    setBusy(true)
    try {
      await switchDatabase(createdClassroom.id)
      setCreatedClassroom(null)
      closeModal()
      router.push('/')
    } catch (err) {
      void showAlert(err instanceof Error ? err.message : 'Không thể chuyển lớp học.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={School}
        title="Quản lý lớp"
        subtitle="Quản lý các lớp học của bạn"
        actions={
          <ClassroomButton onClick={openCreate}>
            <Plus className="size-4" />
            Thêm lớp mới
          </ClassroomButton>
        }
      />

      {error ? (
        <ClassroomCard className="border-rose-200 bg-rose-50">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <ClassroomButton className="mt-3" variant="outline" onClick={() => void refresh()}>
            Thử lại
          </ClassroomButton>
        </ClassroomCard>
      ) : null}

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Đang tải danh sách lớp...</p>
      ) : !hasAnyClass ? (
        <EmptyState
          icon={School}
          title="Chưa có lớp học nào"
          description="Tạo lớp đầu tiên để bắt đầu quản lý học sinh, điểm thưởng và hoạt động lớp."
          action={
            <ClassroomButton onClick={openCreate}>
              <Plus className="size-4" />
              Tạo lớp đầu tiên
            </ClassroomButton>
          }
        />
      ) : (
        <>
          <section className="grid gap-4">
            <h2 className="font-display text-lg font-extrabold text-slate-800">Đang hoạt động</h2>
            {activeClassrooms.length === 0 ? (
              <ClassroomCard>
                <p className="text-sm font-semibold text-slate-500">
                  Không có lớp đang hoạt động. Khôi phục một lớp đã lưu trữ hoặc tạo lớp mới.
                </p>
              </ClassroomCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeClassrooms.map((classroom, index) => (
                  <AnimatedEntrance key={classroom.id} variant="random" staggerIndex={index}>
                    <ClassroomManagementCard
                      classroom={classroom}
                      isActive={activeId === classroom.id}
                      busy={busy}
                      hydrateError={hydrateErrors[classroom.id]}
                      hasCloudBackupPermission={hasCloudBackupPermission}
                      onRetryHydrate={() => void retryHydrateClassroom(classroom.id)}
                      onSwitch={() => void handleSwitch(classroom.id)}
                      onManage={() =>
                        router.push(`/classrooms/manage?id=${encodeURIComponent(classroom.id)}`)
                      }
                      onDuplicate={() => {
                        setTarget(classroom)
                        setDupDraft({
                          className: '',
                          schoolYear: defaultSchoolYear(),
                          mode: 'settings-only',
                        })
                        setModal('duplicate')
                      }}
                      onArchive={() => {
                        setTarget(classroom)
                        setModal('archive')
                      }}
                      onDelete={() => {
                        setTarget(classroom)
                        setDeleteInput('')
                        setModal('delete')
                      }}
                      onRestore={() => void handleRestore(classroom)}
                    />
                  </AnimatedEntrance>
                ))}
              </div>
            )}
          </section>

          {archivedClassrooms.length > 0 ? (
            <section className="grid gap-4">
              <h2 className="font-display text-lg font-extrabold text-slate-800">Đã lưu trữ</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {archivedClassrooms.map((classroom, index) => (
                  <AnimatedEntrance key={classroom.id} variant="random" staggerIndex={index}>
                    <ClassroomManagementCard
                      classroom={classroom}
                      isActive={activeId === classroom.id}
                      busy={busy}
                      hydrateError={hydrateErrors[classroom.id]}
                      hasCloudBackupPermission={hasCloudBackupPermission}
                      onRetryHydrate={() => void retryHydrateClassroom(classroom.id)}
                      onSwitch={() => void handleSwitch(classroom.id)}
                      onManage={() =>
                        router.push(`/classrooms/manage?id=${encodeURIComponent(classroom.id)}`)
                      }
                      onDuplicate={() => {}}
                      onArchive={() => {}}
                      onDelete={() => {
                        setTarget(classroom)
                        setDeleteInput('')
                        setModal('delete')
                      }}
                      onRestore={() => void handleRestore(classroom)}
                    />
                  </AnimatedEntrance>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <CloudRestoreCard
        reloadKey={String(refreshKey)}
        importFromCloudPayload={(payload, cloudAssets) => restoreFromCloudPayload(payload, cloudAssets)}
        onRestored={() => bumpList()}
      />

      <ModalShell open={modal === 'create'} title="Thêm lớp mới" onClose={closeModal}>
        <div className="grid gap-4">
          <Field label="Tên lớp">
            <div className="relative">
              <School className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                value={createDraft.className}
                onChange={(e) => setCreateDraft({ ...createDraft, className: e.target.value })}
                placeholder="Ví dụ: 2C"
              />
            </div>
          </Field>
          <Field label="Năm học">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                value={createDraft.schoolYear}
                onChange={(e) => setCreateDraft({ ...createDraft, schoolYear: e.target.value })}
                placeholder="VD: 2025-2026"
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <ClassroomButton variant="outline" onClick={closeModal}>
              Hủy
            </ClassroomButton>
            <ClassroomButton
              disabled={busy || !createDraft.className.trim() || !createDraft.schoolYear.trim()}
              onClick={() => void handleCreate()}
            >
              {busy ? 'Đang tạo...' : 'Tạo lớp'}
            </ClassroomButton>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={modal === 'duplicate'} title="Nhân bản lớp" onClose={closeModal}>
        <div className="grid gap-4">
          <Field label="Tên lớp mới">
            <Input
              value={dupDraft.className}
              onChange={(e) => setDupDraft({ ...dupDraft, className: e.target.value })}
              placeholder="VD: Lớp 3A"
            />
          </Field>
          <Field label="Năm học">
            <Input
              value={dupDraft.schoolYear}
              onChange={(e) => setDupDraft({ ...dupDraft, schoolYear: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(['settings-only', 'full-copy'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDupDraft({ ...dupDraft, mode })}
                className={cn(
                  'min-h-11 rounded-2xl border-2 p-3 text-left text-sm font-bold transition',
                  dupDraft.mode === mode
                    ? 'border-emerald-500 bg-emerald-50 text-slate-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300',
                )}
              >
                {mode === 'settings-only' ? 'Chỉ cài đặt' : 'Bản sao đầy đủ'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ClassroomButton variant="outline" onClick={closeModal}>
              Hủy
            </ClassroomButton>
            <ClassroomButton
              className="bg-emerald-500 hover:bg-emerald-600"
              disabled={busy || !dupDraft.className.trim()}
              onClick={() => void handleDuplicate()}
            >
              {busy ? 'Đang nhân bản...' : 'Nhân bản'}
            </ClassroomButton>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={modal === 'archive'} title="Lưu trữ lớp" onClose={closeModal}>
        <p className="text-sm font-semibold text-slate-600">
          Lớp <strong>{target?.className}</strong> sẽ được ẩn khỏi danh sách hoạt động. Bạn có thể khôi phục sau.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ClassroomButton variant="outline" onClick={closeModal}>
            Hủy
          </ClassroomButton>
          <ClassroomButton disabled={busy} onClick={() => void handleArchive()}>
            {busy ? 'Đang lưu trữ...' : 'Lưu trữ'}
          </ClassroomButton>
        </div>
      </ModalShell>

      <ModalShell open={modal === 'delete'} title="Xóa lớp vĩnh viễn" onClose={closeModal}>
        <p className="text-sm font-semibold text-rose-700">
          Hành động này không thể hoàn tác. Nhập tên lớp{' '}
          <strong>&quot;{target?.className}&quot;</strong> để xác nhận.
        </p>
        {!target?.archived ? (
          <p className="mt-2 text-sm font-semibold text-amber-700">
            Lớp phải được lưu trữ trước khi xóa vĩnh viễn.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3">
          <Field label="Xác nhận tên lớp">
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={target?.className}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <ClassroomButton variant="outline" onClick={closeModal}>
              Hủy
            </ClassroomButton>
            <ClassroomButton
              variant="danger"
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={busy || deleteInput !== target?.className || !target?.archived}
              onClick={() => void handleDelete()}
            >
              {busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </ClassroomButton>
          </div>
        </div>
      </ModalShell>

      <ModalShell open={modal === 'switch-prompt'} title="Chuyển sang lớp mới?" onClose={closeModal}>
        <p className="text-sm font-semibold text-slate-600">
          Lớp <strong>{createdClassroom?.className}</strong> đã được tạo. Bạn có muốn chuyển sang lớp này ngay không?
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ClassroomButton
            variant="outline"
            onClick={() => {
              setCreatedClassroom(null)
              closeModal()
            }}
          >
            Ở lại lớp hiện tại
          </ClassroomButton>
          <ClassroomButton disabled={busy} onClick={() => void handleSwitchToCreated()}>
            Chuyển sang lớp mới
          </ClassroomButton>
        </div>
      </ModalShell>
    </div>
  )
}
