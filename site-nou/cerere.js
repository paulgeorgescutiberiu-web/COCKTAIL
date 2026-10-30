/* Cererile de ofertă din site: se salvează în aplicație (Firestore barLead → Contracte), ca la /bar/,
   anunță scenariul Make (dacă e setat în Datele firmei) și oferă și varianta pe WhatsApp, cu mesajul gata scris.
   Formularul are data-lead="<cod>" data-evn="<eticheta din aplicație>" data-intro="<prima frază din WhatsApp>". */
(function(){
  var WA='40743785655';
  var CFG={apiKey:"AIzaSyBdnMe0062NUOsIBlRZ1NqKlPniDwWXebI",authDomain:"cocktail-philosophy-dc34b.firebaseapp.com",projectId:"cocktail-philosophy-dc34b",storageBucket:"cocktail-philosophy-dc34b.firebasestorage.app",messagingSenderId:"924422421135",appId:"1:924422421135:web:127a3c78598b64afb84efa"};
  var MON=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
  var fsP=null;
  function load(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)})}
  function db(){
    if(!fsP){fsP=load('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js')
      .then(function(){return load('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js')})
      .then(function(){if(!firebase.apps.length)firebase.initializeApp(CFG);return firebase.firestore()})}
    return fsP;
  }
  function ga(n,p){try{window.gtag&&gtag('event',n,p||{})}catch(e){}}
  function timeout(p,ms){return Promise.race([p,new Promise(function(_,ko){setTimeout(function(){ko('timeout')},ms)})])}

  document.querySelectorAll('form[data-lead]').forEach(function(F){
    var btn=F.querySelector('button[type=submit]'),label=btn?btn.textContent:'';
    var msgBox=document.createElement('p');msgBox.className='form-msg w';msgBox.setAttribute('role','status');msgBox.hidden=true;
    btn&&btn.insertAdjacentElement('afterend',msgBox);
    F.addEventListener('submit',function(e){
      e.preventDefault();
      var v=function(n){var el=F.elements[n];return el?(el.value||'').trim():''};
      var tel=v('tel');
      if(!v('nume')){msgBox.textContent='Scrie-ne numele tău.';msgBox.hidden=false;return}
      if(tel.replace(/\D/g,'').length<9){msgBox.textContent='Lasă-ne un număr de telefon, ca să te putem suna sau să-ți scriem.';msgBox.hidden=false;F.elements.tel&&F.elements.tel.focus();return}
      var extra=v('firma')?'Firma: '+v('firma')+'. ':'';
      var lead={nume:v('nume').slice(0,60),tel:tel.slice(0,20),data:v('data').slice(0,10),inv:v('inv').replace(/\D/g,'').slice(0,6),
        loc:v('loc').slice(0,80),msg:(extra+v('msg')).slice(0,500),ev:('site-'+F.dataset.lead).slice(0,40),evn:(F.dataset.evn||'Site').slice(0,60),at:new Date().toISOString()};
      var dt=lead.data?(function(){var m=lead.data.split('-');return (+m[2])+' '+MON[+m[1]-1]+' '+m[0]})():'';
      var t='Bună! Sunt '+lead.nume+(v('firma')?' de la '+v('firma'):'')+'. '+(F.dataset.intro||'Aș dori o ofertă pentru evenimentul meu.');
      if(dt)t+='\nData: '+dt; if(lead.loc)t+='\nLocația: '+lead.loc; if(lead.inv)t+='\nNumăr invitați: '+lead.inv; if(v('msg'))t+='\n'+v('msg');
      var wa='https://wa.me/'+WA+'?text='+encodeURIComponent(t);
      btn.disabled=true;btn.textContent='Se trimite…';
      timeout(db().then(function(fs){
        return fs.collection('barLead').add(lead).then(function(){
          return fs.doc('bar/info').get().then(function(d){
            var hk=d.exists&&d.data().links&&d.data().links.hook;
            if(hk&&/^https:\/\/hook\.[a-z0-9]+\.make\.com\//.test(hk))fetch(hk,{method:'POST',mode:'no-cors',body:new URLSearchParams({nume:lead.nume,tel:lead.tel,data:lead.data,inv:lead.inv,loc:lead.loc,msg:lead.msg,eveniment:lead.evn,wa:'https://wa.me/'+lead.tel.replace(/\D/g,'').replace(/^0/,'40')})});
          }).catch(function(){});
        });
      }),8000).then(function(){
        ga('generate_lead',{form:F.dataset.lead,guests:lead.inv||''});
        msgBox.innerHTML='Mulțumim! Am primit cererea și te contactăm noi, direct. Dacă vrei, scrie-ne și pe <a href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>.';
        msgBox.hidden=false;F.reset();btn.textContent='Trimis ✓';
      },function(){
        btn.disabled=false;btn.textContent=label;
        msgBox.innerHTML='Nu am putut salva cererea. <a href="'+wa+'" target="_blank" rel="noopener">Trimite-ne-o pe WhatsApp</a> sau sună la 0743 785 655.';
        msgBox.hidden=false;
      });
    });
  });
})();
