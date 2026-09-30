'use client'

import { useEffect, useState } from 'react'
import { useDados } from './Dados'
import { useCelular } from './partes'
import { Ic } from './Icones'
import { pareceEmail } from '@/lib/nomes'

const RECUSOU = 'track.instalar.nao'

type Convite = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Já está instalado? Aí não há o que oferecer. */
function instalado() {
  try {
    return matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true
  } catch { return false }
}

/**
 * Convida a instalar na tela do celular, e ensina o caminho no iPhone.
 *
 * Instalado, o TrackWard abre em tela cheia, com ícone, sem a barra do
 * navegador, e passa a receber aviso mesmo fechado. É o mesmo app: muda a
 * moldura e muda o que o telefone deixa ele encostar.
 *
 * **O iPhone é o motivo deste componente existir.** No Android o Chrome oferece
 * sozinho, e bastaria não atrapalhar. No iPhone não existe evento nenhum: o
 * caminho é Compartilhar, rolar a lista e achar "Adicionar à Tela de Início", e
 * **ninguém descobre isso sozinho**. Pior, só funciona no Safari: quem está no
 * Chrome do iPhone não tem a opção, e fica tentando o caminho certo no lugar
 * errado. Dizer isso em duas linhas é a diferença entre o app ser instalado e
 * não ser.
 *
 * Aparece uma vez e sai por qualquer porta. Quem disse não, não é perguntado de
 * novo: a porta fica em Ajustes, que é onde se procura o que se recusou antes.
 * Tarja que volta toda semana é tarja que se aprende a ignorar.
 */
/**
 * O convite do navegador, quando ele existe.
 *
 * Mora num gancho porque duas telas precisam dele: o convite que aparece uma
 * vez e a porta permanente em Ajustes. Duas cópias do mesmo ouvinte seriam duas
 * chances de uma delas nunca disparar.
 */
export function useConviteDeInstalar() {
  const [convite, setConvite] = useState<Convite | null>(null)
  const [jaEsta, setJaEsta] = useState(false)

  useEffect(() => {
    setJaEsta(instalado())
    const pegar = (e: Event) => { e.preventDefault(); setConvite(e as Convite) }
    const foi = () => { setConvite(null); setJaEsta(true) }
    window.addEventListener('beforeinstallprompt', pegar)
    window.addEventListener('appinstalled', foi)
    return () => {
      window.removeEventListener('beforeinstallprompt', pegar)
      window.removeEventListener('appinstalled', foi)
    }
  }, [])

  return { convite, jaEsta }
}

export function Instalar() {
  const { eu } = useDados()
  const celular = useCelular()
  const { convite } = useConviteDeInstalar()
  const [aberto, setAberto] = useState(false)
  const [indo, setIndo] = useState(false)

  /**
   * O service worker sobe aqui, e não só quando alguém liga o aviso.
   *
   * Ele é o que recebe o push com o app fechado, e o que faz o Chrome
   * considerar o app instalável. Registrado só dentro do fluxo de push, um app
   * instalado sem push ficava sem trabalhador nenhum, e o convite para instalar
   * nunca aparecia.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falhar aqui não pode atrapalhar nada: sem worker o app inteiro
      // continua funcionando, só não recebe aviso fechado.
    })
  }, [])

  /**
   * Uma coisa de cada vez, e instalar é a última das três.
   *
   * Quem chega pela primeira vez tem o tutorial apontando para a tela e, se
   * entrou sem nome, a pergunta do nome. O convite de instalar por cima disso
   * é o que apareceu no primeiro teste: dois cartões empilhados, o de baixo
   * ilegível, e a pessoa fechando os dois sem ler nenhum.
   *
   * Então ele espera as outras duas. `tutoriais` guarda o que já rodou, e o
   * `inicio` é o primeiro de todos: quem já passou por ele não está mais na
   * primeira vez, e é a quem vale oferecer.
   */
  useEffect(() => {
    if (!celular || instalado()) return
    try { if (localStorage.getItem(RECUSOU) === 'sim') return } catch {}
    if (!eu.id || !eu.nome?.trim() || pareceEmail(eu.nome)) return
    if (!(eu.tutoriais || []).includes('inicio')) return
    const t = setTimeout(() => setAberto(true), 4000)
    return () => clearTimeout(t)
  }, [celular, eu.id, eu.nome, (eu.tutoriais || []).join(',')])

  if (!aberto) return null

  const naoAgora = () => {
    try { localStorage.setItem(RECUSOU, 'sim') } catch {}
    setAberto(false)
  }

  const instalar = async () => {
    if (!convite) return
    setIndo(true)
    await convite.prompt().catch(() => {})
    setAberto(false)
  }

  // Sem `beforeinstallprompt` quem manda é o caminho na mão, que é o do iPhone.
  const naMao = !convite

  return (
    <div className="ov">
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="inst">
        <div className="dlg-h">
          <h3 id="inst">Deixa o TrackWard na sua tela</h3>
        </div>
        <div className="dlg-c">
          <p className="mode" style={{ marginTop: 0 }}>
            Instalado, ele abre direto, em tela cheia, e <b>avisa você mesmo fechado</b>. É o
            mesmo app, sem a barra do navegador em cima.
          </p>
          {naMao && <ComoNoIphone />}
        </div>
        <div className="dlg-p">
          <button className="btn" onClick={naoAgora}>{naMao ? 'Entendi' : 'Agora não'}</button>
          {!naMao && (
            <button className="btn pri" disabled={indo} onClick={() => void instalar()}>
              <Ic.check />Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * O caminho no iPhone, escrito porque não existe botão.
 *
 * O aviso do Safari não é frescura: no Chrome do iPhone a opção simplesmente
 * não existe, e quem tenta ali conclui que o app não dá para instalar.
 */
export function ComoNoIphone() {
  const outroNavegador = /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !/safari/i.test(navigator.userAgent.replace(/crios|fxios|edgios/gi, ''))

  return (
    <div className="fld" style={{ marginTop: 12 }}>
      <span className="lbl">No iPhone, o caminho é este</span>
      <p className="hint" style={{ marginTop: 0 }}>
        1. Toque no botão de <b>compartilhar</b>, o quadrado com a seta para cima, na barra
        de baixo.
      </p>
      <p className="hint">2. Role a lista e toque em <b>Adicionar à Tela de Início</b>.</p>
      <p className="hint">3. Toque em <b>Adicionar</b>, no canto de cima.</p>
      {outroNavegador && (
        <p className="hint" style={{ marginTop: 10 }}>
          <b>Só funciona no Safari.</b> Neste navegador a opção não aparece, e não é você
          que não está achando. Abra <b>trackward.app</b> no Safari e refaça os três passos.
        </p>
      )}
    </div>
  )
}
