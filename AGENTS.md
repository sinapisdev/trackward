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
- A coluna do meio tem **duas faces**, Conversa e Notas, e a aba de conversa carrega o
  número do que está por ler. As duas são as superfícies onde se escreve, e é para cá que a
  pessoa volta o dia inteiro; separar é o que evita ter que trocar de tela para pensar.
- Ao lado da conversa fica a **coluna de canais**. Ela pertence ao chat, e não é uma quarta
  coluna do Forward: sem ela, responder a alguém que não é o canal aberto exigia trocar de
  tela. **Só canal entra ali**: nota não é canal, e já foi, e foi um erro. A classe é `.cnx` e não `.cn` porque `.cn` já é o cartão de
  conector, e **classe curta repetida é o jeito mais silencioso de uma tela quebrar a
  outra**: já aconteceu com `.trk` e com `.ag-linha`. Ao criar classe nova, conferir antes.
- **O Forward é onde o dia inteiro cabe.** Criar objetivo e criar rotina ficam de fora de
  propósito, porque são decisão, não operação: a pessoa senta para fazer isso. O resto
  precisa caber aqui, e toda coisa nova que exigir sair da tela para uma ação corriqueira é
  um defeito de desenho, não uma escolha.
- **No celular a página inicial é a LISTA DE CONVERSAS**, na forma de app de mensagem:
  uma linha por conversa, nome em cima, última fala embaixo, hora no canto, selo vermelho
  do que está por ler, tudo em ordem de quem falou por último. Sem grupos: no telefone a
  pergunta é "quem falou comigo", e agrupar por tipo obriga a procurar a resposta em três
  lugares. No computador os grupos ficam, porque ali a lista é uma coluna parada ao lado
  do trabalho, e serve para navegar, não para alcançar.
  **Ela não abre dentro de um canal**: escolher a conversa por você é decidir com quem
  você vai falar. Tocando numa linha vai para `/chat/<id>`, que é a conversa inteira, com
  propostas, anexo e voz.
  Em cima da lista fica o mesmo seletor Conversa | Notas do computador.
  Se o produto é comunicação interna que organiza trabalho, o que abre no telefone tem que
  ser onde se fala: com a fila de tarefas na frente e o chat embaixo, o chat ficava na
  segunda tela de rolagem, que é o mesmo que não existir, e a ferramenta continuava sendo
  o WhatsApp.
- **O que saiu da inicial não sumiu.** Tarefas e radar estão em Meu trabalho, que no
  celular ganha o radar e a agenda no fim; tracks na aba delas; notas a um toque no
  seletor. A TabBar tem cinco lugares: Conversa, Trabalho, Tracks, Agenda, Mais.
- Quem decide é `useCelular()` em `componentes/partes.tsx`, e não `display:none`: esconder
  por CSS baixaria e montaria a tela inteira para escondê-la.
- **Uma ação de criar por tela.** O botão redondo da TabBar some só DENTRO de uma
  conversa, onde ficaria em cima do campo de escrever; ali quem cria usa a barra
  (`/tarefa`, `/objetivo`, `/nota`). Na lista ele abre **canal**, como em qualquer app de
  mensagem; em Meu trabalho, **tarefa**; na agenda, **compromisso**.
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
- **Ninguém é chamado pelo e-mail.** Um perfil pode nascer sem nome, por convite antigo ou
  por cadastro anterior ao formulário atual, e aí o banco guarda o endereço no lugar. O app
  não conserta o dado sozinho: ele **pergunta** (`componentes/PedeNome.tsx`), porque o nome
  da pessoa é dela. Enquanto ela não responde, `primeiroNome()` em `lib/nomes.ts` evita o
  "Boa tarde, fulano@gmail.com", que é cara de relatório de sistema e é a primeira coisa
  que alguém de fora vê. A pergunta dá para adiar e volta na sessão seguinte, nunca vira
  tarja permanente.
- **Papel nunca é escolhido por quem se cadastra.** Vem do convite (tabela `convites`, resolvida
  pelo trigger `novo_usuario`) ou de um administrador em Equipe. Quem abre a empresa vira admin
  dela porque não há mais ninguém ali para dizer que pode.
- **Entrar numa empresa é só por convite.** O domínio do e-mail não coloca ninguém para dentro:
  quem se cadastra sem convite abre a empresa dele, não cai na sua. `organizacoes.dominio` e
  `entrada_por_dominio` continuam no banco sem abrir porta, e não voltar a usá-las para isso.
- **O mesmo login vive em várias empresas**, uma por convite aceito mais a que ele abriu. São
  perfis distintos do mesmo `user_id`, e `sessoes` guarda em qual ele está. É o caso do grupo e
  da holding, então nada pode assumir que uma pessoa tem um perfil só.
- **Uso pessoal voltou, e agora é um produto.** `organizacoes.tipo` aceita `pessoal` desde
  sempre, e o que era caminho guardado virou a segunda forma de vender o app. A regra
  inteira está em "Dois workspaces", abaixo.
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

## Dois workspaces, e num deles não existe segunda pessoa

O TrackWard é vendido de duas formas, e as duas rodam o mesmo modelo. **A lógica do
workspace empresarial não muda por causa disto**: fluxo, trilha, checkpoint, item, prazo,
nota e agenda continuam as mesmas tabelas e as mesmas regras. O workspace **pessoal** é
esse mesmo app com o que exige uma segunda pessoa apagado, e não um produto à parte. É
essa escolha que deixa os dois de pé com um código só; no dia em que o pessoal virar um
fork, quem usa o app no trabalho e em casa passa a usar dois produtos parecidos, que é o
pior dos dois mundos.

**No pessoal deixa de existir**: canal, mensagem, menção e não lidas; equipe, convite,
papel e gestor; responsável, delegação e carga; aprovador de checkpoint e "Aprovar saída",
que viram fase fechada pelas próprias tarefas; visibilidade (`equipe`, `escolhidas`,
`so_eu`), porque não há de quem esconder; e empresas dentro da organização
(`config.multi`). O que ganha peso é o contrário: capturar rápido, rotina na frente de
objetivo, e o dia (o que vence, o que está marcado) como tela inicial.

**A trava entre tarefas fica.** "Não dá para pintar antes de rebocar" é seu com você
mesmo, e vale sozinho. O que morre é a dependência de terceiro e o aviso de quem está
segurando, que ali é sempre você. Não jogar a trava fora junto com a delegação.

**O que some, some no banco.** A tela não pode ser a única a saber. A lista do que cada
espaço pode fazer mora num arquivo só, `recursos()` em `lib/espaco.ts`, e as telas
perguntam a ela (`pode.canais`, `pode.delegar`, `pode.aprovacao`, `pode.visibilidade`,
`pode.equipe`, `pode.empresas`). Espalhar `org.tipo === 'pessoal'` pelas telas é o jeito
conhecido de, seis meses depois, aparecer um campo de responsável num app de uma pessoa
só: quem escreve tela nova não lembra de uma regra que não está escrita em lugar nenhum.

As recusas de verdade estão na seção 20 do `supabase/schema.sql`, e são quatro: um espaço
pessoal por login, convite não nasce apontando para espaço pessoal, convite não é aceito
por lá, e canal não entra. Espelhadas em `lib/local/cliente.ts`, como todo o resto.

**Na tela, o pessoal é o mesmo app com menos coisa, e não outro app.** Só muda o que
depende de outra pessoa: some a aba Conversa (e `/chat` redireciona para a inicial), a
coluna do meio do Forward fica só com o caderno, o formulário de track perde "Quem vê",
"Dono" e o aprovador de cada checkpoint, o de tarefa perde "Responsável", a lente
"Minhas / Toda a equipe" some, e a coluna da track troca a conversa pela atividade, que
ali deixa de ser botão porque é o que sobrou na coluna. "Aprovar saída" vira **"Fechar
checkpoint"**, e a tela de decidir continua a mesma, com as palavras trocadas: fechar,
fechar com pendência, voltar atrás. A tela vale pelo que ela mostra antes de seguir, não
pela assinatura.

**No celular a inicial do pessoal é o caderno**, na mesma posição em que a conversa está na
empresa. A lista de notas tem a mesma forma da lista de conversas, então quem troca de
espaço encontra a mesma tela com outro conteúdo. Se fosse outra coisa, o hábito que a
pessoa criou na empresa não atravessaria, e hábito que não atravessa é app que não se usa.

**O espaço pessoal é da pessoa, não da empresa.** Ele é uma `organizacoes` com
`tipo='pessoal'` e `dono_id` dela, e precisa sobreviver ao dia em que ela sai do emprego.
Por isso a cobrança dele é por `user_id`, nunca pelo plano da empresa, e o administrador
não liga nem desliga o pessoal de ninguém. Sem isso, o que se vendeu para a pessoa é uma
coisa que o chefe dela pode cancelar, e aí não era dela.

**Onde cada um entra.** Já de dentro, o pessoal é contratado no seletor de espaços, que
é onde a pessoa já vem trocar de lugar, e o espaço desligado continua listado dizendo
"acesso encerrado" em vez de sumir. No cadastro são **três** cartões: para minha equipe,
**só para mim** e tenho um convite. Quem escolhe pessoal não vê opção de empresa em lugar
nenhum, nem o campo, nem o exemplo de e-mail: não é assunto dele naquele momento. Quem
escolhe empresarial entra como é hoje, com assentos e podendo abrir mais de uma empresa.

Quem decide isso no banco é `novo_usuario` (seção 26), pelo campo `espaco` dos dados do
cadastro, e é **o mesmo caminho** dos outros dois: mesmo perfil, admin e dono do que abriu,
mesma sessão. O que separa os dois produtos continua sendo `organizacoes.tipo`, lido por
`recursos()`. Um segundo caminho de cadastro seria uma segunda chance de os dois saírem do
lugar. **Convite vence a escolha**: quem chega com código entra na empresa que convidou,
mesmo tendo pedido pessoal, porque o convite é combinado com alguém e a escolha não.
O **nome do espaço pessoal é o nome da pessoa**, e não se pergunta: quem disse "só para
mim" já respondeu de quem é.
Depois de dentro, o espaço pessoal aparece para todo mundo no seletor de espaços, ao lado
das empresas, e é contratado à parte, porque não é da empresa.

**Um login, perfis separados, e sair de um não mexe no outro.** Quem tem espaço pessoal e
depois é convidado por uma empresa ganha um **segundo perfil**, na organização dela, com o
mesmo e-mail e nada em comum além disso: o que se vê é sempre o do espaço em uso. Quando
essa pessoa sai da empresa, o perfil de lá é desligado e aquele espaço fecha inteiro
(`ativo()` olha o perfil da sessão, não o login), enquanto o pessoal segue como estava,
com tudo dentro. Isso é o que se promete a quem paga pelo pessoal, então **o espaço
desligado tem que dizer que acabou**, e não abrir vazio: um app sem nada dentro, no dia em
que a pessoa saiu da empresa, parece perda de dados.

**Um espaço pessoal por login, e ninguém entra nele.** As duas coisas são recusa do banco,
não ausência de botão: convite apontando para organização `tipo='pessoal'` não vale, e
`abrir_espaco` não abre a segunda. Sem isso, a regra existe só enquanto alguém lembra dela.

**A porta fica aberta nos dois sentidos.** Quem entrou pelo pessoal e depois contrata gente
abre uma empresa ao lado, pelo seletor, sem migrar nada. No cadastro a opção não aparece;
depois, aparece.

**Em aberto, e não decidir isto no código:** o que o pessoal de quem já está numa empresa
traz incluído. A recomendação registrada é um chão de graça (notas, tarefas avulsas e a
agenda da pessoa) com o plano pago acrescentando a leitura, agenda externa, rotinas e
relatórios, porque colaborador pagando do próprio bolso dentro da ferramenta que o chefe
comprou compara o preço com o bloco de notas do telefone, que é de graça. Enquanto não
estiver decidido, não escrever limite nenhum espalhado pelas telas.

## Os planos, e quem pode ligá-los

São dois produtos, **Enterprise** (por pessoa ativa) e **Pessoal**, mais três estados:
**teste** (catorze dias com tudo), **reduzido** (o que sobra quando o teste vence) e
**interno** (a casa e a demonstração, sem teto e sem prazo). O catálogo mora em
`lib/planos.ts`, e as recusas, na seção 30 do schema.

**Isto não é a mesma pergunta que `recursos()` responde.** Lá é "este tipo de espaço tem
isto?", e a resposta nunca muda: num espaço de uma pessoa não existe aprovador, e não
existe por preço nenhum. Aqui é "o que foi contratado inclui isto?", e muda quando alguém
paga. Por isso são dois objetos no contexto, `pode` e `plano`, e não um só: misturados, a
tela perguntaria "posso delegar?" sem saber se pergunta sobre o produto ou sobre a fatura.

**A cobrança é por contrato, fora do app, e quem liga o plano é a operação pelo SQL Editor**
(`supabase/planos.sql`), nunca o administrador do cliente: plano que o cliente escolhe é
sempre o maior. Não existe tela de trocar de plano, e não voltar a criar uma. Pelo mesmo
motivo **preço não aparece em tela nenhuma**: um dia o número da tela e o do contrato
discordam, e quem está errado é sempre o que o cliente viu.

**A trava do plano olha a organização DA LINHA, não a de quem está logado.** Ela perguntava
`minha_org()`, e quando quem escreve é o servidor (o pulso, o WhatsApp) não há ninguém
logado: a função volta nula, a trava conclui modo reduzido, e toda criação feita sem sessão
era recusada com plano em dia, falando de teste vencido. A pergunta certa é a do
`new.org_id`, que o carimbo já preencheu, porque `ao_inserir_org` roda antes de
`so_com_plano`: o Postgres dispara gatilhos do mesmo evento em ordem alfabética. Isso passa
a valer mais do que valia, porque é assim que o app deixa de precisar que alguém o abra.

**O modo reduzido deixa LER tudo e TERMINAR o que já estava em pé, e não deixa começar
nada.** Apagar ou trancar os dados de quem estava avaliando é sequestro, e quem passa por
isso não volta; sem poder criar, o app deixa de servir para trabalhar em duas horas, que é
o aperto que a decisão precisa. A trava é um gatilho de insert nas tabelas onde nasce
trabalho, e a tela tem a dela em `Modais.abrir`, que é o caminho de quase todo formulário:
espalhar a checagem pelos vinte botões seria esquecer três, e o esquecido é o que o cliente
acha.

**O teto existe nos DOIS lados, e vazio quer dizer a mesma coisa nos dois.** Ele existia só
na tela: `tetoDeLeituras` lê `limite_leituras ?? plano.leituras`, e o banco perguntava
`limite_leituras is null or ...`, ou seja, coluna vazia era "vale o plano" de um lado e **sem
teto nenhum** do outro. Com `comecar_teste` preenchendo `teste_ate` e não a coluna, **toda
empresa em teste nascia sem freio**, com a tela dela dizendo 200. Catorze dias de modelo sem
limite por cliente em avaliação, e a conta de quem hospeda.

Quem responde agora é `teto_de_leituras(org)` (seção 57), que é `tetoDeLeituras` linha por
linha: a coluna manda sobre o plano, vazio cai no número do plano, o Enterprise multiplica
por assento ativo, e só `interno` devolve nulo. **Os números vivem em dois arquivos e não há
como não viver**, porque a tela precisa deles sem ir ao banco: `leituras_do_plano` aqui,
`PLANOS` em `lib/planos.ts`, e mexeu num, mexa no outro. A conferência do `atualizar.sql`
imprime os do banco para serem comparados com os olhos.

**E `organizacoes.plano` ganhou restrição.** Quem liga plano é a operação, na mão, pelo SQL
Editor, e um erro de digitação gravava um plano inexistente. Plano inexistente não casa com
nenhum `case`, cai no `else`, e vira sem teto: o erro mais caro possível, escrito por quem
estava justamente tentando cobrar.

**O teto de leituras é degrau, não porta.** Estourado, a leitura cai nas regras embutidas e
o app segue inteiro (`pode_chamar_modelo`). É isso que deixa o limite separar planos sem
quebrar ninguém. No Enterprise ele conta **por assento ativo**, porque o custo de IA anda
com o tamanho da equipe, e a conta é a mesma nos dois lados: se a tela multiplicasse e o
banco não, a tela diria um número e a leitura pararia noutro.

**Convite aberto já ocupa assento.** Senão dá para mandar vinte num plano de cinco, e o
estouro cai em quem aceitou, que não fez nada de errado.

**O desconto do pessoal cai sozinho, e o app avisa.** Quem está ativo numa empresa cliente
paga menos pelo espaço pessoal (`desconto_do_pessoal()`); no dia em que sai, a pessoa
recebe um aviso e a consulta 4 de `planos.sql` lista quem passou a pagar cheio. A cobrança
é na mão, e plano que continua barato depois que o motivo acabou é receita que some sem
ninguém notar.

**O teste vence por data comparada na hora**, e não por um serviço que vira o plano à
meia-noite: enquanto o serviço não roda, o cliente usa de graça, e é mais uma peça para dar
errado. Vale nos dois lados, `planoDe()` e `plano_em_vigor()`.

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

Sistema de **acento único**: chão **grafite** (`#16191A`), tudo construído com branco a
4 a 20% de alfa em vez de cinzas novos, e uma cor saturada, o lima `#D0FA3C`. Tipografia
**Figtree**.

O chão era o quase-preto `#0A0B0A` da arte, e subiu em 24/09/2026. É a **única divergência
proposital do DESIGN.md**, e o motivo é tela de verdade: preto puro espelha o ambiente, e
branco puro em cima dele floresce nas bordas, que é o que cansa a vista em conversa longa.
A troca foi 19,7:1 de contraste por 16,2:1, muito acima do necessário nos dois casos. Ao
mexer em cor de chão, medir contraste antes e escrever o número no comentário. Rótulos de seção em caixa alta espaçada, pílulas para segmento e selo, cantos
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
DESIGN.md marca modo claro como inferência.

**O claro é CINZA, não branco.** Painel branco sobre fundo quase branco não separa nada e
estoura na tela: é a mesma cor com nome diferente, e o olho procura uma borda que não
existe. O chão é `#E9EBE7` e o que sobe fica mais claro que ele, que é a mesma hierarquia
do escuro ao contrário.

Duas coisas o claro exige, e as duas são sobre o acento. O `--ac-tinta`: lima puro não se
lê como letra sobre fundo claro (1,3:1), então tudo que é letra, ícone e fio fino usa a
tinta, enquanto fundo de botão e brilho seguem no lima. E o próprio `--ac` desce um degrau
lá (`#BCDE36`): o lima da arte é de fundo escuro, e sobre cinza claro ele vibra e chama
mais atenção que o trabalho. Ao mexer no acento, mexer nos dois temas.

**Os tokens do escuro existem em duas cópias**, uma em `[data-tema="escuro"]` e outra em
`prefers-color-scheme`, porque CSS não deixa compartilhar bloco entre as duas. Elas têm
que continuar idênticas: mexeu numa, mexa na outra, senão quem nunca escolheu tema vê um
app e quem escolheu vê outro.

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

**E ele pergunta pela SESSÃO, que é o que não existe quando quem grava é o servidor.**
`minha_org()` volta nula no WhatsApp e no pulso, e aí a linha nasce com `org_id` vazio.
Como toda política pergunta `minha(org_id)`, essa linha existe e **ninguém a enxerga, nem
quem a criou**: não dá erro, não aparece na tela, e só se acha procurando. Quem conserta é
`quem_age()` (seção 44), que guarda na transação de quem é a casa, e o carimbo passa a ter
onde olhar. Vale para tudo que o servidor grava em nome de alguém, hoje e amanhã: o
conserto NÃO é acrescentar `org_id` a trinta inserts espalhados por seis funções, porque
seria esquecer um, e a sétima função nasceria esquecendo todos.

O laço que cria esses gatilhos tem `continue when to_regclass(...) is null`. Não é
zelo exagerado: sem ele, uma tabela que ainda não existe no meio da lista derruba
o bloco inteiro, e todas as tabelas depois dela ficam sem carimbo. Ao acrescentar
tabela nova àquela lista, manter o `continue`.

## A chave de serviço passa por cima de RLS, e por isso a pergunta muda

`ve_fluxo` pergunta por `meu_perfil()`, que sai da sessão. O WhatsApp e o pulso escrevem
com a chave de serviço, que **não tem sessão e ignora política**: ler `fluxos` direto ali
devolve TODAS as tracks da organização, inclusive a `so_eu` de outra pessoa e a
`escolhidas` de quem não convidou ninguém.

Isso não era hipótese. A lista que o telefone oferece ("em qual track isto vive?") saía
dessa consulta, então o nome de uma track privada aparecia numerado para quem mandasse uma
mensagem, e bastava responder o número para pôr trabalho lá dentro. O furo estava no
`/tarefa @Ana` desde que ele existe, e a triagem de texto solto o herdou inteiro.

**O conserto não é uma segunda cópia de `ve_fluxo` com outro nome.** Duas cópias da regra de
visibilidade é a pior coisa que o schema poderia ganhar: no dia em que uma mudar e a outra
não, o app mostra pela tela o que esconde pelo telefone, e ninguém percebe. A regra mora uma
vez, em `ve_fluxo_como(f, uid)` (seção 51), e `ve_fluxo(f)` virou o invólucro que responde
`meu_perfil()`. Mesmo caminho de `p_como` na seção 43 e de `quem_age` na 44. A conferência
do `atualizar.sql` verifica que o invólucro continua sendo invólucro.

**As funções com `uid` são do `service_role` e de mais ninguém.** Elas respondem "o que
FULANO enxerga", e uma pessoa logada podendo perguntar isso com o id de outra é a porta dos
fundos das regras de visibilidade com outro nome.

**E a conferência se repete na hora de escrever.** A lista já sai filtrada, mas uma pergunta
feita antes do conserto fica guardada em `perguntas_abertas` com a lista velha dentro, e
continua respondível por dois dias. `naTrack` é o único lugar que escreve numa track pelo
telefone, e ele pergunta de novo antes de escrever.

**Quem vê a lista é quem já participa**, e é assim que tem que ser: colaborador enxerga o
que é dele. Estar em `fluxo_pessoas` só vale em `escolhidas`; numa track `equipe`, quem
entra é admin, quem tem a área, o dono, o aprovador, o responsável por alguma tarefa e
quem está travado por ela. Ou seja, o pedreiro só pode endereçar a obra depois que a
empresa o pôs nela, e essa é a personalização que o produto promete, não uma falta.

## O registro de acesso: estreito de propósito, e não se apaga

Toda trava é uma aposta contra o que se conhece hoje. O que muda o jogo depois de um
incidente não é mais uma trava, é **conseguir dizer o que aconteceu**: quem virou
administrador, quando alguém passou a ver uma track que não via, quem trocou uma credencial,
quem entrou numa nota que não era dele. Sem isso, a resposta ao cliente é "não sei", e é a
pior que existe.

`atividades` não serve e nem devia: é o histórico da track, é produto, e é **podada nas 40
últimas**. Registro que se apaga sozinho não é registro.

**O que entra em `auditoria` (seção 56) é estreito, e a escolha é o desenho.** Leitura não
entra: a tela lê dezenas de tabelas a cada abertura, e um registro que cresce com o uso
normal vira ruído onde ninguém acha nada. Entra o que **muda quem pode ver o quê** e o que
**toca credencial**, que é a forma de todo incidente: papel, desligamento, visibilidade de
track, entrada em nota, convite, plano e dono da empresa.

**Nada de conteúdo.** Nome de track e papel sim; texto de tarefa, de nota ou de mensagem
nunca. Registro que copia conteúdo vira uma segunda cópia do que ele existe para proteger.

**O nome de quem agiu é COPIADO para a linha**, e não só o id: o perfil pode ser esquecido
depois, e o registro precisa continuar dizendo quem foi, que é o trabalho dele.

**E não se apaga.** Não há política de insert, update nem delete para ninguém, e um gatilho
recusa as duas últimas ainda que alguém crie uma política depois. Nem o administrador do
cliente, e a razão é ele mesmo: parte do que se registra ali são ações de administrador.

**`auditar` engole o próprio erro de propósito.** Um app que recusa desligar alguém porque a
auditoria engasgou é um app que ninguém opera num dia ruim. A queixa vai para o log.

**As duas travas abrem para a empresa inteira sair.** O perfil não se apaga e o registro não
se apaga, mas os dois deixam passar quando a organização já não existe, que é o estado
durante a cascata de `delete from organizacoes`. Sem essa porta, a trava que protege o
cliente viraria a que impede encerrar a conta dele e devolver os dados. Isso foi descoberto
tentando: as duas recusas apareceram uma depois da outra.

## O perfil não se apaga, e esquecer é esvaziar

Vinte e seis colunas apontam para `perfis` e sobrevivem à morte dele virando nulo:
`itens.autor_id`, `itens.resp_id`, `mensagens.autor_id`, `anexos.autor_id`, `fluxos.dono_id`,
`etapas.aprovador_id`, `decisoes.quem_id`. Se a linha some, o histórico da empresa continua
lá e **ninguém fez nada**: "concluída por ninguém, em 12 de março". Sete outras apontam com
CASCATA, e entre elas estão `notas` e `compromissos`: apagar um perfil destruía as notas e a
agenda daquela pessoa.

E o caminho não era escondido. `perfis.user_id` apontava para `auth.users` com cascata, então
**apagar o login no painel do Supabase**, que são dois cliques e é a coisa óbvia a fazer
quando alguém pede para sair, levava tudo junto. Um funcionário demitido custava à empresa as
notas dele, em silêncio.

Duas travas (seção 55): o perfil **não se apaga**, e apagar o login **não arrasta** o perfil.
O que sobra é a lápide: uma linha sem login nenhum, por onde ninguém entra, que existe só para
o histórico continuar dizendo quem fez.

**Desligar continua sendo o caminho normal** (`ativo = false`, que é o que a tela já faz) e
resolve o funcionário que saiu: some das menções, dos seletores e dos canais, e o trabalho
fica inteiro. `esquecer_pessoa` é o caso raro, o de quem EXIGE ser apagada.

**A régua do esquecimento é uma só: o que nunca saiu da pessoa vai embora.** Nota sem
`nota_pessoas` e sem cartão em canal, compromisso `visivel = false` sem convidado, telefone,
assinatura de push, url da agenda pessoal e credencial da caixa de e-mail. O que passou por
alguém fica, porque ali virou registro da casa e apagar quebraria o que outra pessoa lê.

**O dono da empresa não se esquece enquanto for o dono.** `proteger_perfil` recusa desativar
quem abriu a conta, e com razão; esquecer o dono deixaria a casa com um dono chamado "Pessoa
removida", sem login e sem ninguém que possa transferir nada. A função recusa e manda passar
a empresa adiante primeiro.

**E o esquecimento se anuncia na transação** (`trackward.esquecendo`), como `quem_age` faz na
seção 44, porque `proteger_perfil` segura login, e-mail e `ativo` de propósito e não pode
deixar de segurar. A exceção é estreita: o login pode ser **cortado**, nunca trocado por outro.

## A parede entre empresas clientes é uma afirmação, e afirmação se testa

O medo certo num app vendido para várias empresas não é o dono ler o que é do cliente: é
**uma empresa alcançar a outra por dentro do sistema**. Essa parede tem uma peça só, que é
`minha(org_id)` em toda política, mais `carimbar_org` preenchendo a etiqueta. Uma política
sem a amarra, numa tabela só, e a parede acabou.

Isso não se confere lendo: **confere-se plantando**. Duas empresas, dado com texto
reconhecível na segunda, e a primeira tentando alcançá-lo por todo caminho que existe:
cada uma das 43 tabelas etiquetadas, a busca por texto, e as funções recebendo o id da
outra empresa na marra. O ensaio está em `zparede` e o resultado precisa ser zero em todas.
Ao acrescentar tabela com `org_id`, repetir a varredura em vez de conferir a política nova
no olho.

A varredura tem um efeito de lado que vale mais do que ela: perguntar a TODAS as tabelas se
elas respondem é o que acha política circular, e foi assim que a agenda apareceu quebrada.

## A agenda estava quebrada havia meses, e ninguém viu

`compromissos` perguntava por `convidados` e `convidados` perguntava por `compromissos`,
com subconsulta normal nas duas. É o mesmo círculo de `notas` e `nota_pessoas`, e o
Postgres responde igual: **"recursão infinita detectada na política"**.

A diferença é que este ninguém viu, e o motivo é o desenho do erro. Quem lê a agenda é
`sb.from('compromissos').select('*')` no carregamento do `Dados`, e um erro ali não derruba
a tela: a lista chega vazia. **Agenda vazia parece agenda sem compromisso**, e é por isso
que um defeito total sobreviveu a todas as varreduras de tela: elas olham se a tela pinta,
e ela pintava.

A lição não é sobre a agenda: **erro de leitura que vira lista vazia é o modo de falha mais
caro deste app**, porque some. Ao escrever carregamento novo, vale mais um erro barulhento
do que uma lista vazia bem-comportada. E ao mexer em política que fala de outra tabela,
perguntar antes se a outra fala desta: se as duas falam, o círculo é certo, e quem o quebra
é `security definer` (seção 54).

## Função definer nasce fechada

`security definer` existe para a função enxergar o que quem chamou não enxerga: é o que
quebra a recursão das políticas e o que deixa o servidor agir sem sessão. O preço é que ela
**passa por cima de RLS**, e com permissão para `authenticated` ela vira a porta dos fundos
da política que está ao lado dela.

`perguntas_abertas` é o retrato. A política da tabela sempre disse `perfil_id =
meu_perfil()`, ou seja, a caixa é de uma pessoa só, como a de avisos. E `perguntas_de(p)`
devolvia a caixa de QUALQUER perfil para qualquer pessoa logada, sem conferir nada: lá
dentro vai texto de tarefa privada e de mensagem de canal fechado, que é exatamente o que
a política existia para proteger. `eventos_de(org, ...)` era pior em alcance, devolvendo a
atividade inteira de uma organização sem passar por `ve_fluxo` nem por `ve_item`.

A regra (seção 52): **`revoke` de `public, anon, authenticated` e `grant` só para quem
precisa.** Se o navegador precisa da função, ela não pode aceitar o id de outra pessoa sem
conferir, e a conferência é dentro dela, nunca na tela. Função de gatilho fica fechada
também: quem a dispara é o Postgres, que não pede permissão, e deixá-la aberta é superfície
de graça, ainda mais nas `proteger_*` e `travar_*`, que são justamente as que recusam coisa.

**RLS trabalha por linha, e `select` escolhe coluna.** O segredo do conector morava na linha
que a empresa inteira pode ler, e bastava pedir a coluna. Revogar coluna não resolve: em
Postgres isso não vale enquanto existir `grant select` da tabela inteira, e a alternativa
seria listar à mão as colunas permitidas, lista que alguém esquece de atualizar e a tela
quebra sem motivo aparente. A saída é a que o schema já usava em `avisos_contato`,
`push_assinaturas` e `caixas`: **tabela própria, RLS ligada, política nenhuma** (seção 53).
Ao guardar credencial nova, é esse o lugar, e a leitura passa por `chaveDoConector`.

## A saída para a internet é uma porta só, e ela confere cada salto

Três rotas chamam endereço de fora: a agenda externa, o conector e o webhook do agente. As
três tinham o mesmo buraco escrito de três jeitos: conferir o endereço e chamar `fetch` com
o `redirect` no padrão, que é **seguir**. A conferência valia para o primeiro salto e para
mais nenhum, então um endereço público que responde `302` para `169.254.169.254` ou para
`127.0.0.1` levava o servidor para dentro da rede. No conector é pior, porque ele **devolve
um pedaço da resposta**: a leitura de dentro voltava pela tela.

E duas delas conferiam só o TEXTO do endereço (`host === 'localhost'`), o que qualquer nome
que resolva para 10.x atravessa sem esforço.

`lib/saida.ts` é a porta única. `redirect: 'manual'`, e quem decide se vai é `proximoSalto`,
depois de conferir o destino com a mesma régua do primeiro: protocolo, nome impossível e o
IP **resolvido**. Desvio que troca de máquina não leva credencial junto, porque o `fetch`
tira o `authorization` sozinho mas não tira cabeçalho de nome próprio nem o que está na url,
e são esses dois que a maioria dos serviços usa.

**O que fica de fora, e está escrito para não ser esquecido:** entre a conferência do IP e a
conexão existe uma fresta em que o DNS pode mudar de resposta (rebinding). Fechá-la exige
conferir na hora de abrir o socket, não na hora de decidir. O caminho fácil deixou de
existir; o difícil continua lá.

## Restrição que se alarga depois precisa nascer larga

`avisos_tipo_check` era posta estreita numa seção e alargada numa seção adiante, com
`parada`, `carga` e `rotina`. Num banco que já rodou, a passada seguinte quebra: a versão
estreita recusa linhas que a versão larga deixou entrar, e o arquivo inteiro para no meio.
Aconteceu em 05/10/2026, com duas linhas de `rotina` na produção.

E a lista estava errada nas duas: **`raiox` não aparecia em nenhuma**, e o raio-X cria aviso
desse tipo. No primeiro dia em que ele tivesse o que dizer, o aviso falharia, e falharia
dentro de `avisar()`, que engole o erro de propósito: ninguém saberia.

A regra: **lista de valores permitidos se escreve uma vez, completa, no primeiro lugar em que
aparece.** Ao criar um tipo novo de aviso, acrescentá-lo ali, não numa seção depois. Vale
para qualquer `check (x in (...))` que o arquivo repita.

## Um `update` no meio do arquivo dispara gatilho, e gatilho escolhe função

`avisar` nasce com dez argumentos na seção 14 e ganha o décimo primeiro na 27. Numa segunda
passada do `schema.sql` as duas assinaturas existiam ao mesmo tempo entre uma seção e a
outra, e o `update public.fluxos set desfecho` da seção 21 dispara gatilho que chama
`avisar`: o Postgres respondia "a função avisar não é única" e derrubava o arquivo inteiro
no meio.

**Só aparecia em banco COM dados, que é só a produção.** No ensaio, aquele `update` não casa
linha nenhuma, e comando que não toca linha não dispara gatilho de linha. Um erro que o
ensaio não via de propósito nenhum, e que esperava a primeira produção com uma track
concluída sem desfecho.

As duas assinaturas saem antes de a primeira nascer, e a conferência do `atualizar.sql`
conta quantas existem no fim. Ao dar argumento novo a uma função que gatilho chama, derrubar
as duas formas antes de recriar.

## Notas: uma nota é um assunto, e tem alguém do outro lado

O caderno **não é um canal**, e já foi. O nome ("Meu despejo") e o lugar (a lista
de canais) erravam pelo mesmo motivo: canal é onde se fala com alguém, e um
caderno listado ao lado de `#Financeiro` pede que você comece a escrever como
quem manda mensagem. Ninguém manda mensagem para si mesmo sobre uma ideia de
negócio. Escreve.

O desenho é o de um bloco de notas com alguém do outro lado:

- **Cada nota é um assunto, e é UM TEXTO SÓ.** Não existe campo de título:
  **a primeira linha é o título**, e aparece como título. Ninguém escreve uma
  nota começando pelo nome dela, escreve a primeira linha. As duas colunas
  continuam no banco, `titulo` derivado de `texto` a cada gravação, e `documento`
  em `lib/notas.ts` costura as notas antigas, que têm o título fora do texto.
  **A folha não tem moldura**: o campo ocupa o espaço todo, sem borda e sem
  fundo. Moldura em volta de folha faz o bloco de notas parecer formulário.
  **O cadastro fica atrás de um botão** (`componentes/DetalhesNota.tsx`): área,
  track, arquivos, fixar e apagar. Eles não são o trabalho, e soltos embaixo do
  texto empurravam o que importa para cima, meia página de campos antes da
  primeira linha escrita.
  Você escreve a pergunta como uma linha qualquer do documento e toca em
  Perguntar; a resposta entra logo abaixo dela, marcada com `> ` e desenhada
  como bloco da leitura. A partir dali é
  texto seu: dá para editar, mover e apagar como o resto.
  Havia duas caixas de digitar na mesma tela, o texto e um chat ao lado, e isso
  obrigava a pessoa a escolher onde escrever antes de ter o que dizer. Nota e
  conversa não são assuntos diferentes, são formas diferentes da mesma coisa, e
  a forma que serve a um documento é o documento.
  O formato ganha três coisas de graça: a resposta fica ONDE a pergunta estava,
  junto do raciocínio que a gerou; a conversa passada vira a memória da nota sem
  tabela nenhuma, porque o documento inteiro vai no pedido seguinte; e a busca
  acha o que foi respondido sem ninguém fazer nada.
  Quem faz isso é `componentes/Documento.tsx`, e a marca é `MARCA_LEITURA` em
  `lib/notas.ts`. **Marcar não é enfeite**: o que a máquina escreveu não pode se
  passar pelo que você escreveu.
- **Fora delas existe uma conversa solta**, que é a nota sem assunto:
  `notas.conversa`, uma por pessoa. **Essa continua sendo conversa mesmo**, com
  falas em sequência, porque ela não tem documento embaixo: a forma segue o que
  a coisa é. Ser uma nota, e não um canal nem uma tabela
  nova, é o que faz o que for dito ali entrar no acervo pela mesma porta do
  resto. Ela sai filtrada na fonte, em `Dados`, e nenhuma tela precisa lembrar de
  escondê-la.
- **Mensagem e proposta pertencem a um canal OU a uma nota**, nunca às duas nem a
  nenhuma, e um `check` garante isso. Quem vê a mensagem da nota é só a dona da
  nota, sem exceção para admin, igual à nota em si.
- **Responder é uma coisa, organizar é outra.** `/api/conversar` devolve texto;
  `lerNota()` continua indo por `/api/leitor` com `despejo: true` e devolvendo
  propostas que alguém aceita. A conversa nunca cria tarefa, e não diz que criou.

A lista de notas tem a **mesma forma da lista de conversas**: título em cima,
começo do texto embaixo, quando no canto, o assunto como etiqueta. É de
propósito: caderno e conversa são as duas superfícies onde se escreve, e
alternar entre elas não deve exigir aprender duas listas diferentes. **Não tem
campo de escrita rápida no topo**: o que se faz numa lista é achar, e quem vem
guardar toca no botão de criar, que abre a nota já aberta para escrever.

**A busca procura em tudo**: título, corpo, o nome da área e da track, e o que
foi dito na conversa de dentro da nota. Sem a conversa, procurar "betoneira" não
acharia a nota onde você perguntou sobre betoneira para a leitura, que é
exatamente onde a resposta está. Quem procura não lembra se escreveu no corpo ou
perguntou depois.

O que **organiza** é o endereço que a nota já tem, área ou track, o mesmo da
tarefa. O que **costura** continua sendo a ligação escrita no meio do texto,
`[[outra nota]]`, porque **pasta não sobrevive às trezentas notas**: a nota nova
sempre cabe em duas.

**O caderno soma, não só acumula.** Vão junto, na pergunta e na leitura, as notas
parecidas e as do mesmo endereço (`caderno`), mais os títulos de tudo que existe
(`indice`). É isso que faz a ideia de hoje encontrar a de um mês atrás: sem isso,
quem tinha que lembrar da primeira era a pessoa, que escreveu justamente para não
precisar lembrar. A leitura pode citar a nota antiga com `[[título]]`, e nunca
decide nada sozinha.

**O anexo pertence a uma tarefa ou a uma nota, nunca às duas**, e um `check` no
banco garante isso em vez da boa vontade de quem escreve o insert: anexo
pendurado em nada é arquivo que ninguém acha e ninguém apaga. Quem vê segue a
coisa a que ele pertence, e anexo de nota abre só para o dono dela.

## A nota que se mostra

A nota continua do dono e de mais ninguém, **sem exceção nem para administrador**, e
ninguém passa a ver nada por mudança de regra: só por gesto de quem escreveu. Mostrar tem
duas formas, e elas não são a mesma coisa:

- **Pôr num canal é deixar o cartão lá.** A mensagem aponta para a nota
  (`mensagens.nota_ref`, seção 25) e carrega só o título com o começo do texto, o bastante
  para alguém decidir abrir. É o caminho de "olhem isto". Já foi cópia do texto inteiro, e
  era errado três vezes: no meio da conversa ninguém via que aquilo era uma nota, a cópia
  envelhecia no mesmo instante, e quem quisesse acompanhar não tinha para onde ir.
- **Liberar para pessoas é acesso continuado**: quem recebeu abre a nota e lê o que ela
  for virando. É o caminho de "acompanhe isto", e mora em `nota_pessoas` (seção 23).

**Quem abre o cartão passa a ler a nota, e quem autoriza isso é o canal.** Não é convite do
dono, é gesto de quem lê: o dono já escolheu a plateia quando pôs a nota ali. Quem não pode
ver o canal não pode abrir a nota, e é `abrir_nota_do_canal()` que confere isso antes de
pôr a pessoa em `nota_pessoas`. A política daquela tabela continua recusando que alguém se
convide sozinho, então a função é o único caminho, e ela exige o cartão num canal seu. Sem
essa conferência, um id de nota qualquer abriria uma nota qualquer.

Duas consequências, e as duas são de propósito: quem abriu **aparece** em "Compartilhada
com", então o dono vê quem foi ler; e tirar alguém dali **não adianta** enquanto o cartão
estiver no canal, porque ele abre de novo. Quem quer cortar o acesso apaga a mensagem.

**Nota que passou por outra pessoa fica marcada na lista**, com o ícone de duas pessoas na
direita da linha, embaixo da hora, que é onde a lista de conversas põe o selo do que falta
ler. Vale nas duas direções: a que compartilharam com você e a que você compartilhou. No meio das suas
ela some, e o risco não é pequeno: você leria o que outra pessoa escreveu como se tivesse
escrito. Vale nas duas listas, a do celular (`Caderno`) e a do computador (`TelaNotas`), e
`/notas?nota=<id>` é como o cartão do chat chega lá.

**O que não vai junto é a conversa de dentro.** Quem compartilha está mostrando o que
escreveu, não o que perguntou à leitura enquanto pensava, e a segunda é a mais íntima das
duas. Por isso existem duas funções e não uma: `ve_nota()` (dono ou convidado) responde
pela nota e pelos anexos dela, e `minha_nota()` (só o dono) responde por mensagem e
proposta. Ao mexer numa política de nota, escolher qual das duas é a pergunta certa.

**Compartilhar é só leitura.** Duas pessoas editando o mesmo texto sem tempo real é o
caminho mais curto para alguém perder o que escreveu. A tela bloqueia e o banco recusa: a
tela sozinha deixaria digitar e engoliria em silêncio.

Cuidado que já custou caro aqui: a política de `notas` pergunta por `nota_pessoas` e a de
`nota_pessoas` pergunta por `notas`. Escritas como subconsulta normal, as duas se chamam
em círculo e o Postgres devolve **"recursão infinita detectada na política"**. Quem quebra
o círculo é `nota_comigo()` e `minha_nota()`, que são `security definer` e por isso rodam
fora das políticas.

## O WhatsApp de ida e volta: a qual pergunta isto responde

Lá fora não existe tela. A pessoa responde **"pronto"**, e pronto não quer dizer nada
sozinho: só quer dizer alguma coisa junto do que foi perguntado antes. Quem guarda o que
foi perguntado é `perguntas_abertas` (seção 32); quem decide a qual pergunta a resposta
pertence é `lib/casar.ts`.

**A regra que manda em tudo: na dúvida, perguntar.** Nunca escolher a mais provável. Errar
aqui não é mostrar a tela errada, é marcar como pronto o que não está, aprovar o que não
devia ou prorrogar um prazo que alguém está esperando, **em nome de outra pessoa**. Uma
pergunta a mais custa um toque; um casamento errado custa a confiança no app inteiro, e ela
não volta.

Quatro mecanismos, nesta ordem, e o primeiro que resolver resolve: a **citação** (o
provedor entrega o id da mensagem respondida, e aí não há o que interpretar); **uma só em
aberto**; a frase **nomeia**, e só vale quando o primeiro candidato ganha do segundo com
folga, senão é empate técnico com cara de conta; e a **escolha por número**, que só vale
quando uma única lista aceita aquela chave.

**A pergunta vence em dois dias.** Um "pronto" de duas noites depois quase certamente
responde a outra coisa: a pessoa esqueceu, e o app não pode fingir que ela lembra.

**São duas vias, e a diferença morre na porta.** `organizacoes.whats_via` diz se a empresa
fala pela Twilio ou pela Cloud API da própria Meta (seção 46). As três colunas que já
existiam servem às duas com outro sentido: o conector guarda endereço e credencial, e
`whats_sid` é o SID da conta na Twilio e o `phone_number_id` na Meta. Quem trata a
mensagem não sabe de qual veio, porque a pessoa do outro lado também não sabe.

O que muda de verdade são três coisas, e todas ficam em `/api/whats`:

- **A Meta verifica o endereço por GET** antes de mandar qualquer coisa, devolvendo o
  `hub.challenge` em texto puro. Sem isso o webhook nunca é ativado, e o erro que ela
  mostra é só "não foi possível validar a URL".
- **A assinatura é HMAC-SHA256 do corpo CRU** (`x-hub-signature-256`), e do cru mesmo: um
  espaço a mais na reserialização muda o resumo e a conferência passa a falhar sempre.
- **A resposta não volta na mesma requisição.** Na Twilio ela vai em XML no corpo; na Meta
  o webhook devolve 200 e a resposta é uma chamada nova. Por isso o que decide o que dizer
  devolve TEXTO (`Recado`), e quem entrega escolhe a forma. Foi o que permitiu as duas
  vias sem duplicar as 51 saídas daquele arquivo.

**A Meta manda recibo de entrega no mesmo endereço**, sem `messages` dentro. Silêncio é a
resposta certa ali: responder a recibo é conversar sozinho.

**O nono dígito.** O WhatsApp entrega número brasileiro antigo SEM ele: quem cadastrou
+55 42 99978-3288 chega como 554299783288. A conferência era dígito por dígito, então o app
não reconhecia a própria pessoa e respondia "este número não está ligado ao seu", que é a
frase mais desanimadora possível para quem acabou de configurar tudo certo. `formas_do_fone`
(seção 47) aceita as duas formas, e só para celular brasileiro: fora disso casaria número
de outro país por engano.

**A triagem pergunta ONDE VIVE, e perguntava o que é.** Ela oferecia "guardar como nota,
virar tarefa minha, deixa pra lá", e repare no rótulo do meio: tarefa **minha**. Não havia
caminho nenhum para a equipe, então todo texto solto que entrava pelo telefone caía no
privado por construção. O "preciso de cimento" do pedreiro virava lembrete que só ele veria,
e o comprador nunca ficava sabendo. O AGENTS já dizia qual é a única escolha que muda tudo
numa tarefa, e a triagem perguntava a outra.

Agora as tracks abertas são as primeiras opções da lista, e as três fixas vêm depois. A
ordem é o argumento: a resposta que faz o app valer alguma coisa é uma track, porque é lá
que a equipe enxerga e que a tarefa conta para o checkpoint. Com o privado em primeiro, a
opção fácil era também a que não chega a ninguém.

**O que a resposta significa viaja na opção (`faz`), nunca no número.** Com as tracks na
frente, "2" é a segunda obra para quem tem duas e é o caderno para quem não tem nenhuma.
Lendo o número, o app guardaria no caderno o que a pessoa mandou para a obra, sem dizer
nada. Quem tinha `alvo` e nenhum `faz` continua sendo a lista de desempate, que aponta para
outra PERGUNTA e não para uma track, e as perguntas que já estavam em aberto quando isto
mudou continuam valendo pelo número antigo.

**E o app não escolhe a track mais provável, nunca.** O dono da empresa está em todas, então
"a última que ele usou" acerta quase nunca, e pôr trabalho na obra errada é o erro que não
aparece. Endereço escrito resolve na hora; sem endereço, pergunta. O que não pergunta é a
barra: comando é ordem, e `/tarefa Ligar para o banco` continua nascendo avulsa sem
interrogatório, porque pedir confirmação do que a pessoa acabou de digitar é desconfiar
dela. Texto solto é o contrário, ninguém combinou nada com a máquina, e lá a pergunta é
obrigatória.

**Quem executa é quem mandou, até alguém mover.** O app não sabe quem compra o cimento, e
chutar seria inventar dono para o trabalho de outra pessoa. O que faz a coisa andar não é o
responsável, é o endereço: a tarefa numa track aparece para a equipe dela, e qualquer um de
lá pode assumir.

**E a SAÍDA precisa das mesmas formas que a entrada.** `formas_do_fone` existia só para
reconhecer quem escreveu. Para mandar, o app usava o número guardado e pronto, então a
resposta ia para +5542999783288 enquanto o WhatsApp conhece aquela linha como 554299783288.
A Meta recusa com `131030 Recipient phone number not in allowed list`, e a frase fala do
DESTINATÁRIO: quem depura vai mexer na lista de permissão da Meta em vez de olhar o número,
que foi exatamente o que aconteceu. `formasDoFone` em `lib/fone.ts` é o espelho em
TypeScript, e `mandarWhats` tenta as formas em ordem. Não há como saber de fora qual delas
aquela linha usa: linha nova tem o nove, linha velha não, e as duas convivem na mesma casa.

**E recusa de envio não pode sumir.** Era `if (!r.ok) return null`: a Meta recusava, o app
devolvia nada, e do lado de cá parecia que a mensagem tinha ido. Ninguém procura o que não
deu erro, e foi por isso que a volta do WhatsApp ficou quebrada sem ninguém saber por quê.

**Telefone não é senha.** `perfil_do_telefone()` só diz de quem é o número. O que muda o
trabalho de outra pessoa (aprovar checkpoint, prorrogar prazo, aceitar cascata) pede botão
explícito, nunca texto livre interpretado. E número desconhecido recebe resposta educada e
mais nada: quem erra o número não pode descobrir quem é cliente do TrackWard.

**Quem escreve pergunta é o servidor**, com a chave de serviço. Não existe política de
insert em `perguntas_abertas` para gente nenhuma, e a caixa é de uma pessoa só, inclusive
do administrador, pelo mesmo motivo de `avisos`.

**O carimbo de organização precisa existir em quem guarda telefone.** `avisos_contato` e
`push_assinaturas` ficaram fora daquela lista e, como a tela não manda `org_id` (e não
deve), salvar o próprio telefone falhava sempre, com um "não deu para salvar" que não
dizia o motivo. Quatro dias com as duas tabelas vazias e ninguém viu. `avisos` continua
fora da lista de propósito: lá quem escreve é `avisar()`, e o carimbo usa `minha_org()`,
que é a de quem age, e quem age quase nunca é quem precisa ser avisado.

## O ritmo é aprendido, e o app sabe dizer por quê

Horário fixo é honesto e é burro: a leitura das 13h30 cai no meio do almoço de uma empresa
e no meio da tarde de outra, e nenhuma das duas pediu isso. O dado para acertar já estava
no banco e ninguém usava.

São **dois sinais, para duas perguntas diferentes** (`lib/ritmo.ts`):

- **Quando a casa fala** diz a melhor hora de LER, e o certo não é ler no pico: é ler
  **meia hora depois**. Ler no meio da conversa é pagar por uma leitura que fica velha em
  dez minutos, e ainda propor tarefa sobre um assunto que a equipe está decidindo.
- **Quando cada pessoa responde** diz a melhor hora de PERGUNTAR àquela pessoa. É diferente
  por pessoa, e é o que separa um app que incomoda de um que chega na hora.

**Pouco dado, nenhum palpite.** Abaixo de umas quarenta mensagens (ou seis respostas, no
caso da pessoa), devolve vazio e vale o horário espalhado pela janela. Aprender de três
mensagens é inventar padrão onde só há acaso.

**Horário aprendido que não se explica é indistinguível de horário aleatório**, e o
primeiro dia em que ele errar vira desconfiança no app inteiro. Por isso o pulso guarda o
que escolheu e de quantas mensagens tirou (`pulso_horarios`, `pulso_amostra`, seção 36) e
Ajustes diz a frase: "às 09h30 e 17h30, meia hora depois dos horários em que vocês mais
conversam". E a janela continua na mão de quem quiser fixar.

**Dois horários escolhidos nunca ficam a menos de uma hora um do outro**, senão as duas
leituras leem a mesma conversa e cobram por isso. E quando há menos picos do que leituras
contratadas, ele **não inventa horário** para completar a conta.

## O processo descoberto, e a pergunta que o constrói

Empresa sem processo **já tem processo**: ele só não é constante, não é explícito e não tem
dono. O app não inventa nenhum, ele mostra a grama pisada.

**A descoberta procura forma, não sequência** (`lib/descobrir.ts`). Procurar a mesma
sequência repetida não funciona em empresa desorganizada, que é justamente quem mais
precisa: lá a ordem muda toda vez, alguém pula etapa, alguém faz duas de uma vez, e a
resposta é sempre "não achei nada". O que sobrevive ao caos são invariantes: o mesmo
gatilho, o mesmo desfecho, o mesmo **conjunto** de eventos no meio mesmo fora de ordem, e
as mesmas áreas. Os três critérios juntos, porque só o miolo agruparia "aprovar orçamento"
com "aprovar férias".

**Ela não sabe o que é "financeiro", e não vai saber.** Classificar setor exigiria uma
lista do que é processo financeiro ou jurídico; ela estaria errada para metade das
empresas, e a primeira construtora com um jeito próprio cairia na gaveta errada. O setor
entra pela **área de quem fez** (a view `eventos`, seção 38), e o nome sai das palavras que
a própria casa usa. Candidato sem área de maioria fica **sem área**, de propósito: processo
que atravessa setor não pertence a um, e são esses que mostram onde trava entre áreas.

**Nada vira processo sozinho.** O que sai é candidato, com o estado à vista, e o que foi
**recusado nunca volta a ser proposto**: insistir no que a pessoa já disse que não é o jeito
mais rápido de ela parar de ler o que o app diz.

**A pergunta do dia constrói sem pedir para a empresa se explicar** (`lib/perguntas.ts`).
Nunca "como é o seu processo de compras?", que ninguém sabe responder e que faz a pessoa
descrever o processo que gostaria de ter. Sempre sobre a **borda**, com resposta de dez
segundos que é um evento: "o relatório do contador chegou?". Cem eventos desenham o
processo sem ninguém descrever nada.

**Ela sai pelo pulso, e volta pela mesma porta de tudo.** O motor escolhe, o pulso manda
pelo WhatsApp (`perguntarODia`, em `/api/pulso`) e a resposta casa em `lib/casar.ts` como
qualquer outra. Quatro cuidados, e nenhum é detalhe: **uma por vez por pessoa por batida**
(o motor devolve até três na primeira semana, e mandar as três juntas é uma rajada; como o
relógio bate de hora em hora e ele recusa repetir o mesmo molde no mesmo dia, mandar a
primeira de cada vez espalha as três pelo dia sozinho); **não pergunta com pergunta em
aberto**, porque perguntar de novo antes da anterior é cobrar; **na hora em que aquela
pessoa responde** (`horaDeResponder`, e sem amostra vale a janela da empresa); e **só para
quem ligou o WhatsApp**, porque o telefone é dela.

**A pergunta que não saiu não conta.** Falhando o envio, nada é gravado: `pergunta_mandada`
só roda depois do sid voltar. Contar uma pergunta que ninguém recebeu estragaria a taxa
que decide quais perguntas são podadas.

**"Revelou" não é "respondeu".** Um "não" fecha e conta como VAZIA, e três vazias seguidas
podam aquela pergunta daquela pessoa para sempre. Qualquer outra coisa vira a triagem de
sempre, e só conta como revelou quando virar nota ou tarefa de verdade: resposta que não
vira nada no app não descobriu nada, e contá-la mantém viva uma pergunta que não serve. A
chave do molde viaja nas opções (`_molde`) porque precisa sobreviver a esse pulo a mais.

Três regras que impedem isso de virar chatice: **a pergunta é ganha** (existe porque revela
algo que o app não infere sozinho), **se poda** (três vazias seguidas e ela sai daquela
pessoa) e **diminui** (três por dia na primeira semana, uma da quarta em diante). A semanal
tem prioridade no dia dela, senão perde a vaga para as diárias e nunca acontece.

**A pergunta carrega o número e preenche o buraco que o número não responde**
(`lib/propor.ts`). A descoberta mostra O QUÊ: em 4 das 11 vezes ninguém conferiu o estoque.
Ela não sabe o porquê nem o que deve valer daqui para frente, e essas duas coisas não se
inferem de dado nenhum, porque são decisão. Então a pergunta vira: *"das 11 vezes, em 4
ninguém fez isso, e nessas 4 levou 13 dias contra 6 das outras. Devia ser obrigatório?"*.
Sim ou não, cinco segundos, e a resposta muda o desenho.

Ordenadas pelo que mais muda o processo, e **manda-se uma por vez**: cinco juntas viram
formulário, e formulário é abandonado. Quem aprova vem antes de tudo quando houve vez sem
ninguém aprovar, porque aí não é variação, é buraco. E o passo que **custou tempo** vale
mais que o que só variou: afirmar diferença que é ruído uma única vez derruba a
credibilidade de tudo que o app disser depois.

**Afirmar é melhor que perguntar, quando há maioria.** A pergunta cobra uma ação de quem
já está ocupado; a afirmação entrega uma. *"Isto costuma levar 6 dias, então montei com
esse prazo. Se preferir outro, é só me dizer"* é o app trabalhando; *"uso 6 dias?"* é o app
pedindo que trabalhem por ele. Isso não fere a regra de a IA não decidir sozinha, porque o
desenho inteiro ainda é proposta esperando aceite: escolher o padrão DENTRO de um rascunho
é rascunhar. A linha é **maioria clara dentro do rascunho afirma; empate, buraco ou fora do
rascunho pergunta**. Seis do Leo, três da Ana e duas sem ninguém não é maioria, e chutar ali
é inventar dono para o processo. E toda afirmação carrega o `mudar`: afirmação sem porta de
saída é imposição.

**O primeiro processo entregue tem três CHECKPOINTS, com uma tarefa em cada**
(`PRIMEIRO_MAXIMO`). O checkpoint é a porta e a tarefa mora dentro dele, então um processo
com um checkpoint só não tem trilha, não tem "onde está" e não tem passagem: é a lista
avulsa, que é exatamente o que o produto chama de não ser processo. Começar pequeno é
**poucas tarefas por porta, nunca poucas portas**. Pelo outro lado, doze etapas de cara
viram burocracia que ninguém pediu e o processo inteiro é descartado junto em duas semanas;
cada checkpoint a mais entra depois, com motivo.

**O checkpoint não se chama "tarefa:feita".** Os tipos da view `eventos` são de máquina, e
um processo nomeado com eles parece log de sistema: a empresa lê e conclui, com razão, que
aquilo não foi feito para ela. `rotuloDoPasso` traduz enquanto ninguém rebatizou, e o nome
definitivo é sempre de quem usa.

**O acervo entre clientes é de forma, e a fronteira é estrutura.** `acervo_forma` (seção 40)
não tem `org_id`, não tem `perfil_id` e **não tem chave estrangeira nenhuma**, e a
conferência do `atualizar.sql` verifica isso. Sobe qual pergunta costuma ser respondida e
qual costuma revelar; nunca nome, texto, valor ou conversa. Intenção não sobrevive ao sexto
mês: alguém vai querer "só uma coluninha" com o nome da empresa para depurar, e a partir
dali o acervo deixou de ser anônimo sem ninguém ter decidido isso.

## O raio-X: o que o processo cobra e não entrega

A descoberta mostra o processo que a casa já tem sem saber. O raio-X
(`lib/raiox.ts`, seção 48) olha o que ela já desenhou e diz **onde dói, em dias**.

- **O custo é em DIAS, nunca em porcentagem.** "Foram 21 dias esperando esta aprovação no
  trimestre" é frase que o dono resolve; "34% de retrabalho" não diz de quanto, sobre o
  quê, nem o que fazer. Achado sem custo em dias não sai de lá.
- **Três por vez.** Relatório com quinze problemas é ignorado inteiro, e o décimo quinto
  nunca foi lido por ninguém.
- **Um achado por checkpoint, o mais caro.** O mesmo lugar dispara três regras de uma vez
  (é carimbo, é espera e é gargalo) e ocuparia as três vagas dizendo a mesma coisa de três
  jeitos. Quem lê precisa de três lugares, não de três frases. O desempate é a tabela
  `PESO`, e não a ordem em que as regras foram escritas: ganha o `carimbo`, porque tirar o
  checkpoint resolve a espera junto, e acelerar a decisão de uma conferência que não
  confere nada é acelerar o que nem devia existir.
- **Nada sai com menos de quatro passagens.** É a regra 1.6, e aqui ela separa ajudar de
  inventar: dizer "este checkpoint nunca reprova" depois de duas passagens é afirmar sobre
  o acaso, e a primeira vez que o app fizer isso a pessoa para de acreditar no resto.
- **O gargalo só existe com mais de um checkpoint na track.** Com um só, ele come 100% do
  tempo por definição, e o achado seria "a única etapa desta track é a que demora", que não
  diz nada e ainda é o mais caro, então roubaria a vaga dos achados de verdade.
- **Não ranqueia gente**, e nenhum achado tem campo de pessoa. Não é delicadeza: relatório
  que aponta gente muda o que as pessoas registram, e aí o dado apodrece na origem. Quando
  o gargalo é alguém com checkpoints demais, o achado é sobre a DISTRIBUIÇÃO.
- **Chega pelo aviso, e não por painel.** Painel é onde o problema espera alguém ir olhar,
  e ninguém vai. E não é urgente: 21 dias por trimestre não mudam se forem lidos hoje à
  noite, e tocar o celular por isso gasta a credibilidade dos avisos que são urgentes.
- **Não existe botão que conserte sozinho.** O achado fala de um checkpoint que se repete
  em muitas tracks, e tirá-lo de todas é decisão de quem responde pelo processo. O que há é
  o diagnóstico, a frase do que fazer, e as duas saídas: resolvi, ou deixa pra lá. O que
  foi respondido não volta no mês seguinte.
- **Mensal, e não de hora em hora.** Os sinais são sobre o que se repete, e repetição não
  muda entre as 10h e as 11h. Mesmo cuidado da seção 42.

O cálculo mora em TypeScript, com testes, e o banco só entrega o material
(`passagens_do_raiox`, `empurroes_do_raiox`). A regra do que é carimbo e do que é gargalo
vai mudar, e mudar regra dentro de função de banco é mudar sem rede.

## A linguagem do chat

O chat é onde o trabalho nasce, então ele precisa ser onde o trabalho **é
feito**. Uma linha que começa por barra é ordem, e acontece na hora:

```
/tarefa Conferir o contrato @Ana até sexta
/objetivo Reforma da sede
/rotina Fechamento mensal
/nota O fornecedor cobra por lote de 50
/agenda Reunião com o Renato terça às 15h
/ajuda
```

**Comando e leitura são os dois caminhos, e a diferença é quem pediu.** Conversa
solta vira PROPOSTA, porque ninguém combinou nada com a máquina e ela pode ter
entendido errado. Comando vira coisa feita, sem proposta e sem confirmação,
porque quem escreveu a ordem foi a pessoa: pedir confirmação do que ela acabou
de digitar é desconfiar dela.

**Os sinais já tinham dono, menos um.** `@pessoa` é menção e funciona desde o
começo; `#canal` é como o app escreve canal; `[[nota]]` é como o caderno costura
o acervo. Sobrou a barra, que é o que Slack, Discord, Notion e Linear usam para
a mesma coisa. Por isso `/objetivo` e não `@objetivo`: dois significados para o
mesmo sinal é o jeito mais rápido de a pessoa parar de confiar nos dois.

**O `#` é o endereço, e ele existe porque no telefone não há "onde".** No app o
comando herda o lugar de onde foi escrito, e isso basta: `/tarefa` no canal da Reforma
nasce na Reforma. No WhatsApp não existe canal aberto, e sem um sinal de endereço TUDO que
entrava pelo telefone caía no privado, inclusive o trabalho que a equipe inteira precisava
ver. Um app de equipe em que nada do que chega é visto pela equipe é um bloco de notas
caro, e era isso que o WhatsApp estava sendo.

`#Reforma` casa por começo de nome, como o `@` já casa com o primeiro nome: ninguém digita
"Reforma da sede" inteiro no telefone. **Mas ele não escolhe quando fica em dúvida.**
`ondeEh` devolve TODAS as candidatas, e com duas Reformas abertas o app volta a perguntar.
O `quemEh` pode escolher a primeira porque errar a pessoa aparece na hora, com o nome
errado em cima da tarefa; errar a track não aparece nunca: ela vai para a obra errada, fica
visível para a equipe errada, conta para o checkpoint errado, e quem mandou lê "pronto" e
segue a vida.

O `#` vale nos dois lados, e no app ele **ganha** do canal onde foi escrito. Ele já saía do
título por `separaOnde`, então ignorá-lo faria a tarefa nascer com o nome certo no lugar
errado, calada. E ele entrou no exemplo do catálogo (`/tarefa Conferir o contrato @Ana
#Reforma até sexta`) porque é o sinal mais fácil de nunca ser descoberto: `@` e prazo a
pessoa tenta sozinha, "em qual track isto vive" não ocorre a ninguém.

**Barra só no começo da linha.** No meio dela é endereço de internet e é data:
`10/03` abrindo menu seria o app atrapalhando quem está escrevendo.

**O menu abre sozinho ao digitar a barra**, e mostra o exemplo inteiro em vez do
nome do comando. Linguagem de comando não morre de sintaxe difícil, morre de
ninguém descobrir que ela existe, e ler `/tarefa Conferir o contrato @Ana até
sexta` ensina a gramática toda de uma vez.

**Tudo que nasce de comando deixa rastro na conversa**, como mensagem de
sistema. Sem isso o canal viraria um lugar onde coisas somem: alguém digita e a
tarefa nasce num canto que os outros não viram acontecer. A exceção é a nota,
que é privada: o rastro diz que existe, nunca o que está escrito nela.

**O comando herda o endereço de onde foi escrito.** `/tarefa` no canal de uma track
nasce nela, e `/nota` também: a nota escrita ali vai para o caderno já com a etiqueta da
track. Sem isso a ideia anotada no meio da conversa vira "ideia legal" sem dizer de quê,
e quem for procurar por aquela track depois não a acha. Nota com track não leva área
junto, porque quem agrupa o caderno prefere a área, e a nota apareceria sob a frente
inteira em vez da track.

**A linguagem atravessa para o WhatsApp**, e lá também acontece na hora, sem modelo e
sem custo de mensagem: quem escreveu abriu a janela de 24 horas, e a resposta cabe nela.
Comando é conferido ANTES de casar com pergunta em aberto, porque ordem não é resposta:
quem digita `/tarefa ...` não está respondendo à pergunta de ontem.

**O que o comando QUER dizer mora em `lib/comandar.ts`, e ele não executa nada.** Recebe a
linha e os fatos do mundo, devolve a intenção (criar avulsa, criar na track, perguntar
onde ela vive) ou a recusa com o motivo. Quem escreve no banco é quem chamou, porque a
escrita é diferente dos dois lados: no navegador é o cliente da pessoa, no servidor é a
chave de serviço sem sessão. Sendo puro, ele é testável sem servidor, sem navegador e sem
banco. `Dados.executarComando` ainda tem as regras dele em casa, e a direção é adotar este
arquivo: o que não pode existir em duas cópias são as REGRAS, não a escrita.

**Abrir track pelo telefone precisa de `p_como`** (seção 43): `salvar_fluxo` barrava com
`ativo()`, que pergunta pela sessão, e quem chama do WhatsApp é o servidor, que não tem
nenhuma. Mesma parede que `decidir_etapa` atravessou na seção 35, mesma saída. Ao dar
`p_como` a uma função, o parâmetro entra em TODAS as definições dela no arquivo e a
assinatura antiga sai, senão a chamada do app fica ambígua e o Postgres responde "não é
única", que não diz o que fazer.

**Fala de máquina não vai para o telefone.** `recado()` peneira: as mensagens do schema
são português escrito para gente ler, e o que vem do PostgREST vem em inglês falando de
função, coluna e cache. Um teste pegou "Could not find the function public.salvar_fluxo
in the schema cache" chegando ao WhatsApp de alguém.

**Quando falta uma decisão que o app não pode tomar, o comando vira o formulário
já preenchido.** Tarefa para outra pessoa fora de uma track é o caso: avulsa é
privada de quem criou, então dar uma a outro seria cobrança que o cobrado não
enxerga. O formulário abre com texto, dono e prazo prontos, faltando só onde ela
vive. Recusar e mandar começar de novo seria pior.

**O prazo é lido do fim da frase para o começo.** "Ligar **para** o cartório **até**
sexta" tem dois marcadores, e o primeiro não é o prazo. Lendo da esquerda, o resto ("o
cartório até sexta") não é data, a leitura falha, e a regra de baixo tira só o "sexta",
deixando a tarefa chamada "Ligar para o cartório até". É o tipo de sobra que ninguém
repara ao escrever e todo mundo repara na lista depois, e valeu no app inteiro até
28/09/2026.

A gramática mora em `lib/comandos.ts`, as datas em `lib/quando.ts`, o menu em
`componentes/Comandos.tsx` e a execução em `executarComando`, dentro de `Dados`.
São três campos de escrita (canal, conversa do Forward, conversa da nota) e um
gancho só: três cópias virariam três linguagens diferentes no mês seguinte.

## O canal ganha uma track sem ninguém pedir

O app deixava CONVERSAR sem track e **não deixava TRABALHAR** sem track: `itens.fluxo_id` e
`etapa_id` são obrigatórios, então a primeira coisa combinada num canal livre batia em
"escolha para qual projeto esta tarefa vai". E a pessoa não sabe: ela criou o canal
justamente porque ainda não sabe que forma aquele trabalho tem. Pedir que ela invente a
track antes é pedir que desenhe o processo antes de ter vivido ele, o oposto do que este
produto diz em toda a seção de processos descobertos.

A saída já existia em outro lugar: a tarefa avulsa mora em "Minha lista", uma track privada
que **nasce sozinha na primeira tarefa** e que ninguém nunca vê. `track_do_canal` (seção 59)
é o mesmo truque, e usar duas vezes um mecanismo que já existe vale mais do que inventar um
segundo.

**`fluxos.implicita` é o que a mantém fora do caminho**: não aparece em Tracks, e o canal
continua listado como canal. O dia em que o trabalho ali tiver forma, alguém aceita dar-lhe
uma trilha e ela deixa de ser implícita.

**A visibilidade sai do canal, e isso não é detalhe.** Canal fechado não pode ganhar uma
track que a empresa inteira lê, senão o que foi dito a portas fechadas vira tarefa visível
por tabela. Fechado nasce `escolhidas`, com quem já está no canal convidado.

**E o checkpoint se chama "Em andamento".** Dar nome de etapa agora seria inventar o primeiro
passo de um processo que ninguém desenhou.

## A área se corrige onde ela nasce

A área não tem tela própria, e isso é a regra certa: ela é etiqueta, não lugar. Mas por
anos ela também não teve **conserto**: dava para criar digitando o nome dentro do
formulário de track, e quem errasse uma letra ficava com "Marcenariaa" para sempre.
`excluirArea` existia em `Dados` e **nenhuma tela chamava**. Isso não era decisão, como é
no caso da track, que não se apaga por motivo escrito: era uma ponta que ninguém fechou.

Corrigir e apagar moram agora ao lado de criar, no mesmo formulário, por um lápis colado
no campo. Mandar a pessoa para outro lugar perderia a track que ela está no meio de criar,
que é exatamente por que a tela de áreas saiu do menu.

- **Apagar é dois toques, e não uma caixa de confirmar.** A caixa seria outro modal por
  cima deste, e fecharia o formulário levando junto o que já foi digitado.
- **A seleção só é solta quando o banco confirma.** `fluxos.area_id` é `on delete
  restrict`, de propósito: tirar a área de tracks em andamento mudaria o que a equipe vê
  sem ninguém pedir. Limpar o campo antes da resposta faria a recusa parecer sucesso.
- **O campo do nome fica numa linha dele.** A coluna da Área tem 275px, e campo mais dois
  botões lado a lado deixam 89px, que mostra "Financei". A quebra é local; `.row-inline`
  serve a outras 19 telas e não muda por causa desta.

## Fala de máquina não vai para a tela, e a regra é uma só

`recado()` peneirava inglês de máquina antes de ir para o WhatsApp, e `falhou()`, que é a
mesma pergunta na tela, decidia por **tamanho**: `msg.length < 120 ? msg : padrao`. Tamanho
não diz de quem é a frase. "update or delete on table "areas" violates foreign key
constraint on table "fluxos"" tem 93 caracteres e chegava inteira a quem só queria apagar
uma etiqueta.

A distinção certa é de autoria: as recusas escritas no `supabase/schema.sql` são português
feito para gente ler ("Ressalva não se apaga, se conclui") e passam direto, porque dizem o
que fazer; o que o Postgres e o PostgREST escrevem sozinhos fala de constraint, coluna,
relação e cache. Quem responde isso é `falaDeMaquina()`, em `lib/erros.ts`, e as duas
portas perguntam a ele. Duas cópias da peneira é a garantia de que um dia a tela mostra o
que o telefone esconde.

## O anexo na conversa, e o anexo que só algumas pessoas abrem

Faltavam duas coisas, e na cabeça de quem usa elas são uma só.

**O anexo só existia pendurado numa tarefa ou numa nota.** No meio de uma conversa, que é
onde o trabalho nasce, não dava para mandar um arquivo: quem precisava mandar o contrato ia
para o WhatsApp, e com ele ia a conversa inteira. Agora o anexo também pertence a uma
**mensagem**, e continua sendo de UM dono só (`num_nonnulls(item_id, nota_id, ciclo_id,
mensagem_id) = 1`), porque anexo pendurado em nada é arquivo que ninguém acha e ninguém
apaga.

**Quem manda escolhe quem abre**, em `anexo_pessoas` (seção 61). Num canal de doze pessoas,
o contrato do fornecedor não é assunto de doze, e a única saída antes era não mandar, ou
abrir um canal novo só para isso.

**Quem está de fora NÃO VÊ QUE O ARQUIVO EXISTE.** Decisão do Leo, 06/10/2026. Mostrar o
anexo trancado parece mais honesto e é pior: anuncia que existe um documento sobre aquele
assunto, com nome e tudo, para quem não pode abri-lo. Isso não protege, convida a
perguntar, e a pergunta chega a quem mandou.

**A lista é opcional, e só ESTREITA.** Vazia é o comportamento de sempre: o anexo segue a
coisa a que pertence. E pôr alguém na lista de um anexo de canal fechado não abre aquele
canal para ela, o que é o que permite a escolha ser gesto de quem manda, sem passar por
administrador.

Três cuidados que custaram caro em outros lugares e valem aqui:

- **O Storage segue a mesma régua.** Sem isso a política esconderia a LINHA e o arquivo
  continuaria aberto a quem tivesse o caminho, que não é segredo: ele aparece em
  `anexos.caminho` e um dia aparece num log.
- **O círculo de políticas.** `anexos` pergunta por `anexo_pessoas` e vice-versa. Quem
  quebra são `anexo_restrito()` e `anexo_comigo()`, `security definer`, como em `notas` e na
  agenda. Sem isso, "recursão infinita detectada na política".
- **A lista entra DEPOIS da linha, e falhar ali desfaz tudo.** A política pergunta se o
  anexo é seu, e um anexo que ainda não existe não é de ninguém. E se a lista falhasse, o
  anexo nasceria ABERTO quando a pessoa pediu fechado, que é o erro que não dá para cometer.

**Na conversa, o arquivo vai junto com a frase**, pelo clipe do campo de escrever, e a
escolha de quem abre fica colada nele. Perguntar depois é perguntar tarde: quem manda já
sabe para quem é no instante em que escolhe o arquivo. E não há como anexar numa mensagem
já enviada, porque mensagem que muda depois de lida é a coisa mais confusa que um chat pode
ter.

## O canal que já tem forma ganha uma trilha, e quem nomeia é o modelo

A track escondida (seção 59) resolvia poder trabalhar sem track, e criava um problema no
lugar: ela ficava escondida **para sempre**. O canal acumulava quarenta tarefas numa lista
invisível, com um checkpoint chamado "Em andamento" e nenhum critério, e ninguém nunca era
convidado a nomear nada. Um canal que trabalha bastante continuava sendo um chat com lista
de tarefas ao lado.

**A regra de QUANDO propor é código, e o modelo só dá NOME.** É a mesma divisão de
`lib/descobrir.ts` e de `lib/raiox.ts`: o limiar mora em `lib/trilhar.ts`, onde se lê e se
discute, e o modelo faz o que só ele faz bem, que é achar a palavra que a casa usaria.
Pedir ao modelo para decidir se propõe seria trocar um número que se audita por um palpite
que ninguém explica depois.

**Os limiares são conservadores de propósito** (`MATURIDADE`): seis tarefas, porque
checkpoint com uma tarefa não é porta, é item; três concluídas, porque sem conclusão não há
sequência, só lista de desejos; e catorze dias, porque uma tarde movimentada não é processo.
É a regra 1.6 aplicada aqui: propor um processo a partir de três tarefas é afirmar sobre o
acaso, e a primeira vez que o app fizer isso a pessoa para de acreditar no resto.

**A ordem do rascunho é a ordem em que as coisas FICARAM PRONTAS**, e não a ordem em que
foram escritas. A trilha de um processo é a sequência que a casa cumpriu. E reparte igual,
nunca por semelhança de texto: agrupar por palavra parecida juntaria "conferir o orçamento"
com "conferir as férias", que é o erro que a descoberta evita de propósito.

**O cartão começa pelo número, e só então mostra o desenho.** A ordem é o argumento, igual
à de `componentes/Descobertos.tsx`: começar pelo rascunho é pedir opinião sobre um desenho
sem dizer de onde ele saiu, e a resposta honesta a isso é "não sei".

**Aceitar é `virar_track`, e não `salvar_fluxo`** (seção 60). Aquela congela a posição do
que já passou, com razão, e a track escondida tem UM checkpoint na posição 0 com tarefas já
concluídas: `trilha_comecou()` é verdadeiro e ela recusaria justamente a conversão. Depois
de virada, mexer na trilha é `salvar_fluxo` como em qualquer track. Sem a trava de "só
enquanto escondida", `virar_track` seria um caminho alternativo para remontar trilha que já
andou.

**Dois cuidados que o ensaio com dados pegou, e a leitura não pegaria.** Os checkpoints
velhos saem por ID, e não por ordem: o "Em andamento" tem ordem 0 e sobrevivia ao lado do
primeiro checkpoint novo, com a mesma ordem e nenhuma tarefa. E a track **sem tarefa
nenhuma** começa do começo: "nenhum checkpoint tem tarefa aberta" é verdade tanto quando
tudo ficou pronto quanto quando nada existe, e as duas coisas querem dizer o contrário uma
da outra.

**Quem desenha a trilha é quem responde pelo processo**, a mesma régua de prazo e de
critério de saída, e o banco recusa também. **E o que foi dispensado não volta**: havendo
uma proposta de trilha para aquele canal, aberta ou recusada, o pulso não propõe de novo.

## O secretário: a conversa onde cabe tudo, e que se organiza sozinha

Quem trabalha sozinho não tem com quem combinar nada, e por isso o espaço pessoal não tem
canal. Mas a pessoa continua tendo o que todo mundo tem: a ideia no trânsito, o compromisso
que alguém falou no corredor, o documento que chegou e que ela não sabe onde guardar. Isso
ia para o bloco de notas do telefone e morria lá, porque bloco de notas guarda e não
organiza.

**Por dentro ele não é nada novo**: é a conversa solta do caderno (`notas.conversa`, uma por
pessoa), que já existia e vivia escondida atrás de um botão no meio da lista de notas. Ser
uma nota, e não uma tabela nova, é o que faz o que for dito ali entrar no acervo pela mesma
porta do resto: a busca acha, a leitura lembra e o anexo pendura.

**Ele ocupa a posição da Conversa no espaço pessoal**, e isso é a regra dos dois workspaces
aplicada: quem troca de espaço precisa encontrar a mesma tela com outro conteúdo, senão o
hábito não atravessa e o app não se usa. Mesmo desenho, mesmos balões, mesmo clipe, mesmos
cartões de proposta. `/chat` deixou de mandar para a inicial e passa a mandar para cá: a
pessoa veio falar, e a inicial é lista.

**E ele lê sozinho** (seção 65). Era o que faltava para ele ser secretário em vez de botão:
quem trabalha sozinho é exatamente quem menos tem alguém para apertar "Organizar", e o que
ela escreveu no sábado esperava ela lembrar de voltar lá. `notas.lido_pela_ia_em` é a mesma
marca do canal, pelo mesmo motivo: sem ela, cada varredura releria o caderno inteiro e a
conta do modelo cresceria com o tamanho do acervo em vez de com o que foi escrito desde
ontem.

**Só a conversa solta, nunca as outras notas.** Nota é assunto que a pessoa escolheu abrir,
e ler todas sem ninguém pedir seria o app opinando sobre o que ela ainda está pensando. A
conversa é o contrário: ela existe para ser lida.

**O botão redondo some aqui**, como dentro de um canal: ele ficaria em cima do campo de
escrever, e quem cria usa a barra.

**E dá para DITAR.** Ditar é o jeito mais natural de despejar: quem está dirigindo não
digita, e é justamente aí que a ideia aparece. O recado passa a poder morar numa NOTA e não
só num canal, e `posso_ver_anexo` ganhou o caminho dela (seção 66). Sem essa linha o arquivo
subia, a mensagem gravava, e tocar devolvia recusa: o áudio existiria e ninguém o ouviria,
nem quem o gravou.

Quem autoriza é `minha_nota`, e não `ve_nota`: a conversa de dentro de uma nota é do dono e
de mais ninguém, mesmo quando a nota é compartilhada. Quem compartilha está mostrando o que
escreveu, não o que disse ao secretário enquanto pensava.

## Dentro de uma conversa a tela é toda dela

Duas coisas saem de cena no celular quando a pessoa entra num canal, e as duas pelo mesmo
motivo: ali a altura é o recurso escasso, e com o teclado aberto sobram quatro linhas.

**A TabBar some inteira.** O botão redondo já saía, porque ficaria em cima do campo de
escrever; a barra tem o mesmo problema por outro caminho, e come 56px. Sair não prende
ninguém: o cabeçalho tem a seta de voltar para a lista, como em todo app de mensagem. Quem
entra numa conversa entrou para ler e responder, não para trocar de seção.

**E a faixa de propostas some quando não há nada em aberto.** "Nada em aberto · Ver 5 já
decididas" é chrome puro: não diz nada que a pessoa precise agora e come mais 48px. Havendo
proposta aberta ela volta, porque aí ela é o trabalho. No computador fica sempre, porque lá
o espaço não disputa com nada e o histórico continua a um clique.

## Campo com letra menor que 16px faz o celular dar ZOOM

É regra do aparelho, não do app: tocando num campo com fonte abaixo de 16px, o navegador do
celular aumenta a página inteira para a letra ficar legível, e **não volta sozinho**.

**O estrago é todo visível e nenhum pedaço dele parece ter a mesma causa.** O texto cresce,
a página fica mais estreita em pixels de CSS, a barra de abas perde a última aba, o botão de
enviar sai pela direita e a conversa some. Em 07/10/2026 isso foi diagnosticado como
problema de teclado duas vezes seguidas, e os dois consertos (medir `visualViewport`, ligar
`resizes-content`) estavam certos e não eram isto.

A regra está no fim do `app/globals.css`, em `@media (pointer: coarse)`, e usa `!important`:
é regra da plataforma, precisa ganhar de todo estilo local, e a alternativa é caçar vinte
seletores agora e lembrar deles para sempre. `pointer: coarse` limita ao que se toca com o
dedo, então o desenho do computador não muda.

**Não se resolve com `maximum-scale=1`.** Aquilo mata o zoom de pinça, que é de quem precisa
dele para ler, e o Safari ignora de qualquer forma.

## O clipe e o microfone moram dentro do campo

Quatro controles lado a lado (campo, clipe, microfone, enviar) não cabem em 360px: com a
letra em 16px, a frase de ajuda quebrava em duas linhas e a segunda era cortada pela altura
do campo. Encurtar as palavras é remendo, e foi tentado: o que não cabia era o arranjo.

Dentro do campo, como em app de mensagem, sobram 70px e o enviar fica sozinho do lado de
fora. **No telefone a frase vira só "Escreva, ou /"**, porque a barra é o sinal e quem a
digita vê o menu abrir com os exemplos: é o MENU que ensina a linguagem, não a frase.

**Gravando, o grupo estica e o campo some**, pelo `:has(.voz-grava)`. É o certo: nessa hora
ninguém está escrevendo, e a barra de tempo e onda precisa da largura.

## O teclado é desenhado POR CIMA da página, e `dvh` não sabe disso

A conversa calculava a altura com `100dvh`. No celular, abrir o teclado empurrava a
conversa inteira para baixo dele e o campo de escrever saía da tela, que é justamente onde
a pessoa estava tentando digitar.

**Quem resolve isso é uma chave de viewport, e ela vem desligada.** O padrão do navegador é
`interactive-widget=resizes-visual`: o teclado sobe por cima e o tamanho da PÁGINA não muda.
Quem é `position:fixed` continua preso ao tamanho antigo, então a barra de abas fica embaixo
do teclado e leva o campo de escrever junto. Com **`resizes-content`**, em `app/layout.tsx`,
a página inteira encolhe: `100dvh` passa a dizer a verdade, o que é fixo gruda no lugar
certo, e o campo fica logo acima do teclado sem ninguém calcular nada.

Medir com `visualViewport` sozinho **não resolve**, e isso custou uma tentativa: ele acerta
a altura da CONVERSA e não mexe na barra de abas, que não depende dela. As duas coisas
ficam, porque são a mesma resposta por dois caminhos e o segundo cobre o navegador que
ignorar o primeiro.

**`dvh` não encolhe com o teclado** quando a chave está no padrão. Ele é a altura da janela
do navegador, e o teclado não é janela: ele é pintado por cima. Quem sabe o tamanho real é
`visualViewport`, que é a parte da página que a pessoa está realmente vendo.

`Shell.tsx` publica **`--alt-janela`** junto de `--alt-topo-real` e `--alt-abas-real`, e
quem calcula a própria altura usa ela em vez de `100dvh`. `offsetTop` entra na conta porque
com o teclado aberto o navegador às vezes rola a página por dentro em vez de encolher a
janela, e ignorar isso deixa a tela alta demais pelo tanto que ele rolou.

**Medido:** em 393x800, a conversa tem 682px de altura e o campo termina em 729. Com o
teclado ocupando 330px, ela passa a 352 e o campo termina em 399, dentro dos 470 visíveis.

**A barra do sistema em cima do teclado não se tira, e o WhatsApp não a tem por não ser
web.** Aquela com seta para cima, seta para baixo e um visto é o teclado navegando entre
campos de formulário de uma PÁGINA. App nativo desenha o próprio campo e nunca pede essa
barra; página não tem como recusá-la, nem em PWA instalado, e não existe API para isso. O
que dá para fazer é a conta de altura considerá-la, e `visualViewport` já faz, porque ele
mede o que sobra DEPOIS dela.

## A fala tem corpo, e o canal parou de ser mural de recibo

**Cada tarefa aceita escrevia DUAS linhas de sistema na conversa.** `adicionarItem` conta o
pedido ("Ariane pediu a Leonardo: Fazer o relatório, até 9 out") e o aceite contava de novo
("criou a tarefa X em Sócios"), as duas coladas. A primeira é a frase útil, porque diz quem,
para quem e até quando; a segunda repete o mesmo fato com menos informação. Agora a do
aceite só sobra quando a outra não saiu, que é a tarefa escrita para si mesmo.

**E a fala ganhou balão.** Não é enfeite: numa lista de parágrafos soltos, onde uma fala
acaba e a outra começa é uma decisão do olho a cada linha. O contorno responde isso sem
ninguém ler nada, e é o que todo mundo já aprendeu a ler no WhatsApp.

**O balão da sua fala é a MESMA cor, com um fio do acento**, e não lima cheio: dois limas na
mesma tela é defeito, e o acento é da ação que faz o trabalho andar, não do recipiente.

**O balão veste só o TEXTO.** Anexo, recado de voz e cartão de nota ficam fora: eles já têm
corpo próprio, e um dentro do outro vira caixa dentro de caixa. E o realce de linha inteira
saiu junto, porque com a fala tendo corpo ele virava uma faixa atravessando o vazio ao lado.

**E as linhas de sistema seguidas viram UMA**, que abre no toque. O canal precisa registrar
o que aconteceu com o trabalho, senão o combinado some num canto que o outro não abre. Mas
uma frase por evento vira mural de recibo, e quatro linhas de máquina para uma de gente é a
conversa deixando de ser conversa. Recolhidas, o registro continua inteiro e some de vista:
ninguém abre o app para ler recibo, e quem procurar acha.

## A proposta avisa quem vai fazer, e o aviso tem botão

A leitura roda sozinha três vezes por dia e deixava a proposta no canal. Quem não abriu o
app naquele dia não ficava sabendo, e o pedido esperava alguém passar por ali: o ciclo que
o produto promete parava justamente na beira.

**Só para quem a tarefa é** (seção 64). Para quem vai fazer, "alguém está te pedindo uma
coisa" é o que merece sair do app. Para os outros do canal é o celular tocando para contar
o que já está escrito na conversa que eles vão abrir de qualquer jeito, e a faixa de aviso é
estreita de propósito. **E não avisa quem pediu**, porque a frase foi dele. **Não é
urgente**: urgente é o que já venceu e o que trava outra pessoa.

**O aviso falha calado, e a proposta entra do mesmo jeito.** Sem isso, um erro no aviso
derruba o INSERT inteiro: a leitura acha o pedido, o aviso engasga, e a PROPOSTA não é
gravada. Apareceu num ensaio, com um argumento a mais na chamada de `avisar` fazendo o canal
cair na posição da nota.

**O botão da notificação ABRE O APP no endereço de aceitar**, em vez de aceitar por conta
própria. A regra do que acontece ao aceitar mora num lugar só, em `aceitarSugestao`, e uma
segunda cópia dela num endpoint seria a garantia de que um dia as duas discordam. Quem
decide se existe botão é `acaoDoAviso`, e hoje só a proposta tem: aprovar checkpoint e
prorrogar prazo mudam o trabalho de outra pessoa e continuam pedindo a tela.

**No iPhone não há botão**, porque o Safari ignora `actions`. Lá tocar no aviso abre o app
na conversa, que é o mesmo caminho com um toque a mais. Não há o que consertar nisso, e
escrever aqui evita alguém "arrumar" depois.

**`?aceitar=<id>` some da url antes de qualquer coisa**, e o controle é um `ref`: recarregar
a página não pode tentar aceitar de novo o que já foi decidido, e um estado novo dispararia
uma segunda passada antes de a lista recarregar.

## O push não se liga sozinho, e por isso ele se PEDE

"Ligado por padrão" não existe no navegador: ele exige autorização explícita e, na maioria
dos casos, um gesto da pessoa para mostrar a caixa. O que dá para fazer é o app **pedir**,
em vez de esperar alguém achar o interruptor em Ajustes, onde ele ficou meses sem ninguém
ligar (a tabela de assinaturas estava vazia em 07/10/2026).

**A hora de pedir não é a primeira vez que a pessoa entra.** Ali ela ainda não tem nada para
ser avisada, nega, e **negar é para sempre**: o navegador não pergunta de novo, e a porta
volta a existir só nas configurações do aparelho, que ninguém abre. `PedirPush` espera a
pessoa ter fila: aí a pergunta se responde sozinha.

Uma coisa de cada vez, como no convite de instalar: nome, tour `inicio`, e o convite de
instalar já respondido. Quem disse "agora não" não é perguntado de novo, e "Ver tudo de
novo" em Ajustes esquece isso junto com os tutoriais.

## Encerrar a conta de um cliente precisa funcionar

É obrigação de LGPD, e falhava de duas formas, as duas caladas.

**A trava da ressalva não perguntava POR QUE.** `proteger_ressalva` recusa apagar tarefa
com ressalva em aberto, e está certa: ressalva é dívida, e dívida se paga. Só que quando
quem apaga é a cascata de `delete from organizacoes` ela recusava do mesmo jeito, e um
cliente com uma única ressalva pendente não conseguia ser encerrado, com uma mensagem que
falava de ressalva para quem estava apagando uma empresa.

É a **terceira trava da mesma família**, e a porta é a mesma do perfil (seção 55) e da
auditoria (seção 56). Aqui ela olha o FLUXO, e não a organização: dívida sem checkpoint
credor não é dívida. Assim vale também para uma track sendo apagada, e continua recusando o
caso que importa, que é alguém sumindo com a pendência pela tela.

**Os arquivos sobreviviam à empresa.** A cascata apaga a linha de `anexos` e não o arquivo,
e o Supabase proíbe apagar arquivo por SQL ("Direct deletion from storage tables is not
allowed"). O caminho é a API de Storage, e ela só apaga por lista de caminhos: tem que
listar a pasta e remover em lote.

**A receita é `encerrar-conta.mjs`, na raiz, e não uma rota.** A lista de rotas com a chave
de serviço está fechada em duas de propósito, e encerrar conta é ato raro, deliberado e
irreversível: ele não deve existir atrás de um botão que alguém aperta sem querer. É
operação, como o `supabase/planos.sql`.

**São três passos, e a ordem é a regra inteira:** a cópia, os arquivos, o banco. Invertendo
o primeiro com o último não há o que copiar. Invertendo o segundo com o terceiro os
arquivos ficam órfãos para sempre, numa pasta com o id de uma empresa que já não existe.

**A cópia vem antes porque ela é do cliente.** É o que a portabilidade da LGPD pede, e é o
que torna o encerramento uma entrega em vez de uma perda. Dela saem de fora o registro de
acesso, que existe para proteger a casa, e o segredo cifrado de conector, que é inútil para
quem recebe e vira um segredo a mais circulando. As pastas `copia-*` estão no `.gitignore`:
são dados de um cliente, e o repositório é público.

## A trilha melhora enquanto roda, e as tarefas não vão junto

A trilha nasce de um palpite e só o uso diz se ela está certa. O raio-X já achava o
checkpoint que nunca reprova e **só relatava**: não existia caminho para tirar nem para
acrescentar, e o achado morria num aviso mensal.

**A armadilha está no caminho óbvio.** `salvar_fluxo` termina com `delete from etapas where
not (id = any(ids))`, e `itens.etapa_id` tem cascata: tirar um checkpoint pela lista de
etapas **apaga as tarefas dele**, sem avisar. Isso é inofensivo enquanto a trilha é rascunho
e cada checkpoint está vazio, e deixa de ser no dia em que alguém tira um checkpoint de uma
track que já trabalhou. Por isso `tirar_checkpoint` e `partir_checkpoint` (seção 62), e não
um parâmetro a mais em `salvar_fluxo`: elas existem para MOVER a tarefa antes de mexer na
trilha, e esse é o trabalho inteiro delas.

**O congelamento decide o que dá para fazer.** Tirar vale só para o que ainda não chegou,
porque tirar um checkpoint vencido faria a track mudar de lugar em silêncio. Partir vale
também para o corrente, porque o novo entra DEPOIS dele e nada que já passou troca de
posição.

**Os dois sinais são de naturezas diferentes, e isso importa.** O carimbo vem do raio-X e é
afirmação sobre repetição, então precisa de amostra (quatro passagens, a regra 1.6). O
checkpoint com oito tarefas não precisa: não é inferência, é a descrição daquele checkpoint
agora, e oito coisas antes de uma única passagem quer dizer que a trilha deixou de dizer
onde a track está.

**Um ajuste por track, o mais caro.** O mesmo defeito costuma disparar as duas regras, e
duas propostas sobre a mesma trilha na mesma conversa é o jeito mais rápido de a pessoa
dispensar as duas sem ler. Mesmo desempate do raio-X: ganha o carimbo, porque tirar o
checkpoint resolve a espera junto.

**Chega pelo canal daquela track, e não pelo sino.** O raio-X evita por desenho o aviso que
pede decisão; aqui a decisão tem dono e tem lugar, que é a conversa onde aquele trabalho
acontece. Track sem canal não recebe proposta.

## A track escondida escondeu o trabalho junto

`fluxos`, em `Dados`, filtrava `!f.implicita`, e o motivo era bom: sem isso cada canal
viraria uma track vazia na tela de Tracks. Só que `fluxos` não alimenta só Tracks. Alimenta
**Meu trabalho, o Forward e os dois contadores**, e ao esconder a track eu escondi o
trabalho junto: a tarefa combinada num canal sem track não aparecia para NINGUÉM, nem para
quem ia executá-la. Nada dava erro, a lista só vinha incompleta, que é o modo de falha mais
caro deste app porque some.

São duas perguntas diferentes, e agora são duas listas. **`fluxos` responde "quais tracks
existem"** e continua certa em Tracks, no seletor de uma proposta, no radar e nos
relatórios. **`fluxosComImplicitas` responde "onde está o trabalho"**, e é dela que saem a
fila e os contadores. O padrão NÃO foi invertido de propósito: uma track de canal aparecendo
em Tracks é visível e se conserta num dia; uma tarefa sumindo da fila não é, e já aconteceu.

**E a track escondida não transforma o canal em objetivo.** A coluna de conversas agrupava
por `c.fluxo_id`, então o canal trocava de grupo no instante do primeiro aceite, que é o
oposto do que `implicita` existe para fazer. A pergunta certa é se a track dele está em
`fluxos`, que já não traz as escondidas.

**Onde ela aparece, o endereço é a conversa, não a trilha.** O checkpoint da track escondida
se chama "Em andamento" e não tem critério: desenhar a trilha dela seria mostrar um andaime
e chamá-lo de processo. A linha e a gaveta dizem `#canal`, e a gaveta leva de volta ao chat
em vez de a uma track que a pessoa não sabe que existe.

## Quem pediu precisa saber se foi feito

A fila respondia só "o que depende de mim", e quem PEDE não executa: Carlos combinava algo
com a Ana no canal e, para saber se tinha sido feito, só perguntando. O trabalho voltava
para a conversa quando concluído, mas conversa rola, e aviso lido some.

`oQuePedi()` em `lib/regras.ts` responde a outra pergunta: tarefa aberta que eu escrevi,
para outra pessoa. Ela é **função separada de propósito**, e isso não é arquitetura: `pendencias()`
alimenta o contador da barra, o da TabBar e a fila do Forward, que respondem "o que eu faço
agora", e tarefa alheia não é isso. Juntas, a fila de quem mais pede (que costuma ser quem
menos executa) encheria de trabalho dos outros.

**Só Tarefas pergunta as duas**, num segmento próprio, "Pedi". Ele **não entra em
Aguardando**: ali a tarefa é minha e está travada, e o que se faz é esperar para executar;
aqui ela nunca vai ser minha, e o que se faz é cobrar ou deixar quieto. Misturar tira o
sentido da palavra que já existia.

**E "Pedi" é só de canal SEM track.** Tarefa que mora numa track de verdade já tem onde ser
acompanhada: ela aparece na trilha, conta para o checkpoint, e todo mundo que vê aquela
track a vê. Pô-la aqui também seria contá-la duas vezes e encher a fila de quem distribui
trabalho com o que ele já enxerga em Tracks. O buraco que a lista fecha é outro: o que foi
combinado num canal que ainda não tem forma mora numa track escondida, que não aparece em
lugar nenhum, e sem ela quem pediu só descobre perguntando.

**A tela chama-se Tarefas**, e não "Meu trabalho". O nome antigo descrevia a tela de quando
ela só tinha a sua fila; hoje ela tem também o que você pediu, e "trabalho" é a palavra
mais vaga do app: tudo ali é trabalho. A rota continua `/minhas`, porque endereço está em
favorito e em aviso já enviado.

**E não existe botão de concluir em "Pedi".** Marcar como feito o trabalho de outra pessoa é
dizer que foi feito sem ter sido. A gaveta mostra em que pé está e a porta de volta para a
conversa.

**O administrador não entra nisto por ser administrador.** Ele lê no canal que o Carlos
pediu e a Ana aceitou, e fica ciente. O painel dele continua sendo só o que ele executa ou
aprova, senão um dono de empresa abre o app e encontra o pedido de cupom fiscal de todo
mundo, e para de abrir.

## Quem pediu fica sabendo, e quem recebeu pode devolver

`aviso_ao_concluir` avisava só quem estava TRAVADO pela tarefa. Se ninguém dependia dela, ela
ficava pronta **em silêncio**, e quem pediu o relatório só descobria perguntando, que é
exatamente o que este app existe para evitar. `aviso_de_quem_pediu` (seção 58) cobre as duas
pontas: concluiu e devolveu.

**Devolver não é recusar trabalho, é devolver a decisão a quem pediu.** Na vida real a
resposta mais comum a um pedido errado não é fazer nem ignorar, é "isso não é comigo, é com a
Erika". Sem porta para isso, a pessoa ignora e a tarefa apodrece no nome de quem nunca ia
fazê-la. Por isso o motivo é **obrigatório** e por isso ela volta para o colo do autor em vez
de ficar sem dono: tarefa sem dono é tarefa que ninguém olha, e o ponto é que alguém olhe.

**O botão aparece só onde faz sentido**: tarefa sua, pedida por outra pessoa, e ainda por
fazer. Na que você mesmo escreveu não há para quem devolver, e na já concluída devolver não é
devolver, é desfazer, que é outra conversa. **E ele não é lima**: o acento é de quem faz o
trabalho andar, e devolver é dizer que ele não anda por aqui.

**E devolução não dispara "Nova tarefa com você".** Ela muda o responsável, então
`aviso_tarefa` disparava junto: dois avisos para o mesmo gesto, e o genérico ainda escondia o
motivo, que é a única coisa que a pessoa precisa ler.

## O que acontece com o trabalho volta para a conversa onde ele nasceu

`logar` escreve na ATIVIDADE da track, que é um histórico que ninguém abre: quem entra numa
track quer falar e ver o checkpoint, não ler o passado. O resultado era que **o trabalho saía
da conversa e nunca voltava**. Você combinava o relatório no canal, a tarefa ia para o Meu
trabalho de alguém, e o canal não ficava sabendo nem que ela existiu nem quando ficou pronta.

`contarNoCanal` manda a notícia para o CANAL da track, que é onde as pessoas estão. É a mesma
regra que o comando já seguia ("tudo que nasce de comando deixa rastro na conversa"),
estendida ao que acontece **depois**.

**Mas só o que é combinado entre duas pessoas.** Tarefa criada para si mesmo não vira
mensagem: anunciar toda tarefa transformaria a conversa numa lista de afazeres e aí ninguém
lê mais nada ali. O que a casa precisa saber é quando alguém passa trabalho para outra
pessoa, porque aí existe um combinado, e combinado some quando fica guardado num canto que o
outro não abre.

**E a mesma notícia não sai duas vezes.** O aceite de uma proposta de "ficou pronto" já
escreve no canal de origem, então ele chama `alternarItem` com `semRastro`. Sem isso a
conclusão apareceria duplicada, e duplicata na conversa é o jeito mais rápido de alguém
começar a ignorar as mensagens de sistema.

**Falha calada de propósito.** Um rastro que não saiu não pode impedir uma tarefa de ser
concluída.

## A proposta tem três portas, e "quase isso" não é motivo para recomeçar

Eram duas: aceitar e dispensar. Com isso, **dispensar virava a saída de "quase isso"**, e aí
a pessoa recusava e digitava tudo de novo: o trabalho da leitura virava zero justamente
quando ela quase acertou, que é o caso mais comum. "Conferir os documentos" vira "Conferir a
ART do engenheiro" em duas palavras, e quem, quando e onde já estavam certos.

**O ajuste tem dois andares, e o segundo é o que importa mais.** O primeiro é o TEXTO, que
resolve "quase isso": a ficha já deixava trocar onde, quem e até, e faltava a frase, que é o
que mais erra porque é o que exige entender.

O segundo é a ESPÉCIE, que resolve "não é isso", e foi o primeiro uso real que o mostrou: a
leitura entendeu "Helo termine o relatório até 25/10" como mudança de prazo de uma tarefa
parecida que já existia, e era tarefa nova. Essa leitura é **defensável**, porque o contexto
leva o que a casa já tem justamente para não propor a mesma tarefa duas vezes. Mas nenhum
campo conserta, porque o que está errado não é o conteúdo. Sem essa porta, a saída era
dispensar e digitar tudo de novo, e aí a leitura não serviu para nada justamente na vez em
que ela entendeu a frase quase toda.

Por isso `Ajustar` aparece em **toda** proposta, e abre as duas coisas: a frase e um segmento
"Isto é". Para onde dá para ir: tarefa, nota e decisão, que nascem de texto e mais nada.
Virar `prazo`, `concluir` ou `trava` exigiria apontar QUAL tarefa, e isso é escolha de outra
tela, não de uma ficha no meio da conversa.

**Trocando a espécie, o texto antigo deixa de servir** ("Prazo alterado para 25/10/2026" não
é nome de tarefa), e a ficha parte do `motivo`, que é a frase original. Mas só quando a
pessoa ainda não digitou nada: reescrever por cima do que alguém acabou de escrever é o pior
que um campo pode fazer.

**Daqui para baixo nada pergunta `sug.tipo`**, nem no aceite nem no rótulo do botão. Trocar
a espécie e continuar lendo "Registrar" num cartão que virou tarefa é não saber mais o que o
botão faz.

**Só viaja o que foi mexido.** Mandar o texto original de volta faria toda proposta parecer
corrigida na atividade, e aí "corrigida" deixaria de querer dizer alguma coisa.

**O que ainda não existe:** corrigir conversando ("na verdade são duas tarefas"). Para trocar
palavra ou espécie, o campo é mais rápido, de graça e certo. A conversa só ganharia para
dividir uma proposta em duas, e isso ainda não apareceu em uso real.

## A memória atravessa a conversa, e a privacidade é de mão única

Cada canal era uma empresa diferente: a leitura de #financeiro não sabia que a
tarefa combinada ali já existia na Reforma da sede, e propunha uma segunda; não
sabia que a equipe tinha decidido a data em outro canal, e propunha decidir de
novo. Agora vai junto no pedido o que a casa já tem: as tracks abertas, as
tarefas que já existem e as decisões já tomadas (campo `casa` do contexto,
montado em `oQueACasaTem`, dentro de `Dados`).

**A regra que decide o que entra ali tem uma direção só:**

> Leitura privada pode ver o que é público. Leitura pública não pode ver o que
> é privado.

O motivo é o motivo: a proposta que sai de um canal aparece para todo mundo do
canal, **com o trecho que a originou**. Qualquer contexto privado que entre no
pedido volta pela porta do motivo. Por isso, para dentro de um canal, só
atravessa o que a empresa inteira já podia ler:

- track de visibilidade `equipe`, nunca `escolhidas` nem `so_eu`
- tarefa não privada (`priv`)
- decisão tomada em canal **aberto**, nunca em fechado, direto ou em nota

O caminho contrário é seguro, e é o que `lerNota` faz: a casa inteira entra na
leitura de uma nota, porque o que sai dali fica com a dona da nota.

**A memória da casa (`memoria`) só aprende em canal aberto**, e isso foi um furo
até 23/09/2026. Aquela tabela é lida por qualquer pessoa ativa da organização, e
cada lembrança guarda um `exemplo` com 160 caracteres **copiados da mensagem**.
Aprender num canal fechado publicava pedaço de conversa fechada para a empresa
inteira, sendo que nem o administrador pode abrir aquele canal. Vale para as
duas portas: `termosDaConversa` recusa canal que não seja aberto, e
`podeEnsinarACasa` barra o aprendizado de proposta nascida em canal fechado,
conversa direta ou nota. O app aprende menos, e é o preço certo.

Ao acrescentar qualquer coisa ao contexto da leitura, a pergunta é sempre a
mesma: **quem vai ler a proposta que sair daqui já podia ler isto?**

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

## O app na tela do celular, sem passar por loja

O TrackWard é instalável como PWA, e isso não é consolo de quem não fez app nativo: é o
mesmo código que um Capacitor rodaria depois, com manifest e ícones que se aproveitam
inteiros. O que a loja daria a mais são três coisas concretas, e nenhuma delas vale a
revisão da Apple na fase de validar: vitrine, receber conteúdo compartilhado no iPhone, e
push mais firme por lá.

**O iPhone é o motivo de existir o convite.** No Android o Chrome oferece sozinho e bastaria
não atrapalhar. No iPhone não há evento nenhum: o caminho é Compartilhar, rolar e achar
"Adicionar à Tela de Início", e ninguém descobre isso sozinho. Pior, **só funciona no
Safari**: quem está no Chrome do iPhone não tem a opção e conclui que o app não dá para
instalar. O convite diz as duas coisas, e é a diferença entre ser instalado e não ser.

**O service worker ganhou um `fetch` que não faz nada**, e é burocracia do Chrome: sem
ouvinte de fetch ele nunca dispara `beforeinstallprompt`, e o convite simplesmente não
aparece, sem erro e sem nada para depurar. Ele não chama `respondWith`, então nada é
guardado: a regra de o worker não decidir qual versão a pessoa vê continua valendo.

**E ele é registrado na abertura, não no fluxo de push.** Registrado só quando alguém ligava
o aviso, um app instalado sem push ficava sem trabalhador nenhum.

**Uma coisa de cada vez, e instalar é a última das três.** O primeiro teste mostrou o convite
por cima do tutorial: dois cartões empilhados, o de baixo ilegível, e a pessoa fechando os
dois sem ler nenhum. Ele espera o nome e espera o tour `inicio` ter rodado, porque quem já
passou por ele não está mais na primeira vez, e é a quem vale oferecer.

**Quem disse não, não é perguntado de novo.** A porta fica em Ajustes, que é onde se procura
o que se recusou antes. Tarja que volta toda semana é tarja que se aprende a ignorar.

## O tutorial de cada tela

O app não se explica sozinho: a tela inicial mostra conversa, fila e radar ao mesmo tempo,
e quem chega não sabe que a conversa é o lugar onde o trabalho nasce nem que existe uma
linguagem de barra. Em Tracks é pior, porque ali mora a ideia inteira do produto e nada na
tela diz o que é um checkpoint. Sem isso a pessoa usa o TrackWard como um chat com lista de
tarefas ao lado, que é exatamente o que ela já tinha.

**É um tour curto por tela, e ele abre quando a pessoa CHEGA naquela tela**, não tudo no
primeiro acesso. Quarenta passos de enfiada no primeiro dia é um folheto, e ninguém lê
folheto: a pessoa pula e nunca mais vê. Três passos no dia em que ela abriu Tracks pela
primeira vez, ela lê. São catorze telas, e `perfis.tutoriais` guarda os ids dos que já
rodaram.

- **Ele aponta para a tela de verdade**, e não mostra desenho de tela. O que se aprende é
  ONDE a coisa fica, e isso não se aprende olhando figura dentro de um modal.
- **O alvo é um `data-tut`, nunca uma classe de CSS.** Classe muda quando alguém mexe no
  estilo, e aí o tutorial passa a apontar para o nada sem quebrar nada visível, que é o
  jeito mais silencioso de ele morrer. O atributo existe só para isto.
- **Passo sem alvo na tela não trava a fila**: o cartão vai para o meio, sem foco, e a
  pessoa segue. E ele **sai por qualquer porta**, Esc, clique fora, Pular e Fechar, porque
  a primeira coisa que alguém faz num app novo é tentar sair da caixa que apareceu.
- **O cartão se posiciona medindo a si mesmo**, e tenta embaixo, em cima, à direita, à
  esquerda e por fim o meio da tela, prendendo o resultado dentro da janela no fim. Metade
  dos alvos é uma coluna inteira, que ocupa a janela de cima a baixo: chutando a altura, o
  cartão nascia metade fora, e sem o prender ele ainda nascia fora quando o alvo começava
  fora.
- **Alvo abaixo da dobra é trazido para o meio da janela**, e esta é a única rolagem
  deliberada do app: apontar para algo que a pessoa não está vendo é não apontar para nada.
  Vale só aqui; o resto do app não rola sozinho.
- **Quem já viu fica marcado no perfil** (`perfis.tutoriais`), e não no navegador: é da
  pessoa, não do aparelho. A migração da seção 29 dá `inicio` a quem já tinha passado pelo
  tour antigo, e a coluna `tutorial_em` da seção 28 nasce preenchida para quem já usava o
  app, dentro do `if` que a cria, senão uma segunda passada do `atualizar.sql` marcaria como
  visto quem se cadastrou ontem. Esvaziar a lista é o "Ver tudo de novo", em Ajustes.
- **Gravação que a pessoa não pediu falha calada.** Marcar "já viu" é
  contabilidade do app, não ação de ninguém: com o banco atrás do código, o erro aparecia
  no fim de cada um dos catorze tours, catorze vezes a mesma frase. A queixa vai para o
  console, e um conjunto fora do componente (`fechadosAqui`) guarda o que foi fechado nesta
  sessão, para o tour não voltar a abrir quando a gravação não pega. "Ver tudo de novo"
  precisa esvaziar esse conjunto junto (`esquecerTutoriais`), senão a lista no perfil zera e
  nada reabre.
- **As dependências do efeito que liga o tutorial são texto, nunca os objetos.** `pode` era
  um `recursos(org)` novo a cada render e `tutoriais` é um array novo a cada leitura dos
  dados: comparando objeto, o efeito rodava a cada render e o tutorial fechava sozinho na
  cara de quem estava lendo. `pode` agora é memorizado em `Dados`, e aqui comparam-se o id
  do tour e a lista juntada por vírgula.

O roteiro mora em `lib/tutorial.ts`, e é um só para os dois workspaces: o tour e o passo
dizem em qual deles existem (`quando`), e o passo pode trocar o texto no celular
(`textoCel`), porque lá a conversa é a tela inicial em vez da coluna do meio e o radar
desceu para o fim de Meu trabalho. Escrever dois roteiros seria a mesma armadilha do fork
do espaço pessoal. Qual tour abre é decidido pelo endereço (`tourDe`), e entre dois que
casam vence o caminho mais longo: `/fluxo/abc` é a track aberta, não a lista.

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
- **Abrir a caixa apaga o número, e o destaque fica.** O contador conta o que a pessoa
  ainda não viu, e depois de abrir ela viu: selo que não some depois de aberto ensina a
  ignorar selo. O que não pode sumir junto é o realce das linhas, senão a caixa abre sem
  dizer o que chegou. Por isso o sino e `/avisos` guardam num estado (`novos`) quem estava
  por ler no instante em que abriram, e é essa lista que pinta, nunca o `lido_em`, que
  acabou de mudar. Some junto o "Marcar tudo como lido": ele passou a ser um botão que
  desfaz o que a abertura já fez.
- **A caixa é de uma pessoa e de mais ninguém**, inclusive do administrador. Ali
  dentro aparece texto de tarefa privada e de mensagem de canal fechado, e o
  aviso não pode virar a porta dos fundos das regras de visibilidade. Telefone e
  assinatura de push moram em `avisos_contato` e `push_assinaturas`, fora de
  `perfis`, porque RLS trabalha por linha e em `perfis` a organização inteira
  leria o celular de todo mundo.
- **O aviso não é só do que acontece dentro de uma track.** Eram cinco tipos, todos de
  dentro (tarefa, aprovação, prazo, trava, menção), e o que acontecia ao lado não chegava a
  ninguém: quem recebia uma nota compartilhada só descobria se abrisse o caderno e
  reparasse numa linha nova no meio das dela. Entraram `nota`, `feedback` e `mensagem`
  (seção 27), e os três têm a mesma forma: alguém fez uma coisa que só faz sentido se a
  outra pessoa ficar sabendo. O da conversa direta é **um por conversa por dia**, pela
  chave `direto:<canal>:<dia>`: um por mensagem faria do sino um segundo chat, e quem manda
  três frases seguidas geraria três avisos para dizer uma coisa. Canal de equipe fica de
  fora, porque lá quem chama alguém é a menção, que já avisa.
- **Urgente é faixa estreita, de propósito**: o que já venceu, o que trava outra
  pessoa e o que só aquela pessoa destrava. Tocar o celular de alguém gasta a
  atenção dela e a credibilidade do app; se tudo é urgente, nada é, e a primeira
  coisa que a pessoa faz é desligar tudo.

**Quem bate no relógio é o GitHub, e não a hospedagem.** O plano Hobby da Vercel aceita
um disparo por dia por rota, e uma vez por dia às 19h20 de Brasília é depois do fim da
janela de leitura de quem lê até as 19h: aquelas contas nunca seriam lidas. O relógio de
verdade é `.github/workflows/relogio.yml`, de hora em hora, e os crons do `vercel.json`
ficam como segundo relógio. Chamar de mais não faz mal por desenho: o pulso recusa se já
leu naquele horário hoje, e o aviso marca `entregue_em` antes de mandar.

**Nada naquele arquivo imprime corpo de resposta**, e isso não é economia de log: o
repositório é público, log de Action em repositório público é público, e a resposta do
pulso traz o NOME de cada empresa lida. Só o código HTTP sai de lá.

**Trabalho de faxina no pulso precisa dizer que já rodou hoje.** Enquanto o relógio batia
uma vez por dia, "uma vez por dia por empresa" era verdade de graça; de hora em hora, a
descoberta de processos passaria a varrer 180 dias de eventos 24 vezes. Quem garante é o
banco (`falta_descobrir`, `descobriu`, seção 42), e a marca fica na organização, não em
`processos_descobertos`: a empresa sem candidato nenhum não escreve linha lá, e é
justamente ela a mais cara de varrer, porque percorre tudo sem achar.

**O relógio chama por GET, e não passa pela porta da frente.** Duas coisas que só
aparecem em produção e não falham, apenas nunca acontecem: o cron da Vercel usa GET (as
rotas aceitam os dois métodos) e manda o segredo em `CRON_SECRET`, porque ele não deixa
escrever cabeçalho à mão (as rotas aceitam os dois nomes). E o `proxy.ts` mandava
`/api/avisar`, `/api/pulso`, `/api/feedback` e a página `/feedback/<token>` para a tela de
entrar: **toda rota com credencial própria precisa estar em `ABERTAS`**, senão a porta da
frente, que só sabe perguntar por sessão, transforma a recusa num 307 que ninguém depura.

**O app persegue o que está prestes a dar errado, e não só relata o que já deu.** A
varredura do dia (`varrer_o_dia`, seção 37) roda no pulso e procura cinco coisas: prazo
vencendo em dois dias, tarefa parada há duas semanas no checkpoint corrente, gente em
sobrecarga, gente com a fila vazia e rotina que não começou. Avisar no dia em que o prazo
venceu é dar notícia; perguntar dois dias antes é ajudar.

**Carga vai para quem distribui, nunca para quem está afogado.** Avisar a pessoa
sobrecarregada de que ela está sobrecarregada é dar a ela mais uma coisa para carregar. E
**a frase fala de fila e de média, nunca de esforço**: "a fila de Fulano não cabe no tempo
que tem" é sobre distribuição, "Fulano está devagar" é sobre a pessoa, e é o tipo de frase
que faz o time desligar o app. Pelo mesmo motivo, **sem pronome**: o nome de quem recebe a
tarefa não diz o gênero, e errar isso numa frase que a casa inteira lê é um jeito bobo de
ofender.

**A varredura roda para todas as empresas, mesmo fora do horário de leitura delas.** Ela
não chama modelo nenhum, é consulta de banco, e perder o dia de uma empresa porque o
horário de leitura não bateu seria perder justamente o aviso que existe para chegar antes.

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

**A ordem das abas é a do produto, não a do histórico**: Forward, Conversa,
Notas, Tracks, Meu trabalho, Agenda. Conversa, notas e tarefas primeiro, porque
é onde o dia acontece e é o que o app está virando: comunicação interna que
organiza trabalho e guarda memória no mesmo lugar. Processos desceu para "Mais"
por ser montagem, e não operação: quem mexe em processo senta para fazer isso,
não passa por ali entre duas reuniões.

No celular são cinco lugares e eles são o produto: Forward, Conversa, Notas,
Tracks e Mais. "Meu trabalho" foi para a folha de Mais porque o Forward já abre
na sua fila, e ter a mesma lista em dois botões vizinhos gasta um dos cinco.

**A navegação é horizontal**, na `Barra` (`componentes/Barra.tsx`, classe `.tw-topo`):
marca, seletor de espaço, as abas, busca e você. Não existe mais lateral de navegação: a
lateral de uma tela é **contexto** (o radar da visão geral, a conversa da track, o índice
dos ajustes), nunca navegação. O que não cabe na fileira principal mora no menu "Mais",
e continua a um clique: Relatórios, Desempenho, Notas, Agentes, Conectores, Processos.

Abaixo de 840px as abas sacam e entra a `TabBar`: **quatro lugares e o botão redondo de
criar, e nada de "Mais"**. O sexto botão de uma barra de cinco é sempre o balaio, e balaio
no rodapé gasta um quinto da largura para guardar o que ninguém abre todo dia. O balaio
subiu para a **bolinha do seu perfil**, no alto, onde já moravam tema, ajustes e sair: são
todas a mesma pergunta, "o que mais tem aqui", e agora têm um botão só. A lupa saiu do
celular junto, porque ficava colada na bolinha.

A barra **flutua**, com folga dos lados e canto redondo. Colada no fim da tela ela dividia
borda com a barra do navegador e com a faixa do aparelho, e as três viravam uma faixa
cinza só. Quem calcula altura usa `--alt-abas-real`, que agora mede **do topo da barra até
o fim da janela**, e não a altura da caixa: com ela flutuando, a folga de baixo também é
espaço ocupado.

Não duplicar navegação: quem navega no celular é a TabBar, quem
navega no desktop é a Barra. Telas novas precisam caber nas duas formas.

No celular a barra de cima é **uma linha só**: marca, nome da empresa ao lado dela, busca
e você. A empresa já morou numa segunda faixa embaixo, e aquela faixa custava 50px de
altura em toda tela para dizer uma palavra que quase nunca muda.

**Quem rola é o conteúdo, não a página.** Tela que calcula a própria altura (a conversa,
as notas) não pode levar o recuo do `.conteudo` junto: ele sobra embaixo, a página inteira
passa a rolar, e aí a barra de abas sobe e desce com a barra de endereço do navegador.
A regra é `.conteudo:has(>.fwd-cel),.conteudo:has(>.chat){padding-block:0}`, e a prova é
`document.scrollHeight === innerHeight` nas três telas.

O botão redondo do celular **não é lima**. O acento é da ação que faz o trabalho andar, e
ela já está na tela (concluir, aprovar, abrir a track); lima no botão de criar daria dois
limas em toda tela, que é defeito.

A agenda usa `matchMedia` para mostrar um dia por vez no celular; grade de sete colunas
não cabe em 375px.

**Detalhe que abre numa coluna no computador vira folha no celular.** A gaveta de Meu
trabalho ficava DEPOIS da lista inteira, fora da tela: tocar numa pendência parecia não
fazer nada, e o "Aprovar saída" que mora dentro dela era inalcançável. No celular ela é
folha por cima, com fundo e botão de fechar, e **não abre sozinha**: no computador abrir a
primeira é bom, porque a tela nunca aparece pela metade; no celular esconderia a lista que
a pessoa veio ver.

**Na track, o checkpoint vem antes de tudo.** Abrir uma track e não ver tarefa nenhuma sem
rolar é o mesmo que não abrir: no celular o cabeçalho encolhe, a trilha fica rasa (sem a
legenda de baixo, que repete o que o desenho já diz) e o palpite de quem faz desce para
depois das tarefas, porque sugestão não passa na frente do trabalho.

**Nada rola a página por conta própria.** `scrollIntoView` rola o primeiro antepassado que
rola, e quando a lista não rola sozinha esse antepassado é a página: abrir uma track
jogava a pessoa 1500px para baixo, no meio da conversa. Ao descer para a última mensagem,
mexer no `scrollTop` do próprio container, e só se ele realmente rolar.

**Botão desligado não flutua.** "Aprovar saída" nasce desligado até as tarefas ficarem
prontas, e boiando sobre a lista ele cobria justamente o que precisava ser feito para
ligá-lo.

**A folga da barra de abas é um token, `--abas-chao`, e tem um caso especial.** No iPhone
INSTALADO a janela vai até o fim da tela e a faixa de gesto do aparelho fica por cima da
barra. `env(safe-area-inset-bottom)` não resolve, porque ele só é preenchido com `cover`, e
`cover` quebra o topo no Android (abaixo). Então a conta é feita à mão, e só ali: `@supports
(-webkit-touch-callout: none)` é WebKit, `@media (display-mode: standalone)` é instalado, e
juntas querem dizer "iPhone, na tela de início" e mais nada. Navegador, Android e computador
não veem a regra. Ao mexer na posição da barra, mexer no token: o botão redondo e as folhas
se posicionam a partir dele.

**`viewport-fit` fica no padrão, e NÃO em `cover`.** A tentação é ligar `cover` para o app ir
até a borda, e aí `env(safe-area-inset-*)` passa a valer e todo mundo fica no lugar. **No
iPhone funciona; no Android não.** Lá a janela vai para a borda e a margem volta **zero**, e
em 05/10/2026 isso pôs a barra de cima embaixo do relógio, com o seletor de espaço e os
ajustes inalcançáveis, no app instalado. `statusBarStyle` segue `default` pelo mesmo motivo:
`black-translucent` é o mesmo problema por outro caminho, no iPhone.

Sem `cover`, quem recua a janela é o sistema, nos dois. O app perde o visual que vai até a
borda e ganha nunca ficar embaixo de nada. Numa barra onde moram o seletor de espaço e os
ajustes, essa troca não tem discussão. Os `env(safe-area-inset-*)` espalhados pelo CSS
continuam lá e valem zero, e é esse o estado certo: eles são a rede para o dia em que alguém
voltar a tentar, e tentar exige provar no Android ANTES.

**Autenticação se confere SEM ir à rede, e isso valia um segundo por clique.**
`auth.getUser()` pergunta ao servidor de autenticação se o token vale, e isso é uma ida à
rede. O porteiro (`proxy.ts`) fazia uma a cada navegação, e o `(app)/layout.tsx` fazia outras
três em fila (`getUser`, `meu_perfil`, o perfil): **quatro idas sequenciais antes de qualquer
coisa aparecer**. Medido em 05/10/2026 com a régua do `?medir=1`: cada pedido de rota levava
de 600 a 1000ms, e o Supabase respondia em 461ms no pior caso. O tempo não estava no banco,
estava em ir até ele quatro vezes.

`getClaims()` faz o mesmo trabalho sem sair: pega a sessão (renovando quando vencida, igual
antes) e **confere a assinatura aqui mesmo**, com a chave pública do projeto, buscada uma vez
e guardada. Não é afrouxar a trava, é parar de perguntar ao outro lado do mundo o que dá para
conferir na mão. Só funciona com chave assimétrica, e dá para checar em
`/auth/v1/.well-known/jwks.json`: se vier `ES256`, vale.

**Falha de verificação não pode virar "você não está logado".** Os dois lugares caem de volta
em `getUser()` quando `getClaims()` devolve ERRO, porque um tropeço na chave pública mandaria
a casa inteira para a tela de entrar, inclusive quem tem sessão boa. Não ter sessão é outra
coisa, e essa não merece segunda pergunta.

**E o que não depende de ninguém vai junto.** As duas consultas que sobraram no layout são
paralelas: `perfis_sel` devolve `user_id = auth.uid()` incondicionalmente, então os seus
perfis chegam sem precisar saber antes qual é o do espaço em uso. Quem escolhe entre eles
continua sendo `meu_perfil()`, no banco.

**Pedido demais ao mesmo tempo faz fila, e fila fria custa o dobro.** O carregamento dispara
39 consultas de uma vez. Medido: uma sozinha e quente leva 63ms; as 39 juntas, **485ms a
pior**. A tentação é separar em ondas, e a medição mostrou que não adianta: com a conexão já
aberta, as 37 juntas levam 204ms e onze levam 215ms. **O custo não é a quantidade, é abrir a
conexão.** Por isso o `preconnect` para o endereço do banco no `<head>`: o aperto de mão
começa junto com o HTML em vez de esperar o JavaScript resolver perguntar. Antes de dividir
o carregamento em pedaços, medir frio e quente separados, senão se paga uma refatoração por
um ganho que não existe.

**Rota dinâmica sem `loading.tsx` não é pré-carregada.** Todas as rotas de `(app)` são
dinâmicas, porque o layout lê cookie para saber quem entrou, e não existia fronteira de
carregamento em lugar nenhum. O efeito é duplo: o `<Link>` prefetch não fazia nada, e o Next
segurava a tela ANTIGA até a nova ficar pronta, então clicar numa aba parecia não fazer
nada. Existindo `(app)/loading.tsx`, as duas coisas se resolvem, e ela é genérica de
propósito: um esqueleto por tela seria uma segunda cópia do layout de cada uma, que
envelhece sozinha e um dia mostra a forma de uma tela que já mudou.

**A altura das barras é medida, não escrita.** `componentes/Shell.tsx` publica
`--alt-topo-real` e `--alt-abas-real` de uma medição de verdade, porque no
celular a barra de cima quebra em duas linhas e a de baixo cresce com a faixa do
aparelho sem botão. Tela que calcula a própria altura com o número fixo do CSS
passa do fim da janela, e o que fica escondido é sempre a última coisa da tela,
que na conversa é o campo de escrever. Ao criar tela de altura fixa, usar essas
duas variáveis.

**`backdrop-filter` engole o `position:fixed` de dentro dele.** Elemento com
backdrop-filter (ou transform, ou filter) vira o bloco de contenção dos descendentes
fixos, e `inset:0` passa a ser ele, não a janela. A barra de cima tem desfoque, então a
folha do celular, que nasce dentro dela, abria como uma tira colada no topo com o conteúdo
cortado: quem tocava na bolinha via o painel sumir em vez de abrir. Coisa fixa que nasça
dentro da barra vai para o `body` por portal.

**Dois `@media` que se sobrepõem é empate, e empate quem decide é a ordem no
arquivo.** A tela de conversa ficou espremida em 248px de 390 por meses porque
um bloco `max-width:1180px` escrito depois vencia o bloco de celular. Ao
escrever faixa intermediária, fechar embaixo também (`min-width:841px and
max-width:1180px`).

## A ressalva é dívida, e dívida se paga

Aprovar com ressalva já criava uma tarefa no checkpoint seguinte. Faltavam as duas metades
que fazem a ressalva valer alguma coisa, e as duas estão no banco (seção 22), não na tela:

- **Ressalva não se apaga, se conclui.** A tarefa nasce com `itens.ressalva` e um gatilho
  recusa apagá-la em aberto. Era uma tarefa como outra qualquer, e quem não quisesse pagar
  a dívida apagava a linha. A tela também esconde o botão de remover, mas quem garante é o
  banco.
- **O checkpoint não fecha com ressalva aberta**, e a mensagem diz **qual é**. A regra
  geral de "ainda existem itens pendentes" já travava, mas numa lista de doze ela não
  aponta para nada.

**No último checkpoint de um objetivo a ressalva não é oferecida.** Não existe "próximo"
para onde mandar a pendência, e aceitar ali é entregar com dívida e sem ninguém para
cobrá-la: ou a track conclui, ou a pendência vira tarefa antes. Numa **rotina** ela é
aceita e atravessa a volta, nascendo no primeiro checkpoint da seguinte, e a virada não a
zera junto com o resto (zerar a dívida na virada seria pagá-la sozinha).

## O feedback de quem recebeu o trabalho

Uma track termina e a única opinião registrada é a de quem a executou. Quem recebeu, que é
o cliente de um objetivo ou o chefe de uma rotina, **não tem conta no app e nunca vai
ter**: pedir que ele se cadastre para dizer se gostou é o jeito mais eficiente de nunca
saber. Então o feedback sai por um **link**, e o link é a credencial.

**Nada sai sozinho.** Quem terminou decide pedir, e para quem. O app gera o link e não
manda nada: mandar exigiria o e-mail do cliente guardado em algum lugar, e o cliente nunca
combinou isso com ninguém.

**Mas o link fica pronto sozinho** (seção 50). Pedir exigia lembrar de pedir justo no dia
em que a obra acabou e todo mundo já está na próxima, e por isso quase nunca acontecia. O
desfecho passa a criar o pedido e a avisar quem fechou; **mandar continua sendo gesto de
gente**, e a distinção é a regra inteira: o app prepara, e quem conhece o cliente escolhe o
canal e a hora. Arquivar de novo não cria um segundo link vivo, porque dois links para a
mesma coisa é o cliente responder num e quem pediu olhar o outro para sempre.

**O aviso não carrega o token.** A caixa é de uma pessoa só, mas credencial em texto de
aviso é credencial em mais um lugar. O aviso leva à track, e lá o link está a um toque.

**A pergunta muda com o motivo.** Para quem recebeu uma obra entregue, "como foi?" faz
sentido; para quem viu o trabalho ser cancelado, a mesma frase é deselegante e não colhe
nada, e vira "o que faltou?".

**A resposta vira EVENTO** (`feedback:<nota>` na view `eventos`), e é assim que ela chega à
descoberta e ao raio-X sem ninguém ligar um fio novo. `quem_id` fica nulo de propósito:
quem respondeu não tem conta no app e não é perfil nenhum. No raio-X ela é o achado de
maior peso, porque todos os outros falam de VELOCIDADE e este fala de QUALIDADE, que não se
conserta apertando prazo.

Três cuidados, nenhum opcional (seção 24 do schema e `/api/feedback`):

1. O token é sorteado com 32 bytes. Ele é a única coisa entre um estranho e a resposta.
2. Ele **vence** (60 dias) e vale **uma** resposta. Link eterno colado num e-mail de dois
   anos atrás é uma porta que ninguém lembra que existe.
3. Quem abre vê **o nome da track e quem pediu, e nada mais**: nem tarefa, nem gente, nem
   as outras tracks, nem o id da track. O que vaza por um link público vaza para sempre.

`/api/feedback` é a **segunda** rota a usar a chave de serviço, e a lista continua fechada
nessas duas. O motivo é o mesmo de `/api/avisar`: quem chama não tem sessão. A diferença é
que aqui quem chama é um estranho, e por isso a rota é estreita e devolve só o que pode
ser visto. A página é `/feedback/[token]`, fora do grupo `(app)`: sem Shell, sem TabBar,
sem navegação.

`para` é só para quem pediu saber de quem veio a resposta ("Cliente Maurício"). **Não é
e-mail, não convida ninguém e não aparece para quem responde.**

## Toda track termina, e termina dizendo como

Havia dois fins e nenhum registro: concluir marcava `concluido` e a track ficava para
sempre no meio das vivas, e excluir apagava a linha e com ela tudo que se poderia aprender
daquilo. Um ano depois ninguém sabia quantas obras foram entregues nem por que as outras
pararam.

Agora todo fim é um **desfecho** (`concluido` ou `cancelado`) e desfecho **arquiva**: a
track sai da lista principal e continua inteira em Arquivadas, com trilha, tarefas,
conversa e anexos. Nada é apagado, e dá para tirar do arquivo. **Não existe mais excluir
track na interface**, e não voltar a colocar: o que se perde apagando é justamente a parte
útil.

- **O último checkpoint de um objetivo diz "Concluir"**, e não "Aprovar saída". Ali não vem
  outro checkpoint depois, e o rótulo antigo fazia a pessoa aprovar sem saber que estava
  terminando. Rotina não entra nisso: ela dá voltas.
- **O motivo do cancelamento é escolhido, nunca digitado** (`MOTIVOS`, em
  `lib/desfecho.ts`). Motivo digitado vira trinta frases para a mesma coisa, e trinta
  frases não viram número. O texto livre continua em `detalhe`, para o que só aquele caso
  explica, e ele não entra em conta nenhuma.
- **Quem lê a conta é Relatórios**, em "Como as tracks terminaram": concluídas, taxa de
  conclusão e o ranking de motivos. Essa seção é o que o arquivo devolve em troca de nada
  ser apagado.
- No arquivo, a linha da track **não mostra situação nem prazo**. "Atrasado" numa track
  parada é cobrança que não cabe mais a ninguém.

Quem decide é `arquivada()` em `lib/desfecho.ts`, e em `Dados` a lista `fluxos` já sai sem
elas: só `arquivadas` as devolve. Tela nova não precisa lembrar de filtrar.

## A coluna da track é a conversa

Na track aberta, a coluna da direita acompanha a rolagem e tem a altura da janela, e a
conversa ocupa ela inteira. A atividade fica ali, mas como botão retraído colado embaixo
(`<details class="track-atv">`), e aberta ela para na metade da coluna. Era um painel fixo
antes, e ele comia metade da coluna para mostrar o que ninguém abriu o app para ver: quem
entra na track quer falar e ver o checkpoint, não o histórico.

Sem a coluna grudada e com altura de janela, o campo de escrever e o botão nascem abaixo
da dobra, que é o mesmo que não existirem. A regra mora em `app/globals.css`, no bloco de
`min-width:841px`.

## A folha da nota é a mesma nos dois tamanhos

`/notas` no computador e o caderno no celular mostram a mesma coisa e precisam parecer a
mesma coisa. Duas regras seguram isso:

- **A linha da lista ocupa a coluna inteira**, e tem a forma da lista de conversas: nome e
  hora em cima, começo do texto embaixo, marca na direita. Eram três linhas empilhadas, e a
  terceira só levava a hora. O `width:100%` não é enfeite: botão com largura automática
  encolhe até o conteúdo mesmo sendo grid, e o realce da nota aberta ficava do tamanho do
  título, boiando no meio da coluna em vez de marcar a linha.
- **Nada de cabeçalho de página em cima da folha.** A palavra "Notas" já está acesa na
  fileira de abas, e repeti-la em corpo 34 custava 150px, que é exatamente a altura que
  faltava para o texto. Procurar e criar dividem uma linha no alto da lista.
- **A folha não tem moldura e a tela cabe na janela.** Quem rola é cada coluna, não a
  página: com a página rolando, o campo de escrever descia junto e perguntar numa nota de
  meia página exigia rolar até o fim.
- **`flex:1` só preenche quem tem altura para preencher**, e isso custou meses. No estreito
  a coluna era `height:auto`, então ela crescia com o conteúdo e a folha não tinha o que
  ocupar: uma nota nova nascia com duas linhas de espaço para escrever e os dois botões
  colados embaixo, com metade da tela vazia por baixo deles. A altura vem das barras
  medidas, e no Caderno o rolo é preenchido com `min-height:100%` em vez de um número
  cravado, que só fechava a conta num telefone alto.
- **A coluna do meio do Forward é grade com `align-content:start`**, então a linha do
  caderno fica do tamanho do conteúdo, e a folha parava na metade da coluna com o resto
  vazio. Em modo caderno o `.dp` é o único filho daquela coluna (o seletor vai para dentro
  dele, e a coluninha de canais só existe em modo conversa), então a linha pode esticar
  sem desalinhar nada. É o caso que mais aparece no espaço pessoal, onde a coluna do meio
  só tem o caderno.
- **A folha não veste a classe de campo.** `.inp` existe para um campo parecer campo, com
  borda, fundo e recuo, e a folha desfaz os três na linha seguinte. Pior que redundante,
  ela vencia: `textarea.inp` tem especificidade maior que `.doc-campo`, e o mínimo de 70px
  dela derrubava o de 240 no instante em que alguém clicava para escrever. Ao tirá-la,
  devolver `font:inherit`: textarea sem família herda o monoespaçado do navegador, e a
  folha passa a parecer terminal.

No celular, a linha de cima da nota carrega **voltar, o seletor Conversa | Notas e
Detalhes**, os três juntos. Eram duas linhas, e a de cima só levava o seletor. Quem passa
o seletor para o caderno é a tela que o tem (`<Caderno abas={...}>`), e não o caderno que
o inventa: no computador ele continua sendo a primeira linha da coluna do meio quando a
conversa está aberta.

Perguntar e Organizar ficam **um embaixo do outro no celular**. Lado a lado eles cabiam,
mas cabiam apertados, com o texto no limite de quebrar e o polegar tendo que mirar.

Cuidado herdado: aquele arquivo usava `--linha`, `--fraco` e `--acento`, que **não
existem** desde a identidade nova. O navegador ignora a declaração inteira e o resultado é
contorno que some e cinza que não é cinza. Ao mexer em CSS antigo, conferir se o token
existe antes de confiar nele.

## A trilha se monta depois, e o passado fica onde está

Montar a track inteira num formulário só é decidir tudo antes de saber: ninguém conhece os
sete checkpoints de uma obra no dia em que ela começa. A trilha se edita dentro da track
que já existe, um checkpoint de cada vez, pelo botão **Montar a trilha** colado na trilha
(`MTrilha`, em `componentes/Modais.tsx`). Dá para acrescentar no fim, **inserir entre
dois**, tirar e reordenar.

**O que já passou e o de agora ficam onde estão.** `fluxos.atual` é um NÚMERO, e mover um
checkpoint vencido faria a track mudar de lugar em silêncio, com as decisões registradas
deixando de casar com a trilha: um defeito que ninguém percebe na hora e que ninguém
explica depois. Congela a **posição**, não o conteúdo: nome, critério, aprovador e prazo
desses continuam editáveis. Enquanto nada aconteceu, nada congela, porque rascunho se
remonta à vontade (`trilha_comecou()`: saiu do primeiro checkpoint, alguém decidiu algo, ou
alguma tarefa ficou pronta).

Quem garante é `salvar_fluxo` (seção 31), e não a tela: ela desabilita os botões, e um
`salvar_fluxo` mandado pela API reordena do mesmo jeito. A conferência acontece **antes de
escrever qualquer coisa**, para a recusa não deixar a trilha pela metade.

**A track continua linear, e isso é escolha.** O canvas livre estilo n8n, com posição e
conexões desenhadas, pertence a **Processos**, que é o molde: lá o desenho não roda, ele
descreve, e vira track ao ser instanciado. Na track, "onde ela está" precisa continuar
tendo uma resposta só, senão a trilha, o radar, a ressalva, a virada da rotina e o relatório
de onde o trabalho para perdem o chão de uma vez.

## A trilha

A trilha existe para responder **onde a track está** antes de qualquer outra pergunta, e
tem duas orientações, as duas em `componentes/Trilha.tsx`:

- `TrilhaH` (classe `.trilhah`), **deitada**, é a da arte do produto: é ela na track
  aberta, na linha de cada rotina e na gaveta de Meu trabalho.
- `Trilha` (classe `.trilha`), **em coluna**, é o CheckpointTrail na vertical.

A aba chama-se **Track**, e não "Trilha": a tela já é a da track, e o conteúdo da aba não
precisa de um título repetindo o nome dela por cima. Aquele título custava a linha mais
cara da tela, que é a primeira.

**Ela é deitada, e ponto. O que varia é se o nome cabe nela.** A regra de cinco valia quando deitada queria dizer
"com o nome de cada checkpoint embaixo": aí sete não cabem e a trilha rolaria de lado, que
é exatamente o que ela existe para evitar. A saída é o modo **`soMarcas`**: o nome sai da
trilha e fica no cabeçalho do checkpoint, logo abaixo, e sete bolinhas cabem com folga em
393px. Nada rola de lado, e o nome só deixa de aparecer duas vezes.

Os cortes estão em `TelaFluxo` (`cabemOsNomes`, `cabemAsMarcas`): nome até 4 no celular e
até 8 no computador, marca até 20 e até 40, e a marca encolhe de 26 para 20px acima de
oito checkpoints, que é o que faz quinze caberem em 393px. A coluna só volta quando **nem as bolinhas
cabem**, e aí ela é mesmo a única saída. Não tirar o limite dos nomes para "ficar igual à
arte": a arte foi desenhada com quatro.

Aprovado é disco cheio com o visto, o corrente é anel do acento com halo fraco, o que
ainda não chegou é contorno apagado com o número dentro, e o fio que liga acende até onde
a track andou.

O anel do corrente **enche conforme o checklist anda**, e isso o design system não tem:
é acréscimo do produto, para ver o progresso de dentro do checkpoint sem abrir o
checkpoint. Ao trocar a trilha por outra coisa, não perder isso, nem o ponto de quem já
voltou atrás, nem a bandeira de chegada que distingue projeto de rotina.

## O processo que a casa já tem sem saber

O pulso olha seis meses de eventos e reconhece um caminho que se repete
(`lib/descobrir.ts`, seção 39 do schema). O que sai dali **não é processo, é
candidato**, e a conversa que o transforma em processo mora em
`componentes/Descobertos.tsx`, numa banda no alto de `/processos`. Ela vem antes
dos filtros de propósito: quem abre aquela tela pela primeira vez não tem lista
nenhuma para filtrar.

**A ordem do cartão é o argumento**, e não arrumação de layout:

1. **o que já aconteceu, com o número**: 11 vezes, 6 dias, 4 sem conferir
2. **o que eu já montei**, afirmado, cada linha com como desfazer
3. **uma pergunta**, a que mais muda o desenho
4. **o rascunho**, visível antes de aceitar

Começar pelo rascunho é pedir opinião sobre um desenho sem dizer de onde ele
saiu, e a resposta honesta a isso é "não sei". O número primeiro é o que faz a
pessoa reconhecer a casa dela.

- **Uma pergunta por vez, e a resposta grava na hora** (`responder_descoberta`).
  Cinco juntas viram formulário. Gravar na hora é o que deixa responder uma hoje
  e a seguinte na semana que vem sem recomeçar.
- **Maioria o app resolve sozinho e afirma**; empate e buraco viram pergunta. A
  afirmação sempre carrega a porta de saída ("Se preferir outro, é só me dizer"):
  afirmação sem como desfazer é imposição, e imposição num rascunho faz recusar o
  rascunho inteiro.
- **Pergunta sem opção não existe.** Quando ninguém aprovou nenhuma das vezes,
  não há o que oferecer, e a pergunta some: no WhatsApp ela seria uma mensagem
  pedindo um número que não está lá.
- **Resposta que não muda nada tem que ser explicada.** A pergunta é sobre gente
  ("quem devia responder por esta passagem?") e o processo guarda **área**, que é
  o que o faz servir à obra seguinte com outro time. Escolhida uma pessoa sem
  área, o rascunho não muda, e a tela diz por quê (`respostaSemLugar`). Engolir
  isso ensina que responder ali não serve para nada.
- **Recusar guarda a recusa**, não apaga a linha: é ela que impede o pulso de
  propor a mesma coisa toda semana. Nada do que foi observado se perde.
- **O lima não é daqui.** Em `/processos` o acento já é do "Usar processo", que é
  o que faz uma track nascer. Adotar uma descoberta é criar um processo, e criar
  processo ali já é botão neutro.
- **As três decisões são do banco** (seção 41), e a conferência é
  `manda_no_processo_de(org)`, não `eh_admin()`: aquelas funções são
  `security definer`, e lá dentro RLS não filtra a linha, então um administrador
  de outra empresa passava e mexia em candidato alheio.
- No espaço pessoal some a pergunta de quem aprova (`pode.aprovacao`), e as
  palavras mudam: "em 4 ninguém fez" vira "em 4 você não fez", porque ali ninguém
  é você.

O rascunho é sempre **três checkpoints com uma tarefa em cada**
(`PRIMEIRO_MAXIMO`). O limite é sobre o que o app propõe sem ninguém pedir:
checkpoint que a pessoa confirmou porque "nas 4 vezes em que faltou levou o
dobro" entra por cima dele, que é exatamente o caso previsto.

## A volta da rotina vira arquivo, em vez de sumir

As tarefas de uma rotina são as mesmas todo período: a virada desmarca `feito`, empurra os
prazos e segue. O que sobrava de julho era uma linha em `historico` dizendo 'ok' ou
'late', podada nas doze últimas, e que **nenhuma tela mostrava**. Quem perguntasse "cadê o
fechamento de julho?" não tinha resposta, porque as tarefas de julho SÃO as de agosto,
zeradas.

Agora toda volta deixa um `ciclos` (seção 45), e a linha da volta, na coluna da track,
deixa de ser rótulo e vira porta.

- **O conteúdo é congelado, não apontado.** Guardar o id das tarefas não serviria: elas
  continuam vivas e mudam no período seguinte, então o "arquivo de julho" mostraria o
  estado de agosto. A fotografia em jsonb é a única forma honesta. Por isso o nome de quem
  fez vai junto do id: o id some quando a pessoa sai, e o arquivo de dois anos atrás
  precisa continuar dizendo quem fez.
- **Os anexos MUDAM de dono.** O documento pendurado na tarefa de julho ficaria pendurado
  na de agosto, porque é a mesma linha: em um ano seriam doze faturas na mesma tarefa, e
  nenhuma achável pelo mês. Eles vão para o ciclo fechado, e o seguinte nasce limpo, que é
  o ponto. Documento que vale todo mês (um modelo, uma instrução) não é anexo de tarefa: é
  nota, e nota não é tocada aqui. `anexos` passa a ter três donos possíveis e continua
  sendo de UM só (`num_nonnulls(item_id, nota_id, ciclo_id) = 1`).
- **Quem escreve é um gatilho em `historico`**, e não o `decidir_etapa`. Dois motivos:
  aquela inserção acontece no instante exato (depois de a situação ser decidida, antes de
  as tarefas serem zeradas), e `decidir_etapa` tem TRÊS definições no arquivo, então mexer
  no corpo dela é mexer em três lugares e esquecer um.
- **`now()` é o horário da TRANSAÇÃO**, então a decisão que fechou julho e o fechamento
  que ela gerou têm o mesmo instante. A janela das decisões de cada volta é `>`, e não
  `>=`: com `>=`, o arquivo de cada mês carregaria a decisão do anterior.
- **Só leitura, e o rodapé tem um botão só.** Reescrever o passado é o oposto do que este
  arquivo existe para fazer, então não há o que cancelar, e o lima também não é daqui:
  fechar o passado não faz trabalho nenhum andar.
- **Volta anterior ao arquivo existir continua sendo só o rótulo**, e não vira porta. Ela
  não tem conteúdo, e fingir que tem é pior do que dizer que não tem.

## A caixa de e-mail é a segunda entrada, e ela é lida pelo ENVELOPE

O plano previa um endereço para onde encaminhar. A forma melhor é a contrária, porque
ninguém encaminha: a pessoa conecta a caixa dela (seção 49) e o app repara no que já
acontece ali. O encaminhamento continua fazendo sentido para arquivar algo de propósito, e
vira a exceção, não a regra.

**O app não lê o corpo de e-mail nenhum**, e isso é estrutura e não promessa: o leitor pede
ao servidor só o envelope (remetente, destinatário, assunto, data, nome dos anexos), que é
um pedido diferente de pedir a mensagem, e o corpo não chega a passar pela rede. Dois
motivos, e cada um decide sozinho:

- **Não precisa.** O app já sabe o que está esperando. Para saber que o relatório chegou,
  basta reparar que saiu um e-mail daquela pessoa, com anexo, cujo assunto casa.
- **Custaria caro nos dois sentidos.** Cem mensagens por pessoa por dia, vinte pessoas, dá
  sessenta mil por mês: lê-las com modelo é da ordem de mil dólares mensais por empresa. E
  caixa de trabalho tem demissão, salário, atestado e advogado, que voltariam pela porta do
  motivo, porque a proposta aparece com o trecho que a originou.

**A caixa de SAÍDA é a metade que ninguém usa.** "Terminei e mandei" não precisa virar um
clique: está nos enviados. É o mesmo princípio do WhatsApp, ler o trabalho onde ele
acontece, aplicado ao lugar onde metade do trabalho de escritório acontece.

**Concluir sozinho só com a prova da própria pessoa.** Quando o envelope saiu da caixa de
quem responde pela tarefa, marcar como feita é registrar o que ela fez, não decidir por
ela. Em todo o resto é proposta. É o que concilia o "aparece entregue sem ninguém tocar em
nada" do plano com a regra de que a IA não decide.

**O mesmo e-mail dos dois lados conta uma vez.** Com a equipe inteira conectada, a mensagem
aparece na saída de quem mandou e na entrada de quem recebeu; quem dedupa é o `Message-ID`,
e a saída vence, porque ela prova quem mandou.

**`envelopes_vistos` não guarda conteúdo**, nem assunto nem remetente: ela responde uma
pergunta só, "isto eu já olhei?". Guardar mais seria guardar o rastro de com quem a pessoa
fala, e a conferência do `atualizar.sql` verifica as colunas.

**A caixa é da pessoa, e nem o administrador enxerga**, como a nota e a agenda externa. O
que a casa vê é o resultado, que é a tarefa concluída.

## Testar RLS exige trocar de papel

O psql do ensaio conecta como `postgres`, que é DONO das tabelas, e **dono ignora
política**. Todo teste de "fulano não enxerga" passava por não estar testando nada: o
`select` devolvia a linha e o teste dava verde por outro motivo.

Antes de afirmar que uma política protege alguma coisa, `set role authenticated` e conferir
de novo. E **não conceder `execute on all functions` ao papel depois de rodar o schema**:
ele faz `revoke` nas funções que devolvem credencial, e um grant depois desfaz a trava em
silêncio.

## Modo demonstração





Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`, o app
roda inteiro no navegador (`lib/local/`), com a empresa de exemplo de `lib/local/semente.ts`.

O ponto de troca é único: `lib/supabase/browser.ts`. Nenhuma tela sabe em qual modo está.
Ao mexer em `supabase/schema.sql`, espelhar a mudança em `lib/local/cliente.ts`, que
repete as regras de visibilidade e as funções `salvar_fluxo` e `aprovar_etapa`.

<!-- END:esteira-local -->
