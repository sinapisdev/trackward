# TrackWard — Design System

TrackWard is a Portuguese-language (pt-BR) **work-tracking product for small and mid-sized
operations**. Its premise: work is either a **projeto** (has a start and an end) or a
**rotina** (repeats inside an area), and both are run as a **track** — an ordered trail of
**checkpoints** ("trilha") where each checkpoint only passes when a stated criterion is met
and a named person approves. Around that spine sit a personal queue (*Meu trabalho*),
channel conversation with an AI that *proposes* changes for a human to confirm, a process
library (reusable track templates), a calendar, team/roles and settings.

Tagline: **move work forward.** Footer signature: *Trabalho que avança.*
Sample tenant used throughout the art: **Grupo Meridiano** (Leonardo, Ana, Mariana, Bruno).

## Sources this system was built from

Everything here was derived from material supplied by the user in `uploads/`:

- `uploads/TrackWard_Logo.svg` — the only real brand asset (two bars + open lime ring + wordmark).
- `uploads/01-Visao-geral.png` … `uploads/19-Mobile.png` — 19 full-resolution product frames
  (visão geral, projetos, workspace do projeto, meu trabalho, rotinas por área, rotina aberta,
  conversa, revisão de propostas da IA, agenda, biblioteca de processos, editor de processos,
  equipe, ajustes, criar track, detalhe da tarefa, entrar, criar conta, recuperar acesso, mobile).

**No codebase, Figma file or font binaries were provided.** Colours were sampled pixel-by-pixel
from the frames; spacing, type sizes and radii were measured against the 1586px-wide art.
Two substitutions are flagged below (typeface, icon set) — they are the only places where this
system is an approximation rather than a copy.

## Index

| Path | What it is |
|---|---|
| `styles.css` | The single entry point consumers link. `@import`s only. |
| `tokens/` | `fonts`, `colors`, `typography`, `spacing`, `radius`, `elevation`, `motion`, `base`. |
| `assets/` | `logo.svg` (white wordmark, dark UI), `logo-ink.svg` (dark wordmark, light ground), `mark.svg` / `mark-ink.svg` (symbol only). |
| `components/core/` | Logo, Button, IconButton, Badge, Chip, Avatar + AvatarGroup, TextLink, Kbd, Divider, Icon. |
| `components/forms/` | Field, Input, Textarea, Select, Checkbox, Radio, RadioCard, Switch. |
| `components/status/` | StatusDot, StatusPill, ProgressBar, ProgressRing, MetricStat, **CheckpointTrail**. |
| `components/surfaces/` | FolderCard, FolderStack, PageHeader, SectionHeader, Panel, DataTable, ListRow, InfoRow. |
| `components/nav/` | TopNav, Tabs, SegmentedControl, Breadcrumbs, SideRail, AppFooter, MobileTabBar, MobileHeader. |
| `components/work/` | TaskRow, ActivityItem, ChatMessage, Composer, AiBanner, ProposalItem, ProposalDiff. |
| `components/agenda/` | WeekGrid + EventBlock. |
| `ui_kits/app/` | 15-screen click-through recreation of the desktop product. |
| `ui_kits/auth/` | Entrar · Criar conta · Recuperar acesso. |
| `ui_kits/mobile/` | 430×932 mobile painel. |
| `templates/app-screen/` | Starting-point template consuming projects can copy: top bar + page header + trilha + table + context rail. |
| `guidelines/*.card.html` | Foundation specimen cards (colours, type, spacing, elevation, brand, iconography). |
| `ds-boot.js`, `ui_kits/kit-boot.js` | Preview bootstrappers for the cards and kits (not part of the design language). |
| `SKILL.md` | Agent-Skills entry point. |

Each component directory carries `<Name>.d.ts` (props contract) and `<Name>.prompt.md`
(one-line "what & when", usage snippet, variants) plus one `@dsCard` HTML that renders its
states. Read the `.prompt.md` files before composing screens — they carry the usage rules
that the props alone don't express.

### Intentional additions

- **Icon** — a thin Lucide wrapper. The source art has no icon component, but every screen
  needs one entry point for glyphs; this keeps stroke weight and sizing consistent.
- **NotInSource** (mobile kit only) — a disclaimer screen for mobile tabs that were never
  designed. It is deliberately not a product surface.

---

## CONTENT FUNDAMENTALS

**Language.** Brazilian Portuguese throughout the product. The only English in the system is
the brand tagline, *move work forward.* — it is a logotype-adjacent asset, never translated
and never used as UI copy.

**Person.** The product speaks to *você* and labels the user's own things in the first person:
"**Meu** trabalho", "**Minha** agenda externa", "**Sua** fila", "**Sua** conta", "**Sua** trilha
inicial". Rows that belong to the reader say **Você** where another person's name would go
("Responsável: Você"). The product never says "we" except when explaining what the system did:
"**Importamos** apenas livre ou ocupado", "**Enviamos** por e-mail".

**Casing.** Sentence case everywhere — titles, buttons, table headers, tabs. Only the small
type-label kickers are uppercase, and they are tracked out (`--type-kicker`, .16em):
`SUA FILA`, `PROJETO`, `CHECKPOINT 2 DE 4`. No Title Case, ever.

**Titles are short and human.** "Bom dia, Leonardo." · "Meu trabalho" · "Rotinas" · "Processos"
· "Da conversa para a execução" · "Criar track" · "Bem-vindo de volta." · "Como você quer
começar?" Note the full stops on greeting-style titles ("Bom dia, Leonardo.", "Bem-vindo de
volta.") and their absence on nouns ("Agenda", "Equipe").

**Every page carries a one-sentence subtitle that states the page's promise:**
"A operação que continua." (Rotinas) · "Descreva o caminho. Reutilize na próxima execução."
(Processos) · "5 pendências. Um próximo passo de cada vez." (Meu trabalho) · "Compromissos e
prazos no mesmo lugar." (Agenda) · "Seu espaço, sua operação." (Ajustes) · "Defina o trabalho.
Depois, desenhe a trilha." (Criar track). Two short clauses beat one long one.

**Buttons are infinitive verb phrases:** Abrir track · Criar · Concluir tarefa · Marcar como
feita · Aprovar saída · Aprovar e fechar volta · Usar processo · Salvar processo · Copiar código
· Enviar link de recuperação · Criar e abrir trilha. Never "OK", never "Enviar" alone, never
gerunds.

**Status vocabulary is fixed and gendered to its subject.** Atrasado/Atrasada · Travado/Travada
· Vence em breve · Vence hoje · Em dia · Concluída · A fazer · Pendente · Aguardando
dependência · Em andamento. Dates are relative and lowercase: *Hoje, Amanhã, ontem, há 2 dias,
há 12 min, em 3 dias, em 4 dias, Prazo amanhã*.

**Counts are spelled into the sentence, not implied:** "8 projetos · 2 precisam de atenção",
"3 rotinas · 1 atrasada", "3 pessoas com acesso · 1 aguardando liberação", "4 checkpoints ·
8 tarefas", "1 de 3 tarefas prontas", "5 de 6 em andamento", "12 blocos de ocupação
importados". The middle dot `·` is the standard separator; the red fragment inside such a
line is the part that needs attention.

**Blocking is explained, never just shown.** Every disabled action is paired with the reason
and the person: "Conclua as 2 tarefas restantes para aprovar." · "Disponível quando Mariana
concluir a revisão." · "Aguardando Mariana concluir a revisão." · "Esta tarefa depende da
conclusão da tarefa abaixo, em outra track."

**The AI always asks.** Its copy pattern is: what it found, what it would change, who decides.
"3 propostas aguardam revisão" / "Tarefa, prazo e decisão" / "A IA sugere. Você decide." /
"O que será alterado: somente o prazo desta tarefa." / "Alterações de prazo sempre precisam de
confirmação." / "Prazos e travas sempre exigem confirmação." / "Nenhuma alteração foi aplicada."
Never "A IA atualizou…" as a fait accompli.

**Activity is past tense, third person, with a relative timestamp:** "Mariana concluiu Importar
clientes · há 12 min" · "Leonardo aprovou Preparação · ontem" · "Você concluiu Revisar
fechamento · há 5 min".

**Placeholders are examples, not restated labels:** "voce@empresa.com" · "Como podemos chamar
você?" · "Nome da sua equipe" · "Buscar na minha fila" · "Buscar tracks" · "Escreva uma
mensagem..." · "Escreva no canal...".

**Privacy and permission copy is plain and complete:** "Participar de uma tarefa ou aprovação
também dá acesso." · "Para outras pessoas, aparece apenas *Ocupado*." · "Título, local e
descrição não aparecem." · "Quem entrar com este código receberá o papel definido acima." ·
"Vale para você neste navegador."

**No emoji. No exclamation marks. No jokes, no cheerleading, no "Oops".** The tone is a calm
operations manager: factual, short, never dramatic even when something is late. Ellipses appear
only inside input placeholders.

---

## VISUAL FOUNDATIONS

### Colour

A single-accent dark system. The page is near-black (`#0A0B0A`), chrome one step up
(`#0E1011`), and everything else is built from **white at 4–20% alpha** rather than new greys.
One saturated brand colour — **lime `#D0FA3C`** (the logo ring is the slightly brighter
`#B7FF1A`) — and it is rationed: the *one* action that moves work forward, the *current*
checkpoint, the AI sparkle, the "today" dot, focus rings, text selection. Two or more lime
buttons on a screen is a bug.

> **The app raised this floor on 24/09/2026.** `app/globals.css` uses graphite
> (`#16191A`) instead of `#0A0B0A`, and a grey (`#E9EBE7`) instead of near-white in
> light mode. Pure black mirrors the room on a real screen and makes white text
> bloom at the edges; pure white panels on near-white ground separate nothing.
> This file stays as the measured spec of the artwork; the app is the one that
> diverged, on purpose, and says so in its own comments. The showcase at
> `/design-system` still renders the values below.


Semantics are narrow and always paired with words: red `#FF4B4B` / text `#FF5A5A` for
atrasado, amber `#FFB224` / text `#FFA81E` for vence em breve, neutral grey `#A9ADB3` for
em dia, a lock glyph (no colour) for travado. Ink runs white → `#D4D7D8` (body) → `#9EA2A4`
(labels) → `#74797B` (meta) → `#4A4E50` (borders only). Light mode exists in the product's
Aparência setting but was not documented in the art: `[data-theme="light"]` in
`tokens/colors.css` is a flagged inference, not a specification.

### Type

One geometric grotesque, four weights, tight tracking on anything large. Sizes measured from
the art: display 44px (greeting), page title 40px, section h2 28px, panel h3 22px, folder card
title 24px, body 15px, message body 17px, control labels 14px, meta 13px, kicker 11px, progress
metric 34px. Tracking tightens as size grows (-.022em at display, 0 at body) and opens
dramatically for invite codes (.34em). Line-height is 1.04–1.16 for headings, 1.5 for body.

> **Substitution — flagged.** No font binaries were supplied. The art shows a Circular /
> Google Sans-class geometric sans (double-storey *a*, single-storey *g*, near-circular bowls,
> tall x-height). **Figtree** (Google Fonts) ships as the stand-in, loaded by
> `tokens/fonts.css`. Swap the `@import` and `--font-sans` when the licensed family arrives.

### Layout

Fixed chrome, fluid middle: 66px top bar (logo · org switcher · routes · search · people ·
settings · avatar), 34px page gutters, a 296px left rail only on Rotinas and Conversa, a 456px
right context rail on detail screens, 54px footer. Rails are separated by 1px hairlines, never
by a change of background. Content maxes at 1520px. Rows are 56–58px. Tap targets on mobile are
44px minimum; the mobile product keeps every desktop capability and reaches it through a
five-stop tab bar.

Hierarchy comes from **space and hairlines**, not boxes: a page is a vertical stack of
sections, each opened by a heading and closed by a 1px rule at 8% white. The only real "cards"
are the glass folders.

### The folder — the system's one piece of ornament

Containers of work (projeto, área, rotina, processo) are drawn as a **glass folder**: a tab
clipped at 84% with an angled right edge, an 18px-radius body filled with a 158° gradient
(`#2B2F2F → #1A1E1E → #141717`), a 1px inner light at 7% white, `backdrop-filter: blur(18px)`
and a deep soft shadow (`0 26px 60px -28px rgba(0,0,0,.9)`). On the home screen three or five
of them form a shallow carousel: the focused folder sits forward at scale 1 with two ghost
sheets behind it, neighbours drop to 0.86/0.74 scale and 55%/25% opacity with `saturate(.6)`.
Anything that *is* work — a task, a pendência, a process — is a row, never a card.

### Borders, radii, shadows

Borders are 1px white at 8% (hairline) or 12% (default); `#2A2F30` only where a border must
read on a light-ish surface. Radii: 999px pills for every button, chip, badge and avatar; 10px
fields; 14px inline panels and banners; 18px folders and drawers; 6px checkboxes and kbd caps.
Elevation is used sparingly and always dark-and-soft — rows have none, inline cards get
`--sh-card`, folders `--sh-folder`, the floating task sheet `--sh-drawer` plus two stacked
ghost sheets behind it, hover popovers `--sh-pop`. Lime buttons carry a faint glow
(`0 10px 30px -18px`), never a hard ring.

### Transparency, blur and imagery

Transparency is structural, not decorative: 4% white for hover, 8–12% for hairlines, 5% +
18px blur for folder glass, 72% black scrim behind drawers. **There is no photography and no
illustration anywhere in the product art** — no hero images, no empty-state drawings, no
patterns, no gradients beyond the folder's own graphite one. If a surface needs to feel richer,
it gets a folder, not an image. Do not add stock imagery to this brand.

### Motion

Quick and mechanical. 120ms for hover/press, 180ms for toggles and tabs, 280ms for the folder
carousel and progress fills, ~420ms for panels entering; one curve,
`cubic-bezier(.22,.61,.36,1)`, with a spring reserved for the folder stack. Progress bars and
rings animate their fill; the trilha's lime segment grows to the current node. Nothing bounces,
nothing fades in on scroll, nothing parallaxes. `prefers-reduced-motion` collapses every
duration to 1ms.

### Interaction states

- **Hover** — background lifts by 4–6% white; text goes from `--ink-1`/`--ink-2` to white;
  icon buttons fill; secondary buttons brighten their border; the lime button goes to
  `--lime-400`. Never a colour change on the surface itself.
- **Press** — a 0.985 scale-down plus `--lime-700` on the primary button. No ripples.
- **Selected / active** — a raised fill (`--n-800`) for nav and tabs, a 2px lime inset bar on
  the left edge of an active list row, a full white 1px border on a chosen RadioCard, a 2px
  white underline on an underline tab.
- **Focus** — 1px lime border plus a 3px lime wash at 14%; never the browser default.
- **Disabled** — stays visible: `--n-850` fill, `--ink-3` text, a lock icon when the block is
  a dependency, and a sentence next to it explaining what would unblock it.
- **Checked** — white fill with a near-black check (checkbox); white track with a near-black
  knob (switch, on) vs grey track with a white knob (off).

### Density

Comfortable, not airy: 20/24px inside cards and panels, 12–16px between a label and its
control, 26px between page sections, 14px between chips. Tables breathe through row height
rather than padding, and every column header is 13px `--ink-2`.

---

## ICONOGRAPHY

**System.** Outline icons on a 24px grid, ~1.75px stroke, round caps and joins, no fills, no
duotone, no icon backgrounds except the 44px rounded-square containers on AI proposal rows and
the 56–74px outlined circles on the auth screens. Sizes: 16px in meta text, 17–20px in rows and
controls, 22–24px in stat blocks and empty states.

> **Substitution — flagged.** The uploads contain no icon font, sprite or SVG set — only the
> logo. The glyph shapes in the frames match **Lucide** (same grid, weight and terminals), so
> the system standardises on `lucide@0.454.0` from CDN, wrapped by `components/core/Icon.jsx`,
> which renders Lucide's icon data as React SVG (no DOM-mutating `createIcons`). If TrackWard
> actually ships its own set, drop it into `assets/icons/` and repoint `Icon`.

**Vocabulary in use** (Lucide names): search, settings, users, user, plus, arrow-right,
arrow-left, arrow-up, arrow-down, chevron-left/right/down, more-horizontal, check,
check-circle-2, circle, lock, clock, alert-circle, refresh-cw (rotinas), calendar,
calendar-days, file-text (processos/tarefas), folder, sparkles (AI), send, at-sign, eye,
eye-off, key, mail, trash-2, reply, filter, pencil, square-pen, shield-check, log-out, home,
message-square, bar-chart-3, list, info, x, target.

**Meaning is stable:** `refresh-cw` = rotina/volta · `file-text` = processo or task document ·
`lock` = travado/dependency/private · `clock` = deadline · `alert-circle` = atrasado ·
`sparkles` = AI proposal · `shield-check` = a guarantee about permissions · `#` (a text
character, not an icon) = channel. **Emoji are never used.** The only non-icon glyphs are the
typographic `·` separator, `#` for channels, `→` inside some link labels and `—` for
"not applicable" in tables.

**Brand assets.** `assets/logo.svg` is the supplied lockup recoloured white for dark UI;
`logo-ink.svg` is the original ink version for light grounds; `mark.svg` / `mark-ink.svg` are
the symbol alone. The mark is two completed checkpoints and one open lime one — that is the
whole brand idea. Do not redraw, re-space, rotate or recolour it beyond these variants, and do
not set the wordmark in any face other than the UI family.
