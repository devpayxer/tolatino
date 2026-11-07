# Fase 4 · Educación + Niños + Deporte — plan de construcción extraído del prototipo (7 nov 2026)

Bloques **4ea → 4eg** (la letra `e` del grupo Educación delante de la del bloque, para no chocar con 4a–4z ni con 4na–4ne de Noche).
Migraciones desde **0085**. Nada de este archivo se ha construido. Esto es un resumen de trabajo; manda el prototipo.

## 0. Fuentes
Todas en `docs/diseno/pantallas/datos/` salvo indicación. **Un solo motor para las tres:** `neg-edu-listing.js` + `neg-edu-flow.js` +
`neg-edu-rev.js` (TLEduL / TLEduFlow / TLEduRev) los usan Educación, Niños (`b.ninos`) y Deporte (`b.dep`), y también Iglesias, Bienes
Raíces y Venta de Autos (MEM 98; `VOCS` flow L13–19). Lo que cambia por categoría son los rótulos (`VOC`), la línea fija (`lineOf` L25),
las preguntas de la reseña (`Q` rev L15–21), los motivos de Ayuda (`RSNS` L23–29) y las soluciones (`SOLS` L30–36).
**Educación:** `neg-edu.js` (TLEdu: 22 escuelas, 15 Pro y 7 Free; cabecera L1–5 con los tags F-EDUCACION; `B` L9–30; `SUBG` L32–38 = 6
capítulos y 48 subcategorías; `ROWS` L39; `NEED` L40; `WHO` L41; `GROUPS` L45–50; `QL` L51; `QUICK5` L52; `statsK` «DE NOCHE» L53; **`line`**
L54; `lineSub` L55), `neg-edu-listing.js` (cabecera L1–5: `k curso · mes · hora · clase`, `mat` = matrícula que aparta el cupo, `inc`, `no`;
`SVC` L12–35 con `dias`, `start`, `sem`, `hrs`, `mat`, `cert`, `inc`, `no`, `plan [abono, n]`, `gratis1`; `ABOUT` L36–37; `RV` L38–39; `STATS`
L40; `asp` L44–45; `aspNote` L46 (12 meses); `facts` L47–50; `ST` L51; `canBook` L59; `priceFor` L60–65; `listingAdd` L67–89 (notas L72, Deporte
L77, Niños L78, `ax.veh` L79, `TD` L81, `AM` L82); `sheetVals` L90–95 (`payT` L92); `resAdd` L96–97), `neg-edu-flow.js`
(`APP-NEG-EDU-INSCRIPCION` → `APP-NEG-EDU-ESTADO`; cabecera L1–6; `WHO` yo · hijo · otro L22; `LVL` L23; `todayOf` L24 (solo `curso` cobra
hoy); `groupsOf` L26; `bookVals` L29–55 (`cobro` L33, `rows` L34, `pol2` L35, tarjeta rechazada L36/L49, «Escribe su nombre y grado en la
nota» L44, `bar` L52, SMS L55); `sendNow` L56–58 (número `E-4xxx`); `reply` L60; `citaVals` L63–80 (`H` L66–70, «Trae una identificación el
primer día» L65, pasos L71–72, acciones L73, filas L74, reseña L77, otro grupo L78); `sim` L81–85 «Empezó» / «Terminó»; `mineCard` L86–87),
`neg-edu-kind.js` (TLEduK: `KS` L10–16, `kind` L17 = `ingles · ciud · adultos · tutor · univ · cdl · belleza · salud · compu · negocio · lic ·
oficio · arte · coach`; `noCert` L18; `horL` / `howL` L23–25; `faq` L30–50 (TOT L31, MAT L32, ONL L33); `RK` L53–68; `post` L86–108),
`neg-edu-rev.js` (`Q` L16, `RSNS` L24, `SOLS` L31, `srcs` L43–45, `tm` L50–51, `fix` L55–61 (`lowT` L58), `helpForm` L68–85, `helpStatus`
L88–105, `TLHogarExt.ehelp` L107–110). **Niños:** `neg-ninos.js` (TLNinos: 21 lugares, 12 Pro y 9 Free; cabecera L1–6 con `edad [mín, máx]` y
los tags F-NINOS; `B` L10–30; `SUBG` L32–37 = 5 capítulos y 35 subcategorías; `ROWS` L38; `NEED` L39; `WHO` L40; `GROUPS` L44–48; `QUICK5` L50;
`statsK` «CON LICENCIA» L51; **`line`** L52; `lineSub` L53), `neg-ninos-listing.js` (`LIC` L6 «Licencia de guardería de PA (DHS) · verificada»;
`SVC` L7–21 con `k semana` (guardería), `curso` (temporadas), `mes`, `clase`; `reg` L22), `neg-ninos-kind.js` (TLNinosK: `KS` L10–15, `kind` L16 =
`guard · casa · ninera · after · camp · clase · terapia · juego · fiesta · familia · svc`; `care` L17; `noOffice` L18; `agesL` L22; `faq` L26–39
(LIC L27, PICK L28); `RK` L42–54; aspectos de niños L63–64; `post` L74–103; `tabL` L104). **Deporte:** `neg-deporte.js` (TLDeporte: 20 lugares,
11 Pro y 9 Free; cabecera L1–3; `B` L7–26 con `con` (meses de contrato), `cxl` (lo que cuesta salirte), `ins` (inscripción), `meet`; `SUBG`
L28–34 = 6 capítulos y 37 subcategorías; `ROWS` L35; `NEED` L36; `WHO` L37; `GROUPS` L41–45; `QUICK5` L47; `statsK` «SIN CONTRATO» L48; **`line`**
L49; `lineSub` L50), `neg-deporte-listing.js` (`SVC` L5–16; `FREE` L18–26 = precios de los Free; `reg` L27), `neg-deporte-kind.js` (TLDeporteK:
`KS` L10–15, `kind` L16 = `gym · trainer · box · clase · liga · cancha · visita · club · tiro · alberca · nutri`; `memb` / `ligaK` L17; `team`
L29; `conL` L30; `faq` L35–54; `RK` L57–69; aspectos L78–80; `metaOf` L94–99; `post` L102–149 (liga L125, membresía L126, hoja L134–137, Free
L138–143); `tabL` L151).
**Comunes:** `dash2-cat.js` (TLDashCat: `REAL_E` L46; demos del panel `BIZ[…]` L83–92; `AGES` / `CUP0` L131; `TOOLS` L140 = NEG-EDU «Grupos y
cupos», NEG-NINOS «Cupos y licencia», NEG-DEPORTE «Membresías y contrato»; `eduSet` L150–153; `state` L170–178; `apply` L225–249; `summary`
L306–308; `blocksE` L446–487 (HEAD L447, Educación L449–464, Niños cuidado L465–471, Deporte liga L473–480 y membresía L481–487)),
`demo-biz.js` (`demo-edu` L1066–1124, `demo-ninos` L1125–1184 con FAQ L1143 y mensajes L1147, `demo-deporte` L1185–1240 con FAQ L1203),
`adm-data.js` L28–30 (las tres transaccionan `cita`) y L133 (comisión `cita` 8 %), `onb-neg-data.js` (= `apps/web/lib/onb/datos.ts` L52–54:
`on` y rótulos «Inscripción» · «Cupos y visitas» · «Clase de prueba»; `ALLOW` L90 `['svc','citas','shop']`; `L_HOME` L115 «Tu dirección exacta
solo la ve quien confirmas»; preguntas Educación L307–323, Niños L324–340 (licencia sí · en trámite · no aplica, edades, CCIS, comidas),
Deporte L341–358 (contrato, cuota, pase, primera gratis, guardería)); `packages/db/migrations/0004_catalogo_datos.sql` (NEG-EDU L1058 con
módulos `svc citas shop staff eventos nov jobs`, NEG-EDU-01…48 L1061–1155 = `SUBG` 1:1; NEG-NINOS L1158, -01…35 L1161–1229 = `SUBG` 1:1;
NEG-DEPORTE L1232, -01…43 L1235–1319: 37 del prototipo + 6 que el prototipo no trae, §6 #20); `packages/taxonomy/paginas.json` (NEG-EDU
L13726–, NEG-NINOS L14900–, NEG-DEPORTE L15810–); `docs/diseno/plan/taxonomia-negocios.md` (F-EDUCACION L64–66, F-DEPORTE L67–68, F-NINOS
L81–83; §12 L642, §13 L694, §14 L733); `docs/diseno/entrega/modelo-datos.md` (MD: `category_attrs` NEG-EDU · NEG-NINOS · NEG-DEPORTE `ages,
modality` L266; Operation `enrollment` = Educación, Niños, Deporte, Iglesias L834/L854); `solo-prototipo.md` (SP «El negocio responde»
L115–119, «Pasos del servicio» L151–155, «Plazos sin respuesta» L239–242); `docs/diseno/referencia/memoria-del-diseno.md` (MEM 87 y 1872 (Free
toma 10 al mes), 98 (cadena del motor), 171–173 (Hecho 12–14), 920–970 (M1e: herramientas), 2148–2161); `docs/PLAN.md` (fase 4 L210:
Educación + Niños + Deporte va después de Noche). Plantillas y motores ya construidos: `fase4-hogar-auto.md` (4a–4g), `fase4-salud-pro.md`
(4h–4m), `fase4-mercados-tiendas.md` (4n–4s), `fase4-fiestas-transporte.md` (4t–4z), `fase4-noche.md` (4na–4ne). Decisiones que mandan:
`docs/DECISIONES.md` (O, P, Q, U, AA, AB).

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Páginas de categoría (filas `que` foto · `como` chips; `stats_tag` `noche` / `lic` / `sincontrato`; GROUPS y QUICK5) | `packages/taxonomy/paginas.json` L13726–, L14900–, L15810–, `lib/categoria.ts`, `lib/buscar.ts` | Ya servidas; faltan los derivados que las alimentan (§2) |
| Subcategorías y módulos por defecto `svc citas shop staff eventos nov jobs` | migr. 0004 L1058, L1158, L1232 | Educación y Niños 1:1 con `SUBG`; Deporte trae 6 más y tres nombres con «&» (§6 #20) |
| `ALLOW` de las tres `['svc','citas','shop']`; onboarding guarda cómo da clases (`how`), certificado y plan (Edu), licencia DHS · edades · CCIS · comidas (Niños) y contrato · cuota · pase · primera gratis · guardería (Deporte) | `lib/onb/datos.ts` L52–54, L90, L307–358 | Lo dicho en Publica tu negocio siembra Tu herramienta sin pedirlo otra vez |
| `lib/tarjeta.ts`: botón «Inscribirme» para la familia Educación y chip «De 2 a 5 años · con licencia» | L50, L58–62, L89–91 | El chip lee `tags.includes("lic")`: en 4eb pasa a salir **solo** de una licencia vigente (guardián `licenciaNoSeFinge`) |
| `items` (`module 'svc'`, `svc_kind`, `svc_attrs`, `price_from`, `deposit_cents`) · `item_sections` · editor `app/panel/Servicios.tsx` + `acciones-servicios.ts` con `lib/servicios.ts` (`RubroSvc`, `limpiarNoche` / `limpiarFiesta` / `limpiarTrans` validados en el servidor) | migr. 0048, 0057, 0070, 0074, 0081 | **Editor de cursos, programas y membresías**: se suman los rubros `edu · ninos · dep` con `limpiarInsc` (hueco #1) |
| `trip_runs` + `run_seats` (salida con asientos, `seats_booked` derivado con candado) · `lib/viajes.ts` | migr. 0074 L32–50, 0075 | **Plantilla del grupo con cupos** (`class_groups`, §2): mismo patrón de cupo, candado y «el negocio cancela la salida → devolución a todos» |
| `lib/fiestas-reservas.ts` (retiene al enviar, cobra al confirmar, otra fecha, devolución por regla) · `lib/noche-reservas.ts` (`responderMesa`, `nocheCliente`, `cancelarNocheNegocio`, `vencerNoche`) | 4v, 4nc | **Plantilla del dinero de la matrícula** y de los pasos confirmar / otro grupo / no hay cupo / vence |
| `lib/cobros.ts` (`comision`, `registrarRetencion`, `cobrarOperacion`, `liberarOperacion`, `devolverPago`, `repararPagos`) · `lib/pagos/pasarela.ts` | 2d, 4d | Matrícula, inscripción de temporada y depósito de la liga |
| `lib/layaway.ts` + `layaway-comun.ts` (`ReglaPlan`, `cuotas`, `terminos`, `VERSION_PLAN`, `pagoEnTienda`) · `lib/total-escrito.ts` | 0068, 4l | **Plan de pagos del curso** como acuerdo por escrito con sus cuotas (§3, §6 #3) |
| `lib/planes.ts` (cobro mensual fuera de sesión, reintentos, pausar / cancelar) | 4f, migr. 0053 | **No se enciende en este grupo** (§6 #4); queda listo para las membresías si el fundador lo pide |
| `op_private` (`note_enc` cifrada, `purge_at`) · `lib/cifrado.ts` (`cifrar`, `descifrar`) · guardián `privacidadSalud` | migr. 0058, 4j | **Datos del niño** (nombre de pila, edad o grado, escuela si lo recogen, nota) cifrados y borrados a los 30 días (§3, 4eb) |
| `lib/resenas.ts` (`rubroRes`, `limpiarRespuestas`, hechos) · `lib/resenas-filtro.ts` (`PRIVADO`) | 2g, 4m, 4nd | Reseña verificada por inscripción: rubros `edu · ninos · dep` |
| `lib/ayuda-cita.ts` (`RubroAyuda`, `CON_FOTO`, `NUM /^[CMAFVN]-/`) · `lib/ayuda-motivos.ts` · fotos privadas (`subirFotoPrivada`) | 3e, 4z, 4nd | Ayuda con el curso / el cuidado / la membresía; `NUM` acepta `I-` |
| `lib/licencias.ts` + `license_kinds` / `licenses` (estados, `licencias_refrescar`, cola Licencias) | 1k, 4h-3, 4w, 4na | Licencia de cuidado infantil del DHS (Niños) y licencias de escuelas (Edu) — §2 |
| `lib/avisos.ts` · `notif_templates` · `lib/plan.ts` (`TOPE_FREE 10`, `ITEMS_FREE 5`) · `lib/suscripcion.ts` | 2j, 1h, 2s | Plantillas nuevas ES/EN; Free = 5 visibles y 10 al mes sin tarjeta |
| `lib/barrido.ts` `barridoCentral` (cada minuto, `system_jobs`) | migr. 0078 | Se suma la tarea `inscripciones` (vencer, empezar, terminar, lista de espera, purga de datos del niño) |
| Super Admin: `N360.tsx`, `Transacciones.tsx` + `lib/admin-tx.ts` (`TabTx` … `noche`), `Colas.tsx` + `lib/colas.ts` (`Cola` … `mesa · noid`), `Analitica.tsx` + `lib/admin-analitica.ts` (pestaña `noche` L169–173), `Planes.tsx` (`fee_rules`) | 1i, 2i, 4ne | Pestaña **Inscripciones**, colas y analítica de las tres |
| `operations.kind` ya admite `'enrollment'`; `operations.status` = `pending · change_proposed · confirmed · declined · expired · cancelled · done` (+ `status_detail`); `payments.kind` `deposit` | 0023 L42, 0053 L8, 0051 L86 | Sin migración para el tipo; «En curso» = `confirmed` + `status_detail 'started'` |
| Guardianes `dineroDelServidor`, `retencionPorTarjeta`, `transaccionEnFila`, `operacionesConTipo`, `fotoAyudaPrivada`, `privacidadSalud`, `resenaPrivada`, `semilla` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo para las tres (etapas 1–4: categoría, ficha, inscripción y estado, reseña y ayuda; MEM 2148–2161,
171–173). El **panel** solo trae las tres «Tu herramienta» (`blocksE` L446–487) y el Servicios genérico. **No hay:**
1. **Editor de cursos, programas y membresías** con su forma (`curso` con semanas, horas, matrícula, certificado y quién lo da, incluye / va
   aparte, plan; `mes`; `semana`; `clase`; `hora`) y **sus grupos con fecha y cupos**: el prototipo los escribe a mano en `SVC` (`dias` +
   `start`) y la herramienta solo cuenta cupos de lo que ya existe (L463).
2. **Solicitud de inscripción en el panel** (para quién, nivel, nota, grupo, matrícula) y su respuesta: Confirmar / Otro grupo / No hay
   cupo; luego «Empezó», «Terminó» con «¿Entregaste el certificado?», y **cancelar un grupo que no abre** (devolución a todos).
3. **Lista de espera**: la herramienta y la ficha la dicen («Lleno · lista de espera» L468, «Lista de espera · 2 a 5 años» L235, «LIGA LLENA ·
   LISTA DE ESPERA» deporte-kind L117; «¿Cuántos hay antes en la lista?» demo L1147) pero no hay flujo.
4. **Cancelar la membresía en la app** (Deporte): la FAQ del demo dice «Cancelas cuando quieras en la app» (L1203) y la Ayuda ofrece «Que
   cancelen mi membresía · Sin cobrarte el mes siguiente» (rev L33), pero el estado no tiene ese botón.
5. **Datos del niño**: «Para mi hijo o hija» solo pide «Escribe su nombre y grado en la nota» (flow L44). Falta decir qué se guarda, quién lo ve
   y cuándo se borra (§3, §6 #6).
6. **Licencia del DHS en Tu página** y su efecto: el candado dice «Verificada por To'Latino; si vence, tu página lo dice» (L471) sin pantalla.
7. **Clases en línea**: «El enlace te llega al inscribirte» (FAQ L33, notas L100) sin campo ni regla de quién lo ve.
8. **Plan de pagos del curso** como acuerdo por escrito (el estado dice «Plan: 12 pagos de $517», flow L69, sin términos ni fechas).
9. Super Admin: Transacciones › **Inscripciones**, Colas › «Cuidado de niños» y «No me dejan cancelar», licencias DHS en Licencias,
   Analítica de las tres.
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de solicitud del panel, `Citas.tsx`,
`FiestasReservas.tsx`, `NocheReservas.tsx`) y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

### 1c. Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, inscripción, revisión y estado; nunca se suavizan)
- **Educación (`NEG-EDU`):** «¿qué me llevo al final y cuánto cuesta en total?» · línea **«El precio del curso es el total: libros y examen
  incluidos o dichos aparte.»** (`TLEdu.line` L54) · sub: «Cada escuela dice qué certificado te llevas, cuántas horas son y si el examen oficial
  va aparte.» (L55). Pasatiempo, tutoría y coaching (`noCert` L18): «El precio es el total; si los materiales van aparte, se dice antes.»
  (kind L87). Candados (L464): «El precio es el total» · «Qué certificado te llevas». Nota: «La matrícula aparta tu cupo y se descuenta del
  total. Si el grupo no abre, se devuelve completa.» (listing L72).
- **Niños (`NEG-NINOS`):** «¿es seguro, tiene licencia y hay cupo?» · línea **«Toda guardería muestra su licencia del estado; si no la tiene, se
  dice.»** (`TLNinos.line` L52) · sub (L53). Fuera del cuidado: «Cada lugar dice las edades que atiende y el precio completo.» (kind L76).
  Candados (L471): «Licencia de PA (DHS) a la vista» · «Solo recogen las personas autorizadas · Con identificación, siempre.» Nota: «La
  inscripción es una solicitud: te confirman el cupo antes de empezar.» (listing L78).
- **Deporte (`NEG-DEPORTE`):** «¿cuánto pago de verdad y me puedo salir cuando quiera?» · línea **«La cuota es la que ves: sin cargos escondidos,
  y si hay contrato, se dice.»** (`TLDeporte.line` L49) · sub (L50). Liga: «La cuota es de toda la temporada: sin cargos por partido, y lo que
  incluye se dice.»; club: «Es gratis: llegas al punto de salida…» (deporte-kind L103). Candados: «Lo que cuesta cancelar, antes de firmar» ·
  «Solo se cobra la membresía · Nada que aparezca después en la tarjeta.» (L487); liga: «La cuota es de toda la temporada» · «Si la liga no
  abre, el depósito se devuelve · Completo, a la misma tarjeta.» (L480).

**Lo que el prototipo hace de verdad** (y lo que no): cinco formas de servicio (`priceFor` L60–65, `metaOf` L94–99): **curso** (grupo con fecha
de inicio, semanas, horas, cupo; matrícula **hoy** que se descuenta del total; el resto el primer día o en N pagos sin intereses; en Niños son
las temporadas y sesiones, en Deporte la temporada de la liga «por equipo» o «por jugador» con su depósito), **mes** (clases o membresía; primera
clase gratis «pagas el mes solo si te quedas»), **semana** (guardería, campamento), **clase** (clase suelta, pase de un día, cita de lactancia) y
**hora** (tutoría, entrenador, cancha). **Solo `curso` cobra algo en la app** (`todayOf` L24); todo lo demás es $0 hoy y se paga en el lugar
(`cobro` L33, hoja deporte L136–137). El estado va pend → ok | alt (otro grupo) | no (no hay cupo) | exp → «Empezó» → en curso → «Terminó» →
terminada (certificado y reseña) | cancelada (flow L5–6, L66–70). **No** hay cobro mensual en la app, **no** hay venta de libros ni uniformes
(los módulos `shop` quedan para Tiendas), **no** hay certificado emitido por To'Latino (lo da la escuela), **no** se pide estatus, seguro social ni
papeles (FAQ L35, L39; Niños L36). Todo sin terceros pagados nuevos (PLAN §8): cobros con Stripe, avisos con el SMS ya pagado.

**Tipos por negocio** (deciden FAQ, reseñas por tipo, pestaña, tarjeta de Hoy y CTA; derivados de las subcategorías con `KS`; el admin puede
forzarlo): Edu `ingles · ciud · adultos · tutor · univ · cdl · belleza · salud · compu · negocio · lic · oficio · arte · coach`; Niños `guard ·
casa` (cuidado: cupos por edad y licencia) · `after · camp · clase · terapia · juego · fiesta · familia · ninera · svc`; Deporte `gym · trainer
· box · clase · alberca` (membresía) · `liga · cancha` (temporada) · `visita · club · tiro · nutri`.

---

## 2. Cambios de datos (migraciones 0085 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0085 `inscripciones_servicios` (4ea)**
- `items.svc_kind` amplía el check con `'curso', 'mes', 'semana', 'clase'` (`'hora'` ya existe). `svc_attrs` (zod en `limpiarInsc` +
  guardián): `sem smallint 1–104`, `hrs smallint 1–2000` (barbería 1,250 h, listing L20), `cert {es,en} ≤ 80` + `cert_by {es,en} ≤ 60` («quién lo
  da», candado L464) + `oficial bool` (decide «Certificado oficial» / «Constancia de la escuela», L79, flow L38), `inc [{es,en}] ≤ 8`, `no
  [{es,en}] ≤ 6` (lo que va aparte, p. ej. «El examen médico DOT ($120) va aparte.» L18), `plan_n smallint in (0, 3, 6, 12)` (chips L460; sin
  intereses), `gratis1 bool` (no en `curso`), `levels bool` (pide nivel `cero · algo · medio`, L23, L43), `age smallint[2]` (edades del programa,
  Niños), `team bool` (Deporte: «por equipo» / «por jugador»; reemplaza el `/^Equipo/` de deporte-kind L29), `per_field bool` (cancha: «POR LA
  CANCHA», L98). Matrícula / inscripción / depósito = `items.deposit_cents` (0 = sin matrícula; ≤ precio; check). Precio = `price_from` (curso =
  total; mes / semana / clase / hora = por unidad).
- **`class_groups`** (grupo, sesión o temporada con cupo; patrón de `trip_runs`): `id`, `business_id`, `city_id`, `item_id`, `label {es,en} ≤ 40`
  («Lun y Mié 7 PM», `dias` L14), `starts_on date`, `ends_on date` (derivado de `sem`), `dows smallint[]`, `start_min smallint`, `dur_min`,
  `seats_total smallint 0–40` (L463; 0 = lleno y no sale), `seats_outside` (inscritos fuera de la app), **`seats_booked`** (derivado: lo mantiene
  el servidor con el candado del grupo), `status check in ('open','cancelled','started','finished')`, `cancel_reason ≤ 200`, `join_url` (solo
  `https://`, clases en línea; hueco #7), `created_at/updated_at`; `check (seats_outside + seats_booked <= seats_total)`; índices
  `(business_id, starts_on) where status = 'open'` y `(item_id, starts_on)`. Las sesiones de `clase` y `hora` son grupos de un día (la tutoría de
  1 a 1 = cupo 1); el panel las genera desde un patrón semanal (§6 #16).
- **`insc_settings`** (Tu herramienta; una fila por negocio de las tres; `state` L170–178): comunes `rubro check in ('edu','ninos','dep')`,
  `how_presencial / how_linea / how_hibrido bool` (al menos uno, L452), `esp bool`, `reply_h smallint` def. 24 (§6 #12), `kind_override` (solo
  admin), `updated_by/at`. Cada guardado deja `AuditEntry`.
- `license_kinds` de Educación (**sin verificar** el texto legal; §6 #18): escuela privada con licencia del Departamento de Educación de PA,
  escuela de barbería / cosmetología aprobada por su Junta estatal, escuela de CDL en el registro federal de entrenadores (FMCSA), escuela de
  manejo con licencia de PennDOT. Sellos: no bloquean nada.
- `fee_rules.kind` + `'insc'` (sembrada igual que `cita` = 800 bp, que es lo que el prototipo cobra a las tres, adm-data L28–30 / L133; §6 #17);
  `comision()` en `lib/cobros.ts` suma el tipo.
- Derivados en `businesses.filter_values` (recalculados al guardar y por el barrido): Edu `presencial · linea · hibrido` (herramienta), `tarde ·
  noche · finde` (de los grupos abiertos: inicio ≥ 2 PM / ≥ 5 PM / sábado o domingo; `horL` L24), `cert` (algún curso `oficial`), `esp`, `plan`
  (algún curso con `plan_n`), `gratis1`, `princ`, `ninos` (tutoría o tareas). `attrs.tarjeta.eta` = «Próximo grupo: 5 oct» / «CDL Clase A: empieza
  el 12 oct» y `fee` = «$80 al mes · primera clase gratis» (apply L230–231). `category_attrs` (MD L266 `ages, modality`) = copia derivada, nunca a mano.

**0086 `ninos_cuidado` (4eb)**
- `insc_settings` + columnas de Niños: `age_min / age_max smallint 0–17` (`b.edad`), `ccis bool`, `extended bool`, `meals bool`, `night bool`,
  `transport bool` (after y campamento, L454), `medicaid bool` (terapia y familia, L454), `eval_wait_w smallint 1–12` (L455), `week_cents
  5000–60000` paso 500 (L469), `home_based bool` (cuido en mi casa, `L_HOME`), `pickup_rule` fijo (candado, no se apaga).
- **`care_openings`** (cupos por edad de guardería y cuidado en casa; L467–468): `business_id`, `city_id`, `band_min / band_max smallint`,
  `label {es,en}`, `openings smallint 0–20` (cuidado en casa: una fila, 0–6), `sort`, `updated_at`. Sembrada con `AGES` (2 años · 3 años · 4 y 5
  años, L131); §6 #11.
- `license_kinds` + **`pa_dhs_childcare`** (certificado de cumplimiento de cuidado infantil del Department of Human Services de PA; centro,
  hogar de grupo o hogar familiar; número de certificado; registro público del DHS — URL a verificar, §6 #18). **El derivado `lic` solo sale de
  una licencia `valid` de este tipo** (nunca de un toque del dueño; onboarding «en trámite» L324– = «Licencia en trámite»).
- `op_private` admite `reason` nula para inscripciones (ya admite nulo) y `note_enc` guarda el JSON cifrado del niño `{nombre, edad|grado,
  escuela, nota}` (≤ 1,400 bytes); `purge_at` = cierre + 30 días.
- Derivados: `lic` (licencia vigente), `subsidio`, `cupos` (Σ `openings` > 0 o algún grupo con cupo), `comidas`, `transporte`, `extendido`, `noche`,
  `finde`, `tarde`, `esp`, `seguro`, `gratis1`. `attrs.edad`; `attrs.tarjeta.eta` = «Quedan 3 cupos · 2 a 5 años» / «Lista de espera · 2 a 5 años»
  y `fee` = «Acepta CCIS (subsidio) · $235 la semana sin subsidio» (apply L234–236).

**0087 `deporte_membresias` (4ec)**
- `insc_settings` + columnas de Deporte: `contract_m smallint check in (0, 6, 12)` (chips L481; 0 = sin contrato), `cancel_fee_cents 0–50000`
  paso 1000 (L482; 0 si no hay contrato, check), `signup_cents 0–20000` paso 500 (L484), `g1 bool`, `childcare bool` + `childcare_txt {es,en} ≤ 40`
  («Guardería 5–8 PM»); liga: `league_until date` (L476), `league_left smallint 0–40` (L477), `free_agents bool` (L479). Mensualidad, pase de un día,
  cuota de la temporada, depósito y cancha por hora **son el precio del ítem** (la herramienta escribe en el ítem, como `eduSet` L246).
- Derivados: `membresia · visita · clase · liga` (de los ítems), `sincontrato` (`contract_m = 0`), `guarderia`, `24h` (horario), `techado · aire`
  (amenidades), `gratis1`, `princ`, `sueltos`, `esp`. `attrs.tarjeta.eta` = «Sin contrato · cancela cuando quieras» / «Contrato de 12 meses ·
  cancelar antes cuesta $50» / «Inscripción de equipos hasta el 4 oct» / «Liga llena · lista de espera» (apply L245, L249).

**0088 `inscripciones` (4ee)** — `operations` `kind 'enrollment'` con `details`: `rubro`, `k check in ('curso','mes','semana','clase','hora')`,
`item_id`, `group_id` (ref `class_groups`) o `band_id` (ref `care_openings`), `for check in ('yo','hijo','otro')` (`WHO` L22), `guardian_ok bool`
(obligatorio con `hijo`: «Soy su mamá, papá o tutor legal»), `level check in ('cero','algo','medio')`, **copias al enviar** `price_cents`,
`mat_cents`, `plan_n`, `plan_terms_v`, `cert`, `contract_m`, `cancel_fee_cents`, `starts_on`; `team_name ≤ 40` (liga), `sms bool`, `cert_given bool`
(al terminar). **`insc_seq start 4101`** (número **I-4101**, «INSCRIPCIÓN #»; §6 #2). «En curso» = `confirmed` + `status_detail 'started'`;
«Cancelación pedida» (membresía) = `status_detail 'cancel_req'` con su hora. **`waitlist_entries`**: `business_id`, `city_id`, `item_id`,
`group_id | band_id`, `user_id`, `operation_id`, `status check in ('waiting','offered','accepted','expired','left')`, `offered_until`; posición
derivada (orden de llegada). **`plan_terms`** (solo inserción): `operation_id`, `version`, `text {es,en}`, `schedule jsonb [{n, monto, vence}]`,
`accepted_at`, `ip`; y `plan_marks` (la escuela marca «pagó la cuota N», solo inserción). Índices `(business_id, (details->>'group_id'), status)
where kind = 'enrollment'` y `(user_id, sent_at desc) where kind = 'enrollment'`. `operation_events`: `insc_sent`, `insc_ok`, `insc_alt`,
`insc_no`, `insc_exp`, `insc_cx`, `insc_biz_cx`, `insc_group_cx`, `insc_start`, `insc_done`, `insc_cert`, `insc_wait`, `insc_offer`,
`insc_cancel_req`, `insc_cancel_ok`, `insc_g1` (primera clase gratis usada).

**0089 `ayuda_inscripciones` (4ef)** — `help_requests.reason` amplía (RSNS L24–26): Edu `cobro` (foto) · `cert` · `horario` · `ensena`; Niños
`cobro` (foto) · `lic` · `horario` · `cuidado` (va directo a To'Latino, §6 #8); Deporte `cobro` (foto) · `salir` (foto) · `horario` · `equipo`;
`otro`. `wants` reusa `devolver` / `avisar` y suma `otro_grupo` (Edu «Terminar en otro grupo · Sin pagar otra vez»), `arreglar` (Niños) y
`cancelar_membresia` (Deporte) (SOLS L31–33). `reviews.answers` / `facts` con lo de 4ef. (+ **0090** si las colas lo piden, como 0084 de Noche.)

---

## 3. Dinero y datos de los niños (reglas del servidor — Opus/high; revisión de seguridad obligatoria)

El servidor calcula todo; el cliente solo muestra (guardián `dineroDelServidor`). Comisión solo sobre tarjeta en la app. **En la app solo pasa
la matrícula / inscripción / depósito de un `curso`** (`todayOf` L24). Mensualidad, semana de guardería, clase suelta, pase de un día, hora,
el resto del curso, libros, uniforme, examen oficial y copago del CCIS **se pagan en el lugar**.

| Momento | `curso` con matrícula (Edu curso · Niños temporada / sesión · Deporte liga) | `mes` · `semana` · `clase` · `hora` |
|---|---|---|
| Al enviar | Tarjeta: **se retiene la matrícula** copiada del ítem («Aparta tu cupo; se descuenta del total», L33); cupo apartado en el grupo con candado | $0, sin tarjeta. Primera clase gratis: $0 y sin tarjeta (L33, notas L127) |
| Sin respuesta | `reply_h` (24 h; nunca después del inicio − 12 h) → SIN RESPUESTA, se libera completo | Igual, sin dinero |
| La confirman | **Se cobra la matrícula** (captura); el cupo cuenta | CONFIRMADA; el cupo cuenta |
| Otro grupo | Lo retenido sigue; «Aceptar» → se cobra; «No me sirve» → se libera (L67, L78) | Sin dinero |
| No hay cupo | Se libera completo («No hay cupo», L68) | — |
| Empieza (día de inicio, barrido) | EN CURSO; el resto se paga en la escuela el primer día o según el plan por escrito (§6 #3) | ASISTIENDO / ACTIVA; pagas el mes o la semana en el lugar |
| Cancela el cliente | Antes de empezar → **devolución completa**; después → la matrícula no se devuelve («Gratis hasta que empiece. Después: la matrícula no se devuelve.», L35) | Gratis siempre («Cancelar es gratis.», L35). Membresía: «Cancelar mi membresía» deja constancia con fecha y avisa al lugar (§6 #4) |
| El grupo no abre / el negocio cancela | **Devolución completa a todos, siempre**, motivo obligatorio (candados L72, L480) | Aviso a todos; hecho en la reseña |
| Terminó | TERMINADA (certificado si la escuela lo marca) → reseña verificada | Sesión: terminada al pasar la hora; mes / semana: reseña a las 4 semanas (§6 #13) |

- **Captura y liberación** con `cobrarOperacion` / `liberarOperacion` / `devolverPago` (idempotentes; candado `insc:{grupo}` antes de tocar cupo o
  dinero). La retención vive como mucho `reply_h`; nada se retiene más de 6 días (guardián `retencionPorTarjeta`).
- **Precio cerrado** = copia al enviar (precio, matrícula, plan, certificado, contrato y lo que cuesta salirte): si el negocio cambia la
  herramienta después, lo que ya mandaste no cambia.
- **Comisión:** `fee_rules 'insc'` sobre la matrícula capturada (también si se queda por cancelar tarde); devolución con su comisión devuelta en
  proporción. Free / sin tarjeta: $0.
- **Nunca un cargo después:** ningún cobro fuera de sesión por una inscripción en este grupo («Nada que aparezca después en la tarjeta», L487).
  To'Latino **nunca cobra** la penalidad de un contrato: la dice antes de firmar y la cobra el gimnasio, si aplica (§6 #5).
- **CCIS, Head Start y Medicaid:** son filtros y texto. La app **no pide** ingresos, número de caso del CCIS, número de Medicaid ni estatus
  («No preguntan estatus», Niños FAQ L36; Head Start «gratis si calificas», L17). Con un precio de $0 la ficha dice «Gratis si calificas» (L81).

**Datos de los niños (Niños, y «Para mi hijo o hija» en Educación y Deporte):**
- **Lo que se guarda:** nombre de pila (≤ 30), edad en años o grado, la escuela solo si el programa recoge en la escuela (after school, L32), y
  la nota (≤ 200) — todo **cifrado** en `op_private.note_enc` (`lib/cifrado.ts`), visible solo para el padre o madre que inscribió y el panel de
  ese negocio (detalle de la inscripción, con rol); **se borra a los 30 días** de terminar, cancelar o vencer (barrido, `purge_at`).
- **Lo que nunca se guarda ni se pide:** fecha de nacimiento, fotos del niño, acta de nacimiento, vacunas, alergias, medicinas, diagnósticos,
  número de Medicaid, la lista de personas autorizadas para recogerlo ni sus identificaciones (el acta, las vacunas y la lista se entregan en
  persona al lugar: demo FAQ L1143; candado L471). La hoja dice: «No escribas datos médicos aquí; los hablas en persona con el lugar.»
- **Quién ve qué:** la ficha pública nunca muestra niños ni inscritos; los avisos (SMS, push, correo) **nunca llevan el nombre del niño ni la
  nota** (pantalla bloqueada); Terapias y Lactancia siguen las reglas de Salud (avisos neutros sin servicio, como `privacidadSalud`); el Super
  Admin ve la inscripción **sin** los datos del niño salvo un rol con motivo y auditoría (soporte de una ayuda «cuidado»).
- **Fotos:** las reseñas de NEG-NINOS no llevan fotos; las fotos de Ayuda son del recibo o de lo publicado, privadas (`subirFotoPrivada`); las
  fotos públicas de un negocio de Niños pasan por la cola Medios antes de salir (§6 #7).
- **Cuidado en casa:** la dirección exacta solo la ven las familias confirmadas (`L_HOME`, datos.ts L115); 4eb verifica que la ficha ya la
  oculta y, si no, lo construye con su guardián.

**Guardianes nuevos:** `matriculaInscripcion` (ninguna matrícula capturada sin `confirmed`; ninguna retenida en `declined/expired/cancelled`
más de 1 h; cancelar antes del inicio = devolución exacta; después = 0; grupo cancelado = devolución exacta a todos); `soloMatriculaEnLaApp`
(ningún `payment` de una inscripción `mes · semana · clase · hora`; ningún `pasarela.cobrar` fuera de sesión en `lib/inscripciones*.ts`);
`gruposSinSobreventa` (Σ cupos vivos por grupo ≤ `seats_total`; `care_openings` nunca negativo; prueba de carrera con 3 familias por el último
cupo); `copiaDelPrecio` (cambiar la herramienta no toca una inscripción viva); `ninosSinDatosSensibles` (ninguna columna ni campo de fecha de
nacimiento, alergia, medicina, diagnóstico, vacuna, Medicaid o foto del niño en esquema o código de inscripciones / niños — como
`sinImagenDeID`); `ninosNotaCifrada` (el nombre y la nota del niño solo se tocan en `lib/inscripciones.ts` (crear), el detalle del panel y la
purga — patrón `privacidadSalud`); `avisoNinosNeutro` (ninguna plantilla `insc_*` / `biz_insc_*` lleva `{nino}` ni `{nota}`; las de terapia y
lactancia tampoco `{servicio}`); `ninosSinFotoPublica` (reseña de NEG-NINOS sin fotos; ayuda con foto privada; ninguna `media.owner_kind` de
niño); `licenciaNoSeFinge` (`lic`, el chip «con licencia» de `tarjeta.ts` L89–91 y LICENCIA «Del estado de PA» solo con `pa_dhs_childcare`
`valid`; guardería o cuidado en casa sin ella dice «No tiene», L88); `enlaceEnLineaPrivado` (`join_url` nunca en consultas públicas, solo a
confirmados y al panel); `cancelarSiempreSePuede` (toda inscripción viva tiene su «Cancelar» y ninguna ruta del servidor la niega); `semilla`.

---

## 4. Bloques

### 4ea · Motor de inscripción: cursos, grupos y cupos + Educación «Grupos y cupos» (panel + admin + datos) — Sonnet/medium; migración Opus
**Datos:** migración 0085. Semilla de pruebas `infra/pruebas/semilla/0024_edu_ninos_deporte.sql` (`is_test`, nunca en producción), generada por
`scripts/semilla/extraer-edu-ninos-deporte.cjs` (como `extraer-noche.cjs`) desde `TLEdu.B` (22) y `TLEduL.SVC` (`dias` + `start` → `class_groups`
con fechas reales desde hoy; `mat` → `deposit_cents`; `cert`, `inc`, `no`, `plan`, `gratis1` → `svc_attrs`), `ABOUT`, `ST`, `RV`, `STATS`, el
panel `REAL_E` (dash2-cat L46) y `demo-edu` (demo-biz L1066–1124). En este bloque solo Educación; 4eb y 4ec suman lo suyo al mismo script.
**Panel (Lo que vendes):**
- **Cursos** (hueco #1; `Servicios.tsx` con el rubro `edu`): secciones; por curso nombre ES/EN, descripción, foto, **forma** (`curso` «Total ·
  12 semanas · 72 h · matrícula $20» · `mes` «$80 al mes · primera clase gratis» · `clase` «$15 la clase» · `hora` «$25 la hora»), certificado y
  quién lo da (oficial / de la escuela), incluye, va aparte, plan, nivel, ocultar; y sus **grupos** (etiqueta, días, hora, fecha de inicio,
  cupos 0–40, presencial o en línea con enlace). Free = 5 visibles.
- **Tu herramienta «Grupos y cupos»** (§5): cada toque se guarda y deja `AuditEntry`.
- **Tu página › Licencias** (como 4h-3): las de escuela (§2), con número y foto del documento.
**Servidor:** `lib/inscripciones-comun.ts` (tipos, `VOC` por rubro (flow L13–19) para que Iglesias, Bienes Raíces y Venta de Autos lo reusen
después, `limpiarInsc` validado en el servidor), `lib/edu.ts` (`eduPanel`, `guardarHerramientaEdu`, `abrirGrupo`, `cuposGrupo`,
`recalcularFiltrosEdu`, `kindEdu`), `app/panel/acciones-edu.ts`.
**Super Admin (ADM-NEG 360 › Lo que vende):** «Grupos y cupos» en solo lectura siempre (`summary` L306: «3 grupos abiertos · 17 cupos libres ·
también en línea · con plan de pagos»); forzar el tipo, ocultar curso con motivo, pausar módulos (`svc`, `citas`); Catálogo › Licencias;
Catálogo › Filtros (§2). Auditoría de cada cambio.
**Guardianes:** `svc_kind` de inscripción coherente con sus atributos (`curso` con `sem`, `hrs` y al menos un grupo; matrícula ≤ precio; `plan_n`
solo en `curso`; `gratis1` nunca en `curso`); `gruposSinSobreventa`; ningún `filter_values` sin fuente; ES/EN en todo texto nuevo.

### 4eb · Niños: «Cupos y licencia», licencia del DHS y datos de los niños (panel + admin + datos) — **Opus/high** (menores, licencias)
**Datos:** migración 0086; semilla desde `TLNinos.B` (21), `TLNinosL.SVC` (`semana` / `curso` / `mes` / `clase` → ítems y grupos), `edad` →
`age_min/max`, tags → `insc_settings` y `care_openings`; licencias `pa_dhs_childcare` de ejemplo **solo** para los que traen `lic` (estado `valid`
en pruebas), y `demo-ninos` (L1125–1184).
**Panel:** guardería y cuidado en casa → **«Cupos y licencia»** (cupos por edad, precio por semana sin subsidio, CCIS, extendido, comidas, turno de
noche; L465–471); los demás (after, campamento, clases, terapia, familia) → «Grupos y cupos» con «LO QUE OFRECES» (español, recogida o transporte,
Medicaid y CHIP) y la espera de la evaluación (L454–455), sin plan de pagos (`NIK`, L460). **Tu página › Licencias:** «Licencia de cuidado infantil
(DHS)» con número y foto; mientras está en revisión la ficha dice «Licencia en trámite»; vencida, la ficha lo dice (candado L471).
**Servidor:** `lib/ninos.ts` (`ninosPanel`, `guardarCuidado`, `cuposPorEdad`, `recalcularFiltrosNinos` con `lic` desde la licencia, `kindNinos`),
`lib/ninos-privado.ts` (`guardarNino` / `leerNino` / `purgarNinos` sobre `op_private` y `cifrado.ts`; único lugar que los toca),
`app/panel/acciones-ninos.ts`. Regla: guardería y cuidado en casa **sin licencia vigente no reciben solicitudes por la app** (solo contacto) y la
ficha lo dice (§6 #9). Niñera y nana (sin local) quedan solo con contacto (§6 #10).
**Super Admin:** «Cupos y licencia» en solo lectura (`summary` L307: «Quedan 3 cupos · acepta CCIS · $235 la semana · turno de noche»);
Licencias › DHS (verificar con el registro público, vencer, retirar con motivo); al retirar una licencia el derivado `lic` cae en la misma
transacción. Revisión de seguridad del bloque (datos de menores) antes de cerrar.
**Guardianes:** `licenciaNoSeFinge`, `ninosSinDatosSensibles`, `ninosNotaCifrada`, `avisoNinosNeutro`, `ninosSinFotoPublica` (cada uno probado
al revés: una columna `birth_date` de prueba, una plantilla con `{nino}`, un `lic` sin licencia → falla).

### 4ec · Deporte: «Membresías y contrato» y «Liga e inscripciones» (panel + admin + datos) — Sonnet/medium
**Datos:** migración 0087; semilla desde `TLDeporte.B` (20: `con`, `cxl`, `ins`, `meet` → `insc_settings`), `TLDeporteL.SVC` (membresías `mes`,
pases `clase`, temporadas `curso` con `team`, cancha `hora` con `per_field`), `FREE` (L18–26, precios de los Free sin reserva) y `demo-deporte`
(L1185–1240).
**Panel:** membresía (`gym · trainer · box · clase · alberca`) → **«Membresías y contrato»** (L481–487); liga y cancha → **«Liga e inscripciones»**
(L473–480; título del admin L538). Los precios que toca la herramienta son los del ítem (una sola fuente).
**Servidor:** `lib/deporte.ts` (`deportePanel`, `guardarMembresia`, `guardarLiga`, `recalcularFiltrosDeporte`, `kindDeporte`, `conL` (texto del
contrato, deporte-kind L30) en el servidor), `app/panel/acciones-deporte.ts`. Validación: con contrato, «Cancelar antes cuesta» se dice siempre
(aunque sea $0); sin contrato, `cancel_fee_cents = 0` (check); depósito de la liga ≤ cuota (L475).
**Super Admin:** «Membresías y contrato» / «Liga e inscripciones» en solo lectura (`summary` L308); ocultar con motivo.
**Guardianes:** `cancelarSiempreSePuede` (la parte del panel: ningún texto ni ajuste que diga «no se puede cancelar»); `sincontrato` coherente
con `contract_m = 0` y `cancel_fee_cents = 0`.

### 4ed · Fichas de las tres (cliente) y páginas de categoría — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-EDU, NEG-NINOS, NEG-DEPORTE), pestaña por tipo («Cursos» / «Clases»; «Programas» / «Clases» /
«Servicios»; «Membresías» / «Clases» / «Liga y canchas» / «Precios»: kind L89, ninos `tabL` L104, deporte `tabL` L151), hoja del curso, tarjeta
«TU INSCRIPCIÓN» / «TU CUPO» / «TU MEMBRESÍA» (`mineCard` L86–87), barra y riel; página de categoría (derivados).
- **Tarjeta de arriba** (`ax.veh` L79 y los `post`): Edu «¿QUÉ TE LLEVAS AL FINAL?» Certificado oficial / Constancia de la escuela + «El precio es
  el total del curso; lo que va aparte se dice antes de inscribirte.» (tutor «¿PARA QUÉ GRADOS?», coach «¿CÓMO EMPIEZAS?», arte «¿NECESITAS
  EXPERIENCIA?», L101–103); Niños «¿TIENE LICENCIA?» «Sí: licencia del estado de PA» / «No requiere licencia» (fuera del cuidado «¿DESDE QUÉ
  EDAD?», L95); Deporte «¿HAY CONTRATO?» con `conL` y la inscripción, liga «¿QUÉ INCLUYE LA CUOTA?», visita «¿HAY QUE RESERVAR?» (L129–131).
- **Tarjeta de Hoy** por tipo (Edu HORARIO · CÓMO / CERTIFICADO · IDIOMA, L95–96; Niños EDADES · LICENCIA · SUBSIDIO / EDADES · SEGURO · EVALUACIÓN /
  EDADES · HORARIO · RECOGIDA / EDADES · HORARIO · PRIMERA CLASE, L87–93; Deporte CUOTA · CONTRATO · HORARIO / PRÓXIMA CLASE · CUOTA · PRIMERA CLASE /
  INSCRIPCIÓN HASTA · CUOTA · PARTIDOS, L119–122) con el horario real (`horL`, `hrsOn`), nunca el «Mañana» por defecto.
- **Lista de servicios** con precio y meta de `priceFor` / `metaOf` («$3,900 · TOTAL · 4 SEMANAS · 160 H · LICENCIA CDL CLASE A DE PA», «$80/mes ·
  PRIMERA CLASE GRATIS», «$450 · TEMPORADA · 10 FECHAS · POR EQUIPO», «$60 · POR LA CANCHA», «Gratis si calificas»); botón «Inscribirme» /
  «Reservar» / «Pedir cupo» (L71); notas (máx. 4; L72, L77–78, L99–100, L124–128).
- **Hoja** (L90–95): precio, TE LLEVAS + horas, INCLUYE, VA APARTE, texto de pago (`payT` L92 y deporte L134–137) con la corrección de §6 #1; CTA.
- **Resumen:** riel (`TD` L81 / Niños EDADES / Deporte), amenidades (`AM` L82), hechos, FAQ por tipo (Edu L30–50, Niños L26–39, Deporte L35–54; la
  de Tu página gana), licencias verificadas como hecho, persona con foto (`ST` L51).
- **Variantes:** «VERIFICADAS POR INSCRIPCIÓN» / «RESEÑAS DE VISITANTES · AÚN SIN INSCRIPCIONES VERIFICADAS» / Free «AQUÍ NO TE INSCRIBES POR LA APP»
  (L91; Niños L80; Deporte L108); Free «Llama para inscribirte» / «Llama para pedir cupo» / «Ve directo» + HOY HASTA (L105–107; L98–100; L139–143);
  sin local: niñera, nana, animador, renta «Zona donde trabaja» (L101–102), club «Dónde salimos» (L144–145); 24 horas (`fix24`).
- **Página de categoría:** derivados de §2 y §5; tarjeta con `eta` y `fee`; stats «DE NOCHE» / «CON LICENCIA» / «SIN CONTRATO».
**Servidor:** `lib/inscripciones-publico.ts` (`fichaInsc(negocio)`, `faqInsc`, `tipoInsc`, `metaInsc`), reusando `ficha.ts`. Ningún dato de
inscritos en lo público.

### 4ee · Inscribirse: matrícula, confirmar, otro grupo, lista de espera, empezó / terminó, cancelar + Panel Inscripciones — **Opus/high** (dinero, menores)
**Pantallas:** `APP-NEG-EDU-INSCRIPCION` (`s.eb`), `APP-NEG-EDU-ESTADO` (`s.eins`), Mi cuenta › Citas y reservas, Panel › Hoy / **Inscripciones**
(hueco #2) / detalle.
- **Inscripción (3 pasos, `bookVals` L29–55; escritorio en una página con columna fija):** 1 **Para quién** (Para mí · Para mi hijo o hija · Para
  otra persona, L22; con hijo: nombre de pila, edad o grado y «Soy su mamá, papá o tutor legal»; nivel `cero · algo · medio` donde el curso lo pide;
  nota 0/200 «Ej.: trabajo de noche los viernes…» con el aviso de datos médicos) → 2 **Grupo** («GRUPOS» / «EMPIEZA», L47; los llenos no se eligen;
  sin grupos con cupo → «Anotarme en la lista de espera» donde aplica) → 3 **Revisa y envía** (RESUMEN · CURSO · GRUPO · PARA · TOTAL · TE LLEVAS
  (L34); CÓMO SE PAGA (`cobro` L33); BUENO SABER (`pol2` L35: la línea fija · lo que va aparte · la regla de cancelar con la fecha real); plan de pagos
  como **acuerdo por escrito** que se acepta (§6 #3); TARJETA solo con matrícula; Avisos por SMS; barra HOY PAGAS $X · TOTAL $Y → «Enviar
  solicitud»). Sin sesión → entrar y volver. Tarjeta rechazada: «Tu tarjeta fue rechazada. No se cobró nada.» (L49).
- **Servidor:** `inscribirme(userId, f)` en `lib/inscripciones.ts` (teléfono verificado; una inscripción viva por persona, ítem y grupo; techo Free;
  grupo abierto y con cupo; `client_key`; candado `insc:{grupo}`; precio y matrícula del servidor; **retención antes de guardar**; datos del niño a
  `ninos-privado.ts`; primera clase gratis una vez por persona y lugar cada 90 días). Número I-4101….
**Estados** (`citaVals` L66–70): `pending` PENDIENTE («Esperando a {escuela}» · «Pagaste la matrícula ($X). Si no confirman, se devuelve.» con la
corrección de §6 #1 / «No se ha cobrado nada.») → `confirmed` CONFIRMADA («Lun y Mié 7 PM · empieza el 5 oct» · «Trae una identificación el primer
día.») → EN CURSO / ASISTIENDO / ACTIVA (`prog` por rubro; «Plan: 12 pagos de $517» con su calendario) → `done` TERMINADA (certificado o
«Constancia de la escuela» · «¡Felicidades!» en Edu; estrellas → reseña) | `change_proposed` TE PROPONEN UN CAMBIO («Ese ya no está libre…»;
«Aceptar» / «No me sirve») | `declined` NO PUDO «No hay cupo» | `expired` SIN RESPUESTA | `cancelled` CANCELADA («La cancelaste tú» / «La escuela
canceló el grupo» + lo devuelto). Membresía: «Cancelar mi membresía» → CANCELACIÓN PEDIDA (fecha y hora; el gimnasio confirma o a las 72 h queda
cancelada) → CANCELADA. Lista de espera: EN LISTA DE ESPERA («Hay N antes que tú») → TE OFRECEN UN CUPO (48 h para aceptar) → pasa a PENDIENTE /
CONFIRMADA. Pasos: Enviada · Confirmada · En curso · Terminada (L71–72). Acciones: Cómo llegar · Calendario · Cancelar (pend / ok); Ayuda (en
curso / terminada) (L73).
**Panel (Hoy · Inscripciones · detalle):** Esperan tu respuesta (Confirmar / Otro grupo / No hay cupo, con para quién, nivel, grupo, matrícula,
«quedan N cupos en este grupo»; vence a las 24 h); Grupos (por grupo: inscritos, cupos, «Cancelar el grupo» con motivo → devolución a todos;
«Empezó» manual si no lo hizo el barrido; «Terminó» con «¿Entregaste el certificado?»); Lista de espera (ofrecer cupo); Membresías (cancelaciones
pedidas: «Confirmar la cancelación»); Plan de pagos (marcar cuota pagada en la escuela). El detalle muestra los datos del niño **solo** al dueño y
a quien tenga el rol, con auditoría de cada vista.
**Servidor:** `responderInsc(negocio, num, paso)` sobre el patrón de `responderMesa`, `decidirOtroGrupo` (cliente), `cancelarInsc(por, num,
motivo)`, `cancelarGrupo(negocio, grupo, motivo)` (devolución a todos, como `trip_runs`), `marcarInsc(negocio, num | grupo, 'empezo' | 'termino',
cert?)`, `pedirCancelarMembresia(userId, num)`, `ofrecerCupo`, `aceptarOferta`, barrido `barrerInscripciones` (vence a las 24 h, empieza el día de
inicio, termina 7 días después del fin si nadie lo marcó, vence ofertas de la lista a las 48 h, purga datos del niño) en `lib/barrido.ts`.
**Avisos:** `insc_ok`, `insc_alt`, `insc_no`, `insc_exp`, `insc_cx` (con lo devuelto o lo que se quedó), `insc_grupo_cx` (SMS a todos), `insc_oferta`
(SMS: lista de espera), `insc_empieza` (recordatorio el día antes), `insc_cancelada`; al negocio `biz_insc` (SMS), `biz_insc_cx`,
`biz_insc_cancel_req` (SMS). Sin nombre del niño ni nota; terapia y lactancia neutros.
**Super Admin:** Transacciones › **Inscripciones** (`TabTx 'insc'` con rubro edu · niños · deporte: matrícula retenida / cobrada / devuelta / se quedó,
línea de tiempo, plan por escrito); Colas › «Grupos que no abrieron» (3 en 90 días → revisión), «No me dejan cancelar» (cancelación pedida sin
confirmar o ayuda `salir`) y «Retenciones que fallaron».
**Guardianes:** los de §3 + punta a punta: tres familias por el último cupo → una pasa; otro grupo aceptado y rechazado; vence a las 24 h;
cancelar el día antes y el día de inicio (reloj movido); el grupo no abre con 8 inscritos → 8 devoluciones exactas; lista de espera → oferta →
vence → siguiente; primera clase gratis dos veces → la segunda no; membresía: cancelar en la app → constancia y aviso; datos del niño borrados a
los 30 días; ningún aviso con el nombre del niño.

### 4ef · Reseñas y Ayuda (curso, cuidado, membresía) — Sonnet/medium; ayuda con dinero y «cuidado» Opus
- **Reseña** (`APP-NEG-RESENA`, `TLEduRev`): verificada = inscripción `done` («Fui sin pedirlo por To'Latino · VISITANTE», `srcs` L43–45). Dato de la
  inscripción (no se edita, `tm` L50–51; «Estos datos salen de To'Latino. No se editan.» L56). Preguntas (`Q` L16–18 + TRATO L49): Edu ¿COBRARON EL TOTAL
  QUE DIJERON? · ¿TE DIERON EL CERTIFICADO PROMETIDO? · ¿LOS MAESTROS EXPLICAN? · ¿CUMPLIERON EL HORARIO? · ¿APRENDISTE DE VERDAD?; Niños ¿COBRARON LO
  QUE DIJERON? · ¿TENÍAN LA LICENCIA A LA VISTA? · ¿CUIDARON BIEN A TU NIÑO? · ¿CUMPLIERON EL HORARIO? · ¿TE CONTABAN CÓMO LE IBA?; Deporte ¿LA CUOTA FUE
  LA QUE VISTE? · ¿TE DEJARON SALIR SIN PROBLEMA? · ¿LOS ENTRENADORES AYUDAN? · ¿CUMPLIERON EL HORARIO? · ¿ESTÁ LIMPIO Y EL EQUIPO FUNCIONA?. **LO QUE
  IMPORTA** (`asp` L44–45; Niños L63–64: LICENCIA A LA VISTA solo con licencia, CUIDAN BIEN A LOS NIÑOS, TE CUENTAN CÓMO LE VA; Deporte L79: CANCELAR
  FUE COMO DIJERON / ÁRBITRO Y CANCHA COMO DIJERON; sin «certificado» en `noCert` L77) y «De N inscripciones por To'Latino en los últimos 12 meses.»
  (L46). Hechos (L47–50) y del servidor: «Cancelaron el grupo», «No dejaron cancelar». ≤2 ★ → «La reseña no devuelve dinero. Si algo salió mal,
  pídelo en {Ayuda}.» (L58). Niños: sin fotos y con el aviso «No escribas el nombre de tu niño»; el filtro `PRIVADO` / PII corre en el servidor.
- **Ayuda** `APP-NEG-EDU-AYUDA` → `-ESTADO` (`helpForm` L68–85, `helpStatus` L88–105; entradas: en curso o terminada, reseña ≤2 ★): MOTIVO (RSNS L24–26)
  + ¿Qué pasó? ≥15 + ¿CUÁNTO? · OPCIONAL + Fotos · obligatorias en cobros y `salir` («Del recibo, el contrato o lo publicado.», L83) + ¿Qué quieres?
  (SOLS L31–33 + «Solo quiero avisar») → RESPONDE EN 24 H → ACEPTÓ · PROPONE OTRA COSA · NO ACEPTÓ → «Pedir revisión a To'Latino» → EN REVISIÓN 48 h
  («Miramos lo publicado, lo que pagaste y tus fotos.», L94; con la copia del precio y el plan por escrito) → LISTO. **«No cuidaron bien a mi niño»** va
  directo a To'Latino con prioridad y el texto de §6 #8, sin esperar 24 h. **«No me dejan cancelar»** usa la constancia de la cancelación pedida.
  «No tenían licencia» abre también la cola Licencias. Dinero: la matrícula (cobrada en la app) se devuelve por Stripe; lo cobrado de más en el lugar
  lo devuelve el negocio fuera de la app y el cliente confirma «Me lo devolvieron».
- **Servidor:** rubros `edu · ninos · dep` en `ayuda-cita.ts` / `ayuda-motivos.ts` (`MOTIVOS`, `CON_FOTO` = cobro · salir; `NUM` acepta `I-`),
  `resenas.ts` (`rubroRes`, `limpiarRespuestas`, hechos); `escalarVencidas` ya corre en el barrido.
- **Guardianes:** `fotoAyudaPrivada`, `ninosSinFotoPublica`; punta a punta: «cobraron más» con foto → acepta → «Me lo devolvieron»; «No me dieron el
  certificado» → To'Latino decide → devolución parcial exacta de la matrícula; «cuidado» sin esperar 24 h.

### 4eg · Super Admin, avisos, analítica y documentación — Sonnet/medium
- **Super Admin:** Colas › **Cuidado de niños** (motivo `cuidado`: prioridad, SLA corto, roles admin y soporte; ver los datos del niño exige motivo y
  queda en auditoría), Licencias (DHS por vencer y vencidas), Ayudas escaladas; Transacciones › Inscripciones; Notificaciones (todas las plantillas
  ES/EN); Configuración (24 h de respuesta, 48 h de la oferta, 72 h de la cancelación, 30 días de purga — llega con Configuración, Fase 5);
  Analítica **Educación · Niños · Deporte** (% confirmadas en 24 h, % vencidas, grupos que no abrieron, matrículas retenidas / cobradas /
  devueltas / que se quedaron, ocupación de grupos, días en lista de espera, cancelaciones de membresía pedidas y confirmadas en 72 h, % «cobraron el
  total» y «certificado prometido» en reseñas, ayudas por cada 100 inscripciones, guarderías con licencia vigente / vencida). Todo con `city_id`,
  por cursor, sin N+1, sin datos de niños.
- **`docs/ayuda/`** (regla 9, ES/EN): cliente `inscribirte-en-un-curso` (matrícula, grupos, plan por escrito, cancelar, certificado),
  `cuidado-de-ninos` (licencia, cupos por edad, CCIS, lista de espera, recogida), `privacidad-de-datos-de-ninos` (qué guardamos, quién lo ve, cuándo
  se borra; como `privacidad-de-datos-de-salud.md`), `membresias-y-ligas` (contrato, cancelar en la app, depósito de la liga), `resena-y-ayuda-con-tu-
  inscripcion`; negocio `grupos-y-cupos-negocio`, `cupos-y-licencia-negocio`, `membresias-y-contrato-negocio`, `panel-inscripciones`,
  `licencia-de-guarderia`; Super Admin: actualizar `admin-analitica.md`.
- **Triángulo** (regla 8): cada toque de Tu herramienta → ficha, tarjeta y Buscar (`summary` L306–308) → Super Admin lo ve y puede ocultar o pausar.

---

## 5. «Tu herramienta» y página de categoría (lo específico)

- **Educación · «Grupos y cupos»** (HEAD L447: «Lo que preguntan: ¿qué me llevo al final y cuánto cuesta en total? Aquí abres grupos, cuentas los cupos y
  dices qué va incluido.»; `blocksE` L449–464): KPIs GRUPOS ABIERTOS · CUPOS LIBRES · CLASE GRATIS (L451) · CÓMO DAS LAS CLASES (Presencial · En línea ·
  Híbrido · Clases en español; al menos una: «Deja al menos una forma de dar clases.», L452–453) · por curso: **Precio** (−/+ $10 el curso, $5 lo demás;
  «El curso completo · N semanas», L458), **Matrícula · aparta el cupo** (−/+ $5; «Hoy pagan $X · se descuenta del total; si el grupo no abre, se
  devuelve» / «Sin matrícula: pagan el primer día», L459), **PLAN DE PAGOS** (Sin plan · 3 · 6 · 12 → «N pagos de $X sin intereses», L460), **Primera
  clase gratis** («Sin tarjeta y sin compromiso.», L461), **Cupos · {grupo}** (0–40; «Lleno · no sale en tu página»; «Deja al menos un grupo con cupo.
  Si se llenó, abre otro grupo.», L462–463) · REGLAS · NO SE APAGAN (2 candados, L464). `apply()` L225–231 → tags `gratis1 · plan · presencial · linea ·
  hibrido · esp`, `fee` y `eta`; en código `insc_settings` + ítems + `class_groups` + `app/panel/acciones-edu.ts`.
- **Niños · «Cupos y licencia»** (HEAD L447: «Cupos por edad, el subsidio y el precio por semana. Tu licencia de PA siempre está a la vista.»; L465–471):
  KPIs CUPOS LIBRES · CCIS · POR SEMANA · CUPOS POR EDAD (2 años · 3 años · 4 y 5 años, 0–20; cuidado en casa «Cupos libres · hasta 6 niños», 0–6; «Lleno ·
  lista de espera») · **Precio por semana sin subsidio** (−/+ $5, $50–600; «Con CCIS, el estado paga una parte; lo que te toca se dice antes.») · Aceptas el
  subsidio CCIS · Horario extendido · Comidas incluidas · Turno de noche · REGLAS (licencia DHS a la vista, verificada; solo recogen las personas
  autorizadas). Fuera del cuidado, el bloque de Educación con `NIK` (L449–463): LO QUE OFRECES y la espera de la evaluación (1–12 semanas). La
  licencia **no** es un interruptor: sale de Licencias.
- **Deporte · «Membresías y contrato»** (HEAD L447: «Lo que más preguntan: ¿hay contrato y cuánto cuesta cancelar?»; L481–487): CONTRATO (Sin contrato · 6
  meses · 12 meses) · **Cancelar antes de tiempo cuesta** (solo con contrato; −/+ $10, $0–500; «Se dice antes de firmar y sale en tu página.») ·
  **Mensualidad** (−/+ $1, $5–300) · **Cuota de inscripción** (−/+ $5, $0–200) · **Pase de un día** / **Clase suelta** (−/+ $1, $0–50) · Primera visita /
  clase gratis · Guardería 5 a 8 PM / Cuidan a los niños durante la clase · REGLAS (2 candados). **«Liga e inscripciones»** (L473–480): Cuota del equipo /
  del jugador · temporada (−/+ $10, $10–2,000) · Depósito que aparta el lugar (≤ cuota) · INSCRIPCIÓN HASTA (fecha) · Equipos que faltan / Lugares que
  quedan (0 = «Lista de espera») · Cancha por hora (−/+ $5) · Aceptas jugadores sueltos · REGLAS (2 candados). `apply()` L238–249.
- Lo que ya mandaron los clientes **copia** precio, matrícula, plan y contrato: cambiar la herramienta no cambia una inscripción viva.
- **Páginas de categoría** (ya en código; aquí solo los derivados): Edu `que` (`NEED` L40: Inglés · Ciudadanía · GED · Licencia CDL · Un oficio · Tareas de
  los niños · Computación · Baile) y `como` (De noche · Fines de semana · En línea · Con certificado); GROUPS ORDENAR · CÓMO · HORARIO · CURSO · NEGOCIO;
  `QUICK5` noche · cert · esp · gratis1 · plan; stats «DE NOCHE». Niños `que` (Guardería · Después de la escuela · Deporte · Campamentos) y `como` (Con
  licencia · Acepta subsidio · De noche · Hay cupo); GROUPS ORDENAR · LO QUE IMPORTA · HORARIO · NEGOCIO; `QUICK5` lic · subsidio · cupos · noche · esp;
  stats «CON LICENCIA». Deporte `que` (Gimnasio · Jugar en liga · Bailar · Boxeo) y `como` (Sin contrato · Cuidan a los niños · 24 horas · Primera clase
  gratis); GROUPS ORDENAR · CÓMO PAGAS · LUGAR · NEGOCIO; `QUICK5` sincontrato · guarderia · 24h · gratis1 · esp; stats «SIN CONTRATO». Todos derivados,
  cacheados, nunca editables; la consulta de la categoría lee `filter_values` con su GIN (presupuesto de velocidad), nunca `class_groups` en vivo.

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **¿La matrícula se cobra al enviar?** El prototipo dice «Hoy pagas la matrícula… Si no confirman, se devuelve» (listing L92, flow L33, L66).
   Default (como Fiestas #1 y Noche #1): **se retiene al enviar y se cobra al confirmar**; el texto pasa a «Hoy se retiene la matrícula de $X; se cobra
   cuando confirmen y se descuenta del total. Si no confirman, se libera completa.»
2. **Número.** El prototipo usa `E-4xxx` (flow L56), pero `E-` ya es de las emergencias de Hogar (`lib/solicitudes.ts` L405). Default: **I-4101**
   («INSCRIPCIÓN #») con su secuencia. Reversible.
3. **El resto del curso y el plan de pagos.** El prototipo dice «El resto el primer día» o «El resto en N pagos» sin decir a quién (L33, L92) y el estado
   muestra «Plan: 12 pagos de $517» (L69). Default: **el resto se paga en la escuela**; el plan es un **acuerdo por escrito** (total, abono, N pagos,
   fechas, sin intereses) que el cliente acepta al enviar, guardado solo inserción y versionado como el layaway (`terminos`, `VERSION_PLAN`); la escuela
   marca cada cuota pagada. Pagar las cuotas en la app (motor de `layaway.ts`) queda listo para encenderse si el fundador lo pide.
4. **Membresías mensuales: ¿cobro recurrente en la app?** El flujo solo cobra la matrícula (`todayOf` L24) pero el demo dice «Cancelas cuando quieras en la
   app» (L1203) y la Ayuda ofrece «Que cancelen mi membresía» (rev L33). Default: **sin cobro mensual en la app** en este grupo; «Cancelar mi membresía»
   en la app deja una constancia con fecha y hora, avisa al gimnasio y queda cancelada a las 72 h si no responde. El motor de `planes.ts` está listo para
   el cobro mensual si se decide.
5. **La penalidad del contrato.** Default: To'Latino **nunca la cobra**: se dice antes de firmar (ficha, hoja, revisión y copia en la inscripción) y la
   cobra el gimnasio si aplica (candado «Solo se cobra la membresía», L487). Si el gimnasio cobra más de lo publicado, Ayuda `cobro`.
6. **Datos del niño.** El prototipo solo dice «Escribe su nombre y grado en la nota» (L44). Default: §3 (nombre de pila, edad o grado, escuela si lo recogen y
   la nota, cifrados; solo el padre o la madre y el lugar; borrados a los 30 días; nunca fecha de nacimiento, fotos, salud, Medicaid ni lista de personas
   autorizadas). Quien inscribe a un niño declara ser su mamá, papá o tutor legal.
7. **Fotos de los niños.** El demo dice «¿Mandan fotos? Sí, en la app durante el día» (L1143) y «Gracias por la foto» (L1147); el prototipo no tiene esa
   función. Default: **no se construye**; Mensajes no lleva fotos; las fotos públicas de un negocio de Niños pasan por la cola Medios con el aviso «No subas
   fotos donde se vea la cara de un niño sin permiso por escrito de sus papás». `LAUNCH-CHECKLIST`: revisar con abogado.
8. **«No cuidaron bien a mi niño».** El diseño la trata como una ayuda más (24 h). Default: **va directo a To'Latino con prioridad** (como «Me sentí
   inseguro» de Noche) con el texto fijo «Si un niño corre peligro, llama al 911. Si sospechas maltrato o abuso, llama a ChildLine de Pennsylvania:
   1-800-932-0313.» (número a verificar antes de producción) y la cola «Cuidado de niños». `LAUNCH-CHECKLIST`: obligaciones de reporte con abogado.
9. **Guardería o cuidado en casa sin licencia vigente.** La línea dice «si no la tiene, se dice» (L52). Default: puede publicar y la ficha dice «No tiene
   licencia del estado» / «Licencia en trámite», pero **no recibe solicitudes por la app** (solo contacto) hasta que la licencia esté `valid`. Los demás tipos
   (clases, deportes, campamentos, tutorías) no la necesitan («No aplica», onboarding L324–).
10. **Niñera y nana sin local** (NEG-NINOS-06/07; Free en el prototipo). Default: **solo contacto, nunca reserva por la app**, aunque sean Pro, hasta que el
    fundador decida cómo se verifican; la ficha no promete revisiones de antecedentes.
11. **Bandas de edad del cuidado.** La herramienta usa 2 años · 3 años · 4 y 5 años (L131) y el onboarding 0–2 · 3–5 · 6–12 · 13+ (datos.ts L324–). Default: el
    lugar define sus bandas dentro de su licencia; la semilla usa las del prototipo; el onboarding solo llena `age_min/max`.
12. **Plazo para responder.** El prototipo no lo dice (sim «Pasa el tiempo», L82). Default: **24 h**, nunca después del inicio del grupo − 12 h; sin respuesta
    se libera todo.
13. **Empezó y Terminó.** En la demo son botones (L83–84; SP L151–155). Default: el barrido marca «Empezó» el día de inicio del grupo; «Terminó» lo marca el
    negocio (con «¿Entregaste el certificado?») y, si no, el barrido 7 días después del fin. Membresía y semana: la reseña verificada se abre a las 4
    semanas activas o al terminar.
14. **Lista de espera.** La dicen la herramienta y la ficha (L468, L235, deporte-kind L117) sin flujo. Default: en cuidado de niños y ligas (no en grupos de
    Edu, que abren otro grupo, L462); orden de llegada, «Hay N antes que tú», oferta de cupo con 48 h para aceptar, $0 hasta aceptar.
15. **Free.** La ficha Free dice «AQUÍ NO TE INSCRIBES POR LA APP» (kind L91, L105) y `canBook` exige Pro (L59); la decisión del 3 nov (MEM 87, 1872) dice que Free
    toma hasta 10 al mes. Default (como Noche #7): manda la decisión: Free acepta solicitudes **sin matrícula ni tarjeta**, tope 10 al mes; el texto se ajusta.
16. **Tutoría, entrenador y cancha por hora.** El prototipo los trata como grupos con horas fijas (`dias` «Hoy 4 PM», L21). Default: **sesiones publicadas**
    desde un patrón semanal del panel (cupo 1 en la tutoría y la cancha); sin agenda por persona. Si el fundador lo prefiere, se usa el motor de citas
    (`lib/citas.ts`, huecos por persona) sin código nuevo de dinero.
17. **Comisión.** El prototipo cobra a las tres como `cita` (8 %, adm-data L28–30, L133). Default: `fee_rules 'insc'` nueva sembrada en 800 bp para moverla
    aparte; sobre la matrícula capturada, también si se queda por cancelar tarde.
18. **Licencias y textos legales.** No están en el diseño (salvo «Licencia de guardería de PA (DHS) · verificada», L6). Default: sellos **sin verificar**
    (DHS para cuidado infantil; escuelas privadas, de barbería / cosmetología, CDL y manejo para Edu), revisión manual del equipo con el registro público;
    `LAUNCH-CHECKLIST`: confirmar emisores, URL de cada registro y si las clearances de PA para quien trabaja con niños se piden o se muestran.
19. **Campo de tiro y cacería** (NEG-DEPORTE «Cacería y campo de tiro»; Free en el prototipo, L23). Default: **solo directorio y contacto**; nada se vende ni
    se reserva por la app (como la regla de 21+ de Noche); la licencia de pesca o caza la saca el cliente con el estado.
20. **Subcategorías de Deporte que el prototipo no trae** (Equitación, Charreada y rodeo, Centro recreativo, Entrenadores y árbitros, Academia deportiva
    juvenil, Organizador de torneos; 0004 L1235–1319) y tres nombres con «&» (MMA & jiu-jitsu, Karate & taekwondo, Paintball & airsoft). Default: tipo
    `visita` · `visita` · `visita` · `trainer` · `clase` · `liga`; manda el catálogo (ids); la semilla compara nombres normalizados.
21. **Clases en línea.** «El enlace te llega al inscribirte» (L33). Default: `join_url` por grupo, solo `https://`, visible solo para inscritos confirmados y
    el panel; nunca en la ficha.
22. **Errores del prototipo a no copiar:** «Pañales no» dentro de INCLUYE (ninos-listing L9) → va en VA APARTE; `CUP0` y «8 cupos» por defecto cuando no hay
    dato (dash2-cat L306, L449) → el cupo es explícito; contrato de 12 meses y $50 de penalidad por defecto (L178) → sin dato = «Pregunta antes de
    inscribirte» (listing L79); `team` adivinado por `/^Equipo/` (deporte-kind L29) → `team` explícito; `svc: 'Pedido'` en la ayuda (rev L71); la respuesta
    fija «Faltan horas del curso…» (rev L99); número al azar (flow L56); `fixOpen` con la hora fija 12:30 (kind L27, deporte-kind L23); «Pagas en la clase»
    para la semana de guardería (flow L33) → «Pagas la semana en el lugar».

## 7. Orden, dependencias y pruebas
4ea → 4eb → 4ec → 4ed → 4ee (dinero) → 4ef → 4eg. 4eb y 4ec dependen de 4ea (servicios, `class_groups`, `insc_settings`, `limpiarInsc`); 4ed de los tres;
4ee reusa el dinero de Fiestas (4v) y Noche (4nc) y el patrón de cupos de Transporte (4y) sin romperlos (regresión de sus fechas, mesas y viajes); 4ef
depende de 4ee; 4eg cierra. El motor (`inscripciones-comun.ts`, `VOC`) queda listo para Iglesias, Bienes Raíces y Venta de Autos (siguiente grupo).
Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9 dispositivos con la `RESPUESTA` simulada igual que la
barra del prototipo (ok · rechaza → no · nada → «Pasa el tiempo» → exp · cambio → otro grupo · tarjeta → rechazada al enviar; «Empezó», «Terminó»;
Ayuda «El negocio responde», «Pasan 24 h», «To'Latino decide») — en la app eso lo hacen el panel y los barridos del servidor (SP L115–119, L151–155,
L239–242). Pruebas con reloj movido: 24 h de respuesta, el día antes y el día de inicio (corte de la devolución), 7 días después del fin, 48 h de la
oferta, 72 h de la cancelación de membresía, 30 días de la purga. Revisión de seguridad (regla 5) de 4ea, 4eb, 4ee y 4ef antes de cerrar (dinero,
menores, licencias). Presupuesto de velocidad: cupo del grupo y ficha en una consulta indexada, sin N+1. Capturas teléfono + escritorio de cada
pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre del grupo (todo marcado antes de decir «Educación + Niños + Deporte completos»)
- [ ] Migraciones 0085–0089 (+ 0090 si las colas la piden) aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI.
- [ ] Semilla 0024 solo en pruebas (guardián `semilla`); demos `demo-edu`, `demo-ninos`, `demo-deporte` con grupos, cupos, licencias y reseñas.
- [ ] Editor de cursos, programas y membresías con sus cinco formas y sus grupos con fecha y cupos.
- [ ] Las tres «Tu herramienta» guardan cada toque, reflejan en ficha, tarjeta y Buscar, y el Super Admin las ve (triángulo).
- [ ] `lic` solo con licencia DHS vigente (probado al revés); guardería sin licencia no recibe solicitudes por la app.
- [ ] Inscripción de punta a punta con matrícula (retiene, confirma y cobra, otro grupo, no hay cupo, vence, cancelar antes y después del inicio, el
      grupo no abre) y sin matrícula (mes, semana, clase, hora, primera clase gratis, Free): cifras exactas en `payments` y en Stripe simulado.
- [ ] Lista de espera (oferta, vence, siguiente) y cancelar la membresía en la app (constancia, aviso, 72 h).
- [ ] Datos del niño cifrados, vistos solo por quien toca, borrados a los 30 días; ningún aviso, reseña, log ni vista pública con ellos (guardianes
      probados al revés).
- [ ] Reseñas verificadas con preguntas y «Lo que importa» por categoría; ayudas con motivos, fotos privadas, «cuidado» directo a To'Latino y escalado
      con la copia del precio y el plan por escrito.
- [ ] Super Admin: Transacciones › Inscripciones, Colas (cuidado de niños, no me dejan cancelar, grupos que no abrieron, ayudas), Licencias (DHS y
      escuelas), Notificaciones, Analítica.
- [ ] Avisos nuevos ES/EN en `notif_templates` y su SMS donde va.
- [ ] `docs/ayuda/` completas (ES/EN) para cliente y negocio (§4eg), con `privacidad-de-datos-de-ninos`.
- [ ] Guardianes nuevos de §3 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes; Fiestas,
      Transporte y Noche sin regresión.
- [ ] Preguntas #1–#22 anotadas en `docs/REVISION.md`; lo diferido en `docs/LAUNCH-CHECKLIST.md` (licencias y registros, clearances, ChildLine y
      obligaciones de reporte, fotos de niños, cuotas y membresías en la app, Configuración de plazos en la Fase 5).
- [ ] `docs/PROGRESS.md` al día y `docs/REVISION.md` con los pasos para que el fundador lo mire en el sandbox.
