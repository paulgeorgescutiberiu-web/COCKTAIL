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
