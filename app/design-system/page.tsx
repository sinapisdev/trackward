import type { Metadata } from 'next'
import Showcase from './Showcase'

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Vitrine do design system TrackWard: tokens, componentes e estados, servidos de dentro do app.',
  robots: { index: false, follow: false },
}

/**
 * Rota de vitrine do design system, fora do grupo (app) de propósito: não tem
 * Shell, não tem TabBar, não entra na navegação e não pede login. É só o lugar
 * de olhar os componentes desenhando de verdade, com os tokens do sistema.
 */
export default function Pagina() {
  return <Showcase />
}
