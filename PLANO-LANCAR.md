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

**Tipo: objetivo** (tem fim). Sete checkpoints. A ordem não é a das 12 etapas, porque
etapas 5 a 9 já estão parcialmente feitas: a ordem é a do risco.

---

### Checkpoint 1. Fechar o alvo (etapas 1 e 2)

**Critério de passagem:** a mesma dor observada em pelo menos três empresas que não são
suas, com o número de antes medido em uma delas.

| tarefa |
|---|
| Escrever a ficha da oportunidade, uma página, no modelo da página 17 do manual |
| Escolher UM segmento inicial e nomeá-lo (construtora de pequeno porte do Paraná, por exemplo), com o motivo escrito |
| Listar 10 empresas desse segmento a que você tem acesso real |
| Entrevistar 5, com o roteiro da página 17, pedindo o último caso concreto e não a opinião |
| Mapear o processo atual de UMA delas, do gatilho ao desfecho |
| Medir a situação inicial de uma dor, com número (dias de espera, retrabalho por mês) |
| Decidir: a dor aparece fora das suas empresas? Se não, reformular a oportunidade |

**O que evitar, do manual:** perguntar se a pessoa usaria, e entrevistar só quem já é
seu conhecido de negócio.

---

### Checkpoint 2. Provar que alguém paga (etapas 3 e 4)

**Critério de passagem:** três pilotos contratados com pagamento recebido, de dez ofertas
apresentadas a decisores.

| tarefa |
|---|
| Decidir o que o plano grátis libera, e escrever em `lib/planos.ts` |
| Montar a conta de custo por cliente: IA (já medida), infraestrutura, SMS, suporte |
| Definir a oferta: unidade de cobrança, preço, o que inclui, o que não inclui |
| Comparar com as alternativas que o segmento usa hoje, com fonte e data |
| Escrever o plano do experimento no modelo da página 18: público, meta, prazo, teto |
| Apresentar a MESMA oferta a 10 empresas elegíveis, com decisor identificado |
| Registrar cada recusa e o motivo dela, sem reescrever a meta depois |
| Decidir: avançar, ajustar, pausar ou encerrar |

**A regra que vale mais aqui:** silêncio depois do prazo conta como ausência de compra, e
elogio não é venda.

---

### Checkpoint 3. Fechar o escopo do lançamento (etapa 5)

**Critério de passagem:** existe uma lista do que entra na v1 e outra, explícita, do que
fica de fora, com data e versão.

| tarefa |
|---|
| Escrever a jornada principal do cliente novo, do convite ao primeiro valor |
| Listar o que é essencial para essa jornada, e só isso |
| Escrever a lista de EXCLUSÕES da v1, nomeando cada coisa que fica para depois |
| Decidir o que acontece se a Meta não liberar: o app lança sem WhatsApp? |
| Definir critérios de aceite verificáveis para a jornada principal |

---

### Checkpoint 4. Tapar o que impede operar (etapas 7 e 9)

**Critério de passagem:** dá para pôr um cliente dentro sem que uma falha operacional
custe os dados dele.

| tarefa |
|---|
| Testar a RESTAURAÇÃO de uma cópia de segurança, e escrever quanto tempo levou |
| Contratar o tratamento de dados com a Anthropic (LGPD) |
| Criar um ambiente separado da produção, e parar de rodar `atualizar.sql` direto nela |
| Pôr os ensaios num `npm test` que rode sozinho, começando pelos de regra pura |
| Fazer a verificação do negócio na Meta |
| Sair do trial da Twilio, ou trocar o canal do código para WhatsApp |
| Pôr teto de assento no plano de teste (hoje nasce sem teto) |
| Instrumentar ativação e tempo até primeiro valor |
| Escrever o registro de riscos, com dono e mitigação |

---

### Checkpoint 5. Piloto com cliente de verdade (etapas 6 e 10)

**Critério de passagem:** uma empresa que não é sua operou um ciclo inteiro no TrackWard,
e o número de depois foi comparado com o de antes.

| tarefa |
|---|
| Escolher de uma a três empresas do piloto, entre as que pagaram |
| Montar o onboarding: nicho, áreas, pessoas, contato do diagnóstico (bloco H) |
| Testar a tarefa central com 5 usuários reais, sem conduzir a resposta |
| Corrigir o que impedir a tarefa central, e repetir o teste |
| Observar um ciclo real de uso, com o suporte dado registrado |
| Comparar com a situação inicial do checkpoint 1 |
| Escrever o relatório de homologação com as limitações conhecidas |

---

### Checkpoint 6. Ligar a venda (etapa 11)

**Critério de passagem:** um cliente novo contrata, entra e chega ao primeiro valor sem
você no meio.

| tarefa |
|---|
| Definir o caminho de contratação e cobrança, e testá-lo ponta a ponta |
| Escrever o material de venda: demonstração, proposta, respostas a objeções |
| Montar o caminho de implantação de cliente novo |
| Definir canal de suporte, responsável e tempo de resposta |
| Lançar para audiência delimitada, com critério de interrupção escrito |
| Acompanhar conversão, ativação e tempo até primeiro valor |

---

### Checkpoint 7. Operar e decidir (etapa 12)

**Critério de passagem:** há evidência de repetição em aquisição, entrega e retenção, ou a
decisão explícita de pausar.

| tarefa |
|---|
| Montar o painel de resultados do negócio |
| Marcar a revisão mensal, com indicadores e aprovador |
| Investigar cada cancelamento, separando aquisição, promessa, uso e valor |
| Documentar as rotinas de operação, para não dependerem só de você |
| Decidir: manter, melhorar, ampliar, pausar ou encerrar |

---

## O que eu faria primeiro, e por quê

**Os checkpoints 1 e 2, antes de qualquer linha de código.**

Tudo que está nos checkpoints 3 a 7 pressupõe que alguém paga por isto, e isso é a única
coisa que um ano de construção não produziu nenhuma evidência a respeito. O checkpoint 4
tem itens que parecem urgentes (restauração, LGPD), e eles só se tornam urgentes **no dia
em que existe um cliente**: fazê-los antes é construir mais, que é o que já se sabe fazer.

A exceção é a verificação da Meta, que tem prazo de terceiro e por isso vale começar hoje,
em paralelo, mesmo estando no checkpoint 4.
