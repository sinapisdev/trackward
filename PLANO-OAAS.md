# TrackWard: o plano do OaaS

Plano de implementação escrito em 26/09/2026, a partir da conversa de estratégia do mesmo
dia. Serve como prompt de trabalho: cada bloco diz o que já existe, o que construir, as
regras que não podem ser violadas e como saber que ficou pronto.

Leia o `MAPA-DO-APP.md` antes de mexer em qualquer coisa: ele descreve o app como ele é
hoje. Este arquivo descreve para onde ele vai.

---

## 0. A tese, em uma página

O TrackWard deixa de ser um app onde alguém entra e passa a ser **um serviço que entrega
o trabalho da empresa organizado**, com o mínimo de esforço do cliente. A empresa não
alimenta o sistema: o sistema se alimenta do que a empresa já faz e já fala.

**As três inversões que definem tudo neste documento:**

1. **O app para de esperar ser aberto.** A leitura roda no servidor, sozinha, na
   frequência que o cliente escolher
2. **A pessoa para de precisar entrar.** O WhatsApp é a porta principal, de ida e de
   volta. Quem quiser entrar no app entra, e vê a mesma coisa organizada
3. **O processo para de ser desenhado e passa a ser descoberto.** Ninguém monta
   checkpoint. O sistema observa, entende e propõe

**O TrackWard é um agente que orquestra, organiza e executa.** O aplicativo é a memória
desse agente, legível e navegável. Quem não quiser abrir a memória não precisa: tudo
chega e tudo pode ser respondido de fora.

**O alcance é dos dois extremos:** da empresa que não tem processo nenhum (e para quem o
maior valor é receber o processo pronto) até a empresa que já tem processo definido e só
quer acompanhar, cobrar e medir.

---

## 1. Princípios invioláveis

Estas regras valem para todo bloco deste documento. Se uma implementação violar uma
delas, a implementação está errada, mesmo que funcione.

### 1.1 A IA nunca decide sozinha

Ela observa, conclui, propõe e pergunta. **Quem decide é gente.** Isso não muda em
nenhum bloco, inclusive nos que rodam sozinhos no servidor.

O que a IA pode fazer sem perguntar: organizar, arquivar, medir, lembrar, sugerir.
O que ela nunca faz sem um sim explícito: aprovar, mover prazo, mudar processo, avisar
alguém de fora, gastar dinheiro.

### 1.2 Na dúvida, nunca adivinhe

Uma pergunta a mais custa três segundos. Uma ação errada custa a confiança no sistema
inteiro, e confiança não volta. É a mesma regra que já governa os agentes: em dúvida,
não dispare.

### 1.3 Aponte para o processo, nunca para a pessoa

"O checkpoint de Orçamento devolve muito" é um achado. "A Marina devolve muito" é uma
denúncia. No dia em que a equipe sentir vigilância, ela para de conversar no app, e sem
conversa o produto inteiro morre.

Toda métrica de pessoa (sobrecarga, ociosidade) existe para **proteger a pessoa e
distribuir melhor**, e é apresentada nesse enquadramento. Nenhum relatório para o dono
ranqueia pessoas por desempenho.

### 1.4 A fronteira do WhatsApp é estrutural, não é promessa

**O TrackWard só enxerga o que for mandado para o TrackWard.** Nunca ler grupo de
equipe, nunca ler conversa entre duas pessoas. Quem decide o que é trabalho é a pessoa,
com um gesto que ela já conhece: escrever ou encaminhar para aquele contato.

Filtro por IA separando pessoal de trabalho está **proibido de propósito**: acerta 95% e
os 5% restantes destroem o produto de uma vez só.

### 1.5 O aprendizado entre clientes é de forma, nunca de conteúdo

**Sobe para o acervo:** quantas etapas, em que ordem, quanto tempo cada uma leva, onde
trava, qual pergunta de diagnóstico discriminou, qual achado se confirmou.

**Nunca sobe:** nome de cliente, texto de tarefa, valor, conversa, nome de pessoa,
conteúdo de anexo, nome de empresa.

A separação é de tabela e de rota, não de intenção: o acervo mora em estrutura própria,
sem chave estrangeira para dado de cliente.

### 1.6 Não afirme sem amostra

Um processo que rodou três vezes não diz nada. Nenhum achado do raio-X vira aviso antes
de **8 execuções** do processo e de o mesmo padrão aparecer em pelo menos **60%** delas.
Enquanto não tiver, o app fica calado.

Dizer uma bobagem para um dono uma única vez derruba a credibilidade de tudo que o app
disser depois, inclusive do que estiver certo.

### 1.7 Tudo que a IA fez fica assinado e desfazível

Já é assim hoje (`sugestoes.por_ia`, `desfeita_em`, o desfazer). Continua valendo para
tudo que vier destes blocos. Exceção única: o que sai para fora (webhook, conector,
mensagem enviada) não desfaz, e a interface diz isso antes.

---

## 2. Bloco A: a leitura que roda sozinha

### O que existe hoje
- `lerConversa(canalId)` em `componentes/Dados.tsx`, disparada **só por botão**
- `POST /api/leitor`, que já faz a leitura com modelo e cai em regras quando não há chave
- Um cron em `vercel.json`, apontando para `/api/avisar` às 11h
- Medidor e teto de consumo (`consumo`, `pode_chamar_modelo`, `registrar_consumo`)

### O que construir

**A1. Rota `POST /api/pulso`**, chamada por cron. Para cada organização ativa, para cada
canal com mensagem nova desde a última leitura, roda a leitura e grava as propostas.

**A2. Frequência configurável pelo cliente.** Campo novo em `organizacoes`:

```
leitura_por_dia  int not null default 3   -- 0 desliga, máximo pelo plano
leitura_janela   text not null default '08:00-19:00'
```

O cron roda de hora em hora e cada organização é atendida conforme a frequência dela.
Fora da janela não lê: ninguém quer proposta nascendo às 3h.

**A3. Marca de leitura por canal.** Coluna `lido_pela_ia_em timestamptz` em `canais`,
para a leitura não reprocessar o que já leu e não gastar duas vezes pela mesma mensagem.

**A4. O teto manda.** Se `pode_chamar_modelo()` recusar, o pulso cai nas regras e
registra o motivo. Nunca estoura o teto do cliente por conta própria.

### Regras
- O pulso nunca aceita proposta sozinho, salvo o que `ia_modo = 'aplicar'` já permite hoje
- Toda leitura do pulso é registrada em `consumo` com `onde` dizendo que foi automática
- Organização em modo reduzido ou com teste vencido não entra no pulso

### Pronto quando
Uma semana sem ninguém abrir o app e, ao abrir, o trabalho da semana está organizado.

---

## 3. Bloco B: o WhatsApp de ida e volta

**Esta é a peça principal do plano.** Sem ela, nada mais aqui entrega OaaS de verdade.

### O que existe hoje
- Envio funcionando, via conector (`avisos_contato.telefone`, `whats`, e a rota `/api/avisar`)
- `avisos`, `avisos_contato` com "não perturbe" e "só urgente"
- O motor que casa frase com tarefa: `itemDaFrase`, `mesmaCoisa`, `parecido` em `lib/leitor.ts`
- O despejo e as notas, que recebem qualquer coisa solta

### O que construir

**B1. Rota de entrada `POST /api/whats`**, o webhook do provedor. Recebe mensagem, áudio,
imagem e documento. Identidade é o telefone, resolvido em `avisos_contato.telefone`.
Número desconhecido recebe resposta educada e nada mais.

**B2. Tabela do que ficou perguntado e sem resposta.** É o miolo do casamento:

```
create table perguntas_abertas (
  id, org_id, perfil_id,
  sobre_tipo text,            -- item, etapa, prazo, nota, diagnostico, triagem
  sobre_id uuid,
  texto text,                 -- o que foi perguntado, do jeito que saiu
  msg_externa_id text,        -- id da mensagem no provedor, para casar a citação
  opcoes jsonb,               -- quando a pergunta foi com botão ou lista
  criado_em, respondido_em, expirou_em
)
```

**B3. Os quatro mecanismos de casamento, nesta ordem.** O primeiro que resolver, resolve:

1. **A resposta é uma resposta.** O provedor entrega o id da mensagem citada. Casamento
   certo, sem IA nenhuma
2. **Só tem uma pergunta em aberto** para aquela pessoa. "pronto" resolve sozinho
3. **A frase nomeia.** Usa o motor que já existe
4. **Continua ambíguo: pergunta com lista.** "Qual delas? 1) Conciliação 2) Relatório".
   Um toque, sem digitar

Se nenhum resolver, **pergunte**. Nunca escolha a mais provável.

**B4. O que pode ser feito por lá: tudo, desde que seja resposta a pergunta específica.**

Esta é uma decisão do Leo e substitui a regra anterior de "só o reversível pelo
WhatsApp". O risco nunca foi o canal, foi a IA agir sozinha. Então:

| ação | como acontece pelo WhatsApp |
|---|---|
| concluir tarefa | "pronto", ou botão |
| **aprovar checkpoint** | o app avisa que tudo terminou e pergunta: aprova, aprova com ressalva, ou devolve. Nunca aprova sozinho |
| **prorrogar prazo** | o app avisa que vai atrasar e pergunta: prorrogo, ou mantenho e outra coisa muda? |
| **aceitar cascata** | o app mostra o que anda junto e pede o aceite de quem manda |
| **mexer em prazo firme** | não é o caminho recomendado, e quando não há alternativa o app pergunta ao dono, dizendo que é firme e por quê |
| criar tarefa, nota, mandar arquivo | livre, com triagem (B5) |

**Mitigação da identidade:** telefone não é senha. Para as quatro ações marcadas em
negrito, a confirmação é **botão explícito**, nunca texto livre interpretado, e tudo fica
registrado em `historico` com a marca de que veio do WhatsApp.

**B5. O WhatsApp é também o despejo.** Texto, áudio, foto e documento soltos entram como
hoje entram no canal pessoal. Quando o sistema não souber o que é, ele pergunta antes de
arquivar: *"isso é uma nota, uma tarefa, ou um arquivo para guardar?"*. E quando souber,
confirma ao arquivar: *"guardei como nota em Financeiro, ok?"*

**B6. Saída racionada.** Entrada é livre, saída é medida. Respeita "não perturbe" e "só
urgente" que já existem. Nunca mais de uma pergunta em aberto por pessoa por vez, exceto
quando a pessoa mandar várias coisas de uma vez.

### Fora do código, do lado do Leo
Conta comercial verificada na Meta ou na Twilio. Leva dias ou semanas, exige CNPJ e um
número que não esteja em uso no WhatsApp comum. **Começar antes da primeira linha.**

### Pronto quando
Uma pessoa passa uma semana inteira trabalhando sem abrir o app, e o trabalho dela está
correto lá dentro.

---

## 4. Bloco C: o e-mail como segunda entrada

### O que construir

**C1. Caixa de entrada do TrackWard.** Cada organização ganha um endereço próprio, do
tipo `empresa@in.trackward.app`. O que for encaminhado para lá entra igual ao que chega
pelo WhatsApp: passa pela triagem e vira nota, tarefa, arquivo ou resposta.

**C2. Leitura de caixa conectada, opcional.** Por conector, com a chave da pessoa, e
**só para casar com o que o app já espera**:

- O relatório que era esperado chegou? Marca a tarefa como entregue e arquiva o anexo
- Apareceu pedido novo num e-mail? Propõe tarefa

**C3. A mesma fronteira do WhatsApp vale aqui.** Ler caixa inteira de alguém é leitura de
conversa privada. Duas formas permitidas: o encaminhamento deliberado (C1), e a caixa
conectada por escolha da própria pessoa, com pasta ou marcador definido por ela.

### Pronto quando
O relatório do contador chega por e-mail e a tarefa "Relatório de setembro" aparece
entregue, com o arquivo anexado, sem ninguém tocar em nada.

---

## 5. Bloco D: o sistema que persegue

### O que existe hoje
`lib/desempenho.ts` (entregas, indicadores, gargalos, porArea, porPessoa),
`lib/sobrecarga.ts`, a cascata de prazo com aceite, `avisos` com sino, push e WhatsApp.

### O que construir

**D1. Varredura diária**, no mesmo pulso do Bloco A, que procura e pergunta:

| o que encontra | o que faz |
|---|---|
| prazo vence em 2 dias | pergunta ao dono se ainda vale |
| prazo vencido | pergunta o que aconteceu e oferece prorrogar ou replanejar |
| checkpoint com tudo pronto | avisa o aprovador e pede a decisão |
| tarefa parada há muito tempo | pergunta se travou, e em quê |
| pessoa em sobrecarga | avisa **quem distribui**, não a pessoa |
| **pessoa ociosa** | avisa quem distribui, com o que poderia ser passado |
| rotina que deveria ter começado e não começou | pergunta ao dono da área |

**D2. Ociosidade.** Novo, e é o par da sobrecarga: pouca tarefa aberta, nada atrasado,
entrega em dia e fila abaixo da média da área. Mesmo cuidado do 1.3: serve para
**distribuir melhor**, e a frase fala de capacidade, nunca de esforço da pessoa.

**D3. Mudança estrutural sempre passa por cima.** Qualquer proposta que mexa em processo,
em etapa, em prazo firme ou em responsável só acontece com aceite de quem manda naquele
processo (`manda_no_processo`, que já existe).

### Pronto quando
Nenhum prazo vence sem alguém ter sido perguntado antes, e nenhum checkpoint fica pronto
esperando alguém lembrar de aprovar.

---

## 6. Bloco E: o processo descoberto

**A parte que o Leo considera a mais importante depois do WhatsApp.**

### O princípio
Empresa sem processo **já tem processo**: ele só não é constante, não é explícito e não
tem dono. O app não inventa, ele **mostra a grama pisada**.

Por isso a descoberta não procura sequência repetida, que some no caos. Ela procura
**invariantes**:

- o mesmo **gatilho** que começa
- o mesmo **desfecho** que termina
- o mesmo **conjunto** de eventos no meio, mesmo fora de ordem
- as mesmas **áreas** envolvidas

### O que construir

**E1. Registro de evento unificado.** Já existem `historico`, `atividades`, `decisoes`,
`pedidos_prazo`, `itens.feito_em`. Falta uma visão única, com tipo, autor, área, esteira
e hora, que a descoberta consulta:

```
create view eventos as ...   -- tarefa criada, concluída, atrasada, reaberta,
                             -- checkpoint aprovado, devolvido, com ressalva,
                             -- prazo pedido, prazo movido, anexo enviado,
                             -- compromisso marcado, realizado, perdido,
                             -- nota criada, pergunta respondida, entrada registrada
```

Tudo que puder virar evento, vira. Quanto mais evento, melhor a descoberta.

**E2. Setorização pela pessoa.** O app sabe a área de quem falou (`perfis.area_id`), e é
assim que o evento ganha setor sem ninguém classificar nada. Um processo é sempre de um
setor, e os que atravessam setor são justamente os mais valiosos: são eles que revelam
**interdependência e onde trava entre áreas**.

**E3. O agrupamento.** Eventos entre um gatilho e um desfecho, que se repetem, viram um
**candidato a processo**. Guardar em tabela própria com o estado de maturidade:

```
create table processos_descobertos (
  id, org_id, area_id, nome_sugerido,
  gatilho jsonb, desfecho jsonb, passos jsonb,
  execucoes int, confianca numeric,
  cadencia text,          -- rotina, sazonal, pontual
  estado text,            -- observando, pronto_para_propor, proposto, aceito, recusado
  ...
)
```

**E4. Rotina, sazonal ou pontual.** Sai do intervalo entre execuções: regular e curto é
rotina; regular e longo, ou ligado a mês do ano, é sazonal; sem regularidade é pontual.
Isso decide se vira `fluxo` do tipo `ciclo` ou `esteira`.

**E5. O mapa da inconstância**, que na empresa sem processo vale mais que o processo:

- *"O orçamento foi aprovado pelo dono 6 vezes, pela Ana 3, e 2 vezes por ninguém"*
- *"Em 4 dos 11 pedidos ninguém conferiu estoque antes de prometer prazo, e nesses 4 o prazo atrasou"*
- *"Entre o pedido e a entrega passaram 6, 9, 22, 7 e 31 dias"*

**E6. A proposta é escolha, nunca criação.** Nunca perguntar "como deveria ser o
processo?". Sempre: *"das 11 vezes, 7 seguiram este caminho. Adotamos como padrão?"*.
Quando não houver maioria, aí sim entra o acervo da vertical: *"nas outras empresas do
seu ramo o mais comum é assim, serve?"*.

**E7. Começa pequeno.** O primeiro processo entregue tem **três coisas e no máximo um
checkpoint**: um gatilho, um dono e um desfecho. Empresa que nunca teve processo não
absorve doze etapas: recebe, acha bonito e abandona em duas semanas.

Cada etapa a mais entra depois, com motivo: *"três vezes alguém refez porque isso não foi
conferido. Quer virar checkpoint?"*

**E8. Por onde começar, e o app sabe dizer.** Contar as mensagens em que alguém procura
alguma coisa ("alguém sabe se o boleto saiu?", "quem ficou de falar com o fornecedor?").
**Cada uma dessas é um buraco de processo gritando.** O processo com mais buscas é o
primeiro a ser desenhado.

**E9. O desenho manual continua existindo**, para quem quiser começar organizado. O que
muda é que ele deixa de ser obrigatório.

### Pronto quando
Uma empresa que não configurou nada recebe, no fim do diagnóstico, os processos dela
descobertos, separados por setor, com as interdependências marcadas.

---

## 7. Bloco F: o raio-X

### O que existe hoje
Tudo que alimenta isto **já está sendo gravado**: `decisoes` (com tipo, etapa, autor,
data), `itens.feito_em`, `pedidos_prazo`, `feedbacks`, `gargalos()`.

### Os sinais a computar

**Checkpoint doente**

| sinal | significado |
|---|---|
| sempre devolve | critério mal escrito, ou checkpoint na etapa errada |
| **nunca reprova** | não é controle, é carimbo. Custa dias de espera e não filtra nada. Propor tirar |
| a mesma ressalva sempre | o critério está errado, ou a tarefa está na etapa errada |

**Tempo**

| sinal | significado |
|---|---|
| uma etapa come 60% do prazo | é o gargalo |
| **trabalho de 2h numa etapa de 5 dias** | o problema é a espera, não o trabalho. Conserto oposto |
| o mesmo prazo sempre empurrado | o número nunca foi realista. Conserte o número, não cobre a pessoa |

**Molde errado**

| sinal | significado |
|---|---|
| a mesma tarefa sempre adicionada à mão | pertence ao molde. Propor incluir |
| tarefa do molde sempre apagada ou nunca concluída | peso morto. Propor tirar |
| dois processos quase iguais | duplicação. Propor juntar |

**Vida do processo**

| sinal | significado |
|---|---|
| parou de ser aberto | depreciado |
| feedback ruim de quem recebeu | qualidade, não velocidade |
| o gargalo é uma pessoa com muitos checkpoints | o processo está certo, a distribuição não. Não mexa no processo |

**Informação faltando** (o caso do relatório do contador): a mesma pergunta se repetindo
depois que um entregável chega é o sinal de que **falta informação no entregável**. Não
precisa ler o documento: basta contar a repetição da pergunta.

### Como o raio-X chega

- **Não como painel.** Chega pelo canal de aviso, com link que abre direto na página
- **No máximo três achados por vez.** Relatório com quinze problemas é ignorado inteiro
- **O custo em dias, nunca em porcentagem.** "Foram 21 dias no trimestre", não "34% de retrabalho"
- **O conserto no mesmo lugar do diagnóstico.** Botão: remover este checkpoint, mover
  esta tarefa, ajustar este prazo para o que realmente acontece
- **Nada sai sem passar pelo 1.6.** Amostra mínima, senão fica calado

### Pronto quando
Um dono recebe três achados por mês, cada um com o custo em dias, e resolve cada um com
um toque.

---

## 8. Bloco G: o diagnóstico de entrada

### O desenho
O período de teste deixa de ser "experimente o app" e vira **diagnóstico da empresa**.
Durante ele a empresa **não configura nada**: ela só trabalha e responde.

**Duração: 45 dias, com 90 para empresa de ciclo longo.** O critério real não é
calendário, é **ciclo**: o diagnóstico fecha quando cada processo foi visto umas três
vezes. Ciclo mensal exige ver o mês virar.

**Entrega em partes**, para o cliente ver valor antes do fim:

| dia | o que é entregue |
|---|---|
| 10 | os processos semanais descobertos, e o mapa da inconstância |
| 20 | os gargalos entre setores |
| 45 | os processos completos, por setor, com as interdependências |
| 90 | o raio-X com histórico suficiente para afirmar |

### A pergunta do dia

Uma ou duas por dia, por pessoa, pelo WhatsApp, de dez segundos, geradas pelo **papel da
pessoa** e pelo **vocabulário da vertical**:

- *"Bom dia Ana. Entrou alguma conta nova para pagar hoje?"*
- *"O relatório do contador chegou?"*
- *"Tem algo esperando a sua decisão agora?"*
- Sexta: *"Alguma coisa do financeiro travou esta semana?"*

**Pergunte sobre a borda, nunca sobre o conteúdo.** Nunca "como é o seu fechamento?", que
ninguém sabe responder. Sempre algo cuja resposta é um evento.

**As perguntas se podam sozinhas.** A que voltar vazia três semanas seguidas sai. A que
sempre revelar problema ganha prioridade. Em um mês o conjunto convergiu para aquela
empresa sem ninguém configurar.

**A pergunta diminui.** Semana 1: três por dia. Semana 4: uma, e só quando o app não
conseguiu inferir sozinho. Se virar obrigação, a resposta morre.

### A única disciplina inevitável
**Alguém precisa marcar que algo entrou.** Não dá para inferir que o cliente ligou se
ninguém disser. Três jeitos de deixar quase automático: a pergunta do dia, o conector, e
o e-mail encaminhado.

### Cobertura do diagnóstico
Métrica de quanto do esperado está sendo respondido. Mostrada ao dono como **número do
processo, nunca por pessoa**. "Cobertura de 60%" é diagnóstico; "a Marina não responde" é
dedo-duro.

### Pronto quando
Uma empresa que não sabia descrever os próprios processos recebe o mapa deles em 45 dias,
sem ter configurado nada.

---

## 9. Bloco H: o onboarding

### O que perguntar no cadastro
Cinco minutos, e **só isto**:

1. O **nicho** da empresa
2. Quais **áreas** existem (escolhidas a partir da lista típica do nicho, com adicionar e tirar)
3. Quem são as **pessoas**: nome, telefone, área, papel, e a quem responde
4. Quem é o **contato do diagnóstico**, que recebe as entregas parciais

### O que NÃO perguntar
**Não pergunte como funcionam os processos.** A pessoa descreve a versão idealizada, e
isso ancora a descoberta numa ficção que vai custar 45 dias para desfazer. Pergunte
depois, como confirmação: *"vi que acontece assim, confere?"*

### As perguntas encolhem por nicho
O questionário é por nicho e vive no acervo. A cada empresa nova, as perguntas cuja
resposta nunca variou naquele nicho **saem do questionário**. Vinte perguntas viram seis.
Isso é medido: **horas de implantação por cliente novo**. Se não cair, o aprendizado não
está acontecendo.

---

## 10. Bloco I: o acervo por nicho

### O que acumula
1. O **esqueleto** da vertical: quais etapas existem
2. As **variações**, e o que prevê cada uma
3. Os **tempos reais**, medidos em dezenas de empresas
4. As **doenças conhecidas** daquele nicho
5. As **perguntas que discriminam**, as que sobraram da poda

Os itens 3 e 4 são o fosso: são impossíveis de comprar, porque só se obtêm operando.

### O que construir

```
create table nichos ( id, nome, ... )
create table nicho_processos ( nicho_id, nome, gatilho, desfecho, passos jsonb, ... )
create table nicho_tempos ( nicho_id, processo, etapa, mediana_dias, amostra int, ... )
create table nicho_perguntas ( nicho_id, texto, papel, discriminou numeric, ativa bool )
create table nicho_achados ( nicho_id, sinal, frequencia, amostra int )
```

**Estas tabelas não têm chave estrangeira para nenhuma tabela de cliente.** É assim que a
regra 1.5 deixa de ser promessa e vira arquitetura. O que sobe é agregado e anônimo.

### O que o acervo devolve
- Para empresa nova do mesmo nicho: esqueleto, perguntas curtas e alerta preventivo
- Para empresa antiga: comparação. *"O seu faturamento leva 11 dias; a média do seu porte é 6"*

**O acervo melhora quem já é cliente, não só quem entra.**

---

## 11. Bloco J: a conta de operação do TrackWard

### O que é
Um perfil de operação que enxerga várias empresas de uma vez, para operar o serviço:
quais clientes, de quais nichos, em que estágio do diagnóstico, com quais achados
pendentes, e os números agregados por nicho, por porte e por região.

### O cuidado, e ele é grande
Hoje uma empresa **nunca** vê a outra, e isso é a parede que já foi construída, auditada
e testada (`furos_na_parede()`). Esta conta é uma exceção controlada e precisa ser:

- **Contratada e visível.** O cliente sabe, está no contrato, e vê na tela quem do
  TrackWard tem acesso
- **Registrada.** Todo acesso vira linha em log de acesso, consultável pelo cliente
- **Limitada.** Acesso a **estrutura e número**, nunca a conteúdo: nada de abrir anexo,
  ler conversa, ver texto de tarefa ou nota de ninguém
- **Revogável** pelo cliente, a qualquer momento, sem falar com ninguém

**Nunca uma chave mestra escondida.** Se a implementação criar um caminho que o cliente
não enxerga, está errada.

### O que a conta mostra
Por empresa: estágio, cobertura do diagnóstico, achados abertos, saúde dos processos.
Por nicho: quantas empresas, quais processos são falhos com mais frequência, tempos
medianos, quais perguntas ainda discriminam.

---

## 12. Bloco K: o arquivo que se fecha com o ciclo

### O desenho
O TrackWard também é onde os documentos ficam, organizados **pelo trabalho a que
pertencem**, e não numa pasta solta.

A pessoa manda o arquivo pelo WhatsApp dizendo *"esse é o relatório do fechamento
financeiro"*. O app pergunta se é para guardar na rotina de Financeiro do mês, e guarda.

**Quando a rotina encerra o ciclo, ela vira um arquivo fechado:** as tarefas daquele mês,
as decisões, os anexos e as notas ficam juntos e consultáveis. O ciclo seguinte nasce
limpo. Hoje a rotina já recomeça por período; falta o **fechamento com acervo**.

### O que construir
- `ciclos`: uma linha por período encerrado de cada rotina, com o que aconteceu dentro
- A tela do ciclo encerrado, só leitura, com os documentos no lugar
- A triagem do arquivo que chega pelo WhatsApp ou e-mail, com confirmação antes de guardar

### Pronto quando
Alguém pergunta "cadê o fechamento de julho?" e a resposta é um link, não uma busca.

---

## 13. Bloco L: a porta do cliente externo

### O que existe hoje
`feedbacks`, com link por token, sem conta e sem sessão. Quem recebe abre, responde e vai
embora. É a peça certa e já está pronta.

### O que construir
- Pedido de feedback **automático** no desfecho de uma esteira, com o texto da vertical
- Perguntas curtas por link em outros pontos: orçamento recusado, entrega atrasada
- O resultado entra como evento e alimenta o raio-X

**O que não fazer:** não mandar mensagem para base de cliente. A porta é de uma pessoa
por vez, no ponto em que o processo tocou o mundo.

---

## 14. Bloco M: o preço

**Cobrança por pessoa é incompatível com OaaS** e precisa mudar. Se a entrada é a
conversa, você precisa de todo mundo dentro dela; cobrar por cabeça faz o cliente tirar
gente, e cada pessoa tirada apaga o dado de que o resultado depende.

O preço passa a ser **por empresa**, por faixa de tamanho ou por volume de trabalho
organizado, com o consumo de IA embutido. O teto vira **degrau de plano**, não porta na
cara: ao bater, oferece subir, e enquanto não sobe cai nas regras embutidas.

Os três serviços, que hoje estão misturados e precisam de nome e preço separados:

| produto | o que é |
|---|---|
| **Eu monto** | diagnóstico, processos criados, equipe treinada. Uma vez |
| **Eu cuido** | todo mês alguém lê o raio-X e conserta o que está torto |
| **Eu opero** | as tarefas passam pela operação. A empresa só executa e responde |

A implantação deixa de ser fase e vira subproduto do diagnóstico, e passa a ser cobrada
quando o acervo já a tornar barata.

---

## 15. A ordem de construção

| # | bloco | por que nesta posição |
|---|---|---|
| 1 | **A** leitura no pulso | pequeno, usa o cron que já existe, e muda a frase de venda |
| 2 | **B** WhatsApp de entrada | é o que faz a pessoa nunca precisar abrir o app |
| 3 | **D** o sistema que persegue | usa B, e transforma espelho em colega |
| 4 | **G** diagnóstico e pergunta do dia | usa B, e é o que gera evento em empresa sem processo |
| 5 | **E1, E2** registro de evento e setorização | base de tudo que vem depois |
| 6 | **F** raio-X | roda sobre o que já está gravado, testável com os dados de exemplo |
| 7 | **K** arquivo e fechamento de ciclo | independente, e resolve dor imediata |
| 8 | **E3 a E9** processo descoberto | o maior diferencial, e a maior construção |
| 9 | **H, I** onboarding e acervo | só fazem sentido com alguns clientes rodando |
| 10 | **C** e-mail | segunda entrada, depois que a primeira funciona |
| 11 | **J** conta de operação | quando houver mais de três clientes |
| 12 | **L, M** porta externa e preço | acompanham a primeira venda |

---

## 16. O que não fazer

- **Não ler grupo de WhatsApp de equipe.** Nem com biblioteca não oficial, nem com
  consentimento verbal. A regra 1.4 não tem exceção
- **Não classificar pessoal contra trabalho com IA.** A fronteira é estrutural
- **Não deixar a IA aprovar, mover prazo ou mudar processo sozinha**, nem com o modo
  "aplicar" ligado
- **Não entregar processo grande na primeira vez.** Três coisas e um checkpoint
- **Não mandar relatório com muitos achados.** Três por vez
- **Não afirmar com amostra pequena.** Ver 1.6
- **Não ranquear pessoas** em nenhum relatório que saia para o dono
- **Não criar acesso de operação invisível para o cliente**
- **Não misturar o TrackWard com a plataforma da AVLE.** Grupos, cotas, cobrança e split
  são outro produto, e juntar estraga os dois

---

## 17. Como isso se prova

Cada bloco deste documento tem um critério de pronto que é **comportamento observável**,
não tela entregue. Antes de considerar qualquer bloco terminado:

1. O `furos_na_parede()` continua sem furo, com as tabelas novas dentro da lista
2. As regras 1.1 a 1.7 foram testadas, e não só implementadas
3. O modo demonstração continua funcionando sem servidor e sem chave
4. O `MAPA-DO-APP.md` foi atualizado, porque ele é o mapa para o trabalho de UX
