/* Testele logicii comune (src/cp-core.js): regulile cererilor, șabloanele, rezumatul săptămânii, emailul. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/cp-core.js");

const NOW = new Date(2026, 10, 4, 18, 0).getTime(); // miercuri, 4 noiembrie 2026, 18:00
const ago = h => new Date(NOW - h * 36e5).toISOString();

test("săptămâna e de luni până duminică, și duminica", () => {
  assert.deepEqual([C.saptamana(NOW).de, C.saptamana(NOW).pana], ["2026-11-02", "2026-11-08"]);
  const dum = new Date(2026, 10, 8, 23, 0);
  assert.equal(C.saptamana(dum).de, "2026-11-02");
  assert.equal(C.saptamana(new Date(2026, 10, 9, 0, 5)).de, "2026-11-09");
  assert.equal(C.intervalText(C.saptamana(new Date(2026, 9, 28))), "26 octombrie – 1 noiembrie");
});

test("șabloane: {cuvinte} completate, [bucăți] care dispar când lipsește informația", () => {
  assert.equal(C.completeaza("Salut, {prenume}![ Pe {data}.][ La {locatie}.]", { prenume: "Ana", data: "1 mai" }), "Salut, Ana! Pe 1 mai.");
  assert.equal(C.completeaza("A[ b {x}] c", {}), "A c");
  assert.equal(C.completeaza("Linia 1\n\n\n\nLinia 2", {}), "Linia 1\n\nLinia 2");
  assert.equal(C.completeaza("{necunoscut}ok", {}), "ok");
  assert.equal(C.prenume("ANA-MARIA POPESCU"), "Ana-maria");
});

test("primul mesaj întreabă doar ce lipsește", () => {
  const m = x => C.completeaza(C.SABLOANE.prim, C.contextCerere(x));
  assert.match(m({ nume: "ion" }), /câți invitați adulți estimați și unde va avea loc/);
  assert.match(m({ nume: "ion", inv: "80" }), /Unde va avea loc evenimentul\?/);
  assert.match(m({ nume: "ion", inv: "80", loc: "Sibiu" }), /Ce dată aveți în vedere\?/);
  assert.match(m({ nume: "ion", inv: "80", loc: "Sibiu", data: "2027-05-01" }), /pentru 1 mai 2027, Sibiu\. Mulțumim!\nVă pregătesc oferta/);
});

test("pașii unei cereri, de la primul răspuns până la „pierdută”", () => {
  const p = x => C.pasCerere(x, NOW);
  assert.equal(p({ at: ago(1) }).tip, "raspuns");
  assert.equal(p({ at: ago(1) }).nivel, "azi");
  assert.equal(p({ at: ago(25) }).nivel, "urgent");
  assert.equal(p({ at: ago(30), contactAt: ago(20) }), null, "contactat de mai puțin de 2 zile");
  assert.equal(p({ at: ago(80), contactAt: ago(50) }).tip, "oferta");
  const of = { at: ago(24 * 10), st: "oferta", offer: { at: ago(24 * 2) } };
  assert.equal(p(of), null, "ofertă de 2 zile: încă nu");
  assert.equal(p({ ...of, offer: { at: ago(24 * 3) } }).tip, "rev1");
  assert.equal(p({ ...of, offer: { at: ago(24 * 9) }, fu: [{ at: ago(24 * 3) }] }), null, "revenirea 1 acum 3 zile: încă nu");
  assert.equal(p({ ...of, offer: { at: ago(24 * 9) }, fu: [{ at: ago(24 * 4) }] }).tip, "rev2");
  assert.equal(p({ ...of, offer: { at: ago(24 * 20) }, fu: [{ at: ago(24 * 12) }, { at: ago(24 * 7) }] }).tip, "inchide");
  assert.equal(p({ ...of, offer: { at: ago(24 * 5) }, clientAt: ago(24) }), null, "clientul a răspuns ieri: ceasul pornește din nou");
  assert.equal(p({ at: ago(30), amanat: new Date(NOW + 36e5).toISOString() }), null, "amânată");
  assert.equal(p({ at: ago(30), amanat: ago(1) }).tip, "raspuns", "amânarea a expirat");
  assert.equal(p({ at: ago(30), data: "2026-11-01" }).tip, "trecut");
  for (const st of ["ct", "pierduta", "done"]) assert.equal(p({ at: ago(100), st }), null);
});

test("„De făcut”: întâi cele întârziate, apoi după tip și vechime", () => {
  const L = [
    { id: "rev", st: "oferta", at: ago(300), offer: { at: ago(24 * 4) } },
    { id: "nou", at: ago(2) },
    { id: "vechi", at: ago(40) },
    { id: "mai-vechi", at: ago(60) },
  ];
  assert.deepEqual(C.deFacut(L, NOW).map(o => o.x.id), ["mai-vechi", "vechi", "nou", "rev"]);
});

test("timpul mediu de răspuns: mediana, doar din ultimele 90 de zile", () => {
  const L = [
    { at: ago(10), contactAt: ago(9) },          // 1 h
    { at: ago(30), contactAt: ago(27) },         // 3 h
    { at: ago(50), offer: { at: ago(40) } },     // 10 h
    { at: ago(24 * 200), contactAt: ago(1) },   // prea vechi
    { at: ago(5) },                              // fără răspuns încă
  ];
  const t = C.timpRaspuns(L, NOW, 90);
  assert.equal(t.mediana, 3);
  assert.equal(t.n, 3);
  assert.equal(t.subOra, 1);
  assert.equal(C.oreText(0.25), "15 min");
  assert.equal(C.oreText(3), "3 h");
  assert.equal(C.timpRaspuns([], NOW), null);
});

test("rezumatul săptămânii: evenimente cu echipa din fișă, bani, cereri, priorități", () => {
  const R = C.rezumat({
    contracte: [
      { id: "a", nume: "ANA POP", locatie: "NUNTA ANA", dataEv: "2026-11-07", signedId: "s", avansPlatit: false, avans: "100", monedaAvans: "EURO", tel: "0722" },
      { id: "b", nume: "FIRMA", locatie: "CORPORATE", dataEv: "2026-10-20", signedId: "s", avansPlatit: true, restPlatit: false, dataRest: "2026-10-25" },
      { id: "c", nume: "X", locatie: "VIITOR", dataEv: "2026-11-12", avansPlatit: true },
      { id: "d", nume: "Y", locatie: "ACHITAT", dataEv: "2026-10-10", signedId: "s", avansPlatit: true, restPlatit: true },
    ],
    leads: [{ nume: "Ion", at: ago(30) }, { nume: "Vechi", at: "2026-10-28T10:00:00Z", st: "ct" }],
    disp: { u1: { name: "Andrei Pop", conf: { "k|1": "da" } }, u2: { name: "Mihai", conf: { "k|1": "nu" } } },
    sursa: { at: ago(1), fisa: { events: [
      { key: "k|1", name: "Nunta Ana", date: "2026-11-07", time: "18:00", persons: 120, team: ["Andrei", "Mihai", "Vlad"] },
      { key: "k|2", name: "Botez Fara Contract", date: "2026-11-06", team: [] },
    ] }, stoc: { lipsa: [{ label: "Lime", lipsa: 2 }], minus: [] } },
  }, NOW);
  assert.deepEqual(R.evenimente.map(e => e.nume), ["Botez Fara Contract", "Nunta Ana"]);
  const nunta = R.evenimente[1];
  assert.deepEqual(nunta.echipa.map(m => m.nume + ":" + m.conf), ["Andrei:da", "Mihai:nu", "Vlad:null"]);
  assert.equal(nunta.ora, "18:00");
  assert.equal(R.evenimente[0].faraContract, true);
  assert.equal(R.echipaLipsa.length, 1);
  assert.deepEqual(R.neconfirmati.map(n => n.nume), ["Mihai", "Vlad"]);
  assert.deepEqual(R.rest.map(r => [r.nume, r.intarziat]), [["Corporate", true]]);
  assert.deepEqual(R.avans.map(a => [a.nume, a.suma, a.curand]), [["Nunta Ana", "100 €", true]]);
  assert.equal(R.cereri.deFacut.length, 1);
  assert.equal(R.cereri.castigateSaptTrecuta, 1);
  assert.deepEqual(R.viitoare.map(v => v.nume), ["Viitor"]);
  assert.equal(R.prioritati[0], "Diferența de la Corporate (20 octombrie) nu e încasată.");
  assert.ok(R.prioritati.some(p => /Ion așteaptă răspuns de o zi/.test(p)));
  assert.ok(R.prioritati.some(p => /Botez Fara Contract .* nu are echipă/.test(p)));
  assert.ok(R.prioritati.some(p => /Lime|articol nu ajunge/.test(p)));
  assert.equal(R.sursaVeche, null);
});

test("rezumatul anunță când fișa și stocul sunt vechi", () => {
  const R = C.rezumat({ contracte: [], leads: [], sursa: { at: ago(24 * 10) } }, NOW);
  assert.equal(R.sursaVeche, 10);
  assert.match(C.emailHTML(R), /acum 10 zile/);
});

test("emailul nu lasă să treacă HTML din numele clienților", () => {
  const R = C.rezumat({ contracte: [{ nume: "<script>x</script>", locatie: "<img src=x onerror=alert(1)>", dataEv: "2026-11-05", avansPlatit: false }], leads: [{ nume: "<b>Rău</b>", at: ago(30) }] }, NOW);
  const h = C.emailHTML(R);
  assert.ok(!/<script>|<img src=x|<b>Rău/i.test(h));
  assert.match(h, /&lt;img Src=x/);
  assert.match(C.emailText(R), /SĂPTĂMÂNA TA: 2–8 noiembrie/);
});
