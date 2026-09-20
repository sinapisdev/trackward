import type { Metadata, Viewport } from 'next'
import { Urbanist } from 'next/font/google'
import './globals.css'

// Urbanist, a mesma da referência do ClauseOS: geométrica, sem serifa, e
// desenhada para interface. Palavras do próprio projeto: passa confiança,
// clareza e profissionalismo moderno.
const sans = Urbanist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--fonte-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Track',
  description: 'Cada projeto e cada rotina da empresa como uma esteira com checkpoints: o que precisa ser feito, quem responde e até quando.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Track', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icone-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F7F8' },
    { media: '(prefers-color-scheme: dark)', color: '#070C15' },
  ],
}

/** Aplica o tema salvo antes da primeira pintura, para a tela não piscar. */
const TEMA = `try{var t=localStorage.getItem('track.tema');if(t)document.documentElement.dataset.tema=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: TEMA }} /></head>
      <body>{children}</body>
    </html>
  )
}
