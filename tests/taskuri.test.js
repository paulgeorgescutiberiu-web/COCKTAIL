/* Testele aplicației de taskuri (taskuri.html): înțelegerea textului scris liber și fluxul de bază. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { chromium } = require("playwright");

const FILE = "file://" + path.join(__dirname, "..", "taskuri.html");
let browser, page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  // joi, 5 noiembrie 2026, 10:00
  await page.clock.install({ time: new Date(2026, 10, 5, 10, 0) });
  await page.goto(FILE);
});
after(async () => { if (browser) await browser.close(); });

const parse = s => page.evaluate(t => window.__taskuri.parse(t), s);

test("înțelege data, ora, eticheta și prioritatea", async () => {
  let p = await parse("sun la furnizor mâine la 10 #stoc !");
  assert.equal(p.text, "Sun la furnizor");
  assert.equal(p.due, "2026-11-06"); assert.equal(p.time, "10:00");
  assert.deepEqual(p.tags, ["stoc"]); assert.equal(p.pri, 1);
  p = await parse("comand gheață vineri la 3");
  assert.equal(p.due, "2026-11-06"); assert.equal(p.time, "15:00"); assert.equal(p.text, "Comand gheață");
  p = await parse("ofertă Ana 20.11 la 12:30 urgent");
  assert.equal(p.due, "2026-11-20"); assert.equal(p.time, "12:30"); assert.equal(p.pri, 2); assert.equal(p.text, "Ofertă Ana");
  p = await parse("plata chiriei 2 ianuarie");
  assert.equal(p.due, "2027-01-02");
  p = await parse("peste 2 luni verific contractul");
  assert.equal(p.due, "2027-01-05"); assert.equal(p.text, "Verific contractul");
  p = await parse("mâine dimineață sun la bancă");
  assert.equal(p.time, "09:00"); assert.equal(p.text, "Sun la bancă");
});

test("nu confundă cantitățile cu ora și recunoaște tipul și repetarea", async () => {
  let p = await parse("bar la 120 de persoane");
  assert.equal(p.time, null); assert.equal(p.due, null);
  p = await parse("bar pentru 80 persoane la 15 noiembrie");
  assert.equal(p.time, null); assert.equal(p.due, "2026-11-15");
  p = await parse("idee: cocktail cu cătină #meniu");
  assert.equal(p.kind, "idea"); assert.equal(p.text, "Cocktail cu cătină");
  p = await parse("notă: codul de la depozit e 4821");
  assert.equal(p.kind, "note"); assert.equal(p.text, "Codul de la depozit e 4821");
  p = await parse("inventar în fiecare luni");
  assert.equal(p.rep, "sapt"); assert.equal(p.due, "2026-11-09"); assert.equal(p.text, "Inventar");
  p = await parse("învăț să fac sifon cândva");
  assert.equal(p.someday, true); assert.equal(p.text, "Învăț să fac sifon");
});

test("notez, sortez din Inbox, bifez, anulez și păstrez după reîncărcare", async () => {
  await page.fill("#in", "verific stocul de lămâi");
  await page.press("#in", "Enter");
  await page.waitForSelector("li.it");
  assert.equal(await page.locator("#title").innerText(), "Inbox 1");
  await page.click("li.it [data-to=azi]");
  await page.waitForFunction(() => !document.querySelector("li.it"));
  await page.click(".bnav [data-view=azi], .side [data-view=azi] >> visible=true");
  await page.waitForSelector("li.it");
  // un task repetat revine la data următoare după bifare
  await page.fill("#in", "număr casa zilnic");
  await page.press("#in", "Enter");
  await page.waitForFunction(() => document.querySelectorAll("li.it").length === 2);
  const id = await page.evaluate(() => window.__taskuri.state().items.find(i => i.rep).id);
  await page.click(`li[data-id="${id}"] .ck`);
  await page.waitForFunction(() => document.querySelectorAll("li.it").length === 1);
  assert.equal(await page.evaluate(i => window.__taskuri.state().items.find(x => x.id === i).due, id), "2026-11-06");
  await page.click("li.it .ck");
  await page.waitForFunction(() => !document.querySelector("li.it"));
  await page.click("#toast-u");
  await page.waitForSelector("li.it");
  await page.reload();
  await page.waitForSelector("li.it");
  assert.equal(await page.evaluate(() => window.__taskuri.state().items.length), 2);
});

/* Sincronizarea, cu Firebase simulat (tests/fake-firebase.js): ce e în baza de date ajunge pe dispozitiv,
   ce notezi pleacă în baza de date, modificările și ștergerile de pe alt dispozitiv se aplică. */
const fs = require("fs");
const FAKE = fs.readFileSync(path.join(__dirname, "fake-firebase.js"), "utf8");
const TEAM = "TestEchipaCod1234567890";
const COL = `echipe/${TEAM}/privat`;
/* SDK-ul real e înlocuit cu cel simulat; restul scripturilor Firebase sunt goale (regula adăugată ultima are prioritate, deci una singură) */
const routes = ctx => ctx.route(/gstatic\.com|googleapis\.com/, r => {
  const u = r.request().url();
  if (/firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: "text/javascript", body: FAKE });
  if (/firebasejs\//.test(u)) return r.fulfill({ contentType: "text/javascript", body: "" });
  return r.abort();
});
const remote = (id, x) => ({ _t: "task", id, text: "De pe telefon", kind: "task", notes: "", due: "2026-11-05", time: null, pri: 0, tags: [], rep: null, someday: false, triaged: true, done: false, doneAt: null, created: 1, upd: 1000, ...x });

test("sincronizare: îmbină ce e local cu ce e în baza de date și trimite modificările", async () => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(([seed, team]) => {
    window.__SEED = seed;
    if (!localStorage.getItem("cp-taskuri-v1")) {
      localStorage.setItem("cp-team", team);
      localStorage.setItem("cp-taskuri-v1", JSON.stringify({ v: 1, sync: true, items: [{ id: "l1", text: "Doar pe laptop", kind: "task", notes: "", due: null, time: null, pri: 0, tags: [], rep: null, someday: false, triaged: false, done: false, doneAt: null, created: 5, upd: 5 }] }));
    }
  }, [{ docs: { [`${COL}/tk_r1`]: remote("r1"), [`${COL}/bani`]: { curs: "5" } } }, TEAM]);
  await routes(ctx);
  const p = await ctx.newPage();
  await p.goto(FILE);
  await p.waitForFunction(() => window.__taskuri.sync() === "ok");
  const ids = () => p.evaluate(() => window.__taskuri.state().items.map(i => i.id + ":" + i.text).sort());
  assert.deepEqual(await ids(), ["l1:Doar pe laptop", "r1:De pe telefon"]);
  const sentPaths = () => p.evaluate(() => window.__WRITES.map(w => w.path));
  assert.ok((await sentPaths()).includes(`${COL}/tk_l1`), "taskul local a plecat în baza de date");
  assert.ok(!(await sentPaths()).includes(`${COL}/bani`), "nu atinge celelalte documente private");

  // notez ceva nou: pleacă imediat
  await p.fill("#in", "comand gheață vineri #stoc");
  await p.press("#in", "Enter");
  await p.waitForFunction(() => window.__WRITES.some(w => w.data && w.data.text === "Comand gheață" && w.data.due === "2026-11-06"));

  // modificat pe alt dispozitiv, mai recent: se aplică aici
  await p.evaluate(([c, d]) => firebase.firestore().doc(c + "/tk_r1").set(d), [COL, remote("r1", { text: "Modificat pe telefon", upd: Date.now() + 5000 })]);
  await p.waitForFunction(() => window.__taskuri.state().items.some(i => i.text === "Modificat pe telefon"));
  // o variantă mai veche nu suprascrie
  await p.evaluate(([c, d]) => firebase.firestore().doc(c + "/tk_r1").set(d), [COL, remote("r1", { text: "Varianta veche", upd: 2 })]);
  await p.waitForTimeout(100);
  assert.ok(await p.evaluate(() => window.__taskuri.state().items.some(i => i.text === "Modificat pe telefon")));

  // șters aici: pleacă o marcă de ștergere
  await p.click('[data-view="inbox"] >> visible=true');
  await p.click('li[data-id="l1"] [data-to="del"]');
  await p.waitForFunction(c => window.__WRITES.some(w => w.path === c + "/tk_l1" && w.data && w.data.del === true), COL);
  // șters pe alt dispozitiv: dispare și aici
  await p.evaluate(([c]) => firebase.firestore().doc(c + "/tk_r1").set({ _t: "task", id: "r1", del: true, upd: Date.now() + 9000 }), [COL]);
  await p.waitForFunction(() => !window.__taskuri.state().items.some(i => i.id === "r1"));

  // după reîncărcare nu mai rămâne nimic de trimis
  assert.equal(await p.evaluate(() => Object.keys(window.__taskuri.state().dirty).length), 0);
  await ctx.close();
});

test("sincronizare: fără contul lui Paul cere intrarea cu Google, fără codul echipei îl cere", async () => {
  for (const [team, user, want] of [[TEAM, { email: "altcineva@gmail.com" }, "auth"], [null, null, "noteam"]]) {
    const ctx = await browser.newContext();
    await ctx.addInitScript(([seed, team]) => {
      window.__SEED = seed;
      if (team) localStorage.setItem("cp-team", team);
      localStorage.setItem("cp-taskuri-v1", JSON.stringify({ v: 1, sync: true, items: [] }));
    }, [{ docs: {}, user }, team]);
    await routes(ctx);
    const p = await ctx.newPage();
    await p.goto(FILE);
    await p.waitForFunction(w => window.__taskuri.sync() === w, want);
    await p.click("#b-sync");
    assert.ok(await p.locator(want === "auth" ? '[data-sy="login"]' : "#s-team").isVisible());
    await ctx.close();
  }
});
