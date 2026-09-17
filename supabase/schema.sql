-- ==========================================================================
-- Esteira, estrutura do banco
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).
-- Ele pode ser rodado de novo sem quebrar nada.
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. Tabelas, na ordem em que dependem umas das outras
-- --------------------------------------------------------------------------

-- Uma linha por pessoa. O id é o mesmo do login (auth.users).
create table if not exists public.perfis (
  id         uuid primary key references auth.users on delete cascade,
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

-- Preferências da organização inteira. Sempre uma linha só.
create table if not exists public.config (
  id            text primary key default '1' check (id = '1'),
  organizacao   text not null default 'Esteira',
  multi         boolean not null default false,
  rotulo        text not null default 'Empresa',
  rotulo_plural text not null default 'Empresas'
);
insert into public.config (id) values ('1') on conflict (id) do nothing;

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
-- 2. Funções de apoio
--    security definer para não cair em recursão ao consultar perfis dentro
--    das políticas do próprio perfis.
-- --------------------------------------------------------------------------

create or replace function public.ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo);
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo and papel = 'admin');
$$;

-- A pessoa logada e todo mundo abaixo dela na hierarquia, em qualquer profundidade.
-- É isto que dá ao gestor o direito de acompanhar (e cobrar) a equipe dele.
create or replace function public.meu_alcance()
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive abaixo as (
    select id from perfis where id = auth.uid()
    union
    select p.id from perfis p join abaixo a on p.gestor_id = a.id
  )
  select id from abaixo;
$$;

-- Enxerga tudo da própria área, além do que é dela.
create or replace function public.ve_area_de(p_fluxo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p join fluxos f on f.id = p_fluxo
    where p.id = auth.uid() and p.ve_area and p.area_id is not null and f.area_id = p.area_id
  );
$$;

-- Uma tarefa aparece para quem responde por ela, para quem está acima dessa pessoa,
-- e para quem tem uma tarefa travada por ela.
create or replace function public.ve_item(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    eh_admin()
    or exists (select 1 from itens i where i.id = p_id and i.resp_id in (select meu_alcance()))
    or exists (
      select 1 from dependencias d join itens meu on meu.id = d.item_id
      where d.depende_de = p_id and meu.resp_id in (select meu_alcance())
    )
    or exists (select 1 from itens i where i.id = p_id and ve_area_de(i.fluxo_id));
$$;

-- Fluxo que a pessoa logada pode enxergar (privado só aparece para quem criou).
create or replace function public.ve_fluxo(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    -- só eu: ninguém além de quem criou
    exists (select 1 from fluxos x where x.id = f and x.visib = 'so_eu' and x.autor_id = auth.uid())
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
    );
$$;

-- Quem desenha o processo: admin, o autor, o dono, ou o gestor de quem é dono.
create or replace function public.manda_no_processo(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    eh_admin()
    or exists (
      select 1 from fluxos x
      where x.id = f and (x.autor_id = auth.uid() or x.dono_id = auth.uid())
    )
    or exists (
      select 1 from fluxos x join perfis p on p.id = auth.uid()
      where x.id = f and p.papel = 'gestor' and x.dono_id in (select meu_alcance())
    );
$$;

-- --------------------------------------------------------------------------
-- 3. Cadastro de pessoas
--    A primeira pessoa que se cadastrar vira admin e já entra liberada.
--    As demais entram aguardando liberação (não enxergam dado nenhum).
-- --------------------------------------------------------------------------

create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  primeiro boolean;
  n int;
  cv convites%rowtype;
  paleta text[] := array['#C2703C','#7D8471','#A8763E','#6E7B8B','#96705B','#5F7A6A','#A5645C','#7A6E8F'];
begin
  select not exists (select 1 from perfis) into primeiro;
  select count(*) into n from perfis;

  -- Convite pelo código informado no cadastro, ou pelo e-mail convidado.
  select * into cv from convites
  where usado_em is null
    and (
      codigo = upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')))
      or lower(email) = lower(new.email)
    )
  order by (codigo = upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')))) desc
  limit 1;

  insert into perfis (id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'nome'), ''),
      nullif(btrim(cv.nome), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    paleta[(n % 8) + 1],
    case when primeiro then 'admin' else coalesce(cv.papel, 'colaborador') end,
    cv.area_id,
    cv.gestor_id,
    case when primeiro then true else coalesce(cv.ve_area, false) end,
    -- Primeiro do banco entra liberado; os demais só com convite.
    primeiro or cv.id is not null
  )
  on conflict (id) do nothing;

  if cv.id is not null then
    update convites set usado_em = now(), usado_por = new.id where id = cv.id;
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
  if not eh_admin() then
    new.ativo := old.ativo;
    new.papel := old.papel;
    new.email := old.email;
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

alter table public.config     enable row level security;
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

-- perfis
drop policy if exists perfis_sel on public.perfis;
create policy perfis_sel on public.perfis for select
  using (id = auth.uid() or ativo() or eh_admin());

drop policy if exists perfis_upd_proprio on public.perfis;
create policy perfis_upd_proprio on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists perfis_upd_admin on public.perfis;
create policy perfis_upd_admin on public.perfis for update
  using (eh_admin()) with check (eh_admin());

drop policy if exists perfis_del_admin on public.perfis;
create policy perfis_del_admin on public.perfis for delete
  using (eh_admin() and id <> auth.uid());

-- config e empresas: todos os liberados leem, só admin muda
drop policy if exists config_sel on public.config;
create policy config_sel on public.config for select using (ativo());

drop policy if exists config_upd on public.config;
create policy config_upd on public.config for update using (eh_admin()) with check (eh_admin());

drop policy if exists empresas_sel on public.empresas;
create policy empresas_sel on public.empresas for select using (ativo());

drop policy if exists empresas_ins on public.empresas;
create policy empresas_ins on public.empresas for insert with check (eh_admin());

drop policy if exists empresas_upd on public.empresas;
create policy empresas_upd on public.empresas for update using (eh_admin()) with check (eh_admin());

drop policy if exists empresas_del on public.empresas;
create policy empresas_del on public.empresas for delete using (eh_admin());

-- areas: todos os liberados leem, só admin mexe na estrutura
drop policy if exists areas_sel on public.areas;
create policy areas_sel on public.areas for select using (ativo());

drop policy if exists areas_ins on public.areas;
create policy areas_ins on public.areas for insert with check (eh_admin());

drop policy if exists areas_upd on public.areas;
create policy areas_upd on public.areas for update using (eh_admin()) with check (eh_admin());

drop policy if exists areas_del on public.areas;
create policy areas_del on public.areas for delete using (eh_admin());

-- fluxos
drop policy if exists fluxos_sel on public.fluxos;
create policy fluxos_sel on public.fluxos for select
  using (ativo() and ve_fluxo(id));

drop policy if exists fluxos_ins on public.fluxos;
create policy fluxos_ins on public.fluxos for insert
  with check (ativo() and autor_id = auth.uid());

drop policy if exists fluxos_upd on public.fluxos;
create policy fluxos_upd on public.fluxos for update
  using (ativo() and ve_fluxo(id)) with check (ativo() and ve_fluxo(id));

drop policy if exists fluxos_del on public.fluxos;
create policy fluxos_del on public.fluxos for delete
  using (ativo() and (autor_id = auth.uid() or dono_id = auth.uid() or eh_admin()));

-- etapas: seguem a visibilidade do fluxo
drop policy if exists etapas_sel on public.etapas;
create policy etapas_sel on public.etapas for select using (ativo() and ve_fluxo(fluxo_id));

drop policy if exists etapas_ins on public.etapas;
create policy etapas_ins on public.etapas for insert with check (ativo() and ve_fluxo(fluxo_id));

drop policy if exists etapas_upd on public.etapas;
create policy etapas_upd on public.etapas for update
  using (ativo() and ve_fluxo(fluxo_id)) with check (ativo() and ve_fluxo(fluxo_id));

drop policy if exists etapas_del on public.etapas;
create policy etapas_del on public.etapas for delete using (ativo() and ve_fluxo(fluxo_id));

-- itens: além da visibilidade do fluxo, cada pessoa vê o que é dela, o que trava o
-- que é dela, e o de quem está abaixo dela
drop policy if exists itens_sel on public.itens;
create policy itens_sel on public.itens for select
  using (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = auth.uid()) and ve_item(id));

drop policy if exists itens_ins on public.itens;
create policy itens_ins on public.itens for insert
  with check (ativo() and ve_fluxo(fluxo_id) and autor_id = auth.uid());

drop policy if exists itens_upd on public.itens;
create policy itens_upd on public.itens for update
  using (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = auth.uid()))
  with check (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = auth.uid()));

drop policy if exists itens_del on public.itens;
create policy itens_del on public.itens for delete
  using (ativo() and ve_fluxo(fluxo_id) and (not priv or autor_id = auth.uid()));

-- dependências: seguem a visibilidade das duas pontas
drop policy if exists dep_sel on public.dependencias;
create policy dep_sel on public.dependencias for select
  using (ativo() and (ve_item(item_id) or ve_item(depende_de)));

drop policy if exists dep_ins on public.dependencias;
create policy dep_ins on public.dependencias for insert
  with check (ativo() and ve_item(item_id));

drop policy if exists dep_del on public.dependencias;
create policy dep_del on public.dependencias for delete
  using (ativo() and ve_item(item_id));

-- convites: quem convida é quem manda. A pessoa que se cadastra não lê a tabela;
-- o trigger resolve o convite dela por dentro, com direitos de definidor.
drop policy if exists convites_sel on public.convites;
create policy convites_sel on public.convites for select
  using (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'));

drop policy if exists convites_esc on public.convites;
create policy convites_esc on public.convites for all
  using (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'))
  with check (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'));

-- processos: todos os liberados leem, para poder criar esteira a partir deles.
-- Desenhar processo é decisão de quem manda, então escrever é de admin e gestor.
drop policy if exists proc_sel on public.processos;
create policy proc_sel on public.processos for select using (ativo());

drop policy if exists proc_esc on public.processos;
create policy proc_esc on public.processos for all
  using (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'))
  with check (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'));

drop policy if exists pe_sel on public.processo_etapas;
create policy pe_sel on public.processo_etapas for select using (ativo());

drop policy if exists pe_esc on public.processo_etapas;
create policy pe_esc on public.processo_etapas for all
  using (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'))
  with check (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'));

drop policy if exists pi_sel on public.processo_itens;
create policy pi_sel on public.processo_itens for select using (ativo());

drop policy if exists pi_esc on public.processo_itens;
create policy pi_esc on public.processo_itens for all
  using (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'))
  with check (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor'));

-- agenda: o conteúdo é de quem organiza, de quem foi convidado, e de todos
-- quando o compromisso foi marcado como visível
drop policy if exists comp_sel on public.compromissos;
create policy comp_sel on public.compromissos for select using (
  ativo() and (
    visivel
    or dono_id = auth.uid()
    or exists (select 1 from convidados cv where cv.compromisso_id = id and cv.perfil_id = auth.uid())
  )
);

drop policy if exists comp_ins on public.compromissos;
create policy comp_ins on public.compromissos for insert
  with check (ativo() and dono_id = auth.uid());

drop policy if exists comp_upd on public.compromissos;
create policy comp_upd on public.compromissos for update
  using (ativo() and (dono_id = auth.uid() or eh_admin()))
  with check (ativo() and (dono_id = auth.uid() or eh_admin()));

drop policy if exists comp_del on public.compromissos;
create policy comp_del on public.compromissos for delete
  using (ativo() and (dono_id = auth.uid() or eh_admin()));

drop policy if exists conv_sel on public.convidados;
create policy conv_sel on public.convidados for select using (
  ativo() and exists (
    select 1 from compromissos c
    where c.id = compromisso_id
      and (c.visivel or c.dono_id = auth.uid() or perfil_id = auth.uid())
  )
);

drop policy if exists conv_ins on public.convidados;
create policy conv_ins on public.convidados for insert with check (
  ativo() and exists (select 1 from compromissos c where c.id = compromisso_id and c.dono_id = auth.uid())
);

drop policy if exists conv_del on public.convidados;
create policy conv_del on public.convidados for delete using (
  ativo() and exists (select 1 from compromissos c where c.id = compromisso_id and c.dono_id = auth.uid())
);

-- agenda externa: o endereço do calendário é só de quem o cadastrou
drop policy if exists age_todo on public.agendas_externas;
create policy age_todo on public.agendas_externas for all
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- a ocupação que veio de fora é pública para a equipe, e só o dono a atualiza
drop policy if exists oce_sel on public.ocupacao_externa;
create policy oce_sel on public.ocupacao_externa for select using (ativo());

drop policy if exists oce_ins on public.ocupacao_externa;
create policy oce_ins on public.ocupacao_externa for insert with check (perfil_id = auth.uid());

drop policy if exists oce_del on public.ocupacao_externa;
create policy oce_del on public.ocupacao_externa for delete using (perfil_id = auth.uid());

-- convidados de uma esteira: quem enxerga a esteira enxerga a lista
drop policy if exists fp_sel on public.fluxo_pessoas;
create policy fp_sel on public.fluxo_pessoas for select using (ativo() and ve_fluxo(fluxo_id));

drop policy if exists fp_esc on public.fluxo_pessoas;
create policy fp_esc on public.fluxo_pessoas for all
  using (ativo() and manda_no_processo(fluxo_id)) with check (ativo() and manda_no_processo(fluxo_id));

-- histórico e atividades
drop policy if exists historico_sel on public.historico;
create policy historico_sel on public.historico for select using (ativo() and ve_fluxo(fluxo_id));

drop policy if exists atividades_sel on public.atividades;
create policy atividades_sel on public.atividades for select using (ativo() and ve_fluxo(fluxo_id));

drop policy if exists atividades_ins on public.atividades;
create policy atividades_ins on public.atividades for insert
  with check (ativo() and ve_fluxo(fluxo_id) and quem_id = auth.uid());

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
  return new;
end $$;

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
  uid   uuid := auth.uid();
  v_id  uuid := nullif(p_fluxo->>'id', '')::uuid;
  e     jsonb;
  k     int := 0;
  eid   uuid;
  ids   uuid[] := '{}';
begin
  if not ativo() then raise exception 'Sem acesso.'; end if;
  if jsonb_array_length(p_etapas) < 1 then raise exception 'O fluxo precisa de pelo menos um checkpoint.'; end if;

  if v_id is null then
    insert into fluxos (tipo, nome, area_id, empresa_id, dono_id, autor_id, visib, freq, periodo, atual)
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
  if not (eh_admin() or exists (select 1 from perfis p where p.id = auth.uid() and p.papel = 'gestor')) then
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
  uid   uuid := auth.uid();
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
-- 7. Aprovar a saída de um checkpoint
--    Só o aprovador do checkpoint consegue, e só com o checklist completo.
--    Na última etapa de uma rotina, fecha a volta e recomeça o ciclo.
-- --------------------------------------------------------------------------

create or replace function public.aprovar_etapa(p_fluxo uuid, p_periodo text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid     uuid := auth.uid();
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
  if e.aprovador_id is distinct from uid then raise exception 'Somente o aprovador deste checkpoint pode aprovar a saída.'; end if;

  if exists (
    select 1 from itens i
    where i.etapa_id = e.id and not i.feito and (not i.priv or i.autor_id = uid)
  ) then raise exception 'Ainda existem itens pendentes neste checkpoint.'; end if;

  select count(*) into n from etapas where fluxo_id = f.id;
  insert into atividades (fluxo_id, quem_id, texto) values (f.id, uid, 'aprovou a saída de ' || e.nome);

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

-- --------------------------------------------------------------------------
-- 8. Conserta bancos criados por uma versão anterior deste arquivo
-- --------------------------------------------------------------------------

do $$
begin
  alter table public.fluxos alter column area_id drop not null;
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
  foreach t in array array['perfis','areas','fluxos','etapas','itens','historico','atividades'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
