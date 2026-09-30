/**
 * O que aparece entre clicar e a tela chegar.
 *
 * Não existia, e a falta custava duas coisas de uma vez.
 *
 * A primeira é o que se vê: sem ela, o Next segura a tela ANTIGA até a nova
 * ficar pronta. Você toca em Tracks, nada muda, e a impressão é de app travado.
 * O tempo era o mesmo de antes; o que faltava era dizer que alguma coisa estava
 * acontecendo.
 *
 * A segunda é o que não se vê, e é a que pesa mais: no Next 16, rota dinâmica
 * **sem fronteira de carregamento não é pré-carregada**. Todas as rotas daqui
 * são dinâmicas, porque o layout lê cookie para saber quem entrou, então o
 * prefetch do `<Link>` não estava fazendo nada. Existindo esta tela, ele volta a
 * funcionar: o Next busca o pedaço enquanto a pessoa ainda está lendo a tela
 * anterior, e o clique passa a ter o que mostrar na hora.
 *
 * Ela é de propósito genérica. Um esqueleto por tela seria mais bonito e seria
 * uma segunda cópia do layout de cada uma, que envelhece sozinha e um dia
 * mostra a forma de uma tela que já mudou.
 */
export default function Carregando() {
  return (
    <div className="carregando" aria-busy="true" aria-live="polite">
      <span className="sr-so">Carregando</span>
      <div className="skel" style={{ height: 30, width: '34%' }} />
      <div className="skel" style={{ height: 15, width: '58%' }} />
      <div className="cg-blocos">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="skel" key={i} style={{ height: 58 }} />
        ))}
      </div>
    </div>
  )
}
