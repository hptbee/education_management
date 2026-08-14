'use client'

import { X, Star, Trophy, Target } from 'lucide-react'
import type { Student } from '@/src/types/models'

interface StudentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
}

export function StudentDetailsModal({ isOpen, onClose, student }: StudentDetailsModalProps) {
  if (!isOpen || !student) return null

  let genderDisplay = ''
  if (student.gender === 'female') genderDisplay = 'Nữ'
  else if (student.gender === 'male') genderDisplay = 'Nam'
  else if (student.gender === 'other') genderDisplay = 'Khác'
  else genderDisplay = 'Chưa rõ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            Hồ sơ học sinh
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="flex flex-col gap-8">
            
            {/* Header Profile */}
            <div className="flex items-center gap-5 rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <img
                src={student.avatar || '/placeholder.svg'}
                alt={student.name}
                className={`size-24 rounded-full object-cover ring-4 ${
                  student.gender === 'female' ? 'ring-pink-100' : 'ring-sky-100'
                }`}
              />
              <div>
                <h3 className="font-display text-2xl font-black text-slate-800">{student.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {genderDisplay} {student.dateOfBirth ? `• Sinh ngày: ${student.dateOfBirth}` : ''}
                </p>
                <div className="mt-3 flex gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-600">
                    <Star className="size-4 fill-amber-500" />
                    {student.points} điểm
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-extrabold text-rose-600">
                    <Trophy className="size-4" />
                    {student.totalRewards} quà tặng
                  </div>
                </div>
              </div>
            </div>

            {/* Private Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="flex flex-col gap-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-brand-purple">
                  <Target className="size-4" /> Thông tin Lớp học
                </h4>
                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm">
                  <p className="mb-2"><span className="font-semibold text-slate-500">Vai trò: </span> {student.classroomRole || 'Học sinh'}</p>
                  <p className="mb-2"><span className="font-semibold text-slate-500">Tổ/Nhóm: </span> {student.teamId ? `Team ${student.teamId}` : 'Chưa có nhóm'}</p>
                  <p className="mb-2"><span className="font-semibold text-slate-500">Lớp cũ: </span> {student.previousClass || 'Trống'}</p>
                  <p className="mb-2"><span className="font-semibold text-slate-500">Thành tích cũ: </span> {student.previousAchievements || 'Trống'}</p>
                  <p><span className="font-semibold text-slate-500">Ghi chú: </span> {student.potentialNote || 'Trống'}</p>
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-brand-purple">Thông tin Phụ huynh (Bảo mật)</h4>
                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm">
                  <div className="mb-2">
                    <p className="font-bold text-slate-700">Họ tên: <span className="font-normal text-slate-500">{student.parent?.fullName || 'Trống'}</span></p>
                  </div>
                  <div className="mb-2">
                    <p className="font-bold text-slate-700">SĐT: <span className="font-normal text-slate-500">{student.parent?.phoneNumber || 'Trống'}</span></p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Địa chỉ: <span className="font-normal text-slate-500">{student.address || 'Trống'}</span></p>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
