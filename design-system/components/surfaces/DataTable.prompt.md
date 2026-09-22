One-sentence: TrackWard tables are lists, not grids — hairlines only, first column in white, everything else in --ink-1.

```jsx
<DataTable
  columns={[{key:"name",label:"Projeto",sortable:true,sorted:"desc"},{key:"cp",label:"Checkpoint atual"},{key:"who",label:"Responsável"},{key:"status",label:"Situação"},{key:"progress",label:"Progresso"},{key:"more",width:"44px",align:"right"}]}
  rows={[{name:"Proposta comercial",cp:"Revisão",who:<><Avatar name="Ana N" size="sm"/>Ana</>,status:<StatusPill status="late"/>,progress:<ProgressBar value={45} width={150}/>,more:<IconButton label="Mais"><Icon name="more-horizontal"/></IconButton>}]}
  footer={<><span>5 de 6 em andamento</span><TextLink underline={false}>Ver mais →</TextLink></>} />
```
