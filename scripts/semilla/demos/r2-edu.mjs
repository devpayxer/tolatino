// Ronda 2 · NEG-EDU: las 43 subcategorías que faltan (todas menos las 5 de la ronda 1), 10 negocios cada una, 2 por ciudad.
// Uso: node scripts/semilla/demos/r2-edu.mjs  →  infra/pruebas/demos/demo-x-edu.sql (determinista, sin red, solo SANDBOX).
// Reusa por importación los ayudantes del grupo D (ronda 1): negociosBase, fichaComun, novedades, ponerResenas, cohortes, matriculas, sqlComun…
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rng, bi, usd, addDays, ymd, ANCHOR_D, H, horario, s, CIUDADES, CITY_IDS, CLIENTES, NOMBRES_F, NOMBRES_M, APELLIDOS, sqlComun } from "./d/comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./d/base.mjs";
import { sqlItems } from "./d/items.mjs";
import { cohortes, matriculas, sqlGrupos } from "./d/grupos.mjs";
import { sqlGrupoDeMatricula2 } from "./r2-edu/grupo.mjs";
import { SUBS2 } from "./r2-edu/subs.mjs";
import { textos } from "./r2-edu/textos.mjs";

/* Rangos reservados de esta tarea: dueños +14845558400–8999, clientes +17175554200–4499, operaciones I-35000000–35999999. */
const DUENO0 = 8400, CLI0 = 4200, CLI_N = 300, NUM0 = 35000000;
{ // los clientes del grupo D se reemplazan EN SITIO (misma lista que ven sus ayudantes) por los de esta ronda
  const r = rng("clientes-r2-edu"); CLIENTES.length = 0;
  for (let k = 0; k < CLI_N; k++) { const f = r.chance(0.55); CLIENTES.push({ phone: `+1717555${CLI0 + k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); }
}

const NOMBRE = ["Faro", "Puente", "Camino", "Roble", "Sol", "Horizonte", "Semilla", "Brújula", "Ceiba", "Colibrí", "Ancla", "Laurel", "Cometa", "Mirador", "Pionero", "Cumbre", "Ribera", "Aurora", "Granada", "Trébol", "Olivo", "Delta", "Manantial", "Alborada", "Estrella", "Cántaro", "Vereda", "Atalaya", "Palmar", "Girasol"];
const ADJ = ["Dorado", "Nuevo", "Real", "Azul", "Claro", "Firme", "Vivo", "Abierto", "Grande", "Fiel", "Verde", "Sereno", "Alto", "Cercano", "Brillante", "Del Valle", "Latino", "Joven", "Seguro", "Franco", "Del Norte", "Del Río", "Fuerte", "Amable", "Sabio", "De la Montaña", "Del Pueblo", "Ligero", "Eterno", "Radiante", "Tranquilo"];
const PRE = { acad: ["Academia", "Centro", "Instituto"], tutor: ["Centro de", "Academia", "Aula"], tech: ["Instituto", "Academia", "Centro"], trade: ["Escuela", "Instituto", "Centro"], arte: ["Estudio", "Academia", "Taller"] };

const inc = (...a) => a.map((x) => bi(x[0], x[1]));
const SCHED = { N24: [[2, 4], 1110], N13: [[1, 3], 1080], S: [[6], 600], N2: [[2], 1110], N4: [[4], 1110] };
const R5 = (c) => Math.round(c / 500) * 500;

const SUBS = SUBS2.map((S, k) => ({
  ...S, also: null,
  names: Array.from({ length: 10 }, (_, i) => {
    const g = k * 10 + i, brand = `${NOMBRE[g % 30]} ${ADJ[g % 31]}`, p = PRE[S.fam][i % 3];
    if (i % 5 === 4) return `Centro ${brand}`;
    return i % 2 === 0 ? `${p} ${brand} ${S.tema}` : `${S.tema} ${brand}`;
  }),
}));
const PORFAM = Object.fromEntries(["acad", "tutor", "tech", "trade", "arte"].map((f) => [f, textos(f)]));

export function generar() {
  const negocios = negociosBase("EDU", "NEG-EDU", SUBS, {
    ficha(b, S, r) {
      const P = PORFAM[S.fam], m = 0.9 + r.f() * 0.22, items = []; let k = 0;
      const nCursos = r.i(3, S.cursos.length), cursos = r.shuffle(S.cursos).slice(0, nCursos);
      if (!cursos.some((c) => SCHED[c[8]][0][0] !== 6)) cursos[0] = S.cursos.find((c) => SCHED[c[8]][0][0] !== 6) || cursos[0];
      cursos.forEach((cu) => {
        const [nes, nen, des, den, usdP, sem, horas, usdDep, sch, fl] = cu, cents = Math.max(R5(usdP * 100 * m), 2000), dep = usdDep ? Math.min(cents - 500, R5(usdDep * 100 * m)) : 0;
        const [dows, min] = SCHED[sch];
        const a = { sem, horas, dep, ...(fl.includes("p") && cents >= 20000 ? { plan_n: 3 } : {}), ...(S.aviso ? { no: inc(S.aviso) } : {}) };
        items.push({ sec: bi("Cursos", "Courses"), secSort: 0, name: bi(nes, nen), descr: bi(des, den), cents, dur: 60, kind: "curso", attrs: a, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep, curso: { sem, dows, min, beginner: fl.includes("b") } });
      });
      const mes = S.mes.length && r.chance(0.8) ? r.pick(S.mes) : null;
      if (mes) items.push({ sec: bi("Clases por mes", "Monthly classes"), secSort: 1, name: bi(mes[0], mes[1]), descr: bi(mes[2], mes[3]), cents: Math.max(R5(mes[4] * 100 * m), 2000), dur: 60, kind: "mes", attrs: { g1: true, inc: inc(["Primera clase gratis", "First class free"]) }, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep: 0, mes: { dows: r.pick([[2], [4], [6], [1]]), min: r.pick([1080, 1110, 600]) } });
      b.items = items;
      const lin = S.fam !== "trade" && S.fam !== "arte" && r.chance(0.3), hib = !lin && r.chance(0.12);
      b.edu = { linea: lin, hibrido: hib, esp: true, reply: r.pick([12, 24, 24, 48]) };
      b.radius = null; b.fromHome = false; b.languages = r.chance(0.6) ? ["es", "en"] : ["es"];
      const plan = items.some((x) => x.attrs.plan_n);
      b.about = bi(`${b.name} ofrece ${S.es.toLowerCase()} en ${CIUDADES[b.city].n} desde ${b.founded}. Grupos pequeños, maestros que hablan tu idioma y horarios de noche y fin de semana para quienes trabajan. Te inscribes desde la app y pagas la matrícula allí; el resto, en la escuela${plan ? " o en tres pagos" : ""}.${S.aviso ? " " + S.aviso[0] : ""}`,
        `${b.name} offers ${S.en.toLowerCase()} in ${CIUDADES[b.city].n} since ${b.founded}. Small groups, teachers who speak your language and evening and weekend schedules for people who work. You enroll in the app and pay the fee there; the rest at the school${plan ? " or in three payments" : ""}.${S.aviso ? " " + S.aviso[1] : ""}`);
      b.amenities = [...(plan ? ["plan-de-pagos"] : []), "acepta-tarjeta", ...(r.chance(0.5) ? ["estacionamiento"] : []), ...(lin || hib ? ["en-linea"] : [])];
      b.hours = horario(r.chance(0.6) ? H.lunSabCorto("09:00", "21:00", "09:00", "14:00").map((x, i) => (i === 0 ? null : x)) : H.lunSab("14:00", "21:30").map((x, i) => (i === 0 ? null : x)));
      const fv = ["esp", "presencial"]; if (items.some((x) => x.curso?.beginner)) fv.push("princ"); if (b.founded <= 2016) fv.push("y10"); if (lin) fv.push("linea"); if (hib) fv.push("hibrido");
      if (plan) fv.push("plan"); if (items.some((x) => x.kind === "mes")) fv.push("gratis1"); fv.push("noche"); if (items.some((x) => x.curso?.dows[0] === 6)) fv.push("finde"); b.filters = fv;
      b.modules = ["svc"]; b.licenses = [];
      const pr = items.find((x) => x.kind === "curso"); b.attrs = { m: "shop", tarjeta: { fee: bi(`${pr.name.es} ${usd(pr.cents)}${plan ? " · plan de pagos" : ""}`, `${pr.name.en} ${usd(pr.cents)}${plan ? " · payment plan" : ""}`) } };
      b.fam = S.fam;
      fichaComun(b, P);
      const rr = rng(`r2:${b.id}`); // más liviano que la ronda 1: 15–80 seguidores
      b.follows = b.follows.slice(0, rr.i(15, 80));
    },
  });
  for (const b of negocios) {
    b.ownerPhone = `+1484555${DUENO0 + b.gi}`; // rango reservado de dueños
    novedades(b, PORFAM[b.fam], b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));
    b.posts = b.posts.slice(0, rng(`r2n:${b.id}`).i(3, 6));
  }

  const ops = [], grupos = [], seq = { n: 0 };
  for (const b of negocios) {
    const P = PORFAM[b.fam], r = rng(`ops:r2:${b.id}`), next = cicloClientes(r), target = Math.round(15 + b.vol * b.vol * 25);
    const cur = b.items.filter((x) => x.kind === "curso"), mes = b.items.filter((x) => x.kind === "mes");
    const porCurso = Math.max(2, Math.round((target * 1.1) / (Math.max(1, cur.length) * 6)));
    const gs = cohortes(r, Math.max(2016, b.founded), cur.map((c) => ({ name: c.name.es, sem: c.curso.sem, dows: c.curso.dows, min: c.curso.min, dur: 90, seats: r.i(6, 12) })), porCurso);
    for (const m of mes) gs.push({ ix: 99, item: m.name.es, starts: addDays(ANCHOR_D, -r.i(120, 900)), ends: null, dows: m.mes.dows, min: m.mes.min, dur: 60, seats: r.i(8, 14), estado: "started", label: bi("Grupo semanal", "Weekly group"), booked: 0 });
    gs.forEach((g) => (g.b = b.id));
    const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
    const os = matriculas(r, b, gs, next, seq, {
      num: NUM0, fill: [[0.4, 0.85], [0.2, 0.55]],
      item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs }; },
      mat: (g, it) => (it.kind === "curso" ? it.attrs.dep : 0),
      det: (g, c, it, mat) => ({ rubro: "edu", k: it.kind, item_id: null, svc: it.lname, group_id: null, band_id: null, group: g.label, starts_on: ymd(g.starts), ends_on: g.ends ? ymd(g.ends) : null, start_min: g.min, dows: g.dows, for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: it.cents, mat_cents: it.kind === "curso" ? mat : 0, mat_app: mat, plan_n: it.attrs.plan_n || null, cert: null, cert_by: null, oficial: false, no: it.attrs.no || [], contract_m: 0, cancel_fee_cents: 0, g1: it.kind === "mes", sms: true, neutro: false, cuidado: false }),
    });
    ops.push(...os); grupos.push(...gs);
    ponerResenas(r, P, (rr, st) => ({ totalOk: st >= 3 ? 1 : 0, horarioOk: st >= 3 ? 1 : 0, trato: st >= 4 ? 1 : st === 3 ? 0 : -1, certOk: st >= 4 ? 1 : 0, explican: st >= 4 ? 1 : st === 3 ? 0 : -1, aprendio: st >= 4 ? 1 : st === 3 ? 0 : -1 }), os, target);
  }
  const extra = [...sqlItems(negocios)];
  extra.push(`insert into insc_settings (business_id, city_id, rubro, how_presencial, how_linea, how_hibrido, esp, reply_h)
select x.b, bz.city_id, 'edu', true, x.l, x.h, true, x.rh from (values ${negocios.map((b) => `(${s(b.id)}, ${b.edu.linea}, ${b.edu.hibrido}, ${b.edu.reply})`).join(", ")}) x(b, l, h, rh) join businesses bz on bz.id = x.b
on conflict (business_id) do nothing;`);
  extra.push(...sqlGrupos(negocios, grupos));
  const after = sqlGrupoDeMatricula2(ops);
  return { negocios, ops, extra, after, cat: "NEG-EDU", file: "demo-x-edu.sql" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
  mkdirSync(salida, { recursive: true });
  const g = generar(), sql = sqlComun(g.cat, g.negocios, g.ops, g.extra, g.after);
  writeFileSync(join(salida, g.file), sql);
  const rev = g.ops.filter((o) => o.review).length;
  console.log(`${g.file}: ${g.negocios.length} negocios, ${g.extra.length} bloques, ${g.ops.length} operaciones, ${rev} reseñas, ${g.negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
}
