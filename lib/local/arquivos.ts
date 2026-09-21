/**
 * Os arquivos do modo demonstração.
 *
 * No app de verdade o anexo vai para o Storage do Supabase. Aqui ele precisa
 * caber no navegador, e o localStorage não serve: ele guarda texto, tem uns 5 MB
 * no total, e uma foto de celular sozinha já estoura isso.
 *
 * Então os arquivos vão para o IndexedDB, que guarda o binário como ele é e tem
 * espaço de sobra. O resto do app não sabe da diferença: o endereço do arquivo é
 * o mesmo caminho que iria para o balde lá.
 */

const BANCO = 'track.arquivos'
const ARMARIO = 'blobs'

let aberto: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (aberto) return aberto
  aberto = new Promise((ok, erro) => {
    const p = indexedDB.open(BANCO, 1)
    p.onupgradeneeded = () => {
      if (!p.result.objectStoreNames.contains(ARMARIO)) p.result.createObjectStore(ARMARIO)
    }
    p.onsuccess = () => ok(p.result)
    p.onerror = () => erro(p.error)
  })
  return aberto
}

function pedir<T>(fazer: (loja: IDBObjectStore) => IDBRequest, escrita = false): Promise<T> {
  return abrir().then((db) => new Promise<T>((ok, erro) => {
    const t = db.transaction(ARMARIO, escrita ? 'readwrite' : 'readonly')
    const r = fazer(t.objectStore(ARMARIO))
    r.onsuccess = () => ok(r.result as T)
    r.onerror = () => erro(r.error)
  }))
}

export const guardar = (caminho: string, arquivo: Blob) =>
  pedir<void>((loja) => loja.put(arquivo, caminho), true)

export const buscar = (caminho: string) =>
  pedir<Blob | undefined>((loja) => loja.get(caminho))

export const jogarFora = (caminho: string) =>
  pedir<void>((loja) => loja.delete(caminho), true)

/**
 * O arquivo de exemplo, desenhado na hora.
 *
 * A empresa de exemplo tem anexos, senão o indicador "com prova" nasce zerado e
 * ninguém descobre que o app guarda comprovante. Guardar imagens de verdade no
 * repositório só para isso seria peso morto, então o exemplo se desenha: um
 * papel branco com o nome do arquivo. Abre, imprime e não engana ninguém.
 */
function inventar(caminho: string): Blob {
  const nome = decodeURIComponent(caminho.split('/').pop() || 'arquivo')
    .replace(/^\d+-/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
  const escapar = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <rect width="900" height="560" fill="#FBFAF9"/>
  <rect x="48" y="48" width="804" height="464" fill="none" stroke="#E2DFDA" stroke-width="2"/>
  <text x="84" y="132" font-family="Helvetica,Arial,sans-serif" font-size="20"
    letter-spacing="3" fill="#9A958C">ARQUIVO DE EXEMPLO</text>
  <text x="84" y="206" font-family="Helvetica,Arial,sans-serif" font-size="40"
    font-weight="bold" fill="#141414">${escapar(nome)}</text>
  <rect x="84" y="250" width="200" height="4" fill="#FF7A1A"/>
  <text x="84" y="322" font-family="Helvetica,Arial,sans-serif" font-size="19" fill="#6B675F">
    Este papel existe só para a empresa de exemplo ter anexos.</text>
  <text x="84" y="356" font-family="Helvetica,Arial,sans-serif" font-size="19" fill="#6B675F">
    No app ligado ao banco, aqui estaria o arquivo que alguém enviou.</text>
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

/** Busca, e se não achar, desenha. Serve ao exemplo e a quem limpou o navegador. */
export async function buscarOuInventar(caminho: string): Promise<Blob> {
  const achado = await buscar(caminho).catch(() => undefined)
  return achado || inventar(caminho)
}
