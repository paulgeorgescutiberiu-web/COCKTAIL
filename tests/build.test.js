/* index.html din repo trebuie să fie exact ce iese din src/ (altfel cineva a schimbat index.html de mână
   sau a uitat să ruleze bash src/build.sh după o modificare în src/). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");

test("index.html e la zi cu sursele din src/", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cp-build-"));
  try {
    fs.cpSync(path.join(ROOT, "src"), path.join(tmp, "src"), { recursive: true, filter: s => !/base2\.html$|[\\/]index\.html$/.test(s) });
    fs.mkdirSync(path.join(tmp, "site-nou"));
    fs.copyFileSync(path.join(ROOT, "site-nou/preturi.js"), path.join(tmp, "site-nou/preturi.js"));
    execFileSync("bash", [path.join(tmp, "src/build.sh")], { stdio: "pipe" });
    const built = fs.readFileSync(path.join(tmp, "index.html"), "utf8"), repo = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.ok(built === repo, "index.html nu e construit din sursele actuale. Rulează: bash src/build.sh");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("logica comună nu conține „</script” (ar rupe aplicația, care o pune în pagină)", () => {
  assert.ok(!fs.readFileSync(path.join(ROOT, "src/cp-core.js"), "utf8").includes("</script"));
});
