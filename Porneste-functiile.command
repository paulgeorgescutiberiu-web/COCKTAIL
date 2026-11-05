#!/bin/bash
# Pornește funcțiile Firebase ale aplicației: postările programate, Sofia live și emailul de luni.
# Dublu-clic pe fișier (sau în Terminal: bash Porneste-functiile.command). Cheile le lipești doar aici, în Terminal.
cd "$(dirname "$0")" || exit 1
echo ""
echo "=== Cocktail Philosophy · pornesc funcțiile Firebase ==="
echo "Înainte: proiectul cocktail-philosophy-dc34b trebuie să fie pe planul Blaze (Firebase Console → Upgrade)."
echo ""
if command -v firebase >/dev/null 2>&1; then
  FB="firebase"
elif command -v node >/dev/null 2>&1; then
  FB="npx -y firebase-tools@latest"
elif [ -f ./firebase-mac ]; then
  chmod +x ./firebase-mac; xattr -d com.apple.quarantine ./firebase-mac 2>/dev/null
  FB="./firebase-mac"   # Firebase CLI de sine stătător (nu cere Node.js); pe M1 poate cere o dată Rosetta → Instalează
else
  echo "Nu am găsit Node.js. Îl instalezi de pe nodejs.org (varianta LTS), apoi pornești din nou fișierul ăsta."
  open "https://nodejs.org/en/download" 2>/dev/null
  read -r -p "Apasă Enter ca să închizi." _; exit 1
fi
echo "1/4 · Conectare la contul Google al proiectului (se deschide browserul)…"
$FB login || { read -r -p "Conectarea nu a mers. Enter ca să închizi." _; exit 1; }

secret() { # $1 = nume, $2 = explicație
  if $FB functions:secrets:get "$1" --project cocktail-philosophy-dc34b >/dev/null 2>&1; then
    read -r -p "   $1 e deja salvat. Îl schimbi? (d/N) " r
    [ "$r" = "d" ] || [ "$r" = "D" ] || return 0
  fi
  echo "   $2"
  $FB functions:secrets:set "$1" --project cocktail-philosophy-dc34b
}
echo ""
echo "2/4 · Cheile (le lipești tu aici; nu se văd pe ecran și nu ajung nicăieri altundeva)"
secret GEMINI_API_KEY "Cheia Gemini: din aistudio.google.com → Get API key, pe proiectul cocktail-philosophy-dc34b."
secret GMAIL_USER "Adresa de Gmail de pe care pleacă emailul de luni (și la care vine)."
secret GMAIL_APP_PASSWORD "Parola de aplicație Gmail (16 litere): myaccount.google.com/apppasswords. Cere verificarea în 2 pași pornită."

echo ""
echo "3/4 · Pregătesc fișierele…"
if command -v npm >/dev/null 2>&1; then
  (cd functions && npm install --no-audit --no-fund >/dev/null 2>&1) || { echo "npm install nu a mers."; read -r -p "Enter ca să închizi." _; exit 1; }
fi

echo ""
echo "4/4 · Public funcțiile (2–5 minute; dacă întreabă ceva, răspunde y)…"
if $FB deploy --only functions --project cocktail-philosophy-dc34b --force; then
  echo ""
  echo "✓ Gata. Postările programate pleacă singure (verificare la 10 minute),"
  echo "  Sofia are voce live, iar emailul „Săptămâna ta” vine lunea la 07:20."
else
  echo ""
  echo "✗ Publicarea nu a mers. Fă o poză ultimelor rânduri de mai sus și trimite-o lui Claude."
fi
read -r -p "Apasă Enter ca să închizi." _
