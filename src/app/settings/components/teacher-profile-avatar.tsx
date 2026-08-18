'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { useAppData } from '@/src/store/AppDataContext'
import { classroomAssetService } from '@/src/database/assets/classroom-asset.service'
import { teacherAvatarAssetKey } from '@/src/database/assets/classroom-asset-paths'
import { ASSET_IMAGE_RULES, processImageFile, teacherAvatarSizeHint } from '@/src/utils/images'
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
  const { data, updateTeacherProfile, markDirtyAsset, persistNow } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const teacher = data.classroomSettings.teacher
  const classroomId = data.metadata.id
  const hasCustomAvatar = Boolean(teacher.avatarAssetKey)
  const inline = layout === 'inline'

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    onError(null)
    try {
      const bytes = await processImageFile(file, 'teacherAvatar')
      const key = teacherAvatarAssetKey()
      await classroomAssetService.saveAsset(classroomId, key, bytes)
      updateTeacherProfile({ avatarAssetKey: key, avatar: undefined })
      markDirtyAsset(key)
      await persistNow()
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không tải được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    onError(null)
    try {
      const key = teacher.avatarAssetKey
      updateTeacherProfile({ avatarAssetKey: undefined, avatar: undefined })
      await persistNow()
      if (key) {
        await classroomAssetService.deleteAsset(classroomId, key)
        markDirtyAsset(key)
      }
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không xóa được ảnh.')
    } finally {
      setBusy(false)
    }
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
            assetKey={teacher.avatarAssetKey}
            classroomId={classroomId}
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
            onClick={() => void handleRemove()}
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
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className={cn(inline ? 'text-left sm:pt-1' : 'text-center')}>
        <p className="text-sm font-bold text-slate-700">
          {busy ? 'Đang tải...' : 'Ảnh đại diện'}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Bấm ảnh để đổi · lưu tự động</p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
          {teacherAvatarSizeHint()} · tối đa {ASSET_IMAGE_RULES.teacherAvatar.maxInputBytes / (1024 * 1024)} MB
        </p>
      </div>
    </div>
  )
}
