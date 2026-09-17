import { redirect } from 'next/navigation'
import { clienteServidor } from '@/lib/supabase/servidor'
import { MODO_LOCAL } from '@/lib/modo'
import { Dados } from '@/componentes/Dados'
import { Modais } from '@/componentes/Modais'
import { Shell } from '@/componentes/Shell'
import { Espera } from '@/componentes/Espera'
import { LocalGate } from '@/componentes/LocalGate'
import type { Perfil } from '@/lib/tipos'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  if (MODO_LOCAL) return <LocalGate>{children}</LocalGate>

  const sb = await clienteServidor()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/entrar')

  const { data } = await sb.from('perfis').select('*').eq('id', user.id).maybeSingle()
  const perfil = data as Perfil | null

  if (!perfil || !perfil.ativo) {
    return <Espera nome={perfil?.nome} email={user.email || ''} />
  }

  return (
    <Dados perfil={perfil}>
      <Modais>
        <Shell>{children}</Shell>
      </Modais>
    </Dados>
  )
}
