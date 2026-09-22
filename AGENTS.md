<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:esteira -->

# Esteira Silvereng

App de acompanhamento de projetos, rotinas e areas da SILVERENG.
Next.js (App Router) + Supabase. Leia o `README.md` antes de mexer.

## Regras de escrita

- **Nunca usar travessão (—)** em texto de interface, comentário ou documentação.
  Use vírgula, parênteses, dois-pontos ou ponto. Vale para tudo que o Leo lê.
- Interface em português do Brasil, direta, sem emoji.
- Nomes de variáveis, funções e colunas também em português.

## Regras de produto

- Situação de um fluxo é sempre calculada, nunca digitada (ver `lib/regras.ts`).
- **Área** é a frente que já funciona e guarda as rotinas. **Projeto** é a iniciativa com
  começo e fim, listada à parte, e pode existir sem área (um negócio novo).
- **Empresa** é opcional e configurável (`config.multi`). Com ela desligada, a interface
  não pode mencionar empresa em lugar nenhum: o app precisa servir a quem tem um negócio
  só. O rótulo vem de `config.rotulo`, nunca escrever "Empresa" fixo na tela.
- Rotina vive sempre dentro de uma área. **A tela de uma área mostra só rotinas**: projeto
  nenhum aparece ali, mesmo pertencendo à área. Quem quer projeto vai na tela Projetos.
- Com vários negócios em foco, rotinas e projetos são separados em blocos por empresa,
  um bloco por empresa, não uma lista só com etiqueta.
- Tudo tem responsável e prazo: item (quem executa), checkpoint (quem aprova), fluxo (dono).
- Privacidade é do banco, não da tela: toda regra de visibilidade tem política de RLS
  correspondente em `supabase/schema.sql`.
- **Visibilidade da esteira** é `fluxos.visib`: `equipe`, `escolhidas` (lista em
  `fluxo_pessoas`) ou `so_eu`. Participar da esteira (autor, dono, aprovador, responsável)
  sempre dá acesso, em qualquer nível: não faz sentido ter tarefa numa esteira que você não
  pode abrir. Em `escolhidas`, nem admin entra sem ser convidado.
- **Quem vê o quê** vive em `lib/acesso.ts` e é espelhado nas funções `ve_fluxo`,
  `ve_item` e `meu_alcance` do schema. Mexeu em um, mexa no outro.
  Colaborador vê o que é dele e o que trava o que é dele. Gestor vê também tudo de quem
  está abaixo, em qualquer profundidade. Admin vê tudo.
- **Papel nunca é escolhido por quem se cadastra.** Vem do convite (tabela `convites`, resolvida
  pelo trigger `novo_usuario`) ou de um administrador em Equipe. Quem abre a empresa vira admin
  dela porque não há mais ninguém ali para dizer que pode.
- **Entrar numa empresa é só por convite.** O domínio do e-mail não coloca ninguém para dentro:
  quem se cadastra sem convite abre a empresa dele, não cai na sua. `organizacoes.dominio` e
  `entrada_por_dominio` continuam no banco sem abrir porta, e não voltar a usá-las para isso.
- **O mesmo login vive em várias empresas**, uma por convite aceito mais a que ele abriu. São
  perfis distintos do mesmo `user_id`, e `sessoes` guarda em qual ele está. É o caso do grupo e
  da holding, então nada pode assumir que uma pessoa tem um perfil só.
- **Uso pessoal está guardado, não removido.** `organizacoes.tipo` ainda aceita `pessoal` e as
  telas ainda sabem se comportar assim, mas a tela de criar conta não oferece mais. O foco é
  empresa. Não apagar o caminho: ele volta depois, repensado.
- **Permissão por campo, não só por tela**: o executor muda o texto e o responsável da
  tarefa dele, mas prazo, checkpoints e critério de saída são de quem responde pelo
  processo (`manda_no_processo`). No banco isso é um trigger, não só uma policy, porque
  RLS não restringe coluna.
- **Agenda**: `bloqueia` e `visivel` são chaves independentes. Quem não pode ler um
  compromisso recebe apenas a ocupação (via função `ocupacao()`), com título trocado por
  "Ocupado" e `aberto: false`. Nunca vazar título, local ou observação de compromisso
  fechado, inclusive em avisos de conflito.
- **Agenda externa**: a leitura só pode devolver intervalos. `lib/ical.ts` descarta título,
  local e descrição de propósito; não acrescentar esses campos ao retorno, nem "só para
  mostrar ao dono". A url do calendário é segredo do dono (tabela `agendas_externas`, RLS
  restrita a `auth.uid()`), e a rota `/api/agenda-externa` valida o destino contra SSRF.
- Uma tarefa pode depender de tarefas de **outras esteiras e outras áreas**. Enquanto a
  trava não sai, a tarefa não pode ser concluída e mostra quem está segurando.

## Regras visuais

**A fonte da verdade é `design-system/DESIGN.md`.** Ele descreve cor, tipo, espaço,
movimento, iconografia e voz, e foi medido da arte do produto. O `app/globals.css` não
inventa cor: ele traduz aqueles tokens para os nomes que as telas já usam, e foi isso que
permitiu virar a identidade inteira sem reescrever 40 componentes.

Sistema de **acento único**: chão quase preto (`#0A0B0A`), tudo construído com branco a
4 a 20% de alfa em vez de cinzas novos, e uma cor saturada, o lima `#D0FA3C`. Tipografia
**Figtree**. Rótulos de seção em caixa alta espaçada, pílulas para segmento e selo, cantos
generosos (`--r-lg` 18px na pasta e na gaveta, `--r` 14px no painel, `--r-sm` 8px no campo).

**O lima é racionado.** Ele marca a *uma* ação que faz o trabalho andar, o checkpoint
corrente, o brilho da IA, o ponto de hoje e o anel de foco. **Dois lima na mesma tela é
defeito.** Por isso caixa marcada é branca com o visto quase preto, e a pasta em foco é
vidro grafite com fio lima, não lima cheio: gastar o acento no recipiente tira dele o
único trabalho que ele tem.

Semântica é estreita e sempre acompanhada de palavra: vermelho para atrasado, âmbar para
vence em breve. Em dia, travado e concluído são neutros e se distinguem pela forma do
ícone. Não introduzir cor nova sem que ela signifique algo que o usuário precise agir.
Cores de área, pessoa e empresa são dessaturadas de propósito e aparecem em pontos
pequenos ou como tinta (ver `.av`, que usa `color-mix` em vez de fundo chapado).

Não introduzir: emoji, faixas coloridas laterais em cards, blocos grandes de KPI, neon,
glow forte, fotografia ou ilustração. O produto não tem imagem nenhuma, de propósito: se
uma superfície precisa de corpo, ela ganha uma pasta, não uma foto.

**O escuro é o tema especificado**, medido da arte. O claro é derivação, e o próprio
DESIGN.md marca modo claro como inferência. A diferença que ele exige é o `--ac-tinta`:
lima puro não se lê como letra sobre fundo claro (1,6:1), então tudo que é letra, ícone e
fio fino usa a tinta, enquanto fundo de botão e brilho seguem no lima cheio. Ao mexer no
acento, mexer nos dois.

Cores vivem só em `app/globals.css`, sobre `:root[data-tema="..."]`. Nenhuma tela conhece
o tema no ar. Ao criar um token, defini-lo no escuro e no claro.

## Design system TrackWard

Em `design-system/` mora o sistema de peças completo vindo do Claude Design, e desde
22/09/2026 **ele é a linguagem do app**: o `app/globals.css` adotou os tokens dele, e
todas as telas viraram de uma vez.

O que as telas usam hoje ainda são as classes e os componentes de `componentes/`, não os
50 componentes React do sistema. A troca peça por peça é o trabalho seguinte, e é por
isso que o sistema segue com escopo próprio: **todo token dentro de `design-system/`
desce de `[data-ds="trackward"]`, nunca de `:root`**. Os dois mundos ainda têm nome de
token repetido com valor diferente (`--r-lg`, `--r-sm`, `--warn`), então manter o escopo
é o que evita a colisão enquanto a migração não termina.

- Importe sempre pelo barril `@/design-system`, nunca por dentro de `components/`.
- O que usar o sistema precisa de um pai com `data-ds="trackward"`, e de `window.lucide`
  de pé antes da primeira pintura, que é de onde o `Icon` tira os glifos.
- A fonte da verdade dos tokens é `design-system/DESIGN.md`. Antes de compor tela, leia
  o `.prompt.md` do componente: ele guarda a regra de uso que a prop não conta.
- As regras de aderência (barril, token no lugar de valor cru, contrato de props) estão
  em `design-system/aderencia.eslint.json` e rodam no `npm run lint`. Reexportou o design
  system, troque aquele arquivo.
- `design-system/referencia/` é material congelado, para consulta visual. Não é código
  a manter, e o lint não passa por lá.
- A vitrine é a rota `/design-system`, fora do grupo `(app)` de propósito: sem Shell,
  sem TabBar, fora da navegação.

<!-- END:esteira -->

<!-- BEGIN:esteira-local -->

## Processos

Os trilhos não vivem mais no código: são **processos**, desenhados na interface e
guardados no banco (`processos`, `processo_etapas`, `processo_itens`). As tarefas de um
processo apontam para uma **área**, nunca para uma pessoa, e o prazo é em **dias a partir
do início**. Isso é o que deixa o mesmo trilho servir a qualquer obra e a qualquer cliente.

`criar_do_processo` (banco) e `criarDoProcesso` (modo local) resolvem a distribuição:
área do checkpoint vira aprovador, área da tarefa vira responsável, dias viram datas.
Quem decide a pessoa é `areas.responsavel_id`, e o formulário de criação deixa trocar.

Não voltar a embutir trilhos em `lib/modelos.ts`: ele ficou só com o cálculo de período e
o esqueleto em branco.

## Celular

Abaixo de 840px a lateral sai e entra a `TabBar` (barra de abas no rodapé, folha de
"Mais" e botão redondo de criar). Não duplicar navegação: quem aparece no celular é a
TabBar, quem aparece no desktop é a `Shell`. Telas novas precisam caber nas duas formas.

A agenda usa `matchMedia` para mostrar um dia por vez no celular; grade de sete colunas
não cabe em 375px.

A esteira é desenhada como **trilha vertical** (`componentes/Trilha.tsx`, classe `.trilha`),
que é o CheckpointTrail do design system na orientação de coluna. Ela vive numa lateral de
264px à esquerda do checkpoint aberto, em `.fluxo-corpo`. Aprovado é disco cheio com o
visto, o corrente é anel do acento com halo fraco, o que ainda não chegou é contorno
apagado com o número dentro, e o fio que liga acende até onde a esteira andou.

**Não voltar para stepper horizontal**: com sete checkpoints ele não cabe, e foi o que
aconteceu. Até 22/09/2026 o código tinha um trilho deitado que rolava de lado, apesar
desta regra já estar escrita aqui, e descobrir onde a esteira estava exigia arrastar.

O anel do corrente **enche conforme o checklist anda**, e isso o design system não tem:
é acréscimo do produto, para ver o progresso de dentro do checkpoint sem abrir o
checkpoint. Ao trocar a trilha por outra coisa, não perder isso, nem o ponto de quem já
voltou atrás, nem a bandeira de chegada que distingue projeto de rotina.

## Modo demonstração

Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`, o app
roda inteiro no navegador (`lib/local/`), com a empresa de exemplo de `lib/local/semente.ts`.

O ponto de troca é único: `lib/supabase/browser.ts`. Nenhuma tela sabe em qual modo está.
Ao mexer em `supabase/schema.sql`, espelhar a mudança em `lib/local/cliente.ts`, que
repete as regras de visibilidade e as funções `salvar_fluxo` e `aprovar_etapa`.

<!-- END:esteira-local -->
