-- ==========================================================================
-- Diagnóstico: por que o banco recusou
--
-- Cole no SQL Editor do Supabase, troque o e-mail na PRIMEIRA linha de código
-- pelo seu, e rode tudo de uma vez. Ele não altera nada: só conta o que existe.
--
-- Serve para uma pergunta: quando o app diz "new row violates row-level
-- security policy", qual das condições caiu. As políticas de criar tarefa,
-- criar canal e criar nota pedem três coisas ao mesmo tempo, e a mensagem do
-- Postgres não diz qual delas falhou:
--
--   1. a linha é da sua organização
--   2. o seu perfil está ativo
--   3. quem assina a linha é o seu perfil em uso
--
-- Desde a seção 15 do schema.sql a terceira é carimbada pelo servidor e não
-- pode mais discordar. Se o erro continuar depois de rodar o schema atualizado,
-- é uma das outras duas, e é isso que este diagnóstico mostra.
-- ==========================================================================

drop table if exists _quem;
create temp table _quem as
select id, email from auth.users
 where lower(email) = lower('troque@pelo.seu.email');   -- <<< o seu e-mail aqui

-- 1. O resumo.
select
  (select count(*) from _quem)                                        as "login encontrado",
  (select count(*) from perfis p, _quem q where p.user_id = q.id)     as "perfis deste login",
  (select count(*) from perfis p, _quem q where p.user_id = q.id and p.ativo) as "perfis ativos",
  (select count(*) from sessoes s, _quem q where s.user_id = q.id)    as "espaco escolhido";

-- 2. Cada perfil deste login, e qual deles o banco usa.
select
  o.nome            as "empresa",
  p.nome            as "perfil",
  p.papel,
  p.ativo,
  p.criado_em::date as "criado em",
  case when p.id = coalesce(
        (select s.perfil_id from sessoes s join perfis x on x.id = s.perfil_id
          where s.user_id = (select id from _quem) and x.user_id = (select id from _quem)),
        (select x.id from perfis x where x.user_id = (select id from _quem)
          order by x.criado_em, x.id limit 1))
       then 'SIM, é este' else '' end as "em uso"
from perfis p
join organizacoes o on o.id = p.org_id
where p.user_id = (select id from _quem)
order by p.criado_em;

-- 3. Os carimbos do servidor. Faltando algum, o schema.sql não foi aplicado
--    inteiro, e é esta a causa mais provável do erro.
select c.relname as "tabela", t.tgname as "carimbo"
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where t.tgname in ('ao_assinar','ao_inserir_org')
  and c.relname in ('itens','canais','notas')
order by c.relname, t.tgname;

-- 4. O veredito, em português.
do $$
declare v_user uuid; v_perfis int; v_ativos int; v_assina int;
begin
  select id into v_user from _quem;
  if v_user is null then
    raise notice 'Não achei esse e-mail em auth.users. Confira se é o mesmo do login.';
    return;
  end if;
  select count(*), count(*) filter (where ativo) into v_perfis, v_ativos
    from perfis where user_id = v_user;
  select count(*) into v_assina from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where t.tgname = 'ao_assinar' and c.relname in ('itens','canais','notas');

  raise notice '---';
  if v_assina < 3 then
    raise notice 'FALTA a secao 15 do schema.sql: achei % de 3 carimbos. Rode o supabase/schema.sql inteiro de novo. E ela que faz o servidor assinar a linha, e e a causa mais provavel do erro.', v_assina;
  elsif v_ativos = 0 then
    raise notice 'Voce tem % perfil(is), nenhum ativo. Por isso o banco recusa: ativo() e falso. Rode o supabase/destravar.sql.', v_perfis;
  elsif v_perfis > 1 then
    raise notice 'Voce tem % perfis, em empresas diferentes. Isso e normal (e o caso do grupo), mas confira na tabela 2 se o perfil marcado "em uso" e o da empresa onde voce esta tentando criar a coisa.', v_perfis;
  else
    raise notice 'Um perfil, ativo, e os tres carimbos no lugar. Se o erro continuar, me mande o resultado das consultas acima.';
  end if;
end $$;

drop table if exists _quem;
