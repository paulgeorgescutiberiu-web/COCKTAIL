# Detaliile evenimentului (detalii.js): în aplicație și, aceeași copie, în portal.html (între DETALII-START și DETALII-END)
import os, re
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
det=open("detalii.js",encoding="utf-8").read()
assert "</script" not in det
rep('<script id="app">','<script id="cp-det">\n'+det+'</script>\n<script id="app">')
rep("</style>\n</head>",""".dt-box{display:flex;flex-direction:column;gap:12px}
.dt-s{border:1.5px solid var(--line);border-radius:14px;padding:10px 14px 14px;margin:0;background:var(--card)}
.dt-s legend{font-weight:800;padding:0 6px}.dt-s legend small{font-weight:500;color:var(--muted)}.dt-s.dt-ok legend::after{content:" ✓";color:#1F4A33}
.dt-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 14px}
.dt-q{display:flex;flex-direction:column;gap:4px;font-size:.88rem;color:var(--muted);font-weight:600}.dt-w{grid-column:1/-1}
.dt-q input[type=text],.dt-q input[type=time],.dt-q textarea{font:inherit;font-weight:500;color:var(--ink);padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);width:100%;box-sizing:border-box}
.dt-ops{display:flex;flex-wrap:wrap;gap:6px}.dt-p{border:1.5px solid var(--line);border-radius:999px;padding:5px 11px;cursor:pointer;color:var(--ink);font-weight:500;background:var(--paper)}
.dt-p input{position:absolute;opacity:0;pointer-events:none}.dt-p.on{background:var(--sage);border-color:var(--sage);font-weight:700}
.dt-none{display:flex;gap:8px;align-items:center;margin:2px 0 8px;font-size:.9rem}.dt-hide{display:none!important}
.ct-chip.dt-red{background:#F6D9D3;border-color:#A3321F;color:#7A2414;font-weight:700}
.dt-sum{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:.86rem}.dt-sum li{margin:2px 0}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h)
p="../portal.html"
if os.path.exists(p):
    s=open(p,encoding="utf-8").read()
    n=re.subn(r"/\*DETALII-START\*/.*?/\*DETALII-END\*/",lambda m:"/*DETALII-START*/\n"+det+"/*DETALII-END*/",s,flags=re.S)
    assert n[1]==1,"portal.html: lipsesc semnele DETALII-START / DETALII-END"
    if n[0]!=s: open(p,"w",encoding="utf-8").write(n[0])
print("det ok")
