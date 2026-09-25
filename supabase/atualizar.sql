-- ==========================================================================
-- TrackWard, atualização de 23/09/2026
--
-- Recorte do `schema.sql` com o que mudou, para você não colar 3200 linhas.
-- Pode rodar quantas vezes quiser: nada aqui apaga dado nenhum.
--
--   1. O carimbo da organização   Recria `ao_inserir_org` em todas as tabelas.
--                                 É ele que preenche `org_id`, e toda política
--                                 pergunta `minha(org_id)`.
--
--   2. Quem cria, enxerga         `ve_canal` e `ve_item` passam a incluir quem
--                                 abriu o canal e quem escreveu a tarefa. Sem
--                                 isso, criar um canal fechado ou delegar uma
--                                 tarefa era perder a coisa de vista na hora.
--
--   3. Seção 14                   Avisos: a caixa de cada pessoa, os gatilhos
--                                 que escrevem nela e as políticas dela.
--
--   4. Seção 15                   Quem assina a linha é o servidor.
--
--   5. Seção 16                   A tarefa ganha descrição.
--
--   6. Seção 17                   A nota ganha área e track.
--
--   7. Seção 18                   O anexo deixa de ser só de tarefa.
--
--   8. Seção 19                   As notas saem do chat e ganham conversa
--                                 própria. O canal de despejo que existia vira
--                                 nota, uma por coisa jogada lá dentro, e o
--                                 tipo `pessoal` de canal deixa de existir.
--
-- COMO USAR: SQL Editor do Supabase, New query, colar tudo, Run.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. O carimbo da organização, em toda tabela que tem etiqueta
-- --------------------------------------------------------------------------

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

-- --------------------------------------------------------------------------
-- 2. Quem cria, enxerga
--
-- Duas funções de visibilidade não contavam com o caso mais simples: a pessoa
-- que acabou de criar a coisa. Quem abria um canal fechado não era membro dele
-- ainda, porque a entrada de membro é gravada depois; quem escrevia uma tarefa
-- para outra pessoa não era responsável nem aprovador dela. Nos dois casos a
-- linha existia e sumia da tela no mesmo instante.
-- --------------------------------------------------------------------------

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

-- ==========================================================================
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

-- A conclusão passa a arquivar, então a função inteira vai junto.
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

  -- Concluir arquiva: a track sai da lista principal e continua inteira em
  -- Arquivadas, que é onde ficam os documentos e o histórico dela. Seção 21.
  update fluxos set concluido = true, desfecho = 'concluido', arquivado_em = now()
  where id = f.id;
  return 'concluido';
end $$;

-- ==========================================================================
-- Conferência. As quinze contas abaixo têm que dar
-- 29, 3, 3, 3, true, 1, 2, 1, 2, 0, true, 3, true, 4 e true.
-- ==========================================================================
select
  (select count(*) from pg_trigger where tgname = 'ao_inserir_org' and not tgisinternal)
    as "carimbo de organizacao (29)",
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where t.tgname = 'ao_assinar' and c.relname in ('itens','canais','notas'))
    as "carimbo de autor (3)",
  (select count(*) from pg_tables where schemaname = 'public'
    and tablename in ('avisos','avisos_contato','push_assinaturas'))
    as "tabelas de aviso (3)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('avisar','gerar_avisos_de_prazo','gente_daqui'))
    as "funcoes novas (3)",
  (select bool_and(ok) from (
     select prosrc like '%criado_por = meu_perfil()%' as ok from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname='ve_canal'
     union all
     select prosrc like '%i.autor_id = meu_perfil()%' from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname='ve_item'
   ) t) as "quem cria enxerga (true)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'itens' and column_name = 'descricao')
    as "descricao na tarefa (1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'notas' and column_name in ('area_id','fluxo_id'))
    as "endereco na nota (2)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'anexos' and column_name = 'nota_id')
    as "anexo em nota (1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name in ('mensagens','sugestoes')
      and column_name = 'nota_id')
    as "conversa na nota (2)",
  (select count(*) from canais where tipo = 'pessoal')
    as "despejo que sobrou (0)",
  (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 've_nota')
    as "quem ve a nota (true)",
  (select count(*) from pg_trigger
    where tgname in ('convites_so_equipe','perfis_pessoal_unico','canais_so_equipe'))
    as "recusas do espaco pessoal (3)",
  (select prosrc like '%já tem um espaço pessoal%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'abrir_espaco')
    as "um pessoal por login (true)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'fluxos'
      and column_name in ('desfecho','motivo','detalhe','arquivado_em'))
    as "o fim da track (4)",
  (select prosrc like '%desfecho%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'decidir_etapa')
    as "concluir arquiva (true)";
