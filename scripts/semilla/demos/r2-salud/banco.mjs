/* Bancos de texto de reseñas y novedades de Salud (copiados tal cual de b/salud.mjs, que no los exporta); sin datos médicos. */
export const BANCO = {
  pos: {
    open: ["Me atendieron con mucho respeto y sin prisa. | They treated me with great respect and without rushing.", "{p} se tomó el tiempo de explicarme todo en español. | {p} took the time to explain everything to me in Spanish.", "La atención fue rápida y el personal muy amable. | The service was quick and the staff very kind.",
      "Llevo años viniendo con toda mi familia. | I have been coming with my whole family for years.", "Por fin un lugar donde me entienden. | Finally a place where they understand me.", "Salí tranquilo de la consulta. | I left the visit feeling at ease.",
      "Me dieron la cita para el mismo día. | They gave me a same-day appointment.", "Todo estuvo limpio y bien organizado. | Everything was clean and well organized.", "El consultorio es cómodo y la recepción muy atenta. | The office is comfortable and the front desk very attentive."],
    det: ["Me dijeron el precio antes de la cita y fue el mismo. | They told me the price before the visit and it was the same.", "Aceptaron mi seguro sin problemas. | They accepted my insurance with no trouble.", "No esperé más de diez minutos. | I did not wait more than ten minutes.",
      "Respondieron mis preguntas con paciencia. | They answered my questions patiently.", "Me avisaron por mensaje un día antes. | They sent me a reminder message the day before.", "Pude reservar desde la app en un minuto. | I booked in the app in a minute.",
      "Había intérprete y no tuve que pedirlo dos veces. | There was an interpreter and I did not have to ask twice.", "La privacidad se respeta: nadie preguntó de más. | Privacy is respected: no one asked more than needed.", "El cobro fue claro, sin sorpresas. | Billing was clear, with no surprises."],
    close: ["Se lo recomiendo a mi familia y amigos. | I recommend them to my family and friends.", "Seguiré viniendo. | I will keep coming.", "Muy agradecido con todo el equipo. | Very grateful to the whole team.", "Cinco estrellas. | Five stars."],
  },
  mid: {
    open: ["La atención fue buena, aunque esperé más de lo que decía la cita. | The care was good, though I waited longer than the booking said.", "El personal fue amable, pero la cita empezó tarde. | The staff was kind, but the appointment started late.", "Bien en general; el estacionamiento es difícil. | Fine overall; parking is hard."],
    det: ["Me hubiera gustado más tiempo para mis preguntas. | I would have liked more time for my questions.", "El precio me pareció algo alto sin seguro. | The price felt a little high without insurance.", "Tardaron en contestar el teléfono. | They took a while to answer the phone."],
    midClose: ["Espero que mejoren los tiempos. | I hope the wait times improve.", "Voy a volver a intentarlo. | I will give it another try."],
  },
  neg: {
    open: ["Esperé mucho más de lo que decía mi cita. | I waited much longer than my booking said.", "No me quedó claro lo que iba a pagar. | It was not clear what I would pay.", "Sentí que me atendieron con prisa. | I felt I was rushed."],
    det: ["Nadie me avisó del retraso. | Nobody told me about the delay.", "En la recepción me dieron información distinta a la de la app. | The front desk gave me different information than the app.", "Esperaba más claridad con el cobro. | I expected clearer billing."],
  },
  rPos: ["Gracias por su confianza. Aquí estamos para su familia. | Thank you for your trust. We are here for your family.", "Nos alegra saberlo. Gracias por venir. | We are glad to hear it. Thank you for coming.", "Gracias por sus palabras; las compartimos con todo el equipo. | Thank you for your words; we share them with the whole team."],
  rMid: ["Gracias por contarnos. Estamos ajustando la agenda para respetar su hora. | Thanks for telling us. We are adjusting the schedule to respect your time."],
  rNeg: ["Lamentamos la espera. Llame a la oficina y lo revisamos con usted. | We are sorry about the wait. Call the office and we will go over it with you.", "Gracias por avisarnos. Hemos cambiado cómo damos las horas y cómo explicamos los precios. | Thank you for letting us know. We changed how we give times and how we explain prices.", "Tiene razón; le pedimos disculpas. Escríbanos para aclararlo. | You are right; we apologize. Write to us so we can clear it up."],
  answers: (est, r, o) => ({ lengua: r.weighted([["es", 70], ["int", 18], ["no", est <= 2 ? 25 : 4]]), explico: est >= 4 ? 1 : est === 3 ? 0 : -1, cobro: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1 }),
  facts: (o) => ({ seg: !!o.o.det.seguro && o.o.det.seguro.kind !== "none", segOk: !!o.o.det.seguro && o.o.det.seguro.kind !== "none" && o.o.det.seguro.acepta, pago: o.o.det.precio }),
};
export const NOV = [
  { kind: "novedad", t: "Ya reservas tu cita en la app | You can now book online", b: "Elige servicio, doctor y hora. Tu cita no dice por qué vienes. | Choose service, doctor and time. Your booking does not say why you come." },
  { kind: "novedad", t: "Ahora aceptamos más seguros | We now take more insurance plans", b: "Revisa la lista en nuestra página. Si el tuyo no está, llámanos. | Check the list on our page. If yours is not there, call us." },
  { kind: "aviso", t: "Horario de los días festivos | Holiday hours", b: "Cerramos el día feriado y abrimos al siguiente con horario normal. | Closed on the holiday, open the next day on regular hours.", day: "Feriado", hrs: "closed", hrsT: "" },
  { kind: "novedad", t: "Se une una nueva doctora al equipo | A new doctor joins the team", b: "Habla español e inglés y ya tiene agenda abierta. | She speaks Spanish and English and her schedule is open." },
  { kind: "novedad", t: "Vacunas de temporada disponibles | Seasonal vaccines available", b: "Gratis con tu seguro; los sábados sin cita. | Free with your insurance; walk-in on Saturdays." },
  { kind: "hoy", t: "Hay citas libres hoy | Same-day openings", b: "Reserva en la app o llámanos. | Book in the app or call us." },
  { kind: "encuesta", t: "¿Qué horario te sirve más? | Which hours work best for you?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Sábados | Saturdays"] },
  { kind: "novedad", t: "Intérprete sin costo | Interpreter at no cost", b: "Pídelo al reservar y lo tendremos en tu cita. | Ask when you book and we will have one at your visit." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a las familias que confían en nosotros desde {y}. | Thank you to the families who have trusted us since {y}." },
  { kind: "aviso", t: "Cerramos por mantenimiento | Closed for maintenance", b: "Un día de arreglos en el consultorio. Las citas se reprograman solas. | One day of office repairs. Bookings are rescheduled automatically.", day: "Un día", hrs: "closed", hrsT: "" },
];
