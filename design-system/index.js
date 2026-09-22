/* Ponto único de entrada do design system TrackWard.

   Importe sempre daqui, nunca de dentro de components/: o caminho interno muda
   quando o sistema é reexportado, este não. A regra está escrita na config de
   lint em .oxlintrc.json, na raiz do projeto.

       import { Button, Icon } from '@/design-system'

   Os componentes precisam de dois contextos para desenhar certo:
   - os tokens, que vivem em styles.css e descem de [data-ds="trackward"];
   - window.lucide, de onde o Icon tira os glifos (ver README.md).
*/

// Core: marca, ação, rótulo e glifo
export * from './components/core/Avatar'
export * from './components/core/Badge'
export * from './components/core/Button'
export * from './components/core/Chip'
export * from './components/core/Divider'
export * from './components/core/Icon'
export * from './components/core/IconButton'
export * from './components/core/Kbd'
export * from './components/core/Logo'
export * from './components/core/TextLink'

// Formulários
export * from './components/forms/Checkbox'
export * from './components/forms/Field'
export * from './components/forms/Input'
export * from './components/forms/Radio'
export * from './components/forms/RadioCard'
export * from './components/forms/Select'
export * from './components/forms/Switch'
export * from './components/forms/Textarea'

// Situação e progresso
export * from './components/status/CheckpointTrail'
export * from './components/status/MetricStat'
export * from './components/status/ProgressBar'
export * from './components/status/ProgressRing'
export * from './components/status/StatusDot'
export * from './components/status/StatusPill'

// Superfícies: pastas, painéis, listas e tabela
export * from './components/surfaces/DataTable'
export * from './components/surfaces/FolderCard'
export * from './components/surfaces/FolderStack'
export * from './components/surfaces/InfoRow'
export * from './components/surfaces/ListRow'
export * from './components/surfaces/PageHeader'
export * from './components/surfaces/Panel'
export * from './components/surfaces/SectionHeader'

// Navegação
export * from './components/nav/AppFooter'
export * from './components/nav/Breadcrumbs'
export * from './components/nav/MobileHeader'
export * from './components/nav/MobileTabBar'
export * from './components/nav/SegmentedControl'
export * from './components/nav/SideRail'
export * from './components/nav/Tabs'
export * from './components/nav/TopNav'

// Trabalho: tarefa, atividade, conversa e propostas da IA
export * from './components/work/ActivityItem'
export * from './components/work/AiBanner'
export * from './components/work/ChatMessage'
export * from './components/work/Composer'
export * from './components/work/ProposalDiff'
export * from './components/work/ProposalItem'
export * from './components/work/TaskRow'

// Agenda
export * from './components/agenda/WeekGrid'
