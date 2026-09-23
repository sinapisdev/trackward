import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

// Figtree, a tipografia do design system (ver design-system/DESIGN.md). A arte
// de origem usa uma geométrica da família Circular, da qual não veio binário,
// e a Figtree entrou no lugar: mesmo 'a' de dois andares, mesmo 'g' de um só,
// altura de x alta e bojos quase circulares. Se a licenciada chegar um dia, a
// troca é aqui e no tokens/fonts.css do sistema.
const sans = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--fonte-sans',
  display: 'swap',
})

const DESCRICAO = 'Projetos, rotinas e pessoas em movimento. Cada track com checkpoints: '
  + 'o que precisa ser feito, quem responde e até quando.'

export const metadata: Metadata = {
  // O endereço público. Sem ele, o Next monta as imagens de compartilhamento
  // com caminho relativo, e link relativo não existe dentro do WhatsApp nem do
  // LinkedIn: a prévia sai sem imagem e ninguém entende por quê.
  metadataBase: process.env.NEXT_PUBLIC_URL
    ? new URL(process.env.NEXT_PUBLIC_URL)
    : undefined,
  title: { default: 'TrackWard', template: '%s · TrackWard' },
  description: DESCRICAO,
  applicationName: 'TrackWard',
  manifest: '/manifest.webmanifest',
  // `capable` é o que faz o iPhone abrir o app em tela cheia depois de
  // adicionado à tela de início, e é ele que destrava o push no iOS.
  appleWebApp: { capable: true, title: 'TrackWard', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icone.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'TrackWard',
    title: 'TrackWard, move work forward.',
    description: DESCRICAO,
    locale: 'pt_BR',
    images: [{ url: '/icone-512.png', width: 512, height: 512, alt: 'TrackWard' }],
  },
  // O app é de trabalho e fica atrás de login: não há nada aqui para buscador
  // indexar, e o que existe é dado de cliente.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0B0A' },
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
