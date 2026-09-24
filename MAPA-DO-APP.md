# TrackWard, mapa completo do que o app faz hoje

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
| **Memória** | O que o app aprendeu sobre esta empresa. Visível e apagável. | O caderninho do funcionário antigo |

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

### Navegação principal (barra de cima, no computador)

| Item | Rota | O que mostra | Contador |
|---|---|---|---|
| **Forward** | `/` | As tarefas do dia, a conversa (ou as notas) e o radar, lado a lado | |
| **Meu trabalho** | `/minhas` | Sua fila pessoal, com a gaveta de detalhe | Quantas pendências suas |
| **Tracks** | `/tracks` | Objetivos e rotinas juntos, com filtro por tipo e por área | |
| **Processos** | `/processos` | Os moldes reutilizáveis | |
| **Conversa** | `/chat` | Chat por canais | Mensagens não lidas |
| **Agenda** | `/agenda` | Compromissos e prazos | |
| **Mais** | menu | Avisos, Relatórios, Desempenho, todas as tracks, Notas, Agentes, Conectores | |

À esquerda da barra: a marca **TrackWard** e o **seletor de espaço** (a organização, ou a
empresa em foco quando o app separa por empresa). À direita: a busca, o **sino** com a contagem do que
você ainda não leu, os atalhos de Equipe e Ajustes, e o seu avatar, que abre tema
e saída.

No pé de toda tela: `TrackWard move work forward.` de um lado, o nome do espaço do outro.

### Telas que não estão na barra

| Rota | Como se chega |
|---|---|
| `/tracks` e `/tracks/[id]` | Menu "Mais", ou "Ver todas as tracks" no radar |
| `/fluxo/[id]` | Clicando numa track em qualquer lista, ou pela busca |
| `/area/[id]` | Clicando numa área na coluna da tela Rotinas |
| `/chat/[id]` | Clicando num canal |
| `/processos/[id]` | Botão "Editar" na lateral de Processos, ou "novo" |
| `/avisos` | Sino na barra, em "Ver todos os avisos" |
| `/equipe` | Ícone de pessoas na barra, ou o menu do avatar |
| `/ajustes` | Engrenagem na barra, ou o menu do avatar |
| `/entrar`, `/nova-senha` | Fora do app, sem barra |

### Navegação de celular

Abaixo de 840px as abas saem e entra uma **barra de abas no rodapé**: Painel,
Você, Conversa, Tracks, Mais. O "Mais" abre uma folha com Agenda, Relatórios, Desempenho,
visão de projetos, visão de áreas, Processos, Agentes, Equipe, Ajustes, tema e sair. Há um
**botão redondo** de criar flutuando acima da barra, em vidro grafite: o lima fica
reservado para a ação que faz o trabalho andar.

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
quantas tarefas faltam; a **saúde de cada área**; a **sobrecarga de cada pessoa** (abaixo);
e a **carga de cada pessoa**, com o que está na mão dela, o que está atrasado e o que ela
entregou.

**A sobrecarga**, em bloco próprio, é um índice de 0 a 100 por pessoa. A definição importa:
sobrecarga aqui **não é tamanho de fila**, é a fila não caber no tempo que a pessoa tem, no
ritmo em que ela costuma entregar. Quem tem vinte tarefas e entrega vinte por semana não
está sobrecarregado; quem tem cinco e entrega uma por mês está.

| | |
|---|---|
| **Com folga** | A fila cabe no tempo que tem |
| **No limite** | Dá, mas sem folga para imprevisto |
| **Em sobrecarga** | A fila não cabe no tempo que tem |
| **Pouco para medir** | Falta histórico para dizer algo |

Dois motivos bastam sozinhos para acender: **prazo já perdido** (o que se vê) e **fila que
não fecha** (o que se prevê). Carregar mais que os colegas só agrava, porque pode ser o
trabalho sendo diferente.

**As partes aparecem sempre**, não só o número: "1 de 7 atrasada, neste ritmo são 105 dias
de fila para 5 de prazo, 21 vezes o prazo". Assim o número é discutível. Um 88 sozinho não
se discute, só se obedece.

**E quando o time inteiro está com fila maior que o prazo**, a tela diz isso em vez de
pintar todos de vermelho: não é sobrecarga de uma pessoa, é mais trabalho do que o time
vaza, e tirar de um para dar a outro não resolve.

O índice aparece em três lugares: aqui, **no formulário de tarefa no instante em que se
escolhe o responsável** (que é onde a decisão acontece), e na distribuição pela IA, que
troca a sugestão quando há alguém da mesma área com folga.

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

**A linguagem de comandos.** Uma linha que começa por barra é ordem, e acontece na hora:

| comando | o que faz |
| --- | --- |
| `/tarefa Conferir o contrato @Ana até sexta` | cria a tarefa, com dono e prazo |
| `/objetivo Reforma da sede` | abre um objetivo, com três checkpoints em branco |
| `/rotina Fechamento mensal` | abre uma rotina mensal |
| `/nota O fornecedor cobra por lote de 50` | guarda no seu caderno, só para você |
| `/agenda Reunião com o Renato terça às 15h` | marca o compromisso |
| `/ajuda` | mostra a lista inteira |

O menu abre sozinho ao digitar a barra e mostra o exemplo inteiro, porque linguagem de
comando não morre de sintaxe difícil, morre de ninguém descobrir que ela existe. Datas
em português funcionam: "até sexta", "amanhã", "em 3 dias", "10/03", "10 de outubro".

**A leitura conhece a casa inteira.** Vão junto no pedido as tracks abertas, as tarefas
que já existem e as decisões já tomadas, então ela para de propor pela terceira vez a
mesma coisa e consegue fechar, de dentro de #geral, uma tarefa que mora em outra track.

**E a privacidade tem uma direção só:** leitura privada pode ver o que é público, leitura
pública não pode ver o que é privado. A proposta que sai de um canal aparece para todo o
canal com o trecho que a originou, então só atravessa o que a empresa inteira já podia
ler: track de visibilidade `equipe`, tarefa não privada, decisão tomada em canal aberto.
Nota de ninguém entra, nem a de quem mandou ler. Pela mesma razão, a memória da casa só
aprende em canal aberto: ela é lida por todo mundo e guarda um trecho copiado da conversa.

**Comando e leitura são caminhos diferentes, e a diferença é quem pediu.** Conversa
solta vira proposta, porque ninguém combinou nada com a máquina. Comando vira coisa
feita, porque quem escreveu a ordem foi a pessoa. Tudo que nasce de comando deixa rastro
na conversa, menos o conteúdo da nota, que é privado.

No canal de uma track, `/tarefa` cai dentro dela. Fora de track e para outra pessoa, o
comando abre o formulário já preenchido faltando só onde a tarefa vive: avulsa é privada
de quem criou, e dar uma a outro seria cobrança que o cobrado não enxerga.

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
- **Recado de voz**: o botão de microfone grava, e o texto vai aparecendo enquanto a pessoa
  fala, com a onda do microfone se mexendo. Ao parar, ela **revisa a transcrição** e envia.
  A mensagem mostra o áudio para ouvir e o texto embaixo, com o selo "transcrito"

#### Como a IA entende o recado de voz

A decisão que faz isso funcionar: **a transcrição vai no campo de texto da mensagem**, não
numa coluna própria. Então a leitura da conversa, a menção pelo nome e a busca funcionam no
áudio sem nenhuma mudança: para elas, é só uma mensagem escrita.

E **quem transcreve é o próprio navegador, enquanto a pessoa fala**. Duas razões:

1. **Não custa nada.** Nenhuma chave, nenhum provedor, nenhum centavo por minuto
2. **Quem falou revisa antes de enviar.** É o que impede o erro de audição de virar
   trabalho: basta o navegador ouvir "cancela" onde a pessoa disse "confirma" para nascer
   uma tarefa errada, e ninguém vai conferir o áudio depois

Quando o navegador não sabe ouvir (Firefox, hoje), o recado vai sem texto e a tela diz
**"a IA não lê este"**. Continua servindo para quem escuta, e avisar é mais honesto do que
fingir.

O arquivo mora no mesmo balde dos anexos. O **recado se abre quando o canal se abre**, então
canal fechado continua fechado. Apagar a mensagem apaga o áudio.

**"Ler a conversa"** é o botão que aciona a IA. Ela devolve **propostas**, nunca
mudanças diretas. Cinco tipos:

| Proposta | O que faz, se aceita |
|---|---|
| **tarefa** | Cria uma tarefa nova no checkpoint da vez |
| **prazo** | Muda o prazo de uma tarefa existente |
| **concluir** | Marca uma tarefa como pronta |
| **distribuir** | Põe o dono numa tarefa que existe e está **sem responsável** |
| **decisao** | Registra uma decisão na linha do tempo |
| **trava** | Marca a track como travada, com o motivo |

Cada proposta mostra **o trecho da conversa que deu origem**, para ninguém aceitar no
escuro. Existe um modo "Aplicar sozinho" em Ajustes, e **mesmo nele prazo e trava
nunca entram sozinhos**, porque prazo é compromisso com quem espera.

Duas implementações, mesma saída: com `ANTHROPIC_API_KEY` quem lê é o modelo Claude;
sem chave, ou se a chamada falhar, entram as regras de português (compromisso, pedido,
entrega, decisão, datas por extenso). **O app nunca fica sem ler.**

### 4.6b O que a IA faz sozinha, e como se sabe que foi ela

Com **Aplicar sozinho** ligado em Ajustes, a leitura aplica o que propõe sem esperar
ninguém. Prazo e trava **nunca** entram sozinhos: um mexe em compromisso com quem espera,
o outro para a frente inteira.

E tudo que ela faz sozinha fica **assinado por ela**, em três lugares:

| Onde | O que aparece |
|---|---|
| Na conversa | A mensagem sai assinada por "A leitura da conversa", não por quem mandou ler |
| Na esteira | A linha do tempo mostra a faísca em vez do avatar da pessoa |
| No canal | Um bloco lista o que ela fez, com **Desfazer** em cada linha |

**Desfazer volta ao que era:** a tarefa criada sai, a concluída reabre e perde a hora de
conclusão, o dono posto sai de novo. Decisão registrada não desfaz, porque apagar linha do
tempo é pior do que ter linha demais. O desfazer também entra na conversa, então a reversão
fica no registro junto com a ação.

A razão de tudo isso: **autonomia sem desfazer não é autonomia, é risco.** E sem
assinatura, ninguém mais consegue olhar uma esteira e saber o que foi decidido por gente e
o que a máquina fez.

### 4.6c Quem faz o que ainda não tem dono

Dentro da track, uma faixa aparece quando há tarefa sem responsável, e só para quem
responde pela esteira. A leitura diz um nome e, mais importante, **diz de onde tirou o
nome**. Três origens, em ordem de força, e nenhuma é palpite sobre gente:

1. **O processo.** A tarefa do molde aponta para uma área, e a área tem responsável. Foi a
   empresa que escreveu isso
2. **O histórico.** Quem entregou as tarefas parecidas antes. É o que aconteceu, não o que
   se supõe
3. **A área da track**, como piso: melhor cair no responsável da área do que ficar sem
   ninguém

Entre dois candidatos de força parecida, **ganha quem tem menos na mão**, senão a
distribuição empilharia tudo em quem mais trabalha.

**E quando o escolhido está em sobrecarga**, a IA procura alguém da mesma área que não
esteja, e a sugestão já vem trocada, explicando a troca. Não havendo alternativa, mantém a
sugestão e avisa: às vezes só uma pessoa sabe fazer aquilo, e esconder isso não ajudaria.

Duas regras: **só preenche o que está vazio**, porque tirar uma tarefa de quem já a tem é
decisão de gente; e **pessoa inativa não recebe nada**.

### 4.6d O que a IA aprendeu desta empresa

Fica em Ajustes, e existe só porque a máquina aprende: se ela guarda conhecimento
sobre a casa e usa isso para propor trabalho, alguém precisa poder abrir, ler e apagar
o que está errado.

**Primeiro o que isto não é: não é treinar modelo.** Ninguém treina um modelo por
cliente. Aprender aqui é o app acumular o que a casa ensinou e mandar isso junto em cada
leitura, o que na prática funciona melhor: vale desde a primeira correção, não depois de
mil exemplos.

Três coisas, em ordem de valor:

| | O que é, e de onde vem |
|---|---|
| **Recusa** | Propostas que a empresa já recusou. É o único sinal inequívoco que existe, e sem ele a leitura repete o mesmo erro toda semana |
| **Pessoa** | Quem a casa põe em cada assunto, tirado de quem aceitou o quê e, principalmente, de quando alguém corrigiu a máquina |
| **Termo** | A palavra da casa e a frente a que ela se refere. "Homologação" apontando para a Implantação do ERP |

Duas regras que fazem isso ser honesto:

**Peso é confirmação, não palpite.** Nada com menos de **3 confirmações** muda decisão
nenhuma. E só conta o que foi dito **depois** da última vez que se aprendeu ali: reler a
mesma conversa não soma peso, senão bastaria clicar três vezes para uma palavra solta
virar regra da casa.

**Tudo é visível e apagável.** Cada linha mostra o peso, o que falta para valer, quando
foi visto e **o trecho que ensinou aquilo**. Esquecer tira do ar na hora.

A memória é por organização e passa pela mesma parede das outras tabelas: o vocabulário
de um cliente nunca aparece para outro.

### 4.6e Relatórios (`/relatorios`)

Três decisões definem o que sai aqui.

**Cada relatório responde uma pergunta, não um cargo.** "Relatório do CEO" não quer dizer
nada sozinho:

| | A pergunta |
|---|---|
| **Para mim** | O que eu entreguei e o que está comigo |
| **Para quem coordena** | O time está dando conta, e onde travou |
| **Para quem responde pelo negócio** | As frentes andaram, e o que foi decidido |

O cargo só escolhe o padrão. Qualquer um pode pedir qualquer um dos três, e o que muda são
as seções: quem executa não recebe a tabela do time nem os gargalos.

**O relatório não vê nada além do que a pessoa já vê.** Ele nasce dos mesmos dados da
tela, que já vieram filtrados pelo banco. Um relatório que mostrasse mais seria um
vazamento com capa de PDF. Conferido: quem não é do canal fechado não vê aquele canal no
relatório, nem pedindo o de dono.

**O relatório de conversa conta o que a conversa PRODUZIU, não o que foi dito.** Copiar
mensagem por mensagem transformaria bate-papo em vigilância, e o chat morreria em uma
semana. Vai o volume, quem participou, quantos recados de voz, o que virou trabalho e o
que foi decidido, com marca no que foi a leitura que fez.

**O que a leitura fez sozinha vai em todo relatório**, inclusive no de quem só executa:
ninguém deve descobrir depois que a máquina mexeu em algo.

Períodos de 1, 7, 15 ou 30 dias. Sai em tela, em **texto** para colar em e-mail e em
**PDF** pela impressão do navegador. A cadência (todo dia, semana, quinze dias, mês) se
escolhe na tela, mas **o envio automático ainda não funciona**: ele precisa de uma tarefa
rodando no servidor todo dia, e isso só existe depois de publicar.

### 4.6f O consumo da IA, o teto e os planos

Existe por motivo comercial, não técnico: **sem medidor não há como cobrar, e sem teto não
há como dormir.**

**Só um lugar do app consome modelo pago:** a leitura da conversa. A transcrição do áudio é
o navegador, e a sobrecarga, o Desempenho, os relatórios e a distribuição são conta feita no
navegador. É uma superfície pequena e controlável.

**O medidor.** Uma linha por chamada, com os tokens que a **própria API informou ter
cobrado**, não estimados. O custo em milionésimos de dólar, em inteiro, porque dinheiro em
ponto flutuante erra no centavo quando se soma muita linha. E o nome do modelo gravado
junto do custo já calculado: preço que mudar amanhã não mexe no que já foi medido.

**O teto.** Batendo o limite do mês, a leitura passa a usar as **regras de português
embutidas**, que não custam nada e continuam achando tarefa, prazo e decisão. O teto corta
o gasto, não o produto.

Quem confere é o **banco**, na rota que fala com o modelo. Teto conferido no navegador não
seria teto. E **o medido não pode zerar o medidor**: a tabela tem política de leitura e mais
nada, e quem grava é uma função do banco.

**A alavanca de custo é o modelo**, e ele é escolhido por empresa:

| Modelo | Por leitura |
|---|---|
| Haiku 4.5 | US$ 0,0043 |
| Sonnet 5 | US$ 0,0086 |
| Opus 5 | US$ 0,02 |

Uma leitura carrega as instruções, o esquema da resposta, as pessoas, as tarefas da
esteira, a memória da empresa e até 40 mensagens: cerca de 2.800 tokens de entrada e 300 de
saída.

**Os planos** ainda não estão definidos, e por isso os limites moram em três campos da
organização (`plano`, `limite_leituras`, `modelo_ia`) em vez de numa tabela de planos. Dá
para começar a cobrar mexendo em números, e o dia em que virarem tabela de verdade a
organização passa a apontar para ela.

### 4.6g As notas (`/notas`, e a face Notas do Forward)

**O problema:** o que não é tarefa não tem lugar. A ideia que veio no banho, o número que
alguém falou na reunião, o nome de um fornecedor que vale lembrar. Tudo isso termina em
recado de WhatsApp para si mesmo, e recado de WhatsApp para si mesmo não se acha de novo.

**Isto já foi um canal**, de tipo `pessoal`, chamado "Meu despejo", e ele saiu na seção 19
do schema. O nome e o lugar erravam pelo mesmo motivo: canal é onde se fala com alguém, e
um caderno listado ao lado de `#Financeiro` pede que você comece a escrever como quem manda
mensagem. Ninguém manda mensagem para si mesmo sobre uma ideia de negócio. Escreve. Quem
tinha despejo não perdeu nada: cada coisa jogada lá dentro virou uma nota, porque cada uma
era um pensamento separado, escrito num momento diferente.

**Uma nota é um assunto, e tem alguém do outro lado.**

- Dentro de cada nota há uma **conversa com a leitura** sobre aquele assunto. Quem pergunta
  ali não precisa contextualizar: o contexto é a nota em que a pergunta foi feita.
- Fora delas há uma **conversa solta** (`notas.conversa`, uma por pessoa), que é a nota sem
  assunto: fala do que quiser, e o caderno inteiro entra junto na pergunta.
- **Responder é uma coisa, organizar é outra.** A conversa devolve texto e nunca cria nada.
  "Organizar" manda a nota pela leitura (`despejo: true`) e devolve propostas que você
  aceita ou dispensa: tarefa, compromisso ou nota. Tarefa que sai daqui cai na **sua lista**
  sem perguntar projeto, porque perguntar "em qual projeto?" para "comprar cabo hdmi" é o
  atrito que faz a pessoa voltar para o papel.

**A leitura de uma nota é outro bicho** da leitura de canal, e tratar as duas igual daria
resultado ruim nos dois sentidos:

| | conversa de equipe | nota |
| --- | --- | --- |
| o erro caro | criar trabalho que ninguém pediu, para outra gente | perder o pensamento que a pessoa escreveu para não perder |
| a leitura é | desconfiada | generosa |
| tipos | tarefa, prazo, concluir, decisão, trava, quem faz, agente | tarefa, compromisso, **nota** |

Sem chave de modelo a organização continua funcionando, por regras generosas: tem dia mais
coisa de agenda vira compromisso, começa com verbo vira tarefa, e o resto vira nota. A
conversa, essa não finge: sem chave ela diz que não consegue conversar e aponta o que o
caderno já tem sobre aquilo. Inventar resposta de regras ali seria pior que não responder,
porque a pessoa perguntaria de novo achando que foi mal entendida.

**As notas são de uma pessoa, e ponto**: sem exceção para admin, gestor ou dono, e o mesmo
vale para a conversa dentro delas e para os arquivos anexados. Um caderno que o chefe pode
abrir não é caderno, porque a pessoa para de escrever nele o que importa.

**Organizar é por endereço; costurar é por ligação.** A lista agrupa pela área ou pela track
da nota, que é o mesmo endereço da tarefa. O que costura o acervo é o texto:

- `[[nome de outra nota]]` dentro do texto liga as duas
- abrir uma nota mostra **quem cita ela**, sem ninguém ter mantido índice
- `[[uma nota que não existe]]` é um **convite, não um erro**: o link fica vazado e clicar
  cria a nota já ligada. É assim que alguém escreve "ver [[Fornecedor Alfa]]" no meio de uma
  ideia e ganha a página do fornecedor sem ter decidido criar página nenhuma
- **Parece ter a ver** sugere ligação por palavras incomuns em comum. Bruto de propósito: a
  pessoa precisa olhar e concordar em dois segundos
- a leitura também cita com `[[título]]`, e é a mesma marca de propósito: a ligação que a
  máquina propôs e a que a pessoa escreveu valem o mesmo

**O caderno soma, não só acumula.** Vão junto na pergunta as notas parecidas, as do mesmo
endereço e os títulos de tudo que existe. É isso que faz a ideia de hoje encontrar a de um
mês atrás, sem a pessoa ter que lembrar dela, sendo que ela escreveu justamente para não
precisar lembrar.

Busca sem acento e sem caixa, com título pesando mais que corpo. Nota não tem dono, prazo
nem cobrança, e é isso que a separa de tarefa: ideia na lista de tarefas entope a lista.

### 4.6h Conectores (`/conectores`)

Ligar o Track em qualquer serviço que aceite uma chave, no modelo do Claude: você entra na
sua conta, copia a chave de API, cola aqui. Não precisa esperar ninguém escrever um conector.

**Duas listas, e a divisão é a parte que importa:**

| | da empresa | seu |
| --- | --- | --- |
| `dono_id` | nulo | você |
| quem usa | todo mundo da casa | você |
| quem mexe | só admin | só você |
| quem vê | todo mundo da casa | **só você**, nem o chefe |

O conector pessoal existe porque **quem mais usa o app não é quem é dono da empresa.** É quem
trabalha nela, e a conta do Notion que essa pessoa quer ligar é dela. Se ligar um serviço
fosse privilégio de admin, o recurso ficaria parado: quem tem a chave na mão não seria quem
tem a permissão.

**A chave entra e não sai.** Ela é cifrada no servidor (AES-256-GCM, chave derivada de
`TRACK_SEGREDO`, que mora só na variável de ambiente) e o que fica no banco é texto
embaralhado. Quem dumpar o banco leva embaralhado; quem ler a tabela pelo app também. A rota
decifra na hora da chamada e **faz a chamada**, em vez de devolver o segredo para o navegador.
A tela mostra os quatro últimos caracteres, para reconhecer qual chave é sem poder usá-la.

O endereço base vem do banco e só o caminho vem do pedido: se o navegador escolhesse o
endereço, bastaria alterar o pedido para o app falar com qualquer lugar do mundo usando a
chave do cliente. Endereço precisa ser https e público, com a mesma lista de recusa do webhook
(localhost, faixas internas, `.internal`).

**Quinze moldes** para serviços que vivem de chave, de setores diferentes de propósito (Resend,
SendGrid, Telegram, Notion, GitHub, Linear, Trello, ClickUp, Airtable, Pipedrive, HubSpot,
Twilio, Discord, Higgsfield, ponte Make/Zapier/n8n) mais **outro serviço**. No molde, o caminho
e o formato da chamada já vêm prontos e a chave basta.

**O detalhe honesto, dito na própria tela:** o Claude vive só com a chave porque do outro lado
existe um servidor MCP que se descreve. Uma API comum não descreve nada. Então, fora da lista,
alguém diz uma vez qual caminho chamar e o que mandar. É uma linha de configuração, não é
programar, e fica no agente.

**No agente**, a ação `conector` completa as outras três: `{{situacao}}` vira o trecho da
conversa que disparou e `{{agente}}` vira o nome dele. Como o webhook, **não desfaz**: chamada
feita é chamada feita.

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
| **Consumo da IA** | O gasto do mês, o teto de leituras e qual modelo esta empresa usa |
| **O que o Track aprendeu** | A memória da empresa, com o peso de cada lição e o botão de esquecer |
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

### Como a conta nasce

Dois caminhos, e só dois. Está em `novo_usuario()`, no `supabase/schema.sql`.

| Caminho | O que acontece |
| --- | --- |
| **Tem convite**, por código ou pelo próprio e-mail | Entra na empresa de quem convidou, com o papel, a área e o gestor que o superior definiu. Já liberado. |
| **Não tem convite** | Abre a própria empresa e é a administradora dela. |

**O domínio do e-mail não coloca ninguém em empresa nenhuma.** Até 22/09/2026 colocava, e
produzia dois problemas. Quem se cadastrava com e-mail da casa caía calado numa empresa
que talvez nem fosse a dele, bloqueado, com o nome de empresa que digitou descartado. E se
a conta que abriu aquela empresa sumisse do Authentication, o perfil ia junto por cascata,
mas a organização ficava, segurando o domínio, sem nenhum administrador: ninguém mais
entrava e ninguém podia liberar ninguém. Era um beco sem saída permanente, por domínio.

As colunas `organizacoes.dominio` e `entrada_por_dominio` continuam lá, sem abrir porta.

### Um login, vários Tracks

A mesma pessoa pode ter o **Track pessoal** e o **Track da empresa**, com o mesmo
e-mail e a mesma senha. O seletor no alto da lateral troca entre eles.

Por dentro: o perfil deixou de usar o id do login como chave (se usasse, cada pessoa só
existiria em um lugar). Agora tem id próprio, um `user_id` que aponta para o login, e a
tabela `sessoes` diz qual perfil está em uso agora.

### Uso pessoal: guardado, fora da porta de entrada

> **Desde 22/09/2026 o Track é só para empresa.** O uso pessoal saiu da tela de criar
> conta: sobraram dois caminhos, abrir a própria empresa ou entrar com um convite. A
> decisão foi nichar o produto primeiro no B2B e repensar o uso pessoal depois.
>
> O que segue descrito aqui **continua existindo no código e no banco**, e não foi
> desmontado: `organizacoes.tipo` ainda aceita `pessoal`, e uma organização criada antes
> desta data abre normal, com todas as telas se comportando como a tabela abaixo. O que
> não existe mais é o jeito de criar uma nova. Voltar a oferecer é devolver a opção ao
> formulário, não reconstruir nada.

O Track era vendido para empresa e **também para uma pessoa só**: autônomo, prestador, quem
quer o app de produtividade sem ter empresa nenhuma. Isso não é uma segunda versão do produto,
é um campo: `organizacoes.tipo` vale `pessoal` ou `equipe`, e virar de um para o outro é
ligar uma chave, sem migrar nada.

O que muda com `pessoal`:

| tela | com equipe | sozinho |
| --- | --- | --- |
| lateral | nome da empresa | Pessoal |
| Equipe | lista, convite, papel | "Só você", com o botão de virar conta de equipe |
| tarefa | responsável e aprovador | sai dos formulários, é sua |
| Desempenho | bloco **Por pessoa** | sai, porque a tabela teria uma linha só |
| Relatórios | três perguntas (pessoa, supervisor, dono) | uma, a sua |
| Conectores | **Da empresa** e **Seus** | uma lista, **Ligados** |
| Tracks | Projetos e Áreas | mais o grupo **Só seu**, com a sua lista |

O que **não** muda, e é o coração do uso pessoal: as notas, a agenda, a lista
pessoal e a leitura que separa tudo isso. Ver 4.6g.

### Multi-organização

Cada empresa cliente é uma **organização**. Todas as 30 tabelas têm `org_id`, e todas as
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
9 testes de privacidade de chat, 10 de multi-organização, 7 de multi-espaço e 11 de
conectores (um conector pessoal não aparece nem para quem é dono da empresa).

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

**Paleta**: quase preto (#0A0B0A), branco e lima (#D0FA3C). Vermelho e âmbar são as
exceções, e existem só porque atraso precisa gritar diferente do que apenas pede atenção.

**Tipografia**: Figtree.

**A regra que vale acima de tudo: cor é informação, não decoração.** Lima marca a uma
ação que faz o trabalho andar, e onde a coisa está agora. Vermelho marca o que passou do
prazo, âmbar o que vence em breve. Tudo o mais é neutro e se distingue pela forma, não
pela cor. **Dois lima na mesma tela é defeito.**

**Datas são sempre relativas** na interface: "Hoje", "Amanhã", "em 4 dias", "há 2 dias".

**Nenhum texto concorda em gênero com uma pessoa.** O app não sabe o gênero de ninguém, e
deduzir pelo nome erraria com gente de verdade. Por isso as faixas de sobrecarga são
substantivos ("em sobrecarga", e não "sobrecarregado") e as frases dizem "neste ritmo", e
não "no ritmo dela".

**Sem travessão** em nenhum texto da interface.

**Elementos recorrentes**: ícones de status pequenos, avatares com iniciais e cor por
pessoa, bolinha que enche, selo de visto, cadeado para travado e para privado.

### De onde vem esse vocabulário

De `design-system/DESIGN.md`, que é a fonte da verdade e descreve cor, tipo, espaço,
movimento, iconografia e voz, medidos da arte do produto. O `app/globals.css` traduz
aqueles tokens para os nomes que as telas já usam.

A troca aconteceu em 22/09/2026 e foi feita pela base: as telas continuam com as classes
e os componentes de `componentes/`, e o que mudou foram os valores por trás delas. Trocar
as peças pelos 50 componentes React do sistema é o trabalho seguinte, tela por tela.

A vitrine dos componentes fica em `/design-system`, fora do grupo `(app)`, sem Shell e
fora da navegação.

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

10. **Modelos por setor** no primeiro cadastro
11. **Integração com WhatsApp**, adiada de propósito em 21/09/2026. Entrada livre e
    saída racionada é o desenho recomendado
12. **As três telas de segurança**: log de acesso, exportar tudo, excluir organização.
    São o que um cliente grande pede antes de assinar
13. **App nativo de celular**
14. **Conectores nativos de provedor** (Google Calendar nos dois sentidos, Calendly,
    Google Meet, Zoom) dependem de conta e aprovação do lado do Leo: projeto no Google
    Cloud com revisão de consentimento (semanas) e plano pago no Calendly. O Slack está
    fora de propósito, é concorrente. Chamada de vídeo por Jitsi num compromisso é a
    única que não precisa de conta de provedor, e está oferecida e não escolhida
15. **O layout do uso pessoal** foi resolvido no que estava errado (ver 6, Uso pessoal),
    mas a pergunta maior fica aberta: sozinho, o Forward devia abrir pela lista e pelas
    notas em vez de pelos checkpoints? É decisão de UX, não de código

### Pendências fora do código

16. Criar o projeto no Supabase (região São Paulo), rodar o `schema.sql`, desligar
    "Confirm email" e trazer a Project URL e a anon key
17. Criar as contas de GitHub e Vercel para publicar
18. Configurar a `ANTHROPIC_API_KEY` para a leitura da conversa sair das regras e passar
    para o modelo
19. Configurar a `TRACK_SEGREDO` (qualquer texto longo e aleatório) para os conectores
    poderem guardar chave. **Trocar essa variável depois cega todas as chaves já
    guardadas**, e cada cliente teria que colar a dele de novo
20. Nada foi testado com microfone de verdade: o navegador embutido aqui bloqueia a
    captura, então gravar e transcrever recado de voz precisa de um teste seu
