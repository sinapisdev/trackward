'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PedidosDePrazo } from './PedidosDePrazo'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { AgendaCurta, Radar } from './Radar'
import { useCelular } from './partes'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { TrilhaH } from './Trilha'
import { classePrazo } from './partes'
import { dias, isoDe, rel } from '@/lib/datas'
import { etapaAtual, oQuePedi, pendencias } from '@/lib/regras'
import { AVULSA } from '@/lib/rotulos'
import type { Pendencia } from '@/lib/tipos'

type Filtro = 'tudo' | 'executar' | 'aprovar' | 'aguardando' | 'pedi'

/** A chave de uma pendência, para saber qual está aberta na gaveta. */
const chave = (p: Pendencia) =>
  p.tipo === 'aprov' ? `a-${p.etapa.id}` : p.tipo === 'pedi' ? `p-${p.item.id}` : `i-${p.item.id}`

/**
 * A fila de quem está usando o app: tudo que depende dele, em uma coluna, e o
 * próximo passo aberto ao lado. Um de cada vez, que é como o trabalho anda.
 */
export function Minhas() {
  const { eu, fluxos, fluxosComImplicitas, carregando, nomeDe, perfilDe, minhaLista,
    alternarItem, aprovar: aprovarSaida } = useDados()
  const { abrir } = useModais()
  const celular = useCelular()
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [termo, setTermo] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)

  /**
   * A fila lê `fluxosComImplicitas`, e não `fluxos`: o que foi combinado num
   * canal sem track mora numa track escondida, e lendo a outra lista a tarefa
   * não aparecia nem para quem ia executá-la.
   */
  const tudo = useMemo(
    () => [...pendencias(fluxosComImplicitas, eu.id), ...oQuePedi(fluxosComImplicitas, eu.id)],
    [fluxosComImplicitas, eu.id],
  )

  /** Índice de tarefas, para saber o que está travado por quem. */
  const porId = useMemo(() => {
    const m = new Map<string, { texto: string; feito: boolean; resp: string | null }>()
    for (const f of fluxosComImplicitas) for (const e of f.etapas) for (const i of e.itens) {
      m.set(i.id, { texto: i.texto, feito: i.feito, resp: i.resp_id })
    }
    return m
  }, [fluxosComImplicitas])

  const travasDe = (p: Pendencia) =>
    p.tipo === 'item'
      ? p.item.depende_de.map((id) => porId.get(id)).filter((t) => t && !t.feito)
      : []

  const ultima = useMemo(() => {
    const t = fluxos.flatMap((f) => f.log)
    t.sort((x, y) => y.criado_em.localeCompare(x.criado_em))
    return t[0] || null
  }, [fluxos])

  if (carregando) return <Carregando />

  const limpa = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const texto = (p: Pendencia) => (p.tipo === 'aprov' ? `Aprovar saída de ${p.etapa.nome}` : p.item.texto)
  const busca = tudo.filter((p) => !termo.trim() || limpa(texto(p)).includes(limpa(termo)))

  const aprovacoes = busca.filter((p) => p.tipo === 'aprov')
  const pedidas = busca.filter((p) => p.tipo === 'pedi')
  const travadas = busca.filter((p) => travasDe(p).length > 0)
  const executar = busca.filter((p) => p.tipo === 'item' && !travasDe(p).length)

  /**
   * "Pedi" é segmento próprio, e não entra em Aguardando.
   *
   * Aguardando quer dizer "a MINHA tarefa está travada por outra", e o que se
   * faz lá é esperar para então executar. Aqui a tarefa não é minha e nunca
   * vai ser: o que se faz é cobrar, ou deixar quieto. Misturar as duas tira o
   * sentido da palavra que já existia.
   */
  const abas: { id: Filtro; nome: string; itens: Pendencia[] }[] = [
    { id: 'tudo', nome: 'Tudo', itens: busca },
    { id: 'executar', nome: 'Executar', itens: executar },
    { id: 'aprovar', nome: 'Aprovar', itens: aprovacoes },
    { id: 'aguardando', nome: 'Aguardando', itens: travadas },
    { id: 'pedi', nome: 'Pedi', itens: pedidas },
  ]
  const atual = abas.find((a) => a.id === filtro) || abas[0]

  const blocos = filtro === 'tudo'
    ? [
        // Em "Tudo", o que eu pedi fica no fim, depois do que é meu: a fila
        // responde primeiro "o que eu faço", e só depois "o que estou esperando".
        { titulo: 'Vencida', itens: busca.filter((p) => p.tipo !== 'pedi' && p.prazo && dias(p.prazo) < 0 && !travasDe(p).length) },
        { titulo: 'Hoje', itens: busca.filter((p) => p.tipo !== 'pedi' && p.prazo && dias(p.prazo) === 0 && !travasDe(p).length) },
        { titulo: 'A seguir', itens: busca.filter((p) => p.tipo !== 'pedi' && (!p.prazo || dias(p.prazo) > 0) && !travasDe(p).length) },
        { titulo: 'Aguardando', itens: travadas },
        { titulo: 'Pedi', itens: pedidas },
      ].filter((b) => b.itens.length)
    : [{ titulo: atual.nome, itens: atual.itens }]

  const naFila = blocos.flatMap((b) => b.itens)
  /**
   * Qual pendência está aberta na gaveta.
   *
   * No computador a gaveta é uma coluna ao lado, e abrir a primeira sozinha é
   * bom: a tela nunca aparece pela metade. No celular ela é uma folha por cima
   * da lista, e abrir sozinha esconderia justamente a lista que a pessoa veio
   * ver. Lá ela só abre no toque.
   */
  const sel = naFila.find((p) => chave(p) === aberta) || (celular ? null : naFila[0]) || null

  const Etiqueta = ({ p }: { p: Pendencia }) =>
    p.tipo === 'aprov' ? <span className="fila-tag">Aprovar</span>
      : p.tipo === 'pedi' ? <span className="fila-tag">Pedi</span>
      : travasDe(p).length ? <span className="fila-tag">Dependência</span>
        : <span className="fila-tag">Executar</span>

  return (
    <>
      <PedidosDePrazo />

      <div className="hdr">
        <div>
          <div className="eyebrow">Sua fila</div>
          <h1>Meu trabalho</h1>
          <p className="lede">
            {tudo.length
              ? <>{tudo.length} {tudo.length > 1 ? 'pendências' : 'pendência'}. Um próximo passo de cada vez.</>
              : 'Nada pendente com você.'}
          </p>
        </div>
        <div className="hdr-actions">
          <button className="btn" onClick={() => abrir({ tipo: 'avulsa' })}>
            <Ic.plus />Tarefa
          </button>
        </div>
      </div>

      <div className="fila">
        <div className="fila-lista" data-tut="minhas-lista">
          <div className="filtros">
            <div className="seg" role="group" aria-label="Filtrar a fila">
              {abas.map((a) => (
                <button key={a.id} className={filtro === a.id ? 'on' : ''}
                  disabled={!a.itens.length && a.id !== 'tudo'}
                  onClick={() => { setFiltro(a.id); setAberta(null) }}>
                  {a.nome}<span className="num">{a.itens.length}</span>
                </button>
              ))}
            </div>
            <label className="campo-busca">
              <Ic.lupa />
              <input value={termo} onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar na minha fila" aria-label="Buscar na minha fila" />
            </label>
          </div>

          <p className="fila-ord"><Ic.chev />Ordenado por urgência</p>

          <div className="tf-cab fila-cab"><span>Pendência</span><span>Prazo</span></div>

          {blocos.map((b) => (
            <section key={b.titulo}>
              <h2 className={`fila-gh ${b.titulo === 'Vencida' ? 'late' : ''}`}>
                {b.titulo} <span className="num">({b.itens.length})</span>
              </h2>
              {b.itens.map((p) => {
                const travas = travasDe(p)
                const k = chave(p)
                const feitos = p.tipo === 'aprov' ? p.etapa.itens.filter((x) => x.feito).length : 0
                return (
                  <button key={k} className={`fila-l ${sel && chave(sel) === k ? 'on' : ''}`}
                    onClick={() => setAberta(k)}>
                    <span className={`ck ${p.tipo === 'aprov' ? 'on' : ''}`} aria-hidden>
                      {travas.length ? <Ic.lock /> : <Ic.check />}
                    </span>
                    <span className="fila-txt">
                      <b>{texto(p)}</b>
                      <small>
                        {/* A tarefa avulsa não tem endereço: dizer "Minha lista"
                            seria expor o andaime em que ela se apoia. */}
                        {p.fluxo.id === minhaLista?.id
                          ? AVULSA
                          /* Na track escondida o checkpoint se chama "Em andamento",
                             que não diz nada. O endereço de verdade é a conversa. */
                          : p.fluxo.implicita
                            ? `#${p.fluxo.nome}`
                            : `${p.fluxo.nome}${p.tipo === 'aprov' ? '' : ` / ${etapaAtual(p.fluxo)?.nome || ''}`}`}
                      </small>
                      {!!travas.length && (
                        <small className="fila-trava">
                          Aguardando {travas[0]!.resp ? nomeDe(travas[0]!.resp) : 'outra tarefa'} concluir a revisão.
                        </small>
                      )}
                    </span>
                    <Etiqueta p={p} />
                    <Av p={perfilDe(p.tipo === 'aprov' ? p.etapa.aprovador_id : p.item.resp_id)} tam="sm" />
                    <span className={`due ${classePrazo(p.prazo)}`}>
                      {p.tipo === 'aprov'
                        ? `${feitos} de ${p.etapa.itens.length} prontas`
                        : travas.length ? (travas[0]!.resp ? nomeDe(travas[0]!.resp) : 'Travada')
                          : p.prazo ? rel(p.prazo) : 'Sem prazo'}
                    </span>
                    <span className="fila-chev"><Ic.seta /></span>
                  </button>
                )
              })}
            </section>
          ))}

          {!naFila.length && (
            <div className="tb-vazio">
              {filtro === 'tudo' ? 'Nada pendente com você.' : `Nada em ${atual.nome.toLowerCase()}.`}
            </div>
          )}

          {ultima && (
            <p className="fila-atv">
              <Ic.espera />
              Última atividade: <b>{ultima.por_ia ? 'A leitura da conversa' : nomeDe(ultima.quem_id)}</b>{' '}
              {ultima.texto} · {rel(isoDe(ultima.criado_em))}
            </p>
          )}
        </div>

        {/* No celular a gaveta é folha: ela vinha DEPOIS da lista inteira, fora
            da tela, então tocar numa pendência parecia não fazer nada, e o
            "Aprovar saída" que mora dentro dela era inalcançável. */}
        {sel && celular && (
          <div className="folha-fundo" onClick={() => setAberta(null)} aria-hidden />
        )}
        {sel && <Gaveta p={sel} travas={travasDe(sel).length}
          avulsa={sel.fluxo.id === minhaLista?.id} nomeDe={nomeDe} perfilDe={perfilDe}
          aoFechar={() => setAberta(null)}
          aoConcluir={() => { if (sel.tipo === 'item') void alternarItem(sel.item) }}
          aoAprovar={() => void aprovarSaida(sel.fluxo)} />}
      </div>

      {/* No celular a página inicial virou a conversa, então o radar e a agenda
          moram aqui: esta é a tela do trabalho, e eles respondem "o que está
          parado" e "o que vem agora", que são perguntas da mesma família que a
          fila. No computador eles continuam no Forward, ao lado da conversa. */}
      {celular && (
        <div className="min-rail">
          <Radar lista={fluxos.filter((f) => f.id !== minhaLista?.id)} compacto />
          <div className="rail-sep" />
          <AgendaCurta />
        </div>
      )}
    </>
  )
}

/** A gaveta: a pendência escolhida, com tudo que ela precisa para sair daqui. */
function Gaveta({ p, travas, avulsa, nomeDe, perfilDe, aoFechar, aoConcluir, aoAprovar }: {
  p: Pendencia
  travas: number
  /** Tarefa sem objetivo e sem rotina: a trilha e o critério não existem nela. */
  avulsa: boolean
  nomeDe: (id: string | null) => string
  perfilDe: (id: string | null) => import('@/lib/tipos').Perfil
  aoFechar: () => void
  aoConcluir: () => void
  aoAprovar: () => void
}) {
  const { devolverItem, eu, canais } = useDados()
  const [devolvendo, setDevolvendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [indo, setIndo] = useState(false)

  const et = etapaAtual(p.fluxo)
  const titulo = p.tipo === 'aprov' ? `Aprovar saída de ${p.etapa.nome}` : p.item.texto
  const resp = p.tipo === 'aprov' ? p.etapa.aprovador_id : p.item.resp_id
  const feito = p.tipo === 'item' && p.item.feito
  /** Nasceu de uma conversa que ainda não virou track. O endereço é o canal. */
  const doCanal = !!p.fluxo.implicita
  const canal = doCanal ? canais.find((c) => c.fluxo_id === p.fluxo.id) : undefined

  // Tarefa minha, pedida por outra pessoa, e ainda por fazer.
  const podeDevolver = p.tipo === 'item' && !feito
    && p.item.resp_id === eu.id
    && !!p.item.autor_id && p.item.autor_id !== eu.id

  return (
    <aside className="gaveta" data-tut="minhas-gaveta">
      <div className="gaveta-topo">
        <span className="gaveta-onde">
          {avulsa ? AVULSA : doCanal ? `#${p.fluxo.nome}` : `${p.fluxo.nome} / ${et?.nome}`}
        </span>
        <button className="iconbtn so-celular" aria-label="Fechar" onClick={aoFechar}><Ic.x /></button>
      </div>
      <h2>{titulo}</h2>
      {p.tipo === 'item' && !!p.item.descricao && (
        <p className="gaveta-desc">{p.item.descricao}</p>
      )}
      <span className={`selo ${travas ? 'travado' : feito ? 'feito' : ''}`}>
        {travas ? <><Ic.lock />Aguardando dependência</> : feito ? <><Ic.check />Concluída</> : <><Ic.dot />A fazer</>}
      </span>

      <dl className="gaveta-kv">
        <div>
          <dt>Responsável</dt>
          <dd><Av p={perfilDe(resp)} tam="sm" />{nomeDe(resp)}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd><Ic.agenda />{p.prazo ? rel(p.prazo) : 'Sem prazo'}</dd>
        </div>
      </dl>

      {avulsa ? (
        <>
          <h3>Onde esta tarefa está</h3>
          <p className="gaveta-crit">
            Em lugar nenhum, de propósito. Ela não pertence a objetivo nem a rotina, e só
            você a enxerga. Para pedir algo a alguém, crie a tarefa dentro de uma track.
          </p>
        </>
      ) : doCanal ? (
        /* A track escondida tem um checkpoint só, chamado "Em andamento", e
           nenhum critério. Desenhar a trilha dela seria mostrar um andaime e
           chamá-lo de processo. O que é verdade é que isto foi combinado numa
           conversa, e é para lá que a pessoa precisa poder voltar. */
        <>
          <h3>Onde esta tarefa está</h3>
          <p className="gaveta-crit">
            Combinada em <b>#{p.fluxo.nome}</b>, que ainda não tem trilha. Enquanto não
            tiver, ela vive na conversa.
          </p>
        </>
      ) : (
        <>
          <h3>Onde esta tarefa está</h3>
          <TrilhaH f={p.fluxo} miuda />
          <p className="gaveta-nota">
            Checkpoint {p.fluxo.atual + 1} de {p.fluxo.etapas.length}
            {et && ` · ${et.itens.filter((x) => x.feito).length} de ${et.itens.length} tarefas prontas`}
          </p>

          <h3>Critério de passagem</h3>
          <p className="gaveta-crit">{et?.criterio || 'Critério não definido nesta etapa.'}</p>
          <p className="gaveta-nota">Aprovação do checkpoint: {nomeDe(et?.aprovador_id ?? null)}</p>
        </>
      )}

      {/* Em "Pedi" a tarefa é de outra pessoa, e não há botão: concluir o
          trabalho alheio é dizer que foi feito sem ter feito. O que existe
          aqui é saber em que pé está, e a porta de volta para a conversa. */}
      {p.tipo === 'pedi' ? (
        <p className="gaveta-nota">
          Você pediu isto a {nomeDe(p.item.resp_id)}. Quem marca como feita é quem faz.
        </p>
      ) : p.tipo === 'aprov' ? (
        <button className="btn pri larga" onClick={aoAprovar}><Ic.check />Aprovar saída</button>
      ) : travas ? (
        <button className="btn larga" disabled><Ic.lock />Concluir tarefa</button>
      ) : (
        <button className="btn pri larga" onClick={aoConcluir}>
          <Ic.check />{feito ? 'Reabrir tarefa' : 'Marcar como feita'}
        </button>
      )}
      {/*
        * Devolver, e só quando há para quem.
        *
        * Aparece na tarefa que OUTRA PESSOA pediu, nunca na que você mesmo
        * escreveu, porque devolver para si não quer dizer nada. E some depois
        * de feita: devolver o que já foi entregue não é devolver, é desfazer, e
        * isso é outra conversa.
        *
        * Fica abaixo da ação principal e sem destaque. O lima é de quem faz o
        * trabalho andar, e devolver é o contrário: é dizer que ele não anda
        * por aqui.
        */}
      {podeDevolver && (
        devolvendo ? (
          <div className="gav-devolver">
            <label htmlFor="gav-pq">Por que está devolvendo?</label>
            <textarea className="inp" id="gav-pq" rows={2} autoFocus value={motivo}
              placeholder="Quem deveria fazer, ou o que falta"
              onChange={(e) => setMotivo(e.target.value)} />
            <p className="hint">
              Ela volta para {nomeDe(p.item.autor_id)}, com o que você escreveu junto. Sem o
              motivo, quem pediu não sabe o que fazer com ela.
            </p>
            <div className="row-inline">
              <button className="btn ghost" onClick={() => setDevolvendo(false)}>Deixa pra lá</button>
              <button className="btn" disabled={!motivo.trim() || indo}
                onClick={async () => {
                  setIndo(true)
                  const deu = await devolverItem(p.item, motivo)
                  setIndo(false)
                  if (deu) { setDevolvendo(false); setMotivo(''); aoFechar() }
                }}>Devolver</button>
            </div>
          </div>
        ) : (
          <button className="btn ghost larga" onClick={() => setDevolvendo(true)}>
            <Ic.devolver />Devolver para quem pediu
          </button>
        )
      )}

      {/* A track escondida não está em Tracks, então mandar para ela seria
          mandar para uma tela que a pessoa não sabe que existe. O endereço
          dela é a conversa onde o trabalho foi combinado. */}
      {!avulsa && (doCanal
        ? canal && (
          <Link className="gaveta-abrir" href={`/chat/${canal.id}`}>Abrir a conversa <Ic.seta /></Link>
        )
        : <Link className="gaveta-abrir" href={`/fluxo/${p.fluxo.id}`}>Abrir track <Ic.seta /></Link>
      )}
    </aside>
  )
}
