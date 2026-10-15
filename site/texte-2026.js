// Textele noi pentru prima pagină (pagina 546), aprobate de Paul pe 15 oct 2026.
// Se rulează în browser, pe cocktailphilosophy.ro, logat în WordPress.
// Fiecare T(început, text nou) înlocuiește textul de la „început” până la primul tag HTML.
async function aplicaTexte2026(){
  const n=await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce',{credentials:'include'})).text();
  let r=(await (await fetch('/wp-json/wp/v2/pages/546?context=edit',{credentials:'include',headers:{'X-WP-Nonce':n}})).json()).content.raw;
  const rep={};
  const T=(start,txt)=>{const i=r.indexOf(start);if(i<0){rep[start]='NU';return}const j=r.indexOf('<',i);rep[start]='ok';r=r.slice(0,i)+txt+r.slice(j)};
  T('Experiența completă de bar','Tu te distrezi. Noi ne ocupăm de bar.');
  T(' ✓ Îți punem la dispoziție o gamă',' ✓ Cocktailuri create de noi, deja pe placul a peste 80.000 de invitați.');
  T(' ✓&nbsp;Logistică completă',' ✓ Venim cu tot: bar mobil, echipamente, ingrediente și pahare de sticlă. Da, de sticlă, nu de plastic.');
  T(' ✓ Ne recomandă pasiunea',' ✓ 12 ani de experiență și aceeași pasiune ca în prima seară.');
  T(' ✓ Buna dispoziție a',' ✓ Buna dispoziție a invitaților tăi e principalul nostru KPI.');
  T(' ✓ Personal calificat',' ✓ Barmani pregătiți serios: cursuri atestate și evenimente de bartending, ca să fie mereu în formă.');
  T(' ✓ Plata ulterior',' ✓ Plătești după petrecere, pe factură la termen. Știm cât costă un eveniment, așa că nu te grăbim.');
  T('Solicită o ofertă','Vreau o ofertă');
  T('Intermediere si livrare','Livrăm băuturi la prețuri speciale, pentru orice tip de eveniment');
  T('Servicii profesioniste de bartending','Bartending profesionist pentru nunți, petreceri private și evenimente corporate');
  T('Furnizare de echipamente','Bar mobil și toată logistica, ca să nu-ți bați tu capul');
  T('Organizare de workshop','Workshop-uri de cocktailuri, tematice sau pe gustul tău');
  T('Consultanță soluții bar','Consultanță pentru cine deschide un bar nou: te ajutăm să pornești cu dreptul');
  T('Cocktail Philosophy înseamnă o echipă de barmani','Suntem o echipă de barmani care iubesc ce fac, și se vede. Venim la evenimentul tău cu cocktailuri gândite ca mici opere de artă, cu zâmbetul pregătit și chef de vorbă cu invitații. Ne jucăm cu ingredientele, niciodată cu calitatea. Misiunea noastră e simplă: fiecare pahar să lase în urmă o amintire bună. Și pentru că nu există două petreceri la fel, nici barul nostru nu e niciodată la fel.');
  T('Când nu ne găsești la evenimentele','Între evenimente nu stăm degeaba. Testăm rețete noi, facem siropurile în casă și alegem garniturile una câte una. Credem că fiecare pahar spune o poveste. Noi doar ne asigurăm că e una bună.');
  T('Îți punem la dispoziție două variante','Două feluri de a lucra cu noi. Tu alegi ce ți se potrivește, noi facem restul.');
  r=r.split('rel="noopener noreferrer">Detalii</a>').join('rel="noopener noreferrer">Vezi oferta</a>');
  T('Un meniu in ton','Un meniu pe gustul evenimentului tău');
  T('MENIU</a>','Vezi meniul');
  T('Cocktail Philosophy în numere','Cocktail Philosophy în cifre');
  T('Nu suntem matematicieni','Nu suntem matematicieni, dar cifrele astea ne fac să zâmbim.');
  T('Testimoniale</span></h2>','Ce zic oamenii după petrecere');
  T('Contactează-ne</span>','Hai să vorbim!');
  T('Daca vrei sa ne contactezi','Ai un eveniment în plan, vrei un cocktail special sau doar ai o idee care nu-ți dă pace? Scrie-ne sau sună-ne, suntem la un mesaj distanță.');
  const si=r.indexOf('data-label="servicii"');const hi=r.indexOf('Servicii',r.indexOf('<h2',si));
  if(hi>0&&hi-si<3000){r=r.slice(0,hi)+'Ce facem (foarte bine)'+r.slice(hi+8);rep.servicii='ok'}
  return {rep,raw:r,nonce:n};
}
