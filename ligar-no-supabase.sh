#!/bin/bash
# Escreve as chaves do Supabase no .env.local, sem você precisar achar o arquivo.
# O que você digitar fica só neste computador.
cd "$(dirname "$0")" || exit 1

echo
echo "  Cole a Project URL do Supabase (https://xxxx.supabase.co)"
read -r -p "  > " URL
echo
echo "  Cole a chave anon public (eyJ... ou sb_publishable_...)"
read -r -p "  > " CHAVE
echo

URL="${URL// /}"; CHAVE="${CHAVE// /}"
[ -z "$URL" ] || [ -z "$CHAVE" ] && { echo "  Faltou uma das duas. Rode de novo."; exit 1; }
case "$URL" in https://*) ;; *) echo "  A URL precisa começar com https://"; exit 1;; esac

SEGREDO=$(grep '^TRACK_SEGREDO=' .env.local 2>/dev/null | cut -d= -f2-)
[ -z "$SEGREDO" ] && SEGREDO=$(openssl rand -base64 48 | tr -d '\n')

cat > .env.local <<EOF
# Ligado no Supabase. Este arquivo nunca sai deste computador.
NEXT_PUBLIC_SUPABASE_URL=$URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$CHAVE

# Cifra as chaves de API que cada pessoa cola em Conectores.
# Trocar este valor cega todas as chaves já guardadas.
TRACK_SEGREDO=$SEGREDO
EOF

echo "  Pronto. Escrito em $(pwd)/.env.local"
echo "  URL com ${#URL} caracteres, chave com ${#CHAVE}, segredo mantido."
echo
