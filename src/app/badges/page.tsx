'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function BadgesRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams({ tab: 'catalog' })
    const studentId = searchParams?.get('studentId')
    if (studentId) {
      params.set('studentId', studentId)
    }
    router.replace(`/recognition?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-xl font-bold text-slate-500">Đang chuyển hướng...</p>
    </div>
  )
}

export default function BadgesRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-slate-500">Đang chuyển hướng...</p>
        </div>
      }
    >
      <BadgesRedirectContent />
    </Suspense>
  )
}
