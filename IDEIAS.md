# TrackWard: as ideias, e onde cada uma parou

Escrito em 08/10/2026, a partir das conversas dos últimos dias. Existe por um motivo
prático: a estratégia de 26/09 virou o `PLANO-OAAS.md` e sobreviveu, e a estratégia
destes dias vivia só na conversa, que já foi comprimida uma vez. Ideia que mora numa
conversa é ideia que se perde sem ninguém decidir perdê-la.

**Leia o `PLANO-OAAS.md` antes deste.** Lá está a primeira tese: o app que não espera
ser aberto. Aqui está a segunda, que nasceu depois e muda a unidade do produto.

Convenção: **feito** é o que está no ar e foi medido. **Decidido** é o que foi escolhido
e ainda não existe. **Aberto** é o que ninguém decidiu.

---

## 0. A segunda tese: a unidade é a PESSOA, não o workspace

A primeira tese dizia que o app se alimenta do que a empresa já faz. Esta diz outra
coisa, e as duas convivem:

> O TrackWard é de uma PESSOA, e as empresas são lugares por onde ela passa.

Ela nasceu de uma frase sua, e a frase era sobre uma dor concreta: você tem quatro
empresas, e para saber o que fazer de manhã precisava entrar em quatro lugares. Ninguém
faz isso. Abre um, esquece os outros, e a ferramenta deixa de responder a pergunta que
ela existe para responder.

**As consequências, que já viraram código:**

- a **agenda** é de um corpo, e não de um contrato. O compromisso marcado num espaço
  trava a agenda nos outros, porque a pessoa é uma só e não pode estar em dois lugares
- a **fila** é de uma pessoa. Vinte tarefas divididas em quatro listas continuam sendo
  vinte tarefas, e a conta de "o que eu dou conta hoje" não se divide
- a **carga** segue a fila. Medir só o espaço em uso é medir um quarto do problema e
  dizer que está tudo bem
- o **espaço pessoal** deixou de ser um produto à parte e virou a porta de entrada. Todo
  login tem um, inclusive quem entrou por convite, que é quem mais precisa porque não
  escolheu nada

**O que isso obriga, e que não é opcional:** o que atravessa entre espaços é a OCUPAÇÃO,
nunca o título. O colega precisa saber que você está ocupado na terça às 15h; ele não
pode ler "Reunião com o comprador da Silvereng". A parede entre empresas clientes
continua sendo a peça mais importante do sistema.

Estado: **feito**.

---

## 1. Substituir o e-mail

A ideia mais ambiciosa da série, e a que organiza as outras.

**Por que é plausível.** O e-mail já perdeu o papel que tinha: ninguém decide nada por
e-mail, decide no WhatsApp e registra no e-mail. O que sobrou para ele é ser o ENDEREÇO,
o lugar onde um estranho te alcança, e o arquivo do que foi dito. O TrackWard já tem
conversa, trabalho e memória no mesmo lugar, que é mais do que o e-mail tem.

**Por que é difícil, e a dificuldade é uma só.** O e-mail é universal porque qualquer
pessoa alcança qualquer pessoa sem combinar nada antes. Toda ferramenta de equipe falhou
nesse ponto exato, e não por falta de recurso.

**O que já existe na direção:**

- o `@`, que é o primeiro endereço que o app tem de verdade
- o telefone verificado, que é o segundo
- a caixa de e-mail conectada, lida pelo ENVELOPE (seção 49), que é como o app observa o
  trabalho onde ele acontece sem ler o conteúdo de ninguém
- o link de feedback, que é a prova de que dá para alguém de fora participar sem conta

**O que falta, em ordem de dificuldade:**

- escrever para quem não é da sua empresa (dentro do app)
- receber de quem não tem conta
- `trackward.app/@fulano` como endereço público

Estado: **aberto**, e adiado por decisão sua.

---

## 2. O endereço universal

A pergunta que você fez: *"por que eu dependo de ter uma conta de e-mail para criar conta
no TrackWard?"*

A resposta foi que não precisa, e isso virou código. Hoje a conta nasce de um telefone
verificado e carrega um `@` único, e nenhum dos dois pertence ao Google.

**O que o `@` resolve que o e-mail não resolvia:** ele é do TrackWard. Enquanto a
identidade das pessoas for o endereço do Gmail delas, o app é inquilino. Com o `@`, o
convite, a menção e um dia a mensagem de fora passam a ter para onde ir.

**O que ele ainda não resolve:** ninguém de fora consegue escrever para um `@`. Ele é um
endereço dentro de casa.

Estado do `@` e do telefone: **feito**. Do endereço público: **aberto**.

---

## 3. Onde o Slack, o Teams e o Basecamp pararam

Reconstruído da conversa, e vale menos pela história do que pela regra que sai dele.

Os três resolveram a conversa DENTRO da empresa e pararam na parede. O Slack Connect
chegou tarde e é constrangido: exige que as duas empresas aceitem, e na prática as
pessoas voltam para o e-mail quando precisam falar com um fornecedor. O Teams herdou a
conta corporativa e com ela a fronteira da empresa. O Basecamp nunca quis ser endereço.

**A regra que fica:** *a ferramenta que não atravessa a parede da empresa não substitui o
e-mail, substitui o corredor.* É uma boa coisa a ser, e não é a mesma coisa.

E a consequência para o TrackWard: **o que decide se ele substitui o e-mail não é o que
ele faz dentro de uma empresa, é se alguém de fora consegue chegar.**

Estado: **aberto**.

---

## 4. O vetor de spam

Você perguntou o custo, como medir e como evitar. É a objeção certa, porque todo endereço
universal é um alvo, e é por isso que o e-mail é insuportável hoje.

**O custo de errar é maior que o normal**, e por um motivo específico deste produto: aqui
a mensagem não chega numa caixa, ela chega na FILA DE TRABALHO de alguém. Spam que vira
tarefa é pior que spam que vira e-mail, porque polui a coisa que o app existe para manter
limpa.

**Como medir, quando existir:** a taxa de reclamação é a régua da indústria, e o corte
que o Google usa para remetente em massa é 0,3%, com o recomendado abaixo de 0,1%. Para o
TrackWard, a régua equivalente é quantas mensagens de fora são marcadas como indesejadas
sobre o total que entra.

**Como evitar, e a ordem importa:**

1. **ninguém escreve para um `@` sem ser aceito a primeira vez.** O primeiro contato é um
   pedido, não uma mensagem, e ele não entra na fila de ninguém
2. **o que entra de fora nunca vira tarefa sozinho.** Vira proposta, como tudo que a
   leitura produz
3. **o remetente é uma pessoa verificada**, com telefone confirmado, e não um endereço
   que qualquer um cria em três segundos. Isto é o que o e-mail não tem e nunca vai ter
4. **bloquear é por pessoa e para sempre**, e custa um toque

Estado: **decidido no desenho, aberto na construção.**

---

## 5. Habituar antes de substituir

Sua ideia, e é a parte mais realista da série: não tentar substituir o e-mail de frente,
e sim entrar por onde a pessoa já está.

- **conectar o WhatsApp**: feito no código, travado na verificação da Meta
- **conectar a caixa de e-mail**: feito (seção 49), lendo só o envelope
- **o telefone como entrada**: feito

O princípio: o app observa o trabalho onde ele acontece, em vez de pedir que a pessoa
mude de lugar. Quando ela perceber que o TrackWard já sabe o que ela combinou, mudar de
lugar deixa de ser esforço.

Estado: **parcialmente feito**.

---

## 6. As decisões que já foram tomadas, e o porquê

Valem mais escritas do que relembradas, porque são as que alguém vai querer desfazer.

**Guardar para sempre, não por 30 dias.** Se o app vira rotina, o cliente arquiva
documento e relatório nele, e 30 dias não é arquivo, é cache.

**Não existe excluir track.** O que se perde apagando é justamente a parte útil: por que
a obra parou, quantas foram entregues, onde o trabalho trava. Todo fim é um desfecho e
desfecho arquiva.

**Não mascarar o texto antes de mandar para a IA.** A resposta é contar com clareza o que
sai e ter um botão de desligar. Mascarar dá uma sensação de segurança que o produto não
pode cumprir.

**O plano que o cliente escolhe é sempre o maior**, então não existe tela de trocar de
plano, e preço não aparece em tela nenhuma.

**A IA nunca decide sozinha**, e isso não muda nem no secretário: lá ela EXECUTA quando
recebe uma ordem em palavras, que é outra coisa.

---

## 7. O que está aberto, e precisa de decisão sua

- **o que o plano grátis libera.** A recomendação registrada é um chão de graça (notas,
  tarefas avulsas, agenda) com o pago acrescentando leitura, rotinas e relatórios. Está
  em aberto desde setembro e trava a conversa de preço
- **sair do trial da Twilio**, ou esperar a Meta para o código ir por WhatsApp
- **o contrato de tratamento de dados com a Anthropic**, que é LGPD e não é opcional
  quando houver cliente pagante
- **o endereço público e a conversa com quem não tem conta**, que são a tese 1 inteira

---

## 8. Os blocos do plano de setembro, e onde pararam

Do `PLANO-OAAS.md`, para esta lista ficar completa.

| bloco | o que é | estado |
|---|---|---|
| A | a leitura que roda sozinha | feito |
| B | o WhatsApp de ida e volta | feito no código, travado na Meta |
| C | o e-mail como segunda entrada | feito |
| D | o sistema que persegue | feito |
| E | o processo descoberto | feito |
| F | o raio-X | feito |
| G | o diagnóstico de entrada | parcial (a pergunta do dia existe) |
| H | o onboarding | aberto |
| I | o acervo por nicho | aberto |
| J | a conta de operação do TrackWard | aberto |
| K | o arquivo que se fecha com o ciclo | feito |
| L | a porta do cliente externo | feito (feedback por link) |
| M | o preço | feito no catálogo, aberto no plano grátis |

---

## 9. Como manter este arquivo

Ele existe porque uma conversa se perdeu. A regra para não repetir: **ideia que muda a
direção do produto entra aqui no dia em que é discutida**, mesmo sem decisão, com o
estado honesto. Decisão tomada vira regra no `AGENTS.md`; ideia que virou código sai
daqui e vira linha de estado.
