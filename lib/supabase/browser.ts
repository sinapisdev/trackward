'use client'
import { createBrowserClient } from '@supabase/ssr'
import { MODO_LOCAL } from '@/lib/modo'
import { clienteLocal } from '@/lib/local/cliente'

type ClienteApp = ReturnType<typeof clienteLocal>

let cliente: ClienteApp | null = null

/**
 * Único lugar que decide onde os dados vivem.
 * Sem Supabase no .env.local, o app roda em modo demonstração, com tudo no navegador.
 */
export function supabase(): ClienteApp {
  if (MODO_LOCAL) return clienteLocal()
  if (!cliente) {
    cliente = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ) as unknown as ClienteApp
  }
  return cliente
}
