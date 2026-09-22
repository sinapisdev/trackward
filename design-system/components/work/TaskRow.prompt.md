One-sentence: the row inside a checkpoint; only the task you can act on now carries the lime button.

```jsx
<TaskRow title="Conferir documentos" description="Confira os documentos recebidos antes da validação."
  assignee="Leonardo E" assigneeLabel="Você" due="Hoje"
  action={<Button size="sm">Concluir tarefa</Button>} />
<TaskRow blocked title="Validar base" assignee="Mariana C" due="em 4 dias" />
```
