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
  EN={col:pre.col??null,nume:pre.nume||"",data:pre.data||"",ora:pre.ora||"",pers:pre.pers||"",echipa:pre.echipa||"",transport:pre.transport||"",note:pre.note||"",rows,vals,target,msg:"",from:pre.from||"",del:[]};
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
      <label>Data<input type="date" data-en="data" value="${esc(e.data)}"><span class="en-days">${enDays().map(x=>`<button type="button" class="en-day${x.iso===e.data?" on":""}" data-enact="day" data-d="${x.iso}">${x.t}</button>`).join("")}</span></label>
      <label>Ora începerii<input type="time" data-en="ora" value="${esc(e.ora)}"></label>
      <label>Persoane<input data-en="pers" inputmode="numeric" value="${esc(e.pers)}"></label>
      <label>Echipa<input data-en="echipa" value="${esc(e.echipa)}" placeholder="ex: Ioana Sebi"></label>
      <label>Transport<input data-en="transport" value="${esc(e.transport)}" placeholder="ex: Toyota"></label>
      <label class="en-w">Mențiuni speciale<textarea data-en="note" rows="3" placeholder="ex: și cocktailuri fără alcool, -3 sticle premix">${esc(e.note)}</textarea></label>
    </div>`;
  if(!edit&&D){
    h+=`<div class="en-tg"><label><input type="radio" name="enT" value="append"${e.target==="append"?" checked":""}> Adaug la săptămâna încărcată acum (${esc(ttl)}, ${D.events.length} ${D.events.length===1?"eveniment":"evenimente"})</label>
      <label><input type="radio" name="enT" value="new"${e.target==="new"?" checked":""}> Încep o săptămână nouă cu acest eveniment <small>(săptămâna de acum se mută în „Săptămâni anterioare”)</small></label></div>`;
  }
  h+=`<div class="en-acts"><button class="btn" type="button" data-enact="auto">Completează cantitățile după numărul de persoane</button></div>
    <p class="ev-file">Calculez din ce s-a trimis la evenimentele din săptămâna încărcată acum, raportat la numărul de persoane. Verifică și ajustează.</p>`;
  CATS.forEach(c=>{const L=G[c.id]||[];
    h+=`<h2 class="ev-h2">${esc(c.name)}</h2><div class="en-q">`+L.map(x=>`<label><span class="en-lb">${esc(x.label)}<button type="button" class="en-x" data-enact="del" data-l="${esc(x.L)}" title="Scoate ${esc(x.label)}" aria-label="Scoate ${esc(x.label)}">×</button></span><input data-eq="${esc(x.L)}" value="${esc(e.vals[x.L]||"")}" ${QTY_CATS.includes(c.id)?'inputmode="decimal"':""}></label>`).join("")+`</div>
      <div class="en-add"><input data-enadd-n="${c.id}" placeholder="Articol nou în ${esc(c.name.toLowerCase())}" aria-label="Articol nou"><input data-enadd-q="${c.id}" placeholder="${QTY_CATS.includes(c.id)?"cantitate":"da / nr."}" aria-label="Cantitate"><button type="button" class="btn" data-enact="add" data-c="${c.id}">+ Adaugă</button></div>`});
  if(e.del.length)h+=`<p class="ev-file">Scoase din fișă: ${e.del.map(L=>{const x=e.rows.find(r=>r.L===L);return `<button type="button" class="en-day" data-enact="undel" data-l="${esc(L)}">↩ ${esc(KNOWN[L]?KNOWN[L][0]:capL(x?x.lab:L))}</button>`}).join(" ")}</p>`;
  if(e.msg)h+=`<p class="ev-alert">${esc(e.msg)}</p>`;
  h+=`<div class="en-save"><button class="btn" type="button" data-enact="cancel">Renunță</button><button class="btn primary" type="button" data-enact="save">${edit?"Salvează fișa":"Salvează evenimentul"}</button></div>`;
  return h;
}
function enAuto(){
  enGrab();const p=parseFloat(String(EN.pers).replace(",","."));
  if(!(p>0)){EN.msg="Scrie întâi numărul de persoane.";render();return}
  const R0=enRatios();let n=0;
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
