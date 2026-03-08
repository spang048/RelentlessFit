import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RelentlessFit',
  description: 'Track calories, workouts, and weight trends',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RelentlessFit',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1B72CC" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
