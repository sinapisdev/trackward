'use client'

import { useMemo, useState } from 'react'
import { useDados } from '@/componentes/Dados'
import { Ic } from '@/componentes/Icones'
import { MINIMO, type Lembranca, type TipoMemoria } from '@/lib/memoria'
import { rel } from '@/lib/datas'
import { isoDe } from '@/lib/datas'

/**
 * O que o Track aprendeu sobre esta empresa, à vista e apagável.
 *
 * Esta tela é a contrapartida de deixar a máquina aprender. Se ela guarda
 * conhecimento sobre a casa e usa isso para propor trabalho, então alguém precisa
 * poder abrir, ler e apagar o que está errado. Memória que não se audita é
 * exatamente o que faz uma empresa desconfiar de IA.
 *
 * Por isso cada linha mostra o trecho que ensinou aquilo. Ninguém tem que
 * acreditar na palavra da máquina: dá para conferir a origem.
 */

const GRUPOS: { tipo: TipoMemoria; nome: string; sobre: string }[] = [
  { tipo: 'termo', nome: 'Palavras da casa',
    sobre: 'A palavra que o time usa, e a frente a que ela se refere. Ninguém escreve o nome completo do projeto numa conversa.' },
  { tipo: 'pessoa', nome: 'Quem costuma pegar o quê',
    sobre: 'Tirado de quem aceitou cada proposta, e principalmente de quando alguém corrigiu a máquina.' },
  { tipo: 'recusa', nome: 'O que não repetir',
    sobre: 'Propostas que a empresa já recusou. É o que impede a leitura de errar a mesma coisa toda semana.' },
]

function Linha({ m }: { m: Lembranca }) {
  const { esquecer, nomeDe } = useDados()
  const [aberto, setAberto] = useState(false)
  const firme = m.peso >= MINIMO

  return (
    <div className={`mem ${firme ? 'firme' : 'fraco'}`}>
      <span className="mem-peso" title={firme
        ? `Confirmado ${m.peso} vezes, já vale`
        : `Visto ${m.peso} de ${MINIMO} vezes, ainda não conta`}>
        {m.peso}
      </span>
      <span className="mem-txt">
        <b>
          {m.tipo === 'pessoa'
            ? <>{m.chave} <span className="seta">→</span> {m.perfil_id ? nomeDe(m.perfil_id) : m.valor}</>
            : m.tipo === 'termo'
              ? <>&quot;{m.chave}&quot; <span className="seta">→</span> {m.valor}</>
              : m.valor}
        </b>
        <small>
          {firme ? 'Em uso' : `Ainda não conta, falta${MINIMO - m.peso === 1 ? '' : 'm'} ${MINIMO - m.peso}`}
          {' · visto '}{rel(isoDe(m.visto_em)).toLowerCase()}
          {!!m.exemplo && (
            <>
              {' · '}
              <button className="mem-ver" onClick={() => setAberto((v) => !v)}>
                {aberto ? 'esconder a origem' : 'de onde veio'}
              </button>
            </>
          )}
        </small>
        {aberto && !!m.exemplo && <span className="mem-exemplo">{m.exemplo}</span>}
      </span>
      <button className="iconbtn" aria-label={`Esquecer ${m.chave}`} title="Esquecer"
        onClick={() => void esquecer(m.id)}><Ic.x /></button>
    </div>
  )
}

export function Memoria() {
  const { memoria } = useDados()
  const [ver, setVer] = useState<TipoMemoria | 'tudo'>('tudo')

  const grupos = useMemo(
    () => GRUPOS.map((g) => ({
      ...g,
      itens: memoria.filter((m) => m.tipo === g.tipo).sort((a, b) => b.peso - a.peso),
    })).filter((g) => g.itens.length),
    [memoria],
  )

  const firmes = memoria.filter((m) => m.peso >= MINIMO).length

  return (
    <div className="blk">
      <div className="bh">
        <h2>O que o Track aprendeu daqui</h2>
        <span className="c">{memoria.length
          ? `${firmes} em uso, ${memoria.length - firmes} ainda juntando confirmação`
          : 'nada ainda'}</span>
      </div>

      <div className="card">
        <p className="mem-regua">
          Aprender aqui <b>não é treinar um modelo</b>: é o app guardar o que a sua empresa
          ensinou e mandar isso junto em cada leitura. Vale desde a primeira correção, e não
          depois de mil exemplos. Nada sai daqui para outra empresa.
          {' '}<b>Uma lição só passa a valer depois de se confirmar {MINIMO} vezes</b>, para
          uma frase solta não virar regra. Se algo estiver errado, esqueça: a leitura para de
          usar na hora.
        </p>

        {!memoria.length ? (
          <div className="empty" style={{ padding: 0 }}>
            Nada aprendido ainda. Isto vai enchendo conforme a equipe conversa e conforme
            alguém aceita ou recusa o que a leitura propõe.
          </div>
        ) : (
          <>
            {grupos.length > 1 && (
              <div className="tpls" style={{ marginBottom: 12 }}>
                <button className={`tpl ${ver === 'tudo' ? 'on' : ''}`} onClick={() => setVer('tudo')}>
                  Tudo
                </button>
                {grupos.map((g) => (
                  <button key={g.tipo} className={`tpl ${ver === g.tipo ? 'on' : ''}`}
                    onClick={() => setVer(g.tipo)}>
                    {g.nome} <span className="num" style={{ marginLeft: 5, opacity: .65 }}>{g.itens.length}</span>
                  </button>
                ))}
              </div>
            )}

            {grupos.filter((g) => ver === 'tudo' || ver === g.tipo).map((g) => (
              <div className="mem-grupo" key={g.tipo}>
                <div className="mem-h">
                  <b>{g.nome}</b>
                  <span>{g.sobre}</span>
                </div>
                {g.itens.map((m) => <Linha key={m.id} m={m} />)}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
