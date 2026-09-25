'use client'

import { useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import { Anexos } from '@/componentes/Anexos'
import { classePrazo } from '@/componentes/partes'
import { curta, hojeIso, isoDe, rel, soma } from '@/lib/datas'
import type { Etapa, Fluxo, TipoDecisao } from '@/lib/tipos'

/**
 * A tela de decidir a saída de um checkpoint.
 *
 * Aprovar era um botão. Botão é um gesto sem informação: você clica sem ver o que
 * está aceitando, e a assinatura mais importante do processo vira a mais barata.
 *
 * Aqui o aprovador vê o que foi entregue, com a prova de cada entrega e quem fez,
 * lê o critério que ele mesmo combinou, e escolhe entre três saídas honestas:
 *
 *   Aprovar        está de acordo com o critério, segue
 *   Com ressalva   segue, mas fica uma pendência, que vira tarefa do próximo
 *   Devolver       não segue, e as tarefas apontadas voltam para quem as fez
 *
 * Devolver e ressalvar exigem motivo escrito. Quem recebe de volta precisa saber
 * o que fazer, e "devolvido" sozinho não diz nada a ninguém.
 */

type Saida = { id: TipoDecisao; rotulo: string; sobre: string; icone: React.ReactNode }

/**
 * As três saídas, e as mesmas três sozinho.
 *
 * O que muda é só a palavra: sem ninguém para dar aceite, "aprovar" vira
 * "fechar", e devolver deixa de ser mandar de volta para alguém e passa a ser
 * voltar atrás. A tela é a mesma de propósito, porque o valor dela não é a
 * assinatura, é ver o que foi entregue antes de seguir.
 */
const saidasDe = (sozinho: boolean): Saida[] => [
  { id: 'aprovou', rotulo: sozinho ? 'Fechar' : 'Aprovar', icone: <Ic.check />,
    sobre: 'Está de acordo com o critério. A esteira segue para o próximo checkpoint.' },
  { id: 'ressalva', rotulo: sozinho ? 'Fechar com pendência' : 'Aprovar com ressalva', icone: <Ic.ressalva />,
    sobre: 'Segue, mas fica uma pendência anotada, que vira tarefa do próximo checkpoint.' },
  { id: 'devolveu', rotulo: sozinho ? 'Voltar atrás' : 'Devolver', icone: <Ic.devolver />,
    sobre: sozinho
      ? 'Não segue. As tarefas que você marcar voltam a ficar em aberto.'
      : 'Não segue. As tarefas que você marcar voltam a ficar em aberto para quem as fez.' },
]

export function Decisao({ f, etapa, fechar }: {
  f: Fluxo
  etapa: Etapa
  fechar: () => void
}) {
  const { eu, perfilDe, nomeDe, anexosDe, decidir, decisoesDe, pode } = useDados()
  const SAIDAS = useMemo(() => saidasDe(!pode.aprovacao), [pode.aprovacao])
  const [saida, setSaida] = useState<TipoDecisao>('aprovou')
  const [nota, setNota] = useState('')
  const [reabrir, setReabrir] = useState<Set<string>>(new Set())
  const [prazo, setPrazo] = useState(soma(hojeIso(), 7))
  const [indo, setIndo] = useState(false)

  const ultimo = f.atual === f.etapas.length - 1
  const proxima = f.etapas[f.atual + 1]
  const feitas = etapa.itens.filter((i) => i.feito)
  const abertas = etapa.itens.filter((i) => !i.feito)
  const comProva = feitas.filter((i) => anexosDe(i.id).length).length

  const jaDecidido = useMemo(
    () => decisoesDe(f.id).filter((d) => d.etapa_id === etapa.id),
    [decisoesDe, f.id, etapa.id],
  )

  const precisaNota = saida !== 'aprovou'
  const impedido = saida !== 'devolveu' && abertas.length > 0
  const pronto = !impedido && (!precisaNota || !!nota.trim()) && !indo

  const alternar = (id: string) =>
    setReabrir((s) => {
      const novo = new Set(s)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const confirmar = async () => {
    setIndo(true)
    const ok = await decidir(f, {
      tipo: saida,
      nota: nota.trim(),
      reabrir: [...reabrir],
      prazo: saida === 'ressalva' && !ultimo ? prazo : null,
    })
    setIndo(false)
    if (ok) fechar()
  }

  return (
    <div className="dec-fundo" onClick={fechar}>
      <div className="dec" role="dialog" aria-modal="true" aria-labelledby="dec-t"
        onClick={(e) => e.stopPropagation()}>

        <header className="dec-h">
          <div>
            <span className="rot">{pode.aprovacao ? 'Decidir a saída' : 'Fechar o checkpoint'}</span>
            <h3 id="dec-t">{etapa.nome}</h3>
            <p>{f.nome}</p>
          </div>
          <button className="iconbtn" onClick={fechar} aria-label="Fechar"><Ic.x /></button>
        </header>

        <div className="dec-corpo">
          {!!etapa.criterio && (
            <div className="dec-criterio">
              <span>{pode.aprovacao ? 'O critério que vocês combinaram' : 'O critério que você combinou'}</span>
              <b>{etapa.criterio}</b>
            </div>
          )}

          <div className="dec-placar">
            <span><b>{feitas.length}</b> de {etapa.itens.length} entregue{etapa.itens.length === 1 ? '' : 's'}</span>
            <span className={comProva < feitas.length ? 'fraco' : ''}>
              <b>{comProva}</b> com prova anexada
            </span>
            {!!abertas.length && (
              <span className="late"><b>{abertas.length}</b> ainda em aberto</span>
            )}
          </div>

          <div className="dec-lista">
            {etapa.itens.map((i) => {
              const provas = anexosDe(i.id)
              const marcada = reabrir.has(i.id)
              return (
                <div key={i.id} className={`dec-item ${i.feito ? 'ok' : 'aberta'} ${marcada ? 'volta' : ''}`}>
                  <span className="dec-mk">
                    {i.feito ? <Ic.check /> : <span className="oco" />}
                  </span>
                  <div className="dec-txt">
                    <b>{i.texto}</b>
                    <span>
                      {i.resp_id ? nomeDe(i.resp_id) : 'Sem responsável'}
                      {i.prazo && <i className={i.feito ? '' : classePrazo(i.prazo)}> · {rel(i.prazo)}</i>}
                      {!provas.length && i.feito && <i className="sem"> · sem prova anexada</i>}
                    </span>
                    <Anexos item={i} podeAnexar={false} />
                  </div>
                  {i.resp_id && <Av p={perfilDe(i.resp_id)} tam="sm" />}
                  {saida === 'devolveu' && i.feito && (
                    <button className={`dec-volta ${marcada ? 'on' : ''}`}
                      onClick={() => alternar(i.id)}
                      aria-pressed={marcada}
                      title="Devolver esta tarefa para quem a fez">
                      <Ic.devolver />{marcada ? 'Volta' : 'Devolver'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {!!jaDecidido.length && (
            <div className="dec-antes">
              <span>Já aconteceu neste checkpoint</span>
              {jaDecidido.map((d) => (
                <p key={d.id}>
                  <b>{d.tipo === 'devolveu' ? 'Devolvido' : d.tipo === 'ressalva' ? 'Ressalva' : 'Aprovado'}</b>
                  {' por '}{nomeDe(d.quem_id)}, {curta(isoDe(d.criado_em))}
                  {d.nota && `: ${d.nota}`}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="dec-saidas">
          {SAIDAS.map((o) => (
            <button key={o.id} className={`dec-op ${saida === o.id ? 'on' : ''} ${o.id}`}
              onClick={() => setSaida(o.id)} aria-pressed={saida === o.id}>
              <span className="ic">{o.icone}</span>
              <span><b>{o.rotulo}</b><small>{o.sobre}</small></span>
            </button>
          ))}
        </div>

        <div className="dec-pe">
          {precisaNota && (
            <label className="dec-nota">
              <span>{saida === 'devolveu' ? 'O que precisa ser refeito' : 'Qual é a pendência'}</span>
              <textarea rows={2} value={nota} autoFocus
                onChange={(e) => setNota(e.target.value)}
                placeholder={saida === 'devolveu'
                  ? 'Ex.: o comprovante veio cortado, não dá para ler o valor'
                  : 'Ex.: falta a via assinada pelo fornecedor'} />
            </label>
          )}

          {saida === 'ressalva' && !ultimo && (
            <label className="dec-prazo">
              <span>Até quando resolver, em {proxima?.nome}</span>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </label>
          )}

          {impedido && (
            <p className="dec-aviso">
              <Ic.trava />
              Ainda {abertas.length === 1 ? 'há 1 tarefa' : `há ${abertas.length} tarefas`} em aberto.
              Dá para devolver, mas não para aprovar.
            </p>
          )}

          <div className="dec-botoes">
            <button className="btn ghost" onClick={fechar}>Cancelar</button>
            <button className={`btn pri ${saida}`} onClick={() => void confirmar()} disabled={!pronto}>
              {indo ? 'Registrando' : saida === 'devolveu'
                ? 'Devolver'
                : saida === 'ressalva'
                  ? 'Aprovar com ressalva'
                  : ultimo
                    ? (f.tipo === 'ciclo' ? 'Aprovar e fechar a volta' : 'Aprovar e concluir')
                    : 'Aprovar a saída'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
