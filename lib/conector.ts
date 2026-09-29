import { decifrar } from './cifra'

/**
 * A chave de um conector, decifrada.
 *
 * Existe porque a leitura estava escrita em quatro lugares (`/api/conector`,
 * `/api/avisar`, `/api/whats` duas vezes e `lib/whats.ts`), e quando o segredo
 * mudou de tabela na seção 53 as quatro precisaram mudar juntas. Regra repetida
 * é regra que diverge: basta alguém consertar três.
 *
 * Só funciona com o cliente de SERVIÇO. `conector_segredos` não tem política
 * nenhuma de propósito, então o cliente da sessão lê vazio aqui, e o retorno é
 * o mesmo de chave que não existe: nada. É o comportamento certo, e não um
 * erro escondido, porque quem tem sessão nunca deveria alcançar esta chave.
 */
/**
 * O mínimo que o cliente precisa ter. Os dois que chegam aqui (o de serviço e o
 * estrutural de `lib/whats.ts`) cabem nele, e nenhum dos dois precisa conhecer
 * o outro por causa disto.
 */
type Leitor = { from: (tabela: string) => { select: (colunas: string) => unknown } }

type Busca = {
  eq: (coluna: string, valor: string) => {
    maybeSingle: () => Promise<{ data: { segredo_cifrado: string } | null }>
  }
}

export async function chaveDoConector(sb: Leitor, conectorId: string): Promise<string> {
  if (!conectorId) return ''
  const q = sb.from('conector_segredos').select('segredo_cifrado') as Busca
  const { data } = await q.eq('conector_id', conectorId).maybeSingle()
  return data?.segredo_cifrado ? (decifrar(data.segredo_cifrado) || '') : ''
}
