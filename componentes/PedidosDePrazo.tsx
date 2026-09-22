'use client'

import { useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import { mandaNoProcesso } from '@/lib/acesso'
import { curta, isoDe, rel } from '@/lib/datas'
import type { PedidoPrazo } from '@/lib/tipos'

/**
 * Os pedidos de prazo esperando você.
 *
 * Aparecem no alto de Aguardando você, antes das tarefas, porque um pedido
 * parado é pior do que uma tarefa parada: enquanto ninguém decide, duas pessoas
 * estão trabalhando com datas diferentes na cabeça.
 *
 * Só aparece para quem responde pela esteira da tarefa que ia se mexer. Quem não
 * pode decidir não vê o pedido, porque um pedido que você não pode resolver é só
 * uma notificação a mais.
 */

function Cartao({ p }: { p: PedidoPrazo }) {
  const { fluxos, perfis, eu, nomeDe, perfilDe, decidirPrazo } = useDados()
  const [indo, setIndo] = useState<'sim' | 'nao' | null>(null)

  const achado = useMemo(() => {
    for (const f of fluxos) {
      for (const et of f.etapas) {
        const i = et.itens.find((x) => x.id === p.item_id)
        if (i) return { f, i }
      }
    }
    return null
  }, [fluxos, p.item_id])

  if (!achado) return null
  const { f, i } = achado

  const decidir = async (aceita: boolean) => {
    setIndo(aceita ? 'sim' : 'nao')
    await decidirPrazo(p, aceita)
    setIndo(null)
  }

  const atrasa = p.de ? `${Math.round((Date.parse(p.para) - Date.parse(p.de)) / 864e5)}` : null

  return (
    <div className="pz">
      <div className="pz-topo">
        <span className="pz-ic"><Ic.agenda /></span>
        <div className="pz-txt">
          <b>{i.texto}</b>
          <span>
            {f.nome}
            {i.resp_id && ` · ${nomeDe(i.resp_id)}`}
          </span>
        </div>
        <span className="pz-datas">
          {p.de && <i className="de">{curta(p.de)}</i>}
          <Ic.seta />
          <i className="para">{curta(p.para)}</i>
          {atrasa && <small>{atrasa} dias depois</small>}
        </span>
      </div>

      <p className="pz-porque">
        {p.pedido_por && <Av p={perfilDe(p.pedido_por)} tam="sm" />}
        <span>
          <b>{nomeDe(p.pedido_por)}</b> pediu {rel(isoDe(p.criado_em)).toLowerCase()}
          {p.motivo ? <>: {p.motivo}</> : ', sem escrever o motivo'}
        </span>
      </p>

      {i.prazo_firme && (
        <p className="pz-firme">
          <Ic.lock />
          Esta data está marcada como firme. Aceitar move uma data que alguém tratou como
          intocável, então confira antes.
        </p>
      )}

      <div className="pz-botoes">
        <button className="btn ghost" disabled={!!indo} onClick={() => void decidir(false)}>
          {indo === 'nao' ? 'Recusando' : 'Recusar, a data fica'}
        </button>
        <button className="btn pri" disabled={!!indo} onClick={() => void decidir(true)}>
          {indo === 'sim' ? 'Remarcando' : `Aceitar e mover para ${curta(p.para)}`}
        </button>
      </div>
    </div>
  )
}

export function PedidosDePrazo() {
  const { pedidosPrazo, fluxos, perfis, eu } = useDados()

  const meus = useMemo(
    () => pedidosPrazo.filter((p) => {
      if (p.estado !== 'aberto') return false
      const f = fluxos.find((x) => x.id === p.fluxo_id)
      return !!f && mandaNoProcesso(eu, f, perfis)
    }),
    [pedidosPrazo, fluxos, perfis, eu],
  )

  if (!meus.length) return null

  return (
    <div className="pz-bloco">
      <div className="pz-h">
        <Ic.espera />
        <b>
          {meus.length === 1
            ? 'Um prazo espera o seu sim'
            : `${meus.length} prazos esperam o seu sim`}
        </b>
        <span>
          Outra esteira atrasou e puxou {meus.length === 1 ? 'esta data' : 'estas datas'}.
          Enquanto você não decidir, {meus.length === 1 ? 'ela fica' : 'elas ficam'} onde
          {meus.length === 1 ? ' está' : ' estão'}.
        </span>
      </div>
      {meus.map((p) => <Cartao key={p.id} p={p} />)}
    </div>
  )
}
