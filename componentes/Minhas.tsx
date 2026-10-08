'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PedidosDePrazo } from './PedidosDePrazo'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { AgendaCurta, Radar } from './Radar'
import { useCelular } from './partes'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import { TrilhaH } from './Trilha'
import { MenuTarefa } from './MenuTarefa'
import { Anexos } from './Anexos'
import { classePrazo } from './partes'
import { dias, isoDe, rel } from '@/lib/datas'
import { etapaAtual, oQuePedi, pendencias } from '@/lib/regras'
import { AVULSA, NOME_DA_LISTA } from '@/lib/rotulos'
import { minhaCarga } from '@/lib/sobrecarga'
import type { Etapa, Fluxo, Item, Pendencia } from '@/lib/tipos'

type Filtro = 'tudo' | 'executar' | 'aprovar' | 'aguardando' | 'pedi'

/** A chave de uma pendência, para saber qual está aberta na gaveta. */
const chave = (p: Pendencia) =>
  p.tipo === 'aprov' ? `a-${p.etapa.id}` : p.tipo === 'pedi' ? `p-${p.item.id}` : `i-${p.item.id}`

/**
 * A fila de quem está usando o app: tudo que depende dele, em uma coluna, e o
 * próximo passo aberto ao lado. Um de cada vez, que é como o trabalho anda.
 */
export function Minhas() {
  const { eu, org, pessoal, fluxos, fluxosComImplicitas, carregando, nomeDe, perfilDe, minhaLista,
    alternarItem, aprovar: aprovarSaida, meuDia, minhasEntregas, espacos,
    trocarEspaco, notas, salvarNota, excluirItem } = useDados()
  const { abrir } = useModais()
  const celular = useCelular()
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  /**
   * A lente do pessoal, e ela só existe NO pessoal.
   *
   * Dentro de uma empresa não há o que estreitar: a lista já é só daquela
   * empresa, porque quem entrou na Simonetto veio trabalhar nela e tarefa da
   * Silvereng ali é ruído sobre o que ela não vai fazer agora. No pessoal é o
   * contrário: é a única tela onde a conta da pessoa inteira existe, e a
   * pergunta "o que eu dou conta hoje" não se divide pelo número de contratos
   * que ela tem. Então lá a lista soma tudo, e a lente estreita para o que é
   * dela mesma.
   */
  const [soPessoal, setSoPessoal] = useState(false)
  const [indo, setIndo] = useState('')
  const [termo, setTermo] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  /* O pedido de anexar vem do menu da linha e é atendido na gaveta. Carimbo de
     hora e não booleano: pedir duas vezes seguidas precisa abrir duas vezes. */
  const [pedindoArquivo, setPedindoArquivo] = useState(0)

  /**
   * A fila lê `fluxosComImplicitas`, e não `fluxos`: o que foi combinado num
   * canal sem track mora numa track escondida, e lendo a outra lista a tarefa
   * não aparecia nem para quem ia executá-la.
   */
  const daqui = useMemo(
    () => [...pendencias(fluxosComImplicitas, eu.id), ...oQuePedi(fluxosComImplicitas, eu.id)],
    [fluxosComImplicitas, eu.id],
  )

  /**
   * As de FORA, vestidas de pendência.
   *
   * Vestir em vez de desenhar uma segunda lista é o que faz os filtros, os
   * blocos por prazo, a busca e a ordenação valerem para elas sem nenhuma linha
   * a mais: trocar de lente não pode custar a tela que a pessoa já conhece.
   *
   * O que falta de verdade são as peças que não atravessam, e elas ficam
   * vazias de propósito: a trilha do outro espaço, as outras tarefas do
   * checkpoint e o nome de quem está travando. A linha diz `fora`, e o que
   * precisa daquelas peças acontece lá, num toque.
   */
  const deFora = useMemo<Pendencia[]>(() => {
    const locais = new Set(daqui.map((p) => (p.tipo === 'aprov' ? p.etapa.id : p.item.id)))
    return meuDia
      .filter((l) => l.org_id !== org.id && !locais.has(l.item_id))
      .map((l) => {
        const fluxo = {
          id: l.fluxo_id, nome: l.track, implicita: l.implicita, etapas: [], log: [],
        } as unknown as Fluxo
        const etapa = {
          id: l.etapa_id, nome: l.checkpoint, itens: [], aprovador_id: l.resp_id, prazo: l.prazo,
        } as unknown as Etapa
        const item = {
          id: l.item_id, texto: l.texto, resp_id: l.resp_id, prazo: l.prazo,
          feito: false, priv: l.priv, depende_de: [], fluxo_id: l.fluxo_id, etapa_id: l.etapa_id,
        } as unknown as Item
        const comum = { fluxo, etapa, prazo: l.prazo, fora: l.espaco, org_id: l.org_id, travado: l.travado }
        return (l.tipo === 'aprov'
          ? { tipo: 'aprov' as const, item: null, ...comum }
          : { tipo: l.tipo, item, ...comum }) as Pendencia
      })
  }, [meuDia, org.id, daqui])

  /**
   * A fila, e de onde ela vem depende de ONDE você está.
   *
   * **Numa empresa, só o daquela empresa.** Entrar na Simonetto e ver tarefa da
   * Silvereng é misturar contexto no lugar em que a pessoa veio trabalhar numa
   * coisa só, e é ruído: ali ela não vai fazer nada a respeito da outra.
   *
   * **No pessoal, tudo.** É lá que a pergunta "o que eu dou conta hoje" se faz,
   * e é a única tela onde a conta da pessoa inteira existe, porque a conta não
   * se divide pelo número de contratos que ela tem.
   *
   * A agenda NÃO segue esta regra, e a diferença não é incoerência: um
   * compromisso ocupa o corpo, e o corpo não está em dois lugares. Uma tarefa
   * da Silvereng não impede nada na Simonetto, e por isso ela pode esperar o
   * lugar dela.
   */
  const tudo = useMemo(() => {
    if (!pessoal) return daqui
    if (!soPessoal) return [...daqui, ...deFora]
    // No pessoal, "só pessoal" estreita para o que é daqui mesmo.
    return daqui
  }, [daqui, deFora, soPessoal, pessoal])

  /**
   * A nota desta tarefa, e o caminho de ida.
   *
   * São as mesmas duas funções de `TelaFluxo`, e isso é cópia de propósito: o
   * que não pode existir em dois lugares é a REGRA, e a regra aqui é uma linha
   * (`notas.item_id` é a ligação). Pôr isto num gancho compartilhado custaria
   * mais do que ele devolve, e a ligação está escrita no AGENTS.
   */
  const notaDaTarefa = (itemId: string) => notas.find((n) => n.item_id === itemId && !n.arquivada)

  const abrirNotaDaTarefa = async (x: Item) => {
    const existente = notaDaTarefa(x.id)
    if (existente) { router.push(`/notas?nota=${existente.id}`); return }
    const id = await salvarNota({ texto: `${x.texto}\n\n`, item_id: x.id, fluxo_id: x.fluxo_id })
    if (id) router.push(`/notas?nota=${id}`)
  }

  /**
   * Quem pode mexer: quem escreveu a tarefa, ou quem a executa.
   *
   * E nunca a de OUTRO espaço: `excluirItem` e `salvarNota` escrevem com a
   * sessão em uso, e o banco recusaria a linha de uma casa que não é a da
   * sessão com uma frase sobre política, não sobre permissão. De lá se mexe
   * lá, que é a um toque na própria linha.
   */
  const meuItem = (p: Pendencia) => p.tipo !== 'aprov' && !p.fora && !!p.item
    && (p.item.autor_id === eu.id || p.item.resp_id === eu.id)

  /** Índice de tarefas, para saber o que está travado por quem. */
  const porId = useMemo(() => {
    const m = new Map<string, { texto: string; feito: boolean; resp: string | null }>()
    for (const f of fluxosComImplicitas) for (const e of f.etapas) for (const i of e.itens) {
      m.set(i.id, { texto: i.texto, feito: i.feito, resp: i.resp_id })
    }
    return m
  }, [fluxosComImplicitas])

  /** Os outros espaços desta pessoa. Vazio quer dizer que a lente não existe. */
  const outros = useMemo(
    () => espacos.filter((e) => e.ativo && e.org_id !== org.id),
    [espacos, org.id],
  )

  /**
   * A carga da PESSOA, somando os espaços dela.
   *
   * Ela mora aqui e não no radar da operação de propósito: o radar compara
   * pessoas de um mesmo espaço para quem distribui trabalho decidir, e pôr uma
   * contando quatro empresas ao lado de outra contando uma faria a tabela
   * mentir onde ela é usada para decidir. Esta é a pergunta que a pessoa faz
   * sobre si mesma, e por isso ela aparece na fila dela.
   */
  const carga = useMemo(() => {
    /* A carga é a do que está NA TELA. Dizer "no seu ritmo isto leva 50 dias"
       contando quatro espaços, numa lista que mostra um, é falar de uma lista
       que a pessoa não está vendo. */
    const abertas = tudo.filter((p) => p.tipo === 'item').map((p) => ({ prazo: p.prazo }))
    return minhaCarga(abertas, minhasEntregas, 30)
  }, [tudo, minhasEntregas])

  /**
   * O que acontece ao tocar na linha.
   *
   * Daqui, abre a gaveta, como sempre. De fora, leva ao espaço da tarefa: a
   * gaveta precisa da trilha, do critério e das outras tarefas do checkpoint,
   * e nada disso atravessa. O que atravessa é concluir, e isso acontece no
   * visto da própria linha, sem sair do lugar.
   */
  const abrirLinha = async (p: Pendencia, k: string) => {
    if (!p.fora) { setAberta(k); return }
    await irPara({ org_id: p.org_id!, fluxo_id: p.fluxo.id, implicita: !!p.fluxo.implicita })
  }

  /**
   * Levar a pessoa até a tarefa, trocando de espaço quando ela é de outro.
   *
   * Concluir daqui exigiria uma função de banco que escrevesse num espaço que
   * não é o da sessão, e com ela ficariam de fora o rastro no canal e o aviso
   * de quem pediu, que são do lado do app. A tarefa se faz onde a equipe dela
   * vê: esta lista responde "o que eu faço hoje", e leva até lá.
   */
  const irPara = async (l: { org_id: string; fluxo_id: string; implicita: boolean }) => {
    const destino = l.implicita ? '/minhas' : `/fluxo/${l.fluxo_id}`
    if (l.org_id === org.id) { router.push(destino); return }
    const espaco = espacos.find((e) => e.org_id === l.org_id)
    if (!espaco) return
    setIndo(l.org_id)
    await trocarEspaco(espaco.perfil_id)
    router.push(destino)
    setIndo('')
  }

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
  /* "Presa" é a mesma condição vista de dois jeitos: daqui, pelas dependências
     carregadas; de fora, pelo que o banco calculou, porque elas não atravessam. */
  const presa = (p: Pendencia) => travasDe(p).length > 0 || !!p.travado
  const travadas = busca.filter(presa)
  const executar = busca.filter((p) => p.tipo === 'item' && !presa(p))

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
        { titulo: 'Vencida', itens: busca.filter((p) => p.tipo !== 'pedi' && p.prazo && dias(p.prazo) < 0 && !presa(p)) },
        { titulo: 'Hoje', itens: busca.filter((p) => p.tipo !== 'pedi' && p.prazo && dias(p.prazo) === 0 && !presa(p)) },
        { titulo: 'A seguir', itens: busca.filter((p) => p.tipo !== 'pedi' && (!p.prazo || dias(p.prazo) > 0) && !presa(p)) },
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
  /* A gaveta mostra trilha, critério e as outras tarefas do checkpoint, e nada
     disso atravessa: para o que é de fora ela abriria pela metade. Lá a linha
     leva ao espaço da tarefa, onde a gaveta está inteira. */
  const daquiNaFila = naFila.filter((p) => !p.fora)
  const sel = naFila.find((p) => chave(p) === aberta && !p.fora)
    || (celular ? null : daquiNaFila[0]) || null

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
          <h1>Tarefas</h1>
          <p className="lede">
            {tudo.length
              ? <>
                  {tudo.length} {tudo.length > 1 ? 'pendências' : 'pendência'}
                  {pessoal && !soPessoal && outros.length > 0 && ', somando os seus espaços'}.{' '}
                  {/* A frase fala de FILA e de prazo, nunca de esforço: "a sua
                      fila não cabe no tempo que tem" é sobre distribuição, "você
                      está devagar" é sobre a pessoa, e a segunda é o tipo de
                      frase que faz alguém desligar o app. Só aparece quando há o
                      que dizer: sem base, e no tranquilo, ela seria ruído. */}
                  {carga.faixa === 'sobrecarregado' || carga.faixa === 'apertado'
                    ? <b className={carga.faixa === 'sobrecarregado' ? 'fila-aperto' : ''}>
                        No seu ritmo dos últimos 30 dias, isto leva{' '}
                        {Math.round(carga.diasDeFila)} dias, e o prazo mais
                        distante é em {carga.horizonte}.
                      </b>
                    : 'Um próximo passo de cada vez.'}
                </>
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
            {/* O estreitamento para o pessoal, e não um seletor de espaço: a
                pergunta que se faz aqui é "e se eu olhar só o que é meu",
                não "em qual empresa estou". Só aparece para quem tem um
                pessoal E alguma outra coisa, senão não estreita nada. */}
            {pessoal && outros.length > 0 && (
              <button className={`btn fila-so ${soPessoal ? 'on' : ''}`}
                aria-pressed={soPessoal}
                onClick={() => { setSoPessoal((v) => !v); setAberta(null) }}>
                <Ic.eu />Só pessoal
              </button>
            )}
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
                /* Concluir pela própria linha, e de qualquer espaço.
                   Sem isto, fechar dez coisas no fim do dia custava dez trocas
                   de espaço e dez voltas, e uma lista que não deixa fechar o
                   que foi feito é uma lista que só cresce. O rastro no canal e
                   o aviso de quem pediu saem iguais, porque quem conclui é o
                   banco (`concluir_meu_item`, seção 69). */
                const podeConcluir = p.tipo === 'item' && !travas.length && !p.travado
                return (
                  <div key={k} className={`fila-l ${sel && chave(sel) === k ? 'on' : ''}
                    ${p.fora ? 'fora' : ''}`}
                    role="button" tabIndex={0}
                    onClick={() => void abrirLinha(p, k)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void abrirLinha(p, k) }}>
                    <span className={`ck ${p.tipo === 'aprov' ? 'on' : ''} ${podeConcluir ? 'pode' : ''}`}
                      role={podeConcluir ? 'checkbox' : undefined}
                      aria-checked={podeConcluir ? false : undefined}
                      aria-label={podeConcluir ? `Concluir ${texto(p)}` : undefined}
                      onClick={(e) => {
                        if (!podeConcluir || p.item === null) return
                        e.stopPropagation()
                        void alternarItem(p.item)
                      }}>
                      {travas.length || p.travado ? <Ic.lock /> : <Ic.check />}
                    </span>
                    <span className="fila-txt">
                      <b>{texto(p)}</b>
                      <small>
                        {/* De qual espaço ela é, quando não é deste. Sem isto a
                            linha vira uma tarefa que a pessoa não reconhece e
                            não acha em lugar nenhum. */}
                        {!!p.fora && <span className="fila-esp">{p.fora}</span>}
                        {/* A tarefa avulsa não tem endereço: dizer "Minha lista"
                            seria expor o andaime em que ela se apoia. */}
                        {p.fluxo.id === minhaLista?.id
                          || (p.fora && p.tipo === 'item' && p.fluxo.nome === NOME_DA_LISTA)
                          ? AVULSA
                          /* Na track escondida o checkpoint se chama "Em andamento",
                             que não diz nada. O endereço de verdade é a conversa. */
                          : p.fluxo.implicita
                            ? `#${p.fluxo.nome}`
                            /* De fora não há trilha para perguntar qual é o
                               checkpoint corrente, e o nome dele veio pronto. */
                            : p.fora
                              ? `${p.fluxo.nome}${p.tipo === 'aprov' ? '' : ` / ${p.etapa.nome}`}`
                              : `${p.fluxo.nome}${p.tipo === 'aprov' ? '' : ` / ${etapaAtual(p.fluxo)?.nome || ''}`}`}
                      </small>
                      {!!travas.length && (
                        <small className="fila-trava">
                          Aguardando {travas[0]!.resp ? nomeDe(travas[0]!.resp) : 'outra tarefa'} concluir a revisão.
                        </small>
                      )}
                      {/* De fora, as dependências não atravessam: o banco diz
                          que ela está presa, e não por quem. */}
                      {!travas.length && !!p.travado && (
                        <small className="fila-trava">Presa numa tarefa que ainda não ficou pronta.</small>
                      )}
                    </span>
                    <Etiqueta p={p} />
                    <Av p={perfilDe(p.tipo === 'aprov' ? p.etapa.aprovador_id : p.item.resp_id)} tam="sm" />
                    <span className={`due ${classePrazo(p.prazo)}`}>
                      {p.tipo === 'aprov'
                        ? `${feitos} de ${p.etapa.itens.length} prontas`
                        : travas.length || p.travado ? (travas[0]?.resp ? nomeDe(travas[0]!.resp) : 'Travada')
                          : p.prazo ? rel(p.prazo) : 'Sem prazo'}
                    </span>
                    {/* O mesmo menu da track, na mesma posição relativa: quem
                        aprendeu a setinha lá não pode ter que aprender outra
                        coisa aqui. Fora de `aprov`, que não é tarefa, e fora do
                        que é de outro espaço, onde a escrita seria recusada. */}
                    {meuItem(p) && p.item && (
                      <MenuTarefa titulo={p.item.texto} itens={[
                        {
                          rotulo: 'Editar tarefa', icone: <Ic.reguas />,
                          aoEscolher: () => abrir({ tipo: 'item', etapa: p.etapa, item: p.item! }),
                        },
                        {
                          rotulo: notaDaTarefa(p.item.id) ? 'Abrir a nota' : 'Escrever uma nota',
                          icone: <Ic.edit />,
                          aoEscolher: () => void abrirNotaDaTarefa(p.item!),
                        },
                        {
                          /* Anexar abre a GAVETA e pede o arquivo lá, porque é
                             lá que o bloco de anexos mora: a linha não tem
                             onde pôr um campo de arquivo, e um input invisível
                             solto aqui esconderia os anexos que já existem. */
                          rotulo: 'Anexar arquivo', icone: <Ic.clipe />,
                          aoEscolher: () => { setAberta(k); setPedindoArquivo(Date.now()) },
                        },
                        ...(p.item.ressalva && !p.item.feito ? [] : [{
                          rotulo: 'Remover tarefa', icone: <Ic.x />, perigo: true,
                          aoEscolher: () => void excluirItem(p.item!),
                        }]),
                      ]} />
                    )}
                    <span className="fila-chev"><Ic.seta /></span>
                  </div>
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
          pedindoArquivo={pedindoArquivo}
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
function Gaveta({ p, travas, avulsa, nomeDe, perfilDe, aoFechar, aoConcluir, aoAprovar,
  pedindoArquivo = 0 }: {
  p: Pendencia
  travas: number
  /** Tarefa sem objetivo e sem rotina: a trilha e o critério não existem nela. */
  avulsa: boolean
  nomeDe: (id: string | null) => string
  perfilDe: (id: string | null) => import('@/lib/tipos').Perfil
  aoFechar: () => void
  aoConcluir: () => void
  aoAprovar: () => void
  /** Um pedido de anexar vindo do menu da linha. Ver `Anexos`, prop `pedido`. */
  pedindoArquivo?: number
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

  /**
   * Quem pode mexer: quem escreveu a tarefa, ou quem a executa.
   *
   * Não a de outro espaço, porque a escrita sai com a sessão em uso e o banco
   * recusaria a linha de uma casa que não é a da sessão, com uma frase sobre
   * política e não sobre permissão. De lá se mexe lá, que é a um toque na
   * própria linha. E nunca a `aprov`, que não é tarefa: é o checkpoint pedindo
   * decisão.
   */
  const podeMexer = p.tipo !== 'aprov' && !p.fora && !!p.item
    && (p.item.autor_id === eu.id || p.item.resp_id === eu.id)

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

      {/* Os anexos da tarefa, aqui também.
          Eles só existiam dentro da track, então quem trabalha por esta tela
          não via o documento da própria tarefa nem tinha onde pôr um. O menu da
          linha pede, e o campo mora aqui, que é onde cabe mostrar o que já
          existe junto. */}
      {p.tipo !== 'aprov' && !p.fora && p.item && (
        <Anexos item={p.item} podeAnexar={podeMexer} pedido={pedindoArquivo} />
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
