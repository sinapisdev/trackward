One-sentence: only two screens have a left rail — Rotinas (areas) and Conversa (channels); both put a search field in `header`.

```jsx
<SideRail active="Financeiro"
  header={<Input size="sm" leading={<Icon name="search" size={16} />} placeholder="Buscar área" />}
  groups={[{items:[{label:"Financeiro",icon:"bar-chart-3",count:3},{label:"Operações",icon:"settings",count:4}]}]} />
```
