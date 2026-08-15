'use client'

import { useMemo, useState } from 'react'
import { Minus, PartyPopper, Plus, Star } from 'lucide-react'
import type { ClassroomRole, Recognition, RecognitionTitle, Student, Team } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { createId } from '@/src/utils/id'
import { getStudentAvatar } from '@/src/utils/student'
import { resolveBadgeIdForTitle } from '@/src/utils/recognition'
import { ClassroomButton, ClassroomCard, EmptyState } from '@/src/components/classroom'
import { RecognitionStudentPicker } from './recognition-student-picker'
import { CelebrationOverlay } from './celebration-overlay'

interface RecognitionFormSectionProps {
  students: Student[]
  teams: Team[]
  classroomRoles: ClassroomRole[]
  titles: RecognitionTitle[]
  onGoToTitles: () => void
}

export function RecognitionFormSection({
  students,
  teams,
  classroomRoles,
  titles,
  onGoToTitles,
}: RecognitionFormSectionProps) {
  const { recognizeStudents, saveRecognitionTitle, data } = useAppData()
  const badges = data?.badges ?? []

  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedTitleId, setSelectedTitleId] = useState('')
  const [message, setMessage] = useState('')
  const [awardPoints, setAwardPoints] = useState(true)
  const [pointsAmount, setPointsAmount] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [celebrationRecords, setCelebrationRecords] = useState<Recognition[] | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickIcon, setQuickIcon] = useState('🌟')

  const activeTitles = useMemo(() => titles.filter((t) => t.isActive), [titles])

  const selectedTitle = activeTitles.find((t) => t.id === selectedTitleId)
  const linkedBadge = useMemo(() => {
    if (!selectedTitle) return null
    const badgeId = resolveBadgeIdForTitle(selectedTitle, badges)
    return badges.find((b) => b.id === badgeId) ?? null
  }, [selectedTitle, badges])
  const selectedStudents = useMemo(
    () => selectedIds.map((id) => students.find((s) => s.id === id)).filter((s): s is Student => Boolean(s)),
    [selectedIds, students],
  )

  const canSubmit = selectedIds.length > 0 && selectedTitleId && !submitting

  const resetForm = () => {
    setSelectedIds([])
    setSelectedTitleId('')
    setMessage('')
    setAwardPoints(true)
    setPointsAmount(5)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const created = recognizeStudents({
        studentIds: selectedIds,
        titleId: selectedTitleId,
        message: message.trim() || undefined,
        awardedPoints: awardPoints ? pointsAmount : 0,
      })
      if (created.length > 0) {
        setCelebrationRecords(created)
        resetForm()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickAddTitle = () => {
    if (!quickName.trim()) return
    const now = new Date().toISOString()
    const title: RecognitionTitle = {
      id: createId('recognition-title'),
      name: quickName.trim(),
      icon: quickIcon,
      isActive: true,
      createdAt: now,
    }
    saveRecognitionTitle(title)
    setSelectedTitleId(title.id)
    setQuickAddOpen(false)
    setQuickName('')
    setQuickIcon('🌟')
  }

  if (students.length === 0) {
    return (
      <EmptyState
        emoji="🧑‍🎓"
        title="Chưa có học sinh nào trong lớp"
        description="Hãy thêm học sinh trước khi tuyên dương."
      />
    )
  }

  return (
    <>
      <ClassroomCard>
        <div className="mb-6">
          <h2 className="font-display text-lg font-black text-slate-800">Bước 1: Chọn học sinh</h2>
          <p className="text-sm font-semibold text-slate-500">Chọn một hoặc nhiều học sinh để tuyên dương</p>
          <div className="mt-4">
            <RecognitionStudentPicker
              students={students}
              teams={teams}
              classroomRoles={classroomRoles}
              mode={mode}
              onModeChange={setMode}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
            />
          </div>
        </div>

        <div className="mb-6 border-t border-sky-100 pt-6">
          <h2 className="font-display text-lg font-black text-slate-800">Bước 2: Chọn danh hiệu</h2>
          <p className="text-sm font-semibold text-slate-500">Chọn danh hiệu phù hợp với thành tích</p>

          {activeTitles.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-brand/20 bg-brand-soft px-4 py-8 text-center">
              <p className="text-sm font-semibold text-brand-dark">Chưa có danh hiệu nào đang hoạt động</p>
              <ClassroomButton variant="secondary" className="mt-4" onClick={onGoToTitles}>
                Tạo danh hiệu đầu tiên
              </ClassroomButton>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {activeTitles.map((title) => {
                const isSelected = title.id === selectedTitleId
                return (
                  <button
                    key={title.id}
                    type="button"
                    onClick={() => setSelectedTitleId(title.id)}
                    className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center transition hover:-translate-y-0.5 ${
                      isSelected
                        ? 'border-brand bg-pastel-sky shadow-sm'
                        : 'border-sky-100 bg-white hover:border-accent-pink/40 hover:bg-pastel-pink/40'
                    }`}
                  >
                    <span className="text-2xl">{title.icon ?? '🌟'}</span>
                    <p className="mt-2 text-xs font-extrabold text-slate-800">{title.name}</p>
                  </button>
                )
              })}
            </div>
          )}

          {quickAddOpen ? (
            <div className="mt-4 flex flex-wrap items-end gap-2 rounded-2xl bg-slate-50 p-3">
              <input
                value={quickIcon}
                onChange={(e) => setQuickIcon(e.target.value)}
                className="classroom-field w-16 px-2 text-center text-xl"
                maxLength={2}
              />
              <input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Tên danh hiệu mới..."
                className="classroom-field min-w-[180px] flex-1 px-4"
              />
              <ClassroomButton size="sm" onClick={handleQuickAddTitle}>
                Lưu
              </ClassroomButton>
              <ClassroomButton size="sm" variant="ghost" onClick={() => setQuickAddOpen(false)}>
                Hủy
              </ClassroomButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="mt-3 text-sm font-bold text-brand hover:underline"
            >
              + Thêm danh hiệu nhanh
            </button>
          )}
        </div>

        <div className="mb-6 border-t border-sky-100 pt-6">
          <h2 className="font-display text-lg font-black text-slate-800">Bước 3: Lời khen</h2>
          <p className="text-sm font-semibold text-slate-500">Viết lời khen ấm áp cho học sinh (tuỳ chọn)</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Hôm nay con đã rất chăm chỉ phát biểu và giúp đỡ các bạn trong lớp!"
            className="classroom-field mt-3 px-4"
          />
        </div>

        <div className="mb-6 border-t border-sky-100 pt-6">
          <h2 className="font-display text-lg font-black text-slate-800">Bước 4: Điểm thưởng</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAwardPoints(false)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                !awardPoints ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-sky-100'
              }`}
            >
              Không cộng điểm
            </button>
            <button
              type="button"
              onClick={() => setAwardPoints(true)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                awardPoints ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-sky-100'
              }`}
            >
              Cộng điểm
            </button>
          </div>
          {awardPoints ? (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPointsAmount((p) => Math.max(1, p - 1))}
                className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand hover:bg-pastel-sky"
              >
                <Minus className="size-4" />
              </button>
              <span className="flex min-w-[3rem] items-center justify-center gap-1 text-xl font-black text-amber-700">
                <Star className="size-5 fill-star text-star" />
                {pointsAmount}
              </span>
              <button
                type="button"
                onClick={() => setPointsAmount((p) => p + 1)}
                className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand hover:bg-pastel-sky"
              >
                <Plus className="size-4" />
              </button>
              <span className="text-sm font-semibold text-slate-500">điểm / học sinh</span>
            </div>
          ) : null}
        </div>

        {selectedStudents.length > 0 && selectedTitle ? (
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-pastel-sky/50 via-white to-pastel-pink/30 p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-black text-slate-800">
              <PartyPopper className="size-5 text-amber-600" />
              Xem trước
            </h3>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-bold text-slate-600">
                {selectedTitle.icon} {selectedTitle.name}
              </p>
              {selectedStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-3">
                  <img
                    src={getStudentAvatar(student)}
                    alt=""
                    className="size-10 rounded-full object-cover ring-2 ring-white"
                  />
                  <span className="font-extrabold text-slate-800">{student.name}</span>
                </div>
              ))}
              {message.trim() ? (
                <p className="text-sm font-semibold italic text-slate-600">&ldquo;{message.trim()}&rdquo;</p>
              ) : null}
              {awardPoints ? (
                <p className="text-sm font-extrabold text-amber-800">⭐ +{pointsAmount} điểm</p>
              ) : null}
              {linkedBadge ? (
                <p className="text-sm font-extrabold text-brand-dark">
                  🏅 Trao huy hiệu: {linkedBadge.icon} {linkedBadge.name}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <ClassroomButton size="lg" disabled={!canSubmit} onClick={handleSubmit}>
                <PartyPopper className="size-4" />
                {submitting ? 'Đang tuyên dương...' : 'Tuyên dương'}
              </ClassroomButton>
            </div>
          </div>
        ) : null}
      </ClassroomCard>

      {celebrationRecords && data ? (
        <CelebrationOverlay
          recognitions={celebrationRecords}
          students={students}
          badges={badges}
          animationsEnabled={data.appSettings.animationsEnabled}
          onClose={() => setCelebrationRecords(null)}
          onRecognizeMore={() => setCelebrationRecords(null)}
        />
      ) : null}
    </>
  )
}
