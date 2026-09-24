'use client'

import { useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { pareceEmail, sugerirNome } from '@/lib/nomes'

const ADIADO = 'track.nome.depois'

/**
 * Pergunta o nome de quem entrou sem um.
 *
 * O perfil pode nascer com o e-mail no lugar do nome, por convite antigo ou por
 * cadastro anterior a este formulário, e aí o app passa a chamar a pessoa pelo
 * endereço dela: "Boa tarde, fulano@gmail.com". Pior, é esse endereço que
 * aparece nas tarefas e nas aprovações para o resto da equipe.
 *
 * Perguntar é melhor que adivinhar, e aparecer uma vez é melhor que uma tarja
 * eterna: dá para adiar, e aí ele volta na próxima vez que o app abrir. O nome
 * é da pessoa, e ela pode simplesmente não querer agora.
 */
export function PedeNome() {
  const { eu, salvarPerfil } = useDados()
  const [nome, setNome] = useState(() => sugerirNome(eu.email || eu.nome))
  const [indo, setIndo] = useState(false)
  const [adiado, setAdiado] = useState(() => {
    try { return sessionStorage.getItem(ADIADO) === 'sim' } catch { return false }
  })

  const falta = !!eu.id && (!eu.nome?.trim() || pareceEmail(eu.nome))
  if (!falta || adiado) return null

  const salvar = async () => {
    const t = nome.trim()
    if (!t) return
    setIndo(true)
    await salvarPerfil(eu.id, { nome: t })
    setIndo(false)
  }

  const depois = () => {
    try { sessionStorage.setItem(ADIADO, 'sim') } catch {}
    setAdiado(true)
  }

  return (
    <div className="ov">
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="pn">
        <div className="dlg-h">
          <h3 id="pn">Como você quer ser chamado?</h3>
        </div>
        <div className="dlg-c">
          <p className="mode" style={{ marginTop: 0 }}>
            Hoje o app está te chamando de <b>{eu.nome}</b>, que é o seu e-mail. É esse nome
            que a equipe vê nas tarefas, nas aprovações e na atividade.
          </p>
          <div className="fld">
            <label htmlFor="pn-nome">Seu nome</label>
            <input className="inp" id="pn-nome" value={nome} autoFocus
              placeholder="Como as pessoas te chamam"
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void salvar() }} />
            <p className="hint">Pode ser só o primeiro nome. Dá para mudar depois, em Equipe.</p>
          </div>
        </div>
        <div className="dlg-p">
          <button className="btn" onClick={depois}>Agora não</button>
          <button className="btn pri" disabled={!nome.trim() || indo} onClick={() => void salvar()}>
            <Ic.check />Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
