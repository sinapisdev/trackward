One-sentence: every track, routine volta, process template and task detail shows its position as a trilha — reach for this before any other progress affordance.

```jsx
<CheckpointTrail
  steps={[{label:"Preparação",meta:"Aprovado"},{label:"Cadastro",meta:"1 de 3 tarefas"},{label:"Validação",meta:"Próximo"},{label:"Entrega",meta:"Final"}]}
  current={1} />

<CheckpointTrail orientation="vertical" current={1}
  steps={[{label:"Preparação",meta:"Operações · dia 2"},{label:"Cadastro",meta:"Operações · dia 5"}]} />
```

Horizontal in page headers and on cards; vertical in right-hand context panels and the process editor. The lime segment stops at the current node — never colour the whole line.
