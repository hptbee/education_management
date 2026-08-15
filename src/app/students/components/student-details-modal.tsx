'use client'

import { X, Star, Trophy, Target, Medal } from 'lucide-react'
import Link from 'next/link'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { getStudentBadges } from '@/src/utils/badges'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'
import {
  ACTIVITY_KIND_EMOJI,
  buildClassroomActivity,
  formatActivityDate,
} from '@/src/utils/activityHistory'

interface StudentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
}

export function StudentDetailsModal({ isOpen, onClose, student }: StudentDetailsModalProps) {
  const { data } = useAppData()

  if (!isOpen || !student) return null

  const teamName = student.teamId
    ? data?.teams.find((t) => t.id === student.teamId)?.name ?? 'Chưa có nhóm'
    : 'Chưa có nhóm'
  const assignedRoles = getStudentClassroomRoles(student, data?.classroomRoles ?? [])
  const awardedBadges = getStudentBadges(student, data?.badges ?? [])
  const recentActivity = data
    ? buildClassroomActivity(data)
        .filter(
          (entry) =>
            entry.studentId === student.id ||
            (entry.studentIds?.includes(student.id) ?? false),
        )
        .slice(0, 10)
    : []

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
                src={getStudentAvatar(student)}
                alt={student.name}
                className={`size-24 rounded-full object-cover ring-4 ${
                  student.gender === 'female' ? 'ring-pink-100' : 'ring-sky-100'
                }`}
              />
              <div>
                <h3 className="font-display text-2xl font-black text-slate-800">{student.name}</h3>
                <ClassroomRoleBadges roles={assignedRoles} className="mt-2 justify-start" size="md" />
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

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-brand-purple">
                  <Medal className="size-4" /> Huy hiệu
                </h4>
                <Link
                  href={`/recognition?tab=badges&studentId=${student.id}`}
                  onClick={onClose}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-200"
                >
                  Quản lý huy hiệu
                </Link>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                {awardedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {awardedBadges.map((badge) => (
                      <span
                        key={badge.id}
                        title={badge.description}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200"
                      >
                        <span>{badge.icon ?? '🏅'}</span>
                        {badge.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">Chưa có huy hiệu nào</p>
                )}
              </div>
            </section>

            {/* Private Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="flex flex-col gap-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-brand-purple">
                  <Target className="size-4" /> Thông tin Lớp học
                </h4>
                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm">
                  <p className="mb-2">
                    <span className="font-semibold text-slate-500">Vai trò trong lớp: </span>
                    {assignedRoles.length > 0 ? (
                      <span className="inline-flex flex-wrap gap-1">
                        {assignedRoles.map((role) => (
                          <span key={role.id} className="rounded-full bg-pastel-sky px-2 py-0.5 text-xs font-bold text-sky-800">
                            {role.icon ? `${role.icon} ` : ''}{role.name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      'Học sinh'
                    )}
                  </p>
                  <p className="mb-2"><span className="font-semibold text-slate-500">Tổ/Nhóm: </span> {teamName}</p>
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

            <section className="flex flex-col gap-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-brand-purple">
                <Medal className="size-4" /> Hoạt động gần đây
              </h4>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                {recentActivity.length > 0 ? (
                  <ul className="divide-y divide-sky-50">
                    {recentActivity.map((entry) => (
                      <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">
                            {ACTIVITY_KIND_EMOJI[entry.kind]} {entry.title}
                          </p>
                          {entry.subtitle ? (
                            <p className="mt-0.5 text-xs font-medium text-slate-500">{entry.subtitle}</p>
                          ) : null}
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                            {formatActivityDate(entry.createdAt)}
                          </p>
                        </div>
                        {entry.points !== undefined ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                              entry.points > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.points < 0
                                  ? 'bg-pastel-pink text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry.points > 0 ? '+' : ''}
                            {entry.points}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">Chưa có hoạt động nào.</p>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
