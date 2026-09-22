import type { Conector } from './tipos'

/**
 * Os conectores: ligar o Track em qualquer sistema que aceite uma chave.
 *
 * A ideia veio do jeito que o Claude faz: você não espera que alguém escreva um
 * conector para o seu sistema, você entra na sua conta, copia a chave de API, e
 * cola. Aqui é igual, com uma diferença importante e honesta:
 *
 * O Claude consegue viver só com a chave porque do outro lado existe um servidor
 * MCP que se descreve, ou seja, o próprio serviço conta quais ações tem. Uma API
 * comum não conta nada. Então, para um serviço que não está na lista abaixo,
 * alguém precisa dizer uma vez qual caminho chamar e o que mandar. É uma linha de
 * configuração, não é programar, e é uma vez por conector.
 *
 * É para isso que os MOLDES abaixo existem: nos serviços mais usados, o caminho e
 * o corpo já vêm preenchidos, e a pessoa só cola a chave.
 *
 * ONDE FICA A CHAVE: cifrada no banco, e a cifra abre só no servidor. Ninguém vê
 * a chave de ninguém depois de salvar, nem o dono da empresa, nem eu. A tela
 * mostra os quatro últimos caracteres para a pessoa reconhecer qual é.
 */

export type Molde = {
  id: string
  nome: string
  /** Para que serve, em uma linha, sem jargão. */
  serve: string
  base_url: string
  auth_tipo: 'bearer' | 'header' | 'query'
  auth_nome: string
  /** Onde a pessoa acha a chave, em português. */
  onde: string
  /** O que chamar, já preenchido. */
  caminho: string
  metodo: string
  /** O corpo, com {{situacao}} e {{agente}} trocados na hora do disparo. */
  corpo: string
  /** Um caminho de leitura, para o botão testar não criar nada de verdade. */
  teste: string
}

/**
 * Os moldes.
 *
 * Escolhidos por dois critérios: aceitam chave simples (sem aquela dança de
 * autorização que precisa de conta de desenvolvedor), e servem a setores
 * diferentes. Não tem nada aqui presumindo o ramo de ninguém.
 */
export const MOLDES: Molde[] = [
  {
    id: 'resend', nome: 'Resend', serve: 'mandar e-mail em nome da empresa',
    base_url: 'https://api.resend.com', auth_tipo: 'bearer', auth_nome: '',
    onde: 'resend.com, menu API Keys, botão Create API Key. Começa com re_',
    caminho: 'emails', metodo: 'POST', teste: 'domains',
    corpo: '{"from":"track@seudominio.com","to":["alguem@empresa.com"],"subject":"{{agente}}","text":"{{situacao}}"}',
  },
  {
    id: 'sendgrid', nome: 'SendGrid', serve: 'mandar e-mail em nome da empresa',
    base_url: 'https://api.sendgrid.com/v3', auth_tipo: 'bearer', auth_nome: '',
    onde: 'app.sendgrid.com, Settings, API Keys. Começa com SG.',
    caminho: 'mail/send', metodo: 'POST', teste: 'user/profile',
    corpo: '{"personalizations":[{"to":[{"email":"alguem@empresa.com"}]}],"from":{"email":"track@seudominio.com"},"subject":"{{agente}}","content":[{"type":"text/plain","value":"{{situacao}}"}]}',
  },
  {
    id: 'telegram', nome: 'Telegram', serve: 'avisar um grupo ou uma pessoa no Telegram',
    base_url: 'https://api.telegram.org', auth_tipo: 'query', auth_nome: 'token',
    onde: 'converse com o @BotFather no Telegram, /newbot, e ele devolve o token',
    caminho: 'sendMessage', metodo: 'POST', teste: 'getMe',
    corpo: '{"chat_id":"-100000000","text":"{{agente}}: {{situacao}}"}',
  },
  {
    id: 'notion', nome: 'Notion', serve: 'criar página e anotar em base do Notion',
    base_url: 'https://api.notion.com/v1', auth_tipo: 'bearer', auth_nome: '',
    onde: 'notion.so/my-integrations, New integration, e compartilhe a página com ela',
    caminho: 'pages', metodo: 'POST', teste: 'users/me',
    corpo: '{"parent":{"database_id":"cole-o-id-aqui"},"properties":{"Name":{"title":[{"text":{"content":"{{agente}}"}}]}}}',
  },
  {
    id: 'github', nome: 'GitHub', serve: 'abrir issue num repositório',
    base_url: 'https://api.github.com', auth_tipo: 'bearer', auth_nome: '',
    onde: 'github.com, Settings, Developer settings, Personal access tokens',
    caminho: 'repos/DONO/REPO/issues', metodo: 'POST', teste: 'user',
    corpo: '{"title":"{{agente}}","body":"{{situacao}}"}',
  },
  {
    id: 'linear', nome: 'Linear', serve: 'abrir tarefa no Linear',
    base_url: 'https://api.linear.app', auth_tipo: 'header', auth_nome: 'authorization',
    onde: 'linear.app, Settings, API, Personal API keys',
    caminho: 'graphql', metodo: 'POST', teste: 'graphql',
    corpo: '{"query":"mutation{issueCreate(input:{teamId:\\"cole-o-id\\",title:\\"{{agente}}\\",description:\\"{{situacao}}\\"}){success}}"}',
  },
  {
    id: 'trello', nome: 'Trello', serve: 'criar cartão num quadro do Trello',
    base_url: 'https://api.trello.com/1', auth_tipo: 'query', auth_nome: 'key',
    onde: 'trello.com/power-ups/admin, e a chave fica junto do token',
    caminho: 'cards', metodo: 'POST', teste: 'members/me',
    corpo: '{"idList":"cole-o-id-da-lista","name":"{{agente}}","desc":"{{situacao}}"}',
  },
  {
    id: 'clickup', nome: 'ClickUp', serve: 'criar tarefa no ClickUp',
    base_url: 'https://api.clickup.com/api/v2', auth_tipo: 'header', auth_nome: 'authorization',
    onde: 'clickup.com, sua foto, Settings, Apps, API Token',
    caminho: 'list/ID_DA_LISTA/task', metodo: 'POST', teste: 'user',
    corpo: '{"name":"{{agente}}","description":"{{situacao}}"}',
  },
  {
    id: 'airtable', nome: 'Airtable', serve: 'gravar linha numa planilha do Airtable',
    base_url: 'https://api.airtable.com/v0', auth_tipo: 'bearer', auth_nome: '',
    onde: 'airtable.com/create/tokens, Create token. Começa com pat',
    caminho: 'ID_DA_BASE/Tabela', metodo: 'POST', teste: 'meta/whoami',
    corpo: '{"records":[{"fields":{"Nome":"{{agente}}","Detalhe":"{{situacao}}"}}]}',
  },
  {
    id: 'pipedrive', nome: 'Pipedrive', serve: 'criar negócio ou atividade no CRM',
    base_url: 'https://api.pipedrive.com/v1', auth_tipo: 'query', auth_nome: 'api_token',
    onde: 'sua conta Pipedrive, Preferências pessoais, API',
    caminho: 'activities', metodo: 'POST', teste: 'users/me',
    corpo: '{"subject":"{{agente}}","note":"{{situacao}}","type":"task"}',
  },
  {
    id: 'hubspot', nome: 'HubSpot', serve: 'criar tarefa ou nota no CRM',
    base_url: 'https://api.hubapi.com', auth_tipo: 'bearer', auth_nome: '',
    onde: 'HubSpot, Configurações, Integrações, Private Apps',
    caminho: 'crm/v3/objects/tasks', metodo: 'POST', teste: 'crm/v3/owners',
    corpo: '{"properties":{"hs_task_subject":"{{agente}}","hs_task_body":"{{situacao}}","hs_task_status":"NOT_STARTED"}}',
  },
  {
    id: 'twilio', nome: 'Twilio', serve: 'mandar SMS ou mensagem de WhatsApp',
    base_url: 'https://api.twilio.com/2010-04-01', auth_tipo: 'header', auth_nome: 'authorization',
    onde: 'console.twilio.com. Aqui vai Basic com a conta e o token juntos, o console mostra como',
    caminho: 'Accounts/SEU_SID/Messages.json', metodo: 'POST', teste: 'Accounts.json',
    corpo: '{"To":"+5511999999999","From":"+15550000000","Body":"{{agente}}: {{situacao}}"}',
  },
  {
    id: 'discord', nome: 'Discord', serve: 'avisar um canal do Discord',
    base_url: 'https://discord.com/api/v10', auth_tipo: 'header', auth_nome: 'authorization',
    onde: 'discord.com/developers, sua aplicação, Bot, Reset Token. A chave vai como Bot SEU_TOKEN',
    caminho: 'channels/ID_DO_CANAL/messages', metodo: 'POST', teste: 'users/@me',
    corpo: '{"content":"{{agente}}: {{situacao}}"}',
  },
  {
    id: 'higgsfield', nome: 'Higgsfield', serve: 'gerar imagem ou vídeo a partir do que foi conversado',
    base_url: 'https://platform.higgsfield.ai/v1', auth_tipo: 'bearer', auth_nome: '',
    onde: 'sua conta Higgsfield, área de API',
    caminho: 'generate', metodo: 'POST', teste: 'me',
    corpo: '{"prompt":"{{situacao}}"}',
  },
  {
    id: 'ponte', nome: 'Make, Zapier ou n8n', serve: 'ligar em qualquer coisa, passando por uma ponte',
    base_url: 'https://hook.make.com', auth_tipo: 'header', auth_nome: 'x-track-token',
    onde: 'crie um cenário com gatilho Webhook e copie o endereço que ele te der',
    caminho: 'SEU_CAMINHO', metodo: 'POST', teste: '',
    corpo: '{"agente":"{{agente}}","situacao":"{{situacao}}"}',
  },
  {
    id: 'outro', nome: 'Outro serviço', serve: 'qualquer API que aceite uma chave',
    base_url: 'https://', auth_tipo: 'bearer', auth_nome: '',
    onde: 'na área de API ou de desenvolvedor da sua conta naquele serviço',
    caminho: '', metodo: 'POST', teste: '',
    corpo: '{"texto":"{{situacao}}"}',
  },
]

export const moldeDe = (id: string) => MOLDES.find((m) => m.id === id) || null

/** O serviço, sem o https e sem caminho, para caber numa linha da tela. */
export const servico = (c: Conector) =>
  c.base_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/**
 * Como este conector se apresenta, em uma linha.
 *
 * Nada aqui concorda em gênero com pessoa, porque o app não sabe o gênero de
 * ninguém e não vai deduzir pelo nome.
 */
export const dono = (c: Conector, nomeDe: (id: string) => string) =>
  c.dono_id ? `conta de ${nomeDe(c.dono_id)}` : 'conta da empresa'

/** Troca {{situacao}} e {{agente}} pelo que aconteceu de verdade. */
export function preencher(corpo: string, situacao: string, agente: string): string {
  const limpo = (t: string) => JSON.stringify(t).slice(1, -1)
  return corpo.replaceAll('{{situacao}}', limpo(situacao)).replaceAll('{{agente}}', limpo(agente))
}

/** Está pronto para disparar? */
export function faltaAlgo(c: Conector): string | null {
  if (!c.base_url.startsWith('https://')) return 'um endereço começando com https://'
  if (!c.dica) return 'colar a chave'
  if (c.auth_tipo !== 'bearer' && !c.auth_nome) return 'dizer o nome do cabeçalho da chave'
  return null
}
