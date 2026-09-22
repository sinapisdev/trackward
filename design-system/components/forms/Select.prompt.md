One-sentence: the only dropdown in the system — chevron-down at the trailing edge, lime border on focus.

```jsx
<Select size="sm" options={["Situação","Atrasado","Travado","Em dia"]} />
<Select leading={<Avatar name="Leonardo" size="xs" />} options={["Leonardo","Ana","Mariana"]} value="Leonardo" />
```

Filter selects use `size="sm"` and show the filter's name as the resting label ("Situação", "Responsável", "Área").
