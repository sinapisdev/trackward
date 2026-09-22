'use client'

import { useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { Av } from '@/componentes/atomos'
import { mandaNoProcesso } from '@/lib/acesso'
import { FAIXAS } from '@/lib/sobrecarga'
import type { Fluxo } from '@/lib/tipos'

/**
 * Quem faz o que ainda não tem dono.
 *
 * Tarefa sem responsável é o buraco mais comum de qualquer esteira: ela existe,
 * está no prazo de alguém, e ninguém a pegou. Aqui a leitura diz um nome e, mais
 * importante, diz DE ONDE tirou o nome, que é o que faz a sugestão ser aceitável.
 *
 * Três origens, e nenhuma é palpite sobre gente: o processo que a empresa
 * desenhou, quem entregou as parecidas antes, e o responsável da área.
 *
 * Só aparece para quem responde pela esteira, e só preenche o que está vazio.
 * Tirar uma tarefa de quem já a tem continua sendo decisão de gente.
 */
export function QuemFaz({ f }: { f: Fluxo }) {
  const { palpites, distribuirTarefa, perfilDe, eu, perfis, cargaDe } = useDados()
  const [indo, setIndo] = useState<string | null>(null)
  const [escondido, setEscondido] = useState(false)

  const meus = useMemo(
    () => palpites.filter((p) => p.fluxo.id === f.id),
    [palpites, f.id],
  )

  if (escondido || !meus.length || !mandaNoProcesso(eu, f, perfis)) return null

  const todas = async () => {
    setIndo('todas')
    for (const p of meus) await distribuirTarefa(p)
    setIndo(null)
  }

  return (
    <div className="qf">
      <div className="qf-h">
        <Ic.faisca />
        <b>
          {meus.length === 1
            ? 'Uma tarefa desta esteira está sem dono'
            : `${meus.length} tarefas desta esteira estão sem dono`}
        </b>
        <span>
          {meus.length === 1 ? 'A leitura sugere quem' : 'A leitura sugere quem'}, e diz de onde
          tirou. Aceitar põe o nome na tarefa; nada muda sem você clicar.
        </span>
        <button className="iconbtn" aria-label="Esconder" onClick={() => setEscondido(true)}>
          <Ic.x />
        </button>
      </div>

      {meus.map((p) => {
        const c = cargaDe(p.resp_id)
        const pesada = c && (c.faixa === 'apertado' || c.faixa === 'sobrecarregado')
        return (
        <div className="qf-l" key={p.item.id}>
          <span className="qf-txt">
            <b>{p.item.texto}</b>
            <small>{p.etapa.nome}</small>
          </span>
          <span className="qf-quem">
            <Av p={perfilDe(p.resp_id)} tam="sm" />
            <span>
              <b>
                {p.nome}
                {pesada && ' '}
                {pesada && (
                  <i className={`qf-carga ${c!.faixa}`} title={`Índice de sobrecarga ${c!.indice} de 100`}>
                    {FAIXAS[c!.faixa].nome.toLowerCase()}
                  </i>
                )}
              </b>
              <small>
                {p.porque}
                {p.carga ? `, e tem ${p.carga} ${p.carga === 1 ? 'tarefa' : 'tarefas'} na mão` : ', e está sem nada na mão'}
              </small>
            </span>
          </span>
          <button className="btn" disabled={!!indo}
            onClick={async () => { setIndo(p.item.id); await distribuirTarefa(p); setIndo(null) }}>
            {indo === p.item.id ? 'Passando' : 'Passar'}
          </button>
        </div>
        )
      })}

      {meus.length > 1 && (
        <div className="qf-pe">
          <button className="btn ghost" disabled={!!indo} onClick={() => void todas()}>
            {indo === 'todas' ? 'Distribuindo' : `Aceitar as ${meus.length}`}
          </button>
        </div>
      )}
    </div>
  )
}
