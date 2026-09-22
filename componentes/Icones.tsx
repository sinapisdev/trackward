/** Ícones do protótipo, pequenos e de traço fino, sem nenhum emoji. */
export const Ic = {
  painel: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  inbox: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 9.5 3.6 3.6A1 1 0 0 1 4.6 3h6.8a1 1 0 0 1 1 .6L14 9.5V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 9.5h3.2l.8 1.5h4l.8-1.5H14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  proj: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 7h8.5M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ciclo: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 5.5A4.8 4.8 0 0 0 2.6 4.8M2.5 8.5a4.8 4.8 0 0 0 8.9.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.8 2.3v3.3H8.5M2.2 11.7V8.4h3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: ({ n = 10 }: { n?: number } = {}) => (
    <svg width={n} height={n} viewBox="0 0 10 10" fill="none">
      <path d="m2 5.2 2 2L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chev: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="m4 5.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  up: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="m4 8.5 3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  pause: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 4.8v4.4M8.5 4.8v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  flag: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 12.5V2m0 .5h7.5L9 5l1.5 2.5H3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lock: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  x: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="m3.5 3.5 7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  edit: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2.5 11.5 4.5 5 11l-2.5.5L3 9l6.5-6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  team: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 12a3.5 3.5 0 0 1 7 0M8.5 9.2A3 3 0 0 1 12.8 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  dot: () => (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
    </svg>
  ),
  processo: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="4" r="1.9" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="12" r="1.9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 6v4M7 4h5M7 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  copiar: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4.6" y="4.6" width="7.4" height="7.4" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.4 4.6V3.6A1.6 1.6 0 0 0 7.8 2H3.6A1.6 1.6 0 0 0 2 3.6v4.2A1.6 1.6 0 0 0 3.6 9.4h1"
        stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  mais: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="3.4" cy="8" r="1.3" fill="currentColor" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <circle cx="12.6" cy="8" r="1.3" fill="currentColor" />
    </svg>
  ),
  agenda: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.2" width="12" height="10.8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.6h12M5.4 2v2.4M10.6 2v2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  espera: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 4.2V7l2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  oculto: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 7s1.9-3.2 5-3.2S12 7 12 7s-1.9 3.2-5 3.2S2 7 2 7Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="m2.2 11.8 9.6-9.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  trava: () => (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M5.8 8.2 3.9 10a2.4 2.4 0 1 1-3.4-3.4l1.9-1.9M8.2 5.8 10.1 4a2.4 2.4 0 1 1 3.4 3.4l-1.9 1.9"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform="translate(0,0)" />
      <path d="M5.2 8.8 8.8 5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  ajustes: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6 3.5 3.5"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  /**
   * Trilha: dois checkpoints fechados e o de agora ainda aberto.
   *
   * Os traços seguem a cor do texto, então ficam pretos no tema claro e brancos
   * no escuro sozinhos. O anel é a única peça com cor própria, porque é a que
   * representa o que ainda pede ação. Ele usa a tinta do acento, e não o lima
   * cheio, senão some sobre o fundo claro. Sem fundo e sem moldura: o logo oficial,
   * com o quadrado preto, mora só no ícone do aplicativo.
   */
  sino: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6.6a4 4 0 0 1 8 0c0 2.5.6 3.6 1.2 4.2.3.3.1.8-.3.8H3.1c-.4 0-.6-.5-.3-.8C3.4 10.2 4 9.1 4 6.6Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.6 13.2a1.6 1.6 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  olho: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  olhoOff: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.6 5.4C1.9 6.3 1.5 8 1.5 8s2.4 4 6.5 4c1 0 1.9-.24 2.7-.6M6.2 4.2A7 7 0 0 1 8 4c4.1 0 6.5 4 6.5 4s-.7 1.15-1.9 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  carta: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.8" y="3.5" width="12.4" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="m2.4 4.6 5.6 4 5.6-4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  logo: () => (
    <svg width="38" height="11" viewBox="0 0 32 9" fill="none" aria-hidden="true">
      <rect x="0.5" y="2.5" width="8" height="4" rx="2" fill="currentColor" />
      <rect x="11" y="2.5" width="8" height="4" rx="2" fill="currentColor" />
      <circle cx="27" cy="4.5" r="3.3" fill="none" stroke="var(--ac-tinta)" strokeWidth="2.6" />
    </svg>
  ),
  sol: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 1v1.6M7 11.4V13M13 7h-1.6M2.6 7H1M11.2 2.8l-1.1 1.1M3.9 10.1l-1.1 1.1M11.2 11.2l-1.1-1.1M3.9 3.9 2.8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  lua: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11.8 8.6A5.2 5.2 0 0 1 5.4 2.2a5.2 5.2 0 1 0 6.4 6.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  /** Uma pessoa só, para o espaço pessoal. */
  eu: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5.5" r="2.6" />
      <path d="M3 13.2c.7-2.2 2.6-3.4 5-3.4s4.3 1.2 5 3.4" strokeLinecap="round" />
    </svg>
  ),
  chat: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 9.5a1.5 1.5 0 0 1-1.5 1.5H5.5L3 13.2V4a1.5 1.5 0 0 1 1.5-1.5h7.5A1.5 1.5 0 0 1 13.5 4z"
        strokeLinejoin="round" />
    </svg>
  ),
  /** A leitura da conversa. Uma faísca, não um robô: o app não finge ser gente. */
  faisca: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.8 9.3 5.4 12.9 6.7 9.3 8 8 11.6 6.7 8 3.1 6.7 6.7 5.4z" strokeLinejoin="round" />
      <path d="M12.4 10.6 13 12.2l1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" strokeLinejoin="round" />
    </svg>
  ),
  enviar: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.4 8h11M9 3.6 13.4 8 9 12.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  seta: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.4 8h11M9 3.6 13.4 8 9 12.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  raio: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M9 1.6 3.6 9.2h3.2L7 14.4l5.4-7.6H9.2L9 1.6Z" stroke="currentColor"
        strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  lupa: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="m10.6 10.6 2.6 2.6" strokeLinecap="round" />
    </svg>
  ),
  menos: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.4 8h9.2" strokeLinecap="round" />
    </svg>
  ),
  caber: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.6 6V3.4a.8.8 0 0 1 .8-.8H6M10 2.6h2.6a.8.8 0 0 1 .8.8V6M13.4 10v2.6a.8.8 0 0 1-.8.8H10M6 13.4H3.4a.8.8 0 0 1-.8-.8V10"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clipe: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12.4 7.4 7.9 11.9a2.9 2.9 0 0 1-4.1-4.1l4.9-4.9a1.9 1.9 0 0 1 2.7 2.7l-4.9 4.9a.9.9 0 0 1-1.3-1.3l4.3-4.3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  foto: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="3.4" width="12" height="9.2" rx="1.6" />
      <circle cx="6" cy="6.6" r="1.1" />
      <path d="m3 11.4 3.1-2.9 2.2 2 2-1.7 2.7 2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  devolver: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.6 3.4 3 7l3.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7h5.8A4.2 4.2 0 0 1 13 11.2v1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ressalva: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 5.2v3.4M8 10.7v.1" strokeLinecap="round" />
    </svg>
  ),
  grafico: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2.4 13.4h11.2" strokeLinecap="round" />
      <rect x="3.4" y="8.4" width="2.6" height="4" rx=".8" />
      <rect x="6.9" y="5.2" width="2.6" height="7.2" rx=".8" />
      <rect x="10.4" y="2.6" width="2.6" height="9.8" rx=".8" />
    </svg>
  ),
  microfone: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="1.8" width="4" height="7.4" rx="2" />
      <path d="M3.6 7.4a4.4 4.4 0 0 0 8.8 0M8 11.8v2.4" strokeLinecap="round" />
    </svg>
  ),
  play: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.8 3.2a.7.7 0 0 1 1.06-.61l6.3 4.8a.7.7 0 0 1 0 1.22l-6.3 4.8A.7.7 0 0 1 4.8 12.8V3.2Z" />
    </svg>
  ),
  responder: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.4 3.6 2.6 7.2l3.8 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.6 7.2h6a4.4 4.4 0 0 1 4.4 4.4v.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  volta: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.6 8h-11M7 3.6 2.6 8 7 12.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sair: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.5M9 9.5 11.5 7 9 4.5M11.5 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}
