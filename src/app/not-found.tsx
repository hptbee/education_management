import Link from 'next/link'
import { House } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClassroomCard, classroomButtonVariants } from '@/src/components/classroom'

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <ClassroomCard className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-pastel-sky text-brand">
          <House className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black text-slate-800">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={cn(classroomButtonVariants())}>
            Về trang chủ
          </Link>
          <Link href="/settings" className={cn(classroomButtonVariants({ variant: 'outline' }))}>
            Cài đặt
          </Link>
        </div>
      </ClassroomCard>
    </div>
  )
}
