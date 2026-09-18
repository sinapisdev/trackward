import { FormEntrar } from '@/componentes/FormEntrar'

/**
 * A tela de entrada vale nos dois modos. Ligada ao Supabase, ela cria a conta de
 * verdade; no modo demonstração, cria a mesma coisa dentro do navegador, para
 * dar para conferir a primeira impressão do produto (a empresa nova nascendo
 * vazia) antes de ligar banco nenhum.
 */
export default function Entrar() {
  return <FormEntrar />
}
