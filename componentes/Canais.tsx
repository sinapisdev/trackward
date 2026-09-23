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
 * O despejo vem em cima e sozinho: é o canal que se abre mais vezes por dia, e o
 * único onde não tem ninguém do outro lado.
 */
export function ListaCanais({ atual, aoEscolher }: {
  atual?: string
  aoEscolher: (id: string) => void
}) {
  const { canais, mensagens, naoLidas, meChamaram, eu, perfilDe, meuDespejo, abrirDespejo } = useDados()
  const { abrir } = useModais()

  /** A hora da última mensagem de cada canal, numa passada só. */
  const ultima = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of mensagens) {
      const q = Date.parse(m.criado_em)
      if (q > (mapa.get(m.canal_id) ?? 0)) mapa.set(m.canal_id, q)
    }
    return mapa
  }, [mensagens])

  const grupos = useMemo(() => {
    const quando = (id: string) => ultima.get(id) ?? 0
    const ordenar = (lista: Canal[]) => [...lista].sort((a, b) => quando(b.id) - quando(a.id))
    const comum = (c: Canal) => c.tipo !== 'direto' && c.tipo !== 'pessoal'
    const vivos = canais.filter((c) => !c.arquivado)
    return [
      { rotulo: 'Só seu', itens: vivos.filter((c) => c.tipo === 'pessoal') },
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
        {/* O despejo nasce no primeiro uso, e não no cadastro: quem nunca jogou
            nada nele não precisa de um canal vazio no nome dele. */}
        {!meuDespejo && (
          <button className="cnx-despejo" onClick={async () => {
            const id = await abrirDespejo()
            if (id) aoEscolher(id)
          }}>
            <Ic.clipe />
            <span><b>Meu despejo</b><small>Joga aqui o que não pode esquecer</small></span>
          </button>
        )}

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
                    {c.tipo === 'pessoal' ? <Ic.clipe />
                      : outro ? <Av p={perfilDe(outro)} tam="sm" />
                        : c.tipo === 'fechado' ? <Ic.lock /> : <span aria-hidden>#</span>}
                  </span>
                  <span className="cnx-nm">{nomeDoCanal(c)}</span>
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
