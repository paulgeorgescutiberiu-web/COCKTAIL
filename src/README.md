# Sursele aplicației Cocktail Philosophy

Aplicația publicată (`/index.html`) e un singur fișier, construit din sursele de aici.

## Cum se construiește

```bash
bash src/build.sh
```

Pașii, în ordine: `build2` → `dates` → `consp` → `evp` → `ctrp` → `ofp` → `tabp` → `qrp` → `retp` → `build`.
Fiecare pas citește `base2.html`, inserează o parte a aplicației și îl scrie la loc; `build.py` adaugă
Firebase (`boot.js`) și produce `index.html`, care se copiază în rădăcina repo-ului.

## Ce e în fiecare fișier

| Fișier | Ce conține |
|---|---|
| `base.html` | Rețetarul și evenimentele (baza aplicației) |
| `boot.js` | Conectarea la Firebase, autentificarea, salvarea și arhiva săptămânilor |
| `stoc.js`, `stoc.css` | Stocul din depozit, facturi, inventar, comanda la furnizor, AI |
| `cons.js` | Consumația și Excelul de consum pe eveniment |
| `evnou.js` | „Eveniment nou”, editarea fișei, săptămâni anterioare |
| `contracte.js` | Contracte, portalul clientului, plăți, rentabilitate, notițe, postare Instagram |
| `oferte.js` | Ofertele și meniurile |
| `qr.js` | QR-ul de la bar, cererile de ofertă, pagina publică `bar.html` |
| `reguli-firestore.txt` | Regulile de securitate Firebase (se pun manual în consolă) |

Pagini separate, în rădăcină: `portal.html` (portalul clientului) și `bar.html` (pagina invitaților de la bar).
