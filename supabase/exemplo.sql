-- ==========================================================================
-- Dados de exemplo (opcional)
-- Rode depois de criar sua conta no app, para ver as telas cheias.
-- Tudo fica no seu nome, porque as outras pessoas só existem quando se
-- cadastram. Para apagar tudo depois, use o bloco do fim do arquivo.
-- ==========================================================================

create or replace function pg_temp.mk_fluxo(
  p_tipo text, p_nome text, p_area uuid, p_eu uuid,
  p_freq text default null, p_periodo text default null, p_atual int default 0
) returns uuid language sql as $$
  insert into public.fluxos (tipo, nome, area_id, dono_id, autor_id, freq, periodo, atual)
  values (p_tipo, p_nome, p_area, p_eu, p_eu, p_freq, p_periodo, p_atual)
  returning id;
$$;

create or replace function pg_temp.mk_etapa(
  p_fluxo uuid, p_ordem int, p_nome text, p_criterio text, p_eu uuid, p_prazo date
) returns uuid language sql as $$
  insert into public.etapas (fluxo_id, ordem, nome, criterio, aprovador_id, prazo)
  values (p_fluxo, p_ordem, p_nome, p_criterio, p_eu, p_prazo)
  returning id;
$$;

create or replace function pg_temp.mk_item(
  p_etapa uuid, p_texto text, p_eu uuid, p_prazo date, p_feito boolean
) returns void language sql as $$
  insert into public.itens (etapa_id, fluxo_id, texto, resp_id, prazo, feito, autor_id, ordem)
  select p_etapa, e.fluxo_id, p_texto, p_eu, p_prazo, p_feito, p_eu,
         (select count(*) from public.itens where etapa_id = p_etapa)
  from public.etapas e where e.id = p_etapa;
$$;

do $$
declare
  eu uuid; fin uuid; eng uuid; inc uuid; cml uuid; f uuid; e uuid; hoje date := current_date;
begin
  select id into eu from public.perfis order by criado_em limit 1;
  if eu is null then
    raise exception 'Crie sua conta no app antes de rodar este arquivo.';
  end if;

  insert into public.areas (nome, cor, ordem) values ('Financeiro',    '#0F8B8D', 0) returning id into fin;
  insert into public.areas (nome, cor, ordem) values ('Engenharia',    '#C4561C', 1) returning id into eng;
  insert into public.areas (nome, cor, ordem) values ('Incorporação',  '#3451D1', 2) returning id into inc;
  insert into public.areas (nome, cor, ordem) values ('Comercial',     '#B8407A', 3) returning id into cml;

  -- ----- Financeiro -----
  f := pg_temp.mk_fluxo('ciclo', 'Fechamento mensal', fin, eu, 'mensal', to_char(hoje, 'Mon/YY'), 1);
  e := pg_temp.mk_etapa(f, 0, 'Lançamentos', 'Despesas e receitas do mês lançadas', eu, hoje - 3);
  perform pg_temp.mk_item(e, 'Lançar notas das obras', eu, hoje - 4, true);
  e := pg_temp.mk_etapa(f, 1, 'Conciliação', 'Saldo do sistema igual ao extrato', eu, hoje + 1);
  perform pg_temp.mk_item(e, 'Conferir extrato da conta das obras', eu, hoje, false);
  perform pg_temp.mk_item(e, 'Conciliar cartão corporativo', eu, hoje + 1, false);
  e := pg_temp.mk_etapa(f, 2, 'Relatórios', 'DRE e fluxo de caixa emitidos', eu, hoje + 6);
  e := pg_temp.mk_etapa(f, 3, 'Fechamento', 'Competência travada', eu, hoje + 9);

  f := pg_temp.mk_fluxo('ciclo', 'Contas a pagar', fin, eu, 'semanal', 'Semana ' || to_char(hoje, 'IW'), 0);
  e := pg_temp.mk_etapa(f, 0, 'Recebimento', 'Boletos conferidos com pedidos', eu, hoje - 1);
  perform pg_temp.mk_item(e, 'Separar boletos da semana', eu, hoje - 1, false);
  e := pg_temp.mk_etapa(f, 1, 'Aprovação', 'Pagamentos aprovados', eu, hoje + 1);
  e := pg_temp.mk_etapa(f, 2, 'Pagamento', 'Pagamentos agendados e comprovados', eu, hoje + 3);
  insert into public.historico (fluxo_id, periodo, situacao) values
    (f, 'Semana ' || to_char(hoje - 21, 'IW'), 'ok'),
    (f, 'Semana ' || to_char(hoje - 14, 'IW'), 'late'),
    (f, 'Semana ' || to_char(hoje - 7,  'IW'), 'ok');

  f := pg_temp.mk_fluxo('esteira', 'Implantação do sistema financeiro', fin, eu, null, null, 2);
  e := pg_temp.mk_etapa(f, 0, 'Diagnóstico', 'Processos atuais mapeados', eu, hoje - 40);
  e := pg_temp.mk_etapa(f, 1, 'Escolha', 'Ferramenta contratada', eu, hoje - 20);
  e := pg_temp.mk_etapa(f, 2, 'Configuração', 'Sistema configurado e testado com dados reais', eu, hoje + 16);
  perform pg_temp.mk_item(e, 'Plano de contas', eu, hoje - 8, true);
  perform pg_temp.mk_item(e, 'Cadastro de fornecedores', eu, hoje + 2, false);
  perform pg_temp.mk_item(e, 'Teste com o mês passado', eu, hoje + 12, false);
  e := pg_temp.mk_etapa(f, 3, 'Migração', 'Dados importados e conferidos', eu, hoje + 30);
  e := pg_temp.mk_etapa(f, 4, 'Treinamento', 'Equipe operando sem apoio', eu, hoje + 44);
  e := pg_temp.mk_etapa(f, 5, 'Go-live', 'Sistema antigo desligado', eu, hoje + 58);

  -- ----- Engenharia -----
  f := pg_temp.mk_fluxo('esteira', 'Ed. Dona Kika, obra', eng, eu, null, null, 2);
  e := pg_temp.mk_etapa(f, 0, 'Fundação', 'Fundação executada e laudada', eu, hoje - 180);
  e := pg_temp.mk_etapa(f, 1, 'Estrutura', 'Estrutura concluída e liberada', eu, hoje - 60);
  e := pg_temp.mk_etapa(f, 2, 'Alvenaria', 'Vedações concluídas', eu, hoje + 21);
  perform pg_temp.mk_item(e, 'Alvenaria do 3º pavimento', eu, hoje + 5, false);
  perform pg_temp.mk_item(e, 'Contramarcos', eu, hoje + 14, false);
  e := pg_temp.mk_etapa(f, 3, 'Instalações', 'Instalações testadas', eu, hoje + 80);
  e := pg_temp.mk_etapa(f, 4, 'Acabamento', 'Unidades prontas para vistoria', eu, hoje + 140);
  e := pg_temp.mk_etapa(f, 5, 'Entrega', 'Habite-se emitido e chaves entregues', eu, hoje + 200);

  f := pg_temp.mk_fluxo('ciclo', 'Medição de obra', eng, eu, 'quinzenal', 'Quinzena ' || to_char(hoje, 'WW'), 0);
  e := pg_temp.mk_etapa(f, 0, 'Campo', 'Serviços executados levantados', eu, hoje + 2);
  perform pg_temp.mk_item(e, 'Levantar serviços da quinzena', eu, hoje + 2, false);
  e := pg_temp.mk_etapa(f, 1, 'Planilha', 'Medição consolidada', eu, hoje + 5);
  e := pg_temp.mk_etapa(f, 2, 'Aprovação', 'Medição aprovada para pagamento', eu, hoje + 7);

  -- ----- Incorporação -----
  f := pg_temp.mk_fluxo('esteira', 'Hospital Popular', inc, eu, null, null, 3);
  update public.fluxos set travado_motivo = 'Aguardando retorno da Associação', travado_desde = hoje - 12 where id = f;
  e := pg_temp.mk_etapa(f, 0, 'Terreno', 'Condições de aquisição definidas', eu, hoje - 150);
  e := pg_temp.mk_etapa(f, 1, 'Viabilidade', 'Estudo aprovado pelos sócios', eu, hoje - 100);
  e := pg_temp.mk_etapa(f, 2, 'Projetos', 'Projetos legais completos', eu, hoje - 40);
  e := pg_temp.mk_etapa(f, 3, 'Aprovações', 'Alvará emitido', eu, hoje + 25);
  perform pg_temp.mk_item(e, 'Protocolo na prefeitura', eu, hoje - 5, true);
  perform pg_temp.mk_item(e, 'Anuência do corpo de bombeiros', eu, hoje + 10, false);
  e := pg_temp.mk_etapa(f, 4, 'Lançamento', 'Vendas abertas', eu, hoje + 90);
  e := pg_temp.mk_etapa(f, 5, 'Obra', 'Obra concluída', eu, hoje + 400);
  e := pg_temp.mk_etapa(f, 6, 'Entrega', 'Habite-se e chaves entregues', eu, hoje + 500);

  f := pg_temp.mk_fluxo('esteira', 'Terreno Vila Rita', inc, eu, null, null, 1);
  e := pg_temp.mk_etapa(f, 0, 'Terreno', 'Condições de aquisição definidas', eu, hoje - 10);
  e := pg_temp.mk_etapa(f, 1, 'Viabilidade', 'Estudo aprovado pelos sócios', eu, hoje + 2);
  perform pg_temp.mk_item(e, 'Levantamento planialtimétrico', eu, hoje - 2, false);
  perform pg_temp.mk_item(e, 'Estudo de massa', eu, hoje + 2, false);
  e := pg_temp.mk_etapa(f, 2, 'Projetos', 'Projetos legais completos', eu, hoje + 60);
  e := pg_temp.mk_etapa(f, 3, 'Aprovações', 'Alvará emitido', eu, hoje + 120);

  -- ----- Comercial -----
  f := pg_temp.mk_fluxo('esteira', 'AVLE', cml, eu, null, null, 1);
  e := pg_temp.mk_etapa(f, 0, 'Conceito', 'Proposta de valor definida', eu, hoje - 30);
  e := pg_temp.mk_etapa(f, 1, 'Modelo de negócio', 'Modelo validado financeira e juridicamente', eu, hoje + 12);
  perform pg_temp.mk_item(e, 'Planilha de projeção', eu, hoje + 4, false);
  insert into public.itens (etapa_id, fluxo_id, texto, resp_id, prazo, feito, priv, autor_id, ordem)
  values (e, f, 'Conversar com o contador sobre o enquadramento', eu, hoje + 6, false, true, eu, 1);
  e := pg_temp.mk_etapa(f, 2, 'Marca', 'Identidade aprovada', eu, hoje + 45);
  e := pg_temp.mk_etapa(f, 3, 'Piloto', 'Primeiros clientes atendidos', eu, hoje + 90);
  e := pg_temp.mk_etapa(f, 4, 'Lançamento', 'Operação aberta ao público', eu, hoje + 120);

  f := pg_temp.mk_fluxo('ciclo', 'Relatório de vendas', cml, eu, 'semanal', 'Semana ' || to_char(hoje, 'IW'), 2);
  e := pg_temp.mk_etapa(f, 0, 'Coleta', 'Números do CRM exportados', eu, hoje + 1);
  e := pg_temp.mk_etapa(f, 1, 'Análise', 'Comparativo com a semana anterior pronto', eu, hoje + 2);
  e := pg_temp.mk_etapa(f, 2, 'Envio', 'Relatório enviado aos sócios', eu, hoje + 3);
  perform pg_temp.mk_item(e, 'Enviar para os sócios', eu, hoje + 3, false);
  insert into public.historico (fluxo_id, periodo, situacao) values
    (f, 'Semana ' || to_char(hoje - 28, 'IW'), 'ok'),
    (f, 'Semana ' || to_char(hoje - 21, 'IW'), 'ok'),
    (f, 'Semana ' || to_char(hoje - 14, 'IW'), 'late'),
    (f, 'Semana ' || to_char(hoje - 7,  'IW'), 'ok');

  raise notice 'Exemplo carregado. Atualize a página do app.';
end $$;

-- --------------------------------------------------------------------------
-- Para apagar o exemplo e começar do zero, rode só as três linhas abaixo:
--
-- delete from public.fluxos;
-- delete from public.areas;
-- (perfis e logins continuam como estão)
-- --------------------------------------------------------------------------
