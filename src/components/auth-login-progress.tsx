'use client'

import { Loader2, Sprout } from 'lucide-react'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import type { LoginStep } from '@/src/auth/types'
import { prefersReducedMotion } from '@/src/utils/motion'

const STEP_MESSAGES: Record<LoginStep, string> = {
  opening_browser: 'Đang mở trình duyệt Google…',
  waiting_callback: 'Hoàn tất đăng nhập trong trình duyệt, sau đó quay lại ứng dụng.',
  verifying: 'Đang xác minh tài khoản và gói sử dụng…',
}

interface AuthLoginProgressProps {
  step: LoginStep
  onCancel: () => void
}

export function AuthLoginProgress({ step, onCancel }: AuthLoginProgressProps) {
  const reducedMotion = prefersReducedMotion()

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-page p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-login-progress-title"
      aria-describedby="auth-login-progress-desc"
    >
      <ClassroomCard className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {reducedMotion ? (
            <Sprout className="size-7" aria-hidden />
          ) : (
            <Loader2 className="size-7 animate-spin" aria-hidden />
          )}
        </div>
        <h1
          id="auth-login-progress-title"
          className="mt-4 font-display text-2xl font-black text-slate-800"
        >
          Đang đăng nhập…
        </h1>
        <p
          id="auth-login-progress-desc"
          className="mt-2 text-sm font-semibold text-slate-500"
          role="status"
          aria-live="polite"
        >
          {STEP_MESSAGES[step]}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Cô có thể hủy và thử lại nếu trình duyệt không mở hoặc bị kẹt.
        </p>
        <ClassroomButton variant="outline" className="mt-6 w-full" onClick={onCancel}>
          Hủy đăng nhập
        </ClassroomButton>
      </ClassroomCard>
    </div>
  )
}

interface AuthBootstrapProgressProps {
  message?: string
}

export function AuthBootstrapProgress({ message = 'Đang khởi động ứng dụng…' }: AuthBootstrapProgressProps) {
  const reducedMotion = prefersReducedMotion()

  return (
    <div className="flex h-screen items-center justify-center bg-page p-6">
      <ClassroomCard className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {reducedMotion ? (
            <Sprout className="size-7" aria-hidden />
          ) : (
            <Loader2 className="size-7 animate-spin" aria-hidden />
          )}
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600" role="status" aria-live="polite">
          {message}
        </p>
      </ClassroomCard>
    </div>
  )
}
