# To'Latino v2 — Dónde estamos / cómo retomar

_Actualizado: 7 nov 2026._

## Ramas (léelo antes de nada)
- **`main`** = la rama de trabajo de la v2 y la que debe ser **rama por defecto** del
  repo (toda sesión nueva arranca de ahí). Si una sesión arranca y ve código de
  Next.js + Supabase de la v1 (`apps/web`, `supabase/migrations/0157…`), está en
  la rama equivocada: hacer `git checkout main` y seguir.
- **`pruebas`** = lo que corre en el sandbox; debe apuntar al mismo contenido que
  `main` (más `infra/pruebas/deploy.sh` cuando exista).
- **`produccion`** = no existe todavía (fase 9).
- `archivo/v1-*` = el código viejo, solo referencia. `archivo/v1-pruebas-sesion-5nov`
  = lo que una sesión hizo por error sobre la v1 el 5 nov (descartado).
- **Incidente 5 nov:** una sesión nueva arrancó desde la rama por defecto vieja
  (`claude/tolatino-repo-setup-1efdil` = v1), leyó el `CLAUDE.md` de la v1 e hizo
  una «Fase 0» de la v1 sobre `pruebas`. Causa: no se había cambiado la rama por
  defecto a la v2. Corregido el 5 nov: `main` creada y puesta como rama por defecto por el
  fundador; `pruebas` borrada y recreada desde `main` (5a47a56). Las ramas
  `claude/*` viejas siguen existiendo pero no se usan.

## Estado
- **Fase 3 · Belleza COMPLETA (6 nov):** 3a (servicios y reglas de citas) 3b (ficha › Servicios, hoja, Booking con depósito, motor de disponibilidad) y 3c (Tu cita completa: otra hora, cambiar, cancelar con devolución, voy tarde, vencer, recordatorios, hora libre, calificar; Panel › Hoy/detalle/Clientes de citas; Mi cuenta; `lib/citas-flujo.ts`, `lib/citas-panel.ts`, migración 0045) hechos. 3d (página de la silla, cuenta de cobro propia de cada silla rentada, reseñas «Con Kelvin»; migración 0046, semilla 0012, `lib/sillas.ts`) y 3e (Ayuda con la cita con fotos, respuesta del negocio con decisión y devolución del depósito, revisión de To'Latino; Admin › Transacciones › Citas; migración 0047, `lib/ayuda-cita.ts`) hechos. **Fase 4 · Las otras 14 categorías en curso**, empezando por Hogar + Auto: plan en `docs/diseno/plan/fase4-hogar-auto.md` (bloques 4a–4g). 4a hecho (servicios con forma de cobrar `svc_kind`/`svc_attrs`, Tu herramienta `trade_settings`, depósito por forma y trabajo grande, filtros derivados, Super Admin; migración 0048, semilla 0013 generada con `scripts/semilla/extraer-hogar-auto.cjs`, `lib/oficios.ts`, `app/panel/Oficios.tsx`). 4b hecho (ficha › Servicios con Tu vehículo / Tu casa y compatibilidad, Booking `/n/{id}/visita` con franja de 2 h en Hogar, depósito por forma, permiso del landlord; `lib/oficios-publico.ts`, `lib/visitas.ts`, migración 0049). 4c hecho (la cita/visita en curso: Auto recibido · trabajando · listo · entregado; Hogar en camino · llegué · trabajando · terminé · no había nadie; el cliente cierra con «Ya lo recogí» / «Todo bien»; panel con los datos del carro o la casa; migración 0050). 4d hecho (estimado / precio completo línea por línea con plantillas, «algo más» con foto, lo final que solo baja, retención solo de lo aprobado, liquidación con captura parcial y liberación, renovación de retenciones de más de 7 días, impuesto en datos `tax_rules`; migración 0051, semilla 0014, `lib/estimados.ts`, `app/panel/Estimado.tsx`, `cita/[num]/EstimadoCliente.tsx`). 4e-1 hecho (pre-estimado con fotos: pedir, responder con rango / hay que verlo / no lo hacemos, vencer a las 24 h y mandar otra vez, reservar con él y compararlo con el estimado; migración 0052 `service_requests` + `request_targets`, `lib/solicitudes.ts`, `/n/{id}/preestimado`, `/pre/{num}`). 4e-2 hecho (presupuesto a hasta 3: candidatos Pro por tipo de trabajo y zona, 48 h, comparar, reservar la visita de uno y cerrar los otros con aviso; `/n/{id}/presupuestos`). 4e-3 hecho (emergencia 24/7: a todos los Pro con 24 h que hacen ese trabajo y llegan; el primero que acepta la toma sin carreras y se vuelve visita «en camino»; 15 min → nadie disponible; `/emergencia`, panel arriba en Hoy). 4f-1 hecho (planes del hogar: día fijo mensual o meses fijos, hoy $0, cobro fuera de sesión cada mes con comisión, visitas como citas de $0, saltar/pausar/reanudar/cancelar, reintentos del banco y cambiar la tarjeta; migración 0053, semilla 0015, `lib/planes.ts`, `/n/{id}/plan`, `/plan/{num}`). 4f-2 hecho (renta de herramienta: pestaña Tienda, apartar 48 h con la unidad bloqueada, «La recogió» con renta cobrada y depósito retenido, «Un día más», tarde del depósito con captura parcial, daño con foto que decide el cliente o la cola «Daños de rentas» del Super Admin, tarjeta rechazada y cambio, vencer, renovar el depósito, interruptores en Tu herramienta; migración 0054 `rentals`, semilla 0016, `lib/rentas.ts`, `/n/{id}/rentar`, `/renta/{num}`, `app/panel/Rentas.tsx`). 4f-3 hecho (apartar productos: la Tienda de Auto y Hogar con hoja ¿cuántos?, Tu apartado en el teléfono, 3 pasos, unidades reservadas, la tienda confirma / falta uno / no lo tiene, guardado 48 h, lo recogió, vencer, cancelar, gomas por medida; migración 0055, semilla 0017, `lib/apartados.ts`, `/n/{id}/apartar`, `/apartado/{num}`, `app/panel/Apartados.tsx`; guardianes barraDoble y parametroSinTipo). 4g-1 hecho (reseña de Hogar y Auto: dato de la visita guardado por el servidor, preguntas por rubro, ≤2 ★ → Ayuda, marcas en la tarjeta). 4g-2 hecho (ayuda con la visita y con la cita: motivos por rubro, foto obligatoria, devolución de lo cobrado en la app; migración 0056; guardián rubroComoBooleano). 4g-3 hecho (Super Admin › Transacciones con Planes, Rentas y Apartados; Mi cuenta con su sección). **Hogar + Auto completos.** **Doctores + Profesionales en curso** (plan `docs/diseno/plan/fase4-salud-pro.md`, 4h–4m): 4h-1 hecho (migración 0057: formas de cobrar, health_settings, pro_settings, catálogo de seguros de PA, licencias de salud y de persona, user_insurances; editor de servicios con «Cómo lo cobras»; semilla 0018 con 192 servicios). 4h-2 hecho (Tu herramienta: «Seguros e idiomas» de Doctores y «Licencias y el total por escrito» de Profesionales, cada toque se guarda; filtros derivados `recalcularFiltrosSP`; Super Admin 360 › Lo que vende en solo lectura; `lib/salud-pro.ts`, `app/panel/SaludPro.tsx`; guardián pestanaVende). 4h-3 hecho (SU LICENCIA de cada profesional del equipo con su número, cola y 360 con la persona, filtro «El médico habla español» de licencias verificadas; Super Admin › Catálogo › Seguros (ocultar con motivo); Mi cuenta › Mis seguros con solo los últimos 4; `lib/mis-seguros.ts`, `lib/nombre.ts`; guardián nombreConTitulo). 4i hecho (ficha de Salud: Servicios con el precio según tu seguro, «Tu seguro» con cuenta o solo esta visita, compatibilidad que nunca bloquea, hoja con IMPORTANTE y ¿Con quién? solo con licencia verificada, sin cita con espera fresca, Resumen con datos y cómo funciona; `lib/salud-compat.ts`, `lib/salud-publico.ts`, `app/(app)/n/[id]/Salud.tsx`). 4j-1 hecho (Booking de Doctores `/n/{id}/consulta` en 3 pasos; `lib/citas-salud.ts` sobre el motor de citas, solo profesionales con licencia verificada; motivo y nota CIFRADA en `op_private` (migración 0058, `lib/cifrado.ts`, DATOS_SECRET); avisos neutros `sal_*`; la cita de Salud en `/cita/{num}`; guardián privacidadSalud). 4j-2 hecho (panel con seguro, motivo y nota descifrada solo ahí; «No aceptamos su seguro» → el paciente elige en 2 h o se libera sola; seguir sin seguro; avisos neutros en todo el flujo (migración 0059, mapa SAL_C/SAL_N); notas borradas a los 30 d). 4k hecho (ficha de Profesionales: el TOTAL honorario + gobierno, notas legales y no legales, hoja con EL TOTAL y ¿con quién? con su licencia, Resumen con datos y cómo funciona; `lib/pro-publico.ts`, `app/(app)/n/[id]/Pro.tsx`). 4l-1 hecho (la consulta: `/n/{id}/tramite` en 3 pasos con licencia, modo, situación y nota cifrada; `lib/citas-pro.ts` sobre el motor de Salud (`prepararSP`); avisos a la oficina sin el trámite (migración 0060); la consulta en `/cita/{num}` y en el panel). 4l-2 hecho (el total por escrito: migraciones 0061–0062 `written_totals` con versiones, aceptación con hora/versión/IP inmutable y suma garantizada por la base; `lib/total-escrito.ts`; panel «Pasó la consulta» → «Mandar el total» → «Terminó el trámite»; cliente aceptar con extras / no contratar; vence a 30 d). 4m-1 hecho (reseña de Doctores y Profesionales: dato de la cita sin plan ni número de seguro, total por escrito, preguntas por rubro, filtro de datos de salud o del caso `lib/resenas-filtro.ts` en servidor y teléfono, marcas, «Lo que importa en Salud / en un trámite» con 6 barras; guardián resenaPrivada). 4m-2 hecho (ayuda con la cita de Doctores y con el trámite de Profesionales: motivos por rubro, «corregir el cobro a mi seguro» y «terminar lo acordado», fotos PRIVADAS `/api/ayuda/foto` con permiso y auditoría que se borran del almacenamiento a los 90 días, avisos neutros de Salud, «ley» → licencias a revisión; migración 0063, `lib/ayuda-motivos.ts`; guardián fotoAyudaPrivada). 4m-3 hecho (Super Admin › Transacciones con pestañas Doctores y Profesionales: Doctores sin servicio, motivo ni nota, solo si el seguro se aceptó; Profesionales con el total por escrito y el paso; Analítica › Doctores y Profesionales con seguro aceptado, «no aceptamos su seguro», no llegó, tiempo de respuesta, consulta → contrató, «cobró el total» y motivos de ayuda, solo cifras; ayuda de El Compa: total-por-escrito, licencias-que-puede-hacer, privacidad-de-datos-de-salud). **Doctores + Profesionales completos.** Configuración de sus plazos (2 h seguro, 30 d total, 24/48 h ayuda, días de borrado) llega con Configuración (Fase 5). **Mercados + Tiendas en curso** (plan `docs/diseno/plan/fase4-mercados-tiendas.md`, 4n–4s): 4n-1 hecho (migración 0064: `shop_kind`, EBT, 21+ solo en tienda, `item_variants` tallas, `retail_settings`, envío por correo, comisión `merc`; semilla 0019 con 15 mercados y 16 tiendas generada por `scripts/semilla/extraer-mercados-tiendas.cjs`; Tu herramienta «Balanza y pedidos» y «Tallas y apartados» con filtros derivados `lib/retail.ts`; 360 › Lo que vende de Mercados y Tiendas; comisiones de Planes/Rentas/Mercado ya se pueden cambiar en Super Admin). 4n-2 hecho (Lo que vendes › Productos: el constructor del Menú con module shop — cómo se vende, tallas que entran en 0 y se quitan sin borrarse, EBT, 21+ siempre solo en la tienda, solo en la tienda; guardián productosModulo). 4n-3 hecho (envío por correo de Tiendas en Tu herramienta). **4n completo.** 4o hecho (ficha de Mercados: Productos con /lb, hoja con estimado y corte/punto, carrito de un mercado a la vez, «¿Lo pesan delante de ti?»). 4p hecho (pedido del mercado: migración 0065 con `final_cents` calculado por la base y foto obligatoria por línea pesada, `lib/mercado.ts` crear/aceptar/pesar/no hay/sustituto con OK/mandar/«Está bien, cobrar» con captura parcial de lo real/listo/entregado/vencer/reparar, `/n/{id}/mercado`, `/mercado/{num}`, Panel › Hoy › Pedidos del mercado con pesar y foto, Super Admin › Transacciones › Mercado, Mi cuenta › Pedidos; `repararPagos` ya no captura completo un pedido por peso; guardianes capturaMercado y detalleEnRuta). 4q-1 hecho (Tiendas: pestaña Productos, talla obligatoria y reservada, horas de Tu herramienta 24/48/72, «Falta esa talla · ofrecer otra»; migración 0066; guardián horasApartado). 4q-2 hecho (envío de la tienda: se retiene al pedir, se cobra lo que se envía al marcar «Enviado» nunca más de lo retenido, seguimiento, entregado, liberar si no pasa; migración 0067; guardianes capturaMercado ampliado y sumaSinTipo). 4r hecho (layaway: acuerdo por escrito inmutable con IP y versión, abono retenido → cobrado al confirmar, pagar en la app o en la tienda sin cobros solos, atraso, cancelar con lo abonado menos el cargo; migración 0068, `lib/layaway.ts` + `layaway-comun.ts`; guardián layawayAceptado). 4s hecho (reseñas de Mercados y Tiendas con dato del pedido/apartado y «Lo que importa»; ayuda con el pedido y con la compra sobre el motor de la ayuda con la cita; migración 0069; Super Admin › Analítica › Mercados y Tiendas y Transacciones con talla, envío y plan; /mercado compacto y guardián barraFijaCompacta ampliado). **Mercados + Tiendas completos.** **Fiestas + Transporte en curso** (plan `docs/diseno/plan/fase4-fiestas-transporte.md`, 4t–4z): 4t hecho (migraciones 0070–0071: formas de cobrar de Fiestas `pack hora unid fijo visita cotiza`, `fiesta_settings` con depósito, invitados, eventos por día, días que aparta y días para cancelar gratis, `party_days` manual/reserva, `user_event_plans`; Tu herramienta «Calendario y depósito» `app/panel/Fiestas.tsx`; filtros derivados con fechas reales «Libre este sábado / domingo / el sábado siguiente» que cambian a medianoche; semilla 0020 con 26 negocios; guardián fechaFijaTaxonomia). 4u hecho (migración 0072: «Tu fecha» con solo el día; la ficha de Fiestas `lib/fiestas-publico.ts` + `app/(app)/n/[id]/Fiesta.tsx`: Tu fecha con semáforo, servicios con «Libre/Ocupada el …», hoja con INCLUYE y «Pedir la fecha» / «Ver otra fecha», Resumen con la línea, hechos y cómo funciona, riel y barra, FAQ automática; sin cuenta la fecha vive en el teléfono y pasa a la cuenta al entrar; Buscar › Fiestas con el chip «Tu fecha»; el texto del depósito de Belleza/Hogar/Auto corregido a «se retiene al enviar» con el guardián depositoRetenido). 4v-1 hecho (migración 0073: fiesta `party` F-5101…; `lib/fiestas-reservas.ts` pedirFecha con candado por día, depósito retenido y cobrado al confirmar, confirmar ocupa el día y declina sola las demás del día lleno, otra hora, no puedo, vence a 24 h, cancelar por días, el negocio cancela con motivo, terminó, barrido; Booking `/n/{id}/fiesta`, `/fiesta/{num}`, Panel › Hoy › Fiestas; arreglo de repararPagos con change_proposed y guardián reparaVivas). 4v-2 hecho (Mi cuenta › Citas y reservas con las fiestas; Super Admin › Transacciones › Fiestas con depósito, acuerdo y quién canceló; guardián candadoFiesta). 4w hecho (migración 0074: svc_kind asiento/priv/caja, `trans_settings`, `trip_runs` con «quedan» derivado, licencias de Transporte, comisión `viaje`; `lib/transporte.ts` + `transporte-comun.ts`: tipo por subcategoría, salidas del día al vuelo, vendidos en la oficina, «No sale», filtros derivados; editor de servicios rubro `trans`; `app/panel/Transporte.tsx`; Super Admin 360; semilla 0021 con 10 negocios y licencias; guardián asientosDerivados). 4x hecho (ficha de Transporte: `lib/trans-publico.ts` + `app/(app)/n/[id]/Viaje.tsx`, precio cerrado con lo que incluye, la próxima salida con asientos, licencia verificada o «en revisión» según el tipo, caja con sale/llega, FAQ por tipo). 4y-1 hecho (migración 0075: viaje `trip` V-9101…, `run_seats` y avisos; `lib/viajes.ts`: asiento o vehículo completo, total retenido → cobrado al confirmar, asientos con candado por salida (la última plaza no se vende dos veces), otra salida / otra hora, no hay cupo, vence, cancelar ≥24 h devuelve todo y <24 h cobra la mitad, va tarde / salió / llegó, Abordó / No llegó, el negocio cancela la salida y devuelve a todos; Booking `/n/{id}/viaje`, `/viaje/{num}`, Panel › Hoy › Viajes y Salidas `app/panel/ViajesPanel.tsx`; Mi cuenta con los viajes; la cifra «Esperan tu respuesta» suma fiestas, viajes y mercado con el guardián esperanCuentan). 4y-2 hecho (migración 0076: media 'trip', motivo 'destinatario' en op_private, avisos de envío y precio; caja con 1–4 cajas, recogida y DESTINATARIO cifrado que no sale en avisos ni vistas públicas, pasos recogida → salió con rastreo → entregada; mudanza con fotos privadas, hoy $0, el negocio manda el precio cerrado (written_totals, 48 h, versiones), el cliente acepta con tarjeta = retener y cobrar, «No, gracias», vence; `lib/envios.ts`; dueños de prueba Yolanda y Ramón en la semilla 0021). 4y-3a hecho (Super Admin › Transacciones › Viajes; «Devolver» de viajes y fiestas con el guardián devolverCoincide). 4y-3b hecho (migración 0077: el chofer de la salida es un repartidor del equipo, `lib/chofer.ts`, Panel › salida › Chofer, /repartidor › Tus salidas con Abordó/Salió/Llegó; aviso automático «tu salida todavía no sale» una sola vez). Barrido central hecho (0078 `system_jobs`, `lib/barrido.ts` corre las 15 tareas con un candado, POST /api/interno/barrido con BARRIDO_TOKEN del entorno, servicio «barrido» en el docker-compose del sandbox, nginx bloquea /api/interno, guardián barridoCompleto). 4y-4 hecho: renta de vehículos (0079 licencia revisada y odómetro en rentals; semilla 0022; pestaña «Rentar» en la ficha de Transporte; panel con licencia + 21 y millas, millas de más por el camino del daño). 4z-1 hecho (reseñas de Fiestas y Transporte con dato de la reserva, preguntas, marcas y «Lo que importa»). 4z-2 hecho (ayuda con la fiesta y con el viaje sobre el motor de ayuda-cita, migración 0080, «manejo inseguro» directo y con prioridad; guardián detalleSinBarra). 4z-3 hecho (Analítica › Fiestas y Transporte; guardián pestanasAnalitica; docs del negocio). **Fiestas + Transporte completos.** Las colas «Salidas canceladas» y «Retenciones que fallaron» quedan anotadas para Configuración/colas (Fase 5): hoy se ven en Transacciones y Analítica. Grupo **Noche** (plan `docs/diseno/plan/fase4-noche.md`): **4na hecho** (migración 0081 `noche_settings` + `night_posts` solo inserción + licencia `pa_plcb` + comisión `noche`; `lib/noche.ts` y `lib/noche-comun.ts`; Panel › Lo que vendes › «Esta noche» con cada toque en el historial, la fila desde Hoy, editor de servicios de Noche (entrada que sigue al cover, lista, mesa con cuántas hay, VIP, noche especial, por fecha); tarjeta y filtros derivados recalculados por el barrido (tarea `noche`); Super Admin 360 › Lo que vende con «Esta noche» en solo lectura, historial y tipo del local; semilla 0023 con dueño de prueba Héctor 5705550366 en La Terraza; guardianes coverConHistoria, filaNoFalsa, alcoholNoSeVende). **4nb hecho** (`lib/noche-publico.ts` + `n/[id]/Noche.tsx`: tarjeta de esta noche y de la fila con su hora real, pestaña «Esta noche»/«Mañana viernes»/«Para tu fecha», Entrada y Lista que siguen a la herramienta, hoja con personas y depósito, FAQ y licencia de licor; DJ y promotor «Por contrato» sin horario ni dirección). **4nc hecho** (migración 0082: `night_seq` N-7101, `night_date`, `door_code` único por local y noche, avisos; `lib/noche-reservas.ts`: lista $0 al instante con código, mesa con depósito retenido → cobrado al confirmar, otra hora, no hay mesa, vence (barrido `nocheReservas`), cancelar antes/después del corte con la hora real, la puerta (entraron, no llegaron, sin identificación), el local cancela con devolución completa, «pasó la noche» a las 6 AM, SMS si sube el cover; pantallas `/n/[id]/noche` (3 pasos) y `/noche/[num]`; Mi cuenta; Panel › Hoy (esperan, mesas de esta noche, la lista para la puerta con búsqueda) y detalle; guardianes coverNuncaEnLaApp, depositoNoche, mesasSinSobreventa, codigoPuerta, sinImagenDeID, nocheCruzaMedianoche; prueba de carrera: 3 clientes por la última mesa VIP → 1). **4nd hecho** (reseña verificada de una noche con entrada: preguntas de noche, dato de la reserva, «Lo que importa de noche» y marcas en la tarjeta; Ayuda con la noche sobre el mismo motor: migración 0083 (cover, lista, mesa, minimo), «No me descontaron el depósito» con foto del recibo, «Me sentí inseguro» directo a To'Latino con prioridad, el bloque de ayuda en el panel; arreglo de clase: los porcentajes de «Lo que importa» con nombres en mayúscula (fechaOk, fotosOk, coverOk) llegaban en minúsculas desde Postgres y no salían; guardián aliasConComillas). **4ne hecho · NOCHE COMPLETA (7 nov):** Super Admin › Transacciones › **Noche** (lista o mesa, noche, personas, cuántos entraron, cómo cerró, depósito y lo devuelto; nunca el código; «Devolver depósito · noche»); Colas **«Mesas no respetadas»** y **«Sin identificación»** (migración 0084; `lib/noche-vigilar.ts`: 3 en 30 noches abren un caso por local desde la puerta real; el caso lista cada noche y decide «Pausar mesas y lista» o «Revisado, sin cambios», con auditoría); la ayuda «Me sentí inseguro» va primero en Colas y las ayudas de fiesta, viaje y noche ya dicen su nombre (`AYUDA_DE`); Analítica › **Noche** (mesas confirmadas en 60 min, vencidas, no respetadas, depósitos, % de la lista que entró, el cover que subió después de publicado, «la fila, como decía», «cobraron más cover» por 100 noches, licencias de licor vencidas); docs `panel-mesas-y-lista`, `licencia-de-licor`, `admin-analitica`; guardianes colasEnLaBase y txConNombre. **Grupo Educación + Niños + Deporte** (plan `docs/diseno/plan/fase4-edu-ninos-deporte.md`, bloques 4ea–4eg): **4ea hecho (7 nov)** — migración 0085 (`svc_kind` curso · mes · semana · clase; `class_groups` con cupos derivados; `insc_settings`; licencias de escuelas; comisión `insc`; check `items_matricula_check`), `lib/inscripciones-comun.ts` (motor común con `VOC` por rubro), `lib/edu.ts` (herramienta, abrir / quitar grupo, tarjeta y filtros derivados, barrido `edu`), editor de cursos en Servicios, Tu herramienta «Grupos y cupos» (`app/panel/Edu.tsx`), Super Admin 360 en solo lectura, semilla 0024 (15 escuelas, 35 cursos, 57 grupos; dueña de prueba Miriam 5705550377), guardianes matriculaMenor y asientosDerivados ampliado. **4eb hecho (7 nov)** — migración 0086 (Niños en `insc_settings`, `care_openings`, licencia `pa_dhs_childcare`, `op_private` motivo `nino`, `licencias_refrescar` deriva «lic» de Niños SOLO de la licencia del DHS verificada: se cayó el «con licencia» falso de 5 lugares), `lib/ninos-comun.ts`, `lib/ninos.ts` (herramienta, cupos por edad, tarjeta y filtros, barrido `ninos`), `lib/ninos-privado.ts` (único lugar de los datos del niño: cifrados, mínimos, purga a los 30 días, barrido `ninosPurga`), «Cupos y licencia» y programas de Niños sobre el motor de Educación (sin plan, $0 = gratis), Super Admin 360 + vencer y retirar una licencia verificada, semilla 0025 (21 lugares, 4 licencias del DHS de ejemplo; dueña de prueba Altagracia 5705550388), guardianes licenciaNoSeFinge, ninosSinDatosSensibles, ninosNotaCifrada y avisoNinosNeutro. **4ec hecho (7 nov)** — migración 0087 (contrato, salirse antes con check «sin contrato = $0», inscripción, guardería, fecha límite de la liga, sueltos), `lib/deporte-comun.ts` y `lib/deporte.ts` (precios en el ítem como única fuente, tarjeta y filtros, barrido `deporte`), «Membresías y contrato» y «Liga e inscripciones» en el panel, editor de servicios de Deporte (temporada por equipo o por jugador explícito), Super Admin 360, semilla 0026 (11 lugares; dueño de prueba Anthony 5705550411), guardián cancelarSiempreSePuede. **4ed hecho (7 nov)** — la ficha de las tres: `lib/inscripciones-publico.ts` (`inscPublica`: cursos, programas y membresías con sus grupos y cupos, Tu herramienta de Niños y Deporte; nunca el enlace de la clase en línea ni dato de inscritos o niños) y `n/[id]/Insc.tsx` (tarjeta de arriba por rubro y tipo: «¿QUÉ TE LLEVAS AL FINAL?» / «¿TIENE LICENCIA?» + «¿HAY CUPO?» / «¿DESDE QUÉ EDAD?» / «¿HAY CONTRATO?» + CUOTA / «¿QUÉ INCLUYE LA CUOTA?»; pestaña «Cursos» / «Programas» / «Membresías» / «Liga y canchas» con precio y meta; hoja con TE LLEVAS, INCLUYE, VA APARTE, grupos y cómo se paga; riel con el horario sacado de los grupos reales; barra; Free sin inscribirse por la app); FAQ automática por rubro (la de Tu página gana); las páginas de categoría ya cuentan «De noche» / «Con licencia» / «Sin contrato» con los derivados; ayuda `educacion-ninos-deporte-en-la-ficha`; guardián enlaceSoloInscritos. **4ee hecho (7 nov)** — migración 0088 (`insc_seq` I-4101, `waitlist_entries`, `plan_terms` y `plan_marks` solo inserción, avisos `insc_*` sin nombre del niño); `lib/inscripciones.ts` (inscribirme con candado `insc:{negocio}`, cupo de grupo o banda de edad que la base no deja pasar, matrícula de un curso RETENIDA al enviar y COBRADA al confirmar, todo lo demás en el lugar; otro grupo con el cupo movido; no hay cupo; vence; cancelar antes de empezar = devolución exacta y después = se queda; el grupo no abre = devolución a todos; baja de membresía con constancia y 72 h; lista de espera con oferta de 48 h y la siguiente sola; primera clase gratis una vez cada 90 días; datos del niño cifrados vía `ninos-privado.ts`, en el panel con auditoría; barrido `inscripciones`); pantallas `/n/{id}/inscribirme` (3 pasos) y `/insc/{num}`; la hoja de la ficha lleva a inscribirse con Pro; Mi cuenta › Citas y reservas; Panel › Hoy, Lo que vendes › Inscripciones y el detalle; ayuda `inscribirse` y `panel-inscripciones`; guardianes soloMatriculaEnLaApp, matriculaInscripcion, gruposSinSobreventa y copiaDelPrecio (probados al revés); prueba de carrera: 3 por el último cupo → 1. **4ef hecho (7 nov)** — migración 0089 (motivos cert · horario · ensena · lic · cuidado · salir · equipo; lo que se pide otro_grupo · arreglar · cancelar_membresia); Ayuda con la inscripción sobre el motor de ayuda-cita (`/insc/{num}/ayuda`, en curso o hasta 7 días después; «No cuidaron bien a mi niño» directo a To'Latino con el aviso de ChildLine; «No tenían licencia» abre la cola Licencias; fotos de Niños privadas; el bloque de ayuda en el detalle del panel); reseña verificada de inscripción (preguntas por rubro, dato de la inscripción con el certificado, «Lo que importa en un curso / con los niños / en deporte» de 12 meses; membresía reseñable a las 4 semanas; Niños sin fotos y el servidor rechaza el nombre del niño); arreglo de clase: la lista de ayudas de Hoy mandaba la noche (N-) a «Cita» (guardián prefijosAyuda); guardián ninosSinFotoPublica; ayuda `resena-y-ayuda-de-inscripciones`. **4eg hecho · EDUCACIÓN + NIÑOS + DEPORTE COMPLETOS (7 nov):** Super Admin › Transacciones › **Inscripciones** (rubro, curso, grupo, matrícula y cómo cerró; nunca datos de un niño; «Devolver matrícula»); Colas **«Cuidado de niños»** (la ayuda va directo, primera en la lista; ver los datos del niño exige rol Soporte/Admin y motivo, queda en la auditoría), **«No me dejan cancelar»** y **«Grupos que no abrieron»** (3 en 90 días; revisar o pausar inscripciones) — migración 0090, la cola sale del motivo (`COLA_AYUDA_SQL`); arreglo de clase: en Colas las ayudas de fiestas, viajes y noche caían en la vista del pedido de comida; Analítica › **Educación · Niños · Deporte** (solo cifras); ayuda `privacidad-de-datos-de-ninos`, `cuidado-de-ninos`, `licencia-de-guarderia` y `admin-analitica`; guardián colaAyudaRuteada; migraciones 0085–0090 aplicadas dos veces sin duplicar; lista de cierre §8 marcada. Grupo **Iglesias + Bienes Raíces + Venta de Autos**: plan en `docs/diseno/plan/fase4-iglesias-inmuebles-autos.md` (bloques 4ia–4ig). Sigue **4ia** (Iglesias: «Horarios y ayuda», servicios, funerarias y licencias).
- **Retomar aquí (6 nov, tarde):** **Fase 2 · Comida COMPLETA** (2a–2s, CI verde en todo; falta el OK del fundador en el
  sandbox con las guías de `docs/REVISION.md`). Sigue la **Fase 3 · Belleza (citas)**: reserva con depósito, solicitud →
  confirmar / otra hora / no puedo / vence, «Aprobar al instante», staff con silla propia, ayuda con la cita; Panel ›
  Servicios, Citas, Staff, techo Free; Admin › citas y staff. Diseño: `docs/diseno/pantallas/datos/neg-beauty.js`,
  `neg-bell-book.js`, `neg-bell-listing.js`, `neg-cita-help.js`, `dash2-svc.js`, `dash2-stf.js`.
- **Plan APROBADO (5 nov 2026). Sigue: Fase 0 — Cimientos.** Todas las decisiones
  (A–Z) están en `docs/DECISIONES.md`; `docs/PLAN.md` v2 y `CLAUDE.md` las integran.
  No hay código de la app todavía.
- **Fase 0 · bloque 1 HECHO (5 nov):** monorepo pnpm + Turborepo; `apps/web` (Next.js 15,
  App Router, Tailwind v4, `output: standalone`, fuentes self-hosted con next/font);
  `packages/ui` (tokens.css 1:1 del sistema + `Wordmark`); `/api/salud` (app + PostGIS +
  commit); `guardianes/run.mjs` (secretos · tokens · semilla · idioma; probados al revés);
  CI en GitHub Actions; `infra/pruebas/` (Dockerfile multi-etapa, compose con web + Postgres/
  PostGIS 16 + MinIO, `deploy.sh` idempotente, nginx con `/` → app y `/estado/`,
  `tolatino-sync` v2 con `flock`). Captura `capturas/fase0-bloque1-iphone15.png`
  (fondo Paper, Sora/Manrope/Mono comprobados por `getComputedStyle`).
  **Lección:** para probar el standalone en local hay que copiar `.next/static` y `public`
  dentro de `.next/standalone/apps/web/` (el Dockerfile ya lo hace).
- **Fase 0 · bloque 2 HECHO (5 nov):** `scripts/portar-sistema.mjs` porta los 49 módulos del
  sistema (**130 componentes**, no 132: el conteo anterior incluía funciones internas) a
  `packages/ui/src/ds/` como ESM ("use client", registro `scope.js`), cambia todo hex por
  `var(--tl-…)` (15 colores sin token → `--tl-ds-xxxxxx` en tokens.css) y quita lo del prototipo
  (`hours-pro.js` con hora fija, `icons.js` duplicado). Se re-ejecuta y da lo mismo.
  `/sistema` = catálogo por grupos (126 componentes + 4 constantes); 22 con ejemplos
  (`apps/web/app/sistema/ejemplos.tsx`), el resto dibuja con valores por defecto o se marca
  «sin ejemplo». Capturas `capturas/sistema-{base,tarjetas,pagina}.png`.
  **Pendiente honesto:** los componentes portados son JS sin tipos (`@ts-nocheck`); cada uno pasa
  a TSX tipado cuando una pantalla lo usa por primera vez. `ChangeProposal` necesita datos.
  Ejemplos de `ReviewCard`/`OwnerCard` con forma de datos incompleta (no muestran facts/trust).
- **Fase 0 · bloque 3a HECHO (5 nov) · base de datos:** migraciones en `packages/db/migrations/`
  aplicadas solas en cada despliegue por `packages/db/migrar.sh` (una vez cada una, con huella;
  si alguien edita una ya aplicada, el despliegue se detiene). 0001 base (PostGIS, pg_trgm,
  `audit_entries` solo inserción con trigger, `cms_strings`, `feature_flags`, `platform_config`) ·
  0002 ciudades/barrios/lista de espera · 0003 catálogo (categorías, subcategorías, módulos,
  filtros, sinónimos, comodidades) · 0004 datos del catálogo (generado por `scripts/taxonomia.mjs`
  desde la taxonomía: 17 categorías, **757 subcategorías**; corregidos los dos defectos que traía
  el diseño: «corner store» al revés y 5 reglas metidas como subcategorías en Venta de Autos) ·
  0005 las 5 ciudades (todas «próximamente», impuesto 6 %). Probado en PostGIS real: dos pasadas,
  auditoría inborrable, migración editada detenida. CI corre lo mismo en cada cambio.
  **Lección:** la imagen de PostGIS se reinicia en su primer arranque; esperar y migrar por TCP
  (`-h 127.0.0.1`), nunca por el socket.
  **Pendiente:** búsqueda trigram «barberia» también trae «Bar» (umbral 0.3): se afina con Buscar.
  Nombres cortos provisionales (no estaban en el prototipo): Tiendas, Transporte, Cursos, Niños,
  Deporte, Iglesias, Casas, Autos — editables en el Super Admin.
- **Fase 0 · bloque 3b HECHO (5 nov) · cuenta:** migración 0006 (users, otp_codes, sessions,
  account_changes); `apps/web/lib/cuenta.ts` (código de 6 números guardado como HMAC, 10 min,
  5 intentos, reenvío a los 30 s, 5 códigos/hora por teléfono y 20 por IP, comparación en tiempo
  constante; sesión = token aleatorio en cookie httpOnly/SameSite=Lax de 180 días, guardado como
  huella; defensa CSRF por Origin); rutas `/api/cuenta/{codigo,verificar,perfil,salir,yo}`;
  pantallas `/entrar` (ONB-USR-1 y -2, textos 1:1 del diseño 2au) y `/cuenta` mínima.
  **Modo pruebas (decisión E2):** el código sale en pantalla con «MODO PRUEBAS»; candado en
  `lib/entorno.ts` + guardián `modoPruebas` (probado al revés). Semilla del catálogo pasa a
  `packages/db/seeds/catalogo.sql` (repetible) con los nombres cortos del diseño de onboarding.
  Probado de punta a punta en iPhone 15 contra PostGIS real + 5 ataques (CSRF, número inválido,
  reenvío rápido, fuerza bruta, huellas). Ayuda para El Compa: `docs/ayuda/cuenta-entrar.md`.
  Pendientes en LAUNCH-CHECKLIST (proveedor SMS, passkeys con HTTPS, pasos 3–5, Button accesible).
- **Fase 0 · bloque 3c HECHO (5 nov) · Super Admin:** migración 0007 (staff_roles 7, staff_members,
  admin_sections 18, role_permissions con la matriz del plan §5); `lib/admin.ts` (permiso SIEMPRE en el
  servidor; sin permiso → redirige con aviso; `auditar` en cada acción); acciones con motivo
  (`app/admin/acciones.ts`: arranque, cerrar/bloquear sesión, cambiar permiso, agregar/quitar miembro);
  pantallas `/admin` (KPIs reales, últimas acciones), `/admin/usuarios` (+ 360° con sesiones),
  `/admin/ciudades`, `/admin/catalogo`, `/admin/sistema` (equipo, matriz 2am, auditoría 2al) y
  `/admin/pendiente/[sección]` (lo que no existe dice su fase; nada de botones muertos).
  **Primer Admin:** código de arranque de un solo uso (huella en `lib/admin.ts`), entregado al fundador por
  el chat. Probado de punta a punta (10 comprobaciones: código malo rechazado, arranque, sin acceso, agregar
  rol Solo lectura, lectura sin botones de editar ni Sistema, cerrar sesión con motivo, expulsión real,
  auditoría de las 3 acciones). Guardián nuevo `servidorCliente` (error React #130 del 5 nov).
  Logo real del sistema (antes era un círculo inventado) en `Wordmark` y `public/assets/`.
- **Fase 0 cerrada (5 nov).** El fundador pidió seguir con la Fase 1.
- **Fase 1 · bloque 1a (5 nov) · modelo de negocios:** migración 0008 (businesses con búsqueda ES/EN sin
  acentos por trigger y GIST geo; caché de derivados `business_stats_cache`; horarios, feriados, enlaces,
  equipo, licencias, sello, media, FAQ, reclamos, borrador de onboarding, toques de contacto, guardados,
  seguir, búsquedas, avísame, recomendaciones). Probado: «barberia» encuentra «Barbería»; radio 5 mi.
- **Fase 1 · bloque 1b HECHO (5 nov) · semilla del sandbox:** el fundador subió `prototype.zip` (Export →
  Project HTML, solo la carpeta `prototype`). `scripts/semilla/extraer-prototipo.cjs` carga los 46 scripts del
  prototipo en un `vm` aislado y saca los negocios de los 17 `TL<Cat>.B` → `infra/pruebas/semilla/negocios.json`
  (**446 negocios**, no 276: la memoria era de una versión vieja; 289 Pro, 278 verificados, todos con
  coordenadas y subcategoría). `scripts/semilla/generar-sql.mjs` → `0001_negocios.sql` (negocios, caché de
  derivados, horarios, 1 091 fotos de Pexels). Teléfonos cambiados al rango de ficción 555-01xx (los del
  prototipo parecían reales de Hazleton). La aplica solo `infra/pruebas/deploy.sh` (`migrar.sh
  --semilla-pruebas`); guardián `semilla` impide llamarla desde fuera del sandbox (probado al revés).
  **Inconsistencia del diseño:** 5 subcategorías de las demos no existen en la taxonomía (Comida criolla,
  Calefacción y aire, Quitar nieve, Optometrista, Psicólogo y terapia). Pendiente: las 17 demos ricas
  (`TLDemo`: menú, staff, reseñas…) entran con su bloque.
- **El kit `tolatino-app-kit.zip`** (Claude Design) asume Expo + Supabase: queda sustituido por las decisiones
  B, C y D; sus documentos ya estaban en `docs/diseno/`.
- **Fase 1 · bloque 1c ✓ (5 nov, espera OK del fundador):** shell `app/(app)/` (SiteHeader móvil/escritorio,
  pestañas, BottomNav, idioma ES/EN por cookie `tl_lang`) + Inicio (APP-HOME) 1:1 con el prototipo: móvil =
  7 categorías + «Todas (17)» + Abierto ahora (3) + Para negocios; escritorio = columnas del prototipo
  (`deskCols`: 220 | centro desde 1024; 240 | centro | 320 desde 1200, corte `xl` = 75rem en globals.css).
  «Abierto ahora» es real: Pro con foto, abierto según `business_hours` en la zona de la ciudad, el más
  cercano por categoría. **Ocultas hasta tener datos reales:** Hoy en el barrio, Esta semana (eventos),
  Comunidad y el mini mapa (no hay mapa todavía). Rutas aún no construidas muestran `Pronto` con su bloque
  (c/[slug], n/[id], negocios, buscar, ciudad, publica, comunidad, eventos) — fase 9 exige 0.
  Nota de verificación: este contenedor no llega a images.pexels.com (proxy 403), así que las fotos solo se
  ven en el sandbox; la página sí pide las URLs correctas.
- **Fase 1 · bloque 1d ✓ (5 nov, espera OK del fundador):** página de categoría `/c/[slug]` (APP-NEG-CAT) y
  `/negocios` (APP-NEG-HOME), 1:1 con el prototipo.
  - Configuración de cada página (portada, filas de mosaicos, «Qué se te antoja», banda, filtros rápidos, línea de la
    tarjeta) sacada del prototipo con `scripts/catalogo/extraer-paginas.cjs` → `packages/taxonomy/paginas.json` →
    `packages/db/seeds/paginas.sql` (configuración real: va también a producción). Migración 0009: `categories.page`
    (semilla) + `page_admin` (lo que edite el Super Admin, la semilla no lo toca), `filter_options.sort/icon`
    (251 filtros, `active` lo controla el admin) y la función `negocio_abierto(id, hora_local)` (incluye rangos que
    cruzan medianoche y 24 h). Cada mosaico es una REGLA ({subs} · {tag} · {attr,value} · {cap_gte}); el extractor
    prueba candidatas contra la función `inSub` del prototipo sobre todos sus negocios y se detiene si una no casa.
    Conteos verificados contra el prototipo (comida 44, belleza 34, Toyota 27, fiestas 200 invitados 24, fiebre 6,
    dominicana+delivery 4).
  - Servidor decide: sub/filtros/orden/página vienen en la URL y se validan contra lo que la categoría ofrece; Pro
    primero; en Relevancia los Pro rotan por día (como el prototipo); radio = `cities.default_radius` (5 mi).
  - Tarjetas: `lib/tarjeta.ts` (estado del horario «Abierto · hasta 8 PM / Cerrado · abre vie 8 AM», botón por
    categoría, chips verificados, «Nuevo · en To'Latino» con < 5 reseñas — parche en `portar-sistema.mjs` a
    BusinessCard) + `lib/tarjetas.ts` (3 consultas fijas por lista, sin N+1) + `TarjetaNegocio.tsx` (llamar →
    `contact_taps`, cómo llegar → mapas del teléfono, corazón → `favorites`; sin sesión → `/entrar?volver=`).
  - `Avísame cuando haya` guarda `search_alerts` (el aviso se envía en la Fase 2, con las notificaciones). `/entrar` acepta `?volver=` (solo
    rutas del mismo sitio).
  - Semilla del sandbox: ahora lleva `service_radius_mi`, `works_from_home` y el texto de estado de los 4 negocios
    sin horario.
  - Guardián nuevo `rutasVivas`: ningún enlace a una pantalla que no existe (probado al revés).
  - Arreglo de 1c: el buscador del encabezado en el teléfono dice «Buscar en Hazleton» (como el prototipo).
  - **Fuentes alojadas en el repo** (`apps/web/public/fuentes`, OFL, Fontsource 5.3.0) con `@font-face` y el nombre
    exacto del sistema (Sora, Manrope, JetBrains Mono). Motivo: el CI del 1d falló porque Google Fonts no respondió
    bien durante el build, y además los componentes del sistema piden las fuentes por nombre y `next/font` las
    registraba con nombres generados: JetBrains Mono nunca cargaba (las líneas en mono salían con la fuente del
    sistema). Guardián nuevo `buildSinRed` (nada de Google Fonts en el build; probado al revés). `rutasVivas` ahora
    acepta archivos de `public/`.
- **Fase 1 · bloque 1e ✓ (5 nov, espera OK del fundador):** ficha base `/n/[id]` (APP-NEG-LISTING) Pro y Free,
  teléfono y escritorio, como dice PLAN §6: Resumen, horario Pro, fotos, Relacionados, Llamar / Cómo llegar /
  Compartir / Guardar. `lib/ficha.ts` (6 consultas fijas): estado y «Hoy» con la hora de la ciudad (TodayCard con
  datos reales: tiempos y envío que el negocio puso, «Pagas en el local»), HoursPro con los rangos reales del día,
  cuenta regresiva, `special_hours` y la semana; Relacionados = `business_links` confirmados por los dos, con su nota.
  Parche a HoursPro en `portar-sistema.mjs`: etiquetas ES/EN (AHORA, PRÓXIMOS CAMBIOS, Esta semana) y color del
  estado (Cerrado en rojo). Semilla del sandbox: «sobre nosotros» (111), preguntas frecuentes (31 negocios, 112) y 3
  relaciones del prototipo. **Fuera a propósito** (datos inventados en el prototipo o módulo de otra fase): reseñas,
  menú/servicios, «N vecinos lo recomiendan», tarjeta del dueño (llega con Equipo, 1h), mini mapa (mapa propio),
  galería (falta su archivo de diseño). Ver LAUNCH-CHECKLIST.
- **Corrección:** las notificaciones y las reseñas entran en la **Fase 2** (PLAN §6), no en la 8.
- **Archivos de diseño en el repo (5 nov):** `docs/diseno/pantallas/` tiene los `.dc.html` de Claude Design que la Fase 1
  necesita (Prototipo, Galería, Buscar, Ciudad, Mapa, Recomendar, Publica tu negocio v2, Licencia, Recuperar negocio,
  Página, Teléfono, Super Admin, Panel negocio v2, Mi cuenta) y `datos/` los 140 scripts de datos del prototipo +
  `orden.txt`. Salen del artifact de diseño del fundador (`Artifact read` con `paths: ["project/To'Latino X.dc.html"]`;
  la carpeta `project/prototype/` no se puede leer por nombre reservado, por eso los datos vinieron del zip).
  Extractores, desde el repo: `node scripts/catalogo/extraer-paginas.cjs docs/diseno/pantallas/datos
  docs/diseno/pantallas/datos/orden.txt "docs/diseno/pantallas/To'Latino Prototipo.dc.html"
  packages/taxonomy/categorias.json packages/taxonomy/paginas.json` (verificado: salida idéntica).
- **Cierre del 1d y 1e:** banderas de «Por país» (`public/assets/flags`, 14, del diseño) y **Galería** `/n/[id]/fotos`
  (diseño «Galería»): cuadrícula, visor a pantalla completa (flechas, deslizar, teclado ← → Esc), `?at=N`, y
  «Reportar foto» → `photo_reports` (migración 0010, una vez por persona y foto; sin sesión → entrar y volver).
  Free muestra hasta 6 fotos (modelo de datos), Pro hasta 60.
- **Fase 1 · bloque 1f-1 Buscar ✓ (5 nov):** `/buscar` (diseño «Buscar»: explorar, sugerencias en vivo, resultados,
  sin resultados, voz) + `/api/buscar` (sugerencias). Motor del prototipo (`search-engine.js`) llevado al servidor en
  `lib/buscar.ts`: frases → intenciones (filtros), palabras vacías, singular, sinónimos (tabla `synonyms`, semilla
  repetible `seeds/busqueda.sql` desde `scripts/catalogo/extraer-busqueda.cjs` → `packages/taxonomy/busqueda.json`),
  errores de escritura con el vocabulario `search_vocab` (vista materializada + trigramas, `refrescar_busqueda()` tras
  cada semilla), búsqueda en `search_doc` (migración 0011: suma categoría y texto de la tarjeta), parcial si nada
  encaja con todas las palabras, sugerencias de subcategorías con conteo, «Aún no hay», «¿Quisiste decir…?», categoría
  dominante → filtros rápidos. Cada búsqueda queda en `search_logs`; «Lo más buscado» sale de ahí (se ve con 3+).
  «Avísame» → `search_alerts`. En el teléfono Buscar es pantalla completa (sin encabezado ni barra, como el prototipo).
  Probado: «barbería sin cita abierta ahora» (6, con 2 filtros), «dentist that takes Medicaid», «barveria» → 10.
- **Fase 1 · bloque 1f-2 Ciudad ✓ (5 nov):** selector «¿Dónde buscas?» (diseño «Ciudad»: hoja en el teléfono, ventana
  bajo el botón de ciudad en escritorio; `/ciudad` y `?ciudad` lo abren) y APP-CIUDAD-PRONTO (pieza CitySoon) en
  Inicio, Negocios, categorías y Buscar cuando la ciudad no abre. «Ciudad que estoy viendo» = ciudad + punto (centro,
  barrio o GPS) + radio: cookie `tl_loc` del dispositivo y, con cuenta, `users.viewing_*` (el punto GPS nunca se guarda
  en el servidor). `lib/ubicacion.ts` la valida siempre; `lib/punto.ts` (`centroSQL`, `DENTRO`) la lleva a TODAS las
  listas: distancias desde el punto elegido y dentro del radio (más los que van a domicilio y llegan). Cifras reales
  (`lib/ciudad.ts`): negocios en el radio, pueblos, puntos del mapa, lista de espera, listos/meta (`open_rule.goal`,
  50 por defecto). «Avísame cuando llegue a mi zona» → `city_waitlist` (con cuenta o con teléfono + dispositivo;
  quitar = `removed_at`; tope 10/hora por IP). Super Admin › Ciudades: lista de espera real y «Pide tu ciudad».
  Migración 0012 + semilla `zonas.sql` (6 barrios y 18 pueblos de Hazleton, de `city-data.js`). Sandbox: Hazleton
  abierta (`infra/pruebas/semilla/0002_ciudad.sql`). Ayuda: `docs/ayuda/ciudad.md`.
- **Mapa propio (infra):** `infra/mapa/generar.sh` (OpenStreetMap de Pensilvania → Planetiler → `.mbtiles`;
  fuentes auxiliares bajadas aparte; océanos vacíos si osmdata.openstreetmap.de no responde: `agua-vacia.py`),
  servicio `mapa` (tileserver-gl v5.6.0) en el compose del sandbox, `/teselas/` en nginx, paso 3d de `deploy.sh`
  (genera en segundo plano la primera vez). Prueba de punta a punta: `.github/workflows/mapa.yml`. Matemática del
  prototipo en `lib/mapa-geo.ts`. Hasta que el sandbox sirva teselas, los mapas se ven en gris (sin calles).
- **Fase 1 · bloque 1f-3 Mapa ✓ (5 nov):** `/mapa` (diseño «Mapa», APP-NEG-MAPA): pines + lista (el más cerca
  primero, de 20 en 20), arrastrar, + / − / volver al punto, tarjeta con Ver negocio y Cómo llegar, filtros Todos ·
  Abierto ahora · Verificados · Destacados + categorías (sin contexto), y los filtros de la categoría cuando vienes de
  ella (botón «Mapa» de escritorio: `?cat&sub&f&ctx=1`). `lib/mapa.ts`: dentro del radio cuentan, alrededor (2,6×) en
  gris; quien trabaja desde casa sale en una cuadrícula de ~500 m (el servidor nunca manda su punto); sin local = sin
  pin. Encabezado compacto en el teléfono para Mapa, ficha y galería (prototipo showMBrand; `compact` en SiteHeader
  por `portar-sistema`). `/abierto` = Buscar «abierto ahora» (prototipo searchFrom). Planetiler fijada por huella
  (0.10.3). Semilla del sandbox: los negocios con d = 0 del prototipo quedan sin local (45, la regla del Mapa: _d0 = 0) y las fotos de la semilla
  tienen id fijo (se actualizan, no se borran: un reporte de foto ya no rompe la semilla). Ayuda: `docs/ayuda/mapa.md`.
- **Fase 1 · bloque 1g-1 Recomendar ✓ (5 nov):** `/recomendar` (diseño «Recomendar»): el negocio, contacto opcional,
  tú (cómo lo conoces, por qué, decirle que fuiste tú), «te falta», enviada con su seguimiento. Borrador en el teléfono;
  enviar pide entrar y vuelve. `recommendations` (0013: `note`, `contact_kind`, sin duplicados por persona y ciudad;
  tope 20/día). Teléfono normalizado o @Instagram. Desde Buscar (?q), categoría (?cat) y Próximamente (?ciudad).
  Ayuda: `docs/ayuda/recomendar.md`.
- **Fase 1 · bloque 1g-2 Publica tu negocio v2 ✓ (5 nov):** `/publica?paso=` (diseño «Publica tu negocio v2»: A1 entrada
  con teléfono y código, B1–F1, H1 publicada; teléfono con barra arriba y botón fijo; escritorio con pasos, formulario y
  «tu página en vivo»). Reglas y datos del prototipo traídos tal cual por `scripts/catalogo/portar-onboarding.mjs` →
  `lib/onb/datos.ts` (los usan la pantalla y el servidor). `publica/logica.ts` y `vista.ts` (puras, con la hora real de la
  ciudad). Borrador en `onboarding_drafts` (seguir desde otro teléfono). Publicar (`acciones.publicar`): el servidor vuelve
  a pasar las reglas y crea en una transacción negocio (activo), plan Pro de prueba, dueño, horario, fotos y la solicitud
  al local si renta espacio. **Fotos:** Garage (S3 propio, `dxflrs/garage:v2.1.0`) preparado por
  `infra/pruebas/medios.sh` (configuración con secretos en el servidor, bucket público «medios», llave de la app en
  `pruebas.env`), nginx `/medios/`, `/api/medios` (con cuenta, 60/hora, `sharp`: endereza, 1600 px, JPEG sin EXIF/GPS),
  firma SigV4 propia en `lib/medios.ts`. Probado de punta a punta con Playwright y Garage local (foto falsa rechazada,
  EXIF quitado, negocio creado). Ayuda: `docs/ayuda/publica.md`.
- **Fase 1 · bloque 1h Panel base ✓ (5 nov, espera OK del fundador):** `/panel` → `/panel/{negocio}` (Tu página),
  `/hoy`, `/pagina/{hor|fotos|about|equipo}` y `?det=stf:…` (diseño «Panel negocio v2»: barra del negocio + pestañas en
  el teléfono; menú 264 px + contenido + detalle 420 px ≥ 1200 o ventana en escritorio). Bloques del panel portados a
  `@tolatino/ui` (`packages/ui/src/panel/Bloques.tsx`: head, hero, kpis, tabs, chips, group, rows, note, lock, kv,
  field, step, photos, hours con 2.º tramo ajustable, empty, acts, rvsum). Servidor: `lib/panel.ts` (acceso por
  membresía activa, datos en 7 consultas fijas), `lib/panel-reglas.ts` (fuerza del perfil 11 reglas, prueba Pro por
  fases, horario panel↔base, horario de cada persona), `lib/plan.ts` (cifras Free/Pro en un solo lugar: Free 3 fotos
  según PLAN §2 — la ficha mostraba 6, corregido). Acciones con acceso + auditoría (`app/panel/acciones*.ts`, guardián
  `accionesConAcceso`). Migraciones 0014 (vistas diarias, `closed_on` «Cerrar por hoy» en `negocio_abierto`, equipo:
  código de invitación, año, motivo de salida; logo como `media` aparte) y 0015 (contactos sin inflar: 1 cada 10 min por
  persona/red, 60/h por red, sin contar al propio negocio). Comodidades: catálogo `amenities` generado del prototipo
  (`scripts/catalogo/generar-amenidades-sql.mjs`), se guardan claves (Publica convierte). **Espejo en la ficha:** logo
  real, «Quién está detrás» (OwnerCard: dueño con sus palabras o el texto del negocio, equipo, lo verificado), «En el
  local», «Cerrado hoy» en ficha y listas, vistas contadas al servir `/n/[id]`. Publica H1 → «Ir a mi panel» y tareas
  que llevan al apartado. Probado con Playwright en teléfono y escritorio sobre negocios publicados (Hoy, cerrar/abrir
  y la ficha lo dice, horario, logo, portada, Quiénes somos, invitar/cancelar, perfil del dueño, sin cuenta → entrar).
  Ayuda: `docs/ayuda/panel.md`.
- **Fase 1 · bloque 1i Super Admin › Negocios + Colas ✓ (5 nov, espera OK del fundador):** spec del diseño en
  `scratchpad` (resumen aquí). `/admin/colas` (QueueCard ordenadas por plazo, pestañas por cola, Míos / Sin asignar /
  Vencidos, «Tomar siguiente» en la barra y en la cabecera, «Lo está viendo X», detalle al lado ≥ 1200 o pantalla
  completa, ReasonConfirm con plantillas del diseño) con 4 colas: sello, nuevos, medios marcados, recomendaciones.
  `/admin/negocios` (buscar, categorías con contador, plan, estado, más filtros, orden, DenseTable / filas, Pager) y
  `/admin/negocios/{id}` 360° (Resumen con fuerza en HBars y notas internas, Ficha con fotos y edición en su nombre,
  Equipo, Confianza; historial). Migración 0016: `queue_items` (nacen con su fuente: publicar, recomendar, reportar
  foto, pedir sello), motivo/fecha/quién del estado, cierre temporal del equipo, `admin_edits`, fotos quitadas por el
  equipo, estados nuevos de sello y recomendación, `admin_notes` (solo inserción), `perfil_fuerza()` + caché.
  Permisos: matriz de 0007 + colas por rol (`lib/colas.ts`) + ciudades del miembro. **Triángulo:** el panel muestra
  ocultar/suspender/cerrar/cierre temporal/nombre/Quiénes somos/fotos/sello de To'Latino con motivo; nuevo apartado
  «Verificación y sello» (pedir, «Ya lo mandé», cancelar); ficha y listas dicen «Cerrado temporalmente». Barra
  inferior del admin en el teléfono. Probado con Playwright (dueño pide sello → admin lo aprueba con las 3
  comprobaciones → ficha y panel; nuevo «Todo bien»; cierre temporal → ficha y panel → reabrir; editar nombre →
  aviso en el panel; admin en teléfono; el dueño no entra al admin). Ayuda: `docs/ayuda/admin-negocios.md`.
- **Fase 1 · orden:** 1a modelo ✓ · 1b semilla de pruebas desde el prototipo ✓ · 1c shell + Inicio ✓ · 1d página de categoría ✓ · 1e ficha base ✓ ·
  1f Buscar ✓ · Ciudad ✓ · Mapa ✓ · 1g Recomendar ✓ + Publica tu negocio v2 ✓ · 1h panel base ✓ · 1i admin Negocios + colas ✓ · 1k Licencia ✓ · 1j Recuperar negocio + semillas ✓ · 1l Usuarios 360° ✓ · 1m Catálogo ✓ · 1n Analítica ✓.
- **Fase 1 · bloque 1k Licencia ✓ (5 nov, espera OK del fundador):** `/n/{id}/licencia` (diseño «Licencia», portado
  1:1: línea fija, una tarjeta por licencia con estado real, número, próxima revisión y registro oficial, «Cómo la
  verificamos»), tarjeta «¿Puede hacerlo por ley?» en el Resumen de la ficha (Pro; va a Servicios cuando exista esa
  pestaña), chip y filtro «Licencia verificada» solo con licencias verificadas. Migración 0017 (`license_kinds`,
  estados `not_found`/`withdrawn`, ciudad, motivo, revisión, `lic_valid` + `licencias_refrescar()`), catálogo
  `seeds/licencias.sql` (las 10 del diseño con su registro), semilla del sandbox `0003_licencias.sql`. Publica crea las
  licencias marcadas «en revisión» con su caso; panel «Tus licencias» (agregar, número, quitar, lo que no haces); cola
  «Licencias» (Verificada / Vencida / No aparece) y 360° › Lo que vende. Guardián nuevo `servidorSoloFunciones`.
  Probado con Playwright (vecino → ficha → Licencia; dueño agrega CPA con número; admin la verifica; la ficha la muestra).
  Ayuda: `docs/ayuda/licencia.md`.
- **Fase 1 · bloque 1j Recuperar / reclamar negocio + semillas ✓ (5 nov, espera OK del fundador):** `/recuperar/{id}`
  (diseño ONB-NEG-RECUPERAR: qué eres del negocio, código por SMS al teléfono del negocio (R1) o documento, nota,
  estado del reclamo con OrderTracker; «¿Es tuyo? Reclámalo» de Publica lleva aquí). Documento en almacenamiento
  privado (`privado/…`, nginx devuelve 404; solo `/api/admin/reclamo/{id}` con permiso de la cola, auditado). Negocio
  con dueño: solo documento, aviso en su panel y 7 días; luego solo un Admin lo aplica (R2). Cola nueva «Cambios
  sensibles» (Aplicar cambio / Rechazar con motivo; cambio de dueño auditado). «Crear semilla» en la cola de
  Recomendaciones → `seed_listings`, sale al final de su categoría «Sin reclamar · ¿Es tuyo?» → Publica con
  `?semilla=` la marca reclamada. Migración 0018. Guardián nuevo `documentosPrivados`. Probado con Playwright
  (código → pendiente; documento sobre negocio con dueño → aviso en su panel y bloqueo antes de 7 días; aplicar →
  «Ya es tuyo» → panel; semilla en la categoría; documento sin permiso → 404; sin errores de consola).
  Ayuda: `docs/ayuda/recuperar-negocio.md` (+ `admin-negocios.md`).
- **Fase 1 · bloque 1l Usuarios 360° ✓ (5 nov, espera OK del fundador):** lista `/admin/usuarios` (buscar por nombre,
  teléfono, correo o id; QUIÉN, ESTADO, más filtros, ordenar; tabla densa / filas) y 360° `/admin/usuarios/{id}` con
  Resumen, Seguridad, Confianza y Privacidad (Actividad, Dinero y Comunidad llegan con sus módulos). Migración 0019:
  `sanctions` (adv, mute7, nopub, susp14, ban; se levantan solas o por una persona), `cuenta_estado()`, dispositivo de
  cada sesión (cookie `tl_dev`) y `blocked_devices`, `sensitive_changes` (borrar cuenta: lo pide una persona y lo
  aplica otra; 30 días de gracia; Admin restaura). Entrar respeta suspensión (con fecha y motivo), baneo, borrado y
  dispositivo bloqueado; Recomendar respeta el silencio; Mi cuenta muestra advertencia y silencio. Exportar datos
  (JSON, auditado). Guardián nuevo `auditoriaLegible` (cazó también el cambio de dueño con ids y la licencia con su
  estado interno). Probado con Playwright: silencio → no recomienda; suspensión → no entra y ve hasta cuándo;
  levantar; bloquear dispositivo → otra cuenta no entra; ciudad → lista de espera; exportar; borrar (quien lo pide no
  lo aplica, otro Admin sí) → no entra → restaurar; Soporte no ve Sancionar ni Exportar.
  Ayuda: `docs/ayuda/admin-usuarios.md` (+ `cuenta-entrar.md`, `admin-negocios.md`).
- **Fase 1 · bloque 1m Catálogo ✓ (6 nov, espera OK del fundador):** `/admin/catalogo` con Categorías (clave,
  subcategorías, negocios, Pro, transacción, línea fija; detalle con agregar / quitar con «afecta a N negocios» /
  restaurar subcategorías), Sinónimos (agregar, apagar, encender), Búsquedas sin oferta (avisos pedidos 30 días),
  Familias de filtros (interruptor por opción, encender todos) y Módulos y Free/Pro (solo lectura). Migración 0020:
  vista `subcategorias_vivas` (todas las lecturas públicas la usan: tarjeta, ficha, mapa, directorio, Buscar, página de
  categoría y sus mosaicos), documento de búsqueda sin subcategorías apagadas y recalculado sin tocar la «última
  actividad». Semilla `lineas.sql` (línea fija y transacción de cada categoría, sacada del prototipo con
  `scripts/catalogo/extraer-lineas.cjs`). Guardián nuevo `subcategoriasVivas`. Probado con Playwright: quitar
  «Dominicana» → sale de /c/comida (3 → 0) → restaurar; agregar subcategoría; sinónimo nuevo → Buscar lo usa al minuto;
  apagar «Delivery» → deja de salir como filtro rápido; sin errores de consola. Ayuda: `docs/ayuda/admin-catalogo.md`.
- **Fase 1 · bloque 1n Analítica propia ✓ (6 nov, espera OK del fundador):** migración 0021 (`app_events` solo de
  inserción con lista cerrada de eventos, `user_days` y `device_days`), `lib/eventos.ts` (nunca rompe la pantalla; sin
  datos personales; robots fuera), cookie de dispositivo `tl_dev` creada en `middleware.ts`. Eventos conectados: ver
  categoría, ver ficha, buscar, contactar, entrar, registrarse, publicar negocio, recomendar, reclamar, reportar foto,
  pedir aviso; día activo en cada carga de la app. `/admin/analitica`: Resumen (embudo buscar → ficha → contactar),
  Gente y negocios (vecinos, activos, Pro/Free, verificados, retención D1/D7/D30, por categoría), Soporte y confianza
  (sancionados, SLA cumplido, colas abiertas), Búsquedas sin oferta y Exportar (CSV auditado, celdas neutralizadas).
  Guardián nuevo `eventosEnLista`. Probado con Playwright: el vecino deja ver_categoria → ver_ficha → buscar →
  registrarse con su dispositivo; un robot no suma; CSV de 449 negocios con su auditoría; sin errores de consola.
  Ayuda: `docs/ayuda/admin-analitica.md`.
  **Fila 1 del PLAN completa** (salvo lo anotado en LAUNCH-CHECKLIST).
- **Fase 2 · Comida (modelo) · bloques:** 2a menú (datos, panel, admin) ✓ · 2b pestaña Menú en la ficha + carrito + pedido
  con pago en el local ✓ · 2c pedidos en el panel y seguimiento ✓ · 2d pago con tarjeta (Stripe Connect, checkout propio) ·
  2e reservaciones · 2f entrega y Repartidor · 2g reseñas, novedades, Jobs · 2h Mi cuenta completa · 2i admin
  (Transacciones, Soporte, devoluciones, disputas, Planes, Contenido, Notificaciones) y SMS.
- **Fase 2 · bloque 2a Menú ✓ (6 nov, espera OK del fundador):** migración 0022 (`item_sections`, `items`,
  `option_groups`, `menu_settings`, `businesses.modules_off`; dinero en centavos; nada se borra), `lib/menu.ts` (agotado
  hoy / hasta el viernes y la cuenta del día se calculan al leer: sin tareas programadas). Panel `/panel/{id}/vendes`
  (Lo que vendes) y `/vendes/menu` con Platos, Categorías, Opciones, Inventario y Horarios y los editores de plato,
  categoría y grupo, portados del Panel v2 (bloques nuevos en @tolatino/ui: utabs, search, bulk = SelectionBar, mprev =
  MenuItemRow, gprev = OptionGroup, contador QtyStepper en filas). Acciones `acciones-menu.ts` con acceso «cat» y
  auditoría. Super Admin 360° › Lo que vende (Comida): ocultar plato y pausar Menú / Pedidos en línea con motivo; el
  dueño lo ve en su panel. Semilla del sandbox `0004_menu.sql` (la carta de Sabor Dominicano del prototipo, con
  `scripts/semilla/extraer-menu.cjs`). Probado con Playwright: precio, agotar y activar, − / +, categoría y plato nuevos,
  opción agotada, +$1 en lote, pausa, sin acceso; admin oculta y pausa → el dueño lo ve. Ayuda `docs/ayuda/panel-menu.md`.
- **Fase 2 · bloque 2b Pedir comida ✓ (6 nov, espera OK del fundador):** migración 0023 (`delivery_settings`,
  `operations` (número #1001…, pago `local`, `client_key` para no duplicar, `free_quota_month`), `operation_lines` (copia
  de nombre, precio y opciones), `operation_events` solo inserción; `free_ops_cap` en platform_config; evento `pedir`).
  `lib/pedir.ts`: menú público (horarios propios de plato y categoría, agotado, cuenta del día, Free = 5 platos, módulos
  `menu` / `pedidos` encendidos, pausas de To'Latino y del negocio, último pedido antes de cerrar, programar para hoy) y
  `crearPedido` (el servidor recalcula precios, opciones, impuestos, inventario y techo Free, en una transacción con
  candado por negocio; tres pendientes por persona como máximo). Ficha: pestaña Menú (Pro), Resumen · menú, barra
  «Desde $X · Pedir», hoja del plato, «otra igual o con cambios», «cuál quitas», carrito (24 h en el teléfono) y tarjeta
  de pedido en escritorio (`MenuCliente.tsx`). `/n/{id}/pagar` (pickup, cuándo, pago en el local, resumen) y
  `/pedido/{n}` (OrderTracker, listo a las, pagas en el local, sin respuesta a los 10 min). Panel › Hoy: «Esperan tu
  respuesta» real y el techo Free real; «Lo que vendes» dice «EN TU PÁGINA». 360° › Lo que vende: pedidos del mes.
  Semilla `0005_pedidos.sql` (módulos y pickup de Sabor Dominicano). Guardianes nuevos: `dineroDelServidor`,
  `pegadoBajoEncabezado`, `transaccionEnFila`. Probado con Playwright (teléfono y escritorio): +, opciones obligatorias,
  precio con opciones, otra igual, carrito, pagar, pedido #, totales servidor = pantalla, inventario del día, plato
  agotado entre carrito y pago, pausa, sin sesión, Free (5 platos, techo lleno), panel Hoy. Ayuda `docs/ayuda/pedir-comida.md`.
- **Fase 2 · bloque 2c Pedidos en el panel ✓ (6 nov, decisión AA: revisión al final):** `lib/pedidos.ts` (vencer al
  leer → SIN RESPUESTA e inventario de vuelta, sin tareas programadas; aceptar / rechazar / listo / entregado con candado
  y línea de tiempo; cancelar del cliente; volver a pedir con grupo e índice de cada opción). Panel: Hoy (cifras reales,
  Aceptar / Rechazar, agenda), detalle `?det=ped:N` con HISTORIAL (bloque `timeline` portado a @tolatino/ui), Clientes
  (`/clientes`, filtros con cuenta, búsqueda, cursor), Lo que vendes › Pedidos en línea (`/vendes/pedidos`: preparación,
  programados, aceptar al instante, efectivo al recoger, encender / apagar). Cliente: etapas con su hora, cancelar
  (`/pedido/N/cancelar`), volver a pedir. Acciones `acciones-pedidos.ts` (ord / cat) con auditoría. Probado con
  Playwright (31 comprobaciones): aceptar → cocina → listo → entregado, historial, cancelar con motivo, rechazar,
  vencer, inventario devuelto en los tres, Clientes, ajustes y auditoría. Ayuda `docs/ayuda/panel-pedidos.md`.
- **Fase 2 · bloque 2e Reservaciones de mesa ✓ (6 nov, decisión AA):** migración 0024 (ajustes, días cerrados,
  retenciones de 5 min, propuestas de cambio; mesa = operación `table`, R-9301…). `lib/reservas.ts`: disponibilidad real
  (mesas por área y tamaño, juntar mesas, mesas sin reservar, turnos, duración, horario, días cerrados, anticipación) con
  candado por negocio; retener, enviar, cambiar una solicitud pendiente, vencer al leer (30 min sin respuesta, 15 min
  una propuesta), cancelar (tardía sin cargo), voy tarde, aceptar / rechazar la otra hora. Cliente: pestaña, tarjeta
  rápida, riel «Tu mesa», `/n/{id}/reservar`, `/reserva/{R-…}`. Panel: Hoy (Confirmar / Otra hora / No hay mesa),
  detalle (llegaron / no llegaron / se fueron), Clientes › Reservaciones, Lo que vendes › Reservaciones (bloques nuevos
  `rvar` y `evbuy`). Super Admin: módulo con cuentas y Pausar. Solo Pro. Guardianes nuevos: `clienteMismoOrigen`,
  `fechaEnCrudo`, `operacionesConTipo` (cazó que el vencer de pedidos cerraba reservaciones y que el tope de 3 pedidos
  pendientes contaba mesas). Probado con Playwright: cliente 29, panel 18, admin 3 comprobaciones; 2b y 2c otra vez en
  verde. Ayuda `docs/ayuda/reservar-mesa.md` y `panel-reservaciones.md`.
- **Fase 2 · bloque 2f Direcciones, Entrega y delivery ✓ (6 nov, decisión AA):** geocodificador propio con las calles
  del Censo (TIGER ADDRFEAT → `geo_streets`, `dir_ubicar(calle, cp)`, migración 0025, `infra/direcciones/generar.sh`,
  `.github/workflows/direcciones.yml`); Mis direcciones (`/cuenta/direcciones`, editor, predeterminada, ?volver=);
  Panel › Entrega (DASH-ENTREGA) y pausa de delivery en el Super Admin; delivery en el menú (Delivery / Pickup, SOLO
  PICKUP, mínimo, envío, envío gratis), pago (dirección, cómo entregar, al llegar, guardar para la dirección — migración
  0026 `drop_pref` —, propina), seguimiento (enviado → preparando → en camino → entregado, Seguir en la app externa) y
  panel (dirección, Cómo llegar, Llamar, Salió en camino, Entregado, enlace de seguimiento). El servidor vuelve a medir
  zona, mínimo, envío y propina (probado cambiando la dirección en la petición). Guardián nuevo `pedidoEnCurso` (el
  delivery en camino desaparecía de Hoy). Probado con Playwright: delivery 21 comprobaciones + 2 del servidor fuera de zona;
  2b, 2c, 2e, direcciones y Entrega otra vez en verde. Ayuda `mis-direcciones.md`, `panel-entrega.md`,
  `pedir-comida.md`, `panel-pedidos.md`. Repartidor sin diseño (pregunta 6).
- **Fase 2 · bloque 2g-1 Reseñas ✓ (6 nov, decisión AA):** migración 0027 (`reviews` una por persona y negocio, verificada
  por pedido o mesa terminada con el dato del pedido que no se edita; `review_helpful`; `content_reports`; cola `rep`;
  `reviews_stats` = ★ y conteo derivados de las visibles). Semilla: las 14 reseñas del prototipo en Sabor Dominicano
  (`scripts/semilla/generar-resenas.py`); las ★ fijas de la semilla de negocios se quitaron. `lib/resenas.ts`. Ficha:
  Resumen «Lo que dicen los vecinos», pestaña Reseñas (Pro) con filtros, orden y cursor, reportar, visor de fotos;
  escribir / editar (48 h) / borrar (`/n/{id}/resena`, `/resena/tuya`); «Escribir una reseña» desde el pedido terminado.
  Panel: Tu página › Reseñas (responder Pro, pedir revisión), Hoy y la fuerza del perfil con datos reales; bloque nuevo
  `thread`. Super Admin: cola Reportes de contenido (Mantener / Ocultar / Ocultar y sancionar) y 360 › Contenido.
  Guardián nuevo `fechaIsoNavegador` (to_char con «OF» dejó «Tu reseña» en blanco). Probado con Playwright: 34
  comprobaciones (cliente, panel, admin, Free); 2b, 2c, 2e y 2f otra vez en verde. Ayuda `resenas.md`,
  `panel-resenas.md`, `admin-negocios.md`.
- **Fase 2 · bloque 2g-2 Novedades ✓ (6 nov):** migración 0028 (`business_posts` oferta / hoy / aviso / encuesta / novedad,
  votos, encuesta, guardados, vistas, comentarios con respuesta y «Útil»; `post_en_vivo()` y `oferta_precio()`: **el precio
  de la oferta se cobra** en el menú y el pedido mientras está en vivo; el «antes» es siempre el precio del menú). Semilla con
  5 del prototipo. Ficha: pestaña Novedades con PostCard (seguir, filtros, votos, encuesta, comentarios, guardar,
  compartir). Panel: Tu página › Novedades (lista con estados, fijar una, detener, publicar ya / de nuevo, duplicar,
  quitar; editor con fotos, botón, oferta, audiencia, vencimiento y programación; responder comentarios); bloque `nprev`.
  Super Admin: ocultar / mostrar y pausar Novedades (360 › Contenido). PostCard accesible (botones con rol y teclado, parche
  en `scripts/portar-sistema.mjs`). Probado con Playwright: 22 comprobaciones (incluye que el pedido cobra la oferta y que en pausa vuelve el precio del menú); 2b, 2c, 2e, 2f y 2g-1 otra vez en verde.
  Ayuda `novedades.md`.
- **Fase 2 · bloque 2g-3 Jobs ✓ (6 nov):** migración 0029 (`job_postings` con pago por hora ≥ $7.25, días, horario, idiomas,
  requisitos y beneficios; `job_applications` J-3101… con enviada / vista / le van a llamar / entrevista / no seleccionado /
  retirada; `job_saves`; `vacante_en_vivo()`). Sin CV ni papeles: el editor y el servidor rechazan esas palabras. Cliente:
  pestaña Jobs, vacante (`/n/{id}/empleo/{job}`), aplicar y tu solicitud (`/solicitud/J-…`, confirmar entrevista, retirar,
  parecidas). Panel: Lo que vendes › Jobs (ahora para todas las categorías), vacante con filtro de solicitudes, solicitud
  (abrir = vista; llamar, le voy a llamar, entrevista en un día y hora en que abres, no seleccionado), editor, pausar /
  publicar / ya la cubrí / duplicar / quitar, y «Solicitudes de empleo nuevas» en Hoy. Super Admin: ocultar / mostrar
  vacante y pausar Jobs (360 › Contenido). Semilla 0009 (Sabor y El Fogón). Guardianes nuevos `promesaSms` y
  `botonEnColumna`. Probado con Playwright: 36 comprobaciones; 2b, 2c, 2e, 2f, 2g-1 y 2g-2 otra vez en verde. Ayuda
  `jobs.md`.
- **Fase 2 · bloque 2h Mi cuenta ✓ (6 nov):** migración 0030 (`users.notif_prefs`, `delete_reason`, código
  `account_delete`, historial con foto / borrar / cancelar borrado). Resumen (tarjeta de vecino, completa tu cuenta, tu
  semana, pendiente de ti, accesos, tu apoyo al barrio), Pedidos (filtros, por mes, cursor), Citas y reservas, Guardados,
  Reseñas, Empleos, Perfil (foto, nombre, apodo, correo sin verificar), Cambiar mi número (código al nuevo), Avisos
  (se guardan), Ajustes (idioma de la cuenta), Mi ciudad (30 días, solo abiertas), Privacidad (sesiones), Borrar (3 pasos,
  30 días; entrar lo cancela), Invita vecinos. Marco con bloques nuevos (tarjeta de vecino, completa tu cuenta, semana,
  accesos, apoyo, negocios, chips, «Ver más», solo teléfono / escritorio). Super Admin › Usuarios 360 muestra correo y
  borrado. Guardián nuevo `idSegunTipo` (cerrar sesión no cerraba: id uuid pasado como bigint). Probado con Playwright:
  29 comprobaciones. Ayuda `mi-cuenta.md`.
- **Fase 2 · bloque 2i (1) Super Admin › Contenido y Transacciones ✓ (6 nov):** Contenido (reseñas, novedades, comentarios y
  vacantes en una lista; cifras, pestañas, búsqueda, filtros con reporte / ocultos / votos negativos; ocultar o mostrar con
  motivo, también comentarios) y Transacciones (pedidos y reservaciones de 90 días; cifras, pestañas, estados, búsqueda y CSV
  protegido contra fórmulas, en la auditoría; `lib/csv.ts` compartido con Analítica). Probado: 13 comprobaciones. Ayuda
  `admin-contenido.md`.
- **Fase 2 · bloque 2i (2) Ayuda con el pedido y Soporte ✓ (6 nov):** migración 0031 (`help_requests` H-5001…, una por pedido;
  cola `sop`). Cliente: `/pedido/{n}/ayuda` (qué pasó según pickup o delivery, platos, qué quiere, detalle) y el estado en el
  pedido (enviada, respuesta, «Pedir que To'Latino lo revise», resuelta). Panel: Hoy y el detalle del pedido con «Enviar
  respuesta». Super Admin: Soporte = cola «Ayuda con pedidos» (pasa sola a las 24 h sin respuesta) con «Resolver con un
  mensaje», auditado. Probado: 13 comprobaciones; 2b, 2c, 2f, 2h y Usuarios otra vez en verde. Ayuda
  `ayuda-con-el-pedido.md`.
- **Fase 2 · bloque 2j Notificaciones ✓ (6 nov):** migración 0032 (`notif_templates` 14 plantillas ES/EN por grupo,
  `notifications` con estado del SMS). `lib/avisos.ts`: cada evento deja el aviso en la bandeja y decide el SMS (lo crítico
  siempre; preferencias de Mi cuenta › Avisos; horas de silencio 10 PM–7 AM de su ciudad; la solicitud nueva al negocio no
  espera); en el sandbox «en modo pruebas», en producción Telnyx con la clave del entorno o «sin proveedor». Enganchado a:
  pedido (aceptar, rechazar, listo, en camino, nuevo al negocio), mesa (confirmar, otra hora, no hay, nueva al negocio),
  Jobs (respuesta, nueva solicitud), ayuda (al negocio, respuesta, resuelta) y moderación (reseña o comentario oculto).
  Bandeja `/avisos` (compuesta con el marco de Mi cuenta) y la campana con punto. Super Admin › Notificaciones: cifras de
  24 h, Plantillas (editar ES/EN con motivo y variables controladas, probar en mi teléfono), Envíos y Reglas. Además: «null
  MI» en Abierto ahora (guardián `distanciaNula`), la campana del sistema es un botón accesible (parche en
  `portar-sistema.mjs`) y el subtítulo de las cifras oscuras se ve. Probado: 14 comprobaciones. Ayuda `notificaciones.md`.
- **Fase 2 · bloque 2k Cambiar una reservación confirmada ✓ (6 nov):** migración 0033 (`change_proposals.side` negocio o
  cliente, `respond_by`, `seen_at`; plantillas rsv_chg_ok, rsv_chg_no, biz_rsv_chg). Cliente (prototipo): «Cambiar
  reservación» → «Solicitar cambio»; la actual sigue en pie; tarjeta «CAMBIO SOLICITADO / NO CONFIRMADO» con «Entendido»;
  «Cambio confirmado.». Panel (compuesto): «PIDE CAMBIO» en Hoy y el detalle con «Aceptar el cambio» (vuelve a revisar la
  mesa) / «No se puede», auditado. Vence a los 30 min o a la hora; con «Confirmar al instante» se hace solo. Probado: 17
  comprobaciones. Ayuda en `reservar-mesa.md` y `panel-reservaciones.md`.
- **Fase 2 · bloque 2d Pagar con tarjeta ✓ (6 nov, simulador):** migración 0034 (stripe_accounts, fee_rules con las
  comisiones del diseño, payments, refunds, payment_methods, stripe_events, sim_intents). `lib/pagos/stripe.ts` (API REST sin
  SDK, versión fija, claves idempotentes, firma del webhook) y `lib/pagos/pasarela.ts` (Stripe de verdad con clave; sin
  clave, simulador propio en el sandbox y apagado en producción). `lib/cobros.ts`: retener al enviar, cobrar al aceptar,
  liberar si no se da, devolver total o parcial (comisión en proporción), reparar lo que quedó a medias. Cliente: PAGO
  Tarjeta / En el local y la hoja «Método de pago». Panel: **Cobros** (conectar con Stripe, la semana, cada cobro), «Tarjeta
  en la app» en Pedidos, «Devolver dinero» en el pedido. Super Admin › Transacciones: retenido, comisión, devuelto y
  «Devolver». Webhook `/api/stripe/webhook`. Contrato con stripe-mock en el CI. Guardianes `tarjetaEnServidor`,
  `simuladorAislado`, `retencionPorTarjeta`. Probado: 21 + 7 (webhook) + 11 (contrato). Ayuda `pagar-con-tarjeta.md`.
- **Fase 2 · bloque 2l App To'Latino Repartidor ✓ (6 nov):** migración 0035 (`delivery_drivers` con código de invitación de
  6, `operations.driver_id`, efectivo cobrado; avisos drv_assigned, ord_here, biz_dlv_issue). `lib/repartidor.ts`.
  `/repartidor` compuesta con el sistema: alta con código (solo el teléfono invitado, tope de intentos), En línea, Inicio,
  Pedidos, detalle con un botón por paso (recogí, llegué, cobrar/entregado), problemas, Ganancias, Perfil, cola sin señal.
  Panel: Tus repartidores y Efectivo de hoy en Entrega, «¿Quién lo lleva?» en el pedido. Cliente: «Te lo lleva / llegó».
  `Button` del sistema accesible (parche en portar-sistema + guardián `botonAccesible`). Probado: 17 + regresión completa.
  Ayuda `repartidor.md`.
- **Fase 2 · bloque 2m Plan Pro ✓ (6 nov):** migración 0036 (`subscriptions`, `subscription_events` solo inserción, las
  pruebas existentes migradas; avisos pro_d25, pro_charged, pro_failed, pro_free). `lib/suscripcion.ts`: estado del plan,
  seguir con Pro (cobro el día 30) / no seguir / pasar a Free al fin del período / volver a Pro (cobro hoy), renovaciones,
  3 reintentos en 7 días, cortesía, recibos; claves idempotentes por período, tarjeta e intento (guardián extendido).
  Cobro directo en la pasarela (Stripe o simulador). Panel: Cobros y plan › **Tu plan** para todo dueño; «Ver Pro» y los
  avisos de la prueba llevan ahí. Publica crea la suscripción. Probado: 16 + regresión. Ayuda `plan-pro.md`.
- **Fase 2 · bloque 2n Super Admin › Planes ✓ (6 nov):** `/admin/planes` (MRR, en prueba, cobro fallido, Free al techo;
  Planes; Suscripciones con extender prueba, cortesía, quitar cortesía y reintentar; Comisiones vigentes y programadas a 30
  días). Acciones con motivo, por ciudad y auditadas. Probado: 8. Ayuda `admin-planes.md`.
- **Fase 2 · bloque 2o Negocio 360° › Dinero ✓ (6 nov):** migración 0037 (`stripe_accounts.paused_at/paused_by`, avisos
  `pay_hold`/`pay_resume`), `lib/admin-dinero.ts`, `app/admin/N360Dinero.tsx`, `acciones-dinero.ts` (pausar/reanudar con
  `pasarela.cuentaPagos`: calendario manual en Stripe), `anularSuscripcion` + `planAnular`. Ayuda: admin-negocio-dinero.md.
- **Fase 2 · bloque 2p Mensajes ✓ (6 nov):** migraciones 0038 (`chat_threads`, `chat_messages`, `businesses.chat_auto_reply`,
  reportes `chat`, avisos `msg_user`/`biz_msg`), 0039 (toque «message») y 0040 (cola `chat`). `lib/mensajes.ts` (una
  conversación por vecino y negocio, sin teléfonos, límites, respuesta automática, avisos sin repetir, bloquear, reportar).
  Mi cuenta › Mensajes + conversación (bloque `chat` del marco, se actualiza cada 4 s); botón Mensaje en la ficha y
  «Escribir al negocio» en pedido y reservación; Resumen «te escribió». Panel › Mensajes (+ Hoy, `thread`, respuestas
  rápidas, compartir teléfono, quién lo lleva, bloquear, reportar). Super Admin › Colas › Mensajes reportados (el hilo solo
  con caso abierto; ocultar mensaje con motivo). Accesibilidad: IconButton e interruptores (guardianes botonAccesible e
  interruptorAccesible). Ayuda: mensajes.md.
- **Fase 2 · bloque 2q Correo ✓ (6 nov):** migración 0041 (`email_outbox` historial, `email_verifications`); `lib/correo/`
  (`ses.ts` firma SigV4 propia + envío SES v2, `plantillas.ts` marco con la marca, `index.ts` bandeja/modo/verificar,
  `recibos.ts` pedido terminado, mesa confirmada, cobro de Pro; uno por cosa). Perfil «Confirma tu correo» + `/cuenta/correo`.
  Super Admin › Notificaciones › Correos + ver un correo (enmascarado). CI: `scripts/prueba-firma-ses` (vector de AWS).
  Guardián `correo` (colores = tokens; sin modo pruebas en producción). Ayuda: correo.md.
- **Fase 2 · bloque 2r Disputas ✓ (6 nov):** migración 0042 (`disputes`, cola `disputa`, Finanzas ve Colas, avisos
  `biz_dispute`/`biz_dispute_end`); `lib/disputas.ts` (registrar idempotente, evidencia de nuestros datos, responder,
  aceptar, cerrar, simulador); webhook `charge.dispute.*`; pasarela `disputaResponder/Aceptar` + `evidenciaStripe`
  (contrato: campos de evidencia contra la especificación); Colas (detalle con evidencia), Transacciones (estado +
  simulador), Panel › Cobros y 360 › Dinero (etiquetas). Ayuda: disputas.md.
- **Fase 2 · bloque 2s Ingresos ✓ (6 nov):** `/admin/planes?tab=ing` (`ingresos()` en lib/admin-planes: comisiones netas y
  Pro por semana, por categoría 90 días; BarChart/HBars del sistema; `ingresosCsv` auditado). Con esto quedan hechos los
  pendientes de la Fase 2 listados al retomar (2o Dinero, 2p Mensajes, 2q Correo, 2r Disputas, 2s Ingresos).
- **Cómo arrancar la Fase 0 (plan original; sesión nueva, `/model opus`, `/effort high`):**
  1. Leer `CLAUDE.md`, este archivo y `docs/PLAN.md` §3, §5 y la fila «Fase 0» de §6.
  2. Primer bloque: monorepo (pnpm + Turborepo, Next.js, `packages/ui`), rama
     `pruebas` nueva con `infra/pruebas/deploy.sh` (que además reemplaza
     `tolatino-sync` con `flock`), compose del sandbox (Postgres+PostGIS, MinIO,
     tiempo real, observabilidad), tubería CI, primeros guardianes.
  3. Segundo bloque: puerto del sistema de diseño desde
     `docs/diseno/design-system/components-web/` + tokens → `packages/ui`, página de
     catálogo de componentes, **primera captura en el teléfono** para el OK.
  4. Después: cuenta (teléfono una vez + passkeys), ciudad (5 ciudades), taxonomía,
     Super Admin esqueleto, `docs/ayuda/` inicial.
- El fundador trabaja desde el teléfono y solo da el OK (decisión U).

## Infraestructura de PRUEBAS (sandbox) — creada el 5 nov
- Hetzner Cloud, proyecto `tolatino-pruebas`, servidor **`tolatino-pruebas-1`**
  (id 174559637), tipo `cx33` (4 núcleos / 8 GB / 80 GB), Falkenstein (DE),
  Ubuntu 24.04. IP `2.31.196.167`. Respaldos automáticos activos. Firewall
  `tolatino-pruebas-web` (id 11974241): solo 80/443 + ICMP de entrada.
- **Cómo se administra (sin SSH, regla U):** el servidor **se sincroniza solo** con
  la rama **`pruebas`** del repo (público) cada 60 s (`/usr/local/bin/tolatino-sync`,
  timer systemd). Si hay un commit nuevo, hace `git reset --hard origin/pruebas` y
  ejecuta `infra/pruebas/deploy.sh` si existe. Log en `/var/log/tolatino-sync.log`.
  Página de estado en `http://2.31.196.167/` (commit, hora, últimas líneas del log).
- Instalado por cloud-init: git, nginx, docker + compose, fail2ban,
  actualizaciones automáticas (reinicio 04:30 si hace falta). Usuario `deploy`.
- Emergencia: se reconstruye desde la API de Hetzner con el mismo cloud-init
  (`rebuild`), sin tocar nada a mano. La llave SSH de arranque
  (`tolatino-bootstrap`, id 132214722) existe en Hetzner pero su parte privada no se
  conserva: el acceso es por el repo y por la API.
- El token de la API vive en los secretos del entorno de Claude Code (solo pruebas).

## Pendiente inmediato
1. ~~Verificado por el fundador (5 nov 00:08 EST): la página de estado carga, sync en commit 430e46a.~~ **Defecto conocido:** en el primer arranque `tolatino-sync` corrió dos veces a la vez (runcmd + timer) y chocó el clone; se autocorrigió al minuto. **Corregir en Fase 0:** `deploy.sh` reemplaza `/usr/local/bin/tolatino-sync` con una versión con `flock`.
2. ~~OK del fundador al plan~~ dado el 5 nov.
3. ~~Pexels~~ hecho (5 nov): clave nueva en los secretos del entorno, probada (HTTP 200).
4. Crear la rama `pruebas` nueva (hoy apunta al código v1) con `infra/pruebas/deploy.sh`
   cuando empiece la Fase 0.
