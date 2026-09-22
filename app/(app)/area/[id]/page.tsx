import { TelaRotinas } from '@/componentes/TelaRotinas'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaRotinas id={id} />
}
