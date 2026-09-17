/**
 * Modo demonstração: sem Supabase configurado, o app roda sozinho com os dados
 * guardados no navegador. Basta preencher o .env.local para voltar ao banco real.
 */
export const MODO_LOCAL =
  process.env.NEXT_PUBLIC_MODO === 'local' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
