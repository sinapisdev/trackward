import { redirect } from 'next/navigation'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/tracks?area=${id}`)
}
