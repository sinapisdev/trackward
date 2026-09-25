'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { useFora } from './partes'
import { Ic } from './Icones'
import { Anexos } from './Anexos'
import { Av } from './atomos'
import { rotuloTipo } from '@/lib/rotulos'
import type { Nota } from '@/lib/tipos'

/**
 * Tudo que a nota tem e não é o texto dela, atrás de um botão só.
 *
 * Área, track, arquivos, fixar e apagar estavam soltos embaixo do texto, e
 * empurravam o que importa para cima: numa tela de telefone, meia página de
 * campos antes da primeira linha escrita. Eles não são o trabalho, são o
 * cadastro da nota, e cadastro se abre quando se precisa dele.
 */
export function DetalhesNota({ nota, aoApagar }: {
  nota: Nota
  /** O que fazer depois de apagar: a tela que abriu a nota decide. */
  aoApagar: () => void
}) {
  const { areas, fluxos, minhaLista, salvarNota, excluirNota, anexosDe,
    eu, perfis, canais, comQuem, compartilharNota, notaParaCanal, pode } = useDados()
  const [mostrando, setMostrando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const caixa = useFora(aberto, () => setAberto(false))

  const salvar = (extra: Partial<Nota>) => void salvarNota({
    id: nota.id, titulo: nota.titulo, texto: nota.texto,
    fixada: nota.fixada, arquivada: nota.arquivada,
    area_id: nota.area_id, fluxo_id: nota.fluxo_id, ...extra,
  })

  const quantos = anexosDe(nota.id).length
  const comigo = comQuem(nota.id)
  const outros = perfis.filter((p) => p.ativo && p.id !== eu.id)

  return (
    <div className="nt-det" ref={caixa}>
      {/* Com a palavra, e não só os três pontinhos: "•••" é o lugar onde os
          apps guardam o que não souberam nomear, e quem não sabe o que tem
          dentro não abre.

          Ele quase virou lima cheio, e o próprio teste barrou: na tela de
          Notas o acento já é do "Nota nova", e dois limas na mesma tela é
          defeito. O que faz um botão ser evidente é ele dizer o que faz, não a
          cor: com a palavra e o contorno, ninguém precisa adivinhar. */}
      <button className={`nt-det-btn ${aberto ? 'on' : ''}`} aria-expanded={aberto}
        title="Área, track, arquivos e mais" onClick={() => setAberto((a) => !a)}>
        <Ic.reguas />Detalhes
      </button>

      {aberto && (
        <div className="nt-det-menu">
          <label className="sel-quem">
            <select value={nota.area_id || ''} aria-label="Área desta nota"
              onChange={(e) => salvar({ area_id: e.target.value || null })}>
              <option value="">Sem área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <Ic.chev />
          </label>

          <label className="sel-quem">
            <select value={nota.fluxo_id || ''} aria-label="Track desta nota"
              onChange={(e) => salvar({ fluxo_id: e.target.value || null })}>
              <option value="">Sem track</option>
              {fluxos.filter((f) => !f.concluido && f.id !== minhaLista?.id).map((f) => (
                <option key={f.id} value={f.id}>{rotuloTipo(f.tipo)}: {f.nome}</option>
              ))}
            </select>
            <Ic.chev />
          </label>

          <div className="nt-det-arq">
            <span className="lbl">Arquivos{quantos ? ` (${quantos})` : ''}</span>
            <Anexos nota={nota} podeAnexar />
          </div>

          {/* Mostrar a nota é gesto de quem escreveu, e nunca acontece sozinho.
              São duas coisas diferentes e a palavra "compartilhar" esconde
              isso: liberar a leitura é escolher quem acompanha, e pôr num canal
              é deixar o cartão lá para quem estiver na conversa abrir. */}
          {pode.canais && (
            <div className="nt-det-arq">
              <button className="nt-det-item" onClick={() => setMostrando((v) => !v)}>
                <Ic.team />
                {comigo.length
                  ? `Compartilhada com ${comigo.length}`
                  : 'Compartilhar'}
              </button>
              {mostrando && (
                <div className="nt-comp">
                  <span className="lbl">Quem pode ler</span>
                  {outros.map((p) => {
                    const tem = comigo.includes(p.id)
                    return (
                      <label className="nt-comp-p" key={p.id}>
                        <input type="checkbox" checked={tem} onChange={() => void compartilharNota(
                          nota.id,
                          tem ? comigo.filter((x) => x !== p.id) : [...comigo, p.id],
                        )} />
                        <Av p={p} tam="sm" />
                        <span>{p.nome}</span>
                      </label>
                    )
                  })}
                  <p className="hint">
                    Quem recebe lê e abre os anexos. Não edita, e não vê o que você
                    perguntou à leitura aqui dentro.
                  </p>

                  <span className="lbl">Pôr num canal</span>
                  <label className="sel-quem">
                    <select defaultValue="" aria-label="Mandar esta nota para um canal"
                      onChange={(e) => {
                        if (!e.target.value) return
                        void notaParaCanal(nota.id, e.target.value)
                        e.target.value = ''
                      }}>
                      <option value="">Escolher canal</option>
                      {canais.filter((c) => !c.arquivado).map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <Ic.chev />
                  </label>
                  <p className="hint">
                    Vira um cartão na conversa, com o título e o começo do texto. Quem abrir
                    passa a ler a nota, e aparece aqui em cima.
                  </p>
                </div>
              )}
            </div>
          )}

          <button className="nt-det-item" onClick={() => salvar({ fixada: !nota.fixada })}>
            <Ic.flag />{nota.fixada ? 'Soltar do topo' : 'Fixar no topo'}
          </button>
          <button className="nt-det-item perigo"
            onClick={async () => { await excluirNota(nota.id); setAberto(false); aoApagar() }}>
            <Ic.x />Apagar a nota
          </button>
        </div>
      )}
    </div>
  )
}
