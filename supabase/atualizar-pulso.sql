-- ==========================================================================
-- TrackWard, atualização do pulso (bloco A)
--
-- Recorte do `schema.sql` com só o que o bloco A acrescentou, para você não
-- colar o arquivo inteiro. Pode rodar quantas vezes quiser: nada aqui apaga
-- dado nenhum, e rodar duas vezes dá o mesmo resultado que rodar uma.
--
--   1. Quatro colunas em `organizacoes`  a frequência da leitura automática
--   2. Uma coluna em `canais`            até onde a máquina já leu
--   3. Três funções                      o teto perguntado por organização,
--                                        e não pela sessão
--   4. A trava das três                  negadas a quem está logado
--
-- COMO RODAR: painel do Supabase, SQL Editor, New query, colar tudo, Run.
-- ==========================================================================

-- 1 e 2. As colunas -------------------------------------------------------

alter table public.organizacoes add column if not exists leitura_por_dia int not null default 3;
alter table public.organizacoes add column if not exists leitura_janela text not null default '08:00-19:00';
alter table public.organizacoes add column if not exists fuso text not null default 'America/Sao_Paulo';
alter table public.organizacoes add column if not exists pulso_em timestamptz;
alter table public.canais add column if not exists lido_pela_ia_em timestamptz;

do $$ begin
  alter table public.organizacoes
    add constraint organizacoes_leitura_check check (leitura_por_dia between 0 and 24);
exception when duplicate_object then null;
end $$;

-- 3. O teto, por organização ----------------------------------------------
--
-- A leitura automática roda num relógio, e relógio não tem sessão. As funções
-- que já existiam respondem sobre `minha_org()`, e sem sessão `minha_org()` é
-- nulo: elas devolveriam "não pode" para todo mundo, sempre.

create or replace function public.leituras_do_mes_de(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::int
  from consumo
  where org_id = p_org and onde = 'leitor'
    and criado_em >= date_trunc('month', now());
$$;

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

-- 4. A trava ---------------------------------------------------------------
--
-- Uma função `security definer` que aceita o id de qualquer empresa é a forma
-- clássica de vazamento: qualquer pessoa logada poderia perguntar pela empresa
-- do vizinho, ou gravar consumo na conta dela para estourar o teto alheio.
--
-- A trava não é um `if` dentro da função, é a permissão de execução. O Postgres
-- confere antes de a função rodar, então não há como contornar pelo corpo dela.
-- SEM ESTAS LINHAS, AS TRÊS FUNÇÕES ACIMA SÃO UM BURACO NA PAREDE.

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

-- Confere se ficou tudo de pé. Tem que devolver "pulso no ar".
do $$
declare faltando text := '';
begin
  if not exists (select 1 from information_schema.columns
                 where table_name='organizacoes' and column_name='leitura_por_dia')
    then faltando := faltando || 'organizacoes.leitura_por_dia '; end if;
  if not exists (select 1 from information_schema.columns
                 where table_name='canais' and column_name='lido_pela_ia_em')
    then faltando := faltando || 'canais.lido_pela_ia_em '; end if;
  if not exists (select 1 from pg_proc where proname='pulso_pode')
    then faltando := faltando || 'pulso_pode '; end if;
  if not exists (select 1 from pg_proc where proname='registrar_consumo_de')
    then faltando := faltando || 'registrar_consumo_de '; end if;
  if faltando = '' then raise notice 'pulso no ar';
  else raise exception 'faltou: %', faltando; end if;
end $$;
