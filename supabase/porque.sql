-- ==========================================================================
-- Por que o banco recusou, condição por condição
--
-- Cole no SQL Editor do Supabase e rode. NÃO precisa editar nada, e NÃO altera
-- nada: tudo acontece dentro de uma transação desfeita no fim, inclusive a
-- tarefa de teste que ele tenta criar.
--
-- Ele percorre cada login do projeto, veste a identidade daquela pessoa, e
-- testa as quatro condições da política de criar tarefa, uma por uma:
--
--   minha(org_id)             a linha é da organização dela
--   ativo()                   o perfil dela está ativo
--   ve_fluxo(fluxo_id)        ela enxerga aquela track
--   autor_id = meu_perfil()   quem assina é ela
--
-- No fim, tenta criar de verdade e conta o que o banco respondeu.
-- ==========================================================================

begin;

-- 1. Os carimbos. Faltando algum, o problema é este, e o conserto é rodar o
--    supabase/atualizar.sql.
select
  (select count(*) from pg_trigger where tgname = 'ao_inserir_org' and not tgisinternal)
    as "carimbo de organizacao (tem que dar 29)",
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where t.tgname = 'ao_assinar' and c.relname in ('itens','canais','notas'))
    as "carimbo de autor (tem que dar 3)";

-- 2. As tabelas onde a etiqueta da organização está vazia. Qualquer número
--    acima de zero aqui é linha órfã, que ninguém enxerga e que nasceu antes
--    do carimbo existir.
select 'itens' as tabela, count(*) as "linhas sem organizacao" from itens where org_id is null
union all select 'canais', count(*) from canais where org_id is null
union all select 'etapas', count(*) from etapas where org_id is null
union all select 'fluxos', count(*) from fluxos where org_id is null
union all select 'atividades', count(*) from atividades where org_id is null
union all select 'notas', count(*) from notas where org_id is null
order by 2 desc;

-- 3. A prova real, login por login.
create temp table _saida (
  quem text, perfil text, empresa text, ativo boolean,
  tracks_visiveis int, resultado text
) on commit drop;

do $$
declare u record; v_etapa uuid; v_fluxo uuid; v_n int; v_res text;
begin
  for u in select id, email from auth.users order by created_at loop
    perform set_config('request.jwt.claim.sub', u.id::text, true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', u.id::text)::text, true);

    select count(*) into v_n from fluxos where ve_fluxo(id);
    select e.id, e.fluxo_id into v_etapa, v_fluxo
      from etapas e join fluxos f on f.id = e.fluxo_id
     where ve_fluxo(f.id) order by f.criado_em, e.ordem limit 1;

    if meu_perfil() is null then
      v_res := 'este login nao tem perfil em empresa nenhuma';
    elsif v_etapa is null then
      v_res := 'nao enxerga nenhum checkpoint, entao nao da para testar';
    else
      -- Vestir o papel de gente logada é o que liga a RLS. Sem isto, o SQL
      -- Editor roda como dono do banco e passa por cima de toda política, que
      -- é o contrário do que queremos medir aqui.
      v_res := '';

      begin
        set local role authenticated;
        insert into itens (etapa_id, fluxo_id, texto, resp_id, autor_id, ordem)
        values (v_etapa, v_fluxo, 'TESTE DO DIAGNOSTICO', meu_perfil(), meu_perfil(), 999);
        reset role;
        v_res := v_res || 'tarefa OK; ';
      exception when others then
        reset role;
        v_res := v_res || 'TAREFA RECUSOU (' || SQLERRM || '); ';
      end;

      -- A tarefa escreve na linha do tempo logo depois. Se for aqui que para,
      -- o app mostra o erro da tarefa e a tarefa até entrou.
      begin
        set local role authenticated;
        insert into atividades (fluxo_id, quem_id, texto)
        values (v_fluxo, meu_perfil(), 'teste do diagnostico');
        reset role;
        v_res := v_res || 'atividade OK; ';
      exception when others then
        reset role;
        v_res := v_res || 'ATIVIDADE RECUSOU (' || SQLERRM || '); ';
      end;

      begin
        set local role authenticated;
        insert into canais (nome, descricao, tipo, fluxo_id, criado_por)
        values ('teste-do-diagnostico', '', 'aberto', v_fluxo, meu_perfil());
        reset role;
        v_res := v_res || 'canal OK';
      exception when others then
        reset role;
        v_res := v_res || 'CANAL RECUSOU (' || SQLERRM || ')';
      end;
    end if;

    insert into _saida
    select u.email,
           (select nome from perfis where id = meu_perfil()),
           (select o.nome from organizacoes o where o.id = minha_org()),
           ativo(), v_n, v_res;
  end loop;
end $$;

select quem as "login", perfil, empresa, ativo,
       tracks_visiveis as "tracks que enxerga", resultado
  from _saida;

rollback;
