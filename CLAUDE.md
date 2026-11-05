# Cocktail Philosophy: ghid pentru Claude

Repo-ul lui Paul (Cocktail Philosophy, bar mobil la evenimente, Sibiu). Vorbește cu Paul **în română**, simplu, fără jargon tehnic.
Textele din aplicații și mesajele de commit sunt tot în română.

## Ce aplicații sunt aici

| Ce spune Paul | Fișierul publicat | Sursele |
|---|---|---|
| **Aplicația** / „app evenimente” / rețetarul / contracte / stoc / Sofia | `index.html` (construit, NU se editează direct) | `src/` (vezi `src/README.md`) |
| Portalul clientului („Evenimentul tău”) | `portal.html` | direct în fișier |
| Pagina de la bar (QR, invitații) | `bar.html` | direct în fișier |
| Taskuri (notițe rapide, sincronizate prin Firebase) | `taskuri.html` | direct în fișier |
| Trading SpaceX (SPCX) | `trading.html` | `tools/trading/` |
| Site-ul nou (cocktailphilosophy.ro) | `site-nou/` | prețurile în `site-nou/preturi.js` |
| Postări Instagram + Facebook | din aplicație sau `social/coada/` | `social/README.md` |
| Emailul de luni „Săptămâna ta” | GitHub Actions | `tools/rezumat/`, `src/cp-core.js` |
| Serverul Firebase (Sofia Live, postări programate) | `functions/` | `functions/README.md` |

## Aplicația de evenimente (`index.html`)

- Un singur fișier HTML, **construit** din `src/`: după orice modificare în `src/` rulează `bash src/build.sh`
  (sau `npm run build`) și urcă și `index.html`. Testul `tests/build.test.js` pică dacă `index.html` nu e reconstruit.
- Unde e fiecare parte (evenimente, contracte, oferte, stoc, consum, raport, echipă, QR, Sofia): tabelul din `src/README.md`.
  Pe scurt: `src/base.html` = rețetarul și evenimentele, `src/evnou.js` = eveniment nou / fișa evenimentului,
  `src/contracte.js` = contracte, portal, plăți, postări, `src/boot.js` = Firebase și salvarea.
- Fiecare `src/*p.py` e un pas de construire care inserează un `.js` în aplicație; un fișier `.js` nou are nevoie de pasul lui în `build.sh`.
- Date: Firebase, proiectul `cocktail-philosophy-dc34b` (Firestore: `.../contracte`, `.../privat/*`, `.../config/evenimente`, `barLead`, `portal`, `socialCoada`, `bar/info`).
- Regulile Firestore: `src/reguli-firestore.txt`. **Paul le pune manual** în Firebase Console; dacă le schimbi, spune-i clar.
- Funcțiile din `functions/` le publică Paul de pe Mac (`firebase deploy --only functions`); dacă le schimbi, spune-i.

## Teste

```bash
npm ci && npm test
```

Rulează testele înainte de push. Pe GitHub rulează singure (`.github/workflows/verificare.yml`).

## Cum lucrăm

- Modificări mici și la obiect; nu rescrie părți care merg.
- La final explică-i lui Paul pe scurt ce s-a schimbat și ce are de făcut el (reguli Firestore, deploy funcții), dacă e cazul.
- Idei de revenit pentru site: `docs/idei-site.md`.
