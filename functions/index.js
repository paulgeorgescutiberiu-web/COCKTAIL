/* Funcțiile Firebase ale aplicației. Instalare și publicare: functions/README.md */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const S = require("./sofia");

initializeApp();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
let modele = null, modeleLa = 0;

/* sofiaLive: biletul pentru conversația live a Sofiei. Primește {echipa, motor, fara}; dă {token, model}. */
exports.sofiaLive = onCall({
  region: "europe-west1",
  secrets: [GEMINI_API_KEY],
  enforceAppCheck: true,          // doar din aplicația ta (aceeași protecție ca la facturi)
  maxInstances: 2,
  memory: "256MiB",
  timeoutSeconds: 30,
}, async req => {
  const d = req.data || {};
  try {
    await S.poate(req.auth, d, async p => (await getFirestore().doc(p).get()).exists);
  } catch (e) {
    if (e.code) throw new HttpsError(e.code, e.msg);
    throw e;
  }
  if (!S.limita(req.auth.uid, Date.now())) throw new HttpsError("resource-exhausted", "Prea multe conversații într-o oră. Încearcă puțin mai târziu.");
  const key = GEMINI_API_KEY.value();
  if (!key) throw new HttpsError("failed-precondition", "Cheia Gemini (GEMINI_API_KEY) nu e pusă pe server.");

  // lista modelelor Live, ținută minte 6 ore
  if (!modele || Date.now() - modeleLa > 6 * 3600e3) {
    try {
      const r = await fetch(`${S.API}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
      if (r.ok) { modele = (await r.json()).models || []; modeleLa = Date.now(); }
      else logger.warn("sofiaLive: lista modelelor", r.status, await r.text());
    } catch (e) { logger.warn("sofiaLive: lista modelelor", e); }
  }
  const fara = Array.isArray(d.fara) ? d.fara.map(String) : [];
  const lista = S.alegeModel(modele, d.motor).filter(m => !fara.includes(m));
  if (!lista.length) throw new HttpsError("not-found", "Niciun model Live nu a mers.");
  const model = lista[0];

  const r = await fetch(`${S.API}/auth_tokens`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(S.cerereBilet(model, Date.now())),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.name) {
    logger.error("sofiaLive: biletul", r.status, JSON.stringify(j));
    const m = (j.error && j.error.message) || String(r.status);
    if (r.status === 429) throw new HttpsError("resource-exhausted", "Google: limita de conversații live, pentru moment.");
    if (r.status === 400 || r.status === 403) throw new HttpsError("failed-precondition", "Google a refuzat cheia Gemini: " + m);
    throw new HttpsError("internal", "Google nu a dat biletul: " + m);
  }
  return { token: j.name, model, rezerve: lista.slice(1, 3) };
});

/* postariProgramate: la 10 minute publică pe Instagram + Facebook postările programate din aplicație (Postare → Programează).
   Le trimite la webhook-ul Make, ca butonul „Postează acum”. Logica: functions/social.js */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const SOC = require("./social");
exports.postariProgramate = onSchedule({
  schedule: "every 10 minutes",
  timeZone: "Europe/Bucharest",
  region: "europe-west1",
  maxInstances: 1,
  memory: "256MiB",
  timeoutSeconds: 300,
  retryCount: 0,
}, async () => {
  const db = getFirestore(), acum = Date.now();
  const snap = await db.collection("socialCoada").where("cand", "<=", acum).get();
  const lista = SOC.deTrimis(snap.docs.map(d => ({ ...d.data(), id: d.id })), acum).slice(0, 10);
  for (const d of lista) {
    const ref = db.doc(`socialCoada/${d.id}`);
    // o iau doar dacă nu a luat-o altcineva între timp
    const luat = await db.runTransaction(async t => {
      const x = await t.get(ref);
      if (!x.exists || !["programat", "eroare"].includes(x.data().stare)) return false;
      t.update(ref, { stare: "trimit" });
      return true;
    });
    if (!luat) continue;
    const poza = (await db.doc(`socialPoze/${d.id}`).get()).data();
    const rez = await SOC.trimite(d.id, d, poza);
    if (rez.ok) {
      const b = db.batch();
      b.set(db.doc(`socialPostate/${d.id}`), { cand: d.cand, caption: d.caption, mic: d.mic || "", postatLa: Date.now() });
      b.delete(ref);
      b.delete(db.doc(`socialPoze/${d.id}`));
      await b.commit();
      logger.info("postariProgramate: trimis", d.id);
    } else {
      await ref.update(SOC.dupaEroare(d, rez));
      logger.warn("postariProgramate: nu a mers", d.id, rez.err);
    }
  }
});
