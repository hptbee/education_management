'use client'

import { Calendar, Save, School, UserCircle } from 'lucide-react'
import { Field, Input } from '@/src/components/ui'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { ClassroomRolesSection } from './classroom-roles-section'
import { HomeBannerSection } from './home-banner-section'
import { SETTINGS_TABS } from './settings-flags'
import { TeacherProfileAvatar } from './teacher-profile-avatar'

interface ProfileSectionProps {
  teacherDraft: { name: string }
  classroomDraft: { className: string }
  schoolYear: string
  isDirty: boolean
  onTeacherDraftChange: (draft: { name: string }) => void
  onClassroomDraftChange: (draft: { className: string }) => void
  onSaveProfile: () => void
  onSaved: () => void
  onError: (message: string | null) => void
  onGoToDataTab?: () => void
}

function SectionDivider() {
  return <div className="border-t border-sky-50" role="separator" />
}

export function ProfileSection({
  teacherDraft,
  classroomDraft,
  schoolYear,
  isDirty,
  onTeacherDraftChange,
  onClassroomDraftChange,
  onSaveProfile,
  onSaved,
  onError,
  onGoToDataTab,
}: ProfileSectionProps) {
  const canSave =
    isDirty && teacherDraft.name.trim().length > 0 && classroomDraft.className.trim().length > 0

  return (
    <div className="grid gap-4">
      <ClassroomCard className="overflow-hidden p-0">
        {/* Identity */}
        <section className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Hồ sơ lớp học</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Tên, ảnh hiển thị trên sidebar và trang chủ
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,200px),1fr] lg:items-start">
            <TeacherProfileAvatar layout="inline" onSaved={onSaved} onError={onError} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên giáo viên">
                <div className="relative">
                  <UserCircle className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-10"
                    value={teacherDraft.name}
                    onChange={(e) => onTeacherDraftChange({ name: e.target.value })}
                    placeholder="Ví dụ: Cô Thu"
                  />
                </div>
              </Field>

              <Field label="Tên lớp (hiển thị)">
                <div className="relative">
                  <School className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-10"
                    value={classroomDraft.className}
                    onChange={(e) => onClassroomDraftChange({ className: e.target.value })}
                    placeholder="Ví dụ: Lớp 2C"
                  />
                </div>
              </Field>

              <div className="flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-3 sm:col-span-2">
                <Calendar className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="text-sm font-semibold text-slate-600">Năm học: {schoolYear}</span>
                {SETTINGS_TABS.showDataTab && onGoToDataTab ? (
                  <button
                    type="button"
                    onClick={onGoToDataTab}
                    className="ml-auto text-xs font-bold text-brand hover:underline"
                  >
                    Đổi năm học
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* Banner + Roles side by side on wide screens */}
        <section className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2 xl:items-start xl:gap-8">
          <div className="min-w-0">
            <HomeBannerSection embedded onSaved={onSaved} onError={onError} />
          </div>
          {SETTINGS_TABS.mergeProfileAndRoles ? (
            <div className="min-w-0">
              <ClassroomRolesSection embedded />
            </div>
          ) : null}
        </section>

        {!isDirty ? (
          <div className="border-t border-sky-50 bg-surface-soft/50 px-5 py-3 sm:px-6">
            <p className="text-xs font-semibold text-slate-400">Đã đồng bộ với sidebar</p>
          </div>
        ) : null}
      </ClassroomCard>

      {isDirty ? (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:px-5">
          <p className="text-sm font-bold text-slate-600">Có thay đổi chưa lưu</p>
          <ClassroomButton className="min-w-[140px]" onClick={onSaveProfile} disabled={!canSave}>
            <Save className="size-4" />
            Lưu thay đổi
          </ClassroomButton>
        </div>
      ) : null}
    </div>
  )
}
