import { Resposta } from '@/componentes/Feedback'

/**
 * A página que quem recebeu o trabalho abre.
 *
 * Ela fica fora do grupo `(app)` de propósito: sem Shell, sem TabBar, sem
 * navegação e sem sessão. Quem chega aqui não tem conta, e a única coisa que
 * ele precisa é dizer o que achou e ir embora.
 */
export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <Resposta token={token} />
}
