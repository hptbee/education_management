'use client'

import { useMemo } from 'react'
import { X, Star, Trophy, Target, Medal, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Student } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import { getStudentClassroomRoles } from '@/src/utils/classroomRoles'
import { getStudentBadges } from '@/src/utils/badges'
import { IconTouchButton, ClassroomDialogFrame } from '@/src/components/classroom'
import { ClassroomRoleBadges } from '@/src/components/ClassroomRoleBadges'
import { BadgeToggleGrid } from '@/src/app/recognition/components/badge-toggle-grid'
import {
  ACTIVITY_KIND_EMOJI,
  buildClassroomActivity,
  formatActivityDate,
} from '@/src/utils/activityHistory'

interface StudentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  onEdit?: (student: Student) => void
  onDelete?: (student: Student) => void
}

export function StudentDetailsModal({ isOpen, onClose, student, onEdit, onDelete }: StudentDetailsModalProps) {
  const { data, toggleStudentBadge } = useAppData()
  const classroomId = data?.metadata.id
  const badges = data?.badges ?? []

  const liveStudent = useMemo(() => {
    if (!student) return null
    return data?.students.find((s) => s.id === student.id) ?? student
  }, [data?.students, student])

  const teamName = liveStudent?.teamId
    ? data?.teams.find((t) => t.id === liveStudent.teamId)?.name ?? 'Chưa có nhóm'
    : 'Chưa có nhóm'
  const assignedRoles = liveStudent ? getStudentClassroomRoles(liveStudent, data?.classroomRoles ?? []) : []
  const awardedBadges = liveStudent ? getStudentBadges(liveStudent, data?.badges ?? []) : []
  const recentActivity = liveStudent && data
    ? buildClassroomActivity(data)
        .filter(
          (entry) =>
            entry.studentId === liveStudent.id ||
            (entry.studentIds?.includes(liveStudent.id) ?? false),
        )
        .slice(0, 10)
    : []

  let genderDisplay = ''
  if (liveStudent?.gender === 'female') genderDisplay = 'Nữ'
  else if (liveStudent?.gender === 'male') genderDisplay = 'Nam'
  else if (liveStudent?.gender === 'other') genderDisplay = 'Khác'
  else genderDisplay = 'Chưa rõ'

  return (
    <ClassroomDialogFrame
      open={isOpen && Boolean(student && liveStudent)}
      onClose={onClose}
      ariaLabelledBy="student-details-title"
      panelClassName="max-w-2xl"
    >
      {student && liveStudent ? (
        <div className="flex max-h-[90vh] w-full flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 id="student-details-title" className="font-display text-xl font-extrabold text-slate-800">
            Hồ sơ học sinh
          </h2>
          <div className="flex items-center gap-1">
            {onEdit ? (
              <IconTouchButton
                onClick={() => onEdit(liveStudent)}
                aria-label="Chỉnh sửa học sinh"
                className="text-slate-400 hover:bg-slate-100 hover:text-brand"
              >
                <Edit2 className="size-5" />
              </IconTouchButton>
            ) : null}
            {onDelete ? (
              <IconTouchButton
                onClick={() => onDelete(liveStudent)}
                aria-label="Xóa học sinh"
                className="text-slate-400 hover:bg-slate-100 hover:text-rose-500"
              >
                <Trash2 className="size-5" />
              </IconTouchButton>
            ) : null}
            <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="size-5" />
            </IconTouchButton>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="flex flex-col gap-8">
            
            {/* Header Profile */}
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-start">
              <StudentAvatar
                student={liveStudent}
                classroomId={classroomId}
                alt={liveStudent.name}
                className={`size-24 rounded-full ring-4 ${
                  liveStudent.gender === 'female' ? 'ring-pink-100' : 'ring-sky-100'
                }`}
              />
              <div>
                <h3 className="font-display text-2xl font-black text-slate-800">{liveStudent.name}</h3>
                <ClassroomRoleBadges roles={assignedRoles} className="mt-2 justify-start" size="md" />
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {genderDisplay} {liveStudent.dateOfBirth ? `• Sinh ngày: ${liveStudent.dateOfBirth}` : ''}
                </p>
                <div className="mt-3 flex gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-600">
                    <Star className="size-4 fill-amber-500" />
                    {liveStudent.points} điểm
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-extrabold text-rose-600">
                    <Trophy className="size-4" />
                    {liveStudent.totalRewards} quà tặng
                  </div>
                </div>
              </div>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-brand-purple">
                  <Medal className="size-4" /> Huy hiệu
                  {awardedBadges.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                      {awardedBadges.length}
                    </span>
                  ) : null}
                </h4>
                <Link
                  href={`/recognition?tab=catalog&studentId=${liveStudent.id}`}
                  onClick={onClose}
                  className="text-xs font-bold text-brand transition hover:text-brand-dark hover:underline"
                >
                  Thao huy hiệu
                </Link>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-3 text-xs font-semibold text-slate-500">
                  Bấm huy hiệu để trao hoặc thu hồi
                </p>
                <BadgeToggleGrid
                  compact
                  badges={badges}
                  student={liveStudent}
                  onToggle={(badgeId) => toggleStudentBadge(liveStudent.id, badgeId)}
                />
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
                  <p className="mb-2"><span className="font-semibold text-slate-500">Lớp cũ: </span> {liveStudent.previousClass || 'Trống'}</p>
                  <p className="mb-2"><span className="font-semibold text-slate-500">Thành tích cũ: </span> {liveStudent.previousAchievements || 'Trống'}</p>
                  <p><span className="font-semibold text-slate-500">Ghi chú: </span> {liveStudent.potentialNote || 'Trống'}</p>
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-brand-purple">Thông tin Phụ huynh (Bảo mật)</h4>
                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm">
                  <div className="mb-2">
                    <p className="font-bold text-slate-700">Họ tên: <span className="font-normal text-slate-500">{liveStudent.parent?.fullName || 'Trống'}</span></p>
                  </div>
                  <div className="mb-2">
                    <p className="font-bold text-slate-700">SĐT: <span className="font-normal text-slate-500">{liveStudent.parent?.phoneNumber || 'Trống'}</span></p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Địa chỉ: <span className="font-normal text-slate-500">{liveStudent.address || 'Trống'}</span></p>
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
      ) : null}
    </ClassroomDialogFrame>
  )
}
