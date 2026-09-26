#!/bin/bash
# Escreve as chaves no .env.local, sem você precisar achar o arquivo.
# O que você digitar fica só neste computador: eu não leio nada daqui.
cd "$(dirname "$0")" || exit 1

pega() { printf '\n  %s\n' "$1"; printf '  > '; read -r RESP; }

echo
echo "  ── Ligar o TrackWard no Supabase ──"
pega "1) Project URL  (Project Settings > API). Parece com https://xxxx.supabase.co"; URL="${RESP// /}"
pega "2) Chave anon public / publishable key  (mesma tela)"; ANON="${RESP// /}"
pega "3) Chave service_role  (mesma tela, a secreta). Enter pula."; SERVICO="${RESP// /}"
echo

[ -z "$URL" ] || [ -z "$ANON" ] && { echo "  Faltou a URL ou a chave anon. Rode de novo."; exit 1; }
case "$URL" in
  https://*.supabase.co) ;;
  postgres*|*"@"*) echo "  Isso é o endereço de conexão do banco, não a Project URL."
                   echo "  A Project URL é curta e termina em .supabase.co"; exit 1;;
  *) echo "  A URL precisa começar com https:// e terminar em .supabase.co"; exit 1;;
esac
case "$ANON" in
  sb_secret_*|service_role*) echo "  Essa é a chave secreta, não a publishable. Rode de novo."; exit 1;;
esac

# Os dois segredos do servidor são gerados aqui: não são seus, são do app.
# Se já existirem, ficam como estão, porque trocar cega o que já foi guardado.
guardado() { grep "^$1=" .env.local 2>/dev/null | cut -d= -f2-; }
SEGREDO=$(guardado TRACK_SEGREDO);      [ -z "$SEGREDO" ] && SEGREDO=$(openssl rand -base64 48 | tr -d '\n')
RELOGIO=$(guardado TRACK_AVISOS_SEGREDO); [ -z "$RELOGIO" ] && RELOGIO=$(openssl rand -base64 32 | tr -d '\n')

cat > .env.local <<EOF
# Ligado no Supabase. Este arquivo nunca sai deste computador.
NEXT_PUBLIC_SUPABASE_URL=$URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON

# A chave mestra do banco. Ignora todas as regras de privacidade, então ela só
# existe aqui e nas variáveis da Vercel. Nunca em NEXT_PUBLIC_, nunca no git.
SUPABASE_SERVICE_ROLE=$SERVICO

# Cifra as chaves de API que cada pessoa cola em Conectores.
# Trocar este valor cega todas as chaves já guardadas.
TRACK_SEGREDO=$SEGREDO

# Autoriza o relógio a chamar /api/avisar e /api/pulso.
TRACK_AVISOS_SEGREDO=$RELOGIO
EOF

echo "  Pronto. Escrito em $(pwd)/.env.local"
echo "  URL ${#URL} caracteres, anon ${#ANON}, service_role ${#SERVICO}."
[ -z "$SERVICO" ] && echo "  Sem a service_role o pulso não roda. Dá para acrescentar depois."
echo
