/* Testul aplicației: pornește index.html construit, cu Firebase simulat (administrator), deschide fiecare tab
   și verifică cererile de ofertă („De făcut”, reveniri, șabloane) și cardul „Săptămâna ta”.
   Rulare: node --test tests/   (după bash src/build.sh) */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const { seed } = require("./date-test.js");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://app.test/";
const FAKE = fs.readFileSync(path.join(__dirname, "fake-firebase.js"), "utf8");
const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json", ".js": "text/javascript", ".svg": "image/svg+xml" };
let browser, page, S;
const errors = [], blocked = new Set();

async function open() {
  S = seed();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "ro-RO", timezoneId: "Europe/Bucharest", serviceWorkers: "block" });
  await ctx.addInitScript(s => { window.__SEED = s; }, { docs: S.docs, user: S.user });
  await ctx.route("**/*", async route => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN)) {
      const rel = decodeURIComponent(new URL(url).pathname.slice(1)) || "index.html";
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
    }
    if (/firebasejs\/[\d.]+\/firebase-app-compat\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: FAKE });
    if (/firebasejs\/[\d.]+\/firebase-[a-z-]+-compat\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: "" });
    if (/xlsx(\.full)?\.min\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: "window.XLSX={utils:{},read(){return{SheetNames:[],Sheets:{}}},writeFile(){}};" });
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.fulfill({ contentType: "text/css", body: "" });
    blocked.add(new URL(url).host);
    return route.abort();
  });
  page = await ctx.newPage();
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push("console: " + m.text()); });
  await page.goto(ORIGIN + "index.html#k=" + S.TEAM);
  await page.waitForFunction(() => window.CPFS && window.CPCore && window.__qr && window.__rez, null, { timeout: 15000 });
}
const writes = () => page.evaluate(() => window.__WRITES);
const store = p => page.evaluate(p => { const d = window.__STORE.get(p); return d ? JSON.parse(JSON.stringify(d)) : null; }, p);
async function tab(view) { await page.click(`[role=tab][data-view="${view}"]`); await page.waitForSelector(`#v-${view}:not([hidden])`); }

before(async () => { browser = await chromium.launch(); await open(); });
after(async () => { if (browser) await browser.close(); });

test("aplicația pornește ca administrator, fără erori", async () => {
  assert.equal(await page.evaluate(() => window.CPFS.isAdmin), true);
  assert.deepEqual(errors, []);
});

test("fiecare tab se deschide și are conținut, fără erori", async () => {
  const views = await page.$$eval("nav.tabs [role=tab][data-view]", b => b.map(x => x.dataset.view));
  assert.ok(views.length >= 8, "lipsesc taburi: " + views.join(","));
  for (const v of views) {
    await tab(v);
    await page.waitForTimeout(250);
    const len = await page.$eval(`#v-${v}`, el => el.innerText.trim().length);
    assert.ok(len > 0, `tabul ${v} e gol`);
  }
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("Contracte: „De făcut” arată cererile care așteaptă, în ordinea corectă", async () => {
  await tab("contracte");
  await page.waitForSelector(".ld-todo");
  const rows = await page.$$eval(".ld-todo .ld-td", r => r.map(x => ({ nume: x.querySelector("b").textContent, pas: x.querySelector(".ld-pas").textContent, urgent: x.classList.contains("ld-urgent") })));
  assert.deepEqual(rows.map(r => r.nume), ["Ana Marin", "Bogdan", "Carmen Pop", "Dan"]);
  assert.equal(rows[0].urgent, true, "cererea de acum 30 de ore e întârziată");
  assert.match(rows[0].pas, /Fără răspuns de o zi/);
  assert.match(rows[2].pas, /Oferta trimisă acum 5 zile/);
  assert.match(rows[3].pas, /Două reveniri/);
  // Florin (contactat acum 4 ore) și Elena (câștigată) nu apar
  assert.ok(!rows.some(r => /Florin|Elena/.test(r.nume)));
});

test("insigna de pe tabul Contracte numără doar ce e de făcut", async () => {
  assert.equal(await page.$eval('[data-view="contracte"] .tab-n', e => e.textContent), "3");
});

test("mesajele WhatsApp sunt completate din cerere", async () => {
  const prim = await page.$eval('.ld-todo a[data-lu="contact"][data-id="l1"][href*="wa.me"]', a => a.href);
  const t = decodeURIComponent(new URL(prim).searchParams.get("text"));
  assert.match(new URL(prim).pathname, /40744000001/);
  assert.match(t, /^Bună, Ana! Sunt Paul de la Cocktail Philosophy\. Am primit cererea voastră pentru \d+ \w+ \d{4}, Sibiu\. Mulțumim!/);
  const rev = await page.$eval('a[data-lu="rev1"]', a => decodeURIComponent(new URL(a.href).searchParams.get("text")));
  assert.match(rev, /^Bună, Carmen! Revin cu drag la oferta/);
  assert.match(rev, /e încă liberă la noi/);
  assert.match(rev, /Oferta: https:\/\/drive\.example\/oferta\.pdf/);
});

test("„Am vorbit deja” notează contactul, iar „Anulează” îl scoate", async () => {
  await page.click('.ld-td button[data-lu="vorbit"][data-id="l2"]');
  await page.waitForSelector(".ld-undo");
  await page.waitForFunction(() => window.__WRITES.some(w => w.path === "barLead/l2" && w.data.contactAt));
  assert.ok((await store("barLead/l2")).contactAt);
  await page.waitForFunction(() => !document.querySelector('.ld-td [data-id="l2"]'));
  await page.click('.ld-undo [data-lu="undo"]');
  await page.waitForFunction(() => window.__STORE.get("barLead/l2").contactAt == null);
  await page.waitForSelector('.ld-td [data-id="l2"]');
});

test("revenirea pe WhatsApp e notată și cererea iese din „De făcut” până la următoarea", async () => {
  await page.$eval('a[data-lu="rev1"][data-id="l3"]', a => { a.removeAttribute("target"); a.href = "javascript:void 0"; });
  await page.click('a[data-lu="rev1"][data-id="l3"]');
  await page.waitForFunction(() => (window.__STORE.get("barLead/l3").fu || []).length === 1);
  await page.waitForFunction(() => !document.querySelector('.ld-td [data-id="l3"]'));
});

test("„Marchează pierdută” după două reveniri pune motivul „Nu a mai răspuns”", async () => {
  await page.click('.ld-td button[data-lu="pierduta"][data-id="l4"]');
  await page.waitForFunction(() => window.__STORE.get("barLead/l4").st === "pierduta");
  assert.equal((await store("barLead/l4")).lost, "Nu a mai răspuns");
});

test("șabloanele de mesaje se salvează separat de datele firmei", async () => {
  await page.click(".ld-tpl summary");
  const ta = page.locator('textarea[data-tpl="prim"]');
  await ta.fill("Salut, {prenume}! [Pentru {data}?]");
  await page.click('[data-lu="tplsave"]');
  await page.waitForFunction(() => window.__STORE.get(`echipe/TESTTESTTESTTESTTEST1234/privat/sabloane`));
  const s = await store("echipe/TESTTESTTESTTESTTEST1234/privat/sabloane");
  assert.equal(s.t.prim, "Salut, {prenume}! [Pentru {data}?]");
  assert.equal((await store("echipe/TESTTESTTESTTESTTEST1234/privat/firma")).capBar, "2", "datele firmei rămân neatinse");
  const href = await page.$eval('.ld-td a[data-lu="contact"][href*="wa.me"]', a => a.href);
  assert.match(decodeURIComponent(new URL(href).searchParams.get("text")), /^Salut, Ana! Pentru \d+ \w+ \d{4}\?$/);
  await page.click('[data-lu="tplreset"]');
  await page.waitForFunction(() => Object.keys(window.__STORE.get(`echipe/TESTTESTTESTTESTTEST1234/privat/sabloane`).t).length === 0);
});

test("„Săptămâna ta” arată evenimentele, echipa, banii și ce e important", async () => {
  await page.waitForSelector("details.rz");
  await page.$eval("details.rz", d => d.open = true);
  const txt = await page.$eval("details.rz", d => d.innerText);
  assert.match(txt, /Nunta Ana Si Dan/i);
  assert.match(txt, /Andrei/);
  assert.match(txt, /Botez Ionescu/i);
  assert.match(txt, /fără echipă în fișă/);
  assert.match(txt, /Diferența · Corporate Firma/i);
  assert.match(txt, /Avans 100 € · Nunta Ana Si Dan/i);
  assert.match(txt, /lucru|lucruri important/);
  if (process.env.CP_SHOTS) { // capturi pentru verificare vizuală: CP_SHOTS=<folder> node --test tests/
    fs.mkdirSync(process.env.CP_SHOTS, { recursive: true });
    await page.setViewportSize({ width: 430, height: 900 });
    await page.$eval("details.rz", d => d.scrollIntoView());
    await page.screenshot({ path: path.join(process.env.CP_SHOTS, "contracte-telefon.png"), fullPage: true });
    await page.setViewportSize({ width: 1200, height: 900 });
  }
  const conf = await page.$$eval(".rz-m", m => m.map(x => x.className + ":" + x.textContent));
  assert.ok(conf.some(c => /rz-da:Andrei/.test(c)), "Andrei a confirmat");
  assert.ok(conf.some(c => /rz-q:Mihai/.test(c)), "Mihai încă nu");
});

test("aplicația salvează fișa și stocul pentru emailul de luni (privat/rezumat)", async () => {
  await page.waitForFunction(() => window.__STORE.get(`echipe/TESTTESTTESTTESTTEST1234/privat/rezumat`), null, { timeout: 15000 });
  const r = await store("echipe/TESTTESTTESTTESTTEST1234/privat/rezumat");
  assert.equal(r.fisa.events.length, 2);
  assert.equal(r.fisa.events[0].key, S.ds + "|1");
  assert.deepEqual(r.fisa.events[0].team, ["Andrei", "Mihai"]);
  assert.ok(Array.isArray(r.stoc.lipsa));
});

test("nicio eroare în tot testul și nicio cerere spre servicii reale", async () => {
  assert.deepEqual(errors, [], errors.join("\n"));
  const allowed = [];
  const bad = [...blocked].filter(h => !allowed.includes(h));
  // e în regulă să fie blocate (ex. Google Drive), dar le afișăm pentru claritate
  if (bad.length) console.log("Cereri blocate în test:", bad.join(", "));
});
