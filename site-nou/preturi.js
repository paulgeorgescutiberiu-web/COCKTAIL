/* Prețurile Cocktail Philosophy, într-un singur loc.
   Le folosesc: pagina Oferte de pe site, calculatorul vechi de pe WordPress și aplicația (cotațiile din cererile de ofertă).
   Când schimbi un preț, îl schimbi doar aici. */
window.CP_PRETURI={
  /* All you can drink: [de la, până la (null = fără limită) invitați, € pe invitat] */
  allInclusive:[[0,50,18.4],[50,100,15.4],[100,150,12.4],[150,200,10.4],[200,250,9.4],[250,300,8.4],[300,350,7.4],[350,null,6.4]],
  /* Pachet barmani: număr de barmani -> € */
  barmani:{1:350,2:520,3:690,4:860},
  /* Pachet Final de An (firme, 1 nov – 31 dec): [de la, până la, € pe invitat + TVA] */
  finalDeAn:[[0,50,19.9],[50,100,16.9],[100,150,13.9],[150,200,11.9],[200,250,10.9],[250,null,9.9]],
  /* Servicii + consumație: supliment (%) la tariful serviciilor dacă băutura nu vine prin noi / furnizorul nostru */
  suplimentBauturaClient:30,
  avans:100
};
