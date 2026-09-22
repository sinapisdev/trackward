# Design system TrackWard, dentro da Esteira

Este é o design system que veio do Claude Design, triado e encaixado no projeto.
Ele **não é a linguagem visual do app**. O app continua com a dele, a do
`app/globals.css`: Urbanist, fundo off-white quente, laranja como acento. Este aqui
é escuro, com Figtree e acento lima, e existe como sistema de peças para desenhar e
prototipar, não como skin das telas que já rodam.

As duas coisas convivem sem se tocar porque todo token daqui desce de
`[data-ds="trackward"]`, nunca de `:root`. É isso que impede a colisão real que
existiria: `--r-lg`, `--warn` e `--r-sm` têm o mesmo nome nos dois lados e valores
diferentes.

## Como usar num componente

```jsx
import { Button, Icon, StatusPill } from '@/design-system'
import '@/design-system/styles.css'

<div data-ds="trackward">
  <StatusPill status="late" />
  <Button iconRight={<Icon name="arrow-right" />}>Abrir track</Button>
</div>
```

Três regras, e o lint cobra as três:

1. **Importe pelo barril** `@/design-system`, nunca por dentro de `components/`.
2. **O atributo `data-ds="trackward"` precisa estar num pai.** Sem ele os
   componentes desenham sem token nenhum, porque as variáveis não existem fora
   desse escopo.
3. **`window.lucide` precisa estar de pé antes da primeira pintura.** O `Icon` lê
   os glifos de lá (ver `components/core/Icon.jsx`). Em `app/design-system/Showcase.tsx`
   isso é feito com o pacote `lucide` do npm, para não depender de rede.

Como o `Icon` só enxerga `window`, componente que use design system não desenha no
servidor. A vitrine resolve isso esperando montar antes de desenhar.

## O que tem aqui

| Caminho | O que é |
|---|---|
| `DESIGN.md` | A especificação completa: cor, tipo, layout, movimento, voz, iconografia. **Fonte da verdade dos tokens.** |
| `styles.css` | Entrada única, só `@import`. É este arquivo que a aplicação importa. |
| `tokens/` | `fonts`, `colors`, `typography`, `spacing`, `radius`, `elevation`, `motion`, `base`. |
| `assets/` | Logo e símbolo, em versão clara e em versão tinta. |
| `components/` | 50 componentes em 48 arquivos, divididos em core, forms, status, surfaces, nav, work e agenda. |
| `index.js` / `index.d.ts` | O barril. O único caminho público de importação. |
| `aderencia.eslint.json` | As regras de aderência, consumidas pelo `eslint.config.mjs` da raiz. |
| `referencia/` | As páginas de referência visual: fundamentos, componentes e telas inteiras. |
| `ds-boot.js` | Só serve às páginas de referência. Compila as fontes de `components/` no navegador. |

Cada componente carrega `<Nome>.d.ts`, que é o contrato de props, e
`<Nome>.prompt.md`, que diz quando usar e como escrever o texto dentro dele. Leia o
`.prompt.md` antes de compor tela: ele guarda a regra de uso que a prop sozinha não
conta, do tipo "um botão lima por tela, e só".

## A vitrine

`npm run dev` e abra `/design-system`. É uma rota fora do grupo `(app)`: não tem
Shell, não tem TabBar, não entra na navegação e não pede login.

## As páginas de referência

```bash
npm run ds:referencia
```

e abra `http://localhost:4321/referencia/`.

Elas precisam de servidor porque montam os componentes buscando os `.jsx` de
`components/`. Abrir por `file://` não funciona: o navegador barra a leitura dos
arquivos vizinhos. Um servidor estático qualquer serve, o script só evita ter que
lembrar disso.

## O que ficou de fora do export

O bundle compilado (`_ds_bundle.js`), o manifesto e as miniaturas eram artefato da
ferramenta: o bundle era uma cópia gerada de cada componente, e manter as duas
versões do mesmo código é o começo de elas divergirem. Quem resolve o namespace das
páginas de referência agora é o `ds-boot.js`, compilando as fontes.

Os 19 PNG de `uploads/` também não entraram: eram a arte original de onde o sistema
foi derivado, 23 MB de imagem que o repositório não precisa carregar. A especificação
inteira que saiu deles está em `DESIGN.md`.

## Duas substituições que o sistema declara

Estão escritas no `DESIGN.md` e valem repetir, porque são os únicos pontos em que
ele é aproximação e não cópia:

- **Tipografia.** A arte original usa uma geométrica da família Circular / Google Sans.
  Não veio binário de fonte, então entrou a **Figtree**, do Google Fonts.
- **Ícones.** Não veio conjunto de ícones, só o logo. Os glifos batem com o
  **Lucide**, e é ele que está no lugar.
