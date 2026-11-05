/* Testele aplicației de trading (trading.html + trading/model.js): modelul și pagina. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const M = require("../trading/model.js");

const ROOT = path.join(__dirname, "..");
const DATE = JSON.parse(fs.readFileSync(path.join(ROOT, "trading", "spcx.json"), "utf8"));

/* serie artificială: zile de bursă consecutive cu prețuri date */
function serie(preturi) {
  const t0 = Date.UTC(2026, 0, 1);
  return preturi.map((c, i) => [new Date(t0 + i * 864e5).toISOString().slice(0, 10), c, c * 1.01, c * 0.99, c, 1e6 + (i % 7) * 1e5]);
}

test("datele salvate au forma așteptată", () => {
  assert.equal(DATE.simbol, "SPCX");
  assert.ok(DATE.zile.length >= 50);
  for (const z of DATE.zile) { assert.equal(z.length, 6); assert.ok(z[2] >= z[3] && z[4] > 0); }
  const d = DATE.zile.map(z => z[0]); assert.deepEqual(d, [...d].sort());
});

test("RSI și ATR au valori corecte pe cazuri simple", () => {
  const sus = M.indicatori(serie(Array.from({ length: 40 }, (_, i) => 100 + i)));
  assert.equal(sus[39].rsi, 100);
  const jos = M.indicatori(serie(Array.from({ length: 40 }, (_, i) => 200 - i)));
  assert.equal(jos[39].rsi, 0);
  assert.ok(Math.abs(sus[39].atr - 2.39) < 0.3);
});

test("istoric prea scurt: nu dă semnal", () => {
  const r = M.analizeaza(serie(Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i))));
  assert.equal(r.gata, false); assert.match(r.motiv, /prea scurt/);
});

test("pe datele reale dă o probabilitate validă, cu plan coerent", () => {
  for (const H of [3, 5, 10]) {
    const r = M.analizeaza(DATE.zile, { H });
    assert.ok(r.gata);
    assert.ok(r.p > 0 && r.p < 1 && r.incredere > 0 && r.incredere <= 1);
    assert.equal(r.semnal, M.semnal(r.p));
    assert.equal(r.contributii.length, 7);
    const p = M.plan(r, 10000, 1);
    if (p.semnal === "SELL") assert.ok(p.stop > p.pret && p.tinta < p.pret);
    else assert.ok(p.stop < p.pret && p.tinta > p.pret);
    assert.ok(p.bucati * p.riscPeActiune <= 100 + 1e-9);
  }
});

test("un model fără avantaj e tras spre 50%; zgomotul nu dă semnale puternice", () => {
  let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  let c = 100; const pr = Array.from({ length: 120 }, () => (c *= 1 + (rnd() - 0.5) * 0.04));
  const r = M.analizeaza(serie(pr));
  assert.ok(Math.abs(r.p - 0.5) <= Math.abs(r.pBrut - 0.5) + 1e-12);
  assert.ok(Math.abs(r.p - 0.5) < 0.12, "p=" + r.p);
});

test("testul walk-forward nu folosește viitorul", () => {
  const r = M.analizeaza(DATE.zile, { H: 5 });
  const idx = Object.fromEntries(r.rows.map((x, i) => [x.data, i]));
  for (const t of r.test.istoric) assert.ok(idx[t.data] + 5 < r.rows.length);
  // dacă taiem ultimele 10 zile, predicțiile mai vechi rămân identice
  const scurt = M.analizeaza(DATE.zile.slice(0, -10), { H: 5 });
  const vechi = Object.fromEntries(r.test.istoric.map(t => [t.data, t.p]));
  for (const t of scurt.test.istoric) assert.ok(Math.abs(vechi[t.data] - t.p) < 1e-12);
});

test("prețul introdus de mână înlocuiește ziua de azi sau o adaugă", () => {
  const z = DATE.zile, u = z[z.length - 1];
  const a = M.cuPretCurent(z, 150, u[0]); assert.equal(a.length, z.length); assert.equal(a.at(-1)[4], 150);
  const b = M.cuPretCurent(z, 150, "2099-01-01"); assert.equal(b.length, z.length + 1);
  assert.equal(z[z.length - 1][4], u[4], "nu modifică datele originale");
});

/* pagina, în browser */
let browser, page;
const errors = [];
before(async () => {
  const { chromium } = require("playwright");
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/*", r => {
    const u = new URL(r.request().url());
    if (u.protocol !== "http:") return r.abort();
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404 });
    const type = f.endsWith(".html") ? "text/html" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".json") ? "application/json" : "application/octet-stream";
    return r.fulfill({ body: fs.readFileSync(f), contentType: type });
  });
  await page.goto("http://local.test/trading.html");
  await page.waitForFunction(() => document.querySelectorAll("#why li").length === 7);
});
after(async () => { if (browser) await browser.close(); });

test("pagina afișează semnalul, motivele, planul și graficul", async () => {
  const badge = await page.textContent("#badge");
  assert.match(badge, /^(BUY|SELL|AȘTEAPTĂ)\d+% să crească în 5 zile/);
  assert.equal(await page.locator("#plan .kv").count(), 6);
  assert.ok(await page.locator("#chart svg path").count() >= 2);
  assert.equal(await page.locator("#bt .kv").count(), 6);
  const lat = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(lat <= 390, "fără scroll orizontal pe telefon (" + lat + ")");
  if (process.env.CP_SHOTS) { fs.mkdirSync(process.env.CP_SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.CP_SHOTS, "trading.png"), fullPage: true }); }
});

test("orizontul și prețul introdus recalculează", async () => {
  await page.click("#hz button[data-h='10']");
  assert.match(await page.textContent("#badge"), /în 10 zile/);
  const p0 = await page.textContent("#pret");
  await page.fill("#live", "200"); await page.click("#aplica");
  assert.match(await page.textContent("#pret"), /200/);
  assert.match(await page.textContent("#ora"), /introdus/);
  await page.click("#reset");
  assert.equal(await page.textContent("#pret"), p0);
  assert.deepEqual(errors, []);
});
