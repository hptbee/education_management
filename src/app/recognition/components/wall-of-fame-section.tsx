'use client'

import { useCallback, useMemo, useState } from 'react'
import { PencilLine, Sprout, Star, Trash2 } from 'lucide-react'
import type { Recognition, Student, Team } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { StudentAvatar } from '@/src/components/StudentAvatar'
import {
  filterRecognitionsByTime,
  formatRecognitionRelativeDate,
  type RecognitionTimeFilter,
} from '@/src/utils/recognition'
import { ClassroomButton, EmptyState, useModalFocusTrap } from '@/src/components/classroom'

interface WallOfFameSectionProps {
  students: Student[]
  teams: Team[]
  onStartRecognition: () => void
  presentation?: boolean
}

export function WallOfFameSection({
  students,
  teams,
  onStartRecognition,
  presentation = false,
}: WallOfFameSectionProps) {
  const { data, updateRecognitionMessage, deleteRecognition } = useAppData()
  const classroomId = data?.metadata.id
  const recognitions = data?.recognitions ?? []
  const titles = data?.recognitionTitles ?? []

  const [timeFilter, setTimeFilter] = useState<RecognitionTimeFilter>('all')
  const [studentFilter, setStudentFilter] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [detailTarget, setDetailTarget] = useState<Recognition | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Recognition | null>(null)
  const closeDetail = useCallback(() => setDetailTarget(null), [])
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])
  const detailDialogRef = useModalFocusTrap(detailTarget !== null, closeDetail)
  const deleteDialogRef = useModalFocusTrap(deleteTarget !== null, cancelDelete)

  const filtered = useMemo(() => {
    let list = filterRecognitionsByTime(recognitions, timeFilter)

    if (studentFilter) {
      list = list.filter((r) => r.studentId === studentFilter)
    }
    if (titleFilter) {
      list = list.filter((r) => r.titleId === titleFilter || r.title === titleFilter)
    }
    if (teamFilter) {
      list = list.filter((r) => {
        const snapshotTeam = r.teamId
        if (snapshotTeam) return snapshotTeam === teamFilter
        const student = students.find((s) => s.id === r.studentId)
        return student?.teamId === teamFilter
      })
    }

    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [recognitions, timeFilter, studentFilter, titleFilter, teamFilter, students])

  const openDetail = (rec: Recognition) => {
    setDetailTarget(rec)
    setEditMessage(rec.message ?? '')
  }

  const getDisplayName = (rec: Recognition) => {
    const live = students.find((s) => s.id === rec.studentId)
    return live?.name ?? rec.studentName ?? 'Học sinh'
  }

  const getLiveStudent = (rec: Recognition) => students.find((s) => s.id === rec.studentId)

  const timeOptions: { id: RecognitionTimeFilter; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
    { id: 'all', label: 'Tất cả' },
  ]

  if (recognitions.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="Chưa có lời tuyên dương nào"
        description="Hãy bắt đầu ghi nhận những điều tốt đẹp của các bạn nhé!"
        action={
          presentation ? undefined : (
            <ClassroomButton onClick={onStartRecognition}>
              ✨ Tuyên dương đầu tiên
            </ClassroomButton>
          )
        }
      />
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {timeOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTimeFilter(opt.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              timeFilter === opt.id
                ? 'bg-brand text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-sky-100 hover:bg-brand-soft'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!presentation ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="classroom-field px-4"
        >
          <option value="">Tất cả học sinh</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={titleFilter}
          onChange={(e) => setTitleFilter(e.target.value)}
          className="classroom-field px-4"
        >
          <option value="">Tất cả danh hiệu</option>
          {[...new Set(recognitions.map((r) => r.titleId ?? r.title))].map((key) => {
            const title = titles.find((t) => t.id === key)
            const label = title?.name ?? recognitions.find((r) => r.title === key)?.title ?? key
            return (
              <option key={key} value={key}>
                {label}
              </option>
            )
          })}
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="classroom-field px-4"
        >
          <option value="">Cả lớp</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft py-10 text-center text-sm font-semibold text-brand-dark">
          Không có bản ghi nào phù hợp với bộ lọc.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rec) => {
            const liveStudent = getLiveStudent(rec)
            const cardClass =
              'flex flex-col items-center rounded-3xl border border-sky-100 bg-gradient-to-b from-white to-pastel-sky/40 p-5 text-center shadow-sm'
            const content = (
              <>
                <span className={presentation ? 'text-4xl' : 'text-2xl'}>{rec.titleIcon ?? '🌟'}</span>
                {liveStudent ? (
                  <StudentAvatar
                    student={liveStudent}
                    classroomId={classroomId}
                    alt=""
                    className={`mt-4 rounded-full ring-4 ring-white shadow-md ${
                      presentation ? 'size-24' : 'size-16'
                    }`}
                  />
                ) : (
                  <img
                    src="/placeholder.svg"
                    alt=""
                    className={`mt-4 rounded-full object-cover ring-4 ring-white shadow-md ${
                      presentation ? 'size-24' : 'size-16'
                    }`}
                  />
                )}
                <p
                  className={`mt-3 font-display font-black text-slate-800 ${
                    presentation ? 'text-2xl' : 'text-base'
                  }`}
                >
                  {getDisplayName(rec)}
                </p>
                <p className={`mt-1 font-extrabold text-amber-800 ${presentation ? 'text-lg' : 'text-sm'}`}>
                  🏆 {rec.title}
                </p>
                {rec.message ? (
                  <p
                    className={`mt-2 line-clamp-2 font-semibold text-slate-500 ${
                      presentation ? 'text-base' : 'text-xs'
                    }`}
                  >
                    &ldquo;{rec.message}&rdquo;
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    📅 {formatRecognitionRelativeDate(rec.createdAt)}
                  </span>
                  {rec.awardedPoints && rec.awardedPoints > 0 ? (
                    <span className="rounded-full bg-pastel-yellow px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                      ⭐ +{rec.awardedPoints}
                    </span>
                  ) : null}
                </div>
              </>
            )
            if (presentation) {
              return (
                <article key={rec.id} className={cardClass}>
                  {content}
                </article>
              )
            }
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => openDetail(rec)}
                className={`${cardClass} transition hover:-translate-y-0.5 hover:border-accent-pink/30 hover:shadow-md`}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}

      {!presentation && detailTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            ref={detailDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recognition-detail-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
          >
            <header className="border-b border-slate-100 p-5 text-center">
              {(() => {
                const liveStudent = detailTarget ? getLiveStudent(detailTarget) : undefined
                return liveStudent ? (
                  <StudentAvatar
                    student={liveStudent}
                    classroomId={classroomId}
                    alt=""
                    className="mx-auto size-20 rounded-full ring-4 ring-pastel-sky"
                  />
                ) : (
                  <img
                    src="/placeholder.svg"
                    alt=""
                    className="mx-auto size-20 rounded-full object-cover ring-4 ring-pastel-sky"
                  />
                )
              })()}
              <h3 id="recognition-detail-title" className="mt-3 font-display text-xl font-black text-slate-800">
                {getDisplayName(detailTarget)}
              </h3>
              <p className="mt-1 text-sm font-extrabold text-amber-800">
                {detailTarget.titleIcon} {detailTarget.title}
              </p>
            </header>
            <div className="grid gap-4 p-5">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-bold text-slate-700">
                  <PencilLine className="size-3.5" /> Lời khen
                </label>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  rows={3}
                  className="classroom-field px-4"
                />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                📅 {formatRecognitionRelativeDate(detailTarget.createdAt)}
                {detailTarget.awardedPoints ? ` · ⭐ +${detailTarget.awardedPoints} điểm` : ''}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(detailTarget)}
                  className="mr-auto flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" /> Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <ClassroomButton
                  onClick={() => {
                    updateRecognitionMessage(detailTarget.id, editMessage)
                    setDetailTarget(null)
                  }}
                >
                  Lưu lời khen
                </ClassroomButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!presentation && deleteTarget ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recognition-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 id="delete-recognition-title" className="text-lg font-black text-rose-600">Xóa bản ghi tuyên dương?</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Bản ghi tuyên dương cho <strong>{getDisplayName(deleteTarget)}</strong> sẽ bị xóa.
              {deleteTarget.awardedPoints && deleteTarget.awardedPoints > 0 ? (
                <>
                  {' '}
                  Điểm thưởng <strong>+{deleteTarget.awardedPoints}</strong> sẽ được hoàn tác một lần.
                </>
              ) : null}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  deleteRecognition(deleteTarget.id)
                  setDeleteTarget(null)
                  setDetailTarget(null)
                }}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                Xóa bản ghi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
