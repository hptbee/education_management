'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, PencilLine, Plus, Trash2 } from 'lucide-react'
import type { ClassroomRole } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'
import { ClassroomButton, ClassroomCard, ClassroomDialogFrame } from '@/src/components/classroom'
import { cn } from '@/lib/utils'

function RoleFormDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (role: ClassroomRole) => void
  initialData?: ClassroomRole | null
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '')
      setIcon(initialData?.icon ?? '⭐')
      setDescription(initialData?.description ?? '')
    }
  }, [isOpen, initialData])

  return (
    <ClassroomDialogFrame
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="role-form-title"
      panelClassName="max-w-md"
    >
      <div className="w-full rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-slate-100 p-5">
          <h2 id="role-form-title" className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa vai trò' : 'Thêm vai trò mới'}
          </h2>
        </header>
        <form
          className="grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const now = new Date().toISOString()
            onSave({
              id: initialData?.id ?? createId('classroom-role'),
              name: name.trim(),
              icon: icon.trim() || undefined,
              description: description.trim() || undefined,
              createdAt: initialData?.createdAt ?? now,
            })
            onClose()
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Biểu tượng</label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="classroom-field w-20 px-3 text-center text-2xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên vai trò *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Thủ quỹ"
              className="classroom-field px-4"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="classroom-field px-4"
            />
          </div>
          <div className="flex justify-end gap-2">
            <ClassroomButton type="button" variant="ghost" onClick={onClose}>
              Hủy
            </ClassroomButton>
            <ClassroomButton type="submit">Lưu</ClassroomButton>
          </div>
        </form>
      </div>
    </ClassroomDialogFrame>
  )
}

export function ClassroomRolesSection({ embedded = false }: { embedded?: boolean }) {
  const { data, saveClassroomRole, deleteClassroomRole } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<ClassroomRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassroomRole | null>(null)
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])
  const roles = data?.classroomRoles ?? []

  const openCreate = () => {
    setEditingRole(null)
    setFormOpen(true)
  }

  const openEdit = (role: ClassroomRole) => {
    setEditingRole(role)
    setFormOpen(true)
  }

  const roleList = (
    <div className="grid gap-2">
      {roles.map((role) => (
        <div
          key={role.id}
          className={cn(
            'flex items-center gap-3 rounded-2xl border border-slate-100 bg-surface-soft px-3 py-2.5',
            embedded && 'bg-white',
          )}
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl">
            {role.icon ?? '⭐'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-800">{role.name}</p>
            {role.description ? (
              <p className="truncate text-xs font-semibold text-slate-500">{role.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <ClassroomButton
              variant="ghost"
              size="sm"
              onClick={() => openEdit(role)}
              title="Chỉnh sửa"
              aria-label={`Chỉnh sửa vai trò ${role.name}`}
            >
              <PencilLine className="size-4" />
            </ClassroomButton>
            <ClassroomButton
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(role)}
              title="Xóa"
              aria-label={`Xóa vai trò ${role.name}`}
              className="text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="size-4" />
            </ClassroomButton>
          </div>
        </div>
      ))}

      <ClassroomButton
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={openCreate}
      >
        <Plus className="size-4" />
        Thêm vai trò
      </ClassroomButton>
    </div>
  )

  const dialogs = (
    <>
      {formOpen ? (
        <RoleFormDialog
          isOpen={formOpen}
          initialData={editingRole}
          onClose={() => setFormOpen(false)}
          onSave={(role) => {
            saveClassroomRole(role)
            setFormOpen(false)
          }}
        />
      ) : null}

      <ClassroomDialogFrame
        open={deleteTarget !== null}
        onClose={cancelDelete}
        ariaLabelledBy="delete-role-title"
        panelClassName="max-w-md"
      >
        {deleteTarget ? (
          <div className="w-full rounded-3xl bg-white p-6 shadow-2xl">
            <h3 id="delete-role-title" className="font-display text-lg font-extrabold text-rose-600">Xóa vai trò?</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Vai trò <strong>{deleteTarget.name}</strong> sẽ bị xóa khỏi lớp và gỡ khỏi tất cả học sinh đang được gán.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <ClassroomButton variant="ghost" onClick={cancelDelete}>
                Hủy
              </ClassroomButton>
              <ClassroomButton
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => {
                  deleteClassroomRole(deleteTarget.id)
                  setDeleteTarget(null)
                }}
              >
                Xóa vai trò
              </ClassroomButton>
            </div>
          </div>
        ) : null}
      </ClassroomDialogFrame>
    </>
  )

  if (embedded) {
    return (
      <div className="flex min-w-0 flex-col">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="size-4 text-brand" aria-hidden />
          <div>
            <h3 className="font-display text-base font-extrabold text-slate-800">Vai trò trong lớp</h3>
            <p className="text-xs font-semibold text-slate-500">Gán cho học sinh ở trang Học sinh</p>
          </div>
        </div>
        {roleList}
        {dialogs}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <ClassroomCard>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-light text-white shadow-sm">
            <Crown className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Vai trò trong lớp</h2>
            <p className="text-sm font-semibold text-slate-500">Tùy chỉnh các vai trò cán bộ lớp cho học sinh</p>
          </div>
        </div>
      </ClassroomCard>
      {roleList}
      {dialogs}
    </div>
  )
}
