#!/usr/bin/env node
/**
 * Encerrar a conta de um cliente, com a cópia dele na mão antes.
 *
 * Isto é operação, e não produto: roda no terminal, por quem opera o TrackWard,
 * como o `supabase/planos.sql`. Não virou rota do app de propósito. A lista de
 * rotas com a chave de serviço está fechada em duas (`/api/avisar` e
 * `/api/feedback`), e encerrar conta é ato raro, deliberado e irreversível: ele
 * não deve existir atrás de um botão que alguém aperta sem querer.
 *
 * SÃO TRÊS PASSOS, E A ORDEM É A REGRA INTEIRA:
 *
 *   1. a CÓPIA, que é o que se entrega ao cliente antes de qualquer coisa
 *   2. os ARQUIVOS, pela API de Storage, porque SQL não apaga arquivo
 *   3. o BANCO, com um `delete from organizacoes` que a cascata resolve
 *
 * Invertendo 1 e 3 não há o que copiar. Invertendo 2 e 3 os arquivos ficam
 * órfãos para sempre, numa pasta com o id de uma empresa que já não existe:
 * ninguém acha, ninguém abre, e você paga o espaço.
 *
 * COMO RODAR
 *
 *   node encerrar-conta.mjs                      lista as empresas e sai
 *   node encerrar-conta.mjs <id>                 só a cópia (passo 1)
 *   node encerrar-conta.mjs <id> --apagar        a cópia, os arquivos e o banco
 *
 * As chaves saem do `.env.local`, e nada daqui vai para lugar nenhum: a cópia
 * fica numa pasta neste computador.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

/* --------------------------------------------------------------- as chaves */

function doEnv() {
  const caminho = join(process.cwd(), '.env.local')
  if (!existsSync(caminho)) {
    console.error('Não achei o .env.local. Rode isto na pasta do app.')
    process.exit(1)
  }
  const env = {}
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const chave = env.SUPABASE_SERVICE_ROLE
  if (!url || !chave) {
    console.error('Faltou NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE no .env.local.')
    process.exit(1)
  }
  return { url, chave }
}

const { url, chave } = doEnv()
const cab = { apikey: chave, authorization: `Bearer ${chave}` }

const pedir = async (caminho) => {
  const r = await fetch(`${url}${caminho}`, { headers: cab })
  if (!r.ok) throw new Error(`${caminho}: ${r.status} ${await r.text()}`)
  return r.json()
}

/* ------------------------------------------------------------- as empresas */

const orgId = process.argv[2]
const vaiApagar = process.argv.includes('--apagar')

if (!orgId) {
  const orgs = await pedir('/rest/v1/organizacoes?select=id,nome,tipo,plano&order=criado_em')
  console.log('\n  Empresas neste banco:\n')
  for (const o of orgs) console.log(`  ${o.id}  ${o.nome}  (${o.tipo}, ${o.plano})`)
  console.log('\n  node encerrar-conta.mjs <id>            só a cópia')
  console.log('  node encerrar-conta.mjs <id> --apagar   a cópia e o encerramento\n')
  process.exit(0)
}

const [org] = await pedir(`/rest/v1/organizacoes?id=eq.${orgId}&select=*`)
if (!org) { console.error('Não achei essa empresa.'); process.exit(1) }

/* ------------------------------------------------- 1. a cópia para o cliente */

/**
 * As tabelas que carregam o trabalho da empresa.
 *
 * Todas têm `org_id`, que é a etiqueta que separa uma empresa da outra. Fora
 * desta lista ficam as que não são dela: `acervo_forma` é anônimo e entre
 * clientes, e `auditoria` é o registro de acesso, que vai junto no encerramento
 * mas não se entrega como cópia, porque ele fala de quem fez o quê e existe
 * para proteger a casa, não para ser levado embora.
 */
const TABELAS = [
  'perfis', 'empresas', 'areas', 'convites',
  'processos', 'processo_etapas', 'processo_itens',
  'fluxos', 'fluxo_pessoas', 'etapas', 'itens', 'dependencias', 'historico', 'atividades',
  'ciclos', 'feedbacks', 'pedidos_prazo',
  'compromissos', 'convidados',
  'canais', 'canal_membros', 'mensagens', 'sugestoes',
  'notas', 'nota_pessoas', 'anexos',
  'decisoes', 'memoria', 'agentes', 'conectores', 'raiox_achados', 'processos_descobertos',
  'anexo_pessoas',
]

/**
 * O que não vai na cópia, mesmo estando na linha.
 *
 * A credencial de um conector é cifrada com a chave DESTE servidor
 * (`TRACK_SEGREDO`), então entregá-la ao cliente não serve de nada a ele e vira
 * um segredo a mais circulando num arquivo. O que ele precisa levar é o
 * endereço e o nome do serviço, que ficam.
 */
const FORA = { conectores: ['segredo_cifrado'] }

const pasta = join(process.cwd(), `copia-${org.nome.replace(/[^\p{L}\p{N}]+/gu, '-')}-${Date.now()}`)
mkdirSync(pasta, { recursive: true })
mkdirSync(join(pasta, 'arquivos'), { recursive: true })

console.log(`\n  ── Cópia de "${org.nome}" ──\n`)
writeFileSync(join(pasta, 'organizacao.json'), JSON.stringify(org, null, 2))

let linhas = 0
for (const t of TABELAS) {
  try {
    const dados = await pedir(`/rest/v1/${t}?org_id=eq.${orgId}&select=*`)
    for (const linha of dados) for (const c of (FORA[t] || [])) delete linha[c]
    writeFileSync(join(pasta, `${t}.json`), JSON.stringify(dados, null, 2))
    linhas += dados.length
    if (dados.length) console.log(`  ${String(dados.length).padStart(5)}  ${t}`)
  } catch (e) {
    // Tabela que ainda não existe neste banco não interrompe a cópia: o que
    // não dá para copiar não pode impedir o resto de ser copiado.
    console.log(`         ${t}: ${String(e.message).slice(0, 60)}`)
  }
}

/* ----------------------------------------------- os arquivos, um por um */

/**
 * Lista tudo que está embaixo da pasta da empresa no balde.
 *
 * A API de Storage lista um nível por vez, então isto desce recursivamente. Não
 * existe "apagar pasta": só dá para apagar por lista de caminhos, e é por isso
 * que este script existe em vez de uma linha de SQL.
 */
async function arquivosDe(prefixo) {
  const r = await fetch(`${url}/storage/v1/object/list/anexos`, {
    method: 'POST',
    headers: { ...cab, 'content-type': 'application/json' },
    body: JSON.stringify({ prefix: prefixo, limit: 1000, offset: 0 }),
  })
  if (!r.ok) throw new Error(`list ${prefixo}: ${r.status} ${await r.text()}`)
  const itens = await r.json()
  const saida = []
  for (const i of itens) {
    const caminho = prefixo ? `${prefixo}/${i.name}` : i.name
    // Pasta vem sem metadata. Arquivo vem com.
    if (i.id === null || !i.metadata) saida.push(...await arquivosDe(caminho))
    else saida.push(caminho)
  }
  return saida
}

const caminhos = await arquivosDe(orgId)
console.log(`\n  ${caminhos.length} arquivo(s) no Storage.`)

for (const c of caminhos) {
  const r = await fetch(`${url}/storage/v1/object/anexos/${c}`, { headers: cab })
  if (!r.ok) { console.log(`  não baixou: ${c}`); continue }
  const destino = join(pasta, 'arquivos', c.replace(/[/\\]/g, '__'))
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()))
}

console.log(`\n  Cópia pronta: ${pasta}`)
console.log(`  ${linhas} linhas e ${caminhos.length} arquivos.\n`)

if (!vaiApagar) {
  console.log('  Nada foi apagado. Para encerrar de vez, rode de novo com --apagar.\n')
  process.exit(0)
}

/* ----------------------------------------- 2. os arquivos, 3. o banco */

const rl = createInterface({ input: process.stdin, output: process.stdout })
const resposta = await rl.question(
  `\n  Isto APAGA "${org.nome}" e tudo que é dela, e não tem volta.\n`
  + `  Digite o nome da empresa para confirmar: `)
rl.close()
if (resposta.trim() !== org.nome) {
  console.log('\n  Não bateu. Nada foi apagado.\n')
  process.exit(1)
}

// Os arquivos ANTES do banco: depois do delete, o caminho deles começa pelo id
// de uma empresa que já não existe, e ninguém mais sabe que eles são dela.
if (caminhos.length) {
  const r = await fetch(`${url}/storage/v1/object/anexos`, {
    method: 'DELETE',
    headers: { ...cab, 'content-type': 'application/json' },
    body: JSON.stringify({ prefixes: caminhos }),
  })
  console.log(r.ok ? `  ${caminhos.length} arquivo(s) apagados.` : `  Storage recusou: ${await r.text()}`)
  if (!r.ok) process.exit(1)
}

const r = await fetch(`${url}/rest/v1/organizacoes?id=eq.${orgId}`, {
  method: 'DELETE', headers: { ...cab, prefer: 'return=minimal' },
})
if (!r.ok) { console.error(`  O banco recusou: ${await r.text()}`); process.exit(1) }

console.log(`\n  "${org.nome}" encerrada. A cópia continua em ${pasta}\n`)
