# UI kit — TrackWard app (desktop web)

Click-through recreation of the signed-in product, rebuilt from the supplied product art
(`uploads/01`–`uploads/15`). Open `index.html`; every route in the top bar works, plus the
detail routes reachable from inside the screens.

| Screen file | Source frame | Notes |
|---|---|---|
| `Overview.jsx` | 01-Visao-geral | Greeting, "Em movimento" folder stack, radar rail |
| `MyWork.jsx` | 04-Meu-trabalho | Queue grouped by urgency + floating task drawer |
| `Projects.jsx` | 02-Projetos | Folder trio + all-projects table |
| `Workspace.jsx` | 03-Workspace-do-projeto | Trilha, current checkpoint, tasks, track conversation |
| `Routines.jsx` | 05-Rotinas-por-area | Areas rail, routine rows with mini-trilhas |
| `RoutineOpen.jsx` | 06-Rotina-aberta | Open volta, approval, previous voltas |
| `Conversa.jsx` | 07-Conversa | Channels rail, messages, AI banner, track panel |
| `Proposals.jsx` | 08-Revisao-de-propostas-da-IA | Proposal queue + before/after confirmation |
| `Agenda.jsx` | 09-Agenda | Week grid, deadlines band, event panel |
| `Processes.jsx` | 10-Biblioteca-de-processos | Process library + template preview |
| `ProcessEditor.jsx` | 11-Editor-de-processos | Checkpoint editor with row-labelled fields |
| `Team.jsx` | 12-Equipe | Access requests, roles table, invite code |
| `Settings.jsx` | 13-Ajustes | Organisation, AI reading, appearance, external calendar |
| `CreateTrack.jsx` | 14-Criar-track | Track creation with live initial trilha |
| `TaskDetail.jsx` | 15-Detalhe-da-tarefa | Blocked task with dependency map |

`AppData.jsx` holds all mock content (Grupo Meridiano). `Shell.jsx` holds the two page
frames (`Content`, `SplitContent`) and the radar row helper.

Everything visual comes from the design-system components — the screens only compose them.
Screens are loaded by `../kit-boot.js`, which resolves `_ds_bundle.js` (or the component
sources when the bundle has not been compiled yet).
