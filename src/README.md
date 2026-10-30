# Sursele aplicației Cocktail Philosophy

Aplicația publicată (`/index.html`) e un singur fișier, construit din sursele de aici.

## Cum se construiește

```bash
bash src/build.sh
```

Pașii, în ordine: `build2` → `dates` → `consp` → `evp` → `ctrp` → `ofp` → `tabp` → `qrp` → `retp` → `rapp` → `syncp` → `extrap` → `calp` → `vocep` → `meniup` → `build`.
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
| `raport.js` | Raportul lunar și plata barmanilor |
| `disp.js` | Echipa: disponibilitatea barmanilor și confirmarea evenimentelor |
| `qr.js` | QR-ul de la bar, cererile de ofertă, pagina publică `bar.html` |
| `voce.js` | Sofia, asistentul vocal în română: ascultă, întreabă Gemini (cu funcții pentru rețete, evenimente, stoc, contracte, încasări, disponibilitate; „adaugă un eveniment” salvează contractul, îl pune în calendarul Google și PDF-ul în Drive) și răspunde cu voce |
| `meniu.js` | Aducerea rețetarului la Meniul 2026 de pe site, o singură dată (rețetele au și câmpurile pentru meniul clienților) |
| `reguli-firestore.txt` | Regulile de securitate Firebase (se pun manual în consolă) |

Pagini separate, în rădăcină: `portal.html` (portalul clientului) și `bar.html` (pagina invitaților de la bar).

## Ce e comun cu site-ul (`site-nou/`)

- **Meniul**: rețetarul din aplicație e singura listă. Ajunge public în `bar/info` (Firestore), de unde îl citesc pagina Meniu de pe site, portalul clientului și pagina de la bar.
- **Prețurile**: `site-nou/preturi.js`. Îl citesc pagina Oferte, calculatorul vechi de pe WordPress și aplicația (pus în `index.html` la construire).
- **Aspectul**: paleta și fonturile site-ului (crem, auriu, verde; Anton + Barlow) în aplicație, `portal.html` și `bar.html`.
- **Portalul pe domeniu**: `site-nou/wp/snippet-portal.php` (WPCode) îl afișează la `cocktailphilosophy.ro/portal/`.
- Paginile site-ului (prima pagină, Nunți, Oferte, Corporate, Petreceri) afișează prețurile prin `site-nou/preturi-pagina.js`, care citește `site-nou/preturi.js`: exemplele de preț, Pachet barmani, Pachet Final de An (`finalDeAn`) și avansul. Un preț schimbat în `preturi.js` se schimbă peste tot (pe site în maxim ~10 minute).
