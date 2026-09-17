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
use o botão de pessoas no rodapé da lateral. Para voltar aos dados originais, vá em
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

**3. Primeira conta**

Rode `npm run dev` de novo e crie sua conta. **A primeira conta criada vira
administradora e já entra liberada.** Se quiser ver as telas cheias antes de cadastrar
o real, rode `supabase/exemplo.sql` no SQL Editor.

Para voltar ao modo demonstração a qualquer momento, esvazie as duas linhas do
`.env.local`, ou acrescente `NEXT_PUBLIC_MODO=local`.

## Como a equipe entra

O caminho normal é o **convite**, porque a conta já nasce pronta:

1. Em **Equipe**, clique em **Novo convite** e defina o nome, o e-mail, se a pessoa entra como
   colaborador, gestor ou administrador, a área dela e a quem ela responde.
2. Clique em **Copiar convite** e mande a mensagem pronta (WhatsApp, e-mail, o que preferir).
   Ela traz o endereço, o e-mail e um código de seis letras.
3. A pessoa abre o app, escolhe **Criar conta**, informa o código, e **entra direto**, já com o
   papel, a área e a hierarquia que você definiu.

Quem se cadastra **sem** convite fica barrado, sem enxergar nada, até um administrador liberar
em Equipe. O código só vale uma vez e pode ser cancelado enquanto não for usado.

Deixar a pessoa escolher o próprio papel no cadastro seria um convite a todo mundo virar
administrador, por isso quem define é quem convida.

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

A tela de cada área mostra, na lateral, os processos desenhados para ela, com um botão
para criar a esteira direto dali.

## A trilha da esteira

Dentro de um projeto ou rotina, os checkpoints aparecem como uma trilha vertical: uma
linha fina e uma bolinha por checkpoint. Vazada no que ainda não chegou, **enchendo
conforme o checklist do checkpoint atual anda**, e sólida depois de aprovada. Clicar em
qualquer bolinha abre aquele checkpoint.

## No celular

Abaixo de 840px de largura o app troca de forma: a lateral sai e entra uma **barra de
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
cada projeto passa a ter uma empresa, e o seletor no alto da lateral foca o app inteiro
em uma delas por vez. O rótulo é seu: Empresa, Negócio, Unidade, Centro de custo.

Desligado, a interface não menciona empresa em lugar nenhum, e quem usa o app para um
negócio só nunca vê essa complexidade.

Repare que a mesma rotina pode existir para empresas diferentes: "Fechamento mensal" da
Silvereng e "Fechamento mensal" da Simoneto convivem dentro da área Financeiro, cada uma
com seu próprio ciclo e seu próprio histórico.

## Aparência

A linguagem visual vem de uma referência escolhida pelo Leo (o projeto Harbor, no
Behance): tipografia **Plus Jakarta Sans**, fundo off-white quente, preto como ação,
cinza quente no secundário e **um único acento laranja** (#F98B05) para o que pede
atenção. Rótulos de seção em caixa alta espaçada, formas arredondadas, respiro generoso.

Cor continua sendo informação, não decoração: laranja para o que vence, vermelho para o
que atrasou, e nada mais. Em dia, travado e concluído ficam em neutro e se distinguem
pela forma do ícone. As cores de área, pessoa e empresa são tons terrosos dessaturados,
para conviverem com o off-white sem competir.

Temas em **Ajustes > Aparência**: Claro (fiel à referência), Escuro (a mesma linguagem
invertida, em preto quente) e Automático. O botão no rodapé da lateral percorre os três.

## Estrutura do código

```
app/
  (app)/          telas de dentro: painel, minhas pendências, projetos, área, fluxo, equipe
  entrar/         login, criar conta, recuperar senha
  auth/confirmar/ recebe o link enviado por e-mail
componentes/
  Dados.tsx       carrega tudo, escuta o tempo real e concentra as ações
  Modais.tsx      novo area, nova esteira, item, travar, excluir
  Shell.tsx       navegação lateral e avisos
  Painel.tsx  Minhas.tsx  TelaArea.tsx  TelaFluxo.tsx  Equipe.tsx
lib/
  regras.ts       situação, progresso, motivo, pendências
  modelos.ts      cálculo de período das rotinas e o esqueleto em branco
  datas.ts        datas em linguagem de gente
  modo.ts         decide entre banco de verdade e modo demonstração
  tema.ts         os temas
  agenda.ts       horários, conflitos e as grades de semana e mês
  acesso.ts       quem vê o quê e quem pode mudar o quê
  local/          a empresa de exemplo e o banco de mentira do navegador
supabase/
  schema.sql      tabelas, RLS e as duas funções de servidor
  exemplo.sql     dados de demonstração
```
