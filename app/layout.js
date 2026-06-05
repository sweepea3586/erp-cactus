import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Cactus Light & Sound ERP',
  description: 'İthalat ve dağıtım için kurumsal ERP sistemi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
