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
| `voce.js` | Sofia, asistentul vocal în română, cu funcții pentru rețete, evenimente, stoc, contracte, încasări, disponibilitate, bani („adaugă un eveniment” salvează contractul, îl pune în calendarul Google și PDF-ul în Drive). Două moduri (⚙︎ în panou): **Gemini Live** (implicit, cu biletul de la funcția `sofiaLive` din `functions/`, pentru că biblioteca Firebase pentru web nu trimite App Check pe Live; fără funcție, spune o dată de ce și trece 6 ore pe vocea telefonului: conversație în timp real, voce naturală, se poate întrerupe, se închide singură după 45 s de liniște sau la „gata”; pe difuzor vocea ei trece printr-o legătură WebRTC locală, ca telefonul să-i anuleze ecoul, iar cât vorbește microfonul trimite liniște până vorbești clar mai tare decât ecoul; setarea „Întreruperi: doar prin atingere” îl ține închis de tot. Vocea: 8 voci Gemini (implicit Sulafat), două „motoare” (3.1 Live rapid, 2.5 audio nativ expresiv), „🔊 Ascult-o” o pornește ca s-o auzi; redare la 24 kHz cu rezervă de 120 ms la începutul frazei. Pe laptop (Mac): ⌥S deschide/închide, Space pornește, întrerupe sau oprește) și **vocea telefonului** (rezervă: răspunsul vine în flux și e citit propoziție cu propoziție, ascultă până taci, conversație continuă). Scrierile se confirmă; în Live, a doua chemare cu `confirmat=true` trece doar după un „da” auzit sau apăsat |
| `meniu.js` | Aducerea rețetarului la Meniul 2026 de pe site, o singură dată (rețetele au și câmpurile pentru meniul clienților) |
| `cp-core.js` | Logica comună, fără ecran: regulile de urmărire a cererilor, șabloanele mesajelor, rezumatul săptămânii și emailul. O folosesc aplicația (`window.CPCore`), emailul de luni (`tools/rezumat/`) și testele |
| `rezumat.js` | Cardul „Săptămâna ta” din Contracte; salvează în `privat/rezumat` fișa săptămânii și ce lipsește din stoc, pentru emailul de luni |
| `corep.py` | Pasul de construire care pune `cp-core.js`, `rezumat.js` și stilurile lor în aplicație |
| `reguli-firestore.txt` | Regulile de securitate Firebase (se pun manual în consolă) |

Serverul (Firebase Functions) e în `functions/`: funcția `sofiaLive` dă biletul pentru conversația live a Sofiei. Instalarea: `functions/README.md`.

Pagini separate, în rădăcină: `portal.html` (portalul clientului) și `bar.html` (pagina invitaților de la bar).

## Ce e comun cu site-ul (`site-nou/`)

- **Meniul**: rețetarul din aplicație e singura listă. Ajunge public în `bar/info` (Firestore), de unde îl citesc pagina Meniu de pe site, portalul clientului și pagina de la bar.
- **Prețurile**: `site-nou/preturi.js`. Îl citesc pagina Oferte, calculatorul vechi de pe WordPress și aplicația (pus în `index.html` la construire).
- **Aspectul**: paleta și fonturile site-ului (crem, auriu, verde; Anton + Barlow) în aplicație, `portal.html` și `bar.html`.
- **Portalul pe domeniu**: `site-nou/wp/snippet-portal.php` (WPCode) îl afișează la `cocktailphilosophy.ro/portal/`.
- Paginile site-ului (prima pagină, Nunți, Oferte, Corporate, Petreceri) afișează prețurile prin `site-nou/preturi-pagina.js`, care citește `site-nou/preturi.js`: exemplele de preț, Pachet barmani, Pachet Final de An (`finalDeAn`) și avansul. Un preț schimbat în `preturi.js` se schimbă peste tot (pe site în maxim ~10 minute).

## Cererile de ofertă: urmărirea

La Contracte → Cereri de ofertă, blocul **De făcut** arată cine așteaptă după tine, în ordinea importanței:

| Pas | Când apare | Ce faci |
|---|---|---|
| Fără răspuns | o cerere nouă, fără contact (întârziată după 24 h) | WhatsApp cu primul mesaj gata scris, Sună sau „Am vorbit deja” |
| Oferta nu e trimisă | ai vorbit cu clientul acum 2 zile, dar n-ai trimis oferta | Fă oferta |
| Revenirea 1 | la 3 zile după ofertă, fără răspuns | WhatsApp cu mesajul de revenire (cu „data e încă liberă”, dacă e liberă) |
| Revenirea 2 | la încă 4 zile, fără răspuns | Ultimul mesaj, politicos |
| Închide | la 7 zile după ultima revenire | Marchează pierdută („Nu a mai răspuns”) |

Orice pas se poate amâna, iar orice acțiune se poate anula imediat. „A răspuns” pornește revenirile de la zero.
Pe cerere se salvează: `contactAt`, `fu` (revenirile), `clientAt`, `amanat`. Regulile (zilele) sunt în `cp-core.js` → `REGULI`.
Mesajele se schimbă din aplicație: **Mesajele de WhatsApp**, jos în cardul cererilor. Se salvează în `privat/sabloane`.
Numărul de cereri care așteaptă apare pe tabul Contracte și pe iconița aplicației instalate pe telefon.

## Teste

```bash
npm ci
```

```bash
npm test
```

`tests/app.test.js` pornește `index.html` cu un Firebase simulat (`tests/fake-firebase.js`, date în `tests/date-test.js`),
deschide toate taburile și verifică cererile și „Săptămâna ta”. `tests/core.test.js` verifică regulile, `tests/site.test.js` verifică site-ul,
`tests/functii.test.js` verifică serverul pentru conversația live, `tests/sofia.test.js` verifică asistentul vocal (cu Gemini, vocea și microfonul simulate), iar `tests/build.test.js` verifică dacă `index.html` e construit din sursele actuale. Pe GitHub rulează singure la fiecare modificare
(`.github/workflows/verificare.yml`). Cu `CP_SHOTS=capturi npm test` se salvează și o captură de ecran.
