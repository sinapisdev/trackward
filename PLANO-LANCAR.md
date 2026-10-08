# TrackWard contra o manual das 12 etapas

Escrito em 08/10/2026, lendo o `processo-desenvolvimento-comercializacao.pdf` v1.0 contra
o estado real do produto. Os fatos vieram do código e da base de produção, não de memória.

---

## O diagnóstico em uma frase

**A construção está na etapa 9. A evidência está na etapa 2. A comercialização está na
etapa 0.**

Isso não é um elogio nem uma crítica, é a forma do risco. Um ano de construção madura
apoiada em uma amostra de um: as empresas que usam o TrackWard são todas suas. A hipótese
mais perigosa nunca foi testada, e ela não é técnica.

| | o que está provado | o que não está |
|---|---|---|
| **técnico** | RLS auditada, parede entre clientes testada plantando dado, IA com teto e custo medido | restauração de backup nunca foi testada |
| **produto** | 14 telas, modo demonstração, design system | usabilidade nunca foi testada com quem não é você |
| **problema** | a dor existe na SILVERENG e na Simonetto | nunca foi observada numa empresa independente |
| **comercial** | catálogo de planos no código | nenhuma oferta foi apresentada a um comprador |

---

## Etapa por etapa

### 1. Registrar e qualificar a oportunidade: parcial

**Existe:** a tese escrita (`PLANO-OAAS.md`), a modalidade (produto próprio), o problema
descrito com clareza, e o `IDEIAS.md` com as hipóteses.

**Falta:** a ficha de uma página no formato do manual, e sobretudo **um segmento inicial
nomeado**. "Empresas sem processo" não é segmento: é uma condição que atravessa todos
eles. O manual é explícito: não usar público-alvo como todas as empresas.

**Falta também:** separar usuário, comprador e aprovador. No TrackWard eles são pessoas
diferentes (quem executa não é quem assina), e isso muda a oferta inteira.

### 2. Entender o problema e o processo atual: fraco, e é aqui que dói

**Existe:** o processo atual da SILVERENG e da Simonetto mapeado em profundidade. É
diagnóstico de verdade, e é o que gerou o produto.

**Falta:** a mesma dor observada em **empresa independente**. O manual diz, para produto
próprio: *"verificar se a dor aparece em clientes independentes do mesmo segmento"*. A
amostra hoje é de um dono, em quatro empresas dele.

**Falta:** o indicador de resultado com **situação inicial medida**. Sem o número de
antes, o piloto não tem contra o que comparar, e a venda não tem o que prometer.

### 3. Definir a oferta e a viabilidade econômica: parcial

**Existe:** `lib/planos.ts` com Enterprise e Pessoal, três estados, assento, desconto do
pessoal, e **medição real de custo de IA por organização** (`consumo`, `custoMicro`), que
é a parte difícil e já está pronta.

**Falta:**
- a decisão do que o plano grátis libera, aberta desde setembro
- a conta de custo por cliente somando IA, infraestrutura, SMS e suporte
- o preço, que existe no catálogo mas nunca foi apresentado a ninguém
- a comparação com alternativas verificáveis

### 4. Testar as hipóteses críticas: **não feito**

Nenhuma oferta foi apresentada a um comprador independente. Nenhum teste com critério
definido antes. Zero recusas registradas, porque zero propostas.

**Esta é a maior lacuna do projeto**, e é a que o manual existe para impedir.

### 5. Definir o escopo e os requisitos: implícito

**Existe:** o `AGENTS.md` é, na prática, o documento de requisitos, e é mais detalhado que
a maioria: cada regra tem a razão dela escrita.

**Falta:** a lista explícita do **que fica de fora da v1**. O escopo até hoje foi "tudo que
pensamos", e isso não tem fim. Sem a exclusão escrita, não há como dizer que está pronto.

### 6. Desenhar e testar a experiência: parcial

**Existe:** design system, telas medidas em três larguras, tema claro e escuro, modo
demonstração que serve de ambiente de teste.

**Falta:** teste de tarefa com participantes do público. Todo o teste de usabilidade foi
feito por você, que é a pessoa que menos pode testar isso, porque conhece as regras.

### 7. Definir a estrutura técnica e os riscos: forte, com dois buracos

**Existe:** RLS com a parede entre clientes testada plantando dado, auditoria que não se
apaga, perfil que não se apaga, SSRF fechado, segredo de conector fora da linha que a
empresa lê, IA com teto e custo por chamada.

**Falta:**
- **restauração de backup nunca foi testada.** O manual pede ensaio de restauração, e
  encerrar conta já exigiu um script próprio, então a cópia existe. A volta, não
- **o contrato de tratamento de dados com a Anthropic**, que é LGPD e vira obrigação no
  dia do primeiro cliente pagante
- o registro de riscos como lista, com dono e mitigação

### 8. Planejar e autorizar a execução: não formalizado

Não há orçamento, marco, nem teto. Para um fundador sozinho isso parece burocracia, e o
manual responde: **o teto não é para controlar você, é para o projeto parar de consumir
sem decisão.** Um ano de construção sem cliente é exatamente o que um teto teria
interrompido para perguntar.

### 9. Construir em ciclos e verificar a qualidade: é onde quase tudo está

**Existe:** incrementos pequenos, tudo medido antes de afirmar, modo demonstração com
dados, ensaios de banco plantando dado, cada mudança com a razão escrita no commit.

**Falta, e é concreto:**
- **os ensaios não rodam sozinhos.** Tudo que eu testei foi script no diretório temporário,
  descartado depois. Não há `npm test`, não há CI que rode nada
- **não existe ambiente separado.** O `.env.local` aponta para a produção, e o
  `atualizar.sql` é rodado direto nela. Hoje isso funciona porque o único cliente é você
- métricas de negócio não estão instrumentadas (ativação, tempo até primeiro valor)

### 10. Homologar e executar o piloto: não feito

Nenhum piloto com empresa externa. Sem relatório de homologação, sem aceite, sem lista de
limitações conhecidas.

### 11. Comercializar e lançar: não feito

Não há material de venda, caminho de contratação, cobrança dentro do app (é por contrato,
fora dele, e foi decisão), implantação de cliente novo, nem canal de suporte.

### 12. Operar, aprender e decidir: não feito

---

## A track: o caminho até a etapa 12

**Tipo: objetivo**, porque tem fim. Sete checkpoints, **em ordem**, e nenhum abre antes de
o anterior fechar. É assim que a track funciona no app, e aqui a sequência não é
burocracia: cada checkpoint existe porque o seguinte é impossível sem ele.

### Por que esta ordem, e não a das 12 etapas

Você levantou a objeção certa: *"como provo que alguém paga se não tenho o app pronto?"*

**Metade da objeção é verdadeira e metade não.** O app está construído e rodando em quatro
empresas há meses, o que é muito mais do que quase todo mundo tem quando começa a vender.
O que falta não é produto, é **poder pôr dentro alguém que não é você**: hoje um cliente
novo depende de você mexer no banco, a restauração de cópia nunca foi testada e não há
contrato de tratamento de dados. Isso não é polimento de lançamento, é a diferença entre
vender um piloto e não conseguir entregá-lo.

Então o checkpoint do "deixar entrar" vem **antes** do de vender, e ele é deliberadamente
mínimo: o suficiente para uma empresa operar uma semana, não para lançar.

O que continua vindo primeiro é saber **para quem e qual dor**, porque sem isso não há o
que oferecer nem o que prometer, e o piloto não tem contra o que ser comparado.

---

## Checkpoint 1. Fechar o alvo e medir a dor

**Pergunta que ele responde:** qual dor, de quem, e quanto ela custa hoje?

**Critério de passagem:** você consegue dizer, com NÚMERO, quanto custa uma dor em três
empresas que não são suas, e a dor é a mesma nas três.

### O que é "o número de antes", na prática

É a medida da dor **antes** do TrackWard existir na vida daquela empresa. Sem ele, o piloto
não prova nada e a venda não tem o que prometer, porque "organiza melhor" não é promessa,
é adjetivo.

O produto promete resolver cinco dores. Cada uma tem um número mensurável, e você escolhe
**uma ou duas** para medir, não as cinco:

| dor | o número de antes | como medir, em uma hora |
|---|---|---|
| **o que foi combinado não vira trabalho** | quantas coisas combinadas no grupo da semana passada ninguém executou | abrir o grupo de WhatsApp de uma semana, contar os pedidos, perguntar ao dono quantos foram feitos |
| **ninguém sabe onde está** | quantas vezes por semana alguém pergunta "cadê" ou "como está" | contar as perguntas de status num grupo, numa semana |
| **a espera entre etapas** | quantos dias entre pedir e ficar pronto, numa tarefa típica | pegar 10 casos recentes e medir cada um |
| **o dono vira o sistema** | quantas horas por semana o dono gasta perguntando e cobrando | pedir que ele anote por uma semana, ou estimar com ele caso a caso |
| **a mesma pergunta se repete** | quantas vezes, depois de uma entrega, alguém pergunta algo que deveria estar nela | contar as idas e voltas de um entregável recente |

**A quarta é a mais vendável**, porque o dono sente na pele e sabe quanto vale a hora dele.
A primeira é a mais honesta, porque é a que o produto mais resolve.

### Tarefas

**1. Escolher UM segmento, e escrevê-lo**
Um segmento é um conjunto do qual você consegue fazer uma lista de dez nomes. "Construtora
de pequeno porte do Paraná, de 5 a 30 funcionários" é segmento. "Empresas sem processo"
não é: é uma condição que atravessa todos eles, e por isso não dá para listar ninguém.
*Pronto quando:* a lista de dez existe, com nome e telefone.

**2. Escolher QUAL dor investigar**
Uma ou duas da tabela acima. Escolher as cinco é não escolher nenhuma, e a entrevista vira
questionário.
*Pronto quando:* está escrito qual é, e qual número você vai medir.

**3. Entrevistar cinco empresas da lista, com o roteiro da página 17**
A regra que decide se a entrevista vale: **peça a última vez que aconteceu, nunca a
opinião.** Quando a pessoa responder em geral ("isso é sempre um problema"), volte: "me
conta a última vez". Se ela não lembrar de nenhuma, a dor não é tão cara quanto parece.
*Evitar:* entrevistar amigo que já sabe que você está construindo isso. Ele vai te
elogiar, e elogio é a informação mais cara que existe, porque custa um ano.
*Pronto quando:* cinco conversas, cada uma com pelo menos um caso concreto anotado.

**4. Medir o número de antes em pelo menos três**
Com a régua da tabela. Anotar a fonte: medição direta, relato da pessoa, ou estimativa sua.
As três valem, mas valem diferente, e misturar é como o número vira ficção.
*Pronto quando:* três números, com a fonte de cada um.

**5. Mapear o processo atual de UMA delas, do gatilho ao desfecho**
Quem dispara, quem faz o quê, onde espera, onde volta atrás. É o que vai virar o primeiro
processo dentro do app no piloto.
*Pronto quando:* o desenho cabe numa página e a pessoa da empresa confirma que é assim.

**6. Decidir, por escrito**
A dor aparece fora das suas empresas? É a mesma nas três? Qual é a mais cara? Se as três
tiverem dores diferentes, o segmento está errado e a tarefa 1 recomeça.
*Pronto quando:* a decisão está escrita, com o motivo.

---

## Checkpoint 2. Deixar o app receber um estranho

**Pergunta que ele responde:** dá para pôr uma empresa que não é minha aqui dentro sem que
uma falha minha custe os dados dela?

**Critério de passagem:** uma pessoa que não é você cria a conta, configura a empresa e
usa por uma semana, **sem você tocar no banco**.

### Por que isto vem antes de vender

Vender um piloto é prometer entregá-lo. Hoje a entrega depende de você abrir o SQL Editor,
e a cópia de segurança nunca foi testada na volta. Nenhuma das duas coisas é polimento.

### Tarefas

**1. Testar a RESTAURAÇÃO de uma cópia de segurança**
Não a cópia, que já existe: a volta. Derrubar um banco de ensaio, restaurar a partir do
backup do Supabase, e cronometrar. É a única forma de saber se o backup existe de verdade.
*Pronto quando:* você restaurou e anotou quanto tempo levou e o que se perdeu.

**2. Contratar o tratamento de dados com a Anthropic**
O DPA (data processing addendum). É obrigação de LGPD a partir do primeiro cliente
pagante, porque texto de conversa do cliente passa pelo modelo.
*Pronto quando:* assinado e guardado.

**3. Decidir o que acontece sem o WhatsApp, e começar a verificação da Meta hoje**
A verificação tem prazo de terceiro e pode levar semanas, então ela começa agora, em
paralelo com tudo. A decisão que não pode esperar é outra: **o piloto roda sem WhatsApp?**
Se sim, a promessa muda e o material de venda muda junto. Se não, o piloto só começa
quando a Meta liberar, e isso é um risco de calendário que precisa estar escrito.
*Pronto quando:* a verificação foi submetida e a decisão está escrita.

**4. Montar o caminho de entrada do cliente novo**
O mínimo do bloco H: nicho, áreas, pessoas com telefone e papel, e quem recebe o
diagnóstico. Pode ser você preenchendo junto com o cliente numa chamada de 30 minutos.
**Não precisa ser tela**: precisa existir e ser repetível.
*Pronto quando:* você fez isso com alguém de fora e ele saiu usando.

**5. Separar o ambiente de produção**
Hoje o `.env.local` aponta para a produção e o `atualizar.sql` é rodado nela. Com um
cliente dentro, um erro ali é o dado dele. Um projeto Supabase de ensaio resolve.
*Pronto quando:* existe um segundo projeto e o `atualizar.sql` passa por ele antes.

**6. Pôr os ensaios num `npm test`**
Tudo que foi testado nestes dias virou script descartado. Começar pelos de regra pura
(`lib/apelido.ts`, `lib/fone.ts`, `lib/secretario.ts`, `lib/sobrecarga.ts`), que rodam sem
banco e sem navegador.
*Pronto quando:* `npm test` roda e passa, e o GitHub o roda a cada push.

**7. Pôr teto de assento no plano de teste**
Hoje uma empresa em teste nasce sem teto de assento e pode convidar gente sem limite.
*Pronto quando:* o teste tem teto e a tela diz qual é.

**8. Definir o canal de suporte**
Quem o cliente procura, por onde, e em quanto tempo responde. Pode ser o seu WhatsApp.
*Pronto quando:* está escrito e o cliente sabe.

---

## Checkpoint 3. Provar que alguém paga

**Pergunta que ele responde:** existe alguém que tira dinheiro do bolso por isto?

**Critério de passagem:** três pilotos contratados **com pagamento recebido**, de dez
ofertas apresentadas a quem decide.

### Tarefas

**1. Decidir o que o plano grátis libera**
Está aberto desde setembro e trava a conversa de preço. A recomendação registrada no
`IDEIAS.md`: chão de graça com notas, tarefas avulsas e agenda; o pago acrescenta leitura,
rotinas e relatórios.
*Pronto quando:* escrito em `lib/planos.ts`.

**2. Montar a conta de custo por cliente**
IA (já medida em `consumo`), infraestrutura, SMS do código, e o seu tempo de suporte. Sem
isso o preço é chute e a margem aparece seis meses depois.
*Pronto quando:* existe o custo mensal de um cliente de dez pessoas.

**3. Definir a oferta**
Unidade de cobrança, preço, o que inclui, o que não inclui, e como é a implantação. Para o
piloto, pode ser preço de piloto, menor e por prazo fechado.
*Pronto quando:* cabe numa página que outra pessoa entende sozinha.

**4. Comparar com o que o segmento usa hoje**
Planilha, grupo de WhatsApp, caderno, Trello, ERP. Por resultado, esforço de adoção e
preço, com fonte e data. **A alternativa mais comum é não fazer nada**, e ela é a mais
difícil de vencer.
*Pronto quando:* a comparação está escrita.

**5. Escrever o plano do experimento, no modelo da página 18**
Público elegível, meta, prazo, teto de horas e de gasto, e o que você faz com cada
resultado: sucesso, fracasso e inconclusivo. **Antes de apresentar a primeira oferta.**
*Pronto quando:* escrito e datado, antes da primeira conversa.

**6. Apresentar a MESMA oferta a dez empresas elegíveis**
Mesma oferta, mesmo preço, decisor identificado. Mudar a oferta no meio transforma dez
testes em dez experimentos de um.
*Pronto quando:* dez decisores receberam a oferta completa.

**7. Registrar cada recusa e o motivo**
É a informação mais valiosa do checkpoint inteiro, e some se não for anotada na hora.
*Pronto quando:* cada "não" tem uma linha com o motivo.

**8. Decidir: avançar, ajustar, pausar ou encerrar**
Com três ou mais pagamentos, avançar. Com um ou dois, investigar as objeções e decidir um
teste novo. Com zero, a oferta nestas condições está refutada: reformular ou parar.
**Silêncio depois do prazo conta como ausência de compra.**
*Pronto quando:* a decisão está escrita, com a data e o número real.

---

## Checkpoint 4. Rodar o piloto e medir

**Pergunta que ele responde:** no mundo real, o número depois é melhor que o número antes?

**Critério de passagem:** uma empresa que não é sua operou **um ciclo inteiro** no
TrackWard, e a dor do checkpoint 1 foi medida de novo.

### Tarefas

**1. Escolher de uma a três empresas, entre as que pagaram**
Mais que três não dá para acompanhar sozinho, e piloto mal acompanhado não gera evidência.

**2. Implantar com o caminho do checkpoint 2**
E cronometrar. Horas de implantação por cliente é o número que decide se isso escala.

**3. Testar a tarefa central com cinco usuários reais, sem conduzir**
Dar a tarefa ("marque esta entrega como feita") e calar. Anotar onde a pessoa trava, onde
pergunta, onde desiste. **Você não pode ser um dos cinco.**

**4. Corrigir o que impede a tarefa central, e repetir o teste**
Só o que impede. O resto entra na lista e espera.

**5. Observar um ciclo real de uso, com o suporte registrado**
Um ciclo é o período que o processo daquela empresa leva para dar a volta: um mês num
fechamento, uma obra numa construtora. Anotar cada vez que precisaram de você: **piloto
muito assistido é piloto que não prova que o produto funciona sozinho.**

**6. Medir a dor de novo, com a mesma régua**
Mesma métrica, mesma forma de contar. Se a régua mudar, o antes e o depois não se comparam.

**7. Escrever o relatório, com as limitações**
O que funcionou, o que não, quanto custou de suporte, e o que ficou conhecido como
limitação. Sem esconder nada em média.

---

## Checkpoint 5. Fechar a v1 com o que o piloto mostrou

**Pergunta que ele responde:** o que entra na versão que se vende, e o que fica de fora?

**Critério de passagem:** existem duas listas escritas, com data: o que entra e o que fica
de fora.

Este checkpoint vem **depois** do piloto de propósito: fechar o escopo antes é decidir no
escuro, e a lista sairia igual à de hoje, que é "tudo que pensamos".

### Tarefas

**1. Escrever a jornada principal, do convite ao primeiro valor**
Qual é a primeira coisa que faz o cliente dizer "isto serve". Tudo que não estiver no
caminho dela é candidato a ficar de fora.

**2. Listar o essencial para essa jornada, e só isso**

**3. Escrever a lista de EXCLUSÕES, nomeando cada coisa**
Esta é a tarefa que o projeto nunca teve, e é a que faz o lançamento ter fim.

**4. Definir critérios de aceite verificáveis para a jornada principal**
No formato do manual: dado, quando, então.

**5. Decidir o que fazer com o que o piloto pediu e não entrou**
Vai para o roteiro de evolução, com o motivo de não ser agora.

---

## Checkpoint 6. Ligar a venda

**Pergunta que ele responde:** um cliente novo contrata, entra e chega ao valor sem você
no meio?

**Critério de passagem:** aconteceu uma vez, do começo ao fim, sem você intervir.

### Tarefas

**1. Definir e testar o caminho de contratação e cobrança**
Hoje a cobrança é por contrato, fora do app, e isso foi decisão. Mesmo assim o caminho
precisa existir: proposta, aceite, emissão, confirmação, e o que acontece quando não paga.

**2. Escrever o material de venda**
Demonstração, proposta, respostas às objeções que apareceram no checkpoint 3. As objeções
reais, não as imaginadas.

**3. Montar a implantação de cliente novo, com o tempo medido no piloto**

**4. Lançar para audiência delimitada, com critério de interrupção escrito**
Quantos clientes no máximo, e o que faz você parar.

**5. Acompanhar conversão, ativação e tempo até primeiro valor**
Os três instrumentados no app, não numa planilha.

---

## Checkpoint 7. Operar e decidir

**Pergunta que ele responde:** isto se repete, ou foi sorte três vezes?

**Critério de passagem:** há evidência de repetição em aquisição, entrega e retenção, ou a
decisão explícita de pausar.

### Tarefas

**1. Montar o painel de resultados do negócio**
**2. Marcar a revisão mensal, com indicadores, metas e aprovador**
**3. Investigar cada cancelamento**, separando falha de aquisição, de promessa, de início
de uso e de valor
**4. Documentar as rotinas de operação**, para não dependerem só de você
**5. Decidir: manter, melhorar, ampliar, pausar ou encerrar**
Antes de ampliar, verificar que aquisição, venda, entrega e margem se repetiram.

---

## O que começa hoje, em paralelo

Só uma coisa, e é a que tem prazo de terceiro: **a verificação do negócio na Meta.** Ela
mora no checkpoint 2, mas pode levar semanas e não depende de você depois de submetida.
