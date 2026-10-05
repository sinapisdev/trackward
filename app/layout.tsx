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
    // `default`, e não `black-translucent`: aquele faz o iPhone desenhar o
  // conteúdo EMBAIXO da barra de status, que é o mesmo problema do `cover` por
  // outro caminho. Com `default` o sistema reserva a faixa e o app começa
  // abaixo dela.
  appleWebApp: { capable: true, title: 'TrackWard', statusBarStyle: 'default' },
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
  /**
   * `viewport-fit` fica no padrão, e isso é uma decisão, não um esquecimento.
   *
   * Com `cover` o app vai até a borda da tela e passa a depender de
   * `env(safe-area-inset-*)` para não ficar embaixo do relógio e da faixa do
   * aparelho. No iPhone funciona. **No Android não**: a janela vai para a borda
   * e a margem volta ZERO, então a barra de cima foi parar embaixo do relógio e
   * o seletor de empresa e os ajustes ficaram inalcançáveis. Foi exatamente o
   * que aconteceu em 05/10/2026, instalado na tela.
   *
   * Sem `cover`, quem recua a janela é o próprio sistema, nos dois. O app perde
   * o visual que vai até a borda e ganha nunca ficar embaixo de nada. Para uma
   * barra onde moram o seletor de espaço e os ajustes, essa troca não tem
   * discussão.
   */
  // As mesmas cores de chão de app/globals.css. Desencontrado, a barra do
  // navegador e a tela de abertura ficam de uma cor e o app de outra, e a
  // emenda aparece justamente no telefone, que é onde ela é uma faixa.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E9EBE7' },
    { media: '(prefers-color-scheme: dark)', color: '#16191A' },
  ],
}

/** O endereço do banco, para o navegador já ir abrindo caminho até ele. */
const API = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/** Aplica o tema salvo antes da primeira pintura, para a tela não piscar. */
const TEMA = `try{var t=localStorage.getItem('track.tema');if(t)document.documentElement.dataset.tema=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <head>
        {/*
          * Abre a conversa com o banco ANTES de precisar dela.
          *
          * A primeira consulta paga DNS, conexão e TLS, e medindo deu 400 a
          * 500ms só nisso: com a conexão quente, as 37 consultas do
          * carregamento levam 204ms juntas; frias, levam 496ms. O navegador só
          * descobre o endereço do banco quando o JavaScript já carregou e
          * resolveu perguntar, ou seja, no fim da fila.
          *
          * `preconnect` manda ele começar o aperto de mão junto com o HTML, em
          * paralelo com tudo. Quando a primeira consulta sair, o cano já está
          * aberto. Não baixa nada e não custa nada para quem nunca chega lá.
          */}
        {API && <link rel="preconnect" href={API} crossOrigin="anonymous" />}
        {API && <link rel="dns-prefetch" href={API} />}
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
