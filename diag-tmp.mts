import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
process.env.TRACK_SEGREDO = env.TRACK_SEGREDO
const { decifrar } = await import('./lib/cifra')
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE

// exatamente o que lib/whats.ts faz, com os dados que a organização guarda
const org = (await (await fetch(`${U}/rest/v1/organizacoes?select=whats_conector,whats_sid,whats_de,whats_via&id=eq.8f8c5f43-60e6-4d1d-981f-244aed691060`,
  { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json() as never[])[0] as
  { whats_conector: string; whats_sid: string; whats_de: string; whats_via: string }
const con = (await (await fetch(`${U}/rest/v1/conectores?select=base_url,segredo_cifrado&id=eq.${org.whats_conector}`,
  { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json() as never[])[0] as
  { base_url: string; segredo_cifrado: string }
const tok = decifrar(con.segredo_cifrado)!
console.log('via:', org.whats_via, '| numero:', org.whats_sid, '| base:', con.base_url)

const r = await fetch(`${con.base_url}/${org.whats_sid}/messages`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` },
  body: JSON.stringify({
    messaging_product: 'whatsapp', recipient_type: 'individual',
    to: '554299783288'.replace(/[^0-9]/g, ''), type: 'text',
    text: { preview_url: false, body: 'TrackWard: teste de saída (sem o nono dígito). Se você está lendo isto, o app consegue falar primeiro.' },
  }),
})
console.log('\nresposta da Meta:', r.status)
console.log(JSON.stringify(await r.json().catch(() => null), null, 1))
