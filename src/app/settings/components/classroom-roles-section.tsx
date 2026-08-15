'use client'

import { useEffect, useState } from 'react'
import { Crown, PencilLine, Plus, Trash2 } from 'lucide-react'
import type { ClassroomRole } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
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
              className="w-20 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-2xl outline-none focus:border-brand-purple"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Tên vai trò *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Thủ quỹ"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
              Hủy
            </button>
            <button type="submit" className="rounded-xl bg-brand-purple px-5 py-2 text-sm font-bold text-white hover:bg-brand-purple-dark">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ClassroomRolesSection() {
  const { data, saveClassroomRole, deleteClassroomRole } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<ClassroomRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassroomRole | null>(null)

  const roles = data?.classroomRoles ?? []

  const openCreate = () => {
    setEditingRole(null)
    setFormOpen(true)
  }

  const openEdit = (role: ClassroomRole) => {
    setEditingRole(role)
    setFormOpen(true)
  }

  return (
    <div className="grid gap-4">
      <CardHeader />

      <div className="grid gap-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-4 rounded-2xl border border-[#e8e3ff] bg-white/90 p-4"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-[#f3efff] text-2xl">
              {role.icon ?? '⭐'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#273055]">{role.name}</p>
              {role.description ? (
                <p className="mt-0.5 text-sm font-semibold text-[#6a6f91]">{role.description}</p>
              ) : null}
            </div>
            <button
              onClick={() => openEdit(role)}
              className="flex size-9 items-center justify-center rounded-xl text-[#7c5cff] transition hover:bg-[#f3efff]"
              title="Chỉnh sửa"
            >
              <PencilLine size={18} />
            </button>
            <button
              onClick={() => setDeleteTarget(role)}
              className="flex size-9 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50"
              title="Xóa"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openCreate}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d9d2ff] bg-[#fbfbff] px-5 py-4 text-sm font-extrabold text-[#7c5cff] transition hover:border-[#7c5cff] hover:bg-[#f3efff]"
      >
        <Plus size={18} /> Thêm vai trò
      </button>

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

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-rose-600">Xóa vai trò?</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Vai trò <strong>{deleteTarget.name}</strong> sẽ bị xóa khỏi lớp và gỡ khỏi tất cả học sinh đang được gán.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  deleteClassroomRole(deleteTarget.id)
                  setDeleteTarget(null)
                }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                Xóa vai trò
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CardHeader() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/90 p-5 border border-[#e8e3ff]">
      <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#5a90ef] text-white text-3xl shadow-lg">
        <Crown size={28} />
      </div>
      <div>
        <h2 className="text-xl font-black text-[#273055]">Vai trò trong lớp</h2>
        <p className="text-sm text-[#6a6f91]">Tùy chỉnh các vai trò cán bộ lớp cho học sinh</p>
      </div>
    </div>
  )
}
