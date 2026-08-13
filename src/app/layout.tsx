import { Analytics } from '@vercel/analytics/next'
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
  title: 'Lê Thư – Cô Giáo Nhỏ 4.0',
  description: 'Hệ thống quản lý lớp học và tích điểm học sinh',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#6d5ce7',
}

import { AppDataProvider } from '@/src/store/AppDataContext'
import { Sidebar } from '@/components/sidebar'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} ${baloo.variable} bg-page`}>
      <body className="antialiased font-sans">
        <AppDataProvider>
          <div className="flex h-screen overflow-hidden bg-page">
            <Sidebar />
            <main className="flex flex-1 flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </AppDataProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
