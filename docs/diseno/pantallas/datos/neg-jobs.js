/* Jobs del negocio (pestaña base, solo Pro). Pago real por hora obligatorio. Sin CV, sin estatus migratorio ni SSN.
   pay = [mín, máx] por hora · tips = lleva propinas · sch = [días es, días en, horas] · lang = idiomas (req = obligatorio) · req = requisitos · ben = beneficios · ago = días publicada · left = cupos. */
(function () {
  const J = {
    'sabor-dominicano': [
      { id: 'j-sd-1', t: ['Ayudante de cocina', 'Kitchen helper'], k: ['Tiempo completo', 'Full time'], pay: [15, 17], tips: 0, sch: ['Martes a domingo', 'Tuesday to Sunday', '11 AM – 7 PM'], lang: [['es', 1], ['en', 0]],
        d: ['Preparación, limpieza y apoyo en la línea con Rosa y Juan Carlos. Si sabes de cocina dominicana, mejor; si no, te enseñamos.', 'Prep, cleaning and line support with Rosa and Juan Carlos. Dominican cooking experience is a plus; if not, we teach you.'],
        req: [['Mayor de 18 años', '18 or older'], ['Poder estar de pie todo el turno', 'Able to stand the whole shift']], ben: [['Comida del turno gratis', 'Free shift meal'], ['Pago cada semana', 'Paid weekly'], ['Aumento a los 90 días', 'Raise after 90 days']], ago: 3, left: 1 },
      { id: 'j-sd-2', t: ['Chofer de delivery', 'Delivery driver'], k: ['Medio tiempo', 'Part time'], pay: [13, 13], tips: 1, sch: ['Jueves a domingo', 'Thursday to Sunday', '5 PM – 9 PM'], lang: [['es', 1], ['en', 1]],
        d: ['Llevas los pedidos por Hazleton. Te damos la bolsa térmica y la gasolina se paga por milla.', 'You deliver orders around Hazleton. We give you the thermal bag and gas is paid per mile.'],
        req: [['Carro propio', 'Own car'], ['Licencia de Pensilvania', 'Pennsylvania license'], ['Seguro del carro al día', 'Current car insurance']], ben: [['Propinas completas para ti', 'You keep all tips'], ['Millaje pagado', 'Mileage paid'], ['Comida del turno gratis', 'Free shift meal']], ago: 6, left: 2 }
    ],
    'el-fogon': [
      { id: 'j-ef-1', t: ['Mesero o mesera', 'Server'], k: ['Medio tiempo', 'Part time'], pay: [10, 10], tips: 1, sch: ['Jueves a domingo', 'Thursday to Sunday', '6 PM – cierre'], lang: [['es', 1], ['en', 1]],
        d: ['Atiendes el salón y la terraza los fines de semana. Noches movidas con la Serie del Caribe.', 'You serve the dining room and patio on weekends. Busy nights during the Caribbean Series.'], req: [['Mayor de 18 años', '18 or older']], ben: [['Propinas', 'Tips'], ['Comida del turno gratis', 'Free shift meal']], ago: 2, left: 1 }
    ],
    'pizza-express': [
      { id: 'j-pe-1', t: ['Chofer de delivery', 'Delivery driver'], k: ['Tiempo completo', 'Full time'], pay: [14, 14], tips: 1, sch: ['Lunes a sábado', 'Monday to Saturday', '4 PM – 11 PM'], lang: [['es', 0], ['en', 1]],
        d: ['Delivery de pizzas en Hazleton y West Hazleton.', 'Pizza delivery in Hazleton and West Hazleton.'], req: [['Carro propio', 'Own car'], ['Licencia de Pensilvania', 'Pennsylvania license'], ['Récord de manejo limpio', 'Clean driving record']], ben: [['Propinas', 'Tips'], ['Millaje pagado', 'Mileage paid']], ago: 4, left: 1 }
    ]
  };
  window.TLJobs = { J };
})();
