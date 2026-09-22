'use client'

import { useEffect, useState } from 'react'
import * as lucide from 'lucide'

import '@/design-system/styles.css'
import {
  ActivityItem, AiBanner, Avatar, AvatarGroup, Badge, Breadcrumbs, Button,
  ChatMessage, Checkbox, CheckpointTrail, Chip, Composer, DataTable, Divider,
  Field, FolderCard, FolderStack, Icon, IconButton, InfoRow, Input, Kbd,
  ListRow, Logo, MetricStat, MobileHeader, MobileTabBar, PageHeader, Panel,
  ProgressBar, ProgressRing, ProposalDiff, ProposalItem, Radio, RadioCard,
  SectionHeader, SegmentedControl, Select, SideRail, StatusDot, StatusPill,
  Switch, Tabs, TaskRow, TextLink, Textarea, TopNav, WeekGrid,
} from '@/design-system'

// O Icon lê os glifos de window.lucide, que é como o sistema foi desenhado para
// rodar (ver design-system/components/core/Icon.jsx). Aqui o pacote vem do npm,
// em vez do CDN, para a vitrine abrir sem rede.
if (typeof window !== 'undefined') {
  ;(window as unknown as { lucide: unknown }).lucide = lucide
}

const PESSOAS = ['Leonardo E', 'Ana N', 'Mariana C', 'Bruno R']

const PASTAS = [
  { kicker: 'Projeto', title: 'Implantação do ERP', etapa: 'Cadastro', pct: 33 },
  { kicker: 'Projeto', title: 'Abertura da unidade', etapa: 'Validação', pct: 61 },
  { kicker: 'Rotina', title: 'Fechamento mensal', etapa: 'Conferência', pct: 80 },
]

function Secao({ id, titulo, resumo, children }: {
  id: string
  titulo: string
  resumo: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ display: 'grid', gap: 18, scrollMarginTop: 24 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="tw-kicker">{titulo}</span>
        <p style={{ color: 'var(--ink-2)', font: 'var(--type-meta)' }}>{resumo}</p>
      </div>
      <div style={{ display: 'grid', gap: 22 }}>{children}</div>
      <span style={{ height: 1, background: 'var(--border-hairline)' }} />
    </section>
  )
}

function Linha({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
      {children}
    </div>
  )
}

export default function Showcase() {
  // O Icon depende de window.lucide, que não existe no servidor. Desenhar só
  // depois de montar evita a divergência de hidratação.
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  const [aba, setAba] = useState('Trilha')
  const [segmento, setSegmento] = useState('Pastas')
  const [pasta, setPasta] = useState(1)
  const [area, setArea] = useState('Operações')
  const [importar, setImportar] = useState(true)
  const [conferir, setConferir] = useState(false)
  const [visibilidade, setVisibilidade] = useState('equipe')
  const [tipo, setTipo] = useState('projeto')
  const [comIa, setComIa] = useState(true)
  const [multi, setMulti] = useState(false)
  const [tarefaFeita, setTarefaFeita] = useState(false)

  if (!montado) return null

  return (
    <div
      data-ds="trackward"
      style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr' }}
    >
      <TopNav
        org="Grupo Meridiano"
        active="Visão geral"
        items={['Visão geral', { label: 'Meu trabalho', count: 5 }, 'Projetos', 'Rotinas', 'Processos']}
      />

      <main style={{ padding: 'var(--s-7) var(--gutter-page) var(--s-12)', display: 'grid', gap: 30, maxWidth: 'var(--content-max)', width: '100%' }}>
        <PageHeader
          kicker="Design system"
          title="TrackWard, peça por peça"
          subtitle="Os componentes do sistema desenhando com os tokens de verdade."
          actions={<TextLink href="/">Voltar ao app</TextLink>}
        />

        <Secao id="core" titulo="Core" resumo="Marca, ação, rótulo e glifo.">
          <Linha>
            <Logo size={22} />
            <Logo size={18} wordmark={false} />
          </Linha>
          <Linha>
            <Button iconRight={<Icon name="arrow-right" />}>Abrir track</Button>
            <Button variant="secondary" iconLeft={<Icon name="settings" />}>Ajustes</Button>
            <Button variant="quiet" size="sm">Executar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Excluir</Button>
            <Button disabled iconLeft={<Icon name="lock" />}>Concluir tarefa</Button>
          </Linha>
          <Linha>
            <IconButton label="Ajustes" active><Icon name="settings" /></IconButton>
            <IconButton label="Mais ações"><Icon name="more-horizontal" /></IconButton>
            <Badge>5</Badge>
            <Badge tone="accent">3</Badge>
            <Chip selected count={5}>Tudo</Chip>
            <Chip count={3}>Executar</Chip>
            <Kbd>/</Kbd>
            <TextLink href="#">Esqueci minha senha</TextLink>
          </Linha>
          <Linha>
            <Avatar name="Leonardo Esteves" size="md" />
            <AvatarGroup people={PESSOAS} max={3} />
            <Icon name="sparkles" size={18} color="var(--accent)" />
            <Icon name="lock" size={16} color="var(--ink-2)" />
          </Linha>
        </Secao>

        <Secao id="forms" titulo="Formulários" resumo="Rótulo em cima, estado sempre visível, motivo sempre escrito.">
          <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
            <Field label="E-mail"><Input placeholder="voce@empresa.com" /></Field>
            <Field label="Buscar">
              <Input leading={<Icon name="search" size={17} />} trailing={<Kbd>/</Kbd>} placeholder="Buscar tracks" />
            </Field>
            <Field label="Área" optional>
              <Select value={area} onChange={(e) => setArea(e.target.value)} options={['Operações', 'Financeiro']} />
            </Field>
            <Field label="Só passa quando">
              <Textarea defaultValue="Dados de clientes e fornecedores conferidos." />
            </Field>
          </div>
          <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <Checkbox checked={importar} onChange={(e) => setImportar(e.target.checked)} label="Importar clientes" />
            <Checkbox
              checked={conferir}
              onChange={(e) => setConferir(e.target.checked)}
              label="Conferir documentos"
              sublabel="Confira os documentos recebidos antes da validação."
            />
            <Radio checked={visibilidade === 'equipe'} onChange={() => setVisibilidade('equipe')} name="vis" label="Toda a equipe" />
            <Radio checked={visibilidade === 'so-eu'} onChange={() => setVisibilidade('so-eu')} name="vis" label="Só eu" />
            <Switch checked={comIa} onChange={(e) => setComIa(e.target.checked)} label="Ativar leitura com IA" />
            <Switch
              checked={multi}
              onChange={(e) => setMulti(e.target.checked)}
              label="Ativar mais de um negócio"
              sublabel="Separe a operação por empresa ou unidade."
            />
          </div>
          <Linha>
            <RadioCard
              checked={tipo === 'projeto'} onChange={() => setTipo('projeto')}
              name="tipo" radioSide="left" title="Projeto" description="Tem início e conclusão"
            />
            <RadioCard
              checked={tipo === 'rotina'} onChange={() => setTipo('rotina')}
              name="tipo" radioSide="left" title="Rotina" description="Repete dentro de uma área"
            />
          </Linha>
        </Secao>

        <Secao id="status" titulo="Situação e progresso" resumo="Cor é informação: atrasado, vence em breve, e nada além disso.">
          <Linha>
            <StatusPill status="late" />
            <StatusPill status="soon" />
            <StatusPill status="onTrack" />
            <StatusPill status="done" />
            <StatusPill status="todo" />
            <StatusPill status="blocked" variant="chip" label="Aguardando dependência" />
          </Linha>
          <Linha>
            <StatusDot tone="danger" /><span style={{ color: 'var(--danger-text)' }}>Atrasado</span>
            <StatusDot tone="warn" /><span style={{ color: 'var(--warn-text)' }}>Vence em breve</span>
            <StatusDot /><span style={{ color: 'var(--ink-2)' }}>Em dia</span>
          </Linha>
          <Linha>
            <MetricStat icon="alert-circle" tone="danger" value={2} label="Atrasadas" />
            <MetricStat icon="lock" value={1} label="Travada" />
            <MetricStat icon="clock" tone="warn" value={3} label="Vencem em breve" />
          </Linha>
          <Linha>
            <ProgressBar value={33} width={148} />
            <ProgressBar value={72} label width={220} />
            <ProgressRing value={33} />
          </Linha>
          <CheckpointTrail
            current={1}
            steps={[
              { label: 'Preparação', meta: 'Aprovado' },
              { label: 'Cadastro', meta: '1 de 3 tarefas' },
              { label: 'Validação', meta: 'Próximo' },
              { label: 'Entrega', meta: 'Final' },
            ]}
          />
        </Secao>

        <Secao id="surfaces" titulo="Superfícies" resumo="A pasta de vidro é o único ornamento. O que é trabalho vira linha, nunca card.">
          <SegmentedControl options={['Pastas', 'Lista']} value={segmento} onChange={setSegmento} />
          {segmento === 'Pastas' ? (
            <FolderStack
              items={PASTAS}
              active={pasta}
              onActiveChange={setPasta}
              render={(t, ativa) => (
                <FolderCard
                  kicker={t.kicker}
                  title={t.title}
                  dim={!ativa}
                  footer={<><span>1 de 3 tarefas prontas</span><AvatarGroup people={PESSOAS} size="sm" /></>}
                >
                  <StatusPill status="todo" label={t.etapa} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ font: 'var(--fw-bold) var(--fs-metric)/1 var(--font-display)', color: 'var(--ink-0)' }}>
                      {t.pct}%
                    </span>
                    <span style={{ color: 'var(--ink-2)', font: 'var(--type-meta)' }}>de progresso</span>
                  </div>
                </FolderCard>
              )}
            />
          ) : (
            <DataTable
              columns={[
                { key: 'name', label: 'Projeto', sortable: true, sorted: 'desc' },
                { key: 'cp', label: 'Checkpoint atual' },
                { key: 'who', label: 'Responsável' },
                { key: 'status', label: 'Situação' },
                { key: 'progress', label: 'Progresso' },
              ]}
              rows={PASTAS.map((t) => ({
                name: t.title,
                cp: t.etapa,
                who: <><Avatar name="Ana N" size="sm" />Ana</>,
                status: <StatusPill status={t.pct > 60 ? 'onTrack' : 'late'} />,
                progress: <ProgressBar value={t.pct} width={150} />,
              }))}
              footer={<><span>5 de 6 em andamento</span><TextLink underline={false}>Ver mais</TextLink></>}
            />
          )}
          <SectionHeader
            title="Aguardando você"
            count={5}
            action={<Button variant="ghost" size="sm" iconRight={<Icon name="arrow-right" size={16} />}>Ver tudo</Button>}
          />
          <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'minmax(0,1fr) var(--rail-w)', alignItems: 'start' }}>
            <div>
              <ListRow chevron leading={<Icon name="file-text" size={18} />} title="Conferir documentos" subtitle="Implantação do ERP" meta="Hoje" />
              <Divider inset={20} />
              <ListRow chevron leading={<Icon name="refresh-cw" size={18} />} title="Fechamento mensal" subtitle="Financeiro" meta="Amanhã" />
            </div>
            <Panel variant="rail" title="Radar da operação" actions={<IconButton label="Mais"><Icon name="more-horizontal" /></IconButton>}>
              <InfoRow icon="calendar" label="Prazo" value="Hoje" />
              <InfoRow icon="user" label="Responsável" value="Leonardo" />
              <InfoRow icon="lock" label="Visibilidade" value="Só quem eu escolher" />
            </Panel>
          </div>
        </Secao>

        <Secao id="nav" titulo="Navegação" resumo="Cromo fixo no computador, barra de abas no celular.">
          <Breadcrumbs items={['Rotinas', 'Financeiro', 'Fechamento mensal']} />
          <Tabs items={['Trilha', 'Conversa', 'Atividade']} active={aba} onChange={setAba} />
          <Tabs variant="underline" items={[{ label: 'Em andamento', count: 6 }, { label: 'Concluídos', count: 2 }]} active="Em andamento" />
          <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'var(--rail-w) minmax(0,1fr)', alignItems: 'start' }}>
            <SideRail
              active="Financeiro"
              header={<Input size="sm" leading={<Icon name="search" size={16} />} placeholder="Buscar área" />}
              groups={[{ items: [
                { label: 'Financeiro', icon: 'bar-chart-3', count: 3 },
                { label: 'Operações', icon: 'settings', count: 4 },
                { label: 'Comercial', icon: 'users', count: 2 },
              ] }]}
            />
            <div style={{ display: 'grid', gap: 14, maxWidth: 430, justifySelf: 'start' }}>
              <MobileHeader org="Grupo Meridiano" />
              <MobileTabBar
                active="Painel"
                items={[
                  { label: 'Painel', icon: 'home' },
                  { label: 'Você', icon: 'user', count: 5 },
                  { label: 'Conversa', icon: 'message-square' },
                  { label: 'Tracks', icon: 'folder' },
                  { label: 'Mais', icon: 'more-horizontal' },
                ]}
              />
            </div>
          </div>
        </Secao>

        <Secao id="work" titulo="Trabalho" resumo="A IA propõe e diz o que mudaria. Quem decide é a pessoa.">
          <AiBanner title="3 propostas aguardam revisão" subtitle="Tarefa, prazo e decisão" action="Revisar propostas" />
          <TaskRow
            title="Conferir documentos"
            description="Confira os documentos recebidos antes da validação."
            done={tarefaFeita}
            onToggle={(e) => setTarefaFeita(e.target.checked)}
            assignee="Leonardo E"
            assigneeLabel="Você"
            due="Hoje"
            action={<Button size="sm" onClick={() => setTarefaFeita(true)}>Concluir tarefa</Button>}
          />
          <TaskRow blocked title="Validar base" assignee="Mariana C" due="em 4 dias" />
          <Linha>
            <ProposalItem kind="Prazo" title="Revisar cadastros" meta="Amanhã para em 3 dias" selected />
            <ProposalDiff from="Amanhã" to="em 3 dias" />
          </Linha>
          <div style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
            <ChatMessage author="Ana" time="09:10">Preciso de mais dois dias para revisar os cadastros.</ChatMessage>
            <ChatMessage author="Mariana" time="09:14" quote={{ author: 'Leonardo', text: 'prepare a lista de documentos' }}>
              Vou organizar a lista ainda hoje.
            </ChatMessage>
            <Composer placeholder="Escreva no canal..." />
          </div>
          <div style={{ display: 'grid', gap: 2, maxWidth: 620 }}>
            <ActivityItem who="Mariana" action="concluiu" target="Importar clientes" time="há 12 min" />
            <ActivityItem who="Você" action="concluiu" target="Revisar fechamento" time="há 5 min" />
          </div>
        </Secao>

        <Secao id="agenda" titulo="Agenda" resumo="Compromisso fechado entra como ocupação, sem título e sem local.">
          <WeekGrid
            days={[
              { label: 'Seg', date: 21 },
              { label: 'Ter', date: 22, today: true },
              { label: 'Qua', date: 23 },
              { label: 'Qui', date: 24 },
              { label: 'Sex', date: 25 },
            ]}
            hours={[8, 9, 10, 11, 12]}
            deadlines={[{ day: 1, title: 'Conferir documentos' }]}
            events={[
              { id: 'a', day: 1, start: 10.5, end: 11.5, title: 'Reunião de implantação', time: '10:30 até 11:30' },
              { day: 0, start: 11, end: 12, title: 'Ocupado', time: '11:00 até 12:00', kind: 'busy' },
            ]}
            activeEvent="a"
          />
        </Secao>
      </main>
    </div>
  )
}
