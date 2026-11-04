/* Testele site-ului nou: etichetele SEO la zi, imaginile de previzualizare, datele structurate și măsurarea apăsărilor. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, ".."), SN = path.join(ROOT, "site-nou");
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/seo-pagini.json"), "utf8"));
const PAGES = Object.keys(CFG.pagini);
const ASSETS = CFG.assets;
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { if (browser) await browser.close(); });

test("etichetele SEO sunt la zi cu titlurile, întrebările și prețurile (tools/seo-site.py --check)", () => {
  execFileSync("python3", [path.join(ROOT, "tools/seo-site.py"), "--check"], { stdio: "pipe" });
});

test("fiecare pagină are canonical, Open Graph complet și date structurate valide", () => {
  for (const f of PAGES) {
    const h = fs.readFileSync(path.join(SN, f), "utf8"), p = CFG.pagini[f];
    const meta = n => (h.match(new RegExp(`<meta (?:property|name)="${n}" content="([^"]*)">`)) || [])[1];
    assert.equal((h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1], CFG.site + p.url, f);
    for (const k of ["og:title", "og:description", "og:image", "og:url", "twitter:card"]) assert.ok(meta(k), `${f}: lipsește ${k}`);
    assert.ok(meta("og:description").length > 50, `${f}: descriere prea scurtă`);
    const img = meta("og:image").replace(ASSETS, "");
    assert.ok(fs.existsSync(path.join(SN, img)), `${f}: lipsește imaginea ${img}`);
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const types = ld["@graph"].map(x => x["@type"]);
    assert.ok(types.includes("LocalBusiness") && types.includes("WebPage"), f);
    const lb = ld["@graph"].find(x => x["@type"] === "LocalBusiness");
    assert.equal(lb.telephone, "+40743785655");
    assert.equal(lb.address.addressLocality, "Sibiu");
    const faqHtml = (h.match(/<div class="faq-list">([\s\S]*?)<\/div>/) || [])[1];
    const nFaq = faqHtml ? (faqHtml.match(/<summary>/g) || []).length : 0;
    const faq = ld["@graph"].find(x => x["@type"] === "FAQPage");
    assert.equal(faq ? faq.mainEntity.length : 0, nFaq, `${f}: întrebările din schema ≠ cele de pe pagină`);
    if (faq) for (const q of faq.mainEntity) assert.ok(q.name.endsWith("?") && q.acceptedAnswer.text.length > 5 && !/[<>]/.test(q.acceptedAnswer.text), `${f}: ${q.name}`);
    assert.ok(h.includes(`${ASSETS}masurare.js`), `${f}: lipsește masurare.js`);
  }
});

test("imaginile de previzualizare au 1200×630 și sunt sub 300 KB (cerința WhatsApp)", () => {
  for (const f of PAGES) {
    const b = fs.readFileSync(path.join(SN, "img/og", f.replace(".html", ".jpg")));
    let i = 2, w = 0, hgt = 0;
    while (i < b.length) { const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) { hgt = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; } i += 2 + len; }
    assert.deepEqual([w, hgt], [1200, 630], f);
    assert.ok(b.length < 300 * 1024, `${f}: ${Math.round(b.length / 1024)} KB`);
  }
});

test("apăsările pe WhatsApp, telefon, email, rețele și întrebări ajung în Analytics", async () => {
  const ctx = await browser.newContext();
  await ctx.route("**/*", route => {
    const u = route.request().url();
    if (u.startsWith(ASSETS)) { const f = path.join(SN, new URL(u).pathname.split("/site-nou/")[1]); return fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: "" }); }
    if (u.startsWith("https://site.test/")) return route.fulfill({ path: path.join(SN, new URL(u).pathname.slice(1)), contentType: "text/html; charset=utf-8" });
    return route.abort();
  });
  await ctx.addInitScript(() => { window.__ev = []; window.gtag = (...a) => window.__ev.push(a); });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto("https://site.test/index.html");
  await page.waitForFunction(() => window.__cpMasurare);
  // linkurile nu pleacă din pagină în test
  await page.evaluate(() => document.addEventListener("click", e => { if (e.target.closest("a")) e.preventDefault(); }));
  await page.click('a[href^="https://wa.me/"] >> nth=0');
  await page.click('footer a[href^="tel:"]');
  await page.click('footer a[href^="mailto:"]');
  await page.click('footer a[href*="instagram.com"]');
  await page.click('a.rev[href*="facebook.com"]');
  await page.click(".faq-list details:nth-of-type(2) summary");
  await page.waitForTimeout(100);
  const ev = await page.evaluate(() => window.__ev.filter(a => a[0] === "event").map(a => [a[1], a[2].zona || a[2].intrebare || "", a[2].retea || ""]));
  const names = ev.map(e => e[0]);
  assert.deepEqual(names, ["click_whatsapp", "click_telefon", "click_email", "click_social", "click_recenzii", "intrebare_citita"]);
  assert.equal(ev[1][1], "subsol");
  assert.equal(ev[3][2], "instagram");
  assert.match(ev[5][1], /spațiu/);
  await page.goto("https://site.test/oferte.html");
  await page.waitForFunction(() => window.__cpMasurare);
  await page.fill("#cpN", "200");
  await page.fill("#cpN", "220");
  const calc = await page.evaluate(() => window.__ev.filter(a => a[1] === "calculator_folosit").length);
  assert.equal(calc, 1, "calculatorul se numără o singură dată pe vizită");
  assert.deepEqual(errs, []);
  await ctx.close();
});
