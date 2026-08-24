import type { Metadata, Viewport } from 'next'
import { Nunito, Baloo_2 } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-nunito',
  display: 'swap',
})

const baloo = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-baloo',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Quản lý lớp học',
  description: 'Hệ thống quản lý lớp học và tích điểm học sinh',
}

export const viewport: Viewport = {
  themeColor: '#4ba3e8',
}

import { AppDataProvider } from '@/src/store/AppDataContext'
import { AuthProvider } from '@/src/store/AuthContext'
import { PresentationModeProvider } from '@/src/store/PresentationModeContext'
import { ClassroomDialogProvider, ClassroomToaster, PointBurstProvider } from '@/src/components/classroom'
import { AppShell } from '@/src/components/AppShell'
import { AccessGate } from '@/src/components/access-gate'
import { ClassroomDocumentTitle } from '@/src/components/ClassroomDocumentTitle'
import { DesktopLoggingInit } from '@/src/components/DesktopLoggingInit'
import { SoundInit } from '@/src/components/SoundInit'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={`light ${nunito.variable} ${baloo.variable} bg-page`}>
      <body className="antialiased font-sans">
        <DesktopLoggingInit />
        <SoundInit />
        <AuthProvider>
          <AppDataProvider>
            <PresentationModeProvider>
              <ClassroomDialogProvider>
                <ClassroomToaster />
                <PointBurstProvider>
                  <AccessGate>
                    <ClassroomDocumentTitle />
                    <AppShell>{children}</AppShell>
                  </AccessGate>
                </PointBurstProvider>
              </ClassroomDialogProvider>
            </PresentationModeProvider>
          </AppDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
