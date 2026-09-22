One-sentence: the only calendar surface — task deadlines ride in the "Prazos" band, imported external busy time is hatched and titleless.

```jsx
<WeekGrid
  days={[{label:"Seg",date:21},{label:"Ter",date:22,today:true},{label:"Qua",date:23}]}
  deadlines={[{day:1,title:"Conferir documentos"}]}
  events={[{id:"a",day:1,start:10.5,end:11.5,title:"Reunião de implantação",time:"10:30 – 11:30"},
           {day:0,start:11,end:12,title:"Ocupado",time:"11:00 – 12:00",kind:"busy"}]}
  activeEvent="a" onEventClick={open} />
```

The selected block gets a 2px lime top edge. Privacy copy that must travel with this view: "Importamos apenas livre ou ocupado."
