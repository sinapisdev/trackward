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

  // Quem é você aqui dentro não é o seu login: é o seu *perfil*, e um login pode
  // ter vários, um por empresa. Quem resolve isso é `meu_perfil()` no banco, que
  // olha a tabela `sessoes` para saber qual espaço você escolheu e cai no mais
  // antigo quando ainda não escolheu nenhum. Perguntar aqui de outro jeito seria
  // reescrever a regra em dois lugares, e foi assim que ela quebrou: a consulta
  // filtrava `perfis.id` pelo id do usuário do Auth, que são coisas diferentes,
  // então nunca achava ninguém e todo mundo caía na tela de acesso suspenso.
  const { data: perfilId } = await sb.rpc('meu_perfil')

  const { data } = perfilId
    ? await sb.from('perfis').select('*').eq('id', perfilId as string).maybeSingle()
    : { data: null }
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
