# Postări automate Instagram + Facebook

Sunt două drumuri, amândouă trimit la scenariul Make.com care publică pe Instagram și pe pagina de Facebook.

## 1. Din aplicație (cel obișnuit)
**Postare → 📷 Poză**: alegi poza, textul îl scrie AI-ul după poză (sau îl scrii tu), apoi:
- **Acum**: se publică în 1–2 minute;
- **Programează**: alegi ziua și ora; postarea apare la **📅 Programate** și o publică singură funcția
  `postariProgramate` (Firebase, la 10 minute), și cu telefonul închis. De acolo o poți șterge sau publica imediat.

**💡 Idei de postări**: idei pe luna curentă și pe cea următoare, plus **✨ Plan pe 4 săptămâni** făcut de AI după
evenimentele din calendar (ziua, ora, ce poză și textul complet). „Folosește” pune textul și ziua; tu alegi poza.

Instalarea, o singură dată: regulile noi din `src/reguli-firestore.txt` și publicarea funcțiilor (`functions/README.md`).

## 2. Din GitHub (postări pregătite de Claude)
- Claude pune fiecare postare aprobată de Paul în `social/coada/AAAA-LL-ZZ_HHMM_nume/` (`poza.jpg` + `text.txt`),
  de exemplu `2026-11-10_1930_petrecere-firma/`. Fără oră (`AAAA-LL-ZZ_nume`) se publică de la ora 10.
- Acțiunea GitHub „Postare social” rulează la fiecare 30 de minute și publică ce a ajuns la ora lui (ora României),
  apoi mută dosarul în `social/postate/`.
- Secret necesar în GitHub: `MAKE_WEBHOOK_URL` (adresa webhook-ului din Make).

## Idei gata scrise
`plan-noiembrie-decembrie-2026.md`: 13 postări până la Revelion, cu ziua, ora, poza și textul.
