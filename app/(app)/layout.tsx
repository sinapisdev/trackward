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

  /**
   * Quem está entrando, conferido SEM ir à rede.
   *
   * Eram três idas em fila daqui (`getUser`, `meu_perfil`, e o perfil), mais
   * uma do porteiro, antes de a tela começar a existir. `getClaims()` resolve a
   * primeira sem sair, verificando a assinatura com a chave pública do projeto.
   */
  const { data: cl, error: erroCl } = await sb.auth.getClaims()
  let quem = cl?.claims as { sub?: string; email?: string } | undefined

  // Mesma rede de segurança do porteiro: falha de VERIFICAÇÃO não pode virar
  // "você não está logado", senão um tropeço na chave pública tranca a casa
  // inteira. Não ter sessão é outra coisa, e essa não merece segunda pergunta.
  if (erroCl) {
    const { data } = await sb.auth.getUser()
    quem = data.user ? { sub: data.user.id, email: data.user.email } : undefined
  }

  if (!quem?.sub) redirect('/entrar')
  const email = String(quem.email || '')

  // Quem é você aqui dentro não é o seu login: é o seu *perfil*, e um login pode
  // ter vários, um por empresa. Quem resolve isso é `meu_perfil()` no banco, que
  // olha a tabela `sessoes` para saber qual espaço você escolheu e cai no mais
  // antigo quando ainda não escolheu nenhum. Perguntar aqui de outro jeito seria
  // reescrever a regra em dois lugares, e foi assim que ela quebrou: a consulta
  // filtrava `perfis.id` pelo id do usuário do Auth, que são coisas diferentes,
  // então nunca achava ninguém e todo mundo caía na tela de acesso suspenso.
  /**
   * As duas restantes vão JUNTAS, e não uma depois da outra.
   *
   * A segunda não depende da primeira: `perfis_sel` devolve `user_id =
   * auth.uid()` incondicionalmente, ou seja, os seus perfis em todos os espaços
   * chegam de qualquer jeito, inclusive os desligados, que é o que a tela de
   * acesso suspenso precisa. Então dá para pedir os dois ao mesmo tempo e
   * escolher aqui qual deles é o do espaço em uso.
   *
   * E quem decide isso continua sendo `meu_perfil()` no banco, que olha
   * `sessoes`. Escolher aqui por outro critério seria reescrever a regra em
   * dois lugares, e foi assim que ela já quebrou uma vez.
   */
  const [{ data: perfilId }, { data: meus }] = await Promise.all([
    sb.rpc('meu_perfil'),
    sb.from('perfis').select('*').eq('user_id', quem.sub),
  ])
  const perfil = ((meus || []) as Perfil[]).find((x) => x.id === perfilId) || null

  if (!perfil || !perfil.ativo) {
    return <Espera nome={perfil?.nome} email={email} />
  }

  return (
    <Dados perfil={perfil}>
      <Modais>
        <Shell>{children}</Shell>
      </Modais>
    </Dados>
  )
}
