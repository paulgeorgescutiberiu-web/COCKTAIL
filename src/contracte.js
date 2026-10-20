
/* ---------- Contracte (doar administrator) ---------- */
(function(){
const V=$("#v-contracte"),PV=$("#v-postare"),F=window.CPFS;
if(!V||!F)return;
const MONTHS=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const JUD={AB:"ALBA",AR:"ARAD",AG:"ARGEȘ",BC:"BACĂU",BH:"BIHOR",BN:"BISTRIȚA-NĂSĂUD",BT:"BOTOȘANI",BV:"BRAȘOV",BR:"BRĂILA",B:"BUCUREȘTI",BZ:"BUZĂU",CS:"CARAȘ-SEVERIN",CL:"CĂLĂRAȘI",CJ:"CLUJ",CT:"CONSTANȚA",CV:"COVASNA",DB:"DÂMBOVIȚA",DJ:"DOLJ",GL:"GALAȚI",GR:"GIURGIU",GJ:"GORJ",HR:"HARGHITA",HD:"HUNEDOARA",IL:"IALOMIȚA",IS:"IAȘI",IF:"ILFOV",MM:"MARAMUREȘ",MH:"MEHEDINȚI",MS:"MUREȘ",NT:"NEAMȚ",OT:"OLT",PH:"PRAHOVA",SM:"SATU MARE",SJ:"SĂLAJ",SB:"SIBIU",SV:"SUCEAVA",TR:"TELEORMAN",TM:"TIMIȘ",TL:"TULCEA",VS:"VASLUI",VL:"VÂLCEA",VN:"VRANCEA"};
const FIRMA_DEF={nume:"S.C. BAR PHILOSOPHY S.R.L",scurt:"SC Bar Philosophy SRL",sediu:"SLIMNIC, str. CÂMPULUI, nr. 10, județul SIBIU",orc:"SIBIU",reg:"J32/379 din 23-04-2015",cui:"34409957",iban:"RO62REVO0000356839517265",banca:"REVOLUT BANK",repr:"GEORGESCU PAUL TIBERIU",functie:"ADMINISTRATOR",gClient:"924422421135-vt8hpctl4v8fh9tqbc5mp8g8jch5jeln.apps.googleusercontent.com",gCal:"cocktailphilosophy@gmail.com"};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const bigDate=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${+m[3]} ${MONTHS[+m[2]-1].toUpperCase()} ${m[1]}`:""};
const shortDate=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:""};
const up=s=>String(s||"").trim().toLocaleUpperCase("ro-RO");
function cnpOk(c){c=String(c||"").replace(/\D/g,"");if(c.length!==13||!/[1-9]/.test(c[0]))return false;const w="279146358279";let s=0;for(let i=0;i<12;i++)s+=+c[i]*+w[i];let k=s%11;if(k===10)k=1;return k===+c[12]}
const BLANK=()=>({id:null,nume:"",strada:"",nr:"",bl:"",sc:"",et:"",ap:"",localitate:"",judet:"",serie:"",nrCI:"",cnp:"",tel:"",
  dataContract:today(),obiect:"COCKTAIL CATERING",dataEv:"",locatie:"",invitati:"",pret:"",moneda:"EURO",unitate:"/ PERSOANĂ",tva:"fără TVA",
  ore:"10",semn:"Da",c1:true,c2:true,c3:true,c4:true,infl:"10",transport:"se achită separat",vase:"beneficiar",avans:"",monedaAvans:"RON",dataRest:"",plata:"în numerar",avansPlatit:false,restPlatit:false,oraEv:"",driveId:"",calId:"",ocr:{}});
let sig=null,list=[],sub=null,mode="list",f=null,cur=null,rentMsg="",noteDel=null,firma=null,q="",confirmDel=null,ocrMsg="",ocrBusy=false,errs=[];

function subscribe(){
  if(sub)return;
  sub=F.fs.collection(`${F.base}/contracte`).onSnapshot(s=>{list=s.docs.map(d=>({...d.data(),id:d.id}));if(mode==="list")render()},
    e=>{V.innerHTML=`<p class="notice">Contractele nu se pot încărca. ${e&&e.code==="permission-denied"?"Verifică regulile din Firebase (contracte).":"Verifică internetul."}</p>`});
  F.fs.doc(`${F.base}/privat/semnatura`).get().then(d=>{sig=d.exists&&d.data().img||null;if(mode!=="list")render()}).catch(()=>{});
  F.fs.doc(`${F.base}/privat/firma`).get().then(d=>{firma=d.exists?{...FIRMA_DEF,...d.data()}:{...FIRMA_DEF};if(PV&&!PV.hidden)socRender()}).catch(()=>{firma={...FIRMA_DEF}});
}

/* ---------- Citirea buletinului, pe dispozitiv ---------- */
const OCR={js:"https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js",worker:"https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
  core:"https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",lang:"https://cdn.jsdelivr.net/npm/@tesseract.js-data/ron@1.0.0/4.0.0_best_int"};
let tP=null;
function loadScript(src,glob){return new Promise((res,rej)=>{if(window[glob])return res(window[glob]);const s=document.createElement("script");s.src=src;s.onload=()=>window[glob]?res(window[glob]):rej(new Error("load"));s.onerror=()=>rej(new Error("load"));document.head.appendChild(s)})}
function getWorker(){
  if(!tP)tP=(async()=>{const T=await loadScript(OCR.js,"Tesseract");return T.createWorker("ron",1,{workerPath:OCR.worker,corePath:OCR.core,langPath:OCR.lang,gzip:true})})().catch(e=>{tP=null;throw e});
  return tP;
}
function fileToCanvas(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{
  const W=Math.min(2000,Math.max(1400,im.width)),s=W/im.width,c=document.createElement("canvas");c.width=W;c.height=Math.round(im.height*s);
  const x=c.getContext("2d");x.filter="grayscale(1) contrast(1.4)";x.drawImage(im,0,0,c.width,c.height);res(c)};im.src=fr.result};fr.readAsDataURL(file)})}
function crop(c,y0){const o=document.createElement("canvas");o.width=c.width;o.height=Math.round(c.height*(1-y0));o.getContext("2d").drawImage(c,0,c.height*y0,c.width,o.height,0,0,o.width,o.height);return o}
const fixMRZ=s=>String(s||"").toUpperCase().replace(/[«‹(\[{]/g,"<").replace(/\s+/g,"");
function parseMRZ(txt){
  const L=txt.split(/\n/).map(fixMRZ).filter(l=>l.length>=25&&/<{2,}|^ID|ROU/.test(l));
  const out={};
  const nameL=L.find(l=>/^[IT1L][DO0]ROU/.test(l)&&/<<[A-Z]/.test(l))||L.find(l=>/^[A-Z]+<<[A-Z]/.test(l));
  if(nameL){const nm=nameL.replace(/^[IT1L][DO0]ROU/,"").replace(/<+$/,"").replace(/0/g,"O").replace(/1/g,"I").replace(/5/g,"S").replace(/8/g,"B").replace(/[^A-Z<]/g,"");const [sur,giv]=nm.split("<<");
    if(sur&&giv)out.nume=`${sur.replace(/</g," ")} ${giv.replace(/</g," ")}`.replace(/\s+/g," ").trim()}
  /* buletin vechi (2 rânduri × 36): SERIE+NR, cifră, ROU, data nașterii, cifră, sex, expirare, cifră, prima cifră CNP + ultimele 6 */
  const td2=L.find(l=>/^[A-Z]{2}\d{6}/.test(l)&&/ROU\d{6}/.test(l));
  if(td2){out.serie=td2.slice(0,2);out.nrCI=td2.slice(2,8);
    const m=td2.match(/ROU(\d{6})\d([MF])\d{6}\d(\d)(\d{6})/);if(m){const c=m[3]+m[1]+m[4];if(cnpOk(c))out.cnp=c}}
  /* carte electronică (3 rânduri × 30) */
  const td1=L.find(l=>/^I[DO]ROU[A-Z]{2}\d{6,7}/.test(l));
  if(td1){const m=td1.match(/^I[DO]ROU([A-Z]{2})(\d{6,7})/);out.serie=m[1];out.nrCI=m[2];const cn=td1.match(/[1-9]\d{12}/);if(cn&&cnpOk(cn[0]))out.cnp=cn[0]}
  return out;
}
function parseVisual(txt){
  const out={},T=txt.replace(/\r/g,""),U=T.toUpperCase();
  const cn=(U.match(/[1-9]\d{12}/g)||[]).find(cnpOk);if(cn)out.cnp=cn;
  const sn=U.match(/SERIA\s*([A-Z]{2})\s*N[RTI]?\.?\s*(\d{6,7})/);if(sn){out.serie=sn[1];out.nrCI=sn[2]}
  const lines=T.split("\n").map(s=>s.trim()).filter(Boolean),lab=re=>lines.findIndex(l=>re.test(l));
  const iN=lab(/^(nume|nom)\b|last\s*name/i),iP=lab(/prenume|pr[eé]nom|first\s*name/i);
  const val=i=>i>=0&&lines[i+1]&&/^[A-ZĂÂÎȘȚŞŢ\- ]{2,}$/.test(lines[i+1].toUpperCase())?up(lines[i+1]):"";
  if(val(iN)&&val(iP))out.nume=`${val(iN)} ${val(iP)}`;
  const iD=lab(/domiciliu|adresse|address/i);
  if(iD>=0){const a=lines.slice(iD+1,iD+3).join(" ");
    const loc=a.match(/(?:mun\.?|or\.?|ora[sș]\.?|com\.?|sat)\s*([A-Za-zĂÂÎȘȚăâîșțşţ\- ]+?)\s*\(?\s*\(([A-Z]{1,2})\)/i)||a.match(/([A-Za-zĂÂÎȘȚăâîșțşţ\- ]+?)\s*\(([A-Z]{1,2})\)/);
    if(loc){out.localitate=up(loc[1]);out.judet=JUD[loc[2].toUpperCase()]||up(loc[2])}
    const st=a.match(/((?:str|bd|b-dul|bdul|calea|aleea|sos|șos|piața|p-ța|intr)\.?\s*[^,]*?)\s+nr\.?\s*([0-9A-Za-z]+)/i);
    if(st){out.strada=st[1].replace(/\s+/g," ").trim();out.nr=st[2]}
    const g=(re)=>{const m=a.match(re);return m?m[1]:""};
    out.bl=g(/\bbl\.?\s*([0-9A-Za-z]+)/i);out.sc=g(/\bsc\.?\s*([0-9A-Za-z]+)/i);out.et=g(/\bet\.?\s*([0-9]+)/i);out.ap=g(/\bap\.?\s*([0-9]+)/i);
    Object.keys(out).forEach(k=>{if(out[k]==="")delete out[k]});
  }
  return out;
}
async function readID(file){
  ocrBusy=true;ocrMsg="Se pregătește cititorul (prima dată durează mai mult)…";grab();render();
  try{
    const [c,w]=await Promise.all([fileToCanvas(file),getWorker()]);
    ocrMsg="Se citește buletinul…";render();
    await w.setParameters({tessedit_char_whitelist:"",tessedit_pageseg_mode:"3"});
    const full=(await w.recognize(c)).data.text;
    await w.setParameters({tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",tessedit_pageseg_mode:"6"});
    const mrz=(await w.recognize(crop(c,0.62))).data.text;
    await w.setParameters({tessedit_char_whitelist:"",tessedit_pageseg_mode:"3"});
    /* textul tipărit are prioritate; zona MRZ completează ce lipsește */
    const r={...Object.fromEntries(Object.entries(parseMRZ(mrz+"\n"+full)).filter(([k,v])=>v)),...parseVisual(full)};
    const keys=Object.keys(r);f.ocr={};
    keys.forEach(k=>{f[k]=r[k];f.ocr[k]=true});
    ocrMsg=keys.length?`Am citit ${keys.length} câmpuri (marcate cu galben). Verifică-le cu buletinul în mână și completează ce lipsește.${r.strada?"":" Adresa nu apare pe buletinele noi: scrie-o din certificatul de domiciliu."}`:"Nu am reușit să citesc buletinul. Fă o poză dreaptă, bine luminată, cu tot buletinul în cadru, sau completează manual.";
  }catch(e){console.warn(e);ocrMsg="Cititorul nu s-a putut încărca. Verifică internetul sau completează manual."}
  ocrBusy=false;render();
}

/* ---------- Formular ---------- */
const REQ={nume:"Numele clientului",strada:"Strada",nr:"Numărul",localitate:"Localitatea",judet:"Județul",serie:"Seria buletinului",nrCI:"Numărul buletinului",cnp:"CNP",tel:"Telefonul",
  dataContract:"Data contractului",dataEv:"Data evenimentului",locatie:"Locația",pret:"Prețul",avans:"Avansul",dataRest:"Data plății diferenței"};
function check(x){
  const e=Object.entries(REQ).filter(([k])=>!String(x[k]||"").trim()).map(([k,l])=>({k,m:`Lipsește: ${l}`}));
  if(x.cnp&&!cnpOk(x.cnp))e.push({k:"cnp",m:"CNP-ul nu e valid (cifra de control nu se potrivește). Verifică-l."});
  if(x.serie&&!/^[A-Za-z]{2}$/.test(x.serie.trim()))e.push({k:"serie",m:"Seria buletinului are 2 litere (de ex. SB)."});
  if(x.nrCI&&!/^\d{6,7}$/.test(x.nrCI.trim()))e.push({k:"nrCI",m:"Numărul buletinului are 6 cifre (7 la cartea electronică)."});
  if(x.tel&&String(x.tel).replace(/\D/g,"").length<9)e.push({k:"tel",m:"Telefonul pare incomplet."});
  if(x.dataEv&&x.dataRest&&x.dataRest<x.dataContract)e.push({k:"dataRest",m:"Data plății diferenței e înaintea datei contractului."});
  return e;
}
const inp=(k,label,o={})=>`<label class="${o.cls||""}${f.ocr&&f.ocr[k]?" ct-ocr":""}${errs.some(e=>e.k===k)?" ct-bad":""}">${label}${REQ[k]?" *":""}
  <input data-f="${k}" value="${esc(f[k]??"")}"${o.type?` type="${o.type}"`:""}${o.im?` inputmode="${o.im}"`:""}${o.ph?` placeholder="${esc(o.ph)}"`:""}${o.ac?` autocomplete="${o.ac}"`:" autocomplete=\"off\""}></label>`;
const sel=(k,label,opts)=>`<label>${label}<select data-f="${k}">${opts.map(v=>`<option${f[k]===v?" selected":""}>${esc(v)}</option>`).join("")}</select></label>`;
function viewForm(){
  let h=`<div class="st-top"><div><p class="ev-sub">${f.id?"Editează contractul":"Contract nou"}</p><p class="ev-file">Câmpurile cu * sunt obligatorii. Ce lipsește îți arăt înainte de PDF.</p></div>
    <div class="st-acts"><button class="btn" data-c="back">Renunță</button></div></div>
    <div class="st-ai"><button class="btn primary" data-c="foto"${ocrBusy?" disabled":""}>Citește buletinul din poză</button><input type="file" id="ctFoto" accept="image/*" hidden>
    <p class="ev-file">Poza rămâne pe telefon: textul se citește direct aici, nu se trimite nicăieri și nu se salvează.</p>${ocrMsg?`<p class="${ocrBusy?"ev-sub":"ev-alert ct-msg"}">${esc(ocrMsg)}</p>`:""}</div>
    <h2 class="ev-h2">Beneficiar</h2><div class="st-meta">
    ${inp("nume","Nume și prenume",{ph:"BRANGA VLAD ALEXANDRU"})}${inp("tel","Telefon",{type:"tel",im:"tel"})}
    ${inp("serie","Seria CI",{ph:"SB"})}${inp("nrCI","Nr. CI",{im:"numeric"})}${inp("cnp","CNP",{im:"numeric"})}</div>
    <div class="st-meta">${inp("strada","Strada",{ph:"str. Ana Ipătescu"})}${inp("nr","Nr.")}${inp("bl","Bl.")}${inp("sc","Sc.")}${inp("et","Etaj")}${inp("ap","Ap.")}
    ${inp("localitate","Localitate",{ph:"SIBIU"})}${inp("judet","Județ",{ph:"SIBIU"})}</div>
    <h2 class="ev-h2">Eveniment</h2><div class="st-meta">
    ${inp("dataContract","Data contractului",{type:"date"})}${inp("dataEv","Data evenimentului",{type:"date"})}${inp("locatie","Locația",{ph:"SYMPHONY"})}
    ${inp("oraEv","Ora începerii (pentru calendar)",{type:"time"})}${inp("invitati","Nr. minim de invitați",{im:"numeric"})}${inp("obiect","Obiectul contractului")}</div>
    <h2 class="ev-h2">Preț și plată</h2><div class="st-meta">
    ${inp("pret","Preț",{im:"decimal"})}${sel("moneda","Moneda",["EURO","RON"])}${sel("unitate","Unitate",["/ PERSOANĂ","TOTAL"])}${sel("tva","TVA",["fără TVA","cu TVA inclus"])}</div>
    <div class="st-meta">${inp("avans","Avans (cu TVA inclus)",{im:"decimal"})}${sel("monedaAvans","Moneda avansului",["RON","EURO"])}
    ${inp("dataRest","Data plății diferenței",{type:"date"})}${sel("plata","Plata se face",["în numerar","prin transfer bancar","în numerar sau prin transfer bancar"])}
    ${sig?sel("semn","Semnătura și ștampila mea pe PDF",["Da","Nu"]):""}</div>
    <h2 class="ev-h2">Condiții de preț (3.1.x)</h2><p class="ev-file">Bifează ce intră în contract. Numerotarea se reface singură.</p>
    <div class="ev-list ct-opts">
      <label class="ct-opt"><input type="checkbox" data-cb="c1"${on(f.c1)?" checked":""}><span>Ajustare cu inflația (INS), maximum <input class="ev-rin ct-mini" data-f="infl" inputmode="numeric" value="${esc(f.infl)}">%</span></label>
      <label class="ct-opt"><input type="checkbox" data-cb="c2"${on(f.c2)?" checked":""}><span>Prețul e valabil pentru <input class="ev-rin ct-mini" data-f="ore" inputmode="numeric" value="${esc(f.ore)}"> ore de servire</span></label>
      <label class="ct-opt"><input type="checkbox" data-cb="c3"${on(f.c3)?" checked":""}><span>Transportul Sibiu - locație - Sibiu <select data-f="transport">${["se achită separat","este inclus în preț"].map(v=>`<option${f.transport===v?" selected":""}>${v}</option>`).join("")}</select></span></label>
      <label class="ct-opt"><input type="checkbox" data-cb="c4"${on(f.c4)?" checked":""}><span>„Taxa de vase” a locației e suportată de <select data-f="vase">${["beneficiar","prestator"].map(v=>`<option${f.vase===v?" selected":""}>${v}</option>`).join("")}</select></span></label>
    </div>
    ${errs.length?`<div class="ev-alert" id="ctErr"><b>Mai am nevoie de:</b><ul>${errs.map(e=>`<li>${esc(e.m)}</li>`).join("")}</ul></div>`:""}
    <div class="st-save"><button class="btn" data-c="save">Salvează</button> <button class="btn" data-c="pdf">Salvează și descarcă PDF</button> <button class="btn primary" data-c="gsync">Salvează în Drive + calendar</button></div>${gPick()}`;
  return h;
}
function viewList(){
  const qq=q.trim().toLowerCase(),now=today();
  const L=list.filter(c=>!qq||[c.nume,c.locatie].some(v=>String(v||"").toLowerCase().includes(qq)))
    .sort((a,b)=>{const fa=(a.dataEv||"")>=now,fb=(b.dataEv||"")>=now;if(fa!==fb)return fa?-1:1;return fa?String(a.dataEv).localeCompare(b.dataEv):String(b.dataEv).localeCompare(a.dataEv)});
  let h=`<div class="st-top"><div><p class="ev-sub">${list.length} ${list.length===1?"contract":"contracte"}</p><p class="ev-file">Le vezi doar tu. Barmanii nu au acces la contracte.</p></div>
    <div class="st-acts"><button class="btn primary" data-c="new">Contract nou</button><button class="btn" data-c="firma">Datele firmei</button><button class="btn" data-bk="1">Backup Drive</button></div></div>`;
  h+=gPick();
  if(window.__qr)h+=window.__qr.leadsHTML();
  h+=thanksHTML();
  h+=bkHTML();
  if(!list.length)return h+`<div class="ev-ok">Niciun contract încă. Apasă „Contract nou”.</div>`;
  const R=list.filter(c=>c.rent&&c.rent.calc&&(c.dataEv||"")<now);
  if(R.length){const v=R.reduce((a,c)=>a+c.rent.calc.venit,0),pr=R.reduce((a,c)=>a+c.rent.calc.profit,0);
    h+=`<div class="ct-card"><div class="ct-h"><b>Rentabilitate, evenimente trecute</b><span>${R.length} ${R.length===1?"eveniment":"evenimente"} calculate</span></div><div class="ct-m">Venit ${lei(v)} · profit <b>${lei(pr)}</b> · marjă medie ${pct(v?pr/v:0)}</div></div>`}
  h+=`<input class="search ct-q" type="search" placeholder="Caută client sau locație" value="${esc(q)}">`;
  let lastPast=null;
  L.forEach(c=>{const past=(c.dataEv||"")<now;
    if(past!==lastPast){h+=`<h2 class="ev-h2">${past?"Trecute":"Următoarele"}</h2>`;lastPast=past}
    h+=`<div class="ct-card"><div class="ct-h"><b>${esc(c.nume||"Fără nume")}</b><span>${esc(shortDate(c.dataEv))}${c.locatie?" · "+esc(c.locatie):""}</span></div>
      <div class="ct-m">${esc(c.pret||"")} ${esc(c.moneda||"")} ${esc(c.unitate==="TOTAL"?"total":"/ persoană")} · avans ${esc(c.avans||"—")} ${esc(c.monedaAvans||"")} · diferența la ${esc(shortDate(c.dataRest)||"—")}</div>
      <div class="ct-b"><button class="ct-chip ${c.avansPlatit?"on":""}" data-tog="avansPlatit" data-id="${c.id}">${c.avansPlatit?"✓ Avans încasat":"Avans neîncasat"}</button>
      <button class="ct-chip ${c.restPlatit?"on":""}" data-tog="restPlatit" data-id="${c.id}">${c.restPlatit?"✓ Diferență încasată":"Diferență neîncasată"}</button></div>
      <div class="ct-b ct-sg">${c.signedId?`<a class="ct-chip on" href="https://drive.google.com/file/d/${esc(c.signedId)}/view" target="_blank" rel="noopener">✓ Semnat de client${c.signedAt?" · "+esc(shortDate(c.signedAt)):""} · vezi</a>`:`<span class="ct-chip">Nesemnat de client</span>`}
      <label class="btn${c.signedId?"":" primary"} ct-up">${c.signedId?"Înlocuiește contractul semnat":"Încarcă contractul semnat de client"}<input type="file" accept="application/pdf,image/*" data-sgn="${c.id}" hidden></label></div>
      ${payRow(c)}
      ${portalRow(c)}
      ${c.rent&&c.rent.calc?`<div class="ct-m">Rentabilitate: venit ${lei(c.rent.calc.venit)} · profit <b>${lei(c.rent.calc.profit)}</b> (${pct(c.rent.calc.marja)})</div>`:""}
      <div class="ct-b"><button class="btn" data-fisa="${c.id}">Fișă eveniment</button><button class="btn" data-rent="${c.id}">Rentabilitate</button><button class="btn" data-notes="${c.id}">Notițe${(c.notes||[]).length?` (${c.notes.length})`:""}</button></div>
      <div class="ct-b"><button class="btn" data-pdf="${c.id}">PDF</button><button class="btn${c.calId?"":" primary"}" data-gs="${c.id}">${c.calId?"✓ Actualizează Drive + calendar":"Drive + calendar"}</button><button class="btn" data-ed="${c.id}">Editează</button><button class="btn" data-dup="${c.id}">Copie</button>
      <button class="btn st-del" data-del="${c.id}">${confirmDel===c.id?"Sigur? Șterge":"Șterge"}</button></div></div>`});
  return h;
}
function viewFirma(){
  const x=firma||FIRMA_DEF,row=(k,l)=>`<label>${l}<input data-fi="${k}" value="${esc(x[k]||"")}"></label>`;
  return `<div class="st-top"><div><p class="ev-sub">Datele firmei (Prestator)</p><p class="ev-file">Apar la începutul fiecărui contract.</p></div><div class="st-acts"><button class="btn" data-c="back">Înapoi</button></div></div>
    <div class="st-meta">${row("nume","Denumire")}${row("scurt","Denumire la semnătură")}${row("sediu","Sediul social")}${row("orc","Registrul Comerțului")}${row("reg","Nr. înregistrare")}
    ${row("cui","Cod fiscal")}${row("iban","Cont IBAN")}${row("banca","Banca")}${row("repr","Reprezentant")}${row("functie","Funcția")}</div>
    <h2 class="ev-h2">Semnătura și ștampila</h2>
    <div class="st-ai">${sig?`<img src="${sig}" alt="Semnătura și ștampila" class="ct-sig">`:`<p class="ev-file">Nu ai încărcat încă semnătura.</p>`}
    <p class="ev-file">Fă o poză cu semnătura și ștampila pe o foaie albă. Fundalul alb dispare singur. Imaginea se păstrează doar în zona ta privată, nu pe site.</p>
    <div class="st-acts"><button class="btn primary" data-c="sigup">${sig?"Înlocuiește":"Încarcă"} semnătura</button>${sig?`<button class="btn" data-c="sigdel">Șterge semnătura</button>`:""}</div>
    <input type="file" id="ctSig" accept="image/*" hidden></div>
    <h2 class="ev-h2">Google Drive și Calendar</h2><p class="ev-file">Pentru butonul „Drive + calendar”. Contractele se salvează în Drive, în dosarul Evenimente / Evenimente ANUL, iar evenimentul apare în calendarul de mai jos.</p>
    <div class="st-meta">${row("gClient","Google Client ID (OAuth, aplicație web)")}<label>Calendarul evenimentelor<input data-fi="gCal" value="${esc(x.gCal||"cocktailphilosophy@gmail.com")}"></label></div>
    <h2 class="ev-h2">Instagram și Facebook</h2><p class="ev-file">Pentru butonul „Postează pe Instagram”. E adresa webhook-ului din Make (scenariul „Postare Instagram + Facebook”). Se păstrează doar în zona ta privată.</p>
    <div class="st-meta">${row("socialHook","Adresa webhook Make (https://hook.eu1.make.com/…)")}</div>
    <h2 class="ev-h2">Plata avansului cu cardul (Revolut)</h2><p class="ev-file">Pentru butonul „Link de plată avans”. E adresa webhook-ului din Make (scenariul „Avans Revolut”), care creează linkul în Revolut Business. Cheia Revolut stă doar în Make, nu în aplicație.</p>
    <div class="st-meta">${row("payHook","Adresa webhook Make pentru plăți")}</div>
    <h2 class="ev-h2">Pagina de la bar (QR)</h2><p class="ev-file">Apar pe pagina pe care o deschid invitații când scanează QR-ul de pe bar. Linkul de recenzie îl iei din Google Maps: profilul tău → „Cere recenzii” → Copiază linkul.</p>
    <div class="st-meta">${row("reviewUrl","Link recenzie Google (https://g.page/r/…)")}${row("igUrl","Instagram (implicit instagram.com/cocktailphilosophy)")}${row("fbUrl","Facebook (implicit facebook.com/cocktailphilosophy)")}</div>
    <div class="st-save"><button class="btn primary" data-c="savefirma">Salvează</button></div>`;
}
function prepSig(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{
  const s=Math.min(1,1400/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
  const x=c.getContext("2d");x.drawImage(im,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height),p=d.data;
  let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let i=0;i<p.length;i+=4){const mn=Math.min(p[i],p[i+1],p[i+2]),mx=Math.max(p[i],p[i+1],p[i+2]),sat=mx-mn;
    let a=Math.max(0,Math.min(255,(235-mn)*4+(sat-25)*3));if(mn>215&&sat<40)a=0;p[i+3]=a;
    if(a>60){const k=i/4,px=k%c.width,py=(k/c.width)|0;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py}}
  if(x1<=x0||y1<=y0)return rej(new Error("empty"));
  x.putImageData(d,0,0);x0=Math.max(0,x0-8);y0=Math.max(0,y0-8);x1=Math.min(c.width,x1+8);y1=Math.min(c.height,y1+8);
  const k=Math.min(1,700/(x1-x0)),o=document.createElement("canvas");o.width=Math.round((x1-x0)*k);o.height=Math.round((y1-y0)*k);
  o.getContext("2d").drawImage(c,x0,y0,x1-x0,y1-y0,0,0,o.width,o.height);res(o.toDataURL("image/png"))};im.src=fr.result};fr.readAsDataURL(file)})}
function render(){
  const y=window.scrollY,a=document.activeElement,fq=a&&a.classList&&a.classList.contains("ct-q");
  V.innerHTML=mode==="form"?viewForm():mode==="firma"?viewFirma():mode==="rent"?viewRent():mode==="notes"?viewNotes():viewList();
  if(fq){const i=V.querySelector(".ct-q");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
  window.scrollTo(0,y);
  if(mode==="list"){payAuto();portalAuto()}
}
function grab(){if(mode!=="form"||!f)return;V.querySelectorAll("[data-f]").forEach(el=>{const k=el.dataset.f,v=el.value;if(f.ocr&&f.ocr[k]&&f[k]!==v)delete f.ocr[k];f[k]=v});
  V.querySelectorAll("[data-cb]").forEach(el=>{f[el.dataset.cb]=el.checked})}
const clean=x=>{const o={...x};delete o.id;delete o.ocr;["nume","strada","localitate","judet","serie","locatie","obiect"].forEach(k=>o[k]=k==="strada"?String(o[k]||"").trim():up(o[k]));o.cnp=String(o.cnp||"").replace(/\D/g,"");o.at=new Date().toISOString();return o};
async function save(){
  const data=clean(f);
  try{if(f.id)await F.fs.doc(`${F.base}/contracte/${f.id}`).set(data);else{const r=await F.fs.collection(`${F.base}/contracte`).add(data);f.id=r.id}return true}
  catch(e){toast(e&&e.code==="permission-denied"?"Nu am drept să salvez contractul. Verifică regulile din Firebase (contracte).":"Contractul nu s-a salvat. Verifică internetul.");return false}
}

/* ---------- PDF ---------- */
let pmP=null;
function loadPdfMake(){
  if(!pmP)pmP=(async()=>{await loadScript("https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/pdfmake.min.js","pdfMake");
    if(!window.pdfMake.vfs||!Object.keys(window.pdfMake.vfs).length)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/vfs_fonts.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});
    return window.pdfMake})().catch(e=>{pmP=null;throw e});
  return pmP;
}
/* Clauzele 3.1.x, fiecare opțională; numerotarea se reface după ce rămâne bifat */
const on=v=>v!==false&&v!=="false";
function clauses31(c){const o=[];
  if(on(c.c1))o.push(`Prețul se ajustează, în caz de nevoie, cu rata anuală a inflației conform INS, dar nu mai mult de ${c.infl||10}%!`);
  if(on(c.c2))o.push(`Prețul este valabil pentru ${c.ore||10} ore de servire din momentul începerii evenimentului!`);
  if(on(c.c3))o.push(c.transport==="este inclus în preț"?"Transportul de la Sibiu - locație - Sibiu este inclus în prețul prestației.":"Prețul transportului de la Sibiu - locație - Sibiu se achită separat.");
  if(on(c.c4))o.push(`În cazul unei eventuale „taxe de vase” solicitate de locația gazdă, aceasta este suportată de către ${c.vase||"beneficiar"}!`);
  return o}
function contractDoc(c,F0){
  const B=t=>({text:String(t||"").trim()||" ",bold:true}),P=(...parts)=>({text:parts,margin:[0,2,0,2]}),H=t=>({text:t,bold:true,margin:[0,12,0,4]});
  const adr=[c.strada,c.nr?`nr. ${c.nr}`:"",c.bl?`bl. ${c.bl}`:"",c.sc?`sc. ${c.sc}`:"",c.et?`etaj ${c.et}`:"",c.ap?`ap. ${c.ap}`:""].filter(Boolean).join(", ");
  const loc=[c.localitate,c.judet].filter(Boolean).join(" / ");
  const L=(t,i)=>({text:t,margin:[i||12,1,0,1]});
  return {pageSize:"A4",pageMargins:[54,50,54,54],defaultStyle:{font:"Roboto",fontSize:10.5,lineHeight:1.18},
   footer:(p,n)=>({text:`${p} / ${n}`,alignment:"center",fontSize:8,color:"#777",margin:[0,18,0,0]}),
   content:[
    {text:"CONTRACT DE PRESTĂRI SERVICII",bold:true,fontSize:15,alignment:"center"},
    {text:["Încheiat astăzi: ",B(bigDate(c.dataContract))],alignment:"center",margin:[0,4,0,10]},
    H("1. PĂRȚILE CONTRACTANTE"),
    P("1.1. ",B(F0.nume),`, cu sediul social în ${F0.sediu}, înregistrată la Oficiul Registrului Comerțului ${F0.orc}, sub nr. ${F0.reg}, cod fiscal ${F0.cui}, având contul nr. ${F0.iban} deschis la ${F0.banca}, reprezentată de `,B(F0.repr),`, cu funcția de ${F0.functie}, în calitate de `,B("Prestator"),", pe de o parte, și"),
    P("1.2. D-l/D-na ",B(c.nume)," domiciliat(ă) în: ",B(adr),", Localitate/Județ: ",B(loc),", posesor(oare) al(a) Buletinului (Cărții) de Identitate seria ",B(c.serie)," nr. ",B(c.nrCI),", Cod Numeric Personal ",B(c.cnp),", nr. tel: ",B(c.tel),", în calitate de ",B("Beneficiar"),", pe de altă parte,"),
    {text:"au convenit să încheie prezentul contract de prestări de servicii, cu respectarea următoarelor clauze:",margin:[24,8,0,0]},
    H("2. OBIECTUL ȘI DURATA CONTRACTULUI"),
    P("2.1. Obiectul contractului îl reprezintă ",B(c.obiect)),
    P("2.2. Evenimentul va avea loc în data de: ",B(bigDate(c.dataEv))),
    P("2.3. În următoarea locație: ",B(c.locatie)),
    P("2.4. Număr de invitați minim: ",B(c.invitati)),
    H("3. PREȚUL STABILIT ȘI MODALITĂȚI DE PLATĂ"),
    P("3.1. Prețul prestației este de ",B(`${c.pret} ${c.moneda} ${c.unitate==="TOTAL"?"(TOTAL)":"/ PERSOANĂ"} (${c.tva})`)),
    ...clauses31(c).map((t,i)=>L(`3.1.${i+1}. ${t}`)),
    P(`3.2. Se va achita prestatorului de către beneficiar ${c.plata} astfel: un avans (cu TVA inclus) de `,B(`${c.avans} ${c.monedaAvans}`)," la data semnării prezentului contract și diferența în data de: ",B(bigDate(c.dataRest))),
    H("4. OBLIGAȚIILE PĂRȚILOR"),
    P("4.1. Prestatorul de servicii se obligă:"),
    L("a. Să asigure livrarea băuturilor convenite în meniu pe toată durata evenimentului!"),
    L("b. Să transporte aparatura în condiții bune la locația convenită, în data și la ora stabilite în prezentul contract;"),
    L("c. Să se prezinte la ora și data stabilite."),
    P("4.2. Beneficiarul serviciilor se obligă să achite suma către prestator la datele stabilite prin prezentul contract."),
    H("5. LITIGII"),
    P("5.1. Părțile au convenit ca toate neînțelegerile privind validitatea prezentului contract sau rezultate din interpretarea, executarea sau încetarea acestuia să fie rezolvate pe cale amiabilă."),
    P("5.2. În cazul în care nu este posibilă rezolvarea litigiilor pe cale amiabilă, părțile se vor adresa instanțelor judecătorești competente."),
    H("6. RĂSPUNDERE CONTRACTUALĂ"),
    P("6.1. BENEFICIARUL se obligă să răspundă material pentru pagubele produse din vina sa sau a invitaților și să îl despăgubească pe PRESTATOR pentru orice reclamație primită în legătură cu aceasta."),
    P("6.2. PRESTATORUL garantează efectuarea serviciilor conform comenzii BENEFICIARULUI din prezentul contract. În cazul în care serviciile care fac obiectul contractului nu au o calitate corespunzătoare, Prestatorul se obligă să pună imediat la dispoziția Beneficiarului alte servicii de aceeași calitate și la aceleași standarde convenite la semnarea contractului."),
    H("7. FORȚA MAJORĂ ȘI CAZUL FORTUIT"),
    P("7.1. Forța majoră și cazul fortuit exonerează de răspundere părțile, în cazul neexecutării parțiale sau totale a obligațiilor asumate prin prezentul contract."),
    H("8. ÎNCETAREA CONTRACTULUI"),
    P("8.1. Părțile convin de comun acord încetarea contractului;"),
    P("8.2. Expirarea duratei contractului;"),
    P("8.3. Una dintre părți denunță unilateral prezentul contract, cu transformarea avansului achitat în voucher transmisibil;"),
    P("8.4. Neîndeplinirea sau îndeplinirea defectuoasă a obligațiilor contractuale de către una dintre părți;"),
    P("8.5. În cazul de dizolvare, lichidare, faliment, retragerea autorizației de funcționare a unuia dintre contractanți, caz în care Contractul de Prestări Servicii va fi considerat nul, părțile însă fiind ținute a îndestula datoriile uneia către alta, datoriile rezultate până la momentul intervenției cauzei de dispariție."),
    H("9. CONFIDENȚIALITATE"),
    P("9.1. Informațiile care sunt comunicate de oricare din părți celeilalte, în cursul îndeplinirii obligațiilor contractuale, vor fi considerate ca având caracter confidențial atât în timpul, cât și timp de 5 ani după terminarea contractului și vor fi utilizate doar pentru ducerea la îndeplinire a obligațiilor contractuale."),
    P("9.2. Părțile nu vor fi ținute de obligația de confidențialitate dacă:"),
    L("a) informațiile erau cunoscute înainte de a fi fost obținute de la cealaltă parte;",24),
    L("b) informațiile confidențiale au fost dezvăluite la cererea unui organ de stat, în măsura în care obligația de dezvăluire a informației rezultă din lege;",24),
    L("c) informația a fost dezvăluită numai după ce s-a primit acordul scris pentru aceasta.",24),
    {unbreakable:true,stack:[
    H("10. CLAUZE FINALE"),
    P("10.1. Prezentul Contract de Prestări Servicii va fi guvernat și interpretat în conformitate cu prevederile legislației române;"),
    P("10.2. Toate aspectele și reperele orare menționate în prezentul Contract de Prestări Servicii au valoare contractuală și vor fi respectate de părți întocmai;"),
    P("10.3. Prezentul Contract de Prestări Servicii s-a încheiat în 2 (două) exemplare, câte unul pentru fiecare parte, astăzi, ",B(bigDate(c.dataContract)),", fiind semnat de către părți, producându-și efectele de la data semnării lui."),
    {columns:[{stack:[{text:"PRESTATOR:",bold:true},{text:F0.scurt},...(sig&&c.semn!=="Nu"?[{image:sig,width:165,margin:[0,4,0,0]}]:[{text:"\n\n\n______________________"}])]},
              {stack:[{text:"BENEFICIAR:",bold:true},{text:c.nume},...(c.clientSig&&c.clientSig.img?[{image:c.clientSig.img,width:150,margin:[0,4,0,0]},{text:`Semnat electronic de ${c.clientSig.nume||c.nume}, ${c.clientSig.at||""}, prin portalul Cocktail Philosophy`,fontSize:7,color:"#555"}]:[{text:"\n\n\n______________________"}])],alignment:"right"}],margin:[0,30,0,0]}
    ]}
  ]};
}
async function downloadPDF(c,btn){
  const lbl=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Se pregătește…"}
  try{const pm=await loadPdfMake(),F0=firma||FIRMA_DEF;
    const name=`contract_${up(c.nume).replace(/[^\p{L}\p{N}]+/gu,"_")}_${c.dataEv||c.dataContract}.pdf`;
    pm.createPdf(contractDoc(c,F0)).download(name);toast("Contractul PDF e gata.")}
  catch(e){console.warn(e);toast("Nu am putut genera PDF-ul. Verifică internetul și încearcă din nou.")}
  if(btn&&document.contains(btn)){btn.disabled=false;btn.textContent=lbl}
}

/* ---------- Portalul clientului ---------- */
const PORTAL_URL="https://paulgeorgescutiberiu-web.github.io/COCKTAIL/portal.html";
const POR={busy:{},seen:{}};
const porTok=()=>{const a=new Uint8Array(24);crypto.getRandomValues(a);const A="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";return [...a].map(x=>A[x%A.length]).join("")};
const porLink=c=>`${PORTAL_URL}#t=${c.portalTok}`;
function porMenuOptions(){let R0=[];try{R0=JSON.parse(document.getElementById("recipes-data").textContent)}catch(e){}
  return R0.map(r=>({id:r.id,name:r.name,zero:!!r.zero,ing:(r.ing||[]).map(i=>i.n).filter(Boolean).slice(0,5)}))}
const b64=blob=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(blob)});
function portalRow(c){
  if(POR.busy[c.id])return `<div class="ct-b"><button class="btn" disabled>Se pregătește portalul…</button></div>`;
  if(!c.portalTok)return `<div class="ct-b"><button class="btn" data-porn="${c.id}">🔗 Portal pentru client</button></div>`;
  const r=c.portalResp||{},chips=[`<span class="ct-chip ${r.seenAt?"on":""}">${r.seenAt?"✓ A deschis portalul":"Portal nedeschis"}</span>`,
    `<span class="ct-chip ${r.menu&&r.menu.length?"on":""}">${r.menu&&r.menu.length?(r.menu.length>=porMenuOptions().length?"✓ Meniu: toate cocktailurile":`✓ Meniu: ${r.menu.length} cocktailuri`):"Meniu neales"}</span>`,
    `<span class="ct-chip ${r.signedAt?"on":""}">${r.signedAt?"✓ Semnat în portal":"Nesemnat în portal"}</span>`].join("");
  return `<div class="ct-b">${chips}</div>
    ${r.menu&&r.menu.length||r.obs?`<div class="ct-m">${r.menu&&r.menu.length?`Meniu ales: ${esc(r.menu.join(", "))}`:""}${r.obs?`<br>Preferințe: ${esc(r.obs)}`:""}</div>`:""}
    <div class="ct-b"><button class="btn primary" data-porwa="${c.id}">Trimite portalul pe WhatsApp</button><button class="btn" data-porcp="${c.id}">Copiază linkul</button><button class="btn" data-porup="${c.id}">Actualizează portalul</button>${r.signedAt&&!c.portalSaved?`<button class="btn primary" data-porsg="${c.id}">Salvează contractul semnat în Drive</button>`:""}</div>`;
}
async function portalPublish(c){
  POR.busy[c.id]=true;render();
  try{
    if(!c.dataEv)throw {msg:"Completează întâi data evenimentului în contract."};
    const tok=c.portalTok||porTok(),F0=firma||FIRMA_DEF;
    let pdf=null;try{pdf=await b64(await pdfBlob(c));if(pdf.length>850000)pdf=null}catch(e){pdf=null}
    const isTotal=c.unitate==="TOTAL";
    const doc={v:1,updatedAt:new Date().toISOString(),
      ev:{dataEv:c.dataEv||"",oraEv:c.oraEv||"",locatie:tcase(c.locatie||""),invitati:String(c.invitati||""),pachet:tcase(c.obiect||""),pret:String(c.pret||""),moneda:c.moneda==="EURO"?"€":"RON",unitate:isTotal?"total":"/ persoană",tva:c.tva||"",ore:c.ore||"",avans:String(c.avans||""),monedaAvans:c.monedaAvans==="EURO"?"EUR":"RON",dataRest:c.dataRest||"",plata:c.plata||""},
      client:{nume:tcase(c.nume||""),prenume:tcase(String(c.nume||"").trim().split(/\s+/).slice(-1)[0]||"")},
      firma:{nume:F0.nume,iban:F0.iban,banca:F0.banca,tel:"0743 785 655"},
      oferte:[{t:"Meniul 2026",u:"https://cocktailphilosophy.ro/wp-content/uploads/2026/03/MENIU-2026-GOLD.pdf"},isTotal?{t:"Oferta pachet barmani",u:"https://cocktailphilosophy.ro/wp-content/uploads/2023/04/PACHET-BARMANI-2023-compressed.pdf"}:{t:"Oferta All Inclusive",u:"https://cocktailphilosophy.ro/wp-content/uploads/2026/03/OFERTA-ALL-INCLUSIVE.pdf"}],
      menuOpts:porMenuOptions(),
      pay:c.payOrder&&c.payOrder.url?{url:c.payOrder.url}:null,
      pdf};
    await F.fs.doc(`portal/${tok}`).set(doc,{merge:true});
    if(!c.portalTok){await F.fs.doc(`${F.base}/contracte/${c.id}`).set({portalTok:tok},{merge:true});c.portalTok=tok}
    toast(pdf?"Portalul e gata. Trimite linkul clientului.":"Portalul e gata, dar fără PDF-ul contractului (prea mare).");
  }catch(e){console.warn(e);toast(e&&e.msg||(e&&e.code==="permission-denied"?"Nu am drept să creez portalul. Adaugă regulile noi în Firebase (portal).":"Nu am putut crea portalul. Verifică internetul."))}
  finally{delete POR.busy[c.id];render()}
}
async function portalRefresh(c,quiet){
  if(!c.portalTok)return;
  try{const d=await F.fs.doc(`portal/${c.portalTok}`).get();if(!d.exists)return;const r=(d.data()||{}).resp||{};
    const nr={seenAt:r.seenAt||"",menu:r.menu||[],obs:r.obs||"",signedAt:r.signedAt||"",nume:r.nume||""};
    if(JSON.stringify(nr)!==JSON.stringify(c.portalResp||{})){
      const was=c.portalResp||{};await F.fs.doc(`${F.base}/contracte/${c.id}`).set({portalResp:nr},{merge:true});
      if(nr.signedAt&&!was.signedAt)toast(`${tcase(surname(c.nume))} a semnat contractul în portal ✓`);
      else if(nr.menu.length&&!(was.menu||[]).length)toast(`${tcase(surname(c.nume))} a ales meniul în portal.`);
    }else if(!quiet)toast("Nimic nou în portal.");
  }catch(e){if(!quiet)toast("Nu am putut citi portalul.")}
}
function portalAuto(){let n=0;list.forEach(c=>{if(n<8&&c.portalTok&&!c.portalSaved&&!POR.seen[c.id]){POR.seen[c.id]=1;n++;portalRefresh(c,true)}})}
async function portalSaveSigned(c,btn){
  if(btn){btn.disabled=true;btn.textContent="Se pregătește contractul semnat…"}
  try{const d=await F.fs.doc(`portal/${c.portalTok}`).get(),r=(d.data()||{}).resp||{};
    if(!r.sig||!r.signedAt)throw {msg:"Clientul nu a semnat încă în portal."};
    const at=new Date(r.signedAt),ats=`${String(at.getDate()).padStart(2,"0")}.${String(at.getMonth()+1).padStart(2,"0")}.${at.getFullYear()} ${String(at.getHours()).padStart(2,"0")}:${String(at.getMinutes()).padStart(2,"0")}`;
    const blob=await pdfBlob({...c,clientSig:{img:r.sig,nume:r.nume||c.nume,at:ats}});
    const file=new File([blob],"contract_semnat.pdf",{type:"application/pdf"});
    await uploadSigned(c,{files:[file],closest:()=>null,value:""});
    await F.fs.doc(`${F.base}/contracte/${c.id}`).set({portalSaved:true},{merge:true});
  }catch(e){console.warn(e);toast(e&&e.msg||"Nu am putut salva contractul semnat.");if(btn&&document.contains(btn)){btn.disabled=false;btn.textContent="Salvează contractul semnat în Drive"}}
}
function porMsg(c){return `Bună ziua! Aici găsiți tot pentru evenimentul din ${shortDate(c.dataEv)}: oferta, alegerea cocktailurilor, contractul de semnat online și plata avansului: ${porLink(c)}\nMulțumim! Cocktail Philosophy`}

/* ---------- Avans cu cardul (Revolut prin Make) ---------- */
const PAY={busy:{},checked:{}};
const payAmount=c=>{const v=String(c.avans||"").trim().replace(/\s/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",",".");const n=Number(v);return isFinite(n)&&n>0?Math.round(n*100):0};
const payCur=c=>c.monedaAvans==="EURO"?"EUR":"RON";
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};
function payRow(c){
  if(c.avansPlatit){return c.avansCard?`<div class="ct-m">💳 Avans plătit cu cardul${c.avansPlatitLa?" · "+esc(shortDate(c.avansPlatitLa)):""}</div>`:""}
  if(!payAmount(c))return "";
  if(PAY.busy[c.id])return `<div class="ct-b"><button class="btn" disabled>Se pregătește linkul…</button></div>`;
  const o=c.payOrder;
  if(o&&o.url)return `<div class="ct-b"><button class="btn primary" data-paywa="${c.id}">Trimite linkul de plată pe WhatsApp</button><button class="btn" data-paycp="${c.id}">Copiază linkul</button><button class="btn" data-paychk="${c.id}">Verifică plata</button></div>
    <div class="ct-m">Link de plată creat ${esc(shortDate(String(o.at||"").slice(0,10)))} · ${esc(c.avans)} ${esc(c.monedaAvans)}. Când clientul plătește, avansul se bifează singur.</div>`;
  return `<div class="ct-b"><button class="btn" data-paynew="${c.id}">💳 Link de plată avans (${esc(c.avans)} ${esc(c.monedaAvans)})</button></div>`;
}
async function payCall(params){
  const hook=(firma&&firma.payHook||"").trim();
  if(!/^https:\/\/hook\.[a-z0-9]+\.make\.com\//.test(hook))throw {msg:"Lipsește adresa webhook-ului pentru plăți. Pune-o la Datele firmei → Plata avansului cu cardul."};
  const r=await fetch(hook,{method:"POST",body:new URLSearchParams(params)});
  const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}
  if(!r.ok||!j)throw {msg:"Revolut nu a răspuns cum trebuie. Verifică scenariul „Avans Revolut” din Make."};
  return j;
}
async function payNew(c){
  PAY.busy[c.id]=true;render();
  try{const evd=shortDate(c.dataEv),j=await payCall({action:"create",ref:c.id,amount:String(payAmount(c)),currency:payCur(c),
      description:`Avans Cocktail Philosophy · eveniment ${evd}${c.locatie?" · "+tcase(c.locatie):""}`});
    const url=j.checkout_url||j.url,id=j.id||j.order_id;if(!url||!id)throw {msg:"Revolut nu a dat linkul de plată."};
    const payOrder={id,url,at:new Date().toISOString()};
    await F.fs.doc(`${F.base}/contracte/${c.id}`).set({payOrder},{merge:true});c.payOrder=payOrder;toast("Linkul de plată e gata. Trimite-l clientului.")}
  catch(e){console.warn(e);toast(e&&e.msg||"Nu am putut crea linkul de plată.")}
  finally{delete PAY.busy[c.id];render()}
}
function payMsg(c){return `Bună ziua! Pentru rezervarea datei de ${shortDate(c.dataEv)}, avansul de ${c.avans} ${c.monedaAvans==="EURO"?"EUR":"RON"} se poate plăti cu cardul aici: ${c.payOrder.url}\nMulțumim! Cocktail Philosophy`}
async function payCheck(c,quiet){
  if(!c.payOrder||!c.payOrder.id||c.avansPlatit)return;
  try{const j=await payCall({action:"status",order:c.payOrder.id}),st=String(j.state||"").toLowerCase();
    if(st==="completed"){await F.fs.doc(`${F.base}/contracte/${c.id}`).set({avansPlatit:true,avansCard:true,avansPlatitLa:today()},{merge:true});toast(`Avansul de la ${tcase(surname(c.nume))} a fost plătit cu cardul ✓`)}
    else if(!quiet)toast(st==="pending"?"Clientul nu a plătit încă.":st==="authorised"||st==="processing"?"Plata e în curs de procesare.":"Plata nu e finalizată ("+(st||"necunoscut")+").")}
  catch(e){if(!quiet)toast(e&&e.msg||"Nu am putut verifica plata.")}
}
function payAuto(){if(!(firma&&firma.payHook))return;let n=0;list.forEach(c=>{if(n<6&&c.payOrder&&c.payOrder.id&&!c.avansPlatit&&!PAY.checked[c.id]){PAY.checked[c.id]=1;n++;payCheck(c,true)}})}

/* ---------- Postare Instagram + Facebook ---------- */
const SOC={img:null,name:"",ratio:"45",pos:0.5,caption:"",busy:false,arm:false,msg:"",ai:false,aiMsg:"",ctx:""};
const SOC_TPL=()=>{const t=today(),ev=list.filter(c=>c.dataEv&&c.dataEv<=t).sort((a,b)=>String(b.dataEv).localeCompare(a.dataEv))[0];
  const loc=ev&&ev.locatie?tcase(ev.locatie):"";
  return `${loc?`Seară frumoasă la ${loc}! `:""}Barul gata, garniturile la locul lor, zâmbetul la fel. 🍊
Cocktailuri gândite de noi, cu siropuri făcute în casă și garnituri alese una câte una.
Tu te distrezi, noi ne ocupăm de bar. 🍸

Ai un eveniment în plan? Scrie-ne pe WhatsApp: 0743 785 655

#cocktailphilosophy #barmobil #cocktailbar #evenimentesibiu #nuntasibiu #barman #cocktails #mixology #sibiu`};
const SOC_R={"45":4/5,"11":1,"169":1.91};
function socDims(){const im=SOC.img;if(!im)return null;const r=SOC_R[SOC.ratio],W=im.naturalWidth,H=im.naturalHeight;
  let cw=W,ch=Math.round(W/r);if(ch>H){ch=H;cw=Math.round(H*r)}
  const sx=Math.round((W-cw)*(cw<W?SOC.pos:0.5)),sy=Math.round((H-ch)*(ch<H?SOC.pos:0.5));return {sx,sy,cw,ch}}
function viewSocial(){
  const hook=(firma&&firma.socialHook||"").trim();
  let h=`<div class="st-top"><div><p class="ev-sub">Postează pe Instagram + Facebook</p><p class="ev-file">Alegi poza, verifici textul, apeși Postează. Apare pe Instagram și pe pagina de Facebook în 1–2 minute.</p></div></div>`;
  if(!hook)h+=`<div class="ev-alert">Lipsește adresa webhook-ului din Make. Pune-o la <b>Datele firmei → Instagram și Facebook</b>.</div>`;
  h+=`<div class="st-ai"><label class="btn primary ct-up">${SOC.img?"Altă poză":"Alege poza (galerie sau cameră)"}<input type="file" accept="image/*" id="socFile" hidden></label>`;
  if(SOC.img){const d=socDims(),canMove=d&&(d.cw<SOC.img.naturalWidth||d.ch<SOC.img.naturalHeight);
    h+=`<div class="ct-b soc-r">${[["45","Portret 4:5"],["11","Pătrat"],["169","Lat"]].map(([k,l])=>`<button class="ct-chip ${SOC.ratio===k?"on":""}" data-sr="${k}">${l}</button>`).join("")}</div>
      <canvas id="socCv" class="soc-cv"></canvas>
      ${canMove?`<label class="ct-full">Încadrare (mută poza)<input type="range" id="socPos" min="0" max="100" value="${Math.round(SOC.pos*100)}"></label>`:""}`}
  h+=`</div>${SOC.img?`<label class="ct-full">Ceva anume despre poză? (opțional: tipul evenimentului, locația, cocktailul)<input id="socCtx" value="${esc(SOC.ctx)}" placeholder="ex: nunta Ioanei și a lui Vlad la Montana, cocktailul Harmony"></label>`:""}
    <label class="ct-full">Textul postării${SOC.ai?" · scriu textul după poză…":""}<textarea id="socTxt" rows="9"${SOC.ai?" disabled":""}>${esc(SOC.caption||SOC_TPL())}</textarea></label>
    ${SOC.aiMsg?`<p class="ev-alert ct-msg">${esc(SOC.aiMsg)}</p>`:""}
    <div class="ct-b">${SOC.img?`<button class="btn primary" data-c="socai"${SOC.ai?" disabled":""}>✨ ${SOC.caption&&SOC.caption!==SOC_TPL()?"Alt text după poză":"Scrie textul după poză"}</button>`:""}<button class="btn" data-c="soctpl">Pune textul gata scris</button></div>
    ${SOC.msg?`<p class="ev-alert ct-msg">${esc(SOC.msg)}</p>`:""}
    <div class="st-save"><button class="btn primary" data-c="socpost"${!SOC.img||!hook||SOC.busy||SOC.ai?" disabled":""}>${SOC.busy?"Se trimite…":SOC.arm?"Sigur? Apasă din nou ca să postezi":"Postează pe Instagram + Facebook"}</button></div>`;
  return h;
}
function drawSoc(){const cv=$("#socCv"),d=socDims();if(!cv||!d)return;const w=1080,hh=Math.round(w*d.ch/d.cw);cv.width=w;cv.height=hh;
  cv.getContext("2d").drawImage(SOC.img,d.sx,d.sy,d.cw,d.ch,0,0,w,hh)}
function socLoad(fl){const u=URL.createObjectURL(fl),im=new Image();im.onload=()=>{SOC.img=im;SOC.name=fl.name;SOC.pos=0.5;SOC.arm=false;SOC.msg="";
    SOC.ratio=im.naturalWidth/im.naturalHeight>1.3?"169":im.naturalWidth/im.naturalHeight>0.95?"11":"45";socRender();socAI(false)};
  im.onerror=()=>toast("Nu am putut deschide poza. Încearcă alt fișier (JPG sau PNG).");im.src=u}
async function socPost(btn){
  const hook=(firma&&firma.socialHook||"").trim(),txt=($("#socTxt").value||"").trim();SOC.caption=txt;
  if(!/^https:\/\/hook\.[a-z0-9]+\.make\.com\//.test(hook)){toast("Adresa webhook-ului din Make nu pare corectă.");return}
  if(!txt){toast("Scrie un text pentru postare.");return}
  if(!SOC.arm){SOC.arm=true;socRender();return}
  SOC.busy=true;SOC.arm=false;socRender();
  try{const cv=$("#socCv");let q=0.9,blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",q));
    while(blob.size>7.5e6&&q>0.5){q-=0.1;blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",q))}
    const fd=new FormData(),id=today()+"_"+Date.now().toString(36);fd.append("id",id);fd.append("caption",txt);fd.append("photo",blob,id+".jpg");
    const r=await fetch(hook,{method:"POST",body:fd});if(!r.ok)throw new Error(r.status);
    SOC.img=null;SOC.caption="";SOC.msg="";SOC.busy=false;socRender();toast("Trimis! Apare pe Instagram și Facebook în 1–2 minute.");
  }catch(e){console.warn(e);SOC.busy=false;SOC.msg="Nu am putut trimite poza. Verifică internetul și că scenariul din Make e pornit, apoi încearcă din nou.";socRender()}
}

function socEvent(){const t=today();return list.filter(c=>c.dataEv&&c.dataEv<=t).sort((a,b)=>String(b.dataEv).localeCompare(a.dataEv))[0]||null}
function socPrompt(){
  const ev=socEvent(),loc=ev&&ev.locatie?tcase(ev.locatie):"",d=ev?shortDate(ev.dataEv):"",inv=ev&&ev.invitati?String(ev.invitati):"";
  const menu=ev&&ev.portalResp&&ev.portalResp.menu&&ev.portalResp.menu.length?ev.portalResp.menu.join(", "):"";
  return `Ești social media managerul Cocktail Philosophy, un bar mobil de cocktailuri pentru evenimente din Sibiu (nunți, petreceri private, evenimente corporate).
Primești o poză făcută la un eveniment. Scrie textul pentru o postare pe Instagram și Facebook, în limba română, potrivit EXACT cu ce se vede în poză (cocktailuri, barul, garniturile, oamenii, atmosfera, locul, lumina).

Stilul: jucăuș dar profesionist, cald, uman, deloc plictisitor. 2–4 propoziții scurte, cu 1–3 emoji potrivite. Variază începutul, nu începe mereu la fel.
Reguli:
- Nu inventa nume de oameni și nu spune cine sunt persoanele din poză. Nu da prețuri.
- Nu pomeni flori comestibile. Siropurile sunt „făcute în casă” (nu „de mână”).
- Poți folosi, dacă se potrivește, sloganul: „Tu te distrezi, noi ne ocupăm de bar.”
- Încheie cu un rând separat: „Ai un eveniment în plan? Scrie-ne pe WhatsApp: 0743 785 655”
- Apoi un rând cu 8–12 hashtag-uri relevante pentru poză, mereu cu #cocktailphilosophy și câteva locale (#sibiu, #evenimentesibiu, #nuntasibiu dacă pare nuntă).
${loc?`Context: evenimentul cel mai recent a fost la ${loc}${d?" pe "+d:""}${inv?", cu "+inv+" invitați":""}. Pomenește locația doar dacă poza pare de acolo.`:""}
${menu?`Cocktailurile din meniul evenimentului: ${menu}. Numește unul doar dacă se potrivește cu ce se vede.`:""}
${SOC.ctx?`Detalii de la Paul despre poză: ${SOC.ctx}`:""}
Răspunde DOAR cu JSON: {"text":"textul complet al postării, cu rânduri noi ca \\n"}`;
}
async function socAI(again){
  const X=window.__cpAI;if(!SOC.img)return;
  if(!X||!X.ready()){SOC.aiMsg="Textul automat nu e disponibil acum. Folosește textul gata scris.";socRender();return}
  const cur=(($("#socTxt")||{}).value||"").trim();
  if(!again&&cur&&cur!==SOC_TPL().trim()&&SOC.caption&&SOC.caption.trim()!==SOC_TPL().trim())return;
  SOC.ai=true;SOC.aiMsg="";SOC.arm=false;socRender();
  try{
    const src=SOC.img,s=Math.min(1,1280/Math.max(src.naturalWidth,src.naturalHeight)),cv=document.createElement("canvas");cv.width=Math.round(src.naturalWidth*s);cv.height=Math.round(src.naturalHeight*s);cv.getContext("2d").drawImage(src,0,0,cv.width,cv.height);
    const part={inlineData:{data:cv.toDataURL("image/jpeg",0.85).split(",")[1],mimeType:"image/jpeg"}};
    const {aiM,ai}=await X.loadAI();let res,last;
    for(const m of X.models){try{const model=aiM.getGenerativeModel(ai,{model:m,generationConfig:{responseMimeType:"application/json",temperature:again?1:0.8}});res=await model.generateContent([socPrompt(),part]);break}
      catch(e){last=e;if(!/not.?found|404|unsupported|is not available|invalid.*model/i.test(String(e&&e.message)))throw e}}
    if(!res)throw last;
    let t=res.response.text();try{const j=JSON.parse(t.replace(/^```(json)?|```$/g,"").trim());t=j.text||t}catch(e){}
    t=String(t).replace(/\\n/g,"\n").trim();if(!t)throw new Error("gol");
    SOC.caption=t;SOC.aiMsg="";
  }catch(e){console.warn(e);SOC.aiMsg="Nu am putut scrie textul după poză acum. Poți folosi textul gata scris sau încerca din nou."}
  finally{SOC.ai=false;socRender()}
}

function socRender(){if(!PV)return;if(!F.isAdmin){PV.innerHTML=`<div class="ev-ok">Postările le face doar administratorul.</div>`;return}
  const y=window.scrollY;PV.innerHTML=viewSocial();drawSoc();window.scrollTo(0,y)}
if(PV){
  PV.addEventListener("change",e=>{if(e.target.id==="socFile"){const fl=e.target.files&&e.target.files[0];if(fl)socLoad(fl)}});
  PV.addEventListener("input",e=>{const t=e.target;
    if(t.id==="socPos"){SOC.pos=t.value/100;drawSoc();return}
    if(t.id==="socCtx"){SOC.ctx=t.value;return}
    if(t.id==="socTxt"){SOC.caption=t.value;if(SOC.arm){SOC.arm=false;const b=PV.querySelector('[data-c="socpost"]');if(b)b.textContent="Postează pe Instagram + Facebook"}}});
  PV.addEventListener("click",e=>{const t=e.target;
    const sr=t.closest("[data-sr]");if(sr){SOC.ratio=sr.dataset.sr;SOC.pos=0.5;SOC.arm=false;SOC.caption=($("#socTxt")||{}).value||SOC.caption;socRender();return}
    const b=t.closest("[data-c]");if(!b)return;const a=b.dataset.c;
    if(a==="soctpl"){SOC.caption=SOC_TPL();SOC.arm=false;socRender();return}
    if(a==="socai"){const cx=$("#socCtx");if(cx)SOC.ctx=cx.value.trim();socAI(true);return}
    if(a==="socpost"){socPost(b);return}});
}

/* ---------- Rentabilitate pe eveniment ---------- */
const nr=v=>{const n=Number(String(v??"").replace(/\s/g,"").replace(",","."));return isFinite(n)?n:0};
const lei=v=>`${Math.round(v).toLocaleString("ro-RO")} lei`;
const pct=v=>`${Math.round((v||0)*100)}%`;
const TVA=0.21;
function rentDefaults(c){const r=c.rent||{};return {invitati:r.invitati??(c.invitati||""),curs:r.curs??"5",barmani:r.barmani??"",tarif:r.tarif??"",transport:r.transport??"",alte:r.alte??"",
  bauturaClient:r.bauturaClient??(c.unitate==="TOTAL"),costBautura:r.costBautura??"",consum:r.consum||null}}
function rentCalc(c,r){
  const curs=c.moneda==="EURO"?nr(r.curs)||0:1,brut=(c.unitate==="TOTAL"?nr(c.pret):nr(c.pret)*nr(r.invitati))*curs;
  const venit=c.tva==="cu TVA inclus"?brut/(1+TVA):brut;
  const bautura=r.bauturaClient?0:nr(r.costBautura),personal=nr(r.barmani)*nr(r.tarif),transport=nr(r.transport),alte=nr(r.alte);
  const cost=bautura+personal+transport+alte,profit=venit-cost;
  return {venit,bautura,personal,transport,alte,cost,profit,marja:venit?profit/venit:0};
}
function viewRent(){
  const c=cur,r=rentDefaults(c),k=rentCalc(c,r),ri=(key,label,o={})=>`<label>${label}<input data-r="${key}" value="${esc(r[key]??"")}" inputmode="decimal"${o.ph?` placeholder="${esc(o.ph)}"`:""}></label>`;
  const X=window.__cx||{},DD=X.getD?X.getD():null,evs=(DD&&DD.events?DD.events:[]).filter(e=>e.date&&X.dKey(e.date)===c.dataEv).sort((a,b)=>{const m=e=>{const l=fold(c.locatie||"").toLowerCase(),n=fold(e.name||"").toLowerCase();return l&&n&&(l.includes(n)||n.includes(l))?0:1};return m(a)-m(b)});
  let h=`<div class="st-top"><div><p class="ev-sub">Rentabilitate · ${esc(c.nume||"")}</p><p class="ev-file">${esc(shortDate(c.dataEv))}${c.locatie?" · "+esc(c.locatie):""} · ${esc(c.pret||"")} ${esc(c.moneda||"")} ${c.unitate==="TOTAL"?"total":"/ persoană"} (${esc(c.tva||"")})</p></div>
    <div class="st-acts"><button class="btn" data-c="back">Înapoi</button></div></div>
    <h2 class="ev-h2">Venit</h2><div class="st-meta">${c.unitate==="TOTAL"?"":ri("invitati","Invitați reali (fără staff și copii)")}${c.moneda==="EURO"?ri("curs","Curs EUR (lei)"):""}</div>
    <h2 class="ev-h2">Costuri</h2>
    <label class="ct-opt"><input type="checkbox" data-rcb="bauturaClient"${r.bauturaClient?" checked":""}><span>Băutura o plătește clientul separat (pachet barmani), nu intră la costuri</span></label>
    ${r.bauturaClient?"":`<div class="st-meta">${ri("costBautura","Cost băutură (lei, fără TVA)")}</div>
    <div class="st-ai">${evs.length?`<p class="ev-file">Ia costul din consumul evenimentului din Excelul încărcat în Evenimente (trimis minus retur, la prețurile furnizorului, cu discountul la alcool):</p><div class="ct-b">${evs.map(e=>`<button class="btn primary" data-rcons="${esc(e.id)}">Ia consumul: ${esc(e.name)}</button>`).join("")}</div>`
      :`<p class="ev-file">Excelul cu acest eveniment nu e încărcat acum în Evenimente. Poți scrie costul băuturii de mână sau îl iei când încarci Excelul săptămânii.</p>`}
    ${r.consum?`<p class="ev-file">Consum luat din „${esc(r.consum.ev)}” · ${r.consum.items.length} articole${r.consum.fara?` · ${r.consum.fara} fără preț în listă (nu intră în cost)`:""}${r.consum.noRet?` · ${r.consum.noRet} fără retur notat (socotite integral)`:""}</p>`:""}${rentMsg?`<p class="ev-alert ct-msg">${esc(rentMsg)}</p>`:""}</div>`}
    <div class="st-meta">${ri("barmani","Nr. barmani")}${ri("tarif","Plată / barman (lei)")}${ri("transport","Transport (lei)")}${ri("alte","Alte costuri: gheață, fructe, pahare sparte (lei)")}</div>
    <h2 class="ev-h2">Rezultat</h2>
    <table class="ct-rt"><tbody>
      <tr><td>Venit${c.tva==="cu TVA inclus"?" (fără TVA)":""}</td><td>${lei(k.venit)}</td></tr>
      ${r.bauturaClient?"":`<tr><td>Băutură</td><td>− ${lei(k.bautura)}</td></tr>`}
      <tr><td>Barmani</td><td>− ${lei(k.personal)}</td></tr><tr><td>Transport</td><td>− ${lei(k.transport)}</td></tr><tr><td>Alte costuri</td><td>− ${lei(k.alte)}</td></tr>
      <tr class="tot"><td>Profit</td><td>${lei(k.profit)} · ${pct(k.marja)}</td></tr></tbody></table>
    <div class="st-save"><button class="btn primary" data-c="saverent">Salvează</button></div>`;
  return h;
}
function grabRent(){const r=rentDefaults(cur);V.querySelectorAll("[data-r]").forEach(i=>r[i.dataset.r]=i.value.trim());V.querySelectorAll("[data-rcb]").forEach(i=>r[i.dataset.rcb]=i.checked);cur.rent={...(cur.rent||{}),...r};return cur.rent}
async function pullConsum(e,btn){
  grabRent();btn.disabled=true;
  try{const X=window.__cx,P=await X.loadPrices(),{rows,noRet}=X.buildRows(e,P),disc=(Number(P.discPct)||0)/100;
    let tot=0,fara=0;const items=[];
    rows.filter(x=>x.q>0).forEach(x=>{if(x.pret==null||x.pret===""){fara++;items.push({l:x.tip+(x.brand?" "+x.brand:""),q:x.q,v:null});return}
      const v=x.q*Number(x.pret)*(x.s==="alcool"?1-disc:1);tot+=v;items.push({l:x.tip+(x.brand?" "+x.brand:""),q:Math.round(x.q*100)/100,v:Math.round(v*100)/100})});
    cur.rent.costBautura=String(Math.round(tot));cur.rent.consum={ev:e.name,items,fara,noRet,at:new Date().toISOString()};
    rentMsg="";render();toast(`Costul băuturii: ${lei(tot)}. Verifică și apasă Salvează.`)}
  catch(err){console.warn(err);rentMsg="Nu am putut calcula consumul. Încearcă din nou.";render()}
}
async function saveRent(){const r=grabRent(),calc=rentCalc(cur,r);r.calc={venit:Math.round(calc.venit),profit:Math.round(calc.profit),marja:Math.round(calc.marja*1000)/1000};
  try{await F.fs.doc(`${F.base}/contracte/${cur.id}`).set({rent:r},{merge:true});toast(`Salvat: profit ${lei(calc.profit)} (${pct(calc.marja)}).`);mode="list";cur=null;render()}
  catch(e){toast("Nu am putut salva. Verifică internetul.")}}

/* ---------- Notițe cu clientul ---------- */
function viewNotes(){
  const c=cur,L=[...(c.notes||[])].map((n,i)=>({...n,i})).sort((a,b)=>String(b.d||b.at).localeCompare(String(a.d||a.at)));
  let h=`<div class="st-top"><div><p class="ev-sub">Notițe · ${esc(c.nume||"")}</p><p class="ev-file">${esc(shortDate(c.dataEv))}${c.locatie?" · "+esc(c.locatie):""}. Le vezi doar tu. Intră și în descrierea din calendar la următorul „Drive + calendar”.</p></div>
    <div class="st-acts"><button class="btn" data-c="back">Înapoi</button></div></div>
    <div class="st-ai"><div class="st-meta"><label>Data discuției<input type="date" id="ntD" value="${today()}"></label></div>
    <label class="ct-full">Ce s-a discutat<textarea id="ntT" rows="6" placeholder="ex: vor 2 cocktailuri personalizate cu numele lor, fără alcool pentru 15 copii, bar afară până la 23:00, nașii plătesc avansul…"></textarea></label>
    <div class="st-save"><button class="btn primary" data-c="addnote">Adaugă notița</button></div></div>`;
  if(!L.length)return h+`<div class="ev-ok">Nicio notiță încă.</div>`;
  h+=`<h2 class="ev-h2">Discuțiile de până acum</h2>`;
  L.forEach(n=>{h+=`<div class="ct-card"><div class="ct-h"><b>${esc(shortDate(n.d)||shortDate(String(n.at).slice(0,10)))}</b><button class="btn st-del" data-ndel="${n.i}">${noteDel===n.i?"Sigur? Șterge":"Șterge"}</button></div><p class="ct-note">${esc(n.t).replace(/\n/g,"<br>")}</p></div>`});
  return h;
}
async function saveNotes(arr,msg){try{await F.fs.doc(`${F.base}/contracte/${cur.id}`).set({notes:arr},{merge:true});cur.notes=arr;noteDel=null;render();toast(msg)}catch(e){toast("Nu am putut salva notița. Verifică internetul.")}}
const notesTxt=c=>{const L=[...(c.notes||[])].sort((a,b)=>String(a.d||a.at).localeCompare(String(b.d||b.at)));return L.length?"\n\nDISCUȚII CU CLIENTUL:\n"+L.map(n=>`${shortDate(n.d)||""} — ${n.t}`).join("\n"):""};

/* ---------- Google Drive + Calendar ---------- */
const G={tok:null,exp:0,tc:null,pick:null};
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const tcase=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
const surname=n=>tcase(String(n||"").trim().split(/\s+/)[0]||"Client");
const fileName=c=>`${c.dataEv}_${fold(surname(c.nume))}_${fold(tcase(c.locatie))||"Eveniment"}_Contract.pdf`;
const money=v=>String(v||"").trim();
function evDesc(c){
  const cur=c.moneda==="EURO"?"€":"RON",un=c.unitate==="TOTAL"?"total":"/ persoană";
  const L=[`CLIENT: ${tcase(c.nume)}${c.tel?" · "+c.tel:""}`,`LOCAȚIE: ${tcase(c.locatie)}`];
  if(c.oraEv)L.push(`ORA: ${c.oraEv}`);
  if(String(c.invitati||"").trim())L.push(`INVITAȚI: minim ${c.invitati}`);
  L.push(`PACHET: ${tcase(c.obiect)}${on(c.c2)?` · ${c.ore||10} ore de servire`:""}`);
  L.push(`PREȚ: ${money(c.pret)} ${cur} ${un} ${c.tva}`);
  L.push(`AVANS: ${money(c.avans)} ${c.monedaAvans} (${c.avansPlatit?"încasat":"de încasat"} · contract din ${shortDate(c.dataContract)})`);
  L.push(`REST DE PLATĂ: ${shortDate(c.dataRest)||"—"}${c.restPlatit?" · încasat":""} · ${c.plata}`);
  if(on(c.c3)||on(c.c4))L.push([on(c.c3)?`TRANSPORT: ${c.transport}`:"",on(c.c4)?`taxa de vase: ${c.vase}`:""].filter(Boolean).join(" · "));
  if(c.portalResp&&c.portalResp.menu&&c.portalResp.menu.length)L.push(`MENIU ALES DE CLIENT: ${c.portalResp.menu.join(", ")}${c.portalResp.obs?" · "+c.portalResp.obs:""}`);
  L.push(c.signedId?`CONTRACT: semnat de ambele părți${c.signedAt?" ("+shortDate(c.signedAt)+")":""}`:"CONTRACT: trimis clientului, încă nesemnat de el");
  return L.join("\n")+notesTxt(c)+`\n\n${c.signedId?"Contractul semnat e":"Contract"} atașat mai jos · completat din aplicația Cocktail Philosophy.`;
}
const MARK="completat din aplicația Cocktail Philosophy";
function loadGIS(){return loadScript("https://accounts.google.com/gsi/client","google").then(()=>window.google.accounts.oauth2)}
async function gToken(){
  if(G.tok&&Date.now()<G.exp-60000)return G.tok;
  const cid=((firma&&firma.gClient)||FIRMA_DEF.gClient||"").trim();
  if(!cid)throw {msg:"Lipsește Google Client ID. Completează-l la „Datele firmei” → Google Drive și Calendar."};
  const oa=await loadGIS().catch(()=>{throw {msg:"Nu s-a încărcat conectarea Google. Verifică internetul."}});
  return new Promise((res,rej)=>{
    G.tc=oa.initTokenClient({client_id:cid,scope:"https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar.events",hint:"cocktailphilosophy@gmail.com",
      callback:r=>{if(r&&r.access_token){G.tok=r.access_token;G.exp=Date.now()+(+r.expires_in||3600)*1000;res(G.tok)}else rej({msg:"Conectarea la Google nu a reușit."})},
      error_callback:e=>rej({msg:e&&e.type==="popup_closed"?"Ai închis fereastra Google înainte de final.":"Conectarea la Google nu a reușit (fereastra a fost blocată?)."})});
    G.tc.requestAccessToken({prompt:G.tok?"":"consent"});
  });
}
async function gf(url,o={}){
  const t=await gToken();const r=await fetch(url,{...o,headers:{Authorization:"Bearer "+t,...(o.headers||{})}});
  if(r.status===401){G.tok=null;throw {msg:"Sesiunea Google a expirat. Apasă din nou."}}
  if(!r.ok){let m="";try{m=(await r.json()).error.message}catch(e){}throw {msg:`Google a refuzat operația (${r.status}). ${m}`}}
  return r.status===204?null:r.json();
}
const DQ=q=>gf("https://www.googleapis.com/drive/v3/files?fields=files(id,name)&pageSize=10&q="+encodeURIComponent(q));
async function folderFor(year){
  const fq=(n,p)=>`name='${n}' and mimeType='application/vnd.google-apps.folder' and trashed=false`+(p?` and '${p}' in parents`:" and 'root' in parents");
  const mk=(n,p)=>gf("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,mimeType:"application/vnd.google-apps.folder",...(p?{parents:[p]}:{})})});
  let root=(await DQ(fq("Evenimente"))).files[0];if(!root)root=await mk("Evenimente");
  const yn=`Evenimente ${year}`;let y=(await DQ(fq(yn,root.id))).files[0];if(!y)y=await mk(yn,root.id);return y.id;
}
function pdfBlob(c){return loadPdfMake().then(pm=>new Promise(res=>pm.createPdf(contractDoc(c,firma||FIRMA_DEF)).getBlob(res)))}
async function uploadPdf(c,blob){
  const name=fileName(c),meta={name,mimeType:"application/pdf"};
  if(c.driveId){
    try{return await gf(`https://www.googleapis.com/upload/drive/v3/files/${c.driveId}?uploadType=multipart&fields=id,name,webViewLink`,{method:"PATCH",body:mp({name},blob)})}
    catch(e){if(!/404/.test(e.msg||""))throw e}
  }
  meta.parents=[await folderFor(c.dataEv.slice(0,4))];
  return gf("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",{method:"POST",body:mp(meta,blob)});
}
function mp(meta,blob){const fd=new FormData();fd.append("metadata",new Blob([JSON.stringify(meta)],{type:"application/json"}));fd.append("file",blob);return fd}
const calId=()=>encodeURIComponent((firma&&firma.gCal)||"cocktailphilosophy@gmail.com");
const CAL=p=>`https://www.googleapis.com/calendar/v3/calendars/${calId()}/events${p||""}`;
function dayISO(d,add){const x=new Date(d+"T00:00:00");x.setDate(x.getDate()+(add||0));return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
function evTimes(c){
  if(!c.oraEv)return {start:{date:c.dataEv},end:{date:dayISO(c.dataEv,1)}};
  const [h,m]=c.oraEv.split(":").map(Number),e=`${String((h+1)%24).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return {start:{dateTime:`${c.dataEv}T${c.oraEv}:00`,timeZone:"Europe/Bucharest"},end:{dateTime:`${c.dataEv}T${e}:00`,timeZone:"Europe/Bucharest"}};
}
async function dayEvents(d){
  const tz=new Date(d+"T00:00:00").getTimezoneOffset(),off=(tz>0?"-":"+")+String(Math.abs(tz/60)|0).padStart(2,"0")+":00";
  const r=await gf(CAL(`?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(d+"T00:00:00"+off)}&timeMax=${encodeURIComponent(dayISO(d,1)+"T00:00:00"+off)}`));
  return (r.items||[]).filter(e=>e.status!=="cancelled");
}
async function writeEvent(c,file,targetId){
  const sg=c.signedId?{fileUrl:`https://drive.google.com/file/d/${c.signedId}/view?usp=drivesdk`,fileId:c.signedId,title:c.signedName||"Contract semnat",mimeType:c.signedMime||"application/pdf"}:null;
  const att=sg||{fileUrl:`https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,fileId:file.id,title:file.name,mimeType:"application/pdf"};
  const desc=evDesc(c);
  if(targetId){
    const ex=await gf(CAL("/"+encodeURIComponent(targetId)));
    const old=String(ex.description||"").trim(),keep=old&&!old.includes(MARK)?"\n\n— Note anterioare —\n"+old:"";
    const atts=(ex.attachments||[]).filter(a=>a.fileId!==file.id&&a.fileId!==att.fileId&&!(c.driveId&&a.fileId===c.driveId));atts.push(att);
    const body={description:desc+keep,location:ex.location||tcase(c.locatie),attachments:atts};
    if(c.oraEv)Object.assign(body,evTimes(c));
    return gf(CAL("/"+encodeURIComponent(targetId)+"?supportsAttachments=true&sendUpdates=none"),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  }
  const sum=[tcase(c.locatie),String(c.invitati||"").trim(),surname(c.nume)].filter(Boolean).join(" ");
  return gf(CAL("?supportsAttachments=true&sendUpdates=none"),{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({summary:sum,location:tcase(c.locatie),description:desc,attachments:[att],...evTimes(c)})});
}
function gPick(){
  if(!G.pick)return "";
  const P=G.pick;
  return `<div class="ev-alert" id="gPick"><b>În ${esc(shortDate(P.c.dataEv))} ai deja ${P.items.length===1?"un eveniment":P.items.length+" evenimente"} în calendar.</b>
    <p class="ev-file">Alege unde pun contractul. Dacă îl completez, păstrez și notele pe care le aveai în descriere.</p>
    <div class="ct-b">${P.items.map(e=>`<button class="btn primary" data-gp="${esc(e.id)}">Completează „${esc(e.summary||"Fără titlu")}”${e.start&&e.start.dateTime?" · "+esc(e.start.dateTime.slice(11,16)):""}</button>`).join("")}
    <button class="btn" data-gp="__new">Eveniment nou</button><button class="btn" data-gp="__cancel">Renunță</button></div></div>`;
}
async function gsync(c,btn,target){
  const lbl=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Se salvează în Google…"}
  try{
    if(!c.dataEv)throw {msg:"Completează data evenimentului."};
    let tgt=target;
    if(tgt===undefined){
      if(c.calId){try{const ex=await gf(CAL("/"+encodeURIComponent(c.calId)));if(ex&&ex.status!=="cancelled")tgt=c.calId}catch(e){}}
      if(tgt===undefined){const items=await dayEvents(c.dataEv);
        if(items.length){G.pick={c,items};render();const el=$("#gPick");if(el)el.scrollIntoView({block:"center"});return}
        tgt=null}
    }
    const blob=await pdfBlob(c),file=await uploadPdf(c,blob),ev=await writeEvent(c,file,tgt||null);
    await F.fs.doc(`${F.base}/contracte/${c.id}`).set({driveId:file.id,calId:ev.id},{merge:true});
    if(f&&f.id===c.id){f.driveId=file.id;f.calId=ev.id}
    G.pick=null;toast(`Gata: contractul e în Drive (${file.name}) și ${tgt?"evenimentul a fost completat":"evenimentul a fost creat"} în calendar.`);
    if(mode==="form"){mode="list";f=null}render();
  }catch(e){console.warn(e);toast(e&&e.msg||"Nu am putut salva în Google. Încearcă din nou.")}
  finally{if(btn&&document.contains(btn)){btn.disabled=false;btn.textContent=lbl}}
}

async function uploadSigned(c,fileIn){
  const lab=fileIn.closest("label");if(lab){lab.classList.add("busy");lab.firstChild.textContent="Se încarcă în Drive…"}
  try{
    if(!c.dataEv)throw {msg:"Contractul nu are data evenimentului. Completeaz-o la Editează."};
    if(fileIn.files[0].size>25e6)throw {msg:"Fișierul e prea mare (peste 25 MB)."};
    const fl=fileIn.files[0],ext=(fl.name.match(/\.[a-z0-9]{2,5}$/i)||[fl.type==="application/pdf"?".pdf":".jpg"])[0].toLowerCase(),
      name=fileName(c).replace(/_Contract\.pdf$/,"_Contract_SEMNAT"+ext),mime=fl.type||"application/pdf";
    let file=null;
    if(c.signedId){try{file=await gf(`https://www.googleapis.com/upload/drive/v3/files/${c.signedId}?uploadType=multipart&fields=id,name`,{method:"PATCH",body:mp({name,mimeType:mime},fl)})}catch(e){if(!/404/.test(e.msg||""))throw e}}
    if(!file)file=await gf("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",{method:"POST",body:mp({name,mimeType:mime,parents:[await folderFor(c.dataEv.slice(0,4))]},fl)});
    const upd={signedId:file.id,signedName:file.name,signedMime:mime,signedAt:today()};
    await F.fs.doc(`${F.base}/contracte/${c.id}`).set(upd,{merge:true});
    const cc={...c,...upd};let calMsg="";
    if(c.calId){try{const ex=await gf(CAL("/"+encodeURIComponent(c.calId)));
        if(ex&&ex.status!=="cancelled"){
          const old=String(ex.description||""),desc=old.includes(MARK)?evDesc(cc)+(old.includes("— Note anterioare —")?"\n\n— Note anterioare —"+old.split("— Note anterioare —").slice(1).join("— Note anterioare —"):""):old;
          const atts=(ex.attachments||[]).filter(a=>a.fileId!==file.id&&a.fileId!==c.driveId);
          atts.push({fileUrl:`https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,fileId:file.id,title:file.name,mimeType:mime});
          await gf(CAL("/"+encodeURIComponent(c.calId)+"?supportsAttachments=true&sendUpdates=none"),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:desc,attachments:atts})});
          calMsg=" și l-am pus în calendar în locul celui nesemnat"}}catch(e){console.warn(e);calMsg=", dar nu am putut actualiza calendarul"}}
    else calMsg=". Apasă „Drive + calendar” ca să apară și în calendar";
    toast(`Gata: contractul semnat e în Drive (${file.name})${calMsg}.`);
  }catch(e){console.warn(e);toast(e&&e.msg||"Nu am putut încărca contractul semnat. Încearcă din nou.")}
  finally{fileIn.value="";render()}
}
V.addEventListener("change",e=>{
  const i=e.target.closest("[data-sgn]");if(!i||!i.files||!i.files[0])return;const c=list.find(x=>x.id===i.dataset.sgn);if(c)uploadSigned(c,i)});
V.addEventListener("input",e=>{if(e.target.classList.contains("ct-q")){q=e.target.value;render();return}
});
V.addEventListener("click",async e=>{
  const t=e.target,b=t.closest("[data-c]");
  const tog=t.closest("[data-tog]");if(tog){const c=list.find(x=>x.id===tog.dataset.id);if(c)F.fs.doc(`${F.base}/contracte/${c.id}`).set({[tog.dataset.tog]:!c[tog.dataset.tog]},{merge:true}).catch(()=>toast("Nu s-a salvat. Încearcă din nou."));return}
  if(t.closest("[data-bk]")){bkRun();return}
  const tx=t.closest("[data-thx]");if(tx){F.fs.doc(`${F.base}/contracte/${tx.dataset.thx}`).set({thanksAt:new Date().toISOString()},{merge:true}).catch(()=>{});return}
  const tk=t.closest("[data-thxskip]");if(tk){F.fs.doc(`${F.base}/contracte/${tk.dataset.thxskip}`).set({thanksSkip:true},{merge:true}).catch(()=>{});return}
  const fi=t.closest("[data-fisa]");if(fi){const c=list.find(x=>x.id===fi.dataset.fisa);if(c&&window.__evNew){const r=c.portalResp||{};window.__evNew({nume:tcase(c.locatie||""),data:c.dataEv||"",ora:c.oraEv||"",pers:String(c.invitati||""),note:r.menu&&r.menu.length?"Meniu: "+r.menu.join(", ")+(r.obs?". "+r.obs:""):"",from:tcase(surname(c.nume))})}return}
  const pon=t.closest("[data-porn]");if(pon){const c=list.find(x=>x.id===pon.dataset.porn);if(c)portalPublish(c);return}
  const pou=t.closest("[data-porup]");if(pou){const c=list.find(x=>x.id===pou.dataset.porup);if(c){portalPublish(c).then(()=>portalRefresh(c,false))}return}
  const pow=t.closest("[data-porwa]");if(pow){const c=list.find(x=>x.id===pow.dataset.porwa);if(c&&c.portalTok){const tel=telWa(c.tel);window.open((tel?`https://wa.me/${tel}`:"https://wa.me/")+"?text="+encodeURIComponent(porMsg(c)),"_blank")}return}
  const poc=t.closest("[data-porcp]");if(poc){const c=list.find(x=>x.id===poc.dataset.porcp);if(c&&c.portalTok)navigator.clipboard.writeText(porLink(c)).then(()=>toast("Linkul portalului a fost copiat."),()=>toast(porLink(c)));return}
  const pos=t.closest("[data-porsg]");if(pos){const c=list.find(x=>x.id===pos.dataset.porsg);if(c)portalSaveSigned(c,pos);return}
  const pn=t.closest("[data-paynew]");if(pn){const c=list.find(x=>x.id===pn.dataset.paynew);if(c)payNew(c);return}
  const pw=t.closest("[data-paywa]");if(pw){const c=list.find(x=>x.id===pw.dataset.paywa);if(c&&c.payOrder){const tel=telWa(c.tel),u=(tel?`https://wa.me/${tel}`:"https://wa.me/")+"?text="+encodeURIComponent(payMsg(c));window.open(u,"_blank")}return}
  const pc=t.closest("[data-paycp]");if(pc){const c=list.find(x=>x.id===pc.dataset.paycp);if(c&&c.payOrder)navigator.clipboard.writeText(c.payOrder.url).then(()=>toast("Linkul a fost copiat."),()=>toast(c.payOrder.url));return}
  const pk=t.closest("[data-paychk]");if(pk){const c=list.find(x=>x.id===pk.dataset.paychk);if(c)payCheck(c,false);return}
  const rb=t.closest("[data-rent]");if(rb){const c=list.find(x=>x.id===rb.dataset.rent);if(c){cur={...c};rentMsg="";mode="rent";render();window.scrollTo(0,V.offsetTop-10)}return}
  const nb=t.closest("[data-notes]");if(nb){const c=list.find(x=>x.id===nb.dataset.notes);if(c){cur={...c};noteDel=null;mode="notes";render();window.scrollTo(0,V.offsetTop-10)}return}
  const rc=t.closest("[data-rcons]");if(rc&&cur){const DD=window.__cx&&window.__cx.getD(),e=DD&&DD.events.find(x=>x.id===rc.dataset.rcons);if(e)pullConsum(e,rc);return}
  const rcb=t.closest("[data-rcb]");if(rcb&&cur){grabRent();render();return}
  const nd=t.closest("[data-ndel]");if(nd&&cur){const i=+nd.dataset.ndel;if(noteDel!==i){noteDel=i;render();return}const arr=(cur.notes||[]).filter((_,j)=>j!==i);saveNotes(arr,"Notița a fost ștearsă.");return}
  const gs=t.closest("[data-gs]");if(gs){const c=list.find(x=>x.id===gs.dataset.gs);if(c){G.pick=null;gsync(c,gs)}return}
  const gp=t.closest("[data-gp]");if(gp&&G.pick){const v=gp.dataset.gp,c=G.pick.c;if(v==="__cancel"){G.pick=null;render();return}gsync(c,gp,v==="__new"?null:v);return}
  const pd=t.closest("[data-pdf]");if(pd){const c=list.find(x=>x.id===pd.dataset.pdf);if(c)downloadPDF(c,pd);return}
  const ed=t.closest("[data-ed]");if(ed){const c=list.find(x=>x.id===ed.dataset.ed);if(c){f={...BLANK(),...c,ocr:{}};errs=[];ocrMsg="";mode="form";render();window.scrollTo(0,V.offsetTop-10)}return}
  const du=t.closest("[data-dup]");if(du){const c=list.find(x=>x.id===du.dataset.dup);if(c){f={...BLANK(),...c,id:null,ocr:{},dataContract:today(),dataEv:"",dataRest:"",avansPlatit:false,restPlatit:false};errs=[];ocrMsg="Copie după contractul existent: completează data evenimentului și verifică restul.";mode="form";render();window.scrollTo(0,V.offsetTop-10)}return}
  const de=t.closest("[data-del]");if(de){const id=de.dataset.del;if(confirmDel!==id){confirmDel=id;render();setTimeout(()=>{if(confirmDel===id){confirmDel=null;if(mode==="list")render()}},4000);return}
    confirmDel=null;F.fs.doc(`${F.base}/contracte/${id}`).delete().then(()=>toast("Contractul a fost șters.")).catch(()=>toast("Nu am putut șterge."));return}
  if(!b)return;const a=b.dataset.c;
  if(a==="new"){f=BLANK();errs=[];ocrMsg="";mode="form";render();window.scrollTo(0,V.offsetTop-10);return}
  if(a==="back"){mode="list";f=null;cur=null;errs=[];SOC.arm=false;render();return}

  if(a==="saverent"){saveRent();return}
  if(a==="addnote"){const tx=($("#ntT").value||"").trim(),d=$("#ntD").value||today();if(!tx){toast("Scrie ce s-a discutat.");return}
    saveNotes([...(cur.notes||[]),{d,t:tx,at:new Date().toISOString()}],"Notița a fost salvată.");return}
  if(a==="firma"){mode="firma";render();return}
  if(a==="savefirma"){const x={};V.querySelectorAll("[data-fi]").forEach(i=>x[i.dataset.fi]=i.value.trim());
    try{await F.fs.doc(`${F.base}/privat/firma`).set(x);firma={...FIRMA_DEF,...x};mode="list";render();toast("Datele firmei au fost salvate.")}catch(e2){toast("Nu am putut salva datele firmei.")}return}
  if(a==="sigup"){const i=$("#ctSig");i.onchange=async()=>{const fl=i.files&&i.files[0];if(!fl)return;
      try{const img=await prepSig(fl);if(img.length>900000){toast("Imaginea e prea mare. Fă o poză mai apropiată, doar cu semnătura și ștampila.");return}
        await F.fs.doc(`${F.base}/privat/semnatura`).set({img,at:new Date().toISOString()});sig=img;render();toast("Semnătura a fost salvată.")}
      catch(e2){toast(e2&&e2.message==="empty"?"Nu am găsit semnătura în poză. Încearcă pe fundal alb.":"Nu am putut salva semnătura.")}};i.click();return}
  if(a==="sigdel"){try{await F.fs.doc(`${F.base}/privat/semnatura`).delete();sig=null;render();toast("Semnătura a fost ștearsă.")}catch(e2){toast("Nu am putut șterge semnătura.")}return}
  if(a==="foto"){const i=$("#ctFoto");i.onchange=()=>{if(i.files&&i.files[0])readID(i.files[0])};i.click();return}
  if(a==="save"||a==="pdf"||a==="gsync"){grab();errs=check(f);G.pick=null;
    if(a==="gsync"&&!errs.length&&!f.dataEv)errs=[{k:"dataEv",m:"Lipsește: Data evenimentului"}];
    if(a==="gsync"&&errs.length){render();const el=$("#ctErr");if(el)el.scrollIntoView({block:"center"});return}
    if(a==="gsync"){b.disabled=true;const ok=await save();b.disabled=false;if(!ok)return;await gsync({...clean(f),id:f.id,driveId:f.driveId||"",calId:f.calId||""},b);return}
    if(a==="pdf"&&errs.length){render();const el=$("#ctErr");if(el)el.scrollIntoView({block:"center"});return}
    if(a==="save"&&!f.nume.trim()){errs=[{k:"nume",m:"Scrie măcar numele clientului."}];render();return}
    b.disabled=true;const ok=await save();b.disabled=false;if(!ok)return;
    if(a==="pdf")await downloadPDF(clean(f),b);else toast(errs.length?"Contractul a fost salvat. Mai sunt câmpuri de completat înainte de PDF.":"Contractul a fost salvat.");
    if(!errs.length){mode="list";f=null;render()}else render();return}
});

let started=false;
function start(){if(started)return;started=true;if(!F.isAdmin){V.innerHTML=`<div class="ev-ok">Contractele le vede doar administratorul.</div>`;return}V.innerHTML=`<p class="ev-file">Se încarcă…</p>`;const had=!!sub;subscribe();if(had)render()}
function startPost(){if(F.isAdmin&&!sub)subscribe();socRender()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="contracte")start();if(b.dataset.view==="postare")startPost()}));
if(store.get("tab","evenimente")==="contracte")start();
if(store.get("tab","evenimente")==="postare")startPost();
/* ---------- după eveniment: mulțumire + recenzie ---------- */
const addDays=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const firstName=n=>{const w=String(n||"").trim().split(/\s+/);return tcase(w.length>1?w[1]:w[0]||"")};
const reviewLink=()=>((firma&&firma.reviewUrl)||"").trim()||"https://www.facebook.com/cocktailphilosophy/reviews";
function thanksDue(){const t=today();return list.filter(c=>c.dataEv&&!c.thanksAt&&!c.thanksSkip&&addDays(c.dataEv,1)<=t&&addDays(c.dataEv,21)>=t).sort((a,b)=>String(a.dataEv).localeCompare(b.dataEv))}
function thanksTxt(c){const fn=firstName(c.nume);
  return `Bună${fn?", "+fn:""}! Mulțumim mult că ne-ați ales pentru evenimentul de la ${tcase(c.locatie||"")} 🍸 Sperăm că invitații s-au distrat la bar cât ne-am distrat și noi.\n\nDacă v-a plăcut, ne-ar ajuta enorm o recenzie scurtă, durează un minut: ${reviewLink()}\n\nȘi dacă aveți poze de la bar, ni le puteți trimite aici, ne bucurăm de fiecare. 😊\nPaul, Cocktail Philosophy`}
function thanksHTML(){const L=thanksDue();if(!L.length)return "";
  return `<div class="ct-card"><div class="ct-h"><b>Mulțumiri de trimis după eveniment</b><span>${L.length} ${L.length===1?"client":"clienți"}</span></div>
    <p class="ev-file">Mesajul se deschide gata scris în WhatsApp, cu linkul de recenzie${firma&&firma.reviewUrl?"":" (acum cel de Facebook; pune linkul Google la Datele firmei → Pagina de la bar)"}. Tu doar apeși Trimite.</p>`+
    L.map(c=>`<div class="qr-lead"><div><b>${esc(tcase(c.nume))}</b> · ${esc(tcase(c.locatie||""))}<small>eveniment pe ${esc(shortDate(c.dataEv))}${c.tel?" · "+esc(c.tel):" · fără telefon în contract"}</small></div>
      <div class="qr-la">${c.tel?`<a class="btn primary" data-thx="${c.id}" href="https://wa.me/${telWa(c.tel)}?text=${encodeURIComponent(thanksTxt(c))}" target="_blank" rel="noopener">WhatsApp</a>`:""}<button class="btn" data-thxskip="${c.id}">Nu trimit</button></div></div>`).join("")+`</div>`}
window.__ctNew=pre=>{const b=document.querySelector('nav.tabs button[data-view="contracte"]');if(b)b.click();f={...BLANK(),...pre};errs=[];ocrMsg="";mode="form";render();window.scrollTo(0,V.offsetTop-10)};
window.__ctRefresh=()=>{if(started&&mode==="list"&&!V.hidden)render()};
window.__ctList=()=>list;window.__ctFirma=()=>firma;
window.__ct={parseMRZ,parseVisual,cnpOk,contractDoc,FIRMA_DEF};
/* ---------- backup săptămânal al bazei de date în Google Drive ---------- */
const BK={busy:false,msg:"",last:null,loaded:false};
const bkDs=f=>"d-"+String(f).replace(/[^A-Za-z0-9_\-.~:@+]/g,"-").slice(0,150);
async function bkCollect(){
  const out={app:"Cocktail Philosophy",at:new Date().toISOString(),base:F.base,docs:{}};
  const col=async p=>{try{const q=await F.fs.collection(p).get();q.docs.forEach(d=>out.docs[p+"/"+d.id]=d.data())}catch(e){out.docs[p+"/__eroare"]=String(e&&e.code||e)}};
  for(const c of ["config","privat","contracte","stoc","oameni","alias"])await col(`${F.base}/${c}`);
  const files=new Set();try{const ev=JSON.parse(out.docs[`${F.base}/config/evenimente`].json);if(ev&&ev.fileName)files.add(ev.fileName)}catch(e){}
  try{(out.docs[`${F.base}/config/arhiva`]&&out.docs[`${F.base}/config/arhiva`].list||[]).forEach(x=>files.add(x.fileName))}catch(e){}
  for(const fn of files)for(const t of ["checks","retur"])await col(`${F.base}/${t}/${bkDs(fn)}/events`);
  for(const c of ["barLead","barScan","portal"])await col(c);
  try{const d=await F.fs.doc("bar/info").get();if(d.exists)out.docs["bar/info"]=d.data()}catch(e){}
  out.count=Object.keys(out.docs).length;return out}
async function bkRun(btn){
  if(BK.busy)return;BK.busy=true;BK.msg="Se adună datele…";render();
  try{const data=await bkCollect();BK.msg="Se urcă în Drive…";render();
    const fq=n=>`name='${n}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
    let fo=(await DQ(fq("Backup aplicație Cocktail Philosophy"))).files[0];
    if(!fo)fo=await gf("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Backup aplicație Cocktail Philosophy",mimeType:"application/vnd.google-apps.folder"})});
    const name=`backup-${today()}.json`,blob=new Blob([JSON.stringify(data)],{type:"application/json"});
    const up=await gf("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size",{method:"POST",body:mp({name,mimeType:"application/json",parents:[fo.id]},blob)});
    BK.last={at:new Date().toISOString(),name,id:up.id,count:data.count,size:blob.size};
    await F.fs.doc(`${F.base}/privat/backup`).set(BK.last);
    BK.msg=`Backup făcut: ${data.count} înregistrări, ${Math.round(blob.size/1024)} KB, în Drive → „Backup aplicație Cocktail Philosophy”.`;
  }catch(e){BK.msg="Backup-ul nu a reușit. "+(e&&e.msg||"Încearcă din nou.")}
  BK.busy=false;render()}
function bkHTML(){
  if(!BK.loaded){BK.loaded=true;F.fs.doc(`${F.base}/privat/backup`).get().then(d=>{BK.last=d.exists?d.data():null;if(mode==="list")render()}).catch(()=>{})}
  const days=BK.last&&BK.last.at?Math.floor((Date.now()-new Date(BK.last.at))/864e5):null,due=days==null||days>=7;
  if(due&&!BK.busy&&!BK.auto&&G.tok&&Date.now()<G.exp-60000){BK.auto=true;setTimeout(bkRun,50)}
  if(!due&&!BK.msg)return "";
  return `<div class="ct-card${due?" ct-bk-due":""}"><div class="ct-h"><b>Backup în Google Drive</b><span>${days==null?"niciun backup încă":days===0?"ultimul: azi":`ultimul: acum ${days} ${days===1?"zi":"zile"}`}</span></div>
    <p class="ev-file">${BK.msg?esc(BK.msg):"O copie a tuturor datelor (contracte, evenimente, retur, stoc, prețuri, cereri) se salvează ca fișier în Drive-ul tău. Apare aici o dată pe săptămână."}</p>
    ${due||BK.busy?`<div class="ct-b"><button class="btn primary" data-bk="1"${BK.busy?" disabled":""}>${BK.busy?"Se face backup…":"Fă backup acum"}</button></div>`:""}</div>`}
window.__gd={async uploadPublic(file,folderName){
  const fq=n=>`name='${n.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
  let fo=(await DQ(fq(folderName))).files[0];
  if(!fo)fo=await gf("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:folderName,mimeType:"application/vnd.google-apps.folder"})});
  const up=await gf("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",{method:"POST",body:mp({name:file.name,mimeType:file.type||"application/pdf",parents:[fo.id]},file)});
  await gf(`https://www.googleapis.com/drive/v3/files/${up.id}/permissions?fields=id`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:"reader",type:"anyone"})});
  return {id:up.id,name:up.name,link:`https://drive.google.com/file/d/${up.id}/view`};
}};
})();
