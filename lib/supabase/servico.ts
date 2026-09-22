import { createClient } from '@supabase/supabase-js'

/**
 * O cliente de serviço: o único que enxerga o banco inteiro, sem RLS.
 *
 * Ele existe para uma coisa só, e a lista é fechada: entregar aviso fora do app,
 * em `/api/avisar`. Quem chama aquilo é um relógio, não uma pessoa, e um relógio
 * não tem sessão; sem este cliente, nenhuma política deixaria ler a assinatura de
 * push nem o telefone de quem vai ser avisado, e com razão.
 *
 * Três regras que não podem ser afrouxadas:
 *
 *   1. `SUPABASE_SERVICE_ROLE` **nunca** vira variável NEXT_PUBLIC_. Ela abre o
 *      banco inteiro de qualquer empresa; no navegador, seria entregar tudo.
 *   2. Este arquivo nunca é importado por componente de tela, só por rota de
 *      servidor. O `import 'server-only'` abaixo faz o build quebrar se alguém
 *      esquecer, em vez de a chave vazar em silêncio.
 *   3. Toda consulta feita por aqui filtra explicitamente por quem é o dono do
 *      dado. Sem RLS para segurar, o filtro é responsabilidade de quem escreve.
 */
import 'server-only'

export function clienteDeServico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !chave) return null
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
