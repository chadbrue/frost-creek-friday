import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Friday Golf – Frost Creek',
  description: 'Sign up for Friday golf at Frost Creek Golf Course.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
