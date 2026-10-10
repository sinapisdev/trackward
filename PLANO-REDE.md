# TrackWard como rede: o que falta, e o que ninguém pensou ainda

Escrito em 10/10/2026, lendo a tese de "camada de execução" contra o que existe no código
e na base de produção. Os fatos vieram de consulta, não de memória.

**Leia na ordem:** `PLANO-OAAS.md` (a tese de setembro), `IDEIAS.md` (a de outubro, a
pessoa como unidade), `PLANO-LANCAR.md` (o que falta para sair), e este. Este não
substitui nenhum: ele responde uma pergunta que os três não fazem, que é **o que o
produto precisa ser para o valor não estar no código**.

---

## O fato que organiza tudo o resto

**Ninguém de fora nunca usou o TrackWard. Nenhuma vez.**

São cinco pedidos de feedback criados e **zero respondidos**. É a única porta para fora
que existe hoje, e ela nunca foi atravessada. As seis organizações da base são todas
suas, e os dez convites foram para pessoas que você conhece.

Isso não condena a tese da rede. Mas põe ela no lugar certo: **a parte do produto em que
você quer apostar o valor inteiro é a única que nunca rodou.** Tudo neste documento vale
menos do que atravessar essa porta uma vez com um fornecedor de verdade.

---

## 1. A premissa de "é fácil de copiar": metade certa, e a metade errada importa

**Onde você está certo.** As telas se copiam. A trilha com checkpoint se copia. O
secretário que cria track por conversa se copia, e vai se copiar mais rápido a cada ano.
Nada disso é defensável, e apostar nisso seria apostar errado.

**Onde a conclusão escorrega.** "Fácil de copiar" não é o mesmo que "sem valor". O
WhatsApp é simples e não foi substituído, e o motivo não é só o tamanho: é que **mudar
custa para TODO MUNDO ao mesmo tempo**. Essa é a propriedade que você quer, e ela não vem
de ter muitos usuários. Vem de ter muitos usuários **que dependem uns dos outros dentro
do produto**.

E aqui está a medida honesta de onde o TrackWard está: hoje, se um cliente seu trocar de
ferramenta, **ninguém fora dele é afetado**. Cada organização é uma ilha, por construção.
O custo de sair é o custo de migrar o arquivo dele, e isso é baixo.

**Então a pergunta não é "como dificulto a cópia do código".** É: *o que, dentro do
TrackWard, deixa de funcionar para OUTRAS pessoas quando uma sai?* Hoje a resposta é
nada. É isso que precisa mudar, e é tudo que precisa mudar.

---

## 2. A tensão central, e ela não está escrita em nenhum documento

> **A peça que torna o produto vendável é a mesma que impede a rede de existir.**

A parede entre empresas clientes é a coisa mais bem construída do sistema: `minha(org_id)`
em toda política, o carimbo em toda tabela, uma varredura que planta dado numa empresa e
tenta alcançá-lo pela outra em 43 tabelas. Ela é o que você mostra para um cliente
assinar.

E ela diz, em uma linha: **nada atravessa de uma organização para outra.**

Agora leia a proposta do fornecedor que atende quatro construtoras no mesmo ambiente,
mantendo histórico, documentos e identidade. Isso é exatamente uma coisa atravessando.
Não um pouco: é a premissa inteira.

**As duas não são incompatíveis, mas só se o atravessamento for um OBJETO, e não uma
exceção.** A única coisa que hoje atravessa de propósito é a ocupação da agenda, e repare
como ela foi feita: não é "a Simonetto lê a agenda da Silvereng". É uma função que
responde "esta pessoa está ocupada às 15h" e **recusa o título**. A regra escrita é *o que
atravessa é a OCUPAÇÃO, nunca o título*.

A rede precisa da mesma disciplina, uma camada acima: existe uma **contraparte**, ela tem
uma identidade e um histórico, e o que atravessa é **o fluxo combinado**, nunca o
interior da casa. Enquanto isso não for um objeto com nome, política e teste, toda
tentativa de rede vai ser uma exceção na parede, e exceção na parede é como a parede
acaba.

**Isto é a decisão de arquitetura mais cara do documento, e ela vem antes de qualquer
código.**

---

## 3. O que a mensagem propõe e JÁ EXISTE (não reconstruir)

Para não gastar mês em coisa feita:

| proposta da mensagem | estado real |
|---|---|
| identidade própria, não dependente do Google | **feito**: o `@` e o telefone verificado |
| não substituir o e-mail de frente, entrar por onde a pessoa já está | **feito e escrito**: `IDEIAS.md` §5, caixa lida por envelope, WhatsApp |
| começar por um nicho, não por "toda a vida" | **escrito e decidido**: `PLANO-LANCAR.md`, checkpoint 1 |
| engenharia, construção e serviços como mercado inicial | **é onde você já opera**, e é a amostra que você tem |
| memória operacional (quem decide, o que trava, como se resolveu) | **parcial**: `memoria`, processos descobertos, raio-X, `acervo_forma` |
| níveis 1 a 3 de autonomia (observa, recomenda, executa após aprovar) | **feito**: é exatamente o que a proposta e o aceite são hoje |
| exportar e apagar tudo de um cliente | **feito**: `encerrar-conta.mjs`, com cópia antes |
| a pessoa como unidade, acima da empresa | **feito**: agenda, fila e carga são do corpo, não do contrato |

A mensagem acerta o diagnóstico em quase tudo que ela diz sobre direção. O que ela não
tem é a conta do que falta, e é essa a parte útil daqui para baixo.

---

## 4. O que falta, em ordem de consequência

### 4.1 A contraparte, que é o objeto que não existe

Hoje o modelo tem `perfis` (uma pessoa dentro de uma organização) e `convites` (como ela
entra). Não existe nada que represente **"o Nelson da esquadria, que trabalha com a
Simonetto e com a Silvereng, e não é de nenhuma das duas"**.

Sem esse objeto, as três coisas que a mensagem pede são impossíveis:

- o fornecedor com histórico próprio atravessando clientes
- o link de fluxo que a mesma pessoa reabre semana que vem e reconhece
- qualquer medida de rede, porque não há o que medir

**O que ele precisa ter:** uma identidade que não é um `perfil` (ela não pertence a uma
casa), um vínculo por organização com o que foi combinado ali, e a regra de que **o
histórico é da contraparte e o conteúdo é de cada casa**. O Nelson vê os pedidos que ele
recebeu da Simonetto e os que recebeu da Silvereng; ele nunca vê que as duas existem na
mesma tela a menos que ele mesmo tenha conta.

### 4.2 O fluxo que um estranho ATENDE, e não só responde

O link de feedback prova que a forma funciona: token sorteado, vence, vale uma resposta,
mostra o nome da track e nada mais. Mas ele é **de mão única e de uma vez só**.

O que a mensagem descreve é outra coisa: um pedido com prazo, campos e documentos, que a
pessoa de fora **abre, responde, anexa, pergunta de volta, e o app continua executando**.
Isso é um objeto novo: um fluxo com estado, com duas pontas, uma delas sem conta.

**E ele é o motor de crescimento inteiro.** Cada pedido desses é o produto se apresentando
a alguém durante o trabalho, que é a única forma de distribuição que não custa anúncio.

**A condição que a mensagem acerta e que é fácil de violar:** quem recebe precisa de valor
na primeira tela. Se o link for "crie uma conta para responder", ele morre. Se for "seu
orçamento está aqui, anexe o PDF e pronto", ele vive.

### 4.3 O endereço público, e o risco que ninguém mencionou

`trackward.app/@fulano` já está listado como aberto no `IDEIAS.md`. O que não está escrito
em lugar nenhum é o custo novo que ele traz.

**Um endereço público onde o seu AGENTE atende é diferente de uma caixa de entrada
pública.** Na caixa, o spam custa a sua atenção. Aqui, **cada contato de um estranho
dispara uma chamada de modelo**, que custa dinheiro seu. Um endereço público sem freio é
uma conta de IA aberta para qualquer um gastar.

A escada anti-spam do `IDEIAS.md` §4 foi desenhada para mensagens e continua certa, mas
ela precisa de um degrau a mais: **o primeiro contato de um desconhecido não pode chamar
modelo nenhum.** Ele é um formulário, lido por regra e não por IA, e só vira conversa com
agente depois que você aceitou aquela pessoa uma vez.

### 4.4 Escrever nos outros sistemas, que é o que "coordenar" quer dizer

Tudo que o TrackWard toca fora dele hoje é **somente leitura, por decisão escrita**:

- a agenda externa devolve intervalos, e `lib/ical.ts` **descarta título e local de
  propósito**
- a caixa de e-mail é lida pelo ENVELOPE, e o corpo não chega a passar pela rede
- o conector tem saída única com conferência de cada salto, contra SSRF

"O agente negocia o horário e agenda a reunião" é **escrita**. E escrever num sistema de
terceiro traz três coisas que o produto não tem:

1. **credencial com permissão de escrita**, que é outra categoria de segredo (hoje só
   existe `conector_segredos`, em tabela sem política, para leitura)
2. **reversão**: marcar uma reunião errada na agenda de alguém não se desfaz com um
   "desculpe"
3. **a conta de quem errou**: se o agente marcou, quem responde?

Isto não é um detalhe de implementação. É a fronteira entre o produto de hoje e o da
mensagem, e atravessá-la reverte uma decisão de segurança que foi tomada com motivo.

### 4.5 O desfazer, que é o que destrava a autonomia

A escada de 1 a 5 da mensagem está certa, e o produto está no 3. O que separa o 3 do 4
**não é o modelo**: é poder desfazer.

E aqui há um buraco concreto: **o app não consegue dizer o que um agente fez no mês
passado.** `atividades` é o histórico da track e é **podada nas 40 últimas**. `auditoria`
não se apaga, mas ela é estreita de propósito e **não guarda conteúdo**: ela registra quem
virou admin, não que o agente criou dezessete tarefas.

Para o nível 4 existir, falta:

- um registro do que o AGENTE fez, separado do que a gente fez, que não se poda
- desfazer por lote: "o que ele fez nesta conversa, tire tudo"
- limites por tipo de ação e por valor, e não um interruptor de ligar e desligar
- supervisão por exceção: o app avisa quando ele fez algo fora do padrão, não a cada ação

**A ordem importa:** sem desfazer, nenhum cliente autoriza o nível 4, e com razão.

### 4.6 A memória operacional como coisa do cliente

A mensagem pede que o conhecimento seja controlado pelo usuário, com permissão,
portabilidade e exclusão. Hoje existe metade:

- **feito**: a exportação inteira (`encerrar-conta.mjs`), e o `acervo_forma` entre
  clientes que é anônimo por estrutura, sem `org_id`, sem `perfil_id` e sem chave
  estrangeira nenhuma
- **falta**: a pessoa VER o que o app aprendeu sobre a casa dela (a tabela `memoria` tem
  3 linhas e nenhuma tela), apagar uma lembrança, e exportar sem encerrar a conta

É pouco trabalho e é o tipo de coisa que decide uma venda para empresa maior.

### 4.7 O preço, que quebra se a rede funcionar

O catálogo cobra **por pessoa ativa**. Se o motor de distribuição funcionar, a maioria das
pessoas que tocam o TrackWard **não terá conta**, e as que mais geram valor (o fornecedor
que responde rápido) não pagam nada.

A mensagem ia falar de três fontes de receita e foi cortada, mas o problema estrutural é
independente: **assento é a régua errada para um produto cuja melhor parte acontece com
quem não tem assento.** Nem é preciso decidir agora; é preciso não construir mais nada em
cima da régua antiga.

---

## 5. Onde a mensagem CONTRADIZ uma regra escrita, e você precisa escolher

Isto é o que mais vale do documento, porque são decisões suas e nenhuma pode ser resolvida
escrevendo código.

**1. "A IA nunca decide sozinha" contra os níveis 4 e 5.** A regra está no `AGENTS.md` e é
a espinha do produto. Níveis 4 e 5 a revogam dentro de um limite. **A saída honesta não é
apagar a regra**: é dizer onde ela deixa de valer, por escrito, e o que a substitui (o
limite, o registro, o desfazer). Uma regra que vira "depende" sem dizer de quê é uma regra
morta.

**2. A parede contra a rede.** Ver a seção 2. Se a contraparte não for um objeto com teste
próprio, a rede vai entrar como exceção na política, e a parede é o que você vende.

**3. "Tarefa de fora nunca vira tarefa sozinha" contra "o app continua executando".** A
regra existe porque aqui o spam não cai numa caixa, cai na FILA DE TRABALHO de alguém.
Fluxo externo que anda sozinho é bom; fluxo externo que cria trabalho sozinho é a fila
poluída, e a fila limpa é a razão de o produto existir.

**4. Leitura contra escrita nos sistemas de fora.** Ver 4.4. Foi decidido ler só o
envelope e só intervalos, com motivo escrito. "Coordenar" reverte isso.

---

## 6. O que nem a mensagem nem o produto pensaram

As quatro de verdade:

**O grafo de contrapartes é a métrica, e ele não é medido.** Se o valor está na rede, o
número que importa não é usuários nem receita: é **quantas pessoas de FORA participaram de
um fluxo, e quantas voltaram**. Hoje esse número é zero e não existe lugar para ele. Um
painel de operação com esse número, antes de construir a rede, é o que evita construir
seis meses sem saber se funciona.

**O primeiro contato precisa ser de graça para o app, não só para a pessoa.** Ver 4.3.
Todo endereço público de agente é uma conta de IA aberta.

**O lado de fora precisa de um lugar onde o histórico dele mora, ou ele nunca vira
usuário.** A mensagem assume que o fornecedor um dia cria conta. Ele só vai criar se, ao
criar, **encontrar lá dentro o que ele já tinha feito**. Isso significa que a contraparte
precisa existir antes da conta, e a conta se cola nela depois. Se a conta começar vazia,
o laço não fecha, e o produto perde exatamente a pessoa que ele já conquistou.

**A reversão é um recurso de produto, e não um detalhe técnico.** Ver 4.5. É o que você
mostra numa venda para empresa grande, e é o que nenhum concorrente de IA tem hoje.

---

## 8. A camada entre a pessoa e as redes dela: o estado real, medido

Esta é a parte que o Leo chama de mais importante, e ela merece a conta exata. Medido na
base de produção em 10/10/2026:

| rede | lê? | escreve? | em uso |
|---|---|---|---|
| **WhatsApp** | sim, as duas vias | sim | 2 conectores, **travado na verificação da Meta** |
| **Agenda externa** | sim, só INTERVALOS (`lib/ical.ts` descarta título e local de propósito) | não | **0 agendas conectadas** |
| **E-mail** | **não**: existe o desenho, não existe o cliente | não | **0 caixas**, e nenhuma linha do app jamais falou com um servidor de e-mail |
| **Sistemas de gestão** | pelo conector genérico, se alguém escrever a chamada | não | nenhum ligado |

**Ou seja: a camada que vai ser o produto hoje é uma rede travada e duas integrações com
zero uso, uma delas sem implementação nenhuma.** Não é pouco para onde se chegou, e é
muito menos do que os documentos diziam.

### 8.1 O limite duro, que não é trabalho e sim impossibilidade

**O WhatsApp PESSOAL não pode ser lido por aplicativo nenhum.** A Meta publica a
plataforma de negócios, que funciona com um número registrado como empresa, e aquele
número **não pode ser o mesmo que você usa no WhatsApp do celular**. Não existe API para
as suas conversas pessoais, não é questão de permissão e não vai existir: o produto deles
é criptografado de ponta a ponta e isso é o argumento de venda deles.

Existem bibliotecas que dirigem o WhatsApp Web por fora. Elas funcionam, violam os termos
e levam banimento do número, que é o ativo da pessoa. **Não é um caminho, é um risco
fatiado.**

**O que dá para fazer, e é bastante:** um número do TrackWard pelo qual os OUTROS falam
com você e com o seu agente, que é o que já está construído e travado na verificação. A
frase honesta para quem compra é *"o seu WhatsApp continua sendo seu; o que entra pelo
número da empresa vira trabalho sozinho"*, e nunca *"você não precisa mais olhar o
WhatsApp"*.

### 8.2 O que falta construir, por rede

**E-mail, que é o buraco maior e o mais viável.** Falta o cliente de IMAP e a rota que
busca envelope, do jeito que `lib/caixa.ts` já sabe casar. Isso é trabalho de dias, não de
mês, e destrava a metade mais valiosa, que é a caixa de SAÍDA: "terminei e mandei" já está
nos enviados e não precisa virar clique.

Depois dele, **enviar**. Aí entram duas coisas novas: credencial de escrita (hoje só
existe segredo para leitura) e a conta de quem errou quando o agente mandar o e-mail
errado.

Pelo Gmail, ler e enviar exigem OAuth e **revisão de segurança do Google** para os escopos
restritos, que é semanas e tem auditoria paga. Por IMAP e SMTP com senha de aplicativo,
funciona hoje e sem revisão, e é por onde se começa.

**Agenda, que é o mais próximo de pronto.** Ler já funciona por iCal e só devolve
intervalo, por decisão escrita. Para o agente MARCAR, falta escrita, e aí o iCal não serve:
é a API do Google ou do Microsoft, com OAuth. O escopo de agenda é "sensível" e não
"restrito", então a revisão é mais leve que a de e-mail.

**E falta o que não é de rede nenhuma: a CAIXA ÚNICA.** Hoje o app tem canais internos,
notas e o secretário. Não existe um lugar onde o e-mail, o WhatsApp, o compromisso e o
pedido externo caem juntos, em ordem, com o agente separando o que é trabalho do que é
ruído. **É isso que a pessoa compra quando ouve "um lugar só", e é a única peça da lista
que não é integração: é produto.**

### 8.3 A ordem que eu defenderia aqui

1. **IMAP de leitura**, porque é dias e porque a caixa de saída prova a tese sozinha
2. **A caixa única**, com o que já entra (WhatsApp e e-mail), antes de somar mais rede
3. **Escrever e-mail**, com desfazer e com o registro de quem mandou
4. **Escrever na agenda**, uma plataforma de cada vez
5. **Os outros sistemas**, pelo conector, um por cliente que pedir

---

## 7. O que eu faria, e em que ordem

Discordo de um ponto do plano da mensagem, e é de ordem, não de direção: ela põe a rede na
fase 2, depois de 12 meses provando execução. **O `PLANO-LANCAR.md` já tem "deixar o app
receber um estranho" como checkpoint 2, antes de provar que alguém paga**, e o motivo
continua valendo: é mais barato testar o laço agora, com cinco fornecedores de verdade, do
que construir um ano em cima de uma hipótese nunca exercida.

1. **Atravessar a porta uma vez.** Pegar um pedido real da Simonetto, mandar por link para
   um fornecedor de verdade, e ver se ele responde. Custa uma tarde. Cinco pedidos de
   feedback com zero resposta é um sinal, e ele merece ser entendido antes de virar
   arquitetura.
2. **Dar nome à contraparte**, no banco e no teste da parede, antes de qualquer tela.
3. **O fluxo de duas pontas**, com o estranho anexando e perguntando de volta.
4. **Medir o grafo**, desde o primeiro dia dele.
5. **O desfazer e o registro do agente**, que é o que destrava a venda e o nível 4.
6. **O endereço público**, com o primeiro contato sem modelo.
7. **Escrever nos sistemas de fora**, por último, uma integração de cada vez.

Os passos 1 a 4 cabem no que `PLANO-LANCAR.md` já chama de checkpoint 2. Os 5 a 7 são o
produto da mensagem, e nenhum deles vale ser começado antes de o passo 1 ter resposta.
