'use client'

import { useEffect, useRef, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import {
  Gravador, duracao, podeGravar, podeTranscrever,
  type Andamento, type Gravacao,
} from '@/lib/voz'

/**
 * Gravar um recado, e revisar o que o navegador ouviu antes de mandar.
 *
 * A revisão é o ponto. Um recado de voz que a IA transcreve e aceita sozinha
 * coloca palavra na boca de alguém: basta o navegador ouvir "cancela" onde a
 * pessoa disse "confirma" para nascer uma tarefa errada. Aqui o texto aparece
 * enquanto se fala, e quem falou conserta antes de enviar.
 *
 * Quando o navegador não sabe ouvir, o recado vai sem texto e a tela diz isso.
 * Continua servindo para quem escuta; o que se perde é a IA entender.
 */

export function BotaoVoz({ canalId, respondeA, aoEnviar }: {
  canalId: string
  respondeA?: string | null
  aoEnviar?: () => void
}) {
  const { enviarAudio, toast } = useDados()
  const [gravando, setGravando] = useState(false)
  const [andamento, setAndamento] = useState<Andamento>({ segundos: 0, parcial: '', nivel: 0 })
  const [pronta, setPronta] = useState<Gravacao | null>(null)
  const [texto, setTexto] = useState('')
  const [indo, setIndo] = useState(false)
  const gravador = useRef<Gravador | null>(null)

  // Soltar o microfone se a pessoa sair da tela no meio da gravação.
  useEffect(() => () => { gravador.current?.cancelar() }, [])

  if (!podeGravar()) return null

  const comecar = async () => {
    const g = new Gravador(setAndamento)
    try {
      await g.comecar()
    } catch {
      toast('Não consegui usar o microfone. Confira a permissão do navegador.', true)
      return
    }
    gravador.current = g
    setAndamento({ segundos: 0, parcial: '', nivel: 0 })
    setGravando(true)
  }

  const parar = async () => {
    const g = gravador.current
    if (!g) return
    const r = await g.parar()
    gravador.current = null
    setGravando(false)
    if (!r) { toast('O recado saiu vazio.', true); return }
    setPronta(r)
    setTexto(r.texto)
  }

  const descartar = () => {
    gravador.current?.cancelar()
    gravador.current = null
    setGravando(false)
    setPronta(null)
    setTexto('')
  }

  const mandar = async () => {
    if (!pronta) return
    setIndo(true)
    const ok = await enviarAudio(canalId, { ...pronta, texto }, respondeA)
    setIndo(false)
    if (!ok) return
    setPronta(null)
    setTexto('')
    aoEnviar?.()
  }

  if (pronta) {
    return (
      <div className="voz-revisa">
        <div className="voz-revisa-h">
          <span className="voz-ic"><Ic.microfone /></span>
          <b>Recado de {duracao(pronta.segundos)}</b>
          <span>
            {pronta.texto
              ? 'Confira o que o navegador ouviu. O texto é o que a IA vai ler, então vale corrigir.'
              : podeTranscrever()
                ? 'Não deu para entender o que foi dito. Dá para escrever aqui do lado.'
                : 'Este navegador não sabe transcrever. Escreva o resumo, senão a IA não entende o recado.'}
          </span>
        </div>
        <textarea
          value={texto}
          rows={2}
          autoFocus
          onChange={(e) => setTexto(e.target.value)}
          placeholder="O que você disse, em texto"
          aria-label="Transcrição do recado"
        />
        <div className="voz-revisa-pe">
          <button className="btn ghost" onClick={descartar} disabled={indo}>Descartar</button>
          <button className="btn pri" onClick={() => void mandar()} disabled={indo}>
            {indo ? 'Enviando' : 'Enviar recado'}
          </button>
        </div>
      </div>
    )
  }

  if (gravando) {
    return (
      <div className="voz-grava">
        <span className="voz-ponto" aria-hidden />
        <span className="voz-tempo">{duracao(andamento.segundos)}</span>
        <span className="voz-onda" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{
              // A onda é decoração honesta: ela se move com o que o microfone pega.
              transform: `scaleY(${0.18 + andamento.nivel * (0.5 + Math.abs(Math.sin((i + andamento.segundos * 6) / 2)) * 0.5)})`,
            }} />
          ))}
        </span>
        <span className="voz-parcial">
          {andamento.parcial || (podeTranscrever() ? 'Ouvindo' : 'Sem transcrição neste navegador')}
        </span>
        <button className="iconbtn" onClick={descartar} aria-label="Descartar recado"><Ic.x /></button>
        <button className="btn pri" onClick={() => void parar()}>Pronto</button>
      </div>
    )
  }

  return (
    <button className="iconbtn voz-botao" onClick={() => void comecar()}
      title="Gravar um recado" aria-label="Gravar um recado">
      <Ic.microfone />
    </button>
  )
}

/** O recado tocando dentro da mensagem. */
export function Recado({ caminho, segundos, aoAbrir }: {
  caminho: string
  segundos: number | null
  aoAbrir: () => Promise<string | null>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [indo, setIndo] = useState(false)
  const som = useRef<HTMLAudioElement | null>(null)

  const tocar = async () => {
    if (url) { void som.current?.play(); return }
    setIndo(true)
    const u = await aoAbrir()
    setIndo(false)
    if (u) setUrl(u)
  }

  useEffect(() => { if (url) void som.current?.play() }, [url])

  return (
    <span className="recado">
      {url ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={som} src={url} controls preload="metadata" />
      ) : (
        <button className="recado-play" onClick={() => void tocar()} disabled={indo}>
          <span className="recado-ic">{indo ? <span className="girando" /> : <Ic.play />}</span>
          <span className="recado-onda" aria-hidden>
            {Array.from({ length: 22 }, (_, i) => (
              <span key={i} style={{
                // Altura estável por posição: a mesma mensagem desenha sempre igual.
                height: `${25 + ((i * 37 + caminho.length * 11) % 70)}%`,
              }} />
            ))}
          </span>
          <i>{duracao(segundos ?? 0)}</i>
        </button>
      )}
    </span>
  )
}
