import { TelaChat } from '@/componentes/TelaChat'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaChat id={id} />
}
