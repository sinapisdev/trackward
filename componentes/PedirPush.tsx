'use client'

import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { pendencias } from '@/lib/regras'
import { pareceEmail } from '@/lib/nomes'

const RECUSOU = 'track.push.nao'

/**
 * O pedido de aviso fora do app.
 *
 * **O navegador NÃO deixa ligar push sozinho.** Ele exige autorização
 * explícita, e em quase todos os casos exige um gesto da pessoa para mostrar a
 * caixa de permissão. Então "ligado por padrão" não pode querer dizer inscrito
 * em silêncio: quer dizer que o app PEDE, na hora certa, em vez de esperar
 * alguém achar o interruptor em Ajustes.
 *
 * E a hora certa não é a primeira vez que a pessoa entra. Pedir ali é o erro
 * clássico: ela ainda não tem nada para ser avisada, nega, e **negar é para
 * sempre**, porque o navegador não pergunta de novo. A porta volta a existir só
 * nas configurações do aparelho, que ninguém abre.
 *
 * A hora certa é quando existe alguma coisa esperando por ela. Aí a pergunta
 * se responde sozinha: "quer saber disso mesmo com o app fechado?".
 *
 * Uma coisa de cada vez, como no convite de instalar: espera o nome, espera o
 * tour `inicio` e espera o convite de instalar ter sido respondido. Dois
 * cartões empilhados é a pessoa fechando os dois sem ler nenhum.
 */
export function PedirPush() {
  const { eu, fluxosComImplicitas, contato, ligarPushAqui } = useDados()
  const [aberto, setAberto] = useState(false)
  const [indo, setIndo] = useState(false)

  const temFila = pendencias(fluxosComImplicitas, eu.id).length > 0

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    // Já autorizou ou já negou no navegador: não há o que pedir. Quem negou
    // volta por Ajustes, que explica o caminho das configurações do aparelho.
    if (Notification.permission !== 'default') return
    try { if (localStorage.getItem(RECUSOU) === 'sim') return } catch {}
    // Quem já desligou o push na conta não deve ser perguntado de novo pelo
    // aparelho: a escolha é dela e vale em todos.
    if (contato && !contato.push) return
    if (!eu.id || !eu.nome?.trim() || pareceEmail(eu.nome)) return
    if (!(eu.tutoriais || []).includes('inicio')) return
    if (!temFila) return
    // O convite de instalar aparece aos 4 segundos. Este vem depois dele, e só
    // se ele não estiver na tela.
    const t = setTimeout(() => {
      if (!document.querySelector('.ov')) setAberto(true)
    }, 9000)
    return () => clearTimeout(t)
  }, [eu.id, eu.nome, (eu.tutoriais || []).join(','), temFila, contato?.push])

  if (!aberto) return null

  const agoraNao = () => {
    try { localStorage.setItem(RECUSOU, 'sim') } catch {}
    setAberto(false)
  }

  const ligar = async () => {
    setIndo(true)
    // `ligarPushAqui` é quem pede a permissão e grava a assinatura. A caixa do
    // navegador só aparece a partir deste clique, que é o gesto que ele exige.
    await ligarPushAqui().catch(() => {})
    setIndo(false)
    setAberto(false)
  }

  return (
    <div className="ov">
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="push-t">
        <div className="dlg-h">
          <h3 id="push-t">Quer ser avisado quando pedirem algo?</h3>
        </div>
        <div className="dlg-c">
          <p className="mode" style={{ marginTop: 0 }}>
            O app avisa quando alguém te passa uma tarefa, quando um prazo seu vence e quando
            te chamam na conversa. <b>Só o que é seu</b>, e dá para desligar em Ajustes a
            qualquer momento.
          </p>
          <p className="hint">
            O navegador vai perguntar se autoriza. Recusando ali, ele não pergunta de novo, e
            aí só pelas configurações do aparelho.
          </p>
        </div>
        <div className="dlg-p">
          <button className="btn" onClick={agoraNao}>Agora não</button>
          <button className="btn pri" disabled={indo} onClick={() => void ligar()}>
            <Ic.sino />Quero ser avisado
          </button>
        </div>
      </div>
    </div>
  )
}

/** Esquece o "agora não", para o "Ver tudo de novo" poder perguntar outra vez. */
export function esquecerPedidoDePush() {
  try { localStorage.removeItem(RECUSOU) } catch { /* sem armazenamento, nada a esquecer */ }
}
