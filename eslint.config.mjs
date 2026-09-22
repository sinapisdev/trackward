import { readFileSync } from 'node:fs'
import tsParser from '@typescript-eslint/parser'

/* Lint do projeto.
 *
 * Só existe uma coisa sendo checada aqui: a aderência ao design system. As regras
 * não foram escritas à mão, vieram do export do Claude Design e vivem em
 * design-system/aderencia.eslint.json, que é o arquivo a trocar quando o sistema
 * for reexportado.
 *
 * O que elas cobram:
 *   - importar o sistema pelo barril '@/design-system', nunca por dentro dele;
 *   - não escrever cor, medida nem família de fonte crua onde existe token;
 *   - passar em cada componente só as props que o contrato dele declara.
 *
 * De propósito, nada disso vale para o resto do app. As telas de `componentes/`,
 * `lib/` e `app/(app)/` são anteriores ao design system, seguem a linguagem visual
 * do `app/globals.css` e não estão sendo migradas. Ligar as regras nelas encheria
 * a saída de aviso sobre código que ninguém pediu para mudar.
 */

const aderencia = JSON.parse(
  readFileSync(new URL('./design-system/aderencia.eslint.json', import.meta.url), 'utf8'),
)

const semImportarPorDentro = ['error', { patterns: [{
  group: aderencia.importacao.grupos,
  message: aderencia.importacao.mensagem,
}] }]

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'next-env.d.ts',
      // A pasta de referência é material congelado: as telas de exemplo do
      // export, guardadas para consulta visual, não código deste projeto a
      // manter. Cobrar aderência nelas só encheria a saída de aviso.
      'design-system/referencia/**',
    ],
  },

  {
    // Quem consome o design system responde pelo contrato inteiro.
    files: ['app/design-system/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': semImportarPorDentro,
      'no-restricted-syntax': ['warn', ...aderencia.valorCru, ...aderencia.contratoDeProps],
    },
  },

  {
    // Os componentes do sistema são as primitivas: é neles que a medida e a cor
    // cruas nascem, antes de virarem token. Cobrar valor cru aqui seria cobrar
    // que o sistema se defina em termos de si mesmo. O contrato de props continua.
    files: ['design-system/components/**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': semImportarPorDentro,
      'no-restricted-syntax': ['warn', ...aderencia.contratoDeProps],
    },
  },

  {
    // O barril é o único lugar que pode alcançar o interior do sistema.
    files: ['design-system/index.js'],
    rules: { 'no-restricted-imports': 'off' },
  },
]
