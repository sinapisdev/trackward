'use client'

import { useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { useModais } from '@/componentes/Modais'
import { Carregando } from '@/componentes/Shell'
import { Ic } from '@/componentes/Icones'
import { MOLDES, faltaAlgo, moldeDe, servico, type Molde } from '@/lib/conectores'
import { MODO_LOCAL } from '@/lib/modo'
import type { Conector } from '@/lib/tipos'

/**
 * Conectores: ligar o Track em qualquer serviço que aceite uma chave.
 *
 * Duas decisões desta tela, e as duas vieram de perguntas do Leo:
 *
 * 1. QUALQUER PESSOA LIGA O QUE É DELA. Quem mais usa o app não é quem é dono da
 *    empresa, é quem trabalha nela, e a conta do Notion que essa pessoa quer
 *    ligar é dela. Então tem duas colunas: os conectores da empresa, que só admin
 *    mexe, e os seus, que ninguém além de você vê. Nem o chefe.
 *
 * 2. A CHAVE ENTRA E NÃO SAI. Ela vai para o servidor, é cifrada lá, e o que fica
 *    no banco é texto embaralhado. Depois de salvar, nem a tela nem eu nem o dono
 *    da empresa leem a chave de volta. O que aparece são os quatro últimos
 *    caracteres, para você reconhecer qual é.
 */

function Cartao({ c }: { c: Conector }) {
  const { eu, pessoal, nomeDe, salvarConector, excluirConector, guardarChave, testarConector } = useDados()
  const { abrir } = useModais()
  const [chave, setChave] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  const [resultado, setResultado] = useState('')
  const [testando, setTestando] = useState(false)

  const daCasa = !c.dono_id
  const meu = c.dono_id === eu.id
  const podeMexer = daCasa ? eu.papel === 'admin' : meu
  const molde = MOLDES.find((m) => servico(c).includes(m.id))
  const falta = faltaAlgo(c)

  const testar = async () => {
    setTestando(true)
    setResultado(await testarConector(c.id, molde?.teste || ''))
    setTestando(false)
  }

  const salvarChave = async () => {
    if (await guardarChave(c.id, chave)) { setChave(''); setAbrindo(false) }
  }

  return (
    <div className={`cn ${c.ativo ? '' : 'off'}`}>
      <div className="cn-h">
        <span className="cn-ic"><Ic.raio /></span>
        <div className="cn-nm">
          <b>{c.nome}</b>
          <span>
            {servico(c)}
            {c.dica ? ` · chave ${c.dica}` : ' · sem chave ainda'}
            {daCasa || pessoal ? '' : meu ? ' · só você vê' : ` · de ${nomeDe(c.dono_id!)}`}
          </span>
        </div>
        {podeMexer && (
          <>
            <button className={`tpl ${c.ativo ? 'on' : ''}`}
              onClick={() => void salvarConector({ ...c, ativo: !c.ativo })}>
              {c.ativo ? 'Ligado' : 'Desligado'}
            </button>
            <button className="iconbtn" aria-label={`Remover ${c.nome}`}
              onClick={() => abrir({
                tipo: 'excluir',
                titulo: `Remover o conector ${c.nome}?`,
                texto: 'A chave guardada vai embora com ele, e os agentes que chamavam esse serviço param de chamar.',
                acao: () => excluirConector(c.id),
              })}><Ic.x /></button>
          </>
        )}
      </div>

      {falta && podeMexer && (
        <p className="cn-falta"><Ic.flag /><span>Falta {falta}.</span></p>
      )}

      {podeMexer && (
        <div className="cn-acoes">
          {abrindo ? (
            <div className="cn-cola">
              <input className="inp" type="password" autoFocus value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder={molde ? molde.onde : 'cole a chave de API aqui'}
                aria-label={`Chave de ${c.nome}`} />
              <button className="btn pri" onClick={() => void salvarChave()}>Guardar</button>
              <button className="btn" onClick={() => { setAbrindo(false); setChave('') }}>Cancelar</button>
            </div>
          ) : (
            <>
              <button className="btn" onClick={() => setAbrindo(true)}>
                {c.dica ? 'Trocar a chave' : 'Colar a chave'}
              </button>
              {c.dica && (
                <button className="btn" onClick={() => void testar()} disabled={testando}>
                  {testando ? 'Testando...' : 'Testar'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {molde && <p className="cn-onde">A chave fica em: {molde.onde}</p>}
      {resultado && <p className="cn-res">{resultado}</p>}
    </div>
  )
}

/** A escolha do serviço, que é o passo que faz o resto vir preenchido. */
function Escolher({ para, fechar }: { para: 'casa' | 'minha'; fechar: () => void }) {
  const { eu, salvarConector } = useDados()
  const [salvando, setSalvando] = useState('')

  const criar = async (m: Molde) => {
    setSalvando(m.id)
    await salvarConector({
      nome: m.nome,
      base_url: m.base_url,
      auth_tipo: m.auth_tipo,
      auth_nome: m.auth_nome,
      dono_id: para === 'casa' ? null : eu.id,
    })
    setSalvando('')
    fechar()
  }

  return (
    <div className="blk">
      <div className="bh">
        <h2>{para === 'casa' ? 'Ligar um serviço da empresa' : 'Ligar um serviço seu'}</h2>
        <button className="c linkish" onClick={fechar}>cancelar</button>
      </div>
      <div className="cn-moldes">
        {MOLDES.map((m) => (
          <button key={m.id} className="cn-molde" disabled={!!salvando}
            onClick={() => void criar(m)}>
            <b>{m.nome}</b>
            <span>{m.serve}</span>
            <i>{salvando === m.id ? 'criando...' : servico({ base_url: m.base_url } as Conector)}</i>
          </button>
        ))}
      </div>
    </div>
  )
}

export function TelaConectores() {
  const { conectores, eu, pessoal, carregando } = useDados()
  const [criando, setCriando] = useState<'casa' | 'minha' | null>(null)

  if (carregando) return <Carregando />

  // O banco já esconde o conector pessoal do colega. Aqui filtro de novo porque o
  // modo demonstração não tem as políticas do banco, e a tela precisa contar a
  // mesma verdade nos dois modos.
  const visiveis = conectores.filter((c) => !c.dono_id || c.dono_id === eu.id)
  const daCasa = visiveis.filter((c) => !c.dono_id)
  const meus = visiveis.filter((c) => c.dono_id === eu.id)
  const admin = eu.papel === 'admin'

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">Os serviços de fora que o Track pode usar</div>
          <h1>Conectores</h1>
        </div>
      </div>

      <div className="card ag-regua">
        <p>
          Você entra na sua conta daquele serviço, copia a chave de API, e cola aqui. Não
          precisa esperar ninguém escrever um conector para ele.
        </p>
        <p>
          <b>A chave entra e não sai.</b> Ela vai cifrada para o banco e abre só no servidor,
          na hora da chamada. Depois de salvar ninguém lê ela de volta: nem esta tela
          {pessoal ? '' : ', nem quem é dono da empresa'}, nem eu. O que aparece são os quatro
          últimos caracteres.
        </p>
        <p className="hint">
          Um detalhe honesto: nos serviços da lista, o caminho e o formato da chamada já vêm
          prontos e a chave basta. Em um serviço fora da lista, alguém precisa dizer uma vez
          qual caminho chamar e o que mandar, porque uma API comum não conta sozinha o que
          sabe fazer. É uma linha de configuração, uma vez por conector, e fica no agente.
        </p>
        {MODO_LOCAL && (
          <p className="ag-aviso">
            <Ic.pause />
            <span>
              <b>Modo demonstração.</b> Aqui não existe servidor para cifrar nem chamada
              saindo para fora, então a chave não é guardada de verdade: fica só a dica dela,
              para você ver como a tela se comporta.
            </span>
          </p>
        )}
      </div>

      {criando && <Escolher para={criando} fechar={() => setCriando(null)} />}

      {/* Sozinho não existe "da empresa" e "seu": é tudo seu, e duas colunas
          vazias esperando a distinção seriam pergunta sem pergunta. */}
      {pessoal ? (
        <div className="blk">
          <div className="bh">
            <h2>Ligados {visiveis.length ? `(${visiveis.length})` : ''}</h2>
            <button className="btn" onClick={() => setCriando('minha')}><Ic.plus />Ligar serviço</button>
          </div>
          {visiveis.length ? (
            <div className="cn-lista">{visiveis.map((c) => <Cartao key={c.id} c={c} />)}</div>
          ) : (
            <div className="card empty" style={{ padding: 30 }}>
              Nada ligado ainda. Escolha um serviço, cole a chave, e o Track passa a falar com ele.
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="blk">
        <div className="bh">
          <h2>Da empresa {daCasa.length ? `(${daCasa.length})` : ''}</h2>
          {admin
            ? <button className="btn" onClick={() => setCriando('casa')}><Ic.plus />Ligar serviço</button>
            : <span className="c">quem liga serviço da empresa é administrador</span>}
        </div>
        {daCasa.length ? (
          <div className="cn-lista">{daCasa.map((c) => <Cartao key={c.id} c={c} />)}</div>
        ) : (
          <div className="card empty" style={{ padding: 30 }}>
            Nenhum serviço da empresa ligado. Estes valem para todo mundo aqui dentro, e é por
            isso que só administrador mexe: um conector fala em nome da empresa.
          </div>
        )}
      </div>

      <div className="blk">
        <div className="bh">
          <h2>Seus {meus.length ? `(${meus.length})` : ''}</h2>
          <button className="btn" onClick={() => setCriando('minha')}><Ic.plus />Ligar serviço</button>
        </div>
        {meus.length ? (
          <div className="cn-lista">{meus.map((c) => <Cartao key={c.id} c={c} />)}</div>
        ) : (
          <div className="card empty" style={{ padding: 30 }}>
            Nada seu ligado ainda. O que você ligar aqui é seu: não aparece para o resto da
            equipe e não depende de ninguém liberar.
          </div>
        )}
      </div>
      </>
      )}
    </>
  )
}
