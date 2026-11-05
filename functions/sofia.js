/* Logica serverului pentru conversația live a Sofiei, fără dependențe (o verifică tests/functii.test.js).
   De ce există: biblioteca Firebase pentru web nu trimite dovada App Check pe conexiunea Live (firebase-js-sdk#10018),
   iar proiectul cere App Check. Serverul dă aplicației un „bilet” Gemini Live de unică folosință, valabil câteva minute
   (ephemeral token), doar pentru administrator și membrii echipei, cerut cu App Check și autentificare. */
const ADMIN_EMAIL = "paul.georgescu.tiberiu@gmail.com";
const API = "https://generativelanguage.googleapis.com/v1beta";
const REZERVA = {
  nou: ["gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"],
  expresiv: ["gemini-2.5-flash-native-audio-preview-12-2025", "gemini-3.1-flash-live-preview"],
};
const LIMITA_ORA = 40;   // bilete pe om, pe oră

const eroare = (code, msg) => Object.assign(new Error(msg), { code, msg });

/* Cine are voie: administratorul (email verificat) sau un membru al echipei reale.
   Echipa e reală dacă are rețetarul (config/retete), pe care doar administratorul îl poate scrie;
   omul e membru dacă și-a pus numele în echipă (oameni/{uid}), ca orice coleg care a deschis linkul. */
async function poate(auth, data, exista) {
  if (!auth || !auth.uid) throw eroare("unauthenticated", "Intră în aplicație.");
  const t = auth.token || {};
  if (t.email === ADMIN_EMAIL && t.email_verified === true) return "admin";
  const e = String((data && data.echipa) || "");
  if (!/^[A-Za-z0-9]{20,}$/.test(e)) throw eroare("permission-denied", "Doar echipa poate folosi conversația live.");
  const [echipa, om] = await Promise.all([exista(`echipe/${e}/config/retete`), exista(`echipe/${e}/oameni/${auth.uid}`)]);
  if (!echipa || !om) throw eroare("permission-denied", "Doar echipa poate folosi conversația live.");
  return "echipa";
}

/* Limită simplă pe om (în memoria serverului): ajunge ca să nu se poată cere bilete la nesfârșit */
const cereri = new Map();
function limita(uid, acum) {
  const L = (cereri.get(uid) || []).filter(t => acum - t < 3600e3);
  if (L.length >= LIMITA_ORA) { cereri.set(uid, L); return false; }
  L.push(acum); cereri.set(uid, L); return true;
}

/* Alege modelul Live din lista Google: cel mai nou, sau cu audio nativ pentru motorul „expresiv” */
const versiune = n => { const m = String(n).match(/gemini-(\d+)(?:\.(\d+))?/); return m ? (+m[1]) * 100 + (+(m[2] || 0)) : 0; };
function alegeModel(modele, motor) {
  const L = (modele || [])
    .filter(m => (m.supportedGenerationMethods || []).includes("bidiGenerateContent"))
    .map(m => String(m.name || "").replace(/^models\//, ""))
    .filter(n => n && !/tts|image|embedding|computer/i.test(n));
  if (!L.length) return (REZERVA[motor] || REZERVA.nou).slice();
  const nativ = n => /native-audio/i.test(n);
  const scor = n => versiune(n) * 10 + (motor === "expresiv" ? (nativ(n) ? 100000 : 0) : (/live/i.test(n) ? 3 : 0)) - (/-exp/i.test(n) ? 1 : 0);
  return [...new Set(L)].sort((a, b) => scor(b) - scor(a) || (a < b ? -1 : 1));
}

/* Biletul: o singură folosire, conexiunea trebuie pornită în 2 minute, ține cel mult 30 de minute, doar pe modelul ales */
function cerereBilet(model, acum) {
  return {
    uses: 1,
    expireTime: new Date(acum + 30 * 60e3).toISOString(),
    newSessionExpireTime: new Date(acum + 2 * 60e3).toISOString(),
    liveConnectConstraints: { model: "models/" + model },
  };
}

module.exports = { ADMIN_EMAIL, API, REZERVA, poate, limita, alegeModel, cerereBilet, eroare };
