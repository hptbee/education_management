'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Trash2 } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { createId } from '@/src/utils/id'
import { getStudentAvatar } from '@/src/utils/student'
import { readStudentAvatarImage } from '@/src/utils/images'
import { useAppData } from '@/src/store/AppDataContext'
import { useClassroomDialog, ClassroomButton, IconTouchButton, useModalFocusTrap } from '@/src/components/classroom'

interface StudentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (student: Student) => void
  initialData?: Student | null
}

const defaultStudent = (): Student => ({
  id: createId('student'),
  name: '',
  points: 0,
  totalRewards: 0,
  classroomRoleIds: [],
  badgeIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  gender: 'unknown',
  parent: { fullName: '', phoneNumber: '' },
})

export function StudentFormModal({ isOpen, onClose, onSave, initialData }: StudentFormModalProps) {
  const { data } = useAppData()
  const { showAlert } = useClassroomDialog()
  const [formData, setFormData] = useState<Student>(defaultStudent())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const classroomRoles = data?.classroomRoles ?? []

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          classroomRoleIds: initialData.classroomRoleIds ?? [],
          parent: initialData.parent || { fullName: '', phoneNumber: '' }
        })
      } else {
        setFormData(defaultStudent())
      }
    }
  }, [isOpen, initialData])

  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    onSave({
      ...formData,
      updatedAt: new Date().toISOString()
    })
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64String = await readStudentAvatarImage(file)
      setFormData((prev) => ({ ...prev, avatar: base64String }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải ảnh.'
      await showAlert(message, { variant: 'error' })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: undefined }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleRole = (roleId: string) => {
    setFormData((prev) => {
      const current = prev.classroomRoleIds ?? []
      const next = current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
      return { ...prev, classroomRoleIds: next }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-form-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 id="student-form-title" className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
          </h2>
          <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Avatar Section */}
            <section className="flex flex-col items-center justify-center">
              <div className="relative group">
                <img
                  src={getStudentAvatar(formData)}
                  alt="Avatar preview"
                  className="size-24 rounded-full object-cover ring-4 ring-slate-100"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Upload className="size-6 text-white" />
                </button>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute bottom-0 right-0 rounded-full bg-red-100 p-1.5 text-red-600 shadow-sm transition hover:bg-red-200"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <ClassroomButton
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden />
                Đổi ảnh
              </ClassroomButton>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Hoặc bấm vào ảnh để chọn ảnh mới
              </p>
            </section>

            {/* Section 1: Basic */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin cơ bản</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Họ và tên *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="classroom-field px-4" placeholder="Ví dụ: Nguyễn Văn A" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Ngày sinh</label>
                  <input value={formData.dateOfBirth || ''} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} type="date" className="classroom-field px-4" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Giới tính</label>
                  <select value={formData.gender || 'unknown'} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="classroom-field px-4">
                    <option value="unknown">Chưa rõ</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Quê quán</label>
                  <input value={formData.hometown || ''} onChange={e => setFormData({...formData, hometown: e.target.value})} type="text" className="classroom-field px-4" placeholder="Ví dụ: Hà Nội" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Địa chỉ</label>
                  <input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} type="text" className="classroom-field px-4" placeholder="Ví dụ: Quận 1, TP. HCM" />
                </div>
              </div>
            </section>

            {/* Section 2: Academic & Class */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin lớp học</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Lớp cũ</label>
                  <input value={formData.previousClass || ''} onChange={e => setFormData({...formData, previousClass: e.target.value})} type="text" className="classroom-field px-4" />
                </div>
                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">Vai trò trong lớp</label>
                  {classroomRoles.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                      Chưa có vai trò nào. Thêm vai trò trong Cài đặt → Vai trò.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {classroomRoles.map((role) => {
                        const checked = (formData.classroomRoleIds ?? []).includes(role.id)
                        return (
                          <label
                            key={role.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                              checked
                                ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-purple/30'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRole(role.id)}
                              className="size-4 rounded border-slate-300 text-brand-purple focus:ring-brand-purple"
                            />
                            <span>{role.icon ? `${role.icon} ` : ''}{role.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Thành tích / Ghi chú</label>
                  <textarea value={formData.potentialNote || ''} onChange={e => setFormData({...formData, potentialNote: e.target.value})} className="classroom-field px-4" rows={2} />
                </div>
              </div>
            </section>

            {/* Section 3: Parents */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin Phụ huynh (Bảo mật)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Họ tên phụ huynh</label>
                  <input value={formData.parent?.fullName || ''} onChange={e => setFormData({...formData, parent: { ...formData.parent, fullName: e.target.value }})} type="text" className="classroom-field px-4" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Số điện thoại di động</label>
                  <input value={formData.parent?.phoneNumber || ''} onChange={e => setFormData({...formData, parent: { ...formData.parent, phoneNumber: e.target.value }})} type="text" className="classroom-field px-4" />
                </div>
              </div>
            </section>

          </form>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100">
            Hủy
          </button>
          <button form="student-form" type="submit" className="rounded-xl bg-brand-purple px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark">
            {initialData ? 'Lưu thay đổi' : 'Thêm học sinh'}
          </button>
        </footer>
      </div>
    </div>
  )
}
