h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
# rezumat sus în retur, după ce s-a început notarea
rep('''  if(ro)h+=`<p class="ev-mode">Poți vedea returul, dar nu îl poți modifica.</p>`;
  G.forEach(g=>{''','''  if(ro)h+=`<p class="ev-mode">Poți vedea returul, dar nu îl poți modifica.</p>`;
  if(filled)h+=retIssuesHTML(e,false).replace(/<div class="cx-btns">[\\s\\S]*?<\\/div><\\/div>$/,"</div>");
  G.forEach(g=>{''')
# semne în lista de consum
rep('''      ${!filled&&all.length?`<span class="ev-flag">retur nenotat</span>`:""}''','''      ${!filled&&all.length?`<span class="ev-flag">retur nenotat</span>`:""}${(()=>{if(!filled)return "";const I=retIssues(e);return (I.over.length?`<span class="ev-flag">${I.over.length} cu retur mai mare decât trimis</span> `:"")+(I.miss.length?`<span class="ev-flag">${I.miss.length} fără retur</span>`:"")})()}''')
rep('if(route!=="ziua"&&route!=="total"&&route!=="consum"&&route!=="preturi"&&!D.events.some(e=>e.id===route))route="ziua";','if(!["ziua","total","consum","preturi","nou","arh"].includes(route)&&!D.events.some(e=>e.id===route))route="ziua";')
rep("</style>\n</head>",".cx-warn{margin-top:12px}.cx-warn ul{margin:8px 0 10px 18px;padding:0}.cx-warn li{margin:4px 0}\n</style>\n</head>")
open("base2.html","w",encoding="utf-8").write(h);print("ret ok")
