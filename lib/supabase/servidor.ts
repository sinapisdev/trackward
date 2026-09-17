import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente para server components e route handlers. */
export async function clienteServidor() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options))
          } catch {
            // Server component não pode escrever cookie. O middleware já cuida da renovação.
          }
        },
      },
    },
  )
}
