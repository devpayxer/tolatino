/* Staff del negocio (pestaña base). La estructura es la misma para todas las categorías; CAT decide qué muestra cada una.
   Solo aparece quien aceptó la invitación; la persona controla su foto y su bio. El contacto pasa por el negocio (salvo silla o cabina propia).
   wk = horario por día de la semana (0 = dom … 6 = sáb): [entra, sale] o null. Hoy = jue 24 sep 2026, 12:30 PM. */
(function () {
  const P = (id, h) => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 500);
  /* rate = calificación propia · next = próxima hora libre · dishes = sus platos · works = trabajos · dates = próximas fechas · cert = licencias · cta = acción principal */
  const CAT = {
    comida: { title: ['El equipo', 'The team'], dishes: 1, cert: 1, cta: 'menu' },
    belleza: { title: ['Barberos y estilistas', 'Barbers and stylists'], rate: 1, next: 1, works: 1, cert: 1, cta: 'booking' },
    noche: { title: ['DJs y equipo', 'DJs and team'], dates: 1, cta: 'mesa' },
    salud: { title: ['Profesionales', 'Providers'], rate: 1, next: 1, cert: 1, cta: 'cita' }
  };
  const LANG = { es: ['Español', 'Spanish'], en: ['Inglés', 'English'], qu: ['Quechua', 'Quechua'] };
  const CERT = (y) => ({ es: 'Certificación en seguridad alimentaria · Pensilvania', en: 'Food safety certification · Pennsylvania', ok: 1, exp: ['Vence en ' + y, 'Expires ' + y] });
  const D = (a, b, c, d, e, f, g) => [a, b, c, d, e, f, g];
  const PEOPLE = {
    'sabor-dominicano': [
      { ph: 16810622, langs: ['es'], sp: [['Guisos', 'Stews'], ['Sancocho', 'Sancocho'], ['Catering', 'Catering']], wk: D([11, 17], null, [11, 17], [11, 17], [11, 17], [11, 17], [11, 17]), dishes: ['bandera', 'chivo', 'sancocho'], cert: CERT('mar 2028'),
        bio: ['Aprendí a cocinar con mi abuela en Moca. Llegué a Hazleton en 2009 y en 2014 abrimos Sabor Dominicano con mi hijo Juan Carlos. El sancocho del domingo sigue siendo su receta.', 'I learned to cook with my grandmother in Moca. I came to Hazleton in 2009 and in 2014 we opened Sabor Dominicano with my son Juan Carlos. The Sunday sancocho is still her recipe.'] },
      { ph: 20147040, langs: ['es', 'en'], sp: [['Parrilla', 'Grill'], ['Chicharrón', 'Chicharrón'], ['Mofongo', 'Mofongo']], wk: D([15, 21], [15, 21], null, null, [15, 21], [15, 21], [15, 21]), dishes: ['chicharron', 'mofongo', 'picapollo'],
        bio: ['Me encargo de la parrilla y del chicharrón. Si pides mofongo en la noche, lo más seguro es que lo pise yo.', 'I run the grill and the chicharrón. If you order mofongo at night, I am most likely the one mashing it.'] },
      { ph: 6223005, langs: ['es', 'en'], sp: [['Pedidos grandes', 'Large orders'], ['Catering', 'Catering'], ['Reservaciones', 'Reservations']], wk: D(null, [11, 19], [11, 19], [11, 19], null, [11, 19], [11, 19]), dishes: [],
        bio: ['Te recibo en el salón y en la caja. Coordino los pedidos grandes y el catering para bautizos y cumpleaños.', 'I welcome you in the dining room and at the register. I coordinate large orders and catering for baptisms and birthdays.'] },
      { ph: 13443789, langs: ['es', 'en'], sp: [['Delivery en Hazleton', 'Hazleton delivery'], ['Pedidos grandes', 'Large orders']], wk: D([12, 21], [12, 21], null, null, [12, 21], [12, 21], [12, 21]), dishes: [],
        bio: ['Llevo los pedidos por todo Hazleton. Si me dejas instrucciones de cómo entrar, llego más rápido.', 'I deliver orders all over Hazleton. If you leave instructions on how to get in, I get there faster.'] }
    ],
    'el-fogon': [
      { ph: 31752160, langs: ['es'], sp: [['Parrilla al carbón', 'Charcoal grill'], ['Churrasco', 'Churrasco']], wk: D([16, 24], null, null, [16, 24], [16, 24], [16, 24], [16, 24]), dishes: ['Churrasco', 'Chuleta ahumada'], cert: CERT('ago 2027'),
        bio: ['Parrillero desde los 15 años en Santiago. En El Fogón la carne se hace al carbón, sin apuro.', 'Grill master since I was 15 in Santiago. At El Fogón the meat is cooked over charcoal, no rush.'] },
      { ph: 4349799, langs: ['es', 'en'], sp: [['Grupos', 'Groups'], ['Reservaciones', 'Reservations']], wk: D([18, 24], null, null, null, [18, 24], [18, 24], [18, 24]), dishes: [],
        bio: ['Atiendo el salón de jueves a domingo. Si vienen en grupo, reserven y les preparo la mesa.', 'I run the dining room Thursday to Sunday. If you come as a group, book ahead and I will set up your table.'] }
    ],
    'pollo-don-lucho': [
      { ph: 17861364, langs: ['es', 'en'], sp: [['Pollo a la brasa', 'Rotisserie chicken'], ['Cocina peruana', 'Peruvian food']], wk: D(null, [11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 22]), dishes: ['Pollo entero', 'Lomo saltado'], cert: CERT('ene 2028'),
        bio: ['Traje de Lima la receta del pollo a la brasa de mi papá. El ají de la casa lo hacemos todos los días.', "I brought my dad's rotisserie chicken recipe from Lima. We make the house ají every day."] },
      { ph: 16782090, langs: ['es', 'qu'], sp: [['Ají de gallina', 'Ají de gallina'], ['Salsas', 'Sauces']], wk: D([11, 19], null, [11, 19], [11, 19], [11, 19], [11, 19], [11, 19]), dishes: ['Ají de gallina'],
        bio: ['Soy de Cusco. Hago el ají de gallina y las salsas de la casa.', "I'm from Cusco. I make the ají de gallina and the house sauces."] }
    ],
    'panaderia-la-espiga': [
      { ph: 16937177, langs: ['es'], sp: [['Pan de agua', 'Pan de agua'], ['Bizcochos', 'Cakes'], ['Encargos', 'Special orders']], wk: D(null, [5, 13], [5, 13], [5, 13], [5, 13], [5, 13], [5, 13]), dishes: ['Pan de agua', 'Bizcocho dominicano'], cert: CERT('jun 2027'),
        bio: ['Horneo desde las 5 de la mañana. El pan de agua sale a las 7 y el bizcocho se encarga con 48 horas.', 'I bake from 5 in the morning. Pan de agua comes out at 7 and cakes are ordered 48 hours ahead.'] },
      { ph: 16239806, langs: ['es', 'en'], sp: [['Horno', 'Oven'], ['Encargos', 'Special orders']], wk: D(null, [12, 19], [12, 19], [12, 19], [12, 19], [12, 19], null), dishes: ['Pan sobao', 'Tres leches'],
        bio: ['Me ocupo del horno y de los encargos. Si tu bizcocho es para el sábado, pídelo el jueves.', 'I handle the oven and special orders. If your cake is for Saturday, order it on Thursday.'] }
    ]
  };
  window.TLStaff = { P, CAT, LANG, PEOPLE, TODAY: 4, NOW: 12.5 };
})();
