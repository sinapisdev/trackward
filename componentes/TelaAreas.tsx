'use client'

import Link from 'next/link'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Carregando } from './Shell'
import { Ic } from './Icones'
import { IconeStatus } from './atomos'
import { porUrgencia } from './partes'
import { comProblema, etapaAtual, progresso, status } from '@/lib/regras'

/** Panorama das frentes que já funcionam, cada uma com as rotinas dela. */
export function TelaAreas() {
  const { eu, fluxos, areas, carregando } = useDados()
  const { abrir } = useModais()

  if (carregando) return <Carregando />

  const rotinas = fluxos.filter((f) => f.tipo === 'ciclo')
  const problemas = comProblema(rotinas)

  return (
    <>
      <div className="hdr">
        <div>
          <div className="eyebrow">As frentes que já funcionam, e o que se repete em cada uma</div>
          <h1>Áreas</h1>
          <p className="lede">
            {areas.length
              ? <>{areas.length} {areas.length === 1 ? 'área' : 'áreas'} e {rotinas.length}{' '}
                  {rotinas.length === 1 ? 'rotina em ciclo' : 'rotinas em ciclo'}
                  {!!problemas && <>, <b className="l">{problemas} com problema</b></>}.</>
              : 'Nenhuma área ainda.'}
          </p>
        </div>
        {eu.papel === 'admin' && (
          <div className="hdr-actions">
            <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
          </div>
        )}
      </div>

      {!areas.length ? (
        <div className="card">
          <div className="onb">
            <h3>Comece criando uma área</h3>
            <p>
              Áreas são as frentes que já funcionam na empresa: Financeiro, Engenharia, Comercial.
              Cada uma guarda as rotinas que se repetem a cada período.
            </p>
            {eu.papel === 'admin'
              ? <button className="btn pri" onClick={() => abrir({ tipo: 'area' })}><Ic.plus />Nova área</button>
              : <p className="hint">Peça a um administrador para criar as áreas da empresa.</p>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {areas.map((a) => {
            const daArea = fluxos.filter((f) => f.area_id === a.id)
            const rot = daArea.filter((f) => f.tipo === 'ciclo').sort(porUrgencia)
            const proj = daArea.filter((f) => f.tipo === 'esteira' && !f.concluido)
            return (
              <div className="card" key={a.id}>
                <div style={{ padding: '15px 16px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span className="sdot" style={{ background: a.cor }} />
                  <Link href={`/area/${a.id}`} style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-.015em' }}>
                    {a.nome}
                  </Link>
                  <span className="due" style={{ marginLeft: 'auto' }}>
                    {rot.length} {rot.length === 1 ? 'rotina' : 'rotinas'}
                    {!!proj.length && ` · ${proj.length} ${proj.length === 1 ? 'projeto' : 'projetos'}`}
                  </span>
                </div>
                {rot.length ? rot.map((f) => (
                  <Link className="ib" key={f.id} href={`/fluxo/${f.id}`} style={{ gridTemplateColumns: '18px minmax(0,1fr) auto' }}>
                    <IconeStatus st={status(f)} p={progresso(f)} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t">{f.nome}</span>
                      <span className="s">{f.periodo} · {etapaAtual(f)?.nome}</span>
                    </span>
                    <span className="due">{f.freq}</span>
                  </Link>
                )) : (
                  <div className="empty" style={{ paddingTop: 4 }}>
                    Sem rotinas ainda.
                    <button className="btn ghost" onClick={() => abrir({ tipo: 'fluxo', tipoFluxo: 'ciclo', areaId: a.id })}>
                      <Ic.plus />Nova rotina
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
