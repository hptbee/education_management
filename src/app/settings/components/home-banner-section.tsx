'use client'

import { useRef, useState } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { Button, Card } from '@/src/components/ui'
import { HeroBanner } from '@/components/dashboard/hero-banner'
import { useAppData } from '@/src/store/AppDataContext'
import { HOME_BANNER, homeBannerSizeHint, readHomeBannerImage } from '@/src/utils/images'

export function HomeBannerSection({
  onSaved,
  onError,
}: {
  onSaved: () => void
  onError: (message: string | null) => void
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

  return (
    <Card className="bg-white/90">
      <div className="mb-5 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-pastel-sky to-brand text-white shadow-lg">
          <ImagePlus size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Ảnh banner trang chủ</h2>
          <p className="text-sm text-slate-500">Ảnh hiển thị ở đầu trang tổng quan</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-pastel-sky via-white to-pastel-pink/50">
        {customImage ? (
          <img
            src={customImage}
            alt="Xem trước banner lớp học"
            className="block h-auto w-full"
          />
        ) : (
          <div className="p-4 xl:p-5">
            <HeroBanner />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-brand-soft p-4 text-sm text-slate-600">
        <p className="font-bold text-brand-purple">Kích thước tạo ảnh (GPT / Grok)</p>
        <p className="mt-1 font-extrabold text-slate-800">{homeBannerSizeHint()}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Grok: 3:1. GPT: Landscape (1792 × 1024). Ảnh sẽ hiện đủ, không bị cắt. PNG, JPG, WEBP · tối đa {HOME_BANNER.maxFileBytes / (1024 * 1024)} MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          className="justify-center"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus size={18} />
          {busy ? 'Đang tải ảnh...' : customImage ? 'Đổi ảnh banner' : 'Tải ảnh banner'}
        </Button>
        {customImage ? (
          <Button variant="ghost" className="justify-center" onClick={handleReset} disabled={busy}>
            <RotateCcw size={18} /> Khôi phục mặc định
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
