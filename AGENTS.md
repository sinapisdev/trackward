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
- O modelo tem **dois tipos de track e nada mais**: **objetivo**, que tem fim, e **rotina**,
  que dá voltas. As duas podem morar numa **área** ou viver soltas, porque nem todo
  trabalho cabe numa frente existente: um negócio novo não tem área ainda, e forçar uma
  seria inventar organização antes de ela existir. A área é uma etiqueta que agrupa, não
  um lugar: ela não tem tela própria, é filtro em Tracks, e nasce dentro do formulário de
  criar track. As palavras vivem em `lib/rotulos.ts`; no banco continuam `fluxos`,
  `esteira` (objetivo) e `ciclo` (rotina), porque renomear coluna por causa de rótulo de
  tela é trocar dívida barata por cara.
- **Toda tarefa nasce pelo mesmo formulário**, e a única escolha que muda tudo é "onde ela
  vive": dentro de uma track ela entra na trilha, conta para a saída do checkpoint e a
  equipe enxerga; livre, ela não pertence a nada e só quem criou enxerga. A frase de apoio
  do campo troca junto com a escolha, porque essa escolha decide quem vê, e decidir isso
  no escuro é o tipo de coisa que só se descobre depois.
- A tarefa tem **título e descrição**. Uma linha só obriga a escolher entre ser curta e ser
  clara: "Conferir os documentos" não diz quais nem contra o quê, e quem recebe descobre
  perguntando. A descrição é opcional e nasce vazia, porque tarefa que se explica no
  título não deve ganhar um campo em branco para preencher.
- Fora das tracks existe a **tarefa avulsa**: a que não pertence a objetivo nem a rotina.
  Ela é **privada de quem criou**, de propósito. Tarefa que a empresa precisa acompanhar
  pertence a alguma coisa; o que não pertence a nada é lembrete, e lembrete dos outros não
  é assunto da casa. Por dentro ela mora na lista pessoal, uma track privada com um
  checkpoint só, e é assim que ela herda prazo, conclusão, anexo e busca de graça em vez
  de virar uma segunda espécie de tarefa com metade das regras. Quem usa nunca vê a track:
  vê "Avulsa".
- **Empresa** é opcional e configurável (`config.multi`). Com ela desligada, a interface
  não pode mencionar empresa em lugar nenhum: o app precisa servir a quem tem um negócio
  só. O rótulo vem de `config.rotulo`, nunca escrever "Empresa" fixo na tela.
- **Objetivos e rotinas moram na mesma tela**, `/tracks`, e o tipo é um filtro. Eram duas
  telas, e ser duas telas era a afirmação errada: quem procura "aquela coisa do Financeiro"
  não sabe de antemão em qual das duas ela está. `/projetos`, `/areas` e `/area/[id]`
  continuam de pé como redirecionamentos, porque esses endereços estão em conversa, em
  favorito e em aviso já enviado.
- **A tela principal chama-se Forward e mostra tarefa, conversa e radar.** Quem abre o app
  de manhã pergunta "o que eu faço agora" e "o que está parado", não "como vão as frentes".
  As tracks ficam em Tracks, e o arquivo de pastas mora lá: pasta passeia bem e acha mal.
  **A conversa fica no meio**, e isso não é decoração de layout: é onde se combina, e é de
  lá que sai a tarefa, então ela vive entre o que precisa ser feito e o que está parado,
  que é o caminho por onde uma coisa vira a outra. Trocar de tela para dizer uma frase é o
  que faz a combinação acontecer fora do app e nunca virar tarefa.
- O canal que o Forward abre sozinho é o que tem mais coisa por ler, e a escolha **fica
  presa depois da primeira vez**. "Por ler" muda no instante em que você lê: sem prender,
  responder uma mensagem jogava a pessoa para outro canal no meio da frase.
- Ao lado da conversa fica a **coluna de canais**, com o despejo em cima. Ela pertence ao
  chat, e não é uma quarta coluna do Forward: sem ela, responder a alguém que não é o canal
  aberto exigia trocar de tela. A classe é `.cnx` e não `.cn` porque `.cn` já é o cartão de
  conector, e **classe curta repetida é o jeito mais silencioso de uma tela quebrar a
  outra**: já aconteceu com `.trk` e com `.ag-linha`. Ao criar classe nova, conferir antes.
- **O Forward é onde o dia inteiro cabe.** Criar objetivo e criar rotina ficam de fora de
  propósito, porque são decisão, não operação: a pessoa senta para fazer isso. O resto
  precisa caber aqui, e toda coisa nova que exigir sair da tela para uma ação corriqueira é
  um defeito de desenho, não uma escolha.
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

**A fonte da verdade é `design-system/DESIGN.md`** para os tokens, e **as telas de
referência do produto** para o layout. Desde 22/09/2026 as telas do app foram refeitas
para bater com a arte: barra horizontal, arquivo de pastas, trilha deitada, tabela de
tracks, radar da operação, gaveta da fila e a entrada em tela dividida. O
`app/globals.css` não inventa cor: ele traduz os tokens do sistema para os nomes que as
telas já usam, e foi isso que permitiu virar a identidade inteira sem reescrever 40
componentes.

A marca na tela é **TrackWard**, e a unidade de trabalho se chama **track** para o
usuário. No código o nome antigo continua: `fluxo` (tabela e tipo), `esteira` (projeto) e
`ciclo` (rotina). Não renomear o banco por causa da interface.

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

## Nunca peça a linha de volta num insert

`insert(...).select()` no supabase-js vira `INSERT ... RETURNING`, e o RETURNING
passa pela política de **leitura**. Quando ela recusa a linha recém-criada, o
Postgres devolve **exatamente a mesma frase** de quando a escrita é recusada:
"new row violates row-level security policy". A linha entrou e a tela diz que não
entrou, o que é praticamente impossível de depurar de fora.

E não adianta afrouxar a política: `ve_canal` e `ve_item` consultam a própria
tabela pelo id, e função estável não enxerga a linha que está sendo inserida na
mesma instrução. **O RETURNING sempre vai falhar nessas tabelas.**

Por isso o id nasce no cliente, em `lib/id.ts`, e os inserts não pedem nada de
volta. Ao escrever um insert novo, seguir isso. Foi assim que criar canal e criar
tarefa pararam.

## Quem cria, enxerga

`ve_canal` inclui quem abriu o canal e `ve_item` inclui quem escreveu a tarefa.
Não é conveniência: sem isso, abrir um canal fechado ou delegar uma tarefa era
perder a coisa de vista no mesmo instante, porque a entrada de membro é gravada
depois do canal e quem delega não é responsável nem aprovador.

## O carimbo da organização não pode ficar pela metade

`carimbar_org()` preenche `org_id` em toda tabela que tem etiqueta, e **toda**
política pergunta `minha(org_id)`. Faltando o gatilho numa tabela, o banco passa
a recusar qualquer criação lá com "new row violates row-level security policy", e
a mensagem fala da política, não do carimbo que falta. Foi assim que criar tarefa
e criar canal pararam, e foi difícil de achar exatamente por isso.

O laço que cria esses gatilhos tem `continue when to_regclass(...) is null`. Não é
zelo exagerado: sem ele, uma tabela que ainda não existe no meio da lista derruba
o bloco inteiro, e todas as tabelas depois dela ficam sem carimbo. Ao acrescentar
tabela nova àquela lista, manter o `continue`.

## O despejo é caderno, não conversa

O despejo **não é um canal de chat**, e a diferença muda o uso. Conversa pede
interlocutor: escrever num chat vazio soa estranho, e quem se sente estranho não
escreve. O caderno não pede nada de ninguém, e é por isso que ele recebe a ideia
crua, o número da reunião, o nome do fornecedor.

O que a máquina faz com isso vem **depois e a pedido**: `lerNota()` manda o texto
pela mesma rota da leitura da conversa, com `despejo: true`, e devolve propostas
que alguém aceita. Reusar a mesma leitura não é economia, é o que garante que a
nota e o canal aprendam a mesma coisa e proponham do mesmo jeito. Nada vira
tarefa sozinho.

O que organiza o caderno continua sendo a ligação escrita no meio do texto,
`[[outra nota]]`, porque **pasta não sobrevive às trezentas notas**. Área e track
são etiquetas por cima disso, para o eixo do trabalho, e a maioria das notas não
vai ter nenhuma das duas: isso é o certo, não uma lacuna a preencher.

**O caderno soma, não só acumula.** Ao ler uma nota, `lerNota()` manda junto as
notas parecidas e as do mesmo endereço, no campo `caderno` do contexto. É isso
que faz a ideia de hoje encontrar a de um mês atrás: sem isso, quem tinha que
lembrar da primeira era a pessoa, que escreveu justamente para não precisar
lembrar. A leitura pode apontar a ligação no motivo da proposta, e nunca decide
sozinha.

**O anexo pertence a uma tarefa ou a uma nota, nunca às duas**, e um `check` no
banco garante isso em vez da boa vontade de quem escreve o insert: anexo
pendurado em nada é arquivo que ninguém acha e ninguém apaga. Quem vê segue a
coisa a que ele pertence, e anexo de nota abre só para o dono dela.

## Quem assina a linha é o servidor

Três tabelas guardam quem criou a linha e três políticas exigem que o campo seja
igual a `meu_perfil()`: `itens.autor_id`, `canais.criado_por` e `notas.dono_id`.
Esse campo é **carimbado pelo banco**, no gatilho `ao_assinar` (seção 15 do
schema), exatamente como `carimbar_org()` já fazia com a organização. O que o
navegador mandar ali é ignorado.

Não voltar a confiar no cliente para esse campo. Quando a verdade existe nos dois
lados, o dia em que eles discordarem é um dia que ninguém escolheu, e o banco
responde só "new row violates row-level security policy", que não diz qual das
condições caiu. Foi assim que criar canal e criar tarefa pararam em uso.

Pelo mesmo motivo, a lista de pessoas do app é a do espaço em uso, e não tudo que
`perfis_sel` devolve: aquela política devolve, de propósito, os seus perfis em
todos os espaços, porque é o que alimenta o seletor de empresa. Misturar isso numa
escolha de responsável cria tarefa que o dono nunca enxerga. `Dados.tsx` filtra por
`org_id`, e no banco existe `gente_daqui()` para quem precisar da lista certa.

## Avisos

Um app de prazo que não avisa é um caderno: só serve para quem lembra de abrir.
Quatro regras, e nenhuma delas é detalhe de implementação.

- **O aviso nasce no banco, não na tela.** São gatilhos na seção 14 do
  `supabase/schema.sql`, `security definer`, porque quem age quase nunca é quem
  precisa ser avisado. Aviso criado no cliente só avisaria quem já está com o
  app aberto, que é exatamente quem não precisa.
- **Todo aviso tem `chave`, única por pessoa.** É ela que faz gerar os avisos do
  dia duas vezes escrever uma vez só. `on conflict do nothing` é a regra inteira.
  Ao criar um tipo novo de aviso, a chave precisa carregar o que o identifica, e
  a data quando ele se repete por dia.
- **A caixa é de uma pessoa e de mais ninguém**, inclusive do administrador. Ali
  dentro aparece texto de tarefa privada e de mensagem de canal fechado, e o
  aviso não pode virar a porta dos fundos das regras de visibilidade. Telefone e
  assinatura de push moram em `avisos_contato` e `push_assinaturas`, fora de
  `perfis`, porque RLS trabalha por linha e em `perfis` a organização inteira
  leria o celular de todo mundo.
- **Urgente é faixa estreita, de propósito**: o que já venceu, o que trava outra
  pessoa e o que só aquela pessoa destrava. Tocar o celular de alguém gasta a
  atenção dela e a credibilidade do app; se tudo é urgente, nada é, e a primeira
  coisa que a pessoa faz é desligar tudo.

O sino mostra tudo, porque quem está no app já escolheu olhar. Fora do app sai
só o que a pessoa ligou, respeitando "só urgente" e o não perturbe, e quem
entrega é `/api/avisar`, a única parte do sistema que usa a chave de serviço.
Ver `lib/avisos.ts`, que guarda a regra do que pode sair, e o README para ligar.

## A visão geral cabe numa tela

**A visão geral não rola**, nem para baixo nem para o lado, do computador para cima
(acima de 1180px). Ela responde "como está o dia", e rolar para descobrir isso é perder
a resposta. A regra está na classe `.duas.uma-tela`, em `app/globals.css`.

Como ela se ajusta, em ordem: o **arquivo de pastas é quem estica**, e a pasta encolhe
junto com ele por container query no `.arquivo-palco`, em vez de ser cortada; as listas
mostram só o que cabe, e o que sobra continua no "Ver tudo" e no "Ver todas" ao lado, com
a contagem cheia no título. Nada é escondido sem dizer quanto é.

Ao mexer nessa tela, medir de novo em 1366x768, 1440x900 e 1920x1080: é fácil ganhar
20px de altura sem perceber e a tela voltar a rolar. No celular ela rola normalmente,
como qualquer app de celular.

## Navegação

**A navegação é horizontal**, na `Barra` (`componentes/Barra.tsx`, classe `.tw-topo`):
marca, seletor de espaço, as abas, busca e você. Não existe mais lateral de navegação: a
lateral de uma tela é **contexto** (o radar da visão geral, a conversa da track, o índice
dos ajustes), nunca navegação. O que não cabe na fileira principal mora no menu "Mais",
e continua a um clique: Relatórios, Desempenho, Notas, Agentes, Conectores, Processos.

Abaixo de 840px as abas sacam e entra a `TabBar` (barra no rodapé, folha de "Mais" e
botão redondo de criar). Não duplicar navegação: quem navega no celular é a TabBar, quem
navega no desktop é a Barra. Telas novas precisam caber nas duas formas.

O botão redondo do celular **não é lima**. O acento é da ação que faz o trabalho andar, e
ela já está na tela (concluir, aprovar, abrir a track); lima no botão de criar daria dois
limas em toda tela, que é defeito.

A agenda usa `matchMedia` para mostrar um dia por vez no celular; grade de sete colunas
não cabe em 375px.

## A trilha

A trilha existe para responder **onde a track está** antes de qualquer outra pergunta, e
tem duas orientações, as duas em `componentes/Trilha.tsx`:

- `TrilhaH` (classe `.trilhah`), **deitada**, é a da arte do produto: é ela na track
  aberta, na linha de cada rotina e na gaveta de Meu trabalho.
- `Trilha` (classe `.trilha`), **em coluna**, é o CheckpointTrail na vertical.

Quem escolhe é o número de checkpoints: **deitada só até cinco**. Passando disso ela
rolaria de lado, e descobrir onde a track está passaria a exigir arrastar, que é
exatamente o que a trilha existe para evitar. A regra mora em `TelaFluxo` (`deitada`).
Não tirar esse limite para "ficar igual à arte": a arte foi desenhada com quatro.

Aprovado é disco cheio com o visto, o corrente é anel do acento com halo fraco, o que
ainda não chegou é contorno apagado com o número dentro, e o fio que liga acende até onde
a track andou.

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
