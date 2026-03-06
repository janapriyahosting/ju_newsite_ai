import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Janapriya Upscale — Premium Real Estate',
  description: 'Find your dream home — Premium 1BHK, 2BHK, 3BHK apartments and villas in Hyderabad',
  keywords: 'real estate, apartments, Hyderabad, 2BHK, 3BHK, villas, plots',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
