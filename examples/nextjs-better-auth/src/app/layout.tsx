import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js + better-auth + stubidp',
  description: 'Example app using better-auth with stubidp OIDC provider',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
