/* Venta de Autos (NEG-DEALER) — carros sobre el motor de Educación (TLEduL / TLEduFlow). b.edu = 1, b.inm = 1 (visita gratis: prueba de manejo), b.dealer = 1.
   Cada carro: precio en la puerta en la descripción (precio + impuesto 6 % + placas + cargo del dealer), millaje, título; "Pedir prueba de manejo" = $0 hoy. */
(function boot() {
  const DL = window.TLDealer, EL = window.TLEduL, X = window.TLListing, ALL = window.TLAll; if (!DL || !EL || !X || !ALL) return setTimeout(boot, 40);
  const PH = DL.SUBPH, V = [['Hoy 4 PM', 'Today 4 PM'], ['Mañana 11 AM', 'Tomorrow 11 AM'], ['Sáb 10 AM', 'Sat 10 AM']], VS = [0, 1, 2];
  const car = (n, ne, mi, pr, fee, ph, o) => { const tax = Math.round(pr * 0.06), tag = 150, otd = pr + tax + tag + fee;
    return Object.assign({ n, ne, d: mi.toLocaleString('en-US') + ' millas · título limpio · en la puerta ' + '\u0024' + otd.toLocaleString('en-US') + ' (precio + 6 % impuesto + placas ' + '\u0024' + tag + ' + cargo del dealer ' + '\u0024' + fee + ').', de: mi.toLocaleString('en-US') + ' miles · clean title · out the door ' + '\u0024' + otd.toLocaleString('en-US') + ' (price + 6% tax + ' + '\u0024' + tag + ' tags + ' + '\u0024' + fee + ' dealer fee).', p: pr, k: 'clase', dias: V, start: VS, ph, inc: [['Historial del carro (Carfax)', 'Vehicle history (Carfax)'], ['Inspección de PA al día', 'PA inspection current']] }, o || {}); };
  const SVC = {
    'valle-motors': [['En el lote', 'On the lot', [
      car('2025 Toyota Corolla LE · nuevo', '2025 Toyota Corolla LE · new', 12, 23900, 499, 2127039, { inc: [['Garantía de fábrica 3 años', '3-year factory warranty'], ['Primer servicio gratis', 'First service free']] }),
      car('2022 Honda CR-V EX · certificado', '2022 Honda CR-V EX · certified', 31200, 26900, 499, 116675, { inc: [['Certificado del fabricante: 7 años en motor', 'Manufacturer certified: 7-year powertrain'], ['Historial del carro (Carfax)', 'Vehicle history (Carfax)']] })]]],
    'power-sports-hazleton': [['En la tienda', 'In store', [
      car('2021 Honda Rebel 500', '2021 Honda Rebel 500', 4100, 5900, 199, 2393835),
      car('2022 Yamaha Grizzly 700 · cuatrimoto', '2022 Yamaha Grizzly 700 · ATV', 380, 8400, 199, 1715193, { no: [['Las cuatrimotos no se manejan en la calle en PA.', 'ATVs are not street legal in PA.']] }),
      car('2024 Scooter 150 cc', '2024 150 cc scooter', 90, 1899, 99, 1413412, { no: [['Necesitas licencia clase M o permiso de aprendiz.', 'You need a class M license or learner permit.']] })]]],
    'lake-harmony-botes-campers': [['En el lote', 'On the lot', [
      car('2019 Bayliner VR5 · bote', '2019 Bayliner VR5 · boat', 0, 24500, 399, 296278, { d: '140 horas de motor · título limpio · en la puerta $26,519 (precio + 6 % impuesto + placas $150 + cargo del dealer $399). Remolque incluido.', de: '140 engine hours · clean title · out the door $26,519 (price + 6% tax + $150 tags + $399 dealer fee). Trailer included.' }),
      car('2018 Camper 24 pies', '2018 24 ft camper', 0, 18900, 399, 2533092, { d: 'Duerme 6 · título limpio · en la puerta $20,583 (precio + 6 % impuesto + placas $150 + cargo del dealer $399).', de: 'Sleeps 6 · clean title · out the door $20,583 (price + 6% tax + $150 tags + $399 dealer fee).' }),
      car('Carrito de golf eléctrico · 4 asientos', 'Electric golf cart · 4 seats', 0, 6500, 99, 1325659, { d: 'Batería nueva · en la puerta $7,139 (precio + 6 % impuesto + placas $150 + cargo del dealer $99). No va por la calle.', de: 'New battery · out the door $7,139 (price + 6% tax + $150 tags + $99 dealer fee). Not street legal.' })]]],
    'comercial-keystone': [['En el lote', 'On the lot', [
      car('2019 Ford Transit 250 · van de carga', '2019 Ford Transit 250 · cargo van', 84300, 22900, 399, 2449454),
      car('2018 Isuzu NPR · camión de caja 16 pies', '2018 Isuzu NPR · 16 ft box truck', 121000, 34500, 399, 2449454, { no: [['Pesa menos de 26,001 libras: no necesitas CDL.', 'Under 26,001 lbs: no CDL needed.']] })]]],
    'clasicos-lujo-valle': [['En el lote', 'On the lot', [
      car('2017 Maserati GranTurismo', '2017 Maserati GranTurismo', 28400, 52900, 599, 977003),
      car('1976 Cadillac Eldorado convertible', '1976 Cadillac Eldorado convertible', 61000, 18500, 599, 1974520, { no: [['Clásico: revísalo con tu mecánico antes de firmar.', 'Classic: have your mechanic check it before signing.']] }),
      { n: 'Vende tu clásico en consignación', ne: 'Sell your classic on consignment', d: 'Lo fotografiamos y lo vendemos; cobramos 8 % solo si se vende.', de: 'We photograph and sell it; 8% only if it sells.', p: 0, t: 'gratis', k: 'clase', dias: V, start: VS, ph: 3156482 }]]],
    'servicio-rapido-valle': [['Servicios', 'Services', [
      { n: 'Cambio de aceite sintético', ne: 'Synthetic oil change', d: 'Con filtro y revisión de 20 puntos.', de: 'With filter and 20-point check.', p: 49, t: 'tot', k: 'clase', dias: V, start: VS, ph: 2244746 },
      { n: 'Inspección de PA y emisiones', ne: 'PA inspection and emissions', d: 'Si algo falla, te damos el presupuesto antes.', de: 'If anything fails, you get an estimate first.', p: 59, t: 'tot', k: 'clase', dias: V, start: VS, ph: 4489702 },
      { n: 'Frenos delanteros', ne: 'Front brakes', d: 'Pastillas y discos, piezas y mano de obra.', de: 'Pads and rotors, parts and labor.', p: 289, t: 'tot', k: 'clase', dias: V, start: VS, ph: 6870318 }]]],
    'envios-carros-quisqueya': [['Servicios', 'Services', [
      { n: 'Carro a Santo Domingo', ne: 'Car to Santo Domingo', d: 'Por barco desde Nueva Jersey, de 2 a 4 semanas. Impuestos de aduana en RD aparte.', de: 'By ship from New Jersey, 2 to 4 weeks. DR customs duties extra.', p: 1650, t: 'tot', k: 'clase', dias: V, start: VS, ph: 1117210 },
      { n: 'SUV o pickup a Santiago', ne: 'SUV or pickup to Santiago', d: 'Por Puerto Plata, de 3 a 4 semanas.', de: 'Via Puerto Plata, 3 to 4 weeks.', p: 1950, t: 'tot', k: 'clase', dias: V, start: VS, ph: 262353 },
      { n: 'Recogida en Hazleton', ne: 'Pickup in Hazleton', d: 'Lo llevamos al puerto en grúa.', de: 'We tow it to the port.', p: 150, t: 'tot', k: 'clase', dias: V, start: VS, ph: 262353 }]]],
    'primer-carro-financiamiento': [['Servicios', 'Services', [
      { n: 'Precalificación para tu primer carro', ne: 'First car pre-qualification', d: 'Gratis, con ITIN o sin crédito. Te decimos cuánto te prestan antes de ir al dealer.', de: 'Free, with ITIN or no credit. We tell you how much before you go to the dealer.', p: 0, t: 'gratis', k: 'clase', dias: V, start: VS, ph: 7144195 },
      { n: 'Garantía extendida · 3 años', ne: 'Extended warranty · 3 years', d: 'Motor, transmisión y aire. No es obligatoria para el préstamo.', de: 'Engine, transmission and A/C. Not required for the loan.', p: 1295, t: 'tot', k: 'clase', dias: V, start: VS, ph: 7144195 },
      { n: 'GAP', ne: 'GAP', d: 'Paga lo que debes si el seguro da menos. No es obligatorio.', de: 'Pays what you owe if insurance pays less. Not required.', p: 495, t: 'tot', k: 'clase', dias: V, start: VS, ph: 7144195 }]]],
    'autos-el-cibao': [['En el lote', 'On the lot', [
      car('2016 Honda Civic LX', '2016 Honda Civic LX', 88400, 11900, 399, PH['p:civic'], { no: [['Con ITIN: enganche $1,500, 48 meses al 14.9 % = $272 al mes.', 'With ITIN: $1,500 down, 48 months at 14.9% = $272 a month.']] }),
      car('2017 Toyota Camry SE', '2017 Toyota Camry SE', 76200, 14500, 399, PH['p:camry'], { no: [['Con ITIN: enganche $2,000, 48 meses al 14.9 % = $330 al mes.', 'With ITIN: $2,000 down, 48 months at 14.9% = $330 a month.']] }),
      car('2018 Toyota RAV4 LE AWD', '2018 Toyota RAV4 LE AWD', 69800, 17900, 399, PH['p:rav4'], { no: [['Garantía de 3 meses o 3,000 millas en motor y transmisión.', '3-month or 3,000-mile powertrain warranty.']] })]]],
    'keystone-trucks': [['Pickups y SUVs', 'Pickups & SUVs', [
      car('2015 Ford F-150 XLT 4x4', '2015 Ford F-150 XLT 4x4', 112000, 18900, 299, PH['p:f150']),
      car('2016 Chevrolet Silverado 1500', '2016 Chevrolet Silverado 1500', 98300, 19500, 299, PH['p:silverado']),
      car('2017 Toyota Sienna LE', '2017 Toyota Sienna LE', 91000, 16900, 299, PH['p:sienna'])]]],
    'compre-aqui-hzl': [['En el lote', 'On the lot', [car('2012 Honda Accord EX', '2012 Honda Accord EX', 142000, 6900, 199, PH['p:accord'], { no: [['Sin crédito: enganche $999 y $95 a la semana por 18 meses. Total pagado: $8,409.', 'No credit: $999 down and $95 a week for 18 months. Total paid: $8,409.']] }),
      car('2013 Toyota Corolla LE', '2013 Toyota Corolla LE', 131500, 7400, 199, PH['p:camry'], { no: [['Sin crédito: enganche $999 y $95 a la semana por 18 meses. Total pagado: $8,409.', 'No credit: $999 down and $95 a week for 18 months. Total paid: $8,409.']] })]]] };
  const FREE = { 'placas-y-titulos': [['Trámites', 'Services', [['Placas y registro', 'Placa temporal y registro el mismo día.', 45, 0, 0], ['Cambio de título', 'Compraste o vendiste: el título a tu nombre.', 65, 0, 0], ['Título perdido', 'Te ayudamos a pedir uno nuevo.', 40, 0, 0]]]],
    'subasta-keystone': [['Subasta', 'Auction', [['Subasta pública · sábado', 'Abierta al público; tarifa del comprador $250.', 250, 0, 0], ['Carros reconstruidos', 'Con fotos del choque y la inspección de PA.', 3900, 0, 0], ['Mayoristas', 'Solo dealers con licencia.', 0, 0, 0]]]],
    'remolques-traileres-pa': [['En el lote', 'On the lot', [['Remolque de carga 6 × 12', 'Cerrado, con rampa.', 4900, 0, 0], ['Remolque para carro', 'Con frenos eléctricos.', 3800, 0, 0], ['Tráiler 53 pies usado', 'Para tractocamión; CDL para moverlo.', 18500, 0, 0]]]],
    'lote-la-81': [['En el lote', 'On the lot', [['2014 Honda Odyssey', '148,000 millas.', 7900, 0, 0], ['2012 Toyota Sienna', '161,000 millas.', 6500, 0, 0], ['2015 Nissan Altima', '119,000 millas.', 6900, 0, 0]]]],
    'carros-por-dueno-hzl': [['Servicios', 'Services', [['Buscamos tu carro', 'Tarifa fija por escrito.', 350, 0, 0], ['Avalúo de tu carro', 'Cuánto vale para cambio o venta.', 0, 0, 0], ['Cambio de título con el dueño', 'Lo hacemos contigo para que sea seguro.', 75, 0, 0]]]],
    'cash-for-cars-pa': [['Compra', 'Buying', [['Oferta por tu carro', 'Gratis, por escrito, funcione o no.', 0, 0, 0], ['Grúa', 'Gratis hasta 30 millas.', 0, 0, 0]]]] };
  function reg() { DL.B.forEach(b => { b.edu = 1; b.inm = 1; b.dealer = 1; if (!ALL.B.some(x => x.id === b.id)) ALL.B.push(b); }); Object.assign(EL.SVC, SVC); Object.keys(FREE).forEach(id => { X.MENU[id] = FREE[id]; }); Object.keys(SVC).forEach(id => { X.MENU[id] = SVC[id].map(([te, tn, its]) => [te, tn, its.map(it => [it.n, it.d, it.p || 0, 0, 0])]); }); DL.B.forEach(b => { if (b.addr) X.ADDR[b.id] = b.addr + ', Hazleton PA'; }); }
  reg(); (window.TLReg = window.TLReg || []).push(reg);
  window.TLDealerL = { SVC };
})();
