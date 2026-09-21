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
