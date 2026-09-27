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

-- ==========================================================================
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
  p_prazo    date default null
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

-- ==========================================================================
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

-- ==========================================================================
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

-- ==========================================================================
-- 25. A nota que vai para o canal é um cartão, e o cartão abre
--
--     A mensagem aponta para a nota em vez de copiar o texto inteiro, e quem
--     pode ver o canal pode abrir a nota. Abrir é gesto de quem lê: a função
--     confere que existe um cartão daquela nota num canal seu antes de deixar.
--     A política de `nota_pessoas` continua recusando que alguém se convide.
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

alter table public.perfis add column if not exists tutoriais text[] not null default '{}';

update public.perfis
   set tutoriais = array['inicio']
 where tutorial_em is not null
   and not ('inicio' = any(tutoriais));

-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
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
-- ==========================================================================

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

create or replace function public.salvar_fluxo(p_fluxo jsonb, p_etapas jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := meu_perfil();
  v_id  uuid := nullif(p_fluxo->>'id', '')::uuid;
  e     jsonb;
  k     int := 0;
  eid   uuid;
  ids   uuid[] := '{}';
  v_atual int;
  antigo  uuid;
  novo    text;
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

-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
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
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
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
-- ==========================================================================

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


-- ==========================================================================
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
-- ==========================================================================

alter table public.organizacoes add column if not exists pulso_horarios int[];
alter table public.organizacoes add column if not exists pulso_amostra int;

-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
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
-- ==========================================================================

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

drop policy if exists pd_upd on public.processos_descobertos;
create policy pd_upd on public.processos_descobertos for update
  using (minha(org_id) and ativo()) with check (minha(org_id) and ativo());

-- Sem política de insert: quem descobre é o servidor, no pulso.

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

-- ==========================================================================
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
-- ==========================================================================

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

-- ==========================================================================
-- O acervo. Repare no que ele NÃO tem: org_id, perfil_id, nenhum texto.
-- ==========================================================================
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

-- ==========================================================================
-- Conferência. As trinta e seis contas abaixo têm que dar
-- 36, 3, 3, 3, true, 1, 2, 1, 2, 0, true, 3, true, 4, true, true, 1, true, 1,
-- 1, true, 3, 1, 1, 4, true, 1, 2, true, 2, 2, 1, 1, 1, 2 e true.
-- ==========================================================================
select
  (select count(*) from pg_trigger where tgname = 'ao_inserir_org' and not tgisinternal)
    as "carimbo de organizacao (36)",
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
    as "concluir arquiva (true)",
  (select count(*) = 1 from pg_trigger where tgname = 'ressalva_nao_some')
    as "ressalva nao some (true)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'nota_pessoas')
    as "nota compartilhada (1)",
  (select prosrc like '%nota_pessoas%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 've_nota')
    as "ve_nota enxerga o convidado (true)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'feedbacks')
    as "feedback de quem recebeu (1)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'abrir_nota_do_canal')
    as "a nota do canal abre (1)",
  (select prosrc like '%v_espaco%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'novo_usuario')
    as "pessoal no cadastro (true)",
  (select count(*) from pg_trigger
    where tgname in ('ao_compartilhar_nota','ao_responder_feedback','ao_falar_direto'))
    as "avisos novos (3)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis' and column_name = 'tutorial_em')
    as "tutorial da primeira vez (1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'perfis' and column_name = 'tutoriais')
    as "um tutorial por tela (1)",
  (select count(*) from pg_trigger
    where tgname in ('convite_cabe','perfil_cabe','ao_nascer_org','ao_perder_desconto'))
    as "as travas do plano (4)",
  (select prosrc like '%trilha_comecou%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'salvar_fluxo')
    as "o passado da trilha nao se reordena (true)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'perguntas_abertas')
    as "o que ficou perguntado (1)",
  (select count(*) from pg_trigger
    where tgname = 'ao_inserir_org'
      and tgrelid in ('public.avisos_contato'::regclass, 'public.push_assinaturas'::regclass))
    as "o carimbo de quem guarda telefone (2)",
  (select prosrc like '%new.org_id%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'travar_criacao')
    as "a trava do plano olha a linha (true)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('quem_age','manda_no_processo_como'))
    as "o servidor age por alguem (2)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'organizacoes'
      and column_name in ('pulso_horarios','pulso_amostra'))
    as "o ritmo aprendido (2)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'varrer_o_dia')
    as "a varredura do dia (1)",
  (select count(*) from information_schema.views
    where table_schema = 'public' and table_name = 'eventos')
    as "o registro unico de eventos (1)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'processos_descobertos')
    as "o processo descoberto (1)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('perguntas_ritmo','acervo_forma'))
    as "a pergunta do dia e o acervo (2)",
  -- A fronteira do princípio 1.5, conferida e não prometida: o acervo entre
  -- clientes não pode ter chave estrangeira para dado de cliente nenhum.
  (select count(*) = 0 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'acervo_forma'
      and constraint_type = 'FOREIGN KEY')
    as "o acervo nao aponta para cliente (true)";
