# Funcțiile Firebase

**Cel mai simplu:** dublu-clic pe `Porneste-functiile.command` (în folderul aplicației, pe Mac). Te conectează la Google, îți cere cele 3 chei (le lipești doar în Terminal) și publică tot. Proiectul trebuie să fie înainte pe planul Blaze.

Funcțiile:
- `sofiaLive` – biletul pentru vocea live a Sofiei (detalii mai jos);
- `postariProgramate` – la 10 minute trimite la Make postările programate din aplicație (`social.js`);
- `rezumatLuni` – emailul „Săptămâna ta”, lunea la 07:20 (`rezumat.js`, cu același calcul ca aplicația din `cp-core.js`, copiat automat din `src/` la publicare). Secrete: `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

# Serverul pentru conversația live a Sofiei

## De ce e nevoie de el

Proiectul Firebase cere **App Check** pentru AI Logic: doar aplicația ta poate folosi Gemini pe contul tău.
Biblioteca Firebase pentru web nu trimite însă dovada App Check pe conexiunea **Live**
([firebase-js-sdk#10018](https://github.com/firebase/firebase-js-sdk/issues/10018)), așa că Google o refuză
(„Firebase App Check token is invalid”). Firebase recomandă un server care dă aplicației un acces temporar.

Funcția `sofiaLive` face asta:

1. Aplicația îi cere un bilet, cu contul tău și cu App Check.
2. Funcția verifică cine cere: administratorul (emailul verificat) sau un membru al echipei reale, adică o echipă care are rețetarul și în care omul și-a pus numele.
3. Funcția cere la Google un **bilet Gemini Live** pe modelul ales:
   - de o singură folosire;
   - conexiunea trebuie pornită în 2 minute;
   - ține cel mult 30 de minute.
4. Sofia se conectează direct la Gemini cu biletul.

Cheia Gemini rămâne pe server și nu ajunge niciodată în aplicație. Un om poate cere cel mult 40 de bilete pe oră.

Dacă funcția nu e instalată, Sofia spune asta o dată și folosește vocea telefonului (mai încearcă după 6 ore, sau imediat din ⚙︎ → 🔊 Ascult-o).

## Instalarea (o singură dată)

### 1. Planul Blaze
Funcțiile Firebase cer planul **Blaze** (plătești doar ce folosești; o funcție apelată de câteva ori pe zi intră în partea gratuită).

1. [Firebase Console](https://console.firebase.google.com/) → proiectul **cocktail-philosophy-dc34b**.
2. Jos în stânga, la planul curent: **Upgrade** → **Blaze** și alegi contul de facturare.
3. Recomandat: pune o alertă de buget, de exemplu 10 €/lună (Google Cloud Console → Billing → Budgets & alerts).

### 2. Cheia Gemini
1. Deschide [Google AI Studio → API keys](https://aistudio.google.com/apikey).
2. **Create API key** → alege proiectul **cocktail-philosophy-dc34b**.
3. Copiază cheia (începe cu `AIza…`). Nu o pune nicăieri în cod și nu o trimite pe chat.

Cu proiectul pe Blaze, cheia e pe nivelul plătit: Google nu folosește conversațiile ca să-și antreneze modelele.

### 3. Publicarea, de pe Mac
Ai nevoie de [Node.js 22](https://nodejs.org/) (descarci „LTS” și instalezi). Apoi, în **Terminal**:

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

Mergi în folderul aplicației (descărcat sau clonat de pe GitHub, cu ultimele modificări):

```bash
cd ~/COCKTAIL
```

Pune cheia pe server (îți cere s-o lipești; nu se vede cât scrii):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Publică funcția:

```bash
firebase deploy --only functions
```

La prima publicare, Firebase poate întreba dacă activează serviciile necesare (Cloud Functions, Cloud Build, Artifact Registry, Secret Manager): răspunzi **y**. Dacă întreabă câte zile să păstreze imaginile vechi, lasă valoarea propusă.

### 4. Proba
1. Deschide aplicația.
2. Apasă 🎙️ → **⚙︎** → **🔊 Ascult-o**.
3. Sofia ar trebui să te salute cu vocea Gemini.

Dacă nu merge, în panou scrie motivul. Jurnalul funcției îl vezi cu comanda de mai jos sau în Firebase Console → Functions → sofiaLive → Logs:

```bash
firebase functions:log --only sofiaLive
```

## Cât costă
- **Funcția:** practic nimic. Partea gratuită are 2 milioane de apeluri pe lună, iar Sofia face unul pe conversație.
- **Secretul** (cheia) și **imaginea funcției:** câțiva cenți pe lună.
- **Conversațiile Gemini Live:** după tariful Gemini API pentru audio, pe minut de conversație. Sofia închide singură conversația după 45 de secunde de liniște.

## Schimbarea cheii
Rulezi din nou comenzile de mai jos (cheia nouă intră la următoarea publicare):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

```bash
firebase deploy --only functions
```

## Postările programate (Instagram + Facebook)

Funcția `postariProgramate` rulează singură la fiecare 10 minute. Ia postările programate din aplicație
(**Postare → Programează**) care au ajuns la ora lor și le trimite la scenariul din Make („Postare Instagram + Facebook”),
exact ca butonul „Postează acum”. Dacă Make nu răspunde, mai încearcă de două ori, la 10 minute; după aceea
postarea apare în aplicație cu **Nu a mers** și butonul **Reîncearcă**.

Se publică împreună cu `sofiaLive`, cu aceeași comandă (`firebase deploy --only functions`). Prima dată, Firebase poate cere
să activeze **Cloud Scheduler**: răspunzi **y**.

Înainte, pune în Firebase Console → Firestore → **Rules** regulile noi din `src/reguli-firestore.txt`
(`socialCoada`, `socialPoze`, `socialPostate`); fără ele, aplicația nu poate salva postările programate.

Jurnalul:

```bash
firebase functions:log --only postariProgramate
```

Costul: cam 4.300 de rulări pe lună, în partea gratuită (Cloud Scheduler dă 3 programări gratuite pe cont).
