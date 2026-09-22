# Esteira Silvereng

Cada projeto, negócio e area da SILVERENG como uma esteira com checkpoints: fica claro
o que precisa ser feito, o que já foi feito, quem é responsável e até quando.

Duas lentes sobre os mesmos dados: a empresa inteira no painel, ou uma pessoa por vez.
Nada é cadastrado duas vezes.

## Rodar agora, sem instalar nada

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem Supabase configurado, o app entra em **modo
demonstração**: uma empresa de exemplo com quatro pessoas (Leo, Ana, Carlos e Marina),
quatro areas e dez projetos e rotinas em situações diferentes, com um travado e vários
com prazo vencendo.

Escolha quem você é na tela inicial. Isso muda o que aparece: as pendências, quais
aprovações estão liberadas para você e quais itens privados você enxerga. Para trocar,
use o menu do seu avatar, na barra de cima. Para voltar aos dados originais, vá em
**Equipe > Modo demonstração > Recarregar exemplo**.

Tudo fica guardado só no seu navegador. Nada é enviado para lugar nenhum.

## Ligar no banco de verdade

Quando os ajustes estiverem prontos e a equipe for começar a usar:

**1. Criar o banco**

1. Crie um projeto grátis em [supabase.com](https://supabase.com), região São Paulo.
2. No menu lateral, abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e rode.
3. Em **Authentication > Sign In / Providers > Email**, desligue **Confirm email**.
   Quem controla quem entra é você, na tela Equipe do app, não a caixa de e-mail.

**2. Colar as chaves**

Preencha o `.env.local` com os dois valores que estão em **Project Settings > API**
do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Estas duas chaves são públicas por natureza. Quem protege os dados é o RLS do banco,
não o segredo da chave. Assim que as duas estiverem preenchidas, o modo demonstração
desliga sozinho e o app passa a pedir login.

**3. As duas chaves que ficam só no servidor**

```
ANTHROPIC_API_KEY=sk-ant-...
TRACK_SEGREDO=<texto longo e aleatório, gere com: openssl rand -base64 48>
```

A primeira liga a leitura das conversas no modelo, em vez das regras embutidas. Sem ela o
app continua funcionando, só mais bruto.

A segunda é o que cifra a chave de API que cada pessoa cola em **Conectores**. Sem ela o
app **se recusa a guardar chave**, em vez de guardar aberta. Trocar esse valor depois cega
todas as chaves já guardadas, e cada pessoa teria que colar a dela de novo: gere uma vez e
guarde em lugar seguro.

**4. Primeira conta**

Rode `npm run dev` de novo e crie sua conta escolhendo **Abrir a minha empresa**. Quem
abre a empresa é a administradora dela, sempre. Se quiser ver as telas cheias antes de
cadastrar o real, rode `supabase/exemplo.sql` no SQL Editor.

Para voltar ao modo demonstração a qualquer momento, esvazie as duas linhas do
`.env.local`, ou acrescente `NEXT_PUBLIC_MODO=local`.

### Se alguém ficar preso na tela de acesso suspenso

Até 22/09/2026 o domínio do e-mail colocava gente dentro de empresa, e isso deixou dois
tipos de sujeira: empresa segurando um domínio, e gente parada esperando liberação de uma
empresa em que caiu sem escolher. Se a conta que abriu aquela empresa sumiu do
Authentication, não sobra nem quem libere.

Rodar o `supabase/schema.sql` atualizado já limpa isso. Para resolver só o acesso, sem
mexer no resto, rode `supabase/destravar.sql` no SQL Editor: ele solta os domínios, põe o
perfil mais antigo no comando de quem ficou sem administrador, e mostra antes e depois.

Os dois podem ser rodados mais de uma vez, e nenhum dos dois desliga trigger, porque
`alter table ... disable trigger` exige ser dono da tabela e nem todo projeto do Supabase
dá isso ao papel que roda o editor.

## Como a equipe entra

**O convite é a única porta.** Quem se cadastra sem convite não cai na sua empresa: ele
abre a empresa dele. Isso é de propósito, e resolve o problema clássico de quem vende
software por assinatura ao contrário do jeito ingênuo. O jeito ingênuo é deixar o
domínio do e-mail decidir, e aí duas coisas quebram: quem se cadastra com e-mail da casa
cai calado dentro de uma empresa que talvez nem seja a dele, bloqueado, e se a conta que
abriu aquela empresa some, o domínio fica reservado por uma organização sem nenhum
administrador, onde ninguém mais entra nem é liberado.

O mesmo e-mail pode estar em **várias empresas ao mesmo tempo**: a que ele abriu, mais
cada uma em que aceitou um convite. São perfis diferentes do mesmo login, e o seletor no
alto da barra troca entre eles. É o caso do grupo e da holding, em que a mesma pessoa
responde por mais de uma empresa. Para abrir mais uma, use o seletor, **Abrir outra
empresa**.

O caminho normal é o **convite**, porque a conta já nasce pronta:

1. Em **Equipe**, clique em **Novo convite** e defina o nome, o e-mail, se a pessoa entra como
   colaborador, gestor ou administrador, a área dela e a quem ela responde.
2. Clique em **Copiar convite** e mande a mensagem pronta (WhatsApp, e-mail, o que preferir).
   Ela traz o endereço, o e-mail e um código de seis letras.
3. A pessoa abre o app, escolhe **Criar conta**, informa o código, e **entra direto**, já com o
   papel, a área e a hierarquia que você definiu.

O código só vale uma vez e pode ser cancelado enquanto não for usado.

Deixar a pessoa escolher o próprio papel no cadastro seria um convite a todo mundo virar
administrador, por isso quem define é quem convida. Quem abre a empresa é administrador
dela porque não há mais ninguém ali para dizer que pode.

Um administrador pode **desligar** o acesso de alguém em Equipe. A pessoa continua com a
conta, mas para de enxergar tudo e vê um aviso até alguém religar. É o único caminho que
leva a essa tela hoje.

Administrador cria e edita areas e pode liberar, promover ou tirar o acesso de alguém.
Tirar o acesso devolve a pessoa para a fila de liberação, não apaga nada: os projetos,
os itens e o histórico continuam como estão e você pode liberar de novo depois. Para
apagar um cadastro de vez, use **Authentication > Users** no painel do Supabase.

Qualquer pessoa liberada cria projetos e rotinas, adiciona itens e aprova os checkpoints
em que é a aprovadora. Ninguém consegue se liberar nem se promover sozinho: o banco
recusa, mesmo que a chamada não venha pela tela.

## Como publicar

1. Suba a pasta para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Environment Variables**, cole as mesmas duas variáveis do `.env.local`.
4. Depois do primeiro deploy, no Supabase em **Authentication > URL Configuration**,
   coloque o endereço da Vercel em **Site URL** (é o endereço usado no link de
   recuperação de senha).

## Avisos

O app avisa quando alguém te passa uma tarefa, quando um prazo seu vence, quando um
checkpoint fica pronto para a sua aprovação, quando a tarefa que te travava sai, quando te
chamam na conversa e quando pedem para mexer num prazo seu. Nada além disso: aviso que não
pede nada de você é ruído, e ruído faz a pessoa desligar tudo.

**O sino dentro do app funciona sozinho**, assim que o `supabase/schema.sql` estiver
aplicado. Não precisa de chave nenhuma. O resto desta seção é só para o aviso sair do app e
ir atrás da pessoa.

### Push no navegador e no celular

1. Gere o par de chaves, uma vez:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Ponha no `.env.local` e na Vercel. A pública vai em duas variáveis com o mesmo valor:

   ```
   VAPID_CHAVE_PUBLICA=B...
   NEXT_PUBLIC_VAPID_CHAVE=B...
   VAPID_CHAVE_PRIVADA=...
   VAPID_CONTATO=mailto:avisos@trackward.com.br
   ```

3. Cada pessoa liga o próprio aparelho em **Ajustes > Como quero ser avisado**.

No iPhone e no iPad o push só existe com o app instalado na tela inicial: abrir o menu de
compartilhar do Safari e escolher "Adicionar à Tela de Início". Não é limitação do
TrackWard, é do iOS, e a tela de ajustes diz isso em vez de o botão não funcionar.

### WhatsApp

1. Em **Conectores**, ligue o conector da **Twilio** e cole a chave (a Twilio usa Basic,
   e o console dela mostra o valor pronto). A chave fica cifrada no banco.
2. Em **Ajustes > Como quero ser avisado**, no bloco do administrador, escolha o conector,
   cole o **Account SID** e o **número que assina**, no formato `whatsapp:+14155238886`.
3. Cada pessoa põe o próprio número e liga a chave.

O número precisa estar aprovado pela Meta do lado da Twilio, e cada mensagem tem custo.
Por isso vale deixar ligado o **só o urgente sai do app**, que é o padrão que recomendo.

### O relógio

O aviso de prazo não tem gatilho, porque o fato dele é a passagem do tempo, e tempo não
dispara `insert`. Alguém precisa chamar `/api/avisar` uma vez por dia. A rota é idempotente:
chamar dez vezes não avisa dez vezes.

Antes, duas variáveis no servidor:

```
SUPABASE_SERVICE_ROLE=...      # nunca com NEXT_PUBLIC_: ela abre o banco inteiro
TRACK_AVISOS_SEGREDO=...       # qualquer texto longo e aleatório
```

Depois, uma das três:

- **Vercel Cron.** O `vercel.json` já tem a entrada, às 11h UTC (8h de Brasília). Na Vercel,
  adicione `TRACK_AVISOS_SEGREDO` também como cabeçalho do cron, ou chame pela opção 3.
- **pg_cron mais pg_net**, se o projeto do Supabase tiver as duas extensões:

  ```sql
  select cron.schedule('avisos-do-dia', '0 11 * * *', $$
    select net.http_post(
      url := 'https://app.trackward.com.br/api/avisar',
      headers := '{"authorization":"Bearer SEU_TRACK_AVISOS_SEGREDO"}'::jsonb
    );
  $$);
  ```

- **Qualquer relógio de fora** (cron-job.org, GitHub Actions) batendo em
  `POST /api/avisar` com o cabeçalho `authorization: Bearer <TRACK_AVISOS_SEGREDO>`.

Sem nenhuma das três, o sino continua certo: só o push e o WhatsApp do aviso de prazo
deixam de sair. Os outros avisos saem no momento em que acontecem.

## Os conceitos

| Conceito | O que é |
|---|---|
| **Area** | Área da empresa: Financeiro, Engenharia, Incorporação, Comercial. |
| **Projeto** (esteira) | Tem início, checkpoints e fim. Ex.: implantação de sistema, obra. |
| **Rotina** (ciclo) | Se repete a cada período e guarda o histórico de cada volta. Ex.: fechamento mensal. |
| **Checkpoint** | Nome, critério de saída, aprovador e prazo. |
| **Item** | O que precisa ser feito: descrição, responsável, prazo, feito ou não. |

### Situação, sempre calculada

| Situação | Regra |
|---|---|
| Concluído | o projeto passou pelo último checkpoint |
| Travado | marcado à mão, com motivo e data (dependência externa) |
| Atrasado | algum item pendente ou o próprio checkpoint passou do prazo |
| Vence em breve | algum prazo pendente vence em até 3 dias |
| Em dia | nenhum dos anteriores |

Só dá para aprovar a saída de um checkpoint quando todos os itens estão feitos, o fluxo
não está travado e quem clica é o aprovador daquele checkpoint. Essa checagem roda no
banco, não só na tela.

Ao aprovar o último checkpoint de uma rotina, a volta fecha: entra no histórico (em dia
ou atrasou), o período avança (Set/26 vira Out/26), todos os prazos somam o intervalo da
frequência, os itens são desmarcados e a esteira volta ao primeiro checkpoint.

## Quem vê o quê

Cada pessoa tem um papel e um lugar na hierarquia, definidos em **Equipe**:

| Papel | Enxerga |
|---|---|
| **Colaborador** | As tarefas dele, e as tarefas que precisam sair antes das dele, com o nome de quem responde por elas. |
| **Gestor** | O mesmo, mais tudo de quem está abaixo dele, em qualquer profundidade. |
| **Administrador** | A empresa inteira. |

Marcar "vê a área inteira" numa pessoa abre para ela tudo que acontece na área dela,
mesmo sem participar.

Quando alguém abre uma esteira, vê o processo completo (todos os checkpoints, para ter
contexto) mas só as tarefas que lhe cabem, com um aviso discreto de quantas ficaram de
fora. Quem responde pelo processo, ou seja, o dono, o autor, o gestor do dono, ou um
administrador, é quem mexe em checkpoints, critério de saída e prazos. O executor mexe na
tarefa dele, mas não na data: prazo é compromisso com quem espera.

## Agenda

Compromissos e prazos de tarefas no mesmo lugar, em visão de semana ou de mês. Cada
compromisso tem duas chaves independentes:

| Chave | Ligada | Desligada |
|---|---|---|
| **Ocupa a agenda** | ninguém consegue marcar outra coisa com quem participa naquele horário | fica só como informação, tipo um feriado |
| **Os outros veem o que é** | título, local e observação ficam visíveis para a equipe | a equipe vê apenas "Ocupado", sem saber do que se trata |

As quatro combinações cobrem os casos reais: reunião normal, compromisso pessoal que só
trava o horário, aviso que não trava, e anotação sua.

Ao marcar algo, o app avisa quem entre os convidados já está ocupado. Se o compromisso
conflitante for fechado, o aviso diz apenas o horário, nunca o assunto. Isso vale no
banco, não só na tela: uma função devolve a ocupação de todos sem nunca expor o conteúdo
de quem não convidou você.

Na lente **Equipe** você vê a agenda de todos com a mesma regra. Toque duas vezes num dia
para marcar algo nele.

### Agenda externa (Google, Apple, Outlook)

Em **Ajustes**, cada pessoa cola o endereço do próprio calendário no formato iCal, que os
três serviços oferecem, e a partir daí os horários ocupados dela entram aqui.

**Só os horários entram.** Título, local, convidados e descrição são descartados na
leitura, em `lib/ical.ts`, antes de qualquer coisa ser guardada. Então a equipe passa a
saber que a pessoa não está livre numa terça às 15h, e nada além disso, exatamente como
acontece com um compromisso interno fechado. Compromisso cancelado, e evento marcado
como livre (é o caso dos calendários de feriado), não ocupam nada.

O endereço do calendário é guardado numa tabela que só o próprio dono lê, nem o
administrador: quem tem esse link tem o calendário inteiro. A leitura passa pela rota
`/api/agenda-externa`, que recusa endereços de rede interna, limita tamanho e tempo, e
nunca devolve conteúdo.

A atualização é manual, pelo botão "Atualizar agora". Deixar isso automático depende de
uma tarefa periódica no servidor, que faz sentido montar depois de publicar.

## Conversa

Canais, como em qualquer chat de trabalho, com uma diferença: o que a equipe combina
aqui dentro vira trabalho na esteira, sem ninguém copiar nada para lugar nenhum.

Três tipos de canal:

| Tipo | Quem lê |
|---|---|
| **Aberto** | toda a equipe. Preso a um projeto, vale quem enxerga o projeto |
| **Fechado** | só quem está dentro. Nem o administrador lê de fora, de propósito |
| **Direto** | as duas pessoas da conversa |

Um canal fechado que o chefe lê não é um canal fechado, então o banco não abre exceção
para ninguém. Quem está fora não vê o canal, não vê as mensagens e não chega nelas nem
pela API.

### Da conversa para a esteira

No alto de cada canal existe o botão **Ler a conversa**. Ele lê as últimas mensagens e
devolve o que virou trabalho, em cinco tipos:

- **tarefa**: alguém se comprometeu, pediu a alguém, ou a equipe reconheceu que falta fazer
- **ficou pronto**: alguém disse que uma tarefa que já existe foi entregue
- **prazo**: a conversa mudou a data de uma tarefa que já existe
- **decisão**: ficou definido alguma coisa que precisa entrar no registro da esteira
- **travou**: a frente parou esperando alguém de fora

Cada proposta vem com **o trecho da conversa que deu origem**, para ninguém aceitar no
escuro, e com os campos abertos para ajuste: para qual projeto vai, de quem é e até quando.
Um toque em Aceitar cria a tarefa no checkpoint da vez, e a conversa registra o que saiu
dela.

Nada acontece sozinho até você mandar. Em **Ajustes > Leitura da conversa** dá para trocar
para **Aplicar sozinho**: aí tarefa nova, tarefa concluída e decisão entram direto. Prazo e
trava continuam pedindo licença mesmo nesse modo, porque prazo é compromisso com quem
espera e trava para a frente inteira.

Aceitar uma proposta passa pelas mesmas regras do resto do app. Quem não pode mexer em
prazo não passa a poder porque a sugestão veio da leitura.

### Quem lê

A leitura roda no servidor, em `/api/leitor`, e funciona em duas camadas:

- **com uma chave da Anthropic** em `ANTHROPIC_API_KEY`, quem lê é o modelo, que entende
  contexto, ironia e a frase que se espalha por três mensagens;
- **sem chave**, ou se a chamada falhar, valem as regras de português de `lib/leitor.ts`,
  que reconhecem compromisso, pedido, entrega, decisão e data.

As duas devolvem o mesmo formato, então o app nunca fica sem ler a conversa. A chave, se
existir, mora só no servidor: o navegador manda a conversa e recebe propostas de volta.

## Dependências entre tarefas

Uma tarefa pode apontar de quais outras ela depende, **inclusive de outra esteira e de
outra área**. É o caso do orçamento que não anda enquanto o Financeiro não aprovar a
conta: a tarefa aparece travada, não deixa ser concluída, e mostra quem está segurando.

## Privacidade

Cada esteira tem um de três níveis, escolhido por quem a criou:

| Quem vê | O que significa |
|---|---|
| **Toda a equipe** | aparece para todos, respeitando a regra de quem vê o quê |
| **Só quem eu escolher** | só as pessoas marcadas, mais você, o dono e quem tiver tarefa ou aprovação ali. Nem administrador entra |
| **Só eu** | ninguém além de quem criou |

Tarefas individuais também podem ser privadas, dentro de uma esteira que a equipe vê.

Tudo isso é garantido pelo banco (Row Level Security), não pela interface. Uma pessoa não
liberada, ou logada em outra conta, não consegue ler o registro nem pela API.

Só quem criou um fluxo pode torná-lo privado. E um area com projetos ou rotinas dentro
não pode ser excluído: o banco recusa, para ninguém levar meses de histórico junto sem
perceber.

A navegação tem dois primeiros níveis, e eles não se misturam: **Projetos** (o que tem
começo e fim) e **Áreas** (o que já roda). A tela de uma área mostra só as rotinas dela.
Com mais de um negócio, as rotinas aparecem separadas em um bloco por empresa, e a tela
Projetos deixa você separar por situação, empresa ou área.

## Processos

Em **Processos** a empresa desenha a própria operação, e é aqui que mora o
"personalizável": cada cliente descreve o trilho dele sem ninguém tocar em código.

Um processo tem checkpoints, e cada checkpoint tem tarefas. A diferença em relação a uma
esteira é que aqui as tarefas apontam para uma **área**, não para uma pessoa, e os prazos
são contados em **dias a partir do início**. Por isso o mesmo processo serve para
qualquer obra, qualquer mês e qualquer empresa.

Quando você cria um projeto ou uma rotina e escolhe um processo, a esteira **nasce
distribuída**: cada checkpoint já com o aprovador da área que responde por ele, cada
tarefa já com a pessoa daquela área, e os prazos já virados em datas. O formulário mostra
quem vai receber o quê antes de você confirmar, e dá para trocar qualquer pessoa ali.

Quem decide para quem a tarefa vai é o **responsável padrão da área**, definido ao editar
a área. Área sem responsável cai como "escolher depois".

Desenhar processo é de **gestor ou administrador**. Colaborador usa os processos que
existem, mas não mexe no trilho.

A tela de Rotinas mostra, abaixo das rotinas da área, os processos desenhados para ela, com um botão
para criar a esteira direto dali.

## A trilha da esteira

Dentro de um projeto ou rotina, os checkpoints aparecem como uma trilha vertical: uma
linha fina e uma bolinha por checkpoint. Vazada no que ainda não chegou, **enchendo
conforme o checklist do checkpoint atual anda**, e sólida depois de aprovada. Clicar em
qualquer bolinha abre aquele checkpoint.

## No celular

Abaixo de 840px de largura o app troca de forma: as abas saem e entra uma **barra de
abas no rodapé** (Painel, Você, Agenda, Projetos, Mais), com um botão redondo de criar.
"Mais" abre uma folha por baixo com as áreas, a equipe, os ajustes e o tema.

A tela **Você** é a de trabalho do dia a dia: as pendências separadas em Tudo, Vencidas,
Aprovar e **Travadas**, esta última mostrando o que espera outra pessoa e quem é.

A agenda mostra **um dia por vez** no celular, com a semana selecionável numa faixa em
cima, porque sete colunas de horário não caberiam.

Para instalar como aplicativo, abra o endereço no celular e use "Adicionar à tela de
início". Ele abre sem barra de navegador, com ícone próprio.

## Mais de um negócio

Em **Ajustes** você diz se o app atende um negócio só ou vários. Ligado, cada rotina e
cada projeto passa a ter uma empresa, e o seletor no alto da barra foca o app inteiro
em uma delas por vez. O rótulo é seu: Empresa, Negócio, Unidade, Centro de custo.

Desligado, a interface não menciona empresa em lugar nenhum, e quem usa o app para um
negócio só nunca vê essa complexidade.

Repare que a mesma rotina pode existir para empresas diferentes: "Fechamento mensal" da
Silvereng e "Fechamento mensal" da Simoneto convivem dentro da área Financeiro, cada uma
com seu próprio ciclo e seu próprio histórico.

## Aparência

A linguagem visual é a do design system, descrita em `design-system/DESIGN.md`:
tipografia **Figtree**, chão quase preto, tudo construído com branco a 4 a 20% de alfa
em vez de cinzas novos, e **um único acento lima** (#D0FA3C) para o que faz o trabalho
andar. Rótulos de seção em caixa alta espaçada, formas arredondadas, respiro generoso.

Cor continua sendo informação, não decoração, e o lima é **racionado**: ele marca a uma
ação que faz o trabalho andar, o checkpoint corrente, o ponto de hoje e o anel de foco.
Dois lima na mesma tela é defeito. Âmbar para o que vence, vermelho para o que atrasou,
e nada mais. Em dia, travado e concluído ficam em neutro e se distinguem pela forma do
ícone. As cores de área, pessoa e empresa são dessaturadas, para não competirem.

Temas em **Ajustes > Aparência**: Escuro (o tema que o sistema especifica, medido da
arte), Claro (uma derivação: o próprio DESIGN.md marca modo claro como inferência) e
Automático. O menu do seu avatar, na barra de cima, percorre os três.

No claro há uma diferença que vale conhecer: lima puro não se lê como letra sobre fundo
claro, então letra, ícone e fio fino usam o mesmo acento escurecido (`--ac-tinta`),
enquanto fundo de botão e brilho seguem no lima cheio.

## O design system

Em `design-system/` mora um sistema de peças completo, vindo do Claude Design: 50
componentes, os tokens, os contratos de props e a especificação escrita.

**Ele não é a aparência do app.** O app continua com a sua, a de cima. Este é escuro,
com outra tipografia e acento lima, e serve para desenhar e prototipar. Os dois convivem
sem se tocar porque todo token do design system desce de `[data-ds="trackward"]`, e não
da raiz do documento, então nenhuma tela existente muda de cor por causa dele.

Para ver os componentes desenhando de verdade, `npm run dev` e abra
`http://localhost:3000/design-system`.

Para ver as páginas de referência que vieram do export, fundamentos, componentes estado
por estado e telas inteiras:

```bash
npm run ds:referencia
```

e abra `http://localhost:4321/referencia/`. Elas precisam de servidor porque montam os
componentes lendo os arquivos vizinhos, o que o navegador barra em `file://`.

Como usar, o que é cada pasta e quais são as regras: `design-system/README.md`. A
especificação de cor, tipo, espaço, movimento e voz: `design-system/DESIGN.md`.

## Conferir antes de subir

```bash
npm run typecheck   # tipos
npm run lint        # aderência ao design system
npm run build       # build de produção
```

O lint só cobra a aderência ao design system, e só onde ele é usado. As telas antigas
não entram: elas são anteriores ao sistema e não estão sendo migradas.

## Estrutura do código

```
app/
  (app)/          telas de dentro: painel, pendências, conversa, projetos, área, fluxo, equipe
  api/leitor/     transforma conversa em propostas, com modelo ou com regras
  entrar/         login, criar conta, recuperar senha
  auth/confirmar/ recebe o link enviado por e-mail
componentes/
  Dados.tsx       carrega tudo, escuta o tempo real e concentra as ações
  Modais.tsx      novo area, nova esteira, item, travar, canal, excluir
  TelaChat.tsx    canais, mensagens e as propostas que saem da conversa
  Barra.tsx       a barra de cima: marca, espaço, abas, busca e você
  Shell.tsx       o chassi (barra, conteúdo, rodapé) e os avisos
  Radar.tsx       o radar da operação e a tabela de tracks
  Trilha.tsx      a trilha, deitada (TrilhaH) e em coluna (Trilha)
  Painel.tsx  Minhas.tsx  TelaRotinas.tsx  TelaFluxo.tsx  Equipe.tsx
lib/
  regras.ts       situação, progresso, motivo, pendências
  modelos.ts      cálculo de período das rotinas e o esqueleto em branco
  datas.ts        datas em linguagem de gente
  modo.ts         decide entre banco de verdade e modo demonstração
  tema.ts         os temas
  agenda.ts       horários, conflitos e as grades de semana e mês
  acesso.ts       quem vê o quê e quem pode mudar o quê
  leitor.ts       lê a conversa e separa o que virou trabalho
  local/          a empresa de exemplo e o banco de mentira do navegador
supabase/
  schema.sql      tabelas, RLS e as duas funções de servidor
  exemplo.sql     dados de demonstração
design-system/
  DESIGN.md       a especificação: cor, tipo, espaço, movimento, voz
  styles.css      entrada única dos tokens, tudo sob [data-ds="trackward"]
  index.js        o barril, único caminho de importação
  components/     50 componentes, com contrato de props e regra de uso ao lado
  referencia/     as páginas de referência visual, para consulta
app/design-system/
                  a vitrine, em /design-system
```
