/* ---------- Meniul 2026: aceeași listă în aplicație, pe site, în portal și la bar ---------- */
/* O singură dată, la prima deschidere ca administrator: rețetele salvate în baza de date se aduc la meniul de pe site
   (Passiflora -> Pornstar Cuban, Limonadă cu ghimbir -> Tesla, Villalobos, fără Epicur, plus Aperol Spritz, Botanical G&T, Cuba Libre, Amaretto Sour). */
(function(){
const F=window.CPFS;if(!F||!F.isAdmin)return;
const M=[["erasmus", "Erasmus", "sig", "proaspăt · picant", "vodka, ghimbir, pere, lime", "Ghimbirul încălzește, para îmblânzește."], ["harmony", "Harmony", "sig", "floral · fructat", "gin, lychee, lămâie, merișoare, sirop de soc", "Flori de soc și lychee, ușor acrișor."], ["platon", "Platon", "sig", "herbal · citric", "gin, lămâie, aloe vera, grapefruit, cimbrișor", "Limpede, amărui, cu un gând de cimbrișor."], ["whiskey-sour", "Whiskey Sour", "sig", "catifelat · acrișor", "whiskey, migdale, portocală, lămâie, bitter", "Clasicul, rescris cu migdale și portocală."], ["passiflora", "Pornstar Cuban", "sig", "tropical · dulce-acrișor", "rom, fructul pasiunii, lămâie", "Soare în pahar, pe ritm cubanez."], ["hugo", "Hugo", "cls", "", "prosecco, soc, lime, apă minerală", ""], ["aperol-spritz", "Aperol Spritz", "cls", "", "Aperol, prosecco, apă minerală", ""], ["paloma", "Paloma", "cls", "", "tequila, grapefruit, lime, Tajín", ""], ["negroni", "Negroni", "cls", "", "gin, Campari, vermut", ""], ["gin-tonic", "Botanical G&T", "cls", "", "gin, apă tonică, ierburi & citrice", ""], ["cuba-libre", "Cuba Libre", "cls", "", "rom, lime, Coca-Cola", ""], ["amaretto-sour", "Amaretto Sour", "cls", "", "Disaronno, portocală, lămâie", ""], ["socrate", "Socrate", "zero", "0% alcool", "aloe vera, grapefruit, lămâie", "Răcoritor, cu un final amărui."], ["limonada-ghimbir", "Tesla", "zero", "0% alcool", "sirop de ghimbir, pere, lămâie, apă minerală", "Spumos, cu scânteie de ghimbir."], ["villa-lobos", "Villalobos", "zero", "0% alcool", "lychee, cranberry, lămâie", "Roz, fructat, ușor acrișor."], ["green-apple", "Special Green Apple", "zero", "0% alcool", "mere verzi, scorțișoară & migdale, lămâie", "Ca o plăcintă cu mere, dar rece."]],NEW={"aperol-spritz": {"base": "Aperol", "glass": "glob", "tech": "Build", "ing": [{"q": 50, "u": "ml", "n": "Aperol", "k": "spirit"}, {"q": 75, "u": "ml", "n": "Prosecco", "k": "spirit"}, {"q": null, "u": "top", "n": "Apă minerală", "k": "other"}], "steps": ["Build: umpleți paharul glob cu gheață.", "Turnați Prosecco, apoi Aperolul.", "Top: completați cu apă minerală și amestecați ușor o dată."], "garnish": ["Felie de portocală"]}, "gin-tonic": {"base": "Gin", "glass": "glob", "tech": "Build", "ing": [{"q": 40, "u": "ml", "n": "Gin", "k": "spirit"}, {"q": null, "u": "top", "n": "Apă tonică", "k": "other"}], "steps": ["Build: umpleți paharul glob cu gheață și puneți botanicele.", "Turnați ginul.", "Top: completați cu apă tonică, turnată pe lingurița de bar, și amestecați ușor."], "garnish": ["Rozmarin sau cimbrișor", "Coajă de lămâie sau grapefruit", "Boabe de ienupăr"]}, "cuba-libre": {"base": "Rom", "glass": "glob", "tech": "Build", "ing": [{"q": 40, "u": "ml", "n": "Rom", "k": "spirit"}, {"q": 2, "u": "pepenași", "n": "Lime", "k": "fruit"}, {"q": null, "u": "top", "n": "Coca-Cola", "k": "other"}], "steps": ["Stoarceți pepenașii de lime în pahar și lăsați-i înăuntru.", "Build: adăugați gheața și romul.", "Top: completați cu Coca-Cola și amestecați ușor."], "garnish": ["Pepenaș de lime"]}, "amaretto-sour": {"base": "Amaretto", "glass": "", "tech": "Shake & Strain", "ing": [{"q": 50, "u": "ml", "n": "Disaronno", "k": "spirit"}, {"q": 20, "u": "ml", "n": "Suc de lămâie", "k": "juice"}, {"q": 20, "u": "ml", "n": "Suc de portocale", "k": "juice"}], "steps": ["Agitați energic ingredientele cu gheață în shaker.", "Strecurați peste gheață proaspătă, direct în pahar."], "garnish": ["Coajă de portocală"]}},DROP=["epicur", "epicur-fara-alcool"];
function apply(L){
  const by={};L.forEach(r=>{if(r&&r.id&&!DROP.includes(r.id))by[r.id]=r});
  const out=M.map(([id,name,sec,gust,ingM,desc])=>{const r=by[id]||{id,...NEW[id]};delete by[id];return {...r,name,zero:sec==="zero",sec,gust,ingM,desc}});
  return out.concat(Object.values(by));
}
F.fs.doc(`${F.base}/config/retete`).get().then(async d=>{
  const x=d.exists?d.data():null;if(x&&x.meniu2026)return;
  let L=[];try{L=JSON.parse(x&&x.json||document.getElementById("recipes-data").textContent)}catch(e){return}
  const json=JSON.stringify(apply(L));
  await F.fs.doc(`${F.base}/config/retete`).set({json,at:new Date().toISOString(),meniu2026:true});
  document.getElementById("recipes-data").textContent=json;R=JSON.parse(json);refreshAll();
  toast("Rețetarul a fost adus la Meniul 2026 de pe site.");
}).catch(e=>console.warn("meniu2026",e));
})();
/* O singură dată, ca administrator: rețetele noi (nov. 2026) se adaugă în rețetarul salvat, dacă nu sunt deja.
   Nu se schimbă nimic la rețetele existente; ce ștergi după aceea nu mai revine. */
(function(){
const F=window.CPFS;if(!F||!F.isAdmin)return;
const NOI=[{"id": "espresso-martini", "name": "Espresso Martini", "zero": false, "base": "Vodka", "glass": "", "tech": "Shake · Strain", "ing": [{"q": 40, "u": "ml", "n": "Vodka", "k": "spirit"}, {"q": 20, "u": "ml", "n": "Lichior de cafea", "k": "spirit"}, {"q": 30, "u": "ml", "n": "Espresso proaspăt", "k": "other"}, {"q": 10, "u": "ml", "n": "Sirop de zahăr", "k": "premix"}], "steps": ["Shake: toate ingredientele cu multă gheață, foarte tare, 15 secunde (face spuma).", "Strain: strecurați fin în cupă sau pahar de martini, fără gheață."], "garnish": ["3 boabe de cafea"], "sec": "cls", "gust": "cafea · catifelat", "ingM": "vodka, espresso, lichior de cafea", "desc": "Cafea și vodka, cu spumă fină."}, {"id": "pornstar-martini", "name": "Pornstar Martini", "zero": false, "base": "Vodka", "glass": "", "tech": "Shake · Strain", "ing": [{"q": 40, "u": "ml", "n": "Vodka", "k": "spirit"}, {"q": 25, "u": "ml", "n": "Premix Passiflora", "k": "premix"}, {"q": 15, "u": "ml", "n": "Suc de lime", "k": "juice"}, {"q": 30, "u": "ml", "n": "Prosecco (shot alături)", "k": "spirit"}], "steps": ["Shake: vodka, premixul Passiflora și lime-ul, tare, cu gheață.", "Strain: strecurați fin în cupă, fără gheață.", "Serviți cu un shot mic de prosecco alături (sau turnat deasupra, la evenimente mari)."], "garnish": ["Jumătate de fruct al pasiunii"], "sec": "cls", "gust": "fructat · vanilie", "ingM": "vodka, fructul pasiunii, vanilie, lime, prosecco", "desc": "Fructul pasiunii, vanilie și un shot de prosecco alături."}, {"id": "tonic-botanic", "name": "Tonic Botanic", "zero": true, "base": "Apă tonică", "glass": "glob", "tech": "Build", "ing": [{"q": 40, "u": "ml", "n": "Suc de grapefruit", "k": "juice"}, {"q": 15, "u": "ml", "n": "Suc de lime", "k": "juice"}, {"q": 15, "u": "ml", "n": "Premix Hugo", "k": "premix"}, {"q": 120, "u": "ml", "n": "Apă tonică", "k": "other"}], "steps": ["Build: umpleți paharul glob cu gheață.", "Turnați grapefruitul, lime-ul și premixul Hugo.", "Completați cu apă tonică și amestecați ușor o dată."], "garnish": ["Rozmarin", "Felie de grapefruit"], "sec": "zero", "gust": "0% alcool · amărui", "ingM": "apă tonică, grapefruit, soc, lime, rozmarin", "desc": "Ca un gin tonic, fără gin."}];
F.fs.doc(`${F.base}/config/retete`).get().then(async d=>{
  const x=d.exists?d.data():null;if(!x||!x.json||x.noi2611)return;
  let L=[];try{L=JSON.parse(x.json)}catch(e){return}
  const have=new Set(L.map(r=>r&&r.id)),add=NOI.filter(r=>!have.has(r.id));
  if(add.length){const z=L.findIndex(r=>r&&r.zero);const al=add.filter(r=>!r.zero),zr=add.filter(r=>r.zero);
    if(z<0)L=L.concat(al,zr);else L=L.slice(0,z).concat(al,L.slice(z),zr)}
  const json=JSON.stringify(L);
  await F.fs.doc(`${F.base}/config/retete`).set({json,at:new Date().toISOString(),noi2611:true},{merge:true});
  document.getElementById("recipes-data").textContent=json;R=JSON.parse(json);refreshAll();
  if(add.length)toast(`Am adăugat în rețetar: ${add.map(r=>r.name).join(", ")}.`);
}).catch(e=>console.warn("noi2611",e));
})();

/* O singură dată, ca administrator: scot cocktailul Kiwi Passion din rețetarul salvat (nov. 2026).
   Meniul de pe site și de la bar se actualizează singur din rețetar. */
(function(){
const F=window.CPFS;if(!F||!F.isAdmin)return;
F.fs.doc(`${F.base}/config/retete`).get().then(async d=>{
  const x=d.exists?d.data():null;if(!x||!x.json||x.faraKiwi)return;
  let L=[];try{L=JSON.parse(x.json)}catch(e){return}
  const n=L.length;L=L.filter(r=>!(r&&(r.id==="kiwi-passion"||/kiwi/i.test(r.name||""))));
  const json=JSON.stringify(L);
  await F.fs.doc(`${F.base}/config/retete`).set({json,at:new Date().toISOString(),faraKiwi:true},{merge:true});
  if(L.length<n){document.getElementById("recipes-data").textContent=json;R=JSON.parse(json);refreshAll();toast("Am scos Kiwi Passion din rețetar și din meniu.")}
}).catch(e=>console.warn("faraKiwi",e));
})();
