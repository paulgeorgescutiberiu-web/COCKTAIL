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
  return R0.filter(r=>r.sec!=="").map(r=>({id:r.id,name:r.name,zero:!!r.zero,sec:r.sec||(r.zero?"zero":"cls"),gust:r.gust||"",desc:r.desc||"",
    ing:r.ingM?r.ingM.split(/\s*,\s*/).filter(Boolean):(r.ing||[]).map(i=>i.n).filter(Boolean).slice(0,5)}))}
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
  if(leadClick(t))return;
  const g=t.closest("[data-qrgen]");if(g){show("general","","");return}
  const sh=t.closest("[data-leadall]");if(sh){SHOWALL=!SHOWALL;refresh();return}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});

/* ---------- cererile din Contracte ---------- */
let SHOWALL=false;
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};
const fdate=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]} ${MON[+m[2]-1]} ${m[1]}`:""};
/* ---------- Cereri de ofertă: de la prima cerere până la contract ---------- */
const LST={"":"Nouă",oferta:"Ofertă trimisă",ct:"Câștigată",pierduta:"Pierdută",done:"Închisă"};
const SRC=[["whatsapp","WhatsApp"],["telefon","Telefon"],["instagram","Instagram"],["facebook","Facebook"],["recomandare","Recomandare"],["site","Site"],["alta","Altă sursă"]];
const srcOf=x=>String(x.ev||"").startsWith("sursa-")?(x.evn||"Altă sursă"):"QR la bar";
const LOST=["Prețul","Data e ocupată","Nu a mai răspuns","A ales pe altcineva","Și-a anulat evenimentul","Alt motiv"];
let LF="open",LOFF=null,LADD=false,LLOST=null,LBUSY="";
const TIERS=[[0,50,18.9],[50,100,15.9],[100,150,12.9],[150,200,10.9],[200,250,9.9],[250,300,8.9],[300,350,7.9],[350,null,6.9]];
const PTS=TIERS.map(t=>[t[1]===null?375:(t[0]+t[1])/2,t[2]]);
function aiPrice(n){n=+n||0;if(n<=PTS[0][0])return PTS[0][1];const last=PTS[PTS.length-1];if(n>=last[0])return last[1];
  for(let i=1;i<PTS.length;i++){const a=PTS[i-1],b=PTS[i];if(n<=b[0])return Math.round((a[1]+(b[1]-a[1])*(n-a[0])/(b[0]-a[0]))*10)/10}}
const BARMANI={1:350,2:520,3:690,4:860};
const eur=v=>(Math.round(v*100)/100).toLocaleString("ro-RO",{maximumFractionDigits:2})+" €";
const MENU_URL="https://cocktailphilosophy.ro/wp-content/uploads/2026/03/MENIU-2026-GOLD.pdf";
function leadStats(){const m=new Date().toISOString().slice(0,7),M=LEADS.filter(x=>String(x.at||"").slice(0,7)===m);
  const of=M.filter(x=>x.st==="oferta"||x.st==="ct"||x.offer).length,won=M.filter(x=>x.st==="ct").length;
  const src={};LEADS.forEach(x=>{const k=srcOf(x);src[k]=src[k]||{n:0,w:0};src[k].n++;if(x.st==="ct")src[k].w++});
  return {M:M.length,of,won,src}}
function leadsHTML(){
  const tot=Object.values(SCANS).reduce((a,b)=>a+b,0),S=leadStats();
  const flt={open:x=>!x.st,oferta:x=>x.st==="oferta",ct:x=>x.st==="ct",pierduta:x=>x.st==="pierduta"||x.st==="done"};
  const cnt=k=>LEADS.filter(flt[k]).length,L=LEADS.filter(flt[LF]||flt.open);
  let h=`<div class="ct-card qr-leads"><div class="ct-h"><b>Cereri de ofertă</b><span>luna asta: ${S.M} ${S.M===1?"cerere":"cereri"} · ${S.of} oferte · ${S.won} câștigate${S.M?` (${Math.round(S.won/S.M*100)}%)`:""} · ${tot} scanări QR</span></div>`;
  const srcTxt=Object.entries(S.src).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`${k} ${v.n}${v.w?` (${v.w} câștigate)`:""}`).join(" · ");
  if(srcTxt)h+=`<p class="ev-file">De unde vin: ${esc(srcTxt)}</p>`;
  h+=`<div class="ld-tabs">${[["open","Noi"],["oferta","Ofertă trimisă"],["ct","Câștigate"],["pierduta","Pierdute"]].map(([k,n])=>`<button class="en-day${LF===k?" on":""}" data-lf="${k}">${n} ${cnt(k)}</button>`).join("")}<button class="btn" data-ladd="1">+ Cerere nouă</button></div>`;
  if(LADD)h+=`<div class="ld-form"><label>Nume<input data-la="nume"></label><label>Telefon<input data-la="tel" inputmode="tel"></label><label>Data evenimentului<input type="date" data-la="data"></label>
    <label>Invitați<input data-la="inv" inputmode="numeric"></label><label>Locație / oraș<input data-la="loc"></label><label>Sursă<select data-la="src">${SRC.map(([k,n])=>`<option value="${k}">${n}</option>`).join("")}</select></label>
    <label class="ld-w">Ce a cerut<textarea data-la="msg" rows="2"></textarea></label><div class="qr-la ld-w"><button class="btn primary" data-laddsave="1">Salvează cererea</button><button class="btn" data-ladd="0">Renunță</button></div></div>`;
  if(!L.length)h+=`<p class="ev-file">${LF==="open"?"Nicio cerere nouă. Cele de pe QR apar aici singure; pe cele primite pe WhatsApp sau telefon le adaugi cu „+ Cerere nouă”.":"Nimic aici încă."}</p>`;
  L.slice(0,40).forEach(x=>{
    const fn=String(x.nume||"").split(" ")[0],wa=`https://wa.me/${telWa(x.tel)}?text=${encodeURIComponent(`Bună, ${fn}! Sunt Paul de la Cocktail Philosophy. Mulțumim pentru cerere${x.evn&&!String(x.ev||"").startsWith("sursa-")?` de la ${x.evn}`:""}.`)}`;
    h+=`<div class="qr-lead"><div><b>${esc(x.nume)}</b> · <a href="tel:${esc(x.tel)}">${esc(x.tel)}</a> <span class="ld-st ld-${x.st||"nou"}">${esc(LST[x.st||""]||"Nouă")}</span>
      <small>${[x.data?"eveniment pe "+fdate(x.data):"",x.loc,x.inv?x.inv+" invitați":"",srcOf(x)==="QR la bar"?(x.evn?"QR la "+x.evn:"QR la bar"):srcOf(x)].filter(Boolean).map(esc).join(" · ")}</small>
      ${x.msg?`<small>„${esc(x.msg)}”</small>`:""}<small>primită pe ${esc(fdate(x.at))}${x.offer?` · ofertă ${esc(x.offer.pachet==="barmani"?x.offer.n+" barmani":"All Inclusive")}: ${esc(eur(x.offer.total))}${x.offer.link?` · <a href="${esc(x.offer.link)}" target="_blank" rel="noopener">PDF</a>`:""}`:""}${x.lost?` · motiv: ${esc(x.lost)}`:""}</small></div>
      <div class="qr-la"><a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>${x.st==="ct"?"":`<button class="btn" data-lo="${esc(x.id)}">${x.offer?"Altă ofertă":"Fă oferta"}</button><button class="btn" data-lead="ct" data-id="${esc(x.id)}">Fă contract</button>`}${x.st==="pierduta"||x.st==="done"||x.st==="ct"?`<button class="btn" data-lead="back" data-id="${esc(x.id)}">Readu</button>`:`<button class="btn" data-llost="${esc(x.id)}">Pierdută</button>`}</div></div>`;
    if(LLOST===x.id)h+=`<div class="ld-form"><label class="ld-w">De ce s-a pierdut?<select data-ll="m">${LOST.map(m=>`<option>${m}</option>`).join("")}</select></label><div class="qr-la ld-w"><button class="btn primary" data-llsave="${esc(x.id)}">Marchează pierdută</button><button class="btn" data-llost="">Renunță</button></div></div>`;
    if(LOFF&&LOFF.id===x.id)h+=offerForm(x);
  });
  h+=`<div class="qr-la" style="margin-top:8px"><button class="btn" data-qrgen="1">QR general (fără eveniment)</button></div></div>`;
  return h;
}
function offerForm(x){const o=LOFF,pp=o.pachet==="barmani"?null:(o.pp!=null?o.pp:aiPrice(o.inv)),tot=o.pachet==="barmani"?(BARMANI[o.n]||0):Math.round((pp||0)*(+o.inv||0));
  return `<div class="ld-form ld-off"><label>Pachet<select data-lof="pachet"><option value="ai"${o.pachet!=="barmani"?" selected":""}>All Inclusive (băuturi la discreție)</option><option value="barmani"${o.pachet==="barmani"?" selected":""}>Pachet barmani</option></select></label>
    ${o.pachet==="barmani"?`<label>Barmani<select data-lof="n">${[1,2,3,4].map(n=>`<option value="${n}"${+o.n===n?" selected":""}>${n} · ${BARMANI[n]} €</option>`).join("")}</select></label>`:`<label>Invitați (fără staff și copii)<input data-lof="inv" inputmode="numeric" value="${esc(o.inv||"")}"></label><label>Preț / persoană (€)<input data-lof="pp" inputmode="decimal" value="${esc(String(pp).replace(".",","))}"><small>din tabelul de prețuri: ${String(aiPrice(o.inv)).replace(".",",")} €</small></label>`}
    <label>Valabilă până la<input type="date" data-lof="val" value="${esc(o.val)}"></label><label class="ld-w">Mențiuni în ofertă (opțional)<textarea data-lof="note" rows="2" placeholder="ex: include și 2 cocktailuri fără alcool la alegere">${esc(o.note||"")}</textarea></label>
    <p class="ld-w ld-tot">Total: <b>${eur(tot)}</b> · avans 100 € pentru rezervarea datei</p>
    <div class="qr-la ld-w"><button class="btn primary" data-losend="${esc(x.id)}"${LBUSY?" disabled":""}>${LBUSY==="send"?"Se pregătește PDF-ul…":"Trimite oferta pe WhatsApp"}</button><button class="btn" data-lopdf="${esc(x.id)}"${LBUSY?" disabled":""}>Doar PDF</button><button class="btn" data-lo="">Renunță</button></div>
    <p class="ev-file ld-w">PDF-ul se salvează în Drive („Oferte trimise”), iar mesajul de WhatsApp are linkul lui și linkul meniului.</p></div>`}
function grabOffer(){const V=document.querySelector("#v-contracte");if(!V||!LOFF)return;V.querySelectorAll("[data-lof]").forEach(i=>{const k=i.dataset.lof;LOFF[k]=k==="pp"?(i.value.trim()===""?null:parseFloat(i.value.replace(",","."))):i.value})}
const addD=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};

/* ---------- toate QR-urile săptămânii într-un PDF (2 cartonașe pe o foaie A4) ---------- */
let pmP=null;
function loadPM(){if(window.pdfMake&&window.pdfMake.createPdf&&window.pdfMake.vfs)return Promise.resolve(window.pdfMake);
  const ld=src=>new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  if(!pmP)pmP=(async()=>{if(!(window.pdfMake&&window.pdfMake.createPdf))await ld("https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/pdfmake.min.js");
    if(!window.pdfMake.vfs)await ld("https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/vfs_fonts.js");return window.pdfMake})().catch(e=>{pmP=null;throw e});
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
    window.__evNew({nume:tcase(c.locatie||c.nume||""),data:c.dataEv||"",ora:c.oraEv||"",pers:String(c.invitati||"").replace(/\D/g,""),note,from:tcase(String(c.nume||"").split(/\s+/)[0]),auto:true,menuIds:r.menuIds});return}
  const s=e.target.closest("[data-ctskip]");if(s){F.fs.doc(`${F.base}/contracte/${s.dataset.ctskip}`).set({evSkip:true},{merge:true}).catch(()=>{});return}
});
const LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 132.86"><defs><style>.cls-1,.cls-2{fill:#292929;}.cls-1{fill-rule:evenodd;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M26.41,2.63c3.72,0,6.79,2.23,6.79,6.12,0,3.7-2.78,6.3-6.74,6.3H23.72V12.73h2.74c2.71,0,4.47-1.48,4.47-4S29.08,5,26.41,5H24.67c-2.6,0-5,.94-5,3.87v1.8H17.47V8.87C17.33,6.6,15.33,5.41,13,5.41H6.3c-2.69,0-3.92,1.43-3.92,3.23,0,2.32,1.58,3.67,4,3.67H8.77v2.38H6.3c-4.77,0-6.06-3.31-6.06-6C.24,5.57,2.09,3,6.27,3H13a6.09,6.09,0,0,1,5.46,2.78c1.27-2.33,3.36-3.14,6.14-3.14Z"/><polygon class="cls-1" points="0.29 18.81 32.8 18.81 32.8 21.19 2.47 21.19 2.47 23.93 0.29 23.93 0.29 18.81"/><path class="cls-1" d="M33.11,33.2c0,4-3.05,6.44-6.72,6.44H6.74C3.27,39.64,0,37.46,0,33.2,0,29.27,3.16,27,6.79,27H26.34C29.77,27,33.11,29,33.11,33.2Zm-30.93,0c0,2.72,2,4,4.56,4H26.39a5.36,5.36,0,0,0,2.78-.69L2.56,31.56A3.6,3.6,0,0,0,2.18,33.2ZM4,30.13l26.61,4.81a4.23,4.23,0,0,0,.31-1.74c0-2.58-2.09-3.82-4.54-3.82H6.79A5.4,5.4,0,0,0,4,30.13Z"/><path class="cls-1" d="M6.3,43.46h5c2.67,0,4.32,2.43,6.46,4.87,2,2.28,4,4.52,5.91,4.61h6.88V43.46H32.8V55.39H23.69c-2.75-.13-5.38-3-7.52-5.52-1.64-1.89-3.22-4-4.85-4h-5c-3,0-3.94,1.85-3.94,3.52,0,2.33,1.7,3.53,4.08,3.53H8.88v2.28H6.41C2,55.17.29,52.2.29,49.36A5.66,5.66,0,0,1,6.3,43.46Z"/><polygon class="cls-1" points="28.54 65.94 32.8 65.94 32.8 68.27 28.54 68.27 28.54 65.94"/><path class="cls-1" d="M26.39,74.37H6.83c-4.09,0-4.36,1.84-4.36,4.16v3.58H30.52V78.53C30.52,76.64,30.19,74.37,26.39,74.37ZM.29,78.53C.29,75.3.74,72,6.83,72H26.39c6.5,0,6.41,5.07,6.41,6.54v6H.29Z"/><polygon class="cls-1" points="2.42 92.68 32.8 92.68 32.8 95.04 2.42 95.04 2.42 99.58 0.29 99.58 0.29 88.16 2.42 88.16 2.42 92.68"/><path class="cls-1" d="M24,102.29h2.38c3.63,0,6.78,2,6.78,6.23,0,3.82-2.75,6.49-6.87,6.45H23.12v-2.4H26.3c2.4.09,4.67-1.25,4.67-4,0-2.56-2-3.85-4.58-3.85H24.21c-2.14,0-3,1.89-4.25,4.12-1.49,2.66-3,5.82-6.72,6.11H6.74c-3.72,0-6.69-1.87-6.69-6,0-3.67,2.82-5.76,6.6-5.76h4.21v2.36H6.68c-2.41,0-4.41.93-4.41,3.4,0,2.09,1.45,3.49,4.47,3.49h6.41c2.13-.15,3.32-2.06,4.41-4C19.42,105.18,20.71,102.29,24,102.29Z"/><polygon class="cls-1" points="21.98 127.21 21.98 120.2 24.12 120.2 24.12 127.21 30.61 127.21 30.61 118.37 32.8 118.37 32.8 129.68 0.29 129.68 0.29 118.37 2.42 118.37 2.42 127.21 21.98 127.21"/><path class="cls-2" d="M1125,131.33h-16.53V97.46L1084.11,1.28H1101L1113.28,49l3.43,16.26,3.5-16.31c1.16-4.52,2.29-8.91,3.42-13.29,2.7-10.48,5.49-21.32,8-31.59l.69-2.85,17.33,0L1125,97.47Z"/><path class="cls-2" d="M1076.34,131.33h-16.4V100h-22v31.33h-16.74V1.26H1038v83h22v-83h16.4Z"/><path class="cls-2" d="M970.44,131.35H953.69V1.28h27.55c19,0,27.54,14.2,27.54,28.27V69.64c0,18.57-14.19,28.6-27.54,28.6h-10.8Zm0-48.79h10.8c5.54,0,11.16-4.44,11.16-12.92V29.55c0-5.74-1.93-12.58-11.16-12.58h-10.8Z"/><path class="cls-2" d="M912.89,132.69c-16.3,0-28.13-12.28-28.13-29.2V29.21c0-20,14.58-29.18,28.13-29.18C928.58,0,940,12.38,940,29.41v73.88C940,123.49,925.93,132.69,912.89,132.69Zm0-116.95c-10.25,0-11.35,9.42-11.35,13.47v74.28c0,3.11.81,13.27,11.35,13.27,9.88,0,10.65-10.31,10.65-13.47V29.41C923.54,23.1,920.75,15.74,912.89,15.74Z"/><path class="cls-2" d="M845.78,132.86a27.78,27.78,0,0,1-20-8c-5.34-5.4-8.23-13.16-8.13-21.86V87.38h16.61V103.1c-.16,4.46,1.14,8.38,3.55,10.88a10.66,10.66,0,0,0,8,3.12c10.05,0,10.83-10.44,10.83-13.65V95.2c0-5-3.94-7.35-11.49-11.51l-4-2.2C831.33,76,819.09,69.22,818,54V29.06c0-17.9,10-29,26.23-29,15.27,0,25.53,11.53,25.53,28.7V48.47H853.27V28.9c0-8.6-3-13-9.07-13-6.27,0-9.45,4.41-9.45,13.12V53.2c.46,6,6.17,9.73,13,13.57l3,1.67c11.47,6.36,22.31,12.38,22.31,26v9C873.07,121,862.1,132.86,845.78,132.86Z"/><path class="cls-2" d="M778.07,132.69c-16.3,0-28.13-12.28-28.13-29.2V29.22c0-20,14.58-29.18,28.13-29.18,15.69,0,27.08,12.35,27.08,29.37v73.88C805.15,117.45,796.68,132.69,778.07,132.69Zm0-116.94c-10.25,0-11.35,9.42-11.35,13.47v74.27c0,3.11.82,13.27,11.35,13.27,9.9,0,10.67-10.31,10.67-13.47V29.41C788.74,23.11,785.94,15.75,778.07,15.75Z"/><path class="cls-2" d="M741.14,131.36H697.58V1.29h16.74V115.66h26.82Z"/><path class="cls-2" d="M682.65,131.33H665.9V1.26h16.75Z"/><path class="cls-2" d="M651,131.33H634.59V100h-22v31.32H595.89V1.26h16.74v83.05h22v-83H651Z"/><path class="cls-2" d="M545.05,131.33H528.3V1.52h27.57c19,0,27.56,14.16,27.56,28.2v40c0,18.54-14.2,28.54-27.56,28.54H545.05Zm0-48.7h10.82c5.55,0,11.17-4.43,11.17-12.89v-40c0-5.72-1.94-12.55-11.17-12.55H545.05Z"/><polygon class="cls-1" points="498.68 122.59 498.68 131.33 460.43 131.33 460.43 1.35 470.28 1.35 470.28 122.59 498.68 122.59"/><polygon class="cls-1" points="442.93 1.35 442.93 131.33 433.07 131.33 433.07 1.35 442.93 1.35"/><path class="cls-1" d="M401.44,87.71l-5-31.56-4.65-38.46-4.64,38.46L382.3,87.71ZM397.35,1.35l20.26,130h-9.68l-5.37-34.9v.19H381.22v-.19l-5.42,34.9H366l20-130Z"/><polygon class="cls-1" points="341.32 9.89 341.32 131.31 331.85 131.31 331.85 9.89 313.63 9.89 313.63 1.35 359.38 1.35 359.38 9.89 341.32 9.89"/><path class="cls-1" d="M272.74,83.6c5,6.68,10.91,14.12,37.11,47.71H297.59L267.53,93.46,264,100.13v31.18h-9.84V1.35H264V81.56l8.74-21.51,25.41-58.7h10.58Z"/><path class="cls-1" d="M237.19,105.48c0,13.4-7.8,27.35-24.91,27.35-16.19,0-25.83-12.49-25.83-27.73V27.75c0-16.72,10-27.69,25.66-27.69,15.24,0,25.08,10.21,25.08,27.52V39.46H227.9V27.75C227.9,14.92,222.49,9,212.28,9c-9.3,0-16,7.08-16,18.79v77.56c0,9.3,5.39,18.56,16,18.56s15.42-8.73,15.42-18.39V94.34h9.49v11.14Z"/><path class="cls-1" d="M169,105.65c0,13.78-8.18,27.18-24.72,27.18-16.19,0-25.83-12.28-25.83-27V27.18c0-13.91,8.69-26.95,25.83-26.95C159.84.23,169,12.89,169,27.39Zm-24.72,18.22c10.21,0,15.24-8.35,15.24-18.22V27.39c0-9.11-4.65-18.43-15.24-18.43-11,0-16,8.2-16,18.22v78.68C128.21,115.35,133.24,123.87,144.23,123.87Z"/><path class="cls-1" d="M101.42,105.45c0,13.4-7.8,27.35-24.9,27.35-16.18,0-25.82-12.49-25.82-27.73V27.74C50.7,11,60.74.06,76.35.06c15.24,0,25.07,10.21,25.07,27.51V39.45H92.16V27.74C92.16,14.91,86.73,9,76.52,9c-9.29,0-16,7.07-16,18.78v77.54c0,9.3,5.39,18.56,16,18.56S92,115.11,92,105.45V94.31h9.47Z"/><path class="cls-2" d="M1181.13,0a19.23,19.23,0,0,1,9.28,2.45,17.08,17.08,0,0,1,7.08,7,19.12,19.12,0,0,1,0,18.87,17.65,17.65,0,0,1-7,7,18.87,18.87,0,0,1-18.77,0,17.67,17.67,0,0,1-7-7,19.38,19.38,0,0,1-2.52-9.37,19.13,19.13,0,0,1,2.56-9.49,17.22,17.22,0,0,1,7.08-7A19.24,19.24,0,0,1,1181.13,0Zm0,3.11a15.72,15.72,0,0,0-7.72,2.05A14.53,14.53,0,0,0,1167.5,11a15.92,15.92,0,0,0,0,15.68,14.6,14.6,0,0,0,5.82,5.84,15.66,15.66,0,0,0,15.7,0,14.5,14.5,0,0,0,5.83-5.84,15.67,15.67,0,0,0,2-7.78,16,16,0,0,0-2.09-7.9,14.39,14.39,0,0,0-5.9-5.85,15.8,15.8,0,0,0-7.75-2.05Zm-8.29,26.2V9h7a16.59,16.59,0,0,1,5.18.55,5,5,0,0,1,2.56,1.95,5.43,5.43,0,0,1,.92,3,5.5,5.5,0,0,1-1.58,3.89,6.55,6.55,0,0,1-4.21,1.84,6,6,0,0,1,1.74,1.09,23.48,23.48,0,0,1,3,4l2.51,3.95h-4l-1.81-3.19a17,17,0,0,0-3.43-4.77,4.15,4.15,0,0,0-2.6-.66h-2v8.62Zm3.28-11.43h4c1.9,0,3.24-.26,3.91-.87a2.61,2.61,0,0,0,1-2.2,2.91,2.91,0,0,0-.47-1.66,3.47,3.47,0,0,0-1.43-1.06,10.83,10.83,0,0,0-3.28-.36h-3.74Z"/></g></g></svg>`;
async function offerPDF(x){grabOffer();const o=LOFF,pm=await loadPM(),fn=String(x.nume||"");
  const pp=o.pachet==="barmani"?null:(o.pp!=null?o.pp:aiPrice(o.inv)),tot=o.pachet==="barmani"?(BARMANI[o.n]||0):Math.round((pp||0)*(+o.inv||0));
  const inc=o.pachet==="barmani"?["Barmani profesioniști pe toată durata evenimentului","Barul mobil și toate instrumentele de bar","Meniu de cocktailuri gândit pentru evenimentul vostru","Materiile prime se achită separat, la prețul furnizorului, cu 8% discount la bazele alcoolice"]
    :["Bar mobil, instrumente și personal, de la început până la final","Toate băuturile: baze Jameson, Beefeater, Havana, Absolut, prosecco, siropuri făcute în casă, sucuri, gheață, fructe și garnituri","Pahare de sticlă și meniuri pe mese","Transportul, taxa de vase și paharele sparte","Consumație nelimitată: prețul final nu poate crește față de ofertă"];
  const C="#1d1b19",A="#c9822b";
  const doc={pageSize:"A4",pageMargins:[48,48,48,56],defaultStyle:{fontSize:10.5,color:C,lineHeight:1.25},
    footer:(p,n)=>({margin:[48,10,48,0],columns:[{text:"Cocktail Philosophy · 0743 785 655 · cocktailphilosophy.ro",fontSize:8,color:"#777"},{text:`${p}/${n}`,alignment:"right",fontSize:8,color:"#777"}]}),
    content:[{svg:LOGO_SVG,width:300,margin:[0,0,0,26]},
      {text:o.pachet==="barmani"?"Ofertă · Pachet barmani":"Ofertă · All Inclusive",fontSize:22,bold:true},
      {text:`pentru ${fn}`,fontSize:13,color:"#555",margin:[0,4,0,18]},
      {table:{widths:[140,"*"],body:[["Data evenimentului",x.data?fdate(x.data):"de stabilit"],["Locația",x.loc||"de stabilit"],...(o.pachet==="barmani"?[["Barmani",String(o.n)]]:[["Invitați",String(o.inv||"")],["Preț / persoană",eur(pp)]]),[{text:"Total",bold:true},{text:eur(tot),bold:true,fontSize:13}],["Avans","100 € pentru rezervarea datei"],["Valabilă până la",o.val?fdate(o.val):""]].map(r=>r.map(c=>typeof c==="string"?{text:c}:c))},layout:{hLineColor:()=>"#e2ddd5",vLineWidth:()=>0,paddingTop:()=>6,paddingBottom:()=>6}},
      {text:"Ce include",fontSize:13,bold:true,margin:[0,22,0,8],color:A},{ul:inc,margin:[0,0,0,6]},
      ...(o.note?[{text:"Mențiuni",fontSize:13,bold:true,margin:[0,16,0,6],color:A},{text:o.note}]:[]),
      {text:"Meniul de cocktailuri",fontSize:13,bold:true,margin:[0,18,0,6],color:A},{text:[{text:"Meniul 2026: ",bold:true},{text:MENU_URL,link:MENU_URL,color:A,decoration:"underline"}]},
      {text:"Pentru rezervare ne scrieți pe WhatsApp la 0743 785 655. Vă așteptăm cu drag!",margin:[0,22,0,0]}]};
  const blob=await new Promise(r=>pm.createPdf(doc).getBlob(r));
  const name=`Oferta Cocktail Philosophy - ${fn} - ${x.data||iso(new Date())}.pdf`;
  return {blob,name,pp,tot}}
async function offerSend(x,wa){if(LBUSY)return;LBUSY=wa?"send":"pdf";let W=null;if(wa){try{W=window.open("","_blank")}catch(e){}if(W)try{W.document.write("<p style='font:16px sans-serif;padding:20px'>Se pregătește oferta…</p>")}catch(e){}}refresh();
  try{const r=await offerPDF(x);let lk="";
    try{if(window.__gd){const up=await window.__gd.uploadPublic(new File([r.blob],r.name,{type:"application/pdf"}),"Oferte trimise");lk=up.link}}catch(e){}
    if(!lk){const a=document.createElement("a");a.href=URL.createObjectURL(r.blob);a.download=r.name;a.click()}
    const o=LOFF,offer={pachet:o.pachet==="barmani"?"barmani":"ai",n:o.pachet==="barmani"?+o.n:null,inv:o.inv||"",pp:r.pp,total:r.tot,val:o.val||"",note:o.note||"",link:lk,at:new Date().toISOString()};
    await F.fs.doc(`barLead/${x.id}`).set({offer,st:"oferta"},{merge:true});
    if(wa){const fn=String(x.nume||"").split(" ")[0];const txt=`Bună, ${fn}! Sunt Paul de la Cocktail Philosophy. Vă trimit oferta pentru evenimentul vostru${x.data?" din "+fdate(x.data):""}${x.loc?", "+x.loc:""}:\n\n`+
        (offer.pachet==="barmani"?`Pachet barmani, ${offer.n} ${offer.n===1?"barman":"barmani"}: ${eur(offer.total)}`:`All Inclusive, ${offer.inv} invitați: ${eur(offer.pp)} / persoană, total ${eur(offer.total)}, cu băuturi la discreție`)+
        `\nAvans 100 € pentru rezervarea datei.${lk?`\n\nOferta completă: ${lk}`:""}\nMeniul nostru: ${MENU_URL}\n\nAștept cu drag orice întrebare!`;
      const u=`https://wa.me/${telWa(x.tel)}?text=${encodeURIComponent(txt)}`;if(W)W.location.href=u;else window.open(u,"_blank")}
    LOFF=null;}catch(e){console.warn(e);if(W)try{W.close()}catch(_){};alertMsg("Nu am putut face oferta. "+(e&&e.msg||"Verifică internetul și încearcă din nou."))}
  LBUSY="";refresh()}
function alertMsg(m){const t=document.getElementById("toast");if(t){t.textContent=m;t.classList&&t.classList.add("show");setTimeout(()=>t.classList&&t.classList.remove("show"),4000)}}
function leadClick(t){
  const lf=t.closest("[data-lf]");if(lf){LF=lf.dataset.lf;refresh();return true}
  const la=t.closest("[data-ladd]");if(la){LADD=la.dataset.ladd==="1";refresh();if(LADD){const i=document.querySelector("[data-la=nume]");if(i)i.focus()}return true}
  if(t.closest("[data-laddsave]")){const g=k=>{const i=document.querySelector(`[data-la=${k}]`);return i?i.value.trim():""};
    const tel=g("tel").replace(/[^\d+]/g,""),nume=g("nume");if(!nume||tel.replace(/\D/g,"").length<9){alertMsg("Scrie numele și un telefon valid.");return true}
    const sk=g("src"),sn=(SRC.find(x=>x[0]===sk)||["alta","Altă sursă"])[1];
    F.fs.collection("barLead").add({nume:nume.slice(0,60),tel:tel.slice(0,20),data:g("data").slice(0,10),inv:g("inv").replace(/\D/g,"").slice(0,6),loc:g("loc").slice(0,80),msg:g("msg").slice(0,500),ev:"sursa-"+sk,evn:sn,at:new Date().toISOString()}).then(()=>{LADD=false;LF="open";refresh()}).catch(()=>alertMsg("Nu am putut salva cererea."));return true}
  const lo=t.closest("[data-lo]");if(lo){const id=lo.dataset.lo;if(!id){LOFF=null;refresh();return true}const x=LEADS.find(y=>y.id===id);if(!x)return true;
    LOFF={id,pachet:x.offer&&x.offer.pachet==="barmani"?"barmani":"ai",inv:x.inv||(x.offer&&x.offer.inv)||"",pp:null,n:(x.offer&&x.offer.n)||2,val:addD(14),note:""};LLOST=null;refresh();return true}
  const lof=t.closest("[data-lof]");if(lof&&lof.tagName==="SELECT")return false;
  const ls=t.closest("[data-losend]");if(ls){const x=LEADS.find(y=>y.id===ls.dataset.losend);if(x)offerSend(x,true);return true}
  const lp=t.closest("[data-lopdf]");if(lp){const x=LEADS.find(y=>y.id===lp.dataset.lopdf);if(x)offerSend(x,false);return true}
  const ll=t.closest("[data-llost]");if(ll){LLOST=ll.dataset.llost||null;LOFF=null;refresh();return true}
  const lls=t.closest("[data-llsave]");if(lls){const m=document.querySelector("[data-ll=m]");F.fs.doc(`barLead/${lls.dataset.llsave}`).set({st:"pierduta",lost:m?m.value:""},{merge:true}).catch(()=>{});LLOST=null;return true}
  const l=t.closest("[data-lead]");
  if(l){const x=LEADS.find(y=>y.id===l.dataset.id);if(!x)return true;const a=l.dataset.lead;
    if(a==="ct"){F.fs.doc(`barLead/${x.id}`).set({st:"ct"},{merge:true}).catch(()=>{});
      window.__ctNew&&window.__ctNew({nume:String(x.nume||"").toLocaleUpperCase("ro-RO"),tel:x.tel||"",dataEv:x.data||"",locatie:String(x.loc||"").toLocaleUpperCase("ro-RO"),invitati:x.inv||(x.offer&&x.offer.inv)||"",pret:x.offer&&x.offer.pp?String(x.offer.pp).replace(".",","):""});return true}
    if(a==="back"){F.fs.doc(`barLead/${x.id}`).set({st:x.offer?"oferta":"",lost:""},{merge:true}).catch(()=>{});return true}
  }
  return false}
/* recalculează totalul ofertei când schimbi pachetul, invitații sau prețul */
document.addEventListener("change",e=>{if(e.target.closest&&e.target.closest("[data-lof]")){grabOffer();if(e.target.dataset.lof==="inv")LOFF.pp=null;refresh()}});
/* ---------- aceeași zi: câte evenimente ai deja și dacă îți ajung barurile, mașinile, oamenii ---------- */
function sameDay(d,skipId){if(!d)return null;const D=curD(),ev=[],seen=new Set();
  CT.filter(c=>c.dataEv===d&&c.id!==skipId).forEach(c=>{const n=tcase(c.locatie||c.nume||"");seen.add(nrm(n).join(" "));ev.push({n,t:c.oraEv||"",src:"contract",who:tcase(c.nume||"")})});
  if(D)D.events.forEach(e=>{if(iso(evDate(e,D))!==d)return;const k=nrm(e.name).join(" ");if([...seen].some(s=>s&&(s.includes(k)||k.includes(s))))return;ev.push({n:titleCase(e.name),t:e.time||"",src:"fișă",who:(e.team||[]).join(" ")})});
  const cap={bar:+FIRMA.capBar||0,car:+FIRMA.capCar||0,ppl:+FIRMA.capPpl||0};
  return {ev,cap}}
function sameDayHTML(d,skipId,adding){const r=sameDay(d,skipId);if(!r||!r.ev.length)return d?`<p class="ev-file ov-ok">Nimic altceva în ziua asta.</p>`:"";
  const n=r.ev.length+(adding?1:0),c=r.cap,over=c.bar&&n>c.bar;
  return `<div class="${over?"ev-alert":"ev-ok"} ov-box"><b>${r.ev.length===1?"Mai ai un eveniment":"Mai ai "+r.ev.length+" evenimente"} în ziua asta:</b> ${r.ev.map(x=>esc(x.n)+(x.t?" ("+esc(x.t)+")":"")).join(", ")}.`+
    (c.bar||c.car||c.ppl?` <br>Cu acesta: <b>${n} ${n===1?"eveniment":"evenimente"}</b>${c.bar?` · ai ${c.bar} ${c.bar===1?"bar":"baruri"}`:""}${c.car?` · ${c.car} ${c.car===1?"mașină":"mașini"}`:""}${c.ppl?` · ${c.ppl} oameni (cam ${Math.floor(c.ppl/Math.max(1,n))} pe eveniment)`:""}.${over?" <b>Nu-ți ajung barurile.</b>":c.car&&n>c.car?" <b>Nu-ți ajung mașinile.</b>":""}`:` <small>Pune la Datele firmei câte baruri, mașini și oameni ai, ca să-ți spun dacă îți ajung.</small>`)+`</div>`}
window.__qr={code,link,leadsHTML,show,sync,pendHTML,sameDayHTML};
})();
