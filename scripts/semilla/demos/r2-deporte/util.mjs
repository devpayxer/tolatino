/* Piezas para definir las subcategorías de Deporte de la ronda 2 sin repetir estructura. */
export const I = (es, en, de, dn, p, d, k, o = {}) => ({ es, en, de, dn, p, d, k, g1: !!o.g1, sem: o.sem ?? null, dep: o.dep ?? 0, inc: o.inc ?? null, core: o.core !== false, slots: o.slots ?? null });

/* Horarios de la semana, índice 0 = domingo. */
export const H = {
  gym: () => [[480, 1080], [300, 1320], [300, 1320], [300, 1320], [300, 1320], [300, 1260], [420, 1140]],
  dia: () => [[600, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 1140], [540, 1140]],
  tarde: () => [[600, 1080], [960, 1260], [960, 1260], [960, 1260], [960, 1260], [960, 1320], [540, 1260]],
  noche: () => [[600, 1200], [1020, 1380], [1020, 1380], [1020, 1380], [1020, 1380], [1020, 1440 - 1], [600, 1439]],
  finde: () => [[540, 1140], null, null, [1020, 1260], [1020, 1260], [1020, 1320], [480, 1200]],
  mananas: () => [[420, 780], [360, 1200], [360, 1200], [360, 1200], [360, 1200], [360, 1080], [480, 840]],
  luz: () => [[480, 1080], [480, 1140], [480, 1140], [480, 1140], [480, 1140], [480, 1200], [420, 1200]],
  fin2: () => [[480, 1020], null, null, [900, 1200], [900, 1200], [900, 1260], [420, 1260]],
};

/* Una subcategoría; `o` trae lo propio: sec, rolDueno, rolEquipo, solo, mujer, contrato, guard, lugar, h24, amen, rel, pesoHora, gym, pos, det, mid, neg, nov. */
export const S = (sub, nombres, items, about, horas, faqs, o = {}) => ({
  sub, tipo: sub, nombres, items, about, horas, faqs,
  sec: o.sec ?? "Reservas y membresías | Bookings and memberships",
  rolDueno: o.rolDueno ?? "Entrenador · dueño | Coach · owner", rolEquipo: o.rolEquipo ?? "Entrenador | Coach",
  solo: !!o.solo, mujer: !!o.mujer, contrato: o.contrato, guard: !!o.guard, lugar: o.lugar ?? "techado", h24: !!o.h24, amen: o.amen ?? null, rel: o.rel ?? [],
  pesoHora: o.pesoHora, gym: !!o.gym, pos: o.pos ?? null, det: o.det ?? null, mid: o.mid ?? null, neg: o.neg ?? null, nov: o.nov ?? null,
});
