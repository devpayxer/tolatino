// Prueba al revés de los guardianes toqueEsperaLaPantalla y auditoriaDelAdminConElCambio (20 nov, CI en el ancho 1024: dep4c «$25 al mes ·
// inscripción $10» y evt6e «ASSERT en la auditoría»). Dos carreras: (1) la prueba tocaba un paso del panel con la pantalla todavía vieja (la base
// ya tenía el guardado, la pantalla no) y el toque caía en el paso de al lado; (2) el Super Admin escribía su renglón de auditoría en otra
// transacción, después de devolver (y, por clase, Transacciones › Devolver, «Conciliar otra vez», Planes, Colas › Ayuda con monto y Disputas).
// Se inyecta cada defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'pruebas/e2e/dep4c.cjs', E = 'pruebas/e2e/evt6e.cjs', A = 'apps/web/app/admin/acciones-eventos.ts', L = 'apps/web/lib/evt-cambios.ts';
const TX = 'apps/web/app/admin/acciones-tx.ts', CO = 'apps/web/app/admin/acciones-conciliacion.ts', PL = 'apps/web/app/admin/acciones-planes.ts', CL = 'apps/web/app/admin/acciones-colas.ts';
const CB = 'apps/web/lib/cobros.ts', CN = 'apps/web/lib/conciliacion.ts', SU = 'apps/web/lib/suscripcion.ts', DI = 'apps/web/lib/disputas.ts', D9 = 'pruebas/e2e/din9k.cjs';
const T = 'toqueEsperaLaPantalla', U = 'auditoriaDelAdminConElCambio';
const casos = [
  // El defecto original: la mensualidad y la inscripción se tocan seguidas, sin esperar la pantalla.
  [T, D, "  await toque(p, 'Mensualidad', '+', '$26');\n  await toque(p, 'Cuota de inscripción', '+', '$5');\n", "  await clic(p.getByRole('button', { name: 'Mensualidad +' }));\n  await clic(p.getByRole('button', { name: 'Cuota de inscripción +' }));\n"],
  // Un solo paso tocado a mano (sin toque()).
  [T, D, "  await toque(p, 'Pase de un día', '+', '$11');\n", "  await clic(p.getByRole('button', { name: 'Pase de un día +' }));\n"],
  // Tocar la mensualidad sin esperar a que la pantalla quite «Cancelar antes de tiempo cuesta».
  [T, D, "  ok(await veo(async () => (await p.getByRole('button', { name: 'Cancelar antes de tiempo cuesta +', exact: true }).count()) === 0), 'sin contrato: la pantalla ya no pregunta lo que cuesta cancelar antes');\n", ''],
  // La pausa fija entre toques, como estaba.
  [T, D, "  for (let i = 0; i < 4 && (await valor(p, 'Equipos que faltan')) !== 'Llena'; i++) await toque(p, 'Equipos que faltan', '−');\n", "  for (let i = 0; i < 4; i++) { await clic(p.getByRole('button', { name: 'Equipos que faltan −' })); await espera(() => false, 600); }\n"],
  // Un toque() que ya no mira la pantalla.
  [T, D, 'return dice !== null && (v === undefined ? dice !== antes : dice === v); });', 'return true; });'],
  // La auditoría del admin otra vez aparte, después de devolver (como estaba).
  [U, A, '"event", null, "admin", m,\n    (c, g) => auditar(c, { actor: s.id, action: "evento.cancelar", targetKind: "event", targetId: String(id), after: { por_devolver: g.porDevolver, regla: "cancela el evento → devolución total" }, reason: m }));\n  if (!r.ok) return no(r.msg.es);\n',
    '"event", null, "admin", m);\n  if (!r.ok) return no(r.msg.es);\n  await tx((c) => auditar(c, { actor: s.id, action: "evento.cancelar", targetKind: "event", targetId: String(id), after: { devueltas: r.devueltas, pendientes: r.pendientes, regla: "cancela el evento → devolución total" }, reason: m }));\n'],
  [U, A, '!!congelar, m,\n    (c) => auditar(c, {', '!!congelar, m);\n  await tx((c) => auditar(c, {'],
  // La función de lib deja de escribir la auditoría dentro de su transacción.
  [U, L, 'if (alGuardar) await alGuardar(c, { porDevolver: ', 'if (alGuardar) void ({ porDevolver: '],
  [U, L, "      if (congelar) aviso = { biz: e.biz, t: e.t };\n      await alGuardar?.(c);\n", "      if (congelar) aviso = { biz: e.biz, t: e.t };\n"],
  // La prueba afloja: espera el renglón, o deja de decir cuántos hay.
  [U, E, "    const audX = sql(`select count(*) from audit_entries where action = 'evento.cancelar' and target_id = '${E.id}'`);\n    ok(audX === '1', ", "    const audX = '1'; ok(await espera(() => sql(`select count(*) from audit_entries where action = 'evento.cancelar' and target_id = '${E.id}'`) === '1'), "],
  [U, E, "ok(audX === '1', `en la auditoría: un renglón «evento.cancelar» escrito con la cancelación (hay ${audX})`);", "ok(audX !== '0', 'en la auditoría');"],
  // 20 nov · La misma clase en el dinero y los planes del Super Admin (auditoría por clase). Cada acción vuelve a auditar aparte, después (como estaba).
  [U, TX, 'idem: `adm-${clave}` },\n    (c, x) => auditar(c, { actor: s.id, action: "transacciones.devolver"', 'idem: `adm-${clave}` });\n  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.devolver"'],
  [U, CO, '{ por: "equipo", staffId: s.id },\n    (c, g) => auditar(', '{ por: "equipo", staffId: s.id });\n  await tx((c) => auditar('],
  [U, PL, 'const r = await hacer(s, (c) => auditar(c, { actor: s.id, action: verbo, targetKind: "business", targetId: String(negocio), city, after, reason: m }));\n  if (!r.ok) return { ok: false, mensaje: r.msg.es };\n',
    'const r = await hacer(s, async () => undefined);\n  if (!r.ok) return { ok: false, mensaje: r.msg.es };\n  await tx((c) => auditar(c, { actor: s.id, action: verbo, targetKind: "business", targetId: String(negocio), city, after, reason: m }));\n'],
  // Una acción de Planes deja de pasarle la auditoría a su función de lib.
  [U, PL, '(s, al) => reintentarCobro(String(negocio), s.id, al)', '(s) => reintentarCobro(String(negocio), s.id)'],
  // Colas › Ayuda con monto: la devolución sin su auditoría (solo «soporte.resolver», después).
  [U, CL, 'motivo: m, idem },\n      (c2, x) => auditar(c2, { actor: s.id, action: "transacciones.devolver"', 'motivo: m, idem });\n    void ((c2, x) => auditar(c2, { actor: s.id, action: "transacciones.devolver"'],
  // Colas › Disputas: la auditoría vuelve al cierre del caso (aparte y salteable).
  [U, CL, 'D.responderDisputa(q.subject_id, s.id, m, audita) : await D.aceptarDisputa(q.subject_id, audita)', 'D.responderDisputa(q.subject_id, s.id, m) : await D.aceptarDisputa(q.subject_id)'],
  [U, CL, '    await cerrar(c, q2, s, accion, m);\n  });', '    await cerrar(c, q2, s, accion, m);\n    await auditar(c, { actor: s.id, action: "disputa.aceptar", targetKind: "dispute", targetId: q.subject_id });\n  });'],
  // Las funciones de lib dejan de escribirla en la transacción del cambio.
  [U, CB, '  await alGuardar?.(c, { pago: p.id, centavos: n });\n  return { ok: true, id, monto: n, estado: "pending" };', '  return { ok: true, id, monto: n, estado: "pending" };'],
  [U, CB, ',\n      alGuardar ? (c, h) => alGuardar(c, { ...h, parte }) : undefined);', ');'],
  [U, CN, '    await alGuardar?.(c, { estado, diferencias: unicas.length, corrida: run });\n  });', '  });\n  if (alGuardar) await tx((c) => alGuardar(c, { estado, diferencias: unicas.length, corrida: null }));'],
  [U, SU, '    await adminEvento(c, negocio, "trial_extended", actor, { dias: n, motivo });\n    await alGuardar?.(c);\n', '    await adminEvento(c, negocio, "trial_extended", actor, { dias: n, motivo });\n'],
  [U, SU, '    await alGuardar?.(c);\n    return true;\n  });\n  if (!pedido) return no("No hay un cobro fallido que reintentar.", "There is no failed charge to retry.");\n  await procesar(negocio);\n',
    '    return true;\n  });\n  if (!pedido) return no("No hay un cobro fallido que reintentar.", "There is no failed charge to retry.");\n  await procesar(negocio);\n  await tx(async (c) => { await alGuardar?.(c); });\n'],
  [U, SU, '        await evento(negocio, "ended", { note: { por: "admin" } }, c);\n        await alGuardar?.(c); aFreeHoy = true;', '        await evento(negocio, "ended", { note: { por: "admin" } }, c);\n        aFreeHoy = true;'],
  [U, DI, "failure_code = 'dispute_lost', updated_at = now() where id = (select payment_id from disputes where id = $1::bigint)`, [disputa]);\n      await alGuardar?.(c, { cambio: null });\n", "failure_code = 'dispute_lost', updated_at = now() where id = (select payment_id from disputes where id = $1::bigint)`, [disputa]);\n"],
  [U, DI, "      await c.query(`update dispute_evidence set sent_at = now() where dispute_id = $1::bigint and stripe_file_id is not null and sent_at is null`, [disputa]);\n      await alGuardar?.(c, { cambio: null });\n", "      await c.query(`update dispute_evidence set sent_at = now() where dispute_id = $1::bigint and stripe_file_id is not null and sent_at is null`, [disputa]);\n"],
  // 21 nov (9t) · La disputa que ya cambió: la auditoría deja de entrar (lo que se mandó a Stripe quedaría sin renglón).
  [U, DI, "    await alGuardar?.(c, { cambio: ahora });\n    return { ok: false, cambio: ahora, msg: `La disputa cambió mientras tanto (ahora: ${ESTADO_ES[ahora] ?? ahora}). Stripe recibió", "    return { ok: false, cambio: ahora, msg: `La disputa cambió mientras tanto (ahora: ${ESTADO_ES[ahora] ?? ahora}). Stripe recibió"],
  // La prueba de la conciliación afloja: espera el renglón, o deja de decir cuántos hay.
  [U, D9, "    const audC = sql(`select count(*) from audit_entries where action = 'conciliacion.correr' and after->>'corrida' = '${RUNID}'`);\n    ok(audC === '1', ", "    const audC = '1'; ok(await espera(() => sql(`select count(*) from audit_entries where action = 'conciliacion.correr' and after->>'corrida' = '${RUNID}'`) === '1'), "],
  [U, D9, "ok(audC === '1', `en la auditoría: un renglón «conciliacion.correr» escrito con la corrida (hay ${audC})`);", "ok(audC !== '0', 'en la auditoría');"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
