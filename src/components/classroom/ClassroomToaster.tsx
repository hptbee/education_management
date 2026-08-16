'use client'

import { Toaster } from 'sonner'

export function ClassroomToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors={false}
      className="font-sans"
      toastOptions={{
        classNames: {
          toast: 'rounded-2xl border border-sky-100 bg-white font-sans shadow-lg',
          title: 'font-bold text-slate-800',
          description: 'font-semibold text-slate-500',
        },
      }}
    />
  )
}
