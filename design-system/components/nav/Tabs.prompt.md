One-sentence: pill tabs switch what a page *shows*; underline tabs filter a list and carry counts.

```jsx
<Tabs items={["Trilha","Conversa","Atividade"]} active="Trilha" onChange={setTab} />
<Tabs variant="underline" items={[{label:"Em andamento",count:6},{label:"Concluídos",count:2}]} active="Em andamento" />
```
