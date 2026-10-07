'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/browser'
import { falaDeMaquina } from '@/lib/erros'
import { Ic } from './Icones'

/**
 * O que acontece quando alguém abre um link de convite.
 *
 * São dois casos, e o link é um só porque quem convida não tem como saber em
 * qual deles a outra pessoa está:
 *
 * - **sem conta** vai para o cadastro com o código já dentro. Era aqui que a
 *   burocracia morava: a pessoa transcrevia ENG7K2 do WhatsApp para o
 *   navegador, errava uma letra, e concluía que o convite não servia.
 * - **com conta** aceita aqui mesmo, por `entrar_com_convite`, e ganha um
 *   segundo perfil na empresa que a chamou, com o mesmo login. Esse caminho
 *   existia no banco desde sempre e **nada no app o chamava**: o convite
 *   mandado a quem já usa o TrackWard não tinha como ser aceito, porque a tela
 *   de entrar recusa quem está logado e o porteiro jogava o código fora no
 *   caminho.
 *
 * O nome da empresa não aparece antes de aceitar, e isso é de propósito: a
 * política de `convites` é de quem convida, então mostrar a empresa aqui
 * exigiria abrir a tabela a quem tem um código, e código se chuta. Quem vem do
 * WhatsApp já leu o nome na mensagem de quem o chamou, que é de quem ele tem
 * que vir.
 */
export function AbrirConvite({ codigo }: { codigo: string }) {
  const router = useRouter()
  const [estado, setEstado] = useState<'vendo' | 'logado' | 'indo' | 'erro'>('vendo')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const sb = supabase()
    void (async () => {
      // `getUser` e não `getClaims`: esta página abre uma vez, e a troca por
      // conferência local existe para o caminho quente (o porteiro e o layout,
      // a cada navegação). Aqui a ida à rede custa uma vez e vale nos dois
      // modos, inclusive no de demonstração, que não tem assinatura para
      // conferir.
      const { data } = await sb.auth.getUser()
      if (!data.user) {
        // O código viaja no endereço para o cadastro nascer com ele dentro.
        router.replace(`/entrar?c=${encodeURIComponent(codigo)}`)
        return
      }
      setEstado('logado')
    })()
  }, [codigo, router])

  const aceitar = async () => {
    setEstado('indo'); setErro('')
    const { error } = await supabase().rpc('entrar_com_convite', { p_codigo: codigo })
    if (error) {
      // As recusas de `entrar_com_convite` são português escrito para gente
      // ler ("Você já faz parte deste espaço."), e passam inteiras.
      const m = error.message || ''
      setErro(falaDeMaquina(m) ? 'Não foi possível usar este convite agora.' : m)
      setEstado('erro')
      return
    }
    // A função já trocou a sessão para o perfil novo, então a casa que abre é a
    // de quem convidou. O refresh é o que faz o layout reler o perfil.
    router.push('/')
    router.refresh()
  }

  return (
    <div className="cvt">
      <span className="ent-marca"><Ic.logo /><b>TrackWard</b></span>

      {estado === 'vendo' && <p className="cvt-esperando">Conferindo o convite...</p>}

      {(estado === 'logado' || estado === 'indo' || estado === 'erro') && (
        <div className="cvt-card">
          <h1>Você foi convidado para uma equipe</h1>
          <p>
            Aceitando, você passa a ter esse espaço ao lado do que já usa, com o mesmo login.
            O que é seu hoje continua exatamente onde está.
          </p>
          <code className="cvt-codigo">{codigo}</code>
          {!!erro && <div className="erro"><Ic.x />{erro}</div>}
          <button className="btn pri larga" disabled={estado === 'indo'} onClick={() => void aceitar()}>
            {estado === 'indo' ? 'Entrando...' : 'Aceitar o convite'}<Ic.seta />
          </button>
          <button className="cvt-nao" onClick={() => router.push('/')}>Agora não</button>
        </div>
      )}
    </div>
  )
}
