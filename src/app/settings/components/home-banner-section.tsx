'use client'

import { useRef, useState } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { HeroBanner } from '@/components/dashboard/hero-banner'
import { useAppData } from '@/src/store/AppDataContext'
import { HOME_BANNER, homeBannerSizeHint, readHomeBannerImage } from '@/src/utils/images'

export function HomeBannerSection({
  onSaved,
  onError,
  embedded = false,
}: {
  onSaved: () => void
  onError: (message: string | null) => void
  embedded?: boolean
}) {
  const { data, updateClassroomSettings } = useAppData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const customImage = data.classroomSettings.homeBannerImage?.trim() || ''

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    onError(null)
    try {
      const image = await readHomeBannerImage(file)
      updateClassroomSettings({
        ...data.classroomSettings,
        homeBannerImage: image,
      })
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không tải được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = () => {
    updateClassroomSettings({
      ...data.classroomSettings,
      homeBannerImage: undefined,
    })
    onError(null)
    onSaved()
  }

  const content = (
    <div className="min-w-0">
      {!embedded ? (
        <div className="mb-5 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pastel-sky to-brand text-white shadow-sm">
            <ImagePlus className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-800">Ảnh banner trang chủ</h2>
            <p className="text-sm font-semibold text-slate-500">Ảnh hiển thị ở đầu trang tổng quan</p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="font-display text-base font-extrabold text-slate-800">Banner trang chủ</h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Hiển thị ở đầu trang tổng quan</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-pastel-sky via-white to-pastel-pink/50">
        {customImage ? (
          <img
            src={customImage}
            alt="Xem trước banner lớp học"
            className="block h-auto max-h-48 w-full object-cover object-center xl:max-h-56"
          />
        ) : (
          <div className="p-3 xl:p-4">
            <HeroBanner />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-400">
          {homeBannerSizeHint()} · tối đa {HOME_BANNER.maxFileBytes / (1024 * 1024)} MB · lưu tự động
        </p>
        <div className="flex flex-wrap gap-2">
          <ClassroomButton size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <ImagePlus className="size-4" />
            {busy ? 'Đang tải...' : customImage ? 'Đổi ảnh' : 'Tải ảnh'}
          </ClassroomButton>
          {customImage ? (
            <ClassroomButton size="sm" variant="outline" onClick={handleReset} disabled={busy}>
              <RotateCcw className="size-4" /> Mặc định
            </ClassroomButton>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )

  if (embedded) return content

  return <ClassroomCard>{content}</ClassroomCard>
}
