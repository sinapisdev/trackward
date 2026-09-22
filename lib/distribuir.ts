import { parecido } from './leitor'
import type { Area, Etapa, Fluxo, Item, Perfil, Processo } from './tipos'

/**
 * Quem deveria pegar cada tarefa sem dono.
 *
 * A empresa já disse isto de três jeitos diferentes, e nenhum deles é um palpite
 * da máquina sobre gente:
 *
 *   1. O processo. Cada tarefa do molde aponta para uma ÁREA, e a área tem
 *      responsável. Foi a empresa que escreveu isso, então é a evidência mais
 *      forte que existe aqui.
 *   2. O histórico. Quem entregou as tarefas parecidas antes. Não é preferência
 *      da máquina, é o que de fato aconteceu.
 *   3. A área da esteira. O mais fraco dos três, e serve de piso: melhor cair
 *      no responsável da área do que ficar sem ninguém.
 *
 * Duas regras que valem sempre:
 *
 * **Só preenche o que está vazio.** Tirar uma tarefa de quem já a tem é decisão
 * de gente, e nunca entra sozinha. A máquina não remaneja ninguém.
 *
 * **Entre dois candidatos parecidos, ganha quem tem menos na mão.** Sem isso a
 * distribuição empilharia tudo em quem trabalha mais, que é o contrário do que
 * se quer de uma distribuição.
 */

export type Palpite = {
  item: Item
  fluxo: Fluxo
  etapa: Etapa
  resp_id: string
  nome: string
  /** Em uma linha, por que esta pessoa. É o que a tela mostra. */
  porque: string
  /** 0 a 1. Abaixo de 0,35 não vale propor: é chute. */
  forca: number
  /** Quantas tarefas abertas essa pessoa já tem. */
  carga: number
}

const PISO = 0.35

/** Quantas tarefas abertas cada pessoa tem agora, para não empilhar em ninguém. */
function cargas(fluxos: Fluxo[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of fluxos) {
    if (f.concluido) continue
    const et = f.etapas[f.atual]
    if (!et) continue
    for (const i of et.itens) {
      if (i.feito || !i.resp_id) continue
      m.set(i.resp_id, (m.get(i.resp_id) ?? 0) + 1)
    }
  }
  return m
}

type Voto = { resp_id: string; forca: number; porque: string }

/** 1. O molde que a empresa desenhou aponta para a área, e a área tem responsável. */
function pelosProcessos(item: Item, fluxo: Fluxo, processos: Processo[], areas: Area[]): Voto | null {
  let melhor: { nota: number; area_id: string } | null = null
  for (const p of processos) {
    if (p.tipo !== fluxo.tipo) continue
    if (p.area_id && fluxo.area_id && p.area_id !== fluxo.area_id) continue
    for (const et of p.etapas) {
      for (const pi of et.itens) {
        if (!pi.area_id) continue
        const nota = parecido(item.texto, pi.texto)
        if (nota >= 0.5 && (!melhor || nota > melhor.nota)) melhor = { nota, area_id: pi.area_id }
      }
    }
  }
  if (!melhor) return null
  const area = areas.find((a) => a.id === melhor!.area_id)
  if (!area?.responsavel_id) return null
  return {
    resp_id: area.responsavel_id,
    forca: Math.min(0.95, 0.6 + melhor.nota * 0.35),
    porque: `o processo manda esta tarefa para ${area.nome}`,
  }
}

/** 2. Quem entregou as parecidas antes. O que aconteceu, não o que se supõe. */
function peloHistorico(item: Item, fluxo: Fluxo, fluxos: Fluxo[]): Voto | null {
  const conta = new Map<string, { n: number; exemplo: string }>()
  for (const f of fluxos) {
    const mesmaFrente = f.id === fluxo.id || (!!fluxo.area_id && f.area_id === fluxo.area_id)
    if (!mesmaFrente) continue
    for (const et of f.etapas) {
      for (const i of et.itens) {
        if (!i.feito || !i.resp_id || i.id === item.id) continue
        if (parecido(item.texto, i.texto) < 0.5) continue
        const atual = conta.get(i.resp_id)
        if (atual) atual.n++
        else conta.set(i.resp_id, { n: 1, exemplo: i.texto })
      }
    }
  }
  if (!conta.size) return null
  const [resp_id, { n, exemplo }] = [...conta.entries()].sort((a, b) => b[1].n - a[1].n)[0]
  return {
    resp_id,
    forca: Math.min(0.9, 0.5 + n * 0.15),
    porque: n === 1
      ? `foi quem entregou "${exemplo}"`
      : `entregou ${n} tarefas parecidas nesta frente`,
  }
}

/** 3. O piso: o responsável da área da esteira. */
function pelaArea(fluxo: Fluxo, areas: Area[]): Voto | null {
  const area = areas.find((a) => a.id === fluxo.area_id)
  if (!area?.responsavel_id) return null
  return {
    resp_id: area.responsavel_id,
    forca: 0.4,
    porque: `responde pela área ${area.nome}`,
  }
}

export function distribuir(
  fluxos: Fluxo[], processos: Processo[], areas: Area[], perfis: Perfil[],
): Palpite[] {
  const carga = cargas(fluxos)
  const ativo = new Map(perfis.filter((p) => p.ativo).map((p) => [p.id, p]))
  const saida: Palpite[] = []

  for (const f of fluxos) {
    if (f.concluido || f.travado_motivo) continue
    for (const et of f.etapas) {
      for (const item of et.itens) {
        // Só o que está vazio. Remanejar é decisão de gente.
        if (item.feito || item.resp_id) continue

        const votos = [
          pelosProcessos(item, f, processos, areas),
          peloHistorico(item, f, fluxos),
          pelaArea(f, areas),
        ].filter((v): v is Voto => !!v && ativo.has(v.resp_id))

        if (!votos.length) continue

        // Empatados na força, ganha quem tem menos na mão.
        votos.sort((a, b) =>
          b.forca - a.forca
          || (carga.get(a.resp_id) ?? 0) - (carga.get(b.resp_id) ?? 0))

        const [melhor, ...resto] = votos
        // Duas evidências apontando para a mesma pessoa é mais do que uma.
        const reforco = resto.some((v) => v.resp_id === melhor.resp_id) ? 0.1 : 0
        const forca = Math.min(0.98, melhor.forca + reforco)
        if (forca < PISO) continue

        saida.push({
          item, fluxo: f, etapa: et,
          resp_id: melhor.resp_id,
          nome: ativo.get(melhor.resp_id)!.nome,
          porque: melhor.porque,
          forca,
          carga: carga.get(melhor.resp_id) ?? 0,
        })
      }
    }
  }

  return saida.sort((a, b) => b.forca - a.forca)
}
