'use client'

import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { isoDe, rel } from '@/lib/datas'
import { MODO_LOCAL } from '@/lib/modo'
import { reiniciarLocal } from '@/lib/local/cliente'
import { aplicarTema, temaAtual, TEMAS, type Tema } from '@/lib/tema'

export function TelaAjustes() {
  const { eu, config, empresas, todosFluxos, carregando, salvarConfig, excluirEmpresa,
    minhaAgendaExterna, agenda, ligarAgendaExterna, desligarAgendaExterna } = useDados()
  const { abrir } = useModais()
  const [tema, setTema] = useState<Tema>('escuro')
  const [org, setOrg] = useState(config.organizacao)
  const [rotulo, setRotulo] = useState(config.rotulo)
  const [rotuloP, setRotuloP] = useState(config.rotulo_plural)
  const [urlAgenda, setUrlAgenda] = useState('')
  const [lendo, setLendo] = useState(false)
  const [comoFazer, setComoFazer] = useState(false)

  useEffect(() => { setTema(temaAtual()) }, [])
  useEffect(() => {
    setOrg(config.organizacao); setRotulo(config.rotulo); setRotuloP(config.rotulo_plural)
  }, [config])

  if (carregando) return <Carregando />
  const admin = eu.papel === 'admin'

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Como este app se comporta para todo mundo</div>
          <h1>Ajustes</h1>
        </div>
      </div>

      <div style={{ maxWidth: 780 }}>
        {admin && (
          <div className="blk">
            <div className="bh"><h2>Organização</h2><span className="c">o nome que aparece no alto da lateral</span></div>
            <div className="card" style={{ padding: 15 }}>
              <div className="fld">
                <label htmlFor="org">Nome</label>
                <div className="row-inline">
                  <input className="inp" id="org" value={org} onChange={(e) => setOrg(e.target.value)} />
                  <button className="btn" disabled={!org.trim() || org === config.organizacao}
                    onClick={() => void salvarConfig({ organizacao: org.trim() })}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="blk">
          <div className="bh">
            <h2>Mais de um negócio</h2>
            <span className="c">separe áreas e projetos por empresa, unidade ou centro de custo</span>
          </div>
          <div className="card" style={{ padding: 15 }}>
            <div className="fld">
              <span className="lbl">Este app atende</span>
              <div className="seg" style={{ alignSelf: 'flex-start' }}>
                <button className={!config.multi ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarConfig({ multi: false })}>Um negócio só</button>
                <button className={config.multi ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarConfig({ multi: true })}>Vários negócios</button>
              </div>
              <p className="hint">
                {config.multi
                  ? `Cada rotina e cada projeto pertence a uma ${config.rotulo.toLowerCase()}, e o seletor no alto da lateral foca o app inteiro em uma delas por vez.`
                  : 'A interface fica sem nenhuma menção a empresas. Ligue isto se você toca mais de um negócio e quer ver um de cada vez.'}
              </p>
            </div>

            {config.multi && admin && (
              <>
                <div className="fgrid" style={{ marginTop: 16 }}>
                  <div className="fld">
                    <label htmlFor="rot">Como você chama isso</label>
                    <input className="inp" id="rot" value={rotulo} placeholder="Empresa"
                      onChange={(e) => setRotulo(e.target.value)} />
                  </div>
                  <div className="fld">
                    <label htmlFor="rotp">No plural</label>
                    <div className="row-inline">
                      <input className="inp" id="rotp" value={rotuloP} placeholder="Empresas"
                        onChange={(e) => setRotuloP(e.target.value)} />
                      <button className="btn"
                        disabled={!rotulo.trim() || !rotuloP.trim() || (rotulo === config.rotulo && rotuloP === config.rotulo_plural)}
                        onClick={() => void salvarConfig({ rotulo: rotulo.trim(), rotulo_plural: rotuloP.trim() })}>
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: -4 }}>
                  Empresa, Negócio, Unidade, Centro de custo, Cliente: use a palavra da sua casa.
                </p>
              </>
            )}
          </div>
        </div>

        {config.multi && (
          <div className="blk">
            <div className="bh">
              <h2>{config.rotulo_plural}</h2>
              <span className="c num">{empresas.length}</span>
              {admin && (
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => abrir({ tipo: 'empresa' })}>
                  <Ic.plus />Nova {config.rotulo.toLowerCase()}
                </button>
              )}
            </div>
            <div className="card">
              {empresas.length ? empresas.map((e) => {
                const n = todosFluxos.filter((f) => f.empresa_id === e.id).length
                return (
                  <div className="pl" key={e.id}>
                    <span className="sigla av lg" style={{ '--cor': e.cor, borderRadius: 8 } as React.CSSProperties}>
                      {e.sigla}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="n">{e.nome}</span>
                      <span className="e">{n} {n === 1 ? 'rotina ou projeto' : 'rotinas e projetos'}</span>
                    </span>
                    {admin && (
                      <span className="acoes" style={{ display: 'flex', gap: 2 }}>
                        <button className="iconbtn" title="Editar" aria-label={`Editar ${e.nome}`}
                          onClick={() => abrir({ tipo: 'empresa', empresa: e })}><Ic.edit /></button>
                        <button className="iconbtn" title="Excluir" aria-label={`Excluir ${e.nome}`}
                          onClick={() => abrir({
                            tipo: 'excluir',
                            titulo: `Excluir ${e.nome}?`,
                            texto: n
                              ? `Esta ${config.rotulo.toLowerCase()} tem ${n} ${n === 1 ? 'registro ligado' : 'registros ligados'}. Eles continuam existindo, apenas ficam sem ${config.rotulo.toLowerCase()}.`
                              : 'Nada está ligado a ela.',
                            acao: () => excluirEmpresa(e.id),
                          })}><Ic.x /></button>
                      </span>
                    )}
                  </div>
                )
              }) : (
                <div className="empty">
                  Nenhuma {config.rotulo.toLowerCase()} cadastrada.
                  {admin && (
                    <button className="btn ghost" onClick={() => abrir({ tipo: 'empresa' })}>
                      <Ic.plus />Nova {config.rotulo.toLowerCase()}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="blk">
          <div className="bh">
            <h2>Minha agenda externa</h2>
            <span className="c">Google, Apple, Outlook</span>
          </div>
          <div className="card" style={{ padding: 15 }}>
            {minhaAgendaExterna ? (
              <>
                <dl className="kv" style={{ marginBottom: 14 }}>
                  <dt>Calendário</dt><dd>{minhaAgendaExterna.nome}</dd>
                  <dt>Horários ocupados</dt>
                  <dd className="num">
                    {agenda.filter((c) => c.externo && c.dono_id === eu.id).length}
                  </dd>
                  <dt>Lido</dt>
                  <dd>{minhaAgendaExterna.lido_em ? rel(isoDe(minhaAgendaExterna.lido_em)) : 'nunca'}</dd>
                </dl>
                <div className="row-inline">
                  <button className="btn" disabled={lendo} onClick={async () => {
                    setLendo(true)
                    await ligarAgendaExterna(minhaAgendaExterna.url)
                    setLendo(false)
                  }}>{lendo ? 'Lendo…' : 'Atualizar agora'}</button>
                  <button className="btn danger" onClick={() => abrir({
                    tipo: 'excluir',
                    titulo: 'Desligar a agenda externa?',
                    texto: 'O endereço do calendário e os horários importados são apagados. Sua agenda de fora não é alterada em nada.',
                    acao: () => desligarAgendaExterna(),
                  })}>Desligar</button>
                </div>
              </>
            ) : (
              <>
                <div className="fld">
                  <label htmlFor="ag-url">Endereço do seu calendário no formato iCal</label>
                  <div className="row-inline">
                    <input className="inp" id="ag-url" value={urlAgenda} placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                      onChange={(e) => setUrlAgenda(e.target.value)} />
                    <button className="btn pri" disabled={!urlAgenda.trim() || lendo}
                      onClick={async () => {
                        setLendo(true)
                        const r = await ligarAgendaExterna(urlAgenda.trim())
                        setLendo(false)
                        if (r) setUrlAgenda('')
                      }}>{lendo ? 'Lendo…' : 'Conectar'}</button>
                  </div>
                </div>
                <button className="btn ghost" style={{ marginTop: 4 }}
                  onClick={() => setComoFazer((v) => !v)}>
                  {comoFazer ? 'Esconder' : 'Onde acho esse endereço?'}
                </button>
                {comoFazer && (
                  <div className="exit" style={{ margin: '10px 0 0', display: 'block' }}>
                    <p className="hint" style={{ marginBottom: 8 }}>
                      <b style={{ color: 'var(--tx)' }}>Google Agenda</b><br />
                      No computador, passe o mouse sobre o calendário na lista da esquerda, abra os três
                      pontinhos, Configurações e compartilhamento, e desça até &quot;Endereço secreto no
                      formato iCal&quot;.
                    </p>
                    <p className="hint" style={{ marginBottom: 8 }}>
                      <b style={{ color: 'var(--tx)' }}>Apple, iCloud</b><br />
                      Em icloud.com/calendar, clique no ícone de compartilhar ao lado do calendário,
                      marque Calendário público e copie o endereço.
                    </p>
                    <p className="hint">
                      <b style={{ color: 'var(--tx)' }}>Outlook</b><br />
                      Configurações, Calendário, Calendários compartilhados, Publicar um calendário,
                      e copie o link ICS.
                    </p>
                  </div>
                )}
              </>
            )}
            <p className="hint" style={{ marginTop: 12 }}>
              Só os horários entram aqui. Título, local, convidados e descrição são descartados na
              leitura e nunca chegam a ser guardados, então a equipe vê apenas que você está ocupado
              naquele intervalo. O endereço do calendário fica visível somente para você, nem o
              administrador o enxerga: quem tem esse link tem o seu calendário inteiro.
            </p>
          </div>
        </div>

        <div className="blk">
          <div className="bh"><h2>Aparência</h2><span className="c">vale só para você, neste navegador</span></div>
          <div className="card" style={{ padding: 15 }}>
            <div className="temas">
              {TEMAS.map((t) => (
                <button key={t.id} className={`tema ${tema === t.id ? 'on' : ''}`}
                  onClick={() => { aplicarTema(t.id); setTema(t.id) }}>
                  <span className="amostra" style={{ background: t.amostra[0] }}>
                    <i style={{ background: t.amostra[1] }} />
                    <i style={{ background: t.amostra[2] }} />
                    <i style={{ background: t.amostra[3] }} />
                    <i style={{ background: t.amostra[2], opacity: .4 }} />
                  </span>
                  <span><b>{t.nome}</b><small>{t.sobre}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {MODO_LOCAL && (
          <div className="blk">
            <div className="bh"><h2>Modo demonstração</h2></div>
            <div className="card" style={{ padding: 15 }}>
              <p className="hint" style={{ margin: '0 0 12px' }}>
                Os dados ficam só neste navegador. Troque de pessoa para ver o app pelos olhos de
                cada um: as pendências, as aprovações liberadas e os itens privados mudam.
              </p>
              <div className="row-inline">
                <button className="btn" onClick={() => {
                  try { localStorage.removeItem('esteira.local.eu') } catch {}
                  location.reload()
                }}><Ic.team />Trocar de pessoa</button>
                <button className="btn danger" onClick={() => abrir({
                  tipo: 'excluir',
                  titulo: 'Recarregar os dados de exemplo?',
                  texto: 'Tudo que você criou ou alterou no modo demonstração some, e a empresa de exemplo volta como era. Não afeta nenhum banco.',
                  acao: () => { reiniciarLocal(); location.reload() },
                })}>Recarregar exemplo</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
