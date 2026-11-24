/* Detaliile evenimentului: logica din src/detalii.js și copia ei din portal.html */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = require("../src/detalii.js");

test("portal.html are aceeași copie a întrebărilor ca src/detalii.js", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/detalii.js"), "utf8"), p = fs.readFileSync(path.join(ROOT, "portal.html"), "utf8");
  const m = p.match(/\/\*DETALII-START\*\/\n([\s\S]*?)\/\*DETALII-END\*\//);
  assert.ok(m, "lipsesc semnele din portal.html");
  assert.ok(m[1] === src, "portal.html nu e la zi. Rulează: bash src/build.sh");
  assert.ok(!src.includes("</script"));
});

test("progresul: secțiunile obligatorii, „Nu sunt” contează, întrebările ascunse nu", () => {
  assert.deepEqual([D.progres({}).gata, D.progres({}).total], [0, 8]);
  const d = { oraStart: "18:00", adulti: "120", bar: "Afară", whisky: "Nu", whiskySticle: "5", bGin: "Mai mult", pers: "Nu", momenteNone: "1", alergiiNone: "1" };
  assert.equal(D.progres(d).complet, true);
  assert.ok(!D.rinduri(d).join(" ").includes("sticle"), "sticlele de whisky nu apar dacă nu e whisky pe mese");
  assert.equal(D.progres({ ...d, alergiiNone: "" }).lipsa[0], "Alergii și restricții");
  assert.equal(D.progres({ obsDet: "x" }).gata, 0, "observațiile sunt opționale");
});

test("termenul e cu 4 zile înainte; cea mai nouă variantă câștigă; câmpurile golite se salvează goale", () => {
  assert.equal(D.termen("2026-12-04"), "2026-11-30");
  assert.equal(D.termen("2027-03-02"), "2027-02-26");
  const a = { at: "2026-11-20T10:00:00Z", by: "paul" }, b = { at: "2026-11-21T10:00:00Z", by: "client" };
  assert.equal(D.nou(a, b), b); assert.equal(D.nou(b, a), b); assert.equal(D.nou(null, a), a);
  const c = D.curat({ adulti: " 80 ", necunoscut: "x" });
  assert.equal(c.adulti, "80"); assert.equal(c.copii, ""); assert.ok(!("necunoscut" in c));
});
