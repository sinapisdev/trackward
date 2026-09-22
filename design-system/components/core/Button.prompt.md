One-sentence: use exactly one lime `primary` per view — the single action that advances the track — and `secondary`/`quiet` for everything else.

```jsx
<Button iconRight={<Icon name="arrow-right" />}>Abrir track</Button>
<Button variant="secondary" iconLeft={<Icon name="settings" />}>Ajustes</Button>
<Button variant="quiet" size="sm">Executar</Button>
<Button disabled iconLeft={<Icon name="lock" />}>Concluir tarefa</Button>
```

Copy is an imperative verb phrase in pt-BR, sentence case: "Abrir track", "Criar e abrir trilha", "Aprovar e fechar volta". Blocked actions stay visible and disabled with a lock icon plus a one-line reason next to them — never hidden.
