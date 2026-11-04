/* Măsurarea apăsărilor importante de pe site, în Google Analytics (GA4, tagul pus de snippetul din WordPress).
   Evenimente trimise (le marchezi ca „Key events” în GA4 → Admin → Events):
     click_whatsapp    apăsare pe orice link WhatsApp
     click_telefon     apăsare pe numărul de telefon
     click_email       apăsare pe adresa de email
     click_social      Instagram / Facebook / YouTube
     click_recenzii    linkurile spre recenziile de pe Google și Facebook
     descarca_meniu    deschiderea PDF-ului cu meniul
     intrebare_citita  deschiderea unei întrebări frecvente
     calculator_folosit  prima modificare în calculatorul de preț (pagina Oferte)
   Fiecare are: zona (unde pe pagină: hero, contact, subsol, bara de jos…) și pagina.
   generate_lead (formularul trimis) îl trimite deja cerere.js. */
(function(){
  if(window.__cpMasurare)return;window.__cpMasurare=true;
  function send(name,params){
    try{
      params=params||{};params.pagina=location.pathname;params.transport_type='beacon';
      if(typeof window.gtag==='function')window.gtag('event',name,params);
      else{window.dataLayer=window.dataLayer||[];window.dataLayer.push(['event',name,params])}
    }catch(e){}
  }
  function zona(el){
    if(el.closest('.mbar,.fab'))return 'bara-contact';
    if(el.closest('footer'))return 'subsol';
    if(el.closest('header,.top,nav'))return 'meniu-sus';
    var s=el.closest('section,[id]');
    if(s){if(s.id)return s.id;var h=s.querySelector('h1,h2');if(h)return h.textContent.trim().toLowerCase().replace(/\s+/g,' ').slice(0,40)}
    return 'pagina';
  }
  function tip(a){
    var h=(a.getAttribute('href')||'').toLowerCase();
    if(h.indexOf('wa.me/')>-1||h.indexOf('api.whatsapp.com')>-1||h.indexOf('whatsapp://')===0)return 'click_whatsapp';
    if(h.indexOf('tel:')===0)return 'click_telefon';
    if(h.indexOf('mailto:')===0)return 'click_email';
    if(/\/reviews|customers\/reviews|search\?q=cocktail\+philosophy/.test(h))return 'click_recenzii';
    if(/instagram\.com|facebook\.com|youtube\.com|tiktok\.com/.test(h))return 'click_social';
    if(/meniu[^"]*\.pdf/.test(h))return 'descarca_meniu';
    return '';
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    var t=tip(a);if(!t)return;
    var p={zona:zona(a),text:(a.getAttribute('aria-label')||a.textContent||'').trim().replace(/\s+/g,' ').slice(0,60)};
    if(t==='click_social'){var m=a.href.match(/(instagram|facebook|youtube|tiktok)/i);if(m)p.retea=m[1].toLowerCase()}
    send(t,p);
  },true);
  /* întrebările frecvente: care sunt citite (doar la deschidere) */
  document.querySelectorAll('.faq-list details').forEach(function(d){
    d.addEventListener('toggle',function(){if(d.open){var s=d.querySelector('summary');send('intrebare_citita',{intrebare:s?s.textContent.trim().slice(0,90):''})}});
  });
  /* calculatorul de preț: o singură dată pe vizită */
  var calc=false;
  document.addEventListener('input',function(e){
    if(calc)return;var el=e.target;if(!el.closest||!el.closest('.calc,#calculator,[data-calc]'))return;
    calc=true;send('calculator_folosit',{camp:el.name||el.id||''});
  },true);
})();
