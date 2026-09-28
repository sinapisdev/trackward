'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/browser'
import { useDados } from './Dados'
import { Ic } from './Icones'

/**
 * O raio-X, na tela.
 *
 * O motor mora em `lib/raiox.ts` e o pulso o roda uma vez por mês, guardando o
 * que achou (seção 48). Aqui é onde ele vira decisão.
 *
 * **O custo em dias vem primeiro, e grande.** Não é enfeite: é o número que faz
 * alguém parar e ler. Uma porcentagem no lugar dele ("34% de retrabalho") não
 * diz de quanto, sobre o quê, nem o que fazer, e por isso não vira ação.
 *
 * **Não há botão que conserte sozinho.** O achado fala de um checkpoint que se
 * repete em muitas tracks, e tirar um checkpoint de todas elas é decisão de
 * quem responde pelo processo, não do app. O que existe é o diagnóstico, a
 * frase do que fazer, e as duas portas de saída: resolvi, ou deixa pra lá.
 *
 * **O que foi respondido não volta.** Repetir todo mês o que a pessoa já disse
 * que não vai mexer é o jeito mais rápido de ela parar de ler o resto.
 */

type Achado = {
  id: string
  chave: string
  alvo: string
  dias: number
  amostra: number
  texto: string
  conserto: string
  estado: 'novo' | 'visto' | 'resolvido' | 'ignorado'
}

export function RaioX() {
  const { eu, toast } = useDados()
  const sb = supabase()
  const [achados, setAchados] = useState<Achado[]>([])
  const [ocupado, setOcupado] = useState('')

  // O raio-X é de quem responde pela operação, e a política do banco diz o
  // mesmo. Mostrar a seção vazia para quem não pode ler seria prometer.
  const podeVer = eu.papel === 'admin' || eu.papel === 'gestor'

  const buscar = useCallback(async () => {
    const { data } = await sb.from('raiox_achados').select('*')
      .in('estado', ['novo', 'visto']).order('dias', { ascending: false })
    setAchados((data || []) as Achado[])
  }, [sb])

  useEffect(() => { if (podeVer) void buscar() }, [podeVer, buscar])

  const responder = async (a: Achado, estado: 'resolvido' | 'ignorado') => {
    setOcupado(a.id)
    const { error } = await sb.rpc('responder_achado', { p_id: a.id, p_estado: estado })
    setOcupado('')
    if (error) return toast(error.message, true)
    await buscar()
  }

  if (!podeVer || !achados.length) return null

  return (
    <section className="rel-sec">
      <div className="rel-h">
        <h2>O que está custando dias</h2>
        <span>{achados.length} {achados.length === 1 ? 'achado' : 'achados'}</span>
      </div>

      <div className="rx">
        {achados.map((a) => (
          <article className="rx-a" key={a.id}>
            <div className="rx-custo">
              <b>{String(a.dias).replace('.', ',')}</b>
              <span>dias</span>
            </div>
            <div className="rx-t">
              <p>{a.texto}</p>
              <em>De {a.amostra} passagens por este checkpoint.</em>
            </div>
            <div className="rx-f">
              <span className="rx-conserto"><Ic.faisca />{a.conserto}</span>
              <button type="button" className="btn sm" disabled={ocupado === a.id}
                onClick={() => responder(a, 'resolvido')}>Resolvi</button>
              <button type="button" className="btn ghost sm" disabled={ocupado === a.id}
                onClick={() => responder(a, 'ignorado')}>Deixa pra lá</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
