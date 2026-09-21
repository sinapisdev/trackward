import { TelaTracks } from '@/componentes/TelaTracks'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaTracks id={id} />
}
