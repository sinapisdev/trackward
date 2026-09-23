import { EditorTrilha } from '@/componentes/EditorTrilha'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditorTrilha id={id} />
}
