/* Date de test, calculate față de ziua de azi, ca testele să meargă în orice zi. */
const C = require("../src/cp-core.js");
const TEAM = "TESTTESTTESTTESTTEST1234";
const B = `echipe/${TEAM}`;

function seed(now = new Date()) {
  const zi = n => C.iso(C.addDays(now, n));
  const ore = h => new Date(now.getTime() - h * 36e5).toISOString();
  const W = C.saptamana(now);
  const azi = C.iso(now);
  const dmy = s => s.split("-").reverse().join(".");
  const fileName = `Evenimente saptamana ${W.de}.xlsx`;
  const aoa = [
    ["", "NUNTA ANA SI DAN", "BOTEZ IONESCU"],
    ["DATA", dmy(azi), dmy(azi)],
    ["ORA", "18:00", "14:00"],
    ["NR PERSOANE", 120, 60],
    ["ECHIPA", "Andrei, Mihai", ""],
    ["GHEATA", 20, 10],
    ["LIME", 4, 2],
  ];
  const ds = "d-" + fileName.replace(/[^A-Za-z0-9_\-.~:@+]/g, "-").slice(0, 150);
  const docs = {
    [`${B}/config/evenimente`]: { json: JSON.stringify({ fileName, aoa }), at: ore(30) },
    [`${B}/oameni/uid-paul`]: { name: "Paul" },
    [`${B}/privat/firma`]: { capBar: "2" },
    [`${B}/disp/uid-andrei`]: { name: "Andrei", conf: { [`${ds}|1`]: "da" } },
    [`${B}/disp/uid-mihai`]: { name: "Mihai", conf: {} },
    // contracte: unul în săptămâna asta, semnat, fără avans; unul trecut, cu diferența neîncasată; unul viitor
    [`${B}/contracte/c1`]: { nume: "ANA POPESCU", locatie: "NUNTA ANA SI DAN", dataEv: azi, oraEv: "18:00", invitati: "120", tel: "0722111222", signedId: "x", avansPlatit: false, avans: "100", monedaAvans: "EURO", dataContract: zi(-40) },
    [`${B}/contracte/c2`]: { nume: "FIRMA SRL", locatie: "CORPORATE FIRMA", dataEv: zi(-20), signedId: "y", avansPlatit: true, restPlatit: false, dataRest: zi(-15), tel: "0733000111", dataContract: zi(-60) },
    [`${B}/contracte/c3`]: { nume: "ION VASILE", locatie: "MAJORAT", dataEv: zi(60), avansPlatit: true, restPlatit: false, dataRest: zi(61), dataContract: zi(-3) },
    // cereri de ofertă în toate stările care contează
    ["barLead/l1"]: { nume: "Ana Marin", tel: "0744000001", data: zi(200), loc: "Sibiu", at: ore(30), ev: "site-nunti", evn: "Site · Nunți" },
    ["barLead/l2"]: { nume: "Bogdan", tel: "0744000002", at: ore(2), ev: "sursa-whatsapp", evn: "WhatsApp" },
    ["barLead/l3"]: { nume: "Carmen Pop", tel: "0744000003", data: zi(150), st: "oferta", at: ore(24 * 9), contactAt: ore(24 * 8.9), offer: { pachet: "ai", inv: "100", pp: 15.4, total: 1540, at: ore(24 * 5), link: "https://drive.example/oferta.pdf", val: zi(10) } },
    ["barLead/l4"]: { nume: "Dan", tel: "0744000004", st: "oferta", at: ore(24 * 30), offer: { at: ore(24 * 30), total: 900 }, fu: [{ at: ore(24 * 25) }, { at: ore(24 * 20) }] },
    ["barLead/l5"]: { nume: "Elena", tel: "0744000005", st: "ct", at: ore(24 * 12) },
    ["barLead/l6"]: { nume: "Florin", tel: "0744000006", at: ore(5), contactAt: ore(4) },
  };
  return { TEAM, B, ds, docs, user: {} };
}
module.exports = { seed, TEAM, B };
