# applied to base2.html after build2 patches
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:70]); h=h.replace(a,b)
# parseTitle: tolerate 0 for O, return date
rep('''  const m=norm(base).match(/(\\d{1,2}) ([A-Z]+) (\\d{4})/);
  if(m){const mi=MONTHS.findIndex(x=>norm(x)===m[2]);
    if(mi>=0){const d=new Date(+m[3],mi,+m[1]);return {big:`${+m[1]} ${MONTHS[mi]}`,day:DAYS[d.getDay()]}}}''','''  const m=norm(base).match(/(\\d{1,2}) ([0A-Z]+) (\\d{4})/);
  if(m){const mn=m[2].replace(/^0/,"O"),mi=MONTHS.findIndex(x=>norm(x)===mn);
    if(mi>=0){const d=new Date(+m[3],mi,+m[1]);return {big:`${+m[1]} ${MONTHS[mi]}`,day:DAYS[d.getDay()],date:d}}}''')
# date parser helpers before parseAOA
rep('function parseAOA(aoa,fileName){','''function parseDate(v,ref){
  if(blank(v))return null;
  const Y=ref?ref.getFullYear():new Date().getFullYear();
  if(typeof v==="number"){if(v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}return null}
  if(v instanceof Date)return new Date(v.getFullYear(),v.getMonth(),v.getDate());
  const s=norm(v);
  let m=s.match(/(\\d{1,2})\\s*[.\\/\\-]\\s*(\\d{1,2})(?:\\s*[.\\/\\-]\\s*(\\d{2,4}))?/);
  if(m){let y=m[3]?+m[3]:Y;if(y<100)y+=2000;const d=new Date(y,+m[2]-1,+m[1]);return isNaN(d)?null:d}
  m=s.match(/(\\d{1,2})\\s*([0A-Z]{3,})(?:\\s*(\\d{4}))?/);
  if(m){const t=m[2].replace(/^0/,"O"),mi=MONTHS.findIndex(x=>norm(x).startsWith(t.slice(0,3)));if(mi>=0)return new Date(m[3]?+m[3]:Y,mi,+m[1])}
  const wd=DAYS.findIndex(x=>s.startsWith(norm(x).slice(0,3)));
  if(wd>=0&&ref){for(let k=-3;k<=3;k++){const d=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate()+k);if(d.getDay()===wd)return d}}
  return null;
}
const dKey=d=>d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";
const dLong=d=>d?`${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`:"";
const dShort=d=>d?`${DAYS[d.getDay()].slice(0,3)} ${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}`:"";
function parseAOA(aoa,fileName){''')
# init date fields on events
rep('events.push({col:c,id:"e"+c,name:titleName(header[c]),persons:null,time:null,',
    'events.push({col:c,id:"e"+c,name:titleName(header[c]),date:null,dateRaw:null,persons:null,time:null,')
# parse DATA row (before ORA)
rep('    if(L==="ORA"||L.startsWith("ORA ")){',
    '''    if(L==="DATA"||L.startsWith("DATA ")||L==="ZIUA"||L==="DATA EVENIMENT"){hasDate=true;events.forEach(e=>{const v=row[e.col];if(!blank(v)){e.dateRaw=v;e.date=parseDate(v,ttl.date)}});continue}
    if(L==="ORA"||L.startsWith("ORA ")){''')
rep('  const items=[];let inNotes=false;','  const items=[];let inNotes=false,hasDate=false;const ttl=parseTitle(fileName);')
rep('  return {fileName,events,items,totalCol,title:parseTitle(fileName)};',
    '''  if(!hasDate&&ttl.date)events.forEach(e=>e.date=ttl.date);
  const days=[...new Set(events.map(e=>dKey(e.date)).filter(Boolean))].sort();
  return {fileName,events,items,totalCol,title:ttl,hasDate,days};''')
# checks: team same day only; same persons/time same day; missing date
rep('''  D.events.forEach(e=>e.team.forEach(n=>{const k=norm(n);(who[k]=who[k]||{n,ev:[]}).ev.push(e)}));''',
    '''  D.events.forEach(e=>e.team.forEach(n=>{const k=norm(n)+"|"+dKey(e.date);(who[k]=who[k]||{n,ev:[]}).ev.push(e)}));''')
rep('''x.ev.map(e=>esc(e.name)+(e.time?` (${esc(e.time)})`:"")).join(" și la ")}.`));''',
    '''x.ev.map(e=>esc(e.name)+(e.time?` (${esc(e.time)})`:"")).join(" și la ")}${x.ev[0].date&&D.days.length>1?`, ambele ${esc(dLong(x.ev[0].date).toLowerCase())}`:""}.`));
  if(D.hasDate){const nd=D.events.filter(e=>!e.date&&blank(e.dateRaw));if(nd.length)out.push(`Fără dată: ${nd.map(e=>`<b>${esc(e.name)}</b>`).join(", ")}.`);
    D.events.filter(e=>!e.date&&!blank(e.dateRaw)).forEach(e=>out.push(`La <b>${esc(e.name)}</b> nu am înțeles data „${esc(e.dateRaw)}”. Scrie-o ca 10.10.2026.`))}''')
rep('if(a.persons&&a.persons===b.persons&&a.time===b.time)','if(a.persons&&a.persons===b.persons&&a.time===b.time&&dKey(a.date)===dKey(b.date))')
# subtitle
rep('''$("#evSub").textContent=`${D.title.day?D.title.day+", ":""}${D.events.length}''',
    '''$("#evSub").textContent=`${D.days.length>1?(()=>{const ds=D.events.map(e=>e.date).filter(Boolean).sort((a,b)=>a-b),a=ds[0],b=ds[ds.length-1];return `${DAYS[a.getDay()]} ${a.getDate()}${a.getMonth()!==b.getMonth()?" "+MONTHS[a.getMonth()]:""} – ${DAYS[b.getDay()]} ${b.getDate()} ${MONTHS[b.getMonth()]}, `})():D.days.length===1&&D.hasDate?dLong(D.events.find(e=>e.date).date)+", ":D.title.day?D.title.day+", ":""}${D.events.length}''')
# timeline sorted by date, grouped
rep('''  const s=[...D.events].sort((a,b)=>{const x=a.time||"99",y=b.time||"99";return x<y?-1:x>y?1:0});
  let h=`<div class="ev-timeline">`;
  s.forEach(e=>{''','''  const s=[...D.events].sort((a,b)=>{const x=(dKey(a.date)||"9999")+(a.time||"99"),y=(dKey(b.date)||"9999")+(b.time||"99");return x<y?-1:x>y?1:0});
  const multi=D.days.length>1;let h="",lastDay=null;
  if(!multi)h+=`<div class="ev-timeline">`;
  s.forEach(e=>{
    if(multi&&dKey(e.date)!==lastDay){if(lastDay!==null)h+=`</div>`;lastDay=dKey(e.date);h+=`<h2 class="ev-h2 ev-day">${esc(e.date?dLong(e.date):"Fără dată")}</h2><div class="ev-timeline">`}''')
# hero: date fact
rep('''    ${fact("Începe la",e.time,"Ora lipsește")}''','''    ${D.hasDate||D.days.length?fact("Data",e.date?dLong(e.date):"",e.dateRaw?"Data neclară: "+esc(e.dateRaw):"Data lipsește"):""}${fact("Începe la",e.time,"Ora lipsește")}''')
# tabs: short date when multiple days
rep('''${esc(e.name)}${e.time?` <small>${esc(e.time)}</small>`:""}</button>`});''','''${esc(e.name)}${(D.days.length>1&&e.date)||e.time?` <small>${D.days.length>1&&e.date?esc(dShort(e.date))+(e.time?" · ":""):""}${e.time?esc(e.time):""}</small>`:""}</button>`});''')
rep("</style>\n</head>",".ev-day{margin-top:22px}\n.ev-day:first-child{margin-top:4px}\n</style>\n</head>")
open("base2.html","w",encoding="utf-8").write(h);print("dates ok")
