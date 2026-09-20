export type Tema = 'escuro' | 'claro' | 'sistema'

export const TEMAS: { id: Tema; nome: string; sobre: string; amostra: [string, string, string, string] }[] = [
  { id: 'escuro', nome: 'Escuro', sobre: 'O padrão. Feito para longas horas de tela.',
    amostra: ['#151514', '#F7F7F5', '#F98B05', '#F0645A'] },
  { id: 'claro', nome: 'Claro', sobre: 'Para quem trabalha com muita luz na sala.',
    amostra: ['#FFFFFF', '#111111', '#F98B05', '#D2402F'] },
  { id: 'sistema', nome: 'Automático', sobre: 'Segue a preferência do seu computador.',
    amostra: ['#151514', '#F98B05', '#9B9B94', '#FFFFFF'] },
]

export const CHAVE_TEMA = 'track.tema'

export function temaAtual(): Tema {
  if (typeof document === 'undefined') return 'escuro'
  return (document.documentElement.dataset.tema as Tema) || 'sistema'
}

export function aplicarTema(t: Tema) {
  if (t === 'sistema') delete document.documentElement.dataset.tema
  else document.documentElement.dataset.tema = t
  try { localStorage.setItem(CHAVE_TEMA, t) } catch {}
}
