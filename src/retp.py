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
rep('if(route!=="ziua"&&route!=="total"&&route!=="consum"&&route!=="preturi"&&!D.events.some(e=>e.id===route))route="ziua";','if(!["ziua","total","consum","preturi","nou","arh","prep"].includes(route)&&!D.events.some(e=>e.id===route))route="ziua";')
rep('  h+=`<button class="ev-tab" data-r="consum" aria-current="${route==="consum"}">Consum</button>`;','  h+=`<button class="ev-tab" data-r="consum" aria-current="${route==="consum"}">Consum</button><button class="ev-tab" data-r="prep" aria-current="${route==="prep"}">Preparare</button>`;')
rep('route==="consum"?viewConsum():route==="preturi"?viewPreturi():viewZiua();','route==="consum"?viewConsum():route==="prep"?viewPrep():route==="preturi"?viewPreturi():viewZiua();')
rep("</style>\n</head>",".prep-t{border:1.5px solid var(--line);border-radius:14px;overflow:hidden;margin:10px 0}.prep-r{display:grid;grid-template-columns:minmax(0,2.2fr) 1fr 1fr 1.2fr;gap:8px;padding:10px 12px;border-top:1px solid var(--line);align-items:center}.prep-r:first-child{border-top:0}.prep-h{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--card)}.prep-r small{display:block;color:var(--muted);font-size:.78rem}.prep-mk{font-weight:800}.prep-mk.ok{color:var(--muted);font-weight:600}.prep-ed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.prep-ed label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:.9rem}.prep-ed textarea{padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit;font-size:.92rem}@media (max-width:560px){.prep-ed{grid-template-columns:1fr}.prep-r{grid-template-columns:minmax(0,1.6fr) .8fr .8fr 1fr;font-size:.92rem}}\n.cx-warn{margin-top:12px}.cx-warn ul{margin:8px 0 10px 18px;padding:0}.cx-warn li{margin:4px 0}\n</style>\n</head>")
open("base2.html","w",encoding="utf-8").write(h);print("ret ok")
