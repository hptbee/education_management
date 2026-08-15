'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { TEACHER_AVATAR, readTeacherAvatarImage, teacherAvatarSizeHint } from '@/src/utils/images'

export function TeacherProfileAvatar({
  onSaved,
  onError,
}: {
  onSaved: () => void
  onError: (message: string | null) => void
}) {
  const { data, updateTeacherProfile } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const teacher = data.classroomSettings.teacher
  const hasCustomAvatar = Boolean(teacher.avatar?.trim())

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    onError(null)
    try {
      const image = await readTeacherAvatarImage(file)
      updateTeacherProfile({ avatar: image })
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không tải được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = () => {
    updateTeacherProfile({ avatar: undefined })
    onError(null)
    onSaved()
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Đổi ảnh đại diện giáo viên"
          className="group relative"
        >
          <TeacherAvatar
            src={teacher.avatar}
            name={teacher.name}
            className="size-24 rounded-[35%] text-5xl shadow-sm ring-4 ring-white"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-[35%] bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ImagePlus className="size-6 text-white" />
          </span>
        </button>
        {hasCustomAvatar ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="absolute -bottom-1 -right-1 rounded-full bg-rose-100 p-1.5 text-rose-600 shadow-sm transition hover:bg-rose-200"
            title="Xóa ảnh đại diện"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="mt-3 text-xs font-bold text-slate-600">
        {busy ? 'Đang tải ảnh...' : 'Click vào ảnh để đổi ảnh đại diện'}
      </p>
      <p className="mt-1 text-center text-[11px] font-semibold text-slate-400">
        Tốt nhất: {teacherAvatarSizeHint()} · PNG, JPG, WEBP · tối đa {TEACHER_AVATAR.maxFileBytes / (1024 * 1024)} MB
      </p>
    </div>
  )
}
