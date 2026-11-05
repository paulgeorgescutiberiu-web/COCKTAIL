/* Testul serverului pentru conversația live a Sofiei (functions/sofia.js): cine primește bilet, ce model, ce bilet.
   Rulare: npm test */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../functions/sofia.js");

const ECHIPA = "AbCdEfGhIjKlMnOpQrStUv12";
const db = new Set([`echipe/${ECHIPA}/config/retete`, `echipe/${ECHIPA}/oameni/uid-ion`, `echipe/FalsaFalsaFalsaFalsa12/oameni/uid-x`]);
const exista = async p => db.has(p);
const cod = async f => { try { await f(); return "ok"; } catch (e) { return e.code; } };

test("biletul: administratorul și membrii echipei reale da, restul nu", async () => {
  assert.equal(await S.poate({ uid: "p", token: { email: S.ADMIN_EMAIL, email_verified: true } }, {}, exista), "admin");
  assert.equal(await S.poate({ uid: "uid-ion", token: {} }, { echipa: ECHIPA }, exista), "echipa");
  assert.equal(await cod(() => S.poate(null, { echipa: ECHIPA }, exista)), "unauthenticated");
  assert.equal(await cod(() => S.poate({ uid: "p", token: { email: S.ADMIN_EMAIL, email_verified: false } }, {}, exista)), "permission-denied", "emailul nu e verificat");
  assert.equal(await cod(() => S.poate({ uid: "uid-strain", token: {} }, { echipa: ECHIPA }, exista)), "permission-denied", "nu e în echipă");
  assert.equal(await cod(() => S.poate({ uid: "uid-x", token: {} }, { echipa: "FalsaFalsaFalsaFalsa12" }, exista)), "permission-denied", "echipă inventată (fără rețetar)");
  assert.equal(await cod(() => S.poate({ uid: "uid-ion", token: {} }, { echipa: "scurt" }, exista)), "permission-denied");
  assert.equal(await cod(() => S.poate({ uid: "uid-ion", token: {} }, { echipa: "../../x/aaaaaaaaaaaaaaaaaaaaaa" }, exista)), "permission-denied", "doar litere și cifre în cale");
});

test("limita: cel mult 40 de bilete pe om pe oră", () => {
  const t0 = 1e12;
  for (let i = 0; i < 40; i++) assert.equal(S.limita("u1", t0 + i), true);
  assert.equal(S.limita("u1", t0 + 41), false);
  assert.equal(S.limita("u2", t0 + 41), true, "alt om are limita lui");
  assert.equal(S.limita("u1", t0 + 3600e3 + 50), true, "după o oră se poate din nou");
});

test("modelul: cel mai nou Live, sau audio nativ pentru „expresiv”; rezerva dacă lista lipsește", () => {
  const M = [
    { name: "models/gemini-3.1-flash-live-preview", supportedGenerationMethods: ["bidiGenerateContent"] },
    { name: "models/gemini-3.8-live", supportedGenerationMethods: ["bidiGenerateContent"] },
    { name: "models/gemini-2.5-flash-native-audio-preview-12-2025", supportedGenerationMethods: ["bidiGenerateContent"] },
    { name: "models/gemini-3.5-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.5-flash-preview-tts", supportedGenerationMethods: ["bidiGenerateContent", "generateContent"] },
  ];
  assert.deepEqual(S.alegeModel(M, "nou"), ["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"]);
  assert.equal(S.alegeModel(M, "expresiv")[0], "gemini-2.5-flash-native-audio-preview-12-2025");
  assert.deepEqual(S.alegeModel(null, "nou"), S.REZERVA.nou);
  assert.deepEqual(S.alegeModel([], "expresiv"), S.REZERVA.expresiv);
});

test("biletul cerut la Google: o folosire, pornire în 2 minute, cel mult 30 de minute, doar pe modelul ales", () => {
  const b = S.cerereBilet("gemini-3.8-live", Date.UTC(2026, 10, 5, 10, 0, 0));
  assert.deepEqual(b, {
    uses: 1,
    expireTime: "2026-11-05T10:30:00.000Z",
    newSessionExpireTime: "2026-11-05T10:02:00.000Z",
    liveConnectConstraints: { model: "models/gemini-3.8-live" },
  });
});
