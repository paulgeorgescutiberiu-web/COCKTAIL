/* Testul postărilor programate (functions/social.js): ce se trimite, ce ajunge la Make, ce se întâmplă la eroare.
   Rulare: npm test */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../functions/social.js");

const HOOK = "https://hook.eu1.make.com/abc123";
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]).toString("base64");

test("deTrimis: doar cele ajunse la oră, programate sau cu mai puțin de 3 încercări, cele vechi primele", () => {
  const acum = 1e12;
  const docs = [
    { id: "viitor", cand: acum + 60e3, stare: "programat" },
    { id: "b", cand: acum - 10, stare: "programat" },
    { id: "a", cand: acum - 1000, stare: "programat" },
    { id: "eroare1", cand: acum - 5, stare: "eroare", incercari: 1 },
    { id: "eroare3", cand: acum - 5, stare: "eroare", incercari: 3 },
    { id: "trimit", cand: acum - 5, stare: "trimit" },
    { id: "faraOra", stare: "programat" },
  ];
  assert.deepEqual(S.deTrimis(docs, acum).map(d => d.id), ["a", "b", "eroare1"]);
});

test("trimite: aceleași câmpuri ca „Postează acum” (id, caption, photo)", async () => {
  let primit;
  const fetchFals = async (url, o) => { primit = { url, fd: o.body }; return { ok: true, status: 200 }; };
  const r = await S.trimite("2026-11-07-19-30_x", { hook: HOOK, caption: " Seară frumoasă 🍸 " }, { img: JPEG }, fetchFals);
  assert.deepEqual(r, { ok: true });
  assert.equal(primit.url, HOOK);
  assert.equal(primit.fd.get("id"), "2026-11-07-19-30_x");
  assert.equal(primit.fd.get("caption"), "Seară frumoasă 🍸");
  const f = primit.fd.get("photo");
  assert.equal(f.type, "image/jpeg");
  assert.equal(f.name, "2026-11-07-19-30_x.jpg");
  assert.equal(f.size, 2004);
});

test("trimite: datele greșite nu se mai reîncearcă, problemele de rețea da", async () => {
  const nu = async () => { throw new Error("nu trebuia trimis"); };
  for (const [d, p] of [[{ hook: "https://evil.example/x", caption: "a" }, { img: JPEG }], [{ hook: HOOK, caption: "  " }, { img: JPEG }],
    [{ hook: HOOK, caption: "a" }, undefined], [{ hook: HOOK, caption: "a" }, { img: Buffer.alloc(3000).toString("base64") }]]) {
    const r = await S.trimite("x", d, p, nu);
    assert.equal(r.ok, false); assert.equal(r.final, true, r.err);
    assert.equal(S.dupaEroare({ incercari: 0 }, r).incercari, S.INCERCARI, "nu se mai reîncearcă");
  }
  const r410 = await S.trimite("x", { hook: HOOK, caption: "a" }, { img: JPEG }, async () => ({ ok: false, status: 410 }));
  assert.equal(r410.final, false); assert.match(r410.err, /410/);
  assert.deepEqual(S.dupaEroare({ incercari: 1 }, r410), { stare: "eroare", incercari: 2, err: r410.err });
  const rRetea = await S.trimite("x", { hook: HOOK, caption: "a" }, { img: JPEG }, async () => { throw new Error("ECONNRESET"); });
  assert.equal(rRetea.ok, false); assert.equal(rRetea.final, false); assert.match(rRetea.err, /ECONNRESET/);
});

test("postările rămase pe „trimit” peste 15 minute sunt găsite, cele proaspete nu", () => {
  const acum = Date.now();
  const L = [
    { id: "a", stare: "trimit", trimitLa: acum - 20 * 60e3 },
    { id: "b", stare: "trimit", trimitLa: acum - 60e3 },
    { id: "c", stare: "trimit" },
    { id: "d", stare: "programat" },
  ];
  assert.deepEqual(S.blocate(L, acum).map(d => d.id), ["a", "c"]);
  assert.equal(S.BLOCAT.incercari, S.INCERCARI);
});
