import { Suspense } from 'react'
import { EditorProcesso } from '@/componentes/EditorProcesso'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <EditorProcesso id={id} />
    </Suspense>
  )
}
