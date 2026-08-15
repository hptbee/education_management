'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { ClassroomButton } from './ClassroomButton'

type DialogVariant = 'info' | 'warning' | 'error'

type AlertOptions = {
  title?: string
  variant?: DialogVariant
}

type ConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
}

type ClassroomDialogContextValue = {
  showAlert: (message: string, options?: AlertOptions) => Promise<void>
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
}

const ClassroomDialogContext = createContext<ClassroomDialogContextValue | null>(null)

function variantStyles(variant: DialogVariant) {
  switch (variant) {
    case 'warning':
      return {
        icon: AlertTriangle,
        iconWrap: 'bg-amber-100 text-amber-600',
        confirm: 'primary' as const,
      }
    case 'error':
      return {
        icon: AlertCircle,
        iconWrap: 'bg-red-100 text-red-500',
        confirm: 'danger' as const,
      }
    default:
      return {
        icon: Info,
        iconWrap: 'bg-brand-soft text-brand',
        confirm: 'primary' as const,
      }
  }
}

export function ClassroomDialogProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<{
    open: boolean
    title: string
    message: string
    variant: DialogVariant
  }>({ open: false, title: 'Thông báo', message: '', variant: 'info' })

  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    variant: DialogVariant
  }>({
    open: false,
    title: 'Xác nhận',
    message: '',
    confirmLabel: 'Tiếp tục',
    cancelLabel: 'Hủy bỏ',
    variant: 'warning',
  })

  const alertResolver = useRef<(() => void) | null>(null)
  const confirmResolver = useRef<((value: boolean) => void) | null>(null)

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    return new Promise<void>((resolve) => {
      alertResolver.current = resolve
      setAlertState({
        open: true,
        title: options?.title ?? 'Thông báo',
        message,
        variant: options?.variant ?? 'info',
      })
    })
  }, [])

  const showConfirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve
      setConfirmState({
        open: true,
        title: options?.title ?? 'Xác nhận',
        message,
        confirmLabel: options?.confirmLabel ?? 'Tiếp tục',
        cancelLabel: options?.cancelLabel ?? 'Hủy bỏ',
        variant: options?.variant ?? 'warning',
      })
    })
  }, [])

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, open: false }))
    alertResolver.current?.()
    alertResolver.current = null
  }, [])

  const closeConfirm = useCallback((confirmed: boolean) => {
    setConfirmState((prev) => ({ ...prev, open: false }))
    confirmResolver.current?.(confirmed)
    confirmResolver.current = null
  }, [])

  const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm])

  const alertVariant = variantStyles(alertState.variant)
  const confirmVariant = variantStyles(confirmState.variant)
  const AlertIcon = alertVariant.icon
  const ConfirmIcon = confirmVariant.icon

  return (
    <ClassroomDialogContext.Provider value={value}>
      {children}

      {alertState.open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="classroom-alert-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${alertVariant.iconWrap}`}>
              <AlertIcon className="size-8" />
            </div>
            <h2 id="classroom-alert-title" className="font-display text-xl font-extrabold text-slate-800">
              {alertState.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{alertState.message}</p>
            <div className="mt-6">
              <ClassroomButton className="w-full" onClick={closeAlert}>
                Đã hiểu
              </ClassroomButton>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState.open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="classroom-confirm-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${confirmVariant.iconWrap}`}>
              <ConfirmIcon className="size-8" />
            </div>
            <h2 id="classroom-confirm-title" className="font-display text-xl font-extrabold text-slate-800">
              {confirmState.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{confirmState.message}</p>
            <div className="mt-6 flex gap-3">
              <ClassroomButton variant="outline" className="flex-1" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </ClassroomButton>
              <ClassroomButton
                variant={confirmVariant.confirm}
                className="flex-1"
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </ClassroomButton>
            </div>
          </div>
        </div>
      ) : null}
    </ClassroomDialogContext.Provider>
  )
}

export function useClassroomDialog() {
  const context = useContext(ClassroomDialogContext)
  if (!context) {
    throw new Error('useClassroomDialog must be used within ClassroomDialogProvider')
  }
  return context
}
