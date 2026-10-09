import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * A versão que ESTE pacote de JavaScript tem, para a aba saber que envelheceu.
   *
   * O app é uma página só: o servidor atualiza no instante do deploy e a aba
   * continua rodando o código do dia em que foi aberta. Isso virou um problema
   * de verdade em 09/10/2026: o conserto do secretário saiu, a aba aberta
   * desde a véspera seguiu com o código velho, e o defeito "continuou"
   * acontecendo por um motivo que não tinha mais nada a ver com o defeito.
   *
   * Com isto a resposta do servidor carrega a versão dele, a tela compara com a
   * sua e avisa. Em desenvolvimento é 'dev' dos dois lados, e nada aparece.
   */
  env: { NEXT_PUBLIC_VERSAO: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev' },
  // Tira o selo do Next do canto da tela, que cobria o rodapé da lateral.
  devIndicators: false,
  // Endereços de onde o app pode ser aberto durante o desenvolvimento, para
  // abrir do celular na mesma rede. A faixa inteira entra porque o IP muda toda
  // vez que se troca de Wi-Fi, e ficar caçando o número não ajuda ninguém.
  allowedDevOrigins: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '*.local'],
}

/**
 * Os cabeçalhos de segurança, que não existiam.
 *
 * Nenhum deles conserta um buraco: eles encurtam o estrago de um buraco futuro,
 * e é por isso que se escrevem antes de precisar. Três valem a pena explicar:
 *
 * `Referrer-Policy` é o único que fecha um vazamento REAL de hoje. A página de
 * feedback é `/feedback/<token>`, e o token É a credencial: sem esta linha, o
 * navegador manda o endereço inteiro no cabeçalho `Referer` de qualquer coisa
 * que aquela página alcance por fora, e a credencial de um cliente que nunca
 * teve conta aqui aparece no log de outra pessoa. `no-referrer` é o certo
 * porque nada neste app precisa dizer de onde veio.
 *
 * `frame-ancestors` (e o `X-Frame-Options` para navegador velho) impede que o
 * app seja aberto dentro de um quadro de outro site. Sem isso, um site qualquer
 * enquadra o TrackWard invisível e põe o botão dele por cima do "Aprovar
 * saída": a pessoa está logada, clica achando que clicou em outra coisa, e
 * aprova. O ataque tem nome, é velho, e a defesa é uma linha.
 *
 * `connect-src` é o que mais vale na política, e é preciso dizer por quê: o
 * `script-src` continua com `unsafe-inline`, porque o Next escreve script
 * embutido na página e a troca por `nonce` mexe no proxy e no layout. Com
 * `unsafe-inline`, um XSS ainda executa. O que ele deixa de conseguir é MANDAR
 * o que leu para fora, porque o navegador só deixa o app falar consigo mesmo e
 * com o Supabase. É menos do que o ideal e é muito mais do que nada, e o nonce
 * fica escrito aqui como o passo seguinte.
 *
 * A fonte é `next/font`, que a serve do próprio domínio: por isso não há
 * endereço do Google nesta lista, e acrescentar um seria abrir a porta de novo.
 */
const API = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${API} ${API.replace(/^https/, 'wss')}`.trim(),
].join('; ')

const CABECALHOS = [
  { key: 'content-security-policy', value: CSP },
  { key: 'referrer-policy', value: 'no-referrer' },
  { key: 'x-content-type-options', value: 'nosniff' },
  { key: 'x-frame-options', value: 'DENY' },
  { key: 'strict-transport-security', value: 'max-age=63072000; includeSubDomains; preload' },
  // O app não usa nenhuma delas, e o que não se usa se desliga.
  { key: 'permissions-policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

nextConfig.headers = async () => [{ source: '/:caminho*', headers: CABECALHOS }]

export default nextConfig
