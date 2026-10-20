#!/usr/bin/env bash
# Construiește aplicația (index.html din rădăcina repo-ului) din sursele din src/.
# Rulare: bash src/build.sh   (din rădăcina repo-ului sau din src/)
set -euo pipefail
cd "$(dirname "$0")"
for s in build2 dates consp evp ctrp ofp tabp qrp build; do python3 "$s.py"; done
cp index.html ../index.html
rm -f base2.html index.html
echo "Gata: index.html actualizat în rădăcina repo-ului."
