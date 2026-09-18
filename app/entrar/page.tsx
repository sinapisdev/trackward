import { redirect } from 'next/navigation'
import { MODO_LOCAL } from '@/lib/modo'
import { FormEntrar } from '@/componentes/FormEntrar'

export default async function Entrar({ searchParams }: {
  searchParams: Promise<{ ver?: string }>
}) {
  const { ver } = await searchParams
  // No modo demonstração não há login: quem escolhe a pessoa é a tela inicial.
  // Com ?ver=1 a tela aparece assim mesmo, para dar para conferir o cadastro
  // antes de ligar o banco de verdade.
  if (MODO_LOCAL && ver !== '1') redirect('/')
  return <FormEntrar />
}
