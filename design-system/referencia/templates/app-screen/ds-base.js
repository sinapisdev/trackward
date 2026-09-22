// Carrega este design system dentro do template. `base` aponta para a raiz de
// `design-system/` a partir desta pasta: uma linha só para editar se o template
// for copiado para outro lugar.
//
// O bundle compilado (_ds_bundle.js) não entrou no projeto: era uma cópia gerada
// de cada componente. Quem resolve o namespace agora é ds-boot.js, que compila as
// fontes de `components/` no navegador. O runtime do template (support.js) fica
// esperando o global aparecer e redesenha sozinho quando ele chega.
(() => {
  const base = '../../..';

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = base + '/styles.css';
  document.head.appendChild(link);

  // Duas coisas precisam estar na página antes do DSBoot: o Babel, porque o
  // ds-boot compila os .jsx no navegador, e o lucide, de onde o Icon tira os
  // glifos. O support.js só busca o Babel quando ele mesmo precisa, e isso é
  // tarde demais para nós.
  const load = (src) => new Promise((ok, falhou) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => falhou(new Error('ds-base.js: não carregou ' + src));
    document.head.appendChild(s);
  });

  Promise.all([
    load('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js'),
    load('https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js'),
    load(base + '/ds-boot.js'),
  ])
    .then(() => window.DSBoot())
    .catch((e) => console.error(e));
})();
