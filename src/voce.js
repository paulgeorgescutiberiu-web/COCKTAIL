/* ---------- Sofia: asistentul vocal în limba română ---------- */
/* Ascultă (recunoașterea vocală a telefonului, ro-RO), înțelege cu Gemini (prin Firebase AI Logic, ca la facturi),
   face acțiunile în aplicație prin funcții și răspunde cu voce. Scrierile în baza de date se confirmă întâi. */
(function(){
const F=window.CPFS;if(!F)return;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const TABS={retete:"Rețete",evenimente:"Evenimente",stoc:"Stoc depozit",contracte:"Contracte",oferte:"Oferte",postare:"Postare",raport:"Raport",echipa:"Echipa"};
const VS={open:false,msgs:[],busy:false,listening:false,talk:true,chat:null,model:null,rec:null,ask:null,voice:null};
const iso=d=>d instanceof Date&&!isNaN(d)?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";
const fold=s=>String(s??"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const has=(s,q)=>!q||fold(s).includes(fold(q));
try{VS.talk=localStorage.getItem("cp-voce-talk")!=="0"}catch(e){}

/* ---------- Funcțiile pe care le poate chema asistentul ---------- */
const S=(type,description,extra)=>({type,description,...extra});
const DECL=[
  {name:"deschide_sectiune",description:"Deschide o secțiune (tab) a aplicației.",
    parameters:S("object","",{properties:{sectiune:S("string","Secțiunea",{enum:Object.keys(TABS)})},required:["sectiune"]})},
  {name:"retete",description:"Caută în rețetarul de cocktailuri: ingrediente, cantități, pași, garnitură. Fără nume dă lista tuturor.",
    parameters:S("object","",{properties:{nume:S("string","Numele cocktailului sau un ingredient (opțional)")}})},
  {name:"evenimente",description:"Evenimentele din săptămâna curentă (fișa încărcată): nume, dată, oră, persoane, echipă, transport, mențiuni și, cu detalii, cantitățile de marfă.",
    parameters:S("object","",{properties:{cauta:S("string","Numele evenimentului sau al unui barman (opțional)"),detalii:S("boolean","true = include cantitățile de marfă")}})},
  {name:"stoc",description:"Stocul din depozit: câte bucăți sunt și câte sunt disponibile după evenimentele planificate.",
    parameters:S("object","",{properties:{articol:S("string","Articolul căutat (opțional). Fără el: articolele pe terminate."),toate:S("boolean","true = tot stocul")}})},
  {name:"contracte",description:"Contractele clienților (doar administratorul): client, dată, locație, invitați, preț, avans, ce e încasat.",
    parameters:S("object","",{properties:{cauta:S("string","Nume client, locație sau dată AAAA-LL (opțional)"),viitoare:S("boolean","true = doar evenimentele de azi încolo")}})},
  {name:"marcheaza_incasare",description:"Marchează avansul sau diferența unui contract ca încasate (sau neîncasate). Cere confirmarea utilizatorului înainte de salvare.",
    parameters:S("object","",{properties:{contract_id:S("string","id-ul din funcția contracte"),ce:S("string","avans sau rest",{enum:["avans","rest"]}),incasat:S("boolean","true = încasat")},required:["contract_id","ce","incasat"]})},
  {name:"adauga_eveniment",description:"Adaugă un eveniment nou al unui client: salvează contractul (cu ce se știe), îl pune în calendarul Google și îl pregătește. Cere singură confirmarea utilizatorului. Folosește-o pentru „adaugă un eveniment”, „am o nuntă pe…”, „fă contract pentru…”.",
    parameters:S("object","",{properties:{nume:S("string","Numele clientului (nume și prenume)"),tel:S("string","Telefon"),dataEv:S("string","Data evenimentului AAAA-LL-ZZ"),oraEv:S("string","Ora începerii HH:MM"),
      locatie:S("string","Locația"),invitati:S("string","Numărul minim de invitați"),pret:S("string","Prețul, doar numărul"),moneda:S("string","EURO sau RON",{enum:["EURO","RON"]}),
      unitate:S("string","/ PERSOANĂ sau TOTAL",{enum:["/ PERSOANĂ","TOTAL"]}),avans:S("string","Avansul, doar numărul"),monedaAvans:S("string","RON sau EURO",{enum:["RON","EURO"]}),
      dataRest:S("string","Data plății diferenței AAAA-LL-ZZ"),obiect:S("string","Serviciul, implicit COCKTAIL CATERING"),calendar:S("string","Doar după ce utilizatorul a ales: id-ul evenimentului din calendar de completat, sau „nou”")},required:["nume","dataEv"]})},
  {name:"calendar_zi",description:"Ce e în calendarul Google al firmei într-o zi.",
    parameters:S("object","",{properties:{data:S("string","AAAA-LL-ZZ")},required:["data"]})},
  {name:"pune_in_calendar",description:"Pune în calendar un contract existent (sau completează un eveniment existent din calendar cu datele lui).",
    parameters:S("object","",{properties:{contract_id:S("string",""),calendar:S("string","id-ul evenimentului din calendar de completat, sau „nou”")},required:["contract_id"]})},
  {name:"modifica_contract",description:"Schimbă câmpuri într-un contract existent (dată, oră, locație, invitați, preț, avans, telefon etc.). Cere confirmarea.",
    parameters:S("object","",{properties:{contract_id:S("string",""),nume:S("string","Numele clientului (nume și prenume)"),tel:S("string","Telefon"),dataEv:S("string","Data evenimentului AAAA-LL-ZZ"),oraEv:S("string","Ora începerii HH:MM"),
      locatie:S("string","Locația"),invitati:S("string","Numărul minim de invitați"),pret:S("string","Prețul, doar numărul"),moneda:S("string","EURO sau RON",{enum:["EURO","RON"]}),
      unitate:S("string","/ PERSOANĂ sau TOTAL",{enum:["/ PERSOANĂ","TOTAL"]}),avans:S("string","Avansul, doar numărul"),monedaAvans:S("string","RON sau EURO",{enum:["RON","EURO"]}),
      dataRest:S("string","Data plății diferenței AAAA-LL-ZZ"),obiect:S("string","Serviciul, implicit COCKTAIL CATERING")},required:["contract_id"]})},
  {name:"contract_drive",description:"Generează PDF-ul contractului, îl salvează în Google Drive și îl atașează la evenimentul din calendar. Merge doar dacă contractul e complet (are datele din buletin).",
    parameters:S("object","",{properties:{contract_id:S("string","")},required:["contract_id"]})},
  {name:"deschide_contract",description:"Deschide contractul pe ecran, ca utilizatorul să-l completeze (de ex. datele din buletin, cu poza buletinului) sau să-l verifice.",
    parameters:S("object","",{properties:{contract_id:S("string","")},required:["contract_id"]})},
  {name:"descarca_pdf",description:"Descarcă PDF-ul contractului pe telefon.",parameters:S("object","",{properties:{contract_id:S("string","")},required:["contract_id"]})},
  {name:"notita_contract",description:"Adaugă o notiță la un contract (ce s-a discutat cu clientul).",
    parameters:S("object","",{properties:{contract_id:S("string",""),text:S("string","")},required:["contract_id","text"]})},
  {name:"disponibilitate",description:"Ce barmani au spus că sunt disponibili (și care nu) într-o zi.",
    parameters:S("object","",{properties:{data:S("string","AAAA-LL-ZZ")},required:["data"]})},
  {name:"noteaza_bani",description:"Notează în secțiunea Bani o încasare sau o cheltuială (doar administratorul). Folosește-o pentru „am încasat…”, „am primit avansul…”, „am dat / am plătit / am cheltuit … pe …”. Spune apoi pe scurt ce ai notat.",
    parameters:S("object","",{properties:{tip:S("string","in = încasare, out = cheltuială",{enum:["in","out"]}),suma:S("number","Suma"),moneda:S("string","RON sau EUR",{enum:["RON","EUR"]}),
      cat:S("string","Categoria. Încasări: Avans eveniment, Rest eveniment, Bar / servicii, Vânzare marfă, Altele. Cheltuieli: Marfă și alcool, Fructe, gheață, Consumabile, Barmani, Transport și combustibil, Chirie, Echipamente, Marketing, Taxe și impozite, Contabilitate, Utilități și telefon, Altele"),
      data:S("string","AAAA-LL-ZZ, implicit azi"),met:S("string","numerar, card sau transfer",{enum:["numerar","card","transfer"]}),nota:S("string","De la cine / pe ce")},required:["tip","suma"]})},
  {name:"bani_luna",description:"Cât s-a încasat, cât s-a cheltuit și cât a rămas într-o lună (din secțiunea Bani).",
    parameters:S("object","",{properties:{luna:S("string","AAAA-LL, implicit luna curentă")}})},
  {name:"saptamana_mea",description:"Rezumatul săptămânii (ca emailul de luni): ce e urgent, evenimentele săptămânii cu echipa și confirmările, avansurile și diferențele neîncasate, cererile de ofertă care așteaptă răspuns sau revenire, ce lipsește din stoc. Folosește-o pentru „ce am de făcut săptămâna asta”, „ce e urgent”, „pe cine trebuie să sun”, „cine așteaptă răspuns”.",
    parameters:S("object","",{properties:{}})},
  {name:"necesar_client",description:"Calculează NECESARUL pentru un client: ce băuturi și consumabile trebuie să cumpere clientul pentru un număr de persoane (lista de trimis clientului, PDF sau WhatsApp). NU creează eveniment și nu face fișă. Folosește-o pentru „necesar pentru 20 de persoane”, „fă-mi un necesar”, „ce trebuie să cumpere clientul pentru…”.",
    parameters:S("object","",{properties:{pers:S("string","Număr persoane"),client:S("string","Numele clientului sau al evenimentului (opțional)"),data:S("string","Data evenimentului AAAA-LL-ZZ (opțional)"),
      meniu:S("array","Cocktailurile alese de client (opțional)",{items:S("string","")}),nota:S("string","Notă pentru client (opțional)")},required:["pers"]})},
  {name:"eveniment_nou",description:"Deschide fișa de marfă (Excelul săptămânii) pentru un eveniment NOU al firmei, completată cu ce a spus utilizatorul. Nu o folosi pentru necesarul unui client.",
    parameters:S("object","",{properties:{nume:S("string","Numele evenimentului"),data:S("string","AAAA-LL-ZZ"),ora:S("string","HH:MM"),pers:S("string","Număr persoane"),
      echipa:S("string","Barmanii, separați prin spațiu"),transport:S("string","Transport"),note:S("string","Mențiuni")}})}
];

function evData(){try{const e=window.__cp.evd();return e&&e.aoa?window.__cp.parseAOA(e.aoa,e.fileName):null}catch(x){return null}}
let ctCache=null,ctAt=0;
async function ctList(){
  if(!F.isAdmin)throw new Error("Contractele le vede doar administratorul. Intră ca administrator din josul paginii.");
  if(!ctCache||Date.now()-ctAt>60000){ctAt=Date.now();const s=await F.fs.collection(`${F.base}/contracte`).get();ctCache=s.docs.map(d=>({...d.data(),id:d.id}))}
  return ctCache;
}
const LBL={nume:"numele",tel:"telefonul",dataEv:"data",oraEv:"ora",locatie:"locația",invitati:"invitații",pret:"prețul",moneda:"moneda",unitate:"unitatea",avans:"avansul",monedaAvans:"moneda avansului",dataRest:"data diferenței",obiect:"serviciul"};
const niceDay=d=>{const x=new Date(String(d)+"T12:00");return isNaN(x)?String(d):x.toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long"})};
const errMsg=e=>String(e&&(e.msg||e.message)||e);
function ctAPI(){if(!F.isAdmin||!window.__ctAPI)throw new Error("Contractele și calendarul le folosește doar administratorul. Intră ca administrator din josul paginii.");return window.__ctAPI}
function clean(a){const o={};Object.entries(a||{}).forEach(([k,v])=>{if(v!=null&&String(v).trim())o[k]=String(v).trim()});return o}
/* Pune contractul în calendar; dacă în ziua aceea există deja ceva, întreabă întâi (ca butonul „Drive + calendar”) */
async function toCalendar(c,choice){
  const A=ctAPI();await A.prep();
  if(!A.google()){VS.after=c.id;googleBtn();return {calendar:"neconectat",nota:"Google nu e conectat. I-am pus utilizatorului butonul „Conectează Google”; după ce apasă, pui contractul în calendar cu pune_in_calendar."}}
  try{
    if(!choice&&!c.calId){const L=await A.dayEvents(c.dataEv);if(L.length)return {calendar:"de_ales",in_ziua_aceea:L,nota:"Întreabă utilizatorul dacă completez unul dintre acestea sau fac eveniment nou, apoi cheamă pune_in_calendar."}}
    const t=choice&&choice!=="nou"?choice:(choice==="nou"?null:c.calId||null);
    await A.calendar(c,t);ctCache=null;return {calendar:t?"completat":"adăugat"};
  }catch(e){return {calendar:"eroare",calendar_eroare:errMsg(e)}}
}
function googleBtn(){VS.open=true;VS.btn={label:"🔗 Conectează Google (calendar și Drive)",fn:()=>window.__ctAPI.connect().then(()=>{VS.btn=null;paint();send(VS.after?`Am conectat Google. Pune în calendar contractul ${VS.after}.`:"Am conectat Google. Continuă.","Am conectat Google.");VS.after=null},e=>{VS.btn=null;add("act",errMsg(e));paint()})};paint()}
const RUN={
  deschide_sectiune({sectiune}){
    const b=document.querySelector(`nav.tabs button[data-view="${sectiune}"]`);
    if(!b||getComputedStyle(b).display==="none")return {eroare:`Secțiunea ${TABS[sectiune]||sectiune} nu e disponibilă pentru acest cont.`};
    b.click();b.scrollIntoView({block:"nearest",inline:"center"});return {ok:true,deschis:TABS[sectiune]};
  },
  retete({nume}){
    const all=typeof R!=="undefined"&&Array.isArray(R)?R:[];
    if(!nume)return {retete:all.map(r=>({nume:r.name,fara_alcool:!!r.zero,baza:r.base}))};
    const L=all.filter(r=>has(r.name,nume)||has(r.base,nume)||(r.ing||[]).some(i=>has(i.n,nume)));
    return {gasite:L.map(r=>({nume:r.name,fara_alcool:!!r.zero,pahar:r.glass,tehnica:r.tech,
      ingrediente:(r.ing||[]).map(i=>`${i.q!=null?i.q+" ":""}${i.u} ${i.n}`),pasi:r.steps,garnitura:r.garnish}))};
  },
  evenimente({cauta,detalii}){
    const D=evData();if(!D)return {eroare:"Nu e încărcată nicio fișă de evenimente pentru săptămâna asta."};
    const L=D.events.filter(e=>!cauta||has(e.name,cauta)||e.team.some(t=>has(t,cauta)));
    return {saptamana:D.title&&D.title.big,evenimente:L.map(e=>{
      const o={nume:e.name,data:iso(e.date),ora:e.time||"",persoane:e.persons,echipa:e.team,transport:e.transport,mentiuni:e.notesRaw};
      if(detalii)o.marfa=D.items.filter(it=>e.values[it.key]).map(it=>`${it.label}: ${e.values[it.key].v}${e.values[it.key].note?" ("+e.values[it.key].note+")":""}`);
      return o})};
  },
  async stoc({articol,toate}){
    if(!window.__stocAll)return {eroare:"Stocul nu e disponibil."};
    const L=await window.__stocAll();
    if(articol)return {articole:L.filter(x=>has(x.articol,articol))};
    if(toate)return {articole:L};
    return {pe_terminate:L.filter(x=>x.disponibil<=2).sort((a,b)=>a.disponibil-b.disponibil).slice(0,40)};
  },
  async contracte({cauta,viitoare}){
    const t=iso(new Date());
    const L=(await ctList()).filter(c=>(!viitoare||(c.dataEv||"")>=t)&&(!cauta||has(c.nume,cauta)||has(c.locatie,cauta)||String(c.dataEv||"").startsWith(cauta)))
      .sort((a,b)=>String(a.dataEv).localeCompare(String(b.dataEv))).slice(0,30);
    return {contracte:L.map(c=>({contract_id:c.id,client:c.nume,tel:c.tel,data:c.dataEv,ora:c.oraEv,locatie:c.locatie,invitati:c.invitati,
      pret:`${c.pret} ${c.moneda} ${c.unitate||""}`.trim(),avans:c.avans?`${c.avans} ${c.monedaAvans}`:"",avans_incasat:!!c.avansPlatit,rest_incasat:!!c.restPlatit,data_rest:c.dataRest}))};
  },
  async marcheaza_incasare({contract_id,ce,incasat}){
    const c=(await ctList()).find(x=>x.id===contract_id);if(!c)return {eroare:"Nu găsesc contractul. Caută-l întâi cu funcția contracte."};
    const what=ce==="avans"?"avansul":"diferența";
    if(!await confirmUI(`Marchez ${what} de la ${c.nume}${c.dataEv?", evenimentul din "+new Date(c.dataEv+"T12:00").toLocaleDateString("ro-RO",{day:"numeric",month:"long"}):""}, ca ${incasat?"încasat":"neîncasat"}?`))return {anulat:"Utilizatorul a spus nu. Nu s-a salvat nimic."};
    await F.fs.doc(`${F.base}/contracte/${c.id}`).set({[ce==="avans"?"avansPlatit":"restPlatit"]:!!incasat},{merge:true});
    ctCache=null;return {ok:true,salvat:`${what} ${incasat?"încasat":"neîncasat"}`};
  },
  async adauga_eveniment(a){
    const A=ctAPI(),pre=clean(a);delete pre.calendar;
    if(!pre.nume||!pre.dataEv)return {eroare:"Am nevoie de numele clientului și de data evenimentului."};
    const zi=niceDay(pre.dataEv);
    if(!await confirmUI(`Adaug evenimentul lui ${pre.nume}, ${zi}${pre.oraEv?" la "+pre.oraEv:""}${pre.locatie?", la "+pre.locatie:""}${pre.invitati?", "+pre.invitati+" invitați":""}: salvez contractul și îl pun în calendar?`))
      return {anulat:"Utilizatorul a spus nu. Nu s-a salvat nimic."};
    const c=await A.create(pre);ctCache=null;
    const out={ok:true,contract_id:c.id,contract:"salvat",lipsesc_din_contract:A.missing(c)};
    Object.assign(out,await toCalendar(c,a.calendar));
    A.open(c.id,c);
    if(!out.lipsesc_din_contract.length&&out.calendar==="adăugat"){try{out.drive=await A.drive(c)}catch(e){out.drive_eroare=errMsg(e)}}
    out.urmatorul_pas=out.lipsesc_din_contract.length?"Contractul e deschis pe ecran. Pentru PDF trebuie completate câmpurile care lipsesc (datele din buletin se pot citi din poza buletinului, butonul de foto din formular); apoi pot pune PDF-ul în Drive cu contract_drive.":"Contractul e complet.";
    return out;
  },
  async calendar_zi({data}){
    const A=ctAPI();await A.prep();
    if(!A.google()){googleBtn();return {eroare:"Google nu e conectat. I-am pus utilizatorului butonul „Conectează Google” în panou."}}
    return {data,evenimente:await A.dayEvents(data)};
  },
  async pune_in_calendar({contract_id,calendar}){
    const A=ctAPI(),c=A.get(contract_id)||(await ctList()).find(x=>x.id===contract_id);if(!c)return {eroare:"Nu găsesc contractul."};
    return toCalendar(c,calendar);
  },
  async modifica_contract(a){
    const A=ctAPI(),c=(await ctList()).find(x=>x.id===a.contract_id);if(!c)return {eroare:"Nu găsesc contractul. Caută-l întâi cu funcția contracte."};
    const p=clean(a);delete p.contract_id;if(!Object.keys(p).length)return {eroare:"Nu ai spus ce se schimbă."};
    if(p.nume||p.locatie||p.obiect)["nume","locatie","obiect"].forEach(k=>{if(p[k])p[k]=p[k].toUpperCase()});
    if(!await confirmUI(`Schimb la contractul lui ${c.nume}: ${Object.entries(p).map(([k,v])=>`${LBL[k]||k} ${k==="dataEv"||k==="dataRest"?niceDay(v):v}`).join(", ")}?`))return {anulat:"Nu s-a schimbat nimic."};
    const n=await A.update(c.id,p);ctCache=null;const out={ok:true,salvat:p};
    if(n.calId&&A.google()&&n.dataEv){try{await A.calendar(n,n.calId);out.calendar="actualizat"}catch(e){out.calendar_eroare=errMsg(e)}}
    return out;
  },
  async contract_drive({contract_id}){
    const A=ctAPI();await A.prep();const c=A.get(contract_id);if(!c)return {eroare:"Nu găsesc contractul."};
    const m=A.missing(c);if(m.length){A.open(c.id);return {eroare:"Contractul nu e complet",lipsesc:m,deschis:"Am deschis contractul pe ecran ca să fie completat."}}
    if(!A.google()){googleBtn();return {eroare:"Google nu e conectat. I-am pus utilizatorului butonul „Conectează Google” în panou."}}
    return {ok:true,fisier_drive:await A.drive(c),calendar:"PDF atașat la eveniment"};
  },
  async deschide_contract({contract_id}){const A=ctAPI();await A.prep();if(!A.get(contract_id))return {eroare:"Nu găsesc contractul."};A.open(contract_id);hidePanel();return {ok:true}},
  async descarca_pdf({contract_id}){const A=ctAPI();await A.prep();const c=A.get(contract_id);if(!c)return {eroare:"Nu găsesc contractul."};
    const m=A.missing(c);if(m.length)return {eroare:"Contractul nu e complet",lipsesc:m};await A.pdf(contract_id);return {ok:true}},
  async notita_contract({contract_id,text}){const A=ctAPI();await A.prep();if(!A.get(contract_id))return {eroare:"Nu găsesc contractul."};await A.addNote(contract_id,text);return {ok:true}},
  async disponibilitate({data}){if(!window.__dispFor)return {eroare:"Disponibilitatea nu e disponibilă."};const r=await window.__dispFor(data);return {data,disponibili:r.ok,indisponibili:r.no}},
  async noteaza_bani(a){if(!F.isAdmin)return {eroare:"Banii îi vede doar administratorul."};if(!window.__bani)return {eroare:"Secțiunea Bani nu e disponibilă."};
    try{const x=await window.__bani.add(a||{});return {ok:true,notat:x}}catch(e){return {eroare:"Nu am putut nota. Spune suma."}}},
  async bani_luna(a){if(!F.isAdmin)return {eroare:"Banii îi vede doar administratorul."};if(!window.__bani)return {eroare:"Secțiunea Bani nu e disponibilă."};return await window.__bani.month(a&&a.luna)},
  async saptamana_mea(){if(!F.isAdmin)return {eroare:"Rezumatul îl vede doar administratorul."};if(!window.__rez)return {eroare:"Rezumatul nu e disponibil."};
    const R=window.__rez.calc(),C=window.CPCore;
    return {saptamana:C.intervalText(R.sapt),prioritati:R.prioritati,
      evenimente:R.evenimente.map(e=>({nume:e.nume,zi:C.ziSiData(e.data),ora:e.ora,invitati:e.invitati,semnat:e.semnat,avans_incasat:e.avans,echipa:e.echipa?e.echipa.map(m=>m.nume+(m.conf==="da"?" (a confirmat)":m.conf==="nu"?" (nu poate)":" (nu a răspuns)")):"lipsă"})),
      avansuri_neincasate:R.avans.map(a=>({nume:a.nume,eveniment:C.dataLunga(a.data),suma:a.suma})),diferente_neincasate:R.rest.map(r=>({nume:r.nume,intarziata:r.intarziat})),
      cereri_de_urmarit:R.cereri.deFacut.map(c=>({nume:c.nume,ce:c.eticheta})),stoc_lipsa:R.stoc.lipsa.slice(0,10),saptamana_viitoare:R.viitoare.map(v=>v.nume+" "+C.dataScurta(v.data))}},
  async necesar_client(a){
    if(!F.isAdmin)return {eroare:"Necesarul pentru clienți îl face doar administratorul."};
    if(!window.__necNew)return {eroare:"Necesarul nu e disponibil."};
    const L=await window.__necNew(a||{});hidePanel();
    return {ok:true,deschis:"Necesarul pentru client, calculat. Utilizatorul îl verifică și apasă „PDF pentru client” sau „Copiază pentru WhatsApp”.",articole:L.slice(0,40)};
  },
  eveniment_nou(a){
    if(!F.isAdmin)return {eroare:"Fișele de eveniment le face doar administratorul."};
    if(!window.__evNew)return {eroare:"Fișa de eveniment nu e disponibilă."};
    window.__evNew({...(a||{})});hidePanel();return {ok:true,deschis:"Fișa de eveniment nou, completată. Utilizatorul adaugă marfa și salvează."};
  }
};

RUN.inchide_conversatia=()=>{if(VS.live){VS.live.closeAfter=true;VS.live.closeAt=Date.now()}return {ok:true}};

/* Funcțiile care scriu în baza de date și cer confirmarea (în conversația live cu parametrul „confirmat”) */
const CONF=["marcheaza_incasare","adauga_eveniment","modifica_contract"];
function decls(live){
  if(!live)return DECL;
  return DECL.map(d=>CONF.includes(d.name)?{...d,parameters:{...d.parameters,properties:{...d.parameters.properties,
    confirmat:S("boolean","true DOAR după ce utilizatorul a spus da la întrebarea primită în trebuie_confirmare")}}}:d)
    .concat([{name:"inchide_conversatia",description:"Închide conversația vocală când utilizatorul își ia la revedere („gata”, „mulțumesc, atât”, „pa”).",parameters:S("object","",{properties:{}})}]);
}

function zile(){const o=[];for(let i=0;i<14;i++){const d=new Date();d.setDate(d.getDate()+i);o.push(`${d.toLocaleDateString("ro-RO",{weekday:"long"})} ${iso(d)}`)}return o.join(", ")}
function sysPrompt(live){
  const z=new Date().toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const hist=live?VS.msgs.filter(m=>m.who!=="act"&&m.text).slice(-12).map(m=>(m.who==="eu"?"Utilizatorul: ":"Sofia: ")+m.text).join("\n"):"";
  return `Ești Sofia, asistenta vocală a firmei Cocktail Philosophy (catering de cocktailuri și barmani la evenimente, Sibiu).
Vorbești cu ${F.NAME||"un coleg"}${F.isAdmin?", administratorul (Paul)":", un membru al echipei"}. Azi este ${z} (${iso(new Date())}).
Reguli:
- Răspunzi DOAR în limba română, scurt și natural, ca într-o conversație la telefon: una-trei propoziții, vorbite, cu cuvinte de zi cu zi („gata”, „am pus”, „mai ai”), fără formulări de robot ca „Am efectuat operațiunea”. Fără markdown, liste cu steluțe sau emoji; textul tău e citit cu voce tare.${live?`
- Vorbești ca un vorbitor nativ de română, cu accent românesc. Vocea ta e caldă, zâmbitoare și relaxată, ca a unei colege prietenoase care te ajută la telefon: fluent, legat, în ritm firesc de conversație, cu intonație vie, fără pauze lungi și fără ton de robot sau de prezentator.
- Vorbești ca un om, nu citești: „deci”, „perfect”, „aha, stai să văd”, „uite”; nu începi fiecare răspuns la fel și nu repeți întrebarea. Cifrele și datele le spui cum le-ar spune cineva la telefon („pe sâmbătă, 14”, „vreo douăzeci de sticle”).
- Numele cocktailurilor le spui cum se spun la bar. Nu trece în altă limbă.
- Dacă utilizatorul te întrerupe, te oprești și asculți. Nu repeta ce ai spus deja.`:""}
- Pentru orice întrebare despre rețete, evenimente, stoc sau contracte chemi funcțiile; nu inventa date. Dacă o funcție dă eroare, spui pe scurt de ce.
- Când ți se cere o acțiune, o faci direct cu funcția potrivită, apoi confirmi într-o propoziție ce ai făcut.
- Datele le dai ca „sâmbătă, 14 noiembrie”, nu AAAA-LL-ZZ. Sumele cu moneda.
- Dacă lipsește o informație absolut necesară, pune o singură întrebare scurtă.
- „Adaugă un eveniment / am o nuntă pe… / fă contract pentru…” = adauga_eveniment, care face tot: salvează contractul, îl pune în calendar și îl deschide pe ecran. Ai nevoie minim de numele clientului și de dată; restul (oră, locație, invitați, preț, avans, telefon) le treci dacă au fost spuse, nu le ceri pe toate.${live?"":" Nu pune tu confirmarea, o cere funcția."}${live?`
- Confirmarea: funcțiile care salvează (adauga_eveniment, modifica_contract, marcheaza_incasare) răspund prima dată cu „trebuie_confirmare”. Atunci pui exact întrebarea aceea, scurt, și aștepți. Doar dacă utilizatorul spune da, chemi din nou aceeași funcție cu aceleași argumente și confirmat=true. Dacă spune nu, spui că ai renunțat. Nu pune niciodată confirmat=true fără un „da” de la utilizator.
- Când utilizatorul își ia la revedere („gata”, „mulțumesc, atât”, „pa”), îi răspunzi într-o propoziție și chemi inchide_conversatia.`:""}
- Dacă funcția răspunde că în ziua aceea există deja evenimente în calendar, i le spui pe scurt și întrebi dacă completezi unul dintre ele sau faci unul nou; apoi pune_in_calendar.
- După adăugare spui ce lipsește din contract pentru PDF (de obicei datele din buletin: „fă o poză buletinului în formular”).
- Prețurile uzuale: dacă utilizatorul spune „euro de persoană”, moneda EURO și unitatea „/ PERSOANĂ”.
- Zilele următoare, ca să calculezi corect datele: ${zile()}.
- „Ce am de făcut săptămâna asta / ce e urgent / cine așteaptă răspuns” = saptamana_mea. Răspunde scurt: întâi prioritățile, apoi doar ce întreabă.
- „Necesar pentru N persoane / fă-mi un necesar / ce trebuie să cumpere clientul” = necesar_client (doar lista pentru client). NU folosi eveniment_nou sau adauga_eveniment pentru asta.
- Liste lungi (multe evenimente, multe articole): spui doar primele câteva și întrebi dacă vrea restul.
- Poți face și calcule (cantități pentru un număr de invitați, sume, rest de plată) pe baza datelor din funcții.${hist?`

Conversația de până acum (continu-o, nu o lua de la capăt):
${hist}`:""}`;
}

/* Ce face Sofia acum (pe ecran, cât lucrează) și ce a făcut (în conversație) */
const DOING={deschide_sectiune:"Deschid secțiunea",retete:"Caut în rețetar",evenimente:"Citesc evenimentele",stoc:"Verific stocul",contracte:"Caut în contracte",
  marcheaza_incasare:"Marchez încasarea",adauga_eveniment:"Adaug evenimentul",calendar_zi:"Mă uit în calendar",pune_in_calendar:"Pun în calendar",modifica_contract:"Modific contractul",
  contract_drive:"Pun PDF-ul în Drive",deschide_contract:"Deschid contractul",descarca_pdf:"Descarc PDF-ul",notita_contract:"Salvez notița",disponibilitate:"Verific disponibilitatea",
  noteaza_bani:"Notez în Bani",bani_luna:"Calculez banii lunii",saptamana_mea:"Fac rezumatul săptămânii",necesar_client:"Calculez necesarul",eveniment_nou:"Deschid fișa nouă",inchide_conversatia:"Închei"};
const DONE={deschide_sectiune:"Am deschis secțiunea",retete:"Am căutat în rețetar",evenimente:"Am citit evenimentele",stoc:"Am verificat stocul",contracte:"Am citit contractele",
  marcheaza_incasare:"Încasare",adauga_eveniment:"Eveniment nou",calendar_zi:"Am citit calendarul",pune_in_calendar:"Calendar",modifica_contract:"Contract modificat",
  contract_drive:"PDF în Drive",deschide_contract:"Am deschis contractul",descarca_pdf:"PDF descărcat",notita_contract:"Notiță salvată",disponibilitate:"Am verificat disponibilitatea",
  noteaza_bani:"Notat în Bani",bani_luna:"Am calculat luna",saptamana_mea:"Rezumatul săptămânii",necesar_client:"Necesar calculat",eveniment_nou:"Am deschis fișa nouă"};
function note(name,out){
  if(name==="inchide_conversatia")return;
  add("act",(DONE[name]||name)+(out&&out.eroare?" · nu a mers":out&&out.anulat?" · anulat":" ✓"));
}
function setStatus(t){VS.status=t;paintState()}

/* ---------- Modul cu vocea telefonului: Gemini cu răspuns în flux ---------- */
const badModel=e=>/not.?found|404|unsupported|is not available|invalid.*model/i.test(String(e&&e.message));
function newChat(aiM,ai,m){
  const model=aiM.getGenerativeModel(ai,{model:m,systemInstruction:sysPrompt(false),tools:[{functionDeclarations:decls(false)}],generationConfig:{temperature:0.3}});
  return model.startChat();
}
/* Trimite și dă textul pe bucăți, pe măsură ce vine (Sofia începe să vorbească de la prima propoziție) */
async function streamOnce(chat,msg,onText){
  const r=await chat.sendMessageStream(msg);
  for await(const ch of r.stream){let t="";try{t=ch.text()}catch(e){}if(t)onText(t)}
  return await r.response;
}
/* Prima întrebare încearcă modelele pe rând (ca la facturi); după aceea conversația rămâne pe modelul care a mers */
async function first(msg,onText){
  const X=window.__cpAI;if(!X||!X.ready())throw new Error("Asistentul are nevoie de serviciul AI al aplicației (cel de la facturi), care nu e configurat.");
  const {aiM,ai}=await X.loadAI();
  let last;
  for(const m of (VS.model?[VS.model]:X.models)){
    const chat=newChat(aiM,ai,m);
    try{const r=await streamOnce(chat,msg,onText);VS.model=m;VS.chat=chat;return r}
    catch(e){last=e;if(!badModel(e))throw e}
  }
  throw last;
}
async function ask(text,onText){
  let res=VS.chat?await streamOnce(VS.chat,text,onText):await first(text,onText);
  const chat=VS.chat;
  for(let i=0;i<6;i++){
    const calls=res.functionCalls&&res.functionCalls();
    if(!calls||!calls.length)break;
    const parts=[];
    for(const c of calls){
      setStatus(DOING[c.name]?DOING[c.name]+"…":"Lucrez…");
      let out;
      try{out=RUN[c.name]?await RUN[c.name](c.args||{}):{eroare:"Funcție necunoscută."}}
      catch(e){out={eroare:errMsg(e)}}
      note(c.name,out);setStatus("Mă gândesc…");
      parts.push({functionResponse:{name:c.name,response:out}});
    }
    res=await streamOnce(chat,parts,onText);
  }
}

/* ---------- Vocea telefonului: coadă de propoziții ---------- */
/* Vocea: cea mai naturală voce românească de pe dispozitiv (cele „Natural/Online/Enhanced/Premium” sunt neuronale), viteza aleasă de utilizator */
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
VS.rate=+LS.get("cp-voce-viteza","1.2")||1.2;
VS.conv=LS.get("cp-voce-conv","1")!=="0";
const vScore=v=>(/natural|neural|online/i.test(v.name)?40:0)+(/premium|enhanced|îmbunătățit/i.test(v.name)?30:0)+(/google/i.test(v.name)?20:0)+(/ioana|alina|emil/i.test(v.name)?10:0)+(v.localService?0:5);
function roVoices(){return "speechSynthesis" in window?speechSynthesis.getVoices().filter(v=>/^ro/i.test(v.lang)).sort((a,b)=>vScore(b)-vScore(a)):[]}
function pickVoice(){
  const V=roVoices(),want=LS.get("cp-voce-nume","");
  VS.voice=V.find(v=>v.name===want)||V[0]||null;paintVoices();
}
if("speechSynthesis" in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
/* Textul spus: fără simboluri citite literă cu literă, abrevieri pronunțate ca în vorbire */
function spoken(t){
  return String(t)
    .replace(/(\d+(?:[.,]\d+)?)\s*€/g,"$1 euro").replace(/€\s*(\d+(?:[.,]\d+)?)/g,"$1 euro").replace(/\bEUR(O)?\b/g,"euro").replace(/\bRON\b/g,"lei")
    .replace(/\bml\b/g,"mililitri").replace(/\bbuc\b\.?/g,"bucăți").replace(/\bnr\.\s*/gi,"numărul ").replace(/\bstr\.\s*/gi,"strada ")
    .replace(/(\d{1,2}):00\b/g,"$1").replace(/(\d)\.(\d{3})\b/g,"$1$2")
    .replace(/\s*[–—]\s*/g,", ").replace(/[()"„”«»*_#`]/g,"").replace(/\s+/g," ").trim();
}
const SQ={q:[],run:false,w:[]};
function speakOne(t){
  return new Promise(res=>{
    const u=new SpeechSynthesisUtterance(t);u.lang="ro-RO";if(VS.voice)u.voice=VS.voice;u.rate=VS.rate;u.pitch=1.05;
    let done=false;const fin=()=>{if(done)return;done=true;clearInterval(k);res()};
    u.onend=u.onerror=fin;speechSynthesis.speak(u);
    const k=setInterval(()=>{if(!speechSynthesis.speaking&&!speechSynthesis.pending)fin()},400);   // unele telefoane nu trimit „onend”
  });
}
async function pump(){
  SQ.run=true;paintState();
  while(SQ.q.length)await speakOne(SQ.q.shift());
  SQ.run=false;paintState();const w=SQ.w;SQ.w=[];w.forEach(f=>f());
}
function sayQ(t){if(!VS.talk||!("speechSynthesis" in window))return;t=spoken(t);if(!t)return;SQ.q.push(t);if(!SQ.run)pump()}
const speechIdle=()=>new Promise(r=>SQ.run?SQ.w.push(r):r());
function shush(){SQ.q.length=0;if("speechSynthesis" in window)speechSynthesis.cancel()}
function speak(t){shush();sayQ(t);return speechIdle()}
function paintVoices(){
  const sel=document.getElementById("vcVoice");if(!sel)return;
  const V=roVoices();sel.disabled=V.length<2;
  sel.innerHTML=V.length?V.map(v=>`<option value="${esc(v.name)}" ${VS.voice&&v.name===VS.voice.name?"selected":""}>${esc(v.name.replace(/\s*\(.*?\)\s*/g," ").replace(/Microsoft|Google/,"").trim()||v.name)}</option>`).join(""):`<option>vocea implicită</option>`;
}

/* ---------- Ascultarea (modul cu vocea telefonului) ---------- */
/* Ascultă până taci vreo 1,5 secunde, nu doar până la prima pauză. Pe Android, rezultatele finale se pot repeta cumulat: le unim fără dubluri. */
function merge(finals){
  let out="";
  for(const f of finals){const fo=fold(f),oo=fold(out);
    if(!oo||fo.startsWith(oo))out=f;else if(!oo.endsWith(fo))out+=" "+f}
  return out;
}
function listen(o={}){
  return new Promise((res,rej)=>{
    if(!SR){rej(new Error("nosr"));return}
    shush();
    const r=new SR();VS.rec=r;r.lang="ro-RO";r.interimResults=true;r.maxAlternatives=1;r.continuous=true;
    let fin="",interim="",t=null,ended=false;
    const arm=ms=>{clearTimeout(t);t=setTimeout(()=>{try{r.stop()}catch(e){}},ms)};
    const end=()=>{if(ended)return false;ended=true;clearTimeout(t);VS.listening=false;VS.rec=null;VS.heard="";paintState();return true};
    arm(o.wait||8000);   // cât așteaptă să începi să vorbești
    r.onresult=e=>{
      const finals=[];interim="";
      for(let i=0;i<e.results.length;i++){const x=e.results[i],s=(x[0]&&x[0].transcript||"").trim();if(!s)continue;if(x.isFinal)finals.push(s);else interim=s}
      fin=merge(finals);VS.heard=(fin+" "+interim).trim();paintState();arm(o.pause||1500);
    };
    r.onerror=e=>{if(e.error==="not-allowed"||e.error==="service-not-allowed"){end();rej(new Error("mic"))}};
    r.onend=()=>{if(end())res((fin+" "+interim).trim())};
    VS.listening=true;VS.heard="";paintState();
    try{r.start()}catch(e){end();rej(e)}
  });
}
function stopListen(){if(VS.rec)try{VS.rec.stop()}catch(e){}}
const yesNo=t=>{t=fold(t);if(!t)return null;
  if(/\b(nu|anuleaza|anulez|stai|renunt|renunta|lasa|opreste|gresit)\b/.test(t))return false;
  if(/\b(da|sigur|confirm|confirma|ok|okay|bine|corect|exact|perfect|salveaza)\b/.test(t))return true;return null};
const STOP=/^(gata|multumesc|mersi|pa|la revedere|stop|ajunge|atat|asta e tot|nimic)\b/;

/* ---------- Confirmarea scrierilor ---------- */
function confirmUI(q){
  if(VS.live)return liveConfirm(q);
  return new Promise(async res=>{
    VS.ask={q,res:v=>{if(!VS.ask)return;VS.ask=null;stopListen();paint();res(v)}};add("ai",q);paint();
    await speak(q+" Spune da sau nu.");
    for(let i=0;i<2&&VS.ask&&SR;i++){
      let t="";try{t=await listen({wait:7000,pause:1000})}catch(e){break}
      if(!VS.ask)return;
      const v=yesNo(t);if(v!=null){VS.ask.res(v);return}
      if(!t)break;
      if(i===0)await speak("Nu am înțeles. Da sau nu?");
    }
  });
}
/* În conversația live funcția nu poate aștepta: răspunde cu întrebarea, Sofia o pune, iar a doua chemare (confirmat=true) trece
   doar dacă utilizatorul chiar a spus „da” (din ce s-a auzit) sau a apăsat Da. */
function liveConfirm(q){
  const c=VS.liveCall||{},P=VS.pend,again=c.args&&c.args.confirmat===true&&P&&P.q===q;
  if(again&&(P.yes||P.no)){VS.pend=null;VS.ask=null;paint();return Promise.resolve(!!P.yes&&!P.no)}
  VS.pend={q,heard:"",yes:false,no:false};
  VS.ask={q,res:v=>{const p=VS.pend;if(!p)return;p.yes=!!v;p.no=!v;VS.ask=null;paint();liveText(v?"Da, confirm.":"Nu, renunță.")}};
  paint();
  const e=new Error("confirmare");e.needConfirm=true;e.q=q;return Promise.reject(e);
}

/* ---------- Conversația live: Gemini Live, voce naturală, în timp real ---------- */
/* „Motorul” vocii: serverul alege modelul Live cel mai nou („rapid”) sau unul cu audio nativ („expresiv”) */
const ENGINES={nou:"Cel mai nou Gemini Live · rapid",expresiv:"Gemini audio nativ · expresiv"};
const LIVE_VOICES={Sulafat:"Sulafat · caldă",Aoede:"Aoede · lejeră",Kore:"Kore · fermă",Leda:"Leda · tânără",Despina:"Despina · catifelată",Achernar:"Achernar · blândă",Zephyr:"Zephyr · luminoasă",Vindemiatrix:"Vindemiatrix · delicată"};
VS.mode=LS.get("cp-voce-mod","live");
VS.duplex=LS.get("cp-voce-dup","auto");
VS.engine=LS.get("cp-voce-motor","nou");if(!ENGINES[VS.engine])VS.engine="nou";
VS.lvoice=LS.get("cp-voce-live","Sulafat");if(!LIVE_VOICES[VS.lvoice])VS.lvoice="Sulafat";
const liveOK=()=>!!((window.AudioContext||window.webkitAudioContext)&&window.AudioWorkletNode&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.WebSocket);
/* Când Live nu poate porni din cauza configurării (server neinstalat, acces, cheie), nu mai încearcă 6 ore:
   Sofia pornește direct pe vocea telefonului și spune o dată de ce. „🔊 Ascult-o” sau schimbarea vocii încearcă din nou. */
const OFF_MS=6*3600e3;
function liveOff(){try{const o=JSON.parse(LS.get("cp-voce-live-off","null"));return o&&Date.now()-o.at<OFF_MS?o:null}catch(e){return null}}
const setLiveOff=motiv=>LS.set("cp-voce-live-off",JSON.stringify({at:Date.now(),motiv}));
const clearLiveOff=()=>{VS.liveBroken=false;try{localStorage.removeItem("cp-voce-live-off")}catch(e){}};
const useLive=()=>VS.mode==="live"&&liveOK()&&!VS.liveBroken&&!liveOff();
const IDLE_MS=45000;   // după 45 de secunde de liniște conversația se închide singură (microfonul deschis costă)
/* Microfonul: 16 kHz, PCM pe 16 biți, bucăți de 100 ms (media pe fereastră ca filtru simplu înainte de reeșantionare) */
const WK=`class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.b=new Int16Array(1600);this.n=0;this.a=0;this.s=0;this.c=0;this.q=0}
process(i){const ch=i[0]&&i[0][0];if(!ch)return true;
for(let k=0;k<ch.length;k++){this.s+=ch[k];this.c++;this.a+=1;if(this.a>=this.r){this.a-=this.r;let v=this.s/this.c;this.s=0;this.c=0;v=v<-1?-1:v>1?1:v;
this.q+=v*v;this.b[this.n++]=v<0?v*32768:v*32767;if(this.n===1600){this.port.postMessage({b:this.b.buffer,r:Math.sqrt(this.q/1600)},[this.b.buffer]);this.b=new Int16Array(1600);this.n=0;this.q=0}}}
return true}}registerProcessor("cp-mic",P)`;
function b64(buf){const u=new Uint8Array(buf);let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)}
const pnow=L=>(L.pctx||L.ctx).currentTime;
const playing=L=>!!L&&pnow(L)<L.playEnd-0.05;
/* Ecoul pe difuzor: telefonul anulează ecoul doar pentru sunetul „de apel”. Vocea Sofiei trece deci printr-o legătură WebRTC
   locală (două RTCPeerConnection în pagină) și se aude dintr-un <audio>, ca un apel; dacă nu merge, se aude direct. */
async function loopback(ctx){
  if(!window.RTCPeerConnection)return null;
  const a=new RTCPeerConnection(),b=new RTCPeerConnection(),el=new Audio(),dest=ctx.createMediaStreamDestination();
  const close=()=>{try{a.close();b.close()}catch(e){}el.srcObject=null};
  try{
    a.onicecandidate=e=>e.candidate&&b.addIceCandidate(e.candidate).catch(()=>{});
    b.onicecandidate=e=>e.candidate&&a.addIceCandidate(e.candidate).catch(()=>{});
    const got=new Promise(r=>b.ontrack=e=>r(e.streams[0]||new MediaStream([e.track])));
    dest.stream.getTracks().forEach(t=>a.addTrack(t,dest.stream));
    const hq=d=>{const m=d.sdp.match(/a=rtpmap:(\d+) opus\/48000/i);if(!m)return d;
      const want={maxaveragebitrate:"128000",maxplaybackrate:"48000",useinbandfec:"1",usedtx:"0",stereo:"0"},re=new RegExp("a=fmtp:"+m[1]+" ([^\\r\\n]*)");
      const merge=old=>{const o={};String(old||"").split(";").forEach(x=>{const [k,v]=x.split("=");if(k&&k.trim())o[k.trim()]=v});Object.assign(o,want);return Object.entries(o).map(([k,v])=>v==null?k:k+"="+v).join(";")};
      const sdp=re.test(d.sdp)?d.sdp.replace(re,(_,old)=>"a=fmtp:"+m[1]+" "+merge(old)):d.sdp.replace(m[0],m[0]+"\r\na=fmtp:"+m[1]+" "+merge("minptime=10"));
      return {type:d.type,sdp}};
    const setL=async(pc,d)=>{try{await pc.setLocalDescription(hq(d))}catch(e){await pc.setLocalDescription(d)}return pc.localDescription};
    const o=await setL(a,await a.createOffer());await b.setRemoteDescription(o);
    const an=await setL(b,await b.createAnswer());await a.setRemoteDescription(an);
    try{const snd=a.getSenders()[0],pr=snd.getParameters();if(pr.encodings&&pr.encodings[0]){pr.encodings[0].maxBitrate=128000;await snd.setParameters(pr)}}catch(e){}
    const late=ms=>new Promise((_,j)=>setTimeout(()=>j(new Error("loopback")),ms));
    el.srcObject=await Promise.race([got,late(2500)]);el.autoplay=true;
    await Promise.race([new Promise(r=>{const ok=()=>a.connectionState==="connected"&&r();a.onconnectionstatechange=ok;ok()}),late(2500)]);
    await el.play();
    return {dest,close};
  }catch(e){console.warn("Sofia: fără anularea ecoului prin WebRTC",e);close();return null}
}
/* Cât vorbește Sofia (și încă puțin după), microfonul trimite liniște, ca ea să nu se audă singură și să se întrerupă.
   Dacă vorbești clar mai tare decât ecoul ei, microfonul se deschide (cu bucățile de dinainte, să nu se piardă începutul).
   În modul „doar prin atingere” rămâne închis până termină ea sau apeși „Întrerupe-o”. */
const ECHO_TAIL=0.5,SIL=b64(new Int16Array(1600).buffer);
function gate(L,r){
  const t=pnow(L);
  if(t>=L.playEnd+ECHO_TAIL){L.open=false;L.hot=0;L.pre=[];L.t0=null;return "on"}
  if(L.open)return "on";
  if(L.t0==null)L.t0=t;
  if(VS.duplex==="atingere")return "off";
  if(t-L.t0<0.4){L.floor=L.floor==null?r:Math.max(L.floor*0.85+r*0.15,r*0.5);return "off"}   // la început doar învață cât de tare e ecoul
  const thr=Math.max(0.05,(L.floor||0)*3.5);
  if(r>thr){if(++L.hot>=2){L.open=true;return "flush"}}
  else{L.hot=0;L.floor=L.floor==null?r:L.floor*0.85+r*0.15}
  return "off";
}
function micChunk(L,d){
  if(L.stopped||L.session.isClosed)return;
  const snd=x=>L.session.sendAudioRealtime({mimeType:"audio/pcm;rate=16000",data:x}).catch(()=>{});
  const data=b64(d.b),g=gate(L,d.r);
  if(g==="off"){L.pre.push(data);if(L.pre.length>4)L.pre.shift();snd(SIL);return}
  if(g==="flush"){L.pre.forEach(snd);L.pre=[]}
  snd(data);
}
/* „Întrerupe-o”: oprește vocea pe loc și ignoră restul răspunsului; microfonul se deschide imediat */
function interrupt(L){flushPlay(L);L.drop=true;L.open=true;paintState()}
function play(L,data){
  const bin=atob(data),n=bin.length>>1;if(!n)return;
  const P=L.pctx||L.ctx,buf=P.createBuffer(1,n,24000),ch=buf.getChannelData(0);
  for(let i=0;i<n;i++){let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);if(v>=32768)v-=65536;ch[i]=v/32768}
  const s=P.createBufferSource();s.buffer=buf;s.connect(L.out||P.destination);
  const now=P.currentTime,at=L.playEnd>now+0.01?L.playEnd:now+0.12;   // la începutul frazei, 120 ms de rezervă: bucățile care întârzie nu mai fac goluri
  s.start(at);L.playEnd=at+buf.duration;
  L.srcs.push(s);s.onended=()=>{L.srcs=L.srcs.filter(x=>x!==s)};
}
function flushPlay(L){L.srcs.forEach(s=>{try{s.stop(0)}catch(e){}});L.srcs=[];L.playEnd=0}
/* ---------- Biletul și conexiunea Live ---------- */
/* Biblioteca Firebase pentru web nu trimite App Check pe conexiunea Live (firebase-js-sdk#10018), iar proiectul îl cere.
   Așa că funcția sofiaLive (functions/) dă un bilet Gemini Live de unică folosință, cerut cu App Check și contul tău,
   iar Sofia se conectează direct la Gemini cu el. */
const LIVE_WS="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const fnURL=()=>`https://europe-west1-${F.cfg.projectId}.cloudfunctions.net/sofiaLive`;
const liveErr=(kind,detail)=>Object.assign(new Error(detail||kind),{kind});
async function ticket(fara){
  const X=window.__cpAI;
  if(!X||!X.ready())throw liveErr("acces","serviciul AI al aplicației nu e configurat");
  const {acM,appCheck}=await X.loadAI();
  const u=window.firebase&&firebase.auth().currentUser;if(!u)throw liveErr("acces","nu ești conectat");
  const [idt,ac]=await Promise.all([u.getIdToken(),acM&&appCheck?acM.getToken(appCheck,false).catch(()=>null):null]);
  const h={"Content-Type":"application/json",Authorization:"Bearer "+idt};if(ac&&ac.token)h["X-Firebase-AppCheck"]=ac.token;
  let r;
  try{r=await fetch(fnURL(),{method:"POST",headers:h,body:JSON.stringify({data:{echipa:String(F.base||"").split("/")[1]||"",motor:VS.engine,fara}})})}
  catch(e){throw liveErr(navigator.onLine===false?"retea":"neinstalat")}   // funcția lipsă răspunde fără CORS: fetch eșuează
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.result&&j.result.token)return j.result;
  const st=j.error&&j.error.status||"",m=j.error&&j.error.message||String(r.status);
  if(r.status===404||st==="NOT_FOUND"&&!/model/i.test(m))throw liveErr("neinstalat");
  if(st==="UNAUTHENTICATED"||st==="PERMISSION_DENIED"||r.status===401||r.status===403)throw liveErr(/app.?check/i.test(m)?"appcheck":"acces",m);
  if(st==="RESOURCE_EXHAUSTED")throw liveErr("limita",m);
  if(st==="FAILED_PRECONDITION")throw liveErr("cheie",m);
  throw liveErr("google",m);
}
/* O sesiune Live pe WebSocket, cu aceleași metode ca cea din biblioteca Firebase (le folosesc liveLoop și liveTools) */
function rawLive(url,setup){
  return new Promise((res,rej)=>{
    const ws=new WebSocket(url);ws.binaryType="arraybuffer";
    const q=[],td=new TextDecoder();let w=null,closed=false,ready=false;
    const wake=()=>{if(w){const f=w;w=null;f()}};
    const snd=o=>{if(ws.readyState!==1)return Promise.reject(new Error("închis"));ws.send(JSON.stringify(o));return Promise.resolve()};
    const S={isClosed:false,
      async *receive(){for(;;){if(q.length){yield q.shift();continue}if(closed)return;await new Promise(r=>w=r)}},
      sendAudioRealtime:b=>snd({realtimeInput:{audio:b}}),
      sendTextRealtime:t=>snd({realtimeInput:{text:t}}),
      sendFunctionResponses:r=>snd({toolResponse:{functionResponses:r}}),
      close:async()=>{S.isClosed=true;try{ws.close(1000)}catch(e){}}};
    ws.onopen=()=>ws.send(JSON.stringify({setup}));
    ws.onmessage=e=>{let m;try{m=JSON.parse(typeof e.data==="string"?e.data:td.decode(e.data))}catch(x){return}
      if(!ready){if(m.setupComplete){ready=true;res(S)}return}
      if(m.serverContent)q.push({type:"serverContent",...m.serverContent});
      else if(m.toolCall)q.push({type:"toolCall",...m.toolCall});
      else if(m.goAway)q.push({type:"goAway",...m.goAway});
      wake()};
    ws.onerror=()=>{};
    ws.onclose=e=>{closed=true;S.isClosed=true;
      if(!ready){const why=e.reason||("conexiune închisă, cod "+e.code);rej(liveErr(/app.?check/i.test(why)?"appcheck":/model|not found|not supported|unsupported/i.test(why)?"model":/api.?key/i.test(why)?"cheie":"google",why))}
      wake()};
  });
}
const liveSetup=model=>({model:"models/"+model,
  generationConfig:{temperature:0.9,responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:VS.lvoice}}}},
  systemInstruction:{parts:[{text:sysPrompt(true)}]},tools:[{functionDeclarations:decls(true)}],
  inputAudioTranscription:{},outputAudioTranscription:{}});
async function connectLive(){
  const fara=[];let last;
  for(let i=0;i<3;i++){
    const b=await ticket(fara);
    try{const s=await rawLive(LIVE_WS+"?access_token="+encodeURIComponent(b.token),liveSetup(b.model));VS.liveModel=b.model;return s}
    catch(e){last=e;console.warn("Sofia live",b.model,e);if(e.kind!=="model")break;fara.push(b.model)}   // model nepotrivit: cere bilet pentru altul
  }
  throw last;
}
/* Motivul pe înțeles și dacă e de configurare (atunci nu mai încearcă 6 ore) */
const LIVE_WHY={neinstalat:["serverul pentru conversația live nu e încă instalat (functions/README.md)",true],
  acces:["contul ăsta nu are acces la conversația live",true],appcheck:["Google a refuzat verificarea App Check",true],
  cheie:["cheia Gemini de pe server lipsește sau nu e bună",true],limita:["s-a atins limita de conversații live, pentru moment",false],
  retea:["nu e internet",false],model:["Google nu are acum un model live potrivit",false],google:["Google a refuzat conexiunea",false]};
function liveWhy(e){const [t,cfg]=LIVE_WHY[e&&e.kind]||["eroare neașteptată",false];return {text:t+(e&&e.kind&&e.message&&e.message!==e.kind&&!["neinstalat","retea"].includes(e.kind)?": "+String(e.message).slice(0,140):""),cfg}}
async function startLive(){
  if(VS.live||VS.liveStarting)return;
  const X=window.__cpAI;
  if(!X||!X.ready()){add("act","Asistentul are nevoie de serviciul AI al aplicației (cel de la facturi), care nu e configurat.");return}
  shush();stopListen();
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctx=new AC();   // creat chiar în atingere, altfel telefonul / Safari nu dau voie la sunet
  let pctx=null;try{pctx=new AC({sampleRate:24000})}catch(e){}   // vocea Sofiei vine la 24 kHz: o redăm exact așa
  const L={ctx,pctx,srcs:[],playEnd:0,last:Date.now(),uB:null,aB:null,stopped:false,pre:[],hot:0,open:false};
  VS.liveStarting=true;setStatus("Pornesc conversația…");paint();
  try{
    if(ctx.state==="suspended")await ctx.resume();
    if(pctx&&pctx.state==="suspended")await pctx.resume().catch(()=>{});
    const micP=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
    const [sess,stream]=await Promise.allSettled([connectLive(),micP]).then(r=>{
      if(r[1].status==="fulfilled")L.stream=r[1].value;if(r[0].status==="fulfilled")L.session=r[0].value;
      if(r[1].status==="rejected")throw r[1].reason;if(r[0].status==="rejected")throw r[0].reason;return [r[0].value,r[1].value]});
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WK],{type:"application/javascript"})));
    L.src=ctx.createMediaStreamSource(stream);L.node=new AudioWorkletNode(ctx,"cp-mic");
    const mute=ctx.createGain();mute.gain.value=0;L.src.connect(L.node);L.node.connect(mute);mute.connect(ctx.destination);
    L.node.port.onmessage=e=>micChunk(L,e.data);
    L.loop=await loopback(pctx||ctx);if(L.loop)L.out=L.loop.dest;
    if(!VS.liveStarting)throw new Error("oprit");
    VS.live=L;VS.liveStarting=false;VS.status="";
    L.tick=setInterval(()=>liveTick(L),500);
    liveLoop(L);paint();
  }catch(e){
    VS.liveStarting=false;VS.status="";
    try{L.stream&&L.stream.getTracks().forEach(t=>t.stop())}catch(x){}try{ctx.close()}catch(x){}try{L.session&&L.session.close()}catch(x){}
    const mic=e&&(e.name==="NotAllowedError"||e.name==="SecurityError");
    if(mic){add("act","Nu am acces la microfon. Permite microfonul pentru această pagină din setările browserului.");paint();return}
    if(e&&e.message==="oprit"){paint();return}
    console.warn("Sofia live",e);VS.liveBroken=true;
    const w=liveWhy(e);if(w.cfg)setLiveOff(w.text);
    add("act","Conversația live nu a pornit: "+w.text+". Folosesc vocea telefonului.");paint();
    if(SR)talkTurn();
  }
}
function stopLive(msg){
  const L=VS.live;
  if(!L){if(VS.liveStarting){VS.liveStarting=false;VS.status="";paint()}return}
  L.stopped=true;VS.live=null;VS.pend=null;VS.ask=null;VS.status="";clearInterval(L.tick);
  try{L.node.port.onmessage=null;L.node.disconnect()}catch(e){}try{L.src.disconnect()}catch(e){}
  try{L.stream.getTracks().forEach(t=>t.stop())}catch(e){}
  flushPlay(L);try{L.loop&&L.loop.close()}catch(e){}try{L.ctx.close()}catch(e){}try{L.pctx&&L.pctx.close()}catch(e){}try{L.session.close()}catch(e){}
  if(msg)add("act",msg);paint();
}
function liveTick(L){
  if(L.stopped)return;
  if(playing(L))L.last=Date.now();
  if(L.closeAfter&&!playing(L)&&Date.now()-L.closeAt>1800){stopLive();return}
  if(!VS.pend&&!VS.status&&Date.now()-L.last>IDLE_MS){stopLive("Am închis conversația după o pauză. Atinge microfonul ca să vorbim iar.");return}
  paintState();
}
async function liveLoop(L){
  try{
    for await(const m of L.session.receive()){
      if(L.stopped)break;
      if(m.type==="serverContent"){
        if(m.interrupted){flushPlay(L);L.aB=null;L.drop=false}
        const it=m.inputTranscription&&m.inputTranscription.text;
        if(it){L.last=Date.now();L.drop=false;if(!L.uB)L.uB=add("eu","");L.uB.text+=it;L.aB=null;
          if(VS.pend&&VS.pend.asked){VS.pend.heard+=" "+it;const v=yesNo(VS.pend.heard);if(v!=null){VS.pend.yes=v;VS.pend.no=!v}}
          paint()}
        const ot=m.outputTranscription&&m.outputTranscription.text;
        if(ot&&VS.pend&&!VS.pend.asked){VS.pend.asked=true;VS.pend.heard=""}   // „da” contează doar după ce Sofia a pus întrebarea
        if(ot){if(!L.aB)L.aB=add("ai","");L.aB.text+=ot;L.uB=null;paint()}
        if(!L.drop)for(const p of (m.modelTurn&&m.modelTurn.parts)||[])if(p.inlineData&&/^audio\//.test(p.inlineData.mimeType||"")){play(L,p.inlineData.data);L.uB=null;L.last=Date.now()}
        if(m.turnComplete){L.aB=null;L.uB=null;L.drop=false;if(L.closeAfter)L.closeAt=Date.now()}
      }else if(m.type==="toolCall")liveTools(L,m.functionCalls||[]);
    }
  }catch(e){console.warn("Sofia live",e)}
  if(!L.stopped)stopLive(L.closeAfter?"":"Conversația s-a întrerupt. Atinge microfonul ca să continuăm.");
}
async function liveTools(L,calls){
  L.last=Date.now();L.uB=null;L.aB=null;
  const out=[];
  for(const c of calls){
    setStatus(DOING[c.name]?DOING[c.name]+"…":"Lucrez…");
    VS.liveCall={name:c.name,args:c.args||{}};
    let r;
    try{r=RUN[c.name]?await RUN[c.name](c.args||{}):{eroare:"Funcție necunoscută."}}
    catch(e){r=e&&e.needConfirm?{trebuie_confirmare:e.q,nota:"Nu s-a salvat nimic încă. Pune utilizatorului întrebarea și așteaptă. Doar dacă spune da, cheamă din nou funcția cu aceleași argumente și confirmat=true."}:{eroare:errMsg(e)}}
    VS.liveCall=null;
    if(!r||typeof r!=="object")r={rezultat:r};
    if(!r.trebuie_confirmare)note(c.name,r);
    out.push({id:c.id,name:c.name,response:r});
  }
  VS.status="";L.last=Date.now();paint();
  if(!L.stopped&&!L.session.isClosed)L.session.sendFunctionResponses(out).catch(e=>console.warn(e))
}
function liveText(t,shown){
  const L=VS.live;if(!L)return;add("eu",shown||t);L.uB=null;L.aB=null;L.last=Date.now();
  Promise.resolve().then(()=>L.session.sendTextRealtime?L.session.sendTextRealtime(t):L.session.send(t)).catch(e=>console.warn(e))
}

/* ---------- Interfața ---------- */
function add(who,text){const m={who,text};VS.msgs.push(m);if(VS.msgs.length>40)VS.msgs.shift();paint();return m}
const EX=()=>["Ce evenimente avem sâmbătă?","Cât gin mai e în depozit?","Cum se face un Mojito?"].concat(F.isAdmin?["Ce am de făcut săptămâna asta?","Cât am încasat luna asta?","Necesar pentru 80 de persoane"]:[]);
function paintState(){
  const B=$("#vcBtn"),mic=$("#vcMic"),st=$("#vcSt");
  const L=VS.live,talking=L?playing(L):SQ.run;
  if(B){B.classList.toggle("on",VS.listening||!!L);B.classList.toggle("talk",talking);B.setAttribute("aria-expanded",VS.open)}
  if(!mic||!VS.open)return;
  let lbl,sub="",cls="";
  if(VS.liveStarting){lbl="Pornesc…";cls="wait"}
  else if(L&&talking){lbl="✋ Întrerupe-o";cls="on";sub=VS.duplex==="atingere"?"Sofia vorbește · atinge ca s-o întrerupi":"Sofia vorbește · atinge sau vorbește tare ca s-o întrerupi"}
  else if(L){lbl="■ Încheie conversația";cls="on";
    sub=VS.status?VS.status:VS.pend?"Aștept: da sau nu":talking?"Sofia vorbește · vorbește peste ea ca s-o întrerupi":"Te ascult… vorbește liber"}
  else if(VS.listening){lbl="■ Gata, trimite";cls="on";sub=VS.heard?"„"+VS.heard+"”":"Te ascult…"}
  else if(VS.busy){lbl="Mă gândesc…";cls="wait";sub=VS.status||""}
  else if(talking){lbl="✋ Oprește-o și vorbește";sub="Sofia vorbește"}
  else lbl=useLive()?"🎙️ Vorbește cu Sofia":"🎙️ Vorbește";
  mic.textContent=lbl;mic.className="vc-mic "+cls;mic.hidden=!(useLive()||SR||L);
  if(st){st.textContent=sub;st.hidden=!sub;st.classList.toggle("live",!!L&&!VS.status&&!talking&&!VS.pend)}
}
function paint(){
  const P=$("#vcPanel");
  if(P){P.hidden=!VS.open;
    if(VS.open){
      const lg=$("#vcLog");
      lg.innerHTML=(VS.msgs.length?"":`<p class="vc-hint">Vorbește liber, ca la telefon. Poți s-o întrerupi oricând. De exemplu:</p><div class="vc-chips">${EX().map(q=>`<button type="button" class="vc-chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>${F.isAdmin?`<p class="vc-hint">sau „Adaugă un eveniment: nunta lui Andrei Pop pe 20 iunie, la Conacul Bașa, 120 de invitați, 25 de euro de persoană”</p>`:""}${matchMedia("(pointer:fine)").matches?`<p class="vc-hint vc-keys">Pe laptop: <kbd>${/Mac/i.test(navigator.platform||navigator.userAgent)?"⌥":"Alt"} S</kbd> deschide și închide Sofia, <kbd>Space</kbd> pornește, întrerupe sau oprește conversația.</p>`:""}`)+
        VS.msgs.filter(m=>m.text||m.who==="act").map(m=>`<div class="vc-m vc-${m.who}">${esc(m.text.trim())}</div>`).join("")+(VS.busy&&!VS.msgs.some(m=>m.streaming)?`<div class="vc-m vc-act">${esc(VS.status||"Mă gândesc…")}</div>`:"");
      lg.scrollTop=1e6;
      $("#vcAsk").hidden=!VS.ask;
      const go=$("#vcGo");go.hidden=!VS.btn;if(VS.btn)go.textContent=VS.btn.label;
      $("#vcTalk").checked=VS.talk;$("#vcConv").checked=VS.conv;$("#vcMode").value=VS.mode;
      $("#vcCl").hidden=VS.mode==="live";$("#vcLv").hidden=VS.mode!=="live";
    }
  }
  paintState();
}
function openPanel(){VS.open=true;paint()}
function hidePanel(){VS.open=false;paint()}   // ascunde panoul (ca să se vadă ce s-a deschis), conversația continuă
function closePanel(){VS.open=false;stopLive();stopListen();shush();paint()}
/* O întrebare scrisă sau apăsată: în conversația live merge direct în ea */
function send(text,shown){text=String(text||"").trim();if(!text)return;if(VS.live)liveText(text,shown);else turn(text,shown)}
async function turn(text,shown){
  text=String(text||"").trim();if(!text)return;
  if(VS.busy){VS.next=[text,shown];setStatus("Am notat, îți răspund imediat după…");return}   // nu se pierde: pleacă după răspunsul curent
  shush();stopListen();
  add("eu",shown||text);VS.busy=true;VS.status="Mă gândesc…";paint();
  let b=null,buf="",full="";
  const onText=t=>{
    t=t.replace(/[*_#`]/g,"");full+=t;
    if(!b){b=add("ai","");b.streaming=true}
    b.text+=t;VS.status="";paint();
    buf+=t;let m;while((m=buf.match(/^[\s\S]*?[.!?…]+(?=\s)/))){sayQ(m[0]);buf=buf.slice(m[0].length)}
  };
  try{await ask(text,onText);sayQ(buf);if(!full.trim()){add("ai","Gata.");sayQ("Gata.")}}
  catch(e){console.warn("Sofia",e);VS.chat=null;shush();
    const a=/configurat|administratorul/.test(e&&e.message)?e.message:(window.__cpAI?window.__cpAI.err(e).replace("Citirea facturii","Cererea"):"Nu am reușit. Încearcă din nou.");
    if(b)b.text+=(b.text?" … ":"")+a;else add("ai",a);sayQ(a);full=a}
  if(b)b.streaming=false;
  VS.busy=false;VS.status="";paint();
  if(VS.next){const n=VS.next;VS.next=null;turn(n[0],n[1]);return}
  await speechIdle();
  /* Conversație continuă: după răspuns ascultă din nou (sau doar când Sofia a pus o întrebare) */
  if(VS.open&&VS.talk&&SR&&!VS.ask&&!VS.busy&&!VS.listening&&!VS.live&&(VS.conv||/\?\s*$/.test(full.trim())))talkTurn({auto:true});
}
async function talkTurn(o={}){
  if(VS.listening){stopListen();return}
  if(VS.busy)return;
  try{
    const t=await listen(o.auto?{wait:7000}:{});
    if(!t){paint();return}
    if(STOP.test(fold(t))&&t.split(/\s+/).length<=4){add("eu",t);const a="Bine. Sunt aici când ai nevoie.";add("ai",a);speak(a);return}
    $("#vcIn").value="";turn(t);
  }catch(e){add("act",e.message==="mic"?"Nu am acces la microfon. Permite microfonul pentru această pagină din setările browserului.":"Recunoașterea vocală nu merge în acest browser. Scrie întrebarea mai jos.")}
}
/* Ascultă vocea aleasă: repornește conversația cu ea (păstrând ce s-a vorbit) și Sofia se prezintă scurt */
async function tryVoice(){
  if(!useLive()){add("act","Vocea nouă se aude în conversația live.");return}
  clearLiveOff();if(VS.live){stopLive();VS.liveModel=null}
  await startLive();
  if(VS.live)liveText("Salută-mă într-o singură propoziție scurtă, caldă, ca să aud cum îți sună vocea acum.","🔊 Ascult vocea");
}
/* Butonul mare: pornește / oprește conversația; dacă Sofia vorbește (vocea telefonului), o oprește și ascultă */
function micPress(){
  if(VS.live&&playing(VS.live)){interrupt(VS.live);return}
  if(VS.live||VS.liveStarting){stopLive();return}
  if(useLive()){startLive();return}
  const off=VS.mode==="live"&&liveOff();
  if(off&&!VS.offShown){VS.offShown=true;add("act","Conversația live e oprită ("+off.motiv+"). Folosesc vocea telefonului. Din ⚙︎ → 🔊 Ascult-o încerci din nou.")}
  if(VS.listening){stopListen();return}
  if(SQ.run)shush();
  talkTurn();
}

function mount(){
  const b=document.createElement("button");b.id="vcBtn";b.type="button";b.setAttribute("aria-label","Asistentul vocal Sofia");b.setAttribute("aria-controls","vcPanel");b.innerHTML="🎙️";
  const p=document.createElement("section");p.id="vcPanel";p.hidden=true;p.setAttribute("aria-label","Asistentul vocal");
  p.innerHTML=`<div class="vc-top"><b>Sofia</b><span>asistenta vocală</span><button type="button" class="vc-x vc-cfgb" id="vcCfgB" aria-label="Setări" aria-expanded="false">⚙︎</button><button type="button" class="vc-x" id="vcX" aria-label="Închide">✕</button></div>
    <div class="vc-set" id="vcCfg" hidden>
      <label>Vocea <select id="vcMode" aria-label="Felul vocii"><option value="live">Gemini Live (naturală, în timp real)</option><option value="clasic">Vocea telefonului</option></select></label>
      <div class="vc-row" id="vcLv"><label>Cine vorbește <select id="vcLVoice" aria-label="Vocea Sofiei">${Object.entries(LIVE_VOICES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
        <label>Motorul vocii <select id="vcEng" aria-label="Motorul vocii">${Object.entries(ENGINES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
        <button type="button" class="btn vc-try" id="vcTry">🔊 Ascult-o</button>
        <label>Întreruperi <select id="vcDup" aria-label="Cum o întrerupi"><option value="auto">vorbind peste ea</option><option value="atingere">doar prin atingere (difuzor, zgomot)</option></select></label></div>
      <div class="vc-row" id="vcCl"><label>Vocea <select id="vcVoice" aria-label="Vocea telefonului"></select></label>
        <label>Viteză <input type="range" id="vcRate" min="0.9" max="1.7" step="0.05"> <output id="vcRateV"></output></label>
        <label class="vc-t"><input type="checkbox" id="vcTalk"> răspunde cu voce</label>
        <label class="vc-t"><input type="checkbox" id="vcConv"> conversație continuă (ascultă din nou după răspuns)</label></div>
    </div>
    <div class="vc-log" id="vcLog" aria-live="polite"></div>
    <div class="vc-ask" id="vcAsk" hidden><button type="button" class="btn" id="vcYes">Da</button><button type="button" class="btn" id="vcNo">Nu</button></div>
    <button type="button" class="btn primary vc-go" id="vcGo" hidden></button>
    <div class="vc-st" id="vcSt" hidden></div>
    <button type="button" class="vc-mic" id="vcMic"></button>
    <form class="vc-f" id="vcF"><input id="vcIn" autocomplete="off" placeholder="sau scrie aici…" aria-label="Întrebarea pentru Sofia"><button class="btn" type="submit">Trimite</button></form>`;
  document.body.append(b,p);
  b.onclick=()=>{
    if(F.isAdmin&&window.__ctAPI)window.__ctAPI.prep().catch(()=>{});   // pregătește Google din timp
    if("speechSynthesis" in window&&!VS.unlocked){VS.unlocked=true;try{speechSynthesis.speak(new SpeechSynthesisUtterance(""))}catch(e){}}   // vocea pornește doar după o atingere
    if(VS.open){closePanel();return}
    openPanel();
    if(!VS.live&&!VS.liveStarting&&!VS.busy&&!VS.listening)micPress();   // la deschidere începe direct să asculte
  };
  $("#vcX").onclick=closePanel;
  $("#vcCfgB").onclick=()=>{const c=$("#vcCfg");c.hidden=!c.hidden;$("#vcCfgB").setAttribute("aria-expanded",!c.hidden)};
  $("#vcMic").onclick=micPress;
  $("#vcGo").onclick=()=>VS.btn&&VS.btn.fn();   // direct din apăsare, altfel fereastra Google e blocată
  $("#vcYes").onclick=()=>VS.ask&&VS.ask.res(true);
  $("#vcNo").onclick=()=>VS.ask&&VS.ask.res(false);
  $("#vcLog").addEventListener("click",e=>{const c=e.target.closest(".vc-chip");if(c)send(c.dataset.q)});
  const rt=$("#vcRate"),rv=$("#vcRateV"),showR=()=>rv.textContent="×"+VS.rate.toFixed(2).replace(/0$/,"");rt.value=VS.rate;showR();
  rt.oninput=()=>{VS.rate=+rt.value;showR()};
  rt.onchange=()=>{LS.set("cp-voce-viteza",String(VS.rate));speak("Așa vorbesc acum. E bine?")};
  $("#vcVoice").onchange=e=>{const v=roVoices().find(x=>x.name===e.target.value);if(v){VS.voice=v;LS.set("cp-voce-nume",v.name);speak("Bună, eu sunt Sofia.")}};
  paintVoices();
  const dp=$("#vcDup");dp.value=VS.duplex;dp.onchange=()=>{VS.duplex=dp.value;LS.set("cp-voce-dup",VS.duplex)};
  const lv=$("#vcLVoice");lv.value=VS.lvoice;
  lv.onchange=()=>{VS.lvoice=lv.value;LS.set("cp-voce-live",VS.lvoice);tryVoice()};
  const en=$("#vcEng");en.value=VS.engine;en.onchange=()=>{VS.engine=en.value;LS.set("cp-voce-motor",VS.engine);VS.liveModel=null;clearLiveOff();tryVoice()};
  $("#vcTry").onclick=tryVoice;
  $("#vcMode").onchange=e=>{VS.mode=e.target.value;LS.set("cp-voce-mod",VS.mode);clearLiveOff();stopLive();stopListen();shush();
    if(VS.mode==="live"&&!liveOK())add("act","Telefonul ăsta nu poate face conversația live. Folosesc vocea telefonului.");paint()};
  $("#vcTalk").onchange=e=>{VS.talk=e.target.checked;LS.set("cp-voce-talk",VS.talk?"1":"0");if(!VS.talk)shush()};
  $("#vcConv").onchange=e=>{VS.conv=e.target.checked;LS.set("cp-voce-conv",VS.conv?"1":"0")};
  $("#vcF").onsubmit=e=>{e.preventDefault();const i=$("#vcIn");const t=i.value;i.value="";stopListen();send(t)};
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&VS.open){closePanel();return}
    if(e.altKey&&!e.metaKey&&!e.ctrlKey&&e.code==="KeyS"){e.preventDefault();b.click();return}   // ⌥S (Alt+S): Sofia
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||"")||(e.target&&e.target.isContentEditable);
    if(VS.open&&e.code==="Space"&&!typing&&!e.repeat&&!e.altKey&&!e.metaKey&&!e.ctrlKey){e.preventDefault();micPress()}
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden){stopLive();stopListen();shush()}});   // microfonul nu rămâne deschis în fundal
  paint();
}
mount();
window.__sofia={gate,state:()=>({live:!!VS.live,loop:!!(VS.live&&VS.live.loop),open:!!(VS.live&&VS.live.open),rate:VS.live&&VS.live.pctx?VS.live.pctx.sampleRate:0})};   // pentru teste
})();
