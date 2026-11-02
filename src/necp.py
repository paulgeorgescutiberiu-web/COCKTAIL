# Buton „Necesar client” la Evenimente
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
rep('<button class="btn" type="button" id="evCal">📅 Preia din calendar</button>','<button class="btn" type="button" id="evCal">📅 Preia din calendar</button><button class="btn" type="button" id="evNec">🧾 Necesar client</button>')
rep('$("#evCal").onclick=()=>ciOpen();','$("#evCal").onclick=()=>ciOpen();\n$("#evNec").onclick=()=>ncOpen();')
rep('  if(route==="cal"){','  if(route==="nec"){if(!NC){ncOpen();return}$("#evTabs").innerHTML="";v.innerHTML=viewNec();return}\n  if(route==="cal"){')
rep('  if(ciClick(ev.target))return;','  if(NC&&route==="nec"&&ev.target.closest("[data-nca],[data-nco]")){ncClick(ev.target);return}\n  if(ciClick(ev.target))return;')
rep('"nou","arh","prep","cal"]','"nou","arh","prep","cal","nec"]')
rep("</style>\n</head>",""".nc-r{grid-template-columns:1fr 96px}.nc-r .lbl{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}.nc-r .lbl small{width:100%;padding-left:26px}.nc-r.off{opacity:.5}
.nc-q{width:100%;font:inherit;font-size:1.05rem;font-weight:700;text-align:center;padding:9px 6px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h)
print("nec ok")
