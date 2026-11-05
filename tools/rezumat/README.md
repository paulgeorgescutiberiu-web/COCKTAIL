> **Acum emailul de luni pleacă din Firebase** (funcția `rezumatLuni`, vezi `functions/README.md`), deci secretele din GitHub de mai jos nu mai sunt necesare. Scriptul de aici rămâne pentru previzualizare (`node trimite.js --demo`).

# Emailul de luni: „Săptămâna ta”

Luni dimineață (în jur de 07:20 iarna și 08:20 vara) primești pe email ce ai de făcut în săptămâna care începe:

- **Întâi de toate**: ce e urgent, în ordine (diferențe neîncasate, clienți care așteaptă răspuns, evenimente fără echipă, avansuri, stoc);
- **Evenimentele săptămânii**: ora, invitații, echipa din fișă și cine a confirmat (✓), cine nu poate (✕) și cine n-a răspuns (?);
- **Bani de urmărit**: avansuri și diferențe, fiecare cu buton de WhatsApp către client;
- **Cereri de ofertă**: cine așteaptă după tine, câte cereri ai primit săptămâna trecută și în cât timp răspunzi de obicei;
- **Stoc**: ce nu ajunge pentru evenimentele planificate;
- **Pe scurt**: săptămâna trecută și ce urmează săptămâna viitoare.

Același rezumat îl vezi oricând în aplicație, sus în **Contracte → Săptămâna ta**. Ambele folosesc același calcul (`src/cp-core.js`).

## Cum funcționează

1. Aplicația, când o deschizi, salvează în Firebase (`privat/rezumat`) fișa săptămânii cu echipele și ce lipsește din stoc.
2. Luni dimineață, GitHub pornește `.github/workflows/rezumat-luni.yml`. Acesta citește contractele, cererile, confirmările echipei și `privat/rezumat`, face rezumatul și îl trimite prin Gmail.
3. Dacă n-ai deschis aplicația de peste 8 zile, emailul te anunță că fișa și stocul nu sunt actualizate.

## Pornirea, o singură dată (cam 10 minute)

Ai nevoie de 4 secrete în GitHub: repo-ul **COCKTAIL → Settings → Secrets and variables → Actions → New repository secret**.

### 1. `FIREBASE_SA`: cheie doar pentru citire

Robotul are nevoie de o cheie ca să citească datele. Fă-i una **care poate doar să citească**:

1. Intră pe [console.cloud.google.com](https://console.cloud.google.com/iam-admin/serviceaccounts) și alege proiectul **cocktail-philosophy-dc34b**.
2. **IAM & Admin → Service Accounts → Create service account**. Nume: `rezumat-luni`. Apasă **Create and continue**.
3. La rol alege **Cloud Datastore Viewer**. E rolul de citire; cu el robotul nu poate schimba nimic. Apasă **Done**.
4. Deschide contul nou creat → **Keys → Add key → Create new key → JSON**. Se descarcă un fișier.
5. Deschide fișierul cu Notepad sau TextEdit, copiază **tot** textul și pune-l în secretul `FIREBASE_SA`. După aceea șterge fișierul din calculator.

### 2. `CP_TEAM`

Codul echipei: ce e după `#k=` în linkul aplicației.

### 3. `GMAIL_USER` și `GMAIL_APP_PASSWORD`

1. `GMAIL_USER`: adresa de Gmail de pe care pleacă emailul (poate fi chiar a ta).
2. Pentru parolă: contul Google → **Securitate** → **Verificare în doi pași** (trebuie să fie pornită) → **Parole pentru aplicații**. Creează una cu numele „Rezumat luni” și copiază cele 16 litere în `GMAIL_APP_PASSWORD`.

Opțional: `MAIL_TO` dacă vrei emailul pe altă adresă decât `GMAIL_USER`. Mai poți pune variabila `APP_URL` (tot acolo, la fila **Variables**) cu linkul aplicației, ca butonul „Deschide aplicația” să ducă direct la ea.

### 4. Probă

**Actions → Rezumat de luni → Run workflow**:

- bifează **Doar previzualizare** ca să vezi rezumatul fără să trimită emailul (îl găsești la rularea respectivă, jos, la **Artifacts → rezumat**);
- nebifat, trimite emailul chiar acum.

Dacă ceva lipsește, rularea apare cu roșu și spune exact ce secret lipsește.

## Local (pentru dezvoltare)

```bash
cd tools/rezumat && npm ci
```

```bash
node trimite.js --demo
```

`--demo` face rezumatul cu datele de test, fără Firebase și fără email, și îl salvează în `rezumat.html`.
