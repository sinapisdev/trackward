'use client'

import { useEffect, useState } from 'react'
import { Ic } from './Icones'
import { MODO_LOCAL } from '@/lib/modo'
import { supabase } from '@/lib/supabase/browser'

/**
 * O formulário de quem recebeu o trabalho.
 *
 * Duas perguntas e um botão. Quem abre isto não é usuário do app, não vai
 * aprender nada e não volta: qualquer campo a mais é uma chance a mais de
 * fechar a aba. A nota é obrigatória porque é ela que vira número; o texto é
 * opcional porque é ele que dá trabalho.
 */

type Estado = {
  track: string
  pediu: string
  para: string
  vencido: boolean
  respondido: boolean
}

const CARINHAS = [
  { n: 1, rot: 'Ruim' },
  { n: 2, rot: 'Fraco' },
  { n: 3, rot: 'Deu certo' },
  { n: 4, rot: 'Bom' },
  { n: 5, rot: 'Muito bom' },
]

export function Resposta({ token }: { token: string }) {
  const [carregando, setCarregando] = useState(true)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [nota, setNota] = useState<number | null>(null)
  const [texto, setTexto] = useState('')
  const [indo, setIndo] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState('')

  /**
   * No modo demonstração não existe servidor: o banco inteiro mora no navegador
   * de quem está olhando. Sem este caminho, a página de feedback seria a única
   * do app que não funciona na demo, e ela é justamente a que se quer mostrar.
   */
  useEffect(() => {
    void (async () => {
      try {
        if (MODO_LOCAL) { setEstado(await localLer(token)); return }
        const r = await fetch(`/api/feedback?t=${encodeURIComponent(token)}`)
        if (r.ok) setEstado(await r.json())
      } finally { setCarregando(false) }
    })()
  }, [token])

  const mandar = async () => {
    if (!nota || indo) return
    setIndo(true)
    setErro('')
    if (MODO_LOCAL) {
      await localGravar(token, nota, texto)
      setIndo(false)
      setPronto(true)
      return
    }
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ t: token, nota, texto }),
    })
    setIndo(false)
    if (r.ok) { setPronto(true); return }
    const d = await r.json().catch(() => ({}))
    setErro(d.erro === 'ja-respondido' ? 'Este link já foi respondido. Obrigado.'
      : d.erro === 'vencido' ? 'Este link venceu. Peça outro a quem enviou.'
        : 'Não deu para enviar agora. Tente de novo em um minuto.')
  }

  if (carregando) return <div className="fb"><p className="fb-lede">Abrindo...</p></div>

  if (!estado) return (
    <div className="fb">
      <h1>Link não encontrado</h1>
      <p className="fb-lede">
        Ele pode ter sido apagado, ou o endereço veio quebrado no e-mail. Peça outro a
        quem enviou.
      </p>
    </div>
  )

  if (pronto || estado.respondido) return (
    <div className="fb">
      <span className="fb-ok"><Ic.check /></span>
      <h1>Obrigado.</h1>
      <p className="fb-lede">Sua resposta chegou a quem tocou o trabalho.</p>
    </div>
  )

  if (estado.vencido) return (
    <div className="fb">
      <h1>Este link venceu</h1>
      <p className="fb-lede">Peça um novo a quem enviou.</p>
    </div>
  )

  return (
    <div className="fb">
      <div className="fb-marca"><Ic.logo /><b>TrackWard</b></div>
      <h1>Como foi {estado.track}?</h1>
      <p className="fb-lede">
        {estado.pediu ? `${estado.pediu} pediu` : 'Pediram'} sua opinião sobre este
        trabalho. Leva meio minuto, e é anônimo para todo mundo menos para quem pediu.
      </p>

      <div className="fb-notas" role="group" aria-label="Sua nota">
        {CARINHAS.map((c) => (
          <button key={c.n} className={nota === c.n ? 'on' : ''} onClick={() => setNota(c.n)}
            aria-pressed={nota === c.n}>
            <b>{c.n}</b>
            <small>{c.rot}</small>
          </button>
        ))}
      </div>

      <label className="fb-campo">
        <span>O que funcionou, e o que você faria diferente (opcional)</span>
        <textarea rows={5} value={texto} maxLength={4000}
          placeholder="Escreva com suas palavras. Quem vai ler é quem fez o trabalho."
          onChange={(e) => setTexto(e.target.value)} />
      </label>

      {!!erro && <p className="fb-erro">{erro}</p>}

      <button className="fb-enviar" disabled={!nota || indo} onClick={() => void mandar()}>
        {indo ? 'Enviando...' : 'Enviar'}
      </button>
      <p className="fb-pe">
        Você não precisa de conta, e nada além do que escrever aqui é coletado.
      </p>
    </div>
  )
}

/* ---------------------------------------------------- modo demonstração */

type LinhaLocal = {
  id: string; token: string; fluxo_id: string; pediu_id: string | null
  para: string; vence_em: string; respondido_em: string | null
}

async function localLer(token: string): Promise<Estado | null> {
  const sb = supabase()
  const { data } = await sb.from('feedbacks').select('*')
  const f = ((data || []) as LinhaLocal[]).find((x) => x.token === token)
  if (!f) return null
  const { data: fx } = await sb.from('fluxos').select('*')
  const { data: ps } = await sb.from('perfis').select('*')
  const track = ((fx || []) as { id: string; nome: string }[]).find((x) => x.id === f.fluxo_id)
  const quem = ((ps || []) as { id: string; nome: string }[]).find((x) => x.id === f.pediu_id)
  return {
    track: track?.nome || 'um trabalho',
    pediu: quem?.nome || '',
    para: f.para || '',
    vencido: new Date(f.vence_em).getTime() < Date.now(),
    respondido: !!f.respondido_em,
  }
}

async function localGravar(token: string, nota: number, texto: string) {
  const sb = supabase()
  const { data } = await sb.from('feedbacks').select('*')
  const f = ((data || []) as LinhaLocal[]).find((x) => x.token === token)
  if (!f) return
  await sb.from('feedbacks')
    .update({ nota, texto, respondido_em: new Date().toISOString() })
    .eq('id', f.id)
}
