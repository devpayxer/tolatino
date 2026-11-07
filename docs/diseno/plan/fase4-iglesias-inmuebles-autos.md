# Fase 4 · Iglesias + Bienes Raíces + Venta de Autos — plan de construcción extraído del prototipo (7 nov 2026)

Bloques **4ia → 4ig** (la letra `i` de Iglesias e Inmuebles delante de la del bloque; `4i` suelto ya es de Salud + Profesionales y
4ea–4eg de Educación, igual que 4e convivió con 4ea; `4ia`–`4ig` no aparecen en `docs/PROGRESS.md` ni en el historial). Migraciones desde
**0091**. Último grupo de la Fase 4. Nada de este archivo se ha construido. Esto es un resumen de trabajo; manda el prototipo.

## 0. Fuentes
Todas en `docs/diseno/pantallas/datos/` salvo indicación. Las tres viven en el prototipo **sobre el motor de Educación** (MEM 98: `TLEduL`
lo usan `b.fe`, `b.inm` y `b.dealer`; los Autos llevan también `b.inm` para heredar la visita gratis). El vocabulario sale de `VOCS` (flow
L17 `fe`, L18 `inm`, L19 `dealer` con `visit: true`), la línea fija de `lineOf` (flow L25), lo que se paga hoy de `todayOf` (flow L24: con
`b.inm` siempre $0), el cobro de la revisión de `cobro` (flow L33: «Hoy $0 · La prueba de manejo es gratis / Ver la propiedad es gratis»),
el paso «Para mi hijo» se quita en visitas (flow L45), el «Trae tu licencia de conducir» / «Llega 5 minutos antes» / «Te esperamos» (flow
L65), los pasos `sent → ok → done` de una visita (flow L71) y el «Pasó la visita» / «Pasó la prueba» (flow L83); las preguntas de la reseña
`Q` (rev L19–21), los motivos de Ayuda `RSNS` (rev L27–29) y las soluciones `SOLS` (rev L34–36), con «Solo quiero avisar» (rev L37).
**Iglesias:** `neg-fe.js` (TLFe: 19 lugares, 12 Pro y 7 Free; cabecera L1–3 con los tags F-FE `misaesp · catolica · jovenes · despensa ·
transporte · bodas · repatria · sinid · 24h · esp · y10`; `B` L7–25 con `cul` (servicios de la semana `[es, en, día, hora]`), `freq`, `rep`,
`zone`; `SUBG` L28–33 = 5 capítulos y 41 subcategorías; `ROWS` L34; `NEED` L35; `WHO` L36; `GROUPS` L40–44; `QL` L45; `QUICK5` L46; `statsK`
«EN ESPAÑOL» L47; **`line`** L48; `lineSub` L49), `neg-fe-listing.js` (cabecera L1–2: misas, cultos, grupos y despensa = gratis; sacramentos =
donativo dicho; funeraria = total; `SVC` L6–24 con `fe gratis | don | tot`, `dur`, `dias`, `start`, `inc`, `no`, `plan`; `FREE` L25–31),
`neg-fe-kind.js` (TLFeK, 28 oct, **manda sobre el listing**: `KS` L11–20, `kind` L21 = `misa · culto · grupo · sacr · consejo · fun · oracion ·
ayuda · tienda`; `otra` / `sobria` L23–24; `nextCul` L34; `HELP` L38; `LINE` L40–41; `faq` L44–62 (consejería y 988 L55, ayuda sin papeles
L60); `RK` L65–77 (`otra`, `crem`); stats: solo la funeraria verifica L84; `metaOf` L98–102; `priceL` L103; `btnOf` L104 (gratis «Ver
detalles», sacramento «Pedir fecha», curso «Inscribirme», funeraria «Pedir información»); `tabL` L105; `post` L108–159 (tarjeta de Hoy L122–126,
CTA L130–136, notas L137–139, «¿HAY QUE INSCRIBIRSE?» L140–142, hoja L145–148, Free L149–151, sin local L152–153)).
**Bienes Raíces:** `neg-inmueble.js` (TLInmueble: 17 negocios, 13 Pro y 4 Free; cabecera L1–3 con F-INMUEBLE `rentar · comprar · cuarto · sinssn ·
itin · mascotas · utilidades · amueblado · primera · s8 · visita · esp · gratis · linea · y10`; `B` L7–23 con `disp`, `libre`, `eng`, `days`,
`nmls`, `lic`, `con`, `acc`, `zone`; `SUBG` L25–30 = 5 capítulos y 45 subcategorías; `ROWS` L31; `NEED` L32; `WHO` L33; `GROUPS` L37–42; `QUICK5`
L44; `statsK` «SIN SEGURO SOCIAL» L45; **`line`** L46; `lineSub` L47), `neg-inmueble-listing.js` (cabecera L1–2: cada propiedad = «Pedir visita»
con horas de visita; `SVC` L6–48 con `t renta | venta | gratis | tot`, `cuota`, `u`, `inc`, `no`; `FREE` L49–52), `neg-inm-kind.js` (TLInmK:
`KS` L9–17, `kind` L18 = `rent · cuarto · venta · hipo · serv · derechos · comercial · alm`; `tOf` L26; `depOf` L27 (el depósito sale del texto);
`LINE` L29–35; `faq` L38–53 (papeles L39, desalojo sin corte L50); `RK` L56–64; stats L72; `metaOf` L84–88 «PARA MUDARTE $X · VER ES GRATIS»;
`btnOf` L90; `tabL` L91; `post` L94–142 (tarjeta de Hoy L108–115, `subP` L116 «la dirección te llega cuando la aceptan», CTA L119–121, notas
L122–125 (NMLS L123), tarjeta de arriba L126–129, hoja L132–133, Free L134–136, sin local L137–138)).
**Venta de Autos:** `neg-dealer.js` (TLDealer: 17 negocios, 11 Pro y 6 Free; cabecera L1–3 con F-VEHICULO `itin · sincredito · enganche · garantia ·
tradein · limpio · prueba · esp · y10`; `B` L7–23 con `eng`, `gar`, `wk`, `mo`, `days`, `next`, `bfee`, `zone`; `SUBG` L25–29 = 4 capítulos y 39
subcategorías; `ROWS` L30; `NEED` L31; `WHO` L32; `GROUPS` L36–40; `QUICK5` L42; `statsK` «CON ITIN» L43; **`line`** L44; `lineSub` L45),
`neg-dealer-listing.js` (cabecera L1–2; `car()` L6–7 = precio + 6 % + placas $150 + cargo del dealer = **en la puerta**, millaje, título,
historial, inspección de PA; `SVC` L8–48 (ITIN con tasa y meses L40–41; compre aquí pague aquí con total pagado L47–48; cuatrimoto y licencia M
L14–15; CDL L22); `FREE` L49–54), `neg-dealer-kind.js` (TLDealerK: `KS` L9–14, `kind` L15 = `lot · new · bhph · work · moto · rv · lux · salv ·
mayor · broker` (venden, `sells` L16) y `cash · placas · fin · taller · envio`; `otd` L26; `LINE` L29–36; `faq` L39–63 (TOT L40, ITIN L41,
garantía L42, atrasos L50, reporte al crédito L51, salvage L55, GAP L60); `RK` L66–81; `metaOf` L101–104 «EN LA PUERTA $X · N MILLAS»; `btnOf`
L106; `tabL` L107; `post` L110–160 (tarjeta de Hoy L124–135, CTA L139–141, notas L142–145, «¿CUÁNTO PAGO EN TOTAL?» L147, hoja L151–152)).
**Comunes:** `dash2-cat.js` (TLDashCat: demos del panel `REAL_E` Parroquia Santa María (Padre Luis Herrera) y Rentas Hazleton Latino (Yesenia
Batista) L46, `REAL_D` Autos El Cibao (Juan Polanco) L43, más `BIZ[…]` L93–100; `MISA` / `CULTO` L132–133; `AYUDA` L134; `FREQ` L135; `FE0` /
`DL0` / `INM0` L136–138; `TOOLS` L140 = NEG-FE «Horarios y ayuda», NEG-INMUEBLE «Propiedades y visitas», NEG-DEALER «Inventario del lote»;
`state` L179–186 y L190–191; `apply` L214–224 (Autos), L254–267 (Iglesias), L268–280 (Bienes Raíces); `summary` L310–321; `blocksD` Autos
L429–443; `blocksE` HEAD L447–448, Iglesias L488–507, Bienes Raíces L508–533), `demo-biz.js` (`demo-fe` L1245–1305, `demo-inm` L1306–1365,
`demo-dealer` L1366–1430: FAQ L1387, solicitudes del panel L1388, mensajes L1391, reseña «Me quisieron meter la garantía a la fuerza» L1379),
`adm-data.js` L31–33 (Iglesias transacciona `none`; Bienes Raíces y Autos `cita`), `onb-neg-data.js` (= `apps/web/lib/onb/datos.ts` L55–57:
`on` y rótulos «Misas y servicios» · «Bautizos y bodas» / «Propiedades» · «Visitas» / «Inventario» · «Prueba de manejo»; `ALLOW` datos.ts L90
`['svc','citas']`, Autos `+ 'cot'`), `onb-neg-flow.js` (= datos.ts L359–): Iglesias L265–280 (horarios, ayuda gratis, bilingüe; precios
`don` y funeraria), Bienes Raíces L281–294 (rento · vendo · las dos, ACEPTAS ITIN · Section 8 · mascotas, **licencia de agente de PA** L286),
Autos L295–308 (financias · con ITIN · contado, trade-in, garantía, **cargo del dealer** $0–1,000 L301, foto del precio del parabrisas L302)),
`dash2-evt.js` L17 y L22 (Iglesias publica «Culto, vigilia o retiro» y comunitario: eso es Eventos, Fase 6),
`packages/db/migrations/0004_catalogo_datos.sql` (NEG-FE L1322, 43 subcategorías, módulos `svc citas staff eventos nov jobs`; NEG-INMUEBLE L1412,
45; NEG-DEALER L1506, 39, + `cot`), `packages/taxonomy/paginas.json` (NEG-FE L16748–, NEG-INMUEBLE L17729–, NEG-DEALER L18795–),
`docs/diseno/plan/taxonomia-negocios.md` (F-INMUEBLE L52–54, F-VEHICULO L55–57, F-FE L69–71; §15 L780, §16 L827, §17 L876),
`docs/diseno/entrega/modelo-datos.md` (MD: `op_kind none` en Iglesias L121; `category_attrs` L267–268; Operation `enrollment` = Iglesias y `visit`
= Bienes Raíces y Venta de Autos L834/L854; Evento `format worship` L1133), `solo-prototipo.md` (SP «El negocio responde» L113–119, «Pasa una
visita» L154), `docs/diseno/referencia/memoria-del-diseno.md` (MEM 98, 174–176 (Hecho 15–17), 752–753 (visitas enviada → confirmada → terminada),
949–966 (M1d, M1e: herramientas), 2162–2176), `docs/PLAN.md` L210. Plantillas y motores ya construidos: `fase4-hogar-auto.md` (4a–4g),
`fase4-salud-pro.md` (4h–4m), `fase4-mercados-tiendas.md` (4n–4s), `fase4-fiestas-transporte.md` (4t–4z), `fase4-noche.md` (4na–4ne),
`fase4-edu-ninos-deporte.md` (4ea–4eg). Decisiones que mandan: `docs/DECISIONES.md` (A, I, O, P, Q, U, AA, AB).

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Páginas de categoría (filas `que` foto · `como` chips; `stats_tag` `esp` / `sinssn` / `itin`; GROUPS y QUICK5) | `paginas.json` L16748–, L17729–, L18795–, `lib/categoria.ts`, `lib/buscar.ts` | Ya servidas; faltan los derivados que las alimentan (§2) |
| Subcategorías y módulos por defecto | migr. 0004 L1322, L1412, L1506 | Bienes Raíces y Autos 1:1 con `SUBG`; Iglesias trae 2 más (§6 #19) |
| Onboarding: horarios, ayuda y bilingüe (Iglesias); rento / vendo, ITIN · Section 8 · mascotas y licencia (Bienes Raíces); financias, trade-in, garantía y cargo del dealer (Autos) | `lib/onb/datos.ts` L55–57, L90, L359– | Lo dicho en Publica tu negocio siembra Tu herramienta sin pedirlo otra vez |
| `items` (`module 'svc'`, `svc_kind`, `svc_attrs`, `price_from`, `deposit_cents`) · editor `app/panel/Servicios.tsx` + `lib/servicios.ts` (`RubroSvc`, `limpiar*` en el servidor) | 0048, 0057, 0070, 0081, 0085 | Servicios de Iglesias; las propiedades y los carros son ítems con su ficha propia (§2) |
| `class_groups` (grupo o sesión de un día con cupo, `seats_booked` derivado con candado) | 0085 | **Horas de visita y de prueba de manejo** (sesión de un día, cupo 1 por defecto) y las charlas de bautizo |
| Motor de inscripciones `lib/inscripciones*.ts` (`inscribirme`, `responderInsc`, `inscCliente`, `vencerInsc`, `inscPanel`), `VOC` | 4ea–4ee | **Iglesias**: «Pedir fecha» (sacramentos, consejería, capellanía) y catecismo, rubro `fe`, **$0** (§3) |
| `lib/ninos-privado.ts` (`guardarNino` / `leerNino` / `purgarNinos`) + `op_private` cifrado (`lib/cifrado.ts`) | 4eb | Catecismo y primera comunión «para mi hijo»; nota de consejería y capellanía |
| `lib/citas.ts` (huecos, candado) · `lib/solicitudes.ts` (pre, pq) | 3b, 4e | Patrón de candado y de respuesta; **no** se usa su dinero |
| `lib/licencias.ts` + `license_kinds` / `licenses` (`licencias_refrescar`, cola Licencias); clave `acreditado` de Profesionales (`lib/no-hago.ts` L8) | 1k, 4h-3, 4eb | Funerarias, corredores y vendedores de PA, NMLS, dealers y venta a plazos (§2) |
| `tax_rules` (impuesto por ciudad) · `lib/estimados.ts` | 4d | El 6 % del precio en la puerta sale de aquí, nunca escrito a mano |
| `lib/resenas.ts` (`rubroRes`, `limpiarRespuestas`, hechos) · `lib/resenas-filtro.ts` (`PRIVADO`) | 2g, 4m, 4ef | Reseña verificada por visita, prueba o fecha: rubros `fe · inm · dealer` |
| `lib/ayuda-cita.ts` (`RubroAyuda`, `CON_FOTO`, `NUM /^[CMAFVNI]-/`) · `lib/ayuda-motivos.ts` · fotos privadas | 3e, 4z, 4ef | Ayuda con la iglesia / la visita / el dealer; `NUM` suma `P-` |
| `lib/avisos.ts` · `notif_templates` · `lib/plan.ts` (`TOPE_FREE 10`, `ITEMS_FREE 5`) | 2j, 1h | Plantillas ES/EN; Free = 5 visibles y 10 al mes |
| `lib/barrido.ts` `barridoCentral` | 0078 | Tarea `visitas` (vencer, «Pasó», abrir reseña, purga) y regeneración de horas de visita |
| Super Admin: `N360.tsx`, `Transacciones.tsx` + `lib/admin-tx.ts` (`TabTx … insc`), `Colas.tsx` + `lib/colas.ts` (`Cola … cuidado · salir · grupo`), `Analitica.tsx` + `lib/admin-analitica.ts` | 1i, 2i, 4eg | Pestaña **Visitas**, colas y analítica de las tres |
| `operations.kind` ya admite `'visit'` y `'enrollment'`; estados `pending · change_proposed · confirmed · declined · expired · cancelled · done` | 0023 L37, 0053 L8 | Sin migración para el tipo |
| Guardianes `dineroDelServidor`, `operacionesConTipo`, `transaccionEnFila`, `licenciaNoSeFinge`, `sinImagenDeID`, `fotoAyudaPrivada`, `privacidadSalud`, `resenaPrivada`, `copiaDelPrecio`, `cancelarSiempreSePuede`, `semilla` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo para las tres (categoría, ficha, solicitud y estado, reseña y ayuda; MEM 174–176, 752–753). El **panel**
solo trae las tres «Tu herramienta» (L429–443, L488–533) y el Servicios genérico. **No hay:**
1. **Editor de propiedades** con su ficha (tipo, dirección, recámaras, baños, pies², renta y depósito o precio, lo que incluye, lo que piden, desde
   cuándo, fotos, horas de visita): el prototipo escribe todo en la descripción y saca el depósito del texto con una expresión (`depOf` L27).
2. **Editor de carros** (VIN, año, marca, modelo, versión, millaje, título, historial, garantía, transmisión, combustible, tracción, precio, fotos):
   el prototipo escribe millaje y título en el texto (`car()` L7) y lee el cargo del dealer del texto (`feeOf` L25).
3. **Solicitudes de visita y de prueba en el panel** (para cuándo, quién, nota) y su respuesta: Confirmar / Otra hora / No se puede; luego «Pasó»
   o «No vino». El panel de la demo las lista (demo L1388) sin pantalla.
4. **«Pedir fecha»** de sacramentos en el panel (bodas y quinceañeras «Sábados con fecha», demo L1249; charlas de bautizo) y su respuesta.
5. **Búsqueda por propiedad o por carro** con los filtros de la taxonomía (recámaras, precio, año, millaje, transmisión; L52–57): el prototipo solo
   filtra negocios (§6 #10).
6. **Licencias** de agentes, prestamistas, dealers y funerarias en Tu página (el onboarding dice «La revisamos antes del sello», L286).
7. **Vivienda justa:** ningún texto del diseño la menciona; el anuncio no tiene aviso de igualdad de oportunidad ni filtro de textos (§3).
8. Super Admin: Transacciones › **Visitas**, Colas › «Posible estafa» y «Cobro por ver», Licencias de las tres, Analítica de las tres.
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de solicitud del panel, `Citas.tsx`,
`Inscripciones.tsx`, `Servicios.tsx`) y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

### 1c. Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, revisión y estado; nunca se suavizan)
- **Iglesias (`NEG-FE`):** «¿hay servicio en español y me ayudan si lo necesito?» · línea **«La ayuda de la iglesia es gratis; nunca se cobra por
  despensa, ropa ni oración.»** (`TLFe.line` L48) · sub L49. Por tipo (`LINE` kind L40–41): funeraria «El precio es el total por escrito antes de
  firmar: nada se agrega después.»; tienda «El precio de aquí es el de la caja.»; otras religiones y ayuda «La ayuda aquí es gratis; nunca se cobra por
  comida, ropa ni oración.». Candados (L488): «La ayuda es gratis · El donativo siempre es sugerido; si no puedes, no se cobra.» · «Nadie pregunta tu
  estatus · Ni para la despensa ni para los sacramentos.»; funeraria (L501): «El precio es el total» · «Sin presión · La familia decide con calma».
- **Bienes Raíces (`NEG-INMUEBLE`):** «¿cuánto necesito para mudarme y me la rentan sin seguro social?» · línea **«Lo que pagas para mudarte está
  completo aquí: nadie cobra por ver una propiedad.»** (L46) · sub L47 («…Si te cobran por ver o por la solicitud sin decirlo, repórtalo.»). Por tipo
  (L29–35): préstamos «La precalificación es gratis; nadie te garantiza la aprobación antes de revisar tus papeles.»; venta «Ver una casa es gratis; el
  precio, la cuota estimada y lo que pagas al cerrar se dicen antes de firmar.»; derechos «La orientación es gratis; no son abogados y nadie te pregunta
  tu estatus.». Candados: «Ver la propiedad es gratis» · «Para mudarte: primer mes + depósito» (L533); «Precalificar es gratis» · «Nadie garantiza la
  aprobación» (L512); «Ver una casa es gratis» · «La cuota dice «estimada»» (L520).
- **Venta de Autos (`NEG-DEALER`):** «¿cuánto pago en total y el carro está limpio?» · línea **«El precio en la puerta: con impuestos, placas y cargos
  del dealer, antes de firmar.»** (L44) · sub L45 («…El pago al mes siempre con la tasa y los meses.»). Por tipo (L29–36): compre aquí pague aquí «El
  enganche, el pago y el total que pagas al final se dan por escrito antes de firmar.»; financiamiento «La tasa, los meses y el total que pagas se dan
  por escrito; nadie garantiza la aprobación.»; broker «…nunca pagues antes de ver el carro y el título.». Candados (L443): «Total en la puerta antes de
  firmar · Precio + 6 % + placas + cargo del dealer.» · «Con ITIN: tasa y meses por escrito · Antes de la prueba de manejo, nada se cobra.».

**Lo que el prototipo hace de verdad** (y lo que no): **ninguna de las tres cobra nada en la app.** Visitas y pruebas de manejo: hoy $0 siempre
(`todayOf` L24, `cobro` L33), estados enviada → confirmada | otra hora | no se puede | sin respuesta → «Pasó» → reseña (flow L66–71, L83). Iglesias:
misas, cultos, grupos, despensa y oración no se reservan («Ver detalles» → «Es gratis y no hay que inscribirse: llegas a la hora», kind L148);
sacramentos y citas de consejería «Pedir fecha» (la oficina confirma, L147); catecismo «Inscribirme»; funeraria «Pedir información» = contacto (llamar
o WhatsApp, L110, L132). El donativo sugerido **nunca** se cobra (`todayOf` da 0 a `clase`). **No** hay apartado de carro con depósito, **no** hay
solicitud de renta ni cuota de solicitud en la app, **no** hay crédito ni precalificación con datos, **no** hay diezmo ni donación en línea, **no** se
pide estatus, seguro social, ITIN, ingresos ni licencia de conducir (FAQ fe L60, inm L39, dealer L48: los papeles se llevan en persona). Todo sin
terceros pagados nuevos (PLAN §8): sin Carfax, sin buró de crédito, sin MLS; avisos con el SMS ya pagado.

**Tipos por negocio** (deciden FAQ, reseñas, pestaña, tarjeta de Hoy, CTA y Tu herramienta; derivados de las subcategorías con `KS`; el admin puede
forzarlo): Iglesias `misa · culto` (horarios) · `grupo` · `sacr` (fecha) · `consejo` · `oracion` · `ayuda` (despensa) · `fun` (funeraria) · `tienda`;
Bienes Raíces `rent · cuarto` (renta) · `venta` · `hipo` (préstamo) · `serv` · `derechos` · `comercial` · `alm`; Autos `lot · new · bhph · work · moto · rv
· lux · salv · mayor · broker` (venden) · `cash · placas · fin · taller · envio` (servicios).

---

## 2. Cambios de datos (migraciones 0091 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0091 `iglesias_horarios` (4ia)**
- **`worship_times`** (servicios de la semana; `b.cul`): `business_id`, `city_id`, `dow smallint 0–6`, `start_min`, `label {es,en} ≤ 40` («Misa en
  español», «Jóvenes»), `lang check in ('es','en','bil','otro')`, `kind check in ('misa','culto','grupo','oracion')`, `sort`, `removed_at`. Índice
  `(city_id, dow, start_min) where removed_at is null` (la tarjeta «PRÓXIMA MISA» y «Hoy en el barrio» la leen sin N+1).
- **`fe_settings`** (Tu herramienta; una fila por negocio): `kind_override` (solo admin), `bil bool`, `help text[]` ⊂ `despensa · ropa · transporte ·
  jovenes · ninos · bodas` (`AYUDA` L134), `sinid bool`, `freq check in ('semana','quince','mes')` (`FREQ` L135), `out_today_on date` («Se acabó por hoy»,
  vale solo ese día, se apaga solo), `catequesis_open bool` (L506), funeraria `h24 bool`, `plan_n smallint in (0, 12)` (texto, no cobro), `rep_days check
  in ('3–5','5–7','7–10')`, `updated_by/at`. Cada guardado deja `AuditEntry`.
- `items.svc_attrs` de Iglesias (zod en `limpiarFe` + guardián): `fe check in ('gratis','don','tot')`, `dur {es,en} ≤ 40` («Con cita · 1 hora»), `inc`,
  `no`. **`deposit_cents = 0` siempre en NEG-FE** (check por categoría; §3). Precio de `don` = donativo sugerido; de `tot` = total por escrito.
- `insc_settings.rubro` suma `'fe'`; `operations.details.wanted_on date` + `franja check in ('manana','tarde','noche')` para «Pedir fecha».
- `license_kinds` (texto legal **sin verificar**, §6 #16): `pa_funeraria` (State Board of Funeral Directors de PA), `fe_doj` (representante acreditado
  del programa de Reconocimiento y Acreditación del DOJ / EOIR; mismo texto que `acreditado` de Profesionales), `irs_501c3` (opcional; nunca se muestra
  su falta). Sellos: no bloquean nada.
- Derivados en `businesses.filter_values`: `misaesp`, `esp`, `bil`, `catolica` (subcategoría), `jovenes · despensa · transporte · bodas · ninos · ropa`
  (herramienta), `sinid`, `repatria`, `24h`. `attrs.tarjeta.eta` = «Misa en español: domingo 12 PM y sábado 6 PM» (de `worship_times`) y `fee` =
  «Catecismo: inscripciones abiertas» / «Transporte gratis los domingos» (apply L254–267). `category_attrs` NEG-FE (MD L267) = copia derivada.

**0092 `inmuebles_propiedades` (4ib)**
- `items.svc_kind` suma `'renta'` y `'venta'`; cada propiedad es un ítem (`module 'svc'`) con su fila en **`property_listings`**: `item_id` (pk),
  `business_id`, `city_id`, `kind check in ('apto','casa','cuarto','compartida','amueblado','opcion','s8','mayores','venta_casa','condo','obra','multi',
  'terreno','rural','movil','lote_movil','local','oficina','bodega','cocina','salon','almacen','parqueo')`, `beds smallint 0–12`, `baths numeric(3,1)`,
  `sqft int`, `rent_cents` | `price_cents`, `deposit_cents` (renta; check ≤ 2 × renta, §6 #5), `app_fee_cents` default 0, **`move_in_cents`** (derivado:
  renta + depósito + cuota de solicitud + lo que se publique como obligatorio; lo calcula el servidor al guardar), `est_payment_cents` + `est_down_pct`
  (venta; siempre «estimada»), `available_on date`, `furnished`, `pets`, `assist_animals` fijo `true` (no se apaga), `utilities text[]`, `parking`,
  `laundry`, `s8 bool`, `ssn_required bool` (false = acepta ITIN, pasaporte o carta del trabajo), `papers {es,en} ≤ 200` (lo que piden, L39), `lease
  {es,en} ≤ 80`, `senior_62 bool` (solo con declaración de vivienda para mayores, §3), `addr_line`, `geom geography(Point)` + **`addr_public bool`**
  (`cuarto`, `compartida` y lo que el dueño marque: false → la ficha muestra la zona, la dirección llega al confirmar la visita, L116, L137),
  `status check in ('available','pending','rented','sold','hidden')`, `status_at`. Índices: GIST `(geom)`, `(city_id, kind, rent_cents) where status =
  'available'`, `(city_id, price_cents) where status = 'available'`, `(business_id, status)`.
- **Horas de visita** = `class_groups` de un día por propiedad (cupo 1 por defecto, hasta 10; «Deja al menos una hora de visita», L531), generadas
  por el barrido 14 días adelante desde un patrón semanal en `svc_attrs.visit_pattern`.
- **`inm_settings`**: `kind_override`, `itin bool`, `s8 bool`, `pets bool`, préstamos `min_down_pct in (3.5, 10, 15, 20)`, `prequal_days in (1, 2, 3, 5)`,
  `soft_pull bool` (§6 #8), venta `buyer_no_commission bool` (L519), cuarto `free_from date`, `util bool`, `furnished bool` (L522–523).
- `license_kinds` (**sin verificar**): `pa_corredor` (State Real Estate Commission de PA: corredor o vendedor; también para administrar propiedades),
  `nmls` (NMLS Consumer Access + licencia del Department of Banking and Securities de PA; L123), `pa_avaluador` (State Board of Certified Real Estate
  Appraisers), `inspector_vivienda` (la ley de inspección de PA pide membresía en una asociación nacional, `lic` L16).
- Derivados: `rentar · comprar · cuarto` (de las propiedades vivas), `sinssn · itin` (herramienta y `ssn_required`), `s8`, `mascotas`, `utilidades`,
  `amueblado`, `primera`, `esp`, `gratis`, `linea`, `visita` (alguna hora de visita abierta). `attrs.tarjeta.eta` = «6 apartamentos disponibles» / «2 cuartos
  libres desde el 1 oct» / «Precalificación en 48 h» y `fee` = «Para mudarte: primer mes + depósito, sin cargos extra» (apply L268–280).

**0093 `autos_inventario` (4ic)**
- `items.svc_kind` suma `'auto'`; cada vehículo es un ítem con su fila en **`vehicle_listings`**: `item_id` (pk), `business_id`, `city_id`, `vin char(17)`
  (dígito verificador en el servidor; único por negocio mientras esté vivo), `year smallint`, `make`, `model`, `trim`, `body check in ('carro','suv','van',
  'pickup','trabajo','caja','trailer','remolque','moto','cuatrimoto','scooter','bote','rv','golf')`, `miles int` | `engine_hours int` (botes),
  `transmission`, `fuel`, `drivetrain`, `title check in ('limpio','reconstruido','salvage')`, `history_report bool` + `history_src ≤ 30` (lo da el
  dealer; To'Latino no lo compra), `pa_inspection bool`, `warranty check in ('como_esta','dealer','fabrica','certificado')` + `warranty_months` +
  `warranty_miles`, `street_legal bool` (cuatrimotos y carritos, L14, L19), `cdl bool` (≥ 26,001 lb, L22), `price_cents`, **`otd_cents`** (derivado,
  §3), `status check in ('lot','pending','sold','hidden')`, `status_at`. Índices: `(city_id, body, price_cents) where status = 'lot'`, `(city_id, year,
  miles) where status = 'lot'`, GIN trigram en `make || ' ' || model`, `(business_id, status)`.
- **Horas de prueba de manejo** = `class_groups` de un día por carro (o por negocio para «cualquier carro»), como en 0092.
- **`dealer_settings`**: `kind_override`, `doc_fee_cents` (≤ tope de `PlatformConfig.dealer_doc_fee_cap_cents`, §3), `tags_cents` (placas y título que
  cobra el dealer; semilla $150, L6), `itin bool`, `itin_down_cents ≥ 500` (L435), `apr_bp`, `term_m` (para el pago de ejemplo), `trade bool`,
  `home_test bool` (L434), `reports_credit bool` (L433), `warranty_default in (0, 3, 6)` (L436), compre aquí pague aquí `bhph_down_cents`,
  `bhph_week_cents ≥ 2500` (L431), `bhph_months`, `lot_total smallint` («Carros en el lote, aunque no todos estén en la app», L438).
- `license_kinds` (**sin verificar**): `pa_dealer` (State Board of Vehicle Manufacturers, Dealers and Salespersons de PA), `pa_vendedor_autos`
  (vendedor, demo L1382), `pa_venta_plazos` (licencia de venta a plazos de vehículos del Department of Banking and Securities; compre aquí pague aquí y
  financiamiento del dealer), `nmls` (reuso de 0092 si el financiamiento es de un prestamista).
- Derivados: `itin`, `sincredito` (bhph o financiamiento sin crédito), `enganche` (enganche ≤ $1,500), `garantia`, `tradein`, `limpio` (todos los vivos con
  título limpio e historial), `prueba` (hora de prueba abierta), `casa`, `esp`. `attrs.tarjeta.eta` = «38 carros en el lote» (`lot_total` − vendidos) y `fee`
  = «Enganche desde $1,500 con ITIN» / «Enganche $999 y $95 a la semana» (apply L214–224).

**0094 `visitas_ver` (4ie)** — `operations` `kind 'visit'` con `details`: `rubro check in ('inm','dealer')`, `item_id`, `group_id` (la hora), `what
check in ('visita','prueba','cita','precal','oferta')` (`btnOf` inm L90, dealer L106), **copias al enviar** `price_cents`, `move_in_cents` | `otd_cents`,
`doc_fee_cents`, `est_payment` (con tasa, meses y enganche), `title`, `miles`; `at_home bool` (prueba en casa; la dirección del cliente en
`operations.address`, visible al dealer solo al confirmar), `has_license bool` (solo «sí, tengo licencia vigente», nunca el número), `trade_in {year, make,
model, miles}` opcional, `sms bool`. **`visit_seq start 8101`** (número **P-8101**, «VISITA #» / «PRUEBA DE MANEJO #»; §6 #2). Estados: `pending` →
`confirmed` | `change_proposed` | `declined` | `expired` → `done` («Pasó») | `cancelled`; `status_detail 'no_show'` («No vino», solo inserción, sin multa).
Índices `(business_id, status, sent_at desc) where kind = 'visit'`, `(user_id, sent_at desc) where kind = 'visit'`, `(details->>'group_id') where kind =
'visit'`. `operation_events`: `vis_sent`, `vis_ok`, `vis_alt`, `vis_no`, `vis_exp`, `vis_cx`, `vis_biz_cx`, `vis_done`, `vis_noshow`, `vis_listing_gone`
(se rentó o se vendió antes de la hora → aviso y cancelada sin culpa). Iglesias usa `enrollment` (0088) con `rubro 'fe'` y `I-41xx`.

**0095 `ayuda_fe_inm_dealer` (4if)** — `help_requests.reason` amplía (RSNS L27–29): Iglesias `cobro` (foto) · `idioma` · `horario` · `trato`; Bienes
Raíces `ver` (foto) · `mudar` (foto) · `fotos` · `nollego`; Autos `precio` (foto) · `titulo` · `fotos` · `nollego`; `otro`. `wants` reusa `devolver` /
`avisar` y suma `llamar` (Iglesias), `otra_visita` (Bienes Raíces) y `arreglar_antes` (Autos) (SOLS L34–36). `reviews.answers` / `facts` con lo de 4if.
(+ **0096** si las colas lo piden, como 0090 de Educación.)

---

## 3. Dinero, datos personales y reglas legales (servidor — Opus/high; revisión de seguridad obligatoria)

El servidor calcula todo; el cliente solo muestra (`dineroDelServidor`). **En este grupo no se mueve dinero en la app.** Iglesias transacciona `none`
(adm-data L31) y Bienes Raíces y Autos `cita` con visitas de $0: comisión $0, ningún `payment`, ninguna retención, ninguna tarjeta pedida.

| Momento | Visita / prueba de manejo / cita / precalificación (Bienes Raíces, Autos) | Pedir fecha / catecismo / consejería (Iglesias) |
|---|---|---|
| Al enviar | $0, sin tarjeta; hora apartada en `class_groups` con candado `ver:{grupo}`; copia del precio y del total | $0, sin tarjeta; fecha deseada o grupo; datos del niño cifrados si es «para mi hijo» |
| Sin respuesta | 4 h hábiles y nunca después de la hora − 1 h → SIN RESPUESTA (§6 #3) | 48 h → SIN RESPUESTA |
| La confirman | CONFIRMADA; si `addr_public = false`, ahora llega la dirección | CONFIRMADA con fecha y hora |
| Otra hora / otra fecha | «Aceptar» / «No me sirve» (flow L67) | Igual |
| No se puede | «No hay visita a esa hora» (flow L68) | «No hay fecha» |
| Se rentó o se vendió antes | Cancelada sin culpa, aviso; la reseña no se abre | — |
| Pasó | El negocio marca «Pasó» o «No vino»; si nadie marca, el barrido la da por pasada a las 24 h | El barrido la cierra al pasar la fecha |
| Cancela cualquiera | Gratis siempre, con un toque (`cancelarSiempreSePuede`) | Gratis siempre |

- **Precio cerrado:** lo enviado copia renta, depósito, lo de mudarse, precio, total en la puerta, cargo del dealer y el pago de ejemplo (`copiaDelPrecio`);
  la Ayuda compara con esa copia («Pidieron más para mudarme de lo publicado», «El precio en la puerta fue más»).
- **Donativo:** NEG-FE nunca tiene `payment`, `deposit_cents` ni tarjeta; el donativo sugerido es texto («si no puedes, no se cobra»). Diezmo y ofrenda en
  línea **no se construyen** (§6 #1). La matrícula de $20 del catecismo (listing L8) se paga en la parroquia (§6 #1).
- **Nunca un cargo:** ni por ver, ni por la solicitud, ni por apartar un carro. Si un negocio pide dinero antes de ver, la línea fija y la Ayuda lo cubren.

**Lo que nunca se pide ni se guarda (las tres):** seguro social, ITIN (ni el número), estatus migratorio, ingresos, recibos de pago, estados de cuenta, taxes,
historial o puntaje de crédito, fecha de nacimiento, licencia de conducir (número o foto), número de pasaporte. Los papeles se llevan en persona; la ficha
solo dice **qué** piden (`papers`). La nota (≤ 200) pasa por el filtro del servidor que tapa 9 dígitos seguidos o con guiones (SSN / ITIN), números de
tarjeta y de cuenta antes de guardar (como Compa, SP L349), con el aviso «No escribas tu seguro social ni números de cuenta aquí.».
**Privacidad religiosa y de consejería:** ir a una iglesia, a consejería, a recuperación o pedir una capellanía son datos sensibles. Los avisos de
`consejo`, `oracion` y `recuperación` son neutros («Tienes una cita confirmada», sin el nombre del lugar ni el servicio en pantalla bloqueada, como
`privacidadSalud`); la nota va cifrada en `op_private` y se borra a los 30 días; la Analítica nunca muestra personas por religión.
**Vivienda justa (Fair Housing Act y Pennsylvania Human Relations Act — textos y lista a verificar con abogado, `LAUNCH-CHECKLIST`):**
- Ningún filtro, campo ni texto por raza, color, religión, sexo, orientación o identidad, discapacidad, **situación familiar** (niños), **origen nacional**,
  ascendencia o edad. Los filtros permitidos son de la propiedad y de los requisitos: `sinssn` / `itin` dicen qué papeles **aceptan**, nunca a quién; el copy
  nunca dice «para inmigrantes», «para hispanos», «sin niños», «ideal para pareja», «solo cristianos».
- Filtro de textos del servidor (ES/EN) en nombre, descripción, `papers` y `lease` de cada propiedad con la lista de frases prohibidas; si salta, no se
  publica y va a la cola Medios con el motivo.
- Cada propiedad lleva «Igualdad de oportunidad en la vivienda» al pie y la nota fija «Los animales de servicio y de apoyo no son mascotas: se aceptan
  siempre.»; `senior_62` solo si el negocio declara que es vivienda para mayores bajo la excepción de la ley (Super Admin lo revisa).
- `Section 8` es un requisito aceptado (fuente de ingreso), no un filtro excluyente: no existe «No Section 8».
- **Estafas de renta:** la línea y la hoja dicen «Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.»; Ayuda `ver` y `mudar` van
  directo a To'Latino con prioridad (cola «Posible estafa»).
**Precio en la puerta (Autos):** `otd_cents = precio + impuesto (tax_rules de la ciudad; 6 % en las cinco) + placas y título (dealer) + cargo del dealer`.
Ningún carro sale en lo público sin `otd_cents`; el cargo del dealer no pasa del tope de PA (se ajusta cada año; la cifra va en `PlatformConfig`, a verificar);
el cupón de Novedades sobre el cargo (demo L1380) no cambia el total publicado. **Pago al mes:** nunca sin tasa (APR), meses y enganche juntos (Regulation Z),
siempre «estimado, sujeto a aprobación», calculado por el servidor sobre el total en la puerta menos el enganche; compre aquí pague aquí con **total pagado**
= enganche + pago × semanas (L47, L222). «Como está» y la garantía deben coincidir con la Buyers Guide de la ventana (FTC Used Car Rule); la garantía
extendida y el GAP dicen siempre «No es obligatoria» (L37–38). To'Latino no consulta crédito, no da préstamos y no garantiza aprobación.
**Licencias:** el sello «Agente con licencia de PA», «NMLS #…», «Dealer con licencia de PA» o «Funeraria con licencia» solo sale de una licencia `valid`
revisada por el equipo con el registro público (`licenciaNoSeFinge`); el número que se ve es el de la licencia, nunca un texto del dueño (`b.nmls` L9, `b.lic`
L16, L19). Iglesias no necesita licencia; el 501(c)(3) es un sello opcional y su falta nunca se muestra.

**Guardianes nuevos:** `sinDineroEnVisitas` (ningún `payment`, retención ni `pasarela.*` en `lib/visitas-inm*.ts` ni en inscripciones `rubro 'fe'`; NEG-FE con
`deposit_cents = 0`); `sinDatosDeCredito` (ninguna columna ni campo `ssn`, `itin_number`, `income`, `dob`, `credit_score`, `bank_*`, `license_number` en esquema o
código de las tres — patrón `ninosSinDatosSensibles`); `notaSinNumeros` (la nota guardada nunca trae 9 dígitos de SSN/ITIN ni 13–19 de tarjeta; prueba al revés);
`viviendaJusta` (ningún filtro ni campo de clase protegida; las frases de la lista no pasan; el pie de igualdad y la nota de animales de servicio en toda
propiedad pública); `direccionAlConfirmar` (`addr_line` / `geom` exactos de `addr_public = false` nunca en consultas públicas, solo a la visita confirmada y al
panel — como `enlaceSoloInscritos`); `totalEnLaPuerta` (todo carro público con `otd_cents` recalculado = fórmula; cargo ≤ tope; ningún pago al mes sin tasa,
meses y enganche); `cuotaEstimada` (toda cuota de venta y pago de ejemplo lleva «estimada» ES/EN); `vinValido` (dígito verificador); `ayudaGratisIglesia`
(ninguna plantilla, ficha o hoja de NEG-FE con «pagar», «cobrar» o un monto en `gratis`; `don` siempre con «si no puedes, no se cobra»); `avisoFeNeutro`
(plantillas de consejería, oración y recuperación sin `{negocio}` ni `{servicio}`); `semilla`.

---

## 4. Bloques

### 4ia · Iglesias: «Horarios y ayuda», servicios (gratis · donativo · total), funerarias y licencias (panel + admin + datos) — Sonnet/medium; migración Opus
**Datos:** migración 0091. Semilla `infra/pruebas/semilla/0027_iglesias.sql` (`is_test`, nunca en producción) generada por `scripts/semilla/extraer-fe.cjs`
desde `TLFe.B` (19; `cul` → `worship_times`, tags → `fe_settings`), `TLFeL.SVC` (`fe`, `dur`, `dias` + `start` → `class_groups` de las charlas y del
catecismo), `FREE` (L25–31), `FE0` (L136), la demo del panel (Padre Luis Herrera) y `demo-fe` (L1245–1305).
**Panel (Lo que vendes):**
- **Servicios** (`Servicios.tsx` con el rubro `fe`): por servicio nombre ES/EN, descripción, foto, **forma** (`gratis` «Ver detalles» · `don` «Donativo
  sugerido · si no puedes, no se cobra» · `tot` «Precio total por escrito»), `dur` («Con cita · 1 hora»), incluye, va aparte; catecismo como `curso` con su
  grupo (fecha de inicio, cupo) sin matrícula. Free = 5 visibles.
- **Tu herramienta «Horarios y ayuda»** (§5), con sus variantes «La ayuda de hoy» (despensa) y «Precios y repatriación» (funeraria).
- **Tu página › Licencias:** funeraria y representante acreditado (DOJ); 501(c)(3) opcional.
**Servidor:** `lib/fe.ts` (`fePanel`, `guardarHorarios`, `guardarAyuda`, `guardarFuneraria`, `recalcularFiltrosFe`, `kindFe`, `proximoServicio` (de
`nextCul` L34) en el servidor), `limpiarFe` en `lib/servicios.ts`, `app/panel/acciones-fe.ts`. «Se acabó por hoy» se apaga solo a medianoche de la ciudad.
**Super Admin (ADM-NEG 360 › Lo que vende):** «Horarios y ayuda» en solo lectura (`summary` L315–317: «Dom 10 AM · Mié 7 PM · español e inglés · despensa ·
jóvenes»); forzar el tipo, ocultar servicio con motivo, pausar módulos; Catálogo › Licencias; Catálogo › Filtros. Auditoría de cada cambio.
**Guardianes:** `ayudaGratisIglesia`; `fe` coherente con el precio (`gratis` = 0; `don` y `tot` > 0; `tot` solo en `fun`); al menos un horario en `misa` y
`culto` (onboarding `min: 1`, L268); ES/EN en todo texto nuevo.

### 4ib · Bienes Raíces: «Propiedades y visitas», propiedades con lo de mudarse completo, préstamos y servicios, licencias y vivienda justa — **Opus/high** (vivienda justa, dirección)
**Datos:** migración 0092; semilla `0028_inmuebles.sql` por `extraer-inmueble.cjs` desde `TLInmueble.B` (17), `TLInmuebleL.SVC` (renta y depósito del texto
→ columnas, **revisados a mano** en el script; `dias` → patrón de visita), `INM0` (L138), la demo del panel (Yesenia Batista) y `demo-inm` (L1306–1365).
**Panel:**
- **Propiedades** (hueco #1): tipo, dirección con mapa y «mostrar solo la zona», recámaras, baños, pies², renta + depósito (+ cuota de solicitud si la hay)
  con **«Para mudarte: $X»** calculado en vivo, o precio + enganche → cuota estimada; incluye; lo que piden (papeles, sin seguro social); desde cuándo;
  contrato; mascotas; fotos (cola Medios); horas de visita (patrón semanal). Estado Disponible / Rentado / Vendido / Oculto (L528). Free = 5 visibles.
- **Tu herramienta «Propiedades y visitas»** con sus variantes por tipo (§5). El filtro de vivienda justa corre al guardar y dice qué frase no puede ir.
- **Tu página › Licencias:** corredor de PA, NMLS, avaluador, inspector (el onboarding ya pregunta la de agente, L286).
**Servidor:** `lib/inmuebles.ts` (`inmPanel`, `guardarPropiedad` (calcula `move_in_cents` y `est_payment_cents`), `guardarHerramientaInm`, `horasVisita`,
`recalcularFiltrosInm`, `kindInm`), `lib/vivienda-justa.ts` (`revisarTexto(es, en)` con la lista; único lugar que la tiene), `app/panel/acciones-inm.ts`.
**Super Admin:** «Propiedades y visitas» en solo lectura (`summary` L310–318: «6 disponibles · sin seguro social»); ocultar una propiedad con motivo;
revisar `senior_62`; Licencias; la lista de frases de vivienda justa en Catálogo (solo admin, con auditoría).
**Guardianes:** `viviendaJusta`, `direccionAlConfirmar`, `cuotaEstimada`, `sinDatosDeCredito` (cada uno probado al revés: un filtro `familia`, la frase «no
niños», un `addr_line` de cuarto en la consulta pública → falla).

### 4ic · Venta de Autos: «Inventario del lote», carro con total en la puerta, financiamiento por escrito y licencias (panel + admin + datos) — Sonnet/medium; precio en la puerta Opus
**Datos:** migración 0093; semilla `0029_autos.sql` por `extraer-dealer.cjs` desde `TLDealer.B` (17), `TLDealerL.SVC` (`car()` → `vehicle_listings` con VIN de
prueba válidos), `FREE` (L49–54), `DL0` (L137), la demo del panel (Juan Polanco) y `demo-dealer` (L1366–1430).
**Panel:**
- **Inventario** (hueco #2): VIN (valida y, si el dealer quiere, llena año, marca y modelo desde los datos que escribe — sin servicio externo, §6 #11),
  año, marca, modelo, versión, carrocería, millaje, transmisión, combustible, tracción, título, historial (sí / no y de quién), inspección de PA, garantía,
  «no va por la calle», CDL, precio, fotos («Tómale foto al precio del parabrisas» como ayuda de captura, L302). **«En la puerta: $X»** en vivo con el
  desglose. Estado En el lote / Apartado en persona / Vendido / Oculto (L441). Free = 5 visibles.
- **Tu herramienta «Inventario del lote»** (§5): cada toque se guarda, deja `AuditEntry` y recalcula los totales de todos los carros en la misma transacción.
- **Tu página › Licencias:** dealer de PA, vendedor, venta a plazos, NMLS.
**Servidor:** `lib/autos.ts` (`autosPanel`, `guardarCarro` (`otd_cents`), `guardarHerramientaAutos`, `pagoEjemplo(otd, enganche, apr, meses)`, `totalBhph`,
`recalcularFiltrosAutos`, `kindAutos`, `vinValido`), `app/panel/acciones-autos.ts`. Cambiar el impuesto en `tax_rules` o el cargo recalcula por lotes,
por cursor, sin bloquear.
**Super Admin:** «Inventario del lote» en solo lectura (`summary` L321: «36 en el lote · 2 vendidos · ITIN desde $1,500 · garantía 3 meses · cargo del dealer
$399»); tope del cargo del dealer en Configuración; ocultar un carro con motivo; Licencias.
**Guardianes:** `totalEnLaPuerta`, `vinValido`, `cuotaEstimada`; un carro `salvage` dice siempre «Título salvage: no se maneja en la calle hasta pasar la
inspección de PA» (faq L55).

### 4id · Fichas de las tres (cliente) y páginas de categoría — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` de NEG-FE, NEG-INMUEBLE y NEG-DEALER, pestaña por tipo (Iglesias «Misas y sacramentos» / «Cultos y grupos» /
«Ayuda» / «Servicios» / «Productos», kind L105; Bienes Raíces «Propiedades» / «Cuartos» / «En venta» / «Préstamos» / «Servicios» / «Locales» / «Bodegas» /
«Ayuda», L91; Autos «En el lote» / «En la tienda» / «Subasta» / «Carros» / «Servicios», L107), hoja, barra y riel; página de categoría.
- **Tarjeta de arriba:** Iglesias «¿HAY QUE INSCRIBIRSE? · No: llegas al servicio · Nadie te pide nada en la puerta.», despensa «¿PIDEN PAPELES?»,
  funeraria «¿ME DAN EL PRECIO ANTES?» (L140–142); Bienes Raíces «¿PIDEN SEGURO SOCIAL?», venta «¿CUÁNTO NECESITO? · Enganche + cierre», préstamos «¿ME
  GARANTIZAN LA APROBACIÓN? · No, nadie puede» (L126–129); Autos «¿CUÁNTO PAGO EN TOTAL? · Precio + 6 % + placas + cargo» (L146–148).
- **Tarjeta de Hoy** por tipo con datos reales: Iglesias PRÓXIMA MISA · IDIOMA · AYUDA GRATIS (de `worship_times`), despensa HOY · PAPELES · COSTO, funeraria
  ATIENDE · PRECIO · REPATRIACIÓN (L122–126); Bienes Raíces PARA MUDARTE · REQUISITOS · DISPONIBLES, cuarto AL MES · INCLUYE · LIBRE, venta PRECIO · CUOTA
  ESTIMADA · ITIN, préstamos PRECALIFICACIÓN · ENGANCHE · LICENCIA (solo con NMLS verificada) (L108–115); Autos EN LA PUERTA · CON ITIN · GARANTÍA,
  compre aquí ENGANCHE · PAGO · CRÉDITO, subasta PRÓXIMA SUBASTA · TARIFA · ABIERTA (L124–135).
- **Lista:** Iglesias con `metaOf` (fe L98–102) y «Gratis»; propiedades «$1,050/mes · PARA MUDARTE $2,100 · VER ES GRATIS» con recámaras y baños; carros
  «$11,900 · EN LA PUERTA $13,163 · 88,400 MILLAS · TÍTULO LIMPIO»; botón «Ver detalles» / «Pedir fecha» / «Inscribirme» / «Pedir visita» / «Prueba de
  manejo» / «Pedir precalificación» / «Pedir oferta» / «Pedir cita» (`btnOf`). Notas (máx. 4; fe L137–139, inm L122–125, dealer L142–145).
- **Hoja:** propiedad con fotos, «Para mudarte: renta + depósito = total», lo que incluye, lo que piden, mapa o zona, pie de igualdad de oportunidad; carro con
  fotos, desglose en la puerta (L152), millaje, título, historial, garantía, pago de ejemplo con tasa, meses y enganche; servicio de Iglesias con su texto
  (L145–148). Funeraria «Pedir información» = contacto (llamar o WhatsApp), con «Sin presión».
- **Variantes:** «VERIFICADAS POR VISITA O CITA» / «POR PRUEBA DE MANEJO O CITA» / «RESEÑAS DE VECINOS QUE VAN · AQUÍ NO SE COBRA NI SE RESERVA» (inm L99,
  dealer L115, fe L114); Free «Ve a misa» / «Ve al servicio» / «Llama» (fe L150, inm L135, dealer L154); sin local (capellanía «va a hospitales hasta 15 mi»
  L152; cuartos «LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA» L137; compra de carros «VA A DONDE ESTÁ EL CARRO» L156); 24 horas (`fix24`).
- **Página de categoría:** derivados de §2; tarjeta con `eta` y `fee`; stats «EN ESPAÑOL» / «SIN SEGURO SOCIAL» / «CON ITIN».
**Servidor:** `lib/fe-publico.ts`, `lib/inmuebles-publico.ts`, `lib/autos-publico.ts` (ficha, FAQ por tipo (fe L44–62, inm L38–53, dealer L39–63; la de Tu
página gana), tipo, meta), reusando `ficha.ts`. Nada de solicitantes en lo público.

### 4ie · Pedir visita, prueba de manejo y fecha: solicitar, confirmar, otra hora, vence, pasó, cancelar + Panel «Visitas» — **Opus/high** (datos personales, dirección)
**Pantallas:** la solicitud del motor (`APP-NEG-EDU-INSCRIPCION` con `visit`: 2 pasos, sin «Para mi hijo», flow L45) → estado (`APP-NEG-EDU-ESTADO`), Mi
cuenta › Citas y reservas, Panel › Hoy / **Visitas** (hueco #3) / detalle; Iglesias por el motor de inscripciones (hueco #4).
- **Solicitud (Bienes Raíces y Autos):** 1 **Día y hora** («Día de la visita» / «Día de la prueba», VOCS L18–19; las horas llenas no se eligen; prueba en casa
  con dirección si el dealer la ofrece) → 2 **Revisa y envía** (PROPIEDAD o CARRO · DÍA · TOTAL = «Para mudarte» o «En la puerta»; CÓMO SE PAGA «Hoy $0 ·
  Ver es gratis / La prueba de manejo es gratis» y «Si la rentas o compras: …» (flow L33); BUENO SABER (la línea fija, lo que piden, «Trae tu licencia de
  conducir» para Autos con «Sí, tengo licencia vigente»); nota 0/200 con el aviso de números; carro a cambio opcional; Avisos por SMS; «Enviar solicitud»).
  Precalificación y oferta en efectivo: solo día y hora para que llamen, sin datos de dinero.
- **Iglesias:** «Pedir fecha» (fecha deseada + franja, o la charla con fecha), «Inscribirme» al catecismo (grupo, «para mi hijo» con datos cifrados por
  `ninos-privado.ts`), cita de consejería o capellanía (franja; nota cifrada). Todo $0 (§3).
- **Servidor:** `lib/visitas-inm-comun.ts` + `lib/visitas-inm.ts` (`visitas.ts` ya es el Booking de Auto y Hogar): `pedirVisita(userId, f)` (teléfono
  verificado; una viva por persona y propiedad o carro; techo Free; hora abierta; `client_key`; candado `ver:{grupo}`; copia del total; nota filtrada; número
  P-8101…), `responderVisita(negocio, num, paso)` sobre el patrón de `responderInsc`, `decidirOtraHora`, `cancelarVisita(por, num, motivo)`, `marcarVisita(negocio,
  num, 'paso' | 'no_vino')`, `retirarAnuncio` (se rentó o se vendió → cancela las vivas sin culpa), barrido `barrerVisitas` (vence, «Pasó» a las 24 h, abre la
  reseña, regenera horas, purga notas) en `lib/barrido.ts`. Iglesias: `rubro 'fe'` en `inscripciones.ts` sin ruta de dinero (guardián).
**Estados** (`citaVals` L66–71 con `visit`): PENDIENTE («Esperando a la agencia / al dealer» · «Hoy no pagas nada.») → CONFIRMADA («Hoy 5 PM · 312 Alter
St» · «Llega 5 minutos antes. Ver es gratis.» / «Trae tu licencia de conducir.») → PASÓ (estrellas → reseña) | TE PROPONEN UN CAMBIO | NO PUDO («No hay
visita a esa hora») | SIN RESPUESTA | CANCELADA («Ya se rentó» / «Ya se vendió» / «La cancelaste tú»). Pasos: Enviada · Confirmada · Pasó. Acciones: Cómo
llegar · Calendario · Mensaje · Cancelar; Ayuda (pasó).
**Panel (Hoy · Visitas · detalle):** Esperan tu respuesta (Confirmar / Otra hora / No se puede, con quién, qué propiedad o carro, a qué hora, carro a cambio;
vence a las 4 h); Hoy (Pasó / No vino); por propiedad o carro sus visitas; Iglesias en `Inscripciones.tsx` con el vocabulario `fe` («Tu lugar», «Fecha»).
El detalle muestra la dirección del cliente (prueba en casa) solo confirmada, con auditoría de cada vista.
**Avisos:** `vis_ok`, `vis_alt`, `vis_no`, `vis_exp`, `vis_cx`, `vis_vendido` (SMS), `vis_recordatorio` (2 h antes, SMS), `vis_resena`; al negocio `biz_vis` (SMS),
`biz_vis_cx`. Iglesias reusa `insc_*` con textos `fe`; consejería y capellanía neutros.
**Super Admin:** Transacciones › **Visitas** (`TabTx 'vis'`: rubro inmueble · autos, línea de tiempo, copia del total); Iglesias en Transacciones › Inscripciones
con rubro `fe`; Colas › «Plantones» (3 «No llegaron» en 30 días → revisión).
**Guardianes:** los de §3 + punta a punta: dos personas por la última hora → una pasa; otra hora aceptada y rechazada; vence a las 4 h; se rentó con 3 visitas
vivas → 3 canceladas sin culpa y avisadas; cuarto: la dirección no sale hasta confirmar; prueba en casa: el dealer no ve la dirección antes; nota con un SSN →
guardada tapada; Iglesias: catecismo para mi hijo con datos cifrados y borrados a los 30 días; ningún `payment` en todo el flujo.

### 4if · Reseñas y Ayuda (iglesia, visita, dealer) — Sonnet/medium; Ayuda de estafa Opus
- **Reseña** (`APP-NEG-RESENA`, `TLEduRev`): verificada = visita `done` («Pasó la visita» / «Pasó la prueba») o inscripción `fe` `done` (§6 #13). Preguntas
  (`Q` L19–21): Iglesias ¿LA AYUDA FUE GRATIS? · ¿HABÍA SERVICIO EN ESPAÑOL? · ¿TE AYUDARON CON LO QUE NECESITABAS? · ¿EMPEZÓ A LA HORA? · ¿TE SENTISTE
  BIENVENIDO?; Bienes Raíces ¿LO QUE PIDEN PARA MUDARTE ERA LO QUE VISTE? · ¿VER LA PROPIEDAD FUE GRATIS? · ¿ERA COMO EN LAS FOTOS? · ¿LLEGARON A LA HORA? · ¿TE
  DIJERON CLARO LO QUE PIDEN?; Autos ¿EL PRECIO EN LA PUERTA FUE EL QUE VISTE? · ¿TE ENSEÑARON EL TÍTULO Y EL HISTORIAL? · ¿EL CARRO ERA COMO EN LAS FOTOS? · ¿TE
  ATENDIERON A LA HORA? · ¿TE DEJARON PENSARLO SIN PRESIÓN?. **LO QUE IMPORTA** con los rótulos del tipo (fe L155: EL PRECIO NO CAMBIÓ · TE EXPLICAN CADA PASO ·
  CON RESPETO; inm L139: LA PROPIEDAD COMO EN LAS FOTOS · ARREGLAN A TIEMPO / SIN SORPRESAS; dealer L158: EL TOTAL EN LA PUERTA FUE EL QUE DIJERON · EL CARRO
  COMO LO DESCRIBIERON · EXPLICAN EL FINANCIAMIENTO) y «De N visitas y citas por To'Latino en los últimos 12 meses.». Iglesias: «Cuenta cómo te recibieron y si
  te ayudaron.» (rev L38); sin fotos de personas en NEG-FE.
- **Ayuda** (`helpForm` / `helpStatus`; entradas: pasó, o reseña ≤ 2 ★): MOTIVO (RSNS L27–29) + ¿Qué pasó? ≥ 15 + Fotos obligatorias en `cobro`, `ver`, `mudar`,
  `precio` («Del recibo, el contrato o lo publicado.») + ¿Qué quieres? (SOLS L34–36 + «Solo quiero avisar») → RESPONDE EN 24 H → ACEPTÓ · PROPONE OTRA COSA ·
  NO ACEPTÓ → «Pedir revisión a To'Latino» (con la copia del total) → EN REVISIÓN 48 h → LISTO. **«Me cobraron por ver»** y **«Pidieron más para mudarme»**
  van directo a To'Latino con prioridad (cola «Posible estafa», el anuncio queda en pausa mientras se revisa); **«Me pidieron dinero por la ayuda»** (Iglesias)
  también directo. Dinero: como nada se cobró en la app, «Que me devuelvan» lo hace el negocio fuera de la app y el cliente confirma «Me lo devolvieron»; si no,
  To'Latino decide sanciones (`lib/sanciones.ts`), nunca un reembolso que no pasó por la app.
- **Servidor:** rubros `fe · inm · dealer` en `ayuda-cita.ts` / `ayuda-motivos.ts` (`MOTIVOS`, `CON_FOTO` = cobro · ver · mudar · precio; `NUM` acepta `P-`),
  `resenas.ts` (`rubroRes`, `limpiarRespuestas`, hechos: «Se rentó antes de la visita», «No llegaron»); `escalarVencidas` ya corre en el barrido.
- **Guardianes:** `fotoAyudaPrivada`; punta a punta: «cobraron por ver» con foto → directo a To'Latino → anuncio en pausa → sanción; «el precio en la puerta fue
  más» → el dealer acepta → «Me lo devolvieron»; reseña de Iglesias sin verificar no cuenta como verificada.

### 4ig · Super Admin, avisos, analítica y documentación — Sonnet/medium
- **Super Admin:** Colas › **Posible estafa** (prioridad, SLA corto; pausa del anuncio con motivo y aviso al negocio), «Vivienda justa» (textos frenados y
  `senior_62`), «Plantones», Licencias (corredores, NMLS, dealers, funerarias por vencer y vencidas), Ayudas escaladas; Transacciones › Visitas; Notificaciones
  (todas las plantillas ES/EN); Configuración (tope del cargo del dealer, 4 h de respuesta, 24 h de «Pasó», lista de frases — llega con Configuración, Fase 5);
  Analítica **Iglesias · Bienes Raíces · Autos** (solicitudes por propiedad y por carro, % confirmadas a tiempo, % vencidas, plantones, días hasta rentar o
  vender, propiedades y carros vivos por ciudad, % «el total fue el que vi» en reseñas, ayudas por cada 100 visitas, anuncios pausados por estafa, licencias
  vigentes). Todo con `city_id`, por cursor, sin N+1, sin personas por religión ni datos de crédito.
- **`docs/ayuda/`** (regla 9, ES/EN): cliente `iglesias-horarios-y-ayuda` (gratis, donativo, pedir fecha, catecismo), `rentar-o-comprar` (para mudarte, papeles,
  visitas, cuartos, vivienda justa, estafas), `comprar-un-carro` (en la puerta, financiamiento con tasa y meses, título, garantía, prueba de manejo),
  `resena-y-ayuda-con-tu-visita`, `privacidad-de-tus-datos-en-visitas` (qué no pedimos nunca); negocio `horarios-y-ayuda-negocio`, `propiedades-y-visitas-negocio`
  (con vivienda justa), `inventario-del-lote-negocio` (cargo del dealer y tope), `panel-visitas`, `licencias-inmuebles-y-autos`; Super Admin: actualizar
  `admin-analitica.md`.
- **Triángulo** (regla 8): cada toque de Tu herramienta → ficha, tarjeta y Buscar (`summary` L310–321) → Super Admin lo ve y puede ocultar o pausar.

---

## 5. «Tu herramienta» y página de categoría (lo específico)

- **Iglesias · «Horarios y ayuda»** (HEAD L447 por tipo; `blocksE` L488–507): misa → **MISA EN ESPAÑOL** (chips `MISA` L132: Sáb 6 PM · Dom 8 AM · Dom 12 PM ·
  Mié 7 PM), culto → **TUS CULTOS DE LA SEMANA** (`CULTO` L133) — «toca para prender o apagar», al menos uno; **También en inglés** (L504); **AYUDA GRATIS · SALE
  EN BUSCAR** (`AYUDA` L134: despensa · ropa · transporte · jóvenes · escuela bíblica · bodas y quinceañeras; L505); **Catecismo · inscripciones abiertas** (L506);
  REGLAS · NO SE APAGAN (L488). Despensa «La ayuda de hoy» (L489–493): **Se acabó por hoy**, **Sin papeles ni seguro social**, ropa, **CADA CUÁNTO PUEDE VENIR UNA
  FAMILIA** (`FREQ` L135). Funeraria «Precios y repatriación» (L494–501): **Las 24 horas**, **PRECIO TOTAL · SALE EN TU PÁGINA** por servicio (−/+ $100, $500–30,000),
  **Plan de pagos · hasta 12 pagos** (texto), **REPATRIACIÓN A RD · DÍAS** (3–5 · 5–7 · 7–10), REGLAS. En código: `worship_times` + `fe_settings` + ítems; la hora
  libre fuera de los chips se escribe en el editor de horarios (las del prototipo son atajos).
- **Bienes Raíces · «Propiedades y visitas»** (HEAD L447; L508–533): renta → KPIs DISPONIBLES · EN LA APP · RENTADOS; por propiedad Disponible / Rentado, **Renta al
  mes** (−/+ $25), **Depósito** (−/+ $25; ≤ 2 meses), **HORAS DE VISITA** (al menos una); REQUISITOS **Sin seguro social · aceptas ITIN**, **Aceptas mascotas**;
  REGLAS «Ver la propiedad es gratis» · «Para mudarte: primer mes + depósito». Venta «Casas en venta» (L513–520): KPIs EN VENTA · VENDIDAS · CONSULTAS GRATIS; por casa
  En venta / Vendida, **Precio** (−/+ $1,000), **Cuota estimada al mes**; **Comprador sin comisión**, **Compran con ITIN**; REGLAS. Préstamos «Préstamos y
  requisitos» (L508–512): **Aceptas ITIN**, **ENGANCHE MÍNIMO** 3.5 · 10 · 15 · 20 %, **DÍAS PARA PRECALIFICAR** 1 · 2 · 3 · 5; REGLAS. Cuarto «Cuartos y lo que
  incluye» (L521–523): **LIBRE DESDE**, **Luz, agua e internet**, **Amueblado**. Los montos que toca la herramienta son los de la propiedad (una sola fuente).
- **Autos · «Inventario del lote»** (`blocksD` L429–443): **FINANCIAMIENTO Y GARANTÍA** (Financias con ITIN · Aceptas carros a cambio · Prueba de manejo en casa),
  **Enganche con ITIN desde** (−/+ $100, desde $500), **GARANTÍA EN MOTOR Y TRANSMISIÓN** (Se vende como está · 3 meses · 6 meses), **Cargo del dealer** (−/+ $50,
  hasta el tope de PA), **Carros en el lote**, KPIs EN EL LOTE · VENDIDOS · EN LA APP, por carro En el lote / Vendido («Deja al menos un carro en la app») y **Precio**
  (−/+ $100, «Antes de impuesto, placas y cargos»); compre aquí pague aquí: **Enganche** (−/+ $100), **Pago a la semana** (−/+ $5, desde $25), meses, **Reportas los
  pagos al crédito**; REGLAS (2 candados, L443). Cada cambio recalcula el total en la puerta y el pago de ejemplo de todos los carros (apply L219–223).
- Lo que ya mandaron los clientes **copia** el total: cambiar la herramienta no cambia una visita viva.
- **Páginas de categoría** (ya en código; aquí solo los derivados): Iglesias `que` (`NEED` L35: Misa o culto · Ayuda · Jóvenes · Bodas y bautizos) y `como` (Misa en
  español · Despensa · Transporte · Repatriación); GROUPS ORDENAR · SERVICIO · AYUDA · NEGOCIO; `QUICK5` misaesp · despensa · transporte · jovenes · esp; stats «EN
  ESPAÑOL». Bienes Raíces `que` (Rentar · Comprar casa · Un cuarto · Local) y `como` (Sin seguro social · Con ITIN · Utilidades incluidas · Aceptan mascotas); GROUPS
  ORDENAR · QUÉ · REQUISITOS · INCLUYE · NEGOCIO; `QUICK5` sinssn · itin · utilidades · mascotas · esp; stats «SIN SEGURO SOCIAL». Autos `que` (Carro · Pickup · Van o
  SUV · Con ITIN) y `como` (Financian con ITIN · Sin crédito · Con garantía · Título limpio); GROUPS ORDENAR · FINANCIAMIENTO · EL CARRO · NEGOCIO; `QUICK5` itin ·
  sincredito · garantia · limpio · esp; stats «CON ITIN». Todos derivados, cacheados, nunca editables; la categoría lee `filter_values` con su GIN, nunca
  `property_listings` ni `vehicle_listings` en vivo.

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **Dinero en Iglesias.** El catecismo trae matrícula de $20 (listing L8) que el motor cobraría (`todayOf` L24), pero la línea dice que la ayuda es gratis y
   el admin pone `none` (adm-data L31). Default: **nada se cobra en la app en NEG-FE** (`deposit_cents = 0`); la matrícula se paga en la parroquia y la ficha lo
   dice. Diezmo, ofrenda y donación en línea **no se construyen**; si el fundador los pide, van con su propio plan (recibos, 501(c)(3)) a `LAUNCH-CHECKLIST`.
2. **Número.** El prototipo usa un número al azar (flow L56). Default: **P-8101** («VISITA #» / «PRUEBA DE MANEJO #») con `visit_seq`; Iglesias usa I-41xx.
3. **Plazo para responder una visita.** El prototipo no lo dice. Default: **4 h** dentro del horario del negocio y nunca después de la hora − 1 h; Iglesias 48 h.
4. **«Guardar mi lugar» en misas y cultos.** El listing lo promete (L76) pero la ficha por tipo (kind L148, 28 oct, la más nueva) dice «no hay que inscribirse»
   con «Entendido». Default: **manda kind.js**: los servicios no se reservan; vigilias, retiros y conferencias con RSVP van en Eventos (Fase 6, `worship`).
5. **Depósito y cuota de solicitud.** El candado dice «Sin cargos extra ni cuota de solicitud» (L533). Default: `app_fee_cents` existe y, si es > 0, entra en
   «Para mudarte» y la regla se lee «Nada fuera de lo publicado»; el depósito ≤ 2 meses de renta (ley de PA para el primer año, **a verificar**).
6. **Free.** La ficha Free dice «AQUÍ NO SE PIDE CITA POR LA APP» (inm L99, dealer L115), pero la decisión del 3 nov (MEM 87, 1872) da a Free 10 al mes y la decisión
   A prohíbe categorías «solo con contacto». Default (como Educación #15): Free recibe solicitudes de visita y de fecha, tope 10 al mes; el texto se ajusta.
7. **Funeraria.** «Pedir información» es contacto (L110). Default: se queda así (llamar o WhatsApp) con la lista de precios por escrito y el plan como texto; no
   hay cita ni cobro en la app. `LAUNCH-CHECKLIST`: FTC Funeral Rule (lista general de precios) y licencia de PA con abogado.
8. **«Precalificar no afecta tu crédito».** Es una promesa del prestamista (L124). Default: la nota sale solo si el prestamista marca `soft_pull`; si no, «Precalificar es
   gratis y no te compromete.».
9. **Pago al mes de ejemplo.** El prototipo lo escribe a mano: «48 meses al 14.9 % = $272» (L40) no sale de ninguna cuenta (sobre el total en la puerta da ~$324; sobre el
   precio, ~$289). Default: **lo calcula el servidor** con la tasa, los meses y el enganche del dealer sobre el total en la puerta, y dice «estimado».
10. **Búsqueda por propiedad o por carro** (recámaras, precio, año, millaje; taxonomía L52–57). No hay pantalla en el diseño. Default: los datos y los índices se
    construyen ya; la búsqueda por anuncio queda como hueco anotado en `docs/REVISION.md` para componer con el sistema si el fundador da el OK.
11. **VIN e historial.** Carfax e historiales son de pago. Default: VIN validado por su dígito en el servidor; año, marca y modelo los escribe el dealer; «historial»
    es lo que el dealer declara y de quién. Consultar retiros del fabricante (recalls) con datos públicos queda en `LAUNCH-CHECKLIST`.
12. **Cotización de flota** (`cot` en `ALLOW` de Autos; «Precio de flota para 3 o más», L16). Default: **se queda en Mensajes**; el módulo `cot` no se enciende en
    este grupo.
13. **Reseña verificada en Iglesias.** El prototipo solo verifica a la funeraria (kind L84), que no tiene operación en la app. Default: verificada = fecha o
    catecismo `done` por la app; la funeraria muestra «RESEÑAS DE VECINOS» sin conteo verificado (nada falso).
14. **Taller del dealer y envío de carros** (kind `taller`, `envio`). Default: «Pedir cita» por la visita de $0; el Booking completo de taller (depósito, estimado) es de
    NEG-AUTO: un dealer que lo quiera publica también su taller en Auto.
15. **Cuartos y vivienda compartida.** Default: dirección exacta solo a la visita confirmada; sin campos de preferencia sobre quién vive (la excepción de compañeros de
    cuarto no se lleva a filtros); la persona que renta un cuarto en su casa publica como `solo` (L10).
16. **Licencias y textos legales.** Solo `lic` y `nmls` en los datos (L9, L16, L19). Default: sellos **sin verificar** (corredor y vendedor de PA, NMLS, avaluador,
    inspector, dealer, vendedor de autos, venta a plazos, funeraria, representante del DOJ), revisión manual con el registro público. `LAUNCH-CHECKLIST`: emisores,
    URL de cada registro, tope del cargo del dealer del año, Fair Housing y PHRA, ley de depósitos, desalojo (FAQ L50), Buyers Guide, Regulation Z.
17. **Compre aquí pague aquí.** El panel dice «el contrato dice cuántos días tienes antes de que recojan el carro» (faq L50). Default: To'Latino no guarda el contrato;
    la ficha exige el total pagado y si reportan al crédito; «No me dejan pagar» o recogida sin aviso van a Ayuda `otro` con prioridad.
18. **Ministerio de ayuda al inmigrante y consejería.** Default: textos fijos «No es consejo legal» (L24) y «No es terapia médica. Si piensas hacerte daño, llama o escribe
    al 988.» (L55); la orientación migratoria solo con sello `fe_doj` vigente; sin sello, «Pregunta si tienen un representante acreditado».
19. **Subcategorías.** Iglesias trae en el catálogo «Tienda de artículos religiosos» y «Tradiciones espirituales y botánica» (taxonomía 42–43) que el prototipo no usa en
    `SUBG`. Default: tienda = tipo `tienda` (precios de la caja, sin compra en la app); botánica = solo directorio y contacto, sin afirmaciones de salud.
20. **Subasta y mayoristas** (`mayor`; «Solo dealers con licencia»). Default: solo directorio y contacto; nada se puja ni se aparta en la app.
21. **Casas abiertas y ventas de fin de mes** (demo L1321, L1384). Default: son Eventos (Fase 6); aquí no se construyen.
22. **Errores del prototipo a no copiar:** depósito y cargo leídos del texto (`depOf` L27, `feeOf` L25) → columnas; 6 % y placas $150 fijos (L6, L26) → `tax_rules` y
    `tags_cents`; pago de ejemplo a mano (L40); «Enganche con ITIN» que desaparece al apagar ITIN borrando la nota (L223) → se recalcula; `lot` que no baja de los
    carros en la app (L438) → es solo un número del negocio; horas de visita fijas «Hoy 5 PM» (listing L5) → patrón semanal; «Guardar mi lugar» (L76, #4); número al
    azar (flow L56); `fixOpen` con la hora fija 12:30 (kind L29–32).

## 7. Orden, dependencias y pruebas
4ia → 4ib → 4ic → 4id → 4ie → 4if → 4ig. 4ia reusa el motor de inscripciones (4ea–4ee) y `ninos-privado.ts` (4eb) sin tocar su dinero (regresión de Educación,
Niños y Deporte); 4ib y 4ic son independientes entre sí y 4id depende de los tres; 4ie reusa `class_groups` y el patrón de `responderInsc` y `cancelarGrupo`; 4if
depende de 4ie; 4ig cierra la Fase 4. Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9 dispositivos con la respuesta
simulada igual que la barra del prototipo (ok · rechaza → no · nada → «Pasa el tiempo» → exp · cambio → otra hora; «Pasó», «No vino»; Ayuda «El negocio responde»,
«Pasan 24 h», «To'Latino decide») — en la app eso lo hacen el panel y los barridos (SP L113–119, L154). Pruebas con reloj movido: 4 h de respuesta, hora − 1 h, 24 h del
«Pasó», 48 h de Iglesias, 30 días de la purga, medianoche de «Se acabó por hoy». Pruebas de cálculo: total en la puerta y pago de ejemplo contra una tabla hecha a mano
(incluido compre aquí pague aquí $999 + $95 × 78 = $8,409); impuesto cambiado en `tax_rules` → todos los carros recalculados. Revisión de seguridad (regla 5) de 4ib,
4ic, 4ie y 4if (datos personales, dirección, vivienda justa, precios). Presupuesto de velocidad: ficha con 40 carros o 20 propiedades en una consulta indexada, sin
N+1; categoría solo de `filter_values`. Capturas teléfono + escritorio de cada pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre del grupo (todo marcado antes de decir «Iglesias + Bienes Raíces + Venta de Autos completos» y «Fase 4 completa»)
_Revisada en 4ig (7 nov). Cada marca dice con qué se comprobó; lo que no se pudo comprobar queda sin marcar con el motivo._
- [x] Migraciones 0091–0095 (+ 0096 si las colas la piden) aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI. _(CI corrida 154,
      7930e2e: «Migraciones en una base real (dos veces, la segunda no cambia nada)» y «La semilla … se puede volver a aplicar» en verde, 7 nov.)_
      **Local ✓:** 0096 creada (cola «Vivienda justa», plantillas, casos que faltaban); en una base PostGIS nueva 0001–0096 y después 0091–0096
      dos veces más, sin error, más la semilla dos veces; en el sandbox local `migrar.sh` al día (96). **Sin marcar:** la CI corre el mismo paso
      (`migrar.sh` dos veces) pero este bloque no se subió, así que no lo vi correr. Ojo: correr a mano 0092/0094/0095 sobre datos de bloques
      posteriores falla (estrechan checks que se ampliaron después); `migrar.sh` nunca lo hace (anotado en REVISION).
- [x] Semillas 0027 (Iglesias), 0028 (Bienes Raíces) y 0029 (Autos) solo en pruebas (guardián `semilla`), con dueños de prueba (Padre Luis, Yesenia, Juan).
      Guardián `semilla` limpio; dueños comprobados en SQL (Padre Luis 3 lugares de Iglesias, Yesenia 5 de Bienes Raíces, Juan Autos El Cibao).
- [x] Editor de servicios de Iglesias (gratis · donativo · total), de propiedades (con «Para mudarte» del servidor) y de carros (con «En la puerta» del servidor).
      `fe4ia`, `inm4ib`, `autos4ic` en verde (7 nov, después de 4ig).
- [x] Las tres «Tu herramienta» guardan cada toque, reflejan en ficha, tarjeta y Buscar, y el Super Admin las ve (triángulo).
      `adm4ig` §7: «Se acabó por hoy» (Iglesias), «Sin seguro social · aceptas ITIN» (Bienes Raíces) y «Financias con ITIN» (Autos) cambian la
      ficha, `/c/…` con su filtro y Buscar; Negocios 360° lo ve y pausa Servicios u oculta una propiedad o un carro (y lo deshace).
- [x] Ningún `payment`, retención ni tarjeta en todo el grupo (guardián `sinDineroEnVisitas` probado al revés); donativo nunca cobrado.
      Prueba al revés repetida en 4ig (un `insert into payments` en `visitas-inm-comun.ts` → falla); SQL: 0 pagos en operaciones de las tres y 0
      ítems de Iglesias con depósito; `adm4ig` comprueba una visita nueva con $0 y `pay_mode` none.
- [x] Visitas y pruebas de punta a punta (pide, confirma, otra hora, no se puede, vence, se rentó o vendió, pasó, no vino, cancelar) y «Pedir fecha» y catecismo en
      Iglesias; Free con tope 10. `vis4ie` (pide, confirma, otra hora, vence con reloj movido, se rentó, pasó, no vino, cancelar, catecismo, «Pedir
      fecha») y `adm4ig` §7d–7e («No se puede» con su aviso; Free frenado al llegar al tope, que es 10 en `platform_config`).
- [x] Vivienda justa: filtros y textos probados al revés, pie de igualdad y nota de animales de servicio en toda propiedad; dirección de cuartos solo al confirmar.
      Guardianes `viviendaJusta` y `direccionAlConfirmar` (que en 4ig cazó una lectura de la calle en el caso nuevo de la cola: ahora muestra la
      zona); `inm4ib`, `fic4id`, `vis4ie` y `adm4ig` §1–2.
- [x] Precio en la puerta exacto en cada carro, cargo ≤ tope, pago al mes siempre con tasa, meses y enganche; «estimada» en toda cuota.
      `autos4ic` (tabla a mano, $999 + $95 × 78 = $8,409, tope $477) y guardianes `totalEnLaPuerta`, `cuotaEstimada`, `vinValido`.
- [x] Ningún dato de crédito, SSN, ITIN, ingresos ni licencia de conducir en esquema, código, avisos o logs; notas con números tapadas (guardianes al revés).
      Guardianes `sinDatosDeCredito` y `notaSinNumeros` (probados al revés en 4ib/4ie); 4ig suma `analiticaSinCreencias` (al revés: falla).
- [x] Licencias de las tres en Tu página y en Super Admin › Licencias; ningún sello sin licencia `valid`.
      `inm4ib`/`autos4ic` (Tus licencias), `adm4ig` §3 (por vencer y vencida vuelven a la cola; «Verificada» mueve la revisión); guardián
      `licenciaNoSeFinge`.
- [x] Reseñas verificadas con preguntas y «Lo que importa» por categoría; ayudas con motivos, fotos privadas, «Posible estafa» directo a To'Latino con pausa del anuncio.
      `ayu4if` en verde; `adm4ig` §4 comprueba en SQL que cada ayuda de las tres está en su cola.
- [x] Super Admin: Transacciones › Visitas, Colas (posible estafa, vivienda justa, plantones, ayudas), Licencias, Notificaciones, Configuración, Analítica.
      `vis4ie` (Transacciones › Visitas), `ayu4if` (Posible estafa), `adm4ig` (Vivienda justa, Plantones, Licencias, Notificaciones, Analítica
      con cifras contra SQL). **Configuración** no existe hasta la Fase 5: sus valores quedan anotados en LAUNCH-CHECKLIST.
- [x] Avisos nuevos ES/EN en `notif_templates` y su SMS donde va; consejería, oración y recuperación neutros.
      `adm4ig` §5 (SQL: ninguna plantilla del grupo sin español o inglés; la pantalla las lista); guardián nuevo `avisoConPlantilla` (al revés:
      falla con una clave inventada); `avisoFeNeutro`. El SMS real sale con el proveedor de producción (LAUNCH-CHECKLIST 4ie).
- [x] `docs/ayuda/` completas (ES/EN) para cliente y negocio (§4ig), con vivienda justa, estafas y «qué no pedimos nunca».
      Nuevas: `iglesias-horarios-y-ayuda`, `rentar-o-comprar`, `comprar-un-carro`, `privacidad-de-tus-datos-en-visitas`, `licencias-inmuebles-y-autos`;
      al día: `horarios-y-ayuda`, `propiedades-y-visitas`, `inventario-del-lote`, `panel-visitas`, `vivienda-justa`, `licencia`, `admin-analitica`
      (los nombres «-negocio» del plan son estos archivos que ya existían; no se duplicaron). `resena-y-ayuda-con-tu-visita` es de 4if.
- [ ] Guardianes nuevos de §3 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes; Educación, Niños, Deporte y
      el Booking de Auto y Hogar sin regresión. **Hecho:** los guardianes de §3 están (4ia–4if, probados al revés en su bloque) y 4ig suma
      `colaConVista`, `avisoConPlantilla`, `analiticaSinCreencias` (los tres al revés: fallan), más `pestanasAnalitica` y `sinDineroEnVisitas`
      repetidos al revés; `tsc` y `next build` limpios; regresiones `ins4e`, `ayu4f`, `adm4eg`, `vi4b` en verde. **Sin marcar:** la CI de GitHub no
      corre pruebas de punta a punta ni la matriz de 9 dispositivos (`.github/workflows/ci.yml` corre tipos, build, guardianes, Stripe, SES,
      imagen, migraciones y semilla); las del grupo corren en local en teléfono 390 y escritorio 1360. Anotado en LAUNCH-CHECKLIST.
- [x] Preguntas #1–#22 anotadas en `docs/REVISION.md`; lo diferido en `docs/LAUNCH-CHECKLIST.md` (licencias y registros, Fair Housing y PHRA, depósitos, tope del
      cargo del dealer, Buyers Guide, Regulation Z, Funeral Rule, donaciones en línea, recalls, búsqueda por anuncio).
      REVISION «4ig» con las 22 en una línea cada una; LAUNCH-CHECKLIST tenía todo salvo la búsqueda por anuncio, que se agregó en 4ig.
- [x] `docs/PROGRESS.md` al día (Fase 4 cerrada) y `docs/REVISION.md` con los pasos para que el fundador lo mire en el sandbox.
