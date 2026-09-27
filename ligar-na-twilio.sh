#!/bin/bash
# Guarda as chaves da Twilio no .env.local, para eu poder diagnosticar e
# configurar o WhatsApp daqui. O que você digitar fica só neste computador,
# num arquivo que o git ignora. Eu não leio o valor: uso e mostro só o tamanho.
cd "$(dirname "$0")" || exit 1

pega() { printf '\n  %s\n' "$1"; printf '  > '; read -r RESP; }

echo
echo "  ── Ligar o TrackWard na Twilio ──"
echo "  As duas ficam na página inicial do console, no quadro Account Info."
pega "1) Account SID  (começa com AC)"; SID="${RESP// /}"
pega "2) Auth Token   (o botão 'Show' revela)"; TOKEN="${RESP// /}"
echo

[ -z "$SID" ] || [ -z "$TOKEN" ] && { echo "  Faltou uma das duas. Rode de novo."; exit 1; }
case "$SID" in AC*) ;; *) echo "  O Account SID começa com AC. Confira se não trocou com o token."; exit 1;; esac

# Tira as linhas antigas, se existirem, e põe as novas no fim.
grep -v '^TWILIO_SID=' .env.local 2>/dev/null | grep -v '^TWILIO_TOKEN=' > .env.local.novo
{
  echo ""
  echo "# Conta da Twilio, para diagnóstico e configuração do WhatsApp."
  echo "# O token manda mensagem e gasta dinheiro: se um dia vazar, rotacione"
  echo "# no console, em Account > API keys & tokens."
  echo "TWILIO_SID=$SID"
  echo "TWILIO_TOKEN=$TOKEN"
} >> .env.local.novo
mv .env.local.novo .env.local

echo "  Pronto. SID com ${#SID} caracteres, token com ${#TOKEN}."
echo "  Agora é só me dizer 'pronto' que eu olho o resto daqui."
echo
