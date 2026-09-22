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
  ia_modo        text not null default 'sugerir' check (ia_modo in ('sugerir','aplicar'))
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
  tipo        text not null default 'aberto' check (tipo in ('aberto','fechado','direto')),
  area_id     uuid references public.areas on delete set null,
  fluxo_id    uuid references public.fluxos on delete cascade,
  empresa_id  uuid references public.empresas on delete set null,
  criado_por  uuid references public.perfis on delete set null,
  criado_em   timestamptz not null default now(),
  arquivado   boolean not null default false
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
  criado_em   timestamptz not null default now(),
  editado_em  timestamptz
);

-- O que a leitura da conversa propõe. Guardar a proposta separada do que ela
-- muda é o que deixa aceitar com um toque e recusar sem deixar rastro no trabalho.
create table if not exists public.sugestoes (
  id            uuid primary key default gen_random_uuid(),
  canal_id      uuid not null references public.canais on delete cascade,
  mensagem_id   uuid references public.mensagens on delete set null,
  tipo          text not null check (tipo in ('tarefa','prazo','concluir','decisao','trava')),
  texto         text not null,
  -- O trecho da conversa que deu origem, para ninguém aceitar no escuro.
  motivo        text not null default '',
  dados         jsonb not null default '{}'::jsonb,
  estado        text not null default 'aberta' check (estado in ('aberta','aceita','recusada')),
  criado_em     timestamptz not null default now(),
  decidido_por  uuid references public.perfis on delete set null,
  decidido_em   timestamptz
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

create index if not exists anexos_item_idx  on public.anexos (item_id);
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
    'anexos','decisoes','pedidos_prazo'
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
do $$
declare t text;
begin
  foreach t in array array[
    'empresas','areas','convites',
    'processos','processo_etapas','processo_itens',
    'fluxos','fluxo_pessoas','etapas','itens','dependencias','historico','atividades',
    'compromissos','convidados','agendas_externas','ocupacao_externa',
    'canais','canal_membros','mensagens','sugestoes',
    'anexos','decisoes','pedidos_prazo'
  ] loop
    execute format('drop trigger if exists ao_inserir_org on public.%I', t);
    execute format(
      'create trigger ao_inserir_org before insert on public.%I
         for each row execute function public.carimbar_org()', t);
  end loop;
end $$;

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
    ));
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
--    A primeira pessoa que se cadastrar vira admin e já entra liberada.
--    As demais entram aguardando liberação (não enxergam dado nenhum).
-- --------------------------------------------------------------------------

-- Domínios de e-mail pessoal. Ninguém "reserva" o gmail.com para a empresa dele,
-- senão a primeira pessoa a se cadastrar com gmail sequestraria todo mundo depois.
create or replace function public.dominio_publico(d text)
returns boolean language sql immutable as $$
  select lower(d) = any (array[
    'gmail.com','hotmail.com','outlook.com','live.com','yahoo.com','yahoo.com.br',
    'icloud.com','me.com','bol.com.br','uol.com.br','terra.com.br','globo.com',
    'proton.me','protonmail.com','msn.com','aol.com','zoho.com','gmx.com'
  ]);
$$;

-- Cadastro. São quatro caminhos, nesta ordem de prioridade:
--
--   1. Tem convite válido: entra na organização de quem convidou, já com o papel,
--      a área e o gestor que o superior definiu. Nasce pronta para trabalhar.
--   2. Informou o nome de uma empresa: abre a organização e vira a dona dela.
--   3. E-mail do mesmo domínio de uma organização que aceita entrada por domínio:
--      entra ali, mas aguardando liberação de um administrador.
--   4. Nada bateu: abre a organização com o nome do domínio e vira a dona.
--
-- O papel NUNCA vem do formulário. Quem se cadastra sozinho é dono da própria
-- empresa; quem entra por convite recebe o papel que o superior escolheu. Deixar
-- a pessoa escolher seria um convite a todo mundo virar administrador.
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cv        convites%rowtype;
  v_org     uuid;
  v_nome    text := nullif(btrim(new.raw_user_meta_data->>'organizacao'), '');
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')));
  v_dominio text := lower(split_part(new.email, '@', 2));
  v_tipo    text := case when new.raw_user_meta_data->>'tipo' = 'pessoal' then 'pessoal' else 'equipe' end;
  v_guardar text;
  v_papel   text := 'colaborador';
  v_ativo   boolean := false;
  v_dono    boolean := false;
  v_auto    boolean;
  v_perfil  uuid;
  v_ve_area boolean := false;
  v_area    uuid;
  v_gestor  uuid;
  n int;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6A5E','#B5A08C'];
begin
  -- Conta pessoal nunca reserva o domínio da empresa. Se reservasse, o colega
  -- que se cadastrasse depois cairia dentro do espaço pessoal de quem chegou
  -- primeiro, o que é exatamente o contrário do que ele pediu.
  v_guardar := case
    when v_tipo = 'pessoal' or dominio_publico(v_dominio) then null
    else v_dominio
  end;

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
    -- 2. Sem convite: o domínio do e-mail diz se a empresa já está aqui dentro.
    if v_guardar is not null then
      select id, entrada_por_dominio into v_org, v_auto
      from organizacoes where dominio = v_guardar;
    end if;

    if v_org is not null then
      -- A empresa existe. A pessoa entra nela como colaboradora, e só entra
      -- liberada se a empresa tiver aberto a porta para o próprio domínio.
      -- Fechada, que é o padrão, ela aparece na tela Equipe aguardando um sim.
      v_papel := 'colaborador';
      v_ativo := coalesce(v_auto, false);
    else
      -- 3. Empresa nova. Quem abre é a dona, e é o único jeito de virar dona.
      insert into organizacoes (nome, tipo, dominio)
      values (
        coalesce(v_nome, initcap(split_part(coalesce(v_guardar, split_part(new.email,'@',1)), '.', 1))),
        v_tipo,
        v_guardar
      )
      returning id into v_org;
      v_papel := 'admin';
      v_ativo := true;
      v_dono := true;
      v_ve_area := true;
    end if;
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

create or replace function public.salvar_fluxo(p_fluxo jsonb, p_etapas jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := meu_perfil();
  v_id  uuid := nullif(p_fluxo->>'id', '')::uuid;
  e     jsonb;
  k     int := 0;
  eid   uuid;
  ids   uuid[] := '{}';
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;
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
  p_prazo    date default null
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

  update fluxos set concluido = true where id = f.id;
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
create or replace function public.decidir_prazo(p_pedido uuid, p_aceita boolean)
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
    'anexos','decisoes','pedidos_prazo'
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
  select exists (
    select 1 from anexos a
    where a.caminho = p_caminho and minha(a.org_id) and ve_item(a.item_id)
  );
$$;

create or replace function public.posso_apagar_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  -- Com linha: manda a regra da linha. Sem linha (arquivo órfão, de um envio que
  -- falhou no meio), basta ser da sua organização, para dar para limpar.
  select coalesce(
    (select minha(a.org_id) and (a.autor_id = meu_perfil() or manda_no_processo(a.fluxo_id))
       from anexos a where a.caminho = p_caminho),
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
      'anexos','decisoes','pedidos_prazo'
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

-- Abrir mais um espaço sem sair da conta: o Track pessoal de quem já usa o da
-- empresa, ou o contrário. Nasce vazio, e quem abre é o dono.
create or replace function public.abrir_espaco(p_nome text, p_tipo text default 'pessoal')
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
