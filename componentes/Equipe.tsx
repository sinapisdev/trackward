'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import type { Convite, Papel } from '@/lib/tipos'
import { alvoDoConvite, alvoEscrito, linkDoConvite, textoDoConvite, waDoConvite } from '@/lib/convite'
import { equipeDe } from '@/lib/acesso'
import { MODO_LOCAL } from '@/lib/modo'

const PAPEL: Record<string, string> = {
  admin: 'Administrador', gestor: 'Gestor', colaborador: 'Colaborador',
}

const CORES = ['#C2703C', '#7D8471', '#A8763E', '#6E7B8B', '#96705B', '#5F7A6A', '#A5645C', '#7A6E8F']

export function Equipe() {
  const { eu, perfis, areas, areaDe, nomeDe, convites, carregando, salvarPerfil,
    criarConvite, excluirConvite, pessoal, salvarOrg, org, ativos: assentosUsados } = useDados()
  const { abrir } = useModais()
  const [nome, setNome] = useState(eu.nome)
  /** Um campo só: quem convida tem UMA das duas coisas, nunca as duas. */
  const [cQuem, setCQuem] = useState('')
  const [cPapel, setCPapel] = useState<Papel>('colaborador')
  const [copiado, setCopiado] = useState('')
  /** O convite recém-criado, que é o único que a tela mostra pronto. */
  const [feito, setFeito] = useState<Convite | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroPapel, setFiltroPapel] = useState('')

  if (carregando) return <Carregando />

  const admin = eu.papel === 'admin'
  const ativos = perfis.filter((p) => p.ativo)
  const esperando = perfis.filter((p) => !p.ativo)
  const limpa = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const naLista = ativos
    .filter((p) => !busca.trim() || limpa(p.nome).includes(limpa(busca)) || limpa(p.email).includes(limpa(busca)))
    .filter((p) => !filtroPapel || p.papel === filtroPapel)
  // Assentos livres: pessoas ativas mais convites em aberto, que já ocupam.
  const abertos = convites.filter((c) => !c.usado_em).length
  const livres = org.assentos ? org.assentos - assentosUsados - abertos : 0
  /**
   * Sem teto de assentos, `livres` é zero, e zero aqui quer dizer "não há
   * limite", não "acabou". Confundir os dois desliga o botão de convidar de
   * toda empresa sem teto, que é a maioria: o plano interno e o teste não têm.
   */
  const lotado = !!org.assentos && livres <= 0

  const alvo = alvoDoConvite(cQuem)

  const criarNovo = async () => {
    if (!alvo) return
    const c = await criarConvite({ alvo, papel: cPapel })
    if (c) { setCQuem(''); setFeito(c) }
  }

  return (
    <>
      <div className="hdr">
        <div>
          <h1>{pessoal ? 'Só você' : 'Equipe'}</h1>
          <p className="lede">
            {pessoal
              ? 'Você está usando o TrackWard sozinho. Traga alguém quando fizer sentido: nada recomeça.'
              : <>
                  {ativos.length} {ativos.length === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}
                  {!!esperando.length && <> · {esperando.length} aguardando liberação.</>}
                </>}
          </p>
        </div>
      </div>

      {pessoal && (
        <div className="card">
          <div className="onb">
            <h3>Trabalhar junto com alguém</h3>
            <p>
              Ao trazer a primeira pessoa, o TrackWard passa a mostrar responsável por tarefa,
              aprovador de checkpoint e quem enxerga o quê. Suas áreas, seus projetos e suas
              rotinas continuam exatamente como estão.
            </p>
            <button className="btn pri" onClick={() => void salvarOrg({ tipo: 'equipe' })}>
              <Ic.team />Abrir para a equipe
            </button>
          </div>
        </div>
      )}

      {!pessoal && (
      <div className="eq">
        <div className="eq-lista" data-tut="equipe-lista">
          {admin && !!esperando.length && (
            <section className="sec">
              <div className="sec-h">
                <h2>Aguardando liberação <span className="sec-ct num">{esperando.length}</span></h2>
              </div>
              <div className="eq-cab esperando"><span>Pessoa</span><span>E-mail</span><span>Solicitação</span><span>Ações</span></div>
              {esperando.map((p) => (
                <div className="eq-l esperando" key={p.id}>
                  <span className="eq-quem"><Av p={p} tam="sm" />{p.nome}</span>
                  <span className="eq-c">{p.email}</span>
                  <span className="eq-c">Solicitou acesso</span>
                  <span className="eq-acoes">
                    <button className="btn" onClick={() => void salvarPerfil(p.id, { ativo: true })}>Liberar</button>
                  </span>
                </div>
              ))}
            </section>
          )}

          <section className="sec">
            <div className="sec-h">
              <h2>Com acesso</h2>
              <div className="sec-ctl">
                <label className="campo-busca">
                  <Ic.lupa />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar pessoa" aria-label="Buscar pessoa" />
                </label>
                <label className="sel-quem">
                  <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)}
                    aria-label="Filtrar por papel">
                    <option value="">Papel</option>
                    <option value="admin">Administrador</option>
                    <option value="gestor">Gestor</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                  <Ic.chev />
                </label>
              </div>
            </div>

            <div className="eq-cab"><span>Pessoa</span><span>Papel</span><span>Área</span><span>Gestor</span>
              <span>Vê a área inteira</span><span /></div>

            {naLista.map((p) => (
              <div className="eq-l" key={p.id}>
                <span className="eq-quem">
                  <Av p={p} tam="sm" />
                  <span className="nm">{p.nome}</span>
                </span>
                <span className="eq-c">
                  {admin && p.id !== eu.id ? (
                    <select className="inp-fino" value={p.papel} aria-label={`Papel de ${p.nome}`}
                      onChange={(e) => void salvarPerfil(p.id, { papel: e.target.value as Papel })}>
                      <option value="colaborador">Colaborador</option>
                      <option value="gestor">Gestor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  ) : (
                    <>{p.papel === 'admin' ? 'Admin' : p.papel === 'gestor' ? 'Gestor' : 'Colaborador'}
                      {p.id === eu.id && <span className="eq-dono"><Ic.lock />Você</span>}</>
                  )}
                </span>
                <span className="eq-c">
                  {admin ? (
                    <select className="inp-fino" value={p.area_id || ''} aria-label={`Área de ${p.nome}`}
                      onChange={(e) => void salvarPerfil(p.id, { area_id: e.target.value || null })}>
                      <option value="">{p.papel === 'admin' ? 'Todas' : 'Sem área'}</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  ) : p.area_id ? areaDe(p.area_id).nome : 'Sem área'}
                </span>
                <span className="eq-c">
                  {admin && p.papel !== 'admin' ? (
                    <select className="inp-fino" value={p.gestor_id || ''} aria-label={`Gestor de ${p.nome}`}
                      onChange={(e) => void salvarPerfil(p.id, { gestor_id: e.target.value || null })}>
                      <option value="">Ninguém</option>
                      {ativos.filter((x) => x.id !== p.id).map((x) => (
                        <option key={x.id} value={x.id}>{x.nome}</option>
                      ))}
                    </select>
                  ) : p.papel === 'admin' ? 'Não se aplica' : p.gestor_id ? nomeDe(p.gestor_id) : 'Ninguém'}
                </span>
                <span className="eq-c">
                  {p.papel === 'admin' ? 'Sim' : (
                    <button className={`chave ${p.ve_area ? 'on' : ''}`} disabled={!admin}
                      aria-label={`${p.nome} vê a área inteira`} aria-pressed={p.ve_area}
                      onClick={() => void salvarPerfil(p.id, { ve_area: !p.ve_area })} />
                  )}
                </span>
                <span className="eq-acoes">
                  {admin && p.id !== eu.id ? (
                    <button className="iconbtn" title="Remover acesso" aria-label={`Remover acesso de ${p.nome}`}
                      onClick={() => abrir({
                        tipo: 'excluir',
                        titulo: `Remover o acesso de ${p.nome}?`,
                        texto: 'A pessoa para de entrar no app e volta para a fila de liberação. As tracks, as tarefas e o histórico continuam como estão.',
                        acao: () => salvarPerfil(p.id, { ativo: false }),
                      })}><Ic.mais /></button>
                  ) : <span className="eq-c">—</span>}
                </span>
              </div>
            ))}

            <p className="eq-nota">
              {eu.nome} acompanha {equipeDe(eu.id, perfis).size} {equipeDe(eu.id, perfis).size === 1 ? 'pessoa' : 'pessoas'}.
            </p>
            <p className="hint">
              Colaborador vê as tarefas dele e as que travam as dele. Gestor vê também tudo de quem está
              abaixo. Administrador vê a empresa inteira. Marcar &quot;vê a área inteira&quot; abre para a
              pessoa tudo que acontece na área dela, mesmo sem ela participar.
            </p>
          </section>
        </div>

        <aside className="eq-lado" data-tut="equipe-convidar">
          {admin && (
            <>
              <h2>Convidar alguém</h2>
              {/* O assento é o que o Enterprise cobra, então quem convida
                  precisa ver a conta antes de gastar o último. Convite aberto
                  já ocupa: senão dá para mandar vinte num plano de cinco e o
                  estouro cai em quem aceitou. */}
              {!!org.assentos && (
                <p className={`eq-assentos ${livres <= 0 ? 'cheio' : ''}`}>
                  {livres > 0
                    ? <>{livres} {livres === 1 ? 'assento livre' : 'assentos livres'} de {org.assentos}.</>
                    : <><b>Os assentos acabaram.</b> Para convidar mais alguém, fale com o TrackWard.</>}
                </p>
              )}
              {/* UM campo, e não dois. Quem convida tem o telefone OU o
                  e-mail na mão, nunca os dois, e a forma do que foi escrito já
                  diz qual é: perguntar seria perguntar o que está na tela.
                  O nome saiu porque a pessoa diz o nome dela ao entrar, e o que
                  quem convida digitava ali era um apelido que depois não batia
                  com nada. */}
              <div className="fld">
                <label htmlFor="c-quem">Telefone ou e-mail</label>
                <input className="inp" id="c-quem" value={cQuem}
                  placeholder="42 99978-3288"
                  inputMode="tel" autoComplete="off" spellCheck={false}
                  onChange={(e) => { setCQuem(e.target.value); setFeito(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && alvo) void criarNovo() }} />
                {!!cQuem.trim() && !alvo && (
                  <p className="hint">Não reconheci. Um telefone com DDD, ou um e-mail.</p>
                )}
              </div>

              {/* Papel em pílulas e não em lista: são três, e três opções
                  escondidas atrás de um seletor é um clique a mais para ver o
                  que já caberia na tela. */}
              <div className="fld">
                <span className="lbl">Papel</span>
                <div className="seg" role="group" aria-label="Papel de quem é convidado">
                  {([['colaborador', 'Colaborador'], ['gestor', 'Gestor'], ['admin', 'Admin']] as const)
                    .map(([id, rot]) => (
                      <button key={id} className={cPapel === id ? 'on' : ''}
                        aria-pressed={cPapel === id}
                        onClick={() => setCPapel(id)}>{rot}</button>
                    ))}
                </div>
                <p className="hint">
                  Área e a quem a pessoa responde se ajustam na tabela ao lado, depois que ela entrar.
                </p>
              </div>

              {feito ? (
                <div className="eq-pronto">
                  <h3>Convite pronto</h3>
                  <p className="eq-pronto-quem">{alvoEscrito(feito)}</p>

                  {/* O caminho principal é o WhatsApp, e ele abre a conversa
                      DAQUELA pessoa com o recado escrito. O app não manda a
                      mensagem: mandar exigiria a chave do conector numa terceira
                      rota de serviço, e exigiria a verificação do negócio na
                      Meta, que é o que ainda não saiu. Assim funciona hoje, e
                      quem convida confere antes de enviar, o que é melhor. */}
                  {feito.fone && (
                    <a className="btn pri larga" target="_blank" rel="noreferrer"
                      href={waDoConvite(feito.fone, textoDoConvite({
                        empresa: org.nome, quem: eu.nome,
                        link: linkDoConvite(location.origin, feito.codigo),
                      }))}>
                      <Ic.enviar />Mandar no WhatsApp
                    </a>
                  )}

                  <button className={`btn larga ${feito.fone ? '' : 'pri'}`} onClick={() => {
                    const texto = textoDoConvite({
                      empresa: org.nome, quem: eu.nome,
                      link: linkDoConvite(location.origin, feito.codigo),
                    })
                    navigator.clipboard?.writeText(texto).then(
                      () => { setCopiado(feito.id); setTimeout(() => setCopiado(''), 2200) },
                      () => {},
                    )
                  }}>{copiado === feito.id ? 'Copiado' : 'Copiar o convite'}</button>

                  <p className="hint">
                    O link já leva o código dentro: quem abrir entra direto, sem digitar nada.
                    Vale por sete dias e para uma pessoa só.
                  </p>
                  <button className="eq-outro" onClick={() => setFeito(null)}>Convidar outra pessoa</button>
                </div>
              ) : (
                <button className="btn pri larga" disabled={!alvo || lotado}
                  onClick={() => void criarNovo()}>
                  <Ic.plus />Convidar
                </button>
              )}

              {!!convites.length && (
                <div className="eq-convites">
                  <h3>Convites abertos <span className="sec-ct num">{convites.length}</span></h3>
                  {convites.map((c) => (
                    <div className="eq-conv" key={c.id}>
                      <span><b>{alvoEscrito(c)}</b><small>{PAPEL[c.papel] || c.papel}</small></span>
                      <code className="codigo">{c.codigo}</code>
                      <button className="iconbtn" title="Cancelar convite"
                        aria-label={`Cancelar o convite de ${alvoEscrito(c)}`}
                        onClick={() => void excluirConvite(c.id)}><Ic.x /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rail-sep" />
            </>
          )}

          <h2>Você</h2>
          <div className="fld">
            <label htmlFor="eu-nome">Seu nome</label>
            <div className="row-inline">
              <input className="inp" id="eu-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              <button className="btn" disabled={!nome.trim() || nome === eu.nome}
                onClick={() => void salvarPerfil(eu.id, { nome: nome.trim() })}>Salvar</button>
            </div>
            <p className="hint">É este nome que aparece nas tarefas, nas aprovações e na atividade.</p>
          </div>
          <div className="fld">
            <span className="lbl">Sua cor</span>
            <div className="sw">
              {CORES.map((c) => (
                <button key={c} style={{ background: c }} className={eu.cor === c ? 'on' : ''}
                  aria-label={`Cor ${c}`} onClick={() => void salvarPerfil(eu.id, { cor: c })} />
              ))}
            </div>
          </div>
        </aside>
      </div>
      )}
    </>
  )
}
