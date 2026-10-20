/* QR la bar: pagina invitaților, QR pe eveniment, cereri de ofertă */
(function(){
const F=window.CPFS;if(!F)return;
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const BAR_URL="https://cocktailphilosophy.ro/bar/";
const MON=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const iso=d=>d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";
const slug=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24)||"eveniment";
const titleCase=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
function curD(){try{const e=window.__cp&&window.__cp.evd();return e&&e.aoa?window.__cp.parseAOA(e.aoa,e.fileName):null}catch(x){return null}}
function evDate(e,D){return e.date||(D&&D.title&&D.title.date)||null}
function code(e,D){const d=evDate(e,D);return slug(e.name)+(d?"-"+String(d.getDate()).padStart(2,"0")+String(d.getMonth()+1).padStart(2,"0"):"-"+e.col)}
const link=c=>BAR_URL+"?e="+encodeURIComponent(c);

/* ---------- sincronizarea paginii publice (doar administratorul) ---------- */
let CT=[],FIRMA={},lastSig="",SCANS={},LEADS=[];
function menuAll(){let R0=[];try{R0=JSON.parse(document.getElementById("recipes-data").textContent)}catch(e){}
  return R0.map(r=>({id:r.id,name:r.name,zero:!!r.zero,ing:(r.ing||[]).map(i=>i.n).filter(Boolean).slice(0,5)}))}
const nrm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9 ]+/g," ").split(/\s+/).filter(w=>w.length>2);
function matchContract(e,D){
  const d=iso(evDate(e,D));if(!d)return null;
  const same=CT.filter(c=>c.dataEv===d);if(!same.length)return null;
  const en=nrm(e.name);
  const hit=same.find(c=>{const w=nrm(c.locatie+" "+c.nume);return w.some(x=>en.includes(x))});
  if(hit)return hit;
  const sameDay=D.events.filter(x=>iso(evDate(x,D))===d).length;
  return same.length===1&&sameDay===1?same[0]:null;
}
function buildInfo(){
  const D=curD(),ev={};
  if(D)D.events.forEach(e=>{const c=matchContract(e,D),m=c&&c.portalResp&&Array.isArray(c.portalResp.menuIds)&&c.portalResp.menuIds.length?c.portalResp.menuIds:null;
    ev[code(e,D)]={n:titleCase(e.name),d:iso(evDate(e,D)),menu:m}});
  const L={};if(FIRMA.leadHook)L.hook=FIRMA.leadHook;if(FIRMA.reviewUrl)L.review=FIRMA.reviewUrl;if(FIRMA.igUrl)L.ig=FIRMA.igUrl;if(FIRMA.fbUrl)L.fb=FIRMA.fbUrl;
  return {menu:menuAll(),ev,links:L};
}
async function sync(){
  if(!F.isAdmin)return;
  const x=buildInfo(),sig=JSON.stringify(x);if(sig===lastSig)return;
  try{await F.fs.doc("bar/info").set({...x,at:new Date().toISOString()});lastSig=sig}catch(e){}
}
if(F.isAdmin){
  F.fs.collection(`${F.base}/contracte`).onSnapshot(s=>{CT=s.docs.map(d=>({...d.data(),id:d.id}));sync();if(window.__evRefresh)window.__evRefresh()},()=>{});
  F.fs.doc(`${F.base}/privat/firma`).get().then(d=>{FIRMA=d.exists?d.data():{};sync()}).catch(()=>{});
  F.fs.collection("barScan").onSnapshot(s=>{SCANS={};s.docs.forEach(d=>SCANS[d.id]=d.data().n||0);refresh()},()=>{});
  F.fs.collection("barLead").onSnapshot(s=>{LEADS=s.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>String(b.at).localeCompare(String(a.at)));refresh()},()=>{});
  setInterval(()=>{if(document.visibilityState==="visible")sync()},15000);
  setTimeout(sync,2500);
}
function refresh(){if(window.__ctRefresh)window.__ctRefresh();const m=$("#qrModal");if(m&&m.dataset.code)stats(m.dataset.code)}

/* ---------- desenarea QR-ului ---------- */
let qrP=null;
function loadQR(){if(window.qrcode)return Promise.resolve(window.qrcode);
  if(!qrP)qrP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";s.onload=()=>res(window.qrcode);s.onerror=()=>{qrP=null;rej()};document.head.appendChild(s)});
  return qrP}
function qrMatrix(Q,text){const q=Q(0,"H");q.addData(text);q.make();const n=q.getModuleCount(),m=[];for(let r=0;r<n;r++){m.push([]);for(let c=0;c<n;c++)m[r].push(q.isDark(r,c))}return m}
/* QR cu insigna „CP” în mijloc (corecție de erori H, insigna acoperă < 9%) */
function qrSVG(m,size){
  const n=m.length,qz=4,N=n+qz*2,u=size/N;let p="";
  const b=Math.round(n*0.26)|1,b0=Math.floor((n-b)/2);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(!m[r][c])continue;if(r>=b0-1&&r<b0+b+1&&c>=b0-1&&c<b0+b+1)continue;p+=`M${(c+qz)*u},${(r+qz)*u}h${u}v${u}h-${u}z`}
  const cx=size/2,bw=b*u;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${p}" fill="#0d0c0b"/>
  <rect x="${cx-bw/2}" y="${cx-bw/2}" width="${bw}" height="${bw}" rx="${bw*0.22}" fill="#0d0c0b"/>
  <text x="${cx}" y="${cx+bw*0.17}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,Arial,sans-serif" font-weight="800" font-size="${bw*0.5}" fill="#ff8a1f" letter-spacing="1">CP</text></svg>`;
}
async function cardPNG(svg,name,dateTxt){
  const W=1240,H=1748,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.load("800 80px 'Barlow Condensed'")}catch(e){}
  x.fillStyle="#0d0c0b";x.fillRect(0,0,W,H);
  x.fillStyle="#a59e95";x.font="500 44px 'Barlow Condensed',Arial";x.textAlign="center";x.fillText("COCKTAIL PHILOSOPHY®",W/2,130);
  x.fillStyle="#f4f1ec";x.font="800 112px 'Barlow Condensed',Arial";x.fillText("SCANEAZĂ",W/2,270);
  x.fillStyle="#ff8a1f";x.fillText("MENIUL SERII",W/2,385);
  const img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)});
  const s=880;x.fillStyle="#fff";x.beginPath();x.roundRect((W-s)/2-20,450,s+40,s+40,36);x.fill();x.drawImage(img,(W-s)/2,470,s,s);
  x.fillStyle="#f4f1ec";x.font="700 64px 'Barlow Condensed',Arial";x.fillText(name?name.toUpperCase():"BAR MOBIL DE COCKTAILURI",W/2,1490);
  x.fillStyle="#a59e95";x.font="500 46px 'Barlow Condensed',Arial";x.fillText(dateTxt||"Îți place barul? Îl aducem la evenimentul tău.",W/2,1565);
  x.fillStyle="#ff8a1f";x.font="700 50px 'Barlow Condensed',Arial";x.fillText("cocktailphilosophy.ro/bar",W/2,1660);
  return new Promise(r=>c.toBlob(r,"image/png"));
}

/* ---------- fereastra QR ---------- */
function stats(c){const el=$("#qrStats");if(!el)return;const n=SCANS[c]||0,l=LEADS.filter(x=>x.ev===c).length;
  el.textContent=`Scanat de ${n} ${n===1?"ori":"ori"} · ${l} ${l===1?"cerere de ofertă":"cereri de ofertă"}`}
async function show(c,name,dateTxt){
  close();const m=document.createElement("div");m.id="qrModal";m.dataset.code=c;
  m.innerHTML=`<div class="qr-box" role="dialog" aria-label="QR pentru bar"><button class="btn qr-x" type="button" data-qr="close">Închide</button>
    <p class="ev-sub">QR pentru bar${name?` · ${esc(name)}`:""}</p><div class="qr-img">Se generează…</div>
    <p class="ev-file" id="qrStats"></p>
    <p class="ev-file">Invitații văd meniul serii, butoanele de Instagram și Facebook și formularul „Vreau ofertă”. Cererile îți apar la Contracte.</p>
    <div class="qr-acts"><button class="btn primary" type="button" data-qr="png">Descarcă cartonașul (PNG)</button><button class="btn" type="button" data-qr="svg">Doar QR-ul (SVG)</button><a class="btn" href="${link(c)}" target="_blank" rel="noopener">Deschide pagina</a></div>
    <p class="ev-file" style="word-break:break-all">${esc(link(c))}</p></div>`;
  document.body.appendChild(m);stats(c);
  try{const Q=await loadQR(),svg=qrSVG(qrMatrix(Q,link(c)),600);m._svg=svg;m._name=name;m._date=dateTxt;m.querySelector(".qr-img").innerHTML=svg}
  catch(e){m.querySelector(".qr-img").textContent="Nu am putut genera QR-ul. Verifică internetul."}
}
function close(){const m=$("#qrModal");if(m)m.remove()}
function save(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
document.addEventListener("click",async ev=>{
  const t=ev.target;
  const qe=t.closest("[data-qrev]");
  if(qe){const D=curD(),e=D&&D.events.find(x=>String(x.col)===qe.dataset.qrev);if(!e)return;const d=evDate(e,D);
    show(code(e,D),titleCase(e.name),d?`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`:"");return}
  const b=t.closest("[data-qr]");
  if(b){const m=$("#qrModal"),a=b.dataset.qr;
    if(a==="close"){close();return}
    if(!m||!m._svg)return;
    const fn=`QR-bar-${m.dataset.code}`;
    if(a==="svg"){save(new Blob([m._svg],{type:"image/svg+xml"}),fn+".svg");return}
    if(a==="png"){b.disabled=true;try{save(await cardPNG(m._svg,m._name,m._date),fn+".png")}finally{b.disabled=false}return}
  }
  if(t.id==="qrModal"){close();return}
  const l=t.closest("[data-lead]");
  if(l){const x=LEADS.find(y=>y.id===l.dataset.id);if(!x)return;const a=l.dataset.lead;
    if(a==="ct"){F.fs.doc(`barLead/${x.id}`).set({st:"ct"},{merge:true}).catch(()=>{});
      window.__ctNew&&window.__ctNew({nume:String(x.nume||"").toLocaleUpperCase("ro-RO"),tel:x.tel||"",dataEv:x.data||"",locatie:String(x.loc||"").toLocaleUpperCase("ro-RO"),invitati:x.inv||""});return}
    if(a==="done"){F.fs.doc(`barLead/${x.id}`).set({st:"done"},{merge:true}).catch(()=>{});return}
    if(a==="back"){F.fs.doc(`barLead/${x.id}`).set({st:""},{merge:true}).catch(()=>{});return}
  }
  const g=t.closest("[data-qrgen]");if(g){show("general","","");return}
  const sh=t.closest("[data-leadall]");if(sh){SHOWALL=!SHOWALL;refresh();return}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});

/* ---------- cererile din Contracte ---------- */
let SHOWALL=false;
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};
const fdate=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]} ${MON[+m[2]-1]} ${m[1]}`:""};
function leadsHTML(){
  const open=LEADS.filter(x=>x.st!=="done"),L=SHOWALL?LEADS:open,tot=Object.values(SCANS).reduce((a,b)=>a+b,0);
  let h=`<div class="ct-card qr-leads"><div class="ct-h"><b>Cereri de la bar (QR)</b><span>${open.length} ${open.length===1?"nouă":"noi"} · ${tot} scanări în total</span></div>`;
  if(!L.length)h+=`<p class="ev-file">Încă nicio cerere. Pune QR-ul pe bar: îl iei din fișa fiecărui eveniment, butonul „QR pentru bar”.</p>`;
  L.slice(0,30).forEach(x=>{
    const wa=`https://wa.me/${telWa(x.tel)}?text=${encodeURIComponent(`Bună, ${String(x.nume||"").split(" ")[0]}! Sunt Paul de la Cocktail Philosophy. Mulțumim pentru cerere${x.evn?` de la ${x.evn}`:""}.`)}`;
    h+=`<div class="qr-lead${x.st==="done"?" off":""}"><div><b>${esc(x.nume)}</b> · <a href="tel:${esc(x.tel)}">${esc(x.tel)}</a>
      <small>${[x.data?"eveniment pe "+fdate(x.data):"",x.loc,x.inv?x.inv+" invitați":"",x.evn?"a scanat la "+x.evn:""].filter(Boolean).map(esc).join(" · ")}</small>
      ${x.msg?`<small>„${esc(x.msg)}”</small>`:""}<small>trimisă pe ${esc(fdate(x.at))}${x.st==="ct"?" · ✓ contract început":""}</small></div>
      <div class="qr-la"><a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp</a><button class="btn" data-lead="ct" data-id="${esc(x.id)}">Fă contract</button>${x.st==="done"?`<button class="btn" data-lead="back" data-id="${esc(x.id)}">Readu</button>`:`<button class="btn" data-lead="done" data-id="${esc(x.id)}">Rezolvată</button>`}</div></div>`});
  h+=`<div class="qr-la" style="margin-top:8px"><button class="btn" data-qrgen="1">QR general (fără eveniment)</button>${LEADS.length>open.length?`<button class="btn" data-leadall="1">${SHOWALL?"Doar cele noi":`Arată și rezolvatele (${LEADS.length-open.length})`}</button>`:""}</div></div>`;
  return h;
}
/* ---------- toate QR-urile săptămânii într-un PDF (2 cartonașe pe o foaie A4) ---------- */
let pmP=null;
function loadPM(){if(window.pdfMake&&window.pdfMake.createPdf)return Promise.resolve(window.pdfMake);
  if(!pmP)pmP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/pdfmake.min.js";s.onload=()=>res(window.pdfMake);s.onerror=()=>{pmP=null;rej()};document.head.appendChild(s)});
  return pmP}
const toDataURL=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b)});
async function allPDF(btn){
  const D=curD();if(!D||!D.events.length)return;
  const lab=btn.textContent;btn.disabled=true;btn.textContent="Se pregătesc QR-urile…";
  try{const [Q,pm]=await Promise.all([loadQR(),loadPM()]);const imgs=[];
    const evs=[...D.events].sort((a,b)=>String(iso(evDate(a,D))+(a.time||"")).localeCompare(iso(evDate(b,D))+(b.time||"")));
    for(const e of evs){const d=evDate(e,D),c=code(e,D);
      const png=await cardPNG(qrSVG(qrMatrix(Q,link(c)),600),titleCase(e.name),(d?`${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`:"")+(e.time?` · ora ${e.time}`:""));
      imgs.push(await toDataURL(png))}
    const pages=[];for(let i=0;i<imgs.length;i+=2)pages.push({columns:[{image:imgs[i],width:390},imgs[i+1]?{image:imgs[i+1],width:390}:{text:""}],columnGap:22,pageBreak:i?"before":undefined});
    const fn=`QR-bar-${slug(D.title&&D.title.big||"saptamana")}.pdf`;
    pm.createPdf({pageSize:"A4",pageOrientation:"landscape",pageMargins:[20,20,20,20],content:pages}).download(fn);
    btn.textContent=`Gata: ${imgs.length} ${imgs.length===1?"cartonaș":"cartonașe"}`;setTimeout(()=>{if(document.contains(btn)){btn.textContent=lab;btn.disabled=false}},3000);
  }catch(e){btn.textContent="Nu a mers. Verifică internetul.";setTimeout(()=>{btn.textContent=lab;btn.disabled=false},3000)}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-qrall]");if(b&&!b.disabled)allPDF(b)});
/* ---------- contracte semnate din săptămâna încărcată, care nu sunt încă în fișă ---------- */
const tcase=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
function weekRange(D){const ds=D.events.map(e=>e.date).filter(Boolean),ref=ds[0]||(D.title&&D.title.date);if(!ref)return null;
  const d=new Date(ref);d.setHours(0,0,0,0);const wd=(d.getDay()+6)%7,a=new Date(d);a.setDate(d.getDate()-wd);const b=new Date(a);b.setDate(a.getDate()+6);return [iso(a),iso(b)]}
const isSigned=c=>!!(c.signedId||(c.portalResp&&c.portalResp.signedAt)||c.avansPlatit);
function pending(){
  const D=curD();if(!F.isAdmin||!D||!CT.length)return [];const W=weekRange(D);if(!W)return [];
  return CT.filter(c=>c.dataEv&&c.dataEv>=W[0]&&c.dataEv<=W[1]&&isSigned(c)&&!c.evSkip).filter(c=>{
    const w=nrm(c.locatie+" "+c.nume);
    return !D.events.some(e=>{const d=iso(evDate(e,D));if(d&&d!==c.dataEv)return false;const en=nrm(e.name);return w.some(x=>en.includes(x))})});
}
function pendHTML(){const P=pending();if(!P.length)return "";
  return `<div class="ev-alert ct-pend"><b>${P.length===1?"Un contract semnat nu e încă în fișa săptămânii":P.length+" contracte semnate nu sunt încă în fișa săptămânii"}</b>`+
    P.map(c=>`<div class="ct-pend-r"><span>${esc(tcase(c.locatie||c.nume))} · ${esc(fdate(c.dataEv))}${c.oraEv?" · "+esc(c.oraEv):""}${c.invitati?" · "+esc(c.invitati)+" pers.":""}<small>client ${esc(tcase(c.nume))}</small></span>
      <span class="qr-la"><button class="btn primary" data-ctev="${esc(c.id)}">Adaugă în fișă</button><button class="btn" data-ctskip="${esc(c.id)}">Nu e nevoie</button></span></div>`).join("")+
    `<p class="ev-file">Se deschide fișa completată din contract, cu cantitățile calculate după numărul de persoane. Le verifici și apeși „Salvează evenimentul”.</p></div>`}
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-ctev]");if(a){const c=CT.find(x=>x.id===a.dataset.ctev);if(!c||!window.__evNew)return;const r=c.portalResp||{};
    const note=[r.menu&&r.menu.length?"Meniu: "+r.menu.join(", ")+(r.obs?". "+r.obs:""):"",c.notesTxt||""].filter(Boolean).join(". ");
    window.__evNew({nume:tcase(c.locatie||c.nume||""),data:c.dataEv||"",ora:c.oraEv||"",pers:String(c.invitati||"").replace(/\D/g,""),note,from:tcase(String(c.nume||"").split(/\s+/)[0]),auto:true});return}
  const s=e.target.closest("[data-ctskip]");if(s){F.fs.doc(`${F.base}/contracte/${s.dataset.ctskip}`).set({evSkip:true},{merge:true}).catch(()=>{});return}
});
window.__qr={code,link,leadsHTML,show,sync,pendHTML};
})();
