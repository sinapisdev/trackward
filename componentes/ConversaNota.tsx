'use client'

import { useEffect, useRef, useState } from 'react'
import { useDados } from './Dados'
import { useComandos } from './Comandos'
import { Ic } from './Icones'
import { LIGACAO } from '@/lib/notas'
import type { Nota } from '@/lib/tipos'

/**
 * A conversa com a leitura dentro de uma nota.
 *
 * É o que faz o caderno deixar de ser um lugar onde se escreve e vira um lugar
 * onde se pensa. Cada nota é um assunto, e a conversa que acontece dentro dela
 * é sobre aquele assunto: quem pergunta não precisa contextualizar de novo,
 * porque o contexto é a nota em que a pergunta foi feita.
 *
 * O que ela responde não vira trabalho. Quem transforma conversa em tarefa é
 * "Organizar", que devolve propostas para alguém aceitar. A separação é a mesma
 * do resto do app, e é ela que deixa a leitura ser útil sem ser perigosa.
 */
export function ConversaNota({ nota, ir }: {
  nota: Nota
  /** Abrir outra nota pelo título, quando a resposta citar uma. */
  ir?: (titulo: string) => void
}) {
  const { mensagensDaNota, escreverNaNota, apagarMensagem, respondendo, org } = useDados()
  const [texto, setTexto] = useState('')
  const rolo = useRef<HTMLDivElement>(null)
  // Os mesmos comandos do chat valem aqui: pensar numa nota e sair dela para
  // criar a tarefa que a ideia gerou é o atrito que faz a ideia morrer.
  const cmd = useComandos({ notaId: nota.id })
  const falas = mensagensDaNota(nota.id)
  const pensando = respondendo === nota.id

  useEffect(() => {
    const el = rolo.current
    if (el) el.scrollTop = el.scrollHeight
  }, [nota.id, falas.length, pensando])

  const mandar = async () => {
    const t = texto.trim()
    if (!t || pensando) return
    setTexto('')
    if (await cmd.rodar(t)) return
    await escreverNaNota(nota.id, t)
  }

  return (
    <div className="cnv">
      <div className="cnv-rolo" ref={rolo}>
        {!falas.length && (
          <p className="cnv-vazio">
            {org.ia_ativa
              ? nota.conversa
                ? 'Fale do que quiser. O que você já guardou no caderno entra junto, então dá para perguntar de uma nota antiga sem ir procurar ela.'
                : 'Pergunte sobre esta nota. Ela vai junto na pergunta, e o que você guardou sobre assunto parecido também.'
              : 'A leitura com IA está desligada em Ajustes. O que você escrever aqui fica guardado do mesmo jeito.'}
          </p>
        )}

        {falas.map((m) => (
          <div key={m.id} className={`cnv-f ${m.por_ia ? 'ia' : 'eu'}`}>
            {m.por_ia && <span className="cnv-marca"><Ic.faisca />Leitura</span>}
            <div className="cnv-txt">
              {m.por_ia ? <ComLigacoes texto={m.texto} ir={ir} /> : m.texto}
            </div>
            <button className="cnv-x iconbtn" aria-label="Apagar esta fala"
              onClick={() => void apagarMensagem(m)}><Ic.x /></button>
          </div>
        ))}

        {pensando && (
          <div className="cnv-f ia">
            <span className="cnv-marca"><Ic.faisca />Leitura</span>
            <div className="cnv-txt cnv-pensando">Lendo o seu caderno...</div>
          </div>
        )}
      </div>

      <div className="cnv-campo">
        {cmd.menu(setTexto)}
        <textarea className="inp" rows={1} value={texto}
          placeholder={nota.conversa ? 'Fale com a leitura...' : 'Pergunte sobre esta nota...'}
          aria-label="Falar com a leitura"
          onChange={(e) => { setTexto(e.target.value); cmd.aoDigitar(e.target.value) }}
          onKeyDown={(e) => {
            if (cmd.teclas(e, setTexto)) return
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void mandar() }
          }} />
        <button className="iconbtn" aria-label="Enviar" disabled={!texto.trim() || pensando}
          onClick={() => void mandar()}><Ic.enviar /></button>
      </div>
    </div>
  )
}

/**
 * O texto da resposta com as ligações clicáveis.
 *
 * A leitura cita nota antiga com [[título]], que é a mesma marca que a pessoa
 * usa no texto dela. Ser a mesma marca não é economia de código: é o que faz a
 * ligação que a máquina propôs e a que a pessoa escreveu valerem o mesmo.
 */
function ComLigacoes({ texto, ir }: { texto: string; ir?: (titulo: string) => void }) {
  const pedacos: (string | { titulo: string })[] = []
  let fim = 0
  for (const m of texto.matchAll(LIGACAO)) {
    const i = m.index ?? 0
    if (i > fim) pedacos.push(texto.slice(fim, i))
    pedacos.push({ titulo: m[1].trim() })
    fim = i + m[0].length
  }
  if (fim < texto.length) pedacos.push(texto.slice(fim))

  return (
    <>
      {pedacos.map((p, i) => typeof p === 'string'
        ? <span key={i}>{p}</span>
        : ir
          ? <button key={i} className="nt-lig" onClick={() => ir(p.titulo)}>{p.titulo}</button>
          : <b key={i}>{p.titulo}</b>)}
    </>
  )
}
