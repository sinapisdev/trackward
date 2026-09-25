import { createClient } from '@supabase/supabase-js'

/**
 * O cliente de serviço: o único que enxerga o banco inteiro, sem RLS.
 *
 * A lista de quem pode usá-lo é fechada, e tem dois:
 *
 *   - `/api/avisar`, que entrega aviso fora do app. Quem chama é um relógio, e
 *     relógio não tem sessão.
 *   - `/api/feedback`, que atende o link de quem recebeu o trabalho. Quem chama
 *     é um estranho com um link, e ele não tem conta nem vai ter.
 *
 * Nos dois o motivo é o mesmo: quem chama não tem sessão, e sem este cliente
 * nenhuma política deixaria ler o que precisa ser lido. Nos dois a rota é
 * estreita de propósito, e devolve só o que aquele chamador pode ver.
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
