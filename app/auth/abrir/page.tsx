'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/browser'

/**
 * A última chance do link que chegou por e-mail.
 *
 * O fluxo antigo do Supabase devolve a sessão depois do "#", e o navegador não
 * manda essa parte para o servidor: nenhuma rota consegue ler. Só a tela vê, e
 * é por isso que esta existe mesmo sendo quase vazia.
 */
export default function Abrir() {
  const [erro, setErro] = useState('')

  useEffect(() => {
    const ir = async () => {
      const busca = new URLSearchParams(location.search)
      const proximo = busca.get('proximo') || '/'
      const frag = new URLSearchParams(location.hash.replace(/^#/, ''))

      const erroDele = frag.get('error_description') || frag.get('error')
      if (erroDele) {
        location.replace(`/entrar?erro=link&porque=${/expired/i.test(erroDele) ? 'vencido' : 'recusado'}`)
        return
      }

      const acesso = frag.get('access_token')
      const renovo = frag.get('refresh_token')
      if (acesso && renovo) {
        const { error } = await supabase().auth.setSession({
          access_token: acesso, refresh_token: renovo,
        })
        if (!error) { location.replace(proximo); return }
        setErro(error.message)
        return
      }
      location.replace('/entrar?erro=link&porque=vazio')
    }
    void ir()
  }, [])

  return (
    <div className="auth">
      <div className="auth-card">
        <p className="mode">{erro || 'Abrindo o link...'}</p>
      </div>
    </div>
  )
}
