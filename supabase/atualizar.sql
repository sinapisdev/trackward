-- ==========================================================================
-- TrackWard, atualização de 27/09/2026
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
--  ...                           Seções 20 a 40, acrescentadas ao longo do
--                                 caminho: espaço pessoal, planos, trilha,
--                                 pergunta aberta, ritmo, varredura do dia,
--                                 eventos, processo descoberto, acervo.
--
--  penúltimo                     Seção 41: as três decisões sobre o processo
--                                 descoberto (responder, recusar, adotar), e a
--                                 política larga de update que sai junto. A
--                                 conferência delas carrega a organização do
--                                 candidato, porque são `security definer` e
--                                 lá dentro a RLS não filtra a linha: sem isso
--                                 um administrador de outra empresa mexia num
--                                 candidato que ele não pode nem listar.
--
--  penúltimo                     Seção 42: a descoberta de processos passa a
--                                 marcar o dia em que rodou. O relógio virou de
--                                 hora em hora, e sem isto ela varreria 180 dias
--                                 de eventos 24 vezes por dia, por empresa, para
--                                 responder a mesma coisa.
--
--  penúltimo                     Seção 43: abrir track em nome de alguém.
--                                 `salvar_fluxo` barrava com `ativo()`, que
--                                 pergunta pela sessão, e quem chama do
--                                 WhatsApp é o servidor, que não tem nenhuma.
--                                 A assinatura de dois argumentos SAI, senão a
--                                 chamada do app fica ambígua.
--
--  penúltimo                     Seção 44: o carimbo da organização quando não
--                                 há sessão. Sem ele, tudo que o servidor grava
--                                 em nome de alguém (WhatsApp, pulso) nasce com
--                                 `org_id` vazio, e linha sem organização é
--                                 invisível para todo mundo, inclusive para quem
--                                 a criou. Vale desde a seção 35, não só daqui.
--
--  penúltimo                     Seção 45: a volta da rotina vira arquivo. Hoje
--                                 a virada apaga o mês: as tarefas são as
--                                 mesmas, só desmarcadas, e o que sobra de
--                                 julho é uma linha dizendo 'ok'. Passa a
--                                 deixar um `ciclos` com o que aconteceu, e os
--                                 documentos vão junto, para a volta seguinte
--                                 nascer limpa.
--
--  penúltimos                    Seções 46 e 47: por onde o WhatsApp da empresa
--                                 fala (Twilio ou a Cloud API da própria Meta),
--                                 e o nono dígito que o WhatsApp come em número
--                                 brasileiro antigo, que fazia o app não
--                                 reconhecer a própria pessoa.
--
--  penúltimo                     Seção 48: o raio-X. O que o processo cobra e
--                                 não entrega, em DIAS: o checkpoint que nunca
--                                 reprova, o que sempre devolve, a espera que
--                                 é maior que o trabalho, o gargalo e o prazo
--                                 que nunca foi real. Chega pelo aviso, três
--                                 por vez, e nunca ranqueia gente.
--
--  penúltimo                     Seção 49: a caixa de e-mail conectada, lida
--                                 pelo ENVELOPE. O app não lê o corpo de
--                                 e-mail nenhum, e isso é estrutura: o leitor
--                                 pede só remetente, destinatário, assunto,
--                                 data e nome do anexo. A caixa é da pessoa, e
--                                 nem o administrador enxerga.
--
--  último                        Seção 50: arquivar uma track prepara o pedido
--                                 de feedback e avisa quem fechou. MANDAR
--                                 continua sendo gesto de gente. A pergunta
--                                 muda quando foi cancelamento, e a resposta
--                                 vira evento, alimentando o raio-X.
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
/**
 * As DUAS assinaturas saem antes de a primeira nascer.
 *
 * A seção 27 dá a `avisar` um argumento a mais, e a versão de lá sobrevive à
 * passada anterior. Numa segunda passada, entre este ponto e aquele existiam as
 * duas ao mesmo tempo, e qualquer gatilho que chamasse `avisar` no meio do
 * caminho recebia "a função avisar não é única" e derrubava o arquivo inteiro.
 *
 * Isso só aparece em banco COM dados, que é só a produção: num banco vazio o
 * `update` da seção 21 não casa linha nenhuma, e comando que não toca linha não
 * dispara gatilho de linha. Um erro que o ensaio não via de propósito nenhum.
 */
drop function if exists public.avisar(uuid, text, text, text, text, boolean, uuid, uuid, uuid, uuid);
drop function if exists public.avisar(uuid, text, text, text, text, boolean, uuid, uuid, uuid, uuid, uuid);

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
    -- A lista inteira, desde a primeira vez que a restrição é posta.
    -- Ela já nasceu estreita uma vez e foi alargada mais adiante no arquivo, e
    -- aí a passada seguinte quebrava: a versão estreita recusava linhas que a
    -- versão larga tinha deixado entrar. Restrição que se alarga depois precisa
    -- nascer larga, senão o arquivo não roda duas vezes no mesmo banco.
    -- `raiox` faltava nas DUAS, e o raio-X cria aviso desse tipo: no primeiro
    -- dia em que ele tivesse o que dizer, o aviso falharia e ninguém saberia.
    'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo',
    'nota','feedback','mensagem','parada','carga','rotina','raiox','proposta',
    'convite'));
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
    -- A lista inteira, desde a primeira vez que a restrição é posta.
    -- Ela já nasceu estreita uma vez e foi alargada mais adiante no arquivo, e
    -- aí a passada seguinte quebrava: a versão estreita recusava linhas que a
    -- versão larga tinha deixado entrar. Restrição que se alarga depois precisa
    -- nascer larga, senão o arquivo não roda duas vezes no mesmo banco.
    -- `raiox` faltava nas DUAS, e o raio-X cria aviso desse tipo: no primeiro
    -- dia em que ele tivesse o que dizer, o aviso falharia e ninguém saberia.
    'tarefa','aprovacao','prazo','travou','destravou','citacao','pedido_prazo',
    'nota','feedback','mensagem','parada','carga','rotina','raiox','proposta',
    'convite'));
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

-- A política larga de update existiu por um dia e sai aqui: com ela, qualquer
-- pessoa da casa marcava um candidato como aceito sem passar pela conferência
-- de quem manda no processo.
drop policy if exists pd_upd on public.processos_descobertos;

-- Sem política de insert nem de update, de propósito: quem descobre é o
-- servidor, no pulso, e quem responde, adota ou recusa passa pelas funções da
-- seção 41.

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
    'nota','feedback','mensagem','parada','carga','rotina','raiox','proposta',
    'convite'));
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

-- ==========================================================================
-- 51. Quem vê o quê, perguntado por PERFIL em vez de pela sessão
--
--     `ve_fluxo` pergunta por `meu_perfil()`, que sai da sessão. O WhatsApp e o
--     pulso escrevem com a chave de serviço, que não tem sessão nenhuma E que
--     passa por cima de RLS: a rota lia `fluxos` direto e recebia TODAS as
--     tracks da organização, inclusive as `so_eu` de outra pessoa e as
--     `escolhidas` de quem não convidou ninguém.
--
--     Isso não é hipótese. A lista que o telefone oferece ("em qual track esta
--     tarefa vive?") era montada dessa consulta, então o nome de uma track
--     privada aparecia numerado para quem mandasse uma mensagem, e bastava
--     responder o número para pôr trabalho dentro dela. O AGENTS diz que
--     privacidade é do banco e não da tela; aqui a tela nem chegava a ter a
--     chance, porque o banco tinha entregado a linha.
--
--     O conserto NÃO é uma segunda cópia de `ve_fluxo` com outro nome. Duas
--     cópias da regra de visibilidade é a pior coisa que este arquivo poderia
--     ganhar: no dia em que uma mudar e a outra não, o app passa a mostrar pela
--     tela o que esconde pelo telefone, ou o contrário, e ninguém percebe. A
--     regra passa a morar UMA vez, no `_como`, e a versão da sessão vira um
--     invólucro que responde `meu_perfil()`. É o mesmo caminho de `p_como` na
--     seção 43 e de `quem_age` na 44.
--
--     As funções com `uid` ficam fechadas ao `service_role`. Elas respondem
--     "o que FULANO enxerga", e uma pessoa logada podendo perguntar isso com o
--     id de outra é a mesma porta dos fundos por outro nome.
-- ==========================================================================

/** A hierarquia abaixo de um perfil qualquer. O corpo do antigo `meu_alcance`. */
create or replace function public.alcance_de(uid uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive abaixo as (
    select id, org_id from perfis where id = uid
    union
    select p.id, p.org_id from perfis p join abaixo a on p.gestor_id = a.id
    where p.org_id = a.org_id
  )
  select id from abaixo;
$$;

create or replace function public.meu_alcance()
returns setof uuid language sql stable security definer set search_path = public as $$
  select * from alcance_de(meu_perfil());
$$;

/** Admin, perguntado por perfil. */
create or replace function public.eh_admin_de(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = uid and ativo and papel = 'admin');
$$;

/** A mesma organização, perguntada por perfil. */
create or replace function public.minha_de(p_org uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis p where p.id = uid and p.ativo and p.org_id = p_org);
$$;

create or replace function public.ve_area_de_como(p_fluxo uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p join fluxos f on f.id = p_fluxo
    where p.id = uid and p.ve_area and p.area_id is not null and f.area_id = p.area_id
  );
$$;

/**
 * A regra inteira de quem enxerga uma track. Corpo único.
 *
 * É o texto do antigo `ve_fluxo`, com `uid` no lugar de `meu_perfil()` e
 * `minha_de(org, uid)` no lugar de `minha(org)`. Nada mais mudou, de propósito:
 * qualquer diferença aqui seria uma regra nova entrando de carona num conserto.
 */
create or replace function public.ve_fluxo_como(f uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    -- antes de qualquer regra de visibilidade, a esteira precisa ser da mesma
    -- organização. Esta linha é a parede entre empresas clientes.
    exists (select 1 from fluxos x where x.id = f and minha_de(x.org_id, uid))
    and (
    -- só eu: ninguém além de quem criou
    exists (select 1 from fluxos x where x.id = f and x.visib = 'so_eu' and x.autor_id = uid)
    -- pessoas escolhidas: quem foi convidado entra, o resto depende de participar
    or exists (
      select 1 from fluxos x join fluxo_pessoas fp on fp.fluxo_id = x.id
      where x.id = f and x.visib = 'escolhidas' and fp.perfil_id in (select alcance_de(uid))
    )
    or (
      exists (select 1 from fluxos x where x.id = f and x.visib <> 'so_eu')
      and (
        (eh_admin_de(uid) and exists (select 1 from fluxos x where x.id = f and x.visib = 'equipe'))
        or (ve_area_de_como(f, uid) and exists (select 1 from fluxos x where x.id = f and x.visib = 'equipe'))
        or exists (select 1 from fluxos x where x.id = f and x.dono_id in (select alcance_de(uid)))
        or exists (select 1 from etapas e where e.fluxo_id = f and e.aprovador_id in (select alcance_de(uid)))
        or exists (select 1 from itens i where i.fluxo_id = f and i.resp_id in (select alcance_de(uid)))
        or exists (
          select 1 from dependencias d
          join itens trava on trava.id = d.depende_de and trava.fluxo_id = f
          join itens meu on meu.id = d.item_id
          where meu.resp_id in (select alcance_de(uid))
        )
      )
    ));
$$;

create or replace function public.ve_fluxo(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select ve_fluxo_como(f, meu_perfil());
$$;

/**
 * As tracks abertas que aquela pessoa pode ver, para o servidor oferecer.
 *
 * Devolve o que a pessoa enxergaria se estivesse com o app aberto, nem uma
 * linha a mais. É esta função, e não a consulta direta a `fluxos`, que o
 * WhatsApp usa para montar a lista de "onde isso vive".
 */
create or replace function public.tracks_de(p_como uuid)
returns table (id uuid, nome text, atual int)
language sql stable security definer set search_path = public as $$
  select f.id, f.nome, f.atual
  from fluxos f
  join perfis p on p.id = p_como and p.ativo and p.org_id = f.org_id
  where f.desfecho is null and not f.concluido and ve_fluxo_como(f.id, p_como)
  order by f.criado_em desc;
$$;

revoke all on function public.alcance_de(uuid)            from public, anon, authenticated;
revoke all on function public.eh_admin_de(uuid)           from public, anon, authenticated;
revoke all on function public.minha_de(uuid, uuid)        from public, anon, authenticated;
revoke all on function public.ve_area_de_como(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ve_fluxo_como(uuid, uuid)   from public, anon, authenticated;
revoke all on function public.tracks_de(uuid)             from public, anon, authenticated;
grant execute on function public.ve_fluxo_como(uuid, uuid) to service_role;
grant execute on function public.tracks_de(uuid) to service_role;


-- ==========================================================================
-- 52. A função definer é uma porta, e porta de servidor não fica destrancada
--
--     `security definer` existe para a função enxergar o que quem chamou não
--     enxerga. É o que quebra a recursão das políticas e o que deixa o servidor
--     agir sem sessão. O preço é que ela **passa por cima de RLS**, e quando
--     fica com permissão para `authenticated` ela vira a porta dos fundos da
--     política que está ao lado dela.
--
--     `perguntas_abertas` é o retrato disso. A política da tabela diz
--     `perfil_id = meu_perfil()`, ou seja, a caixa é de uma pessoa só, como a
--     de avisos. E `perguntas_de(p_perfil)` devolvia a caixa de QUALQUER perfil
--     para qualquer pessoa logada, sem conferir nada. Lá dentro vai o texto de
--     tarefa privada e de mensagem de canal fechado, que é exatamente o que a
--     política existia para proteger.
--
--     `eventos_de(p_org, ...)` era pior em alcance: devolvia a atividade INTEIRA
--     de uma organização, sem passar por `ve_fluxo` nem por `ve_item`. Um
--     colaborador comum recebia o histórico de todas as tracks privadas da casa,
--     e com um id de outra empresa, o dela.
--
--     Nenhuma destas é chamada pelo navegador: todas moram em `app/api/*`, que
--     usa a chave de serviço ou o segredo do relógio. Fechá-las não tira nada de
--     ninguém.
--
--     A regra que fica: **função definer nasce fechada.** Ao escrever uma nova,
--     `revoke` de `public, anon, authenticated` e `grant` só para quem precisa.
--     Se o navegador precisa dela, ela não pode aceitar o id de outra pessoa sem
--     conferir, e a conferência é dentro dela, não na tela.
-- ==========================================================================

do $$
declare f record;
begin
  -- 1. As de servidor, uma a uma e pelo nome: quem lê dado de alguém ou escreve
  --    em nome da casa. A lista é curta de propósito, para caber na cabeça.
  for f in
    select p.oid::regprocedure as nome
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         -- devolvem dado de gente
         'perguntas_de','eventos_de','perfil_do_telefone','gente_daqui',
         -- escrevem em nome da casa, sem ninguém pedir
         'avisar','avisar_do_raiox','gerar_avisos_de_prazo','varrer_o_dia',
         'guardar_achado','guardar_descoberta',
         'pergunta_mandada','pergunta_respondida')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.nome);
    execute format('grant execute on function %s to service_role', f.nome);
  end loop;

  -- 2. As de gatilho. Ninguém as chama pela mão, e quem as dispara é o Postgres,
  --    que não pede permissão a ninguém. Deixá-las abertas é superfície de graça:
  --    `avisar_de_*` e `carimbar_*` escrevem, e `proteger_*` e `travar_*` são
  --    justamente as que recusam coisa.
  for f in
    select p.oid::regprocedure as nome
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.nome);
  end loop;
end $$;


-- ==========================================================================
-- 53. O segredo do conector sai da linha que a empresa inteira lê
--
--     A política de `conectores` deixa qualquer pessoa ativa da casa ler o
--     conector da casa, e está certa: é ela que faz a tela listar o que existe.
--     Mas RLS trabalha por LINHA, e `select` escolhe COLUNA: nada impedia um
--     pedido pedindo `segredo_cifrado`, e vinha.
--
--     Cifrado, então não é a chave em texto puro. E é exatamente por isso que
--     ninguém repara: sai uma coluna ilegível, a vida segue, e no dia em que
--     `TRACK_SEGREDO` vazar por outro caminho, o texto cifrado já estava havia
--     meses na mão de quem não devia.
--
--     Revogar a coluna não resolve: em Postgres, `revoke select (coluna)` não
--     vale enquanto existir `grant select` da tabela inteira, e a alternativa
--     seria listar à mão todas as colunas permitidas, o que vira uma lista que
--     alguém esquece de atualizar e a tela quebra sem motivo aparente.
--
--     A saída é a que este schema já usa três vezes, em `avisos_contato`,
--     `push_assinaturas` e `caixas`: **o segredo mora em tabela própria, com RLS
--     ligada e política nenhuma**. Sem política, ninguém logado entra, nem o
--     administrador. Quem lê é o servidor, que é quem decifra.
-- ==========================================================================

create table if not exists public.conector_segredos (
  conector_id uuid primary key references public.conectores on delete cascade,
  org_id      uuid not null references public.organizacoes on delete cascade,
  segredo_cifrado text not null,
  mexido_em   timestamptz not null default now()
);

alter table public.conector_segredos enable row level security;
-- Nenhuma política, e é a regra inteira. Ver a seção 52.

-- O que já estava guardado muda de casa antes de a coluna sumir.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'conectores'
       and column_name = 'segredo_cifrado'
  ) then
    execute $m$
      insert into public.conector_segredos (conector_id, org_id, segredo_cifrado)
      select id, org_id, segredo_cifrado from public.conectores
       where coalesce(segredo_cifrado, '') <> ''
      on conflict (conector_id) do nothing
    $m$;
    alter table public.conectores drop column segredo_cifrado;
  end if;
end $$;


-- ==========================================================================
-- 54. A agenda estava quebrada, e falhava calada
--
--     `compromissos` perguntava por `convidados` para saber se você foi
--     convidado, e `convidados` perguntava por `compromissos` para saber se
--     você pode ver aquele compromisso. Escritas como subconsulta normal, as
--     duas se chamam em círculo e o Postgres devolve **"recursão infinita
--     detectada na política"**, que é o mesmo erro que `notas` e `nota_pessoas`
--     já deram, pelo mesmo motivo.
--
--     A diferença é que este ninguém viu. Quem lê a agenda é
--     `sb.from('compromissos').select('*')` no carregamento do `Dados`, e um
--     erro ali não derruba a tela: a lista chega vazia, e agenda vazia parece
--     agenda sem compromisso. Ficou assim desde que a tabela de convidados
--     existe, e só apareceu numa varredura que perguntou a TODAS as tabelas se
--     elas respondem.
--
--     Quem quebra o círculo é `security definer`, que roda fora das políticas,
--     exatamente como `nota_comigo()` e `minha_nota()` fazem no caderno. O
--     conteúdo das duas regras não muda em nada: é o mesmo texto, movido para
--     dentro de uma função. Mudar a regra junto com o conserto seria esconder
--     uma decisão dentro de um reparo.
-- ==========================================================================

/** Fui convidado para este compromisso? Responde sem passar pela política. */
create or replace function public.sou_convidado(p_compromisso uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from convidados cv
     where cv.compromisso_id = p_compromisso and cv.perfil_id = meu_perfil()
  );
$$;

/**
 * Esta linha de convidado pode aparecer para mim?
 *
 * É o `exists` que estava dentro da política, com o `perfil_id` da linha vindo
 * por parâmetro, porque lá ele era a coluna da própria tabela.
 */
create or replace function public.ve_convite(p_compromisso uuid, p_convidado uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from compromissos c
     where c.id = p_compromisso
       and (c.visivel or c.dono_id = meu_perfil() or p_convidado = meu_perfil())
  );
$$;

/** Sou o dono deste compromisso? Usada onde a política já perguntava isso. */
create or replace function public.dono_compromisso(p_compromisso uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from compromissos c where c.id = p_compromisso and c.dono_id = meu_perfil()
  );
$$;

drop policy if exists comp_sel on public.compromissos;
create policy comp_sel on public.compromissos for select using (minha(org_id) and (
  ativo() and (visivel or dono_id = meu_perfil() or sou_convidado(id))
));

drop policy if exists conv_sel on public.convidados;
create policy conv_sel on public.convidados for select using (minha(org_id) and (
  ativo() and ve_convite(compromisso_id, perfil_id)
));

drop policy if exists conv_ins on public.convidados;
create policy conv_ins on public.convidados for insert with check (minha(org_id) and (
  ativo() and dono_compromisso(compromisso_id)
));

drop policy if exists conv_del on public.convidados;
create policy conv_del on public.convidados for delete using (minha(org_id) and (
  ativo() and dono_compromisso(compromisso_id)
));


-- O gatilho de proteção do perfil ganha a exceção do esquecimento.
create or replace function public.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare esquecendo boolean := coalesce(
  current_setting('trackward.esquecendo', true), '') = old.id::text;
begin
  -- A organização nunca muda: seria mover alguém, com tudo que enxerga, para
  -- dentro de outra empresa cliente.
  new.org_id := old.org_id;

  /**
   * O login também nunca muda, com uma exceção: CORTAR.
   *
   * Trocar o login por outro seria entregar o perfil para outra pessoa, e isso
   * continua recusado. Mas `esquecer_pessoa` precisa cortá-lo, e é esse corte
   * que transforma a linha numa lápide: sem login ninguém entra por ela, e
   * apagar o usuário no painel do Supabase deixa de arrastar coisa nenhuma.
   */
  if not (esquecendo and new.user_id is null) then
    new.user_id := old.user_id;
  end if;

  if not eh_admin() and not esquecendo then
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

-- ==========================================================================
-- 55. O perfil não se apaga, e esquecer é esvaziar
--
--     Vinte e seis colunas apontam para `perfis` e sobrevivem à morte dele
--     virando nulo: `itens.autor_id`, `itens.resp_id`, `mensagens.autor_id`,
--     `anexos.autor_id`, `fluxos.dono_id`, `etapas.aprovador_id`,
--     `decisoes.quem_id`. Se a linha some, o histórico da empresa continua lá e
--     **ninguém fez nada**: "concluída por ninguém, em 12 de março".
--
--     Pior: sete tabelas apontam com CASCATA, e entre elas estão `notas` e
--     `compromissos`. Apagar um perfil destruía as notas e a agenda daquela
--     pessoa. E o caminho para isso não era escondido: `perfis.user_id` apontava
--     para `auth.users` com cascata, então **apagar o login no painel do
--     Supabase**, que são dois cliques e é a coisa óbvia a fazer quando alguém
--     pede para sair, levava tudo junto. Um funcionário demitido custava à
--     empresa as notas dele.
--
--     Duas travas, e nenhuma é opcional: o perfil não se apaga, e apagar o login
--     não arrasta mais o perfil. O que sobra é a lápide: uma linha que já não
--     pertence a login nenhum, que ninguém usa para entrar, e que existe só para
--     o histórico continuar dizendo quem fez.
--
--     Desligar (`ativo = false`) continua sendo o caminho normal, e resolve o
--     caso do funcionário que saiu: ele some das menções, dos seletores e dos
--     canais, e o trabalho dele fica inteiro. `esquecer_pessoa` é para o caso
--     raro, o da pessoa que EXIGE ser apagada.
-- ==========================================================================

alter table public.perfis add column if not exists esquecido_em timestamptz;

-- Apagar o login deixa de arrastar o perfil. Sem isto, as duas travas de baixo
-- não valem nada, porque a cascata entra por fora delas.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.perfis'::regclass and conname = 'perfis_user_id_fkey'
       and confdeltype = 'c'
  ) then
    alter table public.perfis alter column user_id drop not null;
    alter table public.perfis drop constraint perfis_user_id_fkey;
    alter table public.perfis add constraint perfis_user_id_fkey
      foreign key (user_id) references auth.users on delete set null;
  end if;
end $$;

/**
 * O perfil não se apaga. Nem pelo painel, nem por engano, nem por script.
 *
 * A trava é de banco e não de tela porque quem apaga perfil quase nunca está
 * na tela: está no painel do Supabase, resolvendo outra coisa.
 */
create or replace function public.nao_apaga_perfil()
returns trigger language plpgsql set search_path = public as $$
begin
  /**
   * Com uma exceção: a empresa INTEIRA indo embora.
   *
   * O perfil existe para o histórico da empresa continuar dizendo quem fez. Se
   * a empresa está sendo apagada, não há histórico para proteger: tudo vai
   * junto, e é isso que se quer quando um cliente encerra e pede os dados fora.
   * Sem esta porta, `delete from organizacoes` passava a ser impossível, e a
   * trava que protege o cliente viraria a que impede atendê-lo.
   *
   * O teste é a própria cascata: ao apagar a organização, o Postgres remove a
   * linha dela ANTES de disparar as cascatas, então aqui ela já não existe.
   */
  if old.org_id is null or not exists (select 1 from organizacoes where id = old.org_id) then
    return old;
  end if;
  raise exception 'Perfil não se apaga: ele é o que faz o histórico dizer quem fez. '
    'Para tirar alguém da equipe, desligue (ativo = false). '
    'Para atender a um pedido de exclusão, use esquecer_pessoa(id).';
end $$;

drop trigger if exists ao_apagar_perfil on public.perfis;
create trigger ao_apagar_perfil before delete on public.perfis
  for each row execute function public.nao_apaga_perfil();

/**
 * O pedido de exclusão da própria pessoa, atendido sem destruir a empresa.
 *
 * Esvazia o que identifica e corta o laço com o login. O que fez, fica: tarefa,
 * anexo, mensagem, decisão e aprovação continuam com o vínculo de pé, dizendo
 * "Pessoa removida" no lugar do nome.
 *
 * **A nota que nunca saiu da pessoa vai embora.** Ninguém além dela jamais pôde
 * ler aquilo, nem o administrador, então mantida ela seria dado pessoal guardado
 * para sempre sem ninguém poder usar, que é o oposto do que a lei pede. A que
 * passou por alguém fica, porque ali ela virou registro da casa: ou está em
 * `nota_pessoas`, ou tem cartão num canal (`mensagens.nota_ref`), e nos dois
 * casos apagá-la quebraria o que outra pessoa está lendo.
 *
 * O telefone, a assinatura de notificação, a url da agenda pessoal e a caixa de
 * e-mail conectada são apagados de verdade: são dela, não da empresa, e a
 * credencial da caixa não pode sobreviver a quem a cadastrou.
 */
create or replace function public.esquecer_pessoa(p_perfil uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from perfis where id = p_perfil;
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;

  -- Quem pode: a própria pessoa, ou um administrador ativo da mesma casa. Com a
  -- chave de serviço não há sessão, e aí quem responde é a operação.
  if auth.uid() is not null
     and not exists (select 1 from perfis where id = p_perfil and user_id = auth.uid())
     and not exists (select 1 from perfis where id = meu_perfil()
                      and org_id = v_org and ativo and papel = 'admin') then
    raise exception 'Só a própria pessoa ou um administrador desta empresa.';
  end if;

  /**
   * O dono da empresa não se esquece enquanto for o dono.
   *
   * `proteger_perfil` recusa desativar quem abriu a conta, e está certo: uma
   * discussão interna não pode derrubar o dono da própria empresa. Mas isso
   * significa que esquecer o dono deixaria a casa com um dono chamado "Pessoa
   * removida", sem login, e sem ninguém que possa transferir nada. Quem pede
   * para ser esquecido primeiro passa a empresa para alguém.
   */
  if exists (select 1 from organizacoes o where o.dono_id = p_perfil) then
    raise exception 'Esta pessoa é a dona da empresa. Passe a empresa para outro '
      'administrador antes de esquecê-la, senão a casa fica sem dono.';
  end if;

  -- O gatilho `proteger_perfil` segura login, e-mail e `ativo` de propósito, e
  -- não pode deixar de segurar. O esquecimento se anuncia na transação, do mesmo
  -- jeito que `quem_age` anuncia em nome de quem o servidor age (seção 44), e o
  -- gatilho abre a porta para ESTE caso e para mais nenhum.
  perform set_config('trackward.esquecendo', p_perfil::text, true);

  -- O que é dela e de mais ninguém.
  delete from avisos_contato   where perfil_id = p_perfil;
  delete from push_assinaturas where perfil_id = p_perfil;
  delete from agendas_externas where perfil_id = p_perfil;
  delete from ocupacao_externa where perfil_id = p_perfil;
  delete from caixas           where perfil_id = p_perfil;
  delete from sessoes          where perfil_id = p_perfil;
  delete from perguntas_abertas where perfil_id = p_perfil;
  delete from avisos            where perfil_id = p_perfil;

  /**
   * O compromisso que ninguém mais podia ver, pela mesma régua da nota.
   *
   * `visivel = false` quer dizer que a casa via só a ocupação, nunca o título
   * nem o local: o conteúdo era dela. Com convidado é outra coisa, porque
   * combinaram aquilo juntos e apagar mexeria na agenda de quem ficou.
   */
  delete from compromissos c
   where c.dono_id = p_perfil and not c.visivel
     and not exists (select 1 from convidados cv where cv.compromisso_id = c.id);

  -- A nota que nunca saiu dela. Os anexos vão junto por cascata.
  delete from notas n
   where n.dono_id = p_perfil
     and not exists (select 1 from nota_pessoas np where np.nota_id = n.id)
     and not exists (select 1 from mensagens m where m.nota_ref = n.id);

  -- A lápide. `user_id` cortado é o que permite apagar o login depois sem levar
  -- nada junto, e é o que garante que ninguém entra por este perfil de novo.
  update perfis set
    nome = 'Pessoa removida',
    email = 'removido-' || left(p_perfil::text, 8) || '@removido.invalido',
    user_id = null,
    ativo = false,
    esquecido_em = now()
   where id = p_perfil;
end $$;

revoke all on function public.esquecer_pessoa(uuid) from public, anon;
grant execute on function public.esquecer_pessoa(uuid) to authenticated, service_role;

-- ==========================================================================
-- 56. O registro de acesso: nenhuma trava impede tudo, e saber importa
--
--     Toda camada de defesa é uma aposta contra o que se conhece hoje. O que
--     muda o jogo depois de um incidente não é mais uma trava, é **conseguir
--     dizer o que aconteceu**: quem virou administrador, quando alguém passou a
--     ver uma track que não via, quem trocou uma credencial, quem entrou numa
--     nota que não era dele. Sem isso, a resposta honesta ao cliente é "não sei",
--     e é a pior resposta possível.
--
--     `atividades` não serve para isto e nem devia: ela é o histórico da track,
--     é produto, e é **podada nas 40 últimas** de propósito. Registro que se
--     apaga sozinho não é registro.
--
--     **O que entra aqui é estreito**, e a escolha é o desenho inteiro. Não se
--     registra leitura: a tela lê dezenas de tabelas a cada abertura, e um
--     registro que cresce com o uso normal vira ruído onde ninguém acha nada, e
--     custa espaço para sempre. Entra o que **muda quem pode ver o quê** e o que
--     **toca credencial**, que é a forma de todo incidente: papel, desligamento,
--     visibilidade de track, entrada em nota, convite, plano, dono da empresa e
--     segredo de conector ou de caixa.
--
--     **E não se apaga.** Registro que o invasor pode limpar é pior do que não
--     ter, porque dá falsa segurança. Não existe política de update nem de
--     delete, e um gatilho recusa as duas ainda que alguém crie uma política
--     depois. Nem o administrador do cliente apaga, e a razão é ele mesmo: parte
--     do que se registra aqui são ações de administrador.
-- ==========================================================================

create table if not exists public.auditoria (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizacoes on delete cascade,
  /** Quem agiu. Fica nulo quando foi o servidor sem ninguém por trás (o pulso). */
  quem_id    uuid references public.perfis on delete set null,
  /** O nome de quem agiu, COPIADO. O perfil pode ser esquecido depois, e o
   *  registro precisa continuar dizendo quem foi: é esse o trabalho dele. */
  quem_nome  text not null default '',
  acao       text not null,
  alvo_tipo  text not null default '',
  alvo_id    uuid,
  /** O que mudou, em poucos campos. Nunca o conteúdo: nome de track e papel,
   *  jamais texto de tarefa, de nota ou de mensagem. O registro é sobre acesso,
   *  e um registro que copia conteúdo vira uma segunda cópia do que ele protege. */
  detalhe    jsonb not null default '{}'::jsonb,
  quando     timestamptz not null default now()
);

create index if not exists auditoria_org_idx  on public.auditoria (org_id, quando desc);
create index if not exists auditoria_quem_idx on public.auditoria (quem_id, quando desc);

alter table public.auditoria enable row level security;

-- Quem lê é administrador, e só da própria casa. Não existe insert, update nem
-- delete para gente nenhuma: quem escreve é gatilho, que roda como dono.
drop policy if exists aud_sel on public.auditoria;
create policy aud_sel on public.auditoria for select
  using (minha(org_id) and ativo() and eh_admin());

/** Recusa mexer no passado, mesmo que alguém crie uma política depois. */
create or replace function public.auditoria_nao_muda()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Mesma porta do perfil: com a empresa inteira indo embora, o registro dela
  -- vai junto. Guardar o histórico de acesso de um cliente que encerrou e pediu
  -- os dados fora seria manter exatamente o que ele pediu para tirar.
  if old.org_id is null or not exists (select 1 from organizacoes where id = old.org_id) then
    return old;
  end if;
  raise exception 'O registro de acesso não se altera nem se apaga. '
    'É essa a única coisa que o faz valer alguma coisa.';
end $$;

drop trigger if exists ao_mexer_auditoria on public.auditoria;
create trigger ao_mexer_auditoria before update or delete on public.auditoria
  for each row execute function public.auditoria_nao_muda();

/**
 * Escreve uma linha. Nunca falha o que estava sendo feito.
 *
 * Se o registro der erro, a ação que o gerou tem que acontecer assim mesmo: um
 * app que recusa desligar alguém porque a auditoria engasgou é um app que
 * ninguém consegue operar num dia ruim. A queixa vai para o log do servidor.
 */
create or replace function public.auditar(
  p_org uuid, p_acao text, p_alvo_tipo text default '',
  p_alvo_id uuid default null, p_detalhe jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_quem uuid; v_nome text;
begin
  v_quem := coalesce(meu_perfil(), perfil_de_quem_age());
  select nome into v_nome from perfis where id = v_quem;
  insert into auditoria (org_id, quem_id, quem_nome, acao, alvo_tipo, alvo_id, detalhe)
  values (coalesce(p_org, minha_org(), org_de_quem_age()), v_quem,
          coalesce(v_nome, 'o servidor'), p_acao, p_alvo_tipo, p_alvo_id, p_detalhe);
exception when others then
  raise warning 'auditoria falhou em %: %', p_acao, sqlerrm;
end $$;

revoke all on function public.auditar(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

/** Papel, desligamento e esquecimento de gente. */
create or replace function public.auditar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.papel is distinct from old.papel then
    perform auditar(new.org_id, 'papel', 'perfil', new.id,
      jsonb_build_object('de', old.papel, 'para', new.papel, 'quem', old.nome));
  end if;
  if new.ativo is distinct from old.ativo then
    perform auditar(new.org_id, case when new.ativo then 'religou' else 'desligou' end,
      'perfil', new.id, jsonb_build_object('quem', old.nome));
  end if;
  if new.esquecido_em is distinct from old.esquecido_em and new.esquecido_em is not null then
    perform auditar(new.org_id, 'esqueceu', 'perfil', new.id,
      jsonb_build_object('quem', old.nome));
  end if;
  return null;
end $$;

drop trigger if exists ao_auditar_perfil on public.perfis;
create trigger ao_auditar_perfil after update on public.perfis
  for each row execute function public.auditar_perfil();

/** Quem passa a ver uma track. */
create or replace function public.auditar_fluxo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visib is distinct from old.visib then
    perform auditar(new.org_id, 'visibilidade', 'track', new.id,
      jsonb_build_object('de', old.visib, 'para', new.visib, 'track', new.nome));
  end if;
  return null;
end $$;

drop trigger if exists ao_auditar_fluxo on public.fluxos;
create trigger ao_auditar_fluxo after update on public.fluxos
  for each row execute function public.auditar_fluxo();

/**
 * Quem entrou numa nota que não era dele.
 *
 * É a linha mais sensível do app: a nota é do dono e de mais ninguém, nem do
 * administrador, e quem abre o cartão num canal passa a ler para sempre. O dono
 * já vê a lista em "Compartilhada com"; aqui fica a data, que a lista não guarda.
 */
create or replace function public.auditar_nota_pessoa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform auditar(new.org_id, case when tg_op = 'INSERT' then 'entrou na nota' else 'saiu da nota' end,
    'nota', coalesce(new.nota_id, old.nota_id),
    jsonb_build_object('perfil', coalesce(new.perfil_id, old.perfil_id)));
  return null;
end $$;

drop trigger if exists ao_auditar_nota_pessoa on public.nota_pessoas;
create trigger ao_auditar_nota_pessoa after insert or delete on public.nota_pessoas
  for each row execute function public.auditar_nota_pessoa();

/** Credencial: conector, caixa de e-mail e agenda externa. */
create or replace function public.auditar_credencial()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  v_org := case tg_table_name
    when 'conector_segredos' then (select org_id from conectores where id = coalesce(new.conector_id, old.conector_id))
    else coalesce(new.org_id, old.org_id) end;
  perform auditar(v_org, lower(tg_op) || ' credencial', tg_table_name,
    coalesce(new.org_id, old.org_id), '{}'::jsonb);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['conector_segredos','caixas','agendas_externas'] loop
    continue when to_regclass('public.' || t) is null;
    execute format('drop trigger if exists ao_auditar_credencial on public.%I', t);
    execute format('create trigger ao_auditar_credencial after insert or update or delete '
      'on public.%I for each row execute function public.auditar_credencial()', t);
  end loop;
end $$;

/** Convite: quem chamou quem, e com que papel. */
create or replace function public.auditar_convite()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_acao text;
begin
  -- Sem o `if`, um update qualquer no convite chamaria `auditar` com ação nula,
  -- que a coluna recusa. `auditar` engole o erro de propósito, então o efeito
  -- seria um aviso no log a cada gravação e nenhuma linha: barulho que esconde
  -- o que importa.
  v_acao := case when tg_op = 'INSERT' then 'convidou'
                 when new.usado_por is distinct from old.usado_por and new.usado_por is not null
                   then 'convite aceito' end;
  if v_acao is null then return null; end if;
  perform auditar(new.org_id, v_acao, 'convite', new.id, jsonb_build_object('papel', new.papel));
  return null;
end $$;

drop trigger if exists ao_auditar_convite on public.convites;
create trigger ao_auditar_convite after insert or update on public.convites
  for each row execute function public.auditar_convite();

/** Plano e dono da empresa. */
create or replace function public.auditar_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plano is distinct from old.plano then
    perform auditar(new.id, 'plano', 'empresa', new.id,
      jsonb_build_object('de', old.plano, 'para', new.plano));
  end if;
  if new.dono_id is distinct from old.dono_id then
    perform auditar(new.id, 'dono', 'empresa', new.id,
      jsonb_build_object('de', old.dono_id, 'para', new.dono_id));
  end if;
  return null;
end $$;

drop trigger if exists ao_auditar_org on public.organizacoes;
create trigger ao_auditar_org after update on public.organizacoes
  for each row execute function public.auditar_org();


-- ==========================================================================
-- 57. O teto de leitura de IA existia na tela e não existia no banco
--
--     `tetoDeLeituras` em `lib/planos.ts` lê `limite_leituras ?? plano.leituras`:
--     coluna vazia quer dizer "vale o número do plano". O banco perguntava
--     `o.limite_leituras is null or ...`, ou seja, coluna vazia quer dizer **sem
--     teto nenhum**. E `comecar_teste` preenche `teste_ate` sem preencher
--     `limite_leituras`.
--
--     Somando as três: **toda empresa que entra em teste nasce sem freio**, com
--     a tela dela dizendo 200 leituras. Catorze dias de modelo sem limite por
--     cliente em avaliação, e a conta é de quem hospeda. Hoje não morde ninguém
--     porque as organizações estão em `interno`, que é sem teto de propósito, e
--     porque a consulta 2 do `planos.sql` manda mudar plano e limite na mesma
--     instrução. Ou seja, a trava dependia de alguém lembrar.
--
--     O conserto é o banco passar a responder a MESMA pergunta da tela, e não
--     preencher a coluna: vazio continua querendo dizer "vale o número do
--     plano", nos dois lados. `interno` continua sem teto, que é a única
--     ausência proposital.
--
--     **Os números vivem em dois arquivos, e não há como não viver.** A tela
--     precisa deles sem ir ao banco e o gatilho precisa deles sem ir à tela.
--     Ao mexer num, mexer no outro: `leituras_do_plano` aqui e `PLANOS` em
--     `lib/planos.ts`. A conferência do `atualizar.sql` imprime os do banco para
--     poderem ser comparados com os olhos.
--
--     E `organizacoes.plano` ganha restrição. Quem liga plano é a operação, na
--     mão, pelo SQL Editor; um erro de digitação ali gravava um plano que não
--     existe, e plano que não existe não casa com nenhum `case`, cai no `else`,
--     e vira sem teto. O erro mais caro possível, escrito por quem estava
--     justamente tentando cobrar.
-- ==========================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'org_plano_check') then
    -- O que estiver fora da lista vira 'interno' antes da trava, senão uma linha
    -- velha impede a restrição de nascer e o arquivo inteiro para aqui.
    update organizacoes set plano = 'interno'
     where plano is null or plano not in ('teste','reduzido','pessoal','equipe','interno');
    alter table public.organizacoes add constraint org_plano_check
      check (plano in ('teste','reduzido','pessoal','equipe','interno'));
  end if;
end $$;

/**
 * Quantas leituras cada plano dá por mês. Espelho de `PLANOS`, em
 * `lib/planos.ts`. Mexeu num, mexa no outro.
 *
 * `interno` devolve nulo de propósito: é a casa e a demonstração, sem teto e
 * sem prazo. É a única ausência que quer dizer ausência.
 */
create or replace function public.leituras_do_plano(p_plano text)
returns int language sql immutable set search_path = public as $$
  select case p_plano
    when 'teste'    then 200
    when 'reduzido' then 0
    when 'pessoal'  then 150
    when 'equipe'   then 120   -- por assento ativo, ver `teto_de_leituras`
    else null
  end;
$$;

/**
 * O teto desta empresa agora, do jeito que a tela calcula.
 *
 * Linha por linha, é `tetoDeLeituras`: a coluna manda sobre o plano, vazio cai
 * no número do plano, e no Enterprise multiplica pelos assentos ativos, porque
 * o custo de IA anda com o tamanho da equipe. Nulo quer dizer sem teto, e só
 * `interno` chega nele.
 *
 * `plano_em_vigor` e não `plano`: o teste vence por data comparada na hora, e
 * quem venceu tem o teto do reduzido, que é zero.
 */
create or replace function public.teto_de_leituras(p_org uuid)
returns int language sql stable security definer set search_path = public as $$
  select case
    when base is null then null
    when vigente = 'equipe' then base * greatest(1, assentos_usados(p_org))
    else base
  end
  from (
    select plano_em_vigor(p_org) as vigente,
           coalesce(o.limite_leituras, leituras_do_plano(plano_em_vigor(p_org))) as base
      from organizacoes o where o.id = p_org
  ) x;
$$;

create or replace function public.pode_chamar_modelo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select o.ia_ativa
       and plano_em_vigor(o.id) <> 'reduzido'
       and (teto_de_leituras(o.id) is null or leituras_do_mes() < teto_de_leituras(o.id))
      from organizacoes o where o.id = minha_org()
  ), false);
$$;

create or replace function public.pulso_pode(p_org uuid)
returns table (pode boolean, modelo text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(
      o.ia_ativa
      and plano_em_vigor(o.id) <> 'reduzido'
      and (teto_de_leituras(o.id) is null or leituras_do_mes_de(o.id) < teto_de_leituras(o.id)),
      false),
    coalesce(nullif(btrim(o.modelo_ia), ''), '')
  from organizacoes o
  where o.id = p_org;
$$;

revoke all on function public.teto_de_leituras(uuid) from public, anon;
grant execute on function public.teto_de_leituras(uuid) to authenticated, service_role;


-- O aviso de tarefa nova ganha a exceção da devolução (seção 58).
create or replace function public.aviso_tarefa()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fluxo text;
begin
  if new.resp_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.resp_id is not distinct from old.resp_id then return new; end if;
  if new.resp_id = meu_perfil() then return new; end if;
  /**
   * Devolução não é tarefa nova.
   *
   * Devolver muda o responsável, então este gatilho dispara e manda "Nova
   * tarefa com você" junto com o "Devolveram uma tarefa para você" da seção 58:
   * dois avisos para o mesmo gesto, e o genérico ainda esconde o motivo, que é
   * a única coisa que a pessoa precisa ler. Quem conta devolução é o outro.
   */
  if tg_op = 'UPDATE' and new.devolvida_em is distinct from old.devolvida_em then
    return new;
  end if;

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

-- ==========================================================================
-- 58. Quem pediu fica sabendo, e quem recebeu pode devolver
--
--     Três buracos do mesmo ciclo, e os três apareceram na mesma conversa de
--     uso real.
--
--     **Quem pediu não era avisado.** `aviso_ao_concluir` avisava só quem estava
--     TRAVADO pela tarefa. Se ninguém dependia dela, ela ficava pronta em
--     silêncio: quem pediu o relatório só descobria perguntando, que é
--     exatamente o que este app existe para evitar.
--
--     **E quem recebeu não tinha voz.** A tarefa nascia no nome de alguém e
--     pronto. Na vida real a resposta mais comum a um pedido errado não é fazer
--     nem ignorar, é "isso não é comigo, é com a Erika". Sem porta para isso, a
--     pessoa ignora, e a tarefa apodrece no nome de quem nunca ia fazê-la.
--
--     Devolver não é recusar trabalho: é **devolver a decisão a quem pediu**,
--     com o motivo junto. Por isso o motivo é obrigatório e por isso a tarefa
--     volta para o colo do autor em vez de ficar sem dono: tarefa sem dono é
--     tarefa que ninguém olha, e o ponto é justamente que alguém olhe.
-- ==========================================================================

alter table public.itens add column if not exists devolvida_em  timestamptz;
alter table public.itens add column if not exists devolvida_por uuid references public.perfis on delete set null;
alter table public.itens add column if not exists devolvida_pq  text;

/**
 * Devolver a tarefa a quem pediu, com o motivo.
 *
 * Só quem está no nome dela devolve: devolver tarefa alheia seria mexer no
 * trabalho de outra pessoa, e isso aqui sempre pede botão de quem é dono dele.
 * O autor não devolve para si mesmo, porque não há para onde.
 */
create or replace function public.devolver_item(p_item uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v itens%rowtype; v_eu uuid := meu_perfil();
begin
  select * into v from itens where id = p_item;
  if v.id is null then raise exception 'Tarefa não encontrada.'; end if;
  if not minha(v.org_id) then raise exception 'Tarefa de outra empresa.'; end if;
  if v.resp_id is distinct from v_eu then
    raise exception 'Só quem está no nome da tarefa pode devolvê-la.';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Diga por que está devolvendo: sem o motivo, quem pediu não sabe o que fazer com ela.';
  end if;
  if v.autor_id is null or v.autor_id = v_eu then
    raise exception 'Esta tarefa não tem para quem voltar.';
  end if;

  update itens set
    resp_id = v.autor_id,
    devolvida_em = now(), devolvida_por = v_eu, devolvida_pq = btrim(p_motivo)
   where id = p_item;

  perform auditar(v.org_id, 'devolveu', 'item', p_item,
    jsonb_build_object('de', v_eu, 'para', v.autor_id));
end $$;

revoke all on function public.devolver_item(uuid, text) from public, anon;
grant execute on function public.devolver_item(uuid, text) to authenticated;

/**
 * Quem pediu fica sabendo: ao concluir e ao devolver.
 *
 * Separado de `aviso_ao_concluir`, que cuida de quem estava travado. Os dois
 * olham o mesmo instante e respondem a perguntas diferentes: lá é "já dá para
 * tocar o meu", aqui é "aquilo que eu pedi aconteceu".
 *
 * Nada sai quando a pessoa conclui a própria tarefa: avisar alguém do que ele
 * mesmo acabou de fazer é o começo de o sino virar ruído.
 */
create or replace function public.aviso_de_quem_pediu()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if new.autor_id is null then return null; end if;

  if new.feito and not old.feito and new.autor_id is distinct from new.resp_id then
    select nome into v_nome from perfis where id = new.resp_id;
    perform avisar(new.autor_id, 'tarefa', 'Ficou pronto',
      coalesce(v_nome, 'Alguém') || ' concluiu: ' || new.texto,
      -- A chave carrega a tarefa e o estado: concluir, reabrir e concluir de
      -- novo são três notícias, e a segunda não pode ser engolida pela primeira.
      'feito:' || new.id::text, false, new.fluxo_id, new.id);
  end if;

  if new.devolvida_em is distinct from old.devolvida_em and new.devolvida_em is not null then
    select nome into v_nome from perfis where id = new.devolvida_por;
    perform avisar(new.autor_id, 'tarefa', 'Devolveram uma tarefa para você',
      coalesce(v_nome, 'Alguém') || ' devolveu "' || new.texto || '": ' || coalesce(new.devolvida_pq, ''),
      'devolvida:' || new.id::text || ':' || new.devolvida_em::text, false, new.fluxo_id, new.id);
  end if;
  return null;
end $$;

drop trigger if exists ao_pedir_saber on public.itens;
create trigger ao_pedir_saber after update on public.itens
  for each row execute function public.aviso_de_quem_pediu();

-- ==========================================================================
-- 59. A track que o canal ganha sem ninguém pedir
--
--     O app deixava CONVERSAR sem track e não deixava TRABALHAR sem track:
--     `itens.fluxo_id` e `etapa_id` são obrigatórios, então a primeira coisa
--     combinada num canal livre batia em "escolha para qual projeto esta tarefa
--     vai". E a pessoa não sabe: ela acabou de criar o canal justamente porque
--     ainda não sabe que forma aquele trabalho tem.
--
--     Pedir que ela invente a track antes de trabalhar é pedir que desenhe o
--     processo antes de ter vivido ele, que é o oposto do que este produto diz
--     em toda a seção de processos descobertos.
--
--     A saída já existia em outro lugar: a tarefa avulsa mora numa track
--     privada chamada "Minha lista", que **nasce sozinha na primeira tarefa** e
--     que ninguém nunca vê. O mesmo truque serve aqui, e usar duas vezes um
--     mecanismo que já existe vale mais do que inventar um segundo.
--
--     `implicita` é o que a mantém fora do caminho: ela não aparece em Tracks,
--     e o canal continua listado como canal. O dia em que o trabalho ali tiver
--     forma, alguém aceita dar-lhe uma trilha e ela deixa de ser implícita.
--     Até lá, ela é só o lugar onde o trabalho fica guardado enquanto ninguém
--     sabe ainda que forma ele tem.
-- ==========================================================================
-- 60. A track escondida sai do esconderijo
--
--     O canal sem track trabalha numa track escondida (seção 59), e até aqui
--     tudo bem: ela existe para a primeira tarefa combinada ali ter onde morar.
--     O problema é que ela ficava escondida PARA SEMPRE. O canal acumulava
--     quarenta tarefas numa lista invisível, com um checkpoint chamado "Em
--     andamento" e nenhum critério, e ninguém nunca era convidado a nomear
--     nada. Um canal que trabalha bastante continuava sendo um chat com lista
--     de tarefas ao lado, que é exatamente o que este produto existe para não
--     ser.
--
--     `virar_track` é a porta de saída. Ela recebe o nome, o tipo e os
--     checkpoints já decididos (a regra de QUANDO propor e de como repartir
--     mora em `lib/trilhar.ts`, com o modelo dando só os nomes) e converte a
--     track no lugar: cria os checkpoints de verdade, reparte as tarefas que já
--     existem entre eles, e tira o `implicita`.
--
--     POR QUE NÃO `salvar_fluxo`: aquela função congela a posição do que já
--     passou, e com razão, porque mover um checkpoint vencido faria a track
--     mudar de lugar em silêncio. Mas a track escondida tem UM checkpoint, na
--     posição 0, com tarefas já concluídas: `trilha_comecou()` é verdadeiro, e
--     ela recusaria justamente a conversão. São operações diferentes, e dar
--     duas bocas à mesma função seria pedir que ela decidisse qual regra vale.
--
--     SÓ ENQUANTO ESCONDIDA. Depois de virada, mexer na trilha é `salvar_fluxo`
--     como em qualquer track, com o congelamento valendo. Sem essa trava,
--     `virar_track` seria um caminho alternativo para remontar trilha que já
--     andou, e o congelamento passaria a existir só enquanto alguém lembrasse.
-- ==========================================================================

/**
 * O gatilho de item devolve `etapa_id` ao que era quando quem escreve não manda
 * no processo, e está certo. Mas ele pergunta pela SESSÃO, e durante a
 * conversão quem move as tarefas é a própria `virar_track`, que já conferiu a
 * permissão uma vez. Sem esta porta, as tarefas ficariam todas no checkpoint
 * velho e a trilha nasceria com dois checkpoints vazios, sem erro nenhum.
 *
 * A porta é estreita de propósito: vale para UMA track, dentro da transação em
 * que ela está sendo convertida. Mesmo mecanismo de `trackward.esquecendo`, na
 * seção 55.
 */
create or replace function public.proteger_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not manda_no_processo(new.fluxo_id)
     and coalesce(nullif(current_setting('trackward.virando', true), ''), '') <> new.fluxo_id::text
  then
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

/**
 * Converte a track escondida de um canal numa track de verdade.
 *
 * `p_etapas` é um jsonb assim, na ordem da trilha:
 *   [{"nome":"Briefing","itens":["<id>","<id>"]}, {"nome":"Execução","itens":[...]}]
 *
 * O que não vier em `itens` fica no primeiro checkpoint. Tarefa esquecida fora
 * da trilha é tarefa que some da tela sem ninguém apagar, e isso é pior do que
 * ela estar no checkpoint errado, que qualquer um conserta arrastando.
 */
create or replace function public.virar_track(
  p_fluxo uuid, p_nome text, p_tipo text, p_etapas jsonb, p_como uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  f fluxos%rowtype;
  v_eu uuid := quem_age(p_como);
  passo jsonb;
  v_etapa uuid;
  v_ordem int := 0;
  v_primeira uuid;
  v_atual int;
  v_velhas uuid[];
begin
  select * into f from fluxos where id = p_fluxo;
  if f.id is null then raise exception 'Esta track não existe mais.'; end if;
  if not f.implicita then
    raise exception 'Esta track já tem trilha. Para mexer nela, use Montar a trilha.';
  end if;
  if not manda_no_processo_como(p_fluxo, v_eu) then
    raise exception 'Desenhar a trilha é de quem responde pelo processo.';
  end if;
  if p_tipo not in ('esteira','ciclo') then
    raise exception 'Tipo de track inválido.';
  end if;
  if jsonb_array_length(coalesce(p_etapas, '[]'::jsonb)) = 0 then
    raise exception 'Uma trilha sem checkpoint não é trilha.';
  end if;

  -- A porta do gatilho, só para esta track e só nesta transação.
  perform set_config('trackward.virando', p_fluxo::text, true);

  -- Os checkpoints velhos são guardados por ID, e não pela ordem deles. A
  -- primeira versão apagava `ordem >= quantos entraram`, e o "Em andamento"
  -- tem ordem 0: ele sobrevivia ao lado do primeiro checkpoint novo, com a
  -- mesma ordem e nenhuma tarefa, e a trilha nascia com um passo fantasma na
  -- frente. Apareceu no primeiro ensaio com dados.
  select array_agg(id) into v_velhas from etapas where fluxo_id = p_fluxo;

  for passo in select * from jsonb_array_elements(p_etapas) loop
    v_etapa := gen_random_uuid();
    insert into etapas (id, fluxo_id, nome, criterio, ordem, org_id)
    values (v_etapa, p_fluxo,
            coalesce(nullif(trim(passo->>'nome'), ''), 'Checkpoint ' || (v_ordem + 1)),
            coalesce(passo->>'criterio', ''),
            v_ordem, f.org_id);
    if v_primeira is null then v_primeira := v_etapa; end if;

    update itens set etapa_id = v_etapa
     where fluxo_id = p_fluxo
       and id in (select (jsonb_array_elements_text(coalesce(passo->'itens','[]'::jsonb)))::uuid);

    v_ordem := v_ordem + 1;
  end loop;

  -- O que ninguém endereçou vai para o primeiro, e não para lugar nenhum.
  update itens set etapa_id = v_primeira
   where fluxo_id = p_fluxo and etapa_id = any(v_velhas);

  -- Os checkpoints velhos saem só agora: apagados antes, a cascata de
  -- `itens.etapa_id` levaria as tarefas junto, e a track nasceria vazia.
  delete from etapas where id = any(v_velhas);

  /**
   * Onde a track pousa.
   *
   * No primeiro checkpoint que ainda tem tarefa aberta, e não no começo: o
   * trabalho já andou, e pôr a track na posição 0 diria que nada foi feito.
   * Com tudo pronto, ela para no último, esperando a aprovação de saída.
   *
   * E sem tarefa NENHUMA ela começa do começo. A primeira versão caía no
   * último também aqui, porque "nenhum checkpoint tem tarefa aberta" é
   * verdade tanto quando tudo ficou pronto quanto quando nada existe, e as
   * duas coisas querem dizer o contrário uma da outra.
   */
  select coalesce(
    (select min(e.ordem) from etapas e
      where e.fluxo_id = p_fluxo
        and exists (select 1 from itens i where i.etapa_id = e.id and not i.feito)),
    case when exists (select 1 from itens where fluxo_id = p_fluxo)
         then v_ordem - 1 else 0 end
  ) into v_atual;

  update fluxos
     set nome = coalesce(nullif(trim(p_nome), ''), nome),
         tipo = p_tipo,
         implicita = false,
         atual = v_atual
   where id = p_fluxo;
end $$;

revoke all on function public.virar_track(uuid, text, text, jsonb, uuid) from public, anon;
grant execute on function public.virar_track(uuid, text, text, jsonb, uuid) to authenticated, service_role;

-- ==========================================================================
-- 61. O anexo na conversa, e o anexo que só algumas pessoas abrem
--
--     Faltavam duas coisas, e elas são uma só na cabeça de quem usa.
--
--     A PRIMEIRA: anexo só existia pendurado numa tarefa ou numa nota. No meio
--     de uma conversa, que é onde o trabalho nasce, não dava para mandar um
--     arquivo. Quem precisava mandar o contrato ia para o WhatsApp, e com ele
--     ia a conversa inteira, que é exatamente o que este produto existe para
--     não deixar acontecer. Agora o anexo também pertence a uma MENSAGEM, e a
--     regra de um dono só continua valendo, porque anexo pendurado em nada é
--     arquivo que ninguém acha e ninguém apaga.
--
--     A SEGUNDA: quem manda escolhe quem abre. Num canal com doze pessoas, o
--     contrato do fornecedor não é assunto de doze. Hoje a única saída era não
--     mandar, ou abrir um canal novo só para isso, e canal aberto por causa de
--     um arquivo é canal que ninguém mais usa depois.
--
--     QUEM ESTÁ DE FORA NÃO VÊ QUE O ARQUIVO EXISTE. Esta é a escolha, e ela é
--     do Leo, em 06/10/2026. A alternativa (mostrar o anexo trancado) parece
--     mais honesta e é pior: ela anuncia que existe um documento sobre aquele
--     assunto, com nome de arquivo e tudo, para quem não pode abri-lo. Isso não
--     protege, convida a perguntar, e a pergunta chega a quem mandou.
--
--     A lista é OPCIONAL. Sem ninguém nela, o anexo segue a coisa a que
--     pertence, como sempre foi: anexo de tarefa abre com a tarefa, de nota só
--     para a dona, de mensagem com o canal. O caso restrito é a exceção, e
--     exceção que vira padrão é burocracia.
-- ==========================================================================

alter table public.anexos add column if not exists mensagem_id uuid
  references public.mensagens on delete cascade;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'anexos_de_uma_coisa') then
    alter table public.anexos drop constraint anexos_de_uma_coisa;
  end if;
  alter table public.anexos add constraint anexos_de_uma_coisa
    check (num_nonnulls(item_id, nota_id, ciclo_id, mensagem_id) = 1);
end $$;

create index if not exists anexos_mensagem_idx on public.anexos (mensagem_id)
  where mensagem_id is not null;

/**
 * Quem foi liberado a abrir UM anexo.
 *
 * Vazia para aquele anexo quer dizer "quem vê a coisa a que ele pertence", que
 * é o comportamento de sempre. Com gente dentro, vira lista fechada.
 */
create table if not exists public.anexo_pessoas (
  anexo_id  uuid not null references public.anexos on delete cascade,
  perfil_id uuid not null references public.perfis on delete cascade,
  org_id    uuid not null references public.organizacoes on delete cascade,
  primary key (anexo_id, perfil_id)
);
alter table public.anexo_pessoas enable row level security;

/**
 * Este anexo tem lista?
 *
 * `security definer` para quebrar o círculo: a política de `anexos` pergunta
 * por `anexo_pessoas` e a de `anexo_pessoas` pergunta por `anexos`. Escritas
 * como subconsulta normal, o Postgres responde "recursão infinita detectada na
 * política", que foi o que já aconteceu com `notas` e com a agenda.
 */
create or replace function public.anexo_restrito(p_anexo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from anexo_pessoas where anexo_id = p_anexo);
$$;

create or replace function public.anexo_comigo(p_anexo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from anexo_pessoas where anexo_id = p_anexo and perfil_id = meu_perfil());
$$;

/**
 * Posso abrir este anexo?
 *
 * Duas perguntas, e as duas precisam ser sim:
 *   1. eu vejo a coisa a que ele pertence (tarefa, nota, ciclo ou mensagem)
 *   2. ele não tem lista, ou eu estou nela, ou fui eu que mandei
 *
 * A segunda nunca ALARGA a primeira: pôr alguém na lista de um anexo de canal
 * fechado não abre aquele canal para ela. A lista só estreita, e é por isso que
 * ela pode ser gesto de quem manda, sem passar por administrador nenhum.
 */
create or replace function public.ve_anexo(p_anexo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from anexos a
     where a.id = p_anexo and minha(a.org_id)
       and (
         (a.item_id is not null and ve_item(a.item_id))
         or (a.nota_id is not null and exists (
              select 1 from notas n where n.id = a.nota_id and n.dono_id = meu_perfil()))
         or (a.ciclo_id is not null and exists (
              select 1 from ciclos c where c.id = a.ciclo_id and ve_fluxo(c.fluxo_id)))
         or (a.mensagem_id is not null and exists (
              select 1 from mensagens m where m.id = a.mensagem_id
                and (m.canal_id is not null and ve_canal(m.canal_id)
                     or m.nota_id is not null and minha_nota(m.nota_id))))
       )
       and (a.autor_id = meu_perfil()
            or not anexo_restrito(p_anexo)
            or anexo_comigo(p_anexo))
  );
$$;

drop policy if exists anx_sel on public.anexos;
create policy anx_sel on public.anexos for select using (
  minha(org_id) and ativo() and ve_anexo(id));

drop policy if exists anx_ins on public.anexos;
create policy anx_ins on public.anexos for insert with check (
  minha(org_id) and ativo() and autor_id = meu_perfil() and (
    (item_id is not null and ve_item(item_id))
    or (nota_id is not null and exists (
         select 1 from notas n where n.id = nota_id and n.dono_id = meu_perfil()))
    or (ciclo_id is not null and exists (
         select 1 from ciclos c where c.id = ciclo_id and ve_fluxo(c.fluxo_id)))
    or (mensagem_id is not null and exists (
         select 1 from mensagens m where m.id = mensagem_id and m.autor_id = meu_perfil()))
  ));

/**
 * A lista é de quem mandou o arquivo, e de mais ninguém.
 *
 * Ninguém se convida: sem esta trava, bastaria um insert para a pessoa entrar
 * na lista de qualquer anexo, e a restrição existiria só na tela. Mesmo
 * desenho de `nota_pessoas`.
 */
drop policy if exists axp_sel on public.anexo_pessoas;
create policy axp_sel on public.anexo_pessoas for select using (
  minha(org_id) and ativo() and ve_anexo(anexo_id));

drop policy if exists axp_ins on public.anexo_pessoas;
create policy axp_ins on public.anexo_pessoas for insert with check (
  minha(org_id) and ativo()
  and exists (select 1 from anexos a where a.id = anexo_id and a.autor_id = meu_perfil()));

drop policy if exists axp_del on public.anexo_pessoas;
create policy axp_del on public.anexo_pessoas for delete using (
  minha(org_id) and ativo()
  and exists (select 1 from anexos a where a.id = anexo_id and a.autor_id = meu_perfil()));

/**
 * O Storage segue a mesma régua.
 *
 * Sem isto, a política da tabela esconderia a LINHA e o arquivo continuaria
 * aberto a quem tivesse o caminho. O caminho não é segredo: ele aparece em
 * `anexos.caminho` para quem lê a linha, e um dia aparece num log.
 */
create or replace function public.posso_ver_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from anexos a where a.caminho = p_caminho and ve_anexo(a.id)
  )
  -- Recado de voz: abre quando o canal abre. Ele não é linha de `anexos`, e por
  -- isso continua tendo conta própria.
  or exists (
    select 1 from mensagens m
    where m.audio_caminho = p_caminho and minha(m.org_id) and ve_canal(m.canal_id)
  );
$$;

revoke all on function public.ve_anexo(uuid) from public, anon;
revoke all on function public.anexo_restrito(uuid) from public, anon;
revoke all on function public.anexo_comigo(uuid) from public, anon;
grant execute on function public.ve_anexo(uuid) to authenticated, service_role;
grant execute on function public.anexo_restrito(uuid) to authenticated, service_role;
grant execute on function public.anexo_comigo(uuid) to authenticated, service_role;

/**
 * O carimbo da organização, que a tela não manda e não deve mandar.
 *
 * Mesmo cuidado de `nota_pessoas`, e pelo mesmo motivo: sem ele, toda inserção
 * aqui nasceria com `org_id` vazio e seria recusada por `minha(org_id)`, com
 * uma mensagem falando da política em vez do carimbo que falta. Foi assim que
 * salvar o próprio telefone ficou quatro dias quebrado sem ninguém ver.
 */
drop trigger if exists ao_inserir_org on public.anexo_pessoas;
create trigger ao_inserir_org before insert on public.anexo_pessoas
  for each row execute function public.carimbar_org();

-- ==========================================================================
-- 62. A trilha melhora enquanto roda, e as tarefas não vão junto
--
--     A trilha nasce de um palpite e só o uso diz se ela está certa. O raio-X
--     já achava o checkpoint que nunca reprova (o carimbo) e o que come o tempo
--     todo, e só RELATAVA: não existia caminho para tirar nem para acrescentar.
--
--     E existe uma armadilha no caminho óbvio. `salvar_fluxo` termina com
--     `delete from etapas where not (id = any(ids))`, e `itens.etapa_id` tem
--     cascata: tirar um checkpoint pela lista de etapas APAGA as tarefas dele,
--     sem avisar. Isso é aceitável enquanto a trilha é rascunho e cada
--     checkpoint está vazio; deixa de ser no dia em que alguém tira um
--     checkpoint de uma track que já trabalhou.
--
--     Por isso duas funções, e não um `salvar_fluxo` com mais um parâmetro:
--     elas existem para MOVER a tarefa antes de mexer na trilha, e esse é o
--     trabalho inteiro delas.
--
--     O CONGELAMENTO CONTINUA VALENDO, e é ele que decide o que dá para fazer:
--     tirar só o que ainda não chegou, porque tirar um checkpoint vencido faria
--     a track mudar de lugar em silêncio; partir vale também para o corrente,
--     porque o novo entra DEPOIS dele e nada que já passou muda de posição.
-- ==========================================================================

/**
 * Tira um checkpoint da trilha, levando as tarefas dele para outro.
 *
 * `p_para` é para onde as tarefas vão. Nulo manda para o checkpoint seguinte,
 * e no último para o anterior: tarefa sem checkpoint não existe, e o ponto de
 * tirar a porta é justamente não perder o que estava atrás dela.
 */
create or replace function public.tirar_checkpoint(
  p_etapa uuid, p_para uuid default null, p_como uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  e etapas%rowtype;
  f fluxos%rowtype;
  v_eu uuid := quem_age(p_como);
  v_destino uuid;
begin
  select * into e from etapas where id = p_etapa;
  if e.id is null then raise exception 'Este checkpoint não existe mais.'; end if;
  select * into f from fluxos where id = e.fluxo_id;
  if not manda_no_processo_como(f.id, v_eu) then
    raise exception 'Mexer na trilha é de quem responde pelo processo.';
  end if;
  if (select count(*) from etapas where fluxo_id = f.id) < 2 then
    raise exception 'Uma trilha sem checkpoint não é trilha.';
  end if;
  if e.ordem <= f.atual then
    raise exception 'Este checkpoint já passou ou é o de agora. '
      'O que ficou para trás fica onde está, senão a track muda de lugar em silêncio.';
  end if;

  v_destino := coalesce(
    p_para,
    (select id from etapas where fluxo_id = f.id and ordem > e.ordem order by ordem limit 1),
    (select id from etapas where fluxo_id = f.id and ordem < e.ordem order by ordem desc limit 1));
  if v_destino is null or v_destino = p_etapa then
    raise exception 'Não há para onde levar as tarefas deste checkpoint.';
  end if;

  perform set_config('trackward.virando', f.id::text, true);
  update itens set etapa_id = v_destino where etapa_id = p_etapa;
  delete from etapas where id = p_etapa;
  -- As posições fecham a lacuna. O que passou mantém a ordem relativa, e o
  -- `atual` não se move porque só se tira o que vem depois dele.
  update etapas set ordem = ordem - 1 where fluxo_id = f.id and ordem > e.ordem;

  insert into atividades (fluxo_id, quem_id, texto)
  values (f.id, v_eu, 'tirou o checkpoint ' || e.nome);
end $$;

/**
 * Parte um checkpoint em dois, levando parte das tarefas para o novo.
 *
 * O novo entra LOGO DEPOIS do que foi partido, com as tarefas de `p_itens`.
 * Vale também para o checkpoint corrente, porque nada que já passou troca de
 * posição: o que entra, entra à frente.
 */
create or replace function public.partir_checkpoint(
  p_etapa uuid, p_nome text, p_itens uuid[], p_como uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  e etapas%rowtype;
  f fluxos%rowtype;
  v_eu uuid := quem_age(p_como);
  v_novo uuid := gen_random_uuid();
begin
  select * into e from etapas where id = p_etapa;
  if e.id is null then raise exception 'Este checkpoint não existe mais.'; end if;
  select * into f from fluxos where id = e.fluxo_id;
  if not manda_no_processo_como(f.id, v_eu) then
    raise exception 'Mexer na trilha é de quem responde pelo processo.';
  end if;
  if e.ordem < f.atual then
    raise exception 'Este checkpoint já passou. O que ficou para trás fica onde está.';
  end if;
  if coalesce(array_length(p_itens, 1), 0) = 0 then
    raise exception 'Partir sem levar tarefa nenhuma deixaria um checkpoint vazio.';
  end if;
  if not exists (select 1 from itens where etapa_id = p_etapa and not (id = any(p_itens))) then
    raise exception 'Levar TODAS as tarefas deixaria o checkpoint de origem vazio.';
  end if;

  perform set_config('trackward.virando', f.id::text, true);
  update etapas set ordem = ordem + 1 where fluxo_id = f.id and ordem > e.ordem;
  insert into etapas (id, fluxo_id, nome, criterio, ordem, aprovador_id, prazo, org_id)
  values (v_novo, f.id, coalesce(nullif(btrim(p_nome), ''), e.nome || ' (2)'), '',
          e.ordem + 1, e.aprovador_id, e.prazo, f.org_id);
  update itens set etapa_id = v_novo where etapa_id = p_etapa and id = any(p_itens);

  insert into atividades (fluxo_id, quem_id, texto)
  values (f.id, v_eu, 'partiu o checkpoint ' || e.nome);
  return v_novo;
end $$;

revoke all on function public.tirar_checkpoint(uuid, uuid, uuid) from public, anon;
revoke all on function public.partir_checkpoint(uuid, text, uuid[], uuid) from public, anon;
grant execute on function public.tirar_checkpoint(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.partir_checkpoint(uuid, text, uuid[], uuid) to authenticated, service_role;

-- ==========================================================================
-- 63. Encerrar a conta de um cliente precisa funcionar
--
--     É obrigação da LGPD, e hoje falha de duas formas, as duas caladas.
--
--     A PRIMEIRA é esta trava. `proteger_ressalva` recusa apagar tarefa com
--     ressalva em aberto, e está certa: ressalva é dívida, e dívida se paga.
--     Só que ela não pergunta POR QUE alguém está apagando, e quando quem apaga
--     é a cascata de `delete from organizacoes` ela recusa do mesmo jeito. Um
--     cliente com uma única ressalva pendente não consegue ser encerrado, e a
--     mensagem fala de ressalva para quem está apagando uma empresa.
--
--     É a terceira trava da mesma família. `ao_apagar_perfil` (seção 55) e
--     `auditoria_nao_muda` (seção 56) já ganharam a mesma porta, e o comentário
--     delas registra que as duas foram descobertas TENTANDO, uma depois da
--     outra. Esta apareceu do mesmo jeito, em 06/10/2026, zerando o banco.
--
--     A porta olha o FLUXO, e não a organização: dívida sem checkpoint credor
--     não é dívida. Assim ela vale tanto para a empresa inteira indo embora
--     quanto para uma track sendo apagada, e continua recusando o caso que
--     importa, que é alguém tentando sumir com a pendência na tela.
--
--     A SEGUNDA falha não é de banco e não se conserta aqui: os arquivos no
--     Storage sobrevivem à organização, porque a cascata apaga a linha de
--     `anexos` e não o arquivo, e o Supabase proíbe apagar arquivo por SQL
--     ("Direct deletion from storage tables is not allowed"). O caminho é a API
--     de Storage, ANTES do delete, e a receita inteira está em
--     `encerrar-conta.mjs`, na raiz, junto da cópia que se entrega ao cliente.
-- ==========================================================================

create or replace function public.proteger_ressalva()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A track inteira está indo embora: não sobrou checkpoint para cobrar esta
  -- dívida, e a trava passaria a impedir exatamente o que o cliente pediu.
  if old.fluxo_id is null or not exists (select 1 from fluxos where id = old.fluxo_id) then
    return old;
  end if;
  if old.ressalva and not old.feito then
    raise exception 'Ressalva não se apaga, se conclui. Ela é a dívida que ficou do checkpoint anterior.';
  end if;
  return old;
end $$;

-- ==========================================================================
-- 64. A proposta avisa quem vai fazer, e mais ninguém
--
--     A leitura roda sozinha três vezes por dia e deixa a proposta no canal.
--     Quem não abriu o app naquele dia não fica sabendo de nada, e o pedido
--     fica esperando alguém passar por ali. O ciclo que o produto promete
--     ("combinou, virou trabalho") parava justamente na beira.
--
--     SÓ PARA QUEM A TAREFA É. Para quem vai fazer, "alguém está te pedindo uma
--     coisa" é exatamente o que merece sair do app. Para os outros do canal, é
--     o celular tocando para contar o que já está escrito na conversa que eles
--     vão abrir de qualquer jeito, e a faixa de aviso é estreita de propósito:
--     se tudo avisa, a primeira coisa que a pessoa faz é desligar tudo.
--
--     E NÃO AVISA QUEM PEDIU. A frase foi dele; tocar o celular dele para
--     repetir o que ele acabou de dizer é o app conversando sozinho.
--
--     NÃO É URGENTE. Urgente é o que já venceu, o que trava outra pessoa e o
--     que só aquela pessoa destrava. Um pedido novo pode esperar a pessoa
--     olhar o telefone.
-- ==========================================================================

create or replace function public.aviso_de_proposta()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_quem uuid := nullif(new.dados->>'resp_id', '')::uuid;
  v_canal canais%rowtype;
  v_autor uuid;
begin
  -- Só proposta de tarefa, só com alguém apontado, e só vinda de um canal: a
  -- do caderno é da própria dona, e avisar alguém do que ela escreveu para si
  -- seria vazar a nota pela porta do aviso.
  if new.tipo <> 'tarefa' or v_quem is null or new.canal_id is null then return new; end if;
  if new.estado <> 'aberta' then return new; end if;

  select * into v_canal from canais where id = new.canal_id;
  if v_canal.id is null then return new; end if;

  -- Quem falou na mensagem que originou a proposta é quem pediu. Avisá-lo seria
  -- repetir para ele o que ele mesmo escreveu.
  select autor_id into v_autor from mensagens where id = new.mensagem_id;
  if v_autor is not null and v_autor = v_quem then return new; end if;

  /**
   * O aviso falha calado, e a proposta entra do mesmo jeito.
   *
   * Sem isto, um erro aqui derruba o INSERT inteiro: a leitura acha o pedido, o
   * aviso engasga, e a PROPOSTA não é gravada. O trabalho é o que importa; o
   * toque no celular é o acréscimo. Descoberto num ensaio, com um argumento a
   * mais na chamada fazendo o canal cair na posição da nota.
   */
  begin
    perform avisar(
      v_quem, 'proposta', 'Pediram uma coisa para você',
      new.texto || ' · #' || v_canal.nome,
      'proposta:' || new.id::text || ':' || v_quem::text,
      false, null, null, null, new.canal_id);
  exception when others then
    raise warning 'aviso de proposta falhou: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists ao_propor_tarefa on public.sugestoes;
create trigger ao_propor_tarefa after insert on public.sugestoes
  for each row execute function public.aviso_de_proposta();

revoke all on function public.aviso_de_proposta() from public, anon, authenticated;

-- ==========================================================================
-- 65. O secretário lê sozinho
--
--     No espaço pessoal não existe canal, e o pulso só lê canal. Então a
--     conversa solta do caderno (`notas.conversa`, uma por pessoa) só era lida
--     quando alguém apertava "Organizar". Quem trabalha sozinho é exatamente
--     quem menos tem alguém para apertar botão, e o que ela escreveu no sábado
--     esperava ela lembrar de voltar lá.
--
--     A marca é a mesma do canal, pelo mesmo motivo: sem ela, cada varredura
--     relê a conversa inteira e propõe de novo o que já foi proposto, e a conta
--     do modelo cresce com o tamanho do caderno em vez de com o que foi escrito
--     desde ontem.
--
--     Só a conversa solta, e não toda nota. Nota é assunto que a pessoa escolheu
--     abrir, e ler todas sem ninguém pedir seria o app opinando sobre o que ela
--     ainda está pensando. A conversa é o contrário: ela existe para ser lida.
-- ==========================================================================

alter table public.notas add column if not exists lido_pela_ia_em timestamptz;

create index if not exists notas_conversa_idx on public.notas (org_id)
  where conversa;

-- ==========================================================================
-- 66. O recado de voz do secretário
--
--     `posso_ver_anexo` conferia o áudio por `ve_canal(m.canal_id)`, e o recado
--     ditado no secretário não tem canal: ele pertence a uma NOTA. Sem esta
--     linha, o arquivo subia, a mensagem gravava, e tocar devolvia recusa do
--     Storage: o áudio existiria e ninguém o ouviria, nem quem o gravou.
--
--     Quem vê é `minha_nota`, e não `ve_nota`: a conversa de dentro de uma nota
--     é do dono e de mais ninguém, mesmo quando a nota é compartilhada. Quem
--     compartilha está mostrando o que escreveu, não o que disse ao secretário
--     enquanto pensava, e a segunda é a mais íntima das duas.
-- ==========================================================================

create or replace function public.posso_ver_anexo(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from anexos a where a.caminho = p_caminho and ve_anexo(a.id)
  )
  -- Recado de voz num canal: abre quando o canal abre.
  or exists (
    select 1 from mensagens m
    where m.audio_caminho = p_caminho and minha(m.org_id)
      and m.canal_id is not null and ve_canal(m.canal_id)
  )
  -- Recado de voz numa nota: só a dona, sem exceção nem para administrador.
  or exists (
    select 1 from mensagens m
    where m.audio_caminho = p_caminho and minha(m.org_id)
      and m.nota_id is not null and minha_nota(m.nota_id)
  );
$$;

-- ==========================================================================

alter table public.fluxos add column if not exists implicita boolean not null default false;

create index if not exists fluxos_implicita_idx on public.fluxos (org_id) where implicita;

/**
 * A track daquele canal, abrindo-a se ainda não existir.
 *
 * `security definer` porque ela cria um fluxo e uma etapa, e quem chama é uma
 * pessoa comum aceitando uma proposta: exigir que ela possa criar track à mão
 * seria exigir permissão para uma coisa que ela não pediu e não vai ver.
 *
 * A visibilidade sai do canal, e isso não é detalhe: canal fechado não pode
 * ganhar uma track que a empresa inteira lê, senão o que foi dito a portas
 * fechadas vira tarefa visível por tabela.
 */
create or replace function public.track_do_canal(p_canal uuid, p_como uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c canais%rowtype; v_eu uuid := quem_age(p_como); f uuid; e uuid;
begin
  select * into c from canais where id = p_canal;
  if c.id is null then raise exception 'Canal não encontrado.'; end if;
  if c.fluxo_id is not null then return c.fluxo_id; end if;

  f := gen_random_uuid();
  e := gen_random_uuid();
  insert into fluxos (id, org_id, nome, tipo, visib, dono_id, autor_id, atual, area_id,
                      empresa_id, implicita)
  values (f, c.org_id, c.nome, 'esteira',
          case when c.tipo = 'aberto' then 'equipe' else 'escolhidas' end,
          v_eu, v_eu, 0, c.area_id, c.empresa_id, true);

  -- Um checkpoint só, e sem nome de processo: dar nome agora seria inventar a
  -- primeira etapa de um processo que ninguém desenhou. "Em andamento" diz o
  -- que é verdade e não finge saber mais do que se sabe.
  insert into etapas (id, fluxo_id, nome, criterio, ordem)
  values (e, f, 'Em andamento', '', 0);

  -- Em canal fechado, quem já está lá é quem enxerga.
  if c.tipo <> 'aberto' then
    insert into fluxo_pessoas (fluxo_id, perfil_id, org_id)
    select f, m.perfil_id, c.org_id from canal_membros m where m.canal_id = p_canal
    on conflict do nothing;
  end if;

  update canais set fluxo_id = f where id = p_canal;
  return f;
end $$;

revoke all on function public.track_do_canal(uuid, uuid) from public, anon;
grant execute on function public.track_do_canal(uuid, uuid) to authenticated, service_role;


-- ==========================================================================
-- 67. O convite em dois toques, e o link que já traz o código
--
--     Pôr uma pessoa dentro custava dez campos e um copia-e-cola: seis de quem
--     convidava (e-mail, nome, papel, área, gestor, "vê a área inteira") e
--     quatro de quem entrava (nome, código, e-mail, senha). Quatro daqueles seis
--     já eram editáveis na tabela ao lado, com um clique, depois de a pessoa
--     existir, e nenhum deles impedia nada de dar errado.
--
--     O convite passa a carregar uma coisa: quem entra e como. O e-mail deixa
--     de ser obrigatório, porque a porta sempre foi o código; entra o telefone,
--     que é como se chama alguém de verdade neste país, e que não é credencial
--     nenhuma: ele diz para onde o convite vai.
-- --------------------------------------------------------------------------

alter table public.convites alter column email drop not null;
alter table public.convites add column if not exists fone text;

-- O índice velho não distinguia "sem e-mail" de "e-mail repetido". Convite por
-- telefone nasce com o e-mail vazio, e dois deles batiam num índice que fala de
-- endereço: a recusa citava um e-mail que quem convidou nunca digitou.
drop index if exists convites_email_aberto;
create unique index if not exists convites_email_aberto
  on public.convites (lower(email))
  where usado_em is null and email is not null and btrim(email) <> '';

create unique index if not exists convites_fone_aberto
  on public.convites (fone)
  where usado_em is null and fone is not null and btrim(fone) <> '';

-- Um convite precisa dizer quem entra, de alguma forma. Sem nenhuma das duas, o
-- que sobra é um código solto que funciona para quem o receber primeiro, e
-- "quem o receber primeiro" não é uma pessoa.
--
-- Num banco que já rodou pode haver convite com e-mail vazio e sem telefone, e
-- a restrição derrubaria o arquivo inteiro no meio por causa de uma linha que
-- ninguém vai usar. Os abertos sem como chegar a ninguém saem; os já usados
-- ficam, porque são registro.
delete from public.convites
 where usado_em is null
   and coalesce(btrim(email), '') = '' and coalesce(btrim(fone), '') = '';
update public.convites set email = 'desconhecido@convite.invalido'
 where usado_em is not null
   and coalesce(btrim(email), '') = '' and coalesce(btrim(fone), '') = '';

alter table public.convites drop constraint if exists convites_tem_quem;
alter table public.convites add constraint convites_tem_quem check (
  coalesce(btrim(email), '') <> '' or coalesce(btrim(fone), '') <> ''
);

-- `revoke` de `public` tira o acesso de `authenticated` junto, porque é de
-- PUBLIC que ele herda o execute. Sem o grant de volta, o convite ficava
-- impossível de aceitar com um "permission denied" que não diz o que fazer, e
-- o caminho que isto conserta é justamente o que nunca tinha sido exercido.
revoke all on function public.entrar_com_convite(text) from public, anon;
grant execute on function public.entrar_com_convite(text) to authenticated, service_role;


-- ==========================================================================
-- 68. A agenda é da pessoa, e o dia dela atravessa os espaços
--
--     Quem tem quatro empresas tinha quatro agendas e quatro filas de tarefa, e
--     para saber o que fazer de manhã entrava em quatro lugares. Ninguém faz
--     isso: abre um, esquece os outros, e a ferramenta deixa de responder a
--     pergunta que ela existe para responder.
--
--     **Agenda é propriedade de um corpo, não de uma empresa.** O compromisso
--     marcado no espaço pessoal tem que travar a agenda na Simonetto, e o
--     marcado na Simonetto tem que travar no pessoal, porque a pessoa é uma só
--     e não pode estar em dois lugares. O mesmo vale para a fila: o dia dela é
--     um dia, e ele não se divide pelo número de contratos que ela tem.
--
--     **O que atravessa é a OCUPAÇÃO, nunca o título.** Um colega da Simonetto
--     precisa saber que você está ocupado na terça às 15h para não marcar por
--     cima; ele não pode ler "Reunião com o comprador da Silvereng". A peça que
--     faz isso já existia e se chama `ocupacao()`: ela devolve intervalo e mais
--     nada. O que muda aqui é de quem ela fala.
--
--     E AQUI ESTAVA UM FURO, encontrado medindo e não lendo. `ocupacao()` é
--     `security definer` e **não tinha filtro de organização nenhum**: ela
--     devolvia TODO compromisso que bloqueia do banco inteiro, de qualquer
--     cliente, para qualquer pessoa logada. Pela tabela a parede funcionava
--     (zero linhas); pela função, uma empresa recebia a agenda de outra, com
--     id, perfil, dia e hora. Sem título, mas é dado de cliente atravessando a
--     parede que o app promete, e é exatamente a família de erro da seção 52:
--     definer aberta ao lado da política que ela contorna.
--
--     A diferença entre o furo e o que se quer é inteira, e é esta:
--
--       - **de propósito**: a ocupação de quem divide um espaço comigo, vinda
--         de todos os espaços DAQUELA pessoa.
--       - **furo**: a ocupação de quem não tem nada a ver comigo.
--
--     Então a pergunta certa passa a ser "esta pessoa divide alguma casa
--     comigo?", e não "existe este compromisso?".
-- --------------------------------------------------------------------------

/**
 * Os espaços de quem está perguntando.
 *
 * Um login tem um perfil por espaço (seção 20), e é esta lista que transforma
 * "o que eu enxergo" em "o que eu enxergo em qualquer lugar meu". Ela responde
 * sempre por `auth.uid()` e nunca aceita o id de outra pessoa: uma função que
 * respondesse "quais são as casas do fulano" seria a porta dos fundos das
 * regras de visibilidade com outro nome, como diz a seção 51.
 */
create or replace function public.minhas_casas()
returns table (org_id uuid)
language sql stable security definer set search_path = public as $$
  select p.org_id from perfis p where p.user_id = auth.uid() and p.ativo;
$$;

revoke all on function public.minhas_casas() from public, anon;
grant execute on function public.minhas_casas() to authenticated, service_role;

/**
 * Meus perfis, em todos os meus espaços.
 *
 * `perfis_sel` já devolve isto pela tabela, de propósito, porque é o que
 * alimenta o seletor de espaço. Aqui ela existe como função para as de baixo
 * poderem usá-la sem passar pela política, que filtra pelo espaço em uso.
 */
create or replace function public.meus_perfis()
returns table (perfil_id uuid, org_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id, p.org_id from perfis p where p.user_id = auth.uid() and p.ativo;
$$;

revoke all on function public.meus_perfis() from public, anon;
grant execute on function public.meus_perfis() to authenticated, service_role;

/**
 * A ocupação de quem divide um espaço comigo, vinda de todos os espaços dela.
 *
 * Três coisas que o corpo da função decide, e nenhuma é detalhe:
 *
 * 1. **Quem eu posso perguntar**: só quem tem perfil numa casa minha. É o que
 *    fecha o furo, e é a única trava que importa aqui.
 * 2. **De onde vem a ocupação**: de TODOS os perfis daquela pessoa, em
 *    qualquer espaço. É isto que faz o compromisso do pessoal travar a agenda
 *    na empresa, que é o pedido.
 * 3. **Com qual id ela volta**: o do perfil DELA NA MINHA CASA, e não o do
 *    espaço de onde o compromisso veio. O segundo seria um id que a tela não
 *    resolve, porque `perfis` só devolve a minha casa: a ocupação apareceria
 *    sem dono, de ninguém.
 *
 * Uma pessoa que divide DOIS espaços comigo aparece duas vezes, uma por perfil,
 * e isso é certo: cada tela conhece a pessoa pelo perfil de lá.
 *
 * **Continua sem título, sem local e sem observação**, como sempre foi. O que
 * se revela a mais que antes é que a pessoa tem compromisso em outro lugar, e
 * é o preço de saber que ela está ocupada: uma agenda que esconde a ocupação
 * não serve para marcar nada, que é para o que ela existe.
 */
create or replace function public.ocupacao()
returns table (id uuid, perfil_id uuid, quando date, inicio time, fim time)
language sql stable security definer set search_path = public as $$
  with colegas as (
    -- A pessoa, e o perfil dela na minha casa. Sem `distinct` no login: dois
    -- espaços comigo são duas linhas, e cada tela usa a sua.
    select p.user_id, p.id as perfil_aqui
    from perfis p
    where p.org_id in (select org_id from minhas_casas()) and p.user_id is not null
  ),
  deles as (
    -- Todo perfil daquelas pessoas, em qualquer espaço: é por aqui que a
    -- ocupação atravessa.
    select p.id as perfil_la, c.user_id, c.perfil_aqui
    from perfis p join colegas c on c.user_id = p.user_id
  )
  select cp.id, d.perfil_aqui, cp.quando, cp.inicio, cp.fim
  from compromissos cp
  cross join lateral (
    select cp.dono_id as perfil_id
    union
    select cv.perfil_id from convidados cv where cv.compromisso_id = cp.id
  ) e
  join deles d on d.perfil_la = e.perfil_id
  where cp.bloqueia and e.perfil_id is not null and ativo();
$$;

revoke all on function public.ocupacao() from public, anon;
grant execute on function public.ocupacao() to authenticated, service_role;

/**
 * A minha agenda inteira, de todos os meus espaços, com o conteúdo.
 *
 * Aqui o título vai junto, e pode: são todos meus. A tabela já devolve os do
 * espaço em uso; esta devolve também os dos outros, para o dia aparecer
 * inteiro sem a pessoa ter que trocar de lugar quatro vezes para montá-lo.
 *
 * `auth.uid()` e mais nada: ela não aceita parâmetro, então não há como
 * perguntar pela agenda de outra pessoa. Quem quiser saber se alguém está
 * livre pergunta a `ocupacao()`, que responde em intervalo.
 */
create or replace function public.minha_agenda()
returns table (
  id uuid, org_id uuid, espaco text, titulo text, quando date,
  inicio time, fim time, local text, nota text, dono_id uuid,
  bloqueia boolean, visivel boolean, fluxo_id uuid, criado_em timestamptz
)
language sql stable security definer set search_path = public as $$
  select distinct on (cp.id)
    cp.id, cp.org_id, o.nome, cp.titulo, cp.quando, cp.inicio, cp.fim,
    cp.local, cp.nota, cp.dono_id, cp.bloqueia, cp.visivel, cp.fluxo_id, cp.criado_em
  from compromissos cp
  join organizacoes o on o.id = cp.org_id
  where ativo() and (
    cp.dono_id in (select perfil_id from meus_perfis())
    or exists (
      select 1 from convidados cv
      where cv.compromisso_id = cp.id
        and cv.perfil_id in (select perfil_id from meus_perfis())
    )
  );
$$;

revoke all on function public.minha_agenda() from public, anon;
grant execute on function public.minha_agenda() to authenticated, service_role;

/**
 * O meu dia: o que depende de mim, em todos os meus espaços.
 *
 * "Acordei e preciso ver tudo que tenho para fazer" não tem resposta quando a
 * fila se divide pelo número de contratos que a pessoa tem. Isto NÃO é uma
 * empresa alcançando a outra: é a mesma pessoa vendo o trabalho dela, que
 * nenhuma parede existiu para esconder dela mesma.
 *
 * A DEFINIÇÃO MORA NA SEÇÃO 69, e não aqui. Ela nasceu nesta seção trazendo só
 * o que eu executo, e ganhou os outros três tipos depois. Deixar as duas no
 * arquivo faria a segunda passada tentar trocar o tipo de retorno de uma função
 * que já existe, e o Postgres responde "cannot change return type of existing
 * function" e derruba o arquivo no meio. Uma definição por função, sempre.
 */

-- 69. Concluir de onde se olha, e a carga que é de uma pessoa só
--
--     A lente do dia LEVAVA até a tarefa e não deixava concluí-la, porque
--     concluir escreve num espaço que não é o da sessão. Na prática isso quer
--     dizer: abrir a lista do dia no fim da tarde, ver dez coisas feitas, e ter
--     que trocar de espaço dez vezes para marcar dez caixas, voltando ao
--     pessoal entre cada uma. Ninguém faz isso, e uma lista que não deixa
--     fechar o que foi feito vira uma lista que cresce para sempre.
--
--     **E o rastro tem que continuar inteiro.** Concluir pela lista do dia
--     precisa escrever na atividade da track e avisar o canal, exatamente como
--     concluir lá dentro: o combinado some quando fica guardado num canto que a
--     outra pessoa não abre, e isso vale igual venha o clique de onde vier.
--
--     Por isso a conclusão inteira desce para o banco, e o app passa a chamá-la
--     SEMPRE, e não só quando a tarefa é de outro espaço. Duas implementações
--     da mesma regra é a garantia de que um dia a de cá avisa o canal e a de lá
--     esquece, e ninguém percebe. A regra mora uma vez, aqui.
--
--     **O carimbo precisava de uma porta.** `carimbar_org` resolvia
--     `minha_org()` ANTES de `org_de_quem_age()`, então com sessão aberta a
--     linha nascia sempre com a organização do espaço em uso. Escrevendo num
--     espaço que não é o da sessão, a mensagem nasceria carimbada com a casa
--     errada e **ninguém a enxergaria, nem quem a escreveu**, que é o defeito
--     da seção 44 por outro caminho. A ordem inverte: quem DIZ de quem é a casa
--     manda sobre o padrão da sessão. É seguro porque `trackward.org` só é
--     escrito por quem tem o direito de escrevê-lo, e `agir_como` recusa perfil
--     que não seja seu.
-- --------------------------------------------------------------------------

/**
 * Quem diz de quem é a casa manda sobre o padrão da sessão.
 *
 * Antes era o contrário, e funcionava porque `trackward.org` só era escrito
 * sem sessão. Com `agir_como` ele passa a ser escrito com sessão também, e aí
 * a ordem importa: sem a troca, a linha escrita noutro espaço nasce com a
 * organização do espaço em uso e some da vista de todo mundo.
 */
create or replace function public.carimbar_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.org_id := coalesce(org_de_quem_age(), minha_org(), new.org_id);
  return new;
end $$;

create or replace function public.carimbar_autor()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_eu uuid := coalesce(perfil_de_quem_age(), meu_perfil());
begin
  if v_eu is null then return new; end if;
  if tg_table_name = 'itens'  then new.autor_id   := v_eu; end if;
  if tg_table_name = 'canais' then new.criado_por := v_eu; end if;
  if tg_table_name = 'notas'  then new.dono_id    := v_eu; end if;
  new.org_id := coalesce(org_de_quem_age(), new.org_id, minha_org());
  return new;
end $$;

/**
 * Agir dentro de OUTRO espaço meu, por uma transação.
 *
 * Só aceita perfil que seja meu e esteja ativo. Não é um "virar outra pessoa":
 * é dizer qual dos MEUS perfis está escrevendo, que é o que o carimbo precisa
 * saber para a linha nascer na casa certa. Vale até o fim da transação, como o
 * `quem_age` da seção 44, e pelo mesmo motivo: o conserto não é acrescentar
 * `org_id` a trinta inserts espalhados, porque seria esquecer um.
 */
create or replace function public.agir_como(p_perfil uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from perfis
   where id = p_perfil and ativo and user_id = auth.uid();
  if v_org is null then raise exception 'Esse perfil não é seu.'; end if;
  perform set_config('trackward.org', v_org::text, true);
  perform set_config('trackward.perfil', p_perfil::text, true);
  return p_perfil;
end $$;

revoke all on function public.agir_como(uuid) from public, anon;
grant execute on function public.agir_como(uuid) to authenticated, service_role;

/**
 * Concluir (ou desfazer) uma tarefa minha, esteja ela no espaço que estiver.
 *
 * Faz as três coisas que a conclusão sempre fez, e é por isso que ela desce
 * para cá inteira em vez de o app fazer duas delas e o banco a terceira:
 *
 *   1. vira a tarefa
 *   2. escreve na ATIVIDADE da track, que é o histórico dela
 *   3. conta no CANAL, que é onde as pessoas estão
 *
 * O terceiro é o que importa e é o que se perderia: a atividade ninguém abre.
 *
 * `p_rastro` existe para um caso só, o mesmo `semRastro` de antes: o aceite de
 * uma proposta de "ficou pronto" já escreve a notícia no canal de origem, e
 * sem isto a mesma conclusão apareceria duas vezes na conversa.
 *
 * **Tarefa privada não conta nada em lugar nenhum**, como sempre: ela é
 * lembrete, e lembrete dos outros não é assunto da casa.
 */
create or replace function public.concluir_meu_item(
  p_item uuid, p_feito boolean,
  p_rastro boolean default true, p_por_ia boolean default false
) returns void language plpgsql volatile security definer set search_path = public as $$
declare
  it      itens%rowtype;
  v_eu    uuid;
  v_canal uuid;
begin
  select * into it from itens where id = p_item;
  if it.id is null then raise exception 'Tarefa não encontrada.'; end if;

  -- Só a minha, e em qualquer espaço meu. Quem não é responsável continua
  -- mexendo pela tela daquele espaço, onde as regras de quem pode o quê valem
  -- inteiras: esta função é o atalho de quem vai FAZER, não um segundo caminho
  -- para mexer no trabalho dos outros.
  select p.id into v_eu from perfis p
   where p.id = it.resp_id and p.user_id = auth.uid() and p.ativo;
  if v_eu is null then raise exception 'Essa tarefa não é sua.'; end if;

  perform agir_como(v_eu);
  update itens set feito = p_feito where id = p_item;

  if not p_feito or it.priv then return; end if;

  insert into atividades (fluxo_id, quem_id, texto, por_ia, org_id)
  values (it.fluxo_id, case when p_por_ia then null else v_eu end,
          'concluiu ' || it.texto, p_por_ia, (select org_id from fluxos where id = it.fluxo_id));

  if p_rastro then
    select c.id into v_canal from canais c where c.fluxo_id = it.fluxo_id limit 1;
    if v_canal is not null then
      insert into mensagens (id, canal_id, nota_id, autor_id, texto, sistema, por_ia)
      values (gen_random_uuid(), v_canal, null,
              case when p_por_ia then null else v_eu end,
              'concluiu: ' || it.texto, true, p_por_ia);
    end if;
  end if;
end $$;

revoke all on function public.concluir_meu_item(uuid, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.concluir_meu_item(uuid, boolean, boolean, boolean)
  to authenticated, service_role;

-- `create or replace` NÃO troca o tipo de retorno de uma função, e esta ganhou
-- colunas: numa segunda passada o Postgres responde "cannot change return type
-- of existing function" e derruba o arquivo no meio. É o mesmo cuidado que a
-- seção de assinaturas pede, e vale para o retorno também.
drop function if exists public.meu_dia();

/**
 * O meu dia, agora com as QUATRO coisas que dependem de mim.
 *
 * A primeira versão trazia só o que eu executo, e com ela os filtros de
 * Tarefas (executar, aprovar, aguardando, pedi) deixavam de valer assim que a
 * lista virava a do dia inteiro: a pessoa trocava de lente e perdia os
 * filtros, que é perder a tela.
 *
 * `travado` vem junto porque "aguardando" não é um tipo, é uma condição: a
 * tarefa é minha e está presa numa que não ficou pronta. Calcular isso na tela
 * exigiria carregar as dependências de todos os espaços, e elas não atravessam.
 */
create or replace function public.meu_dia()
returns table (
  item_id uuid, tipo text, texto text, prazo date, org_id uuid, espaco text,
  espaco_tipo text, fluxo_id uuid, track text, implicita boolean,
  etapa_id uuid, checkpoint text, priv boolean, travado boolean, resp_id uuid
)
language sql stable security definer set search_path = public as $$
  -- 1. O que eu executo.
  select
    i.id, 'item', i.texto, i.prazo, f.org_id, o.nome, o.tipo,
    f.id, f.nome, f.implicita, e.id, e.nome, i.priv,
    exists (
      select 1 from dependencias d join itens x on x.id = d.depende_de
       where d.item_id = i.id and not x.feito
    ),
    i.resp_id
  from itens i
  join etapas e on e.id = i.etapa_id
  join fluxos f on f.id = i.fluxo_id
  join organizacoes o on o.id = f.org_id
  where ativo() and not i.feito and f.desfecho is null and f.travado_motivo is null
    and e.ordem = f.atual
    and i.resp_id in (select perfil_id from meus_perfis())

  union all

  -- 2. O que eu aprovo, e só quando não falta mais nada para aprovar.
  select
    e.id, 'aprov', e.nome, e.prazo, f.org_id, o.nome, o.tipo,
    f.id, f.nome, f.implicita, e.id, e.nome, false, false, e.aprovador_id
  from etapas e
  join fluxos f on f.id = e.fluxo_id
  join organizacoes o on o.id = f.org_id
  where ativo() and f.desfecho is null and f.travado_motivo is null
    and e.ordem = f.atual
    and e.aprovador_id in (select perfil_id from meus_perfis())
    and not exists (select 1 from itens x where x.etapa_id = e.id and not x.feito)

  union all

  -- 3. O que eu pedi a outra pessoa, e SÓ EM CANAL SEM TRACK: o que mora numa
  --    track de verdade já aparece na trilha dela, e contá-lo aqui seria
  --    contá-lo duas vezes. Mesma regra de `oQuePedi` em lib/regras.ts.
  select
    i.id, 'pedi', i.texto, i.prazo, f.org_id, o.nome, o.tipo,
    f.id, f.nome, f.implicita, e.id, e.nome, i.priv, false, i.resp_id
  from itens i
  join etapas e on e.id = i.etapa_id
  join fluxos f on f.id = i.fluxo_id
  join organizacoes o on o.id = f.org_id
  where ativo() and not i.feito and f.desfecho is null and f.travado_motivo is null
    and e.ordem = f.atual and f.implicita
    and i.autor_id in (select perfil_id from meus_perfis())
    and i.resp_id is not null
    and i.resp_id not in (select perfil_id from meus_perfis());
$$;

revoke all on function public.meu_dia() from public, anon;
grant execute on function public.meu_dia() to authenticated, service_role;

/**
 * Quantas eu entreguei nos últimos dias, em todos os meus espaços.
 *
 * É a outra metade da carga da pessoa: `meu_dia()` diz a demanda, esta diz a
 * capacidade demonstrada. Sem ela, "vinte tarefas" não quer dizer nada, porque
 * quem entrega vinte por semana não está sobrecarregado e quem entrega uma por
 * mês está, e a diferença entre os dois é tudo.
 *
 * Devolve um NÚMERO, e não as tarefas: para a conta basta quantas, e uma lista
 * do que foi feito em outra empresa é conteúdo atravessando sem precisar.
 */
create or replace function public.minhas_entregas(p_dias int default 30)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from itens i
  where ativo()
    and i.feito
    and i.feito_em >= now() - make_interval(days => greatest(1, least(365, p_dias)))
    and i.resp_id in (select perfil_id from meus_perfis());
$$;

revoke all on function public.minhas_entregas(int) from public, anon;
grant execute on function public.minhas_entregas(int) to authenticated, service_role;


-- ==========================================================================
-- 70. O espaço pessoal é a porta de entrada, e todo login tem um
--
--     O cadastro criava UM espaço: o pessoal, ou a empresa, nunca os dois. E o
--     convite criava nenhum dos dois, só o perfil dentro da empresa que
--     convidou. Resultado: quem entrou por convite, que é quase todo mundo numa
--     empresa, **não tinha espaço pessoal nenhum**.
--
--     Isso derruba a promessa inteira. A agenda é da pessoa, o dia é da pessoa,
--     e a carga é da pessoa; se ela não tem um lugar que seja dela, o "dela"
--     não existe, e o que sobra é o trabalho de uma empresa com cara de pessoal.
--     Pior: era exatamente a quem mais importa, porque é quem não escolheu nada
--     e simplesmente aceitou um convite.
--
--     Agora o pessoal nasce SEMPRE, nos três caminhos, e o que varia é só onde
--     a sessão pousa:
--
--       convite   → pessoal + perfil na empresa, e a sessão abre NA EMPRESA
--       equipe    → pessoal + empresa nova, e a sessão abre NA EMPRESA
--       pessoal   → pessoal, e a sessão abre nele
--
--     A empresa ganha a sessão nos dois primeiros porque é para lá que a pessoa
--     foi chamada: abrir no pessoal vazio quem acabou de aceitar um convite é
--     mostrar um app sem nada dentro no exato momento em que ela veio ver o
--     trabalho de alguém.
--
--     **O nome do espaço pessoal é o nome da pessoa**, e não se pergunta, como
--     já valia: quem disse "só para mim" já respondeu de quem é, e quem entrou
--     por convite não precisa responder nada.
--
--     As quatro recusas da seção 20 continuam de pé e ficam mais importantes:
--     um pessoal por login, convite não aponta para pessoal, convite não é
--     aceito lá, e canal não entra.
-- --------------------------------------------------------------------------

/**
 * Abre o espaço pessoal de um login, se ele ainda não tiver um.
 *
 * Separada de `novo_usuario` porque ela é chamada de DOIS lugares: do cadastro,
 * para quem está nascendo, e da passada de migração, para quem já existe. Duas
 * cópias da mesma criação é a garantia de que um dia a de cá ganha uma coluna e
 * a de lá não, e aí metade dos espaços pessoais nasce diferente da outra.
 */
create or replace function public.abrir_pessoal(p_user uuid, p_nome text, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_perfil uuid;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6E8F','#B5A08C'];
begin
  if p_user is null then return null; end if;

  -- Um pessoal por login. A recusa de verdade é o gatilho da seção 20; isto
  -- aqui é só não tentar, para a migração poder rodar quantas vezes quiser.
  select p.org_id into v_org
    from perfis p join organizacoes o on o.id = p.org_id
   where p.user_id = p_user and o.tipo = 'pessoal' limit 1;
  if v_org is not null then return v_org; end if;

  insert into organizacoes (nome, tipo)
  values (coalesce(nullif(btrim(p_nome), ''), initcap(split_part(coalesce(p_email,''), '@', 1)), 'Pessoal'),
          'pessoal')
  returning id into v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, ve_area, ativo)
  values (p_user, v_org,
          coalesce(nullif(btrim(p_nome), ''), split_part(coalesce(p_email,''), '@', 1)),
          coalesce(p_email, ''),
          paleta[(floor(random() * 8))::int + 1], 'admin', true, true)
  returning id into v_perfil;

  update organizacoes set dono_id = v_perfil where id = v_org;
  return v_org;
end $$;

revoke all on function public.abrir_pessoal(uuid, text, text) from public, anon, authenticated;
grant execute on function public.abrir_pessoal(uuid, text, text) to service_role;

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
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6E8F','#B5A08C'];
begin
  -- 0. O espaço pessoal, SEMPRE, e antes de tudo: ele é a porta de entrada, e
  --    a agenda, o dia e a carga da pessoa precisam de um lugar que seja dela.
  --    Quem entrou por convite é quem mais precisa, porque não escolheu nada.
  v_org := abrir_pessoal(new.id, v_eu, new.email);

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
    --    nunca aponta para espaço pessoal (gatilho convites_so_equipe).
    v_org := cv.org_id;
    v_papel := coalesce(cv.papel, 'colaborador');
    v_area := cv.area_id;
    v_gestor := cv.gestor_id;
    v_ve_area := coalesce(cv.ve_area, false);
    v_ativo := true;
  elsif v_espaco <> 'pessoal' then
    -- 2. Empresa nova, e quem abre é a administradora dela. Quem pediu "só
    --    para mim" fica com o pessoal que já nasceu no passo 0.
    insert into organizacoes (nome, tipo)
    values (coalesce(v_nome, initcap(split_part(new.email, '@', 1))), 'equipe')
    returning id into v_org;
    v_papel := 'admin';
    v_ativo := true;
    v_dono := true;
    v_ve_area := true;
  else
    -- 3. Só o pessoal, e ele já existe. A sessão pousa nele.
    select id into v_perfil from perfis where user_id = new.id and org_id = v_org;
    if v_perfil is not null then
      insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
      on conflict (user_id) do update set perfil_id = excluded.perfil_id;
    end if;
    return new;
  end if;

  select count(*) into n from perfis where org_id = v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id, v_org,
    coalesce(v_eu, nullif(btrim(cv.nome), ''), split_part(new.email, '@', 1)),
    new.email,
    paleta[(n % 8) + 1],
    v_papel, v_area, v_gestor, v_ve_area, v_ativo
  )
  on conflict (user_id, org_id) do nothing
  returning id into v_perfil;

  if v_dono and v_perfil is not null then
    update organizacoes set dono_id = v_perfil where id = v_org;
  end if;
  -- A sessão abre NA EMPRESA: abrir o pessoal vazio para quem acabou de aceitar
  -- um convite é mostrar um app sem nada dentro no momento em que ela veio ver
  -- o trabalho de alguém.
  if v_perfil is not null then
    insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
    on conflict (user_id) do update set perfil_id = excluded.perfil_id;
  end if;
  if cv.id is not null then
    update convites set usado_em = now(), usado_por = v_perfil where id = cv.id;
  end if;
  return new;
end $$;

/**
 * E quem já existe ganha o dele.
 *
 * Sem esta passada, a agenda e o dia consolidados só valeriam para quem se
 * cadastrar de amanhã em diante, e quem já usa o app continuaria sem um lugar
 * que seja dele, que é justamente quem pediu isso.
 *
 * `abrir_pessoal` devolve o que já existe em vez de criar outro, então rodar
 * isto duas vezes não faz nada na segunda.
 */
do $$
declare u record;
begin
  for u in
    select distinct on (p.user_id) p.user_id, p.nome, p.email
      from perfis p
     where p.user_id is not null
       and not exists (
         select 1 from perfis p2 join organizacoes o2 on o2.id = p2.org_id
          where p2.user_id = p.user_id and o2.tipo = 'pessoal'
       )
     order by p.user_id, p.criado_em
  loop
    perform abrir_pessoal(u.user_id, u.nome, u.email);
  end loop;
end $$;

-- ==========================================================================
-- 71. O @ da pessoa, que é o primeiro endereço que o app tem de verdade
--
--     Para alguém ser chamado, ele precisa de um endereço. Hoje o convite vai
--     para um telefone ou um e-mail, e os dois são de outra pessoa: o telefone
--     é da operadora, o e-mail é do Google. O @ é do TrackWard, e é o que
--     torna possível um dia escrever para alguém sem saber o e-mail dele.
--
--     **Ele é do LOGIN, e não do perfil.** A mesma pessoa tem um perfil por
--     espaço, e quatro empresas não lhe dão quatro nomes: o @ é dela, e
--     atravessa junto com a agenda e com o dia. Por isso tabela própria, com o
--     `user_id` como chave, e não uma coluna em `perfis`.
--
--     **E ele se pede no cadastro, não depois.** Nome bom acaba: quem chegar em
--     seis meses não acha o que quer, e quem se cadastrou antes de o campo
--     existir fica sem nenhum e precisa ser perguntado numa segunda conversa,
--     que é a mesma que `PedeNome` existe para ter e que ninguém quer ter duas
--     vezes. Quem já existe ganha o seu nesta passada, derivado do nome.
-- --------------------------------------------------------------------------

create table if not exists public.apelidos (
  user_id   uuid primary key references auth.users on delete cascade,
  apelido   text not null unique,
  criado_em timestamptz not null default now()
);

/**
 * O que o app não deixa ninguém tomar, e as duas famílias doem diferente.
 *
 * Em TABELA e não numa lista dentro da função, porque ela cresce: cada rota
 * nova do app é um nome a mais aqui, e acrescentar vira um insert em vez de
 * uma edição de função. `lib/apelido.ts` tem uma cópia para responder enquanto
 * a pessoa digita, mas **a autoridade é esta**: as duas podem divergir, e a
 * direção segura é o banco recusar o que a tela deixou passar, nunca o
 * contrário.
 */
create table if not exists public.apelidos_reservados (
  apelido text primary key,
  porque  text not null default ''
);

insert into public.apelidos_reservados (apelido, porque) values
  -- 1. os endereços do app. Um `@entrar` tornaria impossível abrir
  --    trackward.app/@fulano sem escolher entre a pessoa e a rota.
  ('api','rota'), ('auth','rota'), ('entrar','rota'), ('sair','rota'),
  ('convite','rota'), ('feedback','rota'), ('avisos','rota'), ('agenda','rota'),
  ('chat','rota'), ('notas','rota'), ('tracks','rota'), ('track','rota'),
  ('fluxo','rota'), ('minhas','rota'), ('tarefas','rota'), ('equipe','rota'),
  ('ajustes','rota'), ('processos','rota'), ('relatorios','rota'),
  ('desempenho','rota'), ('agentes','rota'), ('conectores','rota'),
  ('secretario','rota'), ('design-system','rota'), ('nova-senha','rota'),
  ('projetos','rota'), ('areas','rota'), ('area','rota'), ('app','rota'),
  ('www','rota'), ('admin','rota'), ('root','rota'), ('static','rota'),
  ('public','rota'), ('assets','rota'), ('novo','rota'), ('me','rota'),
  -- 2. o que se faria passar pela casa. `@suporte` escrevendo para um cliente
  --    é golpe com o nome certo no remetente.
  ('trackward','casa'), ('suporte','casa'), ('ajuda','casa'), ('contato','casa'),
  ('seguranca','casa'), ('oficial','casa'), ('cobranca','casa'),
  ('financeiro','casa'), ('noreply','casa'), ('sistema','casa'),
  ('bot','casa'), ('ia','casa')
on conflict (apelido) do nothing;

alter table public.apelidos            enable row level security;
alter table public.apelidos_reservados enable row level security;

/**
 * Quem lê o @ de quem.
 *
 * O seu, sempre, e o de quem divide um espaço com você, que é o que deixa a
 * tela escrever "@ana" ao lado do nome dela. O de um estranho não se lê pela
 * tabela: para saber se um @ existe há `apelido_livre`, que responde sim ou
 * não e nada mais.
 */
drop policy if exists apelidos_sel on public.apelidos;
create policy apelidos_sel on public.apelidos for select using (
  user_id = auth.uid()
  or exists (
    select 1 from perfis p
    where p.user_id = apelidos.user_id
      and p.org_id in (select org_id from minhas_casas())
  )
);

-- Ninguém escreve aqui pela tabela: escolher passa por `escolher_apelido`, que
-- é quem confere formato, reservado e repetido. Política de escrita nenhuma.

drop policy if exists reservados_sel on public.apelidos_reservados;
create policy reservados_sel on public.apelidos_reservados for select using (true);

/**
 * O @ está livre? E, se não está, por quê.
 *
 * Aberta para `anon` de propósito: a pergunta é feita no cadastro, antes de
 * existir sessão. Ela revela quais @ estão tomados, e isso é o preço de ter @:
 * todo sistema de apelido revela isso, porque é a única forma de alguém
 * escolher um. O que ela NÃO revela é de quem é.
 */
create or replace function public.apelido_livre(p_apelido text)
returns text language plpgsql stable security definer set search_path = public as $$
declare a text := lower(btrim(regexp_replace(coalesce(p_apelido, ''), '^@+', '')));
begin
  if length(a) < 3  then return 'curto'; end if;
  if length(a) > 20 then return 'longo'; end if;
  if a !~ '^[a-z0-9._]+$'  then return 'formato'; end if;
  if a ~ '^[._]|[._]$'     then return 'ponta'; end if;
  if a ~ '[._]{2}'         then return 'repetido'; end if;
  if exists (select 1 from apelidos_reservados where apelido = a) then return 'reservado'; end if;
  if exists (select 1 from apelidos where apelido = a) then return 'tomado'; end if;
  return null;
end $$;

revoke all on function public.apelido_livre(text) from public;
grant execute on function public.apelido_livre(text) to anon, authenticated, service_role;

/**
 * Tomar um @, ou trocar o seu.
 *
 * Quem decide é esta função e não a política, porque o que ela confere não é
 * "de quem é a linha", é a FORMA do que vai entrar, e isso uma policy não sabe
 * fazer sem repetir o regex em três lugares.
 *
 * Trocar é permitido, e o @ antigo **não fica reservado**: segurar o que
 * alguém largou é o jeito de a lista encher de nome que ninguém usa. Quem
 * trocou e se arrependeu corre o risco de o antigo já ter dono, e isso é o
 * mesmo em qualquer lugar que tenha @.
 */
create or replace function public.escolher_apelido(p_apelido text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  a    text := lower(btrim(regexp_replace(coalesce(p_apelido, ''), '^@+', '')));
  nao  text := apelido_livre(a);
  u    uuid := auth.uid();
begin
  if u is null then raise exception 'Entre na sua conta primeiro.'; end if;
  -- Repetir o que já é seu não é erro: a tela pode mandar o mesmo valor ao
  -- salvar um formulário que a pessoa não mexeu.
  if exists (select 1 from apelidos where user_id = u and apelido = a) then return a; end if;
  if nao is not null then
    raise exception '%', case nao
      when 'curto'     then 'O @ precisa de pelo menos 3 letras.'
      when 'longo'     then 'O @ pode ter no máximo 20 caracteres.'
      when 'formato'   then 'O @ aceita só letras, números, ponto e traço baixo.'
      when 'ponta'     then 'O @ não pode começar nem terminar com ponto ou traço baixo.'
      when 'repetido'  then 'O @ não pode ter dois pontos ou dois traços seguidos.'
      when 'reservado' then 'Esse @ está reservado pelo app. Escolha outro.'
      else 'Esse @ já tem dono. Escolha outro.' end;
  end if;
  insert into apelidos (user_id, apelido) values (u, a)
  on conflict (user_id) do update set apelido = excluded.apelido;
  return a;
end $$;

revoke all on function public.escolher_apelido(text) from public, anon;
grant execute on function public.escolher_apelido(text) to authenticated, service_role;

/**
 * Tirar o acento sem a extensão `unaccent`.
 *
 * O Supabase gerenciado não traz `unaccent` ligada, e pedir ao cliente que
 * ligue uma extensão para o cadastro funcionar é uma peça a mais para dar
 * errado no dia em que alguém criar o projeto. A tabela cobre o português, que
 * é onde o app é vendido.
 */
create or replace function public.unaccent_simples(p text)
returns text language sql immutable set search_path = public as $$
  select translate(coalesce(p, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN');
$$;

/**
 * O @ de quem está nascendo, vindo do cadastro.
 *
 * Separada de `escolher_apelido` porque lá quem manda é `auth.uid()`, e aqui
 * quem escreve é o gatilho de `auth.users`, numa transação em que a sessão
 * ainda não existe. E ela **não falha**: um @ tomado entre o preenchimento do
 * formulário e o clique não pode impedir alguém de se cadastrar. Nesse caso ele
 * ganha um número no fim, como qualquer lugar que tem @ faz.
 */
create or replace function public.dar_apelido(p_user uuid, p_pedido text, p_nome text, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare a text; base text; tentativa text; k int := 0;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from apelidos where user_id = p_user) then
    return (select apelido from apelidos where user_id = p_user);
  end if;

  a := lower(btrim(regexp_replace(coalesce(p_pedido, ''), '^@+', '')));
  if apelido_livre(a) is null then
    insert into apelidos (user_id, apelido) values (p_user, a);
    return a;
  end if;

  -- Sem pedido, ou com um que não serve: vale o nome, sem acento, e o endereço
  -- como última saída. Quem nunca disse nada precisa sair daqui com um @.
  base := lower(unaccent_simples(coalesce(nullif(btrim(p_nome), ''),
                                          split_part(coalesce(p_email, ''), '@', 1),
                                          'pessoa')));
  base := regexp_replace(base, '[^a-z0-9]+', '.', 'g');
  base := regexp_replace(base, '^[._]+|[._]+$', '', 'g');
  base := left(regexp_replace(base, '[._]{2,}', '.', 'g'), 16);
  base := regexp_replace(base, '[._]+$', '', 'g');
  if length(base) < 3 then base := 'pessoa'; end if;

  tentativa := base;
  while apelido_livre(tentativa) is not null and k < 60 loop
    k := k + 1;
    tentativa := left(base, 16) || k::text;
  end loop;
  -- Sessenta tentativas e nada: o acaso resolve, e o @ continua trocável.
  if apelido_livre(tentativa) is not null then
    tentativa := left(base, 10) || floor(random() * 900000 + 100000)::text;
  end if;

  insert into apelidos (user_id, apelido) values (p_user, tentativa)
  on conflict (user_id) do nothing;
  return tentativa;
end $$;

revoke all on function public.dar_apelido(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.dar_apelido(uuid, text, text, text) to service_role;

/**
 * O cadastro passa a carimbar o @ junto com o resto.
 *
 * Ele entra ANTES do convite e antes da empresa, pelo mesmo motivo do espaço
 * pessoal: é da pessoa, e vale nos três caminhos. Quem chega por convite também
 * ganha o seu, e é quem mais precisa, porque não escolheu nada.
 */
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cv        convites%rowtype;
  v_org     uuid;
  v_nome    text := nullif(btrim(new.raw_user_meta_data->>'organizacao'), '');
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')));
  v_espaco  text := lower(btrim(coalesce(new.raw_user_meta_data->>'espaco', '')));
  v_eu      text := nullif(btrim(new.raw_user_meta_data->>'nome'), '');
  v_apelido text := nullif(btrim(new.raw_user_meta_data->>'apelido'), '');
  v_papel   text := 'colaborador';
  v_ativo   boolean := false;
  v_dono    boolean := false;
  v_perfil  uuid;
  v_ve_area boolean := false;
  v_area    uuid;
  v_gestor  uuid;
  n int;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6E8F','#B5A08C'];
begin
  -- 0. O que é da PESSOA, e vale nos três caminhos: o @ e o espaço pessoal.
  --    Quem entra por convite ganha os dois, e é quem mais precisa deles.
  perform dar_apelido(new.id, v_apelido, v_eu, new.email);
  v_org := abrir_pessoal(new.id, v_eu, new.email);

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
    v_org := cv.org_id;
    v_papel := coalesce(cv.papel, 'colaborador');
    v_area := cv.area_id;
    v_gestor := cv.gestor_id;
    v_ve_area := coalesce(cv.ve_area, false);
    v_ativo := true;
  elsif v_espaco <> 'pessoal' then
    insert into organizacoes (nome, tipo)
    values (coalesce(v_nome, initcap(split_part(new.email, '@', 1))), 'equipe')
    returning id into v_org;
    v_papel := 'admin';
    v_ativo := true;
    v_dono := true;
    v_ve_area := true;
  else
    select id into v_perfil from perfis where user_id = new.id and org_id = v_org;
    if v_perfil is not null then
      insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
      on conflict (user_id) do update set perfil_id = excluded.perfil_id;
    end if;
    return new;
  end if;

  select count(*) into n from perfis where org_id = v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id, v_org,
    coalesce(v_eu, nullif(btrim(cv.nome), ''), split_part(new.email, '@', 1)),
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

/**
 * E quem já existe ganha o dele, derivado do nome.
 *
 * Sem esta passada o @ valeria só para quem se cadastrar de amanhã em diante, e
 * a conversa de "escolha o seu agora" teria que acontecer com todo mundo que já
 * usa o app, que é exatamente a conversa que pedir no cadastro existe para
 * evitar. Deriva do nome, e quem não gostar troca em Ajustes.
 *
 * `dar_apelido` devolve o que já existe em vez de criar outro, então rodar isto
 * de novo não faz nada na segunda vez.
 */
do $$
declare u record;
begin
  for u in
    select distinct on (p.user_id) p.user_id, p.nome, p.email
      from perfis p
     where p.user_id is not null
       and not exists (select 1 from apelidos a where a.user_id = p.user_id)
     order by p.user_id, p.criado_em
  loop
    perform dar_apelido(u.user_id, null, u.nome, u.email);
  end loop;
end $$;

-- ==========================================================================
-- 72. O cadastro por telefone, e o banco que assumia um e-mail
--
--     Ligar a entrada por telefone no Supabase é configuração de dez minutos.
--     O que ela quebra não é: `auth.users.email` vem NULO num cadastro por
--     telefone, e `novo_usuario` o usava em quatro lugares sem perguntar. O
--     cadastro falhava inteiro, com "null value in column nome of relation
--     organizacoes", que é uma frase que não diz nada a quem só queria entrar.
--
--     Isso foi encontrado ANTES de ligar, plantando um usuário sem e-mail no
--     ensaio, e é a lição da Meta aplicada: a configuração dizer "enabled" não
--     quer dizer que o caminho existe do outro lado.
--
--     **O telefone passa a ser o que o e-mail era**, onde ele não está: nome de
--     quem não disse o nome, nome do espaço pessoal, casamento com o convite.
--     E `convites.fone` já existia desde a seção 67, então convidar por número
--     e entrar por número fecham o ciclo sem nada novo.
--
--     **O que NÃO muda é quem a pessoa é.** `perfis.email` continua existindo e
--     passa a aceitar vazio, em vez de virar nulo: nove lugares no app leem
--     essa coluna esperando texto, e trocar `not null` por nulo os obrigaria a
--     todos a saber disso. Vazio é a mesma informação sem a mudança de contrato.
-- --------------------------------------------------------------------------

alter table public.perfis alter column email set default '';
update public.perfis set email = '' where email is null;

/**
 * Como chamar quem entrou só com um número.
 *
 * Não é o número: "Boa tarde, +5542999783288" é a mesma cara de relatório que
 * "Boa tarde, fulano@gmail.com", e é a primeira coisa que alguém de fora vê.
 * É o fim do número, que é o que a própria pessoa usa para se identificar ao
 * telefone, e serve até ela dizer o nome dela em `PedeNome`.
 */
create or replace function public.nome_do_fone(p_fone text)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(p_fone, '') = '' then null
    else 'Pessoa ' || right(regexp_replace(p_fone, '[^0-9]', '', 'g'), 4)
  end;
$$;

/**
 * O espaço pessoal passa a saber nascer sem e-mail.
 *
 * Ele já aceitava `p_email` nulo, e caía em `initcap(split_part('', '@', 1))`,
 * que é string VAZIA e não nulo: o `coalesce` não pegava, e a organização
 * nascia chamada "". Um espaço sem nome no seletor é o app parecendo quebrado
 * no primeiro segundo de uso.
 */
/* `p_fone` SEM default, e isto não é estilo. Com default, uma chamada de três
   argumentos casaria com esta E com a forma de três da seção 70, e numa segunda
   passada do arquivo as duas existem ao mesmo tempo entre uma seção e a outra:
   o Postgres responde "a função não é única" e derruba tudo no meio. Isso
   passou no primeiro ensaio por ACIDENTE, porque o laço da seção 70 não itera
   quando todo mundo já tem espaço pessoal, e comando que não roda não resolve
   função. É o mesmo erro do `avisar` com dez e onze argumentos. */
create or replace function public.abrir_pessoal(
  p_user uuid, p_nome text, p_email text, p_fone text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_perfil uuid; v_nome text;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6E8F','#B5A08C'];
begin
  if p_user is null then return null; end if;

  select p.org_id into v_org
    from perfis p join organizacoes o on o.id = p.org_id
   where p.user_id = p_user and o.tipo = 'pessoal' limit 1;
  if v_org is not null then return v_org; end if;

  -- `nullif` em cada degrau, porque o que falha aqui volta VAZIO e não nulo.
  v_nome := coalesce(
    nullif(btrim(coalesce(p_nome, '')), ''),
    nullif(initcap(split_part(coalesce(p_email, ''), '@', 1)), ''),
    nome_do_fone(p_fone),
    'Pessoal');

  insert into organizacoes (nome, tipo) values (v_nome, 'pessoal') returning id into v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, ve_area, ativo)
  values (p_user, v_org, v_nome, coalesce(p_email, ''),
          paleta[(floor(random() * 8))::int + 1], 'admin', true, true)
  returning id into v_perfil;

  update organizacoes set dono_id = v_perfil where id = v_org;
  return v_org;
end $$;

revoke all on function public.abrir_pessoal(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.abrir_pessoal(uuid, text, text, text) to service_role;
-- A forma de três argumentos sai, senão a chamada fica ambígua e o Postgres
-- responde "não é única", que não diz o que fazer. Mesmo cuidado da seção 43.
drop function if exists public.abrir_pessoal(uuid, text, text);

/**
 * E o cadastro inteiro passa a atravessar sem e-mail.
 *
 * Três coisas mudam, e a terceira é a que fecha o ciclo:
 *
 *   1. o nome de quem não disse o nome vem do telefone, e não de um nulo
 *   2. `perfis.email` recebe vazio em vez de nulo
 *   3. o CONVITE casa por telefone, e não só por código e e-mail
 *
 * A terceira é o que faz convidar por número valer alguma coisa: `convites.fone`
 * existe desde a seção 67, e até aqui ele só dizia para onde mandar o link.
 * Agora quem se cadastra com aquele número entra na empresa que o chamou, como
 * já acontecia com o e-mail. `formas_do_fone` compara as duas formas do número
 * brasileiro, porque o WhatsApp entrega as linhas antigas sem o nono dígito e
 * comparar dígito a dígito não reconheceria a própria pessoa.
 */
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cv        convites%rowtype;
  v_org     uuid;
  v_nome    text := nullif(btrim(new.raw_user_meta_data->>'organizacao'), '');
  v_codigo  text := upper(btrim(coalesce(new.raw_user_meta_data->>'convite', '')));
  v_espaco  text := lower(btrim(coalesce(new.raw_user_meta_data->>'espaco', '')));
  v_eu      text := nullif(btrim(new.raw_user_meta_data->>'nome'), '');
  v_apelido text := nullif(btrim(new.raw_user_meta_data->>'apelido'), '');
  v_email   text := coalesce(new.email, '');
  v_fone    text := coalesce(new.phone, '');
  v_papel   text := 'colaborador';
  v_ativo   boolean := false;
  v_dono    boolean := false;
  v_perfil  uuid;
  v_ve_area boolean := false;
  v_area    uuid;
  v_gestor  uuid;
  n int;
  paleta text[] := array['#8A8A8A','#B0B0B0','#C9884A','#6F6F6F','#A0704A','#9A9A9A','#7A6E8F','#B5A08C'];
begin
  -- 0. O que é da PESSOA, e vale nos três caminhos.
  perform dar_apelido(new.id, v_apelido, coalesce(v_eu, nome_do_fone(v_fone)), v_email);
  v_org := abrir_pessoal(new.id, v_eu, v_email, v_fone);

  select * into cv from convites
  where usado_em is null
    and (vence_em is null or vence_em > now())
    and (
      (v_codigo <> '' and codigo = v_codigo)
      or (v_email <> '' and lower(email) = lower(v_email))
      -- O número, nas duas formas: a linha antiga chega sem o nono dígito.
      or (v_fone <> '' and fone is not null
          and exists (select 1 from unnest(formas_do_fone(v_fone)) f
                       where f = regexp_replace(fone, '[^0-9]', '', 'g')))
    )
  order by (v_codigo <> '' and codigo = v_codigo) desc
  limit 1;

  if cv.id is not null then
    v_org := cv.org_id;
    v_papel := coalesce(cv.papel, 'colaborador');
    v_area := cv.area_id;
    v_gestor := cv.gestor_id;
    v_ve_area := coalesce(cv.ve_area, false);
    v_ativo := true;
  /* A empresa nasce só quando a pessoa PEDIU uma, e não por padrão.
     Era `v_espaco <> 'pessoal'`, ou seja, qualquer cadastro sem metadado ganhava
     uma. Com e-mail e senha isso nunca acontecia, porque o formulário sempre
     manda alguma coisa; com OTP por telefone acontece sempre, porque entrar com
     um número é uma chamada sem metadado nenhum. O resultado era uma empresa
     chamada "Pessoa 3288" para quem só queria entrar. */
  elsif v_espaco = 'equipe' or v_nome is not null then
    insert into organizacoes (nome, tipo)
    values (coalesce(v_nome,
                     nullif(initcap(split_part(v_email, '@', 1)), ''),
                     nome_do_fone(v_fone),
                     'Minha equipe'), 'equipe')
    returning id into v_org;
    v_papel := 'admin';
    v_ativo := true;
    v_dono := true;
    v_ve_area := true;
  else
    select id into v_perfil from perfis where user_id = new.id and org_id = v_org;
    if v_perfil is not null then
      insert into sessoes (user_id, perfil_id) values (new.id, v_perfil)
      on conflict (user_id) do update set perfil_id = excluded.perfil_id;
    end if;
    return new;
  end if;

  select count(*) into n from perfis where org_id = v_org;

  insert into perfis (user_id, org_id, nome, email, cor, papel, area_id, gestor_id, ve_area, ativo)
  values (
    new.id, v_org,
    coalesce(v_eu,
             nullif(btrim(cv.nome), ''),
             nullif(split_part(v_email, '@', 1), ''),
             nome_do_fone(v_fone),
             'Pessoa'),
    v_email,
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

select
  (select count(*) from pg_trigger where tgname = 'ao_inserir_org' and not tgisinternal)
    as "carimbo de organizacao (40)",
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
    as "o acervo nao aponta para cliente (true)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('responder_descoberta','recusar_descoberta','adotar_descoberta',
                        'manda_no_processo_de'))
    as "as decisoes sobre a descoberta (4)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'processos_descobertos'
      and column_name = 'respostas')
    as "a resposta que sobrevive ao refresh (1)",
  -- A conferência dessas três funções tem que carregar a organização do
  -- candidato: elas são security definer, e lá dentro RLS não filtra a linha.
  (select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('responder_descoberta','recusar_descoberta','adotar_descoberta')
      and p.prosrc not like '%manda_no_processo_de%')
    as "ninguem mexe em candidato de outra casa (true)",
  (select count(*) from pg_policies
    where tablename = 'processos_descobertos')
    as "so a politica de leitura (1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'organizacoes'
      and column_name = 'descoberta_em')
    as "a varredura marca o dia (1)",
  -- Quem pergunta pela fila da varredura não tem sessão, então a função aceita
  -- qualquer empresa: a trava não é um `if` dentro dela, é a permissão.
  (select not has_function_privilege('authenticated', 'public.falta_descobrir()', 'execute')
      and not has_function_privilege('anon', 'public.falta_descobrir()', 'execute')
      and has_function_privilege('service_role', 'public.falta_descobrir()', 'execute'))
    as "so o servidor pergunta a fila (true)",
  -- Uma assinatura só. Duas fariam a chamada de dois argumentos do app virar
  -- "não é única", que é como decidir_etapa parou em uso.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'salvar_fluxo')
    as "uma assinatura de salvar_fluxo (1)",
  (select prosrc like '%quem_age(p_como)%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'salvar_fluxo')
    as "o servidor abre track em nome de alguem (true)",
  -- Sem sessão, `minha_org()` é nula e a linha nasceria invisível para todo
  -- mundo, inclusive para quem a criou. O carimbo precisa ter onde olhar.
  (select prosrc like '%org_de_quem_age()%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'carimbar_org')
    as "o carimbo acha a casa sem sessao (true)",
  (select prosrc like '%set_config%' from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'quem_age')
    as "quem age diz de quem e a casa (true)",
  (select count(*) from fluxos where org_id is null)
    as "tracks orfas, tem que ser (0)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'ciclos')
    as "o arquivo da volta (1)",
  (select count(*) from pg_trigger where tgname = 'ao_virar_ciclo')
    as "a virada arquiva (1)",
  -- O anexo passa a ter três donos possíveis, e continua sendo de UM só.
  (select pg_get_constraintdef(oid) like '%num_nonnulls%' from pg_constraint
    where conname = 'anexos_de_uma_coisa')
    as "o anexo tem tres donos possiveis (true)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'organizacoes' and column_name = 'whats_via')
    as "por onde o whatsapp fala (1)",
  -- O WhatsApp entrega número brasileiro antigo sem o nono dígito, e a
  -- conferência era de dígito por dígito: o app não reconhecia a própria pessoa.
  (select array_length(formas_do_fone('+5542999783288'), 1) = 2
      and array_length(formas_do_fone('+14155238886'), 1) = 1)
    as "o nono digito tem as duas formas (true)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'raiox_achados')
    as "o raio-X guarda o que achou (1)",
  -- O cálculo mora em TypeScript, com testes. O banco só entrega o material.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('passagens_do_raiox','empurroes_do_raiox','guardar_achado',
                        'responder_achado','avisar_do_raiox'))
    as "as pecas do raio-X (5)",
  -- O material do raio-X é de seis meses de decisões: quem pergunta é o pulso,
  -- sem sessão, e a trava é a permissão, não um `if` dentro da função.
  (select not has_function_privilege('authenticated',
      'public.passagens_do_raiox(uuid, timestamptz)', 'execute'))
    as "so o servidor le as passagens (true)",
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('caixas','envelopes_vistos'))
    as "a caixa conectada (2)",
  -- A credencial da caixa é da pessoa. Quem lê é o pulso, e a trava é a
  -- permissão: função definer que devolve segredo não pode ser chamável por
  -- quem está logado.
  (select not has_function_privilege('authenticated', 'public.caixas_para_ler()', 'execute')
      and has_function_privilege('service_role', 'public.caixas_para_ler()', 'execute'))
    as "so o servidor le as credenciais (true)",
  -- O que foi visto não guarda conteúdo: só responde "isto eu já olhei?".
  (select string_agg(column_name, ',' order by ordinal_position) = 'org_id,perfil_id,msg_id,visto_em'
    from information_schema.columns where table_name = 'envelopes_vistos')
    as "o envelope visto nao guarda conteudo (true)",
  (select count(*) from pg_trigger where tgname = 'ao_arquivar_pede_feedback')
    as "o desfecho prepara o pedido (1)",
  -- A resposta de quem recebeu entra no mesmo registro de eventos do resto, e
  -- é assim que ela chega à descoberta e ao raio-X sem fio novo.
  (select pg_get_viewdef('public.eventos'::regclass) like '%feedback:%')
    as "a resposta do cliente vira evento (true)",
  -- A regra de quem vê uma track mora UMA vez. Se `ve_fluxo` deixar de ser um
  -- invólucro de `ve_fluxo_como`, voltaram a existir duas cópias da regra de
  -- visibilidade, e o app vai mostrar pela tela o que esconde pelo telefone.
  (select pg_get_functiondef('public.ve_fluxo(uuid)'::regprocedure) like '%ve_fluxo_como%')
    as "a regra de quem ve a track e uma so (true)",
  -- Quem responde "o que FULANO enxerga" não pode ser chamável por quem está
  -- logado: seria a porta dos fundos das regras de visibilidade com outro nome.
  (select not has_function_privilege('authenticated', 'public.tracks_de(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.ve_fluxo_como(uuid, uuid)', 'execute')
      and has_function_privilege('service_role', 'public.tracks_de(uuid)', 'execute'))
    as "so o servidor pergunta pelos olhos dos outros (true)",
  -- Duas assinaturas de `avisar` convivendo derrubam o arquivo no meio, e só
  -- em banco com dados. Uma de cada vez, sempre.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'avisar')
    as "uma assinatura de avisar, nao duas (1)",
  -- A caixa de perguntas é de uma pessoa só, como a de avisos. A política da
  -- tabela sempre disse isso; a função definer é que entregava a de qualquer um.
  (select not has_function_privilege('authenticated', 'public.perguntas_de(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.eventos_de(uuid, timestamptz)', 'execute')
      and not has_function_privilege('authenticated', 'public.perfil_do_telefone(text)', 'execute'))
    as "as funcoes de servidor estao fechadas (true)",
  -- Ninguém logado escreve aviso em nome da casa: seria recado falso dentro do app.
  (select not has_function_privilege('authenticated',
      'public.avisar(uuid, text, text, text, text, boolean, uuid, uuid, uuid, uuid, uuid)', 'execute'))
    as "ninguem forja aviso (true)",
  -- Função de gatilho não se chama pela mão, e aberta é superfície de graça.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute'))
    as "gatilho aberto a quem esta logado (0)",
  -- O segredo do conector saiu da linha que a empresa inteira lê. RLS trabalha
  -- por linha, e `select` escolhe coluna: por isso tabela própria, sem política.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'conectores' and column_name = 'segredo_cifrado')
    as "o segredo saiu da linha do conector (0)",
  (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname = 'conector_segredos')
    as "e ninguem logado alcanca a tabela dele (0)",
  -- A agenda respondia "recursão infinita" e a tela mostrava lista vazia, que
  -- parece agenda sem compromisso. Política de compromisso não pode perguntar
  -- por convidado com subconsulta, nem o contrário: quem quebra o círculo é
  -- `security definer`, como em notas.
  (select pg_get_expr(polqual, polrelid) like '%sou_convidado%'
     from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname = 'compromissos' and p.polname = 'comp_sel')
    as "a agenda saiu do circulo (true)",
  (select pg_get_expr(polqual, polrelid) like '%ve_convite%'
     from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname = 'convidados' and p.polname = 'conv_sel')
    as "e os convidados tambem (true)",
  -- Vinte e seis colunas apontam para `perfis` e viram nulo se ele sumir: o
  -- histórico continua e ninguém fez nada. Sete apontam com cascata, e entre
  -- elas estão notas e agenda. O perfil não se apaga, e ponto.
  (select count(*) from pg_trigger where tgname = 'ao_apagar_perfil')
    as "o perfil nao se apaga (1)",
  -- E apagar o login no painel do Supabase deixa de arrastar o perfil junto,
  -- que era o caminho fácil para a empresa perder as notas de quem saiu.
  (select confdeltype = 'n' from pg_constraint
    where conrelid = 'public.perfis'::regclass and conname = 'perfis_user_id_fkey')
    as "apagar o login nao leva o perfil (true)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'esquecer_pessoa')
    as "a funcao de esquecimento existe (1)",
  -- O registro de acesso existe e ninguém escreve nele pela mão: quem escreve
  -- é gatilho, que roda como dono.
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'auditoria')
    as "o registro de acesso existe (1)",
  (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname = 'auditoria' and p.polcmd::text <> 'r')
    as "ninguem insere, altera ou apaga por politica (0)",
  -- Registro que o invasor pode limpar é pior do que não ter, porque dá falsa
  -- segurança. O gatilho recusa mesmo que alguém crie uma política depois.
  (select count(*) from pg_trigger where tgname = 'ao_mexer_auditoria')
    as "e o passado nao se altera (1)",
  -- Os seis rastros: papel e desligamento, visibilidade de track, entrada em
  -- nota, credencial, convite e plano.
  (select count(*) from pg_trigger
    where tgname in ('ao_auditar_perfil','ao_auditar_fluxo','ao_auditar_nota_pessoa',
                     'ao_auditar_convite','ao_auditar_org')
      and not tgisinternal)
    as "os rastros ligados (5)",
  -- O teto de IA existia na tela e não no banco: coluna vazia era "sem teto
  -- nenhum" aqui e "vale o número do plano" lá, e toda empresa em teste nascia
  -- sem freio. Agora as duas respondem a mesma pergunta.
  (select teto_de_leituras is not null from (
     select public.leituras_do_plano('teste') as teto_de_leituras) x)
    as "o teste passou a ter teto (true)",
  -- Estes números são espelho de PLANOS, em lib/planos.ts. Confira com os olhos:
  -- teste 200, reduzido 0, pessoal 150, equipe 120 por assento, interno sem teto.
  (select public.leituras_do_plano('teste') || '/' || public.leituras_do_plano('reduzido')
       || '/' || public.leituras_do_plano('pessoal') || '/' || public.leituras_do_plano('equipe')
       || '/' || coalesce(public.leituras_do_plano('interno')::text, 'sem teto'))
    as "leituras por plano (200/0/150/120/sem teto)",
  -- Plano digitado errado no SQL da operação virava plano inexistente, que não
  -- casa com nenhum `case`, cai no `else` e vira sem teto. O erro mais caro
  -- possível, escrito por quem estava tentando cobrar.
  (select count(*) from pg_constraint where conname = 'org_plano_check')
    as "plano invalido e recusado (1)",
  -- Quem pediu fica sabendo. Antes, só quem estava TRAVADO pela tarefa era
  -- avisado: se ninguém dependia dela, ela ficava pronta em silêncio.
  (select count(*) from pg_trigger where tgname = 'ao_pedir_saber')
    as "quem pediu e avisado (1)",
  -- Devolver é devolver a decisão a quem pediu, com o motivo junto, e por isso
  -- o motivo é obrigatório e a tarefa volta para o colo do autor.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'itens'
      and column_name in ('devolvida_em','devolvida_por','devolvida_pq'))
    as "a tarefa pode ser devolvida (3)",
  -- O canal ganha onde guardar o trabalho antes de alguém saber que forma ele
  -- tem. Ela não aparece em Tracks: `implicita` é o que a mantém fora do caminho.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'fluxos' and column_name = 'implicita')
    as "a track implicita existe (1)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('track_do_canal','devolver_item'))
    as "as duas funcoes novas (2)",
  -- A track escondida sai do esconderijo: a conversão é função própria, porque
  -- `salvar_fluxo` congela a posição do que já passou e recusaria justamente
  -- esta operação.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'virar_track')
    as "virar_track existe (1)",
  -- O gatilho de item devolve `etapa_id` ao que era para quem não manda no
  -- processo, e pergunta pela sessão. Sem a porta, a conversão deixava as
  -- tarefas todas no checkpoint velho, sem erro nenhum.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'proteger_item'
      and pg_get_functiondef(p.oid) like '%trackward.virando%')
    as "a porta da conversao existe (1)",
  -- O anexo na conversa: ele passa a ter um quarto dono possível, a mensagem,
  -- e continua sendo de UM só.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'anexos' and column_name = 'mensagem_id')
    as "anexo em mensagem (1)",
  -- E a lista de quem abre. Vazia quer dizer "quem vê a coisa a que ele
  -- pertence"; com gente dentro, quem está de fora não vê que o arquivo existe.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('ve_anexo','anexo_restrito','anexo_comigo'))
    as "as contas do anexo restrito (3)",
  -- Ninguém se convida para a lista de um anexo, como em nota_pessoas.
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'anexo_pessoas')
    as "politicas da lista (3)",
  -- A trilha melhora enquanto roda. Duas funções e não `salvar_fluxo`: aquela
  -- apaga o checkpoint removido e `itens.etapa_id` tem cascata, então tirar
  -- pela lista de etapas levaria as tarefas junto, sem avisar.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('tirar_checkpoint','partir_checkpoint'))
    as "os ajustes da trilha (2)",
  -- Encerrar a conta de um cliente é obrigação de LGPD e falhava: a trava da
  -- ressalva não perguntava POR QUE alguém estava apagando, e recusava a
  -- cascata de `delete from organizacoes` do mesmo jeito.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'proteger_ressalva'
      and pg_get_functiondef(p.oid) like '%not exists (select 1 from fluxos%')
    as "a porta do encerramento existe (1)",
  -- A proposta avisa quem vai fazer, e mais ninguém. Sem isto, a leitura
  -- automática deixava o pedido no canal e quem não abriu o app não sabia.
  (select count(*) from pg_trigger where tgname = 'ao_propor_tarefa')
    as "a proposta avisa (1)",
  -- O secretário lê sozinho. Sem a marca, cada varredura releria o caderno
  -- inteiro e proporia de novo o que já foi proposto.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'notas'
      and column_name = 'lido_pela_ia_em')
    as "a conversa guarda ate onde foi lida (1)",
  -- O recado ditado no secretário pertence a uma NOTA, e sem esta linha ele
  -- subia, gravava, e não tocava para ninguém, nem para quem gravou.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'posso_ver_anexo'
      and pg_get_functiondef(p.oid) like '%minha_nota(m.nota_id)%')
    as "a voz da nota abre para a dona (1)",
  -- O convite em dois toques. O telefone entra para o convite saber para onde
  -- vai, e o e-mail deixa de ser obrigatório: a porta sempre foi o código.
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'convites' and column_name = 'fone')
    as "o convite tem telefone (1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'convites'
      and column_name = 'email' and is_nullable = 'YES')
    as "o e-mail do convite e opcional (1)",
  -- Um convite sem e-mail e sem telefone é um código solto que funciona para
  -- quem o receber primeiro, e "quem o receber primeiro" não é uma pessoa.
  (select count(*) from pg_constraint
    where conname = 'convites_tem_quem' and conrelid = 'public.convites'::regclass)
    as "o convite diz quem entra (1)",
  -- E os dois índices de convite aberto, cada um no seu campo. Sem o recorte,
  -- dois convites por telefone colidiam num índice que fala de endereço.
  (select count(*) from pg_indexes
    where schemaname = 'public'
      and indexname in ('convites_email_aberto','convites_fone_aberto'))
    as "um convite aberto por pessoa (2)",
  -- A agenda é da pessoa, e o dia dela atravessa os espaços.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('minhas_casas','meus_perfis','minha_agenda','meu_dia'))
    as "as pecas do dia da pessoa (4)",
  -- E o furo que isto fechou: `ocupacao()` era definer SEM filtro de
  -- organização, e devolvia a agenda de qualquer cliente para qualquer pessoa
  -- logada. Agora ela pergunta por quem divide uma casa comigo.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ocupacao'
      and pg_get_functiondef(p.oid) like '%minhas_casas()%')
    as "a ocupacao respeita a parede (1)",
  -- As quatro são de quem está logado, e de mais ninguém: nenhuma aceita o id
  -- de outra pessoa, e nenhuma abre para anon.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('minhas_casas','meus_perfis','minha_agenda','meu_dia','ocupacao')
      and p.pronargs = 0)
    as "nenhuma pergunta pelos olhos de outro (5)",
  -- Concluir de onde se olha, com o rastro inteiro: a conclusão desceu para o
  -- banco porque duas implementações da mesma regra é a garantia de que um dia
  -- a de cá avisa o canal e a de lá esquece.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('concluir_meu_item','agir_como'))
    as "concluir de qualquer espaco (2)",
  -- E o carimbo passou a deixar quem DIZ de quem é a casa mandar sobre o
  -- padrão da sessão. Sem isto, a linha escrita noutro espaço nasce carimbada
  -- com a casa errada e ninguém a enxerga, nem quem a escreveu.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'carimbar_org'
      and pg_get_functiondef(p.oid) like '%coalesce(org_de_quem_age(), minha_org()%')
    as "o carimbo tem porta (1)",
  -- O dia carrega os quatro tipos, senão trocar de lente perdia os filtros.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'meu_dia'
      and pg_get_functiondef(p.oid) like '%''aprov''%')
    as "o dia tem os quatro tipos (1)",
  -- Todo login tem espaço pessoal, inclusive quem entrou por convite e quem já
  -- existia antes desta passada.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'abrir_pessoal')
    as "a porta de entrada existe (1)",
  (select count(*) from perfis p
    where p.user_id is not null
      and not exists (
        select 1 from perfis p2 join organizacoes o2 on o2.id = p2.org_id
         where p2.user_id = p.user_id and o2.tipo = 'pessoal'))
    as "logins AINDA sem espaco pessoal (0)",
  -- A carga é da PESSOA: `meu_dia` diz a demanda, esta diz a capacidade
  -- demonstrada. Vinte tarefas não quer dizer nada sem ela.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'minhas_entregas')
    as "a vazao da pessoa (1)",
  -- O @ da pessoa: do LOGIN e não do perfil, porque quatro empresas não lhe
  -- dão quatro nomes.
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('apelidos','apelidos_reservados'))
    as "as tabelas do @ (2)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('apelido_livre','escolher_apelido','dar_apelido','unaccent_simples'))
    as "as funcoes do @ (4)",
  -- Ninguém escreve em `apelidos` pela tabela: escolher passa pela função, que
  -- é quem confere formato, reservado e repetido.
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'apelidos')
    as "so leitura no @ (1)",
  -- E todo login tem o seu, inclusive quem já existia.
  (select count(*) from perfis p
    where p.user_id is not null
      and not exists (select 1 from apelidos a where a.user_id = p.user_id))
    as "logins AINDA sem @ (0)",
  -- O cadastro por telefone: `auth.users.email` vem NULO ali, e `novo_usuario`
  -- o usava em quatro lugares sem perguntar. O cadastro falhava inteiro.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'nome_do_fone')
    as "como chamar quem so tem numero (1)",
  -- `abrir_pessoal` tem UMA assinatura, a de quatro. Com as duas e um default
  -- no quarto, a chamada de tres fica ambigua entre as seções 70 e 72 numa
  -- segunda passada, e o Postgres derruba o arquivo no meio.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'abrir_pessoal')
    as "uma assinatura de abrir_pessoal (1)",
  -- E o convite casa por TELEFONE, que é o que faz convidar por número valer
  -- alguma coisa: até aqui o número só dizia para onde mandar o link.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'novo_usuario'
      and pg_get_functiondef(p.oid) like '%formas_do_fone(v_fone)%')
    as "o convite casa por numero (1)",
  -- Ninguém ganha uma empresa que não pediu: entrar com um número é uma
  -- chamada sem metadado nenhum, e o padrão antigo criava uma.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'novo_usuario'
      and pg_get_functiondef(p.oid) like '%v_espaco = ''equipe'' or v_nome is not null%')
    as "a empresa so nasce se pedirem (1)";
