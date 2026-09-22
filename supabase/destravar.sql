-- Destravar o acesso, sem rodar o schema inteiro.
--
-- Para quem ficou preso na tela de acesso suspenso por causa do cadastro por
-- domínio, que saiu do produto. Resolve só isso: não instala a regra nova de
-- cadastro, que vem no schema.sql.
--
-- Cole no SQL Editor do Supabase e rode. Pode rodar mais de uma vez.
--
-- Não desliga trigger nenhum, de propósito: `alter table ... disable trigger`
-- exige ser dono da tabela, e nem todo projeto dá isso ao papel do editor. Em
-- vez de brigar com a proteção do perfil, usa a regra que ela já tem, a de que
-- quem é titular da organização é forçado a administrador e a acesso ligado.

-- 1. Onde você está, e como está. Rode e leia antes de seguir.
select o.nome            as empresa,
       o.dominio,
       p.email,
       p.papel,
       p.ativo,
       (o.dono_id = p.id) as e_titular
  from public.perfis p
  join public.organizacoes o on o.id = p.org_id
 order by o.nome, p.criado_em;

-- 2. Nenhum domínio reserva empresa.
update public.organizacoes
   set dominio = null, entrada_por_dominio = false
 where dominio is not null or entrada_por_dominio;

-- 3. Empresa sem administrador ativo passa a ter o perfil mais antigo como titular.
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

-- 4. Encostar na linha do titular basta: o trigger força admin e acesso ligado.
update public.perfis p
   set nome = p.nome
 where exists (select 1 from public.organizacoes o where o.dono_id = p.id);

-- 5. Confira. Você tem que aparecer como admin, ativo e titular.
select o.nome            as empresa,
       p.email,
       p.papel,
       p.ativo,
       (o.dono_id = p.id) as e_titular
  from public.perfis p
  join public.organizacoes o on o.id = p.org_id
 order by o.nome, p.criado_em;
