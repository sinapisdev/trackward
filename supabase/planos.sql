-- ==========================================================================
-- TrackWard: ligar e mexer em plano de cliente.
--
-- Isto NÃO é parte do app: é a mesa de operação, e roda no SQL Editor do
-- Supabase, por você. O administrador do cliente não tem como trocar o próprio
-- plano de dentro do produto, de propósito: se pudesse, escolheria o maior.
--
-- Enquanto a cobrança for por contrato, o preço não aparece em tela nenhuma.
-- `paga_desde` e `obs_plano` existem só para a operação lembrar a quem cobrar,
-- e o app não lê nenhum dos dois.
--
-- Os planos: teste, reduzido, pessoal, equipe, interno. A definição de cada um
-- está em lib/planos.ts, e as recusas, na seção 30 do schema.sql.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 1. QUEM É QUEM. Rode primeiro, sempre, para pegar o id certo.
-- --------------------------------------------------------------------------
select
  o.id,
  o.nome,
  o.tipo,
  plano_em_vigor(o.id)                       as plano_agora,
  o.plano                                    as plano_gravado,
  o.teste_ate::date                          as teste_ate,
  assentos_usados(o.id)                      as pessoas_ativas,
  o.assentos                                 as assentos_contratados,
  o.limite_leituras                          as leituras_por_assento,
  o.paga_desde,
  o.obs_plano,
  (select p.email from perfis p where p.id = o.dono_id) as dono
from organizacoes o
order by o.criado_em desc;


-- --------------------------------------------------------------------------
-- 2. FECHOU ENTERPRISE. Troque o id, o número de assentos e a data.
--
--    `limite_leituras` aqui é POR ASSENTO ATIVO: com 120 e dez pessoas, a
--    empresa tem 1200 leituras no mês. Estourar não quebra nada, a leitura só
--    cai nas regras embutidas, então este número é degrau de plano e não porta.
-- --------------------------------------------------------------------------
-- update organizacoes set
--   plano = 'equipe',
--   assentos = 10,
--   limite_leituras = 120,
--   paga_desde = current_date,
--   obs_plano = 'Contrato assinado 25/09. Cobrança por assento, boleto dia 5.'
-- where id = 'PONHA_O_ID_AQUI';


-- --------------------------------------------------------------------------
-- 3. FECHOU PESSOAL.
--
--    Sem desconto, e com desconto, são o mesmo plano: o que muda é quanto você
--    cobra por fora. O app sabe se a pessoa tem direito ao desconto
--    (`desconto_do_pessoal()`), e avisa ELA no dia em que ele cai, porque a
--    cobrança é na mão e ninguém vai olhar isto todo mês.
-- --------------------------------------------------------------------------
-- update organizacoes set
--   plano = 'pessoal',
--   limite_leituras = 150,
--   paga_desde = current_date,
--   obs_plano = 'Com desconto de quem está na Construtora X.'
-- where id = 'PONHA_O_ID_AQUI';


-- --------------------------------------------------------------------------
-- 4. QUEM PERDEU O DESCONTO. Rode uma vez por mês, antes de faturar.
--
--    Lista os espaços pessoais pagos cujo dono NÃO está mais ativo em nenhuma
--    empresa cliente. A pessoa já foi avisada dentro do app; esta consulta é
--    para a cobrança ir junto.
-- --------------------------------------------------------------------------
select o.id, o.nome, p.email, o.paga_desde, o.obs_plano
from organizacoes o
join perfis p on p.org_id = o.id and p.ativo
where o.tipo = 'pessoal'
  and plano_em_vigor(o.id) = 'pessoal'
  and not exists (
    select 1 from perfis q join organizacoes e on e.id = q.org_id
    where q.user_id = p.user_id and q.ativo
      and e.tipo = 'equipe' and plano_em_vigor(e.id) in ('equipe','interno')
  )
  and o.obs_plano ilike '%desconto%';


-- --------------------------------------------------------------------------
-- 5. ESTICAR O TESTE. Para quando o cliente pediu mais uma semana.
-- --------------------------------------------------------------------------
-- update organizacoes set plano = 'teste', teste_ate = now() + interval '7 days'
-- where id = 'PONHA_O_ID_AQUI';


-- --------------------------------------------------------------------------
-- 6. QUANTO ESTE CLIENTE CUSTA DE IA NO MÊS, em dólares.
--
--    É o único custo que anda com o uso. Olhe antes de dar desconto, e olhe de
--    novo antes de mexer no teto de leituras de alguém.
-- --------------------------------------------------------------------------
select
  o.nome,
  plano_em_vigor(o.id)                          as plano,
  assentos_usados(o.id)                         as pessoas,
  count(c.id)                                   as leituras_no_mes,
  round(coalesce(sum(c.custo_micro), 0) / 1e6, 2) as custo_usd
from organizacoes o
left join consumo c on c.org_id = o.id and c.criado_em >= date_trunc('month', now())
group by o.id, o.nome
order by 5 desc;


-- --------------------------------------------------------------------------
-- 7. O QUE ESTÁ PARA VENCER. Rode na segunda de manhã.
-- --------------------------------------------------------------------------
select o.nome, o.tipo, o.teste_ate::date,
  (o.teste_ate::date - current_date) as dias,
  (select p.email from perfis p where p.id = o.dono_id) as dono
from organizacoes o
where o.plano = 'teste' and o.teste_ate is not null
order by o.teste_ate;
