/* Emailul „Săptămâna ta”, luni dimineață.
   Citește din Firebase (cu cheia de serviciu, doar citire) contractele, cererile de ofertă, confirmările echipei
   și ce a salvat aplicația în privat/rezumat (fișa săptămânii și stocul), face rezumatul cu src/cp-core.js
   (același calcul ca în aplicație) și îl trimite pe email prin Gmail.

   Variabile (secrete în GitHub → Settings → Secrets and variables → Actions):
     FIREBASE_SA          cheia contului de serviciu Firebase (tot fișierul JSON)
     CP_TEAM              codul echipei (ce e după #k= în linkul aplicației)
     GMAIL_USER           adresa de Gmail de pe care pleacă emailul
     GMAIL_APP_PASSWORD   parola de aplicație Gmail (16 litere, din contul Google → Securitate)
     MAIL_TO              (opțional) cui se trimite; implicit GMAIL_USER
     APP_URL              (opțional) linkul aplicației din buton
   Rulare locală:
     node trimite.js --demo       → rezumat cu date de test, salvat în rezumat.html (fără Firebase, fără email)
     node trimite.js --preview    → date reale, salvat în rezumat.html, fără email
     node trimite.js              → date reale + email */
"use strict";
const fs = require("fs"), path = require("path");
const C = require("../../src/cp-core.js");
const ARGS = new Set(process.argv.slice(2));
const OUT = path.join(__dirname, "rezumat.html");

function fail(msg) { console.error("✗ " + msg); process.exit(1); }
const env = k => (process.env[k] || "").trim();

async function citesteFirebase() {
  const sa = env("FIREBASE_SA"), team = env("CP_TEAM");
  if (!sa) fail("Lipsește secretul FIREBASE_SA (cheia contului de serviciu Firebase).");
  if (team.length < 20) fail("Lipsește secretul CP_TEAM (codul echipei din linkul aplicației, după #k=).");
  let cred;
  try { cred = JSON.parse(sa); } catch (e) { fail("FIREBASE_SA nu e un JSON valid. Pune tot conținutul fișierului descărcat din Firebase."); }
  const admin = require("firebase-admin");
  admin.initializeApp({ credential: admin.credential.cert(cred) });
  const db = admin.firestore(), B = `echipe/${team}`;
  const col = async p => (await db.collection(p).get()).docs.map(d => ({ ...d.data(), id: d.id }));
  const [contracte, leads, dispL, rez] = await Promise.all([
    col(`${B}/contracte`), col("barLead"), col(`${B}/disp`), db.doc(`${B}/privat/rezumat`).get(),
  ]);
  if (!contracte.length && !leads.length) console.warn("! Nu am găsit niciun contract și nicio cerere. Verifică CP_TEAM.");
  const disp = {}; dispL.forEach(d => { disp[d.id] = { name: d.name || "", conf: d.conf || {} }; });
  const s = rez.exists ? rez.data() : {};
  return { contracte, leads, disp, sursa: { fisa: s.fisa || { events: [] }, stoc: s.stoc || { lipsa: [], minus: [] }, at: s.at || null } };
}

function demo() {
  const { seed } = require("../../tests/date-test.js");
  const S = seed(), col = p => Object.entries(S.docs).filter(([k]) => k.split("/").slice(0, -1).join("/") === p).map(([k, v]) => ({ ...v, id: k.split("/").pop() }));
  const ev = JSON.parse(S.docs[`${S.B}/config/evenimente`].json);
  const azi = C.iso(new Date());
  const disp = {}; col(`${S.B}/disp`).forEach(d => { disp[d.id] = d; });
  return {
    contracte: col(`${S.B}/contracte`), leads: col("barLead"), disp,
    sursa: {
      at: new Date().toISOString(),
      fisa: { ds: S.ds, events: ev.aoa[0].slice(1).map((n, i) => ({ key: `${S.ds}|${i + 1}`, name: n, date: azi, time: ev.aoa[2][i + 1], persons: ev.aoa[3][i + 1], team: String(ev.aoa[4][i + 1] || "").split(/[\s,]+/).filter(Boolean) })) },
      stoc: { lipsa: [{ label: "Lime", lipsa: 3.5 }, { label: "Prosecco", lipsa: 6 }], minus: [] },
    },
  };
}

async function trimiteEmail(subiect, html, text) {
  const user = env("GMAIL_USER"), pass = env("GMAIL_APP_PASSWORD").replace(/\s+/g, ""), to = env("MAIL_TO") || user;
  if (!user || !pass) fail("Lipsesc GMAIL_USER sau GMAIL_APP_PASSWORD. Emailul nu a plecat (rezumatul e salvat ca rezumat.html).");
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  const info = await t.sendMail({ from: `"Cocktail Philosophy" <${user}>`, to, subject: subiect, html, text });
  console.log(`✓ Email trimis către ${to} (${info.messageId})`);
}

(async () => {
  const now = Date.now();
  let date;
  try { date = ARGS.has("--demo") ? demo() : await citesteFirebase(); }
  catch (e) {
    const m = `Nu am putut citi datele din Firebase: ${e && e.message || e}`;
    console.error("✗ " + m);
    if (!ARGS.has("--preview") && env("GMAIL_USER") && env("GMAIL_APP_PASSWORD"))
      await trimiteEmail("Săptămâna ta: nu am putut face rezumatul", `<p>${m}</p><p>Verifică secretele FIREBASE_SA și CP_TEAM din GitHub.</p>`, m).catch(() => {});
    process.exit(1);
  }
  const R = C.rezumat(date, now);
  const n = R.prioritati.length;
  const subiect = `Săptămâna ta · ${C.intervalText(R.sapt)} · ${R.evenimente.length} ${R.evenimente.length === 1 ? "eveniment" : "evenimente"}` + (n ? ` · ${n} ${n === 1 ? "lucru important" : "lucruri importante"}` : " · totul e la zi");
  const html = C.emailHTML(R, { app: env("APP_URL") || undefined }), text = C.emailText(R);
  fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subiect}</title><body style="margin:0">${html}</body>`);
  console.log(subiect);
  console.log(`Previzualizare: ${OUT}`);
  if (ARGS.has("--demo") || ARGS.has("--preview")) return;
  await trimiteEmail(subiect, html, text);
})().catch(e => fail(e && e.stack || String(e)));
