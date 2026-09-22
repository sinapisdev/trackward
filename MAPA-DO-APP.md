# Track, mapa completo do que o app faz hoje

Documento de referência para desenhar o UX/UI. Descreve o que existe e está
funcionando em 21/09/2026, tela por tela, regra por regra, com as ligações entre
as partes. No fim há a lista do que ainda não existe.

Tudo aqui foi lido do código, não escrito de memória.

---

## 1. O que o Track é, em uma frase

Um app que acompanha o andamento de **cada projeto e cada rotina de uma empresa**,
por fluxo e por pessoa, com a conversa interna no mesmo lugar, de onde a IA tira
tarefas e decisões.

A ideia física: imagine uma **esteira de montagem**. O trabalho entra por um lado,
passa por postos de conferência e sai pronto do outro. Cada posto tem uma lista de
tarefas e alguém que dá o aceite. Enquanto o aceite não vem, a esteira não anda.

---

## 2. Os objetos do sistema

Sete peças. Tudo no app é combinação delas.

| Peça | O que é | Analogia |
|---|---|---|
| **Organização** | A empresa cliente. A caixa que guarda tudo. | O prédio |
| **Espaço** | Um lugar onde você trabalha. Um login pode ter vários. | O apartamento que é seu |
| **Empresa** | Subdivisão opcional dentro da organização. | O andar |
| **Área** | Frente que já funciona e não acaba. Guarda as rotinas. | O departamento |
| **Track** | Uma trilha do começo ao fim. Projeto ou rotina. | A esteira |
| **Checkpoint** | Posto de conferência dentro da trilha. | A cancela |
| **Tarefa** | O que alguém faz dentro de um checkpoint. | O item da lista |
| **Anexo** | A prova de que a tarefa saiu. Fica preso à tarefa. | O comprovante grampeado |
| **Decisão** | O que o aprovador respondeu num checkpoint, e por quê. | O carimbo com a rubrica |
| **Pedido de prazo** | A proposta de mover uma data, esperando o sim de quem responde. | O pedido de prorrogação |

### Track: os dois tipos

Esta é a distinção mais importante do produto.

**Projeto** (`tipo: 'esteira'`) tem linha de chegada. Implantação de um sistema,
abertura de uma unidade, contratação de alguém. Anda uma vez e acaba. Mede-se em
**porcentagem**.

**Rotina** (`tipo: 'ciclo'`) se repete. Fechamento mensal, contas a pagar, relatório
semanal. Não acaba, dá voltas, e cada volta fica guardada no histórico. Mede-se em
**quantas estão atrasadas**. Rotina sempre mora dentro de uma área.

Porcentagem numa rotina não diria nada, porque o Financeiro nunca fica "80% pronto".

### Como as peças se encaixam

```
Organização
 └─ Empresa (opcional, se multi estiver ligado)
     ├─ Área ──────────── Rotina ── Checkpoint ── Tarefa
     │   (não acaba)      (dá voltas)
     └─ Projeto ───────── Checkpoint ── Tarefa
         (acaba)
```

Um projeto pode existir **sem área nenhuma**, quando é um negócio novo que ainda não
virou departamento. Uma área sem rotina é uma frente recém criada.

---

## 3. Mapa das telas

### Navegação principal (lateral, no computador)

| Item | Rota | O que mostra | Contador |
|---|---|---|---|
| **Painel** | `/` | Visão geral do dia | Quantos estão atrasados ou travados |
| **Aguardando você** | `/minhas` | Sua fila pessoal | Quantas pendências suas |
| **Conversa** | `/chat` | Chat por canais | Mensagens não lidas |
| **Agenda** | `/agenda` | Compromissos e prazos | Quantos são hoje |
| **Tracks** | `/tracks` | Todos os projetos e áreas | Quantas tracks existem |
| **Desempenho** | `/desempenho` | Como a empresa está entregando | |
| **Processos** | `/processos` | Os moldes reutilizáveis | Quantos moldes |

No alto da lateral: a marca **Track.** e, abaixo, o **seletor de espaço** (a
organização em cima, a empresa em foco embaixo). No rodapé: seu nome, o botão de
tema e o de sair.

### Telas que não estão na lateral

| Rota | Como se chega |
|---|---|
| `/tracks/[id]` | Clicando numa track na lista |
| `/fluxo/[id]` | Botão "Abrir" na track, ou busca do topo |
| `/area/[id]` | Botão "Abrir" numa área |
| `/chat/[id]` | Clicando num canal |
| `/processos/[id]` | Clicando num processo, ou "novo" |
| `/equipe` | Clicando no seu nome no rodapé da lateral |
| `/ajustes` | Engrenagem no topo direito |
| `/projetos` e `/areas` | Visões analíticas antigas, hoje só pelo menu "Mais" do celular |
| `/entrar`, `/nova-senha` | Fora do app, sem lateral |

### Navegação de celular

Abaixo de 840px a lateral some e entra uma **barra de abas no rodapé**: Painel,
Você, Conversa, Tracks, Mais. O "Mais" abre uma folha com Agenda, visão de projetos,
visão de áreas, Processos, Equipe, Ajustes, tema e sair. Há um **botão redondo
laranja** de criar, flutuando acima da barra.

### Barra de topo (todas as telas do app)

Migalha de navegação à esquerda ("Tracks / Implantação do ERP"), busca ao centro
direito com atalho de teclado `/`, e a engrenagem de Ajustes.

**A busca hoje alcança só projetos e rotinas.** Não encontra área, pessoa, canal
nem processo. É a primeira lacuna de UX da lista do fim.

---

## 4. Tela por tela

### 4.1 Painel (`/`)

A primeira coisa que se vê. Três blocos, de cima para baixo.

**Saudação e resumo em uma linha.** "Boa tarde, Leo" com a data, e abaixo uma frase
que conta a situação: "2 esteiras atrasadas, 1 travada e 8 vencendo em até 3 dias.
4 itens aguardam você." Os números são links.

**Filtro "Toda a empresa" ou "Por pessoa"**, mais o botão "+ Novo".

**As pastas 3D.** Uma pasta por frente da empresa: as áreas e os projetos,
misturados e ordenados por urgência. Rola de lado com o mouse, com arraste ou com as
setas. A pasta da vez fica acesa em laranja e maior, as outras vão se afastando em
perspectiva. No miolo branco de cada uma:

- **Projeto**: a porcentagem e o nome do checkpoint da vez
- **Área**: quantas tarefas abertas e "3 rotinas, 1 atrasada"

No rodapé da pasta: quantas pessoas estão dentro e o rótulo (Área ou Projeto).
Clicar leva para a tela daquela frente.

**Aguardando você** (até 4 linhas) e **Radar**, que é a lista das tracks agrupadas
por situação, com uma coluna lateral de apoio.

### 4.2 Aguardando você (`/minhas`)

A fila pessoal. Abas: Tudo, Vencidas, Aprovar, Travadas.

Cada linha diz o que é, de qual track veio, de qual checkpoint, e quando vence, com
data relativa ("Hoje", "Amanhã", "em 4 dias", "há 2 dias"). Duas naturezas de
pendência:

- **Tarefa** que você executa
- **Aprovação** de checkpoint, que só aparece quando todas as tarefas dele estão
  prontas

Quando algo seu está travado por tarefa de outra pessoa, a linha mostra quem está
segurando.

### 4.3 Tracks (`/tracks` e `/tracks/[id]`)

**A porta única para tudo que a empresa acompanha.** Duas colunas.

**Coluna esquerda**: busca, grupo **Projetos** (ordenados por urgência, com o ícone
de situação e o checkpoint da vez), grupo **Áreas** (com quantas rotinas e quantas
atrasadas). No rodapé, "Novo projeto" e "Nova área".

**Coluna direita**: a trilha da track escolhida, em quadro de fundo pontilhado.

- **Cabeçalho**: nome, área, e uma faixa de selos (situação, dono com avatar,
  porcentagem, quantas voltas, quando foi criada). À direita, "Ajustes da track"
  e "Abrir".
- **O quadro**: nós ligados por setas, da esquerda para a direita. Início (raio),
  os checkpoints, o botão "+ Checkpoint" e o Fim (bandeira).
  - Checkpoint **aprovado**: selo laranja de visto
  - Checkpoint **da vez**: borda laranja acesa, com brilho
  - Checkpoint **futuro**: apagado
  - Checkpoint **travado**: borda vermelha com cadeado
  - Dentro de cada nó: nome, quem aprova, "2/5" de tarefas prontas e os avatares
- **Zoom** no canto inferior esquerdo: afastar, porcentagem, aproximar, caber na tela.
  Arrastar o fundo move o quadro.
- A track **abre em 100% e já rolada até o checkpoint da vez**, porque é a pergunta
  de quem abre: onde isto está agora?

**Projeto tem uma faixa. Área tem uma faixa por rotina**, empilhadas, cada uma com o
nome da rotina e a situação. Quando a mesma rotina existe em duas empresas, o nome da
empresa entra na faixa.

**Clicar num checkpoint** abre o painel lateral com: o critério de passagem ("Só passa
quando"), quantas tarefas estão prontas, quem aprova, o prazo, e a lista de tarefas
com responsável e data. Dá para **marcar tarefa como feita ali mesmo**, se você puder
concluí-la, e criar tarefa nova.

**Editar a trilha no quadro** (só para quem responde pelo processo): o lápis abre o
checkpoint em edição, com nome, critério, quem aprova e prazo, mais os botões de
mover para antes, mover para depois e apagar.

**Criar uma track** continua pedindo o que pedia (tipo, nome, área, empresa, dono, quem
vê, e opcionalmente um processo de origem), mas agora **deixa a pessoa no quadro**,
que é onde a trilha se desenha.

### 4.4 A track aberta (`/fluxo/[id]`)

A tela de trabalho, mais densa que o quadro.

**O trilho**, no alto: uma linha contínua sobre vidro, com a parte andada acesa em laranja
e com brilho, as estações em cima dela, e a da vez maior que as outras. O anel da estação
corrente **enche conforme o checklist anda**, então dá para ver o progresso de dentro do
checkpoint sem abrir o checkpoint. A estação que **já voltou atrás** leva uma marca
vermelha. Com a track travada, o trilho inteiro fica vermelho. No fim do trilho, a
bandeira da chegada, que acende quando a track termina.

Clicar numa estação abre aquele checkpoint embaixo. O trilho rola de lado quando há
muitos checkpoints, e abre já posicionado na estação da vez.

Dentro do checkpoint aberto: o critério de saída, a lista de tarefas com caixa de
marcar, responsável, prazo e ícone de cadeado quando é tarefa privada. Cada tarefa
pode ser editada, removida ou ter dependências definidas.

Embaixo de cada tarefa ficam os **anexos** dela: o comprovante, o contrato assinado, a
foto. Arrastar um arquivo em cima funciona, e no celular o botão abre a câmera junto da
galeria. Imagem grande encolhe sozinha antes de subir, para 2000px de lado, o que numa
foto de celular corta 4 MB para uns 300 KB sem tirar a legibilidade. PDF e planilha
passam intactos. O limite é 10 MB por arquivo. Só quem pode concluir a tarefa pode
anexar nela; remover é de quem anexou ou de quem responde pelo processo.

**O botão de decidir** abre a tela de decisão, descrita abaixo. Fica desabilitado
enquanto a track estiver travada e para quem não é o aprovador daquele checkpoint.

No alto: "Editar esteira", "Travar" ou "Destravar" e excluir.

Abaixo: **Voltas anteriores** (histórico de rotina, cada volta marcada como em dia ou
atrasada) e **Atividade** (linha do tempo do que aconteceu, podada em 40 registros por
track).

### 4.4b Decidir a saída de um checkpoint

O momento de maior valor do app, e o único lugar onde alguém assina embaixo.

A tela mostra, de cima para baixo: o **critério** que a equipe combinou para aquele
checkpoint; um placar com quantas entregas saíram, **quantas têm prova anexada** e
quantas ainda estão em aberto; e a lista das tarefas, cada uma com quem fez, o prazo, os
anexos abertos ali mesmo, e um aviso em laranja quando a entrega veio **sem prova**.

Se aquele checkpoint já foi devolvido ou ressalvado antes, o histórico aparece no fim,
com quem decidiu, quando e por quê.

**Três saídas, em vez de uma:**

| Saída | O que acontece |
|---|---|
| **Aprovar** | Segue para o próximo checkpoint |
| **Aprovar com ressalva** | Segue, e a pendência **vira tarefa do próximo checkpoint**, com prazo e dono |
| **Devolver** | Não segue. As tarefas que o aprovador marcar **voltam a ficar em aberto** |

Devolver e ressalvar **exigem motivo escrito**, porque "devolvido" sozinho não diz a
ninguém o que fazer. Aprovar continua exigindo o checklist completo; devolver não, porque
devolver é justamente o caso em que está tudo marcado e o aprovador discorda.

Tudo isso é validado no banco, na função `decidir_etapa`, não só na tela.

No celular a tela sobe como folha, com as três saídas empilhadas.

### 4.4c Desempenho (`/desempenho`)

O Painel responde "o que precisa de mim agora". Esta tela responde outra pergunta,
"como estamos indo", e por isso é outra tela. Períodos de 7, 30 ou 90 dias.

**Quatro números**, cada um comparado ao período anterior:

| Número | O que mede |
|---|---|
| **Entregues** | Quantas tarefas ficaram prontas no período |
| **No prazo** | Das entregas com prazo, quantas saíram até a data combinada |
| **Aprovado de primeira** | Dos checkpoints decididos, quantos passaram sem voltar para trás |
| **Com prova** | Das entregas, quantas têm comprovante, contrato ou foto anexada |

Abaixo: as **entregas ao longo do tempo**, em barras, com a parte fora do prazo em
vermelho; **onde está preso**, com o checkpoint, há quantos dias, quem se aguarda e
quantas tarefas faltam; a **saúde de cada área**; e a **carga de cada pessoa**, com o que
está na mão dela, o que está atrasado e o que ela entregou.

**Cada um mede o que enxerga.** O colaborador vê os próprios números, o gestor vê os do
time dele, o administrador vê os da empresa. Isso não é uma regra escrita nesta tela: é
consequência de os dados já chegarem filtrados pelo banco.

**A regra que vale para a tela inteira: número que não dá para calcular não aparece.**
Tarefa concluída antes de o app passar a guardar a hora da conclusão não entra em nenhuma
conta de período, e o rodapé diz quantas ficaram de fora. Porcentagem sem base mostra um
traço, não um zero, porque zero é uma afirmação e traço é a ausência dela.

**Uma limitação honesta:** rotina apaga as próprias tarefas a cada volta, então o
histórico de entregas dela não acumula, só o da volta corrente. Projeto acumula tudo. O
que guarda o passado de uma rotina é o registro de voltas, em outra tela.

### 4.5 Área (`/area/[id]`)

A frente que já funciona, e **só o que se repete dentro dela**. Projetos ligados à área
não aparecem aqui, de propósito: área é o que roda sempre, projeto é o que passa.

Lista das rotinas com situação, filtro por pessoa, e os processos disponíveis para a
área. Dá para criar rotina, editar e excluir a área.

### 4.6 Conversa (`/chat` e `/chat/[id]`)

Chat interno estilo Slack, com a conversa virando trabalho.

**Coluna esquerda**: os canais em três grupos, Canais (gerais), Projetos (presos a uma
track) e Conversas (diretas). Cada linha mostra o nome, um **@** laranja quando
chamaram você, e a contagem de não lidas. Uma faísca aparece quando há propostas da
leitura esperando.

**Três tipos de canal**:
- **Aberto**: toda a equipe entra
- **Fechado**: só quem foi posto dentro. **Nem o administrador lê de fora.** Isso é
  garantido no banco, não só na tela
- **Direto**: entre duas pessoas

Um canal pode ser preso a uma **área** ou a um **projeto**. Preso a um projeto, quem
enxerga a track enxerga a conversa.

**Na conversa**: mensagens agrupadas por autor (o cabeçalho só volta quando muda quem
fala ou passam 6 minutos), separadores de dia, mensagens de sistema com faísca.

- **Chamar pelo nome**: digite `@` e escolha. O nome fica marcado em laranja, a
  mensagem de quem foi chamado acende com barra laranja, e o canal ganha um **@** na
  lista. E-mail não vira menção, acento não atrapalha, `@Analu` não chama a Ana
- **Responder**: cada mensagem tem os botões de responder e apagar. Respondendo, a
  citação aparece em cima da resposta, e clicar nela leva até a original e pisca
- Apagar vale só para as suas mensagens

**"Ler a conversa"** é o botão que aciona a IA. Ela devolve **propostas**, nunca
mudanças diretas. Cinco tipos:

| Proposta | O que faz, se aceita |
|---|---|
| **tarefa** | Cria uma tarefa nova no checkpoint da vez |
| **prazo** | Muda o prazo de uma tarefa existente |
| **concluir** | Marca uma tarefa como pronta |
| **decisao** | Registra uma decisão na linha do tempo |
| **trava** | Marca a track como travada, com o motivo |

Cada proposta mostra **o trecho da conversa que deu origem**, para ninguém aceitar no
escuro. Existe um modo "Aplicar sozinho" em Ajustes, e **mesmo nele prazo e trava
nunca entram sozinhos**, porque prazo é compromisso com quem espera.

Duas implementações, mesma saída: com `ANTHROPIC_API_KEY` quem lê é o modelo Claude;
sem chave, ou se a chamada falhar, entram as regras de português (compromisso, pedido,
entrega, decisão, datas por extenso). **O app nunca fica sem ler.**

### 4.7 Agenda (`/agenda`)

Compromissos e prazos no mesmo lugar. Modo **semana** ou **mês**; no celular, um dia
por vez.

Prazos de tarefas entram como compromissos de dia inteiro, ligados à track de origem.

**Um compromisso tem duas chaves independentes**:
- **"ocupa a agenda"**: os outros veem que você está ocupado
- **"os outros veem o que é"**: mostra ou esconde o título

Quem não pode ler recebe só a faixa de ocupação, sem título, sem local, sem nota.

**Agenda externa** (Google, Apple, Outlook): liga-se por um link iCal secreto, colado
em Ajustes. O que vem de fora entra **apenas como livre ou ocupado**. Título, local e
descrição são descartados na leitura, de propósito.

### 4.8 Processos (`/processos` e `/processos/[id]`)

Onde a empresa **descreve a própria operação**, uma vez, para reusar sempre.

Um processo é um molde de trilha: checkpoints, cada um com critério, área que aprova e
prazo em **dias a partir do início**; dentro de cada um, as tarefas, cada uma apontando
para uma **área**, não para uma pessoa.

É isso que faz o mesmo molde servir a qualquer cliente e a qualquer mês. Ao criar uma
track a partir de um processo, ela **nasce distribuída**: a área do checkpoint vira o
aprovador, a área da tarefa vira o responsável (pelo responsável padrão da área), e os
dias viram datas reais a partir da data de início escolhida.

Separados em moldes de projeto e moldes de rotina. Dá para duplicar e excluir. Só
admin e gestor editam.

### 4.9 Equipe (`/equipe`)

Três blocos.

**Aguardando liberação**: quem se cadastrou e ainda não foi liberado.

**Convidar alguém**: quem convida define **papel, área e gestor antes do cadastro**, e
sai um código de 6 letras para copiar e mandar. O papel nunca é escolhido por quem se
cadastra, senão todo mundo viraria admin.

**Com acesso**: cada pessoa com papel, área, a quem responde, quantas pessoas tem
abaixo, e se vê a área inteira.

Numa conta pessoal a tela inteira vira um convite para trabalhar junto com alguém.

### 4.10 Ajustes (`/ajustes`)

| Seção | O que faz |
|---|---|
| **Organização** | O nome que aparece no alto da lateral |
| **Leitura da conversa** | Liga ou desliga a IA, e escolhe entre sugerir e aplicar sozinho |
| **Mais de um negócio** | Liga a divisão por empresa e escolhe o rótulo (Empresa, Negócio, Unidade, Centro de custo) |
| **Empresas** | A lista delas, com sigla e cor |
| **Minha agenda externa** | Cola o link iCal, mostra quantos blocos vieram, desliga |
| **Aparência** | Escuro, Claro ou Automático. Vale só para você, neste navegador |
| **Modo demonstração** | Aparece só quando o app está rodando sem banco |

Com "mais de um negócio" **desligado**, a interface não menciona empresa em lugar
nenhum. É o padrão.

### 4.11 Entrar e criar conta (`/entrar`)

**Três caminhos para a conta nascer**, escolhidos numa tela de cartões:

1. **Para a minha equipe**: você abre o espaço da empresa e vira o dono
2. **Só para mim**: suas áreas, seus projetos, suas rotinas. Dá para convidar alguém
   depois sem recomeçar
3. **Tenho um convite**: entra com o código de 6 letras, já no papel definido por quem
   convidou

Sem convite, o **domínio do e-mail decide**: se a empresa daquele domínio já existe, a
pessoa entra nela como colaboradora, liberada só se a empresa tiver ligado a entrada
por domínio (padrão desligado). Domínios pessoais (gmail, hotmail e companhia) nunca
são reservados por ninguém.

---

## 5. As regras que atravessam tudo

### 5.1 Situação, sempre calculada

Nunca digitada. Olha **só o checkpoint atual**, porque é nele que o trabalho está.

| Situação | Quando | Cor |
|---|---|---|
| **Concluído** | A track acabou | Neutra |
| **Travado** | Alguém travou, com motivo escrito | Roxo ou neutro com cadeado |
| **Atrasado** | Alguma tarefa ou o checkpoint passou do prazo | Vermelho |
| **Vence em breve** | Falta 3 dias ou menos | Laranja |
| **Em dia** | Nenhum dos acima | Neutra |

Ordem de urgência em todas as listas: atrasado, travado, vence em breve, em dia,
concluído.

**Progresso** = (checkpoints vencidos + fração do checklist do atual) ÷ total.

### 5.2 Quem vê o quê

A regra: **cada pessoa vê o que é dela e o que trava o que é dela.** Quem tem gente
abaixo vê também o trabalho dessa gente, para poder cobrar.

**Quem aprova um checkpoint lê as tarefas dele**, e os anexos delas. Não é exceção à
regra: é a definição de aprovar, ninguém dá aceite no que não pode ler. Tarefa privada
continua fora.

Uma track aparece para você quando você (ou alguém abaixo de você):
- é autor ou dono
- aprova algum checkpoint
- responde por alguma tarefa
- tem tarefa que **depende** de tarefa dali

Mais três casos: administrador vê tudo; quem tem "vê a área inteira" vê tudo da própria
área; e a visibilidade escolhida na criação da track manda.

**Três níveis de visibilidade de track**: toda a equipe, só quem eu escolher, ou só eu.
Em "só quem eu escolher", **nem o admin entra sem convite**. Participar sempre dá
acesso, em qualquer nível: não faria sentido ter tarefa numa track que você não pode
abrir.

### 5.3 Quem pode o quê

| Ação | Quem pode |
|---|---|
| Desenhar checkpoints, critério e **prazo** | Quem manda no processo |
| Editar tarefa (texto, responsável, remover) | Quem manda no processo, o autor da tarefa, ou o responsável |
| **Marcar como feito** | O responsável, seu gestor, ou quem manda no processo |
| **Decidir o checkpoint** (aprovar, ressalvar, devolver) | Só o aprovador daquele checkpoint |
| **Anexar prova numa tarefa** | Quem pode concluir a tarefa |
| **Aceitar ou recusar um pedido de prazo** | Quem responde pela track da tarefa que ia se mexer |
| **Remover um anexo** | Quem anexou, ou quem manda no processo |
| Convidar, liberar e definir papel | Admin |

"Quem manda no processo" = admin, ou autor, ou dono da track, ou o gestor do dono.

**Prazo é compromisso com quem espera, então não é o executor que muda.** É a regra que
mais aparece na interface, em forma de botão que não existe para quem não pode.

O **dono da organização** não pode ser desativado nem rebaixado, nem por outro admin.

### 5.4 Dependências entre tarefas

Uma tarefa pode depender de outras, **inclusive de outra track**. Enquanto a tarefa que
trava não sai, a travada mostra o cadeado e diz quem está segurando. Isso é o que faz a
tarefa de outra pessoa aparecer na sua tela mesmo sem você participar da track dela.

### 5.5 Quando um prazo anda, o que depende dele anda junto

Cascata automática não serve, porque existe data que ninguém pode mover. Então mudar um
prazo abre um **aviso antes de gravar qualquer coisa**, com a conta feita e separada em
três consequências:

| Grupo | O que acontece |
|---|---|
| **Não anda** | A data é firme. Fica onde está, e alguém tem que dar um jeito de a coisa acontecer do mesmo jeito |
| **Pede aceite** | É de outra track. Quem responde por ela decide, e até decidir a data não muda |
| **Anda junto** | É desta mesma track, e anda guardando a folga que tinha |

Duas regras por baixo disso:

**Só anda o que quebrou.** Tarefa com folga que absorve o atraso fica onde está.

**O que separa "anda" de "pede" é a track, não o cargo.** Dentro da sua você remarca,
porque responde por ela inteira. Fora dela é pedido, **inclusive para o administrador**:
ele pode tudo, e é justamente por isso que o aceite existe.

**Data firme** é uma marca na tarefa (prazo legal, data de cliente, evento marcado). Ela
não anda nunca, e também **não empurra quem vem depois dela**. Para mudá-la é preciso
primeiro tirar a marca, que é uma decisão e não um efeito colateral.

Os pedidos aparecem no **alto de Aguardando você**, antes das tarefas, porque pedido
parado é pior do que tarefa parada: enquanto ninguém decide, duas pessoas trabalham com
datas diferentes na cabeça. Recusar deixa a data onde está e **derruba os pedidos que
nasceram daquele**, porque foram calculados supondo que ele andaria.

---

## 6. Conta, espaços e organizações

### Um login, vários Tracks

A mesma pessoa pode ter o **Track pessoal** e o **Track da empresa**, com o mesmo
e-mail e a mesma senha. O seletor no alto da lateral troca entre eles.

Por dentro: o perfil deixou de usar o id do login como chave (se usasse, cada pessoa só
existiria em um lugar). Agora tem id próprio, um `user_id` que aponta para o login, e a
tabela `sessoes` diz qual perfil está em uso agora.

### Multi-organização

Cada empresa cliente é uma **organização**. Todas as 22 tabelas têm `org_id`, e todas as
políticas exigem que a linha seja da sua organização.

A analogia: um **prédio**. Cada empresa tem seu apartamento, com fechadura própria. O
porteiro (o banco) não deixa ninguém subir no andar errado, mesmo sabendo o número do
apartamento.

O `org_id` é **carimbado por gatilho no servidor**, nunca enviado pelo navegador.
Forjar é impossível: se o navegador mandar um `org_id` de outra empresa, o gatilho
sobrescreve pelo seu.

---

## 7. Segurança e privacidade

O que já está construído, da forma que grandes empresas de tecnologia fazem:

- **RLS (Row Level Security)** no Postgres: a regra de quem vê o quê mora no banco, não
  na tela. Mesmo que alguém contorne a interface, o banco não entrega a linha
- **67 políticas** de acesso, todas com a condição da organização
- **Funções security definer** para evitar recursão: a política de um canal não pode
  consultar a tabela de canais, senão gira em falso
- **Vistoria automática** (`furos_na_parede()`): roda no fim do arquivo de schema e
  **recusa subir** se alguma tabela ficar sem `org_id`, sem RLS, sem gatilho ou com
  política sem a condição da organização. Ela achou dois furos antigos de verdade
- **Canal fechado é fechado para o admin também.** Um canal privado que o chefe lê não
  é privado
- **Agenda externa entra sem conteúdo**, só como ocupação
- **Tarefa privada** (`priv`) só aparece para o autor e para quem manda no processo
- A **chave da IA mora só no servidor**. O navegador manda a conversa e recebe
  propostas, nunca o contrário
- Decisão de checkpoint é validada **no Postgres** (`decidir_etapa`), não só na tela
- **O anexo se abre exatamente quando a tarefa dele se abre.** O balde de arquivos é
  fechado, nada é público, e cada leitura passa por uma URL assinada que vale 5 minutos.
  Quem não pode ver a tarefa recebe 404, mesmo sabendo o endereço exato. O caminho do
  arquivo começa pelo id da organização, o que barra no envio quem tentar escrever na
  pasta de outra empresa

O schema é validado rodando num Postgres local antes de ir para produção. Hoje passam
9 testes de privacidade de chat, 10 de multi-organização e 7 de multi-espaço.

---

## 8. Modo demonstração

Sem chaves no `.env.local`, o app roda **inteiro no navegador**, com uma empresa de
exemplo neutra (Grupo Meridiano, com Financeiro, Operações, Comercial e Pessoas). Dá
para criar conta, entrar, criar áreas, projetos e rotinas, conversar e tudo mais.

O ponto de troca é único. Quando as chaves do Supabase entrarem, o mesmo app passa a
falar com o banco de verdade, sem mudar uma linha de tela.

---

## 9. Vocabulário visual

Para o UX manter coerência.

**Paleta**: preto (#080808), branco e laranja (#FF7A1A no escuro, #E8620A no claro).
Vermelho é a única exceção, e existe só porque atraso precisa gritar diferente do que
apenas pede atenção.

**Tipografia**: Urbanist.

**A regra que vale acima de tudo: cor é informação, não decoração.** Laranja marca onde
a coisa está agora. Vermelho marca o que passou do prazo. Tudo o mais é neutro e se
distingue pela forma, não pela cor.

**Datas são sempre relativas** na interface: "Hoje", "Amanhã", "em 4 dias", "há 2 dias".

**Sem travessão** em nenhum texto da interface.

**Elementos recorrentes**: ícones de status pequenos, avatares com iniciais e cor por
pessoa, bolinha que enche, selo de visto, cadeado para travado e para privado.

---

## 10. O que ainda não existe

A lista para o UX cobrir.

### Lacunas do que já está construído

1. **A busca do topo só encontra projeto e rotina.** Não encontra área, pessoa, canal
   nem processo
2. **Aviso com o app fechado não existe.** A menção chega na pessoa dentro do app; com
   o app fechado, ninguém fica sabendo. Caminhos: notificação do navegador (de graça,
   computador e Android; no iPhone só se a pessoa adicionar o Track à tela de início) e
   resumo por e-mail
3. **Busca dentro da conversa** não existe
4. **Editar a própria mensagem** não existe (só apagar)
5. **Reações** não existem
6. **`@todos`** para chamar o canal inteiro não existe
7. **O quadro não arrasta.** Mover checkpoint é por botão (antes, depois), não por
   arrastar o nó
8. **Não há ramificação no quadro.** A trilha é uma linha reta: não existe o losango
   "deu certo? sim / não" com caminhos diferentes. Isso é mudança no modelo de dados,
   não só na tela
9. **As telas `/projetos` e `/areas` ficaram órfãs.** Elas têm filtros por pessoa,
   agrupamento por situação, área ou empresa, e uma agenda de 7 dias que a tela Tracks
   não tem. Ou esses filtros entram no Tracks, ou as duas telas se aposentam

### Pedidos já feitos e ainda não construídos

10. **Distribuição de tarefas com IA** (faz sentido agora que os processos existem e dão
    de onde aprender)
11. **Modelos por setor** no primeiro cadastro
12. **Integração com WhatsApp**, adiada de propósito em 21/09/2026. Entrada livre e
    saída racionada é o desenho recomendado
13. **As três telas de segurança**: log de acesso, exportar tudo, excluir organização.
    São o que um cliente grande pede antes de assinar
14. **App nativo de celular**

### Pendências fora do código

15. Criar o projeto no Supabase (região São Paulo), rodar o `schema.sql`, desligar
    "Confirm email" e trazer a Project URL e a anon key
16. Criar as contas de GitHub e Vercel para publicar
17. Configurar a `ANTHROPIC_API_KEY` para a leitura da conversa sair das regras e passar
    para o modelo
