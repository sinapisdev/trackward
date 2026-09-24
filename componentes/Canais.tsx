'use client'

import { useMemo } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { Av } from './atomos'
import type { Canal } from '@/lib/tipos'

/**
 * A coluna de canais, do lado da conversa.
 *
 * É a mesma lista da tela Conversa, encolhida para caber ao lado do que
 * importa. Ela existe no Forward por um motivo de uso, não de simetria: sem ela,
 * responder a alguém que não é o canal aberto exigia trocar de tela, e trocar de
 * tela para dizer uma frase é o que faz a combinação acontecer fora do app.
 *
 * Só canal entra aqui. O que a pessoa escreve para si mesma vive em Notas, ao
 * lado, e por um motivo de leitura: um caderno listado entre os canais pede que
 * você comece a escrever como quem manda mensagem, e ninguém manda mensagem
 * para si mesmo sobre uma ideia de negócio.
 */
export function ListaCanais({ atual, aoEscolher }: {
  atual?: string
  aoEscolher: (id: string) => void
}) {
  const { canais, mensagens, naoLidas, meChamaram, eu, perfilDe } = useDados()
  const { abrir } = useModais()

  /** A hora da última mensagem de cada canal, numa passada só. */
  const ultima = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of mensagens) {
      if (!m.canal_id) continue
      const q = Date.parse(m.criado_em)
      if (q > (mapa.get(m.canal_id) ?? 0)) mapa.set(m.canal_id, q)
    }
    return mapa
  }, [mensagens])

  const grupos = useMemo(() => {
    const quando = (id: string) => ultima.get(id) ?? 0
    const ordenar = (lista: Canal[]) => [...lista].sort((a, b) => quando(b.id) - quando(a.id))
    const comum = (c: Canal) => c.tipo !== 'direto'
    const vivos = canais.filter((c) => !c.arquivado)
    return [
      { rotulo: 'Canais', itens: ordenar(vivos.filter((c) => comum(c) && !c.fluxo_id)) },
      { rotulo: 'Tracks', itens: ordenar(vivos.filter((c) => comum(c) && c.fluxo_id)) },
      { rotulo: 'Conversas', itens: ordenar(vivos.filter((c) => c.tipo === 'direto')) },
    ].filter((g) => g.itens.length)
  }, [canais, ultima])

  const nomeDoCanal = (c: Canal) => {
    if (c.tipo !== 'direto') return c.nome
    const outro = c.membros.find((m) => m !== eu.id)
    return outro ? perfilDe(outro).nome : c.nome
  }

  return (
    <nav className="cnx" aria-label="Canais e conversas">
      <div className="cnx-topo">
        <b>Canais</b>
        <button className="iconbtn" title="Novo canal" aria-label="Novo canal"
          onClick={() => abrir({ tipo: 'canal' })}><Ic.plus /></button>
      </div>

      <div className="cnx-rolo">
        {grupos.map((g) => (
          <div key={g.rotulo}>
            <div className="cnx-grupo">{g.rotulo}</div>
            {g.itens.map((c) => {
              const novas = naoLidas(c.id)
              const chamadas = meChamaram(c.id)
              const outro = c.tipo === 'direto' ? c.membros.find((m) => m !== eu.id) : null
              return (
                <button key={c.id} onClick={() => aoEscolher(c.id)}
                  className={`cnx-item ${atual === c.id ? 'on' : ''} ${novas ? 'novo' : ''}`}>
                  <span className="cnx-mk">
                    {outro ? <Av p={perfilDe(outro)} tam="sm" />
                      : c.tipo === 'fechado' ? <Ic.lock /> : <span aria-hidden>#</span>}
                  </span>
                  {/* O nome inteiro no título: a coluna é estreita de propósito,
                      para a conversa ser larga, e aí "implantacao-erp" vira
                      "implant...". Passar o mouse resolve sem gastar largura. */}
                  <span className="cnx-nm" title={nomeDoCanal(c)}>{nomeDoCanal(c)}</span>
                  {!!novas && (
                    <i className={`cnx-ct num ${chamadas ? 'hot' : ''}`}>{novas > 9 ? '9+' : novas}</i>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </nav>
  )
}
