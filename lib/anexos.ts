/**
 * Preparo do arquivo antes de subir.
 *
 * Foto de celular hoje vem com 4 ou 5 MB e uns 4000 pixels de largura. Ninguém
 * precisa disso para ler um comprovante: o que se quer é enxergar o número e a
 * assinatura. Encolher antes de subir deixa o anexo rápido de abrir no celular
 * do cliente e barato de guardar, e é o mesmo motivo nos dois casos.
 *
 * PDF, planilha e o que não for imagem passam intactos: cortar qualidade ali
 * seria estragar o documento.
 */

export const LIMITE = 10 * 1024 * 1024
const LADO_MAXIMO = 2000
const QUALIDADE = 0.85

export const ehImagem = (tipo: string) => tipo.startsWith('image/')

/** Tamanho em palavra de gente: "820 KB", "2,4 MB". */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/**
 * Encolhe a imagem se ela for maior que o necessário. Devolve o arquivo original
 * quando não é imagem, quando já é pequena, ou quando o navegador não deu conta:
 * subir a foto grande é sempre melhor do que não subir nada.
 */
export async function preparar(arquivo: File): Promise<File> {
  if (!ehImagem(arquivo.type) || arquivo.type === 'image/gif') return arquivo
  try {
    const bitmap = await createImageBitmap(arquivo)
    const maior = Math.max(bitmap.width, bitmap.height)
    if (maior <= LADO_MAXIMO && arquivo.size <= 1024 * 1024) { bitmap.close(); return arquivo }

    const escala = Math.min(1, LADO_MAXIMO / maior)
    const tela = document.createElement('canvas')
    tela.width = Math.round(bitmap.width * escala)
    tela.height = Math.round(bitmap.height * escala)
    const pincel = tela.getContext('2d')
    if (!pincel) { bitmap.close(); return arquivo }
    pincel.drawImage(bitmap, 0, 0, tela.width, tela.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>(
      (ok) => tela.toBlob(ok, 'image/jpeg', QUALIDADE),
    )
    if (!blob || blob.size >= arquivo.size) return arquivo

    const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg', lastModified: arquivo.lastModified })
  } catch {
    return arquivo
  }
}

/** Nome de arquivo seguro para virar endereço: sem acento, sem espaço, sem barra. */
export function nomeLimpo(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80) || 'arquivo'
}
