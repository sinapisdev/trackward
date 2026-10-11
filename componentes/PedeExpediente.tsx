'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { pareceEmail } from '@/lib/nomes'
import { temExpediente, type Faixa } from '@/lib/expediente'

const RECUSOU = 'track.expediente.nao'

/** O desenho mais comum de semana de trabalho no Brasil, e o ponto de partida. */
const COMUM: Record<string, Faixa[]> = {
  '1': [['08:00', '12:00'], ['13:30', '18:00']],
  '2': [['08:00', '12:00'], ['13:30', '18:00']],
  '3': [['08:00', '12:00'], ['13:30', '18:00']],
  '4': [['08:00', '12:00'], ['13:30', '18:00']],
  '5': [['08:00', '12:00'], ['13:30', '18:00']],
}

/**
 * A pergunta do expediente, na primeira vez.
 *
 * O app precisa dela para não fazer a coisa errada por omissão: sem expediente
 * ele não mexe em prazo nenhum, então a tarefa cai no sábado e o compromisso
 * nas sete da noite. Perguntar uma vez resolve o resto do uso.
 *
 * **Ela não é um formulário, é uma escolha de um toque.** Quase todo mundo
 * trabalha de segunda a sexta de manhã e de tarde, então o botão principal já
 * traz isso pronto e o ajuste fino fica para depois, em Ajustes ou falando com
 * o secretário. Pedir sete dias e catorze horários na primeira tela é a mesma
 * burocracia que o produto inteiro existe para tirar do caminho.
 *
 * **Uma coisa de cada vez**, como o convite de instalar e o pedido de push: ela
 * espera o nome e espera o tour `inicio`, e não aparece com outra caixa na
 * tela. E quem disse "agora não" não é perguntado de novo: a porta fica em
 * Ajustes, que é onde se procura o que se recusou antes.
 */
export function PedeExpediente() {
  const { eu, expediente, salvarExpediente, carregando } = useDados()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [indo, setIndo] = useState(false)

  useEffect(() => {
    if (carregando) return
    if (temExpediente(expediente)) return
    try { if (localStorage.getItem(RECUSOU) === 'sim') return } catch {}
    if (!eu.id || !eu.nome?.trim() || pareceEmail(eu.nome)) return
    if (!(eu.tutoriais || []).includes('inicio')) return
    // Atrás dos outros três na fila, e sem subir por cima de ninguém.
    const t = setTimeout(() => {
      if (!document.querySelector('.ov')) setAberto(true)
    }, 14000)
    return () => clearTimeout(t)
  }, [carregando, expediente, eu.id, eu.nome, (eu.tutoriais || []).join(',')])

  if (!aberto) return null

  const agoraNao = () => {
    try { localStorage.setItem(RECUSOU, 'sim') } catch {}
    setAberto(false)
  }

  const aceitar = async () => {
    setIndo(true)
    await salvarExpediente({ blocos: COMUM, fuso: 'America/Sao_Paulo', observacao: '' })
    setIndo(false)
    setAberto(false)
  }

  return (
    <div className="ov">
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="exp-t">
        <div className="dlg-h">
          <h3 id="exp-t">Em que horas você trabalha?</h3>
        </div>
        <div className="dlg-c">
          <p className="mode" style={{ marginTop: 0 }}>
            É o que faz o app não pôr prazo no sábado nem marcar reunião às sete da noite.
            Vale para <b>todos os seus espaços</b>, como a agenda, porque é o seu dia e não
            o de uma empresa.
          </p>
          <p className="hint">
            Começando pelo mais comum: <b>segunda a sexta, 8h às 12h e 13h30 às 18h</b>.
            Dá para mudar em Ajustes a qualquer hora, ou contar ao secretário falando
            (&quot;trabalho das 8h30 ao meio-dia&quot;).
          </p>
        </div>
        <div className="dlg-p">
          <button className="btn" onClick={agoraNao}>Agora não</button>
          {/* A terceira porta existe porque o caminho que ele pediu é o de
              conversar: quem não se reconhece no horário comum fala, em vez de
              preencher catorze campos aqui. */}
          <button className="btn ghost" onClick={() => { setAberto(false); router.push('/secretario') }}>
            <Ic.faisca />Prefiro contar falando
          </button>
          <button className="btn pri" disabled={indo} onClick={() => void aceitar()}>
            É isso mesmo
          </button>
        </div>
      </div>
    </div>
  )
}

/** Esquece o "agora não", para o "Ver tudo de novo" perguntar outra vez. */
export function esquecerPedidoDeExpediente() {
  try { localStorage.removeItem(RECUSOU) } catch { /* sem armazenamento, nada a esquecer */ }
}
