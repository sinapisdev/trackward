import { TelaArea } from '@/componentes/TelaArea'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaArea id={id} />
}
