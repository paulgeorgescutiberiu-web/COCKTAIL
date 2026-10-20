h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80]); h=h.replace(a,b)
cons=open("cons.js",encoding="utf-8").read()
rep("\nfunction render(){\n  const v=$(\"#evView\");",cons+"\nfunction render(){\n  const v=$(\"#evView\");")
rep('v.innerHTML=e?viewEvent(e):route==="total"?viewTotal():route==="consum"?viewConsum():viewZiua();','v.innerHTML=e?viewEvent(e):route==="total"?viewTotal():route==="consum"?viewConsum():route==="preturi"?viewPreturi():viewZiua();')
rep('if(route!=="ziua"&&route!=="total"&&route!=="consum"&&','if(route!=="ziua"&&route!=="total"&&route!=="consum"&&route!=="preturi"&&')
rep('''  else h=`<p class="ev-mode" style="margin:0 0 12px">Consumul apare doar la articolele la care s-a notat returul.</p>`+h;
  return h;''','''  else h=`<p class="ev-mode" style="margin:0 0 12px">Consumul apare doar la articolele la care s-a notat returul.</p>`+h;
  return h+cxButtons();''')
rep('if(evMode==="retur"){h+=viewRetur(e)+pagerHTML(prev,next)+"</div>";return h}',
    'if(evMode==="retur"){h+=viewRetur(e)+(cxAdmin()?`<p style="margin:18px 0 0"><button class="btn primary" data-cx="${e.id}">Descarcă Excel consumație</button></p>`:"")+pagerHTML(prev,next)+"</div>";return h}')
rep('$("#evView").addEventListener("click",ev=>{','$("#evView").addEventListener("click",ev=>{\n  if(cxClick(ev.target))return;')
rep('$("#evView").addEventListener("change",ev=>{','$("#evView").addEventListener("change",ev=>{\n  cxEditChange(ev.target);')
rep("</style>\n</head>",""".cx-btns{display:flex;flex-wrap:wrap;gap:8px}
.cx-btns .btn{display:flex;align-items:center;gap:8px}
.cx-btns .dot{width:10px;height:10px;border-radius:50%;background:var(--c)}
.cx-row{display:grid;grid-template-columns:1.4fr 1.1fr 1fr 80px 1.3fr 60px 40px;gap:6px;align-items:center;padding:8px 10px;border-top:1px solid var(--line)}
.ev-list>.cx-row:first-child{border-top:0}
.cx-row input,.cx-row select{min-width:0;width:100%;padding:8px;border:1.5px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font-size:.9rem}
.cx-del{padding:6px 0;width:36px}
.cx-add{margin:8px 0 0}
@media (max-width:760px){.cx-row{grid-template-columns:1fr 1fr 70px;}.cx-row select{grid-column:1/3}}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("cons ok")
