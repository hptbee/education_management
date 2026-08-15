'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { TEACHER_AVATAR, readTeacherAvatarImage, teacherAvatarSizeHint } from '@/src/utils/images'
import { cn } from '@/lib/utils'

export function TeacherProfileAvatar({
  onSaved,
  onError,
  layout = 'stacked',
}: {
  onSaved: () => void
  onError: (message: string | null) => void
  layout?: 'stacked' | 'inline'
}) {
  const { data, updateTeacherProfile } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const teacher = data.classroomSettings.teacher
  const hasCustomAvatar = Boolean(teacher.avatar?.trim())
  const inline = layout === 'inline'

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
    <div
      className={cn(
        'flex gap-4',
        inline ? 'flex-col items-center sm:flex-row sm:items-start' : 'flex-col items-center',
      )}
    >
      <div className="relative shrink-0">
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
            className={cn(
              'rounded-[35%] shadow-sm ring-4 ring-white',
              inline ? 'size-28 text-5xl' : 'size-24 text-5xl',
            )}
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

      <div className={cn(inline ? 'text-left sm:pt-1' : 'text-center')}>
        <p className="text-sm font-bold text-slate-700">
          {busy ? 'Đang tải...' : 'Ảnh đại diện'}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Bấm ảnh để đổi · lưu tự động</p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
          {teacherAvatarSizeHint()} · tối đa {TEACHER_AVATAR.maxFileBytes / (1024 * 1024)} MB
        </p>
      </div>
    </div>
  )
}
