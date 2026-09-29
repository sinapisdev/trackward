-- ==========================================================================
-- Esteira, estrutura do banco
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).
-- Ele pode ser rodado de novo sem quebrar nada.
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. Tabelas, na ordem em que dependem umas das outras
-- --------------------------------------------------------------------------

-- Uma linha por pessoa **em cada espaço**.
--
-- Um login pode ter o Track pessoal e o da empresa, e um dia o de uma segunda
-- empresa. São perfis diferentes, com papéis diferentes, do mesmo user_id. Por
-- isso o id do perfil deixou de ser o id do login: se fosse, cada pessoa só
-- poderia existir em um lugar.
create table if not exists public.perfis (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  nome       text not null,
  email      text not null,
  cor        text not null default '#C2703C',
  papel      text not null default 'colaborador' check (papel in ('admin','gestor','colaborador')),
  -- A ligação com areas entra mais abaixo: as duas tabelas se referenciam.
  area_id    uuid,
  gestor_id  uuid references public.perfis on delete set null,
  ve_area    boolean not null default false,
  ativo      boolean not null default false,
  criado_em  timestamptz not null default now()
);

-- A empresa cliente. Uma linha por empresa que usa o Track, e é o id desta linha
-- que aparece em TODAS as outras tabelas, como a etiqueta que diz de quem é o dado.
-- Duas organizações nunca se enxergam: é a parede do produto, garantida no banco.
create table if not exists public.organizacoes (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  -- pessoal: uma pessoa só. Equipe, convite, responsável e aprovador somem da tela.
  -- equipe:  várias pessoas, com hierarquia e distribuição de tarefa.
  -- Trocar de pessoal para equipe é ligar uma chave, não migrar nada.
  tipo           text not null default 'equipe' check (tipo in ('pessoal','equipe')),
  -- Domínio de e-mail da empresa. Quem se cadastra com e-mail da casa cai aqui
  -- em vez de abrir uma organização paralela, que é o erro clássico de quem
  -- vende software por assinatura: cinco pessoas da mesma empresa, cinco contas.
  dominio        text unique,
  -- Entrar sozinho pelo domínio, ou só por convite. Começa fechado, de propósito.
  entrada_por_dominio boolean not null default false,
  -- Quem abriu a conta. Não pode ser desativada nem rebaixada por ninguém.
  dono_id        uuid,
  plano          text not null default 'piloto',
  criado_em      timestamptz not null default now(),

  -- Preferências, que antes viviam numa tabela config de linha única.
  multi          boolean not null default false,
  rotulo         text not null default 'Empresa',
  rotulo_plural  text not null default 'Empresas',
  ia_ativa       boolean not null default true,
  -- sugerir: a leitura propõe e alguém aceita com um toque.
  -- aplicar: tarefa nova e tarefa concluída entram sozinhas. Prazo nunca entra
  --          sozinho, porque prazo é compromisso com quem espera.
  ia_modo        text not null default 'sugerir' check (ia_modo in ('sugerir','aplicar')),

  /**
   * A leitura que roda sozinha, sem ninguém abrir o app.
   *
   * leitura_por_dia  quantas varreduras por dia. 0 desliga e volta ao botão.
   * leitura_janela   a faixa de horário, no fuso da empresa. Ninguém quer
   *                  proposta nascendo às três da manhã.
   * fuso             o fuso da empresa, que é o que dá sentido à janela.
   * pulso_em         quando a última varredura rodou, para espaçar a próxima.
   *
   * O intervalo não é configurado, é calculado: a janela dividida pelo número
   * de leituras. Pedir "de quantas em quantas horas" faria a pessoa fazer uma
   * conta que o app faz melhor.
   */
  leitura_por_dia int not null default 3 check (leitura_por_dia between 0 and 24),
  leitura_janela  text not null default '08:00-19:00',
  fuso            text not null default 'America/Sao_Paulo',
  pulso_em        timestamptz
);

-- Empresa, negócio, unidade, centro de custo: o rótulo é escolhido em Ajustes.
-- Só aparece na interface quando config.multi está ligado.
create table if not exists public.empresas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  sigla     text not null default '',
  cor       text not null default '#C2703C',
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);

-- Frente que já funciona e guarda as rotinas: Financeiro, Engenharia, Comercial.
create table if not exists public.areas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  cor            text not null default '#C2703C',
  ordem          int  not null default 0,
  -- Quem recebe, por padrão, o que o processo manda para esta área.
  responsavel_id uuid,
  criado_em      timestamptz not null default now()
);

-- Agora que as duas existem, amarramos uma na outra.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_area_fk') then
    alter table public.perfis add constraint perfis_area_fk
      foreign key (area_id) references public.areas on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'areas_responsavel_fk') then
    alter table public.areas add constraint areas_responsavel_fk
      foreign key (responsavel_id) references public.perfis on delete set null;
  end if;
end $$;

-- Convite: o superior define o papel, a área e a quem a pessoa responde ANTES
-- de ela se cadastrar. Assim a conta nasce pronta, sem fila e sem ajuste manual.
-- Deixar a própria pessoa escolher o papel no cadastro seria um convite a virar CEO.
create table if not exists public.convites (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  nome       text not null default '',
  codigo     text not null unique,
  papel      text not null default 'colaborador' check (papel in ('admin','gestor','colaborador')),
  area_id    uuid references public.areas on delete set null,
  gestor_id  uuid references public.perfis on delete set null,
  ve_area    boolean not null default false,
  criado_por uuid references public.perfis on delete set null,
  criado_em  timestamptz not null default now(),
  usado_em   timestamptz,
  usado_por  uuid references public.perfis on delete set null
);
create unique index if not exists convites_email_aberto
  on public.convites (lower(email)) where usado_em is null;

-- Processo: o trilho desenhado uma vez e reusado. As tarefas apontam para uma
-- ÁREA, não para uma pessoa, e os prazos são em dias a partir do início. É isto
-- que deixa cada empresa descrever a operação dela sem tocar em código.
create table if not exists public.processos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  descricao text not null default '',
  tipo      text not null check (tipo in ('esteira','ciclo')),
  area_id   uuid references public.areas on delete set null,
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.processo_etapas (
  id                uuid primary key default gen_random_uuid(),
  processo_id       uuid not null references public.processos on delete cascade,
  ordem             int  not null,
  nome              text not null,
  criterio          text not null default '',
  aprovador_area_id uuid references public.areas on delete set null,
  dias              int  not null default 0
);

create table if not exists public.processo_itens (
  id          uuid primary key default gen_random_uuid(),
  etapa_id    uuid not null references public.processo_etapas on delete cascade,
  processo_id uuid not null references public.processos on delete cascade,
  ordem       int  not null default 0,
  texto       text not null,
  area_id     uuid references public.areas on delete set null,
  dias        int  not null default 0
);

-- Projeto (esteira: começa e termina) ou rotina (ciclo: reinicia a cada período).
create table if not exists public.fluxos (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('esteira','ciclo')),
  nome           text not null,
  area_id        uuid references public.areas on delete restrict,
  empresa_id     uuid references public.empresas on delete set null,
  dono_id        uuid references public.perfis on delete set null,
  autor_id       uuid references public.perfis on delete set null,
  -- equipe: todos os liberados (respeitando a hierarquia de quem vê o quê)
  -- escolhidas: só as pessoas de fluxo_pessoas, mais autor, dono e responsáveis
  -- so_eu: só quem criou
  visib          text not null default 'equipe' check (visib in ('equipe','escolhidas','so_eu')),
  freq           text check (freq in ('semanal','quinzenal','mensal')),
  periodo        text,
  atual          int  not null default 0,
  concluido      boolean not null default false,
  travado_motivo text,
  travado_desde  date,
  criado_em      timestamptz not null default now()
);

-- Quem foi convidado a ver uma esteira de visibilidade escolhida.
create table if not exists public.fluxo_pessoas (
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  primary key (fluxo_id, perfil_id)
);

-- Checkpoint: o que precisa ser verdade para o fluxo avançar.
create table if not exists public.etapas (
  id           uuid primary key default gen_random_uuid(),
  fluxo_id     uuid not null references public.fluxos on delete cascade,
  ordem        int  not null,
  nome         text not null,
  criterio     text not null default '',
  aprovador_id uuid references public.perfis on delete set null,
  prazo        date
);

-- Tarefa do checklist de um checkpoint.
create table if not exists public.itens (
  id        uuid primary key default gen_random_uuid(),
  etapa_id  uuid not null references public.etapas on delete cascade,
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  texto     text not null,
  resp_id   uuid references public.perfis on delete set null,
  prazo     date,
  feito     boolean not null default false,
  priv      boolean not null default false,
  autor_id  uuid references public.perfis on delete set null,
  ordem     int  not null default 0,
  -- Quando ficou pronta. Sem isto dá para saber que a tarefa está feita, mas não
  -- em que semana ela saiu, e aí nenhum número de produtividade é verdade.
  feito_em  timestamptz,
  -- Data que não se move: prazo legal, data de cliente, evento marcado. Quando o
  -- que vem antes atrasa, esta não anda: alguém tem que dar um jeito.
  prazo_firme boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Uma tarefa que precisa sair antes de outra. Pode atravessar esteiras e áreas.
create table if not exists public.dependencias (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.itens on delete cascade,
  depende_de uuid not null references public.itens on delete cascade,
  criado_em  timestamptz not null default now(),
  unique (item_id, depende_de),
  check (item_id <> depende_de)
);

-- Voltas já fechadas de uma rotina.
create table if not exists public.historico (
  id        uuid primary key default gen_random_uuid(),
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  periodo   text not null,
  situacao  text not null check (situacao in ('ok','late')),
  criado_em timestamptz not null default now()
);

-- Linha do tempo de cada fluxo.
create table if not exists public.atividades (
  id        uuid primary key default gen_random_uuid(),
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  quem_id   uuid references public.perfis on delete set null,
  texto     text not null,
  -- Foi a leitura da conversa, e não a pessoa. A linha do tempo mostra a faísca
  -- em vez do avatar, para dar para olhar a esteira e saber quem mexeu no quê.
  por_ia    boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Agenda. Duas chaves independentes decidem o comportamento de cada compromisso:
--   bloqueia: ocupa o horário de quem participa, então ninguém marca outra coisa ali.
--   visivel:  os outros leem título, local e observação. Desligada, eles só enxergam
--             que o horário está ocupado, e nunca do que se trata.
create table if not exists public.compromissos (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null,
  quando    date not null,
  inicio    time,
  fim       time,
  local     text not null default '',
  nota      text not null default '',
  dono_id   uuid references public.perfis on delete cascade,
  bloqueia  boolean not null default true,
  visivel   boolean not null default true,
  fluxo_id  uuid references public.fluxos on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.convidados (
  compromisso_id uuid not null references public.compromissos on delete cascade,
  perfil_id      uuid not null references public.perfis on delete cascade,
  primary key (compromisso_id, perfil_id)
);

-- Ligação com o calendário de fora (Google, Apple, Outlook).
-- A url é um segredo: quem a tem lê o calendário inteiro. Por isso só o próprio
-- dono enxerga esta linha, nem o administrador.
create table if not exists public.agendas_externas (
  perfil_id uuid primary key references public.perfis on delete cascade,
  url       text not null,
  nome      text not null default '',
  lido_em   timestamptz
);

-- O que sobra do calendário de fora depois de jogar o conteúdo no lixo: só os
-- intervalos. Esta tabela pode ser lida por toda a equipe, porque não diz nada
-- além de "esta pessoa não está livre aqui".
create table if not exists public.ocupacao_externa (
  id        uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis on delete cascade,
  quando    date not null,
  inicio    time,
  fim       time
);

-- --------------------------------------------------------------------------
-- 1b. Índices
-- --------------------------------------------------------------------------

create index if not exists etapas_fluxo_idx     on public.etapas (fluxo_id, ordem);
create index if not exists itens_etapa_idx      on public.itens (etapa_id, ordem);
create index if not exists itens_fluxo_idx      on public.itens (fluxo_id);
create index if not exists itens_resp_idx       on public.itens (resp_id) where not feito;
create index if not exists dep_item_idx         on public.dependencias (item_id);
create index if not exists dep_trava_idx        on public.dependencias (depende_de);
create index if not exists historico_fluxo_idx  on public.historico (fluxo_id, criado_em);
create index if not exists atividades_fluxo_idx on public.atividades (fluxo_id, criado_em desc);
create index if not exists comp_quando_idx      on public.compromissos (quando);
create index if not exists oce_perfil_idx       on public.ocupacao_externa (perfil_id, quando);
create index if not exists pe_proc_idx          on public.processo_etapas (processo_id, ordem);
create index if not exists pi_etapa_idx         on public.processo_itens (etapa_id, ordem);

-- --------------------------------------------------------------------------
-- 1c. Conversa: canais, mensagens e o que a leitura delas propõe
-- --------------------------------------------------------------------------

-- Canal de conversa.
--   aberto:  toda a equipe entra. Amarrado a um projeto, quem vê o projeto vê o canal.
--   fechado: só quem foi posto dentro. Nem o administrador lê de fora, de propósito:
--            um canal privado que o chefe lê não é um canal privado.
--   direto:  conversa entre duas pessoas.
create table if not exists public.canais (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text not null default '',
  /**
   * aberto   qualquer pessoa da casa entra e lê
   * fechado  só quem foi posto dentro
   * direto   conversa entre duas pessoas
   *
   * Canal é sempre lugar de falar COM ALGUÉM. O que a pessoa escreve para si
   * mesma não mora aqui: mora em `notas`, que tem conversa própria com a
   * leitura. Houve um quarto tipo, `pessoal`, e ele saiu na seção 19: caderno
   * listado entre os canais é lido como lugar de falar com alguém, e ninguém
   * fala sozinho onde os outros conversam.
   */
  tipo        text not null default 'aberto' check (tipo in ('aberto','fechado','direto')),
  area_id     uuid references public.areas on delete set null,
  fluxo_id    uuid references public.fluxos on delete cascade,
  empresa_id  uuid references public.empresas on delete set null,
  criado_por  uuid references public.perfis on delete set null,
  criado_em   timestamptz not null default now(),
  arquivado   boolean not null default false,
  /**
   * Até onde a leitura automática já leu este canal.
   *
   * Sem isto, cada varredura reprocessaria a conversa inteira e o cliente
   * pagaria duas vezes pela mesma mensagem. É a marca de leitura da máquina, e
   * é diferente da marca de leitura de gente, que mora em canal_membros.
   */
  lido_pela_ia_em timestamptz
);

-- Estar aqui dentro é o que dá acesso a um canal fechado, e é também onde fica a
-- marca de leitura, que conta o que chegou depois da última vez que você abriu.
create table if not exists public.canal_membros (
  canal_id   uuid not null references public.canais on delete cascade,
  perfil_id  uuid not null references public.perfis on delete cascade,
  lido_em    timestamptz,
  primary key (canal_id, perfil_id)
);

create table if not exists public.mensagens (
  id          uuid primary key default gen_random_uuid(),
  canal_id    uuid not null references public.canais on delete cascade,
  autor_id    uuid references public.perfis on delete set null,
  texto       text not null,
  responde_a  uuid references public.mensagens on delete set null,
  -- Escrita pelo próprio sistema, quando uma sugestão vira tarefa.
  sistema     boolean not null default false,
  -- Escrita pela leitura da conversa, e não por quem mandou ler. A mensagem
  -- aparece assinada pela leitura, que é o aviso de que a máquina fez algo.
  por_ia      boolean not null default false,
  -- Recado de voz. O arquivo mora no balde de anexos; aqui fica o endereço.
  --
  -- A transcrição vai em TEXTO, e não numa coluna própria. É a decisão que faz o
  -- resto do app funcionar sem mudar nada: a leitura da conversa, a menção pelo
  -- nome e a busca já leem texto, então um recado de voz entra em todos eles de
  -- graça. transcrito diz de onde o texto veio, para a tela poder avisar que
  -- pode ter erro de audição.
  audio_caminho  text,
  audio_segundos int,
  transcrito     boolean not null default false,
  criado_em   timestamptz not null default now(),
  editado_em  timestamptz
);

-- O que a leitura da conversa propõe. Guardar a proposta separada do que ela
-- muda é o que deixa aceitar com um toque e recusar sem deixar rastro no trabalho.
create table if not exists public.sugestoes (
  id            uuid primary key default gen_random_uuid(),
  canal_id      uuid not null references public.canais on delete cascade,
  mensagem_id   uuid references public.mensagens on delete set null,
  tipo          text not null check (tipo in ('tarefa','prazo','concluir','decisao','trava','distribuir','agente','nota','compromisso')),
  texto         text not null,
  -- O trecho da conversa que deu origem, para ninguém aceitar no escuro.
  motivo        text not null default '',
  dados         jsonb not null default '{}'::jsonb,
  estado        text not null default 'aberta' check (estado in ('aberta','aceita','recusada')),
  criado_em     timestamptz not null default now(),
  decidido_por  uuid references public.perfis on delete set null,
  decidido_em   timestamptz,
  -- Quem aplicou: a leitura sozinha, ou uma pessoa. Sem isto, o que a IA faz
  -- aparece no nome de quem por acaso mandou ler, e ninguém mais distingue o
  -- que foi feito por gente do que foi feito por máquina.
  por_ia        boolean not null default false,
  -- Desfeita quando alguém voltou atrás no que a leitura fez sozinha.
  desfeita_em   timestamptz,
  desfeita_por  uuid references public.perfis on delete set null
);

create index if not exists msg_canal_idx  on public.mensagens (canal_id, criado_em);
create index if not exists cm_perfil_idx  on public.canal_membros (perfil_id);
create index if not exists sug_canal_idx  on public.sugestoes (canal_id, criado_em desc);
create index if not exists sug_abertas_idx on public.sugestoes (canal_id) where estado = 'aberta';
create index if not exists canais_fluxo_idx on public.canais (fluxo_id);
create index if not exists canais_area_idx  on public.canais (area_id);

-- --------------------------------------------------------------------------
-- 1e. A prova do que foi feito, e a decisão de quem aprova
--
--     O anexo é a prova: o comprovante, o contrato assinado, a foto. Fica preso
--     à TAREFA, porque é a tarefa que alguém entrega. O arquivo em si mora no
--     Storage; aqui fica o endereço dele e quem o pôs ali.
--
--     A decisão é o que o aprovador respondeu no checkpoint. Guardar numa tabela,
--     e não só no texto da linha do tempo, é o que permite mostrar depois
--     "aprovado com ressalva: faltou o aceite" sem ninguém ter que ler frase.
-- --------------------------------------------------------------------------

/**
 * As notas: o que a pessoa quer guardar e achar depois.
 *
 * NOTA NÃO É TAREFA, e essa é a distinção que faz a tela valer. Tarefa tem dono e
 * prazo e cobra. Nota não cobra nada: é a ideia, o insight, o número que alguém
 * falou numa reunião, o nome do fornecedor que vale lembrar. Botar isso na lista
 * de tarefas é o jeito mais rápido de entupir a lista e parar de olhar para ela.
 *
 * O desenho é o do Obsidian, e de propósito: texto puro, e ligação entre notas
 * escrita dentro do próprio texto, com [[titulo da outra nota]]. Não tem pasta,
 * não tem árvore, não tem categoria para manter. Uma nota vira acervo porque
 * aponta para outras, e é assim que se acha de novo o que se escreveu num dia em
 * que nem se sabia por quê.
 *
 * Nota é sempre de UMA PESSOA. Não existe nota da empresa: para virar assunto da
 * equipe ela é mandada para um canal, e aí é mensagem, que é outra coisa. Isso
 * mantém o caderno sendo caderno, o lugar onde dá para escrever besteira.
 */
create table if not exists public.notas (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null,
  texto     text not null default '',
  dono_id   uuid not null references public.perfis on delete cascade,
  /** De onde veio, quando veio do despejo: a mensagem que deu origem. */
  mensagem_id uuid references public.mensagens on delete set null,
  /** O que ela virou, se virou. Uma ideia que ganhou dono e prazo é as duas coisas. */
  item_id   uuid references public.itens on delete set null,
  fixada    boolean not null default false,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  mexido_em timestamptz not null default now()
);

create table if not exists public.anexos (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.itens on delete cascade,
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  nome      text not null,
  tipo      text not null default '',
  tamanho   bigint not null default 0,
  -- Endereço dentro do balde 'anexos'. Começa pelo id da organização, que é o
  -- que deixa a política do Storage barrar o arquivo de outra empresa.
  caminho   text not null unique,
  autor_id  uuid references public.perfis on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.decisoes (
  id        uuid primary key default gen_random_uuid(),
  fluxo_id  uuid not null references public.fluxos on delete cascade,
  etapa_id  uuid not null references public.etapas on delete cascade,
  quem_id   uuid references public.perfis on delete set null,
  -- aprovou: seguiu limpo. ressalva: seguiu, com pendência anotada.
  -- devolveu: não seguiu, e as tarefas marcadas voltaram a ficar em aberto.
  tipo      text not null check (tipo in ('aprovou','ressalva','devolveu')),
  nota      text not null default '',
  criado_em timestamptz not null default now()
);

-- O prazo de uma tarefa não anda sozinho porque outra atrasou. Vira um pedido,
-- e quem responde pela tarefa aceita ou recusa. É a mesma ideia da leitura da
-- conversa: a máquina propõe, a gente decide.
create table if not exists public.pedidos_prazo (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.itens on delete cascade,
  fluxo_id   uuid not null references public.fluxos on delete cascade,
  de         date,
  para       date not null,
  motivo     text not null default '',
  -- A tarefa que atrasou e puxou esta. Nulo quando o pedido é manual.
  origem_id  uuid references public.itens on delete set null,
  pedido_por uuid references public.perfis on delete set null,
  estado     text not null default 'aberto' check (estado in ('aberto','aceito','recusado')),
  decidido_por uuid references public.perfis on delete set null,
  decidido_em  timestamptz,
  criado_em  timestamptz not null default now(),
  -- Um pedido aberto por tarefa. O segundo substitui o primeiro.
  unique (item_id, estado) deferrable initially deferred
);

create index if not exists pz_item_idx  on public.pedidos_prazo (item_id);
create index if not exists pz_abertos_idx on public.pedidos_prazo (fluxo_id) where estado = 'aberto';

-- O que o Track aprendeu sobre ESTA empresa.
--
-- Aprender aqui não é treinar modelo: é acumular o que a casa ensinou e entregar
-- isso ao modelo em cada leitura. Três coisas, e a terceira é a que mais vale:
--
--   termo    a palavra da casa e a que frente ela se refere. "a virada" é a
--            Abertura da unidade Norte, e ninguém escreve o nome completo
--   pessoa   quem costuma responder por que assunto, tirado do que a conversa
--            pediu a quem e de quem aceitou o quê
--   recusa   o padrão de frase que já gerou proposta e foi recusada. É a única
--            forma de a leitura parar de repetir o mesmo erro
--
-- peso é quantas vezes aquilo se confirmou. Uma coincidência tem peso 1, um
-- hábito da casa tem peso 20. Nada com peso 1 muda decisão nenhuma.
--
-- Tudo aqui é visível e apagável na tela, de propósito: se a máquina aprendeu
-- errado, alguém precisa poder ver e desfazer. Memória que não se audita é
-- exatamente o que faz uma empresa desconfiar de IA.
create table if not exists public.memoria (
  id        uuid primary key default gen_random_uuid(),
  tipo      text not null check (tipo in ('termo','pessoa','recusa')),
  -- A palavra, o assunto ou o padrão, sempre normalizado (sem acento, minúsculo).
  chave     text not null,
  -- O que aquilo quer dizer, em texto, para a tela mostrar e o modelo ler.
  valor     text not null default '',
  fluxo_id  uuid references public.fluxos on delete cascade,
  area_id   uuid references public.areas on delete cascade,
  perfil_id uuid references public.perfis on delete set null,
  peso      int not null default 1,
  -- O trecho que ensinou isto, para ninguém ter que acreditar na palavra da máquina.
  exemplo   text not null default '',
  visto_em  timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- O relógio de luz de cada empresa.
--
-- Uma linha por chamada paga ao modelo. Sem isto não há como precificar, não há
-- como pôr teto e não há como saber qual cliente está caro: é um prédio com um
-- relógio só, no nome de quem vende.
--
-- O custo fica em MILIONÉSIMOS de dólar, em inteiro. Dinheiro em ponto flutuante
-- erra no centavo quando se soma muita linha, e conta de cliente não pode errar.
--
-- O nome do modelo fica gravado junto: preço muda com o tempo, e a linha de
-- ontem tem que continuar valendo o que valia ontem.
create table if not exists public.consumo (
  id          uuid primary key default gen_random_uuid(),
  -- Onde foi gasto. Hoje só 'leitor'; a coluna existe para o próximo uso pago
  -- não precisar de tabela nova.
  onde        text not null default 'leitor',
  modelo      text not null default '',
  entrada     int  not null default 0,
  saida       int  not null default 0,
  cache_leitura int not null default 0,
  cache_escrita int not null default 0,
  custo_micro bigint not null default 0,
  perfil_id   uuid references public.perfis on delete set null,
  canal_id    uuid references public.canais on delete set null,
  criado_em   timestamptz not null default now()
);

-- Os conectores que a empresa liga por conta própria.
--
-- A ideia: em vez de eu escrever um conector para cada serviço do mundo, o
-- cliente cadastra o endereço e a chave dele, e pronto. Vale para qualquer API
-- que aceite uma chave num cabeçalho, que é a grande maioria.
--
-- O PROBLEMA QUE DECIDE O DESENHO: a chave de API de uma empresa não pode ficar
-- legível para os funcionários dela. Uma chave da Twilio na mão de qualquer um é
-- SMS cobrado no cartão do cliente; uma chave de e-mail é mensagem saindo em nome
-- da empresa. E a tabela precisa ser lida pelo app inteiro para a tela funcionar.
--
-- A solução: o que fica gravado aqui é o segredo CIFRADO, e a chave que abre a
-- cifra mora só na variável de ambiente do servidor. Quem dumpar o banco leva
-- texto embaralhado. Quem ler a tabela pelo app também. Só a rota do servidor
-- abre, e ela nunca devolve o segredo para o navegador: ela faz a chamada.
--
-- dica guarda os quatro últimos caracteres, para a tela poder mostrar
-- "sk-...a1b2" e a pessoa reconhecer qual chave é sem poder usá-la.
create table if not exists public.conectores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  -- O endereço base, sem barra no fim. Ex.: https://api.resend.com
  base_url    text not null,
  /**
   * Como autenticar:
   *   bearer  Authorization: Bearer <segredo>
   *   header  <auth_nome>: <segredo>
   *   query   ?<auth_nome>=<segredo>
   */
  auth_tipo   text not null default 'bearer' check (auth_tipo in ('bearer','header','query')),
  auth_nome   text not null default '',
  segredo_cifrado text not null default '',
  dica        text not null default '',
  /**
   * De quem é este conector.
   *
   * null   é da casa: qualquer um da empresa pode usar, só admin mexe.
   * perfil é de uma pessoa: só ela vê, só ela mexe.
   *
   * ISSO EXISTE PORQUE QUEM MAIS USA O APP NÃO É O DONO. É o funcionário, e a
   * conta do Notion que ele quer ligar é dele, não da empresa. Se ligar um
   * serviço fosse privilégio de admin, o recurso ficaria parado: a pessoa que
   * tem a chave na mão não é a pessoa que tem a permissão.
   *
   * E o conector pessoal tem que ser PESSOAL de verdade. A chave do Gmail de uma
   * pessoa não aparece na tela do colega nem na do chefe, nem cifrada. Por isso a
   * política de leitura filtra por dono, e não só por empresa.
   */
  dono_id     uuid references public.perfis on delete cascade,
  ativo       boolean not null default true,
  criado_por  uuid references public.perfis on delete set null,
  criado_em   timestamptz not null default now()
);

-- Os agentes da empresa.
--
-- A descoberta que fez isto caber: o agente que a empresa quer JÁ É UM PROCESSO.
-- "Alguém foi desligado, o RH faz o acerto, o Financeiro paga" é um molde com
-- dois checkpoints em duas áreas, e criar_do_processo já distribui isso sozinho.
-- O que faltava era o GATILHO: alguma coisa disparando o molde a partir da
-- conversa. Então um agente é gatilho mais ação, e nada mais.
--
-- E a ação nunca é direta: ela vira uma SUGESTÃO, a mesma que a leitura da
-- conversa usa. Assim o agente herda tudo que já foi construído para a IA não
-- fazer besteira em silêncio: o trecho que deu origem, o aceite de uma pessoa, a
-- assinatura de quem fez, o desfazer, e a memória aprendendo com a recusa.
--
-- Um agente disparando um processo inteiro sozinho, em cima de uma frase mal
-- lida, criaria vinte tarefas erradas em duas áreas. Propor não.
create table if not exists public.agentes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativo       boolean not null default true,
  -- Hoje só 'conversa'. A coluna existe para o próximo gatilho não precisar de
  -- tabela nova: tarefa concluída, checkpoint devolvido, prazo vencido.
  quando      text not null default 'conversa' check (quando in ('conversa')),
  -- O que reconhecer, escrito em português pela empresa. É isto que vai no
  -- pedido ao modelo, e são as palavras daqui que valem sem chave de modelo.
  reconhecer  text not null default '',
  -- Onde o agente escuta. Nulo nos dois é escutar em todo canal.
  canal_id    uuid references public.canais on delete cascade,
  area_id     uuid references public.areas on delete cascade,
  -- O que faz.
  faz         text not null check (faz in ('processo','tarefa','webhook','conector')),
  processo_id uuid references public.processos on delete set null,
  tarefa_texto text not null default '',
  tarefa_area_id uuid references public.areas on delete set null,
  -- Para 'webhook': a ponte para tudo o que não é o Track. Zapier, Make, n8n,
  -- ou o sistema que a TI do cliente já tem.
  url         text not null default '',
  -- Para 'conector': qual conector, em que caminho, com que corpo. O corpo é um
  -- molde de texto com {{situacao}} e {{agente}}, trocados na hora do disparo.
  conector_id uuid references public.conectores on delete set null,
  caminho     text not null default '',
  corpo       text not null default '',
  disparos    int not null default 0,
  disparado_em timestamptz,
  criado_por  uuid references public.perfis on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists anexos_item_idx  on public.anexos (item_id);
create index if not exists msg_audio_idx on public.mensagens (audio_caminho) where audio_caminho is not null;
create index if not exists anexos_fluxo_idx on public.anexos (fluxo_id);
create index if not exists dec_etapa_idx    on public.decisoes (etapa_id, criado_em desc);
create index if not exists dec_fluxo_idx    on public.decisoes (fluxo_id, criado_em desc);

-- --------------------------------------------------------------------------
-- 1d. A parede: a etiqueta da organização em todas as tabelas
--
--     Em vez de repetir a coluna em 22 definições de tabela, ela entra aqui de
--     uma vez só. Assim ninguém cria tabela nova e esquece, e a verificação no
--     fim do arquivo (seção 11) acusa se acontecer.
-- --------------------------------------------------------------------------

-- A ordem aqui importa: primeiro a coluna nasce em todas as tabelas, depois as
-- funções que a consultam, e só então os gatilhos que usam essas funções.
do $$
declare t text;
begin
  foreach t in array array[
    'perfis','empresas','areas','convites',
    'processos','processo_etapas','processo_itens',
    'fluxos','fluxo_pessoas','etapas','itens','dependencias','historico','atividades',
    'compromissos','convidados','agendas_externas','ocupacao_externa',
    'canais','canal_membros','mensagens','sugestoes',
    'anexos','decisoes','pedidos_prazo','memoria','consumo','agentes','conectores','notas'
  ] loop
    execute format(
      'alter table public.%I add column if not exists org_id uuid references public.organizacoes on delete cascade', t);
    execute format(
      'create index if not exists %I on public.%I (org_id)', t || '_org_idx', t);
  end loop;
end $$;

-- Quem sou eu, e de qual organização. security definer para não cair em
-- recursão ao consultar perfis dentro das políticas do próprio perfis.
-- Definida de novo mais abaixo, quando meu_perfil() já existe. Esta primeira
-- versão serve só para as funções criadas antes dela poderem ser compiladas.
create or replace function public.minha_org()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from perfis where user_id = auth.uid() order by criado_em, id limit 1;
$$;

-- A pergunta que toda política faz: esta linha é da minha organização?
-- Nulo nunca passa: linha sem etiqueta não é de ninguém, e portanto não é sua.
create or replace function public.minha(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_org is not null and p_org = minha_org();
$$;

-- A etiqueta é carimbada pelo servidor, nunca enviada pelo navegador. É isto que
-- torna impossível forjar: mesmo que alguém mande org_id de outra empresa na
-- requisição, o valor é sobrescrito pelo da conta que está logada.
create or replace function public.carimbar_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.org_id := coalesce(minha_org(), new.org_id);
  return new;
end $$;

-- perfis fica de fora de propósito: a única inserção em perfis é a do cadastro,
-- que já calculou a organização certa (pelo convite, pelo domínio ou criando uma
-- nova). Carimbar ali sobrescreveria essa decisão pela organização de quem por
-- acaso estivesse logado, e foi exatamente o que a vistoria pegou.
-- O `continue when` não é zelo exagerado: sem ele, uma tabela que ainda não
-- existe no meio da lista derruba o bloco inteiro, e TODAS as tabelas depois
-- dela ficam sem carimbo. Como o carimbo é o que preenche `org_id`, e toda
-- política pergunta `minha(org_id)`, o efeito é o banco recusar criação nessas
-- tabelas com "new row violates row-level security policy", sem dizer por quê.
-- Foi assim que criar tarefa e criar canal pararam, e demorou para achar
-- justamente porque o erro aponta para a política, não para o carimbo que falta.
do $$
declare t text; n int := 0;
begin
  foreach t in array array[
    'empresas','areas','convites',
    'processos','processo_etapas','processo_itens',
    'fluxos','fluxo_pessoas','etapas','itens','dependencias','historico','atividades',
    'compromissos','convidados','agendas_externas','ocupacao_externa',
    'canais','canal_membros','mensagens','sugestoes',
    'anexos','decisoes','pedidos_prazo','memoria','consumo','agentes','conectores','notas'
  ] loop
    continue when to_regclass('public.' || quote_ident(t)) is null;
    execute format('drop trigger if exists ao_inserir_org on public.%I', t);
    execute format(
      'create trigger ao_inserir_org before insert on public.%I
         for each row execute function public.carimbar_org()', t);
    n := n + 1;
  end loop;
  raise notice 'Carimbo de organização em % tabelas.', n;
end $$;

create unique index if not exists memoria_uk on public.memoria (org_id, tipo, chave);
create index if not exists consumo_mes_idx on public.consumo (org_id, criado_em desc);

-- Os campos de plano. Ficam na organização, e não em tabela de planos, porque os
-- planos ainda não estão definidos: assim dá para começar a cobrar mexendo em
-- números, e o dia em que virarem tabela de verdade, a organização passa a
-- apontar para ela sem nada aqui mudar de significado.
alter table public.organizacoes add column if not exists plano text not null default 'padrao';
-- Quantas leituras com modelo por mês. Nulo é sem teto.
alter table public.organizacoes add column if not exists limite_leituras int;
-- Qual modelo esta empresa usa. Vazio é o padrão do servidor.
alter table public.organizacoes add column if not exists modelo_ia text;
create index if not exists memoria_peso_idx on public.memoria (org_id, tipo, peso desc);

-- Uma pessoa, um perfil por espaço. A restrição entra aqui porque depende da
-- coluna org_id, que nasce no bloco acima.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_user_org_uk') then
    alter table public.perfis add constraint perfis_user_org_uk unique (user_id, org_id);
  end if;
end $$;

-- Qual dos meus perfis está em uso agora. Sem escolha registrada, vale o mais
-- antigo, que é o primeiro espaço que a pessoa abriu.
create table if not exists public.sessoes (
  user_id   uuid primary key references auth.users on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  trocado_em timestamptz not null default now()
);

create or replace function public.meu_perfil()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.perfil_id from sessoes s
      join perfis p on p.id = s.perfil_id and p.user_id = auth.uid()
     where s.user_id = auth.uid()),
    (select p.id from perfis p where p.user_id = auth.uid() order by p.criado_em, p.id limit 1)
  );
$$;

-- Agora que perfis tem a coluna, a organização pode apontar para o dono.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'org_dono_fk') then
    alter table public.organizacoes add constraint org_dono_fk
      foreign key (dono_id) references public.perfis on delete set null;
  end if;
end $$;

-- Agora sim: a organização em uso é a do perfil escolhido, não a do primeiro.
create or replace function public.minha_org()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from perfis where id = meu_perfil();
$$;

-- Convite pertence a uma organização e vence, como em qualquer produto sério:
-- link de convite que vale para sempre é uma porta destrancada esquecida aberta.
alter table public.organizacoes add column if not exists tipo text not null default 'equipe';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizacoes_tipo_check') then
    alter table public.organizacoes add constraint organizacoes_tipo_check
      check (tipo in ('pessoal','equipe'));
  end if;
end $$;

alter table public.convites add column if not exists vence_em timestamptz;
update public.convites set vence_em = criado_em + interval '7 days' where vence_em is null;
alter table public.convites alter column vence_em set default (now() + interval '7 days');

-- --------------------------------------------------------------------------
-- 2. Funções de apoio
--    security definer para não cair em recursão ao consultar perfis dentro
--    das políticas do próprio perfis.
-- --------------------------------------------------------------------------

create or replace function public.ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = meu_perfil() and ativo);
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = meu_perfil() and ativo and papel = 'admin');
$$;

-- A pessoa logada e todo mundo abaixo dela na hierarquia, em qualquer profundidade.
-- É isto que dá ao gestor o direito de acompanhar (e cobrar) a equipe dele.
create or replace function public.meu_alcance()
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive abaixo as (
    select id, org_id from perfis where id = meu_perfil()
    union
    select p.id, p.org_id from perfis p join abaixo a on p.gestor_id = a.id
    where p.org_id = a.org_id
  )
  select id from abaixo;
$$;

-- Enxerga tudo da própria área, além do que é dela.
-- Enxerga a área inteira, não só as tarefas em que entra.
create or replace function public.ve_area_de(p_fluxo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p join fluxos f on f.id = p_fluxo
    where p.id = meu_perfil() and p.ve_area and p.area_id is not null and f.area_id = p.area_id
  );
$$;

-- Uma tarefa aparece para quem responde por ela, para quem está acima dessa pessoa,
-- e para quem tem uma tarefa travada por ela.
create or replace function public.ve_item(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from itens i where i.id = p_id and minha(i.org_id))
    and (
    eh_admin()
    or exists (select 1 from itens i where i.id = p_id and i.resp_id in (select meu_alcance()))
    or exists (
      select 1 from dependencias d join itens meu on meu.id = d.item_id
      where d.depende_de = p_id and meu.resp_id in (select meu_alcance())
    )
    or exists (select 1 from itens i where i.id = p_id and ve_area_de(i.fluxo_id))
    -- Quem aprova o checkpoint lê as tarefas dele. Não é exceção à regra, é a
    -- definição de aprovar: ninguém dá aceite no que não pode ler. Tarefa
    -- privada continua fora, porque isso é outra condição, em itens_sel.
    or exists (
      select 1 from itens i join etapas e on e.id = i.etapa_id
      where i.id = p_id and e.aprovador_id = meu_perfil()
    )
    -- Quem escreveu a tarefa enxerga a tarefa. Sem esta linha, delegar era
    -- perder de vista: a pessoa criava uma tarefa para outra e ela sumia da
    -- tela no mesmo instante. Pior, como o app pede a linha de volta logo
    -- depois de gravar, o Postgres recusava o RETURNING e devolvia "new row
    -- violates row-level security policy", que faz parecer que a gravação
    -- falhou quando ela tinha passado.
    or exists (select 1 from itens i where i.id = p_id and i.autor_id = meu_perfil()));
$$;

-- Fluxo que a pessoa logada pode enxergar (privado só aparece para quem criou).
create or replace function public.ve_fluxo(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    -- antes de qualquer regra de visibilidade, a esteira precisa ser da minha
    -- organização. Esta linha é a parede entre empresas clientes.
    exists (select 1 from fluxos x where x.id = f and minha(x.org_id))
    and (
    -- só eu: ninguém além de quem criou
    exists (select 1 from fluxos x where x.id = f and x.visib = 'so_eu' and x.autor_id = meu_perfil())
    -- pessoas escolhidas: quem foi convidado entra, o resto depende de participar
    or exists (
      select 1 from fluxos x join fluxo_pessoas fp on fp.fluxo_id = x.id
      where x.id = f and x.visib = 'escolhidas' and fp.perfil_id in (select meu_alcance())
    )
    or (
      exists (select 1 from fluxos x where x.id = f and x.visib <> 'so_eu')
      and (
        (eh_admin() and exists (select 1 from fluxos x where x.id = f and x.visib = 'equipe'))
        or (ve_area_de(f) and exists (select 1 from fluxos x where x.id = f and x.visib = 'equipe'))
        or exists (select 1 from fluxos x where x.id = f and x.dono_id in (select meu_alcance()))
        or exists (select 1 from etapas e where e.fluxo_id = f and e.aprovador_id in (select meu_alcance()))
        or exists (select 1 from itens i where i.fluxo_id = f and i.resp_id in (select meu_alcance()))
        or exists (
          select 1 from dependencias d
          join itens trava on trava.id = d.depende_de and trava.fluxo_id = f
          join itens meu on meu.id = d.item_id
          where meu.resp_id in (select meu_alcance())
        )
      )
    ));
$$;

-- Quem desenha o processo: admin, o autor, o dono, ou o gestor de quem é dono.
create or replace function public.manda_no_processo(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from fluxos x where x.id = f and minha(x.org_id))
    and (
    eh_admin()
    or exists (
      select 1 from fluxos x
      where x.id = f and (x.autor_id = meu_perfil() or x.dono_id = meu_perfil())
    )
    or exists (
      select 1 from fluxos x join perfis p on p.id = meu_perfil()
      where x.id = f and p.papel = 'gestor' and x.dono_id in (select meu_alcance())
    ));
$$;

-- --------------------------------------------------------------------------
-- 3. Cadastro de pessoas
--    Quem se cadastra sem convite abre a própria empresa e é a administradora
--    dela. Quem chega por convite entra na empresa de quem convidou, com o
--    papel que o superior escolheu, e já liberada.
-- --------------------------------------------------------------------------

-- Domínios de e-mail pessoal. Não é mais usada no cadastro, que passou a ser por
-- convite: ficou porque o domínio ainda serve para sugerir gente ao convidar, e
-- apagar função que outro lugar possa chamar custa mais do que deixá-la parada.
create or replace function public.dominio_publico(d text)
returns boolean language sql immutable as $$
  select lower(d) = any (array[
    'gmail.com','hotmail.com','outlook.com','live.com','yahoo.com','yahoo.com.br',
    'icloud.com','me.com','bol.com.br','uol.com.br','terra.com.br','globo.com',
    'proton.me','protonmail.com','msn.com','aol.com','zoho.com','gmx.com'
  ]);
$$;

-- Cadastro. São dois caminhos, e só dois:
--
--   1. Tem convite válido, por código ou pelo próprio e-mail: entra na
--      organização de quem convidou, já com o papel, a área e o gestor que o
--      superior definiu. Nasce pronta para trabalhar.
--   2. Não tem convite: abre a própria organização e é a administradora dela.
--
-- Não existe terceiro caminho. O domínio do e-mail NÃO coloca ninguém dentro de
-- empresa nenhuma: quem decide quem entra é quem convida, pelo e-mail da pessoa.
-- Antes era por domínio, e isso produzia dois problemas. Quem se cadastrava com
-- e-mail da casa caía calado numa empresa que talvez nem fosse a dele, bloqueado,
-- com o nome de empresa que digitou jogado fora. E se a conta que abriu aquela
-- empresa sumisse, o domínio continuava reservado por uma organização sem nenhum
-- administrador, e ninguém mais conseguia entrar nem ser liberado, para sempre.
--
-- O mesmo e-mail pode estar em várias organizações ao mesmo tempo, uma por
-- convite aceito mais a que ele abriu. São perfis diferentes do mesmo login, e
-- o seletor no alto da lateral troca entre eles. É o caso do grupo e da holding,
-- em que a mesma pessoa responde por mais de uma empresa.
--
-- O papel NUNCA vem do formulário. Quem se cadastra sozinho é administrador da
-- própria empresa; quem entra por convite recebe o papel que o superior escolheu.
-- Deixar a pessoa escolher seria um convite a todo mundo virar administrador.
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cv        convites%rowtype;
  v_org     uuid;
  v_nome    text := nullif(btrim(new.raw_user_meta_data->>'organizacao'), '');
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')));
  v_papel   text := 'colaborador';
  v_ativo   boolean := false;
  v_dono    boolean := false;
  v_perfil  uuid;
  v_ve_area boolean := false;
  v_area    uuid;
  v_gestor  uuid;
  n int;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6A5E','#B5A08C'];
begin
  select * into cv from convites
  where usado_em is null
    and (vence_em is null or vence_em > now())
    and (
      (v_codigo <> '' and codigo = v_codigo)
      or lower(email) = lower(new.email)
    )
  order by (v_codigo <> '' and codigo = v_codigo) desc
  limit 1;

  if cv.id is not null then
    -- 1. Convite manda em tudo. A conta nasce pronta e liberada.
    v_org := cv.org_id;
    v_papel := coalesce(cv.papel, 'colaborador');
    v_area := cv.area_id;
    v_gestor := cv.gestor_id;
    v_ve_area := coalesce(cv.ve_area, false);
    v_ativo := true;
  else
    -- 2. Empresa nova, e quem abre é a administradora. É o único jeito de a
    --    conta nascer admin sem alguém ter dito que pode.
    insert into organizacoes (nome, tipo)
    values (
      coalesce(v_nome, initcap(split_part(new.email, '@', 1))),
      'equipe'
    )
    returning id into v_org;
    v_papel := 'admin';
    v_ativo := true;
    v_dono := true;
    v_ve_area := true;
  end if;

  select count(*) into n from perfis where org_id = v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id, v_org,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'nome'), ''),
      nullif(btrim(cv.nome), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    paleta[(n % 8) + 1],
    v_papel, v_area, v_gestor, v_ve_area, v_ativo
  )
  on conflict (user_id, org_id) do nothing
  returning id into v_perfil;

  if v_dono and v_perfil is not null then
    update organizacoes set dono_id = v_perfil where id = v_org;
  end if;
  if v_perfil is not null then
    insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
    on conflict (user_id) do update set perfil_id = excluded.perfil_id;
  end if;
  if cv.id is not null then
    update convites set usado_em = now(), usado_por = v_perfil where id = cv.id;
  end if;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.novo_usuario();

-- Uma pessoa edita o próprio nome e a própria cor. Liberar acesso e trocar papel
-- é decisão de administrador, e isso é garantido aqui, não na tela.
create or replace function public.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A organização e o login de um perfil nunca mudam. Mudar a organização seria
  -- mover alguém, com tudo que enxerga, para dentro de outra empresa cliente;
  -- mudar o login seria entregar o perfil para outra pessoa.
  new.org_id := old.org_id;
  new.user_id := old.user_id;

  if not eh_admin() then
    new.ativo := old.ativo;
    new.papel := old.papel;
    new.email := old.email;
  end if;

  -- Quem abriu a conta não pode ser desativado nem rebaixado, nem por outro
  -- administrador. Senão uma discussão interna derruba o dono da própria empresa.
  if exists (select 1 from organizacoes o where o.dono_id = old.id) then
    new.ativo := true;
    new.papel := 'admin';
  end if;
  return new;
end $$;

drop trigger if exists ao_alterar_perfil on public.perfis;
create trigger ao_alterar_perfil
  before update on public.perfis
  for each row execute function public.proteger_perfil();

-- --------------------------------------------------------------------------
-- 4. Políticas de acesso (RLS)
--    Aqui mora a privacidade de verdade: o banco recusa o que a pessoa
--    não pode ver, independente do que a tela pedir.
-- --------------------------------------------------------------------------

alter table public.organizacoes enable row level security;
alter table public.empresas   enable row level security;
alter table public.perfis     enable row level security;
alter table public.areas    enable row level security;
alter table public.fluxos     enable row level security;
alter table public.etapas     enable row level security;
alter table public.itens      enable row level security;
alter table public.historico  enable row level security;
alter table public.convites       enable row level security;
alter table public.processos       enable row level security;
alter table public.processo_etapas enable row level security;
alter table public.processo_itens  enable row level security;
alter table public.compromissos enable row level security;
alter table public.agendas_externas enable row level security;
alter table public.ocupacao_externa enable row level security;
alter table public.convidados   enable row level security;
alter table public.atividades enable row level security;
-- Estas duas tinham política escrita e a RLS desligada, então a política não
-- valia nada. Achado pela vistoria da seção 11, não por leitura minha.
alter table public.anexos   enable row level security;
alter table public.decisoes enable row level security;
alter table public.pedidos_prazo enable row level security;
alter table public.memoria enable row level security;
alter table public.consumo enable row level security;
alter table public.agentes enable row level security;
alter table public.conectores enable row level security;
alter table public.notas      enable row level security;
alter table public.fluxo_pessoas enable row level security;
alter table public.dependencias  enable row level security;

-- perfis
drop policy if exists perfis_sel on public.perfis;
create policy perfis_sel on public.perfis for select using (
  -- Os meus perfis, em qualquer espaço: é o que alimenta o seletor de espaço.
  user_id = auth.uid()
  -- E as pessoas do espaço em uso, pelas regras de sempre.
  or (minha(org_id) and (ativo() or eh_admin()))
);

drop policy if exists perfis_upd_proprio on public.perfis;
create policy perfis_upd_proprio on public.perfis for update
  using (minha(org_id) and (id = meu_perfil())) with check (minha(org_id) and (id = meu_perfil()));

drop policy if exists perfis_upd_admin on public.perfis;
create policy perfis_upd_admin on public.perfis for update
  using (minha(org_id) and (eh_admin())) with check (minha(org_id) and (eh_admin()));

drop policy if exists perfis_del_admin on public.perfis;
create policy perfis_del_admin on public.perfis for delete
  using (minha(org_id) and (eh_admin() and id <> meu_perfil()));

-- A organização: cada pessoa lê a dela e nenhuma outra. Só admin muda.
drop policy if exists org_sel on public.organizacoes;
create policy org_sel on public.organizacoes for select using (id = minha_org());

drop policy if exists org_upd on public.organizacoes;
create policy org_upd on public.organizacoes for update
  using (id = minha_org() and eh_admin()) with check (id = minha_org() and eh_admin());

-- empresas: todos os liberados leem, só admin muda

drop policy if exists empresas_sel on public.empresas;
create policy empresas_sel on public.empresas for select using (minha(org_id) and (ativo()));

drop policy if exists empresas_ins on public.empresas;
create policy empresas_ins on public.empresas for insert with check (minha(org_id) and (eh_admin()));

drop policy if exists empresas_upd on public.empresas;
create policy empresas_upd on public.empresas for update using (minha(org_id) and (eh_admin())) with check (minha(org_id) and (eh_admin()));

drop policy if exists empresas_del on public.empresas;
create policy empresas_del on public.empresas for delete using (minha(org_id) and (eh_admin()));

-- areas: todos os liberados leem, só admin mexe na estrutura
drop policy if exists areas_sel on public.areas;
create policy areas_sel on public.areas for select using (minha(org_id) and (ativo()));

drop policy if exists areas_ins on public.areas;
create policy areas_ins on public.areas for insert with check (minha(org_id) and (eh_admin()));

drop policy if exists areas_upd on public.areas;
create policy areas_upd on public.areas for update using (minha(org_id) and (eh_admin())) with check (minha(org_id) and (eh_admin()));

drop policy if exists areas_del on public.areas;
create policy areas_del on public.areas for delete using (minha(org_id) and (eh_admin()));

-- fluxos
drop policy if exists fluxos_sel on public.fluxos;
create policy fluxos_sel on public.fluxos for select
  using (minha(org_id) and (ativo() and ve_fluxo(id)));

drop policy if exists fluxos_ins on public.fluxos;
create policy fluxos_ins on public.fluxos for insert
  with check (minha(org_id) and (ativo() and autor_id = meu_perfil()));

drop policy if exists fluxos_upd on public.fluxos;
create policy fluxos_upd on public.fluxos for update
  using (minha(org_id) and (ativo() and ve_fluxo(id))) with check (minha(org_id) and (ativo() and ve_fluxo(id)));

drop policy if exists fluxos_del on public.fluxos;
create policy fluxos_del on public.fluxos for delete
  using (minha(org_id) and (ativo() and (autor_id = meu_perfil() or dono_id = meu_perfil() or eh_admin())));

-- etapas: seguem a visibilidade do fluxo
drop policy if exists etapas_sel on public.etapas;
create policy etapas_sel on public.etapas for select using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists etapas_ins on public.etapas;
create policy etapas_ins on public.etapas for insert with check (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists etapas_upd on public.etapas;
create policy etapas_upd on public.etapas for update
  using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id))) with check (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists etapas_del on public.etapas;
create policy etapas_del on public.etapas for delete using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

-- itens: além da visibilidade do fluxo, cada pessoa vê o que é dela, o que trava o
-- que é dela, e o de quem está abaixo dela
drop policy if exists itens_sel on public.itens;
create policy itens_sel on public.itens for select
  using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = meu_perfil()) and ve_item(id)));

drop policy if exists itens_ins on public.itens;
create policy itens_ins on public.itens for insert
  with check (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and autor_id = meu_perfil()));

drop policy if exists itens_upd on public.itens;
create policy itens_upd on public.itens for update
  using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = meu_perfil())))
  with check (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = meu_perfil())));

drop policy if exists itens_del on public.itens;
create policy itens_del on public.itens for delete
  using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = meu_perfil())));

-- anexos: o arquivo se vê exatamente quando a tarefa dele se vê. Apagar é de
-- quem pôs ali, ou de quem manda no processo, que responde pelo que fica.
drop policy if exists anx_sel on public.anexos;
create policy anx_sel on public.anexos for select
  using (minha(org_id) and (ativo() and ve_item(item_id)));

drop policy if exists anx_ins on public.anexos;
create policy anx_ins on public.anexos for insert
  with check (minha(org_id) and (ativo() and ve_item(item_id) and autor_id = meu_perfil()));

drop policy if exists anx_del on public.anexos;
create policy anx_del on public.anexos for delete
  using (minha(org_id) and (ativo() and (autor_id = meu_perfil() or manda_no_processo(fluxo_id))));

-- notas: são da pessoa, e ponto.
--
-- Sem exceção para admin, sem exceção para gestor, sem exceção para quem é dono
-- da empresa. Um caderno que o chefe pode abrir não é caderno: a pessoa para de
-- escrever nele o que importa, e aí a tela não serve para nada.
drop policy if exists nt_sel on public.notas;
create policy nt_sel on public.notas for select
  using (minha(org_id) and dono_id = meu_perfil());

drop policy if exists nt_ins on public.notas;
create policy nt_ins on public.notas for insert
  with check (minha(org_id) and ativo() and dono_id = meu_perfil());

drop policy if exists nt_upd on public.notas;
create policy nt_upd on public.notas for update
  using (minha(org_id) and dono_id = meu_perfil())
  with check (minha(org_id) and dono_id = meu_perfil());

drop policy if exists nt_del on public.notas;
create policy nt_del on public.notas for delete
  using (minha(org_id) and dono_id = meu_perfil());

-- conectores: cada um vê os seus e os da casa.
--
-- O conector da casa (dono_id null) todo mundo lê, porque é bom saber a quais
-- sistemas o app está ligado, e mexer nele é de admin: ele fala em nome da
-- empresa. O conector pessoal (dono_id preenchido) some da tela dos outros,
-- inclusive da do dono da empresa, e quem mexe é só a pessoa.
--
-- O segredo em qualquer um dos casos já está cifrado, então ler a linha não dá
-- acesso a nada: a chave que abre a cifra mora na variável de ambiente do
-- servidor. O filtro por dono aqui não é sobre a chave, é sobre não expor que o
-- colega ligou a conta pessoal dele em coisa nenhuma.
drop policy if exists con_sel on public.conectores;
create policy con_sel on public.conectores for select
  using (minha(org_id) and ativo() and (dono_id is null or dono_id = meu_perfil()));

drop policy if exists con_ins on public.conectores;
create policy con_ins on public.conectores for insert
  with check (minha(org_id) and ativo()
    and (case when dono_id is null then eh_admin() else dono_id = meu_perfil() end));

drop policy if exists con_upd on public.conectores;
create policy con_upd on public.conectores for update
  using (minha(org_id) and ativo()
    and (case when dono_id is null then eh_admin() else dono_id = meu_perfil() end))
  with check (minha(org_id) and ativo()
    and (case when dono_id is null then eh_admin() else dono_id = meu_perfil() end));

drop policy if exists con_del on public.conectores;
create policy con_del on public.conectores for delete
  using (minha(org_id) and ativo()
    and (case when dono_id is null then eh_admin() else dono_id = meu_perfil() end));

-- agentes: todos da casa leem, porque é bom saber que existe um agente escutando
-- a conversa. Criar e mexer é de admin e gestor: um agente dispara trabalho em
-- área que não é a de quem o escreveu, e isso não é decisão de qualquer um.
drop policy if exists ag_sel on public.agentes;
create policy ag_sel on public.agentes for select
  using (minha(org_id) and ativo());

drop policy if exists ag_ins on public.agentes;
create policy ag_ins on public.agentes for insert
  with check (minha(org_id) and ativo() and exists (
    select 1 from perfis p where p.id = meu_perfil() and p.papel in ('admin','gestor')));

drop policy if exists ag_upd on public.agentes;
create policy ag_upd on public.agentes for update
  using (minha(org_id) and ativo() and exists (
    select 1 from perfis p where p.id = meu_perfil() and p.papel in ('admin','gestor')))
  with check (minha(org_id) and ativo() and exists (
    select 1 from perfis p where p.id = meu_perfil() and p.papel in ('admin','gestor')));

drop policy if exists ag_del on public.agentes;
create policy ag_del on public.agentes for delete
  using (minha(org_id) and ativo() and exists (
    select 1 from perfis p where p.id = meu_perfil() and p.papel in ('admin','gestor')));

-- consumo: todos leem o próprio gasto, e ninguém escreve à mão. Quem grava é a
-- função registrar_consumo, chamada pela rota que fala com o modelo. Sem update
-- nem delete de propósito: medidor que o medido pode zerar não mede nada.
drop policy if exists cons_sel on public.consumo;
create policy cons_sel on public.consumo for select
  using (minha(org_id) and ativo());

-- memória: é da organização inteira, e quem trabalha nela lê e corrige. Apagar
-- é de todo mundo de propósito: quem viu a máquina aprender errado tem que poder
-- desfazer na hora, sem pedir para o administrador.
drop policy if exists mem_sel on public.memoria;
create policy mem_sel on public.memoria for select
  using (minha(org_id) and ativo());

drop policy if exists mem_ins on public.memoria;
create policy mem_ins on public.memoria for insert
  with check (minha(org_id) and ativo());

drop policy if exists mem_upd on public.memoria;
create policy mem_upd on public.memoria for update
  using (minha(org_id) and ativo()) with check (minha(org_id) and ativo());

drop policy if exists mem_del on public.memoria;
create policy mem_del on public.memoria for delete
  using (minha(org_id) and ativo());

-- pedidos de prazo: quem enxerga a tarefa enxerga o pedido. Criar é de quem
-- manda no processo de onde o atraso veio, e por isso passa pela função; decidir
-- é de quem manda na esteira da tarefa que ia se mexer, e nunca de quem pediu.
drop policy if exists pz_sel on public.pedidos_prazo;
create policy pz_sel on public.pedidos_prazo for select
  using (minha(org_id) and (ativo() and ve_item(item_id)));

-- decisões: quem enxerga a esteira enxerga o que foi decidido nela. Escrever é
-- só pela função decidir_etapa(), que confere se você é o aprovador da vez.
drop policy if exists dec_sel on public.decisoes;
create policy dec_sel on public.decisoes for select
  using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

-- dependências: seguem a visibilidade das duas pontas
drop policy if exists dep_sel on public.dependencias;
create policy dep_sel on public.dependencias for select
  using (minha(org_id) and (ativo() and (ve_item(item_id) or ve_item(depende_de))));

drop policy if exists dep_ins on public.dependencias;
create policy dep_ins on public.dependencias for insert
  with check (minha(org_id) and (ativo() and ve_item(item_id)));

drop policy if exists dep_del on public.dependencias;
create policy dep_del on public.dependencias for delete
  using (minha(org_id) and (ativo() and ve_item(item_id)));

-- convites: quem convida é quem manda. A pessoa que se cadastra não lê a tabela;
-- o trigger resolve o convite dela por dentro, com direitos de definidor.
drop policy if exists convites_sel on public.convites;
create policy convites_sel on public.convites for select
  using (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')));

drop policy if exists convites_esc on public.convites;
create policy convites_esc on public.convites for all
  using (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')))
  with check (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')));

-- processos: todos os liberados leem, para poder criar esteira a partir deles.
-- Desenhar processo é decisão de quem manda, então escrever é de admin e gestor.
drop policy if exists proc_sel on public.processos;
create policy proc_sel on public.processos for select using (minha(org_id) and (ativo()));

drop policy if exists proc_esc on public.processos;
create policy proc_esc on public.processos for all
  using (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')))
  with check (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')));

drop policy if exists pe_sel on public.processo_etapas;
create policy pe_sel on public.processo_etapas for select using (minha(org_id) and (ativo()));

drop policy if exists pe_esc on public.processo_etapas;
create policy pe_esc on public.processo_etapas for all
  using (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')))
  with check (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')));

drop policy if exists pi_sel on public.processo_itens;
create policy pi_sel on public.processo_itens for select using (minha(org_id) and (ativo()));

drop policy if exists pi_esc on public.processo_itens;
create policy pi_esc on public.processo_itens for all
  using (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')))
  with check (minha(org_id) and (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')));

-- agenda: o conteúdo é de quem organiza, de quem foi convidado, e de todos
-- quando o compromisso foi marcado como visível
drop policy if exists comp_sel on public.compromissos;
create policy comp_sel on public.compromissos for select using (minha(org_id) and (
  ativo() and (
    visivel
    or dono_id = meu_perfil()
    or exists (select 1 from convidados cv where cv.compromisso_id = id and cv.perfil_id = meu_perfil())
  )
));

drop policy if exists comp_ins on public.compromissos;
create policy comp_ins on public.compromissos for insert
  with check (minha(org_id) and (ativo() and dono_id = meu_perfil()));

drop policy if exists comp_upd on public.compromissos;
create policy comp_upd on public.compromissos for update
  using (minha(org_id) and (ativo() and (dono_id = meu_perfil() or eh_admin())))
  with check (minha(org_id) and (ativo() and (dono_id = meu_perfil() or eh_admin())));

drop policy if exists comp_del on public.compromissos;
create policy comp_del on public.compromissos for delete
  using (minha(org_id) and (ativo() and (dono_id = meu_perfil() or eh_admin())));

drop policy if exists conv_sel on public.convidados;
create policy conv_sel on public.convidados for select using (minha(org_id) and (
  ativo() and exists (
    select 1 from compromissos c
    where c.id = compromisso_id
      and (c.visivel or c.dono_id = meu_perfil() or perfil_id = meu_perfil())
  )
));

drop policy if exists conv_ins on public.convidados;
create policy conv_ins on public.convidados for insert with check (minha(org_id) and (
  ativo() and exists (select 1 from compromissos c where c.id = compromisso_id and c.dono_id = meu_perfil())
));

drop policy if exists conv_del on public.convidados;
create policy conv_del on public.convidados for delete using (minha(org_id) and (
  ativo() and exists (select 1 from compromissos c where c.id = compromisso_id and c.dono_id = meu_perfil())
));

-- agenda externa: o endereço do calendário é só de quem o cadastrou
drop policy if exists age_todo on public.agendas_externas;
create policy age_todo on public.agendas_externas for all
  using (minha(org_id) and (perfil_id = meu_perfil())) with check (minha(org_id) and (perfil_id = meu_perfil()));

-- a ocupação que veio de fora é pública para a equipe, e só o dono a atualiza
drop policy if exists oce_sel on public.ocupacao_externa;
create policy oce_sel on public.ocupacao_externa for select using (minha(org_id) and (ativo()));

drop policy if exists oce_ins on public.ocupacao_externa;
create policy oce_ins on public.ocupacao_externa for insert with check (minha(org_id) and (perfil_id = meu_perfil()));

drop policy if exists oce_del on public.ocupacao_externa;
create policy oce_del on public.ocupacao_externa for delete using (minha(org_id) and (perfil_id = meu_perfil()));

-- convidados de uma esteira: quem enxerga a esteira enxerga a lista
drop policy if exists fp_sel on public.fluxo_pessoas;
create policy fp_sel on public.fluxo_pessoas for select using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists fp_esc on public.fluxo_pessoas;
create policy fp_esc on public.fluxo_pessoas for all
  using (minha(org_id) and (ativo() and manda_no_processo(fluxo_id))) with check (minha(org_id) and (ativo() and manda_no_processo(fluxo_id)));

-- histórico e atividades
drop policy if exists historico_sel on public.historico;
create policy historico_sel on public.historico for select using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists atividades_sel on public.atividades;
create policy atividades_sel on public.atividades for select using (minha(org_id) and (ativo() and ve_fluxo(fluxo_id)));

drop policy if exists atividades_ins on public.atividades;
create policy atividades_ins on public.atividades for insert
  with check (minha(org_id) and (ativo() and ve_fluxo(fluxo_id) and quem_id = meu_perfil()));

-- Prazo é compromisso com quem espera: o executor mexe no texto da tarefa dele,
-- mas a data só muda por quem responde pelo processo.
create or replace function public.proteger_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not manda_no_processo(new.fluxo_id) then
    new.prazo := old.prazo;
    new.fluxo_id := old.fluxo_id;
    new.etapa_id := old.etapa_id;
  end if;
  -- A hora de ficar pronta é do servidor, não do navegador: se viesse de fora,
  -- bastaria mudar o relógio do computador para a entrega parecer no prazo.
  if new.feito and not old.feito then new.feito_em := now();
  elsif not new.feito and old.feito then new.feito_em := null;
  else new.feito_em := old.feito_em;
  end if;
  return new;
end $$;

-- Tarefa que já nasce marcada (importação, molde) leva a hora de agora.
create or replace function public.marcar_feito_em()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.feito_em := case when new.feito then now() else null end;
  return new;
end $$;

drop trigger if exists ao_criar_item on public.itens;
create trigger ao_criar_item
  before insert on public.itens
  for each row execute function public.marcar_feito_em();

create index if not exists itens_feito_em_idx on public.itens (feito_em desc) where feito;

drop trigger if exists ao_alterar_item on public.itens;
create trigger ao_alterar_item
  before update on public.itens
  for each row execute function public.proteger_item();

-- Ocupação da agenda de todo mundo, sem uma palavra sobre o conteúdo.
-- É assim que alguém descobre que você não está livre numa quinta às 15h sem
-- descobrir o que você vai fazer nela.
create or replace function public.ocupacao()
returns table (id uuid, perfil_id uuid, quando date, inicio time, fim time)
language sql stable security definer set search_path = public as $$
  select c.id, e.perfil_id, c.quando, c.inicio, c.fim
  from compromissos c
  cross join lateral (
    select c.dono_id as perfil_id
    union
    select cv.perfil_id from convidados cv where cv.compromisso_id = c.id
  ) e
  where c.bloqueia and e.perfil_id is not null and ativo();
$$;

-- --------------------------------------------------------------------------
-- 5. Poda automática da linha do tempo (40 registros por fluxo)
-- --------------------------------------------------------------------------

create or replace function public.podar_atividades()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from atividades a
  where a.fluxo_id = new.fluxo_id
    and a.id not in (
      select id from atividades where fluxo_id = new.fluxo_id order by criado_em desc limit 40
    );
  return null;
end $$;

drop trigger if exists ao_registrar_atividade on public.atividades;
create trigger ao_registrar_atividade
  after insert on public.atividades
  for each row execute function public.podar_atividades();

-- --------------------------------------------------------------------------
-- 6. Criar ou editar um fluxo inteiro de uma vez
--    Faz tudo numa transação só: cria os checkpoints novos, atualiza os que
--    já existiam (preservando os itens) e remove os que saíram do editor.
-- --------------------------------------------------------------------------

create or replace function public.salvar_fluxo(
  p_fluxo jsonb, p_etapas jsonb, p_como uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := quem_age(p_como);
  v_id  uuid := nullif(p_fluxo->>'id', '')::uuid;
  e     jsonb;
  k     int := 0;
  eid   uuid;
  ids   uuid[] := '{}';
begin
  -- Sem `ativo()`: quem confere é `quem_age()`, que já levanta 'Sem acesso.'
  -- e sabe responder pelos dois casos. `ativo()` pergunta pela SESSÃO, que é
  -- exatamente o que não existe quando quem chama é o servidor.
  if jsonb_array_length(p_etapas) < 1 then raise exception 'O fluxo precisa de pelo menos um checkpoint.'; end if;

  if v_id is null then
    insert into fluxos (tipo, nome, area_id, empresa_id, dono_id, autor_id, visib, freq, periodo)
    values (
      p_fluxo->>'tipo',
      btrim(p_fluxo->>'nome'),
      nullif(p_fluxo->>'area_id', '')::uuid,
      nullif(p_fluxo->>'empresa_id', '')::uuid,
      nullif(p_fluxo->>'dono_id', '')::uuid,
      uid,
      coalesce(nullif(p_fluxo->>'visib', ''), 'equipe'),
      nullif(p_fluxo->>'freq', ''),
      nullif(p_fluxo->>'periodo', '')
    )
    returning id into v_id;
    insert into atividades (fluxo_id, quem_id, texto)
    values (v_id, uid, case when p_fluxo->>'tipo' = 'ciclo' then 'criou a rotina' else 'criou o projeto' end);
  else
    if not ve_fluxo(v_id) then raise exception 'Sem acesso a esta esteira.'; end if;
    if not manda_no_processo(v_id) then
      raise exception 'Só quem responde por esta esteira pode mudar os checkpoints e os prazos.';
    end if;
    update fluxos set
      nome       = btrim(p_fluxo->>'nome'),
      area_id    = nullif(p_fluxo->>'area_id', '')::uuid,
      empresa_id = nullif(p_fluxo->>'empresa_id', '')::uuid,
      dono_id  = nullif(p_fluxo->>'dono_id', '')::uuid,
      visib    = case when autor_id = uid
                      then coalesce(nullif(p_fluxo->>'visib', ''), 'equipe')
                      else visib end,
      freq     = nullif(p_fluxo->>'freq', ''),
      periodo  = nullif(p_fluxo->>'periodo', '')
    where id = v_id;
    insert into atividades (fluxo_id, quem_id, texto) values (v_id, uid, 'editou a esteira');
  end if;

  for e in select value from jsonb_array_elements(p_etapas) loop
    if nullif(e->>'id', '') is null then
      insert into etapas (fluxo_id, ordem, nome, criterio, aprovador_id, prazo)
      values (v_id, k, btrim(e->>'nome'), coalesce(e->>'criterio', ''),
              nullif(e->>'aprovador_id', '')::uuid, nullif(e->>'prazo', '')::date)
      returning id into eid;
    else
      eid := (e->>'id')::uuid;
      update etapas set
        ordem        = k,
        nome         = btrim(e->>'nome'),
        criterio     = coalesce(e->>'criterio', ''),
        aprovador_id = nullif(e->>'aprovador_id', '')::uuid,
        prazo        = nullif(e->>'prazo', '')::date
      where id = eid and fluxo_id = v_id;
    end if;
    ids := ids || eid;
    k := k + 1;
  end loop;

  delete from etapas where fluxo_id = v_id and not (id = any(ids));
  update fluxos set atual = least(atual, k - 1) where id = v_id;
  return v_id;
end $$;

-- --------------------------------------------------------------------------
-- 6a. Salvar um processo inteiro
--     Cria ou atualiza numa transação só, casando os checkpoints e as tarefas
--     que já existiam pelo id e removendo o que saiu do editor.
-- --------------------------------------------------------------------------

create or replace function public.salvar_processo(p_processo jsonb, p_etapas jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid := nullif(p_processo->>'id', '')::uuid;
  e     jsonb;
  i     jsonb;
  k     int := 0;
  j     int;
  eid   uuid;
  iid   uuid;
  eids  uuid[] := '{}';
  iids  uuid[] := '{}';
begin
  if not (eh_admin() or exists (select 1 from perfis p where p.id = meu_perfil() and p.papel = 'gestor')) then
    raise exception 'Desenhar processo é decisão de quem responde pela operação.';
  end if;
  if jsonb_array_length(p_etapas) < 1 then
    raise exception 'O processo precisa de pelo menos um checkpoint.';
  end if;

  if v_id is null then
    insert into processos (nome, descricao, tipo, area_id, ordem)
    values (
      btrim(p_processo->>'nome'),
      coalesce(p_processo->>'descricao', ''),
      p_processo->>'tipo',
      nullif(p_processo->>'area_id', '')::uuid,
      coalesce((select max(ordem) + 1 from processos), 0)
    )
    returning id into v_id;
  else
    update processos set
      nome      = btrim(p_processo->>'nome'),
      descricao = coalesce(p_processo->>'descricao', ''),
      tipo      = p_processo->>'tipo',
      area_id   = nullif(p_processo->>'area_id', '')::uuid
    where id = v_id;
  end if;

  for e in select value from jsonb_array_elements(p_etapas) loop
    if nullif(e->>'id', '') is null then
      insert into processo_etapas (processo_id, ordem, nome, criterio, aprovador_area_id, dias)
      values (v_id, k, btrim(e->>'nome'), coalesce(e->>'criterio', ''),
              nullif(e->>'aprovador_area_id', '')::uuid, coalesce((e->>'dias')::int, 0))
      returning id into eid;
    else
      eid := (e->>'id')::uuid;
      update processo_etapas set
        ordem = k, nome = btrim(e->>'nome'), criterio = coalesce(e->>'criterio', ''),
        aprovador_area_id = nullif(e->>'aprovador_area_id', '')::uuid,
        dias = coalesce((e->>'dias')::int, 0)
      where id = eid and processo_id = v_id;
    end if;
    eids := eids || eid;

    j := 0;
    for i in select value from jsonb_array_elements(coalesce(e->'itens', '[]'::jsonb)) loop
      if nullif(i->>'id', '') is null then
        insert into processo_itens (etapa_id, processo_id, ordem, texto, area_id, dias)
        values (eid, v_id, j, btrim(i->>'texto'), nullif(i->>'area_id', '')::uuid,
                coalesce((i->>'dias')::int, 0))
        returning id into iid;
      else
        iid := (i->>'id')::uuid;
        update processo_itens set
          etapa_id = eid, ordem = j, texto = btrim(i->>'texto'),
          area_id = nullif(i->>'area_id', '')::uuid, dias = coalesce((i->>'dias')::int, 0)
        where id = iid and processo_id = v_id;
      end if;
      iids := iids || iid;
      j := j + 1;
    end loop;
    k := k + 1;
  end loop;

  delete from processo_itens  where processo_id = v_id and not (id = any(iids));
  delete from processo_etapas where processo_id = v_id and not (id = any(eids));
  return v_id;
end $$;

-- --------------------------------------------------------------------------
-- 6b. Nascer de um processo
--     Cria a esteira inteira já distribuída: cada checkpoint com o aprovador da
--     área que responde por ele, cada tarefa com a pessoa da área que executa,
--     e os prazos convertidos de "dias a partir do início" em datas.
-- --------------------------------------------------------------------------

create or replace function public.criar_do_processo(
  p_processo uuid, p_fluxo jsonb, p_pessoas jsonb, p_inicio date default current_date
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := meu_perfil();
  v_id  uuid;
  pr    processos%rowtype;
  et    processo_etapas%rowtype;
  it    processo_itens%rowtype;
  eid   uuid;
  resp  uuid;
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;

  select * into pr from processos where id = p_processo;
  if not found then raise exception 'Processo não encontrado.'; end if;
  if not exists (select 1 from processo_etapas where processo_id = pr.id) then
    raise exception 'Este processo ainda não tem checkpoints.';
  end if;

  insert into fluxos (tipo, nome, area_id, empresa_id, dono_id, autor_id, visib, freq, periodo)
  values (
    pr.tipo,
    btrim(p_fluxo->>'nome'),
    nullif(p_fluxo->>'area_id', '')::uuid,
    nullif(p_fluxo->>'empresa_id', '')::uuid,
    nullif(p_fluxo->>'dono_id', '')::uuid,
    uid,
    coalesce(nullif(p_fluxo->>'visib', ''), 'equipe'),
    nullif(p_fluxo->>'freq', ''),
    nullif(p_fluxo->>'periodo', '')
  )
  returning id into v_id;

  insert into atividades (fluxo_id, quem_id, texto)
  values (v_id, uid, 'criou a partir do processo ' || pr.nome);

  for et in select * from processo_etapas where processo_id = pr.id order by ordem loop
    -- quem aprova: a pessoa escolhida para a área do checkpoint
    resp := nullif(p_pessoas->>coalesce(et.aprovador_area_id::text, 'x'), '')::uuid;
    insert into etapas (fluxo_id, ordem, nome, criterio, aprovador_id, prazo)
    values (v_id, et.ordem, et.nome, et.criterio, coalesce(resp, uid), p_inicio + et.dias)
    returning id into eid;

    for it in select * from processo_itens where etapa_id = et.id order by ordem loop
      resp := nullif(p_pessoas->>coalesce(it.area_id::text, 'x'), '')::uuid;
      insert into itens (etapa_id, fluxo_id, texto, resp_id, prazo, autor_id, ordem)
      values (eid, v_id, it.texto, resp, p_inicio + it.dias, uid, it.ordem);
    end loop;
  end loop;

  return v_id;
end $$;

-- --------------------------------------------------------------------------
-- 7. Decidir a saída de um checkpoint
--    Só o aprovador do checkpoint decide. Três desfechos:
--
--      aprovou   segue em frente, limpo
--      ressalva  segue em frente com uma pendência anotada, que fica registrada
--                e vira tarefa do checkpoint seguinte quando se pede prazo
--      devolveu  não segue. As tarefas apontadas voltam a ficar em aberto e a
--                esteira continua parada no mesmo checkpoint
--
--    Aprovar exige o checklist completo. Devolver não exige nada, porque devolver
--    é justamente o caso em que está tudo marcado e o aprovador discorda.
--    Na última etapa de uma rotina, aprovar fecha a volta e recomeça o ciclo.
-- --------------------------------------------------------------------------

create or replace function public.decidir_etapa(
  p_fluxo    uuid,
  p_tipo     text,
  p_nota     text default '',
  p_reabrir  uuid[] default '{}',
  p_periodo  text default null,
  p_prazo    date default null,
  -- Ver a seção 35. Nasce aqui para o arquivo poder ser lido duas vezes sem
  -- criar duas versões da mesma função, que deixariam a chamada ambígua.
  p_como     uuid default null
)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid     uuid := meu_perfil();
  f       fluxos%rowtype;
  e       etapas%rowtype;
  n       int;
  passo   int;
  atrasou boolean;
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;

  select * into f from fluxos where id = p_fluxo for update;
  if not found then raise exception 'Fluxo não encontrado.'; end if;
  if not ve_fluxo(f.id) then raise exception 'Sem acesso a esta esteira.'; end if;
  if f.concluido then raise exception 'Este projeto já está concluído.'; end if;
  if f.travado_motivo is not null then raise exception 'O fluxo está travado. Destrave para seguir.'; end if;

  select * into e from etapas where fluxo_id = f.id and ordem = f.atual;
  if not found then raise exception 'Checkpoint não encontrado.'; end if;
  if e.aprovador_id is distinct from uid then raise exception 'Somente o aprovador deste checkpoint pode decidir a saída.'; end if;
  if p_tipo not in ('aprovou','ressalva','devolveu') then raise exception 'Decisão desconhecida.'; end if;
  if p_tipo <> 'aprovou' and btrim(coalesce(p_nota, '')) = '' then
    raise exception 'Escreva o motivo: quem recebe precisa saber o que fazer.';
  end if;

  -- Devolver para em cima do mesmo checkpoint e reabre o que o aprovador apontou.
  if p_tipo = 'devolveu' then
    update itens set feito = false
    where etapa_id = e.id and id = any(coalesce(p_reabrir, '{}'::uuid[]));

    insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
    values (f.id, e.id, uid, 'devolveu', btrim(p_nota));

    insert into atividades (fluxo_id, quem_id, texto)
    values (f.id, uid, 'devolveu ' || e.nome || ': ' || btrim(p_nota));
    return 'devolveu';
  end if;

  if exists (
    select 1 from itens i
    where i.etapa_id = e.id and not i.feito and (not i.priv or i.autor_id = uid)
  ) then raise exception 'Ainda existem itens pendentes neste checkpoint.'; end if;

  select count(*) into n from etapas where fluxo_id = f.id;

  insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
  values (f.id, e.id, uid, p_tipo, btrim(coalesce(p_nota, '')));

  insert into atividades (fluxo_id, quem_id, texto)
  values (f.id, uid, case when p_tipo = 'ressalva'
    then 'aprovou ' || e.nome || ' com ressalva: ' || btrim(p_nota)
    else 'aprovou a saída de ' || e.nome end);

  -- A ressalva vira tarefa do checkpoint seguinte, senão ela morre na linha do
  -- tempo e a pendência que justificou a ressalva não é cobrada de ninguém.
  if p_tipo = 'ressalva' and f.atual < n - 1 then
    insert into itens (etapa_id, fluxo_id, texto, resp_id, prazo, autor_id, ordem)
    select et.id, f.id, 'Ressalva: ' || btrim(p_nota), f.dono_id, p_prazo, uid,
           coalesce((select max(i.ordem) + 1 from itens i where i.etapa_id = et.id), 0)
    from etapas et where et.fluxo_id = f.id and et.ordem = f.atual + 1;
  end if;

  if f.atual < n - 1 then
    update fluxos set atual = f.atual + 1 where id = f.id;
    return 'avancou';
  end if;

  if f.tipo = 'ciclo' then
    passo := case f.freq when 'semanal' then 7 when 'quinzenal' then 15 else 30 end;
    select exists (
      select 1 from etapas et where et.fluxo_id = f.id and et.prazo is not null and et.prazo < current_date
      union all
      select 1 from itens it where it.fluxo_id = f.id and it.prazo is not null and it.prazo < current_date
    ) into atrasou;

    insert into historico (fluxo_id, periodo, situacao)
    values (f.id, coalesce(f.periodo, ''), case when atrasou then 'late' else 'ok' end);

    delete from historico h
    where h.fluxo_id = f.id
      and h.id not in (select id from historico where fluxo_id = f.id order by criado_em desc limit 12);

    update etapas set prazo = prazo + passo where fluxo_id = f.id and prazo is not null;
    update itens  set feito = false, prazo = prazo + passo where fluxo_id = f.id and prazo is not null;
    update itens  set feito = false where fluxo_id = f.id and prazo is null;
    update fluxos set atual = 0, periodo = coalesce(nullif(btrim(p_periodo), ''), periodo) where id = f.id;
    return 'volta';
  end if;

  -- Concluir arquiva: a track sai da lista principal e continua inteira em
  -- Arquivadas, que é onde ficam os documentos e o histórico dela. Seção 21.
  update fluxos set concluido = true, desfecho = 'concluido', arquivado_em = now()
  where id = f.id;
  return 'concluido';
end $$;

-- O nome antigo continua valendo: chamadas de fora e bancos já publicados não
-- precisam saber que a aprovação virou decisão.
create or replace function public.aprovar_etapa(p_fluxo uuid, p_periodo text default null)
returns text language sql security definer set search_path = public as $$
  select public.decidir_etapa(p_fluxo, 'aprovou', '', '{}'::uuid[], p_periodo, null);
$$;

-- --------------------------------------------------------------------------
-- 7b. Quando um prazo anda, o que depende dele anda junto (mas com aceite)
--
--     Três regras, e elas existem por causa de uma situação concreta: nem todo
--     prazo pode andar. Tem data de cliente, prazo legal, evento marcado.
--
--     1. Só anda o que quebrou. Se a tarefa de baixo tem folga que absorve o
--        atraso, ela fica onde está. Mexer no que não precisa seria barulho.
--     2. Data firme não anda, nunca. Ela aparece no aviso como conflito, e
--        alguém tem que dar um jeito de a coisa acontecer do mesmo jeito.
--     3. O que é de outra esteira não anda sozinho: vira pedido, e quem responde
--        por aquela esteira aceita ou recusa. Prazo é compromisso com quem
--        espera, e ninguém remarca o compromisso de outra pessoa.
--
--     O que decide entre mexer e pedir é a ESTEIRA, não o cargo. Dentro da sua
--     esteira você remarca, porque você responde por ela inteira. Fora dela é
--     pedido, inclusive para o administrador: ele pode tudo, e é exatamente por
--     isso que o aceite existe, senão a cascata passaria por cima de uma data
--     que alguém prometeu para um cliente sem ninguém olhar.
-- --------------------------------------------------------------------------

/**
 * O que andaria se o prazo desta tarefa passasse a ser p_novo.
 *
 * Só leitura. É isto que a tela mostra ANTES de qualquer coisa acontecer, porque
 * quem vai mexer precisa ver o estrago antes de causá-lo.
 */
create or replace function public.cascata(p_item uuid, p_novo date)
returns table (
  item_id uuid, fluxo_id uuid, fluxo text, texto text,
  de date, para date, firme boolean, meu boolean, resp_id uuid, nivel int
)
language sql stable security definer set search_path = public as $$
  with recursive anda as (
    select i.id, i.fluxo_id, i.texto, i.prazo as de, p_novo as para,
           i.prazo_firme as firme, i.resp_id, 0 as nivel
    from itens i
    where i.id = p_item and minha(i.org_id)

    union all

    -- Uma tarefa não pode vencer antes da que a trava. Quando quebra, ela anda
    -- guardando a folga que tinha, que é o tempo de trabalho dela.
    select b.id, b.fluxo_id, b.texto, b.prazo,
           (a.para + greatest(0, b.prazo - a.de))::date,
           b.prazo_firme, b.resp_id, a.nivel + 1
    from anda a
    join dependencias d on d.depende_de = a.id
    join itens b on b.id = d.item_id and minha(b.org_id)
    where not a.firme            -- firme não anda, então não empurra ninguém
      and not b.feito
      and b.prazo is not null
      and a.de is not null
      and b.prazo < a.para
      and a.nivel < 20           -- rede contra dependência circular
  )
  select a.id, a.fluxo_id, f.nome, a.texto, a.de, a.para, a.firme,
         -- "meu" é estar na mesma esteira da tarefa que mudou, e não ter cargo.
         a.fluxo_id = (select i.fluxo_id from itens i where i.id = p_item),
         a.resp_id, a.nivel
  from anda a join fluxos f on f.id = a.fluxo_id
  where ve_item(a.id)
  order by a.nivel, a.para;
$$;

/**
 * Aplica o que dá para aplicar e pede o resto.
 *
 * Devolve um resumo do que aconteceu, para a tela poder contar em uma frase.
 */
create or replace function public.aplicar_cascata(
  p_item uuid, p_novo date, p_motivo text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid     uuid := meu_perfil();
  raiz    itens%rowtype;
  linha   record;
  n_mexi  int := 0;
  n_pedi  int := 0;
  n_presa int := 0;
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;

  select * into raiz from itens where id = p_item;
  if not found then raise exception 'Tarefa não encontrada.'; end if;
  if not manda_no_processo(raiz.fluxo_id) then
    raise exception 'Só quem responde por esta esteira pode mexer no prazo.';
  end if;
  if raiz.prazo_firme then
    raise exception 'Esta data é firme. Para mudá-la, tire a marca de data firme primeiro.';
  end if;

  for linha in select * from cascata(p_item, p_novo) loop
    if linha.nivel = 0 then
      update itens set prazo = p_novo where id = linha.item_id;
      continue;
    end if;

    if linha.firme then
      n_presa := n_presa + 1;          -- não se mexe, e a tela avisa
    elsif linha.meu then
      update itens set prazo = linha.para where id = linha.item_id;
      n_mexi := n_mexi + 1;
    else
      -- Um pedido aberto por tarefa: o novo substitui o que estava esperando.
      delete from pedidos_prazo where item_id = linha.item_id and estado = 'aberto';
      insert into pedidos_prazo (item_id, fluxo_id, de, para, motivo, origem_id, pedido_por)
      values (linha.item_id, linha.fluxo_id, linha.de, linha.para,
              btrim(coalesce(p_motivo, '')), p_item, uid);
      n_pedi := n_pedi + 1;
    end if;
  end loop;

  insert into atividades (fluxo_id, quem_id, texto)
  values (raiz.fluxo_id, uid,
    'mudou o prazo de ' || raiz.texto || ' para ' || to_char(p_novo, 'DD/MM')
    || case when n_mexi + n_pedi + n_presa > 0
       then ', e ' || (n_mexi + n_pedi + n_presa) || ' tarefa(s) sentiram' else '' end);

  return jsonb_build_object('mexi', n_mexi, 'pedi', n_pedi, 'presas', n_presa);
end $$;

/**
 * Aceitar ou recusar um pedido de prazo.
 *
 * Decide quem responde pela esteira da tarefa que ia se mexer, e nunca quem
 * pediu: senão bastaria pedir para si mesmo e o aceite não valeria nada.
 *
 * Recusar derruba os pedidos que nasceram deste, porque eles foram calculados
 * supondo que este andaria. Deixá-los de pé seria propor data que não fecha.
 */
create or replace function public.decidir_prazo(p_pedido uuid, p_aceita boolean, p_como uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := meu_perfil();
  pd  pedidos_prazo%rowtype;
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;

  select * into pd from pedidos_prazo where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if pd.estado <> 'aberto' then raise exception 'Este pedido já foi decidido.'; end if;
  if not manda_no_processo(pd.fluxo_id) then
    raise exception 'Só quem responde por esta esteira decide o prazo dela.';
  end if;
  -- Quem pediu pode aceitar quando responde pelas duas esteiras, e isso é de
  -- propósito: o que o aceite garante não é que outra pessoa olhe, é que alguém
  -- olhe e diga sim de novo, num ato separado. Sem isso a cascata voltaria a ser
  -- automática justamente para quem tem mais poder de estragar.

  if p_aceita then
    update itens set prazo = pd.para where id = pd.item_id and not prazo_firme;
    update pedidos_prazo set estado = 'aceito', decidido_por = uid, decidido_em = now()
    where id = pd.id;
    insert into atividades (fluxo_id, quem_id, texto)
    select pd.fluxo_id, uid, 'aceitou mover ' || i.texto || ' para ' || to_char(pd.para, 'DD/MM')
    from itens i where i.id = pd.item_id;
    return 'aceito';
  end if;

  update pedidos_prazo set estado = 'recusado', decidido_por = uid, decidido_em = now()
  where id = pd.id;

  -- Em cadeia: o que nasceu deste pedido não faz mais sentido.
  with recursive queda as (
    select id, item_id from pedidos_prazo where origem_id = pd.item_id and estado = 'aberto'
    union all
    select p.id, p.item_id from pedidos_prazo p
    join queda q on p.origem_id = q.item_id
    where p.estado = 'aberto'
  )
  update pedidos_prazo set estado = 'recusado', decidido_por = uid, decidido_em = now(),
    motivo = motivo || ' (caiu junto: o pedido que veio antes foi recusado)'
  where id in (select id from queda);

  insert into atividades (fluxo_id, quem_id, texto)
  select pd.fluxo_id, uid, 'recusou mover ' || i.texto || ': a data fica onde está'
  from itens i where i.id = pd.item_id;
  return 'recusado';
end $$;

-- --------------------------------------------------------------------------
-- 7c. O medidor e o teto
--
--     Duas coisas, e as duas rodam no servidor de propósito. Teto conferido no
--     navegador não é teto: bastaria abrir as ferramentas do navegador para
--     passar por cima. Aqui quem confere é o banco, e quem grava é o banco.
-- --------------------------------------------------------------------------

/** Quantas leituras com modelo esta empresa já fez no mês corrente. */
create or replace function public.leituras_do_mes()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int
  from consumo
  where minha(org_id) and onde = 'leitor'
    and criado_em >= date_trunc('month', now());
$$;

/** O gasto do mês em milionésimos de dólar. */
create or replace function public.gasto_do_mes()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(custo_micro), 0)::bigint
  from consumo
  where minha(org_id) and criado_em >= date_trunc('month', now());
$$;

/**
 * Esta empresa pode chamar o modelo agora?
 *
 * Não podendo, a leitura cai nas regras embutidas e o app segue funcionando. É
 * por isso que o teto é seguro de ligar: ele corta o gasto, não o produto.
 */
create or replace function public.pode_chamar_modelo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o.ia_ativa and (o.limite_leituras is null or leituras_do_mes() < o.limite_leituras)
       from organizacoes o where o.id = minha_org()),
    false);
$$;

/** O modelo desta empresa, ou vazio para o servidor escolher. */
create or replace function public.modelo_da_org()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(btrim(o.modelo_ia), '') from organizacoes o where o.id = minha_org()), '');
$$;

/**
 * Grava uma chamada paga. Só por aqui: a tabela não aceita escrita direta.
 *
 * O custo vem calculado de fora porque a tabela de preços mora no código do
 * servidor, junto de quem sabe qual modelo foi chamado de verdade.
 */
create or replace function public.registrar_consumo(
  p_onde text, p_modelo text,
  p_entrada int, p_saida int, p_cache_leitura int, p_cache_escrita int,
  p_custo_micro bigint, p_canal uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;
  insert into consumo (
    org_id, onde, modelo, entrada, saida, cache_leitura, cache_escrita,
    custo_micro, perfil_id, canal_id
  ) values (
    minha_org(), coalesce(nullif(btrim(p_onde), ''), 'leitor'), p_modelo,
    greatest(0, coalesce(p_entrada, 0)), greatest(0, coalesce(p_saida, 0)),
    greatest(0, coalesce(p_cache_leitura, 0)), greatest(0, coalesce(p_cache_escrita, 0)),
    greatest(0, coalesce(p_custo_micro, 0)), meu_perfil(), p_canal
  );
end $$;

-- --------------------------------------------------------------------------
-- 8. Conserta bancos criados por uma versão anterior deste arquivo
-- --------------------------------------------------------------------------

do $$
begin
  alter table public.fluxos alter column area_id drop not null;
exception when others then null;
end $$;

-- Bancos anteriores à coluna feito_em: ela entra vazia, e o que já estava
-- pronto fica sem data. Preencher com um palpite seria pior do que não ter.
alter table public.itens add column if not exists feito_em timestamptz;
alter table public.itens add column if not exists prazo_firme boolean not null default false;
do $$ begin
  alter table public.agentes drop constraint if exists agentes_faz_check;
  alter table public.agentes add constraint agentes_faz_check
    check (faz in ('processo','tarefa','webhook','conector'));
  alter table public.conectores add column if not exists dono_id uuid references public.perfis on delete cascade;
  -- O pulso, para bancos criados antes dele.
  alter table public.organizacoes add column if not exists leitura_por_dia int not null default 3;
  alter table public.organizacoes add column if not exists leitura_janela text not null default '08:00-19:00';
  alter table public.organizacoes add column if not exists fuso text not null default 'America/Sao_Paulo';
  alter table public.organizacoes add column if not exists pulso_em timestamptz;
  alter table public.canais add column if not exists lido_pela_ia_em timestamptz;
  -- O tipo pessoal de canal é novo: a restrição antiga não conhece ele.
  if exists (select 1 from pg_constraint where conname = 'canais_tipo_check') then
    alter table public.canais drop constraint canais_tipo_check;
  end if;
  alter table public.canais add constraint canais_tipo_check
    check (tipo in ('aberto','fechado','direto','pessoal'));
  alter table public.agentes add column if not exists conector_id uuid references public.conectores on delete set null;
  alter table public.agentes add column if not exists caminho text not null default '';
  alter table public.agentes add column if not exists corpo text not null default '';
exception when others then null;
end $$;

-- A autoria da leitura. Bancos anteriores tinham tudo no nome de quem mandou ler.
alter table public.atividades add column if not exists por_ia boolean not null default false;
alter table public.mensagens  add column if not exists por_ia boolean not null default false;
alter table public.mensagens  add column if not exists audio_caminho text;
alter table public.mensagens  add column if not exists audio_segundos int;
alter table public.mensagens  add column if not exists transcrito boolean not null default false;
alter table public.sugestoes  add column if not exists por_ia boolean not null default false;
alter table public.sugestoes  add column if not exists desfeita_em timestamptz;
alter table public.sugestoes  add column if not exists desfeita_por uuid references public.perfis on delete set null;
do $$ begin
  alter table public.sugestoes drop constraint if exists sugestoes_tipo_check;
  alter table public.sugestoes add constraint sugestoes_tipo_check
    check (tipo in ('tarefa','prazo','concluir','decisao','trava','distribuir','agente','nota','compromisso'));
exception when others then null;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'fluxos' and c.conname = 'fluxos_area_id_fkey' and c.confdeltype = 'c'
  ) then
    alter table public.fluxos drop constraint fluxos_area_id_fkey;
    alter table public.fluxos add constraint fluxos_area_id_fkey
      foreign key (area_id) references public.areas on delete restrict;
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 9. Tempo real: a tela de todo mundo se atualiza sozinha
-- --------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'perfis','areas','fluxos','etapas','itens','historico','atividades',
    'anexos','decisoes','pedidos_prazo','memoria','consumo','agentes','conectores','notas'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 10. Conversa: quem lê, quem escreve
--     A regra é a mesma do resto do app: o banco decide, a tela só obedece.
-- --------------------------------------------------------------------------

-- Em função à parte para a política de canal_membros não consultar a própria
-- tabela e entrar em recursão.
create or replace function public.sou_membro(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from canal_membros m where m.canal_id = c and m.perfil_id = meu_perfil()
      and minha(m.org_id)
  );
$$;

-- Uma política que consulta canais cai na RLS de canais, e aí quem acabou de
-- criar um canal fechado não consegue entrar no próprio canal. Por isso estas
-- duas perguntas também são feitas por fora, em security definer.
create or replace function public.dono_canal(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from canais k where k.id = c and k.criado_por = meu_perfil() and minha(k.org_id));
$$;

create or replace function public.canal_aberto(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from canais k where k.id = c and k.tipo = 'aberto' and minha(k.org_id));
$$;

-- Canal aberto é de todos, menos quando pendurado num projeto: aí vale quem
-- enxerga o projeto. Canal fechado e conversa direta são só de quem está dentro.
create or replace function public.ve_canal(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from canais k
    where k.id = c
      and minha(k.org_id)
      and (
        (k.tipo = 'aberto' and ativo() and (k.fluxo_id is null or ve_fluxo(k.fluxo_id)))
        or sou_membro(k.id)
        -- Quem abriu o canal enxerga o canal, membro ou não. A entrada de
        -- membro é gravada logo DEPOIS da linha do canal, então sem esta
        -- condição criar um canal fechado era impossível: o banco aceitava a
        -- escrita e recusava a leitura da linha recém-criada, com a mesma
        -- mensagem de política violada.
        or k.criado_por = meu_perfil()
      )
  );
$$;

alter table public.canais        enable row level security;
alter table public.canal_membros enable row level security;
alter table public.mensagens     enable row level security;
alter table public.sugestoes     enable row level security;

-- canais
drop policy if exists canais_sel on public.canais;
create policy canais_sel on public.canais for select using (minha(org_id) and (ve_canal(id)));

drop policy if exists canais_ins on public.canais;
create policy canais_ins on public.canais for insert
  with check (minha(org_id) and (ativo() and criado_por = meu_perfil()));

drop policy if exists canais_upd on public.canais;
create policy canais_upd on public.canais for update
  using (minha(org_id) and (criado_por = meu_perfil() or (eh_admin() and tipo = 'aberto')))
  with check (minha(org_id) and (criado_por = meu_perfil() or (eh_admin() and tipo = 'aberto')));

drop policy if exists canais_del on public.canais;
create policy canais_del on public.canais for delete
  using (minha(org_id) and (criado_por = meu_perfil() or (eh_admin() and tipo = 'aberto')));

-- canal_membros
drop policy if exists cm_sel on public.canal_membros;
create policy cm_sel on public.canal_membros for select using (minha(org_id) and (ve_canal(canal_id)));

-- Num canal aberto você se põe dentro sozinho, e a linha serve só de marca de
-- leitura. Num canal fechado, quem já está dentro é que traz mais alguém.
drop policy if exists cm_ins on public.canal_membros;
create policy cm_ins on public.canal_membros for insert with check (minha(org_id) and (
  ativo() and (
    (perfil_id = meu_perfil() and canal_aberto(canal_id))
    or sou_membro(canal_id)
    or dono_canal(canal_id)
  )
));

drop policy if exists cm_upd on public.canal_membros;
create policy cm_upd on public.canal_membros for update
  using (minha(org_id) and (perfil_id = meu_perfil())) with check (minha(org_id) and (perfil_id = meu_perfil()));

drop policy if exists cm_del on public.canal_membros;
create policy cm_del on public.canal_membros for delete using (minha(org_id) and (
  perfil_id = meu_perfil() or dono_canal(canal_id)
));

-- mensagens
drop policy if exists msg_sel on public.mensagens;
create policy msg_sel on public.mensagens for select using (minha(org_id) and (ve_canal(canal_id)));

drop policy if exists msg_ins on public.mensagens;
create policy msg_ins on public.mensagens for insert
  with check (minha(org_id) and (ve_canal(canal_id) and autor_id = meu_perfil()));

-- Editar e apagar é só de quem escreveu. Chefe apagar mensagem dos outros
-- transformaria o registro da conversa em algo que ninguém confia.
drop policy if exists msg_upd on public.mensagens;
create policy msg_upd on public.mensagens for update
  using (minha(org_id) and (autor_id = meu_perfil())) with check (minha(org_id) and (autor_id = meu_perfil()));

drop policy if exists msg_del on public.mensagens;
create policy msg_del on public.mensagens for delete using (minha(org_id) and (autor_id = meu_perfil()));

-- sugestões: a proposta é só um bilhete. O que ela muda passa pelas regras
-- normais do app, então aceitar um prazo sem poder mexer em prazo não funciona.
drop policy if exists sug_sel on public.sugestoes;
create policy sug_sel on public.sugestoes for select using (minha(org_id) and (ve_canal(canal_id)));

drop policy if exists sug_ins on public.sugestoes;
create policy sug_ins on public.sugestoes for insert with check (minha(org_id) and (ve_canal(canal_id)));

drop policy if exists sug_upd on public.sugestoes;
create policy sug_upd on public.sugestoes for update
  using (minha(org_id) and (ve_canal(canal_id))) with check (minha(org_id) and (ve_canal(canal_id)));

drop policy if exists sug_del on public.sugestoes;
create policy sug_del on public.sugestoes for delete using (minha(org_id) and (ve_canal(canal_id)));

-- Quem escreve num canal passa a ser membro dele, para a marca de leitura
-- existir sem depender de a tela lembrar de criá-la.
create or replace function public.ao_escrever()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into canal_membros (canal_id, perfil_id, lido_em)
  values (new.canal_id, new.autor_id, now())
  on conflict (canal_id, perfil_id) do update set lido_em = now();
  return new;
end $$;

drop trigger if exists ao_escrever_mensagem on public.mensagens;
create trigger ao_escrever_mensagem
  after insert on public.mensagens
  for each row when (new.autor_id is not null)
  execute function public.ao_escrever();

do $$
declare t text;
begin
  foreach t in array array['canais','canal_membros','mensagens','sugestoes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 10b. Onde os anexos moram de verdade
--
--      A tabela anexos guarda o endereço. O arquivo em si fica no Storage, num
--      balde fechado: nada é público, e cada leitura passa por uma URL assinada
--      que vale poucos minutos.
--
--      A regra é a mesma do resto do app, dita de outro jeito: o arquivo se abre
--      exatamente quando a tarefa dele se abre. Quem não pode ver a tarefa recebe
--      404, mesmo sabendo o endereço exato.
--
--      O caminho começa pelo id da organização. É isso que deixa a política
--      barrar, já no envio, quem tentar escrever na pasta de outra empresa.
--
--      Este bloco não roda num Postgres comum, porque lá não existe o esquema
--      storage. Ele se pula sozinho, para o arquivo continuar podendo ser
--      conferido numa máquina local antes de subir.
-- --------------------------------------------------------------------------

create or replace function public.posso_ver_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  -- Prova de tarefa: abre quando a tarefa abre.
  select exists (
    select 1 from anexos a
    where a.caminho = p_caminho and minha(a.org_id) and ve_item(a.item_id)
  )
  -- Recado de voz: abre quando o canal abre. Canal fechado continua fechado, e
  -- é por isso que a conta passa por ve_canal e não pelo caminho do arquivo.
  or exists (
    select 1 from mensagens m
    where m.audio_caminho = p_caminho and minha(m.org_id) and ve_canal(m.canal_id)
  );
$$;

create or replace function public.posso_apagar_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  -- Com linha: manda a regra da linha. Sem linha (arquivo órfão, de um envio que
  -- falhou no meio), basta ser da sua organização, para dar para limpar.
  select coalesce(
    (select minha(a.org_id) and (a.autor_id = meu_perfil() or manda_no_processo(a.fluxo_id))
       from anexos a where a.caminho = p_caminho),
    -- Recado de voz: apaga quem escreveu, igual à mensagem de texto.
    (select minha(m.org_id) and m.autor_id = meu_perfil()
       from mensagens m where m.audio_caminho = p_caminho),
    split_part(p_caminho, '/', 1) = minha_org()::text
  );
$$;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Storage não existe neste banco. Políticas de anexo puladas.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit)
  values ('anexos', 'anexos', false, 10485760)
  on conflict (id) do update set public = false, file_size_limit = 10485760;

  execute 'drop policy if exists anexo_ler on storage.objects';
  execute $p$create policy anexo_ler on storage.objects for select
    using (bucket_id = 'anexos' and public.posso_ver_anexo(name))$p$;

  execute 'drop policy if exists anexo_enviar on storage.objects';
  execute $p$create policy anexo_enviar on storage.objects for insert
    with check (
      bucket_id = 'anexos'
      and public.ativo()
      and split_part(name, '/', 1) = public.minha_org()::text
    )$p$;

  execute 'drop policy if exists anexo_apagar on storage.objects';
  execute $p$create policy anexo_apagar on storage.objects for delete
    using (bucket_id = 'anexos' and public.ativo() and public.posso_apagar_anexo(name))$p$;
end $$;

-- --------------------------------------------------------------------------
-- 11. Vistoria da parede
--
--     Uma parede entre empresas clientes só vale se for inteira. Basta uma
--     política sem a condição da organização para uma empresa enxergar o dado
--     da outra, e isso não é um defeito que se corrige depois: é o fim do
--     produto. Por isso a conferência não depende da memória de quem escreveu.
--
--     Rodar a qualquer momento:  select * from public.furos_na_parede();
--     O fim deste arquivo roda sozinho e recusa subir se encontrar furo.
-- --------------------------------------------------------------------------

create or replace function public.furos_na_parede()
returns table (onde text, problema text)
language sql stable set search_path = public as $$
  with alvo as (
    select unnest(array[
      'perfis','empresas','areas','convites',
      'processos','processo_etapas','processo_itens',
      'fluxos','fluxo_pessoas','etapas','itens','dependencias','historico','atividades',
      'compromissos','convidados','agendas_externas','ocupacao_externa',
      'canais','canal_membros','mensagens','sugestoes',
      'anexos','decisoes','pedidos_prazo','memoria','consumo','agentes','conectores','notas'
    ]) as t
  )
  -- 1. Tabela sem a etiqueta da organização
  select a.t, 'sem a coluna org_id'
  from alvo a
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = a.t and c.column_name = 'org_id'
  )

  union all
  -- 2. Tabela com a porta destrancada
  select a.t, 'RLS desligada'
  from alvo a
  join pg_class k on k.relname = a.t and k.relnamespace = 'public'::regnamespace
  where not k.relrowsecurity

  union all
  -- 3. Tabela onde a etiqueta não é carimbada pelo servidor
  select a.t, 'sem o gatilho ao_inserir_org'
  from alvo a
  where a.t <> 'perfis'
  and not exists (
    select 1 from pg_trigger g
    join pg_class k on k.oid = g.tgrelid
    where k.relname = a.t and g.tgname = 'ao_inserir_org' and not g.tgisinternal
  )

  union all
  -- 4. Tabela sem política nenhuma de leitura: ninguém lê, o que também é erro
  select a.t, 'sem política de select'
  from alvo a
  where not exists (
    select 1 from pg_policies pp
    where pp.schemaname = 'public' and pp.tablename = a.t and pp.cmd in ('SELECT','ALL')
  )

  union all
  -- 5. O furo que importa: política que esqueceu a condição da organização
  select pp.tablename || '.' || pp.policyname, 'leitura sem a condição da organização'
  from pg_policies pp
  join alvo a on a.t = pp.tablename
  where pp.qual is not null and pp.qual not like '%minha(org_id)%'

  union all
  select pp.tablename || '.' || pp.policyname, 'escrita sem a condição da organização'
  from pg_policies pp
  join alvo a on a.t = pp.tablename
  where pp.with_check is not null and pp.with_check not like '%minha(org_id)%';
$$;

do $$
declare n int; lista text;
begin
  select count(*), string_agg(onde || ': ' || problema, E'\n  ')
    into n, lista from public.furos_na_parede();
  if n > 0 then
    raise exception E'A parede entre organizações tem % furo(s), e este arquivo não sobe assim:\n  %', n, lista;
  end if;
  raise notice 'Vistoria da parede: nenhum furo.';
end $$;

-- --------------------------------------------------------------------------
-- 12. Espaços: um login, vários Tracks
--
--     A mesma pessoa pode ter o Track dela e o da empresa onde trabalha. São
--     perfis diferentes do mesmo login, e trocar de espaço é trocar de perfil.
--     Nada atravessa: cada espaço continua sendo uma organização, com a parede
--     inteira da seção 11 valendo entre eles.
-- --------------------------------------------------------------------------

alter table public.sessoes enable row level security;

drop policy if exists sessoes_sel on public.sessoes;
create policy sessoes_sel on public.sessoes for select using (user_id = auth.uid());

drop policy if exists sessoes_esc on public.sessoes;
create policy sessoes_esc on public.sessoes for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- Só dá para escolher um perfil que é seu. Sem isto, bastaria chutar o id
    -- de um perfil alheio para entrar no espaço de outra empresa.
    and exists (select 1 from perfis p where p.id = perfil_id and p.user_id = auth.uid())
  );

create index if not exists sessoes_perfil_idx on public.sessoes (perfil_id);

-- Os espaços a que este login pertence, para o seletor no alto da lateral.
create or replace function public.meus_espacos()
returns table (perfil_id uuid, org_id uuid, nome text, tipo text, papel text, ativo boolean, atual boolean)
language sql stable security definer set search_path = public as $$
  select p.id, o.id, o.nome, o.tipo, p.papel, p.ativo, p.id = meu_perfil()
  from perfis p join organizacoes o on o.id = p.org_id
  where p.user_id = auth.uid()
  order by o.tipo desc, o.nome;
$$;

-- Trocar de espaço. Recusa o perfil que não é seu, e é a única porta para isso.
create or replace function public.trocar_espaco(p_perfil uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfis p where p.id = p_perfil and p.user_id = auth.uid()) then
    raise exception 'Este espaço não é seu.';
  end if;
  insert into sessoes (user_id, perfil_id) values (auth.uid(), p_perfil)
  on conflict (user_id) do update set perfil_id = excluded.perfil_id, trocado_em = now();
  return p_perfil;
end $$;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.sessoes';
  exception when duplicate_object then null;
  end;
end $$;

-- Abrir mais uma empresa sem sair da conta. Nasce vazia, e quem abre é a dona.
-- É o caminho do grupo e da holding: o mesmo login responde por mais de uma
-- empresa e troca entre elas pelo seletor no alto da lateral.
create or replace function public.abrir_espaco(p_nome text, p_tipo text default 'equipe')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_perfil uuid; u uuid := auth.uid(); v_email text; v_nome text;
begin
  if u is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if btrim(coalesce(p_nome, '')) = '' then raise exception 'Dê um nome ao espaço.'; end if;
  if p_tipo not in ('pessoal','equipe') then raise exception 'Tipo de espaço inválido.'; end if;

  select email, nome into v_email, v_nome from perfis
  where user_id = u order by criado_em, id limit 1;

  insert into organizacoes (nome, tipo) values (btrim(p_nome), p_tipo) returning id into v_org;
  insert into perfis (user_id, org_id, nome, email, papel, ve_area, ativo)
  values (u, v_org, coalesce(v_nome, split_part(coalesce(v_email,''), '@', 1)),
          coalesce(v_email, ''), 'admin', true, true)
  returning id into v_perfil;
  update organizacoes set dono_id = v_perfil where id = v_org;

  insert into sessoes (user_id, perfil_id) values (u, v_perfil)
  on conflict (user_id) do update set perfil_id = excluded.perfil_id, trocado_em = now();
  return v_perfil;
end $$;

-- Entrar em mais um espaço com um código de convite, já logado.
create or replace function public.entrar_com_convite(p_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cv convites%rowtype; v_perfil uuid; u uuid := auth.uid(); v_email text; v_nome text;
begin
  if u is null then raise exception 'Entre na sua conta primeiro.'; end if;
  select * into cv from convites
  where usado_em is null and (vence_em is null or vence_em > now())
    and codigo = upper(btrim(coalesce(p_codigo, '')));
  if cv.id is null then raise exception 'Código inválido ou vencido.'; end if;
  if exists (select 1 from perfis where user_id = u and org_id = cv.org_id) then
    raise exception 'Você já faz parte deste espaço.';
  end if;

  select email, nome into v_email, v_nome from perfis
  where user_id = u order by criado_em, id limit 1;

  insert into perfis (user_id, org_id, nome, email, papel, area_id, gestor_id, ve_area, ativo)
  values (u, cv.org_id, coalesce(nullif(btrim(cv.nome),''), v_nome), coalesce(v_email,''),
          coalesce(cv.papel,'colaborador'), cv.area_id, cv.gestor_id,
          coalesce(cv.ve_area,false), true)
  returning id into v_perfil;

  update convites set usado_em = now(), usado_por = v_perfil where id = cv.id;
  insert into sessoes (user_id, perfil_id) values (u, v_perfil)
  on conflict (user_id) do update set perfil_id = excluded.perfil_id, trocado_em = now();
  return v_perfil;
end $$;

-- --------------------------------------------------------------------------
-- 13. Sair do cadastro por domínio
--
--     Enquanto o domínio colocava gente dentro de empresa, duas sujeiras
--     ficaram guardadas: organizações segurando um domínio que não pode mais
--     reservar nada, e gente parada esperando liberação de uma empresa em que
--     caiu sem escolher. Este bloco limpa as duas, e roda quantas vezes for.
--
--     Repare que ele não desliga trigger nenhum, de propósito. O caminho óbvio
--     seria desligar `ao_alterar_perfil`, porque ele recusa mudança de papel e
--     de ativo quando quem manda não é administrador, e no SQL Editor não há
--     ninguém logado. Só que `alter table ... disable trigger` exige ser dono da
--     tabela, e nem todo projeto do Supabase dá isso ao papel que roda o editor.
--     Em vez de brigar com a proteção, este bloco usa a regra que ela já tem:
--     quem é `dono_id` da organização é forçado a admin e ativo pelo próprio
--     trigger. Então basta apontar a titularidade e encostar na linha.
-- --------------------------------------------------------------------------

-- 1. Nenhum domínio reserva empresa. A coluna fica, porque ainda identifica a
--    casa na hora de convidar, mas para de abrir porta sozinha.
update public.organizacoes
   set dominio = null, entrada_por_dominio = false
 where dominio is not null or entrada_por_dominio;

-- 2. Empresa sem nenhum administrador ativo é empresa sem saída: ninguém libera
--    ninguém e ninguém convida ninguém. O perfil mais antigo dela vira o dono.
update public.organizacoes o
   set dono_id = (
     select p.id from public.perfis p
      where p.org_id = o.id order by p.criado_em, p.id limit 1
   )
 where not exists (
         select 1 from public.perfis p
          where p.org_id = o.id and p.ativo and p.papel = 'admin'
       )
   and exists (select 1 from public.perfis p where p.org_id = o.id);

-- 3. Encostar na linha do dono basta: ao_alterar_perfil vê que ela é a titular
--    da organização e força papel de administrador e acesso ligado. Vale para
--    quem acabou de assumir acima e para qualquer titular que tenha derivado.
update public.perfis p
   set nome = p.nome
 where exists (select 1 from public.organizacoes o where o.dono_id = p.id);

do $$
declare n int;
begin
  select count(*) into n from public.organizacoes o
   where not exists (
     select 1 from public.perfis p where p.org_id = o.id and p.ativo and p.papel = 'admin'
   );
  if n > 0 then
    raise notice 'Atenção: % organização(ões) continuam sem administrador ativo, e estão vazias de perfil. Podem ser apagadas.', n;
  else
    raise notice 'Cadastro por convite: nenhuma organização ficou sem administrador.';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 14. Avisos: o app para de ficar em silêncio
--
--     Um app de prazo que não avisa é um caderno: só serve para quem lembra de
--     abrir. O aviso é o que faz o trabalho andar quando ninguém está olhando.
--
--     Três decisões que valem explicar.
--
--     **O aviso nasce no banco, não na tela.** Quem muda um responsável, aprova
--     um checkpoint ou manda uma mensagem pode ser outra pessoa, em outro
--     navegador, ou o próprio servidor. Se o aviso nascesse no cliente, só
--     avisaria quem já estava com o app aberto, que é justamente quem não
--     precisa. Por isso são gatilhos, e por isso eles são `security definer`:
--     quem escreve o aviso é o banco, e o destinatário quase nunca é quem agiu.
--
--     **Todo aviso tem uma chave, e a chave é única por pessoa.** É ela que
--     garante que gerar os avisos do dia duas vezes não avise duas vezes, e que
--     trocar o responsável de uma tarefa de volta não encha a caixa de ninguém.
--     `on conflict do nothing` é a regra inteira.
--
--     **O aviso é sempre de uma pessoa.** Não existe aviso da empresa nem do
--     grupo: existe o aviso que é seu, que só você lê (a política abaixo recusa
--     o de qualquer outra pessoa, inclusive para o administrador) e que só você
--     marca como lido. Telefone e assinatura de push moram em tabela separada
--     pelo mesmo motivo: em `perfis` a organização inteira leria o número de
--     celular de todo mundo, porque RLS trabalha por linha, não por coluna.
-- --------------------------------------------------------------------------

create table if not exists public.avisos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizacoes on delete cascade,
  -- De quem é o aviso. Nunca de um grupo: aviso sem dono ninguém responde.
  perfil_id  uuid not null references public.perfis on delete cascade,
  tipo       text not null check (tipo in (
               'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo')),
  titulo     text not null,
  corpo      text not null default '',
  -- Urgente é o que justifica tocar o celular de alguém: o que já venceu, o que
  -- trava outra pessoa, e o que só você pode destravar. O resto espera.
  urgente    boolean not null default false,
  -- Para onde o aviso leva. Tudo opcional, porque nem todo aviso tem endereço.
  fluxo_id   uuid references public.fluxos  on delete cascade,
  item_id    uuid references public.itens   on delete cascade,
  etapa_id   uuid references public.etapas  on delete cascade,
  canal_id   uuid references public.canais  on delete cascade,
  -- A chave que impede o mesmo aviso duas vezes. Ver o comentário acima.
  chave      text not null,
  lido_em    timestamptz,
  -- Quando saiu daqui para o push e para o WhatsApp. Nulo é o que ainda não saiu.
  entregue_em timestamptz,
  criado_em  timestamptz not null default now()
);

create unique index if not exists avisos_uk on public.avisos (perfil_id, chave);
create index if not exists avisos_caixa_idx on public.avisos (perfil_id, criado_em desc);
create index if not exists avisos_na_fila_idx on public.avisos (criado_em) where entregue_em is null;

-- Como quem recebe quer ser avisado, e por onde. Fora de `perfis` de propósito:
-- aqui a política é por pessoa, e o número de celular de alguém não é assunto da
-- organização inteira.
create table if not exists public.avisos_contato (
  perfil_id  uuid primary key references public.perfis on delete cascade,
  org_id     uuid not null references public.organizacoes on delete cascade,
  -- No formato internacional, com o mais na frente: +5511999999999.
  telefone   text not null default '',
  whats      boolean not null default false,
  push       boolean not null default true,
  -- Só o que é urgente sai daqui para o celular. O resto fica no sino.
  so_urgente boolean not null default false,
  -- Não perturbe, no fuso de quem recebe. Vazio é sempre pode.
  calado_de  time,
  calado_ate time,
  mexido_em  timestamptz not null default now()
);

-- Um aparelho que aceitou receber push. Uma pessoa costuma ter dois ou três.
create table if not exists public.push_assinaturas (
  id        uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis on delete cascade,
  org_id    uuid not null references public.organizacoes on delete cascade,
  -- O endereço que o navegador deu. É ele que identifica o aparelho.
  endpoint  text not null unique,
  p256dh    text not null,
  auth      text not null,
  -- Para a pessoa reconhecer qual aparelho é, na hora de desligar um.
  aparelho  text not null default '',
  criado_em timestamptz not null default now(),
  usado_em  timestamptz
);

create index if not exists push_perfil_idx on public.push_assinaturas (perfil_id);

-- --------------------------------------------------------------------------
-- Quem escreve o aviso
--
-- Uma porta só, e ela é `security definer` porque o destinatário quase nunca é
-- quem agiu: quem troca o responsável de uma tarefa escreve na caixa de outra
-- pessoa, e nenhuma política deixaria isso passar, com razão.
-- --------------------------------------------------------------------------

-- A versão antiga devolvia void. Trocar o retorno exige derrubar antes, porque
-- `create or replace` não muda assinatura.
drop function if exists public.avisar(uuid, text, text, text, text, boolean, uuid, uuid, uuid, uuid);

create or replace function public.avisar(
  p_perfil uuid, p_tipo text, p_titulo text, p_corpo text, p_chave text,
  p_urgente boolean default false,
  p_fluxo uuid default null, p_item uuid default null,
  p_etapa uuid default null, p_canal uuid default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid;
begin
  if p_perfil is null or coalesce(btrim(p_chave), '') = '' then return false; end if;
  -- Quem está desativado não recebe: acesso suspenso é acesso suspenso.
  select org_id into v_org from perfis where id = p_perfil and ativo;
  if v_org is null then return false; end if;

  insert into avisos (org_id, perfil_id, tipo, titulo, corpo, chave, urgente,
                      fluxo_id, item_id, etapa_id, canal_id)
  values (v_org, p_perfil, p_tipo, p_titulo, coalesce(p_corpo, ''), p_chave,
          coalesce(p_urgente, false), p_fluxo, p_item, p_etapa, p_canal)
  on conflict (perfil_id, chave) do nothing
  returning id into v_id;
  -- Devolve se escreveu de verdade, e não se tentou: é isso que deixa quem
  -- gera os avisos do dia dizer quantos são novos em vez de quantos existem.
  return v_id is not null;
end $$;

-- --------------------------------------------------------------------------
-- Os gatilhos
--
-- Cada um responde a uma pergunta que alguém faria em voz alta: "quem me deu
-- essa tarefa", "já posso aprovar", "destravou", "por que parou", "me chamaram".
-- --------------------------------------------------------------------------

-- Passaram uma tarefa para você. Pegar uma tarefa para si mesmo não avisa nada.
create or replace function public.aviso_tarefa()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fluxo text;
begin
  if new.resp_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.resp_id is not distinct from old.resp_id then return new; end if;
  if new.resp_id = meu_perfil() then return new; end if;

  select nome into v_fluxo from fluxos where id = new.fluxo_id;
  perform avisar(
    new.resp_id, 'tarefa', 'Nova tarefa com você',
    new.texto || coalesce(' · ' || v_fluxo, ''),
    'tarefa:' || new.id::text || ':' || new.resp_id::text,
    false, new.fluxo_id, new.id, new.etapa_id, null);
  return new;
end $$;

drop trigger if exists ao_dar_tarefa on public.itens;
create trigger ao_dar_tarefa after insert or update of resp_id on public.itens
  for each row execute function public.aviso_tarefa();

-- Saiu uma tarefa. Duas perguntas ficam em aberto: quem estava esperando por ela,
-- e o checkpoint já pode ser aprovado.
create or replace function public.aviso_ao_concluir()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_etapa record; v_fluxo record; v_faltam int;
begin
  if not new.feito or old.feito then return new; end if;

  -- 1. Quem dependia desta tarefa e não depende de mais nada em aberto.
  for r in
    select i.id, i.resp_id, i.texto, i.fluxo_id, i.etapa_id
      from dependencias d join itens i on i.id = d.item_id
     where d.depende_de = new.id and not i.feito
  loop
    if not exists (
      select 1 from dependencias d2 join itens i2 on i2.id = d2.depende_de
       where d2.item_id = r.id and not i2.feito
    ) then
      perform avisar(
        r.resp_id, 'destravou', 'Destravou: já dá para tocar',
        r.texto, 'destravou:' || r.id::text || ':' || new.id::text,
        true, r.fluxo_id, r.id, r.etapa_id, null);
    end if;
  end loop;

  -- 2. O checkpoint da vez ficou completo: quem aprova precisa saber.
  select * into v_etapa from etapas where id = new.etapa_id;
  select * into v_fluxo from fluxos where id = new.fluxo_id;
  if v_etapa.id is null or v_fluxo.id is null or v_fluxo.concluido then return new; end if;
  if v_etapa.ordem is distinct from v_fluxo.atual then return new; end if;

  select count(*) into v_faltam from itens where etapa_id = v_etapa.id and not feito;
  if v_faltam = 0 then
    perform avisar(
      v_etapa.aprovador_id, 'aprovacao', 'Checkpoint pronto para aprovar',
      v_etapa.nome || ' · ' || v_fluxo.nome,
      'aprovacao:' || v_etapa.id::text,
      true, v_fluxo.id, null, v_etapa.id, null);
  end if;
  return new;
end $$;

drop trigger if exists ao_concluir_item on public.itens;
create trigger ao_concluir_item after update of feito on public.itens
  for each row execute function public.aviso_ao_concluir();

-- A esteira andou ou travou.
create or replace function public.aviso_de_fluxo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_etapa record; v_faltam int; r record;
begin
  -- Travou: quem tem tarefa aberta aqui para de conseguir andar, e precisa
  -- saber por quê antes de bater na porta de alguém.
  if new.travado_motivo is not null and old.travado_motivo is null then
    for r in
      select distinct i.resp_id
        from itens i join etapas e on e.id = i.etapa_id
       where i.fluxo_id = new.id and not i.feito and e.ordem = new.atual and i.resp_id is not null
      union
      select new.dono_id
    loop
      perform avisar(
        r.resp_id, 'travou', 'Track travada: ' || new.nome,
        new.travado_motivo,
        'travou:' || new.id::text || ':' || extract(epoch from now())::bigint::text,
        false, new.id, null, null, null);
    end loop;
    return new;
  end if;

  -- Andou para um checkpoint que já nasce sem tarefa nenhuma: quem aprova é o
  -- único que pode mexer, então o aviso vai direto.
  if new.atual is distinct from old.atual and not new.concluido then
    select * into v_etapa from etapas where fluxo_id = new.id and ordem = new.atual;
    if v_etapa.id is not null then
      select count(*) into v_faltam from itens where etapa_id = v_etapa.id and not feito;
      if v_faltam = 0 then
        perform avisar(
          v_etapa.aprovador_id, 'aprovacao', 'Checkpoint pronto para aprovar',
          v_etapa.nome || ' · ' || new.nome,
          'aprovacao:' || v_etapa.id::text,
          true, new.id, null, v_etapa.id, null);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists ao_mexer_no_fluxo on public.fluxos;
create trigger ao_mexer_no_fluxo after update on public.fluxos
  for each row execute function public.aviso_de_fluxo();

-- Te chamaram na conversa. O campo escreve "@Primeiro", e é isso que se procura.
create or replace function public.aviso_de_citacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_canal text; v_quem text;
begin
  if new.texto is null or position('@' in new.texto) = 0 then return new; end if;
  select nome into v_canal from canais where id = new.canal_id;
  select nome into v_quem  from perfis where id = new.autor_id;

  for r in
    select p.id, split_part(btrim(p.nome), ' ', 1) as primeiro
      from perfis p
     where p.org_id = new.org_id and p.ativo
       and p.id is distinct from new.autor_id
       -- Nome com caractere fora do alfabeto viraria expressão regular inválida.
       and btrim(p.nome) ~ '^[[:alpha:]]'
  loop
    if new.texto ~* ('@' || r.primeiro || '($|[^[:alpha:]])') then
      perform avisar(
        r.id, 'citacao',
        coalesce(v_quem, 'Alguém') || ' te chamou em #' || coalesce(v_canal, 'conversa'),
        left(new.texto, 180),
        'citacao:' || new.id::text || ':' || r.id::text,
        false, null, null, null, new.canal_id);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists ao_citar on public.mensagens;
create trigger ao_citar after insert on public.mensagens
  for each row execute function public.aviso_de_citacao();

-- Pediram para mexer num prazo. Quem responde pela track decide.
create or replace function public.aviso_de_pedido_prazo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fluxo record; v_item text;
begin
  if new.estado <> 'aberto' then return new; end if;
  select * into v_fluxo from fluxos where id = new.fluxo_id;
  select texto into v_item from itens where id = new.item_id;
  if v_fluxo.dono_id is null or v_fluxo.dono_id = new.pedido_por then return new; end if;

  perform avisar(
    v_fluxo.dono_id, 'pedido_prazo', 'Pedido de prazo esperando você',
    coalesce(v_item, 'Uma tarefa') || ' · para ' || to_char(new.para, 'DD/MM'),
    'pedido_prazo:' || new.id::text,
    false, new.fluxo_id, new.item_id, null, null);
  return new;
end $$;

drop trigger if exists ao_pedir_prazo on public.pedidos_prazo;
create trigger ao_pedir_prazo after insert on public.pedidos_prazo
  for each row execute function public.aviso_de_pedido_prazo();

-- --------------------------------------------------------------------------
-- O aviso de prazo
--
-- Este não tem gatilho, porque o fato dele é a passagem do tempo, e tempo não
-- dispara `insert`. Ele é gerado por esta função, que é idempotente: rodar dez
-- vezes no mesmo dia escreve o mesmo aviso uma vez só, porque a chave carrega a
-- data. Ver no README as três formas de chamá-la todo dia.
-- --------------------------------------------------------------------------

create or replace function public.gerar_avisos_de_prazo()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; hoje date := current_date;
begin
  for r in
    select i.id, i.texto, i.resp_id, i.prazo, i.fluxo_id, i.etapa_id, f.nome as fluxo
      from itens i
      join etapas e on e.id = i.etapa_id
      join fluxos f on f.id = i.fluxo_id
     where not i.feito
       and i.resp_id is not null
       and i.prazo is not null
       and i.prazo <= hoje
       and not f.concluido
       and f.travado_motivo is null
       -- Só o checkpoint da vez cobra prazo: o que ainda não chegou não atrasa.
       and e.ordem = f.atual
  loop
    if avisar(
      r.resp_id, 'prazo',
      case when r.prazo < hoje then 'Venceu: ' || r.texto else 'Vence hoje: ' || r.texto end,
      r.fluxo || case when r.prazo < hoje
                      then ' · venceu em ' || to_char(r.prazo, 'DD/MM') else '' end,
      'prazo:' || r.id::text || ':' || hoje::text,
      r.prazo < hoje, r.fluxo_id, r.id, r.etapa_id, null) then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Marcar como lido. Vale só para os seus, e a política abaixo é quem garante.
create or replace function public.ler_avisos(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update avisos set lido_em = now()
   where perfil_id = meu_perfil() and lido_em is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

-- --------------------------------------------------------------------------
-- Políticas
--
-- O aviso é seu e de mais ninguém. Administrador não lê a caixa de aviso da
-- equipe, e isso é de propósito: ali dentro aparece o texto de tarefa privada e
-- de mensagem de canal fechado, e o aviso não pode ser a porta dos fundos das
-- regras de visibilidade que o resto do banco defende.
-- --------------------------------------------------------------------------

alter table public.avisos            enable row level security;
alter table public.avisos_contato    enable row level security;
alter table public.push_assinaturas  enable row level security;

drop policy if exists avisos_sel on public.avisos;
create policy avisos_sel on public.avisos for select using (perfil_id = meu_perfil());

drop policy if exists avisos_upd on public.avisos;
create policy avisos_upd on public.avisos for update
  using (perfil_id = meu_perfil()) with check (perfil_id = meu_perfil());

drop policy if exists avisos_del on public.avisos;
create policy avisos_del on public.avisos for delete using (perfil_id = meu_perfil());

-- Sem política de insert de propósito: quem escreve aviso é `avisar()`, que é
-- security definer. Cliente nenhum escreve na caixa de ninguém, nem na própria.

drop policy if exists contato_tudo on public.avisos_contato;
create policy contato_tudo on public.avisos_contato for all
  using (perfil_id = meu_perfil())
  with check (perfil_id = meu_perfil() and minha(org_id));

drop policy if exists push_tudo on public.push_assinaturas;
create policy push_tudo on public.push_assinaturas for all
  using (perfil_id = meu_perfil())
  with check (perfil_id = meu_perfil() and minha(org_id));

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.avisos';
  exception when duplicate_object then null;
  end;
end $$;

-- O WhatsApp da casa. Fica na organização porque o número que assina a mensagem
-- é da empresa, não da pessoa: quem recebe precisa reconhecer de quem é.
-- O conector guarda a chave; aqui ficam só os dois dados que não são segredo.
alter table public.organizacoes add column if not exists whats_conector uuid
  references public.conectores on delete set null;
-- O Account SID da Twilio, que entra no caminho da chamada.
alter table public.organizacoes add column if not exists whats_sid text not null default '';
-- O remetente aprovado, no formato que a Twilio espera: whatsapp:+14155238886
alter table public.organizacoes add column if not exists whats_de text not null default '';

-- --------------------------------------------------------------------------
-- 15. Quem assina é o servidor, não o navegador
--
--     Três tabelas guardam quem criou a linha, e três políticas exigem que esse
--     campo seja igual a `meu_perfil()`: `itens.autor_id`, `canais.criado_por` e
--     `notas.dono_id`. Até aqui o valor vinha do navegador, e a política só
--     conferia. Isso tem dois defeitos, e o segundo é o que apareceu em uso.
--
--     O primeiro é de desenho: a verdade passa a existir em dois lugares. O app
--     precisa saber qual é o perfil dele em uso, e o banco precisa concordar. São
--     duas contas do mesmo número, e a hora em que elas discordarem é uma hora
--     que ninguém escolheu.
--
--     O segundo é de conserto: quando discordam, o banco responde "new row
--     violates row-level security policy", que não diz qual das condições caiu.
--     A pessoa lê que não pode criar um canal na própria empresa, sendo dona
--     dela, e não há nada na tela que explique.
--
--     A correção é a mesma que a organização já usava desde o começo, em
--     `carimbar_org()`: **o servidor carimba**. O campo passa a ser escrito pelo
--     banco com `meu_perfil()`, e o que o navegador mandar naquele campo é
--     ignorado. Com isso a política vira uma tautologia para quem está logado, e
--     continua impossível assinar em nome de outra pessoa, que era o objetivo
--     dela desde sempre.
--
--     Repare no `coalesce`: quando não há ninguém logado (o servidor agindo com
--     a chave de serviço, uma migração), o valor enviado continua valendo. Sem
--     isso, uma carga de dados nasceria sem autor.
-- --------------------------------------------------------------------------

create or replace function public.carimbar_autor()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_eu uuid := meu_perfil();
begin
  if v_eu is null then return new; end if;
  if tg_table_name = 'itens'  then new.autor_id   := v_eu; end if;
  if tg_table_name = 'canais' then new.criado_por := v_eu; end if;
  if tg_table_name = 'notas'  then new.dono_id    := v_eu; end if;
  -- Cinto e suspensório para a etiqueta da organização. `carimbar_org()` já faz
  -- isso, e roda depois deste (os gatilhos BEFORE disparam em ordem alfabética,
  -- e `ao_assinar` vem antes de `ao_inserir_org`), então em banco sadio esta
  -- linha não muda nada. Ela existe porque um banco onde aquele carimbo faltou
  -- recusa toda criação nestas três tabelas, e o erro que aparece fala da
  -- política, não do carimbo. Um gatilho só não pode ficar pela metade.
  new.org_id := coalesce(new.org_id, minha_org());
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['itens','canais','notas'] loop
    execute format('drop trigger if exists ao_assinar on public.%I', t);
    execute format(
      'create trigger ao_assinar before insert on public.%I
         for each row execute function public.carimbar_autor()', t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Um login pode ter perfil em mais de uma empresa, e `perfis_sel` devolve
-- todos, de propósito: é o que alimenta o seletor de espaço. Só que uma lista
-- de gente para escolher responsável não pode misturar quem é de outra empresa:
-- escolher alguém de fora cria uma tarefa que o dono dela nunca vai enxergar,
-- porque toda outra política filtra por organização.
--
-- Esta função é a lista certa para qualquer escolha de pessoa dentro do app.
-- --------------------------------------------------------------------------

create or replace function public.gente_daqui()
returns setof public.perfis language sql stable security definer set search_path = public as $$
  select * from perfis where org_id = minha_org() order by nome;
$$;

-- --------------------------------------------------------------------------
-- 16. A tarefa ganha descrição
--
--     Até aqui a tarefa tinha uma linha de texto e nada mais, e uma linha só
--     obriga a escolher entre ser curta e ser clara. "Conferir os documentos"
--     não diz quais documentos, nem contra o quê conferir, e quem recebe
--     descobre isso perguntando. A descrição é onde esse resto cabe.
--
--     Fica opcional e vazia por padrão, de propósito: tarefa que se explica no
--     título não deve ganhar um campo em branco para preencher.
-- --------------------------------------------------------------------------

alter table public.itens add column if not exists descricao text not null default '';

-- --------------------------------------------------------------------------
-- 17. A nota ganha endereço
--
--     O caderno de bolso nasceu solto de propósito: o que organiza uma nota é a
--     ligação escrita no meio do texto, `[[outra nota]]`, e não a pasta. Isso
--     continua valendo, e é o que faz o acervo sobreviver às trezentas notas.
--
--     O que faltava era o outro eixo, o do trabalho: "isto aqui é sobre o
--     Financeiro", "isto é da implantação do ERP". Não é pasta, é etiqueta: a
--     nota continua achável pela ligação e pelo texto, e agora também pelo
--     lugar da empresa a que ela se refere. As duas são opcionais, e a maioria
--     das notas não vai ter nenhuma, que é o certo.
-- --------------------------------------------------------------------------

alter table public.notas add column if not exists area_id  uuid references public.areas  on delete set null;
alter table public.notas add column if not exists fluxo_id uuid references public.fluxos on delete set null;

create index if not exists notas_area_idx  on public.notas (area_id)  where area_id  is not null;
create index if not exists notas_fluxo_idx on public.notas (fluxo_id) where fluxo_id is not null;

-- --------------------------------------------------------------------------
-- 18. O anexo deixa de ser só de tarefa
--
--     O anexo nasceu como prova de tarefa: o comprovante, o contrato assinado,
--     a foto do serviço. Por isso ele exigia tarefa e track, e por isso não
--     cabia no caderno. Só que o documento que importa nem sempre nasce preso a
--     uma tarefa: a proposta que chegou por e-mail, o print de uma conversa, o
--     PDF que alguém mandou e que você ainda não sabe em que vai dar.
--
--     Agora o anexo pertence a **uma** das duas coisas, nunca às duas: uma
--     tarefa ou uma nota. O `check` abaixo é quem garante isso, e não a boa
--     vontade de quem escreve o insert: anexo pendurado em nada é arquivo que
--     ninguém acha e ninguém apaga.
--
--     A regra de quem vê segue a coisa a que ele pertence. Anexo de tarefa abre
--     quando a tarefa abre; anexo de nota abre para o dono da nota e mais
--     ninguém, porque a nota é dele e ponto.
-- --------------------------------------------------------------------------

alter table public.anexos add column if not exists nota_id uuid references public.notas on delete cascade;
alter table public.anexos alter column item_id  drop not null;
alter table public.anexos alter column fluxo_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'anexos_de_uma_coisa') then
    alter table public.anexos add constraint anexos_de_uma_coisa
      check ((item_id is not null and nota_id is null)
          or (item_id is null and nota_id is not null));
  end if;
end $$;

create index if not exists anexos_nota_idx on public.anexos (nota_id) where nota_id is not null;

-- --------------------------------------------------------------------------
-- As políticas, agora com os dois caminhos
-- --------------------------------------------------------------------------

drop policy if exists anx_sel on public.anexos;
create policy anx_sel on public.anexos for select using (
  minha(org_id) and ativo() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and exists (
      select 1 from notas n where n.id = nota_id and n.dono_id = meu_perfil()))
  ));

drop policy if exists anx_ins on public.anexos;
create policy anx_ins on public.anexos for insert with check (
  minha(org_id) and ativo() and autor_id = meu_perfil() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and exists (
      select 1 from notas n where n.id = nota_id and n.dono_id = meu_perfil()))
  ));

drop policy if exists anx_del on public.anexos;
create policy anx_del on public.anexos for delete using (
  minha(org_id) and ativo() and (
    autor_id = meu_perfil()
    or (fluxo_id is not null and manda_no_processo(fluxo_id))
  ));

-- --------------------------------------------------------------------------
-- E o balde de arquivos, que é quem de fato guarda o documento
-- --------------------------------------------------------------------------

create or replace function public.posso_ver_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  -- Prova de tarefa: abre quando a tarefa abre.
  select exists (
    select 1 from anexos a
    where a.caminho = p_caminho and minha(a.org_id)
      and a.item_id is not null and ve_item(a.item_id)
  )
  -- Documento de nota: abre para o dono da nota, e mais ninguém.
  or exists (
    select 1 from anexos a join notas n on n.id = a.nota_id
    where a.caminho = p_caminho and minha(a.org_id) and n.dono_id = meu_perfil()
  )
  -- Recado de voz: abre quando o canal abre. Canal fechado continua fechado, e
  -- é por isso que a conta passa por ve_canal e não pelo caminho do arquivo.
  or exists (
    select 1 from mensagens m
    where m.audio_caminho = p_caminho and minha(m.org_id) and ve_canal(m.canal_id)
  );
$$;

create or replace function public.posso_apagar_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  -- Com linha: manda a regra da linha. Sem linha (arquivo órfão, de um envio que
  -- falhou no meio), basta ser da sua organização, para dar para limpar.
  select coalesce(
    (select minha(a.org_id) and (
        a.autor_id = meu_perfil()
        or (a.fluxo_id is not null and manda_no_processo(a.fluxo_id)))
       from anexos a where a.caminho = p_caminho),
    -- Recado de voz: apaga quem escreveu, igual à mensagem de texto.
    (select minha(m.org_id) and m.autor_id = meu_perfil()
       from mensagens m where m.audio_caminho = p_caminho),
    split_part(p_caminho, '/', 1) = minha_org()::text
  );
$$;

-- ==========================================================================
-- 19. As notas saem do chat e ganham conversa própria
--
--     O caderno nasceu como canal, do tipo `pessoal`, e o motivo era bom: canal
--     de verdade herda áudio, anexo, busca, leitura e tempo real sem escrever
--     nada. O preço só apareceu no uso. Um caderno listado entre os canais é
--     lido como lugar de falar com alguém, e ninguém fala sozinho num lugar
--     onde os outros conversam. Pior: "Meu despejo" aparecia ao lado de
--     "#Financeiro" como se fossem a mesma coisa, e não são.
--
--     Aqui a nota vira o recipiente. Cada nota é UM ASSUNTO, e dentro dela cabe
--     uma conversa com a leitura sobre aquilo e só aquilo. Fora delas existe uma
--     conversa solta, que é a nota sem assunto: `notas.conversa`. É a mesma
--     linha, a mesma política e a mesma dona, então a memória enxerga as duas do
--     mesmo jeito, que era o ponto.
--
--     Mensagem e proposta passam a pertencer a um canal OU a uma nota, nunca às
--     duas nem a nenhuma. Quem vê a mensagem da nota é só a dona da nota, sem
--     exceção para admin, igual à nota em si: caderno que o chefe abre não é
--     caderno.
-- ==========================================================================

-- A conversa solta é uma nota marcada, uma por pessoa. Ser nota é o que faz o
-- acervo somar sozinho: o que foi dito nela entra no caderno como o resto.
alter table public.notas add column if not exists conversa boolean not null default false;
create unique index if not exists notas_conversa_idx on public.notas (dono_id) where conversa;

alter table public.mensagens add column if not exists nota_id uuid references public.notas on delete cascade;
alter table public.sugestoes add column if not exists nota_id uuid references public.notas on delete cascade;
alter table public.mensagens alter column canal_id drop not null;
alter table public.sugestoes alter column canal_id drop not null;

-- --------------------------------------------------------------------------
-- O despejo que já existe vira nota, uma por mensagem
--
-- Cada coisa que a pessoa jogou lá dentro era um pensamento separado, escrito
-- em momentos diferentes: virar uma nota cada é o que preserva isso. As
-- propostas que estavam abertas acompanham a nota que as gerou.
-- --------------------------------------------------------------------------
do $$
declare m record; v_nota uuid; n int := 0;
begin
  for m in
    select g.id, g.texto, g.criado_em, g.org_id,
           coalesce(g.autor_id, k.criado_por) as dono
      from mensagens g
      join canais k on k.id = g.canal_id
     where k.tipo = 'pessoal'
       and g.sistema = false
       and btrim(coalesce(g.texto, '')) <> ''
       and coalesce(g.autor_id, k.criado_por) is not null
     order by g.criado_em
  loop
    v_nota := gen_random_uuid();
    insert into notas (id, titulo, texto, dono_id, org_id, criado_em, mexido_em)
    values (
      v_nota,
      left(btrim(split_part(m.texto, E'\n', 1)), 80),
      m.texto, m.dono, m.org_id, m.criado_em, m.criado_em);
    update sugestoes set nota_id = v_nota, canal_id = null where mensagem_id = m.id;
    n := n + 1;
  end loop;
  delete from canais where tipo = 'pessoal';
  if n > 0 then raise notice 'Despejo virou caderno: % nota(s).', n; end if;
end $$;

-- Agora que não sobrou nenhum, o tipo sai do vocabulário. Deixar ele valendo
-- seria deixar a porta por onde o caderno voltaria para a lista de canais.
alter table public.canais drop constraint if exists canais_tipo_check;
alter table public.canais add constraint canais_tipo_check
  check (tipo in ('aberto','fechado','direto'));

-- Uma coisa ou a outra, nunca as duas nem nenhuma. Sem isto existe mensagem
-- pendurada em nada: ninguém acha, ninguém apaga, e nenhuma política alcança.
alter table public.mensagens drop constraint if exists mensagens_de_um_lugar;
alter table public.mensagens add constraint mensagens_de_um_lugar
  check ((canal_id is not null and nota_id is null)
      or (canal_id is null and nota_id is not null));

alter table public.sugestoes drop constraint if exists sugestoes_de_um_lugar;
alter table public.sugestoes add constraint sugestoes_de_um_lugar
  check ((canal_id is not null and nota_id is null)
      or (canal_id is null and nota_id is not null));

create index if not exists msg_nota_idx on public.mensagens (nota_id, criado_em)
  where nota_id is not null;
create index if not exists sug_nota_idx on public.sugestoes (nota_id, criado_em desc)
  where nota_id is not null;

-- --------------------------------------------------------------------------
-- Quem enxerga a conversa de uma nota
-- --------------------------------------------------------------------------

-- A dona da nota, e mais ninguém. É a mesma regra de `nt_sel`, escrita de novo
-- como função porque é ela que as políticas de mensagem e proposta perguntam.
create or replace function public.ve_nota(n uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from notas x
    where x.id = n and minha(x.org_id) and x.dono_id = meu_perfil()
  );
$$;

drop policy if exists msg_sel on public.mensagens;
create policy msg_sel on public.mensagens for select
  using (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)));

drop policy if exists msg_ins on public.mensagens;
create policy msg_ins on public.mensagens for insert
  with check (minha(org_id) and autor_id = meu_perfil()
              and (ve_canal(canal_id) or ve_nota(nota_id)));

drop policy if exists msg_del on public.mensagens;
create policy msg_del on public.mensagens for delete
  using (minha(org_id) and (autor_id = meu_perfil() or ve_nota(nota_id)));

drop policy if exists sug_sel on public.sugestoes;
create policy sug_sel on public.sugestoes for select
  using (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)));

drop policy if exists sug_ins on public.sugestoes;
create policy sug_ins on public.sugestoes for insert
  with check (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)));

drop policy if exists sug_upd on public.sugestoes;
create policy sug_upd on public.sugestoes for update
  using (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)))
  with check (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)));

drop policy if exists sug_del on public.sugestoes;
create policy sug_del on public.sugestoes for delete
  using (minha(org_id) and (ve_canal(canal_id) or ve_nota(nota_id)));

-- --------------------------------------------------------------------------
-- Os dois gatilhos de mensagem que presumiam canal
-- --------------------------------------------------------------------------

-- Mensagem de nota não tem canal, então não tem quadro de membros para marcar.
-- Sem esta condição o gatilho tentaria gravar membro de canal nulo e derrubaria
-- a escrita inteira.
drop trigger if exists ao_escrever_mensagem on public.mensagens;
create trigger ao_escrever_mensagem
  after insert on public.mensagens
  for each row when (new.autor_id is not null and new.canal_id is not null)
  execute function public.ao_escrever();

-- A nota entra no tempo real junto com a conversa dela. Nota é de uma pessoa,
-- mas a mesma pessoa abre o app no computador e no celular, e caderno que só
-- atualiza quando você recarrega a página não é caderno.
do $$ begin
  begin
    execute 'alter publication supabase_realtime add table public.notas';
  exception when duplicate_object then null;
  end;
end $$;

-- E o aviso de citação sai de cena dentro da nota. Isto não é economia de
-- aviso, é vazamento: escrever "@Ana" no meio de uma ideia mandaria o trecho
-- da nota para a caixa da Ana, que não pode ler a nota.
create or replace function public.aviso_de_citacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_canal text; v_quem text;
begin
  if new.canal_id is null then return new; end if;
  if new.texto is null or position('@' in new.texto) = 0 then return new; end if;
  select nome into v_canal from canais where id = new.canal_id;
  select nome into v_quem  from perfis where id = new.autor_id;

  for r in
    select p.id, split_part(btrim(p.nome), ' ', 1) as primeiro
      from perfis p
     where p.org_id = new.org_id and p.ativo
       and p.id is distinct from new.autor_id
       and btrim(p.nome) ~ '^[[:alpha:]]'
  loop
    if new.texto ~* ('@' || r.primeiro || '($|[^[:alpha:]])') then
      perform avisar(
        r.id, 'citacao',
        coalesce(v_quem, 'Alguém') || ' te chamou em #' || coalesce(v_canal, 'conversa'),
        left(new.texto, 180),
        'citacao:' || new.id::text || ':' || r.id::text,
        false, null, null, null, new.canal_id);
    end if;
  end loop;
  return new;
end $$;

-- --------------------------------------------------------------------------
-- 20. O espaço pessoal
--
--     O app é vendido de duas formas e roda o mesmo modelo: o espaço de equipe,
--     que é o produto inteiro, e o pessoal, que é ele sem o que exige uma
--     segunda pessoa. A tela sabe disso por `lib/espaco.ts`; aqui ficam as
--     recusas, que são o que torna a regra verdadeira mesmo quando alguém
--     escrever tela nova sem lembrar dela.
--
--     Três, e as três pela mesma razão: espaço pessoal é de uma pessoa só.
--     Sem isso, "ninguém entra aqui" é promessa de interface, e o que se vende
--     a quem paga pelo pessoal é exatamente essa frase.
-- --------------------------------------------------------------------------

-- 1. Um espaço pessoal por login. Dois cadernos particulares não são mais
--    privacidade, são duas metades do mesmo acervo que nunca se encontram.
create or replace function public.abrir_espaco(p_nome text, p_tipo text default 'equipe')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_perfil uuid; u uuid := auth.uid(); v_email text; v_nome text;
begin
  if u is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if btrim(coalesce(p_nome, '')) = '' then raise exception 'Dê um nome ao espaço.'; end if;
  if p_tipo not in ('pessoal','equipe') then raise exception 'Tipo de espaço inválido.'; end if;

  if p_tipo = 'pessoal' and exists (
    select 1 from perfis p join organizacoes o on o.id = p.org_id
    where p.user_id = u and o.tipo = 'pessoal'
  ) then
    raise exception 'Você já tem um espaço pessoal.';
  end if;

  select email, nome into v_email, v_nome from perfis
  where user_id = u order by criado_em, id limit 1;

  insert into organizacoes (nome, tipo) values (btrim(p_nome), p_tipo) returning id into v_org;
  insert into perfis (user_id, org_id, nome, email, papel, ve_area, ativo)
  values (u, v_org, coalesce(v_nome, split_part(coalesce(v_email,''), '@', 1)),
          coalesce(v_email, ''), 'admin', true, true)
  returning id into v_perfil;
  update organizacoes set dono_id = v_perfil where id = v_org;

  insert into sessoes (user_id, perfil_id) values (u, v_perfil)
  on conflict (user_id) do update set perfil_id = excluded.perfil_id, trocado_em = now();
  return v_perfil;
end $$;

-- 2. Convite não entra em espaço pessoal, nem sendo criado nem sendo usado.
--    As duas portas, porque fechar só a segunda deixaria o convite existindo e
--    falhando na cara de quem recebeu.
create or replace function public.ao_convidar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from organizacoes o where o.id = new.org_id and o.tipo = 'pessoal') then
    raise exception 'Espaço pessoal é de uma pessoa só, e não recebe convite.';
  end if;
  return new;
end $$;

drop trigger if exists convites_so_equipe on public.convites;
create trigger convites_so_equipe before insert on public.convites
  for each row execute function public.ao_convidar();

create or replace function public.entrar_com_convite(p_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cv convites%rowtype; v_perfil uuid; u uuid := auth.uid(); v_email text; v_nome text;
begin
  if u is null then raise exception 'Entre na sua conta primeiro.'; end if;
  select * into cv from convites
  where usado_em is null and (vence_em is null or vence_em > now())
    and codigo = upper(btrim(coalesce(p_codigo, '')));
  if cv.id is null then raise exception 'Código inválido ou vencido.'; end if;
  if exists (select 1 from organizacoes o where o.id = cv.org_id and o.tipo = 'pessoal') then
    raise exception 'Espaço pessoal é de uma pessoa só, e não recebe convite.';
  end if;
  if exists (select 1 from perfis where user_id = u and org_id = cv.org_id) then
    raise exception 'Você já faz parte deste espaço.';
  end if;

  select email, nome into v_email, v_nome from perfis
  where user_id = u order by criado_em, id limit 1;

  insert into perfis (user_id, org_id, nome, email, papel, area_id, gestor_id, ve_area, ativo)
  values (u, cv.org_id, coalesce(nullif(btrim(cv.nome),''), v_nome), coalesce(v_email,''),
          coalesce(cv.papel,'colaborador'), cv.area_id, cv.gestor_id,
          coalesce(cv.ve_area,false), true)
  returning id into v_perfil;

  update convites set usado_em = now(), usado_por = v_perfil where id = cv.id;
  insert into sessoes (user_id, perfil_id) values (u, v_perfil)
  on conflict (user_id) do update set perfil_id = excluded.perfil_id, trocado_em = now();
  return v_perfil;
end $$;

-- 3. Segundo perfil em espaço pessoal não entra por caminho nenhum. É o mesmo
--    que a recusa acima diz do convite, dito onde não há como desviar: o
--    convite é a porta conhecida, esta é a parede.
create or replace function public.ao_criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from organizacoes o where o.id = new.org_id and o.tipo = 'pessoal')
     and exists (select 1 from perfis p where p.org_id = new.org_id) then
    raise exception 'Espaço pessoal é de uma pessoa só.';
  end if;
  return new;
end $$;

drop trigger if exists perfis_pessoal_unico on public.perfis;
create trigger perfis_pessoal_unico before insert on public.perfis
  for each row execute function public.ao_criar_perfil();

-- 4. Canal é falar com alguém, e em espaço pessoal não há com quem. A tela já
--    não oferece; aqui é para o dia em que uma tela nova oferecer.
create or replace function public.ao_criar_canal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from organizacoes o where o.id = new.org_id and o.tipo = 'pessoal') then
    raise exception 'Espaço pessoal não tem canal: sozinho não há com quem conversar.';
  end if;
  return new;
end $$;

drop trigger if exists canais_so_equipe on public.canais;
create trigger canais_so_equipe after insert on public.canais
  for each row execute function public.ao_criar_canal();

-- --------------------------------------------------------------------------
-- 21. A track termina, e termina dizendo como
--
--     Antes havia dois fins e nenhum registro: concluir marcava `concluido` e
--     a track continuava na lista para sempre, e excluir apagava a linha e com
--     ela tudo que se poderia aprender daquilo. Um ano depois ninguém sabe
--     quantas obras foram entregues nem por que as outras pararam.
--
--     Agora todo fim é um **desfecho**, e desfecho arquiva: sai da lista
--     principal e continua inteira em Arquivadas, com trilha, tarefas,
--     conversa e anexos. É de lá que saem os dois números que interessam,
--     quanto se entrega e por que se para.
--
--     O motivo é **escolhido de uma lista**, e não digitado. Motivo digitado
--     vira trinta frases diferentes para a mesma coisa, e trinta frases não
--     viram gráfico nenhum: é por isso que existe `motivo` (o código) e
--     `detalhe` (o que só aquele caso explica).
-- --------------------------------------------------------------------------

alter table public.fluxos add column if not exists desfecho text;
alter table public.fluxos add column if not exists motivo text;
alter table public.fluxos add column if not exists detalhe text;
alter table public.fluxos add column if not exists arquivado_em timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fluxos_desfecho_check') then
    alter table public.fluxos add constraint fluxos_desfecho_check
      check (desfecho is null or desfecho in ('concluido','cancelado'));
  end if;
end $$;

create index if not exists fluxos_arquivo_idx on public.fluxos (org_id, arquivado_em);

-- As tracks já concluídas antes disto entram no arquivo com a data que dá para
-- saber: a da criação não serve, e mentir uma data de conclusão é pior do que
-- não ter. Fica o desfecho, sem carimbo de hora.
update public.fluxos set desfecho = 'concluido'
where concluido and desfecho is null;

/**
 * Arquivar uma track sem concluí-la: o que antes era excluir.
 *
 * Não apaga linha nenhuma, de propósito. Quem cancela um projeto está dizendo
 * a coisa mais útil que vai dizer sobre ele, e apagar a linha jogava justamente
 * essa parte fora.
 */
create or replace function public.arquivar_fluxo(
  p_fluxo uuid, p_motivo text, p_detalhe text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eu uuid := meu_perfil(); f fluxos%rowtype;
begin
  select * into f from fluxos where id = p_fluxo;
  if f.id is null then raise exception 'Track não encontrada.'; end if;
  if not minha(f.org_id) then raise exception 'Esta track não é do seu espaço.'; end if;
  if not (f.autor_id = v_eu or f.dono_id = v_eu or eh_admin()) then
    raise exception 'Só o autor, o dono ou um administrador pode arquivar.';
  end if;
  if btrim(coalesce(p_motivo, '')) = '' then
    raise exception 'Diga por que ela está parando.';
  end if;

  update fluxos set desfecho = 'cancelado', motivo = btrim(p_motivo),
    detalhe = nullif(btrim(coalesce(p_detalhe, '')), ''), arquivado_em = now()
  where id = p_fluxo;

  insert into atividades (fluxo_id, quem_id, texto)
  values (p_fluxo, v_eu, 'arquivou: ' || btrim(p_motivo));
end $$;

/** Tirar do arquivo. Cancelar por engano acontece, e não pode ser definitivo. */
create or replace function public.reabrir_fluxo(p_fluxo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_eu uuid := meu_perfil(); f fluxos%rowtype;
begin
  select * into f from fluxos where id = p_fluxo;
  if f.id is null then raise exception 'Track não encontrada.'; end if;
  if not minha(f.org_id) then raise exception 'Esta track não é do seu espaço.'; end if;
  if not (f.autor_id = v_eu or f.dono_id = v_eu or eh_admin()) then
    raise exception 'Só o autor, o dono ou um administrador pode reabrir.';
  end if;

  update fluxos set desfecho = null, motivo = null, detalhe = null,
    arquivado_em = null, concluido = false
  where id = p_fluxo;

  insert into atividades (fluxo_id, quem_id, texto)
  values (p_fluxo, v_eu, 'tirou do arquivo');
end $$;

-- --------------------------------------------------------------------------
-- 22. A ressalva é dívida, e dívida se paga
--
--     Aprovar com ressalva já criava uma tarefa no checkpoint seguinte, e até
--     aí estava certo. Faltavam as duas metades que fazem a ressalva valer
--     alguma coisa:
--
--     1. Ela era uma tarefa como qualquer outra, e quem não quisesse pagar a
--        dívida simplesmente apagava a linha. Agora a tarefa nasce marcada e o
--        banco recusa apagá-la em aberto: ressalva não se apaga, se conclui.
--     2. No ÚLTIMO checkpoint ela não virava nada. Era o pior lugar para
--        sumir, porque é exatamente onde alguém aprova "com uma pendência" e
--        entrega assim mesmo. Num objetivo a ressalva deixa de ser oferecida
--        ali (ou conclui, ou não conclui); numa rotina ela atravessa a volta e
--        nasce no primeiro checkpoint da seguinte.
--
--     O que impede o checkpoint de fechar com ressalva aberta já existia, na
--     regra geral de "ainda existem itens pendentes". O que faltava era a
--     mensagem dizer qual é a dívida, porque "existem itens pendentes" numa
--     lista de doze não aponta para nada.
-- --------------------------------------------------------------------------

alter table public.itens add column if not exists ressalva boolean not null default false;

-- As que já existem por prefixo entram marcadas, senão a regra nova valeria só
-- para o futuro e as dívidas de hoje continuariam apagáveis.
update public.itens set ressalva = true
where not ressalva and texto like 'Ressalva: %';

create or replace function public.proteger_ressalva()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.ressalva and not old.feito then
    raise exception 'Ressalva não se apaga, se conclui. Ela é a dívida que ficou do checkpoint anterior.';
  end if;
  return old;
end $$;

drop trigger if exists ressalva_nao_some on public.itens;
create trigger ressalva_nao_some before delete on public.itens
  for each row execute function public.proteger_ressalva();

create or replace function public.decidir_etapa(
  p_fluxo    uuid,
  p_tipo     text,
  p_nota     text default '',
  p_reabrir  uuid[] default '{}',
  p_periodo  text default null,
  p_prazo    date default null,
  -- Ver a seção 35: em nome de quem, quando não há sessão. Nasce aqui para o
  -- arquivo poder ser lido duas vezes sem criar duas versões da mesma função.
  p_como     uuid default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  f      fluxos%rowtype;
  e      etapas%rowtype;
  uid    uuid := meu_perfil();
  n      int;
  passo  int;
  atrasou boolean;
  pendente text;
begin
  select * into f from fluxos where id = p_fluxo;
  if f.id is null then raise exception 'Projeto não encontrado.'; end if;
  if f.concluido then raise exception 'Este projeto já está concluído.'; end if;
  if f.travado_motivo is not null then raise exception 'Este projeto está travado.'; end if;

  select * into e from etapas where fluxo_id = f.id and ordem = f.atual;
  if e.id is null then raise exception 'Checkpoint não encontrado.'; end if;
  if e.aprovador_id is not null and e.aprovador_id <> uid and not eh_admin() then
    raise exception 'Somente quem aprova este checkpoint pode decidir.';
  end if;

  if p_tipo not in ('aprovou','ressalva','devolveu') then raise exception 'Decisão desconhecida.'; end if;
  if p_tipo <> 'aprovou' and btrim(coalesce(p_nota, '')) = '' then
    raise exception 'Escreva o motivo: quem recebe precisa saber o que fazer.';
  end if;

  select count(*) into n from etapas where fluxo_id = f.id;

  -- Ressalva no último checkpoint de um objetivo não tem para onde ir: o que
  -- viria depois não existe, e aceitar aqui é entregar com pendência e sem
  -- ninguém para cobrá-la. Rotina pode, porque a volta seguinte é o depois.
  if p_tipo = 'ressalva' and f.atual = n - 1 and f.tipo = 'esteira' then
    raise exception 'Este é o último checkpoint: ou a track conclui, ou a pendência vira tarefa aqui antes.';
  end if;

  if p_tipo = 'devolveu' then
    update itens set feito = false, feito_em = null
    where etapa_id = e.id and id = any(p_reabrir);

    insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
    values (f.id, e.id, uid, 'devolveu', btrim(p_nota));

    insert into atividades (fluxo_id, quem_id, texto)
    values (f.id, uid, 'devolveu ' || e.nome || ': ' || btrim(p_nota));
    return 'devolveu';
  end if;

  -- A dívida do checkpoint anterior vem antes de qualquer coisa, e a mensagem
  -- diz qual é: "existem itens pendentes" numa lista de doze não aponta nada.
  select i.texto into pendente from itens i
  where i.etapa_id = e.id and i.ressalva and not i.feito
  order by i.ordem limit 1;
  if pendente is not null then
    raise exception 'Falta a ressalva do checkpoint anterior: %', pendente;
  end if;

  if exists (
    select 1 from itens i
    where i.etapa_id = e.id and not i.feito and (not i.priv or i.autor_id = uid)
  ) then raise exception 'Ainda existem itens pendentes neste checkpoint.'; end if;

  insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
  values (f.id, e.id, uid, p_tipo, btrim(coalesce(p_nota, '')));

  insert into atividades (fluxo_id, quem_id, texto)
  values (f.id, uid, case when p_tipo = 'ressalva'
    then 'aprovou ' || e.nome || ' com ressalva: ' || btrim(p_nota)
    else 'aprovou a saída de ' || e.nome end);

  -- A ressalva vira tarefa marcada do checkpoint seguinte, e numa rotina que
  -- está virando, do primeiro da volta que vem.
  if p_tipo = 'ressalva' then
    insert into itens (etapa_id, fluxo_id, texto, resp_id, prazo, autor_id, ordem, ressalva)
    select et.id, f.id, 'Ressalva: ' || btrim(p_nota), f.dono_id, p_prazo, uid,
           coalesce((select max(i.ordem) + 1 from itens i where i.etapa_id = et.id), 0), true
    from etapas et
    where et.fluxo_id = f.id
      and et.ordem = case when f.atual < n - 1 then f.atual + 1 else 0 end;
  end if;

  if f.atual < n - 1 then
    update fluxos set atual = f.atual + 1 where id = f.id;
    return 'avancou';
  end if;

  if f.tipo = 'ciclo' then
    passo := case f.freq when 'semanal' then 7 when 'quinzenal' then 15 else 30 end;
    select exists (
      select 1 from etapas et where et.fluxo_id = f.id and et.prazo is not null and et.prazo < current_date
      union all
      select 1 from itens it where it.fluxo_id = f.id and it.prazo is not null and it.prazo < current_date
    ) into atrasou;

    insert into historico (fluxo_id, periodo, situacao)
    values (f.id, coalesce(f.periodo, ''), case when atrasou then 'late' else 'ok' end);

    delete from historico h
    where h.fluxo_id = f.id
      and h.id not in (select id from historico where fluxo_id = f.id order by criado_em desc limit 12);

    update etapas set prazo = prazo + passo where fluxo_id = f.id and prazo is not null;
    -- A ressalva que acabou de nascer não é "tarefa da volta passada": ela é a
    -- dívida desta virada, e zerá-la junto com o resto seria pagá-la sozinha.
    update itens set feito = false, prazo = prazo + passo
    where fluxo_id = f.id and prazo is not null and not ressalva;
    update itens set feito = false where fluxo_id = f.id and prazo is null and not ressalva;
    update fluxos set atual = 0, periodo = coalesce(nullif(btrim(p_periodo), ''), periodo) where id = f.id;
    return 'volta';
  end if;

  -- Concluir arquiva: a track sai da lista principal e continua inteira em
  -- Arquivadas, que é onde ficam os documentos e o histórico dela. Seção 21.
  update fluxos set concluido = true, desfecho = 'concluido', arquivado_em = now()
  where id = f.id;
  return 'concluido';
end $$;

-- --------------------------------------------------------------------------
-- 23. A nota que se mostra
--
--     Até aqui a nota era do dono e de mais ninguém, sem exceção nem para
--     administrador, e isso continua sendo o padrão: ninguém passa a ver nada
--     por mudança de regra, só por gesto de quem escreveu.
--
--     São duas formas de mostrar, e elas não são a mesma coisa:
--
--     - **Mandar para um canal** é uma cópia. O texto vira mensagem, e a
--       partir dali a vida dele é a da conversa. A nota não muda de dono.
--       Isso não precisa de tabela nem de política: é escrever uma mensagem.
--     - **Liberar para pessoas** é acesso continuado: quem recebeu abre a nota
--       e lê o que ela for virando. É esta seção.
--
--     O que NÃO vai junto é a conversa de dentro. Quem compartilha uma nota
--     está mostrando o que escreveu, e não o que perguntou à leitura enquanto
--     pensava: são coisas diferentes, e a segunda é a mais íntima das duas.
--     Por isso `ve_nota()` deixa de servir às duas perguntas e vira duas:
--     `ve_nota` (dono ou convidado) para a nota e os anexos dela, e
--     `minha_nota` (só o dono) para mensagem e proposta.
--
--     Compartilhar é **só leitura**. Duas pessoas editando o mesmo texto sem
--     tempo real é o caminho mais curto para alguém perder o que escreveu.
-- --------------------------------------------------------------------------

create table if not exists public.nota_pessoas (
  nota_id   uuid not null references public.notas on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (nota_id, perfil_id)
);

alter table public.nota_pessoas enable row level security;

do $$
begin
  execute 'alter table public.nota_pessoas add column if not exists org_id uuid references public.organizacoes on delete cascade';
  execute 'create index if not exists nota_pessoas_org_idx on public.nota_pessoas (org_id)';
  execute 'drop trigger if exists ao_inserir_org on public.nota_pessoas';
  execute 'create trigger ao_inserir_org before insert on public.nota_pessoas
             for each row execute function public.carimbar_org()';
end $$;

create index if not exists nota_pessoas_perfil_idx on public.nota_pessoas (perfil_id);

/**
 * Esta nota foi compartilhada comigo?
 *
 * `security definer` e não um `exists` solto dentro da política, porque a
 * política de `notas` pergunta por `nota_pessoas` e a de `nota_pessoas`
 * pergunta por `notas`: escritas como subconsulta normal, as duas se chamam em
 * círculo e o Postgres devolve "recursão infinita detectada na política". A
 * função quebra o círculo porque roda fora das políticas.
 */
create or replace function public.nota_comigo(n uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from nota_pessoas p where p.nota_id = n and p.perfil_id = meu_perfil()
  );
$$;

/** Sou o dono desta nota? Também definer, e pelo mesmo motivo. */
create or replace function public.minha_nota(n uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from notas x
    where x.id = n and minha(x.org_id) and x.dono_id = meu_perfil()
  );
$$;

-- Só o dono da nota convida e desconvida. Quem recebeu vê a própria linha, que
-- é o que deixa a tela dizer "compartilhada com você" sem consultar a nota.
drop policy if exists np_sel on public.nota_pessoas;
create policy np_sel on public.nota_pessoas for select
  using (minha(org_id) and (perfil_id = meu_perfil() or minha_nota(nota_id)));

drop policy if exists np_ins on public.nota_pessoas;
create policy np_ins on public.nota_pessoas for insert
  with check (minha(org_id) and ativo() and minha_nota(nota_id));

drop policy if exists np_del on public.nota_pessoas;
create policy np_del on public.nota_pessoas for delete
  using (minha(org_id) and minha_nota(nota_id));

-- A nota: o dono, e quem ele convidou.
create or replace function public.ve_nota(n uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from notas x
    where x.id = n and minha(x.org_id) and (
      x.dono_id = meu_perfil()
      or exists (select 1 from nota_pessoas p
                 where p.nota_id = x.id and p.perfil_id = meu_perfil())
    )
  );
$$;

-- A conversa de dentro é só do dono, e quem responde por isso é `minha_nota`,
-- definida acima. Compartilhar mostra o que você escreveu, não o que você
-- perguntou à leitura enquanto pensava.
drop policy if exists nt_sel on public.notas;
create policy nt_sel on public.notas for select
  using (minha(org_id) and (dono_id = meu_perfil() or nota_comigo(id)));

-- Escrever continua sendo só do dono: compartilhar é mostrar, não entregar.
-- Duas pessoas editando o mesmo texto sem tempo real é perder texto.

drop policy if exists msg_sel on public.mensagens;
create policy msg_sel on public.mensagens for select
  using (minha(org_id) and (ve_canal(canal_id) or minha_nota(nota_id)));

drop policy if exists msg_ins on public.mensagens;
create policy msg_ins on public.mensagens for insert
  with check (minha(org_id) and ativo()
              and (ve_canal(canal_id) or minha_nota(nota_id)));

drop policy if exists sug_sel on public.sugestoes;
create policy sug_sel on public.sugestoes for select
  using (minha(org_id) and (ve_canal(canal_id) or minha_nota(nota_id)));

drop policy if exists sug_ins on public.sugestoes;
create policy sug_ins on public.sugestoes for insert
  with check (minha(org_id) and (ve_canal(canal_id) or minha_nota(nota_id)));

drop policy if exists sug_upd on public.sugestoes;
create policy sug_upd on public.sugestoes for update
  using (minha(org_id) and (ve_canal(canal_id) or minha_nota(nota_id)))
  with check (minha(org_id) and (ve_canal(canal_id) or minha_nota(nota_id)));

-- O anexo segue a nota: quem pode abrir a nota abre o que está pendurado nela,
-- que é o que faz compartilhar significar alguma coisa quando o assunto é um
-- arquivo. Pendurar continua sendo do dono.
drop policy if exists anx_sel on public.anexos;
create policy anx_sel on public.anexos for select using (
  minha(org_id) and ativo() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and ve_nota(nota_id))
  ));

drop policy if exists anx_ins on public.anexos;
create policy anx_ins on public.anexos for insert with check (
  minha(org_id) and ativo() and autor_id = meu_perfil() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and minha_nota(nota_id))
  ));

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.nota_pessoas';
  exception when duplicate_object then null;
  end;
end $$;

-- --------------------------------------------------------------------------
-- 24. O feedback de quem recebeu o trabalho
--
--     Uma track termina e a única opinião registrada é a de quem a executou.
--     Quem recebeu, que é o cliente de um objetivo ou o chefe de uma rotina,
--     não tem conta no app e nunca vai ter: pedir que ele se cadastre para
--     dizer se gostou é o jeito mais eficiente de nunca saber.
--
--     Então o feedback sai por um **link**, e o link é a credencial. Três
--     cuidados, e nenhum é opcional:
--
--     1. O `token` é longo e sorteado. Ele é a única coisa entre um estranho e
--        a resposta, e link curto é link adivinhável.
--     2. Ele **vence**. Link eterno colado num e-mail de dois anos atrás é uma
--        porta que ninguém lembra que existe.
--     3. Quem abre o link vê o **nome da track e de quem pediu**, e nada mais.
--        Não vê tarefa, não vê gente, não vê as outras tracks. O que vaza por
--        um link público vaza para sempre.
--
--     Nada aqui é enviado sozinho. Quem termina decide pedir, e para quem.
-- --------------------------------------------------------------------------

create table if not exists public.feedbacks (
  id           uuid primary key default gen_random_uuid(),
  fluxo_id     uuid not null references public.fluxos on delete cascade,
  -- A credencial. 43 caracteres de base64url, que é o que 32 bytes dão.
  token        text not null unique,
  pediu_id     uuid references public.perfis on delete set null,
  -- Para quem foi pedido, do jeito que quem pediu escreveu: "Cliente Maurício",
  -- "Fernanda do financeiro". Serve para saber de quem é a resposta, e não é
  -- e-mail nem convite: ninguém entra no app por aqui.
  para         text not null default '',
  vence_em     timestamptz not null default now() + interval '60 days',
  -- A resposta, quando vier.
  respondido_em timestamptz,
  nota         int check (nota is null or nota between 1 and 5),
  texto        text,
  criado_em    timestamptz not null default now()
);

create index if not exists feedbacks_fluxo_idx on public.feedbacks (fluxo_id, criado_em desc);

alter table public.feedbacks enable row level security;

do $$
begin
  execute 'alter table public.feedbacks add column if not exists org_id uuid references public.organizacoes on delete cascade';
  execute 'create index if not exists feedbacks_org_idx on public.feedbacks (org_id)';
  execute 'drop trigger if exists ao_inserir_org on public.feedbacks';
  execute 'create trigger ao_inserir_org before insert on public.feedbacks
             for each row execute function public.carimbar_org()';
end $$;

-- Dentro do app: quem enxerga a track enxerga o que disseram dela. Quem pede é
-- quem responde pelo processo, porque pedir feedback é falar em nome da casa.
drop policy if exists fb_sel on public.feedbacks;
create policy fb_sel on public.feedbacks for select
  using (minha(org_id) and ativo() and ve_fluxo(fluxo_id));

drop policy if exists fb_ins on public.feedbacks;
create policy fb_ins on public.feedbacks for insert
  with check (minha(org_id) and ativo() and manda_no_processo(fluxo_id));

drop policy if exists fb_del on public.feedbacks;
create policy fb_del on public.feedbacks for delete
  using (minha(org_id) and ativo() and manda_no_processo(fluxo_id));

-- De fora ninguém lê e ninguém escreve por aqui: quem atende o link é a rota
-- /api/feedback, com a chave de serviço, e ela devolve só o que pode ser visto.

-- --------------------------------------------------------------------------
-- 25. A nota que vai para o canal é um cartão, e o cartão abre
--
--     Mandar a nota para um canal despejava o texto inteiro como mensagem
--     comum, e isso errava três vezes de uma vez: no meio da conversa ninguém
--     via que aquilo era uma nota; a cópia envelhecia no mesmo instante, porque
--     a nota continua sendo escrita depois; e quem quisesse acompanhar não
--     tinha para onde ir.
--
--     Agora a mensagem APONTA para a nota (`mensagens.nota_ref`) e carrega só
--     o título com o começo do texto, o bastante para decidir abrir. Quem abre
--     ganha a nota de verdade, do mesmo jeito de quem foi convidado: leitura,
--     sem a conversa de dentro, e sempre a versão de agora.
--
--     Abrir é gesto de quem lê, e não convite de quem escreveu. O que autoriza
--     é o canal: quem pôs a nota ali escolheu aquela plateia, e quem não pode
--     ver o canal não pode abrir a nota. Por isso existe esta função e por
--     isso a política de `nota_pessoas` continua recusando que alguém se
--     convide sozinho: sem ela no meio, o id de uma nota qualquer abriria uma
--     nota qualquer.
--
--     Efeito de lado que é bom: quem abriu aparece em "Compartilhada com", e o
--     dono vê quem foi ler. Efeito de lado que não é: tirar alguém dali não
--     adianta enquanto o cartão estiver no canal, porque ele abre de novo.
--     Quem quer cortar o acesso apaga a mensagem.
-- --------------------------------------------------------------------------

alter table public.mensagens add column if not exists nota_ref uuid references public.notas on delete set null;
create index if not exists msg_nota_ref_idx on public.mensagens (nota_ref) where nota_ref is not null;

create or replace function public.abrir_nota_do_canal(n uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if minha_nota(n) or nota_comigo(n) then return true; end if;

  if not exists (
    select 1 from mensagens m
    where m.nota_ref = n and m.canal_id is not null and ve_canal(m.canal_id)
  ) then
    raise exception 'Esta nota não foi compartilhada em nenhuma conversa sua.';
  end if;

  -- O carimbo de organização vem do gatilho, como em toda tabela etiquetada.
  insert into nota_pessoas (nota_id, perfil_id) values (n, meu_perfil())
  on conflict do nothing;
  return true;
end $$;

-- --------------------------------------------------------------------------
-- 26. No cadastro se escolhe empresarial ou pessoal
--
--     A escolha existia só depois de entrar, no seletor de espaços: quem se
--     cadastrava abria uma empresa, sempre, mesmo tendo dito que era para si.
--     Agora `novo_usuario` lê `espaco` nos dados do cadastro e abre a
--     organização com `tipo='pessoal'`, com o nome da própria pessoa.
--
--     O resto não muda, e é de propósito: é o mesmo perfil, admin e dono do
--     que abriu, o mesmo trigger e a mesma sessão. O que diferencia os dois
--     produtos é `organizacoes.tipo`, lido por `recursos()` em lib/espaco.ts, e
--     as quatro recusas da seção 20. Um segundo caminho de cadastro seria uma
--     segunda chance de os dois saírem do lugar.
--
--     O nome do espaço pessoal é o nome da pessoa porque não há o que
--     perguntar: quem escolheu "só para mim" já respondeu de quem é. Pedir
--     "nome da organização" ali é devolver a pergunta que ela acabou de
--     responder.
-- --------------------------------------------------------------------------

create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cv        convites%rowtype;
  v_org     uuid;
  v_nome    text := nullif(btrim(new.raw_user_meta_data->>'organizacao'), '');
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')));
  v_espaco  text := lower(btrim(coalesce(new.raw_user_meta_data->>'espaco', '')));
  v_eu      text := nullif(btrim(new.raw_user_meta_data->>'nome'), '');
  v_papel   text := 'colaborador';
  v_ativo   boolean := false;
  v_dono    boolean := false;
  v_perfil  uuid;
  v_ve_area boolean := false;
  v_area    uuid;
  v_gestor  uuid;
  n int;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6A5E','#B5A08C'];
begin
  select * into cv from convites
  where usado_em is null
    and (vence_em is null or vence_em > now())
    and (
      (v_codigo <> '' and codigo = v_codigo)
      or lower(email) = lower(new.email)
    )
  order by (v_codigo <> '' and codigo = v_codigo) desc
  limit 1;

  if cv.id is not null then
    -- 1. Convite manda em tudo. A conta nasce pronta e liberada, e o convite
    --    nunca aponta para espaço pessoal (gatilho convites_so_equipe, seção 20).
    v_org := cv.org_id;
    v_papel := coalesce(cv.papel, 'colaborador');
    v_area := cv.area_id;
    v_gestor := cv.gestor_id;
    v_ve_area := coalesce(cv.ve_area, false);
    v_ativo := true;
  else
    -- 2. Espaço novo, e quem abre é a administradora dele. É o único jeito de a
    --    conta nascer admin sem alguém ter dito que pode. O tipo vem do que a
    --    pessoa escolheu no cadastro; o nome do pessoal é o nome dela.
    insert into organizacoes (nome, tipo)
    values (
      case when v_espaco = 'pessoal'
        then coalesce(v_eu, initcap(split_part(new.email, '@', 1)))
        else coalesce(v_nome, initcap(split_part(new.email, '@', 1)))
      end,
      case when v_espaco = 'pessoal' then 'pessoal' else 'equipe' end
    )
    returning id into v_org;
    v_papel := 'admin';
    v_ativo := true;
    v_dono := true;
    v_ve_area := true;
  end if;

  select count(*) into n from perfis where org_id = v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id, v_org,
    coalesce(
      v_eu,
      nullif(btrim(cv.nome), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    paleta[(n % 8) + 1],
    v_papel, v_area, v_gestor, v_ve_area, v_ativo
  )
  on conflict (user_id, org_id) do nothing
  returning id into v_perfil;

  if v_dono and v_perfil is not null then
    update organizacoes set dono_id = v_perfil where id = v_org;
  end if;
  if v_perfil is not null then
    insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
    on conflict (user_id) do update set perfil_id = excluded.perfil_id;
  end if;
  if cv.id is not null then
    update convites set usado_em = now(), usado_por = v_perfil where id = cv.id;
  end if;
  return new;
end $$;

-- --------------------------------------------------------------------------
-- 27. Mais três avisos, e nenhum deles é barulho
--
--     A caixa avisava de tarefa, aprovação, prazo, trava e menção: tudo que
--     acontece DENTRO de uma track. O que acontecia ao lado dela não chegava a
--     ninguém, e o caso que mostrou isso foi a nota compartilhada: a pessoa
--     liberava a leitura e a outra só descobria se abrisse o caderno e
--     reparasse numa linha nova no meio das dela.
--
--     Os três que entram têm a mesma forma: alguém fez uma coisa que só faz
--     sentido se a outra pessoa ficar sabendo.
--
--     - `nota`     compartilharam uma nota com você
--     - `feedback` responderam o link que você mandou
--     - `mensagem` falaram com você numa conversa direta
--
--     **Nenhum é urgente**, e isso não é descuido: urgente é o que já venceu, o
--     que trava outra pessoa e o que só você destrava. Nota compartilhada não
--     é nada disso, e tocar o celular de alguém por causa dela é o começo do
--     caminho em que a pessoa desliga tudo.
--
--     O da conversa direta é **um por conversa por dia**, e é a chave que faz
--     isso: `direto:<canal>:<dia>`. Um aviso por mensagem transformaria o sino
--     num segundo chat, e quem manda três frases seguidas geraria três avisos
--     para dizer uma coisa. Canal de equipe continua de fora: lá o que chama
--     alguém é a menção, que já avisa.
--
--     O aviso de nota não dispara quando é você que se põe na lista, que é o
--     que acontece ao abrir um cartão no canal (seção 25): ninguém precisa ser
--     avisado do que acabou de fazer.
-- --------------------------------------------------------------------------

-- Para onde o aviso leva, quando o destino é uma nota.
alter table public.avisos add column if not exists nota_id uuid references public.notas on delete cascade;

do $$
begin
  alter table public.avisos drop constraint if exists avisos_tipo_check;
  alter table public.avisos add constraint avisos_tipo_check check (tipo in (
    'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo',
    'nota','feedback','mensagem'));
end $$;

-- `avisar()` ganha o destino de nota. Assinatura nova, então a antiga sai.
drop function if exists public.avisar(uuid, text, text, text, text, boolean, uuid, uuid, uuid, uuid);

create or replace function public.avisar(
  p_perfil uuid, p_tipo text, p_titulo text, p_corpo text, p_chave text,
  p_urgente boolean default false,
  p_fluxo uuid default null, p_item uuid default null,
  p_etapa uuid default null, p_canal uuid default null,
  p_nota uuid default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid;
begin
  if p_perfil is null or coalesce(btrim(p_chave), '') = '' then return false; end if;
  -- Quem está desativado não recebe: acesso suspenso é acesso suspenso.
  select org_id into v_org from perfis where id = p_perfil and ativo;
  if v_org is null then return false; end if;

  insert into avisos (org_id, perfil_id, tipo, titulo, corpo, chave, urgente,
                      fluxo_id, item_id, etapa_id, canal_id, nota_id)
  values (v_org, p_perfil, p_tipo, p_titulo, coalesce(p_corpo, ''), p_chave,
          coalesce(p_urgente, false), p_fluxo, p_item, p_etapa, p_canal, p_nota)
  on conflict (perfil_id, chave) do nothing
  returning id into v_id;
  return v_id is not null;
end $$;

-- Compartilharam uma nota com você.
create or replace function public.aviso_nota()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_titulo text; v_dono uuid; v_quem text;
begin
  -- Quem se põe na lista sozinho está abrindo um cartão de canal. Não se avisa
  -- ninguém do que ela mesma acabou de fazer.
  if new.perfil_id = meu_perfil() then return new; end if;

  select titulo, dono_id into v_titulo, v_dono from notas where id = new.nota_id;
  select nome into v_quem from perfis where id = v_dono;

  perform avisar(
    new.perfil_id, 'nota', 'Compartilharam uma nota com você',
    coalesce(v_titulo, 'Nota') || coalesce(' · ' || v_quem, ''),
    'nota:' || new.nota_id::text || ':' || new.perfil_id::text,
    false, null, null, null, null, new.nota_id);
  return new;
end $$;

drop trigger if exists ao_compartilhar_nota on public.nota_pessoas;
create trigger ao_compartilhar_nota
  after insert on public.nota_pessoas
  for each row execute function public.aviso_nota();

-- Responderam o link de feedback que você mandou.
create or replace function public.aviso_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fluxo text;
begin
  if new.respondido_em is null or old.respondido_em is not null then return new; end if;
  select nome into v_fluxo from fluxos where id = new.fluxo_id;
  perform avisar(
    new.pediu_id, 'feedback', 'Responderam o seu pedido de feedback',
    coalesce(nullif(btrim(new.para), ''), 'Quem recebeu') || ' deu '
      || coalesce(new.nota::text, '?') || ' de 5' || coalesce(' · ' || v_fluxo, ''),
    'feedback:' || new.id::text,
    false, new.fluxo_id, null, null, null, null);
  return new;
end $$;

drop trigger if exists ao_responder_feedback on public.feedbacks;
create trigger ao_responder_feedback
  after update on public.feedbacks
  for each row execute function public.aviso_feedback();

-- Falaram com você numa conversa direta. Um por conversa por dia.
create or replace function public.aviso_direto()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tipo text; v_quem text; p record;
begin
  if new.canal_id is null or new.sistema then return new; end if;
  select tipo into v_tipo from canais where id = new.canal_id;
  if v_tipo <> 'direto' then return new; end if;

  select nome into v_quem from perfis where id = new.autor_id;
  for p in
    select perfil_id from canal_membros
    where canal_id = new.canal_id and perfil_id <> new.autor_id
  loop
    perform avisar(
      p.perfil_id, 'mensagem', coalesce(v_quem, 'Alguém') || ' falou com você',
      left(new.texto, 120),
      'direto:' || new.canal_id::text || ':' || to_char(now(), 'YYYY-MM-DD'),
      false, null, null, null, new.canal_id, null);
  end loop;
  return new;
end $$;

drop trigger if exists ao_falar_direto on public.mensagens;
create trigger ao_falar_direto
  after insert on public.mensagens
  for each row execute function public.aviso_direto();

-- --------------------------------------------------------------------------
-- 28. O tutorial da primeira vez
--
--     Quem viu o tutorial fica marcado no PERFIL, e não no navegador: é da
--     pessoa, não do aparelho. Quem passou por ele no computador não deve ver
--     tudo de novo ao abrir no telefone, e o contrário é pior ainda.
--
--     A coluna nasce preenchida para quem já está aqui. Tutorial existe para a
--     primeira vez, e soltá-lo na cara de quem usa o app há meses é uma caixa
--     na frente do trabalho dela. O preenchimento acontece só no momento em que
--     a coluna é criada, e é por isso que ele está dentro do `if`: solto, uma
--     segunda passada deste arquivo marcaria como visto quem se cadastrou
--     ontem e ainda não abriu o app.
--
--     Limpar o campo é o que faz "ver o tutorial de novo", em Ajustes, e por
--     isso a pessoa precisa poder escrever nele: `proteger_perfil` já deixa,
--     porque só trava organização, login, papel, e-mail e acesso.
-- --------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis' and column_name = 'tutorial_em'
  ) then
    alter table public.perfis add column tutorial_em timestamptz;
    update public.perfis set tutorial_em = now();
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 29. Um tutorial por tela, e não um só
--
--     Era uma coluna de sim ou não (`tutorial_em`), porque era um tour só, o
--     da tela inicial. Agora cada tela tem a volta guiada dela, que abre na
--     primeira vez que a pessoa chega ali, e a pergunta deixou de ser "ela já
--     viu?" para ser "esta tela aqui, ela já viu?". Daí a lista.
--
--     Quarenta passos de enfiada no primeiro acesso é um folheto, e ninguém lê
--     folheto: a pessoa pula e nunca mais vê. Três passos no dia em que ela
--     abriu Tracks pela primeira vez, ela lê.
--
--     A migração respeita quem já passou pelo tour da inicial: quem tem
--     `tutorial_em` preenchido nasce com 'inicio' na lista, e não vê aquele de
--     novo. As outras telas ele ainda não viu, então essas abrem normalmente.
--
--     `tutorial_em` fica onde está. Ela não custa nada e é o registro de quando
--     a pessoa entrou de primeira; apagar coluna por causa de rótulo novo é
--     trocar dívida barata por cara.
-- --------------------------------------------------------------------------

alter table public.perfis add column if not exists tutoriais text[] not null default '{}';

update public.perfis
   set tutoriais = array['inicio']
 where tutorial_em is not null
   and not ('inicio' = any(tutoriais));

-- --------------------------------------------------------------------------
-- 30. Os planos, e o que eles recusam
--
--     A cobrança acontece FORA do app, por contrato, e quem liga o plano é a
--     operação do TrackWard pelo SQL Editor, nunca o administrador do cliente:
--     se o admin dele pudesse escolher, escolheria o maior. Por isso não existe
--     política de update de plano para ninguém, e existe `supabase/planos.sql`.
--
--     São quatro recusas, e todas no banco pelo motivo de sempre: a tela
--     esconde o botão, e quem manda um insert pela API entra assim mesmo.
--
--     1. Assento. O Enterprise é por pessoa ativa, então convidar e reativar
--        param quando o número bate no contratado.
--     2. Criar. O modo reduzido (teste vencido) deixa LER tudo e terminar o que
--        já estava em pé, e não deixa começar nada. Trancar ou apagar os dados
--        de quem estava avaliando é sequestro, e quem passa por isso não volta;
--        sem poder criar, o app deixa de servir para trabalhar em duas horas,
--        que é o aperto que a decisão precisa.
--     3. O teto de leituras passa a contar por assento no Enterprise, porque o
--        custo de IA anda com o tamanho da equipe.
--     4. O desconto do pessoal cai quando a pessoa sai da empresa, e o app
--        precisa DIZER isso: a cobrança é na mão, e ninguém vai olhar.
--
--     O teste vence por data comparada na hora, e não por um serviço que vira
--     o plano à meia-noite: enquanto o serviço não roda, o cliente usa de graça,
--     e é mais uma peça para dar errado.
-- --------------------------------------------------------------------------

alter table public.organizacoes add column if not exists assentos int;
alter table public.organizacoes add column if not exists teste_ate timestamptz;
-- Quem paga, e desde quando. Só para a operação saber a quem cobrar; o app não
-- lê estes dois, e é de propósito: preço não aparece em tela nenhuma enquanto a
-- cobrança for por contrato, senão um dia o número da tela e o do contrato
-- discordam e quem está errado é sempre o que o cliente viu.
alter table public.organizacoes add column if not exists paga_desde date;
alter table public.organizacoes add column if not exists obs_plano text;

do $$
begin
  -- Conta que já existe entrou antes de haver plano: ela vira interna, e a
  -- operação reclassifica uma a uma. Deixar tudo em 'teste' derrubaria clientes
  -- de verdade para o modo reduzido no dia seguinte.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizacoes' and column_name = 'teste_ate'
      and column_default is not null
  ) then
    update organizacoes set plano = 'interno' where plano in ('padrao', 'piloto');
  end if;
end $$;

-- Quem se cadastra a partir de agora começa em teste, com catorze dias.
alter table public.organizacoes alter column plano set default 'teste';

/** O plano em vigor, já contando o fim do teste. Espelha planoDe() em lib/planos.ts. */
create or replace function public.plano_em_vigor(o uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when x.plano <> 'teste' then x.plano
    when x.teste_ate is null or x.teste_ate < now() then 'reduzido'
    else 'teste'
  end
  from organizacoes x where x.id = o;
$$;

/** Pode criar coisa nova aqui? Falso só no modo reduzido. */
create or replace function public.pode_criar()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(plano_em_vigor(minha_org()) <> 'reduzido', false);
$$;

/** Quantas pessoas ativas há neste espaço. */
create or replace function public.assentos_usados(o uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int from perfis where org_id = o and ativo;
$$;

/**
 * O assento acabou.
 *
 * Vale para o convite e para a reativação de alguém desligado, que são as duas
 * portas de entrada. O convite conta como assento desde que é criado, e não só
 * quando é aceito: senão dá para mandar vinte convites num plano de cinco e a
 * conta estoura quando todos entrarem, com a culpa caindo em quem aceitou.
 */
create or replace function public.cabe_mais_um(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select assentos from organizacoes where id = o) is null then true
    else assentos_usados(o)
       + (select count(*) from convites c
           where c.org_id = o and c.usado_em is null
             and (c.vence_em is null or c.vence_em > now()))
       < (select assentos from organizacoes where id = o)
  end;
$$;

create or replace function public.travar_assento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not cabe_mais_um(new.org_id) then
    raise exception 'Os assentos do plano acabaram. Fale com o TrackWard para aumentar.';
  end if;
  return new;
end $$;

drop trigger if exists convite_cabe on public.convites;
create trigger convite_cabe before insert on public.convites
  for each row execute function public.travar_assento();

create or replace function public.reativar_cabe()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Só na volta de alguém desligado. Quem já está ativo continua ativo, e o
  -- perfil que nasce junto com a organização não pode esbarrar em si mesmo.
  if new.ativo and not coalesce(old.ativo, false) and not cabe_mais_um(new.org_id) then
    raise exception 'Os assentos do plano acabaram. Fale com o TrackWard para aumentar.';
  end if;
  return new;
end $$;

drop trigger if exists perfil_cabe on public.perfis;
create trigger perfil_cabe before update on public.perfis
  for each row execute function public.reativar_cabe();

/**
 * O modo reduzido recusa criar.
 *
 * O laço cobre as tabelas onde nasce trabalho. Ler, editar o que já existe e
 * concluir continuam abertos: o que se tira é o começar, e não o acabar. Quem
 * está no meio de uma track precisa poder terminá-la.
 */
do $$
declare t text; n int := 0;
begin
  execute $f$
    create or replace function public.travar_criacao()
    returns trigger language plpgsql security definer set search_path = public as $x$
    begin
      if not pode_criar() then
        raise exception 'O teste acabou. Dá para ler e terminar o que já começou; para criar coisa nova, contrate um plano.';
      end if;
      return new;
    end $x$;
  $f$;
  for t in select unnest(array[
    'fluxos','itens','notas','canais','compromissos','processos','agentes','conectores','areas'
  ]) loop
    continue when to_regclass('public.' || t) is null;
    execute format('drop trigger if exists so_com_plano on public.%I', t);
    execute format('create trigger so_com_plano before insert on public.%I
                      for each row execute function public.travar_criacao()', t);
    n := n + 1;
  end loop;
  raise notice 'Trava de criação em % tabelas.', n;
end $$;

-- O teto de leituras passa a contar por assento no Enterprise.
create or replace function public.pode_chamar_modelo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select o.ia_ativa
       and plano_em_vigor(o.id) <> 'reduzido'
       and (o.limite_leituras is null
            or leituras_do_mes() < o.limite_leituras
              * case when plano_em_vigor(o.id) = 'equipe' then greatest(1, assentos_usados(o.id)) else 1 end)
      from organizacoes o where o.id = minha_org()
  ), false);
$$;

-- --------------------------------------------------------------------------
-- O pulso: as mesmas perguntas do teto, mas por organização
-- --------------------------------------------------------------------------
--
-- A leitura automática roda num relógio, e relógio não tem sessão. Todas as
-- funções acima respondem sobre `minha_org()`, e sem sessão `minha_org()` é
-- nulo: elas devolveriam "não pode" para todo mundo, sempre.
--
-- Por isso estas três recebem a organização por parâmetro. E é exatamente aí
-- que mora o perigo: uma função `security definer` que aceita o id de qualquer
-- empresa é a forma clássica de vazamento, porque qualquer pessoa logada
-- poderia perguntar pela empresa do vizinho, ou pior, gravar consumo na conta
-- dela para estourar o teto alheio.
--
-- A trava não é um `if` dentro da função, é a permissão de execução: elas são
-- negadas a anon e a authenticated, e liberadas só para service_role. O
-- Postgres confere isso antes de a função rodar, então não há como contornar
-- pelo corpo dela.

create or replace function public.leituras_do_mes_de(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int
  from consumo
  where org_id = p_org and onde = 'leitor'
    and criado_em >= date_trunc('month', now());
$$;

/** Esta organização pode gastar agora, e com qual modelo. */
create or replace function public.pulso_pode(p_org uuid)
returns table (pode boolean, modelo text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(
      o.ia_ativa
      and plano_em_vigor(o.id) <> 'reduzido'
      and (o.limite_leituras is null
           or leituras_do_mes_de(o.id) < o.limite_leituras
             * case when plano_em_vigor(o.id) = 'equipe'
                    then greatest(1, assentos_usados(o.id)) else 1 end),
      false),
    coalesce(nullif(btrim(o.modelo_ia), ''), '')
  from organizacoes o
  where o.id = p_org;
$$;

/**
 * Grava o gasto de uma leitura automática.
 *
 * perfil_id fica nulo de propósito: ninguém fez, o relógio fez. É a mesma
 * assinatura que o resto do app usa para separar o que foi gente do que foi
 * máquina.
 */
create or replace function public.registrar_consumo_de(
  p_org uuid, p_onde text, p_modelo text,
  p_entrada int, p_saida int, p_cache_leitura int, p_cache_escrita int,
  p_custo_micro bigint, p_canal uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_org is null then return; end if;
  insert into consumo (
    org_id, onde, modelo, entrada, saida, cache_leitura, cache_escrita,
    custo_micro, perfil_id, canal_id
  ) values (
    p_org, coalesce(nullif(btrim(p_onde), ''), 'leitor'), p_modelo,
    greatest(0, coalesce(p_entrada, 0)), greatest(0, coalesce(p_saida, 0)),
    greatest(0, coalesce(p_cache_leitura, 0)), greatest(0, coalesce(p_cache_escrita, 0)),
    greatest(0, coalesce(p_custo_micro, 0)), null, p_canal
  );
end $$;

-- A trava. Sem estas três linhas, as funções acima seriam um buraco na parede.
do $$
declare f text;
begin
  foreach f in array array[
    'public.leituras_do_mes_de(uuid)',
    'public.pulso_pode(uuid)',
    'public.registrar_consumo_de(uuid,text,text,int,int,int,int,bigint,uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
exception when undefined_object then null;
end $$;


/**
 * Este login tem desconto no espaço pessoal?
 *
 * Tem quem está ATIVO numa empresa que paga. É desconto de quem já é cliente
 * por outro lado, então some no dia em que a pessoa sai da empresa, e o app
 * precisa dizer isso em vez de deixar a operação descobrir três meses depois:
 * a cobrança é feita na mão.
 *
 * `definer` porque a pergunta atravessa espaços, e as políticas de `perfis`
 * mostram só os seus. A resposta é um sim ou não sobre você mesmo, então não
 * vaza nada de ninguém.
 */
create or replace function public.desconto_do_pessoal()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p join organizacoes o on o.id = p.org_id
    where p.user_id = auth.uid() and p.ativo
      and o.tipo = 'equipe'
      and plano_em_vigor(o.id) in ('equipe', 'interno')
  );
$$;

/**
 * Perdeu o desconto: saiu da última empresa que pagava.
 *
 * O aviso vai para a pessoa, no espaço pessoal dela, e a chave carrega o mês
 * para ele não voltar todo dia. Quem cobra é gente, e gente precisa ser
 * avisada, porque plano que continua barato depois que o motivo acabou é
 * receita que some sem ninguém notar.
 */
create or replace function public.aviso_desconto()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pessoal uuid; v_perfil uuid;
begin
  if coalesce(old.ativo, false) and not new.ativo then
    if exists (
      select 1 from perfis p join organizacoes o on o.id = p.org_id
      where p.user_id = new.user_id and p.ativo and p.id <> new.id
        and o.tipo = 'equipe' and plano_em_vigor(o.id) in ('equipe', 'interno')
    ) then
      return new;
    end if;
    select p.id, p.org_id into v_perfil, v_pessoal
    from perfis p join organizacoes o on o.id = p.org_id
    where p.user_id = new.user_id and p.ativo and o.tipo = 'pessoal'
    limit 1;
    if v_perfil is not null then
      perform avisar(
        v_perfil, 'prazo', 'O desconto do seu espaço pessoal acabou',
        'Ele valia enquanto você estava numa empresa que usa o TrackWard. O espaço continua '
        || 'seu, com tudo dentro, e passa a custar o valor normal.',
        'desconto:' || v_perfil::text || ':' || to_char(now(), 'YYYY-MM'),
        false, null, null, null, null, null);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists ao_perder_desconto on public.perfis;
create trigger ao_perder_desconto after update on public.perfis
  for each row execute function public.aviso_desconto();

/**
 * Todo espaço novo nasce com catorze dias.
 *
 * Num gatilho, e não dentro de `novo_usuario`, porque há duas portas: o
 * cadastro e o `abrir_espaco` de quem já está dentro e abre mais um. Escrito
 * nas duas, um dia alguém mexe numa e esquece a outra, e aquele caminho passa a
 * dar teste eterno.
 */
create or replace function public.comecar_teste()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.plano = 'teste' and new.teste_ate is null then
    new.teste_ate := now() + interval '14 days';
  end if;
  return new;
end $$;

drop trigger if exists ao_nascer_org on public.organizacoes;
create trigger ao_nascer_org before insert on public.organizacoes
  for each row execute function public.comecar_teste();

-- --------------------------------------------------------------------------
-- 31. A trilha se monta checkpoint por checkpoint, e o passado fica onde está
--
--     Montar a track inteira num formulário só é decidir tudo antes de saber:
--     ninguém conhece os sete checkpoints de uma obra no dia em que ela começa.
--     Agora a trilha se edita depois, um checkpoint de cada vez, dentro da
--     track que já existe.
--
--     Só que `salvar_fluxo` reescreve `ordem` pela posição no array, e `atual`
--     é um NÚMERO. Reordenar um checkpoint que já passou faria `atual` apontar
--     para a mesma posição e para outro checkpoint: a track mudaria de lugar em
--     silêncio, e as decisões registradas deixariam de casar com a trilha. Um
--     defeito que ninguém percebe na hora e que ninguém consegue explicar
--     depois.
--
--     A regra, então: **enquanto nada aconteceu, mexa à vontade; depois que a
--     track começou, o que já passou e o de agora ficam onde estão.** Continua
--     dando para renomear, trocar critério, aprovador e prazo desses: o que
--     congela é a POSIÇÃO, não o conteúdo. E do próximo em diante é livre,
--     porque o futuro ainda não é história de ninguém.
--
--     Isto é trava de banco, e não de tela, pelo motivo de sempre: a tela
--     esconde o botão de subir, e um `salvar_fluxo` mandado pela API reordena
--     do mesmo jeito.
-- --------------------------------------------------------------------------

/**
 * A track já começou?
 *
 * Começou quando ela saiu do primeiro checkpoint, quando alguém decidiu alguma
 * coisa, ou quando alguma tarefa foi concluída. Antes disso ela é rascunho, e
 * rascunho se remonta à vontade.
 */
create or replace function public.trilha_comecou(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select atual from fluxos where id = f), 0) > 0
     or exists (select 1 from decisoes where fluxo_id = f)
     or exists (select 1 from itens where fluxo_id = f and feito);
$$;

create or replace function public.salvar_fluxo(
  p_fluxo jsonb, p_etapas jsonb, p_como uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := quem_age(p_como);
  v_id  uuid := nullif(p_fluxo->>'id', '')::uuid;
  e     jsonb;
  k     int := 0;
  eid   uuid;
  ids   uuid[] := '{}';
  v_atual int;
  antigo  uuid;
  novo    text;
begin
  -- Sem `ativo()`: quem confere é `quem_age()`, que já levanta 'Sem acesso.'
  -- e sabe responder pelos dois casos. `ativo()` pergunta pela SESSÃO, que é
  -- exatamente o que não existe quando quem chama é o servidor.
  if jsonb_array_length(p_etapas) < 1 then raise exception 'O fluxo precisa de pelo menos um checkpoint.'; end if;

  if v_id is null then
    insert into fluxos (tipo, nome, area_id, empresa_id, dono_id, autor_id, visib, freq, periodo)
    values (
      p_fluxo->>'tipo',
      btrim(p_fluxo->>'nome'),
      nullif(p_fluxo->>'area_id', '')::uuid,
      nullif(p_fluxo->>'empresa_id', '')::uuid,
      nullif(p_fluxo->>'dono_id', '')::uuid,
      uid,
      coalesce(nullif(p_fluxo->>'visib', ''), 'equipe'),
      nullif(p_fluxo->>'freq', ''),
      nullif(p_fluxo->>'periodo', '')
    )
    returning id into v_id;
    insert into atividades (fluxo_id, quem_id, texto)
    values (v_id, uid, case when p_fluxo->>'tipo' = 'ciclo' then 'criou a rotina' else 'criou o projeto' end);
  else
    if not ve_fluxo(v_id) then raise exception 'Sem acesso a esta esteira.'; end if;
    if not manda_no_processo(v_id) then
      raise exception 'Só quem responde por esta esteira pode mudar os checkpoints e os prazos.';
    end if;

    -- O passado e o presente ficam onde estão. Conferido antes de escrever
    -- qualquer coisa, para a recusa não deixar a trilha pela metade.
    if trilha_comecou(v_id) then
      select atual into v_atual from fluxos where id = v_id;
      for k in 0 .. v_atual loop
        select id into antigo from etapas where fluxo_id = v_id and ordem = k;
        novo := p_etapas->k->>'id';
        if antigo is null then continue; end if;
        if novo is null or novo = '' or novo::uuid <> antigo then
          raise exception 'A track já começou: o checkpoint % e os anteriores não mudam de lugar. Do próximo em diante, reordene à vontade.', k + 1;
        end if;
      end loop;
      k := 0;
    end if;

    update fluxos set
      nome       = btrim(p_fluxo->>'nome'),
      area_id    = nullif(p_fluxo->>'area_id', '')::uuid,
      empresa_id = nullif(p_fluxo->>'empresa_id', '')::uuid,
      dono_id  = nullif(p_fluxo->>'dono_id', '')::uuid,
      visib    = case when autor_id = uid
                      then coalesce(nullif(p_fluxo->>'visib', ''), 'equipe')
                      else visib end,
      freq     = nullif(p_fluxo->>'freq', ''),
      periodo  = nullif(p_fluxo->>'periodo', '')
    where id = v_id;
    insert into atividades (fluxo_id, quem_id, texto) values (v_id, uid, 'editou a esteira');
  end if;

  for e in select value from jsonb_array_elements(p_etapas) loop
    if nullif(e->>'id', '') is null then
      insert into etapas (fluxo_id, ordem, nome, criterio, aprovador_id, prazo)
      values (v_id, k, btrim(e->>'nome'), coalesce(e->>'criterio', ''),
              nullif(e->>'aprovador_id', '')::uuid, nullif(e->>'prazo', '')::date)
      returning id into eid;
    else
      eid := (e->>'id')::uuid;
      update etapas set
        ordem        = k,
        nome         = btrim(e->>'nome'),
        criterio     = coalesce(e->>'criterio', ''),
        aprovador_id = nullif(e->>'aprovador_id', '')::uuid,
        prazo        = nullif(e->>'prazo', '')::date
      where id = eid and fluxo_id = v_id;
    end if;
    ids := ids || eid;
    k := k + 1;
  end loop;

  delete from etapas where fluxo_id = v_id and not (id = any(ids));
  update fluxos set atual = least(atual, k - 1) where id = v_id;
  return v_id;
end $$;

-- --------------------------------------------------------------------------
-- 32. O que ficou perguntado e ainda não teve resposta
--
--     É o miolo do WhatsApp de ida e volta. Lá fora não existe tela: a pessoa
--     responde "pronto" e pronto não quer dizer nada sozinho. Só quer dizer
--     alguma coisa junto do que foi perguntado antes, e é isto que esta tabela
--     guarda.
--
--     `msg_externa_id` é o id da mensagem no provedor, e é o que permite o
--     casamento CERTO: quando a pessoa responde citando, não há o que
--     interpretar. Os outros três mecanismos (uma só em aberto, a frase nomeia,
--     a escolha por número) estão em `lib/casar.ts`, e a regra que manda em
--     todos é a mesma: **na dúvida, perguntar**. Errar aqui não é mostrar a
--     tela errada, é marcar como pronto o que não está, ou aprovar o que não
--     devia, em nome de alguém.
--
--     **A pergunta vence.** Duas noites depois, um "pronto" solto quase
--     certamente responde a outra coisa: a pessoa esqueceu, e o app não pode
--     fingir que ela lembra. Vencida, ela sai do casamento e o app pergunta de
--     novo se ainda importar.
--
--     A caixa é de uma pessoa e de mais ninguém, inclusive do administrador,
--     pelo mesmo motivo de `avisos`: aqui dentro aparece texto de tarefa
--     privada e de canal fechado, e isto não pode virar a porta dos fundos das
--     regras de quem vê o quê. Quem escreve é o servidor, com a chave de
--     serviço; não há política de insert para gente nenhuma.
-- --------------------------------------------------------------------------

create table if not exists public.perguntas_abertas (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizacoes on delete cascade,
  perfil_id    uuid not null references public.perfis on delete cascade,
  sobre_tipo   text not null check (sobre_tipo in
                 ('item','etapa','prazo','nota','diagnostico','triagem')),
  -- Nulo em triagem e diagnóstico: ali a pergunta é sobre o que a pessoa
  -- acabou de mandar, que ainda não é nada no banco.
  sobre_id     uuid,
  texto        text not null,
  -- O id da mensagem no provedor. Nulo enquanto o envio não confirmou.
  msg_externa_id text,
  -- [{"chave":"1","rotulo":"Conciliação"}], quando a pergunta foi com lista.
  opcoes       jsonb,
  criado_em    timestamptz not null default now(),
  respondido_em timestamptz,
  -- Dois dias. Ver o comentário acima: pergunta velha casa errado.
  expirou_em   timestamptz not null default now() + interval '2 days'
);

alter table public.perguntas_abertas enable row level security;

create index if not exists pergunta_aberta_idx on public.perguntas_abertas (perfil_id, criado_em desc)
  where respondido_em is null;
create index if not exists pergunta_externa_idx on public.perguntas_abertas (msg_externa_id)
  where msg_externa_id is not null;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.perguntas_abertas';
  execute 'create trigger ao_inserir_org before insert on public.perguntas_abertas
             for each row execute function public.carimbar_org()';
end $$;

-- A pessoa lê e responde as dela. Escrever pergunta é do servidor: sem política
-- de insert, e a chave de serviço passa por cima de RLS, que é o que se quer.
drop policy if exists pa_sel on public.perguntas_abertas;
create policy pa_sel on public.perguntas_abertas for select
  using (minha(org_id) and perfil_id = meu_perfil());

drop policy if exists pa_upd on public.perguntas_abertas;
create policy pa_upd on public.perguntas_abertas for update
  using (minha(org_id) and perfil_id = meu_perfil())
  with check (minha(org_id) and perfil_id = meu_perfil());

/**
 * As perguntas que ainda valem para esta pessoa.
 *
 * `security definer` porque quem chama é a rota do WhatsApp, que não tem
 * sessão: ela sabe de qual telefone veio a mensagem e resolve o perfil por
 * `avisos_contato`, que é onde o telefone mora.
 */
create or replace function public.perguntas_de(p_perfil uuid)
returns setof public.perguntas_abertas
language sql stable security definer set search_path = public as $$
  select * from perguntas_abertas
  where perfil_id = p_perfil
    and respondido_em is null
    and expirou_em > now()
  order by criado_em desc;
$$;

/**
 * De quem é este telefone.
 *
 * Telefone NÃO é senha, e esta função não finge que é: ela só diz de quem é o
 * número. O que exige confirmação (aprovar checkpoint, prorrogar prazo, aceitar
 * cascata) pede botão explícito do outro lado, e não texto livre interpretado.
 *
 * Número desconhecido devolve nada, e a rota responde educadamente sem contar
 * o que existe aqui dentro: quem manda mensagem para um número errado não pode
 * descobrir quem é cliente do TrackWard.
 */
create or replace function public.perfil_do_telefone(p_fone text)
returns uuid language sql stable security definer set search_path = public as $$
  select c.perfil_id from avisos_contato c
  join perfis p on p.id = c.perfil_id and p.ativo
  where regexp_replace(c.telefone, '[^0-9]', '', 'g')
      = regexp_replace(coalesce(p_fone, ''), '[^0-9]', '', 'g')
    and regexp_replace(coalesce(p_fone, ''), '[^0-9]', '', 'g') <> ''
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- 33. O carimbo faltava justo em quem guarda o telefone
--
--     `avisos_contato` e `push_assinaturas` exigem `org_id` e ficaram de fora
--     da lista do carimbo. Como a tela não manda esse campo (e não deve: quem
--     assina a organização é o banco), **salvar o próprio telefone falhava
--     sempre**, com um "não deu para salvar" que não dizia o motivo.
--
--     O efeito passou quatro dias sem ninguém ver: as duas tabelas estavam
--     vazias, e é nelas que mora quem quer ser avisado. Ou seja, push e
--     WhatsApp nunca tiveram como ser ligados por ninguém, e o bloco B depende
--     de `avisos_contato.telefone` para saber de quem é a mensagem que chega.
--
--     `avisos` continua FORA da lista, e isso é de propósito: quem escreve lá é
--     `avisar()`, que já põe a organização da pessoa avisada. O carimbo usa
--     `minha_org()`, que é a de quem age, e quem age quase nunca é quem precisa
--     ser avisado: o gatilho poria a organização errada na caixa de alguém.
-- --------------------------------------------------------------------------

do $$
declare t text; n int := 0;
begin
  for t in select unnest(array['avisos_contato','push_assinaturas']) loop
    continue when to_regclass('public.' || t) is null;
    execute format('drop trigger if exists ao_inserir_org on public.%I', t);
    execute format('create trigger ao_inserir_org before insert on public.%I
                      for each row execute function public.carimbar_org()', t);
    n := n + 1;
  end loop;
  raise notice 'Carimbo acrescentado em % tabelas.', n;
end $$;

-- --------------------------------------------------------------------------
-- 34. A trava do plano olha a linha, não quem está logado
--
--     `travar_criacao` perguntava `pode_criar()`, que usa `minha_org()`: a
--     organização de quem está logado. Quando quem escreve é o SERVIDOR, com a
--     chave de serviço, não há ninguém logado, `minha_org()` volta nulo e a
--     trava conclui que a conta está no modo reduzido. Toda criação feita pelo
--     servidor era recusada, com plano em dia, e a mensagem falava de teste
--     vencido, que não tinha nada a ver.
--
--     A pergunta certa nunca foi "qual o plano de quem está logado". É "qual o
--     plano da organização DESTA LINHA", e ela está em `new.org_id`, que o
--     carimbo já preencheu: `ao_inserir_org` roda antes de `so_com_plano`
--     porque o Postgres dispara gatilhos de mesmo evento em ordem alfabética, e
--     "ao_" vem antes de "so_".
--
--     Isso importa daqui para a frente mais do que importava até aqui: o pulso
--     e o WhatsApp escrevem sem sessão, e é assim que o app deixa de precisar
--     que alguém o abra.
-- --------------------------------------------------------------------------

create or replace function public.travar_criacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Sem organização na linha não há o que conferir: quem barra aí é o carimbo,
  -- e recusar aqui esconderia o erro de verdade atrás da mensagem errada.
  if new.org_id is null then return new; end if;
  if plano_em_vigor(new.org_id) = 'reduzido' then
    raise exception 'O teste acabou. Dá para ler e terminar o que já começou; para criar coisa nova, contrate um plano.';
  end if;
  return new;
end $$;

-- --------------------------------------------------------------------------
-- 35. O servidor age em nome de alguém, e só quando não há ninguém logado
--
--     Aprovar um checkpoint pelo WhatsApp esbarra num detalhe: `decidir_etapa`
--     e `decidir_prazo` perguntam `meu_perfil()`, e do WhatsApp não existe
--     sessão. A saída fácil seria duplicar as duas com um parâmetro de perfil,
--     e é a errada: duas cópias da regra mais importante do app divergem em
--     três meses, e a que estiver errada é sempre a que ninguém está lendo.
--
--     Em vez disso, as MESMAS funções aceitam `p_como`, e ele **só vale quando
--     `auth.uid()` é nulo**. Quem está logado não age em nome de outra pessoa
--     passando um id: o parâmetro é ignorado. O servidor, que não tem sessão,
--     age, e é ele quem confere de quem é o telefone antes de chamar.
--
--     Telefone não é senha: quem chega por ali só decide o que já era dele.
--     Todas as regras de quem aprova o quê continuam de pé, só que perguntadas
--     pelo perfil que está agindo em vez de pela sessão, que ali não existe.
--
--     O corpo das duas funções é o mesmo de antes, copiado sem uma linha de
--     diferença: o que mudou é de onde sai a identidade. Reescrever o corpo à
--     mão aqui teria perdido coisa que ninguém ia notar, como a queda em
--     cascata dos pedidos de prazo e a proteção do prazo firme.
-- --------------------------------------------------------------------------

create or replace function public.quem_age(p_como uuid default null)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  -- Com sessão, é sempre quem está logado. `p_como` não abre porta nenhuma.
  if auth.uid() is not null then
    v := meu_perfil();
    if v is null or not exists (select 1 from perfis where id = v and ativo) then
      raise exception 'Sem acesso.';
    end if;
    return v;
  end if;
  -- Sem sessão é o servidor. Ele diz em nome de quem, e o perfil tem que existir
  -- e estar ativo: desligar alguém precisa fechar a porta do WhatsApp também.
  if p_como is null or not exists (select 1 from perfis where id = p_como and ativo) then
    raise exception 'Sem acesso.';
  end if;
  return p_como;
end $$;

/** `manda_no_processo`, perguntado por um perfil em vez de pela sessão. */
create or replace function public.manda_no_processo_como(f uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fluxos x join perfis p on p.id = uid
    where x.id = f and x.org_id = p.org_id
      and (p.papel = 'admin' or x.autor_id = uid or x.dono_id = uid
           or (p.papel = 'gestor' and exists (
                 select 1 from perfis d where d.id = x.dono_id and d.gestor_id = uid)))
  );
$$;

-- A assinatura muda, então a antiga sai antes: duas versões com parâmetro
-- opcional deixariam a chamada ambígua e o Postgres recusaria as duas.
drop function if exists public.decidir_etapa(uuid, text, text, uuid[], text, date);

create or replace function public.decidir_etapa(
  p_fluxo    uuid,
  p_tipo     text,
  p_nota     text default '',
  p_reabrir  uuid[] default '{}',
  p_periodo  text default null,
  p_prazo    date default null,
  -- Em nome de quem, quando não há sessão. Só vale com `auth.uid()` nulo.
  p_como     uuid default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  f      fluxos%rowtype;
  e      etapas%rowtype;
  uid    uuid := quem_age(p_como);
  n      int;
  passo  int;
  atrasou boolean;
  pendente text;
begin
  select * into f from fluxos where id = p_fluxo;
  if f.id is null then raise exception 'Projeto não encontrado.'; end if;
  if f.concluido then raise exception 'Este projeto já está concluído.'; end if;
  if f.travado_motivo is not null then raise exception 'Este projeto está travado.'; end if;

  select * into e from etapas where fluxo_id = f.id and ordem = f.atual;
  if e.id is null then raise exception 'Checkpoint não encontrado.'; end if;
  if e.aprovador_id is not null and e.aprovador_id <> uid and not exists (select 1 from perfis where id = uid and papel = 'admin') then
    raise exception 'Somente quem aprova este checkpoint pode decidir.';
  end if;

  if p_tipo not in ('aprovou','ressalva','devolveu') then raise exception 'Decisão desconhecida.'; end if;
  if p_tipo <> 'aprovou' and btrim(coalesce(p_nota, '')) = '' then
    raise exception 'Escreva o motivo: quem recebe precisa saber o que fazer.';
  end if;

  select count(*) into n from etapas where fluxo_id = f.id;

  -- Ressalva no último checkpoint de um objetivo não tem para onde ir: o que
  -- viria depois não existe, e aceitar aqui é entregar com pendência e sem
  -- ninguém para cobrá-la. Rotina pode, porque a volta seguinte é o depois.
  if p_tipo = 'ressalva' and f.atual = n - 1 and f.tipo = 'esteira' then
    raise exception 'Este é o último checkpoint: ou a track conclui, ou a pendência vira tarefa aqui antes.';
  end if;

  if p_tipo = 'devolveu' then
    update itens set feito = false, feito_em = null
    where etapa_id = e.id and id = any(p_reabrir);

    insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
    values (f.id, e.id, uid, 'devolveu', btrim(p_nota));

    insert into atividades (fluxo_id, quem_id, texto)
    values (f.id, uid, 'devolveu ' || e.nome || ': ' || btrim(p_nota));
    return 'devolveu';
  end if;

  -- A dívida do checkpoint anterior vem antes de qualquer coisa, e a mensagem
  -- diz qual é: "existem itens pendentes" numa lista de doze não aponta nada.
  select i.texto into pendente from itens i
  where i.etapa_id = e.id and i.ressalva and not i.feito
  order by i.ordem limit 1;
  if pendente is not null then
    raise exception 'Falta a ressalva do checkpoint anterior: %', pendente;
  end if;

  if exists (
    select 1 from itens i
    where i.etapa_id = e.id and not i.feito and (not i.priv or i.autor_id = uid)
  ) then raise exception 'Ainda existem itens pendentes neste checkpoint.'; end if;

  insert into decisoes (fluxo_id, etapa_id, quem_id, tipo, nota)
  values (f.id, e.id, uid, p_tipo, btrim(coalesce(p_nota, '')));

  insert into atividades (fluxo_id, quem_id, texto)
  values (f.id, uid, case when p_tipo = 'ressalva'
    then 'aprovou ' || e.nome || ' com ressalva: ' || btrim(p_nota)
    else 'aprovou a saída de ' || e.nome end);

  -- A ressalva vira tarefa marcada do checkpoint seguinte, e numa rotina que
  -- está virando, do primeiro da volta que vem.
  if p_tipo = 'ressalva' then
    insert into itens (etapa_id, fluxo_id, texto, resp_id, prazo, autor_id, ordem, ressalva)
    select et.id, f.id, 'Ressalva: ' || btrim(p_nota), f.dono_id, p_prazo, uid,
           coalesce((select max(i.ordem) + 1 from itens i where i.etapa_id = et.id), 0), true
    from etapas et
    where et.fluxo_id = f.id
      and et.ordem = case when f.atual < n - 1 then f.atual + 1 else 0 end;
  end if;

  if f.atual < n - 1 then
    update fluxos set atual = f.atual + 1 where id = f.id;
    return 'avancou';
  end if;

  if f.tipo = 'ciclo' then
    passo := case f.freq when 'semanal' then 7 when 'quinzenal' then 15 else 30 end;
    select exists (
      select 1 from etapas et where et.fluxo_id = f.id and et.prazo is not null and et.prazo < current_date
      union all
      select 1 from itens it where it.fluxo_id = f.id and it.prazo is not null and it.prazo < current_date
    ) into atrasou;

    insert into historico (fluxo_id, periodo, situacao)
    values (f.id, coalesce(f.periodo, ''), case when atrasou then 'late' else 'ok' end);

    delete from historico h
    where h.fluxo_id = f.id
      and h.id not in (select id from historico where fluxo_id = f.id order by criado_em desc limit 12);

    update etapas set prazo = prazo + passo where fluxo_id = f.id and prazo is not null;
    -- A ressalva que acabou de nascer não é "tarefa da volta passada": ela é a
    -- dívida desta virada, e zerá-la junto com o resto seria pagá-la sozinha.
    update itens set feito = false, prazo = prazo + passo
    where fluxo_id = f.id and prazo is not null and not ressalva;
    update itens set feito = false where fluxo_id = f.id and prazo is null and not ressalva;
    update fluxos set atual = 0, periodo = coalesce(nullif(btrim(p_periodo), ''), periodo) where id = f.id;
    return 'volta';
  end if;

  -- Concluir arquiva: a track sai da lista principal e continua inteira em
  -- Arquivadas, que é onde ficam os documentos e o histórico dela. Seção 21.
  update fluxos set concluido = true, desfecho = 'concluido', arquivado_em = now()
  where id = f.id;
  return 'concluido';
end $$;

drop function if exists public.decidir_prazo(uuid, boolean);

create or replace function public.decidir_prazo(
  p_pedido uuid, p_aceita boolean, p_como uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := quem_age(p_como);
  pd  pedidos_prazo%rowtype;
begin
  -- `quem_age` já recusou quem não está ativo.

  select * into pd from pedidos_prazo where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if pd.estado <> 'aberto' then raise exception 'Este pedido já foi decidido.'; end if;
  if not manda_no_processo_como(pd.fluxo_id, uid) then
    raise exception 'Só quem responde por esta esteira decide o prazo dela.';
  end if;
  -- Quem pediu pode aceitar quando responde pelas duas esteiras, e isso é de
  -- propósito: o que o aceite garante não é que outra pessoa olhe, é que alguém
  -- olhe e diga sim de novo, num ato separado. Sem isso a cascata voltaria a ser
  -- automática justamente para quem tem mais poder de estragar.

  if p_aceita then
    update itens set prazo = pd.para where id = pd.item_id and not prazo_firme;
    update pedidos_prazo set estado = 'aceito', decidido_por = uid, decidido_em = now()
    where id = pd.id;
    insert into atividades (fluxo_id, quem_id, texto)
    select pd.fluxo_id, uid, 'aceitou mover ' || i.texto || ' para ' || to_char(pd.para, 'DD/MM')
    from itens i where i.id = pd.item_id;
    return 'aceito';
  end if;

  update pedidos_prazo set estado = 'recusado', decidido_por = uid, decidido_em = now()
  where id = pd.id;

  -- Em cadeia: o que nasceu deste pedido não faz mais sentido.
  with recursive queda as (
    select id, item_id from pedidos_prazo where origem_id = pd.item_id and estado = 'aberto'
    union all
    select p.id, p.item_id from pedidos_prazo p
    join queda q on p.origem_id = q.item_id
    where p.estado = 'aberto'
  )
  update pedidos_prazo set estado = 'recusado', decidido_por = uid, decidido_em = now(),
    motivo = motivo || ' (caiu junto: o pedido que veio antes foi recusado)'
  where id in (select id from queda);

  insert into atividades (fluxo_id, quem_id, texto)
  select pd.fluxo_id, uid, 'recusou mover ' || i.texto || ': a data fica onde está'
  from itens i where i.id = pd.item_id;
  return 'recusado';
end $$;

-- --------------------------------------------------------------------------
-- 36. O ritmo aprendido fica guardado, para o app poder explicá-lo
--
--     O pulso passa a escolher os horários pelo que a casa faz, e não por uma
--     divisão igual da janela: ele lê meia hora depois das horas em que a
--     empresa mais conversa. Ler no meio da conversa é pagar por uma leitura
--     que fica velha em dez minutos.
--
--     Estes dois campos existem porque **horário aprendido que não se explica é
--     indistinguível de horário aleatório**, e o primeiro dia em que ele errar
--     vira desconfiança no app inteiro. Guardando o que foi escolhido e de
--     quantas mensagens saiu, Ajustes consegue dizer a frase que faz a pessoa
--     concordar: "leio às 09h30 e 17h30, meia hora depois de quando vocês mais
--     conversam".
--
--     Vazio quer dizer que ainda não havia conversa suficiente, e aí valem os
--     horários espalhados pela janela. Aprender de três mensagens é inventar
--     padrão onde só há acaso.
-- --------------------------------------------------------------------------

alter table public.organizacoes add column if not exists pulso_horarios int[];
alter table public.organizacoes add column if not exists pulso_amostra int;

-- --------------------------------------------------------------------------
-- 37. O sistema que persegue: a varredura do dia
--
--     Até aqui o app avisava do que já tinha acontecido: o prazo venceu, o
--     checkpoint ficou pronto. Isto é o contrário, e é o que separa uma
--     ferramenta de um serviço: ele procura o que **está prestes a dar errado**
--     e pergunta antes.
--
--     O critério do plano é o resumo: nenhum prazo vence sem alguém ter sido
--     perguntado antes, e nenhum checkpoint fica pronto esperando alguém
--     lembrar de aprovar.
--
--     Cinco coisas, e cada uma vira aviso com chave do dia, então rodar dez
--     vezes escreve uma vez só:
--
--     1. **Prazo em dois dias.** Perguntar quando ainda dá para fazer algo.
--        Avisar no dia em que venceu é dar notícia, não ajudar.
--     2. **Tarefa parada.** Aberta há muito tempo sem ninguém mexer, no
--        checkpoint corrente. A pergunta é "travou em quê?", porque parada
--        quase nunca é preguiça: é dependência que ninguém registrou.
--     3. **Sobrecarga**, e ela vai para QUEM DISTRIBUI, não para quem está
--        afogado. Avisar a pessoa sobrecarregada de que ela está
--        sobrecarregada é dar a ela mais uma coisa para carregar.
--     4. **Ociosidade**, o par da sobrecarga, e também para quem distribui.
--     5. **Rotina que não começou** no período em que devia.
--
--     **A frase fala de capacidade, nunca de esforço** (princípio 1.3 do
--     plano). "A fila de Fulano não cabe no tempo que ele tem" é sobre
--     distribuição; "Fulano está devagar" é sobre a pessoa, e é o tipo de
--     frase que faz o time desligar o app.
-- --------------------------------------------------------------------------

do $$
begin
  alter table public.avisos drop constraint if exists avisos_tipo_check;
  alter table public.avisos add constraint avisos_tipo_check check (tipo in (
    'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo',
    'nota','feedback','mensagem','parada','carga','rotina'));
end $$;

/**
 * A varredura do dia. Devolve quantos avisos novos escreveu.
 *
 * `security definer` e sem `minha_org()`: quem chama é o pulso, sem sessão, e
 * ele varre todas as empresas. A organização de cada linha sai do próprio dado.
 */
create or replace function public.varrer_o_dia()
returns int language plpgsql security definer set search_path = public as $$
declare
  hoje date := current_date;
  n int := 0;
  r record;
begin
  -- 1. PRAZO EM DOIS DIAS. Perguntar enquanto ainda dá para agir.
  for r in
    select i.id, i.texto, i.resp_id, i.prazo, f.id as fluxo_id, f.nome as fluxo
    from itens i
    join etapas e on e.id = i.etapa_id
    join fluxos f on f.id = i.fluxo_id and e.ordem = f.atual
    where not i.feito and i.resp_id is not null
      and not f.concluido and f.travado_motivo is null
      and i.prazo is not null and i.prazo > hoje and i.prazo <= hoje + 2
  loop
    if avisar(r.resp_id, 'prazo', 'Vence em breve: ' || r.texto,
              r.fluxo || ' · ' || to_char(r.prazo, 'DD/MM'),
              'quase:' || r.id::text || ':' || hoje::text,
              false, r.fluxo_id, r.id, null, null, null) then n := n + 1; end if;
  end loop;

  -- 2. TAREFA PARADA. Catorze dias sem ninguém mexer, e ela é do checkpoint de
  --    agora: parada num checkpoint futuro é normal, ainda não chegou a vez.
  for r in
    select i.id, i.texto, i.resp_id, f.id as fluxo_id, f.nome as fluxo
    from itens i
    join etapas e on e.id = i.etapa_id
    join fluxos f on f.id = i.fluxo_id and e.ordem = f.atual
    where not i.feito and i.resp_id is not null
      and not f.concluido and f.travado_motivo is null
      and i.criado_em < now() - interval '14 days'
      and not exists (select 1 from dependencias d where d.item_id = i.id)
  loop
    if avisar(r.resp_id, 'parada', 'Parada há duas semanas: ' || r.texto,
              r.fluxo || '. Travou em quê? Se depender de outra pessoa, dá para registrar.',
              'parada:' || r.id::text || ':' || to_char(hoje, 'IYYY-IW'),
              false, r.fluxo_id, r.id, null, null, null) then n := n + 1; end if;
  end loop;

  -- 3 e 4. CARGA. Vai para quem distribui, nunca para quem está afogado.
  --        A conta é simples de propósito: tarefas abertas no checkpoint
  --        corrente, comparadas com a média de quem trabalha na mesma casa.
  for r in
    with fila as (
      select p.id, p.nome, p.org_id, count(i.id) as abertas,
             count(i.id) filter (where i.prazo < hoje) as atrasadas
      from perfis p
      left join itens i on i.resp_id = p.id and not i.feito
        and exists (select 1 from etapas e join fluxos f on f.id = e.fluxo_id
                    where e.id = i.etapa_id and e.ordem = f.atual
                      and not f.concluido and f.travado_motivo is null)
      where p.ativo
      group by p.id, p.nome, p.org_id
    ),
    media as (
      select org_id, avg(abertas) as m, count(*) as gente from fila group by org_id
    )
    select f.*, m.m, m.gente,
      (select o.dono_id from organizacoes o where o.id = f.org_id) as manda
    from fila f join media m on m.org_id = f.org_id
    -- Menos de três pessoas não tem média que signifique nada.
    where m.gente >= 3
  loop
    if r.manda is null or r.manda = r.id then continue; end if;
    if r.abertas > r.m * 1.8 and r.abertas >= 5 then
      -- Sem pronome: o nome de quem recebe a tarefa não diz o gênero, e errar
      -- isso numa frase que a casa inteira lê é um jeito bobo de ofender.
      if avisar(r.manda, 'carga', 'A fila de ' || r.nome || ' não cabe no tempo que tem',
                r.abertas::text || ' tarefas abertas, contra ' || round(r.m)::text
                  || ' na média da casa' ||
                  case when r.atrasadas > 0 then ', ' || r.atrasadas::text || ' já atrasadas' else '' end
                  || '. Dá para passar alguma para outra pessoa?',
                'carga:' || r.id::text || ':' || to_char(hoje, 'IYYY-IW'),
                false, null, null, null, null, null) then n := n + 1; end if;
    elsif r.abertas = 0 and r.m >= 3 then
      if avisar(r.manda, 'carga', r.nome || ' está com a fila vazia',
                'Nada aberto, contra ' || round(r.m)::text || ' na média da casa. '
                  || 'Se tiver o que passar, é uma boa hora.',
                'ocio:' || r.id::text || ':' || to_char(hoje, 'IYYY-IW'),
                false, null, null, null, null, null) then n := n + 1; end if;
    end if;
  end loop;

  -- 5. ROTINA QUE NÃO COMEÇOU. Está no primeiro checkpoint, sem nada feito, e
  --    o período dela já passou da metade.
  for r in
    select f.id, f.nome, f.dono_id, f.periodo
    from fluxos f
    where f.tipo = 'ciclo' and not f.concluido and f.travado_motivo is null
      and f.atual = 0 and f.dono_id is not null
      and f.criado_em < now() - interval '10 days'
      and not exists (
        select 1 from itens i join etapas e on e.id = i.etapa_id
        where e.fluxo_id = f.id and i.feito)
  loop
    if avisar(r.dono_id, 'rotina', r.nome || ' ainda não começou',
              'A rotina está parada no primeiro checkpoint e nada foi feito nela. '
                || 'Ainda vale para este período?',
              'rotina:' || r.id::text || ':' || to_char(hoje, 'IYYY-IW'),
              false, r.id, null, null, null, null) then n := n + 1; end if;
  end loop;

  return n;
end $$;

-- --------------------------------------------------------------------------
-- 38. O registro único de eventos: a grama pisada
--
--     Empresa sem processo JÁ TEM processo. Ele só não é constante, não é
--     explícito e não tem dono. O app não inventa nenhum: ele mostra por onde
--     as pessoas já andam.
--
--     Para isso é preciso uma coisa que não existia: **um lugar só onde tudo
--     que aconteceu aparece com a mesma forma**. Hoje o que aconteceu está
--     espalhado por seis tabelas com colunas diferentes (`atividades`,
--     `decisoes`, `pedidos_prazo`, `itens`, `anexos`, `sugestoes`), e comparar
--     execução com execução exigiria seis consultas e seis formatos.
--
--     **O setor sai da pessoa, e não de uma lista minha.** A área de quem fez o
--     evento é o que dá setor a ele, e por isso a descoberta nunca precisa
--     saber o que significa "financeiro" ou "jurídico": um trabalho em que a
--     maioria dos eventos é de gente do Financeiro é financeiro, sem ninguém
--     definir nada. Uma lista de setores minha estaria errada para metade das
--     empresas, e a primeira com um jeito próprio cairia na gaveta errada.
--
--     Os que atravessam setor são os mais valiosos, e não os mais confusos: são
--     eles que mostram onde trava entre áreas.
--
--     É VIEW, e não tabela: evento duplicado é pior que evento faltando, e
--     manter uma cópia sincronizada com seis tabelas é a forma mais certa de
--     ter as duas coisas. Aqui a verdade continua sendo a tabela de origem.
-- --------------------------------------------------------------------------

create or replace view public.eventos as
  -- O que a linha do tempo da track registrou: criada, editada, concluída.
  select a.org_id, a.criado_em as quando, 'atividade'::text as tipo,
         a.texto as detalhe, a.fluxo_id, a.quem_id,
         coalesce((select p.area_id from perfis p where p.id = a.quem_id),
                  (select f.area_id from fluxos f where f.id = a.fluxo_id)) as area_id
  from atividades a
  union all
  -- A decisão de um checkpoint: aprovou, com ressalva, devolveu.
  select d.org_id, d.criado_em, 'decisao:' || d.tipo,
         d.nota, d.fluxo_id, d.quem_id,
         coalesce((select p.area_id from perfis p where p.id = d.quem_id),
                  (select f.area_id from fluxos f where f.id = d.fluxo_id))
  from decisoes d
  union all
  -- Tarefa nascendo.
  select i.org_id, i.criado_em, 'tarefa:nasceu', i.texto, i.fluxo_id, i.autor_id,
         coalesce((select p.area_id from perfis p where p.id = i.autor_id),
                  (select f.area_id from fluxos f where f.id = i.fluxo_id))
  from itens i
  union all
  -- Tarefa ficando pronta, que é o evento que mais diz sobre o caminho andado.
  select i.org_id, i.feito_em, 'tarefa:feita', i.texto, i.fluxo_id, i.resp_id,
         coalesce((select p.area_id from perfis p where p.id = i.resp_id),
                  (select f.area_id from fluxos f where f.id = i.fluxo_id))
  from itens i where i.feito and i.feito_em is not null
  union all
  -- Prazo pedido e prazo decidido: onde o combinado mudou.
  select pp.org_id, pp.criado_em, 'prazo:pedido', pp.motivo, pp.fluxo_id, pp.pedido_por,
         (select p.area_id from perfis p where p.id = pp.pedido_por)
  from pedidos_prazo pp
  union all
  select pp.org_id, pp.decidido_em, 'prazo:' || pp.estado, pp.motivo, pp.fluxo_id, pp.decidido_por,
         (select p.area_id from perfis p where p.id = pp.decidido_por)
  from pedidos_prazo pp where pp.decidido_em is not null
  union all
  -- Documento entrando. Anexo costuma marcar a entrega de verdade.
  select an.org_id, an.criado_em, 'anexo', an.nome, an.fluxo_id, an.autor_id,
         (select p.area_id from perfis p where p.id = an.autor_id)
  from anexos an where an.fluxo_id is not null
  union all
  -- O que a leitura propôs e alguém aceitou: combinado que virou coisa.
  select s.org_id, s.decidido_em, 'proposta:' || s.tipo, s.texto,
         nullif(s.dados->>'fluxo_id','')::uuid, s.decidido_por,
         (select p.area_id from perfis p where p.id = s.decidido_por)
  from sugestoes s where s.estado = 'aceita' and s.decidido_em is not null;

/**
 * Os eventos de uma organização, do mais novo para o mais velho.
 *
 * `security definer` porque quem chama é o pulso, sem sessão. A view em si
 * respeita RLS pelas tabelas de origem quando alguém logado a consulta; esta
 * função é a porta do servidor, e ela pede a organização explicitamente.
 */
create or replace function public.eventos_de(p_org uuid, p_desde timestamptz)
returns table (
  quando timestamptz, tipo text, detalhe text,
  fluxo_id uuid, quem_id uuid, area_id uuid
)
language sql stable security definer set search_path = public as $$
  select e.quando, e.tipo, e.detalhe, e.fluxo_id, e.quem_id, e.area_id
  from eventos e
  where e.org_id = p_org and e.quando >= p_desde and e.quando is not null
  order by e.quando;
$$;

-- --------------------------------------------------------------------------
-- 39. O que foi descoberto, e em que pé está
--
--     A descoberta não vira processo sozinha, e isso é o princípio 1.1 do
--     plano: a IA observa, conclui, propõe e pergunta, mas não decide. O que
--     ela produz é um CANDIDATO, com o estado dele à vista.
--
--     Os estados contam a história inteira: `observando` é pouco visto para
--     propor; `pronto` já dá para conversar; `proposto` foi levado a alguém;
--     `aceito` virou processo de verdade; `recusado` não era processo, era
--     coincidência, e **fica guardado para não ser proposto de novo**. Propor
--     duas vezes a mesma coisa que já foi recusada é o jeito mais rápido de a
--     pessoa parar de ler o que o app diz.
--
--     `confianca` baixa não quer dizer erro: quer dizer que a casa faz de
--     jeitos diferentes. Esse número é metade do valor da coisa, porque é dele
--     que sai o mapa da inconstância, que numa empresa sem processo vale mais
--     que o processo.
--
--     A `chave` é o que torna a varredura repetível: rodar de novo ATUALIZA o
--     candidato em vez de criar um segundo igual, e por isso a contagem de
--     execuções cresce em vez de duplicar.
-- --------------------------------------------------------------------------

create table if not exists public.processos_descobertos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizacoes on delete cascade,
  -- A área onde ele mais acontece. Nulo quando atravessa várias, que é o caso
  -- mais interessante: são esses que mostram onde trava entre setores.
  area_id       uuid references public.areas on delete set null,
  nome_sugerido text not null default '',
  gatilho       text not null default '',
  desfecho      text not null default '',
  /** Os passos que aparecem na maioria das execuções. O resto é ruído. */
  passos        jsonb not null default '[]'::jsonb,
  areas         jsonb not null default '[]'::jsonb,
  /** As tracks que ele agrupou, para quem quiser conferir de onde saiu. */
  execucoes     jsonb not null default '[]'::jsonb,
  vezes         int  not null default 0,
  confianca     numeric not null default 0,
  cadencia      text not null default 'pontual' check (cadencia in ('rotina','sazonal','pontual')),
  /** Quantos dias cada execução levou. É daqui que sai a inconstância. */
  duracoes      jsonb not null default '[]'::jsonb,
  /** As frases que a tela mostra: "em 4 das 11 vezes ninguém conferiu". */
  inconstancia  jsonb not null default '[]'::jsonb,
  estado        text not null default 'observando'
                check (estado in ('observando','pronto','proposto','aceito','recusado')),
  /** Quando virou processo de verdade, o id dele. */
  virou_id      uuid references public.processos on delete set null,
  chave         text not null,
  criado_em     timestamptz not null default now(),
  mexido_em     timestamptz not null default now()
);

create unique index if not exists proc_desc_uk on public.processos_descobertos (org_id, chave);
create index if not exists proc_desc_idx on public.processos_descobertos (org_id, vezes desc);

alter table public.processos_descobertos enable row level security;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.processos_descobertos';
  execute 'create trigger ao_inserir_org before insert on public.processos_descobertos
             for each row execute function public.carimbar_org()';
end $$;

-- Quem trabalha na casa vê o que foi descoberto dela. Quem decide o que fazer
-- com isso é quem manda no processo, e essa conferência é da tela de proposta.
drop policy if exists pd_sel on public.processos_descobertos;
create policy pd_sel on public.processos_descobertos for select
  using (minha(org_id) and ativo());

-- Sem política de insert nem de update, de propósito: quem descobre é o
-- servidor, no pulso, e quem responde, adota ou recusa passa pelas funções da
-- seção 41. Update livre aqui deixaria qualquer pessoa da casa marcar um
-- candidato como aceito sem nunca ter passado pela conferência de quem manda no
-- processo, e o estado deste registro é o que decide se ele volta a ser
-- proposto.

/**
 * Guarda ou atualiza um candidato.
 *
 * Um candidato que já foi RECUSADO não volta a ser proposto: o estado dele fica
 * como está, e só os números são atualizados. Insistir no que a pessoa já disse
 * que não é o jeito mais rápido de ela parar de ler o que o app diz.
 */
create or replace function public.guardar_descoberta(
  p_org uuid, p_chave text, p_nome text, p_gatilho text, p_desfecho text,
  p_passos jsonb, p_areas jsonb, p_execucoes jsonb, p_vezes int,
  p_confianca numeric, p_cadencia text, p_duracoes jsonb, p_inconstancia jsonb,
  p_area uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_estado text;
begin
  select id, estado into v_id, v_estado
  from processos_descobertos where org_id = p_org and chave = p_chave;

  if v_id is null then
    insert into processos_descobertos (
      org_id, area_id, nome_sugerido, gatilho, desfecho, passos, areas, execucoes,
      vezes, confianca, cadencia, duracoes, inconstancia, chave,
      -- Três vezes já dá para conversar. Abaixo disso é coincidência com sorte.
      estado)
    values (p_org, p_area, p_nome, p_gatilho, p_desfecho, p_passos, p_areas, p_execucoes,
            p_vezes, p_confianca, p_cadencia, p_duracoes, p_inconstancia, p_chave,
            case when p_vezes >= 3 then 'pronto' else 'observando' end)
    returning id into v_id;
    return v_id;
  end if;

  update processos_descobertos set
    area_id = p_area, nome_sugerido = p_nome, passos = p_passos, areas = p_areas,
    execucoes = p_execucoes, vezes = p_vezes, confianca = p_confianca,
    cadencia = p_cadencia, duracoes = p_duracoes, inconstancia = p_inconstancia,
    estado = case
      when v_estado in ('recusado','aceito','proposto') then v_estado
      when p_vezes >= 3 then 'pronto'
      else 'observando' end,
    mexido_em = now()
  where id = v_id;
  return v_id;
end $$;

-- --------------------------------------------------------------------------
-- 40. A pergunta do dia, e o acervo que aprende a forma
--
--     Duas tabelas, e a distância entre elas é o ponto.
--
--     `perguntas_ritmo` é da empresa: quantas vezes cada molde foi mandado para
--     cada pessoa, quantas voltaram, e quantas revelaram alguma coisa. É daqui
--     que sai a poda (três vazias seguidas e a pergunta some daquela pessoa) e
--     a ordem (a que mais revela vem primeiro). Em um mês o conjunto convergiu
--     para aquela casa sem ninguém configurar nada.
--
--     `acervo_forma` é de todo mundo, e **não tem chave estrangeira para dado
--     de cliente nenhum**. Nem org_id, nem perfil_id. Só a chave do molde e
--     três contagens. É o princípio 1.5 virado estrutura: entre clientes sobe
--     a FORMA (qual pergunta costuma ser respondida, qual costuma revelar),
--     nunca o conteúdo (nome, texto, valor, conversa, empresa).
--
--     Essa separação precisa ser de tabela e de rota, e não de intenção,
--     porque intenção não sobrevive ao sexto mês: alguém vai querer "só uma
--     coluninha" com o nome da empresa para depurar, e a partir dali o acervo
--     deixou de ser anônimo sem ninguém ter decidido isso.
-- --------------------------------------------------------------------------

create table if not exists public.perguntas_ritmo (
  org_id    uuid not null references public.organizacoes on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  chave     text not null,
  mandadas  int not null default 0,
  respondidas int not null default 0,
  /** Quantas voltaram sem revelar nada. Três seguidas e ela sai. */
  vazias_seguidas int not null default 0,
  /** Quantas viraram alguma coisa: tarefa, nota, dependência. */
  revelou   int not null default 0,
  ultima_em timestamptz,
  primary key (perfil_id, chave)
);

alter table public.perguntas_ritmo enable row level security;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.perguntas_ritmo';
  execute 'create trigger ao_inserir_org before insert on public.perguntas_ritmo
             for each row execute function public.carimbar_org()';
end $$;

-- Cada pessoa vê o próprio ritmo. Quem escreve é o servidor.
drop policy if exists pr_sel on public.perguntas_ritmo;
create policy pr_sel on public.perguntas_ritmo for select
  using (minha(org_id) and perfil_id = meu_perfil());

-- --------------------------------------------------------------------------
-- O acervo. Repare no que ele NÃO tem: org_id, perfil_id, nenhum texto.
-- --------------------------------------------------------------------------
create table if not exists public.acervo_forma (
  chave     text primary key,
  mandadas  int not null default 0,
  respondidas int not null default 0,
  revelou   int not null default 0,
  mexido_em timestamptz not null default now()
);

alter table public.acervo_forma enable row level security;

-- Ninguém lê nem escreve daqui de dentro do app. Quem mexe é o servidor, com a
-- chave de serviço, e o que ele escreve são três números por molde.
-- Sem política nenhuma: RLS ligada e sem policy é tabela fechada.

/**
 * Registra que um molde foi mandado, e leva a forma para o acervo.
 *
 * O acervo recebe a mesma contagem sem saber de quem veio: o parâmetro é a
 * chave do molde, e mais nada. Por isso a subida é segura mesmo que um dia
 * alguém chame esta função de um lugar errado.
 */
create or replace function public.pergunta_mandada(p_perfil uuid, p_chave text)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from perfis where id = p_perfil;
  if v_org is null then return; end if;

  insert into perguntas_ritmo (org_id, perfil_id, chave, mandadas, ultima_em)
  values (v_org, p_perfil, p_chave, 1, now())
  on conflict (perfil_id, chave) do update
    set mandadas = perguntas_ritmo.mandadas + 1, ultima_em = now();

  insert into acervo_forma (chave, mandadas) values (p_chave, 1)
  on conflict (chave) do update
    set mandadas = acervo_forma.mandadas + 1, mexido_em = now();
end $$;

/**
 * Registra a resposta, e se ela revelou alguma coisa.
 *
 * "Revelou" quer dizer que a resposta virou fato no app: uma tarefa, uma nota,
 * uma dependência. Resposta que não vira nada conta como vazia, e três vazias
 * seguidas podam a pergunta daquela pessoa. É assim que o conjunto encolhe
 * sozinho para o que serve naquela casa.
 */
create or replace function public.pergunta_respondida(
  p_perfil uuid, p_chave text, p_revelou boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update perguntas_ritmo set
    respondidas = respondidas + 1,
    revelou = revelou + case when p_revelou then 1 else 0 end,
    vazias_seguidas = case when p_revelou then 0 else vazias_seguidas + 1 end
  where perfil_id = p_perfil and chave = p_chave;

  insert into acervo_forma (chave, respondidas, revelou)
  values (p_chave, 1, case when p_revelou then 1 else 0 end)
  on conflict (chave) do update set
    respondidas = acervo_forma.respondidas + 1,
    revelou = acervo_forma.revelou + case when p_revelou then 1 else 0 end,
    mexido_em = now();
end $$;

-- --------------------------------------------------------------------------
-- 41. Da descoberta ao processo, e quem dá a última palavra
--
--     A seção 39 guarda o que foi observado. Esta é a porta por onde aquilo
--     vira processo de verdade, e ela existe separada por dois motivos.
--
--     O primeiro é que **a resposta precisa sobreviver ao refresh**. A conversa
--     com o candidato é uma pergunta por vez, e uma pergunta por vez só é
--     tolerável se responder cedo não obriga a começar de novo amanhã. Por isso
--     a resposta é gravada na hora, em `respostas`, e não acumulada na tela.
--
--     O segundo é que **a mesma porta serve à tela e ao WhatsApp**. A pessoa
--     responde "2" no telefone e responde clicando no app, e nos dois casos é
--     esta função que grava. Duas portas viravam duas gramáticas no mês
--     seguinte, e aí a resposta dada no telefone não apareceria no app.
--
--     Adotar é o único lugar onde uma descoberta vira linha em `processos`, e
--     ele passa por `salvar_processo`, que já sabe recusar quem não responde
--     pela operação. Não repetir a conferência aqui: duas cópias da mesma regra
--     discordam no dia em que uma delas muda.
-- --------------------------------------------------------------------------

/**
 * Quem pode desenhar processo NAQUELA casa.
 *
 * `eh_admin()` responde pela organização de quem chama, e essas três funções
 * são `security definer`, onde RLS não filtra a linha: um administrador da
 * empresa A passava na conferência e mexia no candidato da empresa B, que ele
 * não pode nem listar. A pergunta certa carrega a organização do candidato.
 */
create or replace function public.manda_no_processo_de(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p
    where p.id = meu_perfil() and p.org_id = p_org and p.ativo
      and p.papel in ('admin', 'gestor'))
$$;

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'processos_descobertos'
                   and column_name = 'respostas') then
    alter table public.processos_descobertos add column respostas jsonb not null default '{}'::jsonb;
  end if;
end $$;

/**
 * Grava a resposta de uma pergunta do candidato.
 *
 * A chave é a da pergunta (`passo-as-vezes:tarefa:feita`, `quem-aprova`), e o
 * valor é a escolha. Responder move o estado para `proposto`: dali em diante o
 * candidato não é mais só observação, alguém já sentou com ele.
 *
 * Candidato recusado não aceita resposta. Se alguém responde pelo telefone uma
 * pergunta de dois dias atrás, e no meio disso o candidato foi recusado no app,
 * a recusa vale: ela é a decisão mais recente de gente.
 */
create or replace function public.responder_descoberta(
  p_id uuid, p_chave text, p_escolha text
) returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_estado text;
begin
  select org_id, estado into v_org, v_estado from processos_descobertos where id = p_id;
  if v_org is null then raise exception 'Candidato não encontrado.'; end if;
  if not manda_no_processo_de(v_org) then
    raise exception 'Desenhar processo é decisão de quem responde pela operação.';
  end if;
  if v_estado in ('recusado', 'aceito') then return; end if;

  update processos_descobertos set
    respostas = respostas || jsonb_build_object(p_chave, p_escolha),
    estado = 'proposto',
    mexido_em = now()
  where id = p_id;
end $$;

/**
 * "Isto não é um processo."
 *
 * O candidato fica, e é o registro da recusa que impede o pulso de propor a
 * mesma coisa na semana seguinte. Apagar a linha seria oferecer de novo, e
 * oferecer de novo o que já foi recusado é o jeito mais rápido de a pessoa
 * parar de ler o que o app diz.
 */
create or replace function public.recusar_descoberta(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from processos_descobertos where id = p_id;
  if v_org is null then raise exception 'Candidato não encontrado.'; end if;
  if not manda_no_processo_de(v_org) then
    raise exception 'Desenhar processo é decisão de quem responde pela operação.';
  end if;
  update processos_descobertos
    set estado = 'recusado', mexido_em = now()
    where id = p_id and estado <> 'aceito';
end $$;

/**
 * Adota: o candidato vira processo.
 *
 * `p_desenho` é o rascunho como ele está na tela, já com o que as respostas
 * mudaram. **O banco não remonta o desenho**, e isso é deliberado: remontar
 * aqui seria uma segunda implementação de `primeiroDesenho`, e no dia em que as
 * duas discordassem a pessoa veria uma coisa na tela e outra no processo salvo.
 *
 * Adotar duas vezes devolve o processo que já nasceu, em vez de criar um
 * segundo: o botão pode ser tocado duas vezes num telefone lento.
 */
create or replace function public.adotar_descoberta(p_id uuid, p_desenho jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_estado text; v_virou uuid; v_proc uuid; v_area uuid;
begin
  select org_id, estado, virou_id, area_id
    into v_org, v_estado, v_virou, v_area
    from processos_descobertos where id = p_id;
  if v_org is null then raise exception 'Candidato não encontrado.'; end if;
  if not manda_no_processo_de(v_org) then
    raise exception 'Desenhar processo é decisão de quem responde pela operação.';
  end if;
  if v_estado = 'aceito' and v_virou is not null then return v_virou; end if;

  v_proc := salvar_processo(
    jsonb_build_object(
      'nome', p_desenho->>'nome',
      'tipo', p_desenho->>'tipo',
      'area_id', coalesce(nullif(p_desenho->>'area_id', ''), v_area::text),
      'descricao', coalesce(p_desenho->>'descricao', '')),
    coalesce(p_desenho->'etapas', '[]'::jsonb));

  update processos_descobertos
    set estado = 'aceito', virou_id = v_proc, mexido_em = now()
    where id = p_id;
  return v_proc;
end $$;

-- --------------------------------------------------------------------------
-- 42. A descoberta é uma vez por dia, e agora precisa ser dita
--
--     Enquanto o relógio batia uma vez por dia, "uma vez por dia por empresa"
--     era verdade sem ninguém garantir: o laço rodava a cada chamada, e havia
--     uma chamada. Com o relógio de hora em hora isso vira 24 varreduras de
--     180 dias de eventos por empresa, por dia, para responder a mesma coisa.
--
--     A marca vai na organização, e não em `processos_descobertos`, porque a
--     empresa que não tem candidato nenhum não escreve linha nenhuma lá: seria
--     justamente a que varreria de novo toda hora, e ela é a mais cara, porque
--     é a que percorre tudo sem achar.
--
--     O dia é o de UTC, e não o do fuso da empresa. Isto é faxina, não é a
--     leitura: perder aritmética de fuso para decidir quando limpar a casa é
--     pagar caro por um detalhe que ninguém vê.
-- --------------------------------------------------------------------------

alter table public.organizacoes add column if not exists descoberta_em timestamptz;

/**
 * Quais empresas ainda não foram varridas hoje.
 *
 * Só o servidor chama, com a chave de serviço, pelo mesmo motivo de
 * `pulso_pode`: quem pergunta não tem sessão. Devolve id e nada mais, porque
 * quem chama já tem a lista de organizações e só precisa saber quais pular.
 */
create or replace function public.falta_descobrir()
returns table (id uuid) language sql security definer set search_path = public as $$
  select o.id from organizacoes o
  where o.descoberta_em is null
     or o.descoberta_em < date_trunc('day', now() at time zone 'utc')
$$;

revoke all on function public.falta_descobrir() from public, anon, authenticated;
grant execute on function public.falta_descobrir() to service_role;

/** Marca que a varredura daquela empresa aconteceu hoje. */
create or replace function public.descobriu(p_org uuid)
returns void language sql security definer set search_path = public as $$
  update organizacoes set descoberta_em = now() where id = p_org
$$;

revoke all on function public.descobriu(uuid) from public, anon, authenticated;
grant execute on function public.descobriu(uuid) to service_role;

-- --------------------------------------------------------------------------
-- 43. Abrir track em nome de alguém, para o WhatsApp poder criar trabalho
--
--     `salvar_fluxo` abria com `meu_perfil()` e barrava com `ativo()`, e os
--     dois perguntam pela SESSÃO. Quem chama do WhatsApp é o servidor, que não
--     tem sessão nenhuma: a função respondia 'Sem acesso.' e a tarefa avulsa
--     mandada pelo telefone não tinha onde nascer, porque a lista pessoal é uma
--     track e criar track passava por aqui.
--
--     É a mesma parede que `decidir_etapa` atravessou na seção 35, e a saída é
--     a mesma: `quem_age(p_como)`. Com sessão, `p_como` não abre porta nenhuma;
--     sem sessão, o servidor diz em nome de quem, e o perfil precisa existir e
--     estar ativo, porque desligar alguém tem que fechar a porta do WhatsApp
--     junto.
--
--     **A assinatura de dois argumentos tem que morrer.** Deixando as duas, a
--     chamada do app com dois argumentos fica ambígua e o Postgres responde
--     "não é única", que não diz o que fazer. Foi exatamente assim que
--     `decidir_etapa` parou, e o conserto de lá foi acrescentar o parâmetro a
--     TODAS as definições do arquivo, não só à última. Aqui são duas.
-- --------------------------------------------------------------------------

drop function if exists public.salvar_fluxo(jsonb, jsonb);

-- --------------------------------------------------------------------------
-- 44. O carimbo da organização quando não há sessão
--
--     `carimbar_org()` pergunta `minha_org()`, que responde pela SESSÃO. Quando
--     quem escreve é o servidor agindo em nome de alguém (o WhatsApp, o pulso),
--     não há sessão nenhuma: a função volta nula, o carimbo fica de fora, e a
--     linha nasce com `org_id` vazio. Como toda política pergunta
--     `minha(org_id)`, essa linha existe e **ninguém a enxerga**, nem quem a
--     criou. Não dá erro, não aparece na tela, e só se descobre procurando.
--
--     Foi encontrado testando a linguagem de barra pelo WhatsApp: o objetivo
--     criado pelo telefone nascia invisível, e a lista pessoal era recriada a
--     cada tarefa, porque a busca por ela filtra pela organização e nunca
--     achava a anterior. E já valia antes daqui: `decidir_etapa` e
--     `decidir_prazo` recebem `p_como` desde a seção 35, e as decisões, os
--     itens e o histórico que elas gravam sairiam do mesmo jeito.
--
--     O conserto **não é acrescentar `org_id` a trinta inserts** espalhados por
--     seis funções: seria esquecer um, e a sétima função nasceria esquecendo
--     todos. A pergunta certa é a do carimbo, e ele só precisa saber de quem é
--     a casa quando não há sessão. Então `quem_age()`, que é o único lugar onde
--     o servidor diz em nome de quem está agindo, guarda isso na transação, e o
--     carimbo passa a ter onde olhar.
--
--     `set_config(..., true)` é local à transação: acaba quando ela acaba, e
--     não atravessa para a requisição seguinte.
-- --------------------------------------------------------------------------

create or replace function public.quem_age(p_como uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid; v_org uuid;
begin
  -- Com sessão, é sempre quem está logado. `p_como` não abre porta nenhuma.
  if auth.uid() is not null then
    v := meu_perfil();
    if v is null or not exists (select 1 from perfis where id = v and ativo) then
      raise exception 'Sem acesso.';
    end if;
    return v;
  end if;
  -- Sem sessão é o servidor. Ele diz em nome de quem, e o perfil tem que existir
  -- e estar ativo: desligar alguém precisa fechar a porta do WhatsApp também.
  if p_como is null then raise exception 'Sem acesso.'; end if;
  select org_id into v_org from perfis where id = p_como and ativo;
  if v_org is null then raise exception 'Sem acesso.'; end if;
  -- De quem é a casa, para o carimbo achar. Sem isto a linha nasce sem
  -- organização e some da vista de todo mundo, inclusive de quem a criou.
  perform set_config('trackward.org', v_org::text, true);
  perform set_config('trackward.perfil', p_como::text, true);
  return p_como;
end $$;

/** A organização de quem está agindo, quando não é uma sessão. */
create or replace function public.org_de_quem_age()
returns uuid language sql stable set search_path = public as $$
  select nullif(current_setting('trackward.org', true), '')::uuid
$$;

/** O perfil de quem está agindo, quando não é uma sessão. */
create or replace function public.perfil_de_quem_age()
returns uuid language sql stable set search_path = public as $$
  select nullif(current_setting('trackward.perfil', true), '')::uuid
$$;

create or replace function public.carimbar_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.org_id := coalesce(minha_org(), org_de_quem_age(), new.org_id);
  return new;
end $$;

-- A assinatura segue a mesma regra: com sessão manda quem está logado, sem
-- sessão manda quem o servidor disse que está agindo, e o que o cliente enviou
-- só vale quando não há nem um nem outro.
create or replace function public.carimbar_autor()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_eu uuid := coalesce(meu_perfil(), perfil_de_quem_age());
begin
  if v_eu is null then return new; end if;
  if tg_table_name = 'itens'  then new.autor_id   := v_eu; end if;
  if tg_table_name = 'canais' then new.criado_por := v_eu; end if;
  if tg_table_name = 'notas'  then new.dono_id    := v_eu; end if;
  new.org_id := coalesce(new.org_id, minha_org(), org_de_quem_age());
  return new;
end $$;

-- --------------------------------------------------------------------------
-- 45. A volta da rotina vira arquivo, em vez de sumir
--
--     Hoje a virada **apaga o mês**. As tarefas de uma rotina são as mesmas
--     todo período: a virada desmarca `feito`, empurra os prazos e segue. O que
--     sobra de julho é uma linha em `historico` dizendo 'ok' ou 'late', e ela é
--     podada nas doze últimas. Quem perguntar "cadê o fechamento de julho?" não
--     tem resposta: as tarefas de julho SÃO as de agosto, zeradas.
--
--     Então a volta passa a deixar um `ciclos`: uma linha por período
--     encerrado, com o que aconteceu dentro.
--
--     **O conteúdo é congelado, e não apontado.** Guardar o id das tarefas não
--     serviria de nada: elas continuam vivas e mudam no período seguinte, então
--     o "arquivo de julho" mostraria o estado de agosto. A fotografia em jsonb
--     é a única forma honesta de dizer o que aconteceu naquele mês.
--
--     **E os anexos MUDAM de dono.** O documento pendurado na tarefa de julho
--     ficaria pendurado na de agosto, porque é a mesma linha: em um ano seriam
--     doze faturas na mesma tarefa, e nenhuma delas achável pelo mês. Eles vão
--     para o ciclo fechado, e o seguinte nasce limpo, que é o ponto. Documento
--     que vale todo mês (um modelo, uma instrução) não é anexo de tarefa: é
--     nota, e nota não é tocada aqui.
--
--     **Quem escreve isto é um gatilho em `historico`**, e não o
--     `decidir_etapa`. Dois motivos: aquela inserção acontece no instante exato
--     (depois de a situação ser decidida, antes de as tarefas serem zeradas), e
--     `decidir_etapa` tem TRÊS definições no arquivo, então mexer no corpo dela
--     é mexer em três lugares e esquecer um.
-- --------------------------------------------------------------------------

create table if not exists public.ciclos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizacoes on delete cascade,
  fluxo_id   uuid not null references public.fluxos on delete cascade,
  /** O rótulo da volta, como a rotina o escreve: "2026-07", "julho/26". */
  periodo    text not null,
  situacao   text not null check (situacao in ('ok','late')),
  /** A fotografia das tarefas daquele período. Ver o comentário acima. */
  tarefas    jsonb not null default '[]'::jsonb,
  /** As decisões tomadas dentro dele: quem aprovou o quê, e com que ressalva. */
  decisoes   jsonb not null default '[]'::jsonb,
  comecou_em timestamptz,
  fechou_em  timestamptz not null default now(),
  fechou_id  uuid references public.perfis on delete set null,
  criado_em  timestamptz not null default now()
);

-- Uma volta por período. Rodar a virada duas vezes não cria dois arquivos.
create unique index if not exists ciclos_uk on public.ciclos (fluxo_id, periodo);
create index if not exists ciclos_idx on public.ciclos (fluxo_id, fechou_em desc);

alter table public.ciclos enable row level security;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.ciclos';
  execute 'create trigger ao_inserir_org before insert on public.ciclos
             for each row execute function public.carimbar_org()';
end $$;

-- Quem enxerga a track enxerga o arquivo dela. Ninguém escreve à mão: o
-- arquivo é escrito pela virada, e reescrevê-lo seria reescrever o passado.
drop policy if exists cic_sel on public.ciclos;
create policy cic_sel on public.ciclos for select
  using (minha(org_id) and ativo() and ve_fluxo(fluxo_id));

-- --------------------------------------------------------------------------
-- O anexo ganha um terceiro dono possível
-- --------------------------------------------------------------------------

alter table public.anexos add column if not exists ciclo_id uuid
  references public.ciclos on delete cascade;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'anexos_de_uma_coisa') then
    alter table public.anexos drop constraint anexos_de_uma_coisa;
  end if;
  alter table public.anexos add constraint anexos_de_uma_coisa
    check (num_nonnulls(item_id, nota_id, ciclo_id) = 1);
end $$;

create index if not exists anexos_ciclo_idx on public.anexos (ciclo_id) where ciclo_id is not null;

drop policy if exists anx_sel on public.anexos;
create policy anx_sel on public.anexos for select using (
  minha(org_id) and ativo() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and ve_nota(nota_id))
    or (ciclo_id is not null and exists (
      select 1 from ciclos c where c.id = ciclo_id and ve_fluxo(c.fluxo_id)))
  ));

-- Pendurar direto num ciclo não existe: o anexo chega lá pela virada, e mais
-- nada. A política de insert continua falando só de tarefa e de nota.
drop policy if exists anx_ins on public.anexos;
create policy anx_ins on public.anexos for insert with check (
  minha(org_id) and ativo() and autor_id = meu_perfil() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and minha_nota(nota_id))
  ));

-- --------------------------------------------------------------------------
-- A virada, arquivando
-- --------------------------------------------------------------------------

create or replace function public.arquivar_ciclo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org   uuid;
  v_id    uuid;
  v_desde timestamptz;
  v_quem  uuid := coalesce(meu_perfil(), perfil_de_quem_age());
begin
  select org_id into v_org from fluxos where id = new.fluxo_id;
  if v_org is null then return new; end if;

  -- Desde quando é esta volta: o fim da anterior, ou o nascimento da track.
  select coalesce(max(c.fechou_em), (select f.criado_em from fluxos f where f.id = new.fluxo_id))
    into v_desde from ciclos c where c.fluxo_id = new.fluxo_id;

  insert into ciclos (org_id, fluxo_id, periodo, situacao, comecou_em, fechou_id,
                      tarefas, decisoes)
  values (
    v_org, new.fluxo_id, new.periodo, new.situacao, v_desde, v_quem,
    -- O nome de quem fez vai junto do id: o id some quando a pessoa sai, e o
    -- arquivo de dois anos atrás precisa continuar dizendo quem fez.
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'texto', i.texto, 'prazo', i.prazo, 'feito', i.feito, 'feito_em', i.feito_em,
        'ressalva', i.ressalva, 'quem_id', i.resp_id,
        'quem', (select p.nome from perfis p where p.id = i.resp_id),
        'etapa', (select e.nome from etapas e where e.id = i.etapa_id))
        order by i.ordem, i.criado_em)
      from itens i where i.fluxo_id = new.fluxo_id), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', d.tipo, 'nota', d.nota, 'quando', d.criado_em, 'quem_id', d.quem_id,
        'quem', (select p.nome from perfis p where p.id = d.quem_id),
        'etapa', (select e.nome from etapas e where e.id = d.etapa_id))
        order by d.criado_em)
      from decisoes d
      -- Maior, e não maior ou igual: `now()` é o horário da TRANSAÇÃO, então a
      -- decisão que causou a virada e o fechamento que ela gerou têm o mesmo
      -- instante. Com `>=`, a decisão que fechou julho apareceria também em
      -- agosto, e o arquivo de cada mês carregaria a decisão do anterior.
      where d.fluxo_id = new.fluxo_id and d.criado_em > v_desde), '[]'::jsonb))
  on conflict (fluxo_id, periodo) do nothing
  returning id into v_id;

  -- Já havia arquivo daquele período: nada a mover, e nada a reescrever.
  if v_id is null then return new; end if;

  -- Os documentos vão junto, e a tarefa fica limpa para a volta seguinte.
  update anexos set ciclo_id = v_id, item_id = null, fluxo_id = null
  where item_id in (select id from itens where fluxo_id = new.fluxo_id);

  return new;
end $$;

drop trigger if exists ao_virar_ciclo on public.historico;
create trigger ao_virar_ciclo after insert on public.historico
  for each row execute function public.arquivar_ciclo();

-- --------------------------------------------------------------------------
-- 46. Por onde o WhatsApp da empresa fala
--
--     Eram só duas formas de falar para fora, e as duas passavam pela Twilio.
--     Agora a Cloud API da própria Meta é a outra, e a diferença não é de
--     preço apenas: na Meta o remetente de TESTE é de graça e manda para cinco
--     telefones, o que permite provar o app falando primeiro sem contratar
--     nada. Sem isso, metade do que já está construído (a pergunta do dia, o
--     lembrete, o pedido de aprovação) não sai do lugar.
--
--     As três colunas que já existiam servem às duas, com outro sentido:
--
--       `whats_conector`  o endereço e a credencial. Na Twilio é o token da
--                         conta; na Meta é o token permanente do usuário de
--                         sistema, sempre como Bearer.
--       `whats_sid`       na Twilio, o SID da conta. Na Meta, o id do número
--                         (`phone_number_id`), que é o que vai na URL.
--       `whats_de`        o número que aparece para quem recebe, nas duas.
--
--     Reaproveitar em vez de criar seis colunas novas é o que mantém uma
--     empresa com uma configuração só, e a tela de conectores sem um segundo
--     formulário quase igual ao primeiro.
-- --------------------------------------------------------------------------

alter table public.organizacoes add column if not exists whats_via text not null default 'twilio';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'org_whats_via') then
    alter table public.organizacoes add constraint org_whats_via
      check (whats_via in ('twilio', 'meta'));
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 47. O nono dígito, que o WhatsApp come
--
--     O WhatsApp identifica quem escreve por `wa_id`, e para número brasileiro
--     antigo ele costuma vir SEM o nono dígito: quem cadastrou +55 42 99978-3288
--     aparece como 554299783288. A conferência era de dígito por dígito, então
--     o app não reconhecia a própria pessoa e respondia "este número não está
--     ligado ao seu", que é a frase mais desanimadora possível para quem acabou
--     de configurar tudo certo.
--
--     Não dá para consertar do lado de fora, porque quem manda o número é o
--     WhatsApp, e ele manda dos dois jeitos dependendo de quando a linha foi
--     registrada. Então a comparação passa a aceitar as duas formas, e só para
--     celular brasileiro: `55` + dois dígitos de área + oito ou nove do número.
--     Fora disso nada muda, para não casar números de outros países por engano.
-- --------------------------------------------------------------------------

/**
 * As formas em que aquele telefone pode chegar. Sempre só dígitos.
 *
 * Uma para número que já não é brasileiro ou não é celular, duas quando o nono
 * dígito está em jogo.
 */
create or replace function public.formas_do_fone(p_fone text)
returns text[] language plpgsql immutable set search_path = public as $$
declare d text; area text; resto text;
begin
  d := regexp_replace(coalesce(p_fone, ''), '[^0-9]', '', 'g');
  if d = '' then return array[]::text[]; end if;
  if left(d, 2) <> '55' then return array[d]; end if;

  area := substr(d, 3, 2);
  resto := substr(d, 5);
  -- Com nove dígitos e começando por 9, a outra forma é sem ele.
  if length(resto) = 9 and left(resto, 1) = '9' then
    return array[d, '55' || area || substr(resto, 2)];
  end if;
  -- Com oito, a outra forma é com o nove na frente.
  if length(resto) = 8 then
    return array[d, '55' || area || '9' || resto];
  end if;
  return array[d];
end $$;

create or replace function public.perfil_do_telefone(p_fone text)
returns uuid language sql stable security definer set search_path = public as $$
  select c.perfil_id from avisos_contato c
  join perfis p on p.id = c.perfil_id and p.ativo
  where regexp_replace(c.telefone, '[^0-9]', '', 'g') = any (formas_do_fone(p_fone))
    and regexp_replace(coalesce(p_fone, ''), '[^0-9]', '', 'g') <> ''
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- 48. O raio-X: o que o processo cobra e não entrega
--
--     A descoberta (seção 39) mostra o processo que a casa já tem. Este mostra
--     onde o processo que ela já desenhou está doendo, e em DIAS: "foram 21
--     dias esperando esta aprovação" é uma frase que o dono resolve, e "34% de
--     retrabalho" não é.
--
--     Duas funções entregam o que `lib/raiox.ts` precisa, e elas existem no
--     banco porque montar isso no cliente exigiria trazer decisões, etapas e
--     tarefas de seis meses para o navegador. O cálculo fica em TypeScript, com
--     testes, e não em SQL: a regra do que é carimbo e do que é gargalo muda, e
--     mudar regra em função de banco é mudar sem rede.
--
--     `raiox_achados` guarda o que foi encontrado, com o estado à vista, pelo
--     mesmo motivo de `processos_descobertos`: o achado vira uma mensagem com
--     link, e o link precisa abrir alguma coisa. E o que foi resolvido ou
--     ignorado não volta no mês seguinte, porque repetir o que a pessoa já
--     respondeu é o jeito mais rápido de ela parar de ler.
-- --------------------------------------------------------------------------

/**
 * Cada passagem por um checkpoint: quando começou, quando ficou pronta, quando
 * foi decidida e como.
 *
 * `comecou_em` é a decisão anterior daquela track, ou o nascimento dela. É
 * isso que separa o tempo DESTE checkpoint do tempo da track inteira.
 */
create or replace function public.passagens_do_raiox(p_org uuid, p_desde timestamptz)
returns table (
  etapa text, fluxo_id uuid,
  comecou_em timestamptz, pronto_em timestamptz, decidido_em timestamptz, tipo text
) language sql security definer set search_path = public as $$
  select
    e.nome,
    d.fluxo_id,
    coalesce(
      (select max(d2.criado_em) from decisoes d2
        where d2.fluxo_id = d.fluxo_id and d2.criado_em < d.criado_em),
      (select f.criado_em from fluxos f where f.id = d.fluxo_id)),
    (select max(i.feito_em) from itens i where i.etapa_id = d.etapa_id and i.feito),
    d.criado_em,
    d.tipo
  from decisoes d
  join etapas e on e.id = d.etapa_id
  where d.org_id = p_org and d.criado_em >= p_desde
  order by d.criado_em
$$;

revoke all on function public.passagens_do_raiox(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.passagens_do_raiox(uuid, timestamptz) to service_role;

/** Os prazos que foram empurrados e aceitos, pelo checkpoint em que moram. */
create or replace function public.empurroes_do_raiox(p_org uuid, p_desde timestamptz)
returns table (etapa text, dias int, quando timestamptz)
language sql security definer set search_path = public as $$
  select e.nome, greatest(0, (pp.para - coalesce(pp.de, pp.para)))::int, pp.decidido_em
  from pedidos_prazo pp
  join itens i on i.id = pp.item_id
  join etapas e on e.id = i.etapa_id
  where pp.org_id = p_org and pp.estado = 'aceito'
    and pp.decidido_em is not null and pp.decidido_em >= p_desde
    and pp.para > coalesce(pp.de, pp.para)
$$;

revoke all on function public.empurroes_do_raiox(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.empurroes_do_raiox(uuid, timestamptz) to service_role;

/**
 * Quando o raio-X daquela empresa rodou pela última vez.
 *
 * Ele é mensal, e não de hora em hora: os sinais são sobre o que se repete, e
 * repetição não muda entre as 10h e as 11h. Rodar toda hora seria varrer seis
 * meses de decisões 24 vezes por dia para chegar no mesmo número, que é o
 * mesmo erro que a seção 42 consertou na descoberta.
 */
alter table public.organizacoes add column if not exists raiox_em timestamptz;

create table if not exists public.raiox_achados (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references public.organizacoes on delete cascade,
  chave     text not null,
  /** O checkpoint de que ele fala, pelo nome: ele se repete em muitas tracks. */
  alvo      text not null,
  dias      numeric not null default 0,
  amostra   int not null default 0,
  texto     text not null,
  conserto  text not null default '',
  estado    text not null default 'novo'
            check (estado in ('novo','visto','resolvido','ignorado')),
  criado_em timestamptz not null default now(),
  mexido_em timestamptz not null default now()
);

-- Um achado por chave e por alvo. Rodar de novo ATUALIZA o número em vez de
-- empilhar o mesmo problema doze vezes.
create unique index if not exists raiox_uk on public.raiox_achados (org_id, chave, alvo);
create index if not exists raiox_idx on public.raiox_achados (org_id, dias desc);

alter table public.raiox_achados enable row level security;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.raiox_achados';
  execute 'create trigger ao_inserir_org before insert on public.raiox_achados
             for each row execute function public.carimbar_org()';
end $$;

-- Quem manda no processo vê o raio-X dele. Não é para a casa inteira: o achado
-- fala do que está custando dias, e isso é conversa de quem pode mudar.
drop policy if exists rx_sel on public.raiox_achados;
create policy rx_sel on public.raiox_achados for select
  using (minha(org_id) and ativo()
    and exists (select 1 from perfis p where p.id = meu_perfil()
                  and p.papel in ('admin','gestor')));

-- Sem insert nem update por gente: quem escreve é o pulso, e quem responde
-- passa pela função abaixo.

/**
 * Guarda ou atualiza um achado.
 *
 * O que já foi resolvido ou ignorado fica como está, e só o número é
 * atualizado: insistir no que a pessoa já respondeu é o mesmo erro de propor
 * duas vezes o processo que ela recusou.
 */
create or replace function public.guardar_achado(
  p_org uuid, p_chave text, p_alvo text, p_dias numeric, p_amostra int,
  p_texto text, p_conserto text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_estado text;
begin
  select id, estado into v_id, v_estado from raiox_achados
  where org_id = p_org and chave = p_chave and alvo = p_alvo;

  if v_id is null then
    insert into raiox_achados (org_id, chave, alvo, dias, amostra, texto, conserto)
    values (p_org, p_chave, p_alvo, p_dias, p_amostra, p_texto, p_conserto)
    returning id into v_id;
    return v_id;
  end if;

  update raiox_achados set
    dias = p_dias, amostra = p_amostra, texto = p_texto, conserto = p_conserto,
    estado = case when v_estado in ('resolvido','ignorado') then v_estado else 'novo' end,
    mexido_em = now()
  where id = v_id;
  return v_id;
end $$;

/** "Resolvi" ou "deixa pra lá", ditos por quem manda no processo. */
create or replace function public.responder_achado(p_id uuid, p_estado text)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if p_estado not in ('visto','resolvido','ignorado') then
    raise exception 'Estado inválido.';
  end if;
  select org_id into v_org from raiox_achados where id = p_id;
  if v_org is null then raise exception 'Achado não encontrado.'; end if;
  if not manda_no_processo_de(v_org) then
    raise exception 'O raio-X é de quem responde pela operação.';
  end if;
  update raiox_achados set estado = p_estado, mexido_em = now() where id = p_id;
end $$;

-- --------------------------------------------------------------------------
-- O achado chega pelo aviso, e não por painel
--
--     Painel é o lugar onde o problema espera alguém ir olhar, e ninguém vai.
--     O raio-X chega junto do resto, na caixa que a pessoa já abre, com o custo
--     em dias na primeira linha e um link que abre direto no conserto.
--
--     Não é urgente, e isso é escolha: urgente é o que já venceu, o que trava
--     outra pessoa e o que só aquela pessoa destrava. Um checkpoint que custa
--     21 dias por trimestre não muda nada se for lido hoje à noite em vez de
--     agora, e tocar o celular de alguém por isso gasta a credibilidade que os
--     avisos de verdade vão precisar.
-- --------------------------------------------------------------------------

do $$
begin
  alter table public.avisos drop constraint if exists avisos_tipo_check;
  alter table public.avisos add constraint avisos_tipo_check check (tipo in (
    'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo',
    'nota','feedback','mensagem','parada','carga','rotina','raiox'));
end $$;

/**
 * Avisa quem manda no processo sobre um achado.
 *
 * A chave carrega o id do achado, e não a data: o mesmo achado não deve avisar
 * de novo todo mês. Ele volta a avisar quando for de fato outro (outro
 * checkpoint, outro sinal), porque aí é um id novo.
 */
create or replace function public.avisar_do_raiox(p_achado uuid)
returns int language plpgsql security definer set search_path = public as $$
declare a raiox_achados%rowtype; p record; n int := 0;
begin
  select * into a from raiox_achados where id = p_achado;
  if a.id is null then return 0; end if;

  for p in select id from perfis
           where org_id = a.org_id and ativo and papel in ('admin','gestor') loop
    if avisar(p.id, 'raiox', 'O processo está custando dias', a.texto,
              'raiox:' || a.id::text, false) then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- --------------------------------------------------------------------------
-- 49. A caixa de e-mail conectada, lida pelo envelope
--
--     A segunda entrada do trabalho. O plano previa um endereço para onde
--     encaminhar; a forma melhor é a contrária, porque ninguém encaminha: a
--     pessoa conecta a caixa dela e o app repara no que já acontece ali.
--
--     **O app não lê o corpo de e-mail nenhum**, e isso é estrutura, não
--     promessa: o leitor pede ao servidor só o envelope (remetente,
--     destinatário, assunto, data, nome dos anexos), que é um pedido diferente
--     de pedir a mensagem, e o corpo não chega a passar pela rede. Ver
--     `lib/caixa.ts`, que explica por que não precisa e por que custaria caro
--     nos dois sentidos.
--
--     **A caixa é DA PESSOA**, como a agenda externa, e por isso a tabela é a
--     mesma forma: uma linha por perfil, política restrita a `auth.uid()`, e
--     nem o administrador lê. A credencial é uma senha de aplicativo, gerada
--     por ela no provedor dela, e fica cifrada com a mesma chave dos
--     conectores.
--
--     `desde` existe para a primeira leitura não varrer dez anos de caixa: ela
--     começa hoje e anda para a frente. Ninguém quer que o app descubra uma
--     tarefa a partir de um e-mail de 2019.
-- --------------------------------------------------------------------------

create table if not exists public.caixas (
  perfil_id  uuid primary key references public.perfis on delete cascade,
  org_id     uuid not null references public.organizacoes on delete cascade,
  /** O endereço, que é o que casa com o que a tarefa espera. */
  email      text not null,
  servidor   text not null,
  porta      int not null default 993,
  usuario    text not null default '',
  /** A senha de aplicativo, cifrada. Nunca em claro, nunca no cliente. */
  segredo    text not null,
  /** As pastas a olhar. Vazio é a entrada e os enviados. */
  pastas     text[] not null default array['INBOX']::text[],
  ligada     boolean not null default true,
  desde      timestamptz not null default now(),
  lida_em    timestamptz,
  /** A última queixa do servidor, para a tela saber dizer o que houve. */
  erro       text,
  criado_em  timestamptz not null default now()
);

alter table public.caixas enable row level security;

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.caixas';
  execute 'create trigger ao_inserir_org before insert on public.caixas
             for each row execute function public.carimbar_org()';
end $$;

/**
 * A caixa é de quem a conectou, e de mais ninguém.
 *
 * Sem exceção para administrador, pelo mesmo motivo da nota e da agenda
 * externa: aqui dentro tem o endereço de quem essa pessoa fala, e isso não é
 * assunto da casa. O que a casa vê é o resultado, que é a tarefa concluída.
 */
drop policy if exists cx_sel on public.caixas;
create policy cx_sel on public.caixas for select
  using (minha(org_id) and ativo()
    and perfil_id in (select id from perfis where user_id = auth.uid()));

drop policy if exists cx_ins on public.caixas;
create policy cx_ins on public.caixas for insert
  with check (minha(org_id) and ativo()
    and perfil_id in (select id from perfis where user_id = auth.uid()));

drop policy if exists cx_upd on public.caixas;
create policy cx_upd on public.caixas for update
  using (minha(org_id) and ativo()
    and perfil_id in (select id from perfis where user_id = auth.uid()));

drop policy if exists cx_del on public.caixas;
create policy cx_del on public.caixas for delete
  using (perfil_id in (select id from perfis where user_id = auth.uid()));

/**
 * O envelope já visto, para não casar a mesma entrega duas vezes.
 *
 * Guarda o `Message-ID` e nada do conteúdo: nem assunto, nem remetente. O que
 * esta tabela responde é uma pergunta só, "isto eu já olhei?", e responder mais
 * do que isso seria guardar o rastro de com quem a pessoa fala.
 */
create table if not exists public.envelopes_vistos (
  org_id    uuid not null references public.organizacoes on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  msg_id    text not null,
  visto_em  timestamptz not null default now(),
  primary key (perfil_id, msg_id)
);

alter table public.envelopes_vistos enable row level security;
-- Sem política nenhuma: só o servidor escreve e lê, com a chave de serviço.
-- Nem a dona da caixa precisa consultar isto, porque não há o que ver aqui.

do $$
begin
  execute 'drop trigger if exists ao_inserir_org on public.envelopes_vistos';
  execute 'create trigger ao_inserir_org before insert on public.envelopes_vistos
             for each row execute function public.carimbar_org()';
end $$;

create index if not exists env_vistos_idx on public.envelopes_vistos (perfil_id, visto_em desc);

/**
 * As caixas que o pulso precisa ler, com a credencial.
 *
 * Só o servidor executa, pelo mesmo motivo de `pulso_pode`: quem pergunta não
 * tem sessão, e uma função `security definer` que devolve segredo tem que ter a
 * permissão como trava, não um `if` dentro dela.
 */
create or replace function public.caixas_para_ler()
returns table (
  perfil_id uuid, org_id uuid, email text, servidor text, porta int,
  usuario text, segredo text, pastas text[], desde timestamptz, lida_em timestamptz
) language sql security definer set search_path = public as $$
  select c.perfil_id, c.org_id, c.email, c.servidor, c.porta,
         coalesce(nullif(c.usuario, ''), c.email), c.segredo, c.pastas, c.desde, c.lida_em
  from caixas c
  join perfis p on p.id = c.perfil_id and p.ativo
  where c.ligada
$$;

revoke all on function public.caixas_para_ler() from public, anon, authenticated;
grant execute on function public.caixas_para_ler() to service_role;

/** O que cada tarefa em aberto está esperando, e de quem. */
create or replace function public.esperas_da_caixa(p_org uuid)
returns table (item_id uuid, texto text, quem uuid, email text, prazo date)
language sql security definer set search_path = public as $$
  select i.id, i.texto, i.resp_id, c.email, i.prazo
  from itens i
  join fluxos f on f.id = i.fluxo_id
  left join caixas c on c.perfil_id = i.resp_id
  where i.org_id = p_org and not i.feito and f.desfecho is null and not f.concluido
$$;

revoke all on function public.esperas_da_caixa(uuid) from public, anon, authenticated;
grant execute on function public.esperas_da_caixa(uuid) to service_role;

-- --------------------------------------------------------------------------
-- 50. A porta do cliente externo se abre sozinha, e continua sendo você quem passa
--
--     O feedback existe desde a seção 24 e quase nunca é pedido, porque pedir
--     exige lembrar de pedir justo no dia em que a obra acabou e todo mundo já
--     está na próxima. O que faltava não era a peça, era o empurrão.
--
--     Então o DESFECHO passa a preparar o pedido: nasce o link, e quem fechou a
--     track recebe um aviso dizendo que ele está pronto. **Mandar continua
--     sendo gesto de gente**, e isso não é timidez: mandar exigiria o e-mail do
--     cliente guardado em algum lugar, e o cliente nunca combinou isso com
--     ninguém. O app prepara; quem conhece o cliente escolhe o canal e a hora.
--
--     A pergunta muda com o motivo. Para quem recebeu uma obra entregue, "como
--     foi?" faz sentido; para quem viu o trabalho ser cancelado, a mesma frase
--     é deselegante e não colhe nada. Por isso o `motivo` fica guardado.
--
--     E a resposta vira EVENTO, entrando na view `eventos` junto do resto: é
--     assim que ela chega à descoberta e ao raio-X sem ninguém ligar um fio
--     novo. Nota baixa é sinal de qualidade, e qualidade não se conserta com
--     prazo: são coisas diferentes, e quem lê o raio-X precisa saber qual é.
-- --------------------------------------------------------------------------

alter table public.feedbacks add column if not exists motivo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'feedbacks_motivo') then
    alter table public.feedbacks add constraint feedbacks_motivo
      check (motivo is null or motivo in ('concluido','cancelado'));
  end if;
end $$;

/**
 * Ao arquivar, prepara o pedido e avisa quem fechou.
 *
 * Não cria um segundo quando já existe um em aberto: a track pode ser reaberta
 * e arquivada de novo, e dois links vivos para a mesma coisa é o cliente
 * recebendo duas vezes e respondendo em um deles.
 */
create or replace function public.pedir_feedback_no_fim()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_quem uuid;
begin
  if new.desfecho is null or new.desfecho is not distinct from old.desfecho then
    return new;
  end if;

  if exists (select 1 from feedbacks f
             where f.fluxo_id = new.id and f.respondido_em is null and f.vence_em > now()) then
    return new;
  end if;

  v_quem := coalesce(meu_perfil(), perfil_de_quem_age(), new.dono_id);

  insert into feedbacks (fluxo_id, token, pediu_id, para, motivo)
  values (new.id, encode(gen_random_bytes(32), 'base64'), v_quem, '', new.desfecho)
  returning id into v_id;

  -- O aviso leva à track, e não carrega o token: a caixa é de uma pessoa só,
  -- mas credencial em texto de aviso é credencial em mais um lugar. Na track o
  -- link está pronto, a um toque de copiar.
  perform avisar(v_quem, 'feedback',
    case when new.desfecho = 'concluido'
      then 'Pronto para pedir a opinião de quem recebeu'
      else 'Vale perguntar por que não seguiu' end,
    new.nome, 'fimfb:' || v_id::text, false, new.id);

  return new;
end $$;

drop trigger if exists ao_arquivar_pede_feedback on public.fluxos;
create trigger ao_arquivar_pede_feedback after update on public.fluxos
  for each row execute function public.pedir_feedback_no_fim();

-- --------------------------------------------------------------------------
-- A resposta do cliente vira evento
-- --------------------------------------------------------------------------

create or replace view public.eventos as
  select a.org_id, a.criado_em as quando, 'atividade'::text as tipo,
         a.texto as detalhe, a.fluxo_id, a.quem_id,
         coalesce((select p.area_id from perfis p where p.id = a.quem_id),
                  (select f.area_id from fluxos f where f.id = a.fluxo_id)) as area_id
  from atividades a
  union all
  select d.org_id, d.criado_em, 'decisao:' || d.tipo,
         d.nota, d.fluxo_id, d.quem_id,
         coalesce((select p.area_id from perfis p where p.id = d.quem_id),
                  (select f.area_id from fluxos f where f.id = d.fluxo_id))
  from decisoes d
  union all
  select i.org_id, i.criado_em, 'tarefa:nasceu', i.texto, i.fluxo_id, i.autor_id,
         coalesce((select p.area_id from perfis p where p.id = i.autor_id),
                  (select f.area_id from fluxos f where f.id = i.fluxo_id))
  from itens i
  union all
  select i.org_id, i.feito_em, 'tarefa:feita', i.texto, i.fluxo_id, i.resp_id,
         coalesce((select p.area_id from perfis p where p.id = i.resp_id),
                  (select f.area_id from fluxos f where f.id = i.fluxo_id))
  from itens i where i.feito and i.feito_em is not null
  union all
  select pp.org_id, pp.criado_em, 'prazo:pedido', pp.motivo, pp.fluxo_id, pp.pedido_por,
         (select p.area_id from perfis p where p.id = pp.pedido_por)
  from pedidos_prazo pp
  union all
  select pp.org_id, pp.decidido_em, 'prazo:' || pp.estado, pp.motivo, pp.fluxo_id, pp.decidido_por,
         (select p.area_id from perfis p where p.id = pp.decidido_por)
  from pedidos_prazo pp where pp.decidido_em is not null
  union all
  select an.org_id, an.criado_em, 'anexo', an.nome, an.fluxo_id, an.autor_id,
         (select p.area_id from perfis p where p.id = an.autor_id)
  from anexos an where an.fluxo_id is not null
  union all
  select s.org_id, s.decidido_em, 'proposta:' || s.tipo, s.texto,
         nullif(s.dados->>'fluxo_id','')::uuid, s.decidido_por,
         (select p.area_id from perfis p where p.id = s.decidido_por)
  from sugestoes s where s.estado = 'aceita' and s.decidido_em is not null
  union all
  /**
   * A opinião de quem recebeu o trabalho.
   *
   * O tipo carrega a nota (`feedback:5`), porque o que diferencia uma entrega
   * elogiada de uma reclamada é o número, e a descoberta agrupa por TIPO. Sem
   * ele, as duas seriam o mesmo evento e a diferença sumiria.
   *
   * `quem_id` fica nulo de propósito: quem respondeu não tem conta no app e não
   * é perfil nenhum. A área vem da track, que é o único endereço que existe.
   */
  select f.org_id, f.respondido_em, 'feedback:' || coalesce(f.nota::text, 'sem nota'),
         f.texto, f.fluxo_id, null::uuid,
         (select x.area_id from fluxos x where x.id = f.fluxo_id)
  from feedbacks f where f.respondido_em is not null;

/**
 * O que foi entregue e o que o cliente achou.
 *
 * Só o que teve resposta: a entrega sem opinião não diz nada sobre qualidade, e
 * contá-la como boa seria inventar o silêncio a favor da casa.
 */
create or replace function public.entregas_do_raiox(p_org uuid, p_desde timestamptz)
returns table (fluxo_id uuid, nome text, nota int, dias numeric)
language sql security definer set search_path = public as $$
  select f.id, f.nome, fb.nota,
         greatest(0, extract(epoch from (coalesce(f.arquivado_em, now()) - f.criado_em)) / 86400)::numeric
  from feedbacks fb
  join fluxos f on f.id = fb.fluxo_id
  where fb.org_id = p_org and fb.respondido_em is not null and fb.respondido_em >= p_desde
$$;

revoke all on function public.entregas_do_raiox(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.entregas_do_raiox(uuid, timestamptz) to service_role;
