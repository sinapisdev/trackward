'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDados } from './Dados'
import { useModais } from './Modais'
import { Ic } from './Icones'
import { pendencias } from '@/lib/regras'
import { hojeIso } from '@/lib/datas'

/**
 * Navegação de celular: barra de abas no rodapé, como em app.
 * Aparece só em tela estreita; no desktop quem manda é a barra de cima.
 *
 * São QUATRO lugares, e nenhum deles é "Mais". O sexto botão de uma barra de
 * cinco é sempre o balaio, e balaio no rodapé rouba um quinto da largura para
 * guardar o que ninguém abre todo dia. O balaio subiu para a bolinha do seu
 * perfil, lá em cima, que é onde já moravam tema, ajustes e sair: são todas a
 * mesma pergunta, "o que mais tem aqui", e agora têm um botão só.
 */
export function TabBar() {
  const { eu, fluxos, agenda, canais, naoLidas, pode } = useDados()
  const { abrir } = useModais()
  const caminho = usePathname()

  const minhas = pendencias(fluxos, eu.id).length
  const hoje = agenda.filter(
    (c) => c.quando === hojeIso() && [c.dono_id, ...c.convidados].includes(eu.id),
  ).length
  const porLer = canais.reduce((n, c) => n + naoLidas(c.id), 0)

  /** @param tambem outros começos de caminho que acendem esta aba. */
  const Aba = ({ href, icone, rotulo, conta, quente, tambem, tut }: {
    href: string; icone: React.ReactNode; rotulo: string; conta?: number; quente?: boolean
    tambem?: string
    /** Onde o tutorial da primeira vez aponta. Ver lib/tutorial.ts. */
    tut?: string
  }) => (
    <Link className={`aba ${caminho === href || (href !== '/' && caminho.startsWith(href))
      || (tambem && caminho.startsWith(tambem)) ? 'on' : ''}`} href={href} data-tut={tut}>
      <span className="ic">
        {icone}
        {!!conta && <i className={`selo ${quente ? 'hot' : ''}`}>{conta > 9 ? '9+' : conta}</i>}
      </span>
      <span>{rotulo}</span>
    </Link>
  )

  return (
    <>
      <nav className="tabbar" aria-label="Navegação">
        {/* A inicial é a lista de conversas, e entrar numa delas leva para
            /chat/<id>: a aba continua acesa, senão a pessoa fica sem saber
            onde está no exato momento em que ela está no lugar principal. */}
        {pode.canais
          ? <Aba href="/" icone={<Ic.chat />} rotulo="Conversa" conta={porLer} quente tambem="/chat"
              tut="tab-conversa" />
          /* Sozinho a inicial é o caderno, que é a mesma lista com outro
             conteúdo. A aba segue sendo a primeira e segue apontando para a
             raiz: quem trocou de espaço não deve ter que reaprender onde fica
             o que ele abre o dia inteiro. */
          : <Aba href="/" icone={<Ic.edit />} rotulo="Notas" tambem="/notas" tut="tab-notas" />}
        <Aba href="/minhas" icone={<Ic.inbox />} rotulo="Trabalho" conta={minhas} tut="tab-trabalho" />
        <Aba href="/tracks" icone={<Ic.proj />} rotulo="Tracks" tut="tab-tracks" />
        <Aba href="/agenda" icone={<Ic.agenda />} rotulo="Agenda" conta={hoje} tut="tab-agenda" />
      </nav>

      {/* Ação principal flutuante, como em app de celular.
          Some só DENTRO de uma conversa, onde ele ficaria em cima do campo de
          escrever. Na lista ele é o botão de conversa nova, como em qualquer
          app de mensagem. */}
      {/* Na inicial do espaço pessoal quem cria é o "+" do caderno, que já está
          na tela: duas ações de criar na mesma tela é uma a mais. */}
      {!caminho.startsWith('/chat/') && (pode.canais || caminho !== '/') && (
        <button className="fab" aria-label="Criar"
          onClick={() => abrir(
            // A inicial do celular é a lista de conversas, então ali o que se
            // cria é canal.
            (caminho === '/' || caminho === '/chat') && pode.canais ? { tipo: 'canal' }
              : caminho === '/agenda' ? { tipo: 'compromisso', quando: hojeIso() }
                // Na sua fila o que se cria é tarefa. Objetivo e rotina são
                // decisão, e decisão se toma em Tracks: o botão redondo é da
                // operação do dia, e abrir formulário de objetivo ali era
                // oferecer a coisa errada no lugar certo.
                : caminho === '/minhas' ? { tipo: 'avulsa' }
                  : { tipo: 'fluxo', tipoFluxo: 'esteira' })}>
          <Ic.plus />
        </button>
      )}
    </>
  )
}
