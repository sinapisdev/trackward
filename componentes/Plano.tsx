'use client'

import { useDados } from './Dados'
import { Ic } from './Icones'

/**
 * A faixa do plano, no alto de tudo.
 *
 * Ela só aparece quando há o que dizer, e são dois casos: o teste chegando ao
 * fim e o modo reduzido. Faixa permanente dizendo "você está no plano tal" é
 * moldura que ninguém lê depois do segundo dia, e ocupa a linha mais cara da
 * tela em toda tela.
 *
 * O aviso do teste começa a três dias do fim, e não no primeiro: avisar cedo
 * demais ensina a ignorar. No modo reduzido ela não some nunca, porque ali ela
 * é a única explicação para o app ter parado de deixar criar coisas.
 */
export function FaixaDoPlano() {
  const { plano, diasDeTeste, org } = useDados()

  if (plano.id === 'reduzido') {
    return (
      <div className="pl-faixa acabou" role="status">
        <Ic.lock />
        <span>
          <b>O teste acabou.</b> Tudo continua aqui e dá para ler e terminar o que já começou.
          Para voltar a criar, fale com o TrackWard.
        </span>
      </div>
    )
  }

  if (plano.id === 'teste' && diasDeTeste <= 3) {
    return (
      <div className="pl-faixa" role="status">
        <Ic.espera />
        <span>
          {diasDeTeste <= 0
            ? <><b>Hoje é o último dia do teste</b> de {org.nome}.</>
            : <><b>{diasDeTeste} {diasDeTeste === 1 ? 'dia' : 'dias'}</b> de teste em {org.nome}.</>}
          {' '}Depois disso, dá para ler e terminar o que já começou, e não para criar coisa nova.
        </span>
      </div>
    )
  }

  return null
}
