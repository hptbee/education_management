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
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#4ba3e8',
}

import { AppDataProvider } from '@/src/store/AppDataContext'
import { ClassroomDialogProvider, AppDataShell } from '@/src/components/classroom'
import { ClassroomDocumentTitle } from '@/src/components/ClassroomDocumentTitle'
import { Sidebar } from '@/components/sidebar'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={`light ${nunito.variable} ${baloo.variable} bg-page`}>
      <body className="antialiased font-sans">
        <AppDataProvider>
          <ClassroomDialogProvider>
            <ClassroomDocumentTitle />
            <div className="flex h-screen overflow-hidden bg-page">
              <Sidebar />
              <main className="classroom-shell flex flex-1 flex-col overflow-hidden">
                <AppDataShell>{children}</AppDataShell>
              </main>
            </div>
          </ClassroomDialogProvider>
        </AppDataProvider>
      </body>
    </html>
  )
}
