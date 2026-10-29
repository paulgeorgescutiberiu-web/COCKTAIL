h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80]); h=h.replace(a,b)
rep('''    <button role="tab" aria-selected="true" aria-controls="v-retete" data-view="retete">Rețete</button>
''','')
rep('''    <button role="tab" aria-selected="false" aria-controls="v-contracte" data-view="contracte" class="edit-only">Contracte</button>
''','''    <button role="tab" aria-selected="false" aria-controls="v-contracte" data-view="contracte" class="edit-only">Contracte</button>
    <button role="tab" aria-selected="false" aria-controls="v-postare" data-view="postare" class="edit-only">Postare</button>
    <button role="tab" aria-selected="false" aria-controls="v-retete" data-view="retete">Rețete</button>
''')
rep('<section class="view" id="v-contracte" role="tabpanel" hidden=""></section>','<section class="view" id="v-contracte" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-postare" role="tabpanel" hidden=""></section>')
rep('if(tb==="contracte"){h.innerHTML=`Contracte<span class="yr">clienți</span>`;return}','if(tb==="contracte"){h.innerHTML=`Contracte<span class="yr">clienți</span>`;return}if(tb==="postare"){h.innerHTML=`Postează<span class="yr">Instagram · Facebook · TikTok</span>`;return}')
n=h.count('store.get("tab","retete")');h=h.replace('store.get("tab","retete")','store.get("tab","evenimente")')
open("base2.html","w",encoding="utf-8").write(h);print("tabs ok",n)
