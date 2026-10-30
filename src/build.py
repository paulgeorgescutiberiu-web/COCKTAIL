import re
h=open("base2.html",encoding="utf-8").read()
boot=open("boot.js",encoding="utf-8").read()
fbv="10.12.5"
sdk="".join(f'<script src="https://www.gstatic.com/firebasejs/{fbv}/firebase-{m}-compat.js"></script>\n' for m in ["app","auth","firestore"])
h=h.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n','<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n'+sdk,1)
css="""
#fbScreen{position:fixed;inset:0;z-index:99;display:grid;place-items:center;padding:16px;background:var(--paper,#f6f1e7);color:var(--ink,#1d2a22);font-family:Barlow,system-ui,sans-serif}
#fbScreen .fb-box{max-width:380px;width:100%;text-align:center}
#fbScreen h2{font-family:Anton,system-ui,sans-serif;font-size:34px;margin:0 0 8px}
#fbScreen p{margin:0 0 18px;line-height:1.45}
#fbScreen form{display:flex;flex-direction:column;gap:10px}
#fbScreen input{font:inherit;font-size:18px;padding:12px 14px;border-radius:12px;border:1.5px solid currentColor;background:transparent;color:inherit}
.fb-btn{font:inherit;font-weight:700;font-size:17px;padding:12px 16px;border-radius:12px;border:0;background:var(--leaf,#1f4d36);color:var(--on-leaf,#fff);cursor:pointer}
.fb-who{margin-top:8px;font-size:14px}
.fb-who button{font:inherit;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer}
"""
h=h.replace("</style>\n</head>",css+"</style>\n</head>",1)
assert '<script id="app">' in h
h=h.replace('<script id="app">','<script id="app" type="text/plain">',1)
h=h.replace("Deschide rețetarul din linkul claude.ai ca să le vadă toată echipa.","Verifică internetul și reîncarcă pagina ca să le vadă toată echipa.")
i=h.rindex("</body>")
h=h[:i]+"<script id=\"boot\">\n"+boot+"</script>\n"+h[i:]
open("index.html","w",encoding="utf-8").write(h)
print(len(h))
