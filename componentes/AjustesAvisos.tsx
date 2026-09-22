'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { telefoneLimpo } from '@/lib/avisos'
import type { EstadoPush } from '@/lib/push'

/**
 * Como quero ser avisado.
 *
 * A tela inteira é escrita para responder uma pergunta antes de ela ser feita:
 * "o que exatamente vai tocar o meu celular". Por isso cada chave vem com o que
 * ela deixa passar, e não só com o nome dela. Quem não entende o que ligou
 * desliga tudo na primeira mensagem inconveniente, e aí o app volta ao silêncio.
 *
 * O push e o WhatsApp são do aparelho e da pessoa. O número do WhatsApp da
 * empresa é da empresa, e por isso fica separado, só para administrador: quem
 * recebe precisa reconhecer de quem é a mensagem.
 */
export function AjustesAvisos() {
  const { eu, org, contato, salvarContato, aparelhos, ligarPushAqui, desligarPushAqui,
    esquecerAparelho, conectores, salvarOrg, toast } = useDados()
  const [estado, setEstado] = useState<EstadoPush>('sem-suporte')
  const [fone, setFone] = useState(contato?.telefone || '')
  const [mexendo, setMexendo] = useState(false)
  const [sid, setSid] = useState(org.whats_sid || '')
  const [de, setDe] = useState(org.whats_de || '')

  useEffect(() => { setFone(contato?.telefone || '') }, [contato?.telefone])
  useEffect(() => {
    let vivo = true
    void import('@/lib/push').then(async (m) => {
      const e = await m.estadoDoPush()
      if (vivo) setEstado(e)
    })
    return () => { vivo = false }
  }, [aparelhos.length])

  const foneOk = !fone.trim() || !!telefoneLimpo(fone)

  return (
    <div className="blk" id="aj-avisos">
      <div className="bh">
        <h2>Como quero ser avisado</h2>
        <span className="c">vale só para você</span>
        <Link className="r" href="/avisos">Ver a caixa</Link>
      </div>

      <div className="card" style={{ padding: 15 }}>
        <p className="hint" style={{ marginTop: 0 }}>
          O TrackWard avisa quando alguém te passa uma tarefa, quando um prazo seu vence, quando um
          checkpoint fica pronto para a sua aprovação, quando a tarefa que te travava sai e quando te
          chamam na conversa. <b>O sino dentro do app mostra tudo sempre.</b> As chaves abaixo
          decidem só o que sai daqui e vai atrás de você.
        </p>

        {/* ------------------------------------------------------ push */}
        <div className="fld" style={{ marginTop: 16 }}>
          <span className="lbl">Push neste aparelho</span>
          {estado === 'ligado' ? (
            <div className="row-inline">
              <span className="badge done"><Ic.check />Ligado neste aparelho</span>
              <button className="btn ghost" onClick={async () => {
                setMexendo(true); await desligarPushAqui(); setEstado('desligado'); setMexendo(false)
              }} disabled={mexendo}>Desligar aqui</button>
            </div>
          ) : estado === 'negado' ? (
            <p className="hint">
              Você recusou a permissão neste navegador, e só ela reabre: o app não consegue pedir de
              novo. Vá nas configurações do site, permita notificações, e volte aqui.
            </p>
          ) : estado === 'precisa-instalar' ? (
            <p className="hint">
              No iPhone e no iPad o push só funciona com o app instalado na tela inicial. Abra o menu
              de compartilhar do Safari, escolha &quot;Adicionar à Tela de Início&quot;, abra o
              TrackWard por lá e volte nesta tela.
            </p>
          ) : estado === 'sem-suporte' ? (
            <p className="hint">
              Este navegador não aceita push, ou o servidor ainda não tem o par de chaves VAPID
              configurado. Ver o README, seção Avisos.
            </p>
          ) : (
            <div className="row-inline">
              <button className="btn" disabled={mexendo} onClick={async () => {
                setMexendo(true)
                const ok = await ligarPushAqui()
                setEstado(ok ? 'ligado' : 'negado')
                if (!ok) toast('Sem a permissão do navegador não dá para avisar por aqui.', true)
                setMexendo(false)
              }}><Ic.sino />Ligar push neste aparelho</button>
            </div>
          )}
          <p className="hint">
            Cada aparelho é ligado uma vez, e você pode ter vários. O aviso aparece mesmo com o app
            fechado, que é o ponto dele.
          </p>
        </div>

        {aparelhos.length > 0 && (
          <div className="fld">
            <span className="lbl">Aparelhos ligados</span>
            <div className="cpl">
              {aparelhos.map((a) => (
                <div className="pi" key={a.id} style={{ padding: '9px 11px', borderTop: '1px solid var(--line)' }}>
                  <Ic.sino />
                  <span style={{ minWidth: 0 }}>
                    <b style={{ fontWeight: 500, fontSize: 13 }}>{a.aparelho || 'Aparelho'}</b>
                    <small style={{ display: 'block', fontSize: 11, color: 'var(--tx-3)' }}>
                      ligado em {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                    </small>
                  </span>
                  <button className="iconbtn" aria-label={`Esquecer ${a.aparelho}`} title="Esquecer"
                    onClick={() => void esquecerAparelho(a.id)}><Ic.x /></button>
                  <span /><span />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------- whatsapp */}
        <div className="fld">
          <label htmlFor="av-fone">Seu WhatsApp</label>
          <div className="row-inline">
            <input className="inp" id="av-fone" value={fone} placeholder="+55 11 99999-9999"
              onChange={(e) => setFone(e.target.value)} />
            <button className="btn" disabled={!foneOk || fone === (contato?.telefone || '')}
              onClick={() => void salvarContato({ telefone: telefoneLimpo(fone) })}>Salvar</button>
          </div>
          {!foneOk && (
            <p className="hint" style={{ color: 'var(--late)' }}>
              Falta o país e o DDD. O formato é +55 seguido do número, sem espaço obrigatório.
            </p>
          )}
          <label className="chk">
            <input type="checkbox" checked={!!contato?.whats}
              onChange={(e) => void salvarContato({ whats: e.target.checked })} />
            Receber aviso no WhatsApp
          </label>
          <p className="hint">
            {org.whats_conector
              ? 'A mensagem chega pelo número da empresa, e não por um número desconhecido.'
              : 'A empresa ainda não ligou o WhatsApp. Enquanto isso, esta chave não manda nada.'}
          </p>
        </div>

        {/* ----------------------------------------------------- limites */}
        <div className="fld">
          <span className="lbl">O que vale tocar o seu celular</span>
          <label className="chk">
            <input type="checkbox" checked={!!contato?.so_urgente}
              onChange={(e) => void salvarContato({ so_urgente: e.target.checked })} />
            Só o urgente sai do app
          </label>
          <p className="hint">
            Urgente é o que já venceu, o que trava outra pessoa e o que só você destrava. Tarefa
            nova, citação na conversa e pedido de prazo ficam esperando no sino.
          </p>
        </div>

        <div className="fld">
          <span className="lbl">Não perturbe</span>
          <div className="row-inline">
            <input className="inp" type="time" aria-label="Calar a partir de"
              value={contato?.calado_de || ''}
              onChange={(e) => void salvarContato({ calado_de: e.target.value || null })} />
            <span className="due">até</span>
            <input className="inp" type="time" aria-label="Voltar a avisar às"
              value={contato?.calado_ate || ''}
              onChange={(e) => void salvarContato({ calado_ate: e.target.value || null })} />
            {(contato?.calado_de || contato?.calado_ate) && (
              <button className="btn ghost"
                onClick={() => void salvarContato({ calado_de: null, calado_ate: null })}>Limpar</button>
            )}
          </div>
          <p className="hint">
            Nesse intervalo nada sai do app, exceto o que já venceu: esse é o único que não espera
            amanhã. Vazio é sempre pode.
          </p>
        </div>

        {/* --------------------------------------- o WhatsApp da empresa */}
        {eu.papel === 'admin' && (
          <>
            <div className="sep" style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />
            <div className="fld">
              <span className="lbl">O WhatsApp da empresa</span>
              <p className="hint" style={{ marginTop: 0 }}>
                Quem manda a mensagem é a Twilio, com o número aprovado pela Meta. Ligue primeiro o
                conector da Twilio em <Link href="/conectores" style={{ color: 'var(--ac-tinta)' }}>Conectores</Link>,
                que é onde a chave fica cifrada, e depois preencha os dois campos abaixo.
              </p>
            </div>
            <div className="fgrid">
              <div className="fld">
                <label htmlFor="w-con">Conector</label>
                <select className="inp" id="w-con" value={org.whats_conector || ''}
                  onChange={(e) => void salvarOrg({ whats_conector: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {conectores.filter((c) => c.ativo).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label htmlFor="w-sid">Account SID da Twilio</label>
                <input className="inp" id="w-sid" value={sid} placeholder="AC..."
                  onChange={(e) => setSid(e.target.value)}
                  onBlur={() => { if (sid !== org.whats_sid) void salvarOrg({ whats_sid: sid.trim() }) }} />
              </div>
              <div className="fld">
                <label htmlFor="w-de">Número que assina</label>
                <input className="inp" id="w-de" value={de} placeholder="whatsapp:+14155238886"
                  onChange={(e) => setDe(e.target.value)}
                  onBlur={() => { if (de !== org.whats_de) void salvarOrg({ whats_de: de.trim() }) }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
