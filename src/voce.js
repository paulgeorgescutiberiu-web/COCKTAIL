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
  {name:"eveniment_nou",description:"Deschide fișa de marfă (Excelul săptămânii) pentru un eveniment nou completată cu ce a spus utilizatorul. Utilizatorul completează marfa și salvează.",
    parameters:S("object","",{properties:{nume:S("string","Numele evenimentului"),data:S("string","AAAA-LL-ZZ"),ora:S("string","HH:MM"),pers:S("string","Număr persoane"),
      echipa:S("string","Barmanii, separați prin spațiu"),transport:S("string","Transport"),note:S("string","Mențiuni")}})}
];

function evData(){try{const e=window.__cp.evd();return e&&e.aoa?window.__cp.parseAOA(e.aoa,e.fileName):null}catch(x){return null}}
let ctCache=null;
async function ctList(){
  if(!F.isAdmin)throw new Error("Contractele le vede doar administratorul. Intră ca administrator din josul paginii.");
  if(!ctCache){const s=await F.fs.collection(`${F.base}/contracte`).get();ctCache=s.docs.map(d=>({...d.data(),id:d.id}))}
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
function googleBtn(){VS.btn={label:"🔗 Conectează Google (calendar și Drive)",fn:()=>window.__ctAPI.connect().then(()=>{VS.btn=null;paint();turn(VS.after?`Am conectat Google. Pune în calendar contractul ${VS.after}.`:"Am conectat Google. Continuă.","Am conectat Google.");VS.after=null},e=>{VS.btn=null;add("act",errMsg(e));paint()})};paint()}
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
  async deschide_contract({contract_id}){const A=ctAPI();await A.prep();if(!A.get(contract_id))return {eroare:"Nu găsesc contractul."};A.open(contract_id);closePanel();return {ok:true}},
  async descarca_pdf({contract_id}){const A=ctAPI();await A.prep();const c=A.get(contract_id);if(!c)return {eroare:"Nu găsesc contractul."};
    const m=A.missing(c);if(m.length)return {eroare:"Contractul nu e complet",lipsesc:m};await A.pdf(contract_id);return {ok:true}},
  async notita_contract({contract_id,text}){const A=ctAPI();await A.prep();if(!A.get(contract_id))return {eroare:"Nu găsesc contractul."};await A.addNote(contract_id,text);return {ok:true}},
  async disponibilitate({data}){if(!window.__dispFor)return {eroare:"Disponibilitatea nu e disponibilă."};const r=await window.__dispFor(data);return {data,disponibili:r.ok,indisponibili:r.no}},
  eveniment_nou(a){
    if(!F.isAdmin)return {eroare:"Fișele de eveniment le face doar administratorul."};
    if(!window.__evNew)return {eroare:"Fișa de eveniment nu e disponibilă."};
    window.__evNew({...(a||{})});closePanel();return {ok:true,deschis:"Fișa de eveniment nou, completată. Utilizatorul adaugă marfa și salvează."};
  }
};

function zile(){const o=[];for(let i=0;i<14;i++){const d=new Date();d.setDate(d.getDate()+i);o.push(`${d.toLocaleDateString("ro-RO",{weekday:"long"})} ${iso(d)}`)}return o.join(", ")}
function sysPrompt(){
  const z=new Date().toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return `Ești Sofia, asistenta vocală a firmei Cocktail Philosophy (catering de cocktailuri și barmani la evenimente, Sibiu).
Vorbești cu ${F.NAME||"un coleg"}${F.isAdmin?", administratorul (Paul)":", un membru al echipei"}. Azi este ${z} (${iso(new Date())}).
Reguli:
- Răspunzi DOAR în limba română, scurt și natural, ca într-o conversație la telefon: una-trei propoziții, vorbite, cu cuvinte de zi cu zi („gata”, „am pus”, „mai ai”), fără formulări de robot ca „Am efectuat operațiunea”. Fără markdown, liste cu steluțe sau emoji; textul tău e citit cu voce tare.
- Pentru orice întrebare despre rețete, evenimente, stoc sau contracte chemi funcțiile; nu inventa date. Dacă o funcție dă eroare, spui pe scurt de ce.
- Când ți se cere o acțiune, o faci direct cu funcția potrivită, apoi confirmi într-o propoziție ce ai făcut.
- Datele le dai ca „sâmbătă, 14 noiembrie”, nu AAAA-LL-ZZ. Sumele cu moneda.
- Dacă lipsește o informație absolut necesară, pune o singură întrebare scurtă.
- „Adaugă un eveniment / am o nuntă pe… / fă contract pentru…” = adauga_eveniment, care face tot: salvează contractul, îl pune în calendar și îl deschide pe ecran. Ai nevoie minim de numele clientului și de dată; restul (oră, locație, invitați, preț, avans, telefon) le treci dacă au fost spuse, nu le ceri pe toate. Nu pune tu confirmarea, o cere funcția.
- Dacă funcția răspunde că în ziua aceea există deja evenimente în calendar, i le spui pe scurt și întrebi dacă completezi unul dintre ele sau faci unul nou; apoi pune_in_calendar.
- După adăugare spui ce lipsește din contract pentru PDF (de obicei datele din buletin: „fă o poză buletinului în formular”).
- Prețurile uzuale: dacă utilizatorul spune „euro de persoană”, moneda EURO și unitatea „/ PERSOANĂ”.
- Zilele următoare, ca să calculezi corect datele: ${zile()}.
- Poți face și calcule (cantități pentru un număr de invitați, sume, rest de plată) pe baza datelor din funcții.`;
}

/* ---------- Gemini cu funcții ---------- */
const badModel=e=>/not.?found|404|unsupported|is not available|invalid.*model/i.test(String(e&&e.message));
function newChat(aiM,ai,m){
  const model=aiM.getGenerativeModel(ai,{model:m,systemInstruction:sysPrompt(),tools:[{functionDeclarations:DECL}],generationConfig:{temperature:0.3}});
  return model.startChat();
}
/* Prima întrebare încearcă modelele pe rând (ca la facturi); după aceea conversația rămâne pe modelul care a mers */
async function first(text){
  const X=window.__cpAI;if(!X||!X.ready())throw new Error("Asistentul are nevoie de serviciul AI al aplicației (cel de la facturi), care nu e configurat.");
  const {aiM,ai}=await X.loadAI();
  let last;
  for(const m of (VS.model?[VS.model]:X.models)){
    const chat=newChat(aiM,ai,m);
    try{const r=await chat.sendMessage(text);VS.model=m;VS.chat=chat;return r}
    catch(e){last=e;if(!badModel(e))throw e}
  }
  throw last;
}
async function ask(text){
  let res=VS.chat?await VS.chat.sendMessage(text):await first(text);
  const chat=VS.chat;
  for(let i=0;i<6;i++){
    const calls=res.response.functionCalls&&res.response.functionCalls();
    if(!calls||!calls.length)break;
    const parts=[];
    for(const c of calls){
      let out;
      try{out=RUN[c.name]?await RUN[c.name](c.args||{}):{eroare:"Funcție necunoscută."}}
      catch(e){out={eroare:errMsg(e)}}
      note(c.name,out);
      parts.push({functionResponse:{name:c.name,response:out}});
    }
    res=await chat.sendMessage(parts);
  }
  return (res.response.text()||"").replace(/[*_#`]/g,"").trim()||"Gata.";
}
function note(name,out){
  const L={deschide_sectiune:"Am deschis secțiunea",retete:"Am căutat în rețetar",evenimente:"Am citit evenimentele",stoc:"Am verificat stocul",contracte:"Am citit contractele",
    marcheaza_incasare:"Încasare",eveniment_nou:"Am deschis fișa nouă",
    adauga_eveniment:"Eveniment nou",calendar_zi:"Am citit calendarul",pune_in_calendar:"Calendar",modifica_contract:"Contract modificat",contract_drive:"PDF în Drive",
    deschide_contract:"Am deschis contractul",descarca_pdf:"PDF descărcat",notita_contract:"Notiță salvată",disponibilitate:"Am verificat disponibilitatea"};
  add("act",(L[name]||name)+(out&&out.eroare?" · nu a mers":out&&out.anulat?" · anulat":" ✓"));
}

/* ---------- Voce: ascultare și vorbire ---------- */
/* Vocea: cea mai naturală voce românească de pe dispozitiv (cele „Natural/Online/Enhanced/Premium” sunt neuronale), viteza aleasă de utilizator */
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
VS.rate=+LS.get("cp-voce-viteza","1.5")||1.5;
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
    .replace(/\s*[–—]\s*/g,", ").replace(/[()"„”«»]/g,"").replace(/\s+/g," ").trim();
}
function speak(t){
  return new Promise(res=>{
    if(!VS.talk||!("speechSynthesis" in window)){res();return}
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(spoken(t));u.lang="ro-RO";if(VS.voice)u.voice=VS.voice;u.rate=VS.rate;u.pitch=1.05;
    let done=false;const fin=()=>{if(done)return;done=true;clearInterval(k);res()};
    u.onend=u.onerror=fin;speechSynthesis.speak(u);
    const k=setInterval(()=>{if(!speechSynthesis.speaking&&!speechSynthesis.pending)fin()},400);   // unele telefoane nu trimit „onend”
  });
}
function paintVoices(){
  const sel=document.getElementById("vcVoice");if(!sel)return;
  const V=roVoices();sel.hidden=V.length<2;
  sel.innerHTML=V.map(v=>`<option value="${esc(v.name)}" ${VS.voice&&v.name===VS.voice.name?"selected":""}>${esc(v.name.replace(/\s*\(.*?\)\s*/g," ").replace(/Microsoft|Google/,"").trim()||v.name)}</option>`).join("");
}
function listen(){
  return new Promise((res,rej)=>{
    if(!SR){rej(new Error("nosr"));return}
    if("speechSynthesis" in window)speechSynthesis.cancel();
    const r=new SR();VS.rec=r;r.lang="ro-RO";r.interimResults=true;r.maxAlternatives=1;r.continuous=false;
    let fin="",got=false;
    r.onresult=e=>{let t="";for(const x of e.results)t+=x[0].transcript;fin=t;got=true;const i=$("#vcIn");if(i)i.value=t};
    r.onerror=e=>{VS.listening=false;paint();if(e.error==="not-allowed"||e.error==="service-not-allowed")rej(new Error("mic"));else res("")};
    r.onend=()=>{VS.listening=false;VS.rec=null;paint();res(got?fin.trim():"")};
    VS.listening=true;paint();
    try{r.start()}catch(e){VS.listening=false;paint();rej(e)}
  });
}
function stopListen(){if(VS.rec)try{VS.rec.stop()}catch(e){}}

/* Confirmare pentru scrieri: buton sau „da”/„nu” rostit */
function confirmUI(q){
  return new Promise(async res=>{
    VS.ask={q,res:v=>{VS.ask=null;stopListen();paint();res(v)}};add("ai",q);paint();
    await speak(q+" Spune da sau nu.");
    if(VS.ask&&SR){try{const t=fold(await listen());if(!VS.ask)return;
      if(/\b(da|sigur|confirm|ok|bine|corect)\b/.test(t))VS.ask.res(true);else if(/\b(nu|anuleaza|stai|renunt)\b/.test(t))VS.ask.res(false)}catch(e){}}
  });
}

/* ---------- Interfața ---------- */
function add(who,text){VS.msgs.push({who,text});if(VS.msgs.length>40)VS.msgs.shift();paint()}
function paint(){
  const P=$("#vcPanel"),B=$("#vcBtn");
  if(B){B.classList.toggle("on",VS.listening);B.setAttribute("aria-expanded",VS.open)}
  if(!P)return;P.hidden=!VS.open;if(!VS.open)return;
  $("#vcLog").innerHTML=(VS.msgs.length?"":`<p class="vc-hint">Spune, de exemplu:<br>„Ce evenimente avem sâmbătă?”<br>„Cât gin mai e în depozit?”<br>„Cum se face Harmony?”${F.isAdmin?"<br>„Adaugă un eveniment: nunta lui Andrei Pop pe 20 iunie, la Conacul Bașa, 120 de invitați, 25 de euro de persoană”<br>„Marchează avansul de la Popescu ca încasat”":""}</p>`)+
    VS.msgs.map(m=>`<div class="vc-m vc-${m.who}">${esc(m.text)}</div>`).join("")+(VS.busy?`<div class="vc-m vc-act">Mă gândesc…</div>`:"");
  $("#vcLog").scrollTop=1e6;
  $("#vcAsk").hidden=!VS.ask;
  const go=$("#vcGo");go.hidden=!VS.btn;if(VS.btn)go.textContent=VS.btn.label;
  const mic=$("#vcMic");mic.classList.toggle("on",VS.listening);mic.textContent=VS.listening?"■ Ascult… (atinge ca să oprești)":"🎙️ Vorbește";mic.hidden=!SR;
  $("#vcTalk").checked=VS.talk;
}
function openPanel(){VS.open=true;paint()}
function closePanel(){VS.open=false;stopListen();if("speechSynthesis" in window)speechSynthesis.cancel();paint()}
async function turn(text,shown){
  text=String(text||"").trim();if(!text||VS.busy)return;
  add("eu",shown||text);VS.busy=true;paint();
  let a;
  try{a=await ask(text)}
  catch(e){console.warn("Sofia",e);VS.chat=null;a=/configurat|administratorul/.test(e&&e.message)?e.message:(window.__cpAI?window.__cpAI.err(e).replace("Citirea facturii","Cererea"):"Nu am reușit. Încearcă din nou.")}
  VS.busy=false;add("ai",a);
  await speak(a);
  if(VS.open&&VS.talk&&SR&&!VS.ask&&/\?\s*$/.test(a))talkTurn();   // dacă Sofia a pus o întrebare, ascultă răspunsul
}
async function talkTurn(){
  if(VS.listening){stopListen();return}
  try{const t=await listen();if(t){$("#vcIn").value="";turn(t)}}
  catch(e){add("act",e.message==="mic"?"Nu am acces la microfon. Permite microfonul pentru această pagină din setările browserului.":"Recunoașterea vocală nu merge în acest browser. Scrie întrebarea mai jos.")}
}

function mount(){
  const b=document.createElement("button");b.id="vcBtn";b.type="button";b.setAttribute("aria-label","Asistentul vocal Sofia");b.setAttribute("aria-controls","vcPanel");b.innerHTML="🎙️";
  const p=document.createElement("section");p.id="vcPanel";p.hidden=true;p.setAttribute("aria-label","Asistentul vocal");
  p.innerHTML=`<div class="vc-top"><b>Sofia</b><span>asistenta vocală</span><label class="vc-t"><input type="checkbox" id="vcTalk"> răspunde cu voce</label><button type="button" class="vc-x" id="vcX" aria-label="Închide">✕</button></div>
    <div class="vc-set"><label>Viteză <input type="range" id="vcRate" min="0.9" max="1.7" step="0.05"> <output id="vcRateV"></output></label><select id="vcVoice" aria-label="Vocea" hidden></select></div>
    <div class="vc-log" id="vcLog" aria-live="polite"></div>
    <div class="vc-ask" id="vcAsk" hidden><button type="button" class="btn" id="vcYes">Da</button><button type="button" class="btn" id="vcNo">Nu</button></div>
    <button type="button" class="btn primary vc-go" id="vcGo" hidden></button>
    <button type="button" class="vc-mic" id="vcMic"></button>
    <form class="vc-f" id="vcF"><input id="vcIn" autocomplete="off" placeholder="sau scrie aici…" aria-label="Întrebarea pentru Sofia"><button class="btn" type="submit">Trimite</button></form>`;
  document.body.append(b,p);
  b.addEventListener("click",()=>{if(F.isAdmin&&window.__ctAPI)window.__ctAPI.prep().catch(()=>{})});   // pregătește Google din timp
  b.onclick=()=>{if("speechSynthesis" in window&&!VS.unlocked){VS.unlocked=true;try{speechSynthesis.speak(new SpeechSynthesisUtterance(""))}catch(e){}}   // iOS: vocea pornește doar după o atingere
    if(!VS.open){openPanel();if(SR&&!VS.msgs.length)talkTurn()}else closePanel()};
  $("#vcX").onclick=closePanel;
  $("#vcMic").onclick=talkTurn;
  $("#vcGo").onclick=()=>VS.btn&&VS.btn.fn();   // direct din apăsare, altfel fereastra Google e blocată
  $("#vcYes").onclick=()=>VS.ask&&VS.ask.res(true);
  $("#vcNo").onclick=()=>VS.ask&&VS.ask.res(false);
  const rt=$("#vcRate"),rv=$("#vcRateV"),showR=()=>rv.textContent="×"+VS.rate.toFixed(2).replace(/0$/,"");rt.value=VS.rate;showR();
  rt.oninput=()=>{VS.rate=+rt.value;showR()};
  rt.onchange=()=>{LS.set("cp-voce-viteza",String(VS.rate));speak("Așa vorbesc acum. E bine?")};
  $("#vcVoice").onchange=e=>{const v=roVoices().find(x=>x.name===e.target.value);if(v){VS.voice=v;LS.set("cp-voce-nume",v.name);speak("Bună, eu sunt Sofia.")}};
  paintVoices();
  $("#vcTalk").onchange=e=>{VS.talk=e.target.checked;try{localStorage.setItem("cp-voce-talk",VS.talk?"1":"0")}catch(x){};if(!VS.talk&&"speechSynthesis" in window)speechSynthesis.cancel()};
  $("#vcF").onsubmit=e=>{e.preventDefault();const i=$("#vcIn");const t=i.value;i.value="";stopListen();turn(t)};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&VS.open)closePanel()});
  paint();
}
mount();
})();
