One-sentence: anything that *contains* work is drawn as a folder; anything that *is* work is a row.

```jsx
<FolderCard kicker="Projeto" title="Implantação do ERP"
  footer={<><span>1 de 3 tarefas prontas</span><AvatarGroup people={["Leonardo E","Ana N","Mariana C"]} size="sm" /></>}>
  <StatusPill status="todo" label="Cadastro" />
  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
    <span style={{font:"var(--fw-bold) var(--fs-metric)/1 var(--font-display)",color:"var(--ink-0)"}}>33%</span>
    <span style={{color:"var(--ink-2)",font:"var(--type-meta)"}}>de progresso</span>
  </div>
</FolderCard>
```

Never put a folder card on a light surface and never fill it with lime — the glass gradient is the whole point.
