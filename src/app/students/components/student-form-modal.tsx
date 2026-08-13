'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { createId } from '@/src/utils/id'

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  gender: 'unknown',
  father: { fullName: '', phoneNumber: '' },
  mother: { fullName: '', phoneNumber: '' },
})

export function StudentFormModal({ isOpen, onClose, onSave, initialData }: StudentFormModalProps) {
  const [formData, setFormData] = useState<Student>(defaultStudent())

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          father: initialData.father || { fullName: '', phoneNumber: '' },
          mother: initialData.mother || { fullName: '', phoneNumber: '' }
        })
      } else {
        setFormData(defaultStudent())
      }
    }
  }, [isOpen, initialData])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Section 1: Basic */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin cơ bản</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Họ và tên *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" placeholder="Ví dụ: Nguyễn Văn A" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Ngày sinh</label>
                  <input value={formData.dateOfBirth || ''} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} type="date" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Giới tính</label>
                  <select value={formData.gender || 'unknown'} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple">
                    <option value="unknown">Chưa rõ</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Quê quán</label>
                  <input value={formData.hometown || ''} onChange={e => setFormData({...formData, hometown: e.target.value})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" placeholder="Ví dụ: Hà Nội" />
                </div>
              </div>
            </section>

            {/* Section 2: Academic & Class */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin lớp học</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Lớp cũ</label>
                  <input value={formData.previousClass || ''} onChange={e => setFormData({...formData, previousClass: e.target.value})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Vai trò (Lớp trưởng, vv)</label>
                  <input value={formData.classroomRole || ''} onChange={e => setFormData({...formData, classroomRole: e.target.value})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Thành tích / Ghi chú</label>
                  <textarea value={formData.potentialNote || ''} onChange={e => setFormData({...formData, potentialNote: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" rows={2} />
                </div>
              </div>
            </section>

            {/* Section 3: Parents */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-brand-purple">Thông tin Phụ huynh</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Họ tên Cha</label>
                  <input value={formData.father?.fullName || ''} onChange={e => setFormData({...formData, father: { ...formData.father, fullName: e.target.value }})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">SĐT Cha</label>
                  <input value={formData.father?.phoneNumber || ''} onChange={e => setFormData({...formData, father: { ...formData.father, phoneNumber: e.target.value }})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Họ tên Mẹ</label>
                  <input value={formData.mother?.fullName || ''} onChange={e => setFormData({...formData, mother: { ...formData.mother, fullName: e.target.value }})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">SĐT Mẹ</label>
                  <input value={formData.mother?.phoneNumber || ''} onChange={e => setFormData({...formData, mother: { ...formData.mother, phoneNumber: e.target.value }})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">SĐT Liên hệ chính</label>
                  <input value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} type="text" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-purple" />
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
