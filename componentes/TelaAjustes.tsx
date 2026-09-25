'use client'

import { useEffect, useState } from 'react'
import { Memoria } from './Memoria'
import { Consumo } from './Consumo'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { AjustesAvisos } from './AjustesAvisos'
import { isoDe, rel } from '@/lib/datas'
import { MODO_LOCAL } from '@/lib/modo'
import { reiniciarLocal } from '@/lib/local/cliente'
import { aplicarTema, temaAtual, TEMAS, type Tema } from '@/lib/tema'
import { toursDe } from '@/lib/tutorial'

export function TelaAjustes() {
  const { eu, org, empresas, todosFluxos, carregando, salvarOrg, salvarPerfil, excluirEmpresa,
    minhaAgendaExterna, agenda, ligarAgendaExterna, desligarAgendaExterna, pode } = useDados()
  const { abrir } = useModais()
  const [tema, setTema] = useState<Tema>('escuro')
  // As voltas guiadas deste espaço, e quais desta pessoa já rodaram.
  const tours = toursDe(pode)
  const vistos = (eu.tutoriais ?? []).filter((id) => tours.some((t) => t.id === id))
  const [nomeOrg, setNomeOrg] = useState(org.nome)
  const [rotulo, setRotulo] = useState(org.rotulo)
  const [rotuloP, setRotuloP] = useState(org.rotulo_plural)
  const [urlAgenda, setUrlAgenda] = useState('')
  const [lendo, setLendo] = useState(false)
  const [comoFazer, setComoFazer] = useState(false)

  useEffect(() => { setTema(temaAtual()) }, [])
  useEffect(() => {
    setNomeOrg(org.nome); setRotulo(org.rotulo); setRotuloP(org.rotulo_plural)
  }, [org])

  if (carregando) return <Carregando />
  const admin = eu.papel === 'admin'

  return (
    <>
      <div className="hdr">
        <div>
          <h1>Ajustes</h1>
          <p className="lede">Seu espaço, sua operação.</p>
        </div>
      </div>

      <div className="aj">
        {/* O índice não é navegação nova: é atalho para as seções desta mesma
            página, que é comprida por natureza. */}
        <nav className="aj-indice" aria-label="Seções dos ajustes">
          {admin && <a href="#aj-org">Organização</a>}
          <a href="#aj-ia">Leitura da conversa</a>
          {admin && <a href="#aj-multi">Mais de um negócio</a>}
          <a href="#aj-avisos">Como quero ser avisado</a>
          <a href="#aj-agenda">Minha agenda externa</a>
          <a href="#aj-tema">Aparência</a>
          <a href="#aj-tutorial">Como o app funciona</a>
        </nav>

        <div className="aj-corpo">
        {admin && (
          <div className="blk" id="aj-org">
            <div className="bh"><h2>Organização</h2><span className="c">o nome que aparece no alto da lateral</span></div>
            <div className="card" style={{ padding: 15 }}>
              <div className="fld">
                <label htmlFor="org">Nome</label>
                <div className="row-inline">
                  <input className="inp" id="org" value={nomeOrg} onChange={(e) => setNomeOrg(e.target.value)} />
                  <button className="btn" disabled={!nomeOrg.trim() || nomeOrg === org.nome}
                    onClick={() => void salvarOrg({ nome: nomeOrg.trim() })}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="blk" id="aj-ia">
          <div className="bh">
            <h2>Leitura da conversa</h2>
            <span className="c">o que a equipe combina no chat vira trabalho na esteira</span>
          </div>
          <div className="card" style={{ padding: 15 }}>
            <div className="fld">
              <span className="lbl">Ler o que se conversa nos canais</span>
              <div className="seg" style={{ alignSelf: 'flex-start' }}>
                <button className={org.ia_ativa ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarOrg({ ia_ativa: true })}>Ligada</button>
                <button className={!org.ia_ativa ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarOrg({ ia_ativa: false })}>Desligada</button>
              </div>
              <p className="hint">
                Desligada, o chat continua funcionando normalmente. Só some o botão que
                transforma a conversa em tarefa.
              </p>
            </div>

            {org.ia_ativa && (
              <div className="fld" style={{ marginTop: 15 }}>
                <span className="lbl">O que fazer com o que a leitura encontra</span>
                <div className="seg" style={{ alignSelf: 'flex-start' }}>
                  <button className={org.ia_modo === 'sugerir' ? 'on' : ''} disabled={!admin}
                    onClick={() => void salvarOrg({ ia_modo: 'sugerir' })}>Propor</button>
                  <button className={org.ia_modo === 'aplicar' ? 'on' : ''} disabled={!admin}
                    onClick={() => void salvarOrg({ ia_modo: 'aplicar' })}>Aplicar sozinho</button>
                </div>
                <p className="hint">
                  {org.ia_modo === 'sugerir'
                    ? 'A leitura mostra o que encontrou, com o trecho da conversa que deu origem, e alguém aceita com um toque.'
                    : 'Tarefa nova, tarefa concluída e decisão entram sozinhas. Prazo e trava continuam pedindo licença, porque prazo é compromisso com quem espera e trava para a frente inteira.'}
                </p>
              </div>
            )}

            <p className="hint" style={{ marginTop: 15 }}>
              A leitura roda no servidor. Com uma chave da Anthropic configurada, quem lê é o
              modelo, que entende contexto e a frase que se espalha por três mensagens. Sem
              chave, valem as regras de português embutidas no app, e nada deixa de funcionar.
            </p>
          </div>
        </div>

        {org.ia_ativa && <Consumo />}

        {org.ia_ativa && <Memoria />}

        <div className="blk" id="aj-multi">
          <div className="bh">
            <h2>Mais de um negócio</h2>
            <span className="c">separe áreas e projetos por empresa, unidade ou centro de custo</span>
          </div>
          <div className="card" style={{ padding: 15 }}>
            <div className="fld">
              <span className="lbl">Este app atende</span>
              <div className="seg" style={{ alignSelf: 'flex-start' }}>
                <button className={!org.multi ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarOrg({ multi: false })}>Um negócio só</button>
                <button className={org.multi ? 'on' : ''} disabled={!admin}
                  onClick={() => void salvarOrg({ multi: true })}>Vários negócios</button>
              </div>
              <p className="hint">
                {org.multi
                  ? `Cada rotina e cada projeto pertence a uma ${org.rotulo.toLowerCase()}, e o seletor no alto da lateral foca o app inteiro em uma delas por vez.`
                  : 'A interface fica sem nenhuma menção a empresas. Ligue isto se você toca mais de um negócio e quer ver um de cada vez.'}
              </p>
            </div>

            {org.multi && admin && (
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
                        disabled={!rotulo.trim() || !rotuloP.trim() || (rotulo === org.rotulo && rotuloP === org.rotulo_plural)}
                        onClick={() => void salvarOrg({ rotulo: rotulo.trim(), rotulo_plural: rotuloP.trim() })}>
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

        {org.multi && (
          <div className="blk">
            <div className="bh">
              <h2>{org.rotulo_plural}</h2>
              <span className="c num">{empresas.length}</span>
              {admin && (
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => abrir({ tipo: 'empresa' })}>
                  <Ic.plus />Nova {org.rotulo.toLowerCase()}
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
                              ? `Esta ${org.rotulo.toLowerCase()} tem ${n} ${n === 1 ? 'registro ligado' : 'registros ligados'}. Eles continuam existindo, apenas ficam sem ${org.rotulo.toLowerCase()}.`
                              : 'Nada está ligado a ela.',
                            acao: () => excluirEmpresa(e.id),
                          })}><Ic.x /></button>
                      </span>
                    )}
                  </div>
                )
              }) : (
                <div className="empty">
                  Nenhuma {org.rotulo.toLowerCase()} cadastrada.
                  {admin && (
                    <button className="btn ghost" onClick={() => abrir({ tipo: 'empresa' })}>
                      <Ic.plus />Nova {org.rotulo.toLowerCase()}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <AjustesAvisos />

        <div className="blk" id="aj-agenda">
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

        <div className="blk" id="aj-tema">
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

        {/* O tutorial da primeira vez, de novo. Ele é da pessoa, e está no
            perfil dela: limpar `tutorial_em` faz ele voltar a abrir sozinho na
            próxima tela, em qualquer aparelho. */}
        <div className="blk" id="aj-tutorial">
          <div className="bh">
            <h2>Como o app funciona</h2>
            <span className="c">a volta guiada que você viu ao entrar</span>
          </div>
          <div className="card" style={{ padding: 15 }}>
            <p className="hint" style={{ margin: '0 0 12px' }}>
              Cada tela tem uma volta guiada curta, que abre sozinha na primeira vez que você
              chega nela e aponta para as peças de verdade. {vistos.length
                ? `Você já viu ${vistos.length} de ${tours.length}.`
                : `São ${tours.length} telas.`} Esvaziar aqui faz todas voltarem a abrir.
            </p>
            <button className="btn" disabled={!vistos.length}
              onClick={() => void salvarPerfil(eu.id, { tutoriais: [] }, true)}>
              <Ic.faisca />Ver tudo de novo
            </button>
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
      </div>
    </>
  )
}
