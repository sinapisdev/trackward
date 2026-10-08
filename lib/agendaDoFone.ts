/**
 * A agenda de contatos do próprio aparelho.
 *
 * **Isto existe em alguns aparelhos e não existe em outros, e não há o que
 * fazer a respeito.** A Contact Picker API é do Chrome no Android, e o Safari
 * não a tem: no iPhone não existe caminho nenhum para o app ler a agenda, nem
 * instalado na tela de início, nem pedindo permissão, nem de outro jeito. Não é
 * falta de permissão, é falta de API. Só um app de loja alcançaria aquilo.
 *
 * Então o botão APARECE onde ele funciona e some onde não funciona, e quem não
 * o tem escreve o nome e o número, que é o caminho que vale em todo lugar. Um
 * botão que falha para metade das pessoas é pior que um botão que não está lá:
 * o que não está lá ninguém procura.
 *
 * O navegador mostra a lista DELE e devolve só o que a pessoa escolheu, uma
 * pessoa por vez. O app não lê a agenda, não a guarda e não a vê: ele recebe um
 * nome e um número, que é exatamente o que ela teria digitado.
 */

type SeletorDeContatos = {
  select: (
    props: string[], opcoes?: { multiple?: boolean },
  ) => Promise<{ name?: string[]; tel?: string[] }[]>
}

const seletor = (): SeletorDeContatos | null => {
  if (typeof navigator === 'undefined') return null
  const c = (navigator as unknown as { contacts?: SeletorDeContatos }).contacts
  return c && typeof c.select === 'function' ? c : null
}

/** Este aparelho deixa escolher da agenda? Decide se o atalho aparece. */
export const temAgendaDoFone = () => !!seletor()

/**
 * Abre a agenda do aparelho e devolve o que foi escolhido.
 *
 * Nulo quer dizer "não deu", e os três motivos se parecem de fora: o aparelho
 * não tem o seletor, a pessoa fechou sem escolher, ou o contato escolhido não
 * tem telefone. Os três levam ao mesmo lugar, que é escrever à mão, então não
 * vale distinguir: o que a tela diz é como escrever.
 *
 * Precisa de um gesto da pessoa, como o seletor de arquivo: chamado de dentro
 * de um efeito, o navegador recusa sem dizer por quê.
 */
export async function escolherDaAgenda(): Promise<{ nome: string; fone: string } | null> {
  const c = seletor()
  if (!c) return null
  try {
    const escolhidos = await c.select(['name', 'tel'], { multiple: false })
    const um = escolhidos?.[0]
    if (!um) return null
    const fone = (um.tel || []).find((t) => String(t).replace(/\D/g, '').length >= 8)
    if (!fone) return null
    // Um contato pode ter vários nomes guardados, e o primeiro é o que o
    // aparelho mostra na lista: é por ele que a pessoa reconheceu quem é.
    const nome = (um.name || []).map((n) => String(n).trim()).find(Boolean) || ''
    return { nome, fone: String(fone) }
  } catch {
    // Recusa de permissão, janela fechada, aparelho que anuncia e não entrega.
    // Em todos, o caminho de escrever à mão continua ali.
    return null
  }
}
