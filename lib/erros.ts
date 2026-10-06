/**
 * Fala de máquina não chega a quem está trabalhando.
 *
 * As recusas escritas no `supabase/schema.sql` são português feito para gente
 * ler ("Ressalva não se apaga, se conclui"), e passar direto é o certo: elas
 * dizem o que aconteceu e o que fazer. O que o Postgres e o PostgREST escrevem
 * sozinhos é outra coisa: inglês falando de constraint, coluna, relação e
 * cache. "update or delete on table \"areas\" violates foreign key constraint
 * on table \"fluxos\"" é verdade e não serve a ninguém.
 *
 * A peneira existia só na porta do WhatsApp (`recado`, em /api/whats), porque
 * foi lá que ela doeu primeiro: um teste pegou "Could not find the function
 * public.salvar_fluxo in the schema cache" chegando ao telefone de alguém. Na
 * tela o teste era o TAMANHO da frase, e tamanho não diz de quem ela é: a do
 * exemplo acima tem 93 caracteres e passava inteira.
 *
 * Por isso a regra mora aqui, uma vez. Duas cópias dela é a garantia de que um
 * dia a tela vai mostrar o que o telefone esconde.
 */
export function falaDeMaquina(msg: string): boolean {
  if (!msg) return true
  return /violates|constraint|could not find|schema cache|does not exist|invalid input/i.test(msg)
    || /permission denied|null value in column|duplicate key|relation ".*" does not/i.test(msg)
}
