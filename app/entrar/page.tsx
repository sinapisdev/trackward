import { redirect } from 'next/navigation'
import { MODO_LOCAL } from '@/lib/modo'
import { FormEntrar } from '@/componentes/FormEntrar'

export default function Entrar() {
  // No modo demonstração não há login: quem escolhe a pessoa é a tela inicial.
  if (MODO_LOCAL) redirect('/')
  return <FormEntrar />
}
