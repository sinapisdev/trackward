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
  const [cEmail, setCEmail] = useState('')
  const [cNome, setCNome] = useState('')
  const [cPapel, setCPapel] = useState<Papel>('colaborador')
  const [cArea, setCArea] = useState('')
  const [cGestor, setCGestor] = useState(eu.id)
  const [cVeArea, setCVeArea] = useState(false)
  const [copiado, setCopiado] = useState('')
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
  /** O convite mais novo é o que a lateral mostra pronto para copiar. */
  const ultimo = convites[convites.length - 1] || null

  const criarNovo = async () => {
    const c = await criarConvite({
      email: cEmail, nome: cNome, papel: cPapel,
      area_id: cArea || null, gestor_id: cGestor || null, ve_area: cVeArea,
    })
    if (c) { setCEmail(''); setCNome('') }
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
              <div className="fld">
                <label htmlFor="c-nome">Nome da pessoa</label>
                <input className="inp" id="c-nome" value={cNome} placeholder="Ex.: Carlos"
                  onChange={(e) => setCNome(e.target.value)} />
              </div>
              <div className="fld">
                <label htmlFor="c-email">E-mail</label>
                <input className="inp" id="c-email" type="email" value={cEmail}
                  placeholder="carlos@empresa.com.br" onChange={(e) => setCEmail(e.target.value)} />
              </div>
              <div className="fld">
                <label htmlFor="c-papel">Papel</label>
                <select className="inp" id="c-papel" value={cPapel}
                  onChange={(e) => setCPapel(e.target.value as Papel)}>
                  <option value="colaborador">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Administrador</option>
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
                <label htmlFor="c-gestor">Gestor</label>
                <select className="inp" id="c-gestor" value={cGestor} onChange={(e) => setCGestor(e.target.value)}>
                  <option value="">Ninguém</option>
                  {ativos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <label className="chk">
                <input type="checkbox" checked={cVeArea} onChange={(e) => setCVeArea(e.target.checked)} />
                Vê a área inteira
              </label>

              {ultimo ? (
                <>
                  <h3>Convite pronto</h3>
                  <div className="eq-codigo">{ultimo.codigo.split('').join(' ')}</div>
                  <p className="hint">
                    Quem entrar com este código receberá o papel definido acima. O convite é a única
                    porta: quem se cadastra por fora abre a empresa dele, nunca cai dentro da sua.
                  </p>
                  <button className="btn pri larga" onClick={() => {
                    const texto = `${ultimo.nome}, seu acesso ao TrackWard está pronto.\n\n`
                      + `Entre em ${location.origin}/entrar, escolha Criar conta e use:\n`
                      + `E-mail: ${ultimo.email}\nCódigo do convite: ${ultimo.codigo}`
                    navigator.clipboard?.writeText(texto).then(
                      () => { setCopiado(ultimo.id); setTimeout(() => setCopiado(''), 2200) },
                      () => {},
                    )
                  }}>{copiado === ultimo.id ? 'Copiado' : 'Copiar código'}</button>
                  <button className="eq-outro" onClick={() => void criarNovo()}
                    disabled={!cEmail.trim() || !cNome.trim()}>Criar outro convite</button>
                </>
              ) : (
                <button className="btn pri larga" disabled={!cEmail.trim() || !cNome.trim()}
                  onClick={() => void criarNovo()}>Criar convite</button>
              )}

              {convites.length > 1 && (
                <div className="eq-convites">
                  <h3>Convites abertos</h3>
                  {convites.map((c) => (
                    <div className="eq-conv" key={c.id}>
                      <span><b>{c.nome}</b><small>{c.email}</small></span>
                      <code className="codigo">{c.codigo}</code>
                      <button className="iconbtn" title="Cancelar convite"
                        aria-label={`Cancelar convite de ${c.nome}`}
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
