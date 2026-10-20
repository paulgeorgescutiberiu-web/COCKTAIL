import re
h=open("base.html",encoding="utf-8").read()
def rep(a,b,cnt=1):
    global h
    assert h.count(a)>=1,("missing",a[:80])
    h=h.replace(a,b,cnt)
# tab + section
rep('<button role="tab" aria-selected="false" aria-controls="v-antrenament" data-view="antrenament">Antrenament</button>',
    '<button role="tab" aria-selected="false" aria-controls="v-stoc" data-view="stoc">Stoc depozit</button>')
i=h.index('<section class="view" id="v-antrenament"');j=h.index('</section>',i)+len('</section>')
h=h[:i]+'<section class="view" id="v-stoc" role="tabpanel" hidden=""></section>'+h[j:]
# remove training code
i=h.index('/* ---------- Training ---------- */');j=h.index('function refreshAll(){')
h=h[:i]+h[j:]
rep('function refreshAll(){renderList();resetDeck();renderCard();if(window.__evRefresh)window.__evRefresh()}',
    'function refreshAll(){renderList();if(window.__evRefresh)window.__evRefresh()}')
# stable excel label on items
rep('const it={key,label:known?known[0]:capL(label),cat:known?known[1]:"altele",excelTotal:',
    'const it={key,excelLabel:L,label:known?known[0]:capL(label),cat:known?known[1]:"altele",excelTotal:')
# heading
rep('h.innerHTML=store.get("tab","retete")==="evenimente"&&D?',
    'const tb=store.get("tab","retete");if(tb==="stoc"){h.innerHTML=`Stoc<span class="yr">depozit</span>`;return}\n  h.innerHTML=tb==="evenimente"&&D?')
# expose + hook on upload
rep('window.__evRefresh=()=>{if(D)render()};',
    'window.__evRefresh=()=>{if(D)render()};\nwindow.__cp={norm,KNOWN,CATS,QTY_CATS,parseAOA,evd:()=>EVD};')
rep('try{await a.publish(buildHTML(R,next));EVD=next;route="ziua";loadData();render()}',
    'try{await a.publish(buildHTML(R,next));EVD=next;route="ziua";loadData();render();if(window.__stocIesire)window.__stocIesire(next);if(window.__stocRefresh)window.__stocRefresh()}')
# insert stoc module before final block
stoc=open("stoc.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */', stoc+'\n/* After a save reloads the page, reopen what was being edited */')
css=open("stoc.css",encoding="utf-8").read()
rep("</style>\n</head>",css+"</style>\n</head>")
# drop now-unused training css (harmless if left) -- keep
open("base2.html","w",encoding="utf-8").write(h)
print("ok",len(h))
