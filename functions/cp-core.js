/* Cocktail Philosophy · logica comună (fără ecran, fără Firebase).
   Aceeași bucată de cod rulează în trei locuri:
     - în aplicație (window.CPCore): cererile de ofertă „De făcut” și cardul „Săptămâna ta”;
     - în raportul de luni pe email (tools/rezumat/trimite.js, prin require);
     - în teste (tests/core.test.js).
   Tot ce ține de date și de reguli stă aici, ca cele trei să spună același lucru. */
(function(root,factory){const m=factory();if(typeof module==="object"&&module.exports)module.exports=m;else root.CPCore=m})(typeof self!=="undefined"?self:this,function(){
"use strict";
const MON=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const ZI=["duminică","luni","marți","miercuri","joi","vineri","sâmbătă"];
const H=36e5,D=864e5;

/* ---------- date ---------- */
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDay=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dataLunga=s=>{const d=parseDay(s);return d?`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`:""};
const dataScurta=s=>{const d=parseDay(s);return d?`${d.getDate()} ${MON[d.getMonth()]}`:""};
const ziSiData=s=>{const d=parseDay(s);return d?`${ZI[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`:""};
/* luni–duminică pentru săptămâna în care e `now` */
function saptamana(now){const d=new Date(now);d.setHours(0,0,0,0);const a=addDays(d,-((d.getDay()+6)%7));return {de:iso(a),pana:iso(addDays(a,6)),luni:a}}
const ms=v=>{if(!v)return 0;if(typeof v==="number")return v;if(v instanceof Date)return v.getTime();const t=Date.parse(v);return isNaN(t)?0:t};
function deCand(t,now){const x=Math.max(0,now-t);if(x<H)return "acum "+Math.max(1,Math.round(x/6e4))+" min";
  if(x<D){const h=Math.round(x/H);return h===1?"de o oră":`de ${h} ore`}const z=Math.floor(x/D);return z===1?"de o zi":`de ${z} zile`}

/* ---------- text ---------- */
const prenume=s=>{const w=String(s||"").trim().split(/\s+/)[0]||"";return w?w.charAt(0).toLocaleUpperCase("ro-RO")+w.slice(1).toLocaleLowerCase("ro-RO"):""};
const titlu=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
const eur=v=>(Math.round((+v||0)*100)/100).toLocaleString("ro-RO",{maximumFractionDigits:2})+" €";
const nrm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9 ]+/g," ").split(/\s+/).filter(w=>w.length>2);
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};

/* ---------- cererile de ofertă: cine așteaptă un răspuns de la noi ---------- */
const REGULI={
  raspunsOre:24,      // o cerere nouă fără niciun contact de atâtea ore e „întârziată”
  ofertaZile:2,       // ai vorbit cu clientul, dar n-ai trimis oferta de atâtea zile
  rev1Zile:3,         // prima revenire, la atâtea zile după ofertă
  rev2Zile:4,         // a doua (ultima) revenire, la atâtea zile după prima
  inchideZile:7       // după ultima revenire fără răspuns, propunem „Pierdută”
};
/* Șabloanele mesajelor. {cuvânt} se înlocuiește; [ ... ] e o bucată care dispare dacă un {cuvânt} din ea e gol. */
const SABLOANE={
  prim:"Bună, {prenume}! Sunt Paul de la Cocktail Philosophy. Am primit cererea voastră[ pentru {data}][, {locatie}]. Mulțumim!\n{intrebare}",
  rev1:"Bună, {prenume}! Revin cu drag la oferta pentru evenimentul vostru[ din {data}]. Ați apucat să vă uitați pe ea?\nDacă vreți să ajustăm ceva (meniul, numărul de invitați, pachetul), vă ajut imediat.[ {data_libera}][\n\nOferta: {link_oferta}]",
  rev2:"Bună, {prenume}! Ultimul mesaj de la mine, ca să nu vă deranjez.[ Oferta rămâne valabilă până pe {valabil}.] Dacă ați ales între timp altă variantă, e perfect în regulă, mi-ar prinde bine doar să știu.\nVă doresc un eveniment minunat!"
};
const SABLON_NUME={prim:"Primul mesaj",rev1:"Revenirea 1 (după ofertă)",rev2:"Revenirea 2 (ultima)"};
function completeaza(tpl,ctx){
  const val=k=>{const v=ctx[k];return v==null?"":String(v).trim()};
  const fill=s=>s.replace(/\{([a-z_]+)\}/g,(m,k)=>val(k));
  let out=String(tpl||"").replace(/\[([^\[\]]*)\]/g,(m,inner)=>{const keys=[...inner.matchAll(/\{([a-z_]+)\}/g)].map(x=>x[1]);return keys.length&&keys.some(k=>!val(k))?"":fill(inner)});
  out=fill(out);
  return out.replace(/[ \t]+([,.!?])/g,"$1").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").split("\n").map(l=>l.trim()).join("\n").trim();
}
/* contextul pentru șabloane, dintr-o cerere */
function contextCerere(x,o){o=o||{};const of=x.offer||{};
  return {prenume:prenume(x.nume),data:x.data?dataLunga(x.data):"",locatie:x.loc||"",invitati:x.inv||of.inv||"",
    intrebare:!(x.inv||of.inv)?"Ca să vă fac o ofertă exactă: câți invitați adulți estimați"+(x.loc?"?":" și unde va avea loc evenimentul?"):!x.loc?"Unde va avea loc evenimentul? Vă trimit oferta imediat după.":!x.data?"Ce dată aveți în vedere? Vă trimit oferta imediat după.":"Vă pregătesc oferta și v-o trimit cât mai repede.",
    total:of.total?eur(of.total):"",link_oferta:of.link||"",valabil:of.val?dataLunga(of.val):"",meniu:o.meniu||"https://cocktailphilosophy.ro/meniu/",
    data_libera:o.dataLibera&&x.data?`Data de ${dataScurta(x.data)} e încă liberă la noi, dar în sezon se ocupă repede.`:""}}

const atinsLa=x=>Math.max(ms(x.offer&&x.offer.at),ms(x.clientAt),...((x.fu||[]).map(f=>ms(f.at))),0);
/* Ce e de făcut cu o cerere acum. null = nimic (închisă, amânată sau încă nu e momentul). */
function pasCerere(x,now,R){
  R=Object.assign({},REGULI,R||{});now=ms(now)||Date.now();
  const st=x.st||"";if(st==="ct"||st==="pierduta"||st==="done")return null;
  if(x.amanat&&ms(x.amanat)>now)return null;
  const azi=iso(new Date(now)),fu=(x.fu||[]).length,primit=ms(x.at);
  if(x.data&&x.data<azi)return {tip:"trecut",nivel:"info",cand:primit,eticheta:`Evenimentul din ${dataScurta(x.data)} a trecut`,sablon:null};
  if(!st&&!x.contactAt){const ore=(now-primit)/H;
    return {tip:"raspuns",nivel:ore>=R.raspunsOre?"urgent":"azi",cand:primit,eticheta:`Fără răspuns ${deCand(primit,now)}`,sablon:"prim"}}
  if(!st&&x.contactAt){const t=ms(x.contactAt);if(now-t>=R.ofertaZile*D)return {tip:"oferta",nivel:"azi",cand:t,eticheta:`Ați vorbit ${deCand(t,now).replace(/^de /,"acum ")}, oferta nu e trimisă`,sablon:null};return null}
  if(st==="oferta"){const t=atinsLa(x)||primit,z=(now-t)/D;
    if(fu===0&&z>=R.rev1Zile)return {tip:"rev1",nivel:"azi",cand:t,eticheta:`Oferta trimisă ${deCand(t,now).replace(/^de /,"acum ")}, fără răspuns`,sablon:"rev1"};
    if(fu===1&&z>=R.rev2Zile)return {tip:"rev2",nivel:"azi",cand:t,eticheta:`Ai revenit ${deCand(t,now).replace(/^de /,"acum ")}, fără răspuns`,sablon:"rev2"};
    if(fu>=2&&z>=R.inchideZile)return {tip:"inchide",nivel:"info",cand:t,eticheta:`Două reveniri fără răspuns`,sablon:null};
  }
  return null}
const ORDINE={raspuns:0,oferta:1,rev1:2,rev2:3,inchide:4,trecut:5};
function deFacut(leads,now,R){return (leads||[]).map(x=>({x,p:pasCerere(x,now,R)})).filter(o=>o.p)
  .sort((a,b)=>(a.p.nivel==="urgent"?-1:0)-(b.p.nivel==="urgent"?-1:0)||ORDINE[a.p.tip]-ORDINE[b.p.tip]||a.p.cand-b.p.cand)}
/* timpul în care răspundem (de la cerere la primul contact sau la ofertă), pe ultimele `zile` zile */
function timpRaspuns(leads,now,zile){now=ms(now)||Date.now();const v=(leads||[]).filter(x=>now-ms(x.at)<=(zile||90)*D).map(x=>{
    const c=ms(x.contactAt)||ms(x.offer&&x.offer.at);return c&&c>=ms(x.at)?(c-ms(x.at))/H:null}).filter(v=>v!=null).sort((a,b)=>a-b);
  if(!v.length)return null;const m=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;return {mediana:m,n:v.length,subOra:v.filter(h=>h<=1).length}}
const oreText=h=>h==null?"":h<1?Math.max(1,Math.round(h*60))+" min":h<48?(Math.round(h*10)/10).toLocaleString("ro-RO")+" h":Math.round(h/24)+" zile";

/* ---------- contracte ---------- */
const semnat=c=>!!(c.signedId||(c.portalResp&&c.portalResp.signedAt)||c.avansPlatit);
const numeEv=c=>titlu(c.locatie||c.nume||"");

/* ---------- „Săptămâna ta”: rezumatul de luni dimineață ---------- */
/* in = {contracte, leads, disp:{uid:{name,conf}}, sursa:{fisa:{ds,title,events:[{key,name,date,time,persons,team}]},stoc:{lipsa:[{label,lipsa,unit}],minus:[label]},at}} */
function rezumat(inp,now){
  now=ms(now)||Date.now();const azi=iso(new Date(now)),W=saptamana(now),urm=saptamana(addDays(W.luni,7)),trec=saptamana(addDays(W.luni,-7));
  const CT=(inp.contracte||[]).filter(c=>c&&c.dataEv),L=inp.leads||[],S=inp.sursa||{},fisa=S.fisa||{},disp=inp.disp||{};
  const first=s=>(nrm(s)[0]||String(s||"").trim().toUpperCase());
  const conf=(name,key)=>{const f=first(name);const x=Object.values(disp).find(y=>first(y.name)===f);return x&&x.conf?x.conf[key]||null:null};
  /* evenimentele săptămânii: contractele din săptămână, cu echipa din fișă dacă se potrivesc */
  const fe=(fisa.events||[]).filter(e=>e.date>=W.de&&e.date<=W.pana),folosite=new Set();
  const ev=CT.filter(c=>c.dataEv>=W.de&&c.dataEv<=W.pana).sort((a,b)=>(a.dataEv+(a.oraEv||"")).localeCompare(b.dataEv+(b.oraEv||""))).map(c=>{
    const w=nrm((c.locatie||"")+" "+(c.nume||""));
    let f=fe.find(e=>!folosite.has(e.key)&&e.date===c.dataEv&&nrm(e.name).some(x=>w.includes(x)));
    if(!f){const z=fe.filter(e=>!folosite.has(e.key)&&e.date===c.dataEv);if(z.length===1&&CT.filter(y=>y.dataEv===c.dataEv).length===1)f=z[0]}
    if(f)folosite.add(f.key);
    const echipa=f?(f.team||[]).map(n=>({nume:n,conf:conf(n,f.key)})):null;
    return {nume:numeEv(c),client:titlu(c.nume||""),data:c.dataEv,ora:c.oraEv||(f&&f.time)||"",invitati:c.invitati||(f&&f.persons)||"",tel:c.tel||"",
      semnat:semnat(c),avans:!!c.avansPlatit,inFisa:!!f,echipa,trecut:c.dataEv<azi}});
  /* evenimente din fișă fără contract (ex. clienți vechi, colaborări) */
  fe.filter(e=>!folosite.has(e.key)).forEach(e=>ev.push({nume:titlu(e.name),client:"",data:e.date,ora:e.time||"",invitati:e.persons||"",semnat:true,avans:true,inFisa:true,faraContract:true,
    echipa:(e.team||[]).map(n=>({nume:n,conf:conf(n,e.key)})),trecut:e.date<azi}));
  ev.sort((a,b)=>(a.data+(a.ora||"")).localeCompare(b.data+(b.ora||"")));
  const echipaLipsa=ev.filter(e=>!e.trecut&&(!e.echipa||!e.echipa.length));
  const neconfirmati=[];ev.filter(e=>!e.trecut&&e.echipa).forEach(e=>e.echipa.forEach(p=>{if(p.conf!=="da")neconfirmati.push({ev:e.nume,data:e.data,nume:p.nume,nu:p.conf==="nu"})}));
  /* bani */
  const avans=CT.filter(c=>c.dataEv>=azi&&!c.avansPlatit&&!c.evSkip).sort((a,b)=>a.dataEv.localeCompare(b.dataEv)).map(c=>({nume:numeEv(c),client:titlu(c.nume||""),data:c.dataEv,suma:c.avans?`${c.avans} ${c.monedaAvans==="EURO"?"€":"RON"}`:"",tel:c.tel||"",semnat:semnat(c),curand:c.dataEv<=urm.pana}));
  const rest=CT.filter(c=>!c.restPlatit&&semnat(c)&&((c.dataRest&&c.dataRest<=W.pana)||c.dataEv<azi)).sort((a,b)=>(a.dataRest||a.dataEv).localeCompare(b.dataRest||b.dataEv))
    .map(c=>({nume:numeEv(c),client:titlu(c.nume||""),data:c.dataEv,scadenta:c.dataRest||"",intarziat:(c.dataRest||c.dataEv)<azi,tel:c.tel||""}));
  /* cereri */
  const todo=deFacut(L,now),inTrec=x=>{const d=iso(new Date(ms(x.at)));return d>=trec.de&&d<=trec.pana};
  const cereri={deFacut:todo.map(o=>({nume:titlu(o.x.nume),tel:o.x.tel||"",data:o.x.data||"",tip:o.p.tip,nivel:o.p.nivel,eticheta:o.p.eticheta})),
    noiSaptTrecuta:L.filter(inTrec).length,castigateSaptTrecuta:L.filter(x=>x.st==="ct"&&inTrec(x)).length,
    deschise:L.filter(x=>!x.st||x.st==="oferta").length,timp:timpRaspuns(L,now,90)};
  /* săptămâna trecută și cea viitoare */
  const trecute=CT.filter(c=>c.dataEv>=trec.de&&c.dataEv<=trec.pana).length;
  const viitoare=CT.filter(c=>c.dataEv>=urm.de&&c.dataEv<=urm.pana).sort((a,b)=>a.dataEv.localeCompare(b.dataEv)).map(c=>({nume:numeEv(c),data:c.dataEv,semnat:semnat(c)}));
  const contracteNoi=CT.filter(c=>{const d=String(c.dataContract||"");return d>=trec.de&&d<=trec.pana}).length;
  const stoc=S.stoc||{lipsa:[],minus:[]};
  const sursaVeche=S.at?(now-ms(S.at))/D:null;
  /* ce e cel mai important, în ordine */
  const prioritati=[];
  rest.filter(r=>r.intarziat).forEach(r=>prioritati.push(`Diferența de la ${r.nume} (${dataScurta(r.data)}) nu e încasată.`));
  cereri.deFacut.filter(c=>c.nivel==="urgent").forEach(c=>prioritati.push(`${c.nume} așteaptă răspuns ${c.eticheta.replace(/^Fără răspuns /,"")}.`));
  echipaLipsa.forEach(e=>prioritati.push(`${e.nume} (${ziSiData(e.data)}) nu are echipă în fișă.`));
  avans.filter(a=>a.curand).forEach(a=>prioritati.push(`Avansul de la ${a.nume} (${dataScurta(a.data)}) nu e încasat.`));
  if((stoc.lipsa||[]).length)prioritati.push(`${stoc.lipsa.length} ${stoc.lipsa.length===1?"articol nu ajunge":"articole nu ajung"} pentru evenimentele planificate: comandă la furnizor.`);
  return {generat:new Date(now).toISOString(),azi,sapt:W,urm,trec,evenimente:ev,echipaLipsa,neconfirmati,avans,rest,cereri,stoc,trecute,viitoare,contracteNoi,prioritati,
    sursaVeche:sursaVeche!=null&&sursaVeche>8?Math.floor(sursaVeche):null}}

/* titlul săptămânii, ex. „3–9 noiembrie” */
function intervalText(W){const a=parseDay(W.de),b=parseDay(W.pana);return a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}`:`${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`}

/* ---------- rezumatul ca email (HTML cu stiluri în linie, merge în Gmail) și ca text ---------- */
function emailHTML(R,o){o=o||{};const app=o.app||"https://paulgeorgescutiberiu-web.github.io/COCKTAIL/";
  const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const C={ink:"#1A1A18",gold:"#C2862D",green:"#2F5242",red:"#A3321F",muted:"#6b6a63",line:"#e6dfcc",cream:"#FFFEF1"};
  const h2=t=>`<h2 style="font:700 13px/1.2 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${C.gold};margin:28px 0 10px">${e(t)}</h2>`;
  const row=(l,r,c)=>`<tr><td style="padding:9px 0;border-top:1px solid ${C.line};font:15px/1.4 Arial,sans-serif;color:${C.ink}">${l}</td><td style="padding:9px 0 9px 12px;border-top:1px solid ${C.line};font:13px/1.4 Arial,sans-serif;color:${c||C.muted};text-align:right;white-space:nowrap">${r}</td></tr>`;
  const tbl=rows=>`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows.join("")}</table>`;
  const p=t=>`<p style="font:14px/1.5 Arial,sans-serif;color:${C.muted};margin:6px 0">${t}</p>`;
  const wa=tel=>tel?` <span style="color:${C.line}">·</span> <a href="https://wa.me/${telWa(tel)}" style="color:${C.green};font-weight:700;text-decoration:none">WhatsApp</a>`:"";
  let b=`<div style="background:${C.cream};padding:24px 12px"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid ${C.line};padding:28px 26px">`;
  b+=`<p style="font:700 12px/1 Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:${C.green};margin:0">Cocktail Philosophy</p>`;
  b+=`<h1 style="font:700 28px/1.15 Arial,sans-serif;color:${C.ink};margin:8px 0 4px">Săptămâna ta: ${e(intervalText(R.sapt))}</h1>`;
  b+=p(`${R.evenimente.length?`${R.evenimente.length} ${R.evenimente.length===1?"eveniment":"evenimente"}`:"Niciun eveniment"} săptămâna asta · ${R.cereri.deFacut.length} ${R.cereri.deFacut.length===1?"cerere de urmărit":"cereri de urmărit"} · ${R.avans.length+R.rest.length} ${R.avans.length+R.rest.length===1?"plată de urmărit":"plăți de urmărit"}`);
  if(R.prioritati.length){b+=`<div style="margin:18px 0 0;padding:14px 16px;background:#FBF3E2;border-left:4px solid ${C.gold}"><p style="font:700 14px/1.3 Arial,sans-serif;color:${C.ink};margin:0 0 6px">Întâi de toate</p><ol style="margin:0;padding-left:20px;font:14px/1.55 Arial,sans-serif;color:${C.ink}">${R.prioritati.slice(0,6).map(x=>`<li>${e(x)}</li>`).join("")}</ol></div>`}
  else b+=`<div style="margin:18px 0 0;padding:14px 16px;background:#EEF4EF;border-left:4px solid ${C.green};font:14px/1.5 Arial,sans-serif;color:${C.ink}">Totul e la zi. O săptămână bună!</div>`;
  b+=h2("Evenimentele săptămânii");
  if(!R.evenimente.length)b+=p("Nimic în calendar.");
  else b+=tbl(R.evenimente.map(x=>{const t=x.echipa&&x.echipa.length?x.echipa.map(m=>`${e(m.nume)}${m.conf==="da"?` <span style="color:${C.green}">✓</span>`:m.conf==="nu"?` <span style="color:${C.red}">✕</span>`:` <span style="color:${C.muted}">?</span>`}`).join(", "):`<span style="color:${C.red}">fără echipă în fișă</span>`;
    const flags=[!x.semnat?`<span style="color:${C.red}">nesemnat</span>`:"",x.semnat&&!x.avans&&!x.faraContract?`<span style="color:${C.red}">avans neîncasat</span>`:""].filter(Boolean).join(" · ");
    return row(`<b>${e(x.nume)}</b>${x.client&&x.client!==x.nume?` <span style="color:${C.muted}">· ${e(x.client)}</span>`:""}<br><span style="font-size:13px;color:${C.muted}">${e([x.ora?"ora "+x.ora:"",x.invitati?x.invitati+" invitați":""].filter(Boolean).join(" · "))}${x.ora||x.invitati?" · ":""}echipa: ${t}</span>${flags?`<br><span style="font-size:13px">${flags}</span>`:""}`,e(ziSiData(x.data)),x.trecut?C.muted:C.ink)}));
  if(R.neconfirmati.length)b+=p(`Neconfirmați încă: ${R.neconfirmati.map(n=>e(n.nume)+(n.nu?" (nu poate)":"")+" la "+e(n.ev)).join(", ")}.`);
  b+=h2("Bani de urmărit");
  if(!R.avans.length&&!R.rest.length)b+=p("Toate avansurile și diferențele sunt încasate.");
  else b+=tbl([...R.rest.map(x=>row(`Diferența · <b>${e(x.nume)}</b>${wa(x.tel)}`,x.intarziat?`<b>întârziată</b> · ${e(dataScurta(x.scadenta||x.data))}`:`scadentă ${e(dataScurta(x.scadenta))}`,x.intarziat?C.red:C.ink)),
    ...R.avans.map(x=>row(`Avans${x.suma?" "+e(x.suma):""} · <b>${e(x.nume)}</b>${x.semnat?"":` <span style="color:${C.muted}">(contract nesemnat)</span>`}${wa(x.tel)}`,`eveniment ${e(dataScurta(x.data))}`,x.curand?C.red:C.muted))]);
  b+=h2("Cereri de ofertă");
  const T=R.cereri.timp;
  b+=p(`Săptămâna trecută: ${R.cereri.noiSaptTrecuta} ${R.cereri.noiSaptTrecuta===1?"cerere nouă":"cereri noi"}${R.cereri.castigateSaptTrecuta?`, ${R.cereri.castigateSaptTrecuta} ${R.cereri.castigateSaptTrecuta===1?"câștigată":"câștigate"}`:""} · ${R.cereri.deschise} deschise în total${T?` · răspunzi în medie în ${oreText(T.mediana)}`:""}.`);
  if(R.cereri.deFacut.length)b+=tbl(R.cereri.deFacut.slice(0,10).map(c=>row(`<b>${e(c.nume)}</b>${wa(c.tel)}${c.data?`<br><span style="font-size:13px;color:${C.muted}">eveniment ${e(dataLunga(c.data))}</span>`:""}`,e(c.eticheta),c.nivel==="urgent"?C.red:C.ink)));
  else b+=p("Nicio cerere nu așteaptă după tine.");
  if((R.stoc.lipsa||[]).length||(R.stoc.minus||[]).length){b+=h2("Stoc");
    if(R.stoc.lipsa.length)b+=tbl(R.stoc.lipsa.slice(0,12).map(s=>row(e(s.label),`lipsesc ${e(String(s.lipsa).replace(".",","))}${s.unit?" "+e(s.unit):""}`,C.red)));
    if(R.stoc.minus.length)b+=p(`Sub zero (probabil lipsește o factură sau un inventar): ${R.stoc.minus.slice(0,8).map(e).join(", ")}.`)}
  b+=h2("Pe scurt");
  b+=p(`Săptămâna trecută: ${R.trecute} ${R.trecute===1?"eveniment":"evenimente"}, ${R.contracteNoi} ${R.contracteNoi===1?"contract nou":"contracte noi"}.`);
  b+=p(`Săptămâna viitoare (${e(intervalText(R.urm))}): ${R.viitoare.length?R.viitoare.map(v=>e(v.nume)+" "+e(dataScurta(v.data))+(v.semnat?"":" (nesemnat)")).join(", "):"nimic încă"}.`);
  if(R.sursaVeche)b+=p(`<i>Fișa și stocul sunt cele de acum ${R.sursaVeche} zile. Deschide aplicația ca să se actualizeze.</i>`);
  b+=`<p style="margin:26px 0 0"><a href="${e(app)}" style="display:inline-block;background:${C.green};color:#fff;font:700 15px/1 Arial,sans-serif;padding:14px 20px;text-decoration:none">Deschide aplicația</a></p>`;
  b+=`</div><p style="max-width:600px;margin:12px auto 0;font:12px/1.4 Arial,sans-serif;color:${C.muted};text-align:center">Trimis automat în fiecare luni dimineață, din aplicația Cocktail Philosophy.</p></div>`;
  return b}
function emailText(R){const L=[`SĂPTĂMÂNA TA: ${intervalText(R.sapt)}`,""];
  if(R.prioritati.length){L.push("ÎNTÂI DE TOATE");R.prioritati.slice(0,6).forEach((x,i)=>L.push(`${i+1}. ${x}`));L.push("")}
  L.push("EVENIMENTE");if(!R.evenimente.length)L.push("- nimic în calendar");
  R.evenimente.forEach(x=>L.push(`- ${ziSiData(x.data)}${x.ora?" "+x.ora:""}: ${x.nume}${x.invitati?", "+x.invitati+" invitați":""} · echipa: ${x.echipa&&x.echipa.length?x.echipa.map(m=>m.nume+(m.conf==="da"?" ✓":m.conf==="nu"?" ✕":"")).join(", "):"LIPSĂ"}${!x.semnat?" · NESEMNAT":""}`));
  L.push("","BANI");if(!R.avans.length&&!R.rest.length)L.push("- totul încasat");
  R.rest.forEach(x=>L.push(`- diferența ${x.nume}${x.intarziat?" (ÎNTÂRZIATĂ)":""}`));R.avans.forEach(x=>L.push(`- avans ${x.nume}, eveniment ${dataScurta(x.data)}`));
  L.push("","CERERI");if(!R.cereri.deFacut.length)L.push("- nimic de urmărit");R.cereri.deFacut.slice(0,10).forEach(c=>L.push(`- ${c.nume}: ${c.eticheta}`));
  if((R.stoc.lipsa||[]).length){L.push("","STOC");R.stoc.lipsa.slice(0,12).forEach(s=>L.push(`- ${s.label}: lipsesc ${s.lipsa}${s.unit?" "+s.unit:""}`))}
  return L.join("\n")}

return {MON,ZI,iso,parseDay,addDays,saptamana,dataLunga,dataScurta,ziSiData,deCand,prenume,titlu,eur,telWa,nrm,
  REGULI,SABLOANE,SABLON_NUME,completeaza,contextCerere,pasCerere,deFacut,timpRaspuns,oreText,semnat,rezumat,intervalText,emailHTML,emailText};
});
