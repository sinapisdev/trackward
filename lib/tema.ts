export type Tema = 'escuro' | 'claro' | 'sistema'

export const TEMAS: { id: Tema; nome: string; sobre: string; amostra: [string, string, string, string] }[] = [
  { id: 'escuro', nome: 'Escuro', sobre: 'O padrão, e o tema que o design system especifica.',
    amostra: ['#0A0B0A', '#FFFFFF', '#D0FA3C', '#FF5A5A'] },
  { id: 'claro', nome: 'Claro', sobre: 'Para quem trabalha com muita luz na sala.',
    amostra: ['#FAFAF8', '#0A0B0A', '#D0FA3C', '#D2402F'] },
  { id: 'sistema', nome: 'Automático', sobre: 'Segue a preferência do seu computador.',
    amostra: ['#0A0B0A', '#D0FA3C', '#9EA2A4', '#FFFFFF'] },
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
