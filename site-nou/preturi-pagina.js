/* Pune pe pagină prețurile din preturi.js, ca o schimbare de preț să apară peste tot deodată.
   Marcaje în HTML (textul dintre ele rămâne ca rezervă dacă preturi.js nu se încarcă):
   data-p="ai-min"              cel mai mic preț All you can drink pe invitat
   data-p="ai-inv" data-inv=N   prețul pe invitat pentru N invitați (aceeași formulă ca la calculator)
   data-p="ai-tot" data-inv=N   totalul pentru N invitați
   data-barmani=K               Pachet barmani cu K barmani
   data-p="barmani-min"         cel mai mic preț la Pachet barmani
   data-p="fa" data-i=I         Pachet Final de An, treapta I
   data-p="avans"               avansul */
(function(){
  var P=window.CP_PRETURI; if(!P)return;
  function fmt1(v){return v.toLocaleString('ro-RO',{minimumFractionDigits:1,maximumFractionDigits:1})+' €'}
  function fmt0(v){return Math.round(v).toLocaleString('ro-RO')+' €'}
  var T=P.allInclusive||[];
  var PTS=T.map(function(t){return [t[1]===null?375:(t[0]+t[1])/2,t[2]]});
  function price(n){
    if(!PTS.length)return null;
    if(n<=PTS[0][0])return PTS[0][1];
    var last=PTS[PTS.length-1]; if(n>=last[0])return last[1];
    for(var i=1;i<PTS.length;i++){var a=PTS[i-1],b=PTS[i];
      if(n<=b[0])return Math.round((a[1]+(b[1]-a[1])*(n-a[0])/(b[0]-a[0]))*10)/10;}
    return last[1];
  }
  function each(sel,fn){document.querySelectorAll(sel).forEach(function(el){var v=fn(el);if(v!=null)el.textContent=v})}
  each('[data-p="ai-min"]',function(){return T.length?fmt1(Math.min.apply(null,T.map(function(t){return t[2]}))):null});
  each('[data-p="ai-inv"]',function(el){var p=price(+el.dataset.inv);return p==null?null:fmt1(p)});
  each('[data-p="ai-tot"]',function(el){var n=+el.dataset.inv,p=price(n);return p==null?null:fmt0(p*n)});
  var B=P.barmani||{};
  each('[data-barmani]',function(el){var v=B[el.dataset.barmani];return v?fmt0(v):null});
  each('[data-p="barmani-min"]',function(){var v=Object.keys(B).map(function(k){return B[k]});return v.length?fmt0(Math.min.apply(null,v)):null});
  var FA=P.finalDeAn||[];
  each('[data-p="fa"]',function(el){var t=FA[+el.dataset.i];return t?fmt1(t[2]):null});
  each('[data-p="avans"]',function(){return P.avans?fmt0(P.avans):null});
})();
