/* ---------- Eveniment nou / modificare fișă, direct în aplicație ---------- */
let EN=null;
const EN_META=["NR PERSOANE","DATA","ORA INCEPERE","ECHIPA","TRANSPORT","MENTIUNI SPECIALE"];
const enIsMeta=L=>L.startsWith("NR PERSOANE")||L==="PERSOANE"||L==="DATA"||L.startsWith("DATA ")||L==="ZIUA"||L==="ORA"||L.startsWith("ORA ")||L.startsWith("ECHIPA")||L.startsWith("TRANSPORT")||L.startsWith("MENTIUNI");
const enISO=d=>d?dKey(d):"";
function enTemplateRows(){
  if(EVD&&EVD.aoa&&EVD.aoa.length>1){
    const out=[];EVD.aoa.forEach((row,r)=>{if(!r)return;const lab=row&&row[0];if(blank(lab))return;const L=norm(lab);if(enIsMeta(L))return;out.push({r,lab:String(lab).trim(),L})});
    return out;
  }
  return Object.keys(KNOWN).map(L=>({r:null,lab:L,L}));
}
function enRatios(){
  const out={};if(!D)return out;
  const P=D.events.filter(e=>typeof e.persons==="number"&&e.persons>0);if(!P.length)return out;
  D.items.forEach(it=>{if(!QTY_CATS.includes(it.cat))return;let q=0,p=0;
    P.forEach(e=>{const v=e.values[it.key];if(v&&typeof v.v==="number"){q+=v.v;p+=e.persons}});
    if(p)out[it.excelLabel]=q/p});
  return out;
}
function enStart(pre){
  pre=pre||{};
  const rows=enTemplateRows(),vals={};
  let target="append";
  if(pre.col!=null&&EVD){
    const c=pre.col,A=EVD.aoa;
    rows.forEach(x=>{const v=A[x.r]&&A[x.r][c];if(!blank(v))vals[x.L]=String(v)});
  }
  EN={col:pre.col??null,nume:pre.nume||"",data:pre.data||"",ora:pre.ora||"",pers:pre.pers||"",echipa:pre.echipa||"",transport:pre.transport||"",note:pre.note||"",rows,vals,target,msg:"",from:pre.from||"",del:[],menuIds:Array.isArray(pre.menuIds)&&pre.menuIds.length?pre.menuIds.slice():null};
  if(EN.col==null)EN.target=(D&&EVD)?"append":"new";
  route="nou";render();const v=$("#evView");if(v)v.scrollIntoView({block:"start"});
  if(pre.auto&&EN.pers&&D)enAuto();
}
function enGuessTarget(iso){
  if(!D||!EVD)return "new";if(!iso)return "append";
  const d=new Date(iso+"T00:00:00"),ref=D.events.map(e=>e.date).filter(Boolean)[0]||D.title.date;
  if(!ref)return "append";
  return Math.abs((d-ref)/864e5)<=6?"append":"new";
}
function enGrab(){
  const V=$("#evView");if(!V||!EN)return;
  V.querySelectorAll("[data-en]").forEach(i=>EN[i.dataset.en]=i.value.trim());
  V.querySelectorAll("[data-eq]").forEach(i=>{const v=i.value.trim();if(v)EN.vals[i.dataset.eq]=v;else delete EN.vals[i.dataset.eq]});
  const t=V.querySelector("input[name=enT]:checked");if(t){if(t.value!==EN.target)EN.okNew=false;EN.target=t.value}
}
function viewNou(){
  const e=EN,ttl=D?D.title.big:"",edit=e.col!=null;
  const groupsOf=()=>{const g={};e.rows.forEach(x=>{if(e.del.includes(x.L))return;const k=KNOWN[x.L],cat=x.cat||(k?k[1]:"altele");(g[cat]=g[cat]||[]).push({...x,label:k?k[0]:capL(x.lab),cat})});return g};
  const G=groupsOf();
  let h=`<p style="margin:0 0 10px"><button class="btn" type="button" data-enact="cancel">← Înapoi la evenimente</button></p><div class="ev-hero"><p class="ev-sub">${edit?"Modifică fișa evenimentului":"Eveniment nou"}${e.from?` · din contractul ${esc(e.from)}`:""}</p>
    <p class="ev-file">${edit?"Schimbările apar imediat la toată echipa.":"Completezi aici fișa, fără Excel. Barmanii o văd imediat, iar marfa se scade din stoc."}</p></div>
    <div class="en-grid">
      <label class="en-w">Locație / nume eveniment<input data-en="nume" value="${esc(e.nume)}" placeholder="ex: Montana"></label>
      <label>Data<input type="date" data-en="data" value="${esc(e.data)}"><span id="enOver">${edit||!window.__qr||!window.__qr.sameDayHTML?"":window.__qr.sameDayHTML(e.data,null,true)}</span><span class="en-days">${enDays().map(x=>`<button type="button" class="en-day${x.iso===e.data?" on":""}" data-enact="day" data-d="${x.iso}">${x.t}</button>`).join("")}</span></label>
      <label>Ora începerii<input type="time" data-en="ora" value="${esc(e.ora)}"></label>
      <label>Persoane<input data-en="pers" inputmode="numeric" value="${esc(e.pers)}"></label>
      <label>Echipa<input data-en="echipa" value="${esc(e.echipa)}" placeholder="ex: Ioana Sebi"><span id="enAvail" class="en-av">${enAvailHTML(e.data,e.echipa)}</span></label>
      <label>Transport<input data-en="transport" value="${esc(e.transport)}" placeholder="ex: Toyota"></label>
      <label class="en-w">Mențiuni speciale<textarea data-en="note" rows="3" placeholder="ex: și cocktailuri fără alcool, -3 sticle premix">${esc(e.note)}</textarea></label>
    </div>`;
  if(!edit&&D){
    h+=`<div class="en-tg"><label><input type="radio" name="enT" value="append"${e.target==="append"?" checked":""}> Adaug la săptămâna încărcată acum (${esc(ttl)}, ${D.events.length} ${D.events.length===1?"eveniment":"evenimente"})</label>
      <label><input type="radio" name="enT" value="new"${e.target==="new"?" checked":""}> Încep o săptămână nouă cu acest eveniment <small>(săptămâna de acum se mută în „Săptămâni anterioare”)</small></label></div>`;
  }
  if(e.menuIds){const R0=enRecipes(),nm=e.menuIds.map(id=>(R0.find(r=>r.id===id)||{}).name).filter(Boolean);
    h+=`<div class="ev-ok en-menu"><b>Meniul ales de client:</b> ${esc(nm.join(", "))}. Premixurile și alcoolul de bază se calculează după el: cele din cocktailurile alese primesc mai mult, celelalte 0. <button type="button" class="btn" data-enact="nomenu">Calculează pentru tot meniul</button></div>`}
  h+=`<div class="en-acts"><button class="btn" type="button" data-enact="auto">Completează cantitățile după numărul de persoane</button></div>
    <p class="ev-file">Calculez din ce s-a trimis la evenimentele din săptămâna încărcată acum, raportat la numărul de persoane. Verifică și ajustează.</p>`;
  CATS.forEach(c=>{const L=G[c.id]||[];
    h+=`<h2 class="ev-h2">${esc(c.name)}</h2><div class="en-q">`+L.map(x=>`<label><span class="en-lb"><span>${esc(x.label)}${QTY_CATS.includes(c.id)?` <small class="en-u">${esc(enUnit(x.L,c.id))}</small>`:""}</span><button type="button" class="en-x" data-enact="del" data-l="${esc(x.L)}" title="Scoate ${esc(x.label)}" aria-label="Scoate ${esc(x.label)}">×</button></span><input data-eq="${esc(x.L)}" value="${esc(e.vals[x.L]||"")}" ${QTY_CATS.includes(c.id)?'inputmode="decimal"':""}>${QTY_CATS.includes(c.id)?`<small class="en-st" data-st="${esc(x.L)}">${enStockHint(x.L,e.vals[x.L])}</small>`:""}</label>`).join("")+`</div>
      <div class="en-add"><input data-enadd-n="${c.id}" placeholder="Articol nou în ${esc(c.name.toLowerCase())}" aria-label="Articol nou"><input data-enadd-q="${c.id}" placeholder="${QTY_CATS.includes(c.id)?"cantitate":"da / nr."}" aria-label="Cantitate"><button type="button" class="btn" data-enact="add" data-c="${c.id}">+ Adaugă</button></div>`});
  if(e.del.length)h+=`<p class="ev-file">Scoase din fișă: ${e.del.map(L=>{const x=e.rows.find(r=>r.L===L);return `<button type="button" class="en-day" data-enact="undel" data-l="${esc(L)}">↩ ${esc(KNOWN[L]?KNOWN[L][0]:capL(x?x.lab:L))}</button>`}).join(" ")}</p>`;
  if(e.msg)h+=`<p class="ev-alert">${esc(e.msg)}</p>`;
  h+=`<div class="en-save"><button class="btn" type="button" data-enact="cancel">Renunță</button><button class="btn primary" type="button" data-enact="save">${edit?"Salvează fișa":"Salvează evenimentul"}</button></div>`;
  return h;
}
function enAuto(){
  enGrab();const p=parseFloat(String(EN.pers).replace(",","."));
  if(!(p>0)){EN.msg="Scrie întâi numărul de persoane.";render();return}
  const R0=enMenuRatios(enRatios(),EN.menuIds);let n=0;
  EN.rows.forEach(x=>{const r=R0[x.L];if(r==null||EN.vals[x.L])return;let q=r*p;q=q<3?Math.ceil(q*2)/2:Math.ceil(q);if(q>0){EN.vals[x.L]=String(q).replace(".",",");n++}});
  EN.msg=n?"":"Nu am găsit date de consum pentru calcul. Încarcă un Excel sau completează de mână.";
  render();if(n)toast(`Am completat ${n} cantități. Verifică-le înainte să salvezi.`);
}
function enCell(L,v){
  if(blank(v))return null;const s=String(v).trim();
  if(/^\d+(?:[.,]\d+)?$/.test(s))return parseFloat(s.replace(",","."));return s;
}
function enBuild(){
  const e=EN,name=e.nume.toUpperCase(),d=e.data?new Date(e.data+"T00:00:00"):null;
  const pers=e.pers?enCell("",e.pers):null,meta={"NR PERSOANE":pers,"DATA":d?`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`:null,"ORA INCEPERE":e.ora||null,"ECHIPA":e.echipa||null,"TRANSPORT":e.transport||null,"MENTIUNI SPECIALE":e.note?e.note.replace(/\s*\n+\s*/g," "):null};
  if(e.target==="new"||!EVD||!EVD.aoa){
    const rows=e.rows.filter(x=>!e.del.includes(x.L)),aoa=[["SPECIFICAȚII / ARTICOLE",name]];
    EN_META.forEach(L=>aoa.push([L,meta[L]]));
    rows.forEach(x=>aoa.push([x.lab,enCell(x.L,e.vals[x.L])]));
    const ref=d||new Date(),fileName=`${ref.getDate()}_${MONTHS[ref.getMonth()]}_${ref.getFullYear()}.app`;
    return {fileName,aoa};
  }
  const A=EVD.aoa.map(r=>(r||[]).slice()),hdr=A[0];
  let col=e.col;
  if(col==null){
    const tc=hdr.findIndex((v,i)=>i>0&&norm(v)==="TOTAL");
    col=tc>0?tc:Math.max(hdr.length,1);
    if(tc>0)A.forEach(r=>{while(r.length<tc)r.push(null);r.splice(tc,0,null)});
  }
  A.forEach(r=>{while(r.length<=col)r.push(null)});
  A[0][col]=name;
  const findRow=test=>A.findIndex((r,i)=>i>0&&!blank(r[0])&&test(norm(r[0])));
  const metaTest={"NR PERSOANE":L=>L.startsWith("NR PERSOANE")||L==="PERSOANE","DATA":L=>L==="DATA"||L.startsWith("DATA ")||L==="ZIUA"||L==="DATA EVENIMENT","ORA INCEPERE":L=>L==="ORA"||L.startsWith("ORA "),"ECHIPA":L=>L.startsWith("ECHIPA"),"TRANSPORT":L=>L.startsWith("TRANSPORT"),"MENTIUNI SPECIALE":L=>L.startsWith("MENTIUNI")};
  EN_META.forEach(L=>{let r=findRow(metaTest[L]);
    if(r<0){if(blank(meta[L]))return;const nr=new Array(A[0].length).fill(null);nr[0]=L;
      if(L==="DATA"&&D&&D.title.date){const td=D.title.date,ts=`${String(td.getDate()).padStart(2,"0")}.${String(td.getMonth()+1).padStart(2,"0")}.${td.getFullYear()}`;D.events.forEach(ev=>{if(ev.col!==col)nr[ev.col]=ts})}
      A.push(nr);r=A.length-1}
    while(A[r].length<=col)A[r].push(null);A[r][col]=meta[L];
    if(L==="MENTIUNI SPECIALE"){for(let k=r+1;k<A.length&&blank(A[k][0]);k++){if(A[k].length>col)A[k][col]=null}}
  });
  const tcol=A[0].findIndex((v,i)=>i>0&&norm(v)==="TOTAL"),evCols=A[0].map((v,i)=>i).filter(i=>i>0&&i!==tcol&&!blank(A[0][i]));
  e.rows.forEach(x=>{const gone=e.del.includes(x.L);
    if(x.r==null){if(gone)return;const v=enCell(x.L,e.vals[x.L]);const nr=new Array(A[0].length).fill(null);nr[0]=x.lab;nr[col]=v;if(tcol>0&&typeof v==="number")nr[tcol]=v;A.push(nr);x.r=A.length-1;return}
    while(A[x.r].length<=col)A[x.r].push(null);A[x.r][col]=gone?null:enCell(x.L,e.vals[x.L]);
    if(gone&&evCols.every(i=>blank(A[x.r][i])))A[x.r]=[];});
  return {fileName:EVD.fileName,aoa:A};
}
async function enSave(btn){
  enGrab();const e=EN;
  if(!e.nume){e.msg="Scrie locația sau numele evenimentului.";render();return}
  if(!e.data){e.msg="Alege data evenimentului.";render();return}
  let next;try{next=enBuild();parseAOA(next.aoa,next.fileName)}catch(err){e.msg="Nu am putut construi fișa: "+(err.message||"");render();return}
  if(e.col==null&&e.target==="new"&&D&&EVD&&!e.okNew){e.okNew=true;e.msg=`Atenție: vei înlocui săptămâna încărcată acum (${D.events.map(x=>x.name).join(", ")}) cu o săptămână nouă. Ea rămâne salvată în „Săptămâni anterioare”. Apasă încă o dată „Salvează evenimentul” ca să confirmi.`;render();return}
  btn.disabled=true;btn.textContent="Se salvează…";
  const a=await artReady,okMsg=`${e.col!=null?"Fișa":"Evenimentul"} „${titleName(e.nume)}” e salvat pentru toată echipa.`;
  const done=()=>{const nm=norm(e.nume);EN=null;EVD=next;loadData();const ev=D&&D.events.find(x=>norm(x.name)===nm);route=ev?ev.id:"ziua";store.set("evroute",route);render()};
  if(!a||readOnly){store.set("events",next);done();toast("Salvat doar în acest browser.");return}
  sess.set("open","");sess.set("okmsg",okMsg);
  try{await a.publish(buildHTML(R,next));done();toast(okMsg);if(window.__stocIesire)window.__stocIesire(next);if(window.__stocRefresh)window.__stocRefresh()}
  catch(err){sess.set("open",null);sess.set("okmsg",null);const code=err&&err.code;
    e.msg=code==="not_writer"||code==="not_granted"?"Doar administratorul poate salva evenimente.":"Salvarea nu a reușit. Verifică internetul și încearcă din nou.";
    if(document.contains(btn)){btn.disabled=false;btn.textContent="Salvează evenimentul"}render()}
}
function enClick(t){
  const b=t.closest("[data-enact]");if(!b||!EN)return false;
  const a=b.dataset.enact;
  if(a==="cancel"){EN=null;route="ziua";render();return true}
  if(a==="auto"){enAuto();return true}
  if(a==="team"){enGrab();const n=b.dataset.n,cur=String(EN.echipa||"").split(/[\s,;\/+]+/).filter(Boolean);if(!cur.some(x=>norm(x)===norm(n)))cur.push(n);EN.echipa=cur.join(" ");render();return true}
  if(a==="nomenu"){enGrab();EN.menuIds=null;render();return true}
  if(a==="del"){enGrab();const L=b.dataset.l;if(!EN.del.includes(L))EN.del.push(L);delete EN.vals[L];render();return true}
  if(a==="undel"){enGrab();EN.del=EN.del.filter(x=>x!==b.dataset.l);render();return true}
  if(a==="add"){enGrab();const c=b.dataset.c,V=$("#evView"),ni=V.querySelector(`[data-enadd-n="${c}"]`),qi=V.querySelector(`[data-enadd-q="${c}"]`);
    const n=(ni&&ni.value||"").trim(),q=(qi&&qi.value||"").trim();if(!n){if(ni)ni.focus();return true}
    const lab=n.toLocaleUpperCase("ro-RO"),L=norm(lab);
    if(enIsMeta(L)){EN.msg="Numele ăsta e rezervat pentru detaliile evenimentului. Alege alt nume.";render();return true}
    EN.del=EN.del.filter(x=>x!==L);
    let x=EN.rows.find(r=>r.L===L);if(!x){x={r:null,lab,L,cat:c};EN.rows.push(x)}
    if(!KNOWN[L]){const nl=n.charAt(0).toLocaleUpperCase("ro-RO")+n.slice(1);KNOWN[L]=[nl,c];enSaveArt(L,nl,c)}
    if(q)EN.vals[L]=q;EN.msg="";render();const nn=$("#evView").querySelector(`[data-eq="${L}"]`);if(nn&&!q)nn.focus();return true}
  if(a==="day"){enGrab();EN.data=b.dataset.d;render();return true}
  if(a==="save"){enSave(b);return true}
  return true;
}
function enEditBtn(e){return `<p style="margin:14px 0 0" class="edit-only"><button class="btn" type="button" data-enedit="${e.col}">Modifică fișa</button></p>`}
function enFromEvent(col){
  const e=D.events.find(x=>x.col===+col);if(!e)return;
  enStart({col:e.col,nume:e.name,data:enISO(e.date),ora:e.time&&/^\d\d:\d\d$/.test(e.time)?e.time:"",pers:e.persons!=null?String(e.persons):"",echipa:e.team.join(" "),transport:e.transport||"",note:(e.notesRaw||[]).join(" ")});
}
window.__evNew=pre=>{const b=document.querySelector('nav.tabs button[data-view="evenimente"]');if(b)b.click();enStart(pre)};
/* Săptămâni anterioare (arhivă) */
let ARH=null;
function arhOpen(){route="arh";ARH={list:null,msg:"",busy:""};render();
  if(!window.__arh){ARH.msg="Arhiva e disponibilă doar în aplicația online.";render();return}
  window.__arh.list().then(L=>{ARH.list=L;render()}).catch(()=>{ARH.msg="Nu am putut citi arhiva. Verifică internetul.";ARH.list=[];render()});
}
function viewArh(){
  const cur=EVD&&EVD.fileName;
  let h=`<div class="ev-card"><p><button class="btn" type="button" data-arh="back">← Înapoi la evenimente</button></p><h2 class="ev-h2">Săptămâni anterioare</h2>
    <p class="ev-file">De fiecare dată când încarci alt Excel sau începi o săptămână nouă, săptămâna veche se salvează aici, cu tot cu bifele și returul. O poți readuce oricând; săptămâna de acum se salvează și ea aici.</p>`;
  if(ARH.msg)h+=`<p class="ev-alert">${esc(ARH.msg)}</p>`;
  if(!ARH.list)h+=`<p class="ev-file">Se încarcă…</p>`;
  else if(!ARH.list.length)h+=`<p class="ev-file">Încă nu e nicio săptămână salvată.</p>`;
  else h+=`<div class="arh-l">`+ARH.list.map(x=>{let t=x.fileName;try{t=parseTitle(x.fileName).big||x.fileName}catch(e){}
    const at=x.at?new Date(x.at).toLocaleString("ro-RO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
    return `<div class="arh-i"><div><b>${esc(t)}</b><small>${esc(x.fileName)}${x.ev?` · ${x.ev} ${x.ev===1?"eveniment":"evenimente"}`:""}${at?` · înlocuită pe ${esc(at)}`:""}</small></div>${x.fileName===cur?`<span class="ev-file">e cea de acum</span>`:`<button class="btn" type="button" data-arh="restore" data-k="${esc(x.k)}"${ARH.busy?" disabled":""}>${ARH.busy===x.k?"Se readuce…":"Readu săptămâna"}</button>`}</div>`}).join("")+`</div>`;
  return h+`</div>`;
}
async function arhRestore(k){
  ARH.busy=k;ARH.msg="";render();
  try{const o=await window.__arh.get(k);if(!o||!o.aoa)throw 0;parseAOA(o.aoa,o.fileName);
    const a=await artReady;if(!a||readOnly)throw {code:"not_writer"};
    await a.publish(buildHTML(R,o));EVD=o;store.set("events",EVD);loadData();route="ziua";store.set("evroute",route);ARH=null;render();
    toast("Săptămâna e readusă pentru toată echipa.");
    if(window.__stocIesire)window.__stocIesire(o);if(window.__stocRefresh)window.__stocRefresh();
  }catch(e){ARH.busy="";ARH.msg=e&&(e.code==="not_writer"||e.code==="not_granted")?"Doar administratorul poate readuce o săptămână.":"Nu am putut readuce săptămâna. Încearcă din nou.";render()}
}
function arhClick(t){
  const b=t.closest("[data-arh]");if(!b)return false;
  if(b.dataset.arh==="back"){ARH=null;route="ziua";render();return true}
  if(b.dataset.arh==="restore"&&!ARH.busy){arhRestore(b.dataset.k);return true}
  return true;
}

function enDays(){const out=[],t=new Date();t.setHours(0,0,0,0);const N=["Dum","Lun","Mar","Mie","Joi","Vin","Sâm"];
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  for(let i=0;i<14&&out.length<6;i++){const d=new Date(t);d.setDate(t.getDate()+i);const w=d.getDay();if(w===5||w===6||w===0)out.push({iso:iso(d),t:`${N[w]} ${d.getDate()}`})}
  return out;
}

/* Articole adăugate de mână: numele și categoria lor se țin minte pentru toată echipa */
function enSaveArt(L,label,cat){try{const F=window.CPFS;if(F&&F.isAdmin)F.fs.doc(`${F.base}/config/articole`).set({map:{[L]:[label,cat]}},{merge:true}).catch(()=>{})}catch(e){}}
(function enLoadArt(){try{const F=window.CPFS;if(!F)return;F.fs.doc(`${F.base}/config/articole`).get().then(d=>{const m=d.exists&&d.data().map;if(!m)return;let ch=false;
  Object.entries(m).forEach(([L,v])=>{if(Array.isArray(v)&&!KNOWN[L]){KNOWN[L]=v;ch=true}});
  if(ch&&EVD){loadData();render();if(window.__stocRefresh)window.__stocRefresh()}}).catch(()=>{})}catch(e){}})();

/* Unitatea în care se numără fiecare articol (ca în Excel și în stoc) */
const EN_UNITS={"GHEATA":"kg","LADA LIME":"lăzi","PORTO BUC":"buc","GREF":"buc","CIMBRISOR":"caserole","ROZMARIN":"caserole","MENTA":"caserole","DESHIDRATATE":"pungi","FLORI COMES":"caserole","PROSECCO":"sticle 0,75 L","FRESH LAMAIE":"sticle 1 L","APA MINERALA":"sticle","COLA 1 L":"sticle 1 L","ALOE 1,5L":"sticle 1,5 L","KINLEY 1,5":"sticle 1,5 L","SAN PELEGRIN":"sticle","CRANBERRY":"cutii 1 L","ORANGE":"cutii 1 L","MAR VERDE":"cutii 1 L"};
function enUnit(L,cat){if(EN_UNITS[L])return EN_UNITS[L];if(/\bKG\b/.test(L))return "kg";if(cat==="alcool")return "sticle 1 L";if(cat==="premix")return "sticle";if(cat==="soft")return "sticle";if(cat==="garnish")return "buc";return "buc"}
/* Cât e în depozit pentru acest articol, după celelalte evenimente din săptămână */
function enStockHint(L,raw){
  if(!window.__stocAvail)return "";const evd=EVD,ds=window.__stocDs?window.__stocDs(evd):"";
  const a=window.__stocAvail(L,EN&&EN.target==="new"?"":ds);if(!a)return "";
  let others=0;if(D&&EN&&EN.target!=="new"){const it=D.items.find(i=>i.excelLabel===L);if(it)D.events.forEach(ev=>{if(EN.col!=null&&ev.col===EN.col)return;const x=ev.values[it.key];if(x&&typeof x.v==="number")others+=x.v})}
  const avail=Math.round((a.disp-others)*100)/100,q=parseFloat(String(raw||"").replace(",","."));
  if(q>0&&q>avail)return `<span class="warn">în depozit ${num(Math.max(avail,0))} · lipsesc ${num(Math.round((q-Math.max(avail,0))*100)/100)} → intră în Comandă furnizor</span>`;
  return `în depozit ${num(avail)}`;
}
document.addEventListener("change",ev=>{const i=ev.target;if(EN&&i&&i.dataset&&i.dataset.en==="data"&&EN.col==null){const o=document.getElementById("enOver");if(o&&window.__qr)o.innerHTML=window.__qr.sameDayHTML(i.value,null,true)}if(EN&&i&&i.dataset&&i.dataset.en==="data"){EN.data=i.value;const a=document.getElementById("enAvail");if(a)a.innerHTML=enAvailHTML(i.value,EN.echipa)}});
document.addEventListener("cp-stoc",()=>{if(!EN)return;document.querySelectorAll("#evView .en-st").forEach(h=>{const i=h.parentElement.querySelector("[data-eq]");if(i)h.innerHTML=enStockHint(h.dataset.st,i.value)})});
document.addEventListener("input",ev=>{const i=ev.target;if(!EN||!i.matches||!i.matches("[data-eq]"))return;const h=i.parentElement&&i.parentElement.querySelector(".en-st");if(h)h.innerHTML=enStockHint(i.dataset.eq,i.value)});
/* Rețetele și legătura lor cu premixurile și alcoolul din fișă */
function enRecipes(){try{return JSON.parse(document.getElementById("recipes-data").textContent)||[]}catch(e){return []}}
const EN_ALIAS={PASSIFLORA:"PORNSTAR",WHISKEY:"JAMESON",WHISKY:"JAMESON",DISARONNO:"AMARETTO","ROM ESPECIAL":"ROM 1L",ROM:"ROM 1L",VODKA:"VODKA 1L"};
function enRowFor(n,cat){const raw=norm(String(n).replace(/^premix\s+/i,""));const cands=[raw,EN_ALIAS[raw],EN_ALIAS[raw.split(" ")[0]],raw.split(" ")[0]].filter(Boolean);
  for(const c of cands){const x=EN.rows.find(r=>{const k=KNOWN[r.L],rc=r.cat||(k?k[1]:"altele");return rc===cat&&(r.L===c||r.L.startsWith(c+" ")||norm(r.L).replace(/ 1L$/,"")===c)});if(x)return x.L}return null}
function enUses(recipes){const pm=new Set(),sp=new Set();recipes.forEach(r=>(r.ing||[]).forEach(i=>{const n=String(i.n||"");
  if(i.k==="premix"||/^premix/i.test(n)){const L=enRowFor(n,"premix");if(L)pm.add(L)}else{const L=enRowFor(n,"alcool");if(L)sp.add(L)}}));return {pm,sp}}
function enMenuRatios(R0,ids){
  if(!ids||!ids.length||!EN)return R0;const all=enRecipes(),chosen=all.filter(r=>ids.includes(r.id));if(!chosen.length)return R0;
  const A=enUses(all),C=enUses(chosen),out={...R0};
  [[A.pm,C.pm],[A.sp,C.sp]].forEach(([grp,sel])=>{const tot=[...grp].reduce((s,L)=>s+(R0[L]||0),0),selTot=[...sel].reduce((s,L)=>s+(R0[L]||0),0);
    if(!tot||!selTot)return;grp.forEach(L=>{out[L]=sel.has(L)?(R0[L]||0)*tot/selTot:0})});
  return out;
}
const prepQ=(q,u)=>{q=Math.round(q*100)/100;const U=String(u||"").toLowerCase();if(U==="g"&&q>=1000)return num(Math.round(q/10)/100)+" kg";if(U==="ml"&&q>=1000)return num(Math.round(q/10)/100)+" L";return num(q)+(u?" "+u:"")};
/* ---------- Preparare premixuri: câte sticle trebuie făcute pentru evenimentele săptămânii ---------- */
let PREP={rec:null,edit:false,msg:""};
function prepLoadRec(){if(PREP.rec)return;PREP.rec={};try{const F=window.CPFS;F.fs.doc(`${F.base}/config/premixuri`).get().then(d=>{PREP.rec=d.exists&&d.data().map||{};if(route==="prep")render()}).catch(()=>{})}catch(e){}}
const prepParse=t=>String(t||"").split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(.*?)[\s:–-]+(\d+(?:[.,]\d+)?)\s*([^\d\s].*)?$/);return m?{n:m[1].trim(),q:parseFloat(m[2].replace(",",".")),u:(m[3]||"").trim()}:{n:l,q:null,u:""}});
const prepFmt=a=>(a||[]).map(i=>`${i.n} ${i.q!=null?num(i.q):""}${i.u?" "+i.u:""}`.trim()).join("\n");
function prepRows(){
  if(!D)return [];const ds=window.__stocDs?window.__stocDs(EVD):"";
  return D.items.filter(it=>it.cat==="premix").map(it=>{let need=0;const per=[];
    D.events.forEach(e=>{const x=e.values[it.key];if(x&&typeof x.v==="number"&&x.v>0){need+=x.v;per.push(`${e.name} ${num(x.v)}`)}});
    const a=window.__stocAvail?window.__stocAvail(it.excelLabel,ds):null,shelf=a?Math.max(0,a.disp):null;
    const make=Math.max(0,Math.ceil(need-(shelf||0)-1e-9));
    return {it,L:it.excelLabel,need,per,shelf,make}}).filter(r=>r.need>0);
}
function viewPrep(){
  prepLoadRec();const R=prepRows(),rec=PREP.rec||{},admin=window.CPFS&&window.CPFS.isAdmin;
  let h=`<p class="ev-mode">Câte sticle din fiecare premix trebuie preparate pentru evenimentele din ${esc(D.title.big)}: ce pleacă la evenimente, minus ce e deja în depozit.</p>`;
  if(!R.length)return h+`<div class="ev-ok">În fișa săptămânii nu sunt premixuri.</div>`;
  const noStock=R.every(r=>r.shelf==null);
  if(noStock)h+=`<div class="ev-alert">Stocul de premixuri nu e introdus, așa că socotesc că depozitul e gol. Fă un Inventar la Stoc ca să vezi ce ai deja.</div>`;
  h+=`<div class="prep-t"><div class="prep-r prep-h"><span>Premix</span><span>La evenimente</span><span>În depozit</span><span>De preparat</span></div>`+
    R.map(r=>`<div class="prep-r"><span><b>${esc(r.it.label)}</b><small>${esc(r.per.join(" · "))}</small></span><span>${num(r.need)}</span><span>${r.shelf==null?"—":num(r.shelf)}</span><span class="prep-mk ${r.make?"":"ok"}">${r.make?num(r.make)+" sticle":"✓ ajunge"}</span></div>`).join("")+`</div>`;
  const tot={};R.forEach(r=>{(rec[r.L]||[]).forEach(i=>{if(i.q==null||!r.make)return;const k=norm(i.n)+"|"+i.u;tot[k]=tot[k]||{n:i.n,u:i.u,q:0};tot[k].q+=i.q*r.make})});
  const T=Object.values(tot);
  if(T.length)h+=`<h2 class="ev-h2">Ingrediente pentru preparare</h2><div class="ev-list">`+T.sort((a,b)=>a.n.localeCompare(b.n,"ro")).map(i=>`<div class="st-in"><span>${esc(i.n)}</span><b>${esc(prepQ(i.q,i.u))}</b></div>`).join("")+`</div>`;
  else if(R.some(r=>r.make))h+=`<p class="ev-file">Ca să vezi și ingredientele de cumpărat, ${admin?"scrie mai jos rețeta fiecărui premix (pentru o sticlă de 0,7 L).":"Paul trebuie să adauge rețetele premixurilor."}</p>`;
  h+=`<div class="st-save"><button class="btn primary" data-prep="copy">Copiază lista pentru WhatsApp</button></div>`;
  if(admin){h+=`<h2 class="ev-h2">Rețetele premixurilor <small class="ev-file">(pentru o sticlă de 0,7 L)</small></h2>`;
    if(!PREP.edit)h+=`<p><button class="btn" data-prep="edit">${Object.keys(rec).length?"Modifică rețetele":"Adaugă rețetele"}</button></p>`+Object.entries(rec).map(([L,a])=>`<p class="ev-file"><b>${esc((KNOWN[L]||[capL(L)])[0])}:</b> ${esc(prepFmt(a).replace(/\n/g," · "))}</p>`).join("");
    else{h+=`<p class="ev-file">Câte un ingredient pe rând, cu cantitatea și unitatea, de exemplu „Zahăr 400 g” sau „Suc de lămâie 200 ml”.</p><div class="prep-ed">`+
      D.items.filter(it=>it.cat==="premix").map(it=>`<label>${esc(it.label)}<textarea data-prec="${esc(it.excelLabel)}" rows="4" placeholder="Zahăr 400 g&#10;Apă 300 ml">${esc(prepFmt(rec[it.excelLabel]))}</textarea></label>`).join("")+
      `</div><div class="st-save"><button class="btn" data-prep="cancel">Renunță</button> <button class="btn primary" data-prep="save">Salvează rețetele</button></div>`}
    if(PREP.msg)h+=`<p class="ev-ok">${esc(PREP.msg)}</p>`}
  return h;
}
async function prepClick(t){const b=t.closest("[data-prep]");if(!b)return false;const a=b.dataset.prep;
  if(a==="edit"){PREP.edit=true;PREP.msg="";render();return true}
  if(a==="cancel"){PREP.edit=false;render();return true}
  if(a==="save"){const m={};document.querySelectorAll("#evView [data-prec]").forEach(x=>{const p=prepParse(x.value);if(p.length)m[x.dataset.prec]=p});
    try{const F=window.CPFS;await F.fs.doc(`${F.base}/config/premixuri`).set({map:m,at:new Date().toISOString()});PREP.rec=m;PREP.edit=false;PREP.msg="Rețetele sunt salvate."}catch(e){PREP.msg="Nu am putut salva. Verifică internetul."}
    render();return true}
  if(a==="copy"){const R=prepRows(),rec=PREP.rec||{};
    let txt=`Preparare premixuri · ${D.title.big}\n\n`+R.map(r=>`${r.it.label}: ${r.make?r.make+" sticle de preparat":"ajunge din depozit"} (la evenimente ${num(r.need)}${r.shelf!=null?", în depozit "+num(r.shelf):""})`).join("\n");
    const tot={};R.forEach(r=>(rec[r.L]||[]).forEach(i=>{if(i.q==null||!r.make)return;const k=norm(i.n)+"|"+i.u;tot[k]=tot[k]||{n:i.n,u:i.u,q:0};tot[k].q+=i.q*r.make}));
    const T=Object.values(tot);if(T.length)txt+=`\n\nIngrediente:\n`+T.map(i=>`- ${i.n}: ${prepQ(i.q,i.u)}`).join("\n");
    try{await navigator.clipboard.writeText(txt);toast("Lista e copiată. Lipește-o în grupul de WhatsApp.")}catch(e){window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank")}
    return true}
  return true}

/* barmanii care și-au marcat ziua ca disponibilă: atingi și intră în echipă */
function enAvailHTML(d,team){if(!d||!window.__disp)return "";const a=window.__disp.availFor(d),T=String(team||"").split(/[\s,;\/+]+/).map(x=>norm(x));
  const ok=a.ok.filter(n=>!T.includes(norm(String(n).split(" ")[0])));
  return (ok.length?`<span>Pot lucra: </span>`+ok.map(n=>`<button type="button" class="en-day" data-enact="team" data-n="${esc(String(n).split(" ")[0])}">+ ${esc(n)}</button>`).join(""):"")+(a.no.length?`<span class="ev-file">Nu pot: ${a.no.map(esc).join(", ")}</span>`:"")}
document.addEventListener("cp-disp",()=>{if(!EN)return;const o=document.getElementById("enAvail");if(o)o.innerHTML=enAvailHTML(EN.data,EN.echipa)});

/* ---------- Preia din calendar: evenimentele din Google Calendar devin fișe estimate ---------- */
let CI=null;
const ciISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function ciWeek(off){const t=new Date();t.setHours(0,0,0,0);const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7)+7*off);const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  return {from:off===0?ciISO(t):ciISO(mon),to:ciISO(sun),label:off===0?"Săptămâna asta":"Săptămâna viitoare"}}
const ciNum=s=>{const m=String(s||"").replace(/\./g,"").match(/(\d{2,4})/);return m?parseInt(m[1],10):null};
const ciLine=(d,k)=>{const m=String(d||"").match(new RegExp("^\\s*"+k+"\\s*:\\s*(.+)$","im"));return m?m[1].trim():""};
function ciParse(ev,contracts,dayN){
  const date=ev.start&&(ev.start.dateTime||ev.start.date)||"",iso=date.slice(0,10),ora=ev.start&&ev.start.dateTime?ev.start.dateTime.slice(11,16):"";
  const sum=String(ev.summary||"").trim(),desc=String(ev.description||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"");
  const tail=sum.match(/^(.*?)[\s,·-]+(\d{2,4})\s*(pers(oane)?|p)?\s*$/i);
  let pers=ciNum(ciLine(desc,"INVITAȚI"))||ciNum(ciLine(desc,"INVITATI"))||(tail?parseInt(tail[2],10):null);
  let nume=ciLine(desc,"LOCAȚIE")||ciLine(desc,"LOCATIE")||String(ev.location||"").split(",")[0].trim()||(tail?tail[1]:sum);
  const client=ciLine(desc,"CLIENT").split("·")[0].trim(),pachet=ciLine(desc,"PACHET");
  /* contractul din aplicație pentru aceeași zi (și, dacă sunt mai multe, aceeași locație) */
  const sameDay=contracts.filter(c=>c.dataEv===iso),n0=norm(nume+" "+sum);
  /* întâi contractul legat chiar de acest eveniment din calendar, apoi după locație, apoi singurul contract al unei zile cu un singur eveniment */
  let c=contracts.find(x=>x.calId&&x.calId===ev.id)||sameDay.find(x=>{const l=norm(x.locatie||"");return l.length>2&&(n0.includes(l)||l.split(" ").filter(w=>w.length>3).some(w=>n0.includes(w)))})||null;
  if(!c&&sameDay.length===1&&(dayN[iso]||0)===1&&!sameDay[0].calId)c=sameDay[0];
  if(c){if(c.invitati)pers=ciNum(c.invitati)||pers;if(c.locatie)nume=capL(c.locatie);}
  const r=c&&c.portalResp||{};
  const note=[pachet?"Pachet: "+pachet:"",r.menu&&r.menu.length?"Meniu: "+r.menu.join(", ")+(r.obs?". "+r.obs:""):""].filter(Boolean).join(". ");
  const emoji=/^[^\p{L}\p{N}]/u.test(sum);
  const looks=!emoji&&!!(c||pers||/CLIENT\s*:/i.test(desc)||ev.location);
  const inWeek=D&&D.events.some(e=>e.date&&ciISO(e.date)===iso&&(norm(e.name)===norm(nume)||norm(nume).includes(norm(e.name))||norm(e.name).includes(norm(nume))));
  return {id:ev.id,iso,ora,sum,nume:capL(nume.trim()),pers,client:c?c.nume:client,contract:!!c,menuIds:Array.isArray(r.menuIds)&&r.menuIds.length?r.menuIds:null,note,looks,inWeek,pick:looks&&!inWeek&&iso>=ciISO(new Date())};
}
function ciOpen(){CI={wk:0,list:null,msg:"",busy:false,target:null};route="cal";render();}
async function ciLoad(){
  if(!window.__gcal){CI.msg="Legătura cu Google Calendar nu e disponibilă acum.";render();return}
  const W=ciWeek(CI.wk);CI.busy=true;CI.msg="";CI.list=null;render();
  try{const F=window.CPFS;let contracts=[];try{const s=await F.fs.collection(`${F.base}/contracte`).get();contracts=s.docs.map(d=>d.data())}catch(e){}
    const evs=await window.__gcal.range(W.from,W.to),dayN={};
    evs.forEach(e=>{const sum=String(e.summary||"");if(/^[^\p{L}\p{N}]/u.test(sum.trim()))return;const d=(e.start&&(e.start.dateTime||e.start.date)||"").slice(0,10);dayN[d]=(dayN[d]||0)+1});
    CI.list=evs.map(e=>ciParse(e,contracts,dayN)).filter(x=>x.iso);
    if(!CI.target){const first=CI.list.find(x=>x.pick);CI.target=first?enGuessTarget(first.iso):"append"}}
  catch(e){CI.msg=e&&e.msg||"Nu am putut citi calendarul. Încearcă din nou."}
  CI.busy=false;render();
}
function viewCal(){
  const W=ciWeek(CI.wk),L=CI.list||[],ev=L.filter(x=>x.looks),other=L.filter(x=>!x.looks),ttl=D?D.title.big:"";
  let h=`<p style="margin:0 0 10px"><button class="btn" type="button" data-ci="back">← Înapoi la evenimente</button></p>
  <div class="ev-hero"><p class="ev-sub">Preia evenimentele din calendar</p><p class="ev-file">Aleg evenimentele din Google Calendar și fac fișele, cu cantitățile estimate după numărul de persoane. Dacă evenimentul are contract în aplicație, iau de acolo persoanele și meniul ales de client.</p></div>
  <div class="ci-wk">${[0,1].map(i=>`<button class="en-day${CI.wk===i?" on":""}" data-ci="wk" data-w="${i}">${ciWeek(i).label}</button>`).join("")}<span class="ev-file">${esc(W.from.split("-").reverse().join("."))} – ${esc(W.to.split("-").reverse().join("."))}</span></div>`;
  if(CI.list===null)return h+(CI.busy?`<p class="ev-file">Citesc calendarul…</p>`:`<p><button class="btn primary" type="button" data-ci="load" data-calgo="1">Citește calendarul</button></p>`)+(CI.msg?`<p class="ev-alert">${esc(CI.msg)}</p>`:"");
  const row=x=>`<label class="ci-r ${x.inWeek?"in":""}"><input type="checkbox" data-cip="${esc(x.id)}" ${x.pick?"checked":""} ${x.inWeek?"disabled":""}><span><b>${esc(x.nume||x.sum)}</b><small>${esc(x.iso.split("-").reverse().join("."))}${x.ora?" · "+esc(x.ora):""}${x.pers?" · "+x.pers+" persoane":" · <span class='warn'>fără nr. persoane</span>"}${x.client?" · "+esc(x.client):""}</small>
    <small>${x.contract?"✓ contract în aplicație"+(x.menuIds?" · cu meniul ales":""):"fără contract în aplicație"}${x.inWeek?" · e deja în fișa săptămânii":""}${x.sum&&norm(x.sum)!==norm(x.nume)?" · în calendar: „"+esc(x.sum)+"”":""}</small></span></label>`;
  h+=ev.length?`<div class="ci-l">${ev.map(row).join("")}</div>`:`<div class="ev-ok">Nu am găsit evenimente de bar în calendar în perioada asta.</div>`;
  if(other.length)h+=`<details class="ci-o"><summary>Alte ${other.length} intrări din calendar (nu par evenimente de bar)</summary><div class="ci-l">${other.map(row).join("")}</div></details>`;
  const n=L.filter(x=>x.pick&&!x.inWeek).length,noP=L.filter(x=>x.pick&&!x.pers).length;
  if(n){
    if(D)h+=`<div class="en-tg"><label><input type="radio" name="ciT" value="append"${CI.target==="append"?" checked":""}> Adaug la săptămâna încărcată acum (${esc(ttl)})</label>
      <label><input type="radio" name="ciT" value="new"${CI.target==="new"?" checked":""}> Încep o săptămână nouă cu ele <small>(săptămâna de acum se mută în „Săptămâni anterioare”)</small></label></div>`;
    if(noP)h+=`<p class="ev-alert">${noP===1?"Un eveniment ales nu are":noP+" evenimente alese nu au"} numărul de persoane, așa că fișa lor rămâne fără cantități. Le completezi după aceea, din „Modifică fișa”.</p>`;
    h+=`<p class="ev-file">Cantitățile se calculează din ce s-a trimis ${D?"în săptămâna „"+esc(ttl)+"”":""}, raportat la persoane, la fel ca butonul „Completează cantitățile”. Verifică fiecare fișă după aceea.</p>`;
  }
  if(CI.msg)h+=`<p class="ev-alert">${esc(CI.msg)}</p>`;
  h+=`<div class="en-save"><button class="btn" type="button" data-ci="back">Renunță</button><button class="btn primary" type="button" data-ci="make" ${n&&!CI.busy?"":"disabled"}>${CI.busy?"Se salvează…":n?`Fă ${n===1?"fișa":n+" fișe"}`:"Alege evenimentele"}</button></div>`;
  return h;
}
async function ciMake(btn){
  const L=(CI.list||[]).filter(x=>x.pick&&!x.inWeek).sort((a,b)=>(a.iso+a.ora).localeCompare(b.iso+b.ora));if(!L.length)return;
  if(CI.target==="new"&&D&&EVD&&!CI.okNew){CI.okNew=true;CI.msg=`Atenție: vei înlocui săptămâna încărcată acum (${D.events.map(x=>x.name).join(", ")}) cu una nouă. Ea rămâne salvată în „Săptămâni anterioare”. Apasă încă o dată ca să confirmi.`;render();return}
  const R0=enRatios(),saveEVD=EVD,saveD=D;let next=null,n=0;
  try{
    L.forEach((x,i)=>{
      const rows=enTemplateRows(),vals={},R1=enMenuRatios(R0,x.menuIds);
      if(x.pers)rows.forEach(r=>{const k=R1[r.L];if(k==null)return;let q=k*x.pers;q=q<3?Math.ceil(q*2)/2:Math.ceil(q);if(q>0)vals[r.L]=String(q).replace(".",",")});
      EN={col:null,nume:x.nume,data:x.iso,ora:x.ora,pers:x.pers?String(x.pers):"",echipa:"",transport:"",note:x.note,rows,vals,target:i===0?(CI.target||"append"):"append",msg:"",del:[],menuIds:x.menuIds};
      if(!D||!EVD)EN.target="new";
      next=enBuild();parseAOA(next.aoa,next.fileName);
      EVD=next;D=parseAOA(next.aoa,next.fileName);n++;
    });
  }catch(err){EVD=saveEVD;D=saveD;EN=null;CI.msg="Nu am putut face fișele: "+(err.message||"");render();return}
  EN=null;EVD=saveEVD;D=saveD;
  CI.busy=true;render();
  const a=await artReady,okMsg=`Am făcut ${n===1?"fișa":n+" fișe"} din calendar. Verifică cantitățile la fiecare eveniment.`;
  const done=()=>{EVD=next;CI=null;loadData();route="ziua";store.set("evroute",route);render()};
  if(!a||readOnly){store.set("events",next);done();toast("Salvat doar în acest browser.");return}
  sess.set("open","");sess.set("okmsg",okMsg);
  try{await a.publish(buildHTML(R,next));done();toast(okMsg);if(window.__stocIesire)window.__stocIesire(next);if(window.__stocRefresh)window.__stocRefresh()}
  catch(err){sess.set("open",null);sess.set("okmsg",null);CI.busy=false;const code=err&&err.code;CI.msg=code==="not_writer"||code==="not_granted"?"Doar administratorul poate salva evenimente.":"Salvarea nu a reușit. Verifică internetul și încearcă din nou.";render()}
}
function ciClick(t){
  if(!CI)return false;
  const p=t.closest("[data-cip]");if(p){const x=(CI.list||[]).find(y=>y.id===p.dataset.cip);if(x){x.pick=p.checked;CI.okNew=false;render()}return true}
  const r=t.closest("input[name=ciT]");if(r){CI.target=r.value;CI.okNew=false;render();return true}
  const b=t.closest("[data-ci]");if(!b)return false;const a=b.dataset.ci;
  if(a==="back"){CI=null;route="ziua";store.set("evroute",route);render();return true}
  if(a==="wk"){CI.wk=+b.dataset.w;CI.list=null;CI.target=null;CI.okNew=false;render();if(window.__gcal&&window.__gcal.ready())ciLoad();return true}
  if(a==="load"){ciLoad();return true}
  if(a==="make"){ciMake(b);return true}
  return true;
}
