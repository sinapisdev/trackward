'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { Av } from './atomos'
import type { Papel } from '@/lib/tipos'
import { equipeDe } from '@/lib/acesso'
import { MODO_LOCAL } from '@/lib/modo'

const CORES = ['#C2703C', '#7D8471', '#A8763E', '#6E7B8B', '#96705B', '#5F7A6A', '#A5645C', '#7A6E8F']

export function Equipe() {
  const { eu, perfis, areas, areaDe, nomeDe, convites, carregando, salvarPerfil,
    criarConvite, excluirConvite, pessoal, salvarOrg } = useDados()
  const { abrir } = useModais()
  const [nome, setNome] = useState(eu.nome)
  const [abrindo, setAbrindo] = useState(false)
  const [cEmail, setCEmail] = useState('')
  const [cNome, setCNome] = useState('')
  const [cPapel, setCPapel] = useState<Papel>('colaborador')
  const [cArea, setCArea] = useState('')
  const [cGestor, setCGestor] = useState(eu.id)
  const [cVeArea, setCVeArea] = useState(false)
  const [copiado, setCopiado] = useState('')

  if (carregando) return <Carregando />

  const admin = eu.papel === 'admin'
  const ativos = perfis.filter((p) => p.ativo)
  const esperando = perfis.filter((p) => !p.ativo)

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Quem tem acesso ao Track</div>
          <h1>{pessoal ? 'Só você' : 'Equipe'}</h1>
          <p className="lede">
            {pessoal
              ? 'Você está usando o Track sozinho. Traga alguém quando fizer sentido: nada recomeça, tudo que você já tem continua onde está.'
              : MODO_LOCAL
              ? 'Pessoas de exemplo. Com o app ligado ao banco, cada uma cria a própria conta e você libera o acesso por aqui.'
              : admin
                ? 'Quem entra aqui, entra por convite seu. Ninguém chega sozinho, e quem você desativar para de enxergar tudo na hora.'
                : 'Estas são as pessoas com acesso. Só um administrador convida e libera.'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 760 }}>
        {/* A virada de conta pessoal para conta de equipe é uma chave, não uma
            migração: a organização já existe desde o primeiro dia, só tinha uma
            pessoa dentro. */}
        {pessoal && (
          <div className="blk">
            <div className="card">
              <div className="onb">
                <h3>Trabalhar junto com alguém</h3>
                <p>
                  Ao trazer a primeira pessoa, o Track passa a mostrar responsável por tarefa,
                  aprovador de checkpoint e quem enxerga o quê. Suas áreas, seus projetos e suas
                  rotinas continuam exatamente como estão.
                </p>
                <button className="btn pri" onClick={() => void salvarOrg({ tipo: 'equipe' })}>
                  <Ic.team />Abrir para a equipe
                </button>
              </div>
            </div>
          </div>
        )}
        {admin && !!esperando.length && (
          <div className="blk">
            <div className="bh">
              <h2>Aguardando liberação</h2>
              <span className="c num">{esperando.length}</span>
            </div>
            <div className="card">
              {esperando.map((p) => (
                <div className="pl" key={p.id}>
                  <Av p={p} tam="lg" />
                  <span style={{ minWidth: 0 }}>
                    <span className="n">{p.nome}</span>
                    <span className="e">{p.email}</span>
                  </span>
                  <span className="acoes">
                    <button className="btn pri" onClick={() => void salvarPerfil(p.id, { ativo: true })}>
                      Liberar acesso
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {admin && (
          <div className="blk">
            <div className="bh">
              <h2>Convidar alguém</h2>
              <span className="c">a conta nasce com o papel que você definir</span>
              {!abrindo && (
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setAbrindo(true)}>
                  <Ic.plus />Novo convite
                </button>
              )}
            </div>

            {abrindo && (
              <div className="card" style={{ padding: 15, marginBottom: !!convites.length ? 12 : 0 }}>
                <div className="fgrid">
                  <div className="fld">
                    <label htmlFor="c-nome">Nome da pessoa</label>
                    <input className="inp" id="c-nome" value={cNome} autoFocus placeholder="Ex.: Carlos"
                      onChange={(e) => setCNome(e.target.value)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="c-email">E-mail</label>
                    <input className="inp" id="c-email" type="email" value={cEmail}
                      placeholder="carlos@silvereng.com.br"
                      onChange={(e) => setCEmail(e.target.value)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="c-papel">Entra como</label>
                    <select className="inp" id="c-papel" value={cPapel}
                      onChange={(e) => setCPapel(e.target.value as Papel)}>
                      <option value="colaborador">Colaborador, vê o que é dele</option>
                      <option value="gestor">Gestor, vê também a equipe dele</option>
                      <option value="admin">Administrador, vê tudo</option>
                    </select>
                  </div>
                  <div className="fld">
                    <label htmlFor="c-area">Área</label>
                    <select className="inp" id="c-area" value={cArea} onChange={(e) => setCArea(e.target.value)}>
                      <option value="">Sem área</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div className="fld">
                    <label htmlFor="c-gestor">Responde a</label>
                    <select className="inp" id="c-gestor" value={cGestor}
                      onChange={(e) => setCGestor(e.target.value)}>
                      <option value="">Ninguém</option>
                      {ativos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                  </div>
                  <div className="fld">
                    <span className="lbl">Alcance</span>
                    <label className="chk" style={{ paddingTop: 7 }}>
                      <input type="checkbox" checked={cVeArea} onChange={(e) => setCVeArea(e.target.checked)} />
                      Vê a área inteira
                    </label>
                  </div>
                </div>
                <div className="row-inline" style={{ marginTop: 14 }}>
                  <button className="btn pri" disabled={!cEmail.trim() || !cNome.trim()}
                    onClick={async () => {
                      const c = await criarConvite({
                        email: cEmail, nome: cNome, papel: cPapel,
                        area_id: cArea || null, gestor_id: cGestor || null, ve_area: cVeArea,
                      })
                      if (c) { setCEmail(''); setCNome(''); setAbrindo(false) }
                    }}>Criar convite</button>
                  <button className="btn ghost" onClick={() => setAbrindo(false)}>Cancelar</button>
                </div>
                <p className="hint" style={{ marginTop: 12 }}>
                  Você recebe um código para mandar à pessoa. Ela se cadastra com ele e entra já com o
                  papel, a área e a hierarquia que você escolheu, sem esperar liberação. O convite é a
                  única porta: quem se cadastra por fora abre a empresa dele, nunca cai dentro da sua.
                </p>
              </div>
            )}

            {!!convites.length && (
              <div className="card">
                {convites.map((c) => (
                  <div className="pl" key={c.id}>
                    <span className="sigla av lg" style={{ '--cor': 'var(--tx-3)', borderRadius: 8 } as React.CSSProperties}>
                      {c.codigo.slice(0, 2)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="n">
                        {c.nome}
                        <span className="badge">{c.papel === 'admin' ? 'Administrador' : c.papel === 'gestor' ? 'Gestor' : 'Colaborador'}</span>
                      </span>
                      <span className="e">
                        {c.email}
                        {c.area_id && ` · ${areaDe(c.area_id).nome}`}
                        {c.gestor_id && ` · responde a ${nomeDe(c.gestor_id)}`}
                      </span>
                    </span>
                    <span className="acoes" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <code className="codigo">{c.codigo}</code>
                      <button className="btn" onClick={() => {
                        const texto = `${c.nome}, seu acesso ao Track está pronto.\n\n`
                          + `Entre em ${location.origin}/entrar, escolha Criar conta e use:\n`
                          + `E-mail: ${c.email}\nCódigo do convite: ${c.codigo}`
                        navigator.clipboard?.writeText(texto).then(
                          () => { setCopiado(c.id); setTimeout(() => setCopiado(''), 2200) },
                          () => {},
                        )
                      }}>{copiado === c.id ? 'Copiado' : 'Copiar convite'}</button>
                      <button className="iconbtn" title="Cancelar convite" aria-label={`Cancelar convite de ${c.nome}`}
                        onClick={() => void excluirConvite(c.id)}><Ic.x /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="blk">
          <div className="bh">
            <h2>Com acesso</h2>
            <span className="c num">{ativos.length}</span>
            <span className="c">quem responde a quem decide quem enxerga o quê</span>
          </div>
          <div className="card">
            {ativos.map((p) => {
              const equipe = equipeDe(p.id, perfis).size
              return (
                <div className="pessoa" key={p.id}>
                  <Av p={p} tam="lg" />
                  <span style={{ minWidth: 0 }}>
                    <span className="n">
                      {p.nome}
                      {p.id === eu.id && <span className="badge done">você</span>}
                      {p.papel === 'admin' && <span className="badge">Administrador</span>}
                      {p.papel === 'gestor' && <span className="badge">Gestor</span>}
                    </span>
                    <span className="e">
                      {p.email}
                      {p.gestor_id && ` · responde a ${nomeDe(p.gestor_id)}`}
                      {!!equipe && ` · ${equipe} ${equipe === 1 ? 'pessoa abaixo' : 'pessoas abaixo'}`}
                    </span>
                  </span>

                  {admin ? (
                    <div className="campos">
                      <label>
                        <span>Papel</span>
                        <select className="inp" value={p.papel} disabled={p.id === eu.id}
                          onChange={(e) => void salvarPerfil(p.id, { papel: e.target.value as Papel })}>
                          <option value="colaborador">Colaborador</option>
                          <option value="gestor">Gestor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </label>
                      <label>
                        <span>Área</span>
                        <select className="inp" value={p.area_id || ''}
                          onChange={(e) => void salvarPerfil(p.id, { area_id: e.target.value || null })}>
                          <option value="">Sem área</option>
                          {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Responde a</span>
                        <select className="inp" value={p.gestor_id || ''}
                          onChange={(e) => void salvarPerfil(p.id, { gestor_id: e.target.value || null })}>
                          <option value="">Ninguém</option>
                          {ativos.filter((x) => x.id !== p.id).map((x) => (
                            <option key={x.id} value={x.id}>{x.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label className="chk" style={{ alignSelf: 'end', paddingBottom: 6 }}>
                        <input type="checkbox" checked={p.ve_area} disabled={p.papel === 'admin'}
                          onChange={(e) => void salvarPerfil(p.id, { ve_area: e.target.checked })} />
                        Vê a área inteira
                      </label>
                      {p.id !== eu.id && (
                        <button className="iconbtn" title="Remover acesso" aria-label={`Remover acesso de ${p.nome}`}
                          style={{ alignSelf: 'end', marginBottom: 6 }}
                          onClick={() => abrir({
                            tipo: 'excluir',
                            titulo: `Remover o acesso de ${p.nome}?`,
                            texto: 'A pessoa para de entrar no app e volta para a fila de liberação. As esteiras, as tarefas e o histórico continuam como estão, e você pode liberar de novo quando quiser.',
                            acao: () => salvarPerfil(p.id, { ativo: false }),
                          })}><Ic.x /></button>
                      )}
                    </div>
                  ) : (
                    <span className="due">
                      {p.area_id ? areaDe(p.area_id).nome : 'Sem área'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Colaborador vê as tarefas dele e as que travam as dele. Gestor vê também tudo de quem está
            abaixo. Administrador vê a empresa inteira. Marcar &quot;vê a área inteira&quot; abre para a
            pessoa tudo que acontece na área dela, mesmo sem ela participar.
          </p>
        </div>

        <div className="blk">
          <div className="bh"><h2>Você</h2></div>
          <div className="card" style={{ padding: 14 }}>
            <div className="fgrid">
              <div className="fld">
                <label htmlFor="eu-nome">Seu nome</label>
                <div className="row-inline">
                  <input className="inp" id="eu-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                  <button className="btn" disabled={!nome.trim() || nome === eu.nome}
                    onClick={() => void salvarPerfil(eu.id, { nome: nome.trim() })}>Salvar</button>
                </div>
                <p className="hint">É este nome que aparece nos itens, nas aprovações e na atividade.</p>
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
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
