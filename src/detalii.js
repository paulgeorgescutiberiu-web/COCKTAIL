/* Detaliile evenimentului: aceleași întrebări în portalul clientului și în aplicație (la Contracte → „Detalii eveniment”).
   Sursa e aici. La construire (src/detp.py) se pune în aplicație și se copiază în portal.html, între DETALII-START și DETALII-END.
   Datele: un obiect simplu { cheie: valoare, at: data ISO, by: "client" | "paul" }; ține minte varianta cea mai nouă. */
(function(root){
const NIV=["Mai mult","Normal","Deloc"];
const SECT=[
  {k:"program",t:"Programul",q:[
    {k:"oraStart",l:"La ce oră începe barul?",s:"începe",type:"time"},
    {k:"oraFinal",l:"La ce oră se închide barul?",s:"se închide",type:"time"},
    {k:"oraMontaj",l:"De la ce oră avem acces la locație pentru montaj?",s:"acces montaj",type:"time"}]},
  {k:"invitati",t:"Invitații",q:[
    {k:"adulti",l:"Câți adulți vor fi?",s:"adulți",type:"num"},
    {k:"copii",l:"Câți copii sau invitați care nu beau alcool?",s:"copii / fără alcool",type:"num"}]},
  {k:"locatie",t:"La locație",q:[
    {k:"contact",l:"Persoana de contact de la locație (nume și telefon)",s:"contact",type:"text"},
    {k:"bar",l:"Barul va fi",s:"bar",type:"opt",o:["Înăuntru","Afară","Nu știm încă"]},
    {k:"acces",l:"Unde descărcăm marfa, este curent lângă bar, alte detalii",s:"acces",type:"area"}]},
  {k:"sala",t:"Alcool pe mese",q:[
    {k:"whisky",l:"Aveți whisky pe mese?",s:"whisky pe mese",type:"opt",o:["Da","Nu"]},
    {k:"whiskyCine",l:"Cine aduce whisky-ul?",s:"îl aduce",type:"opt",o:["Clientul","Cocktail Philosophy"],if:["whisky","Da"]},
    {k:"whiskySticle",l:"Câte sticle, aproximativ?",s:"sticle",type:"num",if:["whisky","Da"]},
    {k:"alteMese",l:"Ce alte băuturi sunt pe mese? (vin, prosecco, shot-uri)",s:"altele pe mese",type:"area"}]},
  {k:"baze",t:"Preferințe la alcool",q:[
    {k:"bGin",l:"Gin",s:"gin",type:"lvl"},{k:"bRom",l:"Rom",s:"rom",type:"lvl"},{k:"bVodca",l:"Vodcă",s:"vodcă",type:"lvl"},
    {k:"bWhisky",l:"Whisky",s:"whisky",type:"lvl"},{k:"bTequila",l:"Tequila",s:"tequila",type:"lvl"},
    {k:"marci",l:"Mărci preferate (opțional)",s:"mărci",type:"text"}]},
  {k:"cocktail",t:"Cocktailuri în plus",q:[
    {k:"extra",l:"Cocktailuri dorite care nu sunt în meniu",s:"în afara meniului",type:"area"},
    {k:"pers",l:"Vreți un cocktail personalizat, cu numele vostru?",s:"cocktail personalizat",type:"opt",o:["Da","Nu"]},
    {k:"persNume",l:"Ce nume să poarte?",s:"nume",type:"text",if:["pers","Da"]}]},
  {k:"momente",t:"Momente speciale",none:"Nimic special",q:[
    {k:"momente",l:"Toast cu prosecco, shot-uri la miezul nopții, ora tortului…",type:"area"}]},
  {k:"alergii",t:"Alergii și restricții",none:"Nu sunt",q:[
    {k:"alergii",l:"Alergii, intoleranțe sau ingrediente de evitat",type:"area"}]},
  {k:"obs",t:"Observații",opt:true,q:[
    {k:"obsDet",l:"Orice altceva ne-ar ajuta să pregătim barul",type:"area"}]}
];
const KEYS=SECT.flatMap(s=>s.q.map(q=>q.k).concat(s.none?[s.k+"None"]:[]));
const val=(d,k)=>String((d||{})[k]??"").trim();
const vis=(q,d)=>!q.if||val(d,q.if[0])===q.if[1];
function done(s,d){if(s.none&&val(d,s.k+"None"))return true;return s.q.some(q=>vis(q,d)&&val(d,q.k)!=="")}
function progres(d){const S=SECT.filter(s=>!s.opt),ok=S.filter(s=>done(s,d||{}));return {gata:ok.length,total:S.length,complet:ok.length===S.length,lipsa:S.filter(s=>!done(s,d||{})).map(s=>s.t)}}
/* termenul: cu 4 zile înainte de eveniment */
function termen(dataEv){const m=String(dataEv||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return "";return new Date(Date.UTC(+m[1],m[2]-1,+m[3]-4)).toISOString().slice(0,10)}
/* rezumat pe rânduri, pentru fișa evenimentului și calendar */
function rinduri(d){d=d||{};const L=[];
  SECT.forEach(s=>{if(s.none&&val(d,s.k+"None")){L.push(`${s.t}: ${s.none.toLowerCase()}`);return}
    const p=s.q.filter(q=>vis(q,d)&&val(d,q.k)).map(q=>q.s?`${q.s} ${val(d,q.k)}`:val(d,q.k));
    if(p.length)L.push(`${s.t}: ${p.join(" · ")}`)});
  return L}
/* varianta cea mai nouă dintre două (din aplicație și din portal) */
function nou(a,b){if(!a)return b||null;if(!b)return a;return String(b.at||"")>String(a.at||"")?b:a}
/* toate cheile cunoscute, ca text scurt; cele goale rămân "" ca să șteargă valoarea veche la salvarea cu merge */
function curat(d){const o={};KEYS.forEach(k=>{o[k]=val(d,k).slice(0,600)});return o}

/* formularul: aceeași formă în portal și în aplicație; fiecare pagină își pune stilurile pentru clasele dt-* */
function formHTML(d,esc,o){d=d||{};o=o||{};let h="";
  SECT.forEach((s,i)=>{const ok=done(s,d);
    h+=`<fieldset class="dt-s${ok?" dt-ok":""}" data-dts="${s.k}"><legend>${o.nr?`<span class="dt-n">${i+1}</span>`:""}${esc(s.t)}${s.opt?` <small>(opțional)</small>`:""}</legend>`;
    if(s.none)h+=`<label class="dt-none"><input type="checkbox" data-dt="${s.k}None"${val(d,s.k+"None")?" checked":""}> ${esc(s.none)}</label>`;
    h+=`<div class="dt-g">`;
    s.q.forEach(q=>{const v=val(d,q.k),hid=!vis(q,d)||(s.none&&val(d,s.k+"None"))?" dt-hide":"",attr=`data-dt="${q.k}"`;
      const iff=q.if?` data-if="${q.if[0]}=${esc(q.if[1])}"`:"";
      if(q.type==="opt"||q.type==="lvl"){const ops=q.type==="lvl"?NIV:q.o;
        h+=`<div class="dt-q${q.type==="lvl"?" dt-lvl":""}${hid}"${iff}><span class="dt-l">${esc(q.l)}</span><span class="dt-ops">${ops.map(x=>`<label class="dt-p${v===x?" on":""}"><input type="radio" name="dt-${q.k}" value="${esc(x)}" ${attr}${v===x?" checked":""}>${esc(x)}</label>`).join("")}</span></div>`}
      else if(q.type==="area")h+=`<label class="dt-q dt-w${hid}"${iff}><span class="dt-l">${esc(q.l)}</span><textarea rows="2" ${attr}>${esc(v)}</textarea></label>`;
      else h+=`<label class="dt-q${hid}"${iff}><span class="dt-l">${esc(q.l)}</span><input ${q.type==="time"?'type="time"':q.type==="num"?'type="text" inputmode="numeric"':'type="text"'} ${attr} value="${esc(v)}"></label>`});
    h+=`</div></fieldset>`});
  return h}
/* citește valorile din formular */
function citeste(box){const d={};
  box.querySelectorAll("[data-dt]").forEach(i=>{const k=i.dataset.dt;
    if(i.type==="radio"){if(i.checked)d[k]=i.value}else if(i.type==="checkbox"){if(i.checked)d[k]="1"}else if(String(i.value).trim())d[k]=String(i.value).trim()});
  return curat(d)}
/* după o schimbare: arată/ascunde întrebările condiționate, bifează secțiunile gata */
function potriveste(box){const d=citeste(box);
  box.querySelectorAll(".dt-p").forEach(l=>l.classList.toggle("on",l.querySelector("input").checked));
  SECT.forEach(s=>{const fs=box.querySelector(`[data-dts="${s.k}"]`);if(!fs)return;const nn=s.none&&val(d,s.k+"None");
    fs.querySelectorAll(".dt-q").forEach(q=>{const c=q.dataset.if,[a,b]=c?c.split("="):[];q.classList.toggle("dt-hide",!!nn||(c?val(d,a)!==b:false))});
    fs.classList.toggle("dt-ok",done(s,d))});
  return d}
const API={SECT,KEYS,progres,termen,rinduri,nou,curat,formHTML,citeste,potriveste};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else root.CPDet=API;
})(typeof window!=="undefined"?window:globalThis);
