'use client'

import { useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Carregando } from '@/componentes/Shell'
import { Ic } from '@/componentes/Icones'
import { oQueFaz } from '@/lib/agentes'
import { rel, isoDe } from '@/lib/datas'
import type { Agente } from '@/lib/tipos'

/**
 * Os agentes que a empresa escreve.
 *
 * Um agente é duas coisas: o que reconhecer na conversa, e o que fazer quando
 * reconhecer. Nada aqui sabe de RH, de comercial ou de qualquer setor: é a
 * empresa que descreve a situação nas palavras dela.
 *
 * A ação nunca é direta. Ela vira uma proposta no canal, com o trecho que deu
 * origem à vista, e alguém aceita com um toque. Um agente abrindo um processo
 * inteiro sozinho, por causa de uma frase mal lida, criaria vinte tarefas erradas
 * em duas áreas.
 *
 * Os exemplos abaixo são de setores diferentes de propósito. O que muda de
 * empresa para empresa é a situação, e o motor não faz ideia de qual é.
 */

const EXEMPLOS: { nome: string; reconhecer: string; onde: string }[] = [
  { nome: 'Cliente reclamou', onde: 'atendimento',
    reconhecer: 'um cliente reclamou de atraso, de qualidade ou de cobrança' },
  { nome: 'Equipamento parou', onde: 'operação',
    reconhecer: 'um equipamento quebrou, travou ou saiu de operação' },
  { nome: 'Cliente novo fechado', onde: 'comercial',
    reconhecer: 'a equipe fechou negócio com um cliente novo' },
  { nome: 'Fornecedor subiu preço', onde: 'compras',
    reconhecer: 'um fornecedor avisou de reajuste ou mudou condição de pagamento' },
  { nome: 'Alguém está saindo', onde: 'pessoas',
    reconhecer: 'uma pessoa pediu demissão, foi desligada ou avisou que vai sair' },
  { nome: 'Prazo legal chegando', onde: 'jurídico',
    reconhecer: 'a conversa fala de prazo de órgão público, de multa ou de notificação' },
]

function Cartao({ a }: { a: Agente }) {
  const { processos, areaDe, canais, salvarAgente, excluirAgente, nomeDe } = useDados()
  const { abrir } = useModais()
  const canal = a.canal_id ? canais.find((c) => c.id === a.canal_id) : null

  return (
    <div className={`ag ${a.ativo ? '' : 'off'}`}>
      <div className="ag-h">
        <span className="ag-ic"><Ic.faisca /></span>
        <div className="ag-nm">
          <b>{a.nome}</b>
          <span>
            escuta {canal ? `#${canal.nome}` : a.area_id ? `os canais de ${areaDe(a.area_id).nome}` : 'todos os canais'}
            {a.disparos > 0 && ` · disparou ${a.disparos} ${a.disparos === 1 ? 'vez' : 'vezes'}`}
            {a.disparado_em && `, a última ${rel(isoDe(a.disparado_em)).toLowerCase()}`}
          </span>
        </div>
        <button className={`tpl ${a.ativo ? 'on' : ''}`}
          onClick={() => void salvarAgente({ ...a, ativo: !a.ativo })}>
          {a.ativo ? 'Ligado' : 'Desligado'}
        </button>
        <button className="iconbtn" aria-label={`Editar ${a.nome}`}
          onClick={() => abrir({ tipo: 'agente', agente: a })}><Ic.edit /></button>
        <button className="iconbtn" aria-label={`Remover ${a.nome}`}
          onClick={() => abrir({
            tipo: 'excluir',
            titulo: `Remover o agente ${a.nome}?`,
            texto: 'Ele para de escutar a conversa. O que ele já criou fica.',
            acao: () => excluirAgente(a.id),
          })}><Ic.x /></button>
      </div>

      <div className="ag-linha">
        <span className="ag-rot">Quando</span>
        <span>{a.reconhecer}</span>
      </div>
      <div className="ag-linha">
        <span className="ag-rot">Propõe</span>
        <span>
          {oQueFaz(a,
            (id) => processos.find((p) => p.id === id)?.nome || 'um processo que não existe mais',
            (id) => areaDe(id).nome)}
          {a.faz === 'processo' && <i> e a esteira nasce distribuída pelas áreas do processo</i>}
        </span>
      </div>
      {a.criado_por && (
        <p className="ag-quem">escrito por {nomeDe(a.criado_por)}</p>
      )}
    </div>
  )
}

export function TelaAgentes() {
  const { agentes, processos, eu, org, carregando } = useDados()
  const { abrir } = useModais()
  const [verExemplos, setVerExemplos] = useState(false)

  if (carregando) return <Carregando />

  const podeMexer = eu.papel === 'admin' || eu.papel === 'gestor'

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Situações que a sua empresa quer que o app reconheça</div>
          <h1>Agentes</h1>
        </div>
        {podeMexer && (
          <div className="hdr-actions">
            <button className="btn" onClick={() => setVerExemplos((v) => !v)}>
              {verExemplos ? 'Esconder exemplos' : 'Ver exemplos'}
            </button>
            <button className="btn pri" onClick={() => abrir({ tipo: 'agente' })}>
              <Ic.plus />Novo agente
            </button>
          </div>
        )}
      </div>

      <div className="card ag-regua">
        <p>
          Um agente é <b>duas coisas</b>: o que reconhecer na conversa, escrito por você, e o
          que fazer quando reconhecer. Nada aqui sabe de setor nenhum: quem descreve a
          situação é a sua empresa, nas palavras dela.
        </p>
        <p>
          <b>A ação nunca acontece direto.</b> Ela vira uma proposta no canal, com o trecho da
          conversa que deu origem, e alguém aceita com um toque. É de propósito: um agente
          abrindo um processo inteiro sozinho, por causa de uma frase mal lida, criaria vinte
          tarefas erradas em duas áreas.
        </p>
        {!org.ia_ativa ? (
          <p className="ag-aviso">
            <Ic.pause />
            <span>
              <b>A leitura da conversa está desligada</b>, em Ajustes. Sem ela os agentes não
              escutam nada.
            </span>
          </p>
        ) : (
          <p className="hint" style={{ marginTop: 10 }}>
            Com chave de modelo configurada, quem julga se a conversa fala daquela situação é
            o modelo, que entende <b>&quot;o João não vem mais&quot;</b> como alguém saindo.
            Sem chave, valem as palavras que você escreveu, o que é mais bruto e ainda assim
            útil.
          </p>
        )}
      </div>

      {verExemplos && (
        <div className="blk">
          <div className="bh">
            <h2>Exemplos, de setores diferentes</h2>
            <span className="c">clique para começar de um deles</span>
          </div>
          <div className="ag-exemplos">
            {EXEMPLOS.map((e) => (
              <button key={e.nome} className="ag-ex"
                onClick={() => abrir({ tipo: 'agente', inicial: e })}>
                <b>{e.nome}</b>
                <span>{e.reconhecer}</span>
                <i>{e.onde}</i>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="blk">
        <div className="bh">
          <h2>{agentes.length ? `${agentes.length} agente${agentes.length === 1 ? '' : 's'}` : 'Nenhum agente ainda'}</h2>
        </div>
        {agentes.length ? (
          <div className="ag-lista">
            {agentes.map((a) => <Cartao key={a.id} a={a} />)}
          </div>
        ) : (
          <div className="card empty" style={{ padding: 34 }}>
            {podeMexer
              ? 'Nenhum agente ainda. Veja os exemplos acima para ter uma ideia do que dá para fazer, ou escreva o seu.'
              : 'Nenhum agente ainda. Admin e gestor escrevem agentes.'}
            {!processos.length && podeMexer && (
              <p className="hint" style={{ marginTop: 10 }}>
                Para um agente abrir um processo inteiro, desenhe o processo primeiro em
                Processos. Sem processo, o agente ainda pode criar uma tarefa numa área ou
                avisar um endereço de fora.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
