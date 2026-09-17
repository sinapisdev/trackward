import { TelaFluxo } from '@/componentes/TelaFluxo'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaFluxo id={id} />
}
