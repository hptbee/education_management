'use client'

import { Toaster } from 'sonner'

export function ClassroomToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors={false}
      closeButton
      className="font-sans"
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            'rounded-2xl border border-sky-100 bg-white font-sans shadow-lg data-[swipe=move]:transition-none',
          title: 'font-bold text-slate-800',
          description: 'font-semibold text-slate-500',
        },
      }}
    />
  )
}
