# To'Latino — memoria del proyecto

Léelo completo antes de tocar nada. Si algo aquí ya está decidido, no se vuelve
a preguntar ni a explicar al usuario.

## 1. Fuentes de verdad (en este orden)
1. **Estructura → el plan** en `plan/` (memoria obligatoria): `plan/CLAUDE-plan.md`
   (reglas maestras, módulos, dashboards, onboarding, eventos, decisiones cerradas),
   `plan/taxonomia-negocios.md` (17 categorías, subcategorías, familias de filtros;
   ninguna pantalla inventa categorías), `revision-estructural.md`,
   `onboarding-negocios.md`, `admin-dashboard.md` (+ `admin-implementacion.md`: cómo se construye el Super Admin, 12 oct), `apps-delivery-checkin.md`,
   `flujos-transversales.md`, `pantallas-iniciales.md`.
2. **Visual → el sistema de diseño.** Master `To'Latino App Design.dc.html` +
   `To'Latino Barbería (silla).dc.html`. Si difieren, **gana el master**. Nada de
   otras pantallas entra al sistema.
3. **Componentes →** proyecto "To'Latino Design System"
   (d2663232-04f6-45a5-908b-d9e3f8cc8e08), copia local en `_ds/…/_ds_bundle.js`,
   namespace `ToLatinoDesignSystem_d26632`. Fuente editable aquí: `components/`,
   `tokens/`, `assets/`, `readme.md`.

## 2. Decisiones cerradas al unir el plan (no se re-preguntan)
- Dirección visual **cerrada** = sistema actual. La sección "Dirección visual:
  abierta" del plan está anulada.
- Nombre: `To'Latino` (sin espacio). Logo: símbolo circular (`assets/logo-tolatino*.svg`).
- Ciudad piloto y datos de ejemplo: **Hazleton, PA** (comunidad dominicana: comida,
  salones, iglesias, bodegas). Nada de Queens/Corona.
- Fotos: **Pexels, siempre reales** (ver §6).
- Orden: prototipo 100% navegable desde `APP-HOME`, creciendo por el recorrido real.
- Pantallas viejas (Barbería desktop, Hogar, Salud, Trámites, Fiestas, Tatuajes,
  Búsqueda, Desktop, Panel…), variantes ya decididas y respaldos sueltos: **solo referencia**, en `_tmp/archivo/`
  (E4, 22 oct). Todo quedó reconstruido dentro del prototipo.
- Panel del negocio = **v2** (`To'Latino Panel negocio v2.dc.html` + `prototype/dash2-data.js`;
  decisión del usuario, 22 oct). v1 y el panel viejo están en `_tmp/archivo/` (`To'Latino Panel negocio v1.dc.html`,
  `To'Latino Panel (viejo).dc.html`): solo referencia, no se retoman.
- **Decisiones del modelo (usuario, 22 oct · D1–D6):** D1 en V1 no hay venta de boletos en la puerta (el portero solo
  escanea) · D2 semillas SIN RECLAMAR solo desde recomendaciones de vecinos · D3 lo que escribe un vecino se ve en su idioma
  con «Ver traducción» · D4 «Aprobar citas al instante» = opción del profesional, apagada por defecto · D5 cuenta borrada:
  30 días de gracia y después se borra todo (los cobros quedan en Stripe) · D6 mesa pública de El Patio: espera hasta 60 s
  a que lleguen personas; los lugares vacíos los juega La computadora. Detalle técnico en §2b.
- **Triángulo de sincronización (regla del usuario, 25 oct · `plan/CLAUDE-plan.md`):** cada opción del panel del negocio controla
  algo real en su página (ej. panel «Reservaciones» = pestaña «Reservaciones» del listing) y las dos quedan bajo control general del
  Super Admin (ve lo que dejó el dueño, puede pausar/quitar; la página lo respeta y el panel avisa «To'Latino lo pausó»). Cada revisión
  se cierra comprobando las tres puntas: panel → página · admin → panel y página · panel → admin. No se pregunta: se aplica.
- **Revisión profunda para el lanzamiento (regla del usuario, 25 oct · `plan/CLAUDE-plan.md`):** cada revisión es doble y profunda:
  opción por opción, que tenga sentido para un negocio real; se compara con lo que pide el plan y se construye lo que falte para V1;
  se cierra con el triángulo y los casos límite (0, apagado, días cerrados, horario, feriados, Free/Pro, pausa del admin). Lo que no
  entre se dice como pendiente. No se pregunta: se aplica.
- **Asistente de IA «El Compa» (usuario, 22 oct; nombre cambiado de «Compa» a «El Compa» el 23 oct: en el texto «al Compa», «del Compa»; en código y componentes sigue `Compa*`/`TLCompa`; capturas `patrones/20–21` recapturadas con «El Compa» el 23 oct desde `To'Latino Compa (variantes).dc.html`, también renombrado; respaldo `_tmp/c4/`; falta copiarlas al sistema junto con `Compa.prompt.md` = **SINCRONIZAR 30 aplicado** (comprobado 23 oct: capturas idénticas y `CompaFrame.prompt.md` con «TE GUÍA EL COMPA · IA")):** entra en V1 completo: vecinos (Soporte y la «Ayuda» de cada pedido, cita o boleto),
  panel del negocio, copiloto del equipo en el Super Admin y respuestas automáticas del negocio en el chat (**solo Pro**, apagables). Llega
  hasta **preparar acciones que el vecino confirma** (nunca mueve dinero ni cambia la cuenta: eso pasa a una persona con el resumen). Canales:
  app/web, WhatsApp y SMS (en WhatsApp/SMS la acción se confirma con un enlace a la app). Personas del equipo: **lun–vie 9 AM–6 PM**. En el
  prototipo, **IA real (Claude)** con la ayuda (`TLWeb`) y los datos de la sesión. Siempre dice que es IA; «Con una persona» siempre a la vista;
  responde en el idioma del vecino; no da consejo legal, médico ni de inmigración; nunca pide tarjeta, contraseñas, SSN ni estatus. Antes de
  construir: variantes en `To'Latino Compa (variantes).dc.html` (1a conversación · 1b hoja de ayuda sobre el pedido/cita · 1c pasos guiados).
  **Elegidas 1b + 1c (22 oct) → patrones 2as (hoja) y 2at (pasos), master con `patrones/20-pat.jpg` / `21-pat.jpg`, readme (sin componente todavía),
  SINCRONIZAR 28.** Etapa C1 hecha (vecinos): `prototype/compa.js` (`window.TLCompa`: `ask()` = `window.claude.complete` con system de reglas + AYUDA
  (`TLWeb`) + DATOS (operaciones de `usrAll`, pedido, y hasta 3 NEGOCIOS mencionados con horario/dirección/teléfono de `TLContact`), salida JSON
  reply · src · action (cancel | open) · handoff · chips; sin IA = `fallback()` con reglas; `team()` lun–vie 9–6; conversaciones en `tl-compa-v1`).
  Hijo `To'Latino Compa.dc.html` (`mode` page | sheet, `cref`, `live`, `api`, `n`; `window.__tlCompa` para revisar): page = 2at en ruta `APP-COMPA`
  (sobrevive a recargar; entra por Soporte «Pregúntale a Compa»); sheet = 2as encima de la pantalla (móvil: hoja 88 %; desktop: panel 420 a la
  derecha en `compaTop`). El Prototipo intercepta en `nav()` APP-NEG-PEDIDO-AYUDA · CITA-AYUDA · AUTO-AYUDA (con sesión) y abre la hoja con la
  operación; las razones siguen al flujo que ya existía (`fromCompa: 1`). Cancelar = solo solicitud PENDIENTE (`st: 'cx'`, `cxBy: 'compa'`; pedido →
  APP-NEG-PEDIDO-CANCELAR); dinero, cuenta robada, acoso → `TLSop.add` (+ `via: 'compa'`, texto «Desde Compa: …») y la tarjeta «Tu caso pasó a Soporte»;
  si la IA pide handoff sin motivo de dinero/cuenta/seguridad se cambia por el chip «Con una persona». **C2 hecho (22 oct) · panel del negocio.** `compa.js`
  segunda parte: `askOwner` (asistente del panel: GUÍA = `cpaGuide()` con las secciones y PARTS, acción `go` code/sub, dinero/cuenta → `TLSop.add`
  si existe) · `autoReply` (contesta en nombre del negocio con `data()`: ahora, dirección, horario, ítems, cómo pedir, FAQ, nota del dueño; se
  presenta «Soy Compa, el asistente de IA de X» en la primera; nunca confirma, descuentos, precios, dinero ni teléfono → handoff al dueño; `draft`
  = borrador sin presentarse) · `cfg(id)` = DEF + SEED (Sabor encendido) + `over[id].compa` {on, when closed|wait|always, top hor|menu|pedir|faq,
  ch app|wa|sms, note} · `auto(id, ch)` (solo Pro vía `TLTrial.of`, sin `compaOff` del admin; «10 min» = 6 s) · registro `tl-compa-biz-v1` (+ LOG0
  de Sabor) · conversación del dueño `tl-compa-own-v1`. Panel v2: sección `cpa` **DASH-COMPA** (TU NEGOCIO y Más): preguntar sobre el panel
  (hilo, «Ir a …», chips, Soporte), respuestas automáticas (Free → lockB; interruptor, cuándo, temas, canales, reglas fijas, «Lo que Compa debe
  saber», Pruébalo como cliente, «Lo que contestó Compa»); Mensajes: fila «Compa contesta por ti» y en cada conversación «Sugerir respuesta con
  Compa» (Pro, borrador al campo). Mi cuenta · chat con el negocio: si `TLCompa.auto` → contesta Compa (IA real, «COMPA · IA», escribiendo…) y
  queda en el registro del negocio. Super Admin · Negocio · Equipo: COMPA · RESPUESTAS AUTOMÁTICAS (estado, últimas respuestas, «Apagar Compa
  aquí» con motivo → `biz[id].compaOff`, Historial). Respaldos `_tmp/c2/`. **C3 hecho (23 oct) · Super Admin.** Sección `compa` **ADM-COMPA** (grupo OPERAR, permisos: admin todo · sop VEA ·
  city/mod/lectura V · verif/fin no): Resumen (KPI 7 d: conversaciones, % resolvió solo, a una persona con caso, acciones confirmadas; barras por
  motivo dinero · cuenta · seguridad · persona · nosabe · dueño, por nivel y por canal; copiloto `compa.copN`; marcadas; «Lo que Compa no supo») ·
  Conversaciones (`compaAll()` = en vivo `tl-compa-v1` + panel `tl-compa-own-v1` + respuestas automáticas `log()` + 17 de ejemplo CP-5100…; filtros
  dónde/resultado/canal, búsqueda; ficha con hilo, caso en Soporte, «Marcar respuesta incorrecta» con motivo → `compa.flag`, Historial) · Negocios
  (respuestas automáticas por negocio → Negocio · Equipo) · Interruptores (`tl-adm-v1.compa.lv` vec · own · auto · cop y `.ch` app · wa · sms;
  pausar pide motivo; `TLCompa.on(lv, ch)`: Prototipo no abre la hoja, Soporte vuelve a «Escríbenos», panel muestra aviso, `auto()` no contesta;
  reglas fijas). Copiloto en Colas · ticket: «Sugerir respuesta con Compa» (`TLCompa.copilot`: resumen + borrador + siguiente paso, al campo
  Respuesta). `DASHR` del Prototipo ahora incluye COMPA (faltaba desde C2) y `ADMR` ADM-COMPA. **C4 hecho (23 oct) · entrega.** Modelo de datos 1.2: área 12 «Compa · asistente de IA» (CompaConversation use neighbor|owner|auto_reply|copilot · CompaMessage · CompaAction proposed→confirmed|dismissed|expired|failed · CompaHandoff to support|owner · CompaBusinessSettings · CompaReview), 2 estados, almacén `tl-compa-*`, FeatureFlag compa.use.*/compa.channel.*; E3 «Compa · la IA» (fuera). Componentes `components/compa/Compa.jsx` (CompaFrame mode sheet|page + 11 piezas; `confirm`/`composer` como objetos para usar desde plantilla) → puente `prototype/ds-e1.js` (build `_tmp/ds-e1-build.js`, SRC = Compa.jsx) cargado solo en `To'Latino Compa.dc.html`, que ya monta los componentes (respaldo `_tmp/c4/`). Master 2as/2at dicen su componente; readme sin «sin componente todavía». **SINCRONIZAR 29 aplicado (23 oct):** bundle local = el del sistema (con los 12 Compa*); `ds-e1.js` quitado de Compa (respaldo `_tmp/ds-respaldo/`).

## 0. RETOMAR AQUÍ (chat nuevo · guardado el 2 nov, fin del día)
- **Publica tu negocio v2 · 1a «Pasos guiados» (3 nov, elegida por el usuario en `To'Latino Onboarding negocio (variantes).dc.html`).** Reemplaza al v1 (movido a `_tmp/archivo/To'Latino Publica tu negocio v1.dc.html`, solo referencia). DC `To'Latino Publica tu negocio v2.dc.html` (props lang, desk, dw, route, user, api; el Prototipo lo monta en las rutas `ONB-NEG-*`, móvil y desktop). Rutas: A1 entrada (sin sesión: teléfono + código como el vecino; cuenta existente = «Qué bueno verte de nuevo»; nueva = nombre y apellido → `tl-usr-accts-v1` + `tl-onb-usr-v1`, `api.user`; con borrador = «Sigue donde lo dejaste»; publicado = su negocio + Ir a mi panel / Publicar otro con confirmación) · B1 tu negocio (buscador `TLOnbNeg.search`, 7 categorías + Todas con las 17 en lista, hasta 3 subcategorías: 8 comunes + «Otra» = SearchSelect con todas, nombre, nombre repetido → ONB-NEG-RECUPERAR o «Es otro») · C1 lo propio de la categoría · D1 lo que vendes (lista sugerida con «TÍPICO $x–y» de Hazleton, −/+ y precio escrito, «Agregar otro», foto de la lista leída por El Compa: simulada, 2.2 s, uno marcado REVISA) · E1 dónde y cuándo (opciones de la categoría, dirección con sugerencias, renta silla/bahía/escritorio = buscar el negocio, zona 5–30 mi con pueblos; horario típico de la categoría, plantillas y −/+ 30 min por día; «Hoy jueves: abierto…») · F1 tu foto y tu página (Tomar foto = archivo real reducido a 960 px; «Elegir de tus fotos» = las 9 de `TLOnbNeg.PHOTOS`; tu página Pro en vivo; «Con Pro tu página tiene» con sus números y lo que Free no muestra; código de promotor HZL30 = 60 días) · H1 publicada (minutos, Ver como cliente, Compartir, «Lo que sigue en tu panel» = la misma fuerza del perfil del panel, con sus +N %). Rutas viejas (B2–B6, C2–C3, D2–D5, E2, G1–G2, H2) caen en el paso nuevo más cercano; borradores v1 se migran (v: 2). Desktop: pasos 232 · paso · tu página en vivo 372 (≥1200), sin pasos 960–1199, una columna < 960. Datos por categoría: `prototype/onb-neg-flow.js` (`TLOnbFlow`: top, own.qs tipos opt · num · money · chips · one · yn, listas sugeridas por subcategoría, ops, horario, map → mods/amen/tags/cx/tool, sum para el riel). Al publicar se guarda en `tl-onb-neg-v1` (mods, amen, tags, cx, tool, items con desc, days, op/opK, casa, zone, owner…), `TLOnbBiz.sync()` y `TLTrial.startOnb(id, días, código)` (nuevo en pro-trial.js). dash2-onb.js: `tool` → `TLDash2.BIZ['mi-negocio-tl'].tool` (la herramienta de dash2-cat la lee: cover/edad/lista, seguros/sin seguro, licencias en revisión, zona/24 h, EBT/entrega, depósito, apartado/layaway…), `ins` en cero (vistas y contactos 0), dueño = nombre de la cuenta, en TLAll `tags` del registro + campos `cx` (+ `TLMercL.OPTS` / `TLTienda.OPTS`), `amen`, zona si va a domicilio. Panel v2: negocio con `onb` muestra «LO QUE SIGUE · TU PÁGINA AL N %» con todas las tareas. Prototipo: `negOnbApi.user` y `.openBiz`; la tarjeta «Publica tu negocio» y el botón del header dicen «Sigue donde lo dejaste / Seguir con mi negocio» (paso exacto) o «X ya sale en Hazleton / Ir a mi panel» (`pubT`/`pubGo` sobre `t`); Mi cuenta `pubRow` igual (se quitó «PRO GRATIS 6 MESES»). **Pendiente:** la página del cliente de un negocio recién registrado usa la plantilla general (no la de su categoría como las demos); invitación de un local con la silla puesta (ruta con `inv`) sin construir; El Compa no lee la foto de verdad (sin visión en el prototipo); `SUBS` de Venta de Autos trae 5 líneas de reglas de la taxonomía y Mercados «corner store» al revés (se filtran/corrigen en onb-neg-flow.js); falta pasar al master/sistema si se aprueba como patrón.
- **Negocios de prueba (2 nov, pedido del usuario):** un negocio Pro por categoría, «To'Latino Demo · …» (id `demo-{cat}`), con las 12 opciones del panel encendidas (aunque no apliquen), mínimo 20 en servicios/productos, novedades, reseñas, eventos, preguntas, pedidos/citas/solicitudes, mensajes y fotos; staff = lo real (4–10). Uno por turno, en el orden 1 Auto → 17 Venta de Autos, probado en panel, página y Super Admin; se sigue con el próximo solo con el OK. Pro/Free se decide después. Todo vive en `prototype/demo-biz.js` (cargado al final de Prototipo, Panel v2 y Super Admin; idempotente, se vuelve a montar si un script del helmet se recarga) e inyecta en las mismas fuentes de los negocios reales (TLDash2.BIZ, TLStf.BASE, TLASvc.DEF, TLNov.POSTS, TLJobs.J, TLEvt.E y `_E0`, y las de la categoría). **Hecho: 1 Auto (`demo-auto`) · 2 Belleza (`demo-bell`: salón con empleadas + 1 silla en renta, 33 servicios en 11 secciones vía `TLSvc.reg`, 22 productos, 6 en renta, 7 staff; `TLBellL.SVC/SHOP/RV`, `TLBook.CFG/ADD`) · 3 Comida (`demo-food`: clon de Sabor en el panel con `mgroups`, 25 platos en 7 categorías + 6 tienda + 3 renta, Desayuno con horario propio, por libra, agotados y stock; cliente `TLFood.B` con `rv`/`fq`, `TLListing.MENU`, `RSV` + `TLRsv.CFG`) · 4 Hogar (`demo-hogar`: 24 servicios con los 7 tipos visita · fijo · hora · area · pres · emer · plan en 10 secciones, 22 de tienda/renta con depósito, GAL de trabajos, 7 staff con licencias; `TLHogarL.SVC/SHOP/RV/GAL/STAFF`, `TLHogarBook.CFG`) · 5 Noche (`demo-noche`: 17 en «Esta noche» con los tipos lista · cover · mesa · vip · evento · fecha en 4 secciones, `nt` con cover/after/edad/fila/lista, 20 eventos con boletos, mesas y extras, 6 staff; `TLNocheL.SVC/RV/STAFF/PEOPLE0`) · 6 Mercados (`demo-merc`: 26 productos en 5 secciones con los tipos lb · unid · plato, cortes y punto, `was`, EBT, envío y mínimo `TLMercL.OPTS`, 5 staff; `TLMercL.SVC/RV/STAFF/PEOPLE0`) · 7 Fiestas (`demo-fiesta`: 27 servicios en 6 secciones con los tipos pack · hora · unid · fijo · visita · cotiza, cap/dep/zone/busy, 7 staff; `TLFiestaL.SVC/RV/STAFF/PEOPLE0`) · 8 Doctores (`demo-salud`: 21 servicios en 8 secciones con los tipos cons · free · tele · proc · walk, 7 seguros, precio sin seguro, 20 de tienda + 3 en renta, 7 staff con licencia; `TLSaludL.SVC/SHOP/RV/STAFF`)**. **Arreglado (2 nov):** `b.dep` (depósito de Fiestas, número) chocaba con la bandera de Deporte (`b.dep = 1`): todos los salones de Fiestas salían con la pestaña «Membresías», la tarjeta de Hoy de Deporte y en el Super Admin como NEG-DEPORTE. Ahora la bandera se lee `b.dep === 1` (Prototipo pestaña y `DBk`, adm-data `catOf`, dash2-cat, neg-deporte-kind, neg-edu-kind). Montaje = lista `DEMOS` en demo-biz.js (panel · client · miss); las siguientes se agregan ahí. Hallazgos que se dejaron para decidir: con varios módulos de ítems el panel solo cuenta el primero como «con contenido» y todos comparten `B.items`; Menú, Reservaciones, Renta, Pedidos y Cotizaciones no salen en una página de Auto; un taller que también lava muestra solo los aspectos de lavado en Reseñas; la oferta de Novedades sale sin foto si `item` no es un plato. Arreglado: la foto de las tarjetas de la pestaña Eventos de la ficha (`x.ph[0]` con `ph` número, pasaba en todos los negocios). **9 Profesionales hecho (3 nov):** `demo-pro` (oficina con 8 licencias: abogado, acreditado, notario, ata, ptin, caa, cpa, agente; kind `inm`): 23 servicios en 7 secciones con los 6 tipos cons · fijo+gov · hora · pct · walk · cotiza, 20 de tienda + 3 en renta, 8 staff con licencia (+1 invitado); `TLPro.B`, `TLProL.SVC/RV/STAFF`. Fotos de staff reusadas de otros negocios Pro (solo demo). **10 Tiendas hecho (3 nov):** `demo-tienda` (tienda de todo, kind `ropa`): 25 artículos en 7 secciones con los 4 tipos ropa (tallas/números, agotados) · unid · plan (abono 20 % · 4 pagos) · serv, `was` en ofertas, `TLTienda.OPTS` dev 30 · envío $7 · plan, 3 en renta, 8 staff (+1 invitada); `TLTienda.SVC/RV/STATS/STAFF`. Fotos de staff reusadas de otras tiendas (solo demo). **11 Transporte hecho (3 nov):** `demo-trans` (kind `van`, 24/7): 25 viajes en 7 secciones con los 4 tipos asiento (salidas, niño) · priv (hasta N personas) · caja · cotiza, `inc` en cada uno, 20 de tienda + 3 en renta, 7 staff (+1 invitado). Reseñas propias envolviendo `TLRev.forBiz/stats` después de `R._trans` (flag `_demoR`; el RV de neg-trans-listing no se exporta). Fotos de staff reusadas de otros Transporte (solo demo). **12 Educación hecho (3 nov):** `demo-edu` (kind `ingles`): 25 cursos en 7 secciones con los 4 tipos curso (semanas, horas, matrícula, cert, plan, `no`) · mes · hora · clase, 20 de tienda + 3 en renta, 8 staff (3 con certificado, +1 invitado). Reseñas por `b.rv` ([es, en, estrellas, tot, cert, hor]) que lee `TLEduK.revOf`; verificadas = 60 % de `n`. **13 Niños hecho (3 nov):** `demo-ninos` (kind `guard`, `b.edu` + `b.ninos`, edad 0–12): 25 programas en 7 secciones con los tipos semana · mes · curso · hora · clase (guardería con licencia DHS, Pre-K gratis, after school, deportes, arte, campamentos, terapias, familia), 20 de tienda + 3 en renta, 8 staff (4 con credencial, +1 invitada). SVC en `TLEduL.SVC` (+ `TLNinosL.SVC`); reseñas por `b.rv` ([es, en, estrellas, tot, hor]) que lee `TLNinosK.revOf`. **14 Deporte hecho (3 nov):** `demo-deporte` (kind `gym`, `b.edu` + `b.dep = 1`, 24 h): 25 en 7 secciones (membresías, clases, combate, ligas, canchas, alberca, nutrición) con los tipos mes · clase · hora · curso, 20 de tienda + 3 en renta, 8 staff (+1 invitado); SVC en `TLEduL.SVC` (+ `TLDeporteL.SVC`), reseñas por `b.rv` ([es, en, estrellas, tot, hor]). **Arreglado (3 nov):** `neg-deporte-kind.js` `isD` decía `!b.dep !== 1` (siempre verdadero: las reseñas, el horario y la ficha de Deporte se aplicaban a todos los negocios); ahora `b.dep === 1`. **15 Iglesias hecho (3 nov):** `demo-fe` (kind `misa`, `b.edu` + `b.fe`): 25 en 7 secciones (misas y cultos, grupos, sacramentos con donativo `fe: 'don'`, ayuda gratis `fe: 'gratis'`, consejería y oración, funeraria con total `fe: 'tot'` y plan, educación), `cul` con 4 horarios, 20 de tienda + 3 en renta, 8 staff (2 con licencia, +1 invitada); SVC en `TLEduL.SVC` (+ `TLFeL.SVC`), reseñas por `b.rv` ([es, en, estrellas, tot, hor]); verificadas = 0 (Iglesias no aplica el 60 %). **16 Bienes Raíces hecho (3 nov):** `demo-inm` (kind `rent`, `b.edu` + `b.inm`): 26 propiedades y servicios en 7 secciones (en renta, cuartos y amueblados, en venta con `cuota`, hipotecas, comercial, servicios `t: 'tot'`, administración `t: 'gratis'`) con visitas, 20 de tienda + 3 en renta, 8 staff (4 con licencia, +1 invitado); SVC en `TLEduL.SVC` (+ `TLInmuebleL.SVC`), reseñas por `b.rv` ([es, en, estrellas, tot, hor]). Verificadas = 11 (TLInmK). **17 Venta de Autos hecho (3 nov):** `demo-dealer` (kind `lot`, `b.edu` + `b.inm` + `b.dealer`): 25 vehículos y servicios en 7 secciones (usados, SUVs/pickups/vans, nuevos y certificados, trabajo, motos y recreación con precio en la puerta, financiamiento `t: 'gratis'|'tot'`, servicios), 20 de tienda + 3 en renta, 8 staff (3 con licencia, +1 invitado); SVC en `TLEduL.SVC` (+ `TLDealerL.SVC`), reseñas por `b.rv`; verificadas = 11. **Las 17 demos están hechas.** **Revisión demo por demo (3 nov, orden 1 → 17, pedido del usuario):** 1 Auto revisado; panel ↔ página coinciden. **Arreglado (3 nov):** Super Admin · Negocio 360° (`bizX`) inventaba datos (hash) para todo negocio que no fuera Sabor: ahora, si el negocio tiene panel (`TLDash2.BIZ[id]`, `real`), lee del panel el dueño («Daniel Ortiz · en su panel»), el equipo (`mods_`), Servicios (`TLEduL.SVC` / `TLASvc.DEF` / `MENU`), Citas/Pedidos/Reservaciones (`req`), Tienda (`items` cat Tienda) y Operación («SOLICITUDES EN SU PANEL»). Queda inventado: nada en negocios con panel (3 nov: la franja de arriba ya dice «SOLICITUDES EN SU PANEL» = `req` sin pagos y «PAGADO A SU BANCO» = suma de `req` k 'pago'; «Última actividad» = hace 20 min). 2 Belleza y 3 Comida revisados: panel ↔ página ↔ admin coinciden (Belleza 33 servicios · 10 citas; Comida 25 platos · 10 pedidos · 4 reservaciones; Hogar 25 servicios en 10 secciones · 10 citas · 21 novedades · 22 fotos · 20 preguntas del panel; Noche 17 en «Esta noche» · 20 eventos · 21 novedades · 20 reseñas (11 verificadas) · herramienta de la noche en el admin). Pendiente de decidir: nada. **Módulos por categoría (3 nov, decisión del usuario, opción B):** `TLOnbNeg.ALLOW` / `allow(cat)` / `allowed(cat, k)` en onb-neg-data.js = lo que cada categoría puede encender (+ Staff, Eventos, Novedades, Vacantes en todas): Auto svc·citas·cot·shop·renta · Belleza svc·citas·shop (las sillas en renta siguen en Staff) · Comida menu·pedidos·rsv·cot·shop · Hogar svc·citas·cot·shop·renta · Noche svc·rsv (la Barra va dentro de «Esta noche», sin Menú aparte) · Mercados shop·pedidos · Fiestas svc·citas·cot·renta · Doctores svc·citas·shop · Profesionales svc·citas·cot · Tiendas shop·pedidos·svc·citas·renta · Transporte svc·citas·cot·renta · Educación, Niños, Deporte svc·citas·shop · Iglesias, Bienes Raíces svc·citas · Venta de Autos svc·citas·cot. Panel: `B()` filtra `B.mods`, «Disponibles para…» = solo los permitidos, `itemsOf` no cuenta Tienda/Renta si no se permiten. Super Admin: `bizMods` filtra igual; Tienda en Auto/Belleza = ítems que no son servicio ni renta. Página: `modTabs()` en el Prototipo agrega las pestañas Tienda (Comida, Educación, Niños, Deporte) y Renta (Auto, Hogar, Fiestas, Tiendas, Transporte) desde los ítems del panel (cat «Tienda» / «Renta»), con la plantilla de la tienda; Renta = «$ / día», «LIBRE HOY» / «RENTADO HOY» (si el vecino ya lo tiene apartado o recogido), botón «Rentar» → el flujo de renta de Hogar generalizado (`TLHogarPlan.startRent(C, { biz, x: { n, ne, p, dep, ph, id } })`: días 1 · 2 · 3 · semana = 5, día de recoger, «Apartar · $ al recoger», hoy $0, se aparta 48 h; estado Apartada → Recogido → Devuelta / Cancelada, un día más, tarde = un día del depósito; textos neutros si es `x`; depósito = el «depósito de $N» de la descripción o 2 × precio redondeado, mínimo $25; 24 h sin «12 AM»). Las rentas (`s.hpres` mode rent, también las de Hogar) llegan al panel del negocio por `dashLive` como solicitud `ped` «Renta · …» (apartada = ok, recogida = in, devuelta = done, cancelada = no). Pedidos, Citas y Cotizaciones son botones, no pestañas. **Arreglado (3 nov):** Super Admin · Negocio · Operación, para negocios con panel, lista las solicitudes del panel (`X.preq` = `req`): cifras solicitudes · pendientes · hoy · terminadas, chips por tipo (citas, pedidos, reservaciones, cotizaciones, boletos, pagos), filas con estado y monto, y debajo vistas, contactos y cómo lo encuentran (`ins`); la pestaña cuenta `reqN` (sin pagos). **Arreglado (3 nov):** Super Admin · Lo que vende · Tienda en Mercados y Tiendas (tx `ped`) decía «sin contenido · la pestaña no sale»; ahora cuenta los productos (`TLMercL.SVC` / `TLTienda.SVC` / `MENU`): Mercado 26, Tienda 25. 6 Mercados revisado (Rosa Huamán · 20 solicitudes · $4,553.10 · 12 pedidos · herramienta pickup/envío/EBT). 7 Fiestas (Andrea Fermín · 27 servicios · 10 citas · 2 fechas ocupadas, depósito $500), 8 Doctores (19 servicios — no 21 —, 12 citas, 7 seguros) y 9 Profesionales (8 licencias verificadas) revisados en el Super Admin: coinciden. **10–17 revisados en el Super Admin (3 nov):** dueño, solicitudes, pagado y módulos coinciden con el panel. Conteos reales (no los de arriba): Servicios Transporte 23 · Educación 23 · Niños 21 · Deporte 23 · Iglesias 25 · Bienes Raíces 23 · Venta de Autos 24; Tienda 25 artículos (3 servicios). **Arreglado (3 nov):** «Lo que vende · Módulos» de un negocio con panel ahora lista los módulos que tiene encendidos en su panel (antes solo los de la categoría: faltaban Tienda, Renta, Cotizaciones…; `bizMods` + `cot`/`renta` en `MODL`); Servicios en Tiendas/Mercados = ítems con `unit 'fijo'`; dinero del admin con comas (`adm-data` `money`: $12,370.00); la herramienta de Educación/Niños («grupos abiertos») y Venta de Autos («en el lote») ya no cuentan Tienda/Renta (ni Financiamiento/Servicios en el lote). **Pro / Free (3 nov, decisión del usuario: «lo que tenemos es Pro; Free es lo básico, mínimo, para empujar a Pro»).** Respuestas: Free sí toma pedidos o citas en línea, hasta 10 al mes (como antes; `TLFreeCap`), pago en el local · 3 fotos (`TLOnbNeg.FREE_PHOTOS`) · 5 ítems (`FREE_ITEMS`) · iglesias y despensas pagan Pro como todos · Pro solo mensual $14.99 (se quitó «Anual»; `cycRows` solo Mensual, sin «Cambiar a anual»; los que ya tenían anual pueden pasar a mensual) · se revisaron las 17 de una vez. Reglas: `TLOnbNeg.mainMod(cat)` (Comida menu · Tiendas/Mercados shop · resto svc) y `freeOk(cat, k)` = módulo principal + pedidos + citas; todo lo demás es Pro. Página Free (Prototipo `freeCut`): una sola página sin la persona detrás (OwnerCard), sin la oferta de Novedades, sin «En el local», sin trabajos hechos ni reservar mesa, hasta 5 ítems; `TLPhotos.biz` da 3 fotos y `TLPhotos.rev` nada para Free (el chip dice «3 FOTOS» y la galería tiene 3); `openNow` (portada) solo Pro. Panel Free: «EN TU PÁGINA 5 de N», módulo principal «5 de N … los demás salen con Pro», los demás en «GUARDADO · SALE EN TU PÁGINA CON PRO» y al abrirlos un candado; Fotos avisa «muestra las primeras 3»; candados con su número (`freeNum`: reseñas sin respuesta, la búsqueda top, seguidores, eventos y vacantes guardados, equipo, mensajes). Super Admin: módulos Free = «Solo en Pro» salvo `freeOk`; el principal dice «5 de N en su página (Free)». `pro-trial` `inv`: la persona detrás y «En el local» pasan a «se duerme». Para ver una demo en Free: Panel · barra del prototipo · prueba «Terminó».
**Pendientes generales (3 nov):** Panel · Lo que vendes: cada módulo de ítems cuenta solo lo suyo (`itemsOf(B, k)`: Renta = cat «Renta», Tienda = cat «Tienda» o, en Tiendas/Mercados, todo menos renta y servicios `unit 'fijo'`; Servicios/Menú = lo demás solo en el principal `itemMod`, que ahora es por categoría: Comida → menu, Tiendas/Mercados → shop, resto → svc; Auto/Belleza cuentan sus servicios de `TLASvc`/`TLSvc` con `extSvcN`); el subpanel de cada módulo lista solo sus ítems; «EN TU PÁGINA» suma todo con el desglose. Menú en una demo que no es de Comida = «Activado, sin contenido». Novedades · oferta/hoy: si `p.item` no es un plato de `TLMenu`, busca el ítem en el panel (`TLSvc`, `TLASvc`, `B.items`) por id o palabra y toma su foto; el precio de la oferta (`now`/`was`) gana. «24 FOTOS» con 22 del negocio = 22 + 2 fotos de reseñas (`TLPhotos.count`): es correcto. Fotos que no cargaban (probadas las 520 de las demos): 1571585 → 14615063 (Plancha, también Belleza Latina Supply) y 29615996 → Carolina Reyes 3763188 · Danny Cruz 1681010. Pendiente de decidir: la página no muestra pestañas de módulos que el panel dice «EN TU PÁGINA» cuando no son de la categoría (p. ej. Reservaciones, Renta, Cotizaciones en Auto).
Arreglado (3 nov): el ★ y el n.º de reseñas de las 17 demos salen del promedio real de las reseñas de su panel (`stars()` en demo-biz.js, después de `o.client()`; escribe `r`/`n` en toda lista `TL*.B` del cliente). **Arreglado (3 nov):** los 13 `neg-{cat}-kind.js` se rendían a los 9 s (`boot` 150 × 60 ms); con la carga lenta ninguno envolvía TLRev/hoursPro (reseñas, horario y ficha por tipo se perdían). Ahora `boot` 600 × 100 ms y además se registran en `TLReg` para volver a envolver si un script del helmet se recarga. (Hogar: las reseñas de ejemplo salen en inglés con «Ver traducción» por la regla D3 del autor; es esperado.) (En la ficha, las fotos de los platos del Menú no son las del panel: el menú genérico no lee fotos por plato.)
- **Estado al 2 nov (cierre):** lista de pendientes del 2 nov TERMINADA (onboarding del vecino 2au aprobado y en el sistema; SINCRONIZAR 32 + 32b aplicados; Tabs `title` en Comunidad; `SearchSelect` en marcas; datos de Tiendas/Transporte; cambiar artista de una fecha). El chat nuevo viene con otro tema: preguntar qué sigue.
- **Comunidad · versión simple (28 oct, pedido del usuario: «demasiada información, confuso»).** `To'Latino Comunidad.dc.html` tiene el tweak `estilo` simple (por defecto) | completo. Simple: encabezado con título + botón de mensajes + pastilla de rango «6 · Teniente» (abre APP-GAM-RANGO; la burbuja del avatar se fue, ya está arriba), pestañas sin ícono; publicar = avatar + «¿Qué pasa en tu cuadra?» + botón «+» (el tipo se elige en APP-COM-NUEVO, fuera la rejilla de 4), fuera la franja morada del rango y la fila «14 PUBLICACIONES · HAZLETON / Más votados», una sola fila de chips con un botón de filtro (ícono `filter`, morado si hay algo activo) que abre la hoja `filtros` (distancia + orden). Se probó un feed de tarjetas separadas («aire») y el usuario lo rechazó (28 oct): no se vuelve a proponer; respaldo en `_tmp/com-simple/Comunidad-aire.dc.html`. Completo = lo de antes. Respaldo `_tmp/com-simple/` (`Comunidad-v1` = simple sin aire).
- **Comunidad · el muro, variantes (28 oct, pedido del usuario: «de un post a otro todo se ve muy junto»).** `To'Latino Comunidad (variantes).dc.html` (canvas, turno 1): HOY = referencia con PostCard tal cual · **1a Hilo** (caras en columna de 40, texto en una columna, encabezado nombre+rango / barrio con la hora a la derecha, la mejor respuesta cuelga del hilo con línea, votos sin caja) · **1b Titular** (autor en una línea de 28, primera frase ≤120 letras en Sora 700 17 y el resto en Manrope .72, fotos de borde a borde, negocio y mejor respuesta sobre Paper) · **1c Resumen** (votos en columna a la izquierda, texto 3 líneas, miniatura, extras en una línea, «Votar» abre la encuesta). Las tres: sin tarjetas separadas, nada se pierde, fuera del muro «PREGUNTÓ», «RECOMIENDA · PARA…» y «41 VECINOS TAMBIÉN…» (= votos). **29 oct: el usuario no quiso ninguna de las tres → se queda la publicación de hoy (PostCard 2ab) y se mejora por partes, paso a paso.** Paso 1 = encabezado (quién publica), turno 2 arriba en el mismo archivo, con las mismas 4 publicaciones (oficial fijada, Ramón rango 10, Luz María rango 5, Gaby rango 2 resuelta): HOY · **2a Sobria** (solo Manrope, sin color: nombre 700 15, rango 600 13 .75 · barrio .6, hora a la derecha junto al menú, «Resuelta» verde en la línea gris) · **2b Sello** (número del rango en Sora sobre tinte Action como «6 · Teniente» arriba, rango Manrope 700 12.5; barrio y hora en una línea mono .6; RESUELTA como Tag) · **2c Honor** (nombre en Sora 700 15; escudo `shield` + rango dorado #8A5A00 para 9–10 y gris para 4–8; hora a la derecha). Las tres: dos líneas, fuera «PUBLICÓ / PREGUNTÓ / RECOMIENDA», barrio en gris, menú `more` en vez de `chevronDown`. **29 oct: eligió 2c (Honor).** Paso 2 = lo que va dentro, turno 3 arriba, ya con 2c, 5 publicaciones (oficial fijada con mejor respuesta, Ramón, Luz María con negocio, Gaby resuelta con 911, encuesta oficial con voto propio `poll3`): HOY con 2c · **3a Limpia** (tarjeta blanca borde 1 px .1 para todo, solo Manrope, verde solo en «Mejor respuesta», datos «Panadería · ★ 4.9 · 0.7 mi», se toca la fila con flecha, 911 en una línea gris con ícono rojo) · **3b Papel** (lo de otros sobre Paper sin borde, nombres en Sora 700, «✓ Mejor respuesta» arriba en verde, negocio en tarjeta blanca dentro, 911 sobre tinte rojo) · **3c Comentario** (la mejor respuesta baja debajo de los votos: cara 32 + burbuja Paper + negocio en chip con ★ dorada; negocio sin caja con «Ver» suave; encuesta con círculos y luego barra fina con %; 911 en línea roja). Las tres: la mejor respuesta dice quién y qué (hoy solo el negocio), fuera «RECOMIENDA · PARA…» y «41 VECINOS…», sin mono adentro, sin botón negro «Ver»; el texto no cambia. **29 oct: eligió 3b (Papel).** Paso 3 = barra de votos, turno 4 arriba, con 2c + 3b y 4 publicaciones (sin encuesta): HOY (VoteBar con caja gris) · **4a Suelta** (sin caja, íconos .6, número Manrope 700 14) · **4b Con nombre** (línea 1 px .07 arriba, 4 partes iguales con ícono + nombre: votos · Comentar · N · Guardar/Guardado · Compartir) · **4c Pastillas** (votos y comentarios en pastillas con borde 1 px .12 radio 999, guardar y compartir en círculos; votaste = borde y tinte morado). **29 oct: eligió 4c (Pastillas). Aplicado a Comunidad (móvil y desktop, muro y detalle):** puente `prototype/ds-post.js` (PostCard y VoteBar `tlv 27`, cargado solo en Comunidad después del bundle; props nuevas `rank {label, shield gold|gray}`, `solved`, `edited`, `verified`, `voted`; `act` ya no se usa); fuente `components/community/Post.jsx` al día (respaldo `_tmp/post2/Post-pre.jsx`). Comunidad: `rkTag2`, `agoS`, `tcz`, `capF`, `place2`, `bz().m`, `pollV().m`, `ans.k/who` (quién contestó y qué dijo) y los hijos 3b en la plantilla (respaldo `_tmp/post2/Comunidad-pre-post2.dc.html`). **Hecho después (29 oct):** el puente también se carga en Prototipo (Novedades: hora «Hace 2 h» a la derecha en vez del sub mono) y en Panel v2 (vista previa de novedad: «Ahora / Programada / Se repite»); master 2ab con la captura nueva `patrones/03-pat.png` (la vieja en `_tmp/post2/03-pat-pre.jpg`) y readme al día. **SINCRONIZAR 31 aplicado (29 oct):** el sistema ya tiene PostCard/VoteBar tlv 27 (`components/community/PostCard.jsx`), readme, master 2ab con `patrones/03-pat.png`; bundle local = el del sistema (respaldo `_tmp/ds-respaldo/_ds_bundle-pre-s31.js`); puente `prototype/ds-post.js` quitado de Comunidad, Prototipo y Panel v2 (guardado en `_tmp/ds-respaldo/ds-post.js`). Hijos de Novedades (Prototipo, móvil y desktop: oferta, hoy hay, horario, encuesta, cupón, evento/vacante) y de la vista previa del Panel v2 (caja, cupón, encuesta) pasados a 3b el 29 oct: Paper sin borde radio 16, nombres en Sora 700 15, datos en Manrope 500 12.5 .6 con mayúscula inicial (`sc1` en Prototipo, `bxS`/`cupS` en Panel), encuesta sobre Paper con % en Sora, código del cupón sigue en mono sobre blanco con borde punteado (respaldos `_tmp/post2/Prototipo-pre-nov3b.dc.html`, `Panel-pre-nov3b.dc.html`).
- **PENDIENTES AL 2 NOV (chat nuevo empieza aquí):** 1–2) **SINCRONIZAR 32 + 32b aplicados (2 nov):** el sistema tiene 2au, readme, Tabs `variant="title"`, `SearchSelect`, AddPill con aria; bundle local = el del sistema (respaldo `_tmp/ds-respaldo/_ds_bundle-pre-s32.js`). Comunidad usa `Tabs variant="title"` (`mod.tabsT`; respaldo `_tmp/com-simple/Comunidad-pre-tabsDS.dc.html`); Prototipo (Por marca, móvil y desktop) y Mi vehículo usan `SearchSelect` (`ddOf` devuelve `ssItems/ssVal/ssPick/ssOther`; respaldos `_tmp/marcas/*-pre-SS*`). Nota: grep no lee archivos de otro proyecto (sale vacío); para revisar el sistema, copiar el archivo a `_tmp/` y leerlo. 3) Datos de ejemplo: **hecho 2 nov** — persona con foto en Fresh Kicks (Jonathan Peralta 7668390), Celulares y Más (Luis Ferreras 31718639), Belleza Latina Supply (Rosanna Cruz 40550897), Juguetería Arcoíris (Milagros Jiménez 16810734), Aeropuerto Seguro (Rafael Castillo 33651006), Traslados Abuela (Mercedes Almánzar 8973873), Transporte a Almacenes (Ramón Paulino 5835591), Renta de Camionetas (Kevin Rosario 4391223); 3.ª foto propia en Casa Linda, Vivero García, PC Gamer y Librería El Saber. Respaldos `_tmp/rev-tienda/*-staff2*`, `_tmp/rev-trans/*-staff2*`. 4) Viejos revisados (2 nov): ya estaban hechos — «VENDIDOS POR DÍA» (chart), número de mesa en la puerta (`mesaN`), alertas de búsqueda en Mi cuenta, Sinónimos y «Búsquedas sin oferta» en Super Admin · Catálogo, ADM-CIUD, reseñas en vivo y «otra hora» en el Panel (`dashLive`, `replyRev`, st 'alt'), 2r en master. Hecho hoy: **cambiar artista de una sola fecha** (Panel · evento de serie, viendo una fecha: «QUIÉN SE PRESENTA · fecha», «Cambiar artista solo esta fecha» → `e.luD[día]` + aviso SMS a los que van en `msgs`; «Volver al de siempre»; la página del evento lo lee en `toClient` de dash2-evt). Respaldos `_tmp/Panel-pre-luD.dc.html`, `_tmp/rev-evt-pre-luD-dash2-evt.js`. **No queda nada pendiente de la lista del 2 nov salvo pegar SINCRONIZAR 32.**
- **Onboarding del vecino · rehacer (2 nov, pedido del usuario; reabre la decisión del 28 sep).** Respuestas del usuario: sale completo al tocar Entrar / Yo / Comunidad; si va a pedir, solo nombre y sigue (lo demás en Mi cuenta · Completa tu cuenta). Pasos: idioma, teléfono + código, nombre y «cómo te dicen», foto saltable, zona en Hazleton, ubicación con motivo, intereses (17 categorías) y qué le interesa de Comunidad, reglas del barrio (`TLCom.RULES`), correo opcional, qué te avisamos (el permiso del teléfono sigue después de la primera acción, `tl-notif-v1`). 4–5 pantallas (quedaron 5: Entra · Tú · Tu zona · Lo que te gusta · El barrio). Final = bienvenida «Fundadores #n» + Recluta + 100 monedas + 3 acciones según intereses. Comunidad = una línea «Empiezas como Recluta · ya puedes publicar, comentar y votar». Desktop = ventana centrada. Incluye «No vivo en Hazleton». Variantes en `To'Latino Onboarding vecino (variantes).dc.html` (turno 1): **1a Pasos** (OnbTopBar 2ad, pantalla completa) · **1b Tu tarjeta** (NeighborCard 2s se arma arriba, pregunta en hoja) · **1c Hoja** (sigue la hoja 2m sobre lo que estabas viendo) + casos (solo nombre al pedir, fuera de Hazleton, retomar / Completa tu cuenta, desktop). **2 nov: eligió 1a (Pasos). Construido:** hijo `To'Latino Onboarding vecino.dc.html` (props lang, desk, mode full | name, start, nx home|com|me|order|cita, top, user, api {setLang, save, close, done, act}); estado en `tl-onb-usr-v1` (step, phone, verified, first, last, nick, email, photo dataURL 240, zone, loc, outCity, cats, com, rules, nt, n, done) → retoma donde quedó. Prototipo: `auth` con ctx login | com se cambia en `componentDidUpdate` por `s.onb` (la hoja 2m no sale para esos); pedido/cita/reseña siguen con la hoja 2m y, si el teléfono no tiene nombre, abren `mode: 'name'` y siguen con `a.next` + `a.after`; mismo teléfono con onboarding hecho = entra directo. `onbUser(o)` arma el usuario; `onbApi` (done → `onb.next`, act → categoría / Recomendar / Abierto ahora / El Patio / Comunidad); overlay móvil inset 0 z 91 y desktop ventana 480 en `onbTop`; ruta `ONB-USR-0` con `step` abre ese paso. Mi cuenta · Completa tu cuenta suma Tu zona (3), Lo que te gusta (4), Reglas del barrio (5) → `usrApi.onb(n)`. Comunidad: si `u.rules`, `finishWelcome(nx0)` corre solo (100 monedas, sin la pantalla de bienvenida); sin reglas sigue su bienvenida. Ya registrado (2 nov): Entrar dice «ENTRA O CREA TU CUENTA» (sin barra de 5); después del código, si el teléfono tiene cuenta (`tl-usr-accts-v1`, se guarda al tener nombre; semilla demo (570) 555-0142 = Ana Rodríguez n.º 214) sale «Qué bueno verte de nuevo, Ana» 1.6 s y entra; la hoja 2m de pedido hace lo mismo sin pedir el nombre. La X (o salir) sin nombre todavía = se cancela la entrada (`user: null`); el carrito, la cita o la reseña quedan como estaban; el teléfono verificado queda en `tl-onb-usr-v1`. Respaldos `_tmp/onb-usr/`. **Aprobado (2 nov) → master 2au con `patrones/22-pat.png` (capturada con la prop `demo` del hijo, que no toca localStorage) y readme.** Falta SINCRONIZAR (copiar master + readme + captura al proyecto del sistema).
- **Auto · «Por marca» completo (29 oct, pedido del usuario):** `neg-auto.js` (y bundle-1) con `ALLMK` = 41 marcas A–Z (carros, SUV, eléctricos y camiones pesados: Freightliner, Hino, International, Isuzu, Kenworth, Mack, Peterbilt); la fila muestra las 10 más comunes (Toyota, Honda, Nissan, Ford, Chevrolet, Hyundai, Kia, Jeep, Dodge, Ram) en una línea; «Ver todas · 41 ▾» a la derecha del título abre un desplegable (buscador + lista A–Z con letras, alto 264, ✓ en la elegida; `TLAutoBook.ddOf`), nunca chips regados; una marca elegida fuera de las 10 se queda primera. Fila ROWS con `r[5]` = lista completa y `r[6]` = texto del enlace (sirve para cualquier categoría). Hyundai/Kia, Dodge/Ram y «Europeos» ahora separados; `'euro'` sigue en los negocios solo por «Mi vehículo». «Mi vehículo» (neg-auto-book, bundle-4): 8 comunes + chip «Otra marca ▾» con el mismo desplegable y «No está en la lista · escríbela»; `MAKES` = 41 (+ euro/otra para vehículos viejos); modelos nuevos de Kia y Ram; marca sin modelos = campo MODELO para escribir. Respaldo `_tmp/marcas/`.
- **Categorías · sin la caja «línea fija» (29 oct, pedido del usuario: «elimina todo lo que es obvio»):** la caja verde arriba de cada página de categoría (p. ej. Auto «Nada se hace ni se cobra sin tu OK…») ya no sale en ninguna categoría (Prototipo `hasLine: false`, móvil y desktop); `D.line`/`lineSub` siguen en los datos y se usan en otros lados. Respaldo `_tmp/rev-auto/Prototipo-pre-linea.dc.html`. No volver a ponerla.
- **Comunidad · pestañas del módulo (29 oct, pedido del usuario: «que se vea mejor, son títulos, íconos y más strong»):** el componente Tabs (mono gris) se cambió en el encabezado por una fila en la plantilla (`mod.tabs2`): ícono 17 (users · news · hash · grid) + Sora 15, activa 800 negra con línea Action 2.5 px abajo, las otras 700 .5; se desliza de lado; línea .08 debajo. Respaldo `_tmp/com-simple/Comunidad-pre-tabs.dc.html`. **Aprobado por el usuario (29 oct).** Pendiente: pasarlo al sistema (Tabs variante «título») en el próximo SINCRONIZAR y usarlo en Prototipo, Panel y Super Admin.
- **Cadena del motor de Educación (ojo en 14–17):** `TLEduL` (neg-edu-listing) lo usan Educación, Niños, Deporte (`b.dep`), Iglesias (`b.fe`), Bienes Raíces (`b.inm`) y Venta de Autos (`b.dealer`); `TLEduK.isE` excluye a todos esos y `TLNinosK` solo toca `b.ninos`. Cada nueva `neg-{cat}-kind.js` debe esperar a `R._ek` (y `R._nik`) antes de envolver `TLRev` / `TLListing.hoursPro` / `TLEduL.asp`, usar una bandera propia en TLRev (comprobar con grep que no exista: `_nk` es de Noche) y engancharse en `lstBar` después de `NKk.post(` (Niños). La pestaña sale de Prototipo `['svc', b.ninos && window.TLNinosK ? … : b.edu ? Cursos …` (añadir la categoría ahí). Tarjeta «VERIFICADA · INSCRIPCIÓN» en `revCard` (condición `TLEduK.isE(b) || b.ninos`). En dash2-cat, Educación y Niños (no guardería) comparten el bloque `K === 'NEG-EDU' || (K === 'NEG-NINOS' && S.its)` con `NIK`; Deporte, Fe, Inmueble y Dealer tienen su bloque propio en `blocksE` / `blocksD`.
- **Estado al abrir el chat nuevo (28 oct, fin del día):** E5 · ficha por categoría. Hechas y cerradas: 1 Auto · 2 Belleza · 3 Comida · 4 Hogar · 5 Noche · 6 Mercados ·
  7 Fiestas · 8 Doctores · 9 Profesionales · 10 Tiendas · 11 Transporte (detalle de cada una abajo). **Hecho: 12 Educación a 17 Venta de Autos (28 oct, ver «Hecho» abajo). E5 · ficha por categoría TERMINADA (las 17); quedan solo los pendientes de cada «Hecho».** · 17 Venta de Autos (NEG-DEALER). Archivos: Educación `neg-edu.js` · `-listing` · `-flow` · `-rev`; Niños
  `neg-ninos.js` · `-listing`; Deporte `neg-deporte.js` · `-listing`; Iglesias `neg-fe.js` · `-listing`; Venta de Autos `neg-dealer.js` · `-listing`; Bienes Raíces: buscar con grep
  (no hay `neg-` propio; grep «Bienes Raíces» en prototype/). Arranque: leer este §0 y §2d; `prototype/neg-{cat}.js` + `-listing`/`-flow`/`-rev`
  (`prototype/bundles.json` dice en qué bundle está cada uno); revisar en pantalla todos los negocios de la categoría (Pro y Free), panel (`dash2-cat.js`, bloque `K === 'NEG-…'`,
  `state()`, `summary`, `apply`) y Super Admin, y **mostrar la lista en 4 grupos** (Arreglar · Triángulo · Negocios de ejemplo · Quitar) **sin cambiar nada** hasta el OK.
  Luego pasos 1 → 2 → 3, pendientes, actualizar este §0 y avisar la siguiente.
- **Receta que se repite en cada categoría (5–11):** archivo `prototype/neg-{cat}-kind.js` (`TL{Cat}K`: `kind(b)` por subcategoría, `b.k` lo fuerza; `faq()` por tipo; reseñas por
  tipo `RK` + `b.rv`; `post(C, s, es, b, v)`), cargado con `<script>` en Prototipo (junto a `neg-trans-kind.js`), Super Admin y —si el panel necesita el tipo— Panel v2; el `post` se
  engancha en `lstBar` del Prototipo (buscar `RKk.post(` y añadir la línea siguiente con el flag de la categoría, p. ej. `x.edu`). Envolver `TLRev.forBiz` (solo si es la genérica),
  `TLRev.stats` (verificadas de los Pro: «VERIFICADAS POR …» de la categoría) y `TLListing.hoursPro` (feriados: «Sin cambios programados» si el dueño no está en `TLDash2.BIZ`);
  esperar a `R._{cat}` de su listing antes de envolver. Casos que siempre aparecen: Free con «Desde $» / filas inventadas → «Ve directo / Llama…» + HOY HASTA, tarjeta de Hoy
  con filas reales (`rb.tc.cols`); sin local → «Zona donde trabaja» + «Ver la zona» + `rb.lbl.amenK` «CÓMO TRABAJA»; 24 horas → `fix24`; «Del menú» → «Servicios»
  (`rb.lbl.menu`); FAQ vacío o igual en todos. Panel (dash2-cat): `state()` por tipo, bloques con `bl('rows'|'chips'|'step')`, `apply` escribe tags/eta del negocio, `summary`
  = lo que ve el admin; añadir la categoría a la condición de `admRows` para que el Super Admin vea la herramienta siempre; demos `BIZ['id'] = mk(...)` antes de
  `BIZ['celulares-y-mas']`. Probar con `tl-dash2-v1`: guardar en `sessionStorage`, escribir `over[id].tool`, recargar, leer, y devolver el valor (nunca borrar claves).
  Negocios nuevos: agrupar subcategorías del plan sin negocio; Pro con persona con foto real (revisada a ojo en `_tmp/fotos-*.html`, grep para no repetir, borrar la hoja);
  editar la fuente y reemplazar su texto entero dentro del bundle (`one(bundle, viejo.trim(), nuevo.trim())`); cuidado con `,,` al insertar en listas. `new Function(código)`
  antes de guardar. Respaldo en `_tmp/rev-{cat}/`. Badge de fotos ya dice «1 FOTO» si hay una sola.
- **Todo Pro (29 oct, pedido del usuario: «ponerlo todo en Pro, después decido qué se recorta a Free»):** los 30 Free de Fiestas (12), Doctores (6) y Profesionales (12) pasaron a Pro: `pro: 1`, `verified`, st/eta/fee, dep/busy/zone/addr (Fiestas), ins/cash (Doctores), 3 fotos de `pexels-{cat}.json` sin repetir (revisadas a ojo; Latino Web Studio con 2), servicios en `Object.assign(SVC, {…})` justo después del `SVC` de cada listing (y en bundle-3/4); datos en neg-fiesta/salud/pro.js y bundle-1. Respaldo `_tmp/pro-all/*-pre.js` (y `sv.json`, `objs.json` con el objeto viejo y el nuevo de cada uno). Persona con foto: Orquídea Valdez 5410101 · Florería La Orquídea (fiesta STAFF, 29 oct); los otros 29 sin persona. **Decisión del usuario (29 oct, opción 2):** persona con foto SOLO en los que viven de su cara, unos 8–10: Payasita Chispita, Banda La Dinastía, Sonido Pérez (DJ), Cirugía Oral Dr. Pimentel, Hazleton Notary & Tags, Traducciones Ana Beltré, Rev. Carmen Soto, Lugo Interiores, Paredes Seguridad (y Florería ya hecha). Los demás quedan con «El equipo» solo con nombres, sin foto (como Sabor). El pool `people` de pexels-pro.json ya está usado: buscar fotos del oficio en Pexels, revisar a ojo, grep para no repetir. **Cancelado por el usuario (29 oct): «no hace falta, solo son demos».** No se agrega persona con foto a los demás; no se vuelve a proponer. Fotos arregladas 29 oct: Envíos Caribe 6818151 primero (antes un dibujo), Fianzas Luzerne 15452106 · 36595112 · 15452110. Partera, Prótesis, Aparatos auditivos, Cuidador y Transporte médico no tienen negocio Free que pasar (siguen sin Pro).
- **Pendientes que quedaron (para cuando el usuario quiera):** Tiendas: persona con foto en 9 Pro viejos y fotos propias de los negocios nuevos; Transporte: persona con foto en
  los 10 Pro y título «Salidas y asientos» para los que no son vans (y 3 Pro nuevos con 1 sola foto); Fiestas, Doctores, Profesionales: subcategorías que siguen solo en Free
  (ver cada «Hecho»).
- **Patrón que funcionó en Comida y Hogar:** un archivo `neg-{cat}-kind.js` (`TL{Cat}K`: `kind(b)` por tipo de negocio, FAQ por tipo con el `b.fq` del
  negocio ganando, reseñas por tipo o `b.rv`), cargado en el Prototipo después de los anteriores (`neg-food-kind`, `neg-hogar-kind`); demos del panel en
  `dash2-cat.js` por cada forma de vender; negocios nuevos agrupando subcategorías de `plan/taxonomia-negocios.md`. Fotos: armar una hoja `_tmp/fotos-*.html`
  con los ids de Pexels, verla con `show_html` + screenshot, comprobar con grep que el id no se usa ya, y borrarla al final.
- **En curso (E5 · ficha por categoría):** el usuario pidió revisar el single listing de cada categoría y subcategoría (qué falta, mejorar, arreglar,
  quitar). **Método fijo (no se pregunta):** primero se le muestra al usuario la lista en 4 grupos (Arreglar · Triángulo · Negocios de ejemplo · Quitar) y se
  espera su OK; luego 1) errores en pantalla, 2) triángulo panel → página → admin para lo que vende esa categoría, 3) negocios de ejemplo para las
  subcategorías sin cubrir (`plan/taxonomia-negocios.md`, ninguna categoría inventada). Se cierra actualizando §2d y este §0.
- **Hecho:** 1 Servicios de Auto · 2 Belleza y salud (27 oct; detalle en §2d «Ficha por categoría · …»).
- **En curso: 3 Comida (27 oct, OK del usuario).** **Paso 1 hecho:** `prototype/neg-food-kind.js` (`TLFoodK`, cargado en el Prototipo después de
  neg-free-staff): `kind(b)` catering · truck · casa · finde · bakery · cafe · juice · dessert · seafood · grill · rest (`b.k` lo fuerza); `faq` por tipo (el FAQ del dueño
  gana); reseñas de ejemplo por tipo (envuelve `TLListing.revFor` y `TLRev.forBiz`); `post(C, s, es, b, v)` se llama al empezar `lstBar` y corrige columna, botón
  (Catering «Pedir cotización», solo para comer aquí = «Cómo llegar»), tarjeta de Hoy (`rb.tc`, no `rb.today`), casa = «SE RECOGE · En su casa» + dirección al aceptar +
  «Ver la zona», camión = «Hoy en …» + HOY ESTÁ EN, encargo = «Encargo · N días», fin de semana = PEDIDOS HASTA. El Fogón, Tacos y Jugos ahora con 'online'. El «0» de
  las tarjetas de plato es del componente MenuTile (también en Pro, no se ve). **Paso 2 hecho:** Panel · Lo que vendes · TU HERRAMIENTA «Cómo vendes» (dash2-cat
  `blocksF`, `foodS`, `foodK`; no sale para restaurante normal) con demos La Espiga (encargo, días por plato `lead`), Catering (`minP` `maxP` `aviso` `radio`
  `montaje`), Tacos El Güero (`at`, `until`, `moving`) y Doña Tere (`cutD`, `cutH`); la ficha lo lee con `TLFoodK.tool(id)` y el Super Admin con `admRows`.
  Empanadas Doña Luz ahora existe en el cliente (Free, casa en Peace St, fin de semana) con subcategorías del plan. Respaldo `_tmp/rev-food/`. **Sigue paso 3.**
  **Paso 3 hecho (27 oct):** 18 negocios nuevos cubren las 26 subcategorías (neg-food.js + MENU/ABOUT en neg-listing.js; bundle-1 y bundle-3 parchados). Pro: El Coquí Boricua
  (Puertorriqueña, Pollo frito y alitas) · La Habana Sandwich Shop (Cubana, Sandwiches y tortas) · Asados La Pampa (Argentina, BBQ y asados, Brasileña) · Meal Prep by Yuli
  (Comida preparada por semana, Vegetariana y vegana; pide hasta dom 6 PM, llega lun) · Chef Ramón (Chef privado, k catering) · Barra Móvil El Trago (Bartender; tú pones el
  alcohol, 21+ con ID) · Arte Dulce (Decoración de pasteles, encargo 5 días) · Alma (Cocina solo para entrega, sin pickup). Free: Hielo y Agua Cristal · Tapas y Paella
  Valencia (Española) · Tamales Doña Chayo (Tamales, Guatemalteca; casa en Grant St) · Baleadas La Ceiba (Hondureña) · El Guayas (Ecuatoriana) · Wok Express (China y
  asiática, Fusión latina) · Buffet La Mesa Latina (solo para comer aquí) · Paletería La Michoacana (Heladería, Aguas frescas) · Boba Tropical (Bebidas especiales) ·
  El Carrito de Don Nico (Vendedor ambulante, esquina fija). Cada uno trae `fq` (FAQ propio) y `rv` (reseñas propias) que `TLFoodK` usa antes que las del tipo; FDEF
  en dash2-cat para chef/barra/carrito/Arte Dulce; catering = tarjeta de Hoy con AVISO · PERSONAS · LLEGA HASTA; solo delivery sin «o en el local». Sin fotos de
  personas todavía. Respaldo `_tmp/rev-food/c3-*`. **Pendientes cerrados (27 oct):** fotos revisadas a ojo y cambiadas (Tamales 29465179/14179987 · Boba 12666797 · Wok 4940832 · El Guayas ceviche 31495674 · Paletería 8678930/12939801 · Meal Prep 34429484 · Hielo + 10376368 · Arte Dulce 30233153/17315403 · Carrito 5920644); «Ver la foto» con una sola (Prototipo `photosCta`); STAFF (nombres, sin foto, como Sabor) para los 8 Pro nuevos → sale la pestaña Staff. Cotización (chef, barra) = «Dónde trabaja · hasta N millas · no hay local», sin parqueo ni Sin delivery; solo delivery = «Hasta dónde llega»; Meal Prep = PEDIDOS HASTA dom 6 PM · LLEGA lunes. El «0» de MenuTile es el contador oculto de AddPill (overflow hidden): no se ve; para lectores de pantalla pedir `aria-hidden` en el sistema (SINCRONIZAR). Los Free no tienen bloque de preguntas (sus `fq` quedan guardados). **Sigue:** 4 Hogar.
- **En curso: 4 Hogar (27 oct, OK del usuario).** 20 negocios (11 Pro, 9 Free; m shop|solo|red|gc). Lista: Arreglar: FAQ igual en los 11 Pro («¿Cobran por venir?», «¿Qué pasa si
  encuentran algo más?», «¿Y si no llegan en la franja?», «¿Trabajan si soy inquilino?») → por tipo (cerrajero, contratista, calentadores, plan, aire, electricista, destapes,
  limpieza, césped/nieve, electrodomésticos) · reseñas de ejemplo iguales en los 9 Free (y en inglés) · bloque «EN EL LOCAL» en todos (va a tu casa → «Cómo trabaja») · «Abrir en
  mapas» sin oficina (Julio, Arreglos Ya, Destapes Express, Santana y los 9 Free) · Electro Hogar PA sin reseñas escritas. Triángulo: herramienta «Visitas, planes y renta»
  (dash2-cat, NEG-HOGAR: rate, zone, h24, off) solo con demo Hermanos Díaz → demos Destapes Express (solo 24/7), Arreglos Ya (red), Constructora Peralta (gc), Mantenimiento La
  Montaña (planes); Tienda/renta. Negocios: 37 subcategorías sin negocio → ~20 nuevos agrupando (techos+canaletas, mudanzas+empaque+escombros, …). Quitar: mapas sin oficina,
  «En el local», FAQ genérico. Archivos: neg-hogar.js, neg-hogar-listing.js (TLHogarL), -book, -flow, -pre, -mas, -plan, -rev; pexels-hogar.json.
  **Hecho (27 oct):** 1) `prototype/neg-hogar-kind.js` (`TLHogarK`, cargado después de neg-food-kind): `kind(b)` handy · plumb · drain · heater · hvac · elec · appl · lock · clean · lawn ·
  plan · red · gc; `faq(b, es, FQ)` deja «¿Cobran por venir?» (sale de sus precios) y cambia las otras 3 por tipo; `b.fq` propio gana; `rv(b)` = `b.rv` o reseñas por tipo para los
  Free (neg-hogar-listing `rev()`). Ficha (neg-hogar-book): «Cómo trabaja» en vez de «En el local» (Prototipo `amenK` con `b.hogar`), sin oficina = «Zona donde trabaja» + «Ver la
  zona». Electro Hogar PA tiene n: 0 a propósito (Pro nuevo, «Aún sin reseñas»). gc sin STAFF ya no rompe (`listingAdd`). 2) Panel: demos Destapes Express, Arreglos Ya,
  Constructora Peralta, Mantenimiento La Montaña en dash2-cat (RATE0, PLAN0); probado: zona 10 y sin 24/7 en el panel → la página lo muestra. 3) 16 negocios nuevos → las 58
  subcategorías: Pro Techos y Canaletas Reyes · Remodelaciones Cabrera (gc) · Pisos y Losas Martínez · Pintores Hermanos Vargas · Mudanzas El Quisqueyano · Plagas Fuera ·
  Seguridad Total PA · Sol Latino Solar (gc, consulta con facturas, sin promesas de ahorro) · Concreto y Cercas Ortiz · Piscinas Caribe (temporada); Free Herrería Don Chepe ·
  Chimeneas Limpias · Ventanas Almonte · Poda Los Hermanos · Brillo Comercial · Tapicería La Fe. Fotos de `pexels-hogar.json` (por subcategoría, sin usar). Pendientes cerrados (27 oct): persona con foto real (revisada a ojo, sin repetir) en los 10 Pro nuevos (Rafael Reyes 8961524 · Héctor Cabrera 3814513 · Ernesto Martínez 6050255 · Manuel Vargas 31544574 · Elvin Rosario 34670920 · Darío Féliz 15200454 · Ramón Tejada 32391506 · Andrés Cuello 3772616 · Julio Ortiz 37556463 · Wilson Marte 32391493) → «Quién está detrás» y pestaña Staff (los de una sola persona no la tienen, como Julio); oficinas en ADDR para Reyes, Cabrera, Mudanzas, Seguridad; Tapicería La Fe `taller: 1` = «TALLER · RECOGE Y DEVUELVE HASTA 15 MI» + dirección en Alter St. Super Admin · Lo que vende ya lee la herramienta del panel (`admRows`) cuando el dueño la guarda. Respaldo `_tmp/rev-hogar/`. **Sigue:** 5 Noche.
- **Hecho: 5 Noche (28 oct).** `prototype/neg-noche-kind.js` (`TLNocheK`, cargado en Prototipo después de neg-hogar-kind y en Super Admin después de evt-data; `post` en `lstBar` con el negocio de `TLAll.B`): kind club · salsa · urbano · banda · bar · sport · karaoke · billar · cerve · lounge · show · dj · promo · salon; FAQ por tipo (`b.fq` gana); reseñas por tipo (`b.rv`); verificadas a los Pro con lista/mesas («VERIFICADAS POR LISTA O MESA»); `hoursPro` de noche (un tramo, día cerrado «Abre el viernes», DJ/promotor «Por contrato»/«Según la noche»); tarjeta de Hoy «PRÓXIMO · VIERNES»; Free sin «Desde $» y «Sin publicar»; DJ/promotor/salón por fecha (riel, pestaña «Para tu fecha»/«Próximas noches» vía `TLNocheK.tabL`, botón «Pedir fecha» → APP-NEG-CONTACTO); `svcSync`: Panel · Servicios (over.items, mods 'svc', agotado, itemOff del admin) → TLNocheL.SVC y TLListing.MENU. Fuentes (y bundle-1): días cerrados, `mesas`, fila de la última noche abierta (`nt.lastD`), sin filas «Sin cover», «En el local» con el cierre real, servicio `fecha` (priceFor «Desde $ · POR FECHA»), `eid` = la fila abre la página del evento. Triángulo: dash2-cat fila corta ≤10, «FILA AHORA» (`nt.live`), lista con «Sin lista» (`hasL`), cover por noche (`byD`), «después de» solo si sube; Entrada/Lista siguen al panel (`liveIt`); Super Admin ve «Esta noche» siempre. Eventos nuevos en evt-data: banda-dinastia (Beto, sáb), comedia-palacio (vie), retro-2000 (Welly en Club Caliente, vie 9 oct). Negocios Pro nuevos: DJ Rafy Mejía · Sonido Quisqueya, Welly Cruz Eventos (promotor), Salón de Eventos Las Palmas (150 personas). Persona con foto (revisada a ojo, sin repetir) en los 12 Pro: Andrés Polanco 4485382 · Rafa Núñez 18350039 · Joel Mercedes 19189097 · Estrella Paulino 34381970 · Don Beto 16876933 · Ángel Rosario 39559734 · Mike Kowalski 8941709 · Yudelka Santos 18809829 · Nicole Batista 16373754 · Rafy Mejía 11975320 · Welly Cruz 19512733 · Mayra Guzmán 3752747. Respaldo `_tmp/rev-noche/`. **Sigue:** 6 Mercados.
- **Hecho: 6 Mercados (28 oct).** `prototype/neg-merc-kind.js` (`TLMercK`, cargado en Prototipo y Super Admin; `post` en `lstBar`): kind super · carne · pesc · fruta · tortilla · pais · bodega · deli · mayor · agua · licor · taba · vape · bota · pet · dollar · conv · agric · queso; `weighs(b)` (vende por libra o tag pesa): si no pesa, fuera la línea de la balanza, los 4 pasos, la pregunta del peso, las reseñas que hablan de pesar y PESARON/COBRARON en los aspectos; FRESCO fuera en licor · taba · vape · bota · pet · dollar · conv · agua · mayor (envuelve `TLMercL.asp`); FAQ por tipo (`b.fq` gana); reseñas por tipo (`b.rv`); «VERIFICADAS POR COMPRA»; «ESTACIONAMIENTO PROPIO» con tag estac; pago completo (EBT · tarjeta · efectivo); Free sin «Desde $» ni «PICKUP · NO», con 21+ con ID en licor/tabaco/vape; mayorista con precio por caja y mínimo; 24 horas (`hrs [0,24]`, `fix24`); horario sin feriados que el dueño no eligió; `closed: []` en los que abren todos los días. Arreglado: el envío por correo de Tiendas (dash2-data `shipK`) le quitaba el envío a los mercados (`!b.merc`). Triángulo: Panel · Balanza y pedidos ahora con costo del envío, mínimo para envío, EBT y efectivo (`fee`, `min`, `ebt`, `cash` → tags y `TLMercL.OPTS`); probado: envío $2.50, EBT apagado y Yuca agotada salen en la página; Super Admin ve la herramienta siempre («lo de base, el dueño aún no lo cambia»). Negocios nuevos: Pro Mercado Sudamericano El Cóndor (Rosa Huamán 16817332) · La Cumbre Licores y Cigarros (Wilfredo Peña 19653561; sin envío de alcohol) · Botánica Siete Potencias (Fefa Rosario 37758913; sin promesas de salud) · La Económica · Todo a $1.25 y Mascotas (Marisela Ortiz 16866941); Free Mini Market La Estrella 24/7 (Ismael Paredes 14933973) · Vapor Zone Hazleton (Kelvin Sosa 32593263, 21+). Las 30 subcategorías tienen negocio (Mercado de agricultores sigue solo Free: es un mercado coordinado). Respaldo `_tmp/rev-merc/`. **Sigue:** 7 Fiestas.
- **Hecho: 7 Fiestas (28 oct).** `prototype/neg-fiesta-kind.js` (`TLFiestaK`, cargado en Prototipo y Super Admin; `post` en `lstBar` con `x.fiesta`): kind salon · quince · org · ninos · renta · infl · dj · sonido · musica · anim · deco · flor · foto · pastel · barra · taquiza · limo · tienda · invit · chispa; FAQ por tipo (fecha libre y depósito salen del calendario; `b.fq` y el FAQ de Tu página ganan); reseñas por tipo (`b.rv`; las de `TLFiestaL.RV` siguen); «VERIFICADAS POR FIESTA RESERVADA» y tarjeta «VERIFICADA · FIESTA» (Prototipo `revCard`); verificadas de los Pro sin datos; sin feriados que el dueño no eligió; sin local (va a tu lugar, sin ADDR) = «Zona donde trabaja · Va a tu lugar · hasta N mi» + «Ver la zona»; «Cómo trabaja» en vez de «En el local» si va a tu lugar; `svcSync` Panel · Servicios / itemOff del admin → `TLFiestaL.SVC` y `TLListing.MENU`. Fuente (y bundle-1/3): Free sin «Desde $» ni PRÓXIMA LIBRE (no lleva calendario): INVITADOS o VA HASTA · IDIOMA · HOY HASTA; tienda sin cita; «1 HORA». Triángulo (dash2-cat): arreglado `d:N` al revés (marcaba los días ocupados como libres); `cap` solo para quien tiene invitados (antes ponía 250 al DJ); «Vas hasta» (zona) en Calendario y depósito; Super Admin ve la herramienta siempre. Probado: ocupado sáb 26 + 3 oct, zona 30, depósito $150 en el panel → la página y Buscar; ocultar un servicio en el admin → sale de la página. Negocios nuevos (14 subcategorías sin negocio): Pro Fiestas Mágicas (Karina Jáquez 4473398) · Patio en Grande · Montajes (Ramón Ureña 10392126) · Hora Loca Tropical (Franklin Polanco 34330228); Free Cabina Selfie Hazleton (Luis Almonte 3394657) · Chispas Frías PA (Héctor Lantigua 36298150) · Keystone Eventos Corporativos (sin persona). Persona con foto en los Pro que no tenían: Yoel Taveras 3758102 (DJ El Cibaeño) · Milagros Peña 6146948 (Globos y Más) · Yolanda Báez 37330783 (Dulce Tentación) · Andrea Fermín 6347901 (Andrea Events); ninguna repetida. Siguen solo en Free: Florería, Payasos, Taquiza, Banda, Limosina, Invitaciones, Tienda. Respaldo `_tmp/rev-fiesta/`. **Sigue:** 8 Doctores.
- **Hecho: 8 Doctores (28 oct).** `prototype/neg-salud-kind.js` (`TLSaludK`, cargado en Prototipo y Super Admin; `post` en `lstBar` con `x.salud`): kind gen · urg · comm · ped · dent · eye · audio · mujer · partera · mente · psiq · ther · esp · bien · farm · casa · trans · lab; FAQ: se quedan «¿Aceptan mi seguro?» y la del 911, las 2 del medio por tipo (urgencias: espera real y cuándo ir a emergencias; consejería/psiquiatría: privacidad y 988; dentista; pediatría; óptica; terapia; mujer; laboratorio; especialistas; enfermería en casa; la comunitaria se queda igual); `b.fq` y Tu página ganan. Reseñas por tipo para los que no tienen `TLSaludL.RV` (`b.rv` gana; nunca el motivo de la consulta). Free: «AQUÍ NO SE PIDE CITA POR LA APP», sin «Desde $» ni PRÓXIMA CITA (barra = «Ve directo» / «Llama para tu cita» + HOY HASTA / VA HASTA / ABIERTO 24 HORAS), SEGURO = los públicos o «No · pagas en la consulta», farmacia = «Ve directo». Sin consultorio (zona sin addr: cuidado en casa, transporte, enfermería) = «Zona donde trabaja» + «Cómo trabaja» + «Ver la zona»; 24 horas (`fix24`); sin feriados que el dueño no eligió. Triángulo (dash2-cat «Seguros e idiomas»): + «Espera ahora sin cita» (walk-in: `b.wait` y `b.eta`), «Precio según tus ingresos» (escala), «Sin papeles ni seguro social» (sinid), idiomas (pt/ht = «También en …»; sin español quita esp/medesp), «Aceptas pacientes nuevos» (`b.noNew` → tarjeta de Hoy y riel); demos Urgencias Express, Dental Sonrisa y Consejería Renacer; Super Admin ve la herramienta siempre. Probado: espera 45, escala, sin papeles, PT en el panel → página y admin. Negocios nuevos (las 27 subcategorías que faltaban): Pro Piel Sana (Dra. Yesenia Mercedes 3714743) · Corazón y Pulmón Hazleton (Dr. Carlos Medina 13156759) · Especialistas del Valle (Dr. Minh Tran 14438788) · Centro de Neurología y Dolor (Dr. Andrés Villalobos 7966285) · Ortopedia y Pies (Dr. Kevin Almonte 5888143) · Oído, Nariz y Alergias (Dra. Linh Nguyen 15641079) · Psiquiatría Nuevo Amanecer (Samuel Baptiste, PMHNP 32254659, kreyòl) · Hablemos · Terapia del Habla y Ocupacional (id `hablemos-terapias`; ojo: `terapias-pasitos` es de Niños; Tamara Joseph 19963126) · Cuidar · Enfermería en Casa (Yaritza Gómez 8460373; «Evaluación en casa gratis»); Free Cirugía Oral Dr. Pimentel · Farmacia San Rafael (preparación y equipo) · Peso Sano · Hidrata IV · Fertilidad Esperanza · Centro Oncológico del Valle. Fotos de `pexels-salud.json` sin usar, revisadas a ojo; ninguna repetida. Siguen solo en Free: Partera, Prótesis, Aparatos auditivos, Cuidador, Transporte médico y los 6 nuevos. Laboratorio Hazleton sigue con 0 reseñas a propósito. Respaldo `_tmp/rev-salud/`. **Sigue:** 9 Profesionales.
- **Hecho: 9 Profesionales (28 oct).** `prototype/neg-pro-kind.js` (`TLProK`, cargado en Prototipo, Super Admin y Panel v2 —el panel lo necesita para saber el tipo—; `post` en `lstBar` con `x.prof`): kind legales inm · doc · tax · injury · penal · fam · law · fin (se queda «¿Puede hacer mi trámite por ley?» y «¿Me garantizan el resultado?», las 2 del medio por tipo) y no legales seg · repair · print · money · biz · digital · ofic · build · svc (4 preguntas propias; sin «Mira la licencia», sin «LICENCIA —», sin «trámites» ni «de qué trataba el caso», sin «Nadie te garantiza» en la tarjeta de Hoy; filas «LISTO EN», «DESDE», «PRÓXIMA CITA», «COMPAÑÍAS»). `b.fq` y el FAQ de Tu página ganan (Bufete Almonte tiene FAQ en el panel: se queda el suyo). Reseñas por tipo para los que no tienen `TLProL.RV` (`b.rv` gana); verificadas para los Pro nuevos. Free: «AQUÍ NO SE PIDE CITA POR LA APP», sin «Desde $» ni PRÓXIMA CONSULTA, LICENCIA solo si la tiene, «Ve directo» si es sin cita (Envíos Caribe), Rev. Carmen `zone: 40` = «Zona donde trabaja · Va a tu boda o evento». Sin feriados que el dueño no eligió. Triángulo (dash2-cat «Licencias y el total por escrito»): por tipo — seguros: compañías (`cos`) y «comparas precios» (`cmp`); reparación/imprenta/digital/arquitectura: «Listo en» (`days`), garantía (`warr`, reparación y digital), «Presupuesto antes de empezar» (`est`); legales siguen con licencias, «Lo que no haces» y gobierno $. Arreglado: el gobierno $ del panel no llegaba al total de la página → `TLProK.govSync` (por nombre del servicio). Demos Rosario Tax, Seguros El Cibao y TecnoFix; Super Admin ve la herramienta siempre. Probado: TecnoFix 3 días + 180 de garantía, Seguros 9 compañías, gobierno $500 en I-90 → página y admin. LIC nuevas `nmls` y `arq`. Negocios nuevos (las 15 subcategorías que faltaban): Pro Peguero Law · Bancarrota y Bienes Raíces (Lcdo. Rafael Peguero 7841442) · Hogar Propio · Préstamos e Hipotecas (Lucía Ferraro 26692095, sin «aprobación garantizada») · Ortega Consultoría (Daniela Ortega 25651531) · Solís Foto y Video Comercial (Iván Solís 18790049) · Núñez Software y Apps (Gabriel Núñez 13450799) · Ventura Arquitectura e Ingeniería (Arq. Raquel Ventura 8279501, + Topografía); Free Paredes Seguridad e Investigaciones (Néstor Paredes 4106090) · Mensajería Rápida Hazleton (zona 25) · Lugo Diseño de Interiores (Paola Lugo 3747444). Fotos de `pexels-pro.json` sin usar, revisadas a ojo (6804080 de Núñez no se vio). Siguen solo en Free: apostilla, cheques, crédito, agencia de empleo, despacho, web y los 3 nuevos. Crédito Nuevo sigue con 0 reseñas a propósito. Respaldo `_tmp/rev-pro/`. **Sigue:** 10 Tiendas.
- **Hecho: 10 Tiendas (28 oct).** `prototype/neg-tienda-kind.js` (`TLTiendaK`, cargado en Prototipo y Super Admin; `post` en `lstBar` con `x.tienda`): kind ropa · cel · tec · casa · ferr · bell · joya · fam · svc · auto · pet · online · movil; FAQ: se queda «¿El precio de aquí es el de la caja?», 2 por tipo y la del apartado (o la de cambios); `b.fq` y Tu página ganan. Reseñas por tipo (las de `TLTienda.RV` siguen); «VERIFICADAS POR APARTADO» (wrap de stats después de `R._tienda`). Free: «AQUÍ NO SE APARTA POR LA APP», barra «Ve directo / Llama o pasa / Pide por WhatsApp» + HOY HASTA, tarjeta de Hoy = HOY HASTA · PAGO · ESTACIONAMIENTO o DOMINGO (sin «APARTADO No» ni «CAMBIOS —»). Servicios (lavandería, sastre, tintorería, estética canina) = pestaña y título «Servicios» + cómo funciona (Prototipo: `TLTiendaK.isSvc` en la pestaña). Tienda en línea / vendedor móvil = «Dónde vende». Sin feriados no elegidos. Triángulo (dash2-cat «Tallas y apartados»): + «Cambios con el recibo» (`dev` → `TLTienda.OPTS[id].dev`) y «Aceptas efectivo» (tag `efectivo`, también en `b._sh0` del envío); el envío se queda en Panel · Entrega (`shipK` de dash2-data, no se duplica). Demos Celulares y Más, Mueblería La Familia, Ferretería Central; Super Admin ve la herramienta siempre. Probado: cambios 7 días + sin efectivo → página y admin. Arreglado: `,,` al agregar negocios dejaba un hueco en `TLTiendaB.B` (rompía dash2-onb). Negocios nuevos: Pro Moda para Él y los Niños (Andrés Pichardo 7289737) · Casa Linda · Decoración y Cocina (Lissette Abreu 3767425) · Materiales y Vivero García (Daniela García 14661639) · PC Gamer Hazleton (Kevin Then 7285284) · Librería y Trofeos El Saber (Mario Lantigua 7841788); Free Música y Son · Instrumentos · Telas y Manualidades María · Mi Isla · Tienda en Línea (`k: 'online'`) · Don Pepe · Vendedor Móvil (`k: 'movil'`, zona 10). **Pendientes:** las fotos de los negocios nuevos son las de su subcategoría (`SUBPH`; falta pool propio); persona con foto: hecho el 29 oct para 5 (Ernesto Paz 6888761 · Zapatería El Paso, Ana Belén Mercedes 5934215 · Novias y Quinces Ana, Aurelio Matos 16319673 · Ferretería Central, Julio Benítez 8201189 · Joyería Oro Fino, Ramón Espinal 36753978 · Electro Hogar Caribe; `TLTienda.STAFF` en neg-tienda-data.js y bundle-1; respaldo `_tmp/rev-tienda/*-pre-staff.js`); faltan Fresh Kicks, Celulares y Más, Belleza Latina Supply y Juguetería Arcoíris (no hubo foto buena sin repetir). Respaldo `_tmp/rev-tienda/`. **Sigue:** 11 Transporte.
- **Hecho: 11 Transporte (28 oct).** `prototype/neg-trans-kind.js` (`TLTransK`, cargado en Prototipo, Super Admin y Panel v2; `post` en `lstBar` con `x.trans`): kind van · air · caja · mud · med · emp · taxi · courier · cdl · grua · renta · escolar; los Pro tenían el FAQ vacío → 4 preguntas por tipo (`b.fq` y Tu página ganan); «Servicios» en vez de «Del menú» y «Lo que vende»; «VERIFICADAS POR VIAJE»; reseñas por tipo cuando solo había la genérica «Cobró lo que dijo»; Free: barra «Llama para tu viaje / Llama para pedirlo / Ve directo» + HOY HASTA / VA HASTA / ABIERTO 24 HORAS, tarjeta de Hoy = DISPONIBLE · IDIOMA · PAGO o VA HASTA (sin «PRECIO Cerrado»); sin local (grúa, mensajería, fletes, CDL, escolar) = «Zona donde trabaja» + «Cómo trabaja»; 24 horas (`fix24`); Pro sin reserva = «Con cotización»; caja = SALE · día y semanas; médico con rampa = RAMPA; sin feriados no elegidos. Triángulo (dash2-cat «Salidas y asientos»): vans igual; los demás tipos = Disponible hoy, 24 horas, Rampa (médico/escolar), y caja: día de salida + LLEGA EN → tags, `b.sale`/`b.dias`, eta y FAQ; Super Admin ve la herramienta siempre. Demos Envíos Quisqueya Cargo, Mudanzas El Primo, Traslados Abuela. Probado: miércoles + 2 a 3 semanas + disponible hoy → página, FAQ y admin. Negocios nuevos (las 14 subcategorías sin negocio): Pro Rapidito Same Day · Mensajería y Compras (zona 20) · Keystone Hotshot y CDL (+ vehículos, maquinaria, botes; zona 300) · Renta de Camionetas y Remolques Hazleton; Free Transporte Escolar y de Trabajo Pasito · Reparto Express en Moto y Bici. Fotos revisadas a ojo, sin repetir (4440774, 28264496, 16094585, 6440089, 7362948). Limosina y party bus sigue en Fiestas. Verificador (28 oct): «1 FOTO» en singular (Prototipo `photoCount`); Renta de Camionetas con FAQ propio (`renta`: qué necesito, millas, enganche, devolver tarde) y línea «El precio de la renta es cerrado…». **Pendientes:** persona con foto: hecho el 29 oct para 6 (`ST` en neg-trans-listing.js y bundle-2, dentro de `reg`: Javier Almonte 5025632 · Van Express, Daisy Polanco 7843970 · Envíos Quisqueya, Wilson Cabrera 6868160 · Mudanzas El Primo, Felipe Reyes 8475194 · Taxi Latino, Kelvin Ureña 6868173 · Rapidito, Marcos Tavárez 6720527 · Keystone Hotshot; respaldo `_tmp/rev-trans/*-pre-staff.js`); faltan Aeropuerto Seguro, Traslados Abuela, Transporte a Almacenes y Renta de Camionetas; título de la herramienta por tipo (hecho 29 oct, `tT` en dash2-cat: vans «Salidas y asientos», caja «Salidas de la caja», los demás «Disponibilidad y servicio»); los 3 Pro nuevos ya tienen 3 fotos (29 oct: Rapidito + 5025516 · 13432255, Keystone + 37124290 · 9754798, Renta + 27522902 · 97079; respaldo `_tmp/rev-trans/*-pre-ph.js`). Respaldo `_tmp/rev-trans/`. **Sigue:** 12 Educación.
- **Hecho: 12 Educación (28 oct).** Persona con foto (29 oct, `ST` en neg-edu-listing.js y bundle, dentro de `reg`; respaldo `_tmp/rev-edu/*-pre-staff.js`): Laura Méndez 37827733 · Inglés para Todos, Óscar Villanueva 6325958 · Centro de Adultos, Daniel Ortiz 8197535 · Código Latino, Gabriela Sosa 8423062 · Rumbo a la Universidad, Andrés Mejía 8617942 · Tutores Sol, Marta Kowalczyk 39190891 · Instituto de Licencias, Yesenia Lugo 8466704 · Computación Fácil, Carolina Fuentes 7521282 · Voz y Rumbo; faltan CDL Keystone, Barbería Élite, Instituto de Salud, Baile Sabor, Oficios Luzerne, Negocios Latina y Bella Mirada. `prototype/neg-edu-kind.js` (`TLEduK`, cargado en Prototipo y Super Admin; `post` en `lstBar` con `TLEduK.isE` = `b.edu` sin ninos/dep/fe/inm/dealer): kind ingles · ciud · adultos · tutor · univ · cdl · belleza · salud · compu · negocio · lic · oficio · arte · coach; los Pro tenían FAQ vacío → 4 por tipo (matrícula, en línea, examen aparte; `b.fq` y Tu página ganan); reseñas por tipo cuando solo estaba la genérica «Explican con paciencia» (`b.rv` gana); «VERIFICADAS POR INSCRIPCIÓN» y tarjeta «VERIFICADA · INSCRIPCIÓN» (Prototipo `revCard`); «Cursos»/«Clases» en vez de «Del menú»; tarjeta de Hoy (`rb.tc.sub`, no `.s`) sin «la matrícula aparta tu cupo» donde no hay matrícula, HORARIO real (`horL`, fuera el «Mañana» por defecto), CÓMO (presencial/en línea/híbrido) en vez de «CERTIFICADO De la escuela»; arte · tutor · coach sin certificado (aspecto, nota, «¿QUÉ TE LLEVAS?» → experiencia / grados / primera sesión); nota «en línea en vivo»; «Desde $1,800» con coma; horario: sin feriados no elegidos, «Cena» → «Clases de noche». Free: «Llama para inscribirte» + HOY HASTA / ABRE EL SÁBADO, tarjeta HOY · CÓMO · IDIOMA; horarios propios (Cocina = fin de semana, Música tarde, Manejo 8–7, Glam 9–5). Arreglado: «Clase Clase A»; Baile y Tutores decían «Abierto» a las 12:30 (`open` fijo; dash2-pag lo restaura desde la fuente, por eso se cambió en neg-edu.js). Triángulo (dash2-cat «Grupos y cupos»): el panel llamaba «Libro y materiales aparte» a `mat` → «Matrícula · aparta el cupo»; + «Plan de pagos» por curso (`plan` → `it.plan`, tag plan), «Cómo das las clases» (presencial · en línea · híbrido · español → tags); `summary` lo dice; Super Admin ve la herramienta siempre. Demos Academia de Barbería Élite (curso + plan), Tutores Sol (hora), Academia de Baile Sabor (mes + clase). Probado: matrícula $250 + 6 pagos + en línea en el panel → página, tags y admin. Negocios nuevos (las 23 subcategorías sin negocio): Pro Centro de Educación para Adultos Hazleton (GED, básica, español) · Rumbo a la Universidad (SAT, FAFSA, becas) · Academia de Negocios Latina (impuestos, contabilidad, notario, finanzas) · Código Latino (programación, marketing) · Instituto de Licencias PA (bienes raíces, seguros) · Academia Bella Mirada (pestañas; aviso de licencia de PA) · Voz y Rumbo (oratoria, coaching); Free Escuela de Oficios del Valle (oficios, electricidad y plomería) · Alimentos Seguros Hazleton (ServSafe) · Taller Las Manos (arte, costura, fotografía). Fotos de `pexels-edu.json` sin usar, revisadas a ojo. **Pendientes:** persona con foto en los Pro de Educación (ninguno tiene; el dueño solo sale en el panel); el formulario de reseña sigue preguntando por el certificado en arte/coaching; el panel aún no edita qué certificado das ni lo que va aparte (solo lo muestra la ficha). Respaldo `_tmp/rev-edu/`. **Sigue:** 13 Niños.
- **Hecho: 13 Niños (28 oct).** `prototype/neg-ninos-kind.js` (`TLNinosK`, cargado en Prototipo, Super Admin y Panel v2; `post` en `lstBar` con `x.ninos`; ojo: la bandera de TLRev es `_nik` porque `_nk` ya la usa Noche): kind guard · casa · ninera · after · camp · clase · terapia · juego · fiesta · familia · svc; `care(b)` = guard · casa. La ficha venía del motor de Educación sin corregir: tarjeta de Hoy por tipo (EDADES · LICENCIA · SUBSIDIO / EDADES · HORARIO · PRIMERA CLASE / SEGURO · EVALUACIÓN / RECOGIDA), sin «matrícula» ni «libros y examen» ni «CERTIFICADO De la escuela»; pestaña «Programas»/«Clases»/«Servicios» (Prototipo `TLNinosK.tabL`); FAQ por tipo (estaba vacío); reseñas por tipo; «VERIFICADAS POR INSCRIPCIÓN» y tarjeta «VERIFICADA · INSCRIPCIÓN»; aspectos de niños (LICENCIA A LA VISTA solo con licencia, CUIDAN BIEN A LOS NIÑOS, TE CUENTAN CÓMO LE VA); «Gratis si calificas» en vez de «$0/mes»; horario de un tramo (fuera «Almuerzo 3–4 PM») y sin feriados no elegidos; barra «EDADES · …»; sin local (niñera, nana, animador, renta) = «Zona donde trabaja»; Free = «Llama para pedir cupo / Ve directo / Llama o pasa» + HOY HASTA. Datos: `open` según el horario (Karate, Natación, FC, Estrellas, Mini Sabor), Niñera Lucía 8 AM–11 PM y zona 10 (no 24 horas), edades en todos; Carmen y Estrellas cobran por semana. Triángulo (dash2-cat «Cupos y licencia»): guardería/casa sigue con cupos por edad (casa = un solo cupo hasta 6) + «Turno de noche» y el precio en el primer programa (antes buscaba «Guardería · tiempo completo»); los demás tipos usan los bloques de Educación (cupos por grupo, primera clase solo en clases, inscripción en vez de matrícula, sin plan de pagos) + «Lo que ofreces»: español, transporte (after/camp), Medicaid y CHIP (terapia/familia), «Espera para la evaluación» (terapia → `b.eta`); `summary` lo dice; Super Admin ve la herramienta siempre. Demos Karate Kids, Estrellas After School, Terapias Pasitos, Doña Carmen. Probado: espera 5 sem en Terapias y sin cupo + $190 + noche en Carmen → página y admin. Negocios nuevos (las 22 subcategorías sin negocio): Pro Head Start Hazleton (subsidiados, WIC, inscripción escolar) · Campamento Pocono Kids · Liga Infantil Hazleton (béisbol, básquetbol) · Pequeños Artistas (música, arte) · Nace (lactancia, clases para padres); Free Animaciones Mundo Mágico (fiestas infantiles; `payasita-chispita` ya existe en Fiestas) · Nana Maritza · Cool Kids Barbería Infantil · Fotos Pequeños Momentos · Bebé Viajero (renta) · Familias de Corazón (acogida y adopción). Fotos revisadas a ojo, sin repetir. **Pendientes:** persona con foto en los Pro de Niños; el formulario de reseña y el flujo de inscripción siguen con el «$0» de los programas gratis en la hoja; Cool Kids tiene foto en blanco y negro de un adulto (falta una de niño). Respaldo `_tmp/rev-ninos/`. **Sigue:** 14 Deporte.
- **Hecho: 14 Deporte (28 oct).** `prototype/neg-deporte-kind.js` (`TLDeporteK`, cargado en Prototipo tras neg-ninos-kind, Super Admin y Panel v2; `post` en `lstBar` como `DKk.post`; bandera TLRev `_dpk`; espera `_ek` solo si existe TLEduK): kind gym · trainer · box · clase · liga · cancha · visita · club · tiro · alberca · nutri (`b.k` lo fuerza); FAQ por tipo (contrato real, inscripción, primera clase, liga: depósito y fecha, techado sin «¿Y si llueve?»; `b.fq` gana); reseñas por tipo (`b.rv` gana); «VERIFICADAS POR INSCRIPCIÓN»; tarjeta de Hoy por tipo (CUOTA · CONTRATO · HORARIO / INSCRIPCIÓN HASTA · CUOTA · PARTIDOS); `fixOpen()` calcula `open` con hoy jue 12:30; Free con precios propios (X.MENU `FREE` en neg-deporte-listing) y «Ve directo / Llama»; club sin local = «Dónde salimos» (`b.meet`). La ficha lee `b.con` (meses), `b.cxl` ($ por salirte), `b.ins` (inscripción), tag `sincontrato`, `b.left`, tag `sueltos`. Triángulo (dash2-cat NEG-DEPORTE): membresía {contrato no|6|12, salirte, inscripción, mes y día desde el SVC real, primera gratis, guardería} · liga «Liga e inscripciones» {cuota, depósito, fecha límite, lugares, cancha por hora, sueltos}; `summary` por tipo; Super Admin ve la herramienta siempre; demos boxeo (Julio Batista), zumba (Yaritza Polanco), liga (Fernando Ureña). Negocios nuevos (22 subcategorías + grupo SUBG «Aire libre y aventura»): Pro Hierro CrossFit · Ritmo Spin · Cuerpo en Balance · Pilates (contrato 6 meses, nutrición sin consulta médica) · Dojo Hazleton adultos (karate, lucha; inscripción $40, contrato 3 meses) · Liga Latina de Básquet y Voleibol (+ flag football, techada) · Aqua Hazleton (alberca y clases); Free Club Ciclista Los Pedales (+ senderismo) · Hazleton Golf y Pickleball · Keystone Pesca y Campo de Tiro (no vende armas) · Aventura Pocono (paintball, go-karts) · Hielo y Ruedas (hielo, patinetas) · Escalada Vertical. Fotos revisadas a ojo, sin repetir. **Pendientes:** persona con foto en los Pro de Deporte (ninguno tiene; Power Gym = Anthony Guzmán, dueño del panel); Liga de Básquet con 1 sola foto; aspectos de la alberca dicen «ENTRENADORES QUE AYUDAN» (mejor «SALVAVIDAS»). Respaldo `_tmp/rev-dep/`. **Sigue:** 15 Iglesias (NEG-FE).
- **Hecho: 15 Iglesias (28 oct).** `prototype/neg-fe-kind.js` (`TLFeK`, cargado en Prototipo tras neg-deporte-kind, Super Admin y Panel v2; `post` en `lstBar` como `FeKk.post` (ojo: `FKk` ya es de Comida); bandera TLRev `_fek`, espera `_dpk`): kind misa · culto · grupo · sacr · consejo · fun · oracion · ayuda · tienda (`b.k` lo fuerza); `b.cul` = servicios de la semana [es, en, día 0–6, hora]; ítems con `fe` gratis | don (donativo sugerido) | tot (precio total) y `dur` [es, en]. Fuera lo de escuela (matrícula, certificado, «libros y examen», «Cursos», «$0 por clase», «60 SEMANAS · 60 H», «Inscribirme» para misa/despensa). Tarjeta de Hoy por tipo (PRÓXIMA MISA/SERVICIO · IDIOMA · AYUDA GRATIS; funeraria ATIENDE · PRECIO · REPATRIACIÓN o PLAN DE PAGOS; despensa HOY · PAPELES · COSTO); botones: servicio = «Ver horarios», sacramento = «Pedir fecha», funeraria = «Pedir información», despensa = «Ver la ayuda», línea de oración = «Llamar ahora»; Free = «Ve a misa / Ve al servicio / Ve directo» sin «Desde $»; FAQ y reseñas por tipo (mezquita, sinagoga, Testigos, SUD, ortodoxa = reseñas sobrias y pestaña «Servicios»; `b.fq`/`b.rv` ganan); solo la funeraria verifica («VERIFICADAS POR SERVICIO»); horario: oficina en un tramo, 24 h, sin feriados no elegidos; línea sin local = «Por teléfono y WhatsApp». Triángulo (dash2-cat NEG-FE por tipo, `FE0` para el panel sin TLAll): iglesia {cultos de la semana (MISA o CULTO), también en inglés, 6 ayudas, catecismo} → b.cul, st/eta, tags, primer servicio del SVC · despensa «La ayuda de hoy» {se acabó por hoy, sin papeles, ropa, cada cuánto} · funeraria «Precios y repatriación» {24 h, precio de cada servicio, plan de pagos, días a RD}; `summary` por tipo; Super Admin la ve siempre; demos Fuente de Vida, Despensa, Funeraria. Negocios nuevos (las 25 subcategorías): Pro Iglesia Metodista La Esperanza (damas, varones, escuela dominical) · Comunidad Cristiana Nueva Vida (no denominacional, recuperación, consejería) · Parroquia San Gabriel (quinceañera, bodas, comunión, bautizo con donativo) · Consejería Familiar Shalom · Cremación y Memorial del Valle · Capellanía y Línea de Oración Luz del Valle (24 h, sin local) · Ministerio Hispano de Ayuda al Inmigrante (no da consejo legal: representante acreditada DOJ; misiones, voluntariado); Free Salón del Reino · Capilla SUD · Iglesia Ortodoxa San Nicolás · Centro Islámico · Sinagoga Beth Shalom. Fotos revisadas a ojo, sin repetir (la funeraria usaba foto de boda). **Pendientes:** persona con foto en los Pro de Iglesias; tienda de artículos religiosos sin negocio (no está en SUBG); varios Pro con 1 sola foto (Shalom, Línea de oración). Respaldo `_tmp/rev-fe/`. **Sigue:** 16 Bienes Raíces.
- **Hecho: 16 Bienes Raíces (28 oct).** `prototype/neg-inm-kind.js` (`TLInmK`, cargado en Prototipo tras neg-fe-kind, Super Admin y Panel v2; `post` en `lstBar` como `ImKk.post`; bandera TLRev `_imk`, espera `_fek`; pestaña en Prototipo antes de `b.fe`): kind rent · cuarto · venta · hipo · serv · derechos · comercial · alm (`b.k` lo fuerza); ítem `t` renta | venta | gratis | tot, `cuota`, `u` (unidad). Fuera lo de escuela (matrícula, certificado, «Cursos», «Inscribirme», «Desde $0/$4», «inscripciones», aspectos de maestros → LA PROPIEDAD COMO EN LAS FOTOS · EXPLICAN CADA PASO · ARREGLAN A TIEMPO / SIN SORPRESAS). Tarjeta de Hoy por tipo (PARA MUDARTE · REQUISITOS · DISPONIBLES / AL MES · INCLUYE · LIBRE / PRECIO · CUOTA ESTIMADA · ITIN / PRECALIFICACIÓN · ENGANCHE · LICENCIA NMLS / PRECIO · LISTO EN · IDIOMA / DESDE · CONTRATO · HOY / DESDE · ACCESO · CONTRATO); botones Pedir visita · Ver casas · Pedir precalificación · Pedir cotización · Pedir oferta (compradores en efectivo); FAQ y reseñas por tipo (`b.fq`/`b.rv` ganan); «VERIFICADAS POR VISITA O CITA»; horario de oficina en un tramo, sin feriados no elegidos; Doña Mary sin dirección = zona 3 mi y «LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA». Triángulo (dash2-cat NEG-INMUEBLE por tipo, `INM0` para el panel sin TLAll; si no hay BIZ el estado sale del SVC): rentas igual (disponibles = `b.disp`, eta solo rentas) · venta «Casas en venta» {en venta/vendida, precio, cuota estimada, comprador sin comisión, ITIN} · hipoteca «Préstamos y requisitos» {ITIN, enganche 3.5/10/15/20 %, días para precalificar; NMLS fijo} · cuartos {libre desde, utilidades, amueblado, sin SSN} · servicios/locales: precio y disponible; `summary` por tipo; Super Admin la ve siempre; demos Realty (Carolina Peña), Hipotecas (Óscar Medrano), Doña Mary (Mary Santana). Probado: precio $164,000 + cuota $1,320, enganche 3.5 % en 1 día, libre 15 oct, casa rentada + renta $1,100 → página y admin. Negocios nuevos (las ~33 subcategorías): Pro Casa Propia Agentes (inmobiliario, comprador, vendedor, condominios) · Valle Nuevo (obra nueva, terrenos, rural) · Mountain View Casas Móviles (+ parque) · Keystone Inspección, Avalúo y Cierre · Vivienda Accesible (Section 8, mayores) · Amueblados Hazleton (renta corta, opción a compra) · Servicios para Propietarios PA (+ HOA) · Compramos Tu Casa (efectivo, venta corta, multifamiliar, grupo de inversión; dice «compárala con un agente») · Keystone Bodegas, Cocina y Espacios (bodega industrial, cocina comercial, eventos, comercial en venta); Free Almacenaje Hazleton (bodegas, estacionamiento) · Lente Casa (fotografía, ambientación). Fotos revisadas a ojo, sin repetir. **Pendientes:** persona con foto en los Pro de Bienes Raíces; Mountain View no tiene foto de casa móvil real (usa vista aérea); Almacenaje con 1 foto de cajas. Respaldo `_tmp/rev-inm/`. **Sigue:** 17 Venta de Autos.
- **Hecho: 17 Venta de Autos (28 oct).** `prototype/neg-dealer-kind.js` (`TLDealerK`, cargado en Prototipo tras neg-inm-kind, Super Admin y Panel v2; `post` en `lstBar` como `DlKk.post`; bandera TLRev `_dlk`, espera `_imk`; pestaña en Prototipo antes de `b.inm`): kind lot · new · bhph · work · moto · rv · lux · salv · mayor · broker (venden; `sells(b)`) y cash · placas · fin · taller · envio (servicios); `b.k` lo fuerza. Total en la puerta = precio + 6 % + placas $150 + cargo del dealer (sale de `it.d`, `otd(it)`). Fuera lo de escuela (Inscribirme, Cursos, matrícula, certificado, «Desde $4», aspectos de maestros → EL CARRO COMO LO DESCRIBIERON · EXPLICAN EL FINANCIAMIENTO · SIN CARGOS SORPRESA). Tarjeta de Hoy por tipo (EN LA PUERTA · CON ITIN · GARANTÍA / ENGANCHE · PAGO · CRÉDITO / PRÓXIMA SUBASTA · TARIFA · ABIERTA / OFERTA · PAGO · GRÚA GRATIS / PRECALIFICACIÓN · CON ITIN · IDIOMA …); botón Prueba de manejo · Pedir oferta · Pedir precalificación · Pedir cita; FAQ y reseñas por tipo (`b.fq`/`b.rv` ganan); «VERIFICADAS POR PRUEBA DE MANEJO O CITA»; horario en un tramo sin feriados no elegidos; Compramos Tu Carro y Carros por Dueño sin local = zona. Datos del negocio: `eng`, `gar` [es, en], `wk`, `mo`, `days`, `zone`, `next`, `bfee`, tags casa · reporta · flota · publica. Triángulo (dash2-cat NEG-DEALER, `DL0` para el panel sin TLAll; carros del BIZ o del SVC): ITIN + enganche, carros a cambio, prueba en casa, garantía (como está / 3 / 6 meses), cargo del dealer (reescribe «en la puerta» de cada carro), carros en el lote (antes 38 fijo para todos), vendidos y precio; compre aquí: enganche, pago a la semana, meses, reporta al crédito (reescribe «Total pagado»); `summary`; Super Admin la ve siempre; demos Keystone Trucks (Mike Romero) y Compre Aquí (Danilo Reyes). Probado: El Cibao enganche $2,000 + 6 meses + cargo $299 + Camry vendido + Civic $11,500; Keystone ITIN + como está + 12 en el lote; Compre Aquí $1,200 + $85 × 24 meses + reporta → página y admin. Negocios nuevos (las 30 subcategorías sin negocio): Pro Valle Motors (nuevos, certificados, prueba en casa) · Primer Carro (primer comprador, garantía extendida, GAP) · Power Sports Hazleton (motos, cuatrimotos, scooters) · Lake Harmony (botes, campers, carritos de golf) · Comercial Keystone (trabajo, caja, flotas) · Clásicos y Lujo del Valle (+ consignación) · Servicio del Valle (taller) · Envíos de Carros Quisqueya (exportación a RD); Free Subasta Keystone (subasta, mayorista, salvage) · Remolques y Tráileres PA · Lote Independiente La 81 (+ vans) · Carros por Dueño (dueño, broker, avalúo). Fotos revisadas a ojo, sin repetir. **Pendientes:** persona con foto en los Pro de Venta de Autos; Lake Harmony sin foto de carrito de golf (usa campo de golf); Primer Carro y Comercial Keystone con 1 sola foto. Respaldo `_tmp/rev-dealer/`.
- **Siguen (orden del plan, el usuario dice cuál):** 3 Comida (NEG-FOOD) · 4 Hogar (NEG-HOGAR) · 5 Noche · 6 Mercados · 7 Fiestas · 8 Doctores (NEG-SALUD) ·
  9 Profesionales (NEG-PRO) · 10 Tiendas · 11 Transporte · 12 Educación · 13 Niños · 14 Deporte · 15 Iglesias (NEG-FE) · 16 Bienes Raíces · 17 Venta de Autos.
  Archivos por categoría: `prototype/neg-{cat}.js` (negocios), `neg-{cat}-listing.js` (ficha), `-flow`/`-book`/`-rev` si existen; panel = `dash2-cat.js` (herramienta
  por categoría y demos) + `dash2-*.js`; admin = `To'Latino Super Admin.dc.html`.
- **Cómo revisar en pantalla (lo que funcionó):** `show_to_user` del Prototipo, luego `save_screenshot` con pasos que hacen
  `__tlProto.nav({ code: b.pro ? 'APP-NEG-LISTING-PRO' : 'APP-NEG-LISTING-FREE', biz })` y `console.log` del `innerText` de `[data-desk-frame]`; leer con
  `get_webview_logs`. Panel: `__d2.set({ biz })` + `__d2.go('DASH-MODULOS', { sub })`. Guardar la ruta (`tl-proto-route-v1`) y devolverla al final; para probar
  `tl-dash2-v1` / `tl-adm-v1` guardar el valor antes y volver a ponerlo (nunca borrar claves). Comprobar sintaxis con `new Function(código)` antes de guardar.
- **Ojo con los bundles:** `bundle-N.js` ya no es la concatenación exacta; editar la fuente y reemplazar su texto entero dentro del bundle (ver
  `prototype/bundles.json` para saber en cuál está). dash2-*.js no están en bundles.
- **Pendientes de Belleza cerrados (27 oct):** fotos de personas revisadas a ojo (Luz → 13781166 y Nathaly → 38468701 porque 11876024/6954000 eran fotos de
  dos personas; Yokasta 7593048 y Wander 7005734 se quedan) + persona en Láser (Marta, 20788693), Manos de Ángel (Ángel, 33278910), Drenaje (Altagracia,
  36659397), Naturales (Doña Mercedes, 16817337) y los 7 Free en neg-free-staff (Nayeli 27586889, Marisol 32113976, Rubén 40290663, Daniela 28386407, Rosanna
  16837811, Kenia 35511776, Don Teo 9068445); ninguna repetida. **Opciones desde el panel:** Servicios · servicio → OPCIONES · EL CLIENTE ELIGE UNA (hasta 3
  grupos × 5 opciones, cada una con ± precio y ± minutos; «Para guardar falta» si un grupo no tiene nombre o tiene < 2) → `svcs[].opts` → `TLSvc.book` escribe
  `TLBook.OPT[nombre]` (y lo devuelve a la base al borrar, `OPTSET`); `TLSvc.of` llena las de base desde `TLBook._opt0` o `OPTB` (panel suelto); el admin las
  ve en Lo que vende · Servicios. **Staff → Servicios:** quien está aceptado en Staff (`over.team` st 'ok') y no está en Servicios entra como `fromTeam`
  («NUEVO · ENTRÓ DESDE STAFF», sin precios o sin servicios marcados); `CFG.stf` ahora busca a cada persona por nombre en `TLListing.STAFF` (antes por
  posición). Respaldo `_tmp/rev-bell/p4-*`, `p5-*`. **Ojo al probar:** si un paso falla a mitad, la clave queda escrita; restaurar en `finally`.

## 0a. RETOMAR (anterior · 25 oct)
- **En curso (E5 · revisión del Panel v2, sección por sección):** cada revisión sigue las dos reglas del usuario del 25 oct (§2): **triángulo
  de sincronización** (panel → página · admin → panel y página · panel → admin) y **revisión profunda para el lanzamiento** (opción por opción,
  comparar con el plan, construir lo que falte, casos límite, pendientes dichos). Detalle de lo hecho en §2d.
  **Hecho:** Lo que vendes · Menú (Platos, Categorías, Opciones, Inventario, Horarios + triángulo) y Reservaciones (revisiones 1–3 +
  llegada/no llegó al cliente + feriados con fecha), Pedidos en línea + Entrega (25 oct, `TLPed`), Eventos (25 oct, `TLEvP`), Staff (26 oct, `TLStf`), Novedades (26 oct, `TLNovP`), Jobs (26 oct, `TLJobP`) y Relacionados (26 oct, `TLRelP`). Tu página, Hoy, Clientes y Mensajes (26 oct). Cobros y plan + Ajustes (26 oct, `TLPayP`). **Sigue:** las secciones que quedan del panel (Insights, Moderadores, Más) con el mismo método y
  ver en pantalla lo pendiente de Hoy/Clientes/Mensajes. **Pendiente del sistema (SINCRONIZAR):** HoursPro muestra la caja «Próximos cambios» aunque esté vacía.
  **Pendientes de Pedidos/Entrega:** Envío por correo se configura pero la Tienda del cliente aún no lo lee (revisar con Tienda); «Horario
  distinto para…» de Tu página · Horario (`byMod/modOff`) no lo lee el cliente (revisar con Tu página); enlace de seguimiento de la app externa
  en cada pedido (revisar con Hoy); el cliente de prueba vive fijo a 1.2 mi (sin libreta de direcciones real).
  **Pendientes de Eventos:** lista de espera real cuando se llena (hoy «Avísame» solo avisa); el portero real usa la app de check-in (CHK, sin
  pantalla en el prototipo); vender por la app las cortesías a promotores (hoy solo códigos); el admin aún no edita el formato del evento.
  Prototipo «hoy» = jue 24 sep 2026, 12:30 PM.

## 0b. RETOMAR (anterior · 22 oct)
- **Hecho:** todos los pendientes P1–P14 y M1–M4 de `To'Latino Pendientes.dc.html` (detalle de cada uno en §2b). V1 = las 17 categorías completas,
  cliente + panel + Super Admin, nada a medias (decisión del 20 oct). M1 = herramienta propia de las 17 categorías en Panel v2 · «Lo que vendes ·
  Tu herramienta» (`prototype/dash2-cat.js`, `TLDashCat`), con un negocio demo por categoría en el selector del panel.
- **Bloque E · entrega:** **E1 hecho (22 oct)** patrones aprobados 2r, 2z–2aq → componentes del sistema (E1a–E1d en pantalla;
  SINCRONIZAR 25 y 26 aplicados por el usuario, bundle copiado, puente quitado; método en `_tmp/e1-notas.md`) · **E2 modelo de datos hecho**
  (`To'Latino Modelo de datos.dc.html`; D1–D5 aplicadas el 22 oct) · **E3 (A13) solo del prototipo hecho** (`To'Latino Solo del
  prototipo.dc.html`; D6 aplicada) · **E4 (A14) hecho (22 oct)**: lo viejo en `_tmp/archivo/` (ver §2b).
- **Sigue:** E5 ajustes de diseño del usuario. SINCRONIZAR 29 **aplicado** (23 oct). SINCRONIZAR 27 y 28 **aplicados** (comprobado 23 oct: readme con 2ar/2as/2at,
  master con 2ar · 2as · 2at y `patrones/19–21`, bundle con ParchisTable; bundle local = el del sistema). Nota: la búsqueda dentro del proyecto
  del sistema no responde bien; para comprobar, leer los archivos o copiarlos a `_tmp/`. Y E5 ajustes de diseño del usuario
  (antes del primer paquete a Claude Code; luego SINCRONIZAR con el sistema, §2a).
- **Al empezar:** leer este archivo completo y `To'Latino Pendientes.dc.html`; respaldos de cada etapa en `_tmp/`. Revisar con el verificador
  antes de dar algo por hecho. Resumen al usuario: corto, qué se hizo y qué sigue.

## 2d. E5 · ajustes del usuario
- **Publicar novedad v2 (24 oct, Panel v2 · `det nov:new|edit:id`):** tipo con explicación · FOTOS hasta 4 (subir de verdad
  `novUp` → JPEG 900 px dataURL, o «Elegir de tu galería»; tocar = Hacer portada / Quitar) · título + texto 280 · por tipo: oferta
  (qué está en oferta + precio normal/oferta con % ahorro), cupón (código, mínimo, usos), encuesta (2–4 opciones), aviso (día, qué
  pasa, horario; enlace a Horario) · EL BOTÓN para oferta/hoy/novedad: sin botón · algo que vendes (lista con búsqueda) · menú/
  catálogo · evento · vacante · llamar · escribir · enlace web https · quién lo ve (todos | solo seguidores) · avisar a seguidores ·
  vence · programar (día + hora) · **vista previa en vivo** (bloque `nprev` = PostCard, también en el detalle publicado). Guarda en
  `over.nov[]`: `phs, lk, item+itS, evt+evS, job+jbS, url, code, min, uses, o1–o4, day, hrs, hrsT, aud, push, pday, ptime`.
  Prototipo · Novedades lo lee (`ovN`: fotos `phU`, ítem `itS`, botón genérico `p.dash.lk`, solo seguidores); arreglado
  `name="p.lkIc"`. Super Admin · Negocio · Contenido lista las del panel con fotos/botón (`novP`).
- **Menú · Platos revisado (25 oct, Panel v2):** pestañas con ícono (`utabs`) · fila solo con excepciones (fuera «CON OPCIONES» y
  «N PEDIDOS · 30 D»; sin duplicar QUEDAN) · «Ordenar» por categoría (`ui.mOrdC`, `mMove` → orden de `items` = orden en el menú del
  cliente) · editor: fotos reales (`novUp(F, 5, 640)`) + «Elegir de tu galería»; EN INGLÉS con «Traducir con El Compa» (`mTr`,
  `window.claude`); precio sin contador; contadores tecleables (`F.step(..., { typ, unit })`); grupo de opciones = fila que abre el
  grupo + Subir · Quitar de este plato; «Para guardar falta: …»; Quitar con confirmación (`ui.mDel`); Nueva categoría / Crear o
  editar grupo vuelven al plato con lo nuevo puesto (`ui.mRet`, `mRetSet`, `mItemBase`). `P()` de `dash2-data`, `neg-menu` y
  `bundle-3` acepta `data:`/`https:`. Respaldo `_tmp/rev-platos/`. Después (25 oct): Delivery y Pickup = dos interruptores con
  «Solo pickup/Solo delivery» explicado; plato nuevo muestra solo fotos, nombre, categoría y precio + fila «Más ajustes» (`ui.mMore`);
  «Quitar grupo» pide confirmar con cuántos platos lo usan (`ui.mGDel`).
- **Menú · Categorías revisado (25 oct, Panel v2):** fila con foto del primer plato, «N platos» y solo excepciones (VACÍA · NO SALE
  EN TU MENÚ, OCULTA, su horario); fuera la nota de abajo. Horario propio de verdad (categoría y plato): `avail: 'own'` + `av {f, t
  (min), d [0–6]}` con Desde/Hasta en pasos de 30 min y días; los viejos almuerzo/cena/finde se convierten en `mm()` (`mAvB`,
  `mAvL(k, short, av)`, `mTl`, `mAvDef`). Editor: EN INGLÉS con «Traducir con El Compa»; «Quitar categoría» siempre, y si tiene platos
  pregunta a cuál pasan (`ui.mCDel`, `ui.mCTo`). Abrir un plato o «Agregar plato» desde la categoría vuelve a la categoría (`mRet`
  con `up`, se encadena). El menú del cliente aplica el horario (25 oct): `TLMenu.hrs(avail, av, catCfg, ahora)` en `neg-menu.js` y
  `bundle-3` (hoy jue 12:30 PM, `DOW` 4) → `menuLive` marca `hrsOff` (sin +) y `hrsL` (DESDE 4 PM · HASTA 4 PM · SÁB Y DOM) en el plato
  con horario propio; la categoría lleva la nota. Super Admin · Lo que vende usa `TLMenu.hrsLive(id)`. Respaldo `_tmp/rev-cats/`.
- **Menú · Opciones revisado (25 oct, Panel v2):** lista sin nota; fila = opciones con precio («y N más») + OBLIGATORIO · ELIGE 1 · EN N
  PLATOS; etiqueta solo excepción (N AGOTADAS · TODAS AGOTADAS · SIN USAR). Editor: «Puede elegir hasta» tecleable con tope = nº de
  opciones (círculos/casillas explicado), opción abierta con Listo · Agregar otra · Subir · Bajar · Quitar; EN INGLÉS del grupo + todas
  sus opciones con «Traducir con El Compa» (`mTrG`); SE USA EN por categoría; «Para guardar falta»; Duplicar. **El cliente ahora lee los
  grupos del panel:** `menuG(TM, ov)` en el Prototipo (over.mgroups o base de `dash2-menu.js`, ahora cargado) → nombre, reglas, precios,
  grupos nuevos; opción agotada = «· agotada» sin poder elegir; obligatorio con todas agotadas = plato sin +; «ELIGE HASTA N».
  Respaldo `_tmp/rev-opc/`.
- **Menú · Inventario revisado (25 oct, Panel v2):** agotado ahora = platos y debajo OPCIONES (ícono filter); LO QUE CUENTAS: «De 40 ·
  vuelve a 40 a las 6 AM» / «En stock · vuelve cuando repongas», etiqueta QUEDAN POCOS (el número ya está en el contador); «Contar otro
  plato» = Por día · En stock; fuera la nota de abajo. **El cliente lo lee:** `menuLive` pasa `left` (si se cuenta) y `maxQ`; QUEDAN N
  en rojo cuando `left ≤ menuCfg.low`; `capOf` en `push` y en el + de la hoja → «Solo quedan N.» / «Máximo N por pedido.». El pedido
  enviado descuenta (`stockTake(bid, cart, ±1)` en el Prototipo → `over.items[].left`; en 0 = agotado hoy `agoBy: 'stock'`; cancelar lo
  devuelve). Respaldo `_tmp/rev-inv/`.
- **Menú · Horarios revisado (25 oct, Panel v2):** pausa con «Reanudar ahora»; «Tu horario» = horas de hoy; fuera la nota de abajo.
  **El cliente lo lee:** «Mucho trabajo» suma a pickup y delivery (`B.pickup/delivery + busy`) y «Último pedido en línea» corta
  `canOrd` (`B.lastAt = closes − last/60`). Respaldo `_tmp/rev-hrs/`.
- **Menú · triángulo comprobado (25 oct):** panel → página: apagar «Menú» en Lo que vendes quita la pestaña; apagar «Pedidos en línea»
  deja el menú sin poder pedir (`B.ordOff`, «Sin pedidos en línea · llama o pasa por el local»; el panel lo avisa con «Encender»).
  Admin → página y panel: Menú y Pedidos en línea ahora se pausan desde Negocio · Lo que vende (`wired` + menu, pedidos); plato oculto
  (`itemOff`) sale en el panel como OCULTO POR TO'LATINO (fila, aviso arriba y en el editor; `admItem`, `admMod`). Panel → admin: el
  menú del Super Admin se arma con lo que dejó el dueño (`tl-dash2-v1`: nombre, precio, foto, agotado, solo catálogo, quedan, horario,
  categoría oculta, pausa de pedidos), ya no con la carta de ejemplo. Respaldo `_tmp/rev-menu-tri/`.
- **Reservaciones revisado (25 oct, Panel v2 · Lo que vendes):** form propio `rsv:id` → `modCfg.rsv { maxP, tables, areas salon|terraza|barra,
  sv { almuerzo|cena: { on, f, t } }, tol, cxH, minH, maxD, resp }` (lo viejo `turnos`/`adentro` se convierte). Pantalla: fila «Solicitudes de
  mesa» → Hoy · MESAS (personas y mesas tecleables, áreas) · TURNOS con primera/última mesa · REGLAS · «Así lo ve el cliente» · «Para guardar
  falta». **El cliente lo lee:** `TLRsv.cfg(id)` en `neg-rsv.js` y `bundle-3` (todas las `RV.CFG[…]` del Prototipo pasan por ahí; mesas por turno
  sube lo lleno, `minH`, `maxD` = días del selector). Super Admin · Lo que vende arreglado (leía `TLRsv.CFG` entero) + mesas, horas y
  anticipación. Triángulo (25 oct): apagar Reservaciones en el panel (`over.mods`) quita la pestaña del listing; si To'Latino la
  pausa (`tl-adm-v1.biz[id].modOff`), el panel lo dice en la fila del módulo y en la pantalla (`admMod`); el Super Admin muestra
  «Apagado por el dueño» (`ownOff`). Vale para todos los módulos con pausa del admin (rsv · eventos · nov · jobs). Respaldo `_tmp/rev-rsv/`.
  **Revisión 2 (25 oct):** mesas por área de verdad: `ar { salon|terraza|barra: { on, t: { 2|4|6|8: n } } }` (fila por área con total de
  mesas y personas; se abre con contadores tecleables) · «Mesas que no se reservan» (`walk`, para los que llegan) · GRUPOS: «Juntamos mesas»
  + «Grupos de hasta» (`join`, `joinMax`; sin juntar = la mesa más grande) · DÍAS (`days`, 0 = dom; por defecto los días abiertos del
  horario, aviso si eliges uno cerrado) · avisos si la primera mesa es antes de abrir, la última + duración pasa del cierre o los turnos se
  cruzan · «Cada reservación dura» (`dur` 1 · 1.5 · 2 h) · «Aviso para cancelar o cambiar» · hasta 1 mes. Se guarda también `maxP`,
  `tables`, `areas` derivados. Cliente: `TLRsv.cfg` arma `fit` por área; `freeA` solo da mesa en el área si hay mesa del tamaño (o juntan
  mesas), resta `walk` y la duración baja la disponibilidad; `open` respeta `days`; política con «La mesa es tuya por …». Super Admin:
  grupos de hasta, mesas por área, días y duración. Respaldo `_tmp/rev-rsv2/`.
  **Revisión 3 · profunda (25 oct):** el cliente respeta el horario del negocio (`HRS`: over.hours o base de dash2-data; día cerrado no se
  reserva, cada mesa cabe en el horario de ese día con su duración: `inH`; lunes de Sabor ya no sale) · «Días sin reservaciones» (`blk [{ d,
  sv all|almuerzo|cena, ar all|área }]`, para evento privado, feriado o mal tiempo; `freeA` lo respeta) · «Confirmar al instante si hay mesa»
  (`auto`, apagado por defecto como D4; el cliente queda `st: 'ok'` sin esperar y los textos dicen «se confirma al instante») · panel: lista
  RESERVACIONES con Confirmar/Otra hora/No hay mesa ahí mismo; ficha con «Llegaron · en su mesa» → «Se fueron · mesa libre» y «No llegaron»
  (`nos`, NO LLEGÓ); avisos por día cuando el horario corta un turno. Arreglado: `answer()` mandaba «rechaza» al cliente en estados que no son
  respuesta (en atención, terminado, precio enviado) → ahora solo ok/alt/no/sent y solo si estaba pendiente. Super Admin: CONFIRMA y DÍAS SIN
  RESERVACIONES. Respaldo `_tmp/rev-rsv3/`.
  **Pendientes cerrados (25 oct):** llegada/no llegó llega al cliente: el panel manda `api.respond(key, id, llego|fin|nollego)` →
  `dashRespond` pone `rsvs[].st` seat · done · noshow → estado de la reservación (EN TU MESA · TERMINADA · NO LLEGASTE, sin cargo), Mi cuenta
  (EN CURSO · TERMINADA · NO LLEGASTE, `citaTag.nos`) y vuelve al panel (`dashLive` → in · done · nos). Feriados con fecha: `TLDash2.HOLD`
  (raza 12 oct cierra 6 PM · thx · nav · vac · rey; HOLI suma «raza», base de Sabor `sched: raza, thx, nav`) → «Próximos cambios» de la página
  sale de lo que el dueño marca en Tu página · Horario (`hoursPro` en neg-listing y bundle-3; sin feriados = «Sin cambios programados»),
  Reservaciones cierra o recorta ese día (`HOLS`, `hOf`) y el Super Admin · Ficha lista los feriados elegidos. Pendiente del sistema: el
  componente HoursPro muestra la caja «Próximos cambios» aunque esté vacía (SINCRONIZAR). Respaldo `_tmp/rev-rsv4/`.
- **Pedidos en línea + Entrega revisados (25 oct, Panel v2 · Lo que vendes · `pedBlocks` y DASH-ENTREGA `dlvBlocks`):** una sola lectura
  `window.TLPed` en `dash2-data.js` (`cfg(id, ov)` = over.dlv + over.modCfg.pedidos + menuCfg + pausa del admin → modos con forma de pago,
  `pk`, `dl`, `dlvTo`, `out`; `sum()` para El Compa; `HOME` = cliente de prueba a 1.2 mi). Pedidos en línea: pedidos del día con Aceptar,
  HOY (estado, pausa compartida `mPauseB`, enlace a Menú · Horarios; sin Menú, mucho trabajo y último pedido ahí), preparación tecleable
  (única: `dlv.prep`; antes estaba doble), programados, **aceptar al instante** (apagado por defecto), **cómo te pagan** (tarjeta exige Stripe,
  efectivo al recoger, efectivo al entregar —no con app externa—), propina, reglas fijas (10 % solo con tarjeta), «Así lo ve el cliente»,
  «Para guardar falta». Entrega: delivery/pickup (envío solo con Tienda o Renta), cómo se recoge, zona con pueblos, costo, gratis desde,
  mínimo de delivery, tiempo de camino, último delivery, quién entrega (equipo · DoorDash/Uber Eats/otra; «To'Latino · pronto» quitado:
  el plan lo deja oculto por flag), repartidores con Invitar (`rider:new`, SMS con código) y ficha (`rider:Nombre`: entregas, efectivo,
  quitar con confirmación). **El cliente lo lee** (Sabor): modos, tiempos, costo, gratis desde, mínimo («Delivery desde $15: te faltan…»),
  fuera de zona («No llega a tu dirección · pide pickup»), plato solo pickup/delivery (`it.ch`, SOLO PICKUP), programados, último delivery,
  propina, efectivo en el pago («Pagas $X en efectivo al recoger»), aceptado al instante (`oStage` 1), app externa en el seguimiento, cómo se
  recoge; tarjetas y ficha (`eta`, `fee`, etiquetas) vía `TLReg`. **Admin:** Negocio · Lo que vende muestra todo esto y **pausa solo el
  delivery** (`modOff.dlv`; el panel lo avisa). El Compa contesta con `entregaYPago`. Modelo de datos: DeliverySettings ampliado.
  Respaldo `_tmp/rev-ped/`.
- **Eventos revisado (25 oct, Panel v2 · DASH-EVENTOS):** una sola fuente `window.TLEvP` en `prototype/dash2-evt.js` (cargado en Panel, Prototipo,
  Eventos y Super Admin después de evt-data/dash2-data/dash2-cat): `over[id].evts` (forma v2) o la base de TLEvt; `sync()` reescribe
  `TLEvt.E` (sin borradores; cancelados en `TLEvt.CX`; sin los negocios con Eventos apagado por el dueño o pausado por el admin) vía TLReg,
  `storage` y `Eventos.X()`. **No todos los negocios hacen el mismo evento:** `CAT` da los formatos por categoría (Noche → fiesta/show, comida,
  clase, comunitario · Comida → comida, fiesta, clase, comunitario · Iglesias → culto/vigilia/retiro, comunitario · Educación/Niños → clase, comunitario · Deporte →
  comunitario, clase · Fiestas → fiesta, comunitario · resto → comunitario, clase) y `FMT` qué campos y palabras trae cada uno (fiesta: boletos,
  mesas con consumo mínimo y depósito, extras/botellas, line-up, música, 18+/21+, vestimenta, reglas de puerta · comida: RSVP con personas,
  «la comida se paga en el local», programa · clase: cupo pagado o gratis, materiales · culto: RSVP con personas, cuidado de niños, programa,
  inscripción para retiros · comunitario: gratis, para toda la familia). Panel: lista Próximos/Borradores/Cancelados + «Lo que puedes
  publicar» por formato; ficha con KPI (vendido/van, mesas, $, adentro), modo puerta (boletos reales de `tl-evt-v2`, cortesías y ejemplo),
  apagar un tipo de boleto, compradores/quién va, cortesías (`evc:`), códigos de descuento (`evk:`), porteros, reglas de puerta, pausar venta,
  cambiar fecha (con boletos vendidos guarda `moved` y avisa), cancelar con motivo (devolución total), repetir otro día (borrador +7 días),
  borrador → publicar; editor por formato con cartel y fotos reales (`novUp`), EN con «Traducir con El Compa» (`evTr`), día/horas/puertas,
  mi local u otro lugar, entrada gratis o pagada, «Así lo ve el cliente», reglas fijas (5 % + $1 por boleto; D1 sin venta en la puerta),
  «Para guardar falta». **El cliente lo lee** (APP-EVT-LISTING): página oscura solo para fiesta/show, clara para los demás (`ls.th`), rótulos
  por formato (Line-up/Programa, Boletos/Cupos/Inscripción, El ambiente/Fotos), descripción, vestimenta, etiquetas (CUIDADO DE NIÑOS, PARA TODA
  LA FAMILIA), «¿Cuántos van?» en el RSVP (`rsvp.n`), cupo y «Cupo lleno», agotado, venta pausada, venta cerrada (`until`), cambio de fecha,
  cancelado; máximo por persona y códigos del negocio en Boletos; la orden guarda `tks` para que el panel cuente lo vendido. Admin: ocultar
  o cancelar (tl-adm-v1.evt) sale en el panel como OCULTO/CANCELADO POR TO'LATINO. Base nueva: Parroquia Santa María (vigilia gratis con
  cuidado de niños + retiro con inscripción) e Inglés Para Todos (taller gratis con cupo). Modelo de datos: Event ampliado. Respaldo `_tmp/rev-evt/`.
  **Calendario y eventos que se repiten (25 oct, pedido del usuario):** en el editor, «Día» es un calendario de mes (bloque `cal`, `evCalB`: ‹ ›
  hasta 6 meses, hoy con anillo, fecha elegida en ink, fechas de la serie en Action, punto ámbar = otro evento tuyo ese día, gris = cerrado según tu
  horario; tocar una fecha de la serie la salta, con boletos vendidos no se puede). «Se repite»: no · cada semana (con «Qué días», varios) · cada 2
  semanas · cada mes (el n-ésimo o último día de la semana) + «Cuántas fechas»; `rep {k none|w|2w|m, days, n, skip}`; `TLEvP.occ/repL/oidOf`.
  `sync()` expande la serie: la próxima fecha en `TLEvt.E` (lista y búsqueda sin duplicados) y las demás en `TLEvt.OCC` (id `base@día`, cada
  una con sus boletos/cupo; `calc(r, oid)`), `byId` busca en las tres. Ficha del evento: etiqueta «CADA JUEVES» y «FECHAS · …» para cambiar de
  fecha. Panel: fila con «Cada jueves», ficha con «FECHAS» (vendido por fecha, Saltar / Volver a ponerla). Base: Jueves de Bachata (cada jueves ·
  8), Sancocho del domingo (cada domingo · 6), Vigilia (el último sábado de cada mes · 4). Respaldo `_tmp/rev-evt/` (pre-cal).
  **Varios días seguidos (25 oct, pedido del usuario):** DURACIÓN = Un día · Varios días seguidos (2–14, `span`) · Se repite (no se combinan). El calendario
  marca el rango; «Horario distinto cada día» (`dh[j]`, el día 1 usa h0/h1; `evDaysB`); cada boleto «Vale para» todos los días (pase, `dy null`) o un
  día (`dy`); «Crear un boleto por cada día + pase» (pase −20 %); aforo por día (`dcap`); line-up/programa con día; «Para guardar falta» si un
  día queda sin boleto. Ficha del panel: POR DÍA (cuántos van cada día). Modo puerta: eliges el día; el pase entra una vez por día, el boleto de
  otro día sale «ES DE OTRO DÍA» (`chk[].dy`). Cliente: «VIE 9 OCT – DOM 11 OCT · 3 DÍAS», bloque DÍAS Y HORARIO, boletos con «Vale solo el…»,
  programa por día, filtros Hoy/Finde por rango. `TLEvP.dayH/spanL/daysOf/perDay`. Base: Festival Dominicano de Hazleton (Salón Imperial,
  vie 9–dom 11 oct, pase $30 + viernes $10 · sábado $15 · domingo $12, aforo 1,200).
  **Manejar un evento ya creado (25 oct, pedido del usuario · `evView`):** serie = «FECHA QUE ESTÁS VIENDO» (chips; `ui.evOcc`) y todo es de esa fecha:
  KPI, DINERO (boletos, depósitos de mesa, extras, comisión 5 % + $1, «Te llega» el lunes · link Cobros), compradores, modo puerta (`door:id|oid`,
  `chkBy[oid]`). «Es hoy» con puertas/empieza/venta hasta y botón Modo puerta. AVISOS A LOS QUE VAN (`msgs[]`, ideas + texto 160, SMS; el último sale
  primero en «Antes de ir» del cliente). Compradores con pestañas Todos · Por la app · Cortesías · Adentro · Faltan, búsqueda, Reenviar boletos y
  Devolver (escribe `tl-evt-v2` → la orden del cliente queda reembolsada, `by: 'biz'`). Boletos con QUEDAN N y «+10 más». MESAS · QUIÉN LAS TIENE.
  Copiar enlace. Cancelar en serie: solo esta fecha (`cxD[día]` + skip + devuelve las órdenes de esa fecha; el cliente la ve cancelada) o toda la
  serie. FECHAS: tocar una fecha la abre. Pendiente: gráfica de ventas por día, asignar número de mesa en la puerta, cambiar artista de una sola fecha.
  **UI de Eventos (25 oct, usuario):** lista = tarjeta propia `evrow` (cartel 78×104 con fecha, tipo + Tag, título 2 líneas, barra de venta, «66 de 144 boletos» +
  $; sin barra si no hay cupo; `cntL` = plural por formato). Ficha = encabezado `evhd` (volver + tipo + Tag, chips de fecha de la serie, tarjeta con
  cartel, cuándo/dónde, barra, 3 números, Modo puerta y 4 herramientas). Compradores = `evbuy` (`evBuyers()`: órdenes reales + cortesías + ejemplo
  estable con mezcla de hash; cada orden con boletos por tipo, mesa, extras, total y sus QR; RSVP = un código por persona), filtros Todos · Por la
  app · Con mesa · Con extras · Cortesías · Adentro · Faltan, cajas Órdenes/Boletos/Adentro, detalle con Reenviar/Devolver (`rfB`); el modo puerta usa
  la misma lista. Edad «No · todas las edades» en fiesta; «Máximo por persona» empieza en Sin límite; «Cuántos días» 1–6 + (hasta 30). Base nueva:
  Karaoke latino (La Terraza, gratis, cupo 120, RSVP de hasta 4, cuenta en la puerta). `raw()` suma eventos de base nuevos a los ya guardados.
- **UI de Reservaciones (25 oct, usuario):** arriba tarjeta `rvsum` (Hoy · estado/turnos o cerrado/pausado, barra personas hoy de lugares —solo pend/ok/
  sentados—, Por confirmar · Hoy · Mesas, atajos Ver página · Cerrar un día (baja a `[data-rsv-blk="1"]`) · Ver en Hoy); reservaciones como tarjetas
  `evbuy` (iniciales, hora, estado, etiquetas día/personas/área/nota; pendientes abiertas con Confirmar · Otra hora · No hay mesa); áreas = `rvar`
  (ícono, mesas/personas, interruptor igual al de filas, etiquetas «4 mesas de 2» + Cambiar/Listo). Respaldo `_tmp/rev-rsv3/` (pre-rvui).
- **Clientes y Mensajes revisados (26 oct, Panel v2):** Clientes: las solicitudes de empleo salen de aquí (aviso con enlace a Jobs), buscador por nombre o
  número y filtros con número Todas · Esperan · Confirmadas y en curso · Terminadas · No se pudo (antes «Terminadas» mezclaba confirmadas). **Mensajes ·
  triángulo:** lo que un vecino escribe en Mi cuenta (`tl-usr-v1 · th/nt`, con la base `TLUsr.THREADS`; el panel ahora carga `usr-data.js`) sale en el panel
  (`usrMsgs`, id `u-…`, con número de no leídos) y la respuesta del dueño vuelve a la conversación del vecino (`usrSend` escribe `['them', …]`). La
  «Respuesta automática fuera de horario» (`over.autoR`) ya contesta en Mi cuenta cuando el negocio está cerrado (RESPUESTA AUTOMÁTICA · …) si El Compa no
  contesta; el panel aclara que con El Compa encendido contesta él.
- **Hoy revisado (26 oct, Panel v2 · DASH-HOY):** solicitudes de empleo: las de la sesión ya no salen como «Pedido» (`KIND.job`; fila propia con «Ver
  solicitud» que abre Jobs · solicitud) y las de ejemplo nuevas salen en SOLICITUDES DE EMPLEO NUEVAS (debajo de lo que espera respuesta; abrir una la marca
  vista). «Cerrar por hoy» guarda `closedTmp: 'hoy'` y la página dice «cerrado hoy · abre mañana …» (`TLPagP.today`); el aviso de Hoy lo explica. Cierre
  temporal de To'Latino avisado en Hoy. Detalle de un pedido delivery con app externa: LO ENTREGA DoorDash/Uber Eats · el cliente ve el seguimiento.
- **Tu página · triángulo (26 oct, Panel v2 · Tu página):** fuente única `window.TLPagP` (`prototype/dash2-pag.js`, cargado en Panel, Prototipo y Super
  Admin): `of(id)` = over[id] sobre TLDash2.BIZ (nombre, nick, especialidades, redes, idiomas, horario, portada/galería, quiénes somos ES/EN, lo que hay, FAQ,
  closedTmp); «Quiénes somos» gana lo más reciente entre el dueño y la edición del admin. `sync()` escribe la base del negocio en TLAll y listas
  (`b._n0` nombre, `b._ph0` fotos, `b._o0/_s0` abierto y estado desde el horario de hoy) y luego `TLAdm.apply()` (admin manda: nombre corregido, fotos
  quitadas, cierre temporal, sello). **El cliente lo lee:** nombre, especialidades primero, portada y galería, abierto/cerrado de hoy, Quiénes somos
  (`TLListing.ABOUT`), idiomas, «En el local» (amen con ícono), preguntas frecuentes y «LE DICEN …» (`page(id)`; Comida y Belleza). Horario: «Horario
  distinto para…» solo en negocios con Citas (el Booking del negocio deja de dar horas modOff min antes de cerrar, `TLBook.slotsFor` envuelto); con
  pedidos/reservaciones la pantalla manda a donde ya se configura (Menú · Horarios «Último pedido en línea», Reservaciones). Panel: avisos de nombre
  corregido, Quiénes somos editado, cierre temporal (Tu página y Hoy) y sello quitado por To'Latino (`tl-adm-v1.biz[id].ed.name/edit.about/temp/seal`);
  Quiénes somos con EN + «Traducir con El Compa» y nota honesta de dónde sale (en el Resumen salen primero las palabras de la persona de Staff). **Admin:**
  la ficha 360° lee el negocio con lo del dueño (`d2 = TLPagP.of`). Pendientes cerrados (26 oct): «Abro por temporada» pide «Vuelves» (`over.back`) y la
  página sale «cerrado por temporada · vuelve el …» (cerrado hoy); la referencia sale junto a la dirección (`addrMeta`); FAQ con pregunta y respuesta EN +
  «Traducir con El Compa». Respaldo `_tmp/rev-nov/`.
- **Relacionados revisado (26 oct, Panel v2 · Tu página · Relacionados):** fuente única `window.TLRelP` (`prototype/dash2-rel.js`, cargado en Panel
  —con `neg-rel.js`—, Prototipo y Super Admin): base = `TLRel.REL` (Sabor ↔ Alter St · Catering · Flan y Más, confirmados) + ejemplos: Sabor pidió a
  Mercado Quisqueyano (esperando) y Frutas El Conuco le pidió a Sabor (por responder). Guardado por negocio en `over[id]`: `relOut` (lo que pedí), `relAns`
  (mi respuesta: ok + mi nota | no), `relGone` (lo quité: sale de las dos), `relNote` (mi nota); el Panel lee `TLRelP.of(id, state.over)`. Admin:
  `tl-adm-v1.biz[id].relOff[key]` (cualquiera de los dos lados) y `modOff.rel`. `sync()` reescribe `TLRel.REL` con los vivos. Panel: `relBlocks` (tarjeta
  `rvsum`, TE PIDIERON CONECTARSE · CONECTADOS · ESPERANDO RESPUESTA, avisos de pausa y ocultos) y `relDet` (`rel:new`: buscar en To'Latino con foto,
  YA CONECTADO / YA PEDIDO, qué son, lo que tu página dice de él + EN con El Compa `relTr`, «Así lo ve el cliente», «Para enviar falta»; `rel:key`: qué
  son, quién lo pidió, lo que su página dice de ti, tu nota editable; por responder = Aceptar (pide tu nota) / No aceptar; esperando = Retirar + «Solo en el
  prototipo · simular que aceptó»; no aceptó = Quitar de la lista; conectados = Ver su página · Quitar relación con confirmación). Directorio mínimo `DIR`
  para el panel suelto. **El cliente lo lee:** la pestaña Relacionados sale solo con vínculos vivos (los dos aceptaron, no ocultos, sin pausa), con la nota
  de cada lado; ahora busca en `TLAll` (antes solo Comida) y arregla la foto (`url(…)`). **Admin:** Negocio · Equipo · NEGOCIOS VINCULADOS con todos
  (ESPERA QUE ACEPTE, LE PIDIERON, NO ACEPTÓ, OCULTO) y «Ocultar vínculo» con motivo; Relacionados se pausa desde Lo que vende. Modelo de datos:
  BusinessLink. **Sugeridos «cerca de ti» (26 oct, el usuario dijo que sí):** `TLRelP.sug(id)` = hasta 3 negocios de la misma categoría sin ninguna especialidad
  en común (no competidores directos), Pro primero y por cercanía; salen en la pestaña como CERCA DE TI · SUGERIDOS POR TO'LATINO (también sin vínculos); el
  panel los muestra con «Mostrar sugeridos» (`over.relSug`) y «No sugerir» (`over.relSugOff`); el admin ve cuáles salen; la pausa del admin los apaga. Respaldo `_tmp/rev-nov/`.
- **Jobs revisado (26 oct, Panel v2 · Lo que vendes · Jobs = Tu página · Vacantes):** fuente única `window.TLJobP` (`prototype/dash2-job.js`,
  cargado en Panel, Prototipo y Super Admin): BASE = las mismas vacantes del cliente (Sabor: j-sd-1 ayudante de cocina, j-sd-2 chofer; los demás desde
  `TLJobs.J` de cada ficha, copiado en `TLJobs._j0`); `over.jobs` entera con `jobsV: 2` (`over()` quita `adm`), vacante = { t, kk ft|pt|fds, pay, tips,
  dd 0 = lun, h0, h1, lang [[es|en, 1 obligatorio|0 suma]], d, req, ben, left, st live|paused|filled|draft }; `over.jobAns` = respuestas a las solicitudes de
  ejemplo (estables por vacante, `TLJobP.apps`). `sync()` reescribe `TLJobs.J` (solo en vivo y no ocultas; vacío si el dueño apaga Jobs) y `TLJobs.ALL`
  (todas, para solicitudes ya enviadas); el viejo merge de `dashOv` se quitó. Panel: `jobBlocks` (antes «Lo que vendes · Jobs» decía «siguiente entrega»):
  Free = lock; avisos pausado por To'Latino / apagado (Encender) / N ocultas; tarjeta `rvsum` (abiertas, solicitudes, por responder, barra de respondidas);
  ABIERTAS y CERRADAS Y BORRADORES con etiqueta solo de excepción. `jobDet`: vacante (`vac:id`: días, horario, idiomas, buscas, publicada; SOLICITUDES con
  filtros; Editar · Pausar / Volver a publicar · Ya la cubrí · Duplicar · Quitar con confirmación), editor (`vac:new|edit:id`: puesto, tipo, cuántas
  personas, pago desde $7.25 (mínimo de PA) / hasta / propinas, días + entra/sale en pasos de 30 min y aviso si el negocio cierra ese día, idiomas
  obligatorio · suma · no, qué vas a hacer, lo que pides / ofreces hasta 5 con sugerencias, EN con «Traducir con El Compa» `jobTr`, «Así lo ve el cliente»,
  reglas fijas, bloqueo de CV/papeles/estatus/SSN/pago, borrador o publicar, «Para publicar falta»), solicitud (`vap:job|id`: teléfono, experiencia, días
  que puede y cuántos coinciden, idiomas, nota; Llamar · Le voy a llamar · Invitar a entrevista con día que abres + hora · No seleccionado con confirmación;
  abrir una nueva la marca VISTA). **El cliente lo lee:** pestaña Jobs, detalle, aplicar y compartir con lo del panel (días desde `dd`); pausada, cubierta,
  borrador u oculta no sale; las solicitudes de la sesión llegan al panel con todos sus datos (`dashLive`: job, phone, exp, days, langs, note) y la
  respuesta vuelve (`dashRespond` jobApps: visto · cambio · rechaza · ok@día y hora → el estado del vecino muestra la entrevista propuesta). **Admin:** Negocio ·
  Contenido · Vacantes con propinas, horario, solicitudes y PAUSADA POR EL DUEÑO / CUBIERTA / BORRADOR; ocultar (`jobOff`) lo ve el panel. Modelo de datos:
  JobPosting y JobApplication ampliados. La entrevista confirmada por el vecino sale en el panel (ENTREVISTA CONFIRMADA, 26 oct). Pendientes: «Avísame de nuevas vacantes»
  no manda nada al publicar; las solicitudes de ejemplo no salen en Hoy (solo las de la sesión). Respaldo `_tmp/rev-nov/` (pre-jobs = el de Novedades).
- **Cobros y plan + Ajustes revisados (26 oct, Panel v2):** fuente única `window.TLPayP` (`prototype/dash2-pay.js`, cargado en Panel, Prototipo y Super Admin):
  comisiones del Super Admin (pedidos 10 % del subtotal, citas 8 %, boletos 5 % + $1, apartados 6 %, mesas $0; cargo de la tarjeta incluido; efectivo $0;
  cambio programado `tl-adm-v1.plan.fees[k]` se avisa en el panel), estado de Stripe (`over.stripe` none|rev|on, `bank`, `stripeFix`; `payHold/payWhy` del admin),
  movimientos de ejemplo (Sabor, El Primo) + pedidos de la sesión + boletos (`tl-evt-v2`), pagos al banco **cada martes** (lunes–domingo; boletos el martes
  después del evento; devuelto después de pagado resta al martes siguiente). Panel · Cobros: retenido por To'Latino / Stripe pide un dato / cambio de
  comisión; tarjeta `rvsum` (próximo pago, tarjeta vs efectivo, comisión, Tu cuenta · Qué se cobra · Soporte = ticket `TLSop`); PAGOS A TU BANCO (`po:`),
  MOVIMIENTOS con filtros y Descargar CSV (`mov:` con desglose: envío y propina 100 % tuyos, comisión, te llega, a tu banco); `stripe` con datos fiscales
  honestos (A5), cambiar banco con código; `fees`. Arreglado: «martes y viernes» / «el lunes» → martes; el admin ya no resta el cargo de Stripe. Ajustes:
  CÓMO TRABAJAS (resumen de Pedidos, Reservaciones, Citas, Eventos con enlace; ya no duplica interruptores), AVISOS por tipo × canal (`settings.ntf`,
  `quiet`; lo nuevo exige un canal), idioma real del panel (`api.lang` en el Prototipo), Cerrar unos días (`closedTmp` dias|aviso + `closedTo` →
  «cerrado · vuelve el …» en la página; avisa reservaciones y eventos en esos días), Tu cuenta (teléfono y correo con código, `acct`), Transferir (`xfer`
  pend|done, 7 días, quedarse como moderador; admin «Detener» `xferOff`), Borrar (`bdel`, 30 días como D5; bloqueado con eventos vendidos o pedidos
  abiertos; oculta la página vía `TLAdm.apply` y los eventos). Super Admin · Negocio: Dinero lee `TLPayP` (Stripe, banco, pagos) y Resumen muestra borrado,
  transferencia, cierre y avisos del dueño. Limpiado texto suelto después de `</html>` en Super Admin (respaldo `_tmp/rev-cob/`). Pendientes: recibos de Pro
  como lista; reembolso parcial desde el panel; los avisos no se envían de verdad en el prototipo. **Cerrados (26 oct):** Recibos de Pro (`plan:rcp`, `TLPayP.rcpts`:
  TLTrial o el 1 de cada mes del Pro de base; el Super Admin · Plan y facturas usa la misma lista) · Devolver dinero desde un cobro (`mov:` → `over.refunds[movId]`
  {amt, why, at}; total = DEVUELTO, parcial = comisión en proporción; si ya se pagó, se descuenta del martes siguiente; pedido de la sesión → `api.refund` →
  `order.bizRef` en el recibo del cliente «Te devolvió …»; boletos se devuelven en Eventos; el admin lo ve en Dinero) · Avisos enviados (`ntfCheck`: cada
  solicitud nueva de la sesión manda el aviso por los canales de Ajustes → toast + Ajustes · LO QUE TE AVISAMOS HOY, `tl-dash2-ntf-v1`). Fechas de Ajustes en hora
  del prototipo (`t0()`). Ojo: en replace con texto que lleve `$'` se duplica el archivo; usar slice (pasó y se reparó, `_tmp/rev-cob/panel-roto.dc.html`).
- **Moderadores + Más + Insights revisados (26 oct, Panel v2):** `eqBlocks`/`eqDet`: `over.mods_` = [nombre, áreas, ok|inv, último acceso, teléfono, enviada];
  invitar con nombre + teléfono + áreas (solo las del negocio: página, pedidos y citas, mensajes, lo que vende, entrega, eventos; nunca Cobros, Ajustes ni
  Moderadores), vista del SMS, pendiente (reenviar, cancelar, simular que aceptó), cambiar áreas, quitar con confirmación, «Ver el panel como …» (`ui.asMod`:
  `can()` usa sus áreas, aviso arriba con «Volver a ti», Más atenúa lo que no ve), ACTIVIDAD real (`over.logX`: quién respondió cada solicitud, invitaciones).
  Super Admin · Equipo lee `over.mods_` (nombres de áreas nuevos) y su «Quitar acceso» (`teamOff`) sale en el panel. Más: Insights, Ver mi página como
  cliente, Ayuda y Soporte. Insights: VENDISTE POR TO'LATINO (tarjeta · efectivo, de `TLPayP`, solo el dueño).
- **Cierre del panel (26 oct):** sin «siguiente entrega» en el panel: Ordenar categorías (lista genérica, `ui.icOrd`, Subir/Bajar → `over.itemCats` + orden de
  `items`), Jobs sin fuente abre `vac:new`, opciones de un ítem genérico van a Menú · Opciones (o nota). Insights suma lo de la sesión: vistas de la página
  (`bizViews` del Prototipo al abrir la ficha), guardados, seguidores y pedidos/citas (`dashLive.views/saved/follow`), con nota «Incluye lo de hoy». Arreglado:
  Tienda de un negocio con Servicios (El Primo) listaba los servicios; ahora solo productos. Visto en pantalla: respuesta del dueño llega al hilo del vecino
  (`tl-usr-v1 · th`, 'them'), conversación del vecino en el panel, ver como moderador, formulario de devolución, Tienda.
- **Ficha por categoría · Servicios de Auto (27 oct, pedido del usuario: revisar el single listing de cada categoría y subcategoría):** paso 1 hecho
  (errores). Las fuentes neg-auto-*.js se editan y su texto entero se reemplaza dentro de `bundle-4.js` (el bundle ya no es la concatenación exacta;
  cada fuente sí aparece entera). Emergencia (`TLAutoL.isEm`: subs[0] Grúas · Auxilio · Cerrajero): sin Booking, todo «Llamar», Hoy = «No se reserva…»,
  VA DONDE ESTÁS · REMOLQUE $ · 24 horas, título «Abierto las 24 horas», dirección = SU BASE. Free: Hoy por tipo (a domicilio · con cita · sin cita, SEGURO
  si `seguro`). «Cómo trabaja» en vez de «En el local» para a domicilio y emergencia (`rb.lbl.amenK`). Relacionados: a domicilio sin millas ni «Cómo
  llegar» (Llamar, `dirL/dirIc`). Reseñas Free por tipo (`FB`). «Cualquiera» del taller = libre si alguien del equipo lo está (`free0/free1/crew`): Hoy,
  Staff y Booking dan la misma hora. Eddy ya no pasa del cierre. Tienda «Vende piezas» si no hay gomas. Ofertas que abren el servicio con su precio
  (`TLAutoL.OFFERS` por nombre de servicio y de extra, `ash.promo` → `priceOf`, sigue al Booking `ab.promo`). «Rango …» quitado de la franja de confianza
  de Auto (usuario, 27 oct; las demás categorías lo siguen mostrando). Respaldo `_tmp/rev-auto/`.
  **Paso 2 hecho (27 oct) · Servicios de Auto en el panel:** fuente única `window.TLASvc` (`prototype/dash2-asv.js`, cargado en Panel, Prototipo y Super Admin
  después de dash2-svc): base = `TLAutoL._svc0` (copia de la ficha) o `DEF` en el panel suelto; `over[id].asvc` [{ id a{si}-{ii}, sec, n, d, k, p, rng, sz, mi,
  days, w, walk, per, cred, alt, inc, no, x, opt y sym se conservan, ph, hid }] + `over[id].asecs`; admin `tl-adm-v1.biz[id].itemOff['as:'+id]`. `sync()`
  reescribe `TLAutoL.SVC[id]` y `TLListing.MENU[id]` (y los devuelve a la base si se borra lo del dueño). Panel (`asvBlocks` / `asvDet`, det `as:`): resumen,
  aviso de bahías rentadas, secciones con Ordenar, editor con foto, nombre, sección, cómo lo cobras (precio cerrado · desde · se cotiza con rango · diagnóstico
  con «se descuenta» o gratis con el arreglo · por goma · inspección · por tamaño · se llama), por eje/goma/sensor, tiempo en minutos o días, espera/lo deja/elige/
  a domicilio, solo sin cita, incluye, no incluye, extras (+$ y +min), opciones solo de lectura («escríbenos»), EN con «Traducir con El Compa» (`asvTr`, también
  líneas), «Así lo ve el cliente», «Para guardar falta», quitar con confirmación. Super Admin · Lo que vende: SERVICIOS con Ocultar/Mostrar con motivo.
  Comprobado: precio y ocultar del panel llegan a la ficha; ocultar del admin quita el servicio. **Pendientes:** editar las opciones (grupos) desde el panel;
  quien renta bahía (Wilson, Eddy) no tiene panel propio en el prototipo; los pre-estimados guardados usan la posición del servicio (si el dueño reordena,
  uno viejo puede apuntar a otro). **Paso 3 hecho (27 oct) · negocios de ejemplo:** Pro: Cerrajería Llave Rápida (cerrajero + auxilio; emergencia = solo Llamar,
  a domicilio 20 mi, Yunior Batista), Cristales y Parabrisas Hazleton (cristales + papel ahumado con la ley de PA 70 %, seguro, local y a domicilio 15 mi, Yahaira
  Medina), Tapicería y Sonido Los Primos (tapicería + audio/alarmas), Revisión Antes de Comprar · Ortiz (va donde el vendedor, 25 mi). Free: Autopartes y Yonke
  El Cibaeño (piezas sin cita + «compramos tu carro» = Llamar), Traslado de Autos Quisqueya (se llama, por ruta), Hazleton Off-Road & Wraps (levantamiento, vinilos,
  tuning), Valley RV y Tráileres. FAQ por tipo (`FK` cris · tap · pre · cer), reseñas Free `pie`/`tras`, Hoy a domicilio sin «$Infinity» y «En el local o va donde
  está tu carro» si tiene local, «LLAMAS» sin 24/7 salvo grúa, sin Booking cuando nada se reserva (`canBiz` y Prototipo), emergencia sin «Nada se hace…» ni pasos.
  Con esto las 40 subcategorías tienen al menos un negocio.
- **Ficha por categoría · Belleza y salud (27 oct, OK del usuario):** **Paso 1 hecho (errores):** `TLBook.canBk(b)` (silla siempre; resto si tiene 'cita' y es Pro o
  Free con solicitudes; nunca si `TLBook.OFF[id]`) → solo sin cita (Quisqueya, La Esquina, Don Pepe, Pelucas) sin Booking: Free = Llamar, Pro = Cómo llegar, Hoy
  «Sin cita: llegas…» con precio desde los servicios; la columna dice quién confirma (silla con auto = «Kelvin confirma al instante», silla del local = «confirma la
  persona que elijas», solo = su nombre). Free usa `TLBook.today`; Free sin horario de persona usa b.hrs/b.closed (Don Pepe `closed: [1, 4]`). Reseñas y preguntas
  por tipo: `TLBellL.kindOf(b)` (walk · wig · mobile · casa · novia · kids · chair · silla · color · salon · barber; `b.k` lo fuerza) + `RK` y `faqOf(b, es)` (el FAQ del
  panel gana si existe). A domicilio: «Dónde atiende», «NO TIENE LOCAL · VA DONDE ESTÉS», «Ver la zona», nota de «A la hora = llegó…»; en su casa: «EN SU CASA».
  Walk-in: «RESEÑAS DE VISITANTES · AQUÍ SE LLEGA SIN CITA», sin verificadas. Fade Factory = Darío dueño (`own: 1`), Rizos = Nicole dueña; ABOUT corregidos;
  «estaciones» en plural. Servicio sin minutos no muestra 30 min. Respaldo `_tmp/rev-bell/`.
  **Paso 2 hecho (triángulo):** Panel · Lo que vendes · Citas (`modCfg.citas` { auto, apr, dep, cxh, staffPick }) → `TLSvc.citasSync()` (dash2-svc, al final de
  sync) escribe `TLBook.CFG`; renta de silla = solo «cancelar gratis» de la silla del dueño y enlace a «Sillas y agenda» (dash2-cat, que ahora también escribe
  `TLBook.CFG[silla]`); `staffPick:false` = sin elegir persona (`pick0`). Dueño apaga Citas (`over.mods`) o admin `modOff.citas` → `TLBook.OFF` → sin Booking,
  «Por ahora no toma citas en línea…». Super Admin: Citas entra a los módulos pausables y Lo que vende · Servicios dice cómo están las citas. Ajustes · Cómo
  trabajas lee las citas. Panel demos nuevos: Salón Glamour (empleadas, `model: 'staff'`) y Trenzas by Yaritza (`solo: 1`, sin elegir modelo ni pestaña de
  equipo) en dash2-cat + TLSvc.BASE (+ `svWord` cambia «barbero/barbería» por su palabra). Tienda: productos del panel (cat 'Tienda') → `TLBellL.SHOP` (agotado/solo
  catálogo/oculto por admin no salen; El Primo y Glamour con los mismos productos que la ficha). Comprobado en pantalla: depósito/auto del panel llegan a la ficha y la
  pausa del admin quita el Booking.
  **Paso 3 hecho (27 oct):** los 15 de abajo en neg-beauty (`k` = tipo), con SVC/ABOUT/ADDR/STAFF/SHOP en neg-bell-listing, RK y faqOf por tipo, CFG de los Pro y
  fotos de servicio (`SPH`) en neg-bell-book; tiendas (natural, supply) = «Es una tienda: pasas cuando quieras»; Tinta = depósito solo en tatuajes. Las 40 subcategorías
  tienen negocio. Persona con foto solo en Luz (11876024), Yokasta (7593048), Wander (7005734) y Nathaly (6954000); los demás Pro muestran «Quiénes somos» y los Free
  nuevos aún no tienen persona en neg-free-staff (faltan retratos reales sin repetir). Respaldo `_tmp/rev-bell/p3-*`.
  Lista: Uñas Bella Luz (Pro shop: manicura, acrílico, diseño) · Lash & Brow by Yokasta (Pro solo cita: pestañas, lifting, cejas/microblading,
  maquillaje permanente) · Cejas y Cera Express (Free: hilo, cera) · Láser y Piel Hazleton (Pro: láser, borrado de tatuajes, acné; consulta gratis + paquete de
  sesiones) · Estética Facial Marisol (Free: faciales, acné) · Manos de Ángel Masajes (Pro: masajes, pareja = 2 personas, deportivo) · Drenaje y Post-op Altagracia
  (Pro solo: drenaje, moldeamiento; sin consejo médico) · Spa Caribe & Sauna (Free) · Sonrisa Blanca (Free: blanqueamiento cosmético, no es dentista) · Tinta Quisqueya
  Tattoo (Pro: tatuajes 18+ con ID, cotiza por diseño, depósito $50; perforaciones) · NutriVida Coach (Free: nutrición) · Naturales y Vitaminas La Salud (Pro sin
  cita con Tienda: naturales, vitaminas) · Beauty Supply Hazleton (Free, sin cita) · Glam a Domicilio by Nathaly (Pro zona 15 mi: belleza a domicilio, uñas,
  maquillaje) · Centro Capilar Renacer (Free: caída del cabello). Cada uno con `k` propio en kindOf + RK + faqOf; Free con persona en neg-free-staff (foto real
  sin repetir); fotos de trabajo = SUBPH de neg-beauty.
- **Pendientes viejos cerrados (26 oct):** Jobs «Avísame de nuevas vacantes» guarda `jobAlert[biz] = { at, seen: [ids] }`; lo publicado después sale
  NUEVA · TE AVISAMOS y «Te mandamos un SMS: … publicó «…»» (el panel lo dice al publicar). Novedades programadas (`st prog`, `sch.date/time`) y que se
  repiten (`st rep`, `sch.days` 0 = dom) salen solas a su hora en `TLNovP.of` (hoy jue 12:30 PM; `auto`, `st0`). Tienda: Entrega · Envío por correo
  (`dlv.ship, shipFee, shipFree, shipD`) → `TLTienda.OPTS[id].envio/envioFree/envioD` + etiqueta 'envio' (TLReg en dash2-data; flujo en neg-tienda-flow y
  bundle-1). Eventos: lista de espera real (cliente «Lista de espera» → `tl-evt-v2.wait[eid]`, «En lista · #N», Salir; el panel lista · N con
  «Avisar a la lista» solo si hay lugar → `waitSent`/`wait[eid].off` → el cliente ve SE LIBERÓ UN LUGAR · TIENES 30 MIN; `save()` de Eventos ya no
  borra lo que escribe el panel), VENDIDOS POR DÍA · 7 DÍAS (chart, incluye la sesión) y mesa en la puerta (al escanear un boleto con mesa, chips
  con el número; `mesaN`/`mesaNBy[oid]` y sale en MESAS · QUIÉN LAS TIENE). Sigue pendiente solo: HoursPro «Próximos cambios» vacía (SINCRONIZAR).
- **Novedades · triángulo (26 oct, Panel v2 · Tu página · Novedades):** fuente única `window.TLNovP` (`prototype/dash2-nov.js`, cargado en Panel
  —con `neg-nov.js`—, Prototipo y Super Admin): BASE = las mismas publicaciones del cliente (Sabor: `TLNov.POSTS` n1–n8; El Primo: las 2 de la ficha,
  ids `barberia-el-primo-0/1`) + 2 del panel (`p-thx` programada, `p-sanc` terminada); la vieja lista del panel (pernil $10) ya no se usa. `over.nov`
  se guarda entera con `novV: 2` (`over()` quita `adm`); `over.pinned` (por defecto la fijada de la base) y `over.novRp {post: {j: respuesta}}`.
  Panel: avisos de módulo pausado por To'Latino / apagado por el dueño (Encender) / N ocultas; fila OCULTA POR TO'LATINO; «N COMENTARIOS» en la fila;
  detalle con COMENTARIOS DE VECINOS y Responder / Cambiar respuesta. **El cliente lo lee:** pestaña Novedades solo con publicaciones en vivo y el módulo
  encendido (dueño y admin); detenida, programada o quitada no sale; fijar mueve la fijada; texto editado por el dueño reemplaza el original; la respuesta
  sale como «Respuesta del negocio»; **Hoy en el barrio** (`stories`) sale de las en vivo < 24 h (también las nuevas del panel con su foto, y negocios
  nuevos al final). **Admin:** Negocio · Contenido · Novedades dice QUITADA / DETENIDA POR EL DUEÑO, PROGRAMADA, FIJADA y «editada por el dueño»;
  ocultar (`novOff`) ya lo ve el panel. Pendientes: «Se repite» y «Programada» no se publican solas a su hora en el prototipo (hoy fijo); los votos y
  comentarios que deja un vecino en la sesión no llegan al panel; las de Free (sin pestaña) no se revisaron. Respaldo `_tmp/rev-nov/`.
- **Staff revisado (26 oct, Panel v2 · Lo que vendes · Staff = Tu página · Equipo):** fuente única `window.TLStf` (`prototype/dash2-stf.js`, cargado
  en Panel, Prototipo y Super Admin después de dash2-svc): BASE = la misma gente de la ficha (Sabor: Rosa Peña dueña, Juan Carlos, Yanet, Miguel + Wilfredo
  PIDE UNIRSE + Yahaira INVITADA; El Primo: Luis, Kelvin, Andy, Johan); `over[id].stf` (id, n0, name, role, y, st ok|inv|req|gone, kind own|emp|renta, ph,
  langs, sp, bio, wk 0 = dom, same, show, dishes, phone, sent, msg). Panel: `stfBlocks` (tarjeta `rvsum`: en tu página · trabajan hoy · piden unirse ·
  invitados; filas PIDEN UNIRSE · TU EQUIPO · INVITACIONES; etiquetas solo de excepción NO SALE · NO SALE CON FREE · QUITADO POR TO'LATINO; módulo apagado
  o pausado por el admin con aviso) y `stfDet` (`stf:id|new`): invitar por SMS (nombre, teléfono, qué hace; renta espacio solo fuera de Comida/Mercados/
  Tiendas/Noche; en Belleza entra con el modelo de Servicios; vista del SMS; «Para enviar falta»; teléfono repetido), invitación (reenviar, cancelar, «Solo en
  el prototipo · simular que aceptó»), pide unirse (su mensaje, Aceptar / No aceptar), persona (Sale en tu página; LO PONE {persona}: foto, palabras,
  idiomas + «Pedirle que actualice su perfil»; el dueño edita los suyos con foto real `novUp`; LO QUE PONES TÚ: rol —en Belleza sale del modelo—, desde,
  especialidades hasta 4, EN con «Traducir con El Compa» `stfTr`; HORARIO igual que el negocio o propio por día con entra/sale y aviso si trabaja un día
  cerrado; quien renta: su agenda, solo lectura; Comida: SUS PLATOS hasta 3; Belleza: enlace a Servicios · Barberos; «Así lo ve el cliente»; Quitar del
  equipo con confirmación). `B()` pone `B.ST` y `B.team` derivado (pro-trial y fuerza del perfil). **El cliente lo lee:** `sync()` reescribe
  `TLListing.STAFF/TLStaff.PEOPLE` sin mover posiciones (oculto = `off: 1`), la pestaña Staff y «Quién está detrás» filtran `off`, la pestaña respeta
  Staff apagado por el dueño o pausado por el admin, fotos subidas (`data:`) y sin foto; en Belleza `TLBook.PROS[].off` saca la silla del Booking del local
  (neg-bell-book + bundle-4). **Admin:** Negocio · Equipo lista el staff como lo dejó el dueño (INVITADO, PIDE UNIRSE, OCULTO POR EL DUEÑO, NO SALE CON FREE) y
  quita/devuelve a una persona con motivo (`tl-adm-v1.biz[id].stfOff[id]`); Staff se pausa desde Lo que vende; «Cuentas con acceso al panel» ahora sale de
  los moderadores (`mods_`), no del staff. Datos alineados: dueña de Sabor = Rosa Peña (panel y admin; antes Mayra / Rosaura), moderadores Yanet Almonte y
  Miguel Reyes; horarios de Sabor sin lunes (cerrado). Modelo de datos: BusinessMember ampliado (requested, phone, invitación 7 días, join_message,
  same_as_business_hours, hidden_by_admin). Pendientes: un barbero nuevo aceptado no entra solo a Servicios · Barberos (silla, precio, % —hay que darlo de alta
  ahí); la reseña «vía {Local}» por persona; el aviso al dueño cuando alguien acepta (notificación). Respaldo `_tmp/rev-stf/`.
- **Servicios · Belleza revisado (25 oct, Panel v2 · Barbería El Primo):** fuente única `window.TLSvc` (`prototype/dash2-svc.js`, cargado en Panel, Prototipo y
  Super Admin): BASE = la misma lista de la ficha (neg-bell-listing SVC) + precios por silla (neg-bell-book PROS); `over[id].svcs/svcCats/prOwn`;
  `sync()` reescribe `TLBellL.SVC[id]`, `TLListing.MENU[id]` y el menú/precios de cada silla (`p.pr` por nombre, `_pr0`). Panel: `svcBlocks` (tarjeta
  resumen `rvsum` con ícono, pestañas Servicios · Extras · Precio por barbero, filas con duración, rango de precio, interruptor «se ve», Ordenar ↑↓) y
  `svcDet` (`sv:id|new|new:Cat`: nombre, EN con El Compa `svTr`, categoría o nueva, duración + otro, tiempo entre citas, tu precio en tu silla / los
  demás lo ponen en la suya, o precio fijo/desde, se ve en tu página, «Así lo ve el cliente», «Para guardar falta», quitar con confirmación). Datos del
  panel alineados con la ficha (dueño Luis «El Primo» Batista; Kelvin, Andy y Johan rentan silla). Admin: Negocio · Lo que vende lista los servicios y
  oculta uno (`itemOff['sv:'+id]` → página, sillas y panel «OCULTO POR TO'LATINO»). Pendientes cerrados (25 oct): `TLSvc.book()` reescribe `TLBook.ADD[id]`
  con los Extras del panel (precio y minutos; conserva las secciones de la base), `TLBook.SPH[nombre]` con la foto del servicio (subir o de la galería;
  base = fotos de la ficha) y envuelve `priceOf/slotsFor/nextFree` para que el tiempo entre citas (`buf`) alargue el bloque en la agenda sin cambiar la
  duración que ve el cliente. Respaldo `_tmp/rev-svc/`.
  **Modelo de la barbería (25 oct, pedido del usuario):** Servicios · «Cómo trabaja tu barbería» = Rentan silla (`chair`: cada barbero pone su precio en su
  silla, tiene su página; renta por semana `svcRent`, la cobra el dueño por fuera) · A comisión (`comm`: precio de la barbería igual con todos, a cada
  barbero le toca un % `svcComm`, default 60) · Empleados (`staff`: precio de la barbería, el dueño les paga por fuera). Cambiar pide confirmar y dice qué
  cambia. `over.svcModel`; quién hace cada servicio `svcDo[proId][svcId]` (base = los precios de cada silla; nuevos = todos). Pestaña «Barberos»: por
  barbero silla/renta o % o empleado, «esta semana: N citas · $ · le tocan $» (ejemplo estable), % con −/+, chips «Qué servicios hace». Editor (comisión/
  empleados): «Precio en la barbería» + «Quién lo hace». Cliente: en comisión/empleados `b.m = 'shop'` (Booking de la barbería con selector de barbero,
  precio único, `TLBook.CFG[id].stf` = quién lo hace por posición del Staff; depósito/aprobación/cancelación del dueño); en silla vuelve `_m0`.
  Admin: Negocio · Lo que vende dice el modelo, renta o %. Respaldo `_tmp/rev-svc/` (pre-model).
  Pendientes cerrados (25 oct): en comisión/empleados las sillas dejan de ser negocios propios (`sync` las saca de `TLAll.B`/`TLBeauty.B` y las guarda en
  `__svcChairs` para volver; no salen en búsqueda, listas ni mapa). Publica tu negocio: paso **ONB-NEG-B6 «¿Cómo trabaja tu equipo?»** (Belleza con local:
  Solo yo · Rentan silla · A comisión · Empleados → `d.team`; obligatorio). Modelo de datos: Business.team_model, chair_rent_weekly, commission_pct;
  StaffService.does. **Tu negocio publicado → Panel (25 oct):** `prototype/dash2-onb.js` (`TLOnbBiz`, cargado en el Panel antes de dash2-svc) lee
  `tl-onb-neg-v1` y, si `pub`, registra `TLDash2.BIZ['mi-negocio-tl']` con nombre, categoría, especialidades, dirección, teléfono, horario, fotos, módulos,
  lo que vende y plan; en Belleza registra su base de Servicios (`TLSvc.reg` / `__svcReg`) con el modelo de B6 (Solo yo = empleados sin equipo). «Abrir el
  panel completo» (H2) navega a `DASH-PAGINA` con ese negocio; Servicios avisa «Al publicar elegiste… · Invitar». Lo que cambie en el panel manda
  (over). Para el cliente y el admin (25 oct): `TLOnbBiz.sync()` (cargado también en Prototipo y Super Admin, con TLReg) pone el negocio en `TLAll.B` (y
  la lista de su categoría: las 17, `GL` en dash2-onb.js, 26 oct; comprobado sin errores en las 17 páginas de categoría) con `_cat`, `nuevo`, etiquetas por módulos, abierto/cerrado de hoy, fotos; `TLListing.MENU/ABOUT/ADDR/STAFF`;
  en Belleza `TLBellL.SVC`, `TLStaff.PEOPLE` (semana del horario) y `m` shop|solo. Despublicar lo quita. `adm-data catOf` respeta `b._cat`.
- **Lista de novedades con herramientas (24 oct):** cada fila trae una línea de íconos 32 px (`row.tools`, k n|on|pri|bad|ghost; papelera
  a la derecha; quitar pide confirmar en la misma línea): en vivo = editar · programar · fijar · detener; programada/se repite = publicar
  ya · reprogramar · editar; terminada = publicar de nuevo · duplicar. **Programar completo** (`schedBlocks/schedText/schedWhen/schedNext`,
  hoy = jue 24 sep 2026): Ahora · Otro día (14 días + hora en pasos de 30 min) · Se repite (todos los días · L–V · L·X·V · fines de semana
  o días sueltos L M X J V S D; hora; cada vez se ve hasta que cierras/3/6/24 h; hasta que la detengas/2 semanas/1/3 meses; resumen +
  próximas 4 fechas; aviso a seguidores solo la primera vez). Guarda `sch {mode once|rep, date, time (min), days [0–6], dur, until}`,
  `st: 'rep'` = etiqueta SE REPITE. También desde la lista (form `nre:id`).

## 2a. Paso a código (decisión del usuario, 10 oct)
- Destino: **app nativa (iOS/Android) + web**. Pagos: **Stripe** (retener, cobrar, liberar, reembolsos).
- Se pasa a Claude Code por partes, en paralelo con el diseño. El prototipo es la especificación, no código a copiar.
- Antes del primer paquete de entrega: el usuario hace ajustes de diseño. Luego: SINCRONIZAR 16/17 en el
  sistema, cerrar o marcar "provisional" los patrones pendientes y escribir el modelo de datos a partir de `prototype/*.js`.

## 2c. SUPER ADMIN (decisión del usuario, 12 oct) — `To'Latino Super Admin.dc.html` + `prototype/adm-data.js`
- Plan aprobado: `plan/admin-implementacion.md` (núcleo operativo primero; piezas nuevas construidas directo).
- **Regla literal del usuario:** el Super Admin maneja **cada píxel** del proyecto. Cualquier cosa que cambie, se
  agregue o se elimine en cualquier pantalla, dato o flujo **se ajusta de inmediato en el Super Admin, en el mismo
  turno** (fila, cola, acción o ajuste). Nada queda fuera. No se pregunta: se aplica.
- **Fase 1 construida (13 oct) · núcleo operativo.** Botón **Admin** en la barra del Prototipo → `ADM-HOME` (regex `ADMR`,
  `isAdm`, monta el Super Admin con `api="dashApi"` y `live="admLive"`: `usrAll` + ayudas escaladas + usuario). Suelto trae
  barra de revisión (Móvil/Desktop · 1440/1280/1024 · ES/EN · rol · ciudad). Secciones: Inicio (salud, colas con SLA,
  actividad), Colas (15 colas; en vivo: eventos `tl-evt-pub-v1`, sello `tl-dash2-v1 over[].seal`, recomendaciones
  `tl-rec-v1`, ayudas de la sesión), Negocios y Usuarios (listado + 360° + acciones con motivo), Transacciones (420 de 90
  días + las reales de la sesión; Retenido · Cobrado · Liberado · Devuelto), Sistema mínimo (equipo, matriz de permisos,
  auditoría). ⌘K busca negocio, usuario, # de operación y sección. Fases 2–4 aparecen como "por construir" con su fase.
  **Lo que el admin decide se ve afuera:** Panel v2 lee evento aprobado/cambios/rechazado y sello aprobado/falta un
  dato/no aprobado (`sealNote`, `admNote`); `Licencia` lee `TLAdm.lic(biz)`; `TLRev.forBiz` filtra reseñas ocultas
  (`tl-adm-v1.rev`); `search-engine` excluye `admHidden`; `TLAdm.apply()` marca `admHidden`/`verified` en `TLAll`.
  Datos: `prototype/adm-data.js` (se carga en el admin; **no está en bundle-4** para no inflar el prototipo; Licencia lo
  carga aparte). Respaldos: `_tmp/Prototipo respaldo pre-admin.dc.html`, `_tmp/Panel negocio v2 respaldo pre-admin.dc.html`,
  `_tmp/Super Admin fase1.dc.html`.
- **Fase 2 construida (13 oct) · contenido y oferta.** `ADM-EVT` (eventos del módulo + los de `tl-evt-pub-v1`; boletos de
  ejemplo estables `TLAdm.tickets(eid)`: buscar por código/teléfono, reenviar, reemitir, anular; modo puerta en solo lectura;
  organizadores con bloqueo de publicación; ocultar evento / cancelar con devolución total → `tl-adm-v1.evt`; Eventos, la
  ficha y Buscar filtran con `TLAdm.evtHidden`). `ADM-CONT` (publicaciones, comentarios, Hoy en el barrio y reseñas; ocultar /
  restaurar con motivo → `cont['post:id'|'cm:id']` y `rev`; Comunidad filtra con `TLAdm.postHidden/cmHidden`; reglas de
  auto-moderación con interruptor; cuenta oficial). `ADM-CAT` (17 categorías con detalle, subcategorías agregar/quitar con
  "afecta a N" → `cat[k].add/off`; **sinónimos en vivo**: `TLAdm.syn()` se mezcla en `search-engine.parse`, `TLSearch.SYN`
  expuesto, `reset()` tras cada cambio; búsquedas sin oferta = `tl-search-v1.alerts` + ejemplo; familias de filtros; módulos y
  matriz Free/Pro). `ADM-CIUD` (Hazleton abierta: radio por defecto, barrios, home; Allentown/Reading: regla 300/30, asistente
  de 6 pasos, **Abrir ciudad** → `tl-adm-v1.city[k].st='on'` que `city-data.js` lee al cargar; avisar lista de espera; cerrar
  con motivo). El Prototipo ahora carga `adm-data.js` (hooks con guardia `window.TLAdm`); el admin carga `search-engine.js`.
  Respaldo: `_tmp/Super Admin fase2.dc.html`.
- **Fase 3 construida (13 oct) · dinero y crecimiento.** `ADM-PLAN` (Free/Pro: **techo mensual Free en vivo** →
  `tl-adm-v1.plan.cap`, leído por `window.TLFreeCap()` en `neg-cita-help.js`; precio y prueba; suscripciones con estados
  activa/prueba/fallido/cortesía/cancelada y dunning; comisiones; ingresos 8 semanas y por categoría). **Pro de cortesía**
  desde Negocio 360° → `biz[id].pro='cortesia'` + `proUntil`; `TLFreeLeft` devuelve null (sin techo) y Panel v2 · Tu plan lo
  muestra como PRO · CORTESÍA con la fecha. `ADM-MKT` (semilla desde recomendaciones y búsquedas sin oferta → `dec['seed:q']`;
  promotores con pago a Wallet; campañas con interruptor; destacados; enlaces y QR). `ADM-NOTIF` (12 plantillas ES/EN por
  grupo — crítico siempre llega — editables en `notes['tpl:k']`; envíos; anuncios in-app `notes.ann`; reglas). `ADM-SOP`
  (tickets abiertos/míos/resueltos con SLA, filtros, macros ES/EN; el detalle es el de la cola). `ADM-CONF` (resumen de colas
  de confianza, catálogo de sanciones, sancionados, fraude y listas de bloqueo, privacidad, reglas del sello).
  Respaldo: `_tmp/Super Admin fase3.dc.html`.
- **Fase 4 construida (13 oct) · control y cierre. Las 18 secciones están construidas (ninguna "por construir").**
  `ADM-ANALIT` (período 7/30/90; resumen: vendido, comisión, operaciones, citas aprobadas, gráfica 8 semanas, por categoría,
  embudo; gente y negocios: retención D1/D7/D30, rangos, negocios por categoría; dinero: MRR, conversión Pro, devoluciones,
  no llegaron, ticket promedio, dinero por estado; comunidad y eventos; soporte y confianza; búsquedas sin oferta; **exportar
  CSV real** (transacciones, negocios, auditoría, sin oferta) + envío semanal → `notes['rep:k']`). `ADM-GAM` (rangos renombrables,
  puntos y tope diario, monedas con ajuste, cupones pausar/costo, Tabla del Barrio con excluir y **cierre de mes**, rango del
  negocio, El Patio solo lectura v1.1) → `tl-adm-v1.gam`; **Comunidad lo lee en vivo**: `C()` pasa por `TLAdm.gamOf(TLCom)`
  (RANKS, PTS, PTS_RULES, COUPONS sin los pausados, TABLA sin excluidos). `ADM-CMS` (17 cadenas clave ES/EN con estado y largo
  máximo → `cms['s:id']`; líneas fijas de cada categoría bloqueadas; rótulos por categoría; 9 páginas legales versionadas con
  aceptación forzada → `cms['p:k']`; home de Hazleton: aviso y bloques on/off). `ADM-SYS` completo: + Salud (servicios,
  mantenimiento programado), Configuración global (12 límites → `TLAdm.cfg(k, def)`), Respaldos (exportar auditoría), flags
  nuevos (check-in sin conexión, Renta, versión mínima), integraciones con métricas, y **Estados**: galería de los 9 estados
  del plan §4. En uso real: dato desactualizado (evento `storage` de `tl-adm-v1` → aviso "Actualizar"), lote real en Contenido
  ("Ocultar los N reportados", con progreso y fallos parciales: la cuenta oficial no se oculta en lote), bloqueo suave en
  colas, sin permiso por rol, confirmación con motivo. `window.__admInst` expone la instancia para la revisión de orden.
  **Revisión de orden:** 761 combinaciones (18 secciones × subpestañas × 7 roles × móvil/desktop) + 174 (ES/EN × Hazleton/
  Todas, todas las colas, 40 negocios, 20 usuarios) sin errores. **Patrones aprobados (13 oct):** p11–p18 del admin → master 2aj–2aq (y la mesa de dominó → 2ai) (tabla densa, cola
  con SLA, auditoría, matriz de permisos, KPI con gráfica, confirmación con motivo, barra del admin con ciudad, progreso de lote)
  con capturas `patrones/11…18-pat.jpg`. Incidente: al capturar se pisaron `patrones/01–08`; 01–03 y 05–08 se restauraron del
  sistema; **`04-pat.jpg` (mesa de dominó) se recapturó el 13 oct** desde Comunidad · APP-PATIO-MESA. Respaldo:
  `_tmp/Super Admin fase4.dc.html`.
- **Cierre de acciones a medias (14 oct):** ninguna acción del admin queda en "fase N". Fusionar cuentas (elige la duplicada →
  Cambios sensibles → al aplicar, la duplicada queda `st: 'del', into`), Borrar datos y Transferir dueño (elige persona) **entran de
  verdad a la cola** (`tl-adm-v1.cq`, `liveItems`); al aplicar la transferencia `biz[id].owner` y `TLAdm.bizOwner` la respeta.
  Confirmación con motivo admite `pick` (elegir persona). Semilla: `seedFor(x)` desde Catálogo · Sin oferta, Crecimiento y Ciudades;
  la semilla de una recomendación guarda nombre/categoría; **la página de categoría la muestra** al final de "También en Hazleton"
  (sin filtros, pág. 1) como SIN RECLAMAR · "Reclámalo gratis" → `ONB-NEG-A1` (`TLAdm.seedsOf`, `seedRows` en el Prototipo).
  **Editor de filtros** (Catálogo · Filtros → categoría): interruptor por opción → `cat[k].foff`; el Prototipo los quita de la hoja y
  de los rápidos (`TLAdm.filtOff`; Comida ahora tiene `TLFood.GROUPS/QUICK` en `neg-food.js` + bundle-1). Comisiones editables con
  aviso de 30 días (`plan.fees`, cancelar cambio). CSV real de Ingresos. Macros de Soporte editables/nuevas (`notes['mac:*']`) y
  como atajos al responder un ticket. Cerrar sesión real (pantalla con código de 6 dígitos). Copiar enlace al portapapeles.
- **Usuarios 360° (14 oct, contra `plan/admin-dashboard.md` · ADM-USR):** listado con QUIÉN (en vivo · dueños · promotores · solo
  clientes), ESTADO (6), "Más filtros" (actividad: nuevos, activos 7 d, sin entrar 30 d+, reportes, varios dispositivos, sin correo,
  saldo en Wallet · rango), ORDENAR, buscar por correo, exportar CSV. **La cuenta de la sesión del Prototipo sale primero como EN VIVO**
  (`liveU`, id `live`; sus transacciones en vivo llevan `uid: 'live'`). Ficha con pestañas (`tab.udt`): Resumen (perfil, notas internas
  `usr[id].notes`, negocios, acciones: advertir, sancionar, enviar mensaje `msgs`, fusionar, borrar) · Actividad (operaciones por tipo,
  reseñas escritas con ocultar/restaurar → `rev`, boletos de eventos vía `TLAdm.tickets`) · Dinero (cobrado/retenido/devuelto/Wallet,
  métodos de pago Stripe, ajustar Wallet ± con tope por rol → `walAdj`, disputas y ayudas) · Comunidad (rango, puntos, monedas, votos,
  ajustar puntos/monedas → `ptsAdj`/`coinAdj`, publicaciones, cupones, referidos, dominó v1.1 solo lectura) · Seguridad (dispositivos y
  sesiones: cerrar/bloquear → `devOut`/`devBlk`, cuentas en el mismo dispositivo, verificación + restablecer → `verReset`, cambios de
  teléfono, ciudad con regla 30 días + cambiar → `city`/`cityLog`) · Confianza (sanciones, apelaciones, reportes recibidos/hechos,
  tickets, todo enlazado a Colas) · Privacidad (avisos solo lectura, mensajes enviados, términos aceptados/pendientes según CMS, exportar
  datos JSON real). Borrado aprobado = 30 días de gracia (`delAt`) con "Restaurar". Datos derivados estables por id en `usrX(u)`.
  **Cuenta de prueba `u00` Rosaura Méndez Batista** (`demo: true`, etiqueta PRUEBA, sale primero tras EN VIVO): dueña de Sabor Dominicano +
  El Fogón, promotora, rango 7, silenciada (bloqueo de publicación) con apelación AP-43 abierta; 13 operaciones `#91xx/C-92xx/R-93xx/B-9401/
  A-9501` de todos los tipos y estados, 2 boletos, 3 dispositivos (comparte con u37 y u61), cambio de teléfono y de ciudad, notas y mensajes
  base (`notes0/msgs0/cityLog0`), casos en Colas (AY-2420, DP-121, RP-906, RB-305, RU-203, TK-5112, CS-14) e historial a9–a12. Las demás
  semillas usan `UREG` (sin la de prueba) para no mover los datos de ejemplo.
- **Ventanas (decisión del usuario, 14 oct):** lo que se abre desde una ficha (o de otra sección) **se abre en ventana encima**, sin salir
  de donde estás (`pushPop` / `state.pop`, hasta 8 niveles): "← {anterior}" vuelve un nivel, × o Esc cierra todo y la ficha de abajo
  queda igual (pestaña incluida). `go(sec, {det})` decide: clic dentro de una ficha (`markDet` por `onClickCapture` del panel) o de otra
  sección → ventana; misma sección desde la lista → ficha lateral como siempre. Enlaces de sección desde una ficha ("Ver en
  Transacciones", "Ver todo"…) sí navegan, pero dejan arriba **"← Volver a {ficha}"** (`state.back`) que restaura ruta, ficha, pestaña
  y ventanas. `detFor(sec, det)` arma cualquier ficha; la confirmación con motivo sale solo en la ventana de arriba.
- **Vista de la ficha (18 oct):** en desktop cada ficha trae selector LATERAL · COMPLETA en su cabecera. Completa = la ficha
  ocupa toda la columna de contenido (máx. 1120, la lista se oculta, "← {sección}" vuelve); con eso `detOpen` es falso y los
  bloques usan su forma ancha (4 KPI, kv de 3). Por defecto Completa en Negocios y Usuarios, Lateral en el resto; se recuerda
  por sección en `localStorage tl-adm-view-v1`. Las ventanas encima siguen en 640.
- **Comunidad en el admin (14 oct):** Usuario 360° · Comunidad con sub-pestañas (`tab.ucs`): Publicaciones · Comentarios · Seguidores y
  siguiendo · Puntos y monedas · Cupones, referidos y El Patio. Arriba: rango, puntos, monedas, votos recibidos, seguidores/siguiendo/
  bloqueó/silenció, chats privados (no se leen salvo reporte), contadores, insignias, aviso de ocultos y de **posible red** (seguidores en
  el mismo dispositivo → "Abrir caso de red de cuentas" = cola Reportes de usuario). **Hilo** (`threadDetail`, det `cont · th:post#cm`):
  publicación como en Comunidad (autor, rango, tema, fotos, encuesta, BusinessRow, votos) + comentarios anidados, los más votados primero,
  el comentario de origen **marcado y con scroll** (`data-adm-focus`); ocultar/restaurar post o comentario con motivo (`cont['post:'|'cm:']`,
  `isHid` con `hid0` de base) y enlace al reporte. Perfil del vecino de Comunidad (`vecDetail`, `vec:key`). Datos: `comU(u)` estable por
  id (u00 hecho a mano: 4 publicaciones, 2 ocultas por autopromoción; 5 comentarios, 2 ocultos; 38 seguidores con 2 del mismo dispositivo),
  cuenta EN VIVO lee `tl-com-v1`. Contenido lista también lo de los usuarios; abrir un post o comentario desde ahí abre el hilo.
- **Negocios 360° (14 oct, contra `plan/admin-dashboard.md` · ADM-NEG):** vistas Lista · Posibles duplicados (`bizDups`: nombre casi igual /
  misma dirección; sucursal vinculada por `TLRel` = no es duplicado; Fusionar → cola Cambios sensibles `type: 'mergeBiz'` → el duplicado queda
  `closed, into`; "No es duplicado" → `dec['dup:a|b']`) · Reclamos (`type: 'claim'`, semilla CS-15, al aplicar `biz[id].owner`; lista Sin
  reclamar con "Invitar a reclamar"). Lista: PLAN (Pro/Free/prueba/cortesía/pago fallido), ESTADO (activo/cerrado temporal/oculto/suspendido/
  cerrado), Más (sello, licencia, Stripe, reportes, perfil < 70 %, sin actividad 30 d, sin reseñas, sin reclamar) y OPERACIÓN, ORDENAR, CSV.
  Ficha con 8 pestañas (`tab.ndt`, datos en `bizX(b)`): Resumen (fuerza del perfil, notas, acciones: mensaje al dueño `msgs`, destacar,
  sello, cambiar categoría → cola, cierre temporal 1/3/7/14 d `temp` → la ficha dice «cerrado temporalmente», transferir, ocultar,
  suspender, cerrar `closed`) · Ficha (editar en nombre del negocio nombre/quiénes somos/teléfono/dirección/correo `edit` con aviso; el nombre
  se aplica en `TLAll`; horario y programados) · Lo que vende (módulos; pausar rsv/eventos/nov/jobs `modOff` → el Prototipo quita la
  pestaña; menú de Sabor con ocultar plato `itemOff` → `TLAdm.menuAdm`) · Operación (aceptación, respuesta, métricas, vistas, toques,
  búsquedas, operaciones) · Dinero (Stripe, pagos semanales, pausar pagos `payHold`, plan y facturas, cortesía 30/60/90, extender prueba,
  reintentar, anular `subX`) · Contenido (reseñas, novedades `novOff`, eventos, vacantes `jobOff`) · Equipo (acceso al panel `teamOff`, staff,
  vinculados) · Confianza (reportes, sello, licencia, sanciones, duplicados, cambios). **Negocio de prueba: Sabor Dominicano** (PRUEBA,
  primero): reportes abiertos RB-306, RP-901 y RP-904, facturas con un cobro fallido reintentado, historial a13–a16.
- **Historial (decisión del usuario, 14 oct):** Sistema · Historial (antes "Auditoría"). Alcance: **solo lo que hace el equipo en el
  Super Admin**; **se guarda para siempre**, solo se agrega. Cada entrada: número fijo `H-000123` (posición en la lista: AUDIT0 + entradas
  de TEAM.last como "entró", luego `tl-adm-v1.log`), fecha y hora al segundo, persona + rol, **dispositivo** (`dev` del navegador),
  sección, sobre qué, antes → después, motivo. Filtros: cuándo (hoy · 7 · 30 · todo · entre fechas aaaa-mm-dd), quién, qué (decisiones ·
  dinero · moderación · ediciones · exportaciones · entradas y salidas · deshechos), las 18 secciones, búsqueda; agrupado por día;
  exportar CSV de lo filtrado; ⌘K encuentra `H-…`. **Deshacer con motivo:** `log()` guarda `diff` (`TLAdm.takeDiff()`: lo que cambió en
  `tl-adm-v1` desde la última entrada, menos `log`/`me`); "Deshacer este cambio" → `TLAdm.restore(diff)` + entrada nueva `act: 'undo',
  undoOf`. Bloqueado si es registro (entrada/salida/exportación), ejemplo de la base, sin datos, ya deshecho, o si hubo un cambio posterior
  sobre lo mismo (pide deshacer primero el más reciente). Solo Admin o quien lo hizo. Entradas y salidas: al abrir el admin (una vez por
  pestaña, `sessionStorage tl-adm-sess-*`), "Entrar como", cerrar sesión y volver a entrar; Equipo · miembro muestra sus últimas entradas.
  Historial por ficha (`histFor`): Negocio, Usuario, Operación, Evento, Contenido, Categoría, Filtros, Ciudad. Negocio y Usuario:
  "HISTORIAL RECIENTE" (4) al final de la ficha + "Ver todo" (filtrado). **Cada sección** (menos Inicio y el propio Historial)
  cierra con "HISTORIAL RECIENTE · {sección}" (5 últimas, `secRecent`) + "Ver todo (N)" → Historial filtrado por esa sección. Acciones que antes no
  quedaban anotadas ahora sí: tomar caso, pasar a Finanzas, probar plantilla, QR, exportar transacciones (CSV real).

## 2b. MODO AUTOMÁTICO (autorizado por el usuario, 28 sep)
El usuario autorizó construir **todas las categorías que faltan, con todas sus etapas, sin preguntar**.
Cuando llegue un mensaje "sigue" / "continúa" / aviso de límite reiniciado: **no preguntes nada**, toma el
primer pendiente de la COLA, constrúyelo, revísalo en pantalla, guarda respaldo en `_tmp/`, anota lo
hecho en §6 y marca la COLA. Decide tú (tesis, línea fija, primer grupo, modelos, filas, "lo que importa")
siguiendo el método de Comida → Belleza → Auto → Hogar (copiar la estructura, cambiar solo lo que la tesis
exige; reusar vistas y motores existentes). Nada genérico como respaldo; categoría sin ficha = encargo.
**COLA** (en orden; marcar [x] al terminar cada etapa):
- [x] Hogar · planes recurrentes + renta de herramienta
- [x] Hogar · etapa 4 (reseña del hogar, ayuda con la visita, revisión desktop)
- [x] Salud `NEG-SALUD` · etapas 1–4 (tesis: ¿aceptan mi seguro y me entienden? · línea 911) — [x] 1 · [x] 2 · [x] 3 · [x] 4
- [x] Servicios Profesionales `NEG-PRO` · 1–4 (trámites: ¿puede hacerlo por ley y cuánto es en total? · "nadie te garantiza un resultado") — [x] 1 · [x] 2 · [x] 3 · [x] 4
- [x] Fiestas `NEG-FIESTA` · 1–4 (¿esa fecha está libre?) — [x] 1 · [x] 2 · [x] 3 · [x] 4
- [x] Mercados `NEG-MERC` · 1–4 (¿lo pesan delante de mí?) — [x] 1 · [x] 2 · [x] 3 · [x] 4
- [x] Vida Nocturna `NEG-NOCHE` · 1–4 (¿cuánto es el cover y cómo está la fila?) — [x] 1 · [x] 2 · [x] 3 · [x] 4
- [x] Tiendas `NEG-TIENDA` (1–4) · [x] Transporte `NEG-TRANS` (1–4) · [x] Educación `NEG-EDU` (1–4) · [x] Niños `NEG-NINOS` (1–4) · [x] Deporte `NEG-DEPORTE` ·
      [x] Iglesias `NEG-FE` · [x] Bienes Raíces `NEG-INMUEBLE` · [x] Venta de Autos `NEG-DEALER` · 1–4 cada una (ver §6: COLA completa 28 sep)
- **Revisión V1 (10 oct):** `To'Latino Revisión V1.dc.html` = alcance V1 propuesto + hallazgos de armonía (A1…) con prioridad.
  **Aplicado (usuario: "corrige todo", 10 oct).** A1: `TLEduFlow.voc(ob)` (VOCS: edu · ninos · dep · fe · inm · dealer) da rótulos,
  `lineOf(ob)` la línea fija; `neg-edu-rev.js` tiene Q / RSNS / SOLS por categoría (CUR = negocio en pantalla). Visitas (inm/dealer):
  enviada → confirmada → terminada. A2: `usrAll(s)` en el Prototipo → prop `live.all` de Mi cuenta (citas/pedidos de todas las listas,
  estado normalizado; abre la ruta real). A3: `dashLive` KM + pcitas, fcitas. A4: `prototype/neg-cita-help.js` (bundle-4):
  `TLCitaHelp` (bhelp `APP-NEG-CITA-AYUDA`, ahelp `APP-NEG-AUTO-AYUDA`), `TLAutoRev` (reseña de Auto en revWVals/revOpen),
  `TLApartar.hold` (Apartar de Belleza/Auto/Hogar/Salud → flujo de Tiendas registrando el producto en `TLTienda.SVC`), `encargo()`
  intercepta APARTAR, MENSAJE/APP-MSG (→ `USR-CHAT-NEG` con `biz`; Mi cuenta crea la conversación `d.nt`), CITA-AYUDA, INVITAR →
  RECOMENDAR. Auto "Voy tarde" = aviso en la cita (`lateN`). A6: 7 estados en etiquetas (PENDIENTE · CONFIRMADA · TE PROPONEN UN CAMBIO ·
  NO PUDO · SIN RESPUESTA · CANCELADA · TERMINADA). A5: Retenido · Cobrado · Liberado · Devuelto ("Reembolso" fuera del copy ES).
  A7: ayuda = negocio 24 h, To'Latino revisa en 48 h (todos los *-rev.js). A8: "Cancelar: gratis hasta X. Después: Y." A9:
  `TLFreeOn(b)` / `TLFreeLeft(b)` (demo: usado sale del id; `b.freeUsed` lo fija) → Free de Belleza/Auto/Hogar con filas de servicio,
  hoja y Booking; al llegar a 10, Llamar. Comida Free sigue con Llamar (pendiente). A12: "Recomienda un negocio" en los 3 lugares.
  A11: **SINCRONIZAR 18 aplicado (11 oct)** — bundle local con 67 componentes (NeighborCard, CompleteAccount, WeekAgenda, SearchResultRow, UnderstoodBar, SearchPanel, NotYetCard); puentes `ds-account.js` / `ds-search.js` ya no se cargan (respaldo en `_tmp/ds-respaldo/`). Íconos 2y aprobados (11 oct): `more` = 4a (tres puntos en línea), `works` = 4d (galería; vacantes siguen con `brief`) → master 2y, Icon.jsx, icons.js, svgs, bundle local; **SINCRONIZAR 19 aplicado (11 oct)**. Patrones aprobados con imagen (11 oct, `To'Latino Patrones por aprobar.dc.html`, capturas en `patrones/`): 2z reseña · 2aa pago de la cita · 2ab publicación con votos · 2ac boleto QR · 2ad pasos del onboarding · 2ae vista previa Free|Pro · 2af barra de selección del panel · 2ag radio con mapa · 2ah ciudad próximamente → master (componentes pendientes, igual que 2r). **Aprobados 13 oct (todo «Aprobar»):** 2ai mesa de dominó (deja de ser provisional; El Patio sigue v1.1) · 2aj tabla densa · 2ak cola con SLA · 2al fila de auditoría · 2am matriz de permisos · 2an KPI con gráfica · 2ao confirmación con motivo · 2ap barra del admin con ciudad · 2aq progreso de lote → master con imagen (`patrones/04`, `11–18-pat.jpg`); componentes pendientes. **SINCRONIZAR 21 aplicado (14 oct):** sistema con `patrones/04-pat.jpg`, `11–18-pat.jpg` y 2ai–2aq en su guía; `readme.md` de aquí ya lista 2z–2aq (sección "Patrones aprobados con imagen") y la línea de `components/account/`, para que las próximas sincronizaciones no las borren. **Provisional:** ninguno. SINCRONIZAR 20 aplicado (11 oct): sistema con 2y–2ah y `patrones/`; bundle local = el del sistema (67 componentes, íconos more/works), A13 (nativo: llamar, mapas, calendario, compartir), A14 (mover viejos).
  **Revisión de orden (11 oct):** 0 errores en 4 274 combinaciones de pantalla (17 categorías, 276 negocios, todas las pestañas, móvil y desktop, invitado y con sesión) y en las 26 pantallas de Mi cuenta, Buscar, Comunidad, Eventos, Publica, Panel y Ciudad. Bundles al día. «Escribir reseña» de Auto conectado; «Reembolso» → Devuelto/Devolución en Eventos, Mi cuenta y Panel; puentes ds-account/ds-search borrados; `neg-tienda-2.js` (sin uso) → `_tmp/`. **Pendientes construidos (11 oct):** `APP-NEG-RECOMENDAR` = `To'Latino Recomendar.dc.html` (negocio, categoría, dónde/sin local, contacto opcional = 1 SMS, cómo lo conoces, «Es mío» → Publica tu negocio, decirle que fuiste tú; desktop con vista del SMS; enviada con OrderTracker; borrador `tl-rec-draft-v1`, lista `tl-rec-v1`; `encargo()` manda INVITAR/RECOMENDAR aquí con `pre`, `city`, `back`). `APP-EVT-EDITAR` = `To'Latino Publica tu evento.dc.html` (negocio que organiza, nombre, tipo, foto, cuándo, dónde, entrada libre · RSVP · boletos · en la puerta, edad, si algo cambia; vista previa con EventCard; «Enviar a revisión» → To'Latino revisa en 24 h → Panel · Eventos). `APP-EVT-AYUDA-PAGO` → `APP-NEG-EVT-AYUDA` (mode `ehelp` en `neg-cita-help.js`; pagos los revisa To'Latino en 48 h; Eventos pasa la orden). `APP-NEG-LICENCIA` = `To'Latino Licencia.dc.html` (línea fija, por licencia: puede · no puede · emitida por · número · estado · próxima revisión · «Verifícala tú» al registro oficial; quién tiene licencia; cómo la verificamos). Comida Free con `TLFreeOn`: tiles con + en el Resumen, barra del pedido, «Ordenar» → menú, «Ir a pagar» → checkout (solo pickup); textos de Hoy y reseñas ajustados. `evt-data.js`: «Devolución total». Revisión final: 4 838 combinaciones y 35 pantallas sin errores.
  **Panel v2 conectado (11 oct):** (1) el menú del cliente lee el panel: `menuLive(TM)` en el Prototipo lee `tl-dash2-v1 · over['sabor-dominicano']` (nombre/desc ES-EN, precio, agotado, `sell:0` → «SOLO EN EL LOCAL» sin +, quitar, categorías ocultas y orden, Populares = `feat`, `menuCfg.pause` → banner «Pedidos en línea en pausa» y no se pide). (2) Hallazgo: el Panel v2 no leía `props.live`. Ahora `liveReqs(B)` mete en «Hoy» las solicitudes reales del cliente del negocio en pantalla (solo los negocios del panel: Sabor Dominicano, Barbería El Primo y el Free) y `answer()` llama `api.respond(key, id, ok|cambio|rechaza)`. «Otra hora» = `dashAlt(key, id)`: marca `scen: 'cambio'` y corre el motor de la categoría (Belleza: `TLBook.reply`, exportado; resto: `ctSim` con estado falso `scen: 'cambio'`); si el motor no tiene otra hora → «no pudo». RESPUESTA queda como herramienta del prototipo. (3) Reseñas en vivo: `dashLive` devuelve `revs` (de `myRev`); el panel las suma con `revsOf(B)` (antes `B.reviews`) y «Publicar respuesta» llama `api.replyRev(biz, id, txt)` → la reseña del cliente queda `st: 'rep'` con ese texto. (4) Eventos: «Publica tu evento» (`tl-evt-pub-v1`) sale en Panel · Eventos del negocio que lo organiza como EN REVISIÓN; detalle del evento con «Abrir modo puerta» → `doorDet` (`det: door:<id>`): Adentro · Faltan · Rechazados, «Escanear boleto» (toma el siguiente de la lista), VÁLIDO / YA USADO / NO ES DE ESTE EVENTO, buscar por nombre o código y dejar entrar, últimos en la puerta; «Adentro ahora» del evento cuenta los check-ins (`events[].chk`). Novedades, FAQ y Relacionados ya existían en el panel (no van a encargo). (5) La ficha lee del panel (`dashOv(id)`): novedades creadas en el panel (`id` n+timestamp, `st: 'live'`) entran a Novedades; FAQ del panel se suma a las preguntas de la ficha. (6) **Vacantes** en el panel (Tu página · Vacantes, parte `vac`): lista (nuevas + publicadas), «Publicar vacante» (puesto, tipo, pago por hora desde/hasta, días, horario, idiomas, qué vas a hacer; aviso sin CV/estatus/SSN/pago), editar y quitar; se guardan en `over.jobs` y `dashOv` las mete en `TLJobs.J[biz]` → salen en la pestaña Jobs, detalle y Aplicar. Revisión: 2 182 combinaciones de fichas + 14 pantallas del panel sin errores.
  Respaldos: `_tmp/Prototipo respaldo pre-revision-v1.dc.html`, `_tmp/Mi cuenta respaldo pre-revision-v1.dc.html`, `_tmp/rv1-js/`.
- **Pendientes (20 oct):** `To'Latino Pendientes.dc.html` = barrido de todos los `encargo()` reales (no los de respaldo
  `window.TLx ? … : encargo`) + memoria. P1 acciones del teléfono (CONTACTO, MAPA, CALENDARIO, SHARE, CHOFER ≈ 100 botones) ·
  P2 Inicio «Abierto ahora» (openBiz2–4 nombres fijos) · P3 Inicio → APP-COM-HOY · P4 Mi cuenta → APP-EVT-BUSQ · P5 galería
  (APP-NEG-GALERIA) · P6 Eventos de la ficha sin `eid` (APP-EVT-DETALLE) · P7 APP-NEG-EVENTO-PRIVADO · P8 recibo correo/PDF ·
  P9 APP-SOPORTE · P10 USR-PERFIL-FOTO · P11 ONB-NEG-RECUPERAR · P12 APP-NEG-MAPA. A medias: M1 panel por categoría (Panel v2 =
  Sabor Dominicano; Menú completo, svc/shop/renta generales) · M2 Staff Free · M3 alertas `tl-search-v1` en Mi cuenta · M4 día 30.
  Entrega: E1 patrones 2r, 2z–2aq → componentes · E2 modelo de datos · E3 (A13) · E4 (A14) · E5 ajustes del usuario.
- **Alcance V1 (decisión del usuario, 20 oct):** todo lo que se construye en este proyecto va a la versión 1: las 17
  categorías completas, cliente + panel + Super Admin, **nada a medias**. Anula el alcance por partes de `Revisión V1`
  («lo que cobra dinero entra por partes») y el «El Patio v1.1»: Parchís y Mesa privada pasan a pendientes (P13).
  P14 (hallado en P1): falta «Calendario» en el estado de la cita de Belleza, Noche, Transporte y Educación (y sus voces).
- **P1 hecho (20 oct) · acciones del teléfono.** `prototype/biz-contact.js` (`window.TLContact`, cargado en Prototipo y Super
  Admin; el Prototipo ahora carga también `dash2-data.js`) + hijo `To'Latino Teléfono.dc.html` (montado siempre en el marco
  móvil y en el desktop, `req = state.telSh`; `nav()` lo cierra). `encargo()` intercepta APP-NEG-CONTACTO · APP-MAPA /
  APP-NEG-MAPA (con lugar; sin lugar sigue a P12) · APP-CALENDARIO · APP-SHARE / APP-COMPARTIR · APP-NEG-PEDIDO-CHOFER →
  `TLContact.resolve()`. Móvil = hojas del sistema (iPhone; en Android, las suyas): Llamar al número · WhatsApp si el negocio
  lo marcó (`wa` del panel) · Copiar; repartidor Miguel Reyes con número temporal (dura `TLAdm.cfg('drvMask', 30)` min tras
  entregar; sin repartidor → «Llamar a {negocio}»); Cómo llegar: Mapas · Google Maps · Waze · Copiar (en casa = calle hasta
  confirmar, exacta de `TLBook.CFG[id].casa` con cita confirmada; a domicilio = «va a tu casa»); Nuevo evento (sin pedir
  permiso: iOS 17+ y Android no lo piden) con «(por confirmar)» si está pendiente, Salud y Profesionales sin el motivo en el
  título, alerta 2 h antes; «Ya está en tu calendario» (`tl-cal-v1`); Compartir: WhatsApp · Mensajes · Correo · Copiar enlace.
  Desktop = ventana To'Latino (BusinessRow + Button) con enlaces reales: Google Maps / Apple Maps / Waze, Google Calendar /
  Outlook / .ics, wa.me, Facebook, correo, y portapapeles real. Enlaces `tolatino.app/hazleton/{id}` (+ `/jobs/{id}`,
  `/novedades/{id}`), `/c/{cita}`, `/evt/{id}`. Teléfono y dirección: una sola fuente (`TLContact.tel/addr`; base `tel0/addr0`
  = la fórmula que ya tenía el admin): gana lo más reciente entre la edición del Super Admin y lo que el dueño guarda en su
  panel (`over._at`, nuevo en `over()` del Panel v2); ficha, Mi cuenta, panel y admin leen lo mismo. Corregido: `dash2-data`
  tenía otras direcciones (Sabor 221 → 412 N Wyoming St; El Primo 18 W Broad St → 205 N Wyoming St) y el admin mostraba el
  estado («cierra 9 PM») como dirección en la cola del Sello. Toques `tl-taps-v1` → Panel v2 (contactos y «lo que tocan») y
  Super Admin (`insLive`: Operación · lo que tocan, con Compartir). Super Admin: Twilio Voice en Integraciones y `drvMask` en
  Configuración. Eventos y Mi cuenta: Calendario y Cómo llegar abren estas hojas (antes, un aviso falso). Novedades comparte la
  publicación (`share(p)`).
- **Rápidos hechos (20 oct):** P2 Inicio «Abierto ahora» = `openNow(from)` (TLAll: abierto, sin `at`, el más cercano por categoría
  food · bell · merc · salud · auto…, Pro primero; `openNowM` 3 · `openNowD` 4 con `sc-for` de BusinessRow). P3 «Hoy en el barrio» →
  `APP-COM-HOY`. P4 `APP-EVT-BUSQ` en `encargo()` → Eventos. P6 pestaña Eventos = solo `TLEvt` (sin `X.EVENTS` de respaldo); nuevos en
  `evt-data.js`: `merengue-sabor`, `sancocho-domingo`, `playoffs-fogon` (antes «Serie del Caribe», también en `neg-listing.js`/bundle-3),
  `clase-bizcocho` (tks $25 · 12); la novedad n6 de Sabor encuentra su evento por título. P8 recibo: `rcpMore()` — correo = el de la
  cuenta (`s.user.email`) o lo pide y lo guarda (`rcpM`); PDF real con `prototype/receipt-pdf.js` (`TLPdf.receipt`, Helvetica/Courier
  WinAnsi); plantilla `recibo` en Super Admin · Avisos. P10 foto de perfil: hoja `sheet.k = 'foto'` en Mi cuenta (Tomar foto con
  `capture` · Elegir · Quitar; recorte con arrastre + zoom → 320 px JPEG dataURL en `user.photo` + `photoAt`); `USR-PERFIL-FOTO` →
  `USR-PERFIL` con `foto` y `back`; IMG/PX aceptan `data:`/`https:` (Mi cuenta, `com-data.js`, `adm-data.js`); Super Admin · Usuario
  EN VIVO muestra la foto y «Quitar foto de perfil» con motivo → `usr.live.photoOff` (Historial); `photoGuard()` del Prototipo la quita y
  Mi cuenta dice por qué. P14 Calendario en Belleza (antes `flash` falso), Noche, Transporte y Educación (+ voces) vía `TLContact`
  (`calOf` lee `svc`/`svcEn` y la hora de `gL`); fuentes y bundles 1, 2 y 4. M3 Mi cuenta · Avisos = `alertsB()` (lee/quita
  `tl-search-v1.alerts`). Respaldos: `_tmp/* respaldo pre-rapidos.dc.html`, `_tmp/rapidos-js/`.
- **M2 hecho (20 oct) · Staff Free = 1 persona.** `prototype/neg-free-staff.js` (cargado en Prototipo y Super Admin): 113 negocios
  Free con quien está detrás — `[nombre, rol, role, desde, idiomas, apodo, palabras ES, words EN, foto Pexels]`; se registra en
  `TLListing.STAFF[id]` y `TLStaff.PEOPLE[id]` (`free: 1`) solo si no hay staff propio → el Resumen (`resAdd`, OwnerCard 2p) la muestra
  sin equipo. `resAdd`: apodo desde `p0.nick` («LE DICEN …») y `hasPerson` falso si `TLAdm.bizSt(id).staffOff`. Super Admin · Negocio ·
  Equipo: nota «Free muestra 1 persona», «Quitar de la página» / «Volver a mostrar» con motivo (`biz[id].staffOff`, Historial). Fotos
  revisadas en hojas de contacto (`_tmp/free-staff-*.png`; fuentes `_tmp/free-staff-*.json`). Belleza Free «solo»: la cita ya dice con
  quién (`X.STAFF[own][0][0]`).
- **P5 hecho (20 oct) · galería.** `prototype/biz-photos.js` (`window.TLPhotos`: `biz(b)` = galería del panel `over[id].gallery` →
  `TLDash2.BIZ[id].gallery` → `b._ph0`/`b.ph` → `b.photos`; `rev(b, mine)` = fotos de `TLRev.forBiz`; `{ all: true }` incluye quitadas;
  `count`, `report`, `reported`; envuelve `TLRev.forBiz` (original en `forBiz0`) para quitar fotos con `phOff`). Hijo
  `To'Latino Galería.dc.html` en ruta `APP-NEG-GALERIA` (`biz`, `at`, `n`, `back`; montado como Licencia, con marca compacta en móvil;
  al recargar vuelve a la ficha): secciones Del negocio · De los vecinos, chips si hay de las dos, grilla 3 col (móvil) / auto-fill 200
  (desktop), visor `position:fixed` con flechas, swipe y teclado, «Ver su reseña» (→ ficha con `ltab: 'rev'`), «Reportar foto» (pide
  sesión; motivo + nota → `tl-ph-rep-v1`). Ficha: `ph` sale de `TLPhotos.biz`, conteo real en la cabecera y «Ver las N fotos», cada
  foto del Resumen abre el visor en esa foto (`openGal(b, i)`). Super Admin: reportes → Colas · Medios (`flag: 'rep'`), «Quitar foto» de
  la cola escribe `biz[id].phOff`; Negocio · Ficha = FOTOS DEL NEGOCIO + FOTOS DE RESEÑAS con Quitar / Restaurar y motivo (no deja quitar
  la única visible), `phSet()`; `TLAdm.apply()` filtra `b.ph` (tarjetas). Panel v2 · Fotos: aviso «To'Latino quitó N fotos: motivo».
- **P7 hecho (20 oct) · evento privado.** `prototype/evp-flow.js` (`window.TLEvp`: `cfg(b)` = max de `TLRsv.CFG` + `CAP` (Sabor 40 ·
  Fogón 60 · Bahía 30), lead 3 días, áreas + «Todo el local»; OCC · MENU · BUD · EXT; `quote()` = menú × personas, área, extras,
  impuesto 6 %, depósito `TLAdm.cfg('evpDep', 25)` %, cancelar gratis `cfg('evpCx', 72)` h; `add/upd/respond/sim`). Lista en
  `state.evps` (`pend → quote | alt | no | exp`, `ok` al aceptar con `paid`, `cx` con `refund`). Hijo `To'Latino Evento privado.dc.html`
  en `APP-NEG-EVENTO-PRIVADO` (`biz`, `p`, `eid`/`cid`, `back`): móvil 3 pasos con StepHeader + barra fija; desktop todo en una página +
  columna 372 con resumen y Enviar. Estado con OrderTracker, propuesta (filas, total, depósito, resto en el local, política), aceptar
  (tarjeta rechazada con `scen: 'tarjeta'`), pedir cambio = Mensaje, otra fecha, calendario (`TLContact`), cómo llegar, cancelar con
  hoja; no pudo / sin respuesta → otra fecha, mesas aparte, otros restaurantes. Responde el panel: `dashLive` KM `evps: 'cot'`,
  `dashRespond` → `TLEvp.respond`; negocios sin panel responden solos a los 4 s. `usrAll` incluye `evps` (Mi cuenta) con `kind: 'evp'`,
  `paid`, `dep`; Super Admin · Transacciones muestra el depósito cobrado («Depósito · evento privado»), Configuración `evpDep`/`evpCx`,
  plantilla `evp_prop`.
- **P9 hecho (20 oct) · soporte.** `prototype/sop-store.js` (`window.TLSop`, en Prototipo y Super Admin): casos en `tl-sop-v1`
  (`add` crea `TK-52xx` con aviso automático, `push`, `set`, `pick` = respuesta de ejemplo de Dayana a los 5 s, `thread` mezcla los
  mensajes del vecino con los del equipo de `tl-adm-v1.notes[id].msgs` por `at`, `stOf` nuevo · curso · espera · res (res si el vecino lo
  cerró, `notes.st === 'res'` o `dec[id]`), `openCount`). Hijo `To'Latino Soporte.dc.html` en `APP-SOPORTE` (en la lista de rutas que
  sobreviven a recargar; pide sesión; `pre` = pedido en pantalla si vienes de la ayuda del pedido): móvil lista → caso nuevo / chat;
  desktop dos columnas (lista 360 · caso). Lista: intro + «Escríbenos», «To'Latino está revisando» (ayudas escaladas de `admLive`,
  abren `APP-NEG-PEDIDO-SOLICITUD`), Tus casos (RequestCard con estado). Caso nuevo: 7 temas (`TLSop.CAT`), «¿Cuál?» con operaciones de
  `usrAll` + pedido, texto ≥ 10, foto (900 px), «No escribas números de tarjeta ni contraseñas». Chat: burbujas como Mi cuenta, foto,
  «Ya se resolvió», resuelto → «Abrir otro caso» (mismo tema y referencia). Super Admin: `liveItems` mete los casos abiertos en la cola
  `ticket` (uid `live`, `TKCAT.pedido` nuevo), el hilo vivo sale de `TLSop.thread`, `say()` guarda `at`, Responder / Resolver llegan al
  chat del vecino. Mi cuenta: «Ayuda y soporte» dice «N CASOS ABIERTOS».
- **P11 hecho (20 oct) · recuperar tu negocio.** Hijo `To'Latino Recuperar negocio.dc.html` en `ONB-NEG-RECUPERAR` (`biz`, `q` = nombre
  escrito, `n`, `back`; sobrevive a recargar). `encargo('ONB-NEG-RECUPERAR', …, nombre)` busca el negocio por id o nombre normalizado; sin
  coincidencia = «¿Cuál es tu negocio?» con parecidos + Soporte. Formulario: rol (dueño · socio · encargado: el dueño recibe aviso), cómo lo
  comprobamos: llamada al teléfono del negocio (`TLContact.tel`, enmascarado) → código de 6 números · o documento (licencia · luz/agua ·
  IRS EIN · otro, foto obligatoria, «tapa los números de cuenta»); nota; «Nunca te pedimos documentos de identidad ni tu estatus
  migratorio». Si `TLAdm.bizOwner` ya tiene dueño → solo documento + aviso. Guarda en `tl-claim-v1` (`CL-71xx`); estado = `tl-adm-v1.dec[id]`
  (approve → «Ya es tuyo» + Ver tu página / Abrir tu panel si hay datos de panel · reject → motivo + probar con documento / Soporte).
  Super Admin: `liveItems` mete los reclamos en Colas · Cambios sensibles (`type: 'claim'`, `toUid: 'live'`, evidencia + foto); `tu` usa
  `this.U()` (cuenta EN VIVO); al aprobar, `biz[id].owner = 'live'`. Desktop: columna 372 con el negocio, «Al recuperarlo» y el botón.
- **M4 hecho (21 oct) · día 30.** `prototype/pro-trial.js` (`window.TLTrial`, cargado en Prototipo, Panel v2 y Super Admin; `tl-trial-v1 =
  { biz: registro | null }`, null = plan de base). Semilla: **Barbería El Primo entró con Pro el dom 30 ago → hoy es su día 25** (ya
  recibió el aviso). Ciclo: día 0 → día 20 resumen (push · correo) → día 25 aviso con lo que se duerme en sus números (SMS · push ·
  correo) → día 29 último día (solo si no decidió) → día 30: sin tarjeta pasa a Free sin borrar nada · con tarjeta primer cobro.
  `of(id)` = st trial | pro | free · phase build | d20 | d25 | last | ended | pro; `trialAdd` y `subX` del admin extienden / anulan;
  cortesía del admin = Pro. Acciones: `start` (Doña Luz «Probar Pro · 30 días gratis»), `addCard` (en prueba = sigue con Pro, primer
  cobro el día 30; ya en Free = vuelve a Pro con cobro ese día, sin segunda prueba), `noCont` (no sigue: Pro hasta el día 30), `undo`,
  `leavePro` (Pro pagado → Free al fin del periodo, 1 oct), `setCycle` (mensual · anual = 10 meses, «2 meses gratis»), `setDay`
  (barra). `inv(B)` = se sigue viendo · se duerme · se respeta con sus números (5 ítems, 6 fotos, la persona detrás sin equipo,
  reseñas sin respuesta, techo Free; pestañas, ítems y fotos de más, equipo, reservaciones, novedades, FAQ, relacionados, vacantes,
  crear eventos, feriados, horario por módulo, respuestas, moderadores, insights, Destacados; lo confirmado, boletos vendidos y
  cobros con tarjeta se respetan). `pv(B)` = vista previa 2ae con datos del panel. `apply()` cambia `b.pro` en TLAll (ficha y
  resultados bajan a Free); lo llama también `TLAdm.apply()`. Plantillas `trial_d20/d25/d29/end`, `pro_first`, `pro_back` (Super Admin ·
  Notificaciones · Al negocio, editables en `notes['tpl:k']`). **Panel v2:** Tu página y Hoy con el aviso según la fase (día 20 con
  KPI; ya en Free = bloque «Tu contenido Pro está guardado» + Volver a Pro); Cobros y plan · TU PLAN (`planBlocks`): fila, barra
  día N de 30, línea del tiempo, vista previa Free | Pro (bloque `pv`), lo que pasa el día 30, seguir / no seguir, avisos enviados y
  programados; detalles `plan:card` (mensual / anual, Visa ·· 4242 de la cuenta u otra tarjeta) y `plan:free`; `lockB` dice «Probar
  Pro» o «Volver a Pro»; la barra de revisión trae Sin prueba · día 0 · 20 · 25 · 29 · Terminó. **Prototipo:** barra PRUEBA PRO en
  rutas DASH (negocio abierto en el panel); `DASHR` ahora incluye COBROS (antes «Cobros y plan» no abría dentro del prototipo).
  **Super Admin:** Suscripciones lee las pruebas reales (`SUBS()` mezcla `TLTrial.sub`; estado nuevo TERMINÓ LA PRUEBA; día N de 30,
  con tarjeta / no sigue / sin tarjeta; KPI «terminan en 7 días»), Planes · PRUEBA · DÍA 30, Negocio 360° · Dinero · PRUEBA PRO
  (`trialAdm`: estado, fechas, tarjeta, decisión, avisos y lo dormido). Respaldos: `_tmp/* respaldo pre-dia30.dc.html`,
  `_tmp/dia30-js/`.
- **P12 hecho (21 oct) · mapa de negocios.** Hijo `To'Latino Mapa.dc.html` en `APP-NEG-MAPA` (`ids`, `label`, `back`; sobrevive a recargar):
  teselas reales (ArcGIS World Street Map, como Ciudad) con zoom ± , centrar y arrastrar; radio 2ag (centro + radio de `TLCity`, «Cambiar» abre la
  hoja de ciudad); pines: negro = Pro, morado = Free, círculo punteado = trabaja desde casa (`b.casa`, zona aproximada); sin local (`_d0 === 0`)
  = sin pin, en la lista con «A DOMICILIO» / «SIN LOCAL»; fuera del radio, gris. Chips Todos · Abierto ahora · Verificados · Destacados (+ las
  17 categorías si no vienes con filtros). Tarjeta del negocio con Ver negocio y Cómo llegar (`TLContact`). Móvil: mapa arriba, lista abajo
  (tocar = ficha). Desktop ≥ 960: lista 400 a la izquierda (tocar = centra y marca) y mapa sticky; < 960 una columna. Entradas: `goMap`
  (Inicio: tarjeta del mapa, ahora real con `miniMap`; categoría: botón Mapa y tarjeta del rail con los ids filtrados `_negIds`), Buscar
  (chip Mapa → `srchApi.map(ids, label)`), y cualquier `APP-MAPA` / `APP-NEG-MAPA` sin lugar (`openMap(mapCtx())`). Super Admin · Negocio ·
  Ficha: EN EL MAPA (pin · zona aproximada · sin pin).
- **P13 hecho (21 oct) · El Patio: parchís y mesa privada.** `prototype/patio-parchis.js` (`window.TLParchis`, cargado en Comunidad): tablero 19×19
  (68 casillas en la vuelta: brazos de 3 × 8, la del medio de cada brazo es el pasillo de 7; salidas 5 · 22 · 39 · 56, seguras 5 · 12 · 17 · 22 ·
  29 · 34 · 39 · 46 · 51 · 56 · 63 · 68; amarillo = tú abajo a la derecha, azul, rojo, verde en sentido contrario al reloj); ficha k = −1 casa ·
  0–63 vuelta · 64–70 pasillo · 71 meta. Reglas: sale con 5 (rápido: 2 fichas y sale con 5 o 6), 6 = tira otra vez (sin fichas en casa cuenta 7),
  tres 6 = la última vuelve a casa, comer = cuentas 20, meta = cuentas 10, barrera de 2 del mismo color, máx. 2 por casilla, meta exacta.
  `create/roll/move/opts/bot` (bots con prioridad: comer > meta > pasillo > salir > segura); probado con 360 partidas simuladas sin trabas.
  Comunidad: `APP-PATIO-PARCHIS` (sin partida = «¿Cómo juegan?» 2 · 3 · 4 y Clásico · Rápido → Jugar; mesa oscura como el dominó con
  jugadores, tablero claro, dado con puntos, «Tirar el dado», jugadas posibles como filas con COME / META, fichas que se pueden mover con anillo
  verde y tocables, frases rápidas, fin con «Otra partida»); `d.par`; bots cada 0.85 s y se adelantan al abrir El Patio. `APP-PATIO-PRIVADA`
  (`tab` new · join, `g` dom · par): crear se abre en el rango `gam.patio.privRank` (6 = Teniente; si no, tarjeta «se abre en…» + entrar con
  código); juego, a 100/200 y pareja (al azar / yo la elijo) o jugadores y modo, ritmo 24 h / 1 h, invitar (sigues + los que juegan en El Patio,
  hasta los lugares), reglas → `d.priv` con código de 6 (sin 0/O/1/I); sala: código, Copiar (portapapeles real), WhatsApp (wa.me), invitados que
  aceptan a los ~2.4 s, «Así se sientan», Empezar (la computadora llena lugares: `bot1…`), Cerrar la mesa. Entrar con código: `PRIV_IN`
  (K7Q2MX dominó a 200 de Carmen con Yami de pareja · R4P9TB parchís de Ramón) y «Te invitaron». El dominó ahora usa `g.seats`, `g.target` y
  `g.priv` (textos ya no fijos en Carmen/Ramón). El Patio: tarjetas «te toca» de dominó, parchís y sala privada (`pt.tocas`), tarjeta de mesas
  privadas, botones Privada en los dos juegos, monedas diarias del admin. `d.pst` cuenta partidas terminadas y ganadas. Prototipo: barra RANGO
  (Recluta · Teniente) en rutas APP-PATIO. **Super Admin · Gamification · El Patio** (ya no «v1.1»): KPI, ajustes (rango para mesas privadas,
  monedas diarias, parchís rápido, aviso de tiempo jugando → `tl-adm-v1.gam.patio`, Comunidad lo lee al instante), reglas fijas, ANTITRAMPA
  (mesa Z8M3QD con dos cuentas del mismo dispositivo), MESAS (las de la cuenta EN VIVO + ejemplo) con Cerrar / Reabrir con motivo
  (`gam.patio.closed[code]` → la sala y «Entrar con código» lo dicen), Historial; Usuario 360° · Comunidad · El Patio con partidas y mesas en vivo;
  bandera de Sistema «El Patio (dominó y parchís)» encendida. Tablero de parchís aprobado como 2ar (22 oct). Sigue: M1.
- **M1 · plan por etapas (21 oct, modo automático).** Panel v2 hoy = 3 negocios (`TLDash2.BIZ`: Sabor, El Primo, Doña Luz). M1 agrega la
  herramienta propia de cada categoría en «Lo que vendes» y un negocio demo por categoría en el selector del panel (`prototype/dash2-cat.js`,
  `TLDashCat`: arma el registro del panel desde el negocio Pro de TLAll de esa categoría — ítems de su SVC, horario, fotos, reseñas — y lo
  registra en `TLDash2.BIZ`; la herramienta lee y escribe `tl-dash2-v1 · over[id].cat` y la ficha / el flujo del cliente lo leen). Cada etapa
  también en el Super Admin (Negocio 360° · Lo que vende) el mismo turno. Etapas: **M1a** infraestructura + Belleza (agenda por persona y sillas)
  · Salud (seguros que acepta, idiomas) · Profesionales (licencias, lo que no puede, total por escrito). **M1b** Auto y Hogar (estimado línea por
  línea, extra con foto, listo para recoger; Hogar + planes y renta de herramienta). **M1c** Noche (esta noche: cover, edad, música, lista, fila
  en vivo, mesas con mínimo) · Fiestas (calendario de fechas, paquetes, depósito) · Transporte (salidas y asientos, cajas, mudanza). **M1d**
  Mercados (balanza con foto, sustituciones) · Tiendas (tallas y existencias, apartados 48 h, layaway) · Venta de Autos (inventario: millaje,
  título, total en la puerta, pruebas de manejo). **M1e** Educación (grupos, cupos, matrícula) · Niños (licencia, cupos por edad, subsidio) ·
  Deporte (membresías, contrato) · Iglesias (horarios, ayuda gratis) · Bienes Raíces (propiedades, depósito, visitas). Comida ya está (Menú).
- **M1a hecho (21 oct).** `prototype/dash2-cat.js` (`window.TLDashCat`, cargado en Panel v2 y Prototipo después de dash2-data): registra en
  `TLDash2.BIZ` **Centro Médico Familiar Quisqueya** (NEG-SALUD) y **Bufete Almonte · Inmigración** (NEG-PRO) con la forma completa de dash2-data
  (clon de El Primo + sus ítems, equipo, reseñas, solicitudes). Lo que vendes trae arriba «TU HERRAMIENTA» → `DASH-MODULOS` sub `cat` →
  `TLDashCat.blocks(this, ctx)`; se guarda en `over[id].tool` (no `cat`, que es la categoría). Belleza = **Sillas y agenda** (por silla de
  `TLBook.PROS`: aprobar al instante, responde en 15/30/60 min, depósito $0/5/10/15; renta = su agenda) · Salud = **Seguros e idiomas**
  (públicos/privados con interruptor, sin seguro + precio, idiomas, video, pacientes nuevos) · Profesionales = **Licencias y el total por escrito**
  (licencias con estado verificada / en revisión / no; agregar = en revisión 48 h; lo que no haces (3 frases); honorario + gobierno = total por
  trámite). `apply()` lo pasa al cliente: Salud → `b.ins`, tags (medicaid/medicare/chip/seguro/sinseguro/tele), `b.cash`, `b.fee`; Pro →
  `b.lic` (solo verificadas) y `b.cant`; Belleza → `TLBook.PROS` apr/dep/auto. **Super Admin · Negocio 360° · Lo que vende:** SU HERRAMIENTA
  (resumen) + licencias con Verificar / No se pudo (`biz[id].licOk[k]` 1|0, Historial). Corregido: dueño, equipo y servicios de los demos salen
  de la ficha real (`REAL`: TLListing.STAFF · TLStaff.PEOPLE · TLSaludL/TLProL.SVC; gobierno de cada trámite = `gov` del SVC); «Medicaid, Medicare y CHIP».
- **M1b hecho (21 oct) · Auto y Hogar.** Demos **Taller Hermanos Peña** (NEG-AUTO) y **Multiservicios Hermanos Díaz** (NEG-HOGAR) desde la ficha real
  (`REAL_B`). Auto = **Taller y estimados**: mano de obra por hora (step 5), garantía 3/12/24 meses, listo el mismo día antes de 11 AM · 12 · 2 · 3 PM,
  reglas fijas (línea por línea, nada extra sin OK con foto, impuesto solo en piezas, piezas viejas). Hogar = **Visitas, planes y renta**: tarifa,
  zona 10/15/20/30 mi, emergencias 24 h, planes (cobro mensual) y renta de herramienta con interruptor, reglas fijas. Cliente: `rateOf()` de
  `neg-auto-flow.js` y `neg-hogar-flow.js` lee `TLDashCat.rate(id)` (bundle-4 regenerado) → el estimado usa la tarifa del panel; `apply()` pone
  `b.warr`, `b.eta` (corte), `b.zone`, tag `h24` y quita planes / rentas pausados de `TLHogarL.SVC/SHOP`.
- **M1c hecho (21 oct) · Noche, Fiestas y Transporte.** Demos **La Terraza Night Club**, **Salón Imperial** y **Van Express Hazleton–NY** (`REAL_C`, misma
  fuente que la ficha). Noche = **Esta noche**: cover (step $5), después de las 11 PM / 12 AM, edad 18+/21+, la lista vale hasta 11 PM–1 AM, la fila
  ahora (sin fila · 10 · 20 · 30+ min), música; reglas fijas (cover publicado = puerta, mínimo de mesa no es cargo). Fiestas = **Calendario y depósito**:
  viernes a domingo de las próximas 5 semanas para marcar ocupadas, depósito (step $50), invitados máximo (step 10); reglas (la fecha no es suya hasta
  que confirmas, paquete sin cargos escondidos). Transporte = **Salidas y asientos**: salidas del día con interruptor, asientos libres de la próxima,
  maletas incluidas; reglas (precio cerrado, cancelar gratis 24 h). `apply()`: Noche → `b.nt` (cover, after, edad, list, fila) y tags (música,
  e18/e21, cover/sincover, fila); Fiestas → `b.busy`, tags `d:N`, `b.dep`, `b.cap`, `b.eta` (próximo sábado libre); Transporte → `b.st` (salidas) y
  `b.eta` (próxima salida · quedan N).
- **M1d hecho (21 oct) · Mercados, Tiendas y Venta de Autos.** Demos **Supermercado La Cosecha**, **Boutique Yaritza** y **Autos El Cibao** (`REAL_D`;
  dueño de Autos El Cibao = Juan Polanco porque la ficha no tiene persona). Mercados = **Balanza y pedidos**: pickup / envío (al menos uno), precio por
  libra de los cortes (step 10¢), «se acabó hoy» por producto; reglas fijas (se pesa delante con foto, peso real con retención +10 %, sustituir solo con
  OK). Tiendas = **Tallas y apartados**: guardar 24/48/72 h, layaway, existencia por talla (0 = agotada, no se aparta) (`SZ0`); reglas. Venta de Autos =
  **Inventario del lote**: en el lote / vendido y precio por carro (step $100), KPI en el lote · vendidos · en la app; reglas (total en la puerta antes de
  firmar, ITIN con tasa por escrito). `apply()`: Mercados → tags pickup/envio + `TLMercL.SVC` sin agotados y con precio nuevo; Tiendas → tag layaway,
  `b.eta` (horas), `TLTienda.SVC` tallas; Autos → `TLEduL.SVC` sin vendidos y con precio, `b.eta` (N carros en el lote). 
- **M1e hecho (21 oct) · Educación, Niños, Deporte, Iglesias y Bienes Raíces. M1 completo (17 categorías con herramienta).** Demos (`REAL_E`,
  ficha real; sin persona en la ficha → dueño solo en el panel): **Inglés Para Todos Hazleton** (Miriam Castillo) · **Guardería Mis Angelitos**
  (Altagracia Reyes) · **Power Gym Hazleton** (Anthony Guzmán) · **Parroquia Santa María** (Padre Luis Herrera) · **Rentas Hazleton Latino**
  (Yesenia Batista). Educación = **Grupos y cupos** (precio por curso, primera clase gratis, libro y materiales aparte, cupos por grupo; un grupo en 0
  no sale; al menos uno abierto) · Niños = **Cupos y licencia** (cupos por edad 2 · 3 · 4–5, precio por semana, CCIS, horario extendido, comidas;
  licencia DHS fija) · Deporte = **Membresías y contrato** (sin contrato / 12 meses + costo de cancelar, mensualidad, inscripción, pase de un día,
  primera visita gratis, guardería) · Iglesias = **Horarios y ayuda** (misas en español Sáb 6 PM · Dom 8 AM · Dom 12 PM · Mié 7 PM, despensa ·
  jóvenes · bodas, catecismo abierto/cerrado) · Bienes Raíces = **Propiedades y visitas** (disponible/rentado, renta y depósito step $25, horas de
  visita, sin SSN/ITIN, mascotas; al menos una disponible). **Familia Educación:** su `reg()` copia su SVC a `TLEduL.SVC` en cada render, así que
  `eduSet(b, fn)` escribe en la fuente de la categoría (TLDealerL/TLNinosL/TLDeporteL/TLFeL/TLInmuebleL o TLEduL) + `TLEduL.SVC` desde una copia
  limpia (`PRIS`) y rehace `TLListing.MENU` (`menuSync`, también en Mercados, Tiendas y Hogar). **Corregido de M1d:** lo vendido en Venta de Autos
  se perdía en el siguiente render; ahora usa `eduSet`. `apply()` guarda `regKey()` (negocios + SVC) y un hook en `TLReg` vuelve a aplicar si llegan
  negocios después (la familia Educación se registra con `setTimeout`). `over()` con caché por texto. Guardería: `k: 'semana'` (antes decía
  «/mes» con precio de semana) → `priceFor` «/semana» e «Inscribirme» (neg-ninos-listing, neg-edu-listing, bundle-2).
  **Corregido (21 oct):** los 16 controles de «Tu herramienta» mostraban el valor anterior tras tocar (el panel guarda en localStorage después de
  redibujar). `toolOf(B)` = `B.tool` del panel (ya con el cambio) y si no, lo guardado; `save()` mezcla sobre la herramienta viva (`C.B().tool`).
- **E1a hecho (21 oct) · Super Admin 2aj–2aq → componentes.** `components/admin/Admin.jsx` (+ d.ts, prompt, `admin.card.html`): `AdminBar` +
  `AdminNav` (2ap), `DenseTable` + `Pager` (2aj; en móvil `AdminList` · `AdminRow`), `QueueCard` (2ak, `state` ok · soon · late · done), `AuditLog` ·
  `AuditRow` (2al), `PermMatrix` (2am), `KpiRow` · `KpiCard`, `BarChart`, `HBars` (2an), `ReasonConfirm` (2ao), `BatchProgress` (2aq), `AdminNote`.
  `Button` con variantes nuevas `danger` (#C0392B) y `ghost` + `BUTTON_VARIANTS` (el admin ya pedía v: 'danger'/'ghost' y salían sin estilo: ahora lo
  irreversible sale rojo, como dice 2ao). **Puente** `prototype/ds-e1.js` (generado con `_tmp/ds-e1-build.js` desde los JSX con Babel; no se edita a mano;
  espera al bundle aunque cargue antes, registra solo lo que falta y envuelve Button con un accesor mientras el bundle no traiga `BUTTON_VARIANTS`).
  Super Admin: carga el puente después del bundle; los bloques kpis · rows · table · queue · note · audit · matrix · bars · chart se montan con
  `x-import … dc-props="{{ b.ds }}"` (adaptador `dsB(b)` en renderVals para todas las ventanas); `bulkBlocks` = bloque `batch`, `cfBlocks` = bloque `cf`;
  barra y lateral = `adminBar` / `adminNav`. Master 2aj–2aq ya dicen su componente; `readme.md` con `components/admin/`; **SINCRONIZAR 22** en
  `Setup Design System (copiar)` (pendiente de pegar en el proyecto del sistema; luego copiar el bundle a `_ds/` y el puente deja de hacer falta).
  Respaldo: `_tmp/Super Admin respaldo pre-E1.dc.html`.
- **E1b hecho (21 oct) · Comunidad 2ab, 2r, 2ai → componentes.** `components/community/Post.jsx` (PostCard, VoteBar, PollOptions · 2ab),
  `Thread.jsx` (TopAnswer 17d, AlsoRecommended 17c, CommentCard + CommentActions 17a, ReplyThread 18a · 2r), `Patio.jsx` (DominoTable, DominoTile, GameSeat,
  QuickReactions, GameEnd · 2ai; ParchisTable + ParchisBoard + DieFace = **2ar**, aprobado el 22 oct);
  tipos y guía en `E1b.d.ts` / `E1b.prompt.md`. Puente `prototype/ds-e1.js` regenerado (33 componentes). Comunidad carga el puente; muro → PostCard
  (children = fotos, negocio, encuesta con PollOptions, mejor respuesta, aviso de salud), hilo → TopAnswer / CommentCard (children = cajita de responder) +
  ReplyThread + AlsoRecommended, APP-PATIO-MESA → DominoTable, parchís en juego → ParchisTable. Adaptador `e1(v)` tras `vals()` en renderVals.
  Master: 2ab, 2r y 2ai con su componente (2ai: «El Patio entra en V1»). readme, **SINCRONIZAR 23**. Respaldo `_tmp/Comunidad respaldo pre-E1.dc.html`.
  Pendiente de E1b: Novedades de la ficha (Prototipo) con PostCard.
- **E1c hecho (21 oct) · cliente 2z, 2aa, 2ac → componentes.** `components/listing/Review.jsx` (ReviewCard 2z; `summary` = Resumen),
  `components/booking/Payment.jsx` (PaymentSummary + DepositOutcomes 2aa; `notes`, `hold`, `cardError` cubren Auto), `components/cards/Ticket.jsx` (TicketQR + QrCode 2ac;
  el QR de muestra ya no se arma con createElement en Eventos). PostCard ampliado (`card`, `tags`, `chip`, `sub`, `data-slot="after"` para los comentarios abiertos) →
  **Novedades de la ficha** (pendiente de E1b) ya usan PostCard. Prototipo: carga el puente; reseñas (Reseñas y Resumen, móvil y desktop), Booking · pago, Booking · tu
  depósito, Booking auto · pago y Novedades montan los componentes; adaptador `e1(v)` dentro de `renderVals()` antes de devolver `renderVals0()`. Eventos: Mis boletos →
  TicketQR (`k.ds`; móvil en celda de 250). Mi cuenta · «Boleto · QR» (pase grande con foto) no es 2ac y sigue igual. Master 2z, 2aa, 2ac con su componente;
  readme; **SINCRONIZAR 24**. Puente con 38 componentes. Respaldos: `_tmp/Prototipo respaldo pre-E1.dc.html`, `_tmp/Eventos respaldo pre-E1.dc.html`.
- **SINCRONIZAR 22–24 aplicados (21 oct):** bundle del sistema (106 componentes) copiado a `_ds/…/_ds_bundle.js` + manifest + readme (respaldo
  `_tmp/ds-respaldo/_ds_bundle pre-sync24.js`). Super Admin, Comunidad, Eventos y Prototipo ya no cargan el puente. En el proyecto del sistema los archivos se llaman
  por su componente principal (`admin/AdminBar.jsx`, `booking/PaymentSummary.jsx`, `cards/TicketQR.jsx`, `listing/ReviewCard.jsx`, `community/PostCard.jsx`); aquí siguen
  `Admin.jsx`, `Payment.jsx`, `Ticket.jsx`, `Review.jsx`, `Post.jsx` (como `Account.jsx` ↔ `NeighborCard.jsx`).
- **E1d hecho (21 oct) · negocio y ciudad 2ad–2ah → componentes. E1 completo: ningún patrón aprobado queda sin componente.**
  `components/onboarding/Onboarding.jsx` (OnbTopBar, OnbProgress, OnbPhases, OptionCard, OnbActionBar · 2ad), `components/listing/BusinessPreview.jsx` (BusinessPreview
  mini · card · page con Free | Pro + PlanSwitch · 2ae; reemplaza al hijo `To'Latino Publica vista previa`, movido a `_tmp/`), `components/panel/SelectionBar.jsx`
  (SelectionBar + SelectBox · 2af), `components/city/City.jsx` (RadiusMap 2ag · CitySoon 2ah). Puente `prototype/ds-e1.js` ahora solo con estos 11 (el build tiene
  `SRC` de E1d). Publica tu negocio: barra de arriba, fases, progreso, opciones de B2, Free | Pro de G1, Continuar (inline y fijo) y las 9 vistas previas; Panel v2: barra
  de selección y casillas (3 copias de la plantilla), Free | Pro y vistas previas de Tu plan; Ciudad: radio móvil y desktop + APP-CIUDAD-PRONTO. Adaptadores `e1(v)` (Publica
  y Ciudad en renderVals; Panel en el normalizador de bloques `bulk` y en `bl('pv')` → `swDs`). Publica y Panel definen `@keyframes pvFade`. Master 2ad–2ah con su
  componente; readme sin patrones pendientes; **SINCRONIZAR 25**. Respaldos `_tmp/{Publica,Panel negocio v2,Ciudad} respaldo pre-E1.dc.html`. Al aplicar 25: copiar bundle
  a `_ds/` y quitar `prototype/ds-e1.js` de Publica, Panel v2 y Ciudad.
- **E2 hecho (21 oct) · modelo de datos.** Fuente única `entrega/modelo-datos.json` (12 áreas, 117 entidades, 647 campos, 10 máquinas de estados, mapa
  localStorage → entidades, «solo del prototipo» para E3, 5 dudas); `entrega/modelo-datos.md` se GENERA del json (run_script; no editar a mano) y
  `To'Latino Modelo de datos.dc.html` lo lee con fetch (buscador, chips por área, `ref X` enlaza a la entidad; props `showSrc`, `fieldsOpen`). Se armó
  cargando los 90 `prototype/*.js` en run_script (shim de localStorage) e inspeccionando formas reales. Decisiones de forma: nombres de campo en inglés
  snake_case, notas en español; una sola tabla `Operation` con `kind` (las 13 listas del prototipo + pedido) y las 7 etiquetas como `status`;
  dinero en centavos; `text·i18n` para lo que escribe el negocio, `lang` para lo del vecino; derivados marcados. Dudas abiertas (contestar en el chat):
  D1 venta en la puerta (plan: no en V1; prototipo: sí) · D2 negocios semilla (plan: no; admin: SIN RECLAMAR) · D3 idioma de lo que escriben los vecinos ·
  D4 «confirma al instante» vs «nunca se aprueban solas» · D5 cuánto se guardan las operaciones de una cuenta borrada. Al contestar: actualizar el json,
  regenerar el md y, si cambia el prototipo, aplicarlo también en el Super Admin. Cualquier entidad o campo nuevo en el prototipo → agregarlo al json.
- **E3 hecho (22 oct) · solo del prototipo (A13).** Fuente única `entrega/solo-prototipo.json` (5 reglas de lectura, 5 grupos, 56 piezas con
  `donde` · `demo` · `app` · `marca`, 1 duda); `entrega/solo-prototipo.md` se GENERA con `_tmp/solo-prototipo-md.js` (run_script: `const gen =
  eval(await readFile('_tmp/solo-prototipo-md.js')); await gen({ readFile, saveFile, log });`); `To'Latino Solo del prototipo.dc.html` lo lee con
  fetch (buscador, chips por grupo, props `showWhere`, `showDemo`; el texto entre comillas invertidas sale en mono). Grupos: barras y botones para
  revisar (barra del prototipo, barras sueltas del panel y del admin, RESPUESTA, botón de simulación, CUENTA, PRUEBA PRO, RANGO, encargo y cola,
  marco, «Entrar como», EN VIVO, galería de estados, avisos y asas) · lo que hace otra persona (respuestas del negocio por categoría, ayudas,
  To'Latino decide, pasos del servicio, reseñas, vacantes, mensajes, soporte, comunidad, El Patio, equipo, Stripe, reclamos) · lo que hace el reloj
  (hora fija jue 24 sep 2026 12:30 PM, plazos «Pasan 24 h / 48 h / 10 min / 15 min / 1 hora», boletos apartados 8 min, día del evento) · teléfono y
  servicios (hojas del sistema, número del repartidor, códigos de 6 números que aceptan cualquiera, Stripe, avisos, ubicación, voz, importar, mapas,
  fotos, PDF) · datos y carga. **Marca en el código:** `data-proto="barra"` en la barra del Prototipo y en «Revisión · controles» del Panel v2 y del
  Super Admin; `data-proto="encargo"` / `"cola"` en PROTO-ENCARGO y PROTO-COLA (móvil y desktop). Regla: lo marcado y lo que tiene dentro no se
  construye; toda pieza nueva solo de la demo (barra, botón de simulación, tiempo automático) → agregarla al json, regenerar el md y marcarla.
  Duda abierta: **D6** mesa pública de El Patio sin gente (1 se completa con «La computadora» como la privada · 2 espera personas). Modelo de datos ·
  «Solo del prototipo» enlaza aquí. Respaldos: `_tmp/{Prototipo,Panel negocio v2,Super Admin} respaldo pre-E3.dc.html`.
- **D1–D6 aplicadas (22 oct).** D1: Publica tu evento sin `entry: 'door'` (free · rsvp · tk); Eventos sin «Pagar en la puerta» (`doorOk`,
  `method: 'door'`, notas y ramas de la orden quitadas) ni «También en la puerta»; `evt-data.js` sin `door: true`; Panel v2 · Eventos sin la regla
  «Vender boletos en la puerta» y porteros solo `scan`; Super Admin · cola de eventos lee `tk`. D2: `TLAdm.seedsOf` ignora `dec['seed:q']`; el
  Super Admin ya no tiene `seedFor` (Catálogo · Sin oferta = solo «Agregar sinónimo»; Crecimiento sin acción en BÚSQUEDAS SIN OFERTA; SEMILLAS
  CREADAS = solo de recomendaciones); Ciudades dice «Negocios listos» / «invitar negocios». D3: `prototype/ugc-lang.js` (`TLLang.orig/view`: el
  original sale del id, 1 de cada 6 en inglés; lo propio sin enlace; sin par es/en no hay traducción); ReviewCard, PostCard, TopAnswer,
  CommentCard y ReplyThread con `translate` y `tlv = 26` → el puente `prototype/ds-e1.js` reemplaza la versión vieja del bundle (regla `tlv` en
  `_tmp/ds-e1-build.js`) y ahora lo cargan también Prototipo y Comunidad; Prototipo `trV('rev:' + id)`, Comunidad `trV('post:' | 'cm:')` (estado
  `trOpen`); Super Admin `ogT()` (Contenido, hilo: siempre el original). Master 2z/2ab/2r, readme y **SINCRONIZAR 26**. D4: ya estaba (Panel ·
  «Aprobar citas al instante» apagado); `onb-neg-data.js` sin «Nunca se aprueban solas». D5: Mi cuenta 30 días (se borra el 24 oct; antes
  decía 14) y qué se borra; Super Admin (confirmación, ficha, Cambios sensibles, Confianza · Privacidad). D6: Comunidad `d.wait` +
  `waitStart/waitTick/waitEnd/waitLeave/waitLoop/waitV`, bloque `APP-PATIO-ESPERA`, ruta con `wait: 1` (lo pone y lo quita `sync()`); Mesa gratis
  y «Otra partida» del dominó y «Jugar» del parchís pasan por la espera; llegan ramon (5 s) y carmen (17 s); `pCfg().wait` = `gam.patio.wait`
  (Super Admin · Gamificación · El Patio: 30 · 60 · 90 · 120 s); la barra del Prototipo dice «Pasa la espera» (`simulate()` → `waitEnd(true)`).
  Docs: `modelo-datos.json` 1.1 (dudas con `r`, `f`, `hecho`; `dudasT`, `soloIntro`; el md sale de `_tmp/modelo-datos-md.js`, que reproduce el
  formato exacto) y `solo-prototipo.json` (59 piezas: + llegan vecinos, espera de la mesa, traducciones; D6 `r: 2` con nota). Las dos páginas
  muestran DECIDIDO. Respaldos `_tmp/decisiones-22oct/`.
- **E1 cerrado (22 oct) · SINCRONIZAR 25 y 26 aplicados.** El usuario los pegó en el sistema; revisado: bundle con los 11 de E1d (también en el
  manifest, 117 componentes), `tlv = 26` en ReviewCard, PostCard, TopAnswer, CommentCard y ReplyThread, master sin «componente pendiente», readme
  sin patrones pendientes. Bundle + manifest + readme copiados a `_ds/…` (respaldo `_tmp/ds-respaldo/* pre-sync26`). Puente `prototype/ds-e1.js`
  → `_tmp/ds-respaldo/ds-e1.js`, quitado de Prototipo, Comunidad, Publica tu negocio, Panel v2 y Ciudad (respaldos `_tmp/sync26/`); las 5 cargan sin
  errores. Para un componente nuevo antes de sincronizar: mismo método (`_tmp/ds-e1-build.js` vuelve a escribir `prototype/ds-e1.js`).
- **E4 hecho (22 oct) · archivo.** A `_tmp/archivo/`: 33 pantallas (Barbería Desktop y v2, Búsqueda y Búsqueda (tarjeta vecinos), Desktop,
  Fiestas / Hogar / Salud / Tatuajes / Trámites viejas, las 16 de variantes ya decididas, 4 respaldos sueltos, ADM test light, Panel negocio v1 y
  Panel (viejo)), 28 datos viejos de la raíz (`*-listings.js`, `subcategories.js`, `panel-data.js`…) y `screenshots/`. Se quedan en la raíz
  `hours-pro.js`, `beauty-pros.js` y `unsplash.js` (master y Barbería (silla)), con copia en el archivo. Se siguen abriendo: las que usan el
  sistema llevan `<base href="../../">` (todo se resuelve desde la raíz; el aviso de «archivos no encontrados» es falso), las viejas cargan
  `../../support.js` y sus datos del mismo folder. En la raíz queda lo vigente: Prototipo y sus pantallas hijas, master, Barbería (silla),
  Pendientes, Revisión V1, Modelo de datos, Solo del prototipo, Patrones por aprobar, Íconos propuestos, Setup Design System y Coming Soon
  (v1–v3, campaña, fuera de la entrega).
- **2ar aprobado (22 oct) · tablero de parchís.** El usuario aprobó el candidato que iba junto a 2ai. Master: 2ar al final de «Patrones
  aprobados» (componente ParchisTable + ParchisBoard + DieFace, `components/community/Patio.jsx`), captura `patrones/19-pat.jpg` (776×1560, mesa a
  ancho de móvil 360 × 2, tomada de Comunidad · APP-PATIO-PARCHIS con una partida a media, sin tocar la partida guardada del usuario; tarjeta de 388).
  Comentarios de Patio.jsx, `E1b.d.ts`, `E1b.prompt.md` y `readme.md` sin «candidato»; **SINCRONIZAR 27** en Setup Design System (pendiente de pegar).
  La pantalla no cambia: Comunidad ya usaba el componente.
- **Revisión completa (22 oct, pedida por el usuario).** Barridos automáticos en el navegador (sin temporizadores: se espera con MessageChannel
  porque el iframe en segundo plano congela setTimeout/rAF): 12 144 fichas (276 negocios × 11 pestañas × móvil/desktop × ES/EN), 1 072 rutas
  (invitado y con sesión, Comunidad, Mi cuenta, Eventos, los 23 pasos de Publica), Panel v2 10 224 (18 negocios × secciones × partes × rol ×
  móvil/desktop × ES/EN), Super Admin 636 (18 secciones × 7 roles + 82 fichas) → buscando errores de consola y texto roto (undefined, NaN, null,
  [object, {{). Botones muertos: se toca cada elemento con onClick de Inicio, Negocios, las 17 categorías y una ficha Pro + una Free por
  categoría en 7 pestañas (≈ 12 700 toques) y se anota lo que cae en «por construir». Arreglado: Novedades sin plato (itName vacío; «hoy» sin
  plato se oculta) · «1 vecino lo recomienda» (singular) · Eventos APP-EVT-ORDEN sin orden → Mis boletos · Publica sin categoría en pasos C–H →
  B1 (antes se rompía en C1 y D3) · Inicio «Abierto ahora» con la espera corta (solo lo de antes del « · ») · **«Ordenar» de las tarjetas de
  Comida abría «por construir»** → abre la ficha en Menú · Hoy en el barrio: «Colmado La Fe» no existía → Frutas y Vegetales El Conuco, y metas
  en EN · 3 grillas `1fr 1fr` → `repeat(2,minmax(0,1fr))` · Comunidad sin 👍 en el copy de recomendados · **Cómo llegar de la ficha con teselas
  reales** (`lstMap(b)`, como Mapa; en casa = zona punteada) · **footer web: 22 enlaces caían en «por construir»** → hijo nuevo
  `To'Latino Página.dc.html` (ruta `APP-WEB`, `k`, `back`; sobrevive a recargar) con `prototype/web-pages.js` (`window.TLWeb`: 14 páginas
  help · faq · plans · pay · chair · rules · votes · verif · safe · app · terms · priv · cook · a11y; precio, techo Free y reglas se leen de su
  fuente; versión = `TLAdm.cms('p:' + k)` o la base), `ROUTE` WEB-* → página; WEB-RANGOS → APP-GAM-RANGO; WEB-CONTACTO/REPORTAR → Soporte;
  DASH-EVT-NUEVO → Publica tu evento; DASH-TRABAJOS → Panel · Tu página · Vacantes; APP-PATIO-TORNEOS → APP-PATIO-TORNEO; APP-NEG-CAT del footer
  → la categoría. Super Admin · Textos y páginas: 14 páginas (+ faq, pay, chair, safe, app). Quedan a revisar a ojo (no automático): ritmo y
  densidad de cada pantalla (E5 con el usuario). Los `[error] {}` al cargar el Prototipo vienen del runtime al cargar recursos, no de las pantallas.
- **Inicio arreglado (22 oct, E5).** «Hoy en el barrio» de Inicio (móvil y desktop) = historias 2g como en Negocios (`homeToday` = `stories({ B: TLAll.B })`
  con orden de varias categorías: Sabor, El Primo, La Espiga, El Conuco, Doña Tere, Jugos, Don Lucho, Mamá Yoli; desktop con flechas `car.today*`);
  antes eran tarjetas de texto. «Abierto ahora»: meta `★ 4.8 · 0.3 MI · SUB` (sub larga = primera palabra), espera corta («hasta 11 AM»), grilla
  minmax(340). Comunidad: el post de To'Latino Hazleton lleva el símbolo (`tlAvatar`, `assets/logo-tolatino.svg`). `todayItems` queda sin uso.
Al terminar cada etapa, el resumen al usuario va en 3–5 líneas: qué se construyó y qué sigue.

## 3. Reglas de negocio
- **Comida y Bebidas = categoría modelo (decisión del usuario).** Es la base
  aprobada para todas las demás: página del negocio (cabecera, pestañas, Resumen
  2p, Novedades, Menú 2i/2q, Reservaciones 2o, Staff, Relacionados, Jobs, Reseñas),
  pedido completo (checkout, seguimiento, ayuda, solicitud, recibo), branding en
  cada pantalla y paridad móvil ↔ desktop. Al empezar otra categoría: **copiar
  la estructura de Comida y cambiar solo lo que su tesis exige** (el módulo
  principal, rótulos, campos, filtros, "lo que importa" en reseñas, datos de
  Hoy y de confianza), nunca rediseñar desde cero. Se lista primero qué cambia
  y qué se queda, y se confirma con el usuario antes de construir.
  Equivalencias de arranque: Menú → Servicios / Citas (belleza, salud) ·
  Tienda (mercados) · Renta (fiestas) · Cotización (hogar, trámites);
  pedido → cita o solicitud según la categoría; "llegó caliente / a tiempo" →
  el dato verificable de cada tesis (¿de quién es la silla?, ¿aceptan mi seguro?,
  ¿esa fecha está libre?…).
- **Método de trabajo por categoría (declarado):** primero la **página base
  del negocio** (estructura única para todas las categorías: cabecera, pestañas,
  Resumen, Reseñas, Novedades, Eventos, Relacionados, Trabajos; Pro y Free;
  cliente + panel), aprobada y en el sistema. Luego se trabaja **grupo por
  grupo de categoría, quirúrgicamente**: tesis de la categoría, módulos que
  usa y su orden, rótulos, campos, filtros y flujo propio, para cliente y
  negocio. La categoría personaliza la base; nunca la reemplaza. Fuente:
  `plan/CLAUDE-plan.md` → "Business Single Listing Page" y "Módulos por
  categoría".
- **Pestañas de la ficha del negocio (regla, todas las categorías):**
  - **Base (todo negocio):** Resumen · Novedades · Eventos · Staff · Relacionados ·
    Jobs · Reseñas.
  - **Por módulo (según tipo de negocio, activadas por el módulo):** Menú ·
    Reservaciones · Servicios · Tienda · Renta.
  - **Solo aparece una pestaña si tiene contenido** (base o módulo). Resumen
    siempre existe. Pestaña vacía = no se muestra, nunca estado vacío.
  - **Orden:** Resumen → Novedades → pestañas de módulo activas (Menú ·
    Reservaciones · Servicios · Tienda · Renta) → Eventos · Staff · Relacionados ·
    Jobs · Reseñas. (Decisión del usuario: Novedades va justo después de Resumen.)
  - Free: una sola página (sin pestañas); sus bloques siguen la misma regla de
    "solo si hay contenido".
- **Citas nunca se auto-aprueban por defecto.** Estado inicial `pendiente` →
  `confirmada` | `otra hora propuesta` | `no confirmada`. **Depósito (decisión del
  usuario, 26 sep): se cobra al enviar** y se descuenta del total. Si el profesional
  no puede, propone otra hora; si el cliente no la acepta, el profesional no tiene
  otra o no contesta a tiempo → **se devuelve** (3–5 días hábiles). Cancelar dentro
  del plazo = se devuelve; tarde o no llegar = se queda con el profesional. Con silla/cabina rentada, auto-aprobar es opción de cada
  profesional. La UI dice "Solicitud enviada" + tiempo típico de respuesta, nunca
  "confirmada". Aplica a todas las categorías.
- **Cada categoría tiene su flujo y su tesis** (la pregunta real antes de decidir):
  belleza → ¿de quién es la silla? · comida → ¿llega caliente y a qué hora? ·
  hogar → ¿cuándo llega y cuánto cuesta de verdad? · noche → ¿cuánto es el cover y
  cómo está la fila? · mercados → ¿lo pesan delante de mí? · fiestas → ¿esa fecha
  está libre? · salud → ¿aceptan mi seguro y me entienden? · trámites → ¿puede
  hacerlo por ley y cuánto es en total?
- **Una línea que nunca se suaviza** (911 en salud, "nadie te garantiza un
  resultado" en trámites): en buscador, ficha, solicitud y confirmación.
- **Honestidad como función:** precios completos, lo que el negocio NO puede hacer,
  esperas reales, lo que se retiene y lo que se cobra.
- **Nada genérico como respaldo:** una categoría sin pantalla propia nunca cae en la
  de otra (bug real: trámites abría la ficha de autos).
- Cliente y panel del negocio se entregan juntos (espejo de gestión del plan).

## 4. Copy
- Sobrio y profesional. Nada que explique lo obvio ("SEGÚN LA SILLA" sobre
  "Desde $15" sobraba). **Lo normal no se etiqueta**: "sin cita" es el default;
  solo se marcan excepciones ("SOLO CITA", "FERIADO", "CIERRA TEMPRANO").
- CTA de cita/servicio: **"Booking"** (no "Elegir silla").
- Español primero, tuteo; ES/EN en todo texto de interfaz.
- Sin emoji. Sin editoriales ni comentarios del diseñador dentro de las pantallas.

## 5. Sistema de diseño — reglas duras
- **Todo sale del sistema.** Colores, tipo, tamaños, radios, bordes, sombras,
  componentes y patrones. Si algo no existe: se pregunta antes de crearlo.
- **Componer con el bundle**, nunca redibujar a mano algo que el sistema tiene
  (`<x-import component-from-global-scope="ToLatinoDesignSystem_d26632.X">`).
- **Variantes → aprobado → master + sistema, en el mismo turno.** Las variantes
  van en su archivo (`… (variantes).dc.html`); la elegida entra al master como
  patrón aprobado (turno "Patrones aprobados", **al final**, ids 2a, 2b, 2c…), al
  sistema como componente y a la pantalla. Solo lo aprobado entra al master.
- **El master se mantiene al día:** si un patrón aprobado cambia en una pantalla,
  cambia en el master y en el sistema en el mismo turno.
- **Íconos nuevos:** nunca directo en una pantalla. 2–3 opciones con el estilo del
  master (grilla 24, trazo 1.7, puntas redondeadas, sin relleno) en
  `To'Latino Íconos propuestos.dc.html`; el aprobado entra a master, sistema y
  pantalla. "Más opciones" (`more`) y "trabajos" (`works`) aprobados como 2y (11 oct).
- Patrones aprobados hasta ahora: 2a Horario Pro (hoy primero + semana),
  2b íconos de categorías (18), 2c tabs desktop (4b), 2d footer web (`SiteFooter`),
  2e header 5e (`SiteHeader`: logo completo siempre, buscador con la ciudad adentro,
  desktop con fila de tabs de módulos). `AppHeader` queda como legado.
  2f tarjeta de negocio Pro/Free (`BusinessCard`, 6a: Pro con una sola foto,
  Free en fila; Pro siempre primero con rotación diaria).
  2g "Hoy en el barrio" (`StoryCard`, 8a: una tarjeta por negocio, hasta 3 avisos
  de 24 h, tap der./izq., al final abre el negocio; en carrusel). Secciones de
  la página de Negocios (Destacados, Hoy, Nuevos) = carrusel: swipe en móvil,
  flechas ← → + swipe en desktop.
  2h página de categoría (`CategoryHero`, 10a: portada con foto + buscador de la
  categoría, subcategorías por secciones (11b): fila "Por país" con foto
  redonda + bandera (`assets/flags/`), luego "Qué se te antoja" = un carrusel por
  capítulos (Platos · Pan y dulces · Bebidas · Casera, calle y encargo) con el
  nombre del capítulo fijo; swipe móvil, flechas ← → desktop. Grupos en
  `plan/taxonomia-negocios.md`; cada categoría define los suyos, barra "N resultados" + filtros rápidos +
  Ordenar/Filtros/Mapa, grilla Pro de igual altura, luego "También en Hazleton"
  con Free en filas, paginación). Sin columna lateral de filtros ni mapa fijo.
  2i Menú del negocio (`components/menu/`: MenuItemRow, MenuTile, OptionGroup,
  QtyStepper, OrderBar, CartLine · Menú 13a): Delivery/Pickup con hora → chips
  fijos → Populares → filas con foto a la derecha y +/cantidad; el plato abre en
  hoja (móvil) o ventana 560 (desktop) con grupos obligatorios ("Elige: …" hasta
  completarlos) y opcionales; `+` agrega directo si no hay opciones. Con pedido,
  barra flotante oscura reemplaza "Desde $X"; pedido con envío, impuesto 6 %,
  total y "Ir a pagar". Desktop: índice 170 + filas + columna "Tu pedido".
  Datos: `prototype/neg-menu.js` (carta completa de Sabor Dominicano).
  2j–2n pedido (`components/order/`): 2j `DeliveryPrefs` (cómo te lo entregamos),
  2k `OrderTracker` + `ChangeProposal` (seguimiento y cambio propuesto), 2l
  `HelpReasonList` + `RequestCard` (ayuda y solicitud), 2m `AuthSheet` (entra para
  pedir), 2n `ReceiptCard` (recibo). Sincronización: bloque SINCRONIZAR 12.
  2r comentarios del hilo (17d más votada · 17c también recomiendan · 17a tarjeta · 18a
  respuestas anidadas) · 2s Mi cuenta (`components/account/Account.jsx`: NeighborCard,
  CompleteAccount, WeekAgenda) · 2t menú del panel · 2u–2x Buscar (`components/search/Search.jsx`:
  SearchResultRow, UnderstoodBar, SearchPanel, NotYetCard). **Auditoría DS (28 sep):** Mi cuenta usa `OrderTracker` (estado),
  `RequestCard` (solicitudes), `BusinessRow` (guardados; "Editar" muestra las filas con Quitar); Comunidad usa
  `BusinessRow` para el negocio recomendado en post, comentario, respuesta y chat. `FeedPost` no cubre votos ±,
  encuesta, fotos ni menú → la fila de publicación sigue propia (2r pendiente de componente). Pendiente de aprobar
  como patrón: mesa de dominó, QR de boleto, filas y formularios de Mi cuenta, pasos del onboarding.
  **SINCRONIZAR 16:** mientras no esté en el bundle del sistema, `prototype/ds-account.js` (puente) registra
  NeighborCard, CompleteAccount y WeekAgenda en `ToLatinoDesignSystem_d26632` solo si faltan; Mi cuenta ya monta
  los tres con `x-import`. Cuando el bundle los traiga, el puente no hace nada. (pendiente, se aplica en el proyecto del
  sistema):** llevar `components/account/*` y regenerar el bundle; 2r aún sin componente.

## 6. Prototipo (`To'Latino Prototipo.dc.html`)
- **Branding en cada pantalla (regla, no se negocia):** To'Latino se ve siempre.
  Toda pantalla (móvil y desktop) muestra el logo, el cambio de idioma ES/EN y
  la cuenta (Entrar / avatar). Desktop: header completo en todas. Móvil: header
  completo en las pantallas de módulo; en fichas y flujos (listing, checkout,
  pedido, ayuda, reservas, jobs, reseñas…) una **barra compacta** arriba (logo
  24 · ES/EN · campana · Entrar) y debajo el encabezado propio de la pantalla.
  Una pantalla nueva nunca se entrega sin esto (`showMBrand` en el prototipo).
- Shell con barra superior: código de pantalla, Móvil/Desktop, Inicio, **Panel negocio**
  (→ `DASH-HOME`, monta **`To'Latino Panel negocio v2`** — decisión del usuario 1 oct: se sigue con v2;
  se marca en negro cuando estás en `DASH-*`), Cola.
  **Panel v2 · Lo que vendes → Menú (1 oct, v1):** datos = carta real de `neg-menu.js` convertida por
  `prototype/dash2-menu.js` (Sabor Dominicano: 5 categorías, 17 platos, 11 grupos de opciones). Vistas:
  Platos (buscar, filtros Agotados/Solo catálogo/Para completar, lista por categoría, interruptor = disponible →
  "agotado hoy" o "hasta que lo active", Seleccionar → barra oscura: agotar, activar, mover, precio ±, dónde se
  pide, quitar) · Categorías (orden Subir/Bajar, ocultar, horario propio) · Opciones (grupos reutilizables,
  obligatorio/hasta N, opción agotada = agotada en todos sus platos) · Inventario (¿qué se acabó?, agotado ahora,
  cuenta del día con − n + y vuelve sola a las 6 AM, stock, aviso SMS) · Horarios (pausar pedidos, tiempo extra,
  último pedido, horarios propios). Editor del plato: vista previa con `MenuItemRow`, 5 fotos, ES/EN, categoría,
  precio + impuesto 6 %, grupos, disponibilidad, inventario, máximo por pedido, delivery/pickup/catálogo,
  alérgenos, tiempo extra, fijar en Populares, últimos 30 días. Bloques nuevos del panel: `search`, `bulk`,
  `mprev`, `gprev`; filas con casilla (`sel`) y `QtyStepper` (`qv`). Pendiente: que el menú del cliente lea
  estos cambios; barra `bulk` y fila con casilla = candidatos a patrón del master.
  Cada pantalla existe en **móvil y desktop** (desktop 100% desktop, nunca el móvil
  estirado).
- Rutas por código `ÁREA-MÓDULO-PANTALLA`. Destino no construido →
  `PROTO-ENCARGO` (código, patrón, origen del click, acceso, estados, "Construir
  esta pantalla") → cola `PROTO-COLA` (localStorage `tl-proto-cola-v1`).
  Registro de encargos: objeto `ENC` en la lógica. Para construir una pantalla:
  se agrega su ruta real y deja de ir a encargo.
- **Paridad móvil ↔ desktop (regla):** todo arreglo o cambio hecho en móvil se
  aplica en el mismo turno a desktop, adaptado a la mejor forma para desktop (no
  copiado tal cual), y viceversa, siempre que aplique. Ej.: carrusel = swipe en
  móvil, flechas ← → + swipe en desktop.
- **Columna de contexto desktop (regla):** se queda fija al hacer scroll (sticky
  inteligente: si cabe, fija arriba; si es más alta que la pantalla, baja con la
  página y se fija cuando su final llega al borde inferior). Marcar con
  `data-sticky-rail` dentro de la columna.
- **Desktop responsive (regla):** cada pantalla desktop se diseña a ancho real y se
  revisa en 1440 · 1280 · 1024 · Ajustar (selector del shell; el marco se escala
  como en un monitor). Cortes: ≥1200 tres columnas (categorías 240 · contenido ·
  contexto 320) · 960–1199 dos columnas (el contexto baja al final del contenido) ·
  <960 una columna (categorías en fila de chips, sin "Publicar" en el header) ·
  debajo, composición móvil. Grillas de contenido por ancho mínimo de tarjeta
  (`repeat(auto-fill, minmax(…))`): filas de negocio 320, tarjetas 240, bloques de
  contexto 300. Un componente móvil nunca se usa por debajo de su ancho mínimo.
- Construido: `APP-HOME` (invitado, día 0), `APP-NEG-HOME` (página del módulo
  Negocios: accesos rápidos, 17 categorías con subcategorías, Destacados Pro,
  Hoy en el barrio, Recomendados por vecinos, Nuevos en el barrio, Publica tu negocio),
  `APP-NEG-CAT` solo Comida y Bebidas (subcategorías, filtros F-COMIDA + globales en
  hoja móvil / panel desktop, 10 por página, sin resultados). Datos:
  `prototype/neg-food.js`. Las demás categorías van a encargo (nunca a la de comida).
  Siguiente: `APP-NEG-LISTING-PRO` y `APP-NEG-LISTING-FREE`.
- **Página base del negocio (construida, v1):** cabecera = la de Barbería (silla)
  (decisión del usuario; las variantes 9a–9c se descartaron). Rutas
  `APP-NEG-LISTING-PRO` / `-FREE` con `biz` (solo Comida por ahora; otras
  categorías siguen a encargo). Pro: pestañas según la regla de §3 "Pestañas de
  la ficha" (en Comida hoy: Resumen · Novedades · Menú · Reservaciones · Eventos · Staff · Relacionados · Jobs · Reseñas, cada una solo si tiene contenido). Free: una sola página, CTA Llamar, hasta 5 ítems,
  reseñas sin respuesta. Resumen: fotos, Quiénes somos, oferta del día, Horario
  Pro, preview de ítems, 2 reseñas destacadas, En el local, Pago/idioma/zona,
  Rango del negocio, Cómo llegar, FAQ (Pro). Desktop: contenido + columna 372
  sticky (pedido, mapa, pago/idioma/zona).
  Cabecera móvil: logo 62 + nombre + subcategorías en texto (máx. 2 líneas) +
  vecinos que recomiendan; franja de 3 datos (★ calificación → Reseñas · estado →
  horario · distancia → Cómo llegar); CTA + guardar/llamar/compartir. Sin chips
  de subcategorías. Desktop: subcategorías en texto bajo el nombre. Datos: `prototype/neg-listing.js`.
  Móvil: barra fija abajo "Desde $X" + CTA (patrón de Barbería (silla)); en la ficha
  no se muestra la barra de navegación. "Desde" = precio más bajo de la primera
  sección del menú. Pestaña Menú = patrón 2i; "Ir a pagar" → `APP-NEG-CHECKOUT`
  (master 1f: entrega/pickup y hora, propina al repartidor 15/18/20/otro, tarjeta
  guardada + Wallet, resumen; "Enviar pedido": el total se **retiene** y se cobra
  cuando el negocio acepta; si no acepta en 10 min se libera) → `APP-NEG-PEDIDO`
  (gracias + estado. Delivery: Pedido enviado → Preparando → En camino → Entregado.
  Pickup: enviado → aceptado → cocina → listo → recogido;
  avanza solo cada 6 s en el prototipo; cancelar gratis mientras está pendiente).
  `APP-NEG-PEDIDO-AYUDA` (construida): la ayuda depende de la etapa. Antes de
  entregar: cancelar (gratis en "enviado"; después = solicitud, el negocio decide),
  cambiar platos (cancelar y volver al carrito), cambiar cómo se entrega, ¿cuándo
  llega?, pago. Entregado: falta algo, equivocado, frío/mal preparado, dañado,
  tarde (compara hora prometida vs. real; devuelve el envío solo si llegó tarde),
  no me llegó (revisa foto/entrega primero), pago (va a To'Latino), otro.
  Pasos con `StepHeader`: motivo → platos y cantidad → detalle + foto (obligatoria
  en equivocado/dañado) → solución (Visa 3–5 días · Wallet al instante · que me lo
  traigan) → `APP-NEG-PEDIDO-SOLICITUD` (enviada → respuesta del negocio →
  reembolso; si no responde en 24 h, revisa To'Latino). Nunca "resuelto" antes de la
  respuesta. `APP-NEG-PEDIDO-CANCELAR` = misma pantalla con el motivo cancelar.
  Menú (revisión): instrucciones para la cocina por plato (se ven en carrito,
  checkout y pedido); "Editar" en cada línea del carrito; "AGOTADO HOY" (`ago`);
  **Botón + (patrón aprobado 2q = 16a de `To'Latino Menú stepper (variantes).dc.html`):**
  el + se estira sobre la foto a `− cantidad +` (papelera con 1 → toast "Deshacer" 4 s);
  cerrado muestra la cantidad; se cierra solo a los 3.5 s (móvil), hover en desktop.
  Plato con opciones: el 2.º + abre "Otra: {plato}" (otra igual con un toque · "Otra,
  con cambios" = hoja del plato prellenada con la última · "Repetir sin preguntar en
  este pedido"). Mismo plato de varias formas: "2 FORMAS" en la fila y el − pregunta
  "¿Cuál quitas?". Aplica en Menú (filas y Populares) y en los tiles del Resumen.
  Íconos nuevos `minus`, `trash` (opción A). DS: `AddPill` en MenuItemRow.jsx;
  SINCRONIZAR 15 aplicado. El prototipo usa los componentes del bundle: `MenuItemRow` y `MenuTile` (con `AddPill`) en Menú, Populares y tiles del Resumen; `OwnerCard` y `TodayCard` en el Resumen. Plato del día "cerrado hoy" (canOrd falso) se atenúa en las filas. Respaldo: `_tmp/Prototipo respaldo pre-componentes.dc.html`.
  Respaldo: `_tmp/Prototipo respaldo pre-16a.dc.html`.
  platos con horario (`until`, Almuerzo hasta 4 PM) limitan las horas programables;
  negocio cerrado → banner en el menú y checkout solo programado (cerrado todo el
  día = no se pide). "Ir a pagar" sin sesión abre "Entra para pedir" (teléfono +
  código) y vuelve al checkout; el invitado nunca ve datos guardados.
  Pendientes de la revisión en `_tmp/menu-review-plan.md`.
  Barra del prototipo: selector RESPUESTA (Acepta · Rechaza · No responde · Con
  cambios · Tarjeta rechazada) simula al negocio en pedidos y solicitudes.
  Negocio rechaza / no acepta en 10 min → liberado, "Volver a pedir". Con cambios →
  "Cambio propuesto" (quitar · cambiar por · cancelar; recalcula lo que se cobra).
  Solicitud no aprobada o parcial → "Pedir revisión a To'Latino"; sin respuesta en
  24 h → To'Latino decide. Una solicitud abierta por pedido; platos ya reclamados no
  se reclaman otra vez. Cupón en checkout (demo `TOLATINO5`, −$5 desde $20).
  Entregado: calificar al repartidor + subir propina (hasta 24 h). "En camino": mapa.
  `APP-NEG-PEDIDO-RECIBO`: recibo con movimientos (retenido, cobrado, liberado,
  reembolsos).
- **Reservaciones (construida, v1 · Comida):** pestaña `rsv` solo en Pro con
  módulo (Sabor Dominicano, El Fogón, Mariscos La Bahía; datos
  `prototype/neg-rsv.js`). Es **solicitud**, sin depósito. Pestaña: personas
  (hasta el máximo del local; más = "Pedir evento privado"), 14 días, área,
  turnos (Almuerzo/Cena) con horas libres; sin mesas → días con mesa + lista de
  espera (SMS, 10 min para tomarla). Resumen móvil y columna desktop: "Reservar
  mesa" con horas de hoy. Continuar sin sesión → "Entra para pedir".
  `APP-NEG-RESERVA`: te guardan la mesa 5 min, a nombre de / para otra persona,
  ocasión, necesidades, nota, SMS, políticas → "Enviar solicitud".
  `APP-NEG-RESERVA-ESTADO`: pendiente → confirmada | no confirmada (otras horas +
  otros restaurantes + lista de espera) | otra hora propuesta (aceptar / buscar
  otra / no) | sin respuesta en 30 min. Confirmada: calendario, compartir, cómo
  llegar, voy tarde (2 h antes), cambiar (la actual sigue hasta que confirmen),
  cancelar (gratis hasta 2 h; después "cancelación tardía", sin cargo). Tolerancia
  15 min. Selector RESPUESTA aplica. Panel del negocio: pendiente (con F9).
  Patrón aprobado 2o (`components/booking/TableBooking.jsx`: PartyPicker,
  ReservationCard, TableOffer). Revisión aplicada: "¿Cuántos son?" primero; aviso
  de reservación el mismo día; al cambiar, la hora actual va marcada; cancelar en
  hoja; acciones 2×2; lista de espera simula "Se liberó una mesa"; Resumen muestra
  tu reservación. Sincronización: SINCRONIZAR 13.
- **Novedades (construida, v1 · base, solo Pro):** canal del negocio. Tipos =
  herramientas: Oferta (precio antes/ahora, vence, quedan N, "Pedir" abre el plato),
  Hoy hay / Llegó (vinculado al menú, "Agregar al pedido"), Aviso de horario (enlaza
  al Horario), Encuesta (votas y ves %), Cupón para seguidores (código visible solo
  si sigues; demo `SABOR3` −$3 desde $15), Novedad (texto + fotos), Enlace a Evento,
  Enlace a Vacante. Votos + y − (como Community), comentarios abiertos con la
  respuesta del negocio marcada y el más votado arriba. Seguir negocio + avisos,
  guardar oferta/cupón, compartir, filtros por tipo, post fijado. < 24 h: chip "En
  Hoy en el barrio · quedan N h". Acciones (votar, comentar, guardar, seguir) piden
  sesión. Datos: `prototype/neg-nov.js`. **Editor del negocio** (crear con vista
  previa, publicar/programar, plantillas, métricas, editar/quitar) va con F9.
- **Pestaña Eventos de la ficha (decisión del usuario):** se construye **después**
  del módulo principal Eventos. Dentro de la ficha solo **replica** los eventos que
  el negocio publicó en el módulo Eventos (mismas tarjetas, mismo detalle, mismo
  flujo de boletos/mesas); no tiene flujo propio. Hasta entonces queda como está.
- **Staff (construida, v1 · base + Comida):** misma estructura para todas las
  categorías; `TLStaff.CAT` decide qué muestra cada una (rate = calificación propia,
  next = próxima hora libre, dishes = sus platos, works = trabajos, dates = próximas
  fechas, cert = licencias, cta = acción: menú · Booking · mesa · cita). Tarjeta:
  foto real, rol, idiomas, especialidades, estado de hoy (en turno · entra a · no
  trabaja / vuelve…), orden: en turno primero. Perfil (hoja móvil · ventana 640
  desktop): bio en primera persona (la escribe la persona), especialidades, sus
  platos (MenuItemRow, abren el plato), horario de la semana, certificación
  verificada, "Más del equipo"; pie: Llamar al negocio + acción de la categoría.
  Solo aparece quien aceptó la invitación; el contacto pasa por el negocio (salvo
  silla o cabina propia). Free: 1 persona (pendiente). Datos: `prototype/neg-staff.js`.
  Cada categoría adapta Staff cuando lleguemos a ella (Belleza: Booking con la
  persona, trabajos, reseñas propias "vía {Local}", silla rentada = su negocio).
  Variantes 14a–14e (`To'Latino Staff (variantes).dc.html`): al usuario no le
  convencieron; se queda la v1 actual y Staff se revisa más adelante.
- **Relacionados (construida, v1 · base, solo Pro):** definición del usuario =
  negocios **conectados** con este: **Sucursal** (misma marca, otra dirección) o
  **Mismo dueño** (otro negocio del dueño). No son sugeridos ni competidores (anula
  los "sugeridos automáticos" del plan). El negocio envía una **solicitud de
  relación**, el otro acepta; la relación es de dos lados (aparece en ambas
  fichas) y cada lado escribe su nota. Tarjeta: foto, etiqueta SUCURSAL / MISMO
  DUEÑO, ★, distancia, dirección (sucursal) o categoría, estado de hoy, nota del
  negocio, "Misma carta y precios" (sucursal con `menuOf`), servicios, Cómo llegar +
  Ver sucursal / Ver negocio. Datos: `prototype/neg-rel.js`; sucursal de ejemplo
  `sabor-dominicano-alter` (412 Alter St, `menuOf: 'sabor-dominicano'`). Solicitud,
  aceptar/rechazar y quitar relación van con el panel del negocio (F9).
  Free: sin botón "+" (no pide en línea). Horarios por negocio en
  `prototype/neg-food.js` (`hrs: [abre, cierra]`, `days: 'finde'`); estado, Horario
  Pro y semana salen de ahí y deben coincidir con `open` (hoy = jue 24 sep, 12:30 PM).
- **Jobs (construida, v1 · base, solo Pro):** datos `prototype/neg-jobs.js` (`TLJobs.J`).
  Pestaña: tarjeta por vacante (pago real por hora + propinas, días/horas, idiomas,
  beneficios, guardar, estado de tu solicitud) + "Avísame de nuevas vacantes".
  `APP-NEG-JOB` (detalle: pago, horario, días, idiomas, puestos, requisitos,
  beneficios, aviso "no se pide CV, estatus migratorio, SSN ni pago", parecidas en
  Hazleton; barra guardar + Aplicar). `APP-NEG-JOB-APLICAR` (pide sesión; nombre,
  teléfono, experiencia, nota, días que puedes vs. los del puesto, idiomas,
  confirmar requisitos). `APP-NEG-JOB-ESTADO`: enviada → vista → te van a llamar
  (Con cambios) | entrevista (Acepta; confirmar/llamar) | no seleccionado (Rechaza;
  muestra parecidas); No responde = queda en vista. Retirar solicitud. Panel del
  negocio (recibir/responder) va con F9. Respaldo previo: `_tmp/Prototipo (respaldo pre-jobs).dc.html`.
- **Reseñas (construida, v1 · base + Comida):** datos `prototype/neg-rev.js` (`TLRev`:
  14 reseñas de Sabor Dominicano; el resto se genera). Tipos: **verificada** (delivery ·
  pickup · reservó, por To'Latino) o **visitante** (se marca). Comida muestra por reseña
  "Llegó caliente / tibio / frío", "A tiempo / N min tarde" (**dato del pedido, no se
  edita**) y precio. Pestaña: calificación + barras (tocar = filtra por estrellas),
  "Lo que importa en la comida" (% llega caliente, a tiempo, vale lo que cuesta, sabor, de
  N pedidos en 90 días), prompt "¿Cómo estuvo?" si hay pedido entregado, "Los más
  recomendados" (→ Menú), temas mencionados, filtros (verificadas · fotos · con respuesta ·
  críticas), ordenar, "Útil", "Reportar" (hoja/ventana 560: motivo → detalle → "sigue
  visible, To'Latino revisa en 48 h"), visor de fotos, "Cómo funcionan las reseñas".
  `APP-NEG-RESENA`: sobre qué visita, estrellas, sabor/temperatura/espera/precio, qué
  recomiendas, texto (mín. 20, sin teléfonos ni correos), fotos (6), aviso con ≤2 ★ ("la
  reseña no pide reembolso" → Ayuda con el pedido), publicar pide sesión y continúa;
  desktop con vista previa en vivo. `APP-NEG-RESENA-ESTADO`: publicada al instante →
  negocio avisado → respuesta (RESPUESTA: Acepta = responde · Con cambios = propone
  arreglo, "Actualizar mi reseña" · Rechaza = pide revisión, sigue publicada → revisada ·
  No responde); editar 48 h, borrar, puntos de rango solo por "útil". Free: no responde.
  Entrada también desde el pedido entregado. Panel del negocio (responder, pedir revisión)
  va con F9. Tarjeta de reseña = candidata a patrón del master (pendiente de aprobación).
- **Resumen (construido · patrón aprobado 2p = variante 15b de
  `To'Latino Resumen (variantes).dc.html`):** objetivo del usuario: verse bien en
  cualquier negocio (establecido, recién publicado sin historial, fin de semana en
  casa, por encargo Free). Orden: Quién está detrás (`OwnerCard`: persona, apodo,
  sus palabras, equipo → Staff; sin persona = texto del negocio; franja de
  confianza: sello o teléfono verificado, en Hazleton desde, pedidos entregados,
  rango) → Hoy / próximo día que abre (`TodayCard`: frase de cómo pedir, 3 datos,
  "Sin delivery", "Reservar mesa") → reservar mesa rápida → oferta de hoy → menú
  (MenuTile Pro; texto Free) → reseñas → fotos (3+) → HoursPro → cómo llegar + en
  el local → FAQ (Pro). Reglas: 0 reseñas → cabecera "Nuevo · en To'Latino" +
  "Aún sin reseñas · ¿Ya fuiste? Cuéntanos"; 1–4 → sin promedio; negocio en casa →
  calle y zona, dirección exacta al confirmar. Lógica `resAdd` (`lst.rb`). DS:
  `components/listing/Overview.jsx`; SINCRONIZAR 14 aplicado (bundle local verificado). v2
  descartada en `_tmp/Prototipo (resumen v2 descartado).dc.html`; respaldo previo
  `_tmp/Prototipo respaldo pre-15b.dc.html`.
- **Belleza y Salud (`NEG-BELL`, en curso · decisiones del usuario, 26 sep):**
  se construye copiando Comida. Primer grupo: **Barbería y salón** (los tres
  modelos de `beauty-pros.js`: `shop` empleados · `chair` renta de silla ·
  `solo` una persona). Página de categoría: capítulos por servicio **y** una fila
  fija "Para quién" (Hombres · Mujeres · Niños · Novias y quinceañeras).
  Booking en local que renta sillas: **por persona o por servicio**, las dos
  entradas llegan al mismo resultado (la cita vive en la página del profesional:
  su agenda, su precio, su depósito). Reseñas "lo que importa": a la hora ·
  quedó como lo pediste · precio publicado · limpieza · te atendió quien
  reservaste · trato y explicación. Tarjeta Hoy: espera sin cita (walk-in) ·
  "SOLO CITA" cuando aplica · a domicilio y hasta dónde. Depósito: lo decide cada
  negocio (retenido, nunca cobrado antes de confirmar). Pestaña **Tienda** con
  apartado (estante de Barbería silla). **A domicilio** con zona en millas.
  Sin variantes: construir directo. Datos nuevos de Hazleton (los de
  `beauty-listings.js` son de Queens y no se usan).
  Etapas: 1 datos + página de categoría · 2 ficha (Resumen, Servicios, Staff,
  Tienda) · 3 Booking + estado de la cita (solicitud → confirmada | rechazada |
  otra hora) · 4 reseñas de belleza, ayuda/cancelar, desktop y revisión.
  **Etapa 1 hecha:** `prototype/neg-beauty.js` (`TLBeauty`: 18 negocios de
  Hazleton, 10 Pro + 8 Free, modelos shop/chair/solo, `who`, `zone`, `casa`,
  `soloCita`; capítulos SUBG con fila "Para quién" (`w:h/m/n/q`); filtros F-CITA;
  fotos Pexels por subcategoría). `APP-NEG-CAT` con `cat: 'NEG-BELL'` usa la misma
  pantalla que Comida (`negVals` elige datos por `route.cat`). Tarjetas: CTA
  "Booking"; 0 reseñas = "Nuevo · en To'Latino"; 1–4 = "N reseñas" sin promedio.
  Respaldo: `_tmp/Prototipo respaldo pre-belleza.dc.html`.
  **Etapa 2 (v1, 26 sep):** ficha conectada. `prototype/neg-bell-listing.js` (`TLBellL`:
  SVC, SHOP, FAQ, reseñas de cita; registra en TLListing/TLStaff/TLRev) + `window.TLAll`
  (Comida + Belleza; las funciones de ficha buscan `biz` ahí). `listing()` → `bellAdd()`:
  pestañas Resumen · Novedades · **Servicios** (`svc`, ServiceRow; "Desde" + "VARÍA POR
  BARBERO" en silla rentada; notas de silla/depósito/casa/domicilio) · **Tienda** (`shop`,
  Pro con productos; "Apartar" → encargo `APP-NEG-APARTAR`, pagas al recoger, 48 h) · Staff
  (`CAT.belleza`) · Reseñas. CTA "Booking" → encargo `APP-NEG-BOOKING` (etapa 3). Resumen:
  TodayCard con sin cita/espera · SOLO CITA · a domicilio · depósito. Respaldo:
  `_tmp/Prototipo respaldo pre-ficha-belleza.dc.html`.
  **Etapa 3 (v1, 26 sep) · Servicios + Booking + estado de la cita:** motor único en
  `prototype/neg-bell-book.js` (`TLBook`: datos + vistas; recibe el componente). Quien renta
  silla/estación = su propio negocio (`m: 'silla'`, `at` = local, en `TLAll`, no en la página
  de categoría): su ficha (misma base: Resumen · Servicios · Reseñas), tarjeta "Silla N · desde
  AAAA → su local", sus precios, agenda, depósito y aprobación (auto = opción de cada uno: Kelvin,
  Misael). Locales con silla: El Primo (4), Fade Factory (3 de 5), Rizos & Color (2 de 3).
  Servicios: silla rentada = "Por servicio | Por barbero" (rango de precio; elegir con quién es
  obligatorio en la hoja); shop = StaffPicker opcional ("Cualquiera" asigna quien esté libre);
  solo/silla = directo; solo sin cita (Quisqueya) = sin Booking, CTA "Cómo llegar". Hoja del
  servicio (hoja móvil / ventana 560): opciones que cambian precio y tiempo (largo del pelo,
  trenzas), extras, con quién, depósito. `APP-NEG-BOOKING`: pasos Día y hora → Detalles →
  Revisa y envía (novias: Tu evento primero: tipo, sábados libres, dónde, damas, prueba incluida);
  a domicilio con zona (dirección fuera de zona bloqueada), en su casa (dirección al confirmar),
  niños (nombre y edad), nota + foto de referencia, SMS. Desktop = una página + columna con
  resumen y "Enviar solicitud". `APP-NEG-CITA`: pendiente → confirmada | no pudo | sin respuesta
  (2 h; Bella Novia 24 h) | otra hora propuesta; depósito retenido → cobrado / liberado / se queda
  (cancelación tardía); cambiar (la actual sigue hasta que confirmen), cancelar, voy tarde (2 h
  antes), calendario. RESPUESTA aplica. Staff en local con silla: "Ver su página" + Booking.
  Staff se oculta en solo/silla (la persona es el negocio). Respaldo:
  `_tmp/Prototipo respaldo pre-booking.dc.html`.
  **Pago de la cita (Revisa y envía, 26 sep):** una sola tarjeta: PRECIO (servicio con sus
  opciones en una línea, extras, damas/traslado) → Total del servicio → CÓMO SE PAGA (barra
  hoy/resto + "Hoy, al enviar · depósito" y "{día}, {dónde}" con a quién se paga; tarjeta y
  Cambiar) → "TU DEPÓSITO DE $X": qué pasa en cada caso (no puede → otra hora · no te sirve /
  no contesta / cancelas a tiempo → te devolvemos · tarde o no llegas → se queda). Barra:
  HOY PAGAS $X + CTA + "RESTO $Y · DÓNDE". Desktop: tarjeta en la columna, "Antes de enviar"
  en el contenido. El estado de la cita usa la misma barra hoy/resto. Candidato a patrón del
  master (pendiente de aprobación). Respaldo: `_tmp/Prototipo respaldo pre-pago.dc.html`.
  **Método de pago (26 sep):** `prototype/pay-methods.js` (`TLPay`, compartido). "Cambiar" en
  la fila de la tarjeta abre hoja móvil / ventana 560: tarjetas guardadas (radio), To'Latino
  Wallet (saldo; si no alcanza: "te faltan $X", no se elige), "Agregar tarjeta" (número con
  marca detectada, vence, CVC, código postal, nombre, guardar para la próxima; errores: vencida,
  mes, marca desconocida) y a dónde vuelve un reembolso (tarjeta 3–5 días · Wallet al
  instante). Invitado: "Entra para elegir tu tarjeta"; al entrar desde "Enviar" vuelve a la
  revisión (nunca cobra una tarjeta que no vio). Tarjeta rechazada → "Cambiar tarjeta" abre el
  selector con la rechazada marcada. Pagar con Wallet descuenta el saldo y los reembolsos
  vuelven ahí. Conectado también en el checkout de comida (solo tarjetas; el Wallet sigue
  como casilla aparte, se combina con la tarjeta). Cambiar la hora de una cita: el depósito ya
  pagado pasa a la nueva ("Ya pagado", hoy $0, no se cobra otra vez); si no confirman la nueva,
  la cita actual sigue con su depósito.
  Pendiente (usuario, 26 sep): decidir qué hacer con el selector RESPUESTA (¿panel real del
  negocio F9?, ¿dentro de la cita?, ¿componente?) — se mira después.
  **Etapa 4 · reseñas de belleza (v1, 26 sep):** cita `done` ("Cita terminada"; en el
  prototipo se llega con el botón "Pasó la cita" de la barra, solo con cita confirmada).
  La cita muestra "¿Cómo te quedó?" (estrellas → `APP-NEG-RESENA` con `src: 'cita'`, la
  reseña va al `own`: la silla o el local) y acciones Volver a reservar · Ayuda con la cita
  (encargo `APP-NEG-CITA-AYUDA`). Reseña de belleza: visita = Cita #N (verificada) o "Fui
  sin cita"; dato de la cita (servicio · con · precio publicado, no se edita); preguntas:
  a qué hora te atendieron · quedó como lo pediste · te atendió {persona} (silla / shop con
  persona) · precio · limpieza · trato; recomienda = servicios; ≤2 ★ → "no devuelve el
  depósito" → Ayuda con la cita. Tarjeta muestra esos datos. Respuesta del negocio con copy
  de belleza. Respaldo: `_tmp/Prototipo respaldo pre-etapa4.dc.html`.
  Pendiente etapa 4: ayuda con la cita, panel del negocio (F9), sillas en resultados de categoría.
- **Servicios de Auto (`NEG-AUTO`, en curso · decisiones del usuario, 27 sep):** copia de
  Comida/Belleza, sin variantes (directo). Tesis: **¿cuánto cuesta de verdad y cuándo me lo
  devuelven?** Línea fija: **"Nada se hace ni se cobra sin tu OK."** (buscador, ficha,
  solicitud y confirmación). Primer grupo: **taller mecánico** (general, diagnóstico, frenos,
  aceite, a domicilio). Modelos: `shop` empleados · `bay` renta de bahías (el mecánico que
  renta = su propio negocio, como la silla; "Por servicio | Por mecánico") · `solo` (a
  domicilio con zona en millas). Flujo: **todo por cita** (Booking); el diagnóstico es un
  servicio con precio y el estimado se da en el taller → lo apruebas en la app → al aprobar
  **se retiene** el estimado → algo extra pide tu OK antes → al recoger **se cobra lo final**
  y se libera el resto. **Mi vehículo** guardado en la cuenta (año, marca, modelo, millaje),
  va en cita, estimado y reseña. Categoría: 3 filas fijas "¿Qué le pasa a tu carro?"
  (síntoma → subcategorías) · "Tu vehículo" · "Por marca" (chips) + capítulos por servicio.
  Reseñas "lo que importa": cobraron lo del estimado · listo cuando lo prometieron · arreglado
  a la primera · pidieron permiso antes de algo extra · te enseñaron la pieza vieja · te
  explicaron sin enredos · trato · carro limpio (estimado vs. cobrado y prometido vs.
  entregado = dato del sistema, no se edita). Hoy y confianza: espera sin cita · listo hoy si
  lo dejas antes de… · SOLO CITA · a domicilio + millas · grúa propia · te llevan / carro de
  cortesía · diagnóstico gratis · garantía (meses/millas) · ASE · inspector PA · acepta seguro
  (choques) · financiamiento. Tienda con apartado (llantas usadas, baterías, piezas).
  Etapas: 1 datos + categoría · 2 ficha · 3 Booking + estimado + estado · 4 reseñas, ayuda,
  desktop y revisión.
  **Etapa 1 hecha:** `prototype/neg-auto.js` (`TLAuto`: 18 negocios de Hazleton, 10 Pro + 8
  Free; `veh`, `mk`, `warr`, textos EN `stEn/etaEn/feeEn/offerEn/catEn`; `ROWS` filas fijas,
  `LBL` + `inSub`; fotos `prototype/pexels-auto.json`). `APP-NEG-CAT` con `cat: 'NEG-AUTO'`
  usa la misma pantalla: `neg.rows` (1..n filas fijas, foto o chips; Comida/Belleza = 1 fila)
  y banda de la línea fija (`neg.hasLine`). Ficha y Booking de Auto van a encargo hasta las
  etapas 2–3 (nunca a la de otra categoría). Respaldo: `_tmp/Prototipo respaldo pre-auto.dc.html`.
  **Etapa 2 (v1, 27 sep) · ficha conectada:** `prototype/neg-auto-listing.js` (`TLAutoL`: SVC por
  tipo de servicio, SHOP, STAFF con certificación ASE / inspector PennDOT, PROS de bahía, reseñas
  con dato de la cita, Jobs; registra en TLListing/TLStaff/TLRev/TLJobs y `TLAll`) + motor
  `prototype/neg-auto-book.js` (`TLAutoBook`: Servicios, hoja del servicio, Tienda, Mi vehículo, Hoy).
  Se sumaron 2 Pro de lavado: Splash Hand Car Wash (fila en vivo + detallado con cita) y Brillo
  Móvil (a domicilio, lleva agua y luz) → 20 negocios. Horarios: `sat`, `sun`, `closed` (HoursPro y
  semana Free los respetan; Auto sin `sun` = domingo cerrado).
  **Tipos de servicio (k) = opciones propias por subcategoría:** diag (se descuenta si lo arreglas
  aquí · o gratis con el arreglo) · fijo (precio cerrado) · desde ("final en el estimado") · cotiza
  (rango típico, diagnóstico primero) · lav (precio por tamaño carro / SUV o pickup / van) · goma
  (por goma, cuántas) · insp (si no pasa: lista + estimado, reinspección gratis 30 días) · grua
  (Llamar). `w`: esperas · lo dejas · eliges (hoja: "¿Esperas o lo dejas?" con cortesía y grúa) ·
  a domicilio. `walk` = solo sin cita (sin Booking; la hoja da "Cómo llegar"). Cada hoja: tu
  vehículo (compatibilidad de marca y tipo; si no trabajan con él, no se puede pedir), incluye /
  no incluye, opciones, extras, con quién, y la nota de cobro de su tipo (DepositNote).
  **Mi vehículo:** hoja propia (marca → modelo → año → millaje → tamaño). Invitado: solo esta
  visita; al entrar se guarda en la cuenta (demo: 2016 Honda CR-V). Precios de lavado por tamaño;
  Tienda de gomas filtra por la medida de tu vehículo (nuevas / usadas, precio instalado, apartar).
  **Bahía rentada** (Taller Hermanos Peña, 4 bahías: Rafael y Miguel la 1–2; Wilson Tejada bahía 3 y
  Eddy Polanco bahía 4 = sus propios negocios `m: 'bahia'`): "Por servicio | Por mecánico", tarjeta
  "Bahía N · desde AAAA → su taller", su precio, agenda, garantía y aprobación (Eddy: al instante).
  Servicios muestra fila en vivo (lavado) o espera sin cita, y "Para «síntoma»" si vienes de
  "¿Qué le pasa a tu carro?". Resumen: Hoy de Auto (listo hoy si lo dejas antes de…, diagnóstico,
  grúa 24/7, fila) + bloque "Nada se hace ni se cobra sin tu OK." con los pasos del cobro; franja
  de confianza con garantía / ASE / inspector. Reseñas: "Lo que importa en autos" (cobraron lo del
  estimado · listo cuando lo prometieron · a la primera · pidieron tu OK) y en lavado (precio
  publicado · a tiempo · quedó limpio · cuidaron tu carro); cada reseña muestra vehículo y datos de
  la cita. Escribir reseña, Booking y estimado → encargo (etapas 3–4). Free: una página, Llamar.
  Respaldo: `_tmp/Prototipo respaldo pre-ficha-auto.dc.html`.
  **Etapa 3 (v1, 27 sep) · Booking + estimado + estado:** `prototype/neg-auto-flow.js` (`TLAutoFlow`).
  `APP-NEG-AUTO-BOOKING` (s.ab, desde la hoja del servicio): 1 Tu carro (vehículo obligatorio y
  compatible, millaje; diagnóstico/desde/cotiza: luces encendidas, "qué le pasa", fotos del ruido;
  lavado: cómo está por dentro) → 2 Día y hora (esperas · lo dejas · te llevan · grúa · a domicilio
  con franja de 2 h; dirección con zona; "Cuándo te lo devuelven") → 3 Revisa y envía (resumen,
  precio, "Cómo se cobra": hoy $0 · al dejarlo se retiene diagnóstico o precio · estimado · algo más
  = tu OK · al recoger se cobra lo final y se libera el resto; tarjeta TLPay ctx 'ab'; guardar piezas
  viejas; SMS; políticas: cancelar gratis 2 h, sin depósito). Desktop: una página + columna. Pide
  sesión al enviar. `APP-NEG-AUTO-CITA` (s.acitas): pend → ok | no (otras horas) | alt | exp →
  in → est (estimado por línea: necesario / recomendado / puede esperar, pieza + mano de obra × tarifa
  + impuesto 6 % de piezas, foto; apruebas línea por línea; crédito del diagnóstico) → work → xtra
  (foto + precio, Sí / No) → ready (piezas viejas, garantía, "Ya lo recogí · pagar") → done (cobrado vs.
  liberado, estrellas → encargo reseña). Cambiar / cancelar / calendario / cómo llegar / voy tarde.
  Barra del prototipo: botón de simulación ("El taller responde", "Dejaste el carro", "Llega el
  estimado", "Terminaron"); RESPUESTA: cambio = otra hora + algo extra; tarjeta = falla la
  verificación de $0. Ficha: tarjeta "Tu cita". Respaldo: `_tmp/Prototipo respaldo pre-booking-auto.dc.html`.
  **Revisa y envía (revisión del usuario, 27 sep):** mismo patrón que Belleza. Desktop: contenido =
  1 Tu carro · 2 Día y hora (horas a 480 px) · 3 Antes de enviar (bueno saber + preferencias); columna
  sticky = línea fija → Resumen (foto + filas) → una tarjeta de pago (precio → total → "Cómo se cobra"
  en 3 pasos cortos con barra hoy/resto → "Tu depósito de $X" en 2 líneas → tarjeta) → "Hoy pagas $X" +
  Enviar solicitud. Móvil paso 3 = las mismas 3 tarjetas. Sin títulos repetidos ni textos largos.
  Respaldo: `_tmp/Prototipo respaldo pre-cobro-rail.dc.html`.
  **Pre-estimado con fotos (v1, 27 sep · decisión del usuario):** para servicios "desde" y "se
  cotiza". `prototype/neg-auto-pre.js` (`TLAutoPre`). Dos entradas: link "Pre-estimado con fotos" en
  la fila + bloque en la hoja del servicio → `APP-NEG-AUTO-PREEST` (s.pe: vehículo, fotos/video hasta 6
  (mín. 1), luces, qué le pasa, código del escáner, para cuándo; gratis, no compromete; pide sesión) →
  `APP-NEG-AUTO-PREEST-ESTADO` (s.pres): enviado → rango (qué incluye, qué puede cambiarlo, válido 7
  días, "Reservar con este pre-estimado") | hay que verlo (rango amplio + "Reservar el diagnóstico") |
  no lo hacen (talleres de Hazleton que sí) | sin respuesta 24 h (mandar otra vez) → reservaste.
  Y dentro del Booking (paso 1, opcional): "Pídeles un rango con tus fotos" (el rango llega al
  confirmar). La cita y el estimado muestran el pre-estimado y comparan: "Dentro de tu pre-estimado"
  o "Pasa tu pre-estimado" (por qué). El rango sale de las líneas "necesario ahora" del estimado de
  ejemplo. Descartado por ahora (usuario): precio para tu carro, lo que pagaron vecinos, tope, techo,
  pieza original/genérica, segunda opinión, % de exactitud en la tarjeta.
  Respaldo: `_tmp/Prototipo respaldo pre-preestimado.dc.html`.
  **Depósito en Auto (v1, 27 sep · decisión del usuario):** opción de cada negocio (`DEP` en
  `neg-auto-book.js`: monto, solo ciertas secciones o tipos de servicio, monto mayor en trabajos grandes,
  horas para cancelar). Ejemplos: Splash $25 en detallado ($100 en trabajos de $400+), Brillo Móvil $20,
  Frenos Jiménez $20, Ramón $20, Quisqueya $50 en arreglos grandes, Wilson $40, Eddy $15 (confirma al
  instante). Misma regla que Belleza: se cobra al enviar y se descuenta del total; se devuelve si no
  confirman, si proponen otra hora que no aceptas, si no contestan o si cancelas a tiempo; se queda con
  el negocio si cancelas tarde o no llegas. Se ve en la fila del servicio ("DEPÓSITO $X"), en la nota de
  Servicios, en la hoja, en el Booking (hoy pagas $X, bloque "Tu depósito de $X" con cada caso, políticas,
  tarjeta con Wallet) y en la cita (pagado · devuelto · se quedó; al recoger pagas el total menos el
  depósito). Cambiar la hora: el depósito pasa a la nueva. RESPUESTA "No responde" con cita confirmada =
  "No llegaste". Configurarlo en el panel del negocio va con F9. Respaldo:
  `_tmp/Prototipo respaldo pre-deposito-auto.dc.html`.
  Resumen (Belleza y Auto, Pro): la sección "Servicios" usa las mismas filas que la pestaña
  Servicios (`lst.svcTop`: foto, datos en mono, precio, Booking; desktop en grilla de tarjetas).
  Free sigue con lista de texto. "Guárdame las piezas viejas" no sale en lavado ni inspección.
  Pendiente Auto: reseña de auto, ayuda con la cita, mensaje al taller, voy tarde, panel (F9).
- **Comunidad (construida, v1 · 28 sep) — `To'Latino Comunidad.dc.html` + `prototype/com-data.js` (`TLCom`).**
  **Carga diferida:** el Prototipo la monta con `<dc-import name="To'Latino Comunidad">` solo en rutas
  `APP-COM-* · APP-GAM-* · APP-PATIO* · APP-NOTIF` (no pesa en el arranque; el marco móvil tiene
  `transform:translateZ(0)` para que sus hojas `position:fixed` queden dentro del teléfono). Props: route, lang,
  user, desk, dw, api (nav, login ctx 'com', openBiz, encargo, vTop), sim (botón "Los vecinos responden"), scen.
  Estado propio en localStorage `tl-com-v1`; historial propio para "Volver".
  Rutas: `APP-COM-FEED` (módulo: tabs Conversación · Hoy en el barrio · Tabla del Barrio · El Patio; desktop
  navegación 240 + feed 720 + contexto 320) · `APP-COM-POST` · `APP-COM-NUEVO` (pregunta · recomendación ·
  encuesta · publicación; desktop con vista previa) · `APP-COM-VECINO` (`u`, 'me' = mi perfil) ·
  `APP-COM-BIENVENIDA` (primera vez: apodo, Mi ciudad bloqueada 30 días, reglas, vecinos para seguir, 100 monedas)
  · `APP-COM-HOY` (público) · `APP-GAM-RANGO` · `APP-GAM-TABLA` · `APP-GAM-MONEDAS` (cupones de negocios con
  código) · `APP-PATIO` · `APP-PATIO-MESA` (dominó en parejas jugable, por turnos, a 100) · `APP-PATIO-TORNEO`
  (Copa Sabor Dominicano, inscripción con monedas, premio = cupón) · `APP-COM-MENSAJES` / `APP-COM-CHAT` (solo a
  quien te sigue) · `APP-NOTIF` (la campana del header abre aquí; resumen diario).
  Reglas aplicadas: muro con contexto para invitados (Hoy en el barrio es público); votos + y −; comentarios por
  votos; recomendar negocio en comentario (si ya lo recomendaron → "Sumar mi voto"); "Recomendados en este hilo";
  "Me sirvió" (+10); rango visible desde Sargento; encuestas se abren en Cabo; mesas privadas en Teniente; destacar
  en Sargento Mayor; Invitado · de {ciudad}; no recomendar tu propio negocio; sin teléfonos; salud → línea 911;
  reportar (motivo → detalle → "ya no lo ves, 48 h"); silenciar / bloquear con Deshacer.
  **Línea fija de Comunidad:** "Aquí nada se compra: el orden lo ponen los votos de los vecinos."
  Insignia de rango = cuadro con el número (no hay galones en el set): proponer galones en Íconos propuestos.
  **Comentarios (decisión del usuario, 28 sep · `To'Latino Comentarios (variantes).dc.html`):** base 17a
  (cada comentario en su tarjeta, respuestas en panel gris plegable "Ver N respuestas" con caras) + la más votada
  como 17d (tarjeta destacada "MÁS VOTADA · N VOTOS" / "LE SIRVIÓ A…", negocio grande con Ver) + los demás
  recomendados como 17c (barras con % de votos, like + N para sumar tu voto; "También recomiendan" si la más
  votada ya trae negocio). Fondo Paper. Aplicado en `APP-COM-POST` móvil y desktop (el rail ya no repite
  recomendados). Respuestas a una respuesta = 18a (`To'Latino Respuestas (variantes).dc.html`): anidadas un
  nivel debajo de la persona a la que contestas, línea + curva `#E6E3DC`, "@Nombre" en Action, negocio
  recomendado en la respuesta como tarjeta compacta. Dato `re` = id de la respuesta contestada (sin `re`, se
  ubica por la @mención). Escribir en desktop = en el mismo hilo (caja dentro de la tarjeta, Esc cancela,
  Ctrl+Enter envía; caja "Comentar" arriba); móvil = barra abajo.
  Pendiente: pasar al master (Patrones aprobados) y al sistema como componente.
  Candidatos a patrón del master (pendiente de aprobación): fila de publicación con votos, ficha de dominó. Parchís y mesa privada → encargo.
  Respaldo: `_tmp/Prototipo respaldo pre-comunidad.dc.html`.
- **Entrar (decisión del usuario, 28 sep):** el onboarding de usuario de varios pasos se **quitó**. Entrar es
  solo la hoja aprobada 2m (`AuthSheet`: teléfono → código), desde el header, "Yo", Mi cuenta y los muros de
  pedido/cita/reseña; vuelve a donde ibas. Rutas viejas `ONB-USR-0` / `APP-INICIO-BIENVENIDA` abren la hoja.
  Foto, nombre y correo se completan en Mi cuenta → Perfil. Se queda: permiso de avisos después de la primera
  acción (`tl-notif-v1`). Regla: no rediseñar un flujo aprobado sin pedirlo; componer con el sistema.
- **Mi cuenta · dashboard del usuario (construido, v1 · 28 sep) — `To'Latino Mi cuenta.dc.html` + `prototype/usr-data.js`
  (`TLUsr`)** (carga diferida; rutas `USR-*`; estado en `tl-usr-v1`). Motor de bloques (hero, sec, chips, prog, agenda,
  tiles, head, note, rows, kv, money, steps, acts, form, qr, stats, empty, chat) + columna de contexto (tarjetas) +
  hojas. Desktop: navegación 240 (Mi actividad · Mi cuenta) · contenido · contexto 320; <960 chips. Móvil: `USR-HOME`
  = pantalla de módulo (header + nav "Yo"); el resto con barra compacta y encabezado propio.
  `USR-HOME`: tarjeta de vecino (logo, ciudad·zona, foto, N.º / Fundadores, rango · monedas · Wallet) → Completa tu
  cuenta (foto, zona, intereses, correo → pasos de `ONB-USR-0`) → Tu semana (agenda: pedido de hoy, citas, mesa,
  apartado, boleto) → Pendiente de ti (reseñas por escribir +15, mensajes nuevos, solicitudes sin respuesta) → accesos
  (8) → Tu apoyo al barrio → menú. Trío por objeto: `USR-PEDIDOS`/`USR-PEDIDO` (apartados, filtros, dato verificable,
  cómo fue, cuentas claras + movimientos, ayuda = solicitud 24 h hasta 7 días, volver a pedir, recibo, reseña),
  `USR-CITAS`/`USR-CITA` (solicitud → confirmada; depósito y resto; cambiar hora = "tu cita sigue hasta que confirmen";
  cancelar con política; Auto con "Nada se hace ni se cobra sin tu OK."), `USR-BOLETOS`/`USR-BOLETO` (QR, ver grande,
  pasar una entrada por teléfono), `USR-FAVORITOS` (negocios · platos · eventos · publicaciones; "a los negocios se
  les guarda, a las personas se les sigue"; lee `s.saved`/`s.follow`), `USR-RESENAS` (escritas · por escribir),
  `USR-MENSAJES`/`USR-CHAT-NEG` (con negocios; vecinos → `APP-COM-MENSAJES`), `USR-PERFIL`, `USR-DIRECCIONES`/
  `USR-DIRECCION` (zona 18201/18202), `USR-PAGOS` (tarjetas, agregar con marca y vencida, Wallet, solicitudes,
  movimientos retenido/cobrado/liberado/devuelto), `USR-AVISOS` (lo crítico no se apaga, resumen diario, horas de
  silencio), `USR-AJUSTES` (idioma, letra grande, cerrar sesión), `USR-CIUDAD` (bloqueada hasta 28 oct),
  `USR-PRIVACIDAD` (sesiones, descargar datos), `USR-BORRAR` (motivo → qué pasa → código; 14 días), `USR-INVITAR`
  (código NOMBRE-N, cuenta para Capitán). Historial demo solo para la cuenta (570) 555-0142 (Ana, #214); cuentas
  nuevas empiezan vacías con estados vacíos útiles. `encargo('USR-…')` del prototipo navega a estas rutas
  (`USR-TARJETAS` → `USR-PAGOS`; sin sesión → `ONB-USR-0`). `USR-TELEFONO` (construido): número nuevo (mismo número / ya tiene cuenta = error) → código SMS (3 intentos,
  `000000` = equivocado) → mueve la cuenta en `tl-onb-v1` al número nuevo y actualiza la sesión; "qué pasa al
  cambiarlo" + soporte si perdiste el número viejo. Master: 2r y 2s agregados.
  **Historial de ejemplo (28 sep):** barra del prototipo "CUENTA: Con historial | Cuenta nueva" (solo en `USR-*`,
  prop `demo`); con historial cualquier cuenta ve el ejemplo con su nombre (`{n}`/`{s}` en `usr-data.js`): pedido
  en camino #1051 (Miguel, 12:45), 5 pedidos pasados (Comida, Tacos, Panadería, uno liberado), 2 apartados (gomas
  mañana, aceite), 8 citas (mesa pendiente, salón con depósito, taller, plomero a domicilio, dental con Medicaid y
  línea 911, pasadas), 3 boletos (merengue, festival, bachata usado), 8 negocios + 5 platos + evento guardados, 4
  reseñas + 3 por escribir, 5 conversaciones, 3 direcciones, 12 movimientos y 2 solicitudes (una la revisa
  To'Latino), 4 invitados.
- **Eventos v2 (construido, 29 sep · desde cero, por prompt del usuario).** La v1 se borró completa (no gustó);
  las variantes 19a–23c quedaron anuladas y nada de la v1 se reusa. La v2 se construyó directo (el usuario pidió
  diseño completo sin detenerse), con el plan (Módulo 3), el sistema y el master como fuentes, y referencia
  Instagram/TikTok en descubrimiento. Foco: discotecas y bares; gratis (RSVP) y de pago; línea fija del módulo:
  **"El precio que ves es el que pagas: cargos incluidos."**
  Archivos: `To'Latino Eventos.dc.html` (carga diferida con `dc-import`, igual que Comunidad; api = `evtApi`,
  sim = `comSim`, scen = `comScen`) + `prototype/evt-data.js` (`window.TLEvt`: 12 eventos de Hazleton — noche,
  comida, comunidad, fe; boletos con cupo/`left`, mesas con consumo mínimo + depósito, add-ons con `mesa: true`,
  line up, `going`, `door` = pagar en la puerta, políticas). Estado propio en localStorage `tl-evt-v2`
  (likes, RSVP, órdenes).
  Pantallas (móvil + desktop, cada una): `APP-EVT-BUSQ` (módulo: "Tus boletos" si tienes, historias con anillo
  degradado por local, destacado, chips de fecha/tipo sticky, grillas 2 col con cartel 3:4 + caritas de vecinos +
  tags VAS/ESTA NOCHE/GRATIS/QUEDAN N, "Publica tu evento" → encargo `APP-EVT-EDITAR`) · `APP-EVT-NOCHE`
  ("Esta noche" como historias verticales full-bleed con scroll-snap, corazón/compartir, CTA Boletos — estilo
  TikTok; desktop con flechas; sin header del módulo) · `APP-EVT-LISTING` (página del evento, oscura: hero,
  cuándo/dónde/edad, line up con horas, boletos y mesas con disponibilidad, galería, organizador → `openBiz`,
  "Antes de ir", RSVP en gratis) · `APP-EVT-BOLETOS` (paso 1/2: cantidades, mesa única por orden, add-ons,
  código demo) · `APP-EVT-PAGO` (paso 2/2: retención 8 min con contador, nombres por boleto opcionales, tarjeta
  TLPay-style, pagar en la puerta si `door`, login al enviar) · `APP-EVT-ORDEN` (confirmación + boletos QR,
  transferir con anulación del QR viejo, calendario, recibo, ayuda: reenviar/1 nombre/pago/cancelar con
  reembolso menos cargo; sim "Pasa el tiempo" avanza el estado; RESPUESTA: `no` = organizador cancela con
  reembolso total, `alt` = cambio de fecha (aceptar o reembolso), `card` = tarjeta rechazada → cambiar tarjeta) ·
  `APP-EVT-MIS` (mis boletos, próximos y pasados). Rutas conectadas en nav inferior, tabs desktop, ficha
  (pestaña Eventos replica `TLEvt` por `org.biz` — La Terraza `la-terraza-night` ya vinculada — y abre
  `APP-EVT-LISTING`; sin flujo propio, como manda el plan) y footer. `evtMod = 'APP-EVT-BUSQ'` (solo ahí va el
  header completo + nav; el resto usa barra compacta o su propio header oscuro).
  Pendiente de eventos: panel del organizador (crear/editar evento, ventas, porteros → F9), modo puerta /
  check-in, publicar evento (`APP-EVT-EDITAR`), boletos de eventos dentro de Mi cuenta, y aprobar como patrones
  del master (candidatos: cartel 3:4 con caritas, historias de la noche, boleto QR, fila de boleto con stepper).
  Respaldo de la v1 borrada: `_tmp/Prototipo respaldo con-eventos (borrado 29 sep).dc.html` (solo rescate).
- **Servicios del Hogar (`NEG-HOGAR`, en curso · decisiones del usuario, 27 sep):** copia de
  Comida/Belleza/Auto, sin variantes. Tesis: ¿cuándo llega y cuánto cuesta de verdad? Línea fija:
  **"Precio completo antes de empezar. Si algo cambia, te pregunta primero."** (buscador, ficha,
  solicitud y confirmación). Primer grupo: **reparaciones** (multiservicios, plomería, drenajes,
  calentadores, electricista, calefacción y aire, calderas, electrodomésticos). Tipos de servicio:
  visita/diagnóstico (se descuenta si lo arreglan) · precio fijo · por hora con mínimo · por pie² o
  por cuarto · presupuesto en casa · emergencia 24/7 con recargo. **Emergencia:** se manda a todos
  los que atienden 24/7 y cubren tu zona; el primero que acepta la toma. **Obras:** pedir presupuesto
  a hasta 3 negocios a la vez. **Ley de PA (HIC, 1/3 de anticipo, 3 días): no se muestra** (usuario).
  Modelos: `shop` cuadrilla · `solo` · `red` técnicos independientes, cada uno su página (como la
  silla) · `gc` contratista con subcontratistas. **Mi casa** (como Mi vehículo): dirección y tipo,
  dueño o inquilino (inquilino = permiso del landlord), tamaño, año, mascotas, dónde estacionar y
  cómo entrar, equipos (marca y edad del calentador/caldera). Reseñas "lo que importa": llegó en la
  franja · cobró lo cotizado · pidió tu OK antes de algo extra · quedó bien a la primera · llegó quien
  reservaste · limpió al terminar · cuidó tu casa · cumplió la garantía. Extras: planes recurrentes,
  Tienda con apartado, renta de herramienta, galería de trabajos (antes/después). Reutilizar de Auto:
  pre-estimado con fotos, estimado línea por línea con tu OK, depósito opcional, franja + zona.
  Etapas: 1 datos + categoría · 2 ficha · 3 Booking / presupuesto / emergencia + estado · 4 reseñas,
  ayuda, desktop y revisión. Referencia vieja: `To'Latino Hogar (equipo independiente).dc.html`.
  **Etapa 1 hecha (27 sep):** `prototype/neg-hogar.js` (`TLHogar`: 20 negocios de Hazleton, 11 Pro +
  9 Free; `zone` millas, `eta` = próxima franja, `fee` = cómo cobra la visita, `yrs` → tag `y10`,
  `crew`/`pros`/`subsN`; 58 subcategorías en 6 capítulos; fotos `prototype/pexels-hogar.json`,
  revisadas). Categoría: 4 filas fijas "¿Qué pasa en tu casa?" (síntoma → subcategorías) ·
  "Emergencia 24/7" (solo negocios `h24`) · "Por temporada" (otoño primero: calefacción, quitar el
  aire de la ventana, canaletas, tubos, nieve) · "Para inquilinos o para dueños" (chips). Banda
  nueva `D.band` "¿Es una emergencia?" + "Pedir ayuda ahora" → encargo `APP-NEG-HOGAR-EMERGENCIA`
  (móvil y desktop; `neg.hasBand`). Tarjetas: CTA Booking → encargo `APP-NEG-HOGAR-BOOKING`; meta
  "HASTA N MI". Respaldo: `_tmp/Prototipo respaldo pre-hogar.dc.html`.
  **Etapa 2 (v1, 27 sep) · ficha conectada:** `prototype/neg-hogar-listing.js` (`TLHogarL`: SVC con tipos
  k = visita (cred / free) · fijo · hora (mh) · area (u pie2/cuarto/salida, min) · pres (rng, gratis o con costo) ·
  emer (sur = recargo incluido) · plan (fr mes/temp); SHOP con `rent` (renta de herramienta por día + depósito);
  GAL trabajos hechos antes/después con días y precio; STAFF con licencia de la ciudad / EPA 608 / seguro;
  PROS de la red; reseñas con dato de la cita; Jobs; registra en TLListing/TLStaff/TLRev/TLJobs/`TLAll`) + motor
  `prototype/neg-hogar-book.js` (`TLHogarBook`: Servicios, hoja, Tienda, Mi casa, Hoy, galería, resAdd).
  Red Arreglos Ya: 3 técnicos independientes = su propio negocio (`m: 'tec'`, `at`): Richard, Maritza (confirma al
  instante), Yefri; "Por técnico | Por servicio". Contratista (Constructora Peralta, `gc`): subcontratistas con
  licencia propia en Staff. Franjas de 2 h (`nextWin`); emergencia: fila "Pedir ayuda" → encargo emergencia y
  franja "EMERGENCIA AHORA · llega en ~N min" (`eta24`). Filas: "Pre-estimado con fotos" (visita/hora) o
  "Pedir presupuesto a hasta 3" (pres) → encargos `APP-NEG-HOGAR-PREEST` / `-PRESUPUESTOS`; plan → `-PLAN`;
  renta → `APP-NEG-RENTAR`; Booking → `APP-NEG-HOGAR-BOOKING` (etapa 3). **Mi casa**: hoja `hc` (campos genéricos:
  dirección, tipo, dueño/inquilino con aviso del landlord, cuartos, baños, pie², año (aviso de plomo antes de
  1978), mascotas, calefacción + edad, calentador + edad, cómo entrar); cuenta demo 112 W Oak St; compat = zona
  en millas (fuera de zona bloquea) e inquilino (algunos solo con dueños). Resumen: "Trabajos hechos"
  (`lst.hx.gal`, móvil carrusel, desktop grilla 300). Reseñas "Lo que importa en el hogar": las 8 del usuario.
  Depósito opcional (`DEP`): Plomería Rodríguez, Cibao, Santana, Richard. Escribir reseña → encargo (etapa 4).
  Ícono del bloque Mi casa / Mi vehículo = `ic` (home / car).
  **Etapa 3 (v1, 27 sep) · Booking + estado de la visita:** `prototype/neg-hogar-flow.js` (`TLHogarFlow`). Usa las MISMAS
  vistas de Auto (`ab` / `ac` en la plantilla; `isAb`/`isAc` también con `HGb`/`HGc`); estado `s.hb` (Booking) y `s.hcitas`.
  `APP-NEG-HOGAR-BOOKING` (desde la hoja del servicio "Elegir franja"): 1 Tu casa (Mi casa obligatoria y en zona; en
  visita/hora/área/presupuesto: ¿dónde es? (cocina, baño, sótano…), qué pasa, fotos) → 2 Franja de llegada de 2 h + "¿Vas a
  estar en casa? / dejo cómo entrar" (no en presupuesto) + cuánto dura → 3 Revisa y envía (resumen, precio, cómo se cobra:
  hoy $0 o depósito · al llegar se retiene la visita o el precio fijo · precio completo o presupuesto en la app, tú decides ·
  al terminar lo final; tarjeta TLPay ctx 'hb'; inquilino = "Tengo el permiso de mi landlord" obligatorio; si no, "Déjame las
  piezas"; SMS). Pide sesión al enviar. `APP-NEG-HOGAR-CITA`: pend → ok | no (otras franjas) | alt | exp → road (va en camino) →
  in (en tu casa, revisa o mide) → est (precio completo / presupuesto por línea: necesario / recomendado / puede esperar,
  materiales + mano de obra × tarifa + 6 % de PA sobre materiales; la visita se descuenta si apruebas) → work → xtra (foto +
  precio, Sí / No) → ready ("Todo bien · pagar", garantía, piezas) → done (estrellas → encargo reseña) · noshow = no había
  nadie. Precio fijo sin precio completo. Barra del prototipo: "El negocio responde", "Va en camino", "Llegó", "Llega el
  precio completo", "Terminó"; RESPUESTA aplica. Líneas por clase (`EST`: plom, agua, elec, calef, electro, drena, handy,
  insp, bath, roof, panel, boiler, heater, repipe) y extra (`XTRA`). Ficha: tarjeta "Tu visita". Ayuda → encargo
  `APP-NEG-HOGAR-AYUDA`.
  **Pre-estimado con fotos (v1, 27 sep):** `prototype/neg-hogar-pre.js` (`TLHogarPre`; mismas vistas `pe` / `ps` de Auto; estado
  `s.hpe` y `s.hpres`). Para visita, hora y área (la fila "Pre-estimado con fotos" y el bloque de la hoja; presupuesto sigue con
  "Pedir a hasta 3"). `APP-NEG-HOGAR-PREEST`: Tu casa (obligatoria y en zona) · fotos/video (mín. 1, hasta 6) · ¿dónde es? + qué
  pasa (mín. 10) · marca y edad del equipo · para cuándo; gratis, pide sesión. `APP-NEG-HOGAR-PREEST-ESTADO`: enviado → rango
  (qué incluye, qué puede cambiarlo, válido 7 días, "Reservar con este pre-estimado" → Booking en el paso 2 con fotos y nota)
  | hay que verlo (rango amplio + "Reservar la visita") | no lo hacen (negocios de Hazleton que sí) | sin respuesta 24 h → reservaste.
  El rango sale de las líneas "necesario ahora" del precio completo (`EST`). Booking y visita muestran el pre-estimado y el precio
  completo compara "Dentro de tu pre-estimado" / "Pasa tu pre-estimado". Ficha: tarjeta "Tu pre-estimado".
  **Emergencia 24/7 y Presupuesto a hasta 3 (v1, 27 sep):** `prototype/neg-hogar-mas.js` (`TLHogarMas`; reusan las vistas `pe` / `ps`
  con `s.hpe.mode` / `p.mode` = 'em' | 'pq', guardado en `s.hpres`). `APP-NEG-HOGAR-EMERGENCIA` (banda de la categoría, fila de
  emergencia y hoja): qué pasa (tipos `EMER`) + Tu casa + fotos opcionales + cómo entrar + ahora / 3 h; muestra el rango de salidas
  con recargo. Línea que no se suaviza: **"Si huele a gas, hay chispas o humo, sal de la casa y llama al 911."** →
  `-EMERGENCIA-ESTADO`: se manda a todos los Pro 24/7 que cubren tu zona y hacen ese trabajo (`emCands`) → el primero que acepta
  (nombre, salida, recargo incluido, llega en ~N min) → "Ver en camino" crea la visita (`APP-NEG-HOGAR-CITA`, k emer, st road) |
  nadie en 15 min (mandar otra vez · llamar directo). `APP-NEG-HOGAR-PRESUPUESTOS` (filas y hoja de servicios "pres"): misma
  solicitud (casa, fotos, dónde, qué quieres, medidas) a hasta 3 negocios con presupuesto (el de la ficha primero; los que no
  llegan a tu casa no se eligen) → `-PRESUPUESTOS-ESTADO`: responden uno a uno (rango, visita, días; "el más bajo"; Con cambios =
  uno "hay que verlo"; Rechaza = el último no lo hace) → tocar uno = Booking de su visita en el paso 2; los otros se cierran.
  **Planes y renta (v1, 28 sep):** `prototype/neg-hogar-plan.js` (`TLHogarPlan`; vistas `pe`/`ps`, modos 'plan' | 'rent').
  Plan (servicios k plan, "Empezar el plan"): Tu casa + día fijo + primera visita (3 opciones) + qué revisar + cómo entrar;
  plan de confort = 2 visitas al año (oct/abr) con cobro mensual; primer cobro el día de la primera visita, hoy $0 →
  `APP-NEG-HOGAR-PLAN-ESTADO`: activo (próximas visitas, saltar, pausar un mes, cancelar: no se cobra el mes siguiente).
  Renta (Tienda, artículos `rent`): días (semana = paga 5) + cuándo recoges → `APP-NEG-RENTAR-ESTADO`: apartada 48 h (hoy $0) →
  la tienes (renta cobrada, depósito retenido; "Un día más") → devuelta (depósito liberado; tarde = un día más). Barra del
  prototipo: "Pasa una visita", "La recogiste", "La devolviste" (No responde = tarde).
  **Carga de scripts (regla):** los `<script>` del helmet cargan sin orden fijo. Cada archivo `prototype/neg-hogar-*.js`
  espera a sus dependencias (`(function boot(){ … if (!deps) return setTimeout(boot, 40); … })()`) y las extensiones del
  pre-estimado se registran en `window.TLHogarExt[mode] = { form, status, sim }` (no envolver funciones de otro archivo).
  Formulario `pe`: `showPh` / `showNote` / `showCode` ocultan fotos, texto y código.
  **Etapa 4 (v1, 28 sep) · reseña + ayuda:** `prototype/neg-hogar-rev.js` (`TLHogarRev`). Reseña = la misma `APP-NEG-RESENA`;
  `revWVals` llama a `TLHogarRev` cuando `b.hogar` (srcs, groups, tm, pool, draft, fix). Verificada = visita `done` en
  `s.hcitas` (estrellas de la visita → `revOpen(own, 'cita', n, cid)`). "Llegó en la franja" y "cobró lo cotizado" salen
  de la visita (no se editan); preguntas: quedó bien a la primera · llegó {persona} · limpió · cuidó tu casa · trato;
  visitante también franja y precio. ≤2 ★ → "no devuelve dinero ni pide que vuelvan" → Ayuda con la visita. Desktop con
  vista previa. `APP-NEG-HOGAR-AYUDA` (vistas pe/ps, `TLHogarExt.help`): motivo (no llegó en la franja · cobró más ·
  quedó mal · dañó algo · otra persona · otra) + qué pasó (15+) + fotos (obligatorias si quedó mal o dañó) + qué quieres
  (que vuelva sin cargo por la garantía · tarjeta · Wallet) → `-ESTADO`: acepta | propone otra solución | no acepta →
  "Pedir revisión a To'Latino" (48 h) | sin respuesta 24 h → To'Latino revisa. "Que vuelva sin cargo" abre el Booking con
  `warr: true` (precio y depósito $0). Una solicitud abierta por visita.
  Depuración: el logic class deja `window.__tlProto = this` (sirve para simular estados desde la consola).
  **Hogar completo (etapas 1–4).**
- **Salud (`NEG-SALUD` · Doctores y Medicina, en curso · decidido en modo automático, 28 sep):** copia de Comida/Belleza/Auto/
  Hogar. Tesis: **¿aceptan mi seguro y me entienden?** Línea fija: **"Si es una emergencia, llama al 911."** (buscador, ficha,
  solicitud y confirmación) + "To'Latino no da consejo médico". Primer grupo: médico de cabecera, urgencias sin cita, clínica
  comunitaria, pediatría, dentista, óptica, ginecología, consejería, laboratorio. Modelos: `shop` consultorio con varios
  profesionales (`docs`) · `solo`. Datos clave: `ins` (seguros que acepta: Medicaid con sus planes, Medicare, CHIP,
  privados), `cash` (consulta sin seguro), `wait` (espera real sin cita), tags F-SALUD (seguro, medicaid, medicare, chip,
  sinseguro, escala, sinid, medesp = el médico habla español, esp, interp, tele, hoy, walk, noche, finde, ninos, mujer,
  mayor, familia). Flujo previsto: Booking = solicitud con **Tu seguro** (plan, número, a nombre de quién; si no lo aceptan
  se ve antes con el precio sin seguro) → motivo → profesional e idioma → hora o video → estado (pendiente → confirmada |
  seguro no aceptado | otra hora). Reseñas "lo que importa": aceptaron tu seguro · te entendieron en tu idioma · esperaste lo
  que dijeron · te explicaron · cobraron lo que dijeron · trato. Sin datos de salud en reseñas.
  **Etapa 1 hecha (28 sep):** `prototype/neg-salud.js` (`TLSalud`: 20 negocios de Hazleton, 11 Pro + 9 Free; 58
  subcategorías en 7 capítulos; fotos `prototype/pexels-salud.json`, revisadas). Filas fijas: "¿Qué necesitas?" (fiebre,
  muela, chequeo, embarazo, ansiedad, vista, análisis, espalda → subcategorías) · "Tu seguro" (chips) · "Para quién"
  (chips). Banda "¿No puede esperar a una cita?" → filtra "Clínica sin cita y urgencias" (`band.sub2`). Tarjetas: próxima
  cita o espera sin cita · seguros + precio sin seguro · chip "El médico habla español"; CTA Booking (o "Cómo llegar" si no
  toma citas). Ficha y Booking van a encargo hasta las etapas 2–3 (nunca a la de otra categoría). Respaldo: `_tmp/Prototipo respaldo pre-hogar.dc.html`.
  **Etapa 2 hecha (28 sep):** `prototype/neg-salud-listing.js` (`TLSaludL`: SVC k cons · tele · walk · free · proc, STAFF con
  licencia de PA e idiomas, reseñas, Tu seguro = hoja `hc` con `s.hcs.salud` (TIPOS + PLANS; cuenta demo Medicaid · UPMC for You;
  `s.segs`, `s.segSel`), `compat` (acepta / no acepta → precio sin seguro, no bloquea), `priceFor`, `resAdd`). Pestañas Resumen ·
  Servicios · Staff · Reseñas; bloque 911 + "To'Latino no da consejo médico". Hoja del servicio: con quién (· ES si habla español),
  precio con / sin seguro. "Elegir hora" → Booking.
  **Etapa 3 hecha (28 sep):** `prototype/neg-salud-flow.js` (`TLSaludFlow`; mismas vistas `ab` / `ac`; estado `s.sb` y `s.scitas`).
  `APP-NEG-SALUD-BOOKING`: 1 Tu seguro (obligatorio: plan o "No tengo seguro"; compat con precio) + motivo general opcional (solo lo
  ve el consultorio) → 2 Para quién (yo / hijo·a / otra persona) + día y hora (30 min; video si k tele) → 3 Revisa y envía (911,
  resumen con idioma, precio $0 / copago / sin seguro pagado en la consulta, hoy $0, tarjeta solo si no vas, intérprete gratis si
  el profesional no habla español, SMS). `APP-NEG-SALUD-CITA`: pend → ok | seg (no aceptan tu seguro: seguir sin seguro · buscar
  otro · cambiar seguro) | alt | no | exp → done ("Pasó la cita", estrellas → reseña). RESPUESTA: Tarjeta rechazada = seguro no
  aceptado. Cancelar gratis. Ficha: tarjeta "Tu cita". 
  **Etapa 4 hecha (28 sep):** `prototype/neg-salud-rev.js` (`TLSaludRev`, mismos ganchos que `TLHogarRev` en `revWVals`: `HR` elige
  Salud u Hogar). Reseña verificada con la cita `done` de `s.scitas`; seguro y lo pagado salen de la cita; preguntas: idioma (habló
  español / intérprete / no me entendieron) · espera · te explicaron · cobraron lo que dijeron · trato; visitante también seguro;
  aviso fijo "No escribas diagnósticos, medicinas ni resultados". `APP-NEG-SALUD-AYUDA` (`TLHogarExt.shelp`, vistas pe/ps): motivo
  (cobro no dicho · cobro al seguro no pedido · seguro rechazado tras confirmar · sin intérprete · espera · trato · otra) + detalle +
  foto de la factura obligatoria en cobros + qué quieres (revisar y devolver · corregir el cobro al seguro · solo avisar) → responde
  en 48 h | To'Latino revisa. Formulario pe: `hasVid` oculta el botón de video. **Salud completa (1–4).** Siguiente: Servicios Profesionales.
- **Onboarding de negocios `ONB-NEG-*` (decisiones del usuario, 29 sep):** spec aprobada `plan/onboarding-negocios.md`
  (fases A–H). **Pro = $14.99/mes, sin plan anual** (30 días gratis, sin tarjeta; aviso 5 días antes). **Free recibe
  pedidos o citas en línea con techo: 10 al mes** (luego solo contacto; la ficha Free del prototipo aún muestra solo
  Llamar → pendiente de alinear). Se construye **todo A–H de una vez**, con **las 17 categorías** cambiando módulos,
  primer ítem, ejemplos y amenities (`prototype/onb-neg-data.js`, `TLOnbNeg`). **Importar desde link** (Google Maps /
  Instagram / Facebook) incluido en B1. **Desktop:** pasos a la izquierda + vista previa en vivo (tarjeta y página) a
  la derecha. **Día 30 (fin de prueba, contenido dormido)** va después, con el panel. Sin semilla ni Pro 6 meses
  (anulado en `pantallas-iniciales.md`). DC: `To'Latino Publica tu negocio.dc.html` (carga diferida en rutas
  `ONB-NEG-*`) + hijo `To'Latino Publica vista previa.dc.html` (tarjeta y página Free/Pro).
  **v1 construida (29 sep):** rutas `ONB-NEG-A1…H2` (paso = código; `encargo()` y el constructor las dejan pasar; en
  el Prototipo `isNegOnb`, barra compacta móvil, sin nav). Borrador en localStorage `tl-onb-neg-v1` (retoma donde quedó;
  A1 ofrece seguir o empezar de nuevo; publicado → "Publicar otro negocio"). A2 solo sin sesión; A3 usa la hoja 2m
  (`api.login`) o confirma "la cuenta de {nombre}". B1 importar (hoja: Maps/IG/FB, cada fuente trae solo lo suyo,
  casillas, "Usar lo marcado"), nombre repetido → recuperar / es otro. B3 buscador en subcategorías salta a B4.
  C1 módulos del rubro con toggles + línea fija de la categoría. C2 formulario según tipo (svc, dish, prod, rent,
  quote, course, trip, prop, veh, cult) + "¿Cómo lo vendes?". D1 portada obligatoria, "Usa tu inicial". D2 dirección
  con sugerencias + "Atiendo en mi casa" / zona 5–30 mi. D3 plantillas + editor por día (−/+ 30 min), Pro: segundo
  tramo, feriados, temporada, horario distinto para el módulo en línea. D5 galería (arrastrar en desktop, tocar para
  mover en móvil). E1 correo con código, nivel de confianza. E2 sello (en revisión). F1 invitar empleado (acepta solo a
  los 3.5 s en el prototipo) o quien renta espacio (queda invitado). G1 interruptor Free|Pro sobre SU página y tarjeta +
  lo que Pro le da, con sus números. G2 Pro preseleccionado, código de promotor demo `HZL30` (60 días), Free con lo que
  queda guardado, comparación desplegable. H1 publicado + compartir + ver como cliente. H2 fuerza del perfil (anillo) +
  tareas que abren el paso en modo edición ("Guardar" vuelve a H2). Desktop: fases 232 · paso · vista previa 372
  (sticky); 960–1199 sin columna de fases. Respaldo: `_tmp/Publica tu negocio v1 (respaldo).dc.html`.
  Pendiente: aprobar como patrones del master (pasos del onboarding, tarjeta en vivo, interruptor Free|Pro), ficha Free
  con el techo de 10 en línea, panel del negocio (F9), día 30.
- **Panel del negocio `DASH-*` (decisiones del usuario, 29 sep):** todo de una vez (secciones 1–6 del plan + Eventos,
  Mensajes, Insights, Moderadores, Entrega con repartidores/despacho/cuadre, Cobros con tarjeta). Inicio = **Hoy: lo que
  espera tu respuesta** con aceptar / rechazar ahí mismo. **El panel reemplaza al selector RESPUESTA:** el negocio
  responde en el panel y el cliente lo ve en su pedido, cita o reservación (en el Prototipo, `scen` por defecto `panel`
  = espera; un guardia en `setState` retiene la respuesta automática hasta que el panel responde; queda "Tarjeta
  rechazada" como simulación del cliente). Negocios del panel: **el tuyo del onboarding + ejemplos con historial**
  (Sabor Dominicano, Barbería El Primo, uno Free). **Desktop:** barra lateral de secciones + contenido + columna de
  detalle. Motor único de bloques (trío listado → detalle → acción), nada a mano por módulo. DC: `To'Latino Panel
  negocio.dc.html` + `prototype/dash-data.js` (`TLDash`). `To'Latino Panel.dc.html` (viejo) = solo referencia.
  **v1 construida (29 sep):** rutas `DASH-HOY · CLIENTES · MENSAJES · PAGINA · MODULOS · EVENTOS · INSIGHTS · ENTREGA ·
  EQUIPO · AJUSTES · MAS` (+ `biz`, `sub`, `det`); `DASH-HOME` → Hoy, `DASH-COBROS` → Ajustes · cobros (`DASHR` en el
  Prototipo). Móvil: header con selector de negocio + nav de 5 (Hoy · Clientes · Mensajes · Tu página · Más); detalle en
  hoja. Desktop: secciones 232 · contenido · detalle 400 (≥1200; si no, ventana). Bloques: head, stats, tabs, rows (con
  acciones y toggles), chips, note, lock (Free → Pro), bars, field, acts, thread, empty. **En vivo:** `dashLive` lee
  order · rsvs · citas · acitas · hcitas · scitas · pres · … · jobApps con `scen: 'panel'`; `holdGuard` retiene la
  respuesta automática de cada motor (`_held`) y `dashRespond` la aplica al aceptar o pone `st: 'no'` al rechazar
  (probado con una reservación: queda pendiente hasta que el panel confirma). "Otra hora" solo en ejemplos (los motores
  no la exponen). Reseñas: `replyRev(biz, id, 'ok')` desde el panel. Tu página y Módulos del negocio propio abren los
  pasos del onboarding en modo edición con `back` (vuelve al panel). Respaldo: `_tmp/Panel negocio v1 (respaldo).dc.html`.
  **Menú del panel = patrón aprobado 2t (variante 1c de `To'Latino Panel menú (variantes).dc.html`, 29 sep):** barra
  lateral con la tarjeta de **Tu página primero** (estado, vistas 7 días, contactos, fuerza + Información y contacto ·
  Horario · Fotos y portada · Reseñas · Novedades · Insights de tu página), luego «Cada día» (Hoy · Clientes · Mensajes ·
  Lo que vendes · Entrega · Eventos) **solo si vende** (si no: Mensajes + «Empezar a vender o agendar»), y abajo
  Moderadores · Cobros y plan · Ajustes. Negocio que solo se publica cae en Tu página. Móvil: Tu página · Hoy · Clientes ·
  Mensajes · Más (sin ventas: Tu página · Mensajes · Negocio). `DASH-PAGINA` = centro (tarjeta oscura con números + 11
  partes en 3 grupos: Lo que ven los clientes · Contenido · Confianza y números) y cada parte en `sub` (info, ubic, hor,
  fotos, about, resenas, nov, faq, rel, ver, ins) con fichas para saltar entre ellas. **Insights de tu página** (7/30/90
  días): vistas, apariciones en búsquedas, contactos, guardados; lo que hacen en tu página (fotos, horario, cómo llegar,
  llamar, WhatsApp, mensaje, compartir); búsquedas en las que apareces; de dónde llegan; horas pico; fotos más vistas;
  lugar en la categoría, vecinos que recomiendan, seguidores; y ventas solo si vende. Free: vistas y contactos, el resto
  bloqueado con Pro. `DASH-INSIGHTS` → Tu página · Insights. Master 2t. SINCRONIZAR: llevar el menú como componente al
  sistema (pendiente).
  Pendiente: reseñas del cliente en vivo en el panel, "otra hora" en vivo, crear/editar evento completo, novedades /
  relacionados / FAQ / vacantes del panel (encargo), aprobar patrones.
- **Panel v2 · segunda opinión (30 sep, pedida por el usuario como ingeniero UX/UI):** `To'Latino Panel negocio
  v2.dc.html` + `prototype/dash2-data.js` (`TLDash2`: Sabor Dominicano Pro·vende, Barbería El Primo Pro·agenda,
  Empanadas Doña Luz Free·solo se publica). No toca el v1 ni el Prototipo; misma interfaz de props (route, lang, user,
  desk, dw, api, role) para enchufarlo después. Suelto trae barra de revisión (Móvil/Desktop · 1440/1280/1024 · ES/EN ·
  Dueño/Moderador · negocio). Arquitectura: menú 2t (Tu página primero · Cada día solo si vende · Tu negocio); **trío
  listado → detalle → editor en todo**; editores con "Guardar / Descartar" y "CAMBIOS SIN GUARDAR" (barra fija abajo en
  móvil, acciones al final en desktop); toggles guardan solos; permisos por área con estado "Sin acceso"; Free = mismas
  pantallas con bloqueo Pro. Tu página = hero oscuro (estado, vistas, contactos, fuerza) + "Lo que más te ayuda ahora" +
  12 partes en 3 grupos, cada parte con fichas para saltar y su editor completo (info, ubicación/zona, horario por día con
  plantillas y Pro, fotos con portada/logo/galería ordenable y selector, quiénes somos + amenities, reseñas con filtros y
  respuesta, novedades con editor por tipo, FAQ, relacionados, equipo, verificación con correo por código y sello,
  insights 7/30/90 con gráfica, clics, búsquedas, lugar, fuentes, horas pico, fotos más vistas). Hoy (bandeja con
  acciones inline, agenda, mensajes, reseñas, acciones rápidas), Clientes (tipos + filtros + detalle con historial y
  siguientes pasos: listo/salió/entregado, llegó/no llegó, reembolso), Mensajes (hilo, rápidas, quién lo lleva), Lo que
  vendes (3 estados de módulo, ítems con categorías/filtros y editor completo: foto, precio, cobro, duración,
  disponibilidad, agotado hoy, en línea/catálogo, stock; ajustes propios de pedidos/citas/reservaciones/cotización),
  Entrega (métodos, zona, costo, gratis desde, mínimo, preparación, quién entrega, repartidores, despacho, cuadre),
  Eventos (detalle con aforo, boletos, mesas, line-up, porteros, reglas, cancelar; editor con tiers y mesas por
  stepper), Moderadores (áreas, actividad, transferir), Cobros y plan (Stripe pasos, pagos con movimientos, plan,
  facturación), Ajustes (políticas, avisos, idioma, cerrar temporalmente, borrar). Estado en localStorage `tl-dash2-v1`.
  Respaldo: `_tmp/Panel negocio v2 (respaldo).dc.html`. Pendiente: decisión del usuario v1 vs v2; si v2 → conectarlo
  al Prototipo (rutas DASH-*, `dashLive`/`respond`), patrones al master y sistema.
- **Buscar (construido, v1 · 1 oct) — `To'Latino Buscar.dc.html` + `prototype/search-engine.js` (`window.TLSearch`).**
  Carga diferida (como Comunidad). Ruta `APP-BUSCAR` (`q`, `cat` = alcance). Móvil: el buscador del header navega a
  `APP-BUSCAR` (barra compacta + campo propio, sin nav). Desktop: el buscador del header abre un **desplegable** sobre la
  página (`s.srch`, fondo oscuro, Esc cierra) con el mismo DC en `mode="drop"`; Enter → página de resultados. Buscador de la
  página de categoría → misma búsqueda con alcance ("En Salud ×"). `APP-NEG-BUSQ` y `APP-NEG-ABIERTO` (footer, accesos del
  home) ya no van a encargo: abren la búsqueda (`searchFrom`). Volver: pila propia del DC → `s.srchFrom`.
  **Motor:** índice de los 276 negocios de `TLAll` (incl. sillas, bahías y técnicos con "SILLA EN …"), 738 subcategorías,
  549 platos y servicios (carta de Sabor + todos los `*L.SVC`), eventos `TLEvt` y publicaciones `TLCom`. Entiende intención
  en ES/EN y la convierte en filtro: abierto ahora · cerca · verificado · delivery · pickup · sin cita · a domicilio ·
  24 horas · habla español · Medicaid/Medicare/CHIP · sin seguro · sin seguro social · esta noche · hoy · fin de semana ·
  gratis · mejor calificados · más barato. Sinónimos ES/EN (nails → uñas, barber → barbería, plumber → plomería…), plurales,
  un error de tecleo ("mofngo" → mofongo) y "¿Quisiste decir…?". Prefijo solo mientras escribes; al buscar, palabras cortas
  exactas. AND entre palabras; si nada tiene todas, muestra lo más parecido con aviso. Pro primero (rotación diaria), 10 por
  página. Subcategoría que existe pero sin negocios en Hazleton → tarjeta "Aún no hay … · Avísame · Recomiéndalo" (plan).
  **Pantallas:** explorar (recientes en localStorage `tl-search-v1`, "Escribe como hablas" con lo que se entiende, lo más
  buscado, 17 categorías; con alcance: subcategorías de la categoría y su línea fija) · sugerencias en vivo (Buscar «…» con
  conteos, Categorías, Negocios, Platos y servicios, Eventos; coincidencia en negrita) · desktop: lista + **vista previa**
  (BusinessCard, plato con precio, subcategoría con sus negocios, EventCard), ↑ ↓ Enter · resultados: Todo · Negocios ·
  Platos y servicios · Eventos · Vecinos (pestaña solo si hay), "Entendimos" (cada filtro se quita con ×), **línea fija de
  la categoría dominante** (911 en salud, etc.), filtros rápidos por categoría, Ordenar (nota: Pro primero), subcategoría
  sugerida con foto, "Tiene Mofongo de chicharrón · $12" como razón del resultado, Avísame cuando haya (pide sesión),
  Pregúntale al barrio (→ `APP-COM-NUEVO`) · sin resultados · voz simulada (mic). Desktop 3 columnas ≥1200 (tipos y
  categorías 240 · contenido · contexto 320 sticky), 2 columnas 960–1199, 1 columna con Tabs <960.
  Abrir: negocio → ficha (plato de Sabor → abre el plato en Menú; servicio → pestaña Servicios), subcategoría → `APP-NEG-CAT`
  con `negSub`, evento → `APP-EVT-LISTING`, publicación → `APP-COM-POST`. Respaldo: `_tmp/Prototipo respaldo pre-buscar.dc.html`.
  Candidatos aprobados (1 oct) → master 2u fila de resultado (`SearchResultRow`), 2v "Entendimos" (`UnderstoodBar`),
  2w desplegable desktop (`SearchPanel`), 2x "Aún no hay" (`NotYetCard`); fuente `components/search/Search.jsx`.
  **SINCRONIZAR 17** pendiente de pegar en el proyecto del sistema; mientras tanto `prototype/ds-search.js` (puente) los
  registra en el namespace solo si faltan, y `To'Latino Buscar` ya los monta con `x-import`. Pendiente: mapa de resultados (`APP-NEG-MAPA`), alertas reales en
  Mi cuenta, sinónimos desde el panel interno (ADM-CAT), "Búsquedas sin oferta" (ADM-ANALIT).
- **Ciudad que estás viendo (construida, v1 · 1 oct) — `To'Latino Ciudad.dc.html` + `prototype/city-data.js` (`window.TLCity`, en
  `bundle-4`).** Se abre con la ciudad del header (móvil: hoja dentro del teléfono; desktop: ventana 780 bajo el buscador con
  fondo oscuro, Esc cierra), con `APP-CIUDAD` desde cualquier lado (footer "Ciudades" preselecciona Allentown/Reading) y desde
  el chip de ciudad de Buscar. Estado `s.loc = { city, ctr, rad }` en localStorage `tl-loc-v1`; el header muestra
  "Hazleton, PA · 5 mi · casa" (móvil "5 MI"). Reglas del plan: cambia libre y al instante, filtra Negocios, Eventos y Buscar;
  **no cambia Mi ciudad** (comunidad, cada 30 días → `USR-CIUDAD`), se dice en la hoja; el GPS sugiere, nunca cambia solo.
  Contenido: buscador (ciudad, barrio, código postal 18201/18202, pueblo cercano → "se ve con 10 mi" y amplía, ciudad no
  abierta → Pedir) · Usar mi ubicación (permiso simulado: una vez / al usar / no → North End) · Desde dónde medimos (centro,
  tu ubicación, Casa / Trabajo / Casa de mami si hay sesión; invitado → "Entra para medir desde tu casa") · barrios (North
  End, Alter St, The Heights, West Hazleton, Hazle Township) · Qué tan lejos 2 · 5 · 10 · 30 mi con **mapa real** (teselas
  Esri World Street Map, círculo del radio a escala, puntos de negocios: Pro en ink, Free en Action, fuera del radio gris) +
  "N negocios · N eventos", pueblos que incluye y aviso honesto "Entre 10 y 30 mi todavía no hay negocios" · Ciudad: Hazleton
  ACTIVA · Allentown y Reading PRÓXIMAMENTE (millas, lista de espera) · Pide tu ciudad (sugerencias, teléfono o el de la cuenta,
  "Eres el vecino N.º…", si queda a ≤30 mi ofrece ampliar el radio; guardado `tl-city-ask-v1`). Distancias: cada negocio
  recibe una posición estable (`TLCity.pos`) y `b.d` se recalcula desde el centro elegido, así tarjetas, Buscar y "Más cerca"
  usan la distancia nueva; el radio filtra `APP-NEG-CAT` y Buscar (a domicilio sin dirección siempre cuenta).
  **Ciudad próximamente** (`isPronto`: Inicio, Negocios, Categoría, Eventos y Buscar con `city ≠ hzl`): mapa de la ciudad,
  "To'Latino llega a Allentown", N de 50 negocios listos, lista de espera, Avísame cuando abra (pide sesión, `tl-city-wait-v1`),
  Publica tu negocio gratis (`ONB-NEG-A1`), Recomienda un negocio, lo que más buscan sus vecinos, "Mientras tanto · Ver
  Hazleton". Respaldo: `_tmp/Prototipo respaldo pre-buscar.dc.html` (antes de Buscar y Ciudad).
  Candidatos a patrón del master (pendiente de aprobación): selector de radio con mapa, fila "Usar mi ubicación", pantalla
  "Ciudad próximamente". **Nacional (decisión del usuario, 1 oct):** To'Latino no se divide por ciudades: se busca alrededor
  de donde estés, en todo EE. UU. (como las apps de delivery y marketplace); Hazleton es la primera zona abierta. Tarjeta
  oscura "MUY PRONTO · TODO EE. UU." con mapa del país → **reemplazada (usuario, 1 oct)** por una sola línea gris bajo la lista
  de ciudades: ícono globo + "MUY PRONTO EN TODO EE. UU." (hoja y ventana desktop; quitada de la zona próxima). Antes:
  tarjeta con pulso "AQUÍ EMPEZAMOS" en
  Hazleton (hoja, ventana desktop y zona próxima); sección "Dónde ya estamos y lo que sigue" (YA ESTAMOS · LA SIGUIENTE);
  "Pide tu ciudad" → "Avísame cuando llegue a mi zona" (ciudad o código postal; prop `ask0` abre directo ahí); zona próxima
  = "Todavía no hay negocios alrededor de Allentown"; footer "Dónde estamos" con "Todo EE. UU. · PRONTO" y "Avísame en mi zona". Pendiente: el panel interno de ciudades (ADM-CIUDAD) y la lista de espera real.
- **Pexels:** `run_script` puede llamar la API
  (`fetch('https://api.pexels.com/v1/search?query=…&per_page=3&orientation=landscape',
  {headers:{Authorization: CLAVE}})`, clave en `plan/CLAUDE-plan.md`). Resultados
  en `prototype/pexels.json`. La URL va **literal** en el atributo (`image="https://images.pexels.com/…"`).

## 7. Checklist técnico (errores que ya pasaron — no se repiten)
- `Button block` dentro de una columna flex se aplasta → **siempre** envolverlo en
  `<div style="display:flex">`.
- `<x-import>` monta con `display:contents` y **no pasa `style` al componente**:
  un `flex:1` / margen / ancho puesto en el x-import no hace nada. Para que un
  componente llene su espacio: envolverlo en `<div style="flex:1;min-width:0;display:grid">`
  (en fila) o `<div style="display:grid">` (celda de grilla); el grid estira la
  raíz del componente. Nada de `style` en el x-import para layout.
- Grillas: `repeat(n, minmax(0,1fr))`, nunca `1fr` solo.
- Tiles de 4 columnas: etiquetas de una palabra (Comida, Belleza, Hogar…).
- Cada DC carga en `<helmet>` los tokens + `styles.css` + `_ds_bundle.js` de
  `_ds/to-latino-design-system-d2663232-04f6-45a5-908b-d9e3f8cc8e08/`.
- **Sincronizar el sistema:** editar aquí → bloque nuevo en
  `Setup Design System (copiar).dc.html` → el usuario lo pega en el chat del
  proyecto del sistema → verificar en `/projects/d2663232…/_ds_bundle.js` →
  copiar `_ds_bundle.js`, `_ds_manifest.json`, `readme.md` a la carpeta `_ds/` local
  y confirmar con grep que trae lo nuevo. Sin este último paso, las pantallas
  usan la versión vieja (pasó con los íconos).
- Archivos con acento o apóstrofe no se pueden leer/escribir con `run_script` →
  copiar a `_tmp/x.html`, editar, mover de vuelta.
- Rutas del prototipo: al renombrar una ruta, migrarla en el constructor; la lista
  de rutas construidas en el constructor se actualiza con cada pantalla nueva (lo
  que no esté ahí vuelve a `APP-HOME`, nunca una pantalla en blanco).
- **Nunca mover un archivo encima de otro sin respaldo** (se perdió Desktop v3).
  Al reemplazar: primero renombrar el viejo a `… (respaldo)`.
- Antes de entregar, verificación visual. Nada se da por hecho sin verlo. **Sin excepciones:**
  todo cambio, por chico que sea (un texto, un toggle, un arreglo de datos), se revisa en pantalla
  antes de decir que quedó. Nunca se omite la revisión.

## 8. Trato con el usuario
- Su tiempo y créditos cuentan. Directo, breve, sin repetir lo obvio ni lo ya
  decidido. No se pregunta lo que esta memoria responde.
- Continuidad, no reinvención: no rediseñar lo resuelto ni cambiar de rumbo.
- Cambios pequeños = solo lo pedido. Mejoras extra se sugieren, no se aplican.
- Revisar la calidad antes de mostrar; un error visible del sistema ("el botón
  aplastado") es inaceptable.
- **Servicios Profesionales (`NEG-PRO`, modo automático, 28 sep):** tesis ¿puede hacerlo por ley y cuánto es en total? Línea fija
  **"Nadie te garantiza un resultado."** + "En EE. UU. un notario no es abogado…". Primer grupo: inmigración y documentos + impuestos/ITIN.
  **Etapa 1 hecha:** `prototype/neg-pro.js` (`TLPro`: 20 negocios de Hazleton, 11 Pro + 9 Free; `lic` = licencia verificable (LIC:
  abogado · acreditado DOJ · notario · ata · cpa · ptin · caa · agente, con qué puede hacer cada una), `licL`, `cant` = lo que NO puede
  hacer, `fee` = honorario + gobierno aparte; SUBG 7 capítulos (60 subcategorías); ROWS: "¿Qué trámite necesitas?" (foto) · "¿Quién
  puede hacerlo por ley?" · "Cómo te atiende"; filtros F-PRO; fotos `prototype/pexels-pro.json`). `APP-NEG-CAT` con `cat: 'NEG-PRO'`
  (`b.prof`); tarjeta Pro con chip de licencia. Ficha → encargo hasta la etapa 2 (`openBiz` si falta `TLProL`).
  **Etapa 2 hecha:** `prototype/neg-pro-listing.js` (`TLProL`: SVC k cons · fijo (honorario + `gov` = total) · hora · pct (solo si
  ganas) · walk · cotiza; `rem` video/teléfono; `cred` se descuenta; STAFF con licencia (colegio de abogados, DOJ, notaria, ATA, EA, PTIN,
  CAA, CPA, agente); reseñas: hizo lo que dijo que podía · cobró el total · explicó · idioma · cumplió la fecha · trato). La ficha usa las
  vistas de Salud (`SL` = salud o prof, `SX`/`SLX` eligen el motor). Tarjeta "¿Puede hacerlo por ley?" (licencia + lo que no puede) en
  Servicios; hoja con "El total" (honorario / gobierno / total). Booking → encargo `APP-NEG-PRO-BOOKING` (etapa 3).
  **Etapa 3 hecha:** `prototype/neg-pro-flow.js` (`TLProFlow`; vistas `ab`/`ac`; estado `s.pb`, `s.pcitas`; PAY ctx 'pb').
  `APP-NEG-PRO-BOOKING`: 1 Tu trámite (¿puede hacerlo por ley? con la licencia de la persona elegida · oficina / video / teléfono si `rem` ·
  situación: primera vez / ya tengo caso / carta / fecha límite · nota) → 2 Día y hora → 3 Revisa y envía (hoy $0; consulta en la oficina;
  honorario y gobierno por separado; solo si ganas = $0 por adelantado). `APP-NEG-PRO-CITA`: pend → ok | alt | no | exp → "Pasó la
  consulta" → quote (vista `est`: "El total, por escrito", honorario + gobierno aparte − crédito de la consulta, extra opcional con tu OK
  (RESPUESTA Con cambios), válido 30 días; Aceptar y contratar | No, gracias · solo la consulta) → hired (lo que pagas) → "Terminó el
  trámite" → done (estrellas → reseña). Fijo / % pasan de ok a hired. Ficha: tarjeta "Tu consulta".
  **Etapa 4 hecha:** `prototype/neg-pro-rev.js` (`TLProRev`, ganchos de `revWVals` como Salud/Hogar; `HR` elige el motor). Reseña
  verificada con la consulta `done` de `s.pcitas`; total por escrito y lo pagado salen de la consulta; preguntas: hizo lo que dijo que
  podía · te explicó · idioma · cumplió la fecha · trato (visitante también "cobró el total"); aviso "No escribas datos de tu caso".
  `APP-NEG-PRO-AYUDA` (`TLHogarExt.phelp`, vistas pe/ps): cobró más del total · ofreció algo que no podía por ley (+ reportar a la Fiscalía
  de PA) · no hizo lo acordado · perdió fecha o documento · no contesta · trato · otra → foto del recibo (obligatoria en cobros) →
  devolver · terminar lo acordado · avisar → acepta | otra cosa | no acepta → revisión To'Latino (48 h). Entradas: consulta contratada o
  terminada ("Ayuda con el trámite"), reseña ≤2 ★. **NEG-PRO completo.** Depuración sin pantalla: los motores se prueban en `run_script`
  con stubs de TLListing/TLStaff/TLAll (el usuario pidió no abrir vistas previas desde el teléfono).
- **Fiestas (`NEG-FIESTA`, modo automático, 28 sep):** tesis ¿esa fecha está libre? Línea fija **"La fecha no es tuya hasta que te la
  confirmen."** Módulo principal = Renta / paquetes con calendario real.
  **Etapa 1 hecha:** `prototype/neg-fiesta.js` (`TLFiesta`: 20 negocios, 11 Pro + 9 Free; `busy` = días ocupados (0 = hoy jue 24 sep,
  sábados 2/9/16/23/30) → tags `d:2`/`d:3`/`d:9` y eta "Libre este sábado" / "Próximo sábado libre"; `cap` invitados; `zone` millas;
  `dep` depósito para apartar; SUBG 7 capítulos (56 subcategorías); ROWS "¿Qué celebras?" (foto) · "¿Está libre tu fecha?" · "¿Cuántos
  invitados?"; filtros F-EVENTO; fotos `prototype/pexels-fiesta.json`). `APP-NEG-CAT` con `cat: 'NEG-FIESTA'` (`b.fiesta`); tarjeta Pro con
  chip de capacidad. Ficha → encargo hasta la etapa 2.
  **Etapa 2 hecha:** `prototype/neg-fiesta-listing.js` (`TLFiestaL`: SVC k pack · hora · unid · fijo · visita · cotiza, `inc`, `cap`,
  `mont`; STAFF; reseñas: respetaron la fecha · a la hora · cobraron lo del paquete · como en las fotos · recogieron · trato). **Tu fecha**
  (`s.fev` = e, i, g, w) con la hoja `hc` (`s.hcs.fiesta`, `fechaVals`): cada servicio y la ficha dicen "Libre el …" / "Ocupada el … · libre …"
  / "No caben". Vistas de Salud (`SL`/`SX`/`SLX` también eligen Fiestas).
  **Etapa 3 hecha:** `prototype/neg-fiesta-flow.js` (`TLFiestaFlow`; `s.fb`, `s.fcitas`; PAY ctx 'fb'). `APP-NEG-FIESTA-BOOKING`: 1 Tu fiesta
  (qué celebras · invitados, precio por invitados en renta por unidad) → 2 Fecha y hora (ocupadas bloqueadas; dónde: tu casa / salón / otra)
  → 3 Revisa y envía (hoy depósito, resto el día; reglas del depósito). Visita al salón = gratis. `APP-NEG-FIESTA-CITA`: pend → ok (fecha
  confirmada) | no (devuelto + fechas libres) | alt (otra hora) | exp (24 h, devuelto) → "Pasó la fiesta" → done. Cancelar: sin confirmar o
  30+ días = devuelto; menos = se queda. RESPUESTA Tarjeta = rechazada al enviar.
  **Etapa 4 hecha:** `prototype/neg-fiesta-rev.js` (`TLFiestaRev`; reseña y `APP-NEG-FIESTA-AYUDA` (`TLHogarExt.fhelp`): no llegaron ·
  tarde · no quedó como lo acordado · faltó algo · cobraron más · daños o no recogieron). **NEG-FIESTA completo.**
- **Mercados (`NEG-MERC`, modo automático, 28 sep):** tesis ¿lo pesan delante de mí? Línea fija **"Lo que va por peso se pesa delante
  de ti y pagas el peso real."** Módulo principal = Tienda (pedido pickup / envío; por libra se retiene el estimado y se cobra el peso real con
  foto de la balanza; sustituciones con tu OK).
  **Etapa 1 hecha:** `prototype/neg-merc.js` (`TLMerc`: 20 negocios, 11 Pro + 9 Free; tags F-RETAIL + `pesa`, `p:do/mx/ca/sa/car`; SUBG 5
  capítulos (30 subcategorías); ROWS "¿Qué buscas hoy?" (foto) · "De tu país" · "Cómo compras"; `PROD` = fotos de productos; fotos
  `prototype/pexels-merc.json`). `APP-NEG-CAT` con `cat: 'NEG-MERC'` (`b.merc`); CTA Ordenar / Cómo llegar. Ficha → encargo hasta la etapa 2.
  **Etapa 2 hecha:** `prototype/neg-merc-listing.js` (`TLMercL`: pestaña Productos (`svc`) con k lb · unid · plato, `cut`/`punto`, `was`;
  hoja con cantidad (estimado por libra) + corte o punto → carrito `s.mcart` (un mercado a la vez); tarjeta "Tu pedido"; "¿Lo pesan delante
  de ti?"; reseñas: pesaron delante · peso real · fresco · estante = caja · sustituciones con tu OK · trato; `OPTS` envío y mínimo).
  **Etapa 3 hecha:** `prototype/neg-merc-flow.js` (`TLMercFlow`; `s.mb`, `s.mped`; PAY ctx 'mb'). `APP-NEG-MERC-PEDIDO`: 1 Tu pedido
  (pickup / envío con mínimo · si algo no hay: llámame / parecido con OK / no sustituir · nota) → 2 Cuándo → 3 Revisa (se retiene estimado +
  10 % en lo que va por peso). `APP-NEG-MERC-ESTADO`: pend → ok → "Lo pesaron" → pesado (vista `est` "Así lo pesaron": pidió vs pesó con
  foto de la balanza; lo que no había con la sustitución propuesta, sin tu OK no se cobra) → "Está bien, cobrar $X" → listo / en camino →
  done (retenido · cobrado · liberado). no / exp liberan. "El peso no me cuadra" → ayuda (etapa 4).
  **Etapa 4 hecha:** `prototype/neg-merc-rev.js` (`TLMercRev`; reseña verificada con `s.mped` done; balanza y peso real salen del pedido;
  preguntas fresco · estante = caja · sustituciones · trato. `APP-NEG-MERC-AYUDA` (`TLHogarExt.mhelp`): el peso no cuadra · faltó algo · no
  estaba fresco · cambiaron sin preguntar · precio del estante · tarde → devolver · reponer · avisar. Entrada también desde "El peso no me
  cuadra" en la vista pesado). **NEG-MERC completo.**
- **Vida Nocturna (`NEG-NOCHE`, modo automático, 28 sep):** tesis ¿cuánto es el cover y cómo está la fila? Línea fija **"El cover que ves
  es el que pagas en la puerta."** Módulo principal = Lista y mesas (lista de la noche + mesa / VIP con mínimo).
  **Etapa 1 hecha:** `prototype/neg-noche.js` (`TLNoche`: 20 locales, 11 Pro + 9 Free; `nt` = esta noche: cover, after [hora, cover], edad,
  música, dress, fila de anoche (en vivo al abrir), list (hora de la lista), day (abre mañana); `hrs` pasan de 24 (26 = 2 AM); SUBG 5 capítulos (25
  subcategorías); ROWS "¿Qué quieres esta noche?" · "Esta noche" (sin cover, fila corta, 18+, lista) · "Música"; fotos
  `prototype/pexels-noche.json`). `APP-NEG-CAT` con `cat: 'NEG-NOCHE'` (`b.noche`); CTA "Lista y mesas". Ficha → encargo hasta la etapa 2.
  **Etapa 2 hecha:** `prototype/neg-noche-listing.js` (`TLNocheL`: pestaña "Esta noche" (`svc`) con k lista · cover · mesa · vip · evento;
  `V.ax.veh` = cover de la noche (y después de…), edad, música, código; `V.ax.q` = la fila (anoche a su hora; en vivo al abrir); hoja con
  personas / boletos; reseñas: cover publicado · fila · reglas claras · seguridad · música · trato en la puerta).
  **Etapa 3 hecha:** `prototype/neg-noche-flow.js` (`TLNocheFlow`; `s.nb`, `s.nres`; PAY ctx 'nb'). `APP-NEG-NOCHE-RESERVA`: 1 Tu noche
  (cuántos · ocasión · nota) → 2 Noche y hora de llegada (la lista vale hasta su hora) → 3 Revisa. Lista = al instante, no cobra (código en la
  puerta); mesa / VIP = solicitud con depósito que se descuenta; evento = boletos pagados. `APP-NEG-NOCHE-ESTADO`: pend → ok | no | alt | exp →
  "Pasó la noche" → done. Cancelar: lista gratis; mesa devuelto hasta las 6 PM.
  **Etapa 4 hecha:** `prototype/neg-noche-rev.js` (`TLNocheRev`; reseña con `s.nres` done; `APP-NEG-NOCHE-AYUDA` (`TLHogarExt.nhelp`): más
  cover · no respetaron lista o mesa · mínimo como cargo · inseguro (911 primero) · trato). **NEG-NOCHE completo.**
  Siguiente en la COLA: Tiendas `NEG-TIENDA`.
- **Tiendas (`NEG-TIENDA`, modo automático, 28 sep) · 1–4 hechas:** tesis ¿lo tienen y a qué precio de verdad? Línea fija **"El precio
  que ves es el que pagas en la caja."** Archivos: `neg-tienda.js` (`TLTiendaB`: 20 negocios, 11 Pro) + `neg-tienda-data.js` (`TLTienda`:
  SUBG 7 capítulos / 52 subcategorías, ROWS, filtros F-RETAIL, SVC con k ropa (tallas con existencia) · unid · plan (layaway) · serv, `OPTS`
  dev / envio / plan) + `neg-tienda-listing.js` (`TLTiendaL`: Productos, hoja con talla (agotada no se aparta) → `s.tcart`) +
  `neg-tienda-flow.js` (`APP-NEG-TIENDA-APARTADO` → `-ESTADO`: pend → ok (guardado 48 h) | parcial (falta una talla: otra o quitar) | no |
  exp → "Lo recogí" → done; abono si hay plan; PAY ctx 'tb') + `neg-tienda-rev.js` (reseña y `APP-NEG-TIENDA-AYUDA`, `TLHogarExt.thelp`).
  Fotos: búsquedas propias en `prototype/pexels-tienda.json` (r2). Siguiente en la COLA: Transporte `NEG-TRANS`.
- **Transporte (`NEG-TRANS`, modo automático, 28 sep) · 1–4 hechas:** tesis ¿cuánto es el viaje en total y sale a la hora? Línea fija
  **"El precio del viaje es cerrado antes de salir."** `neg-trans.js` (`TLTrans`: 12 negocios, 7 Pro; SUBG 4 capítulos / 30 subcategorías;
  ROWS "¿A dónde vas?" · "Cómo viajas"; fotos `pexels-trans.json`) + `neg-trans-listing.js` (`TLTransL`: k asiento (salidas fijas, niño) ·
  priv (vehículo completo) · caja (envío a RD) · cotiza (mudanza con fotos); `inc` = lo que incluye) + `neg-trans-flow.js`
  (`APP-NEG-TRANS-RESERVA` → `-ESTADO`: pend → ok (cobrado) | quote (mudanza: precio cerrado, Aceptar) | alt | no | exp → "Salió" →
  camino → "Llegó" → done; se retiene al enviar; cancelar gratis 24 h; PAY ctx 'trb') + `neg-trans-rev.js` (reseña y
  `APP-NEG-TRANS-AYUDA`, `TLHogarExt.vhelp`). Siguiente en la COLA: Educación `NEG-EDU`.
- **Punto de parada (28 sep, límite de uso al 91 %):** Transporte arreglado (faltaba `nino` en `QL`; ahora todas las categorías nuevas
  tienen cada clave de QUICK / QUICK5 en QL). Al reanudar: Educación `NEG-EDU` (1–4) con el mismo método (datos + categoría → ficha → flujo →
  reseña/ayuda), pruebas en `run_script` sin capturas (el usuario usa Safari en el teléfono), y al final `ready_for_verification`.
- **Educación (`NEG-EDU`, modo automático) · 1–4 hechas:** tesis ¿qué me llevo al final y cuánto cuesta en total? Línea fija **"El precio
  del curso es el total: libros y examen incluidos o dichos aparte."** `neg-edu.js` (`TLEdu`: 12 escuelas, 8 Pro; SUBG 6 capítulos / 48
  subcategorías; fotos `pexels-edu.json`) + `neg-edu-listing.js` (`TLEduL`: k curso (grupo con inicio, semanas, horas, `cert`, `mat`, `inc`,
  `no`, `plan`) · mes · hora · clase) + `neg-edu-flow.js` (`APP-NEG-EDU-INSCRIPCION` → `-ESTADO`: pend → ok (cupo) | alt (otro grupo) | no
  | exp → "Empezó" → curso → "Terminó" → done (certificado); matrícula hoy, se devuelve si el grupo no abre; los grupos van en la vista de
  horas (`slots`); PAY ctx 'eb') + `neg-edu-rev.js` (reseña y `APP-NEG-EDU-AYUDA`, `TLHogarExt.ehelp`). Siguiente: Niños `NEG-NINOS`.
- **Niños (`NEG-NINOS`) · 1–4 hechas sobre el motor de Educación:** tesis ¿es seguro, tiene licencia y hay cupo? Línea fija **"Toda
  guardería muestra su licencia del estado; si no la tiene, se dice."** `neg-ninos.js` (`TLNinos`: 10 negocios, 7 Pro; `edad`, tags lic ·
  subsidio (CCIS) · noche · cupos; fotos `pexels-ninos.json`) + `neg-ninos-listing.js` (servicios en `TLEduL.SVC`; negocios con `b.edu` y
  `b.ninos`). Ficha, inscripción, estado, reseña y ayuda = las de Educación, con rótulos propios ("¿Tiene licencia?", edades, subsidio).
- **Deporte (`NEG-DEPORTE`) · 1–4 hechas sobre el motor de Educación:** tesis ¿cuánto pago de verdad y me puedo salir cuando quiera?
  Línea fija **"La cuota es la que ves: sin cargos escondidos, y si hay contrato, se dice."** `neg-deporte.js` (`TLDeporte`: 8 negocios, 5 Pro;
  gimnasio sin contrato, boxeo, zumba con guardería, ligas de fútbol y softbol) + `neg-deporte-listing.js` (servicios en `TLEduL.SVC`;
  `b.edu` + `b.dep`; rótulo "¿Hay contrato?").
- **Iglesias (`NEG-FE`) · 1–4 hechas sobre el motor de Educación:** tesis ¿hay servicio en español y me ayudan si lo necesito? Línea fija
  **"La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración."** `neg-fe.js` (`TLFe`: 7 lugares, 5 Pro: parroquia con misa
  en español y catecismo, evangélica con transporte, pentecostal, despensa sin papeles, funeraria con repatriación a RD) + `neg-fe-listing.js`
  (`b.edu` + `b.fe`; misas y grupos gratis = "Guardar mi lugar"; bautizo con donativo sugerido que no se cobra si no puedes; funeraria con el
  total por escrito y plan de pagos).
- **Bienes Raíces (`NEG-INMUEBLE`) · 1–4 hechas sobre el motor de Educación:** tesis ¿cuánto necesito para mudarme y me la rentan sin
  seguro social? Línea fija **"Lo que pagas para mudarte está completo aquí: nadie cobra por ver una propiedad."** `neg-inmueble.js` (`TLInmueble`:
  6 negocios, 4 Pro) + `neg-inmueble-listing.js` (propiedades con renta + depósito en la descripción, `inc`, `no`). Con `b.inm`: CTA "Pedir
  visita", hoy siempre $0 (`todayOf(it, ob)`), precio /mes o de venta. Nota técnica: en `run_script`, un `'$'` suelto dentro de un template
  literal rompe el parseo del script: usar `money()` o `String.fromCharCode(36)`.
- **Venta de Autos (`NEG-DEALER`) · 1–4 hechas sobre el motor de Educación:** tesis ¿cuánto pago en total y el carro está limpio? Línea
  fija **"El precio en la puerta: con impuestos, placas y cargos del dealer, antes de firmar."** `neg-dealer.js` (`TLDealer`: 5 negocios, 3 Pro)
  + `neg-dealer-listing.js` (cada carro con millaje, título y total en la puerta = precio + 6 % + placas + cargo del dealer en la descripción; pago
  con ITIN con tasa y meses en `no`; `b.edu` + `b.inm` + `b.dealer`: "Pedir prueba de manejo", hoy $0).
  **COLA DE CATEGORÍAS COMPLETA (28 sep).** Fotos de Tiendas renovadas con búsquedas propias (15 negocios, 18 subcategorías). Niños, Deporte, Iglesias, Bienes Raíces y Autos
  comparten el motor de Educación (si alguna necesita pantalla propia, separar su motor como se hizo con Transporte).
- **Carga del prototipo (28 sep):** con 69 `<script src>` el primer arranque fallaba (support.js y el bundle del sistema no cargaban).
  Ahora el helmet carga 4 archivos `prototype/bundle-1..4.js` = concatenación en orden de los 69 fuentes (lista en `prototype/bundles.json`).
  **Regla:** los fuentes `prototype/neg-*.js` siguen siendo la verdad; tras editar cualquiera, regenerar su bundle concatenando en el orden
  de `bundles.json`. Un archivo nuevo se agrega a `bundles.json` y a su bundle (nunca un `<script>` suelto en el helmet).
  Regla extra: cada clave de `QUICK` tiene que existir también en `GROUPS` (la fila rápida toma su nombre de ahí); Deporte fallaba por `gratis1`.
- **Pantalla en blanco en Safari (28 sep):** si una pantalla guardada (localStorage `tl-proto-route-v1`) lanza un error al renderizar,
  React desmonta todo y queda en blanco. Ahora `renderVals()` envuelve a `renderVals0()`: ante un error borra la ruta guardada, vuelve a
  `APP-HOME` y registra el error en consola (`[To'Latino] pantalla con error`). Revisar la consola para saber qué pantalla falló.

## 7. Coming Soon (18 oct) — `To'Latino Coming Soon.dc.html`
- Página pública para la campaña en redes (antes del lanzamiento). Superficie oscura (Ink), foto hero con protección, logo + ES/EN.
- Hero: eyebrow PRÓXIMAMENTE · HAZLETON, PA, titular "Todo lo latino de Hazleton, en un solo lugar.", frase rotativa (5 tesis),
  captura de **teléfono → código de 4 dígitos → "Estás en la lista · #N"** (`localStorage tl-soon-v1`), interruptor "Tengo un negocio"
  (aparta el lugar del negocio), prueba social (vecinos en la lista) y cuenta regresiva. Al lado: `BusinessCard` Pro + `StoryCard` reales.
- Secciones: franja de fotos Pexels en movimiento · "Preguntas que hoy nadie te contesta" (6 tesis con íconos del sistema) ·
  "Honestidad como función" (retención, cita = solicitud, lo que no pueden hacer) · Para negocios (bodega, "Apartar mi negocio") ·
  Comparte (WhatsApp / copiar enlace, @tolatino) · footer.
- Tweaks: `launchDate` (aaaa-mm-dd; la cuenta regresiva se oculta si ya pasó), `showCountdown`, `waitCount`, `showBiz`, `lang`.
- Super Admin: pendiente una cola "Lista de espera" (teléfonos + negocios apartados) cuando se conecte a datos reales.
- **v2 (18 oct) — `To'Latino Coming Soon v2.dc.html`** (v1 queda como referencia). Más objetiva, enfocada en lo que viene, **mobile first**:
  fondo blanco, header sticky (logo · ES/EN; desktop + anclas y "Avísame"), hero con titular, 3 datos (ABRE · faltan N días / 17 categorías /
  ES · EN), foto + tarjeta de lista de espera encima (ciudad: Hazleton · Allentown · Reading · Otra → teléfono → código → "#N en la lista",
  "Tengo un negocio" = fundador N de 100 si HZL30 está activa). Secciones: 17 categorías (chips con íconos) · **Lo que viene** (6 pestañas con
  componentes reales del sistema: BusinessCard, OrderTracker + retenido/cobrado, StaffPicker + TimeSlots + DepositNote, EventCard, FeedPost,
  SearchBar + UnderstoodBar + SearchResultRow) · **Cómo llega** (Hoy → Fundadores → fecha → Allentown y Reading con negocios listos) · Para
  negocios (Free $0 · Pro con precio y prueba del admin · Fundadores con barra) · Preguntas (7) · Comparte · footer · barra fija abajo en móvil
  cuando el formulario no se ve. Barra de revisión Móvil / Desktop (1440 · 1280 · 1024), prop `revision` (apagar antes de publicar).
  Layout por ancho real del contenedor (container queries), no por la ventana. Datos: `tl-soon-v2` (lista de entradas); Allentown/Reading
  también marcan `tl-city-wait-v1` y "Otra" va a `tl-city-ask-v1`.
  **Super Admin (mismo turno, regla §2c):** Ciudades · bloque "COMING SOON · LANZAMIENTO DE HAZLETON": fecha de apertura editable
  (`tl-adm-v1.soon.date`), cuenta regresiva visible/oculta (`soon.cd`), en lista (base 2,417 + entradas), negocios apartados, últimas
  entradas (v1 y v2) y "Abrir página"; todo queda en Historial. La página lee en vivo: `soon.*`, `plan.cap/price/trial`,
  `team['camp:hzl30'].on` (apaga Fundadores) y `city.alw/rdg.ready/goal`. Crecimiento · Campañas · HZL30 suma los negocios apartados.
- **v3 (18 oct) — `To'Latino Coming Soon v3.dc.html`** (decisión del usuario: sin ciudad, sin fecha, "de tu zona", "muy pronto"; resaltar
  la dificultad de encontrar a alguien que haga algo específico y que es para cualquier negocio, incluidos independientes, desde casa y por hobby).
  Hero: "Alguien cerca de ti hace justo lo que buscas. Encontrarlo es lo difícil." + chips de tipo (con local · desde casa · a domicilio · por
  encargo · en su tiempo libre) · vitrina que rota cada 3.8 s: foto real + pregunta ("¿Quién hace bizcochos por encargo?") + respuesta con
  `BusinessCard` Free de un independiente (6 casos, chips para elegir) · lista de espera = **código postal + teléfono** (+ "Tengo un negocio":
  ¿cómo trabajas? + nombre). Secciones: "Aquí cabe cualquier negocio" (6 tipos con foto + 12 búsquedas específicas) · Lo que viene (6 pestañas)
  · Cómo llega (zona por zona) · Para negocios (Free "para empezar", Pro, fundadores: primeros 100 de cada zona) · 8 preguntas · Comparte.
  Zona por código postal (182xx Hazleton, 181xx Allentown, 196xx Reading, resto = otra zona → `tl-city-ask-v1` "CP xxxxx"). Datos `tl-soon-v3`.
  **Super Admin:** bloque "COMING SOON · LISTA DE ESPERA": **fecha en la página oculta por defecto** (`soon.showDate`; si se activa, la página
  dice "Abre el …"), fecha de apertura, total en la lista (todas las zonas), negocios apartados por tipo, entradas con CP; "Abrir página" → v3.
  Pendiente confirmar: "los primeros 100 negocios de cada zona" generaliza la campaña HZL30.
