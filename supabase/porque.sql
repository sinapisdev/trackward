-- ==========================================================================
-- Por que o banco recusou, condição por condição
--
-- Troque o e-mail na primeira linha de código pelo seu e rode tudo de uma vez
-- no SQL Editor. Ele NÃO altera nada: tudo roda dentro de uma transação que é
-- desfeita no fim, inclusive a tarefa de teste que ele tenta criar.
--
-- A política de criar tarefa pede quatro coisas ao mesmo tempo:
--
--   minha(org_id)        a linha é da sua organização
--   ativo()              o seu perfil está ativo
--   ve_fluxo(fluxo_id)   você enxerga aquela track
--   autor_id = meu_perfil()   quem assina é você (carimbado pelo servidor)
--
-- A mensagem do Postgres não diz qual caiu. Este arquivo diz.
-- ==========================================================================

begin;

-- 1. Vira "gente logada", com a sua identidade. É o que o app faz.
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where lower(email) = lower('troque@pelo.seu.email')), true) as login;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id::text from auth.users
    where lower(email) = lower('troque@pelo.seu.email')))::text, true) as claims;
set local role authenticated;

-- 2. As três primeiras condições, fora de qualquer track.
select
  meu_perfil() as "perfil em uso",
  minha_org()  as "organizacao em uso",
  ativo()      as "perfil ativo (tem que ser true)",
  eh_admin()   as "administrador";

-- 3. As tracks que você enxerga, e se cada uma passa no ve_fluxo.
select
  f.nome                 as "track",
  f.visib                as "quem ve",
  f.org_id = minha_org() as "e da sua empresa",
  ve_fluxo(f.id)         as "ve_fluxo (tem que ser true)",
  f.id                   as "id"
from fluxos f
order by f.criado_em
limit 20;

-- 4. A prova real: tenta criar uma tarefa na primeira track que aparecer, e
--    conta o que aconteceu. Nada disso fica: o rollback no fim desfaz tudo.
do $$
declare v_etapa uuid; v_fluxo uuid; v_erro text;
begin
  select e.id, e.fluxo_id into v_etapa, v_fluxo
    from etapas e join fluxos f on f.id = e.fluxo_id
   order by f.criado_em, e.ordem limit 1;

  if v_etapa is null then
    raise notice 'Nao achei nenhum checkpoint que voce enxergue. O problema e antes: voce nao esta vendo as tracks.';
    return;
  end if;

  begin
    insert into itens (etapa_id, fluxo_id, texto, resp_id, autor_id, ordem)
    values (v_etapa, v_fluxo, 'TESTE DO DIAGNOSTICO', meu_perfil(), meu_perfil(), 999);
    raise notice 'CRIOU A TAREFA DE TESTE SEM ERRO. A politica esta passando; o problema esta no app, nao no banco.';
  exception when others then
    v_erro := SQLERRM;
    raise notice 'RECUSOU. Mensagem: %', v_erro;
    raise notice 'Detalhe das condicoes: minha(org)=%, ativo=%, ve_fluxo=%, autor bate=%',
      (select minha(org_id) from fluxos where id = v_fluxo),
      ativo(),
      ve_fluxo(v_fluxo),
      (meu_perfil() is not null);
  end;
end $$;

rollback;
