One-sentence: wraps every control with its label; `layout="row"` reproduces the process editor's 224px label column.

```jsx
<Field label="E-mail"><Input placeholder="voce@empresa.com" /></Field>
<Field label="Área" optional layout="row"><Select value="Operações" options={["Operações","Financeiro"]} /></Field>
```

Hints are one short sentence in --ink-3, no period-less fragments: "Participar de uma tarefa ou aprovação também dá acesso."
