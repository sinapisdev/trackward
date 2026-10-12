'use client'

import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { Ic } from './Icones'
import { CampoDuracao, CampoRepeticao } from './CamposDaTarefa'
import type { DetalheDeFora, Pendencia } from '@/lib/tipos'

/**
 * A gaveta de uma tarefa que mora noutro espaço meu.
 *
 * A regra era "a gaveta é só do que é daqui, e a linha de fora leva ao espaço da
 * tarefa", e o motivo era honesto: trilha, critério e as outras tarefas do
 * checkpoint não atravessam pela tabela, então ela abriria pela metade.
 *
 * **Em uso isso virou outra coisa.** Quem abre o pessoal de manhã vê o dia
 * inteiro, de todas as empresas, e tocar numa linha trocava a empresa debaixo
 * dos pés: a lista sumia, a tela recarregava, e para voltar era trocar de novo.
 * Fechar cinco tarefas no fim do dia custava dez trocas de espaço, que é
 * exatamente o que `concluir_meu_item` existiu para evitar.
 *
 * O conserto não afrouxa política nenhuma: dá à gaveta o que faltava para ela
 * abrir inteira (`detalhe_do_item`, seção 81), e a escrita sai por
 * `editar_meu_item`, pelo mesmo caminho de concluir.
 */
export function GavetaDeFora({ p, aoFechar }: { p: Pendencia; aoFechar: () => void }) {
  const { detalheDeFora, editarDeFora, espacos, trocarEspaco } = useDados()
  const [d, setD] = useState<DetalheDeFora | null>(null)
  const [erro, setErro] = useState(false)
  const [texto, setTexto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState('')
  const [minutos, setMinutos] = useState<number | null>(null)
  const [repete, setRepete] = useState<DetalheDeFora['repete']>(null)
  const [indo, setIndo] = useState(false)

  const id = p.tipo === 'item' ? p.item.id : ''

  useEffect(() => {
    let vivo = true
    setD(null); setErro(false)
    if (!id) return
    void detalheDeFora(id).then((x) => {
      if (!vivo) return
      if (!x) { setErro(true); return }
      setD(x)
      setTexto(x.texto); setDescricao(x.descricao || '')
      setPrazo(x.prazo || ''); setMinutos(x.minutos); setRepete(x.repete)
    })
    return () => { vivo = false }
  }, [id, detalheDeFora])

  /** A porta para o espaço dela, que agora é escolha e não o único caminho. */
  const abrirLa = async () => {
    if (!d) return
    const espaco = espacos.find((e) => e.org_id === d.org_id)
    if (!espaco) return
    await trocarEspaco(espaco.perfil_id)
    window.location.href = d.implicita ? '/minhas' : `/fluxo/${d.fluxo_id}`
  }

  const salvar = async () => {
    if (!d || !texto.trim()) return
    setIndo(true)
    await editarDeFora({ item_id: d.item_id, texto, descricao, prazo, minutos, repete })
    setIndo(false)
  }

  return (
    <aside className="gaveta">
      <div className="gav-h">
        <span className="fila-tag">{p.fora}</span>
        <button className="iconbtn" aria-label="Fechar" onClick={aoFechar}><Ic.x /></button>
      </div>

      {erro && (
        <p className="hint">
          Não deu para abrir esta tarefa daqui. Ela continua inteira no espaço dela.
        </p>
      )}
      {!d && !erro && <p className="hint">Abrindo...</p>}

      {!!d && (
        <>
          {/* Onde ela mora, e isto é o que a gaveta sempre mostrou: a track, o
              checkpoint e o critério de saída. Sem eles ela abria pela metade,
              que era o argumento inteiro de mandar a pessoa para o outro espaço. */}
          <p className="gav-onde">
            <b>{d.track}</b>
            {!d.implicita && <> · {d.checkpoint}</>}
          </p>
          {!!d.criterio && <p className="hint gav-criterio">Para sair: {d.criterio}</p>}

          <div className="fld">
            <label htmlFor="gf-t">A tarefa</label>
            <input className="inp" id="gf-t" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>

          <div className="fld">
            <label htmlFor="gf-d">Descrição</label>
            <textarea className="inp" id="gf-d" rows={2} value={descricao}
              onChange={(e) => setDescricao(e.target.value)} />
          </div>

          {/* O prazo obedece ao BANCO e não a este campo: quem não responde pelo
              processo daquela casa manda o que quiser aqui que o gatilho devolve
              o antigo. Desabilitar é só dizer a verdade antes. */}
          <div className="fld">
            <label htmlFor="gf-p">Prazo</label>
            <input className="inp" id="gf-p" type="date" value={prazo} disabled={!d.manda}
              onChange={(e) => setPrazo(e.target.value)} />
            {!d.manda && (
              <p className="hint">Prazo é compromisso com quem espera. Só quem responde pelo processo muda.</p>
            )}
          </div>

          <CampoDuracao minutos={minutos} aoMudar={setMinutos} />
          <CampoRepeticao repete={repete} aoMudar={setRepete} />

          {!!d.irmas.length && (
            <div className="fld">
              <label>As outras deste checkpoint</label>
              <ul className="gav-irmas">
                {d.irmas.map((x, k) => (
                  <li key={k} className={x.feito ? 'feita' : ''}>
                    {x.feito ? <Ic.check /> : <Ic.dot />}{x.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="row-inline gav-pe">
            <button className="btn" disabled={indo || !texto.trim()} onClick={() => void salvar()}>
              {indo ? 'Salvando...' : 'Salvar'}
            </button>
            {/* A porta para o espaço dela continua existindo, e agora é ESCOLHA.
                O que ela dá a mais é a conversa da track, os anexos e a trilha
                inteira, que não cabem aqui e não deveriam caber. */}
            <button className="btn ghost" onClick={() => void abrirLa()}>
              <Ic.seta />Abrir em {d.espaco}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
