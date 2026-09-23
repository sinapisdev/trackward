/**
 * O id de uma linha nova, feito aqui e não no banco.
 *
 * Parece detalhe e não é. O caminho natural seria deixar o Postgres gerar e
 * pedir a linha de volta com `RETURNING`, que é o que o `.select()` do
 * supabase-js faz. Só que o RETURNING passa pela política de LEITURA, e quando
 * ela recusa a linha recém-criada o Postgres devolve exatamente a mesma frase de
 * quando a escrita é recusada: "new row violates row-level security policy".
 *
 * O efeito é cruel de depurar: a linha entrou, e a tela diz que não entrou.
 * Foi assim que criar canal e criar tarefa pareceram quebrados.
 *
 * Gerando o id aqui, o app sabe o que gravou sem precisar perguntar, e some uma
 * classe inteira de erro confuso. O banco continua recusando o que tem que
 * recusar; o que muda é que a recusa passa a ser só da escrita.
 */
export function novoId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c?.randomUUID) return c.randomUUID()
  // Navegador antigo, ou contexto sem https. O formato é o mesmo que o banco
  // espera, e a chance de repetir é a mesma de um uuid v4 qualquer.
  const b = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
