/* Historia de citas (Belleza, Salud, Profesionales): hasta ~10 años de citas terminadas (más reciente = más), unas canceladas o sin llegar,
   y unas pocas próximas. Cada cita cae en un día/hora abiertos del negocio y de la persona, sin cruzarse con otra de la misma persona.
   Solo datos base: la forma de `details` es la que escribe la app (lib/citas.ts, citas-salud.ts, citas-pro.ts). */
import { HOY, diaN, desdeDia, sumaDias, dow, diaPesado, hhmm } from "./comun.mjs";
import { habituales, ts } from "./historia.mjs";

const INICIO_HISTORIA = "2016-11-20";

/* hooks: { elegir(b, r) → {item, miembro}, detalle(b, item, miembro, r, ctx) → { det, sub, tot, dep, dur, extra }, final(op, r, ctx) } */
export function citasHistoria(b, r, { N, proximas = 5, hooks, pesoRecientes = 2.1, pCancel = 0.08, pNoshow = 0.035 }) {
  const quien = habituales(b, r);
  const ini0 = b.proSince > INICIO_HISTORIA ? b.proSince : INICIO_HISTORIA;
  const ayer = sumaDias(HOY, -1);
  const ocupado = new Map();
  const ops = [], hechas = [];
  const horaDe = (dia, m) => {
    const wd = dow(dia);
    const sem = b.hours[wd];
    if (!sem?.open) return null;
    let rangos = sem.ranges.map(([a, z]) => [+a.slice(0, 2) * 60 + +a.slice(3), +z.slice(0, 2) * 60 + +z.slice(3)]);
    if (m?.wk) { const t = m.wk[wd]; if (!t) return null; rangos = [[Math.round(t[0] * 60), Math.round(t[1] * 60)]]; }
    return rangos;
  };
  const colocar = (dia, mi, dur) => {
    const m = b.members[mi], rangos = horaDe(dia, m);
    if (!rangos?.length) return null;
    for (let intento = 0; intento < 14; intento++) {
      const [a, z] = r.pick(rangos);
      const ult = z - dur;
      if (ult < a) continue;
      const pasos = Math.floor((ult - a) / 15);
      const min = a + 15 * r.int(0, pasos);
      const key = `${mi}|${dia}`, L = ocupado.get(key) ?? [];
      if (L.some(([s, e]) => min < e && min + dur > s)) continue;
      L.push([min, min + dur]); ocupado.set(key, L);
      return min;
    }
    return null;
  };
  let i = 0;
  const total = N + proximas;
  for (let n = 0; n < total; n++) {
    const futura = n >= N;
    const { item, mi } = hooks.elegir(b, r);
    const M = b.members[mi];
    const dur0 = (item.dur ?? 30) + (item.buf ?? 0);
    let dia = null, min = null;
    for (let intento = 0; intento < 20 && min == null; intento++) {
      dia = futura ? sumaDias(HOY, r.int(1, 14)) : diaPesado(r, ini0, ayer, pesoRecientes);
      min = colocar(dia, mi, dur0);
    }
    if (min == null) continue;
    const u = quien();
    const ctx = { u, dia, min, futura };
    const d = hooks.detalle(b, item, M, r, ctx);
    const dur = d.dur ?? item.dur ?? 30;
    const lead = r.int(90, 60 * 24 * 6), resp = r.chance(0.35) ? r.int(0, 2) : r.int(3, 70);
    const o = { i, kind: "appointment", u, m: mi, it: item.sort, dur, buf: item.buf ?? 0, det: d.det, sub: d.sub, tot: d.tot ?? d.sub, dep: 0, pay: "local", pax: null };
    if (futura) {
      o.rel = diaN(dia) - diaN(HOY); o.tm = hhmm(min);
      o.st = "confirmed"; o.sago = r.int(30, 60 * 24 * 3); o.ansm = r.int(1, 60);
      if (d.dep) { o.dep = d.dep; o.pay = "app"; o.ps = "held"; }
    } else {
      o.loc = ts(dia, min);
      const sent = desdeDia(Math.max(diaN(dia) - Math.ceil(lead / 1440), diaN(ini0) - 1));
      const sentMin = Math.max(0, min - (lead % 1440));
      o.sent = ts(sent, sentMin);
      const ansDia = sent, ansMin = Math.min(1439, sentMin + resp);
      o.ans = ts(ansDia, ansMin);
      const x = r();
      if (x < pCancel) {
        o.st = "cancelled"; o.cb = r.chance(0.8) ? "user" : "business";
        o.cr = o.cb === "user" ? r.pick(["a_tiempo", "a_tiempo", "tarde", "solicitud"]) : "negocio";
        const cd = sumaDias(dia, -r.int(0, 2)); const cdm = diaN(cd) < diaN(sent) ? sent : cd;
        o.canc = ts(cdm, cdm === dia ? Math.max(0, min - r.int(120, 600)) : r.int(540, 1100));
        if (o.canc < o.ans) o.canc = o.ans;
        o.sd = null;
      } else if (x < pCancel + pNoshow) {
        o.st = "done"; o.sd = "noshow"; o.done = ts(dia, Math.min(1439, min + dur));
        if (d.dep) { o.dep = d.dep; o.pay = "app"; o.ps = "captured"; }
      } else {
        o.st = "done"; o.sd = "done"; o.done = ts(dia, Math.min(1439, min + dur));
        if (d.dep) { o.dep = d.dep; o.pay = "app"; o.ps = "captured"; }
        ctx.hecha = { i, u, dia, min, persona: M.name.split(" ")[0], svcTxt: item.name, rec: [item.sort], item, miembro: mi, o };
        hechas.push(ctx.hecha);
      }
    }
    if (hooks.final) hooks.final(o, r, { ...ctx, item, M, b, hechas });
    ops.push(o);
    i++;
  }
  return { ops, hechas };
}
