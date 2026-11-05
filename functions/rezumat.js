/* Emailul „Săptămâna ta”, luni dimineață, din funcția rezumatLuni (index.js).
   Rulează pe serverul Firebase, deci citește direct din baza de date (fără cheie de serviciu și fără codul echipei în GitHub).
   Calculul e același ca în aplicație: cp-core.js (copiat din src/cp-core.js la fiecare publicare, vezi firebase.json). */
"use strict";
const C = require("./cp-core.js");

async function dateEchipa(db, B) {
  const col = async p => (await db.collection(p).get()).docs.map(d => ({ ...d.data(), id: d.id }));
  const [contracte, leads, dispL, rez] = await Promise.all([
    col(`${B}/contracte`), col("barLead"), col(`${B}/disp`), db.doc(`${B}/privat/rezumat`).get(),
  ]);
  const disp = {}; dispL.forEach(d => { disp[d.id] = { name: d.name || "", conf: d.conf || {} }; });
  const s = rez.exists ? rez.data() : {};
  return { contracte, leads, disp, sursa: { fisa: s.fisa || { events: [] }, stoc: s.stoc || { lipsa: [], minus: [] }, at: s.at || null } };
}

/* Echipa = documentul din echipe/ care are contracte (de obicei e una singură). */
async function gasesteEchipa(db) {
  const refs = await db.collection("echipe").listDocuments();
  let best = null, max = -1;
  for (const r of refs) {
    const n = (await r.collection("contracte").count().get()).data().count;
    if (n > max) { max = n; best = r.path; }
  }
  return best;
}

function mesaj(date, now, app) {
  const R = C.rezumat(date, now);
  const n = R.prioritati.length;
  const subiect = `Săptămâna ta · ${C.intervalText(R.sapt)} · ${R.evenimente.length} ${R.evenimente.length === 1 ? "eveniment" : "evenimente"}` + (n ? ` · ${n} ${n === 1 ? "lucru important" : "lucruri importante"}` : " · totul e la zi");
  return { subiect, html: C.emailHTML(R, { app: app || undefined }), text: C.emailText(R) };
}

async function trimiteEmail(user, pass, to, m) {
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass: String(pass).replace(/\s+/g, "") } });
  return t.sendMail({ from: `"Cocktail Philosophy" <${user}>`, to: to || user, subject: m.subiect, html: m.html, text: m.text });
}

module.exports = { dateEchipa, gasesteEchipa, mesaj, trimiteEmail };
