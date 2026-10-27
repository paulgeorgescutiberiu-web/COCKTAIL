# Buton „Preia din calendar” la Evenimente
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
rep('<button class="btn" type="button" id="evArh">Săptămâni anterioare</button>','<button class="btn" type="button" id="evCal">📅 Preia din calendar</button><button class="btn" type="button" id="evArh">Săptămâni anterioare</button>')
rep('$("#evArh").onclick=()=>arhOpen();','$("#evArh").onclick=()=>arhOpen();\n$("#evCal").onclick=()=>ciOpen();')
rep('  if(route==="arh"){','  if(route==="cal"){if(!CI)CI={wk:0,list:null,msg:"",busy:false,target:null};$("#evTabs").innerHTML="";v.innerHTML=viewCal();return}\n  if(route==="arh"){')
rep('  if(enClick(ev.target))return;','  if(ciClick(ev.target))return;\n  if(enClick(ev.target))return;')
rep('"nou","arh","prep"]','"nou","arh","prep","cal"]')
rep("</style>\n</head>",""".ci-wk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
.ci-l{display:flex;flex-direction:column;gap:8px;margin:10px 0}
.ci-r{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);cursor:pointer}
.ci-r input{width:20px;height:20px;margin-top:2px;flex:none}.ci-r b{display:block}.ci-r small{display:block;color:var(--muted);font-size:.82rem;margin-top:2px}.ci-r .warn{color:#c0392b;font-weight:700}
.ci-r.in{opacity:.55}.ci-o summary{cursor:pointer;color:var(--muted);font-size:.9rem;margin:8px 0}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h)
print("cal ok")
