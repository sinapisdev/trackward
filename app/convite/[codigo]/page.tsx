import { AbrirConvite } from '@/componentes/AbrirConvite'

/**
 * O link do convite, que é o mesmo endereço para os dois casos.
 *
 * Fora do grupo `(app)` de propósito, como `/feedback/[token]`: quem chega aqui
 * pode não ter conta nenhuma, e não há navegação que faça sentido mostrar a
 * alguém que ainda não entrou em lugar nenhum.
 *
 * **Um endereço e não dois** porque quem convida não sabe, e não tem como
 * saber, se a pessoa já usa o TrackWard. Mandar `/entrar` erra para quem já
 * tem conta, porque a tela de entrar recusa quem está logado e o porteiro ainda
 * jogava o código fora no caminho. Quem decide é esta página, depois de olhar a
 * sessão.
 */
export default async function Pagina({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return <AbrirConvite codigo={decodeURIComponent(codigo).toUpperCase()} />
}
