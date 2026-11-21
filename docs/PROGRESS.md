# To'Latino v2 — Dónde estamos / cómo retomar

_Actualizado: 21 nov 2026 (media mañana: ver el primer punto de «Estado»). Antes: 20 nov 2026 (tarde). Antes: 14 nov 2026 (9o hecho en su rama: producción como código y ensayada —el ensayo en máquinas no corrió—; ver «Fase 9 · 9o» al final. Antes: 9g). Plan de la Fase 9: `docs/diseno/plan/fase9-apertura.md`._

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
- **21 nov (noche, última) · `main` y `pruebas` = cd7f7d0, sandbox comprobado desde fuera** (estado-sandbox 44951939483: salud con commit
  cd7f7d0c, **0207 aplicada, 206 migraciones**, `/`, `/buscar`, `/publica`, `/comunidad` en 200). Evidencia: revisión completa **44947348390
  VERDE sobre d7ef961, 21 trabajos, 0 rojas, 1 inestable (`evt6i`, ya arreglada: leía un aviso antes de que el servidor lo escribiera)**.
  Subieron: **dinero 9t8** (0207: la devolución de un patrocinio le pregunta a Stripe; «Un día más» con la clave del toque) y **las hojas de
  confirmar del Super Admin** (un solo título; cada hoja dice a quién le llega la nota). **El rojo de 9t8 (`rsvp9a`, `barr`) no era del producto:**
  `din9t6b` fabricaba una intención de plan con la llave `-i1` (el servidor escribe `-i0`), y al cambiar el reparto de carriles el barrido de
  planes chocó con ella (dirigida 44943966440: 50/50). Lo que destapó sí es del producto y está encargado: **9t9 (Opus, en curso, worktree
  propio, contenedores `tl9t9-*`):** en los barridos de dinero un elemento que falla no detiene a los demás, y ninguna selección con tope deja
  gente fuera (`barrerPlanes` elegía 50 planes sin orden ni filtro).
  **En la rama de trabajo, todavía NO en `main` (805468e + lo que sigue):** (1) las cinco notas que se pedían y nadie guardaba van a la
  auditoría (ed30bd6); (2) el CI ya no da «0 inestables» cuando no pudo leer un registro (3bfec03; la corrida 44947348390 dijo 0 con una);
  (3) la carrera de los avisos con SMS en `evt6i`, `evt6a`, `evt6d` (805468e); (4) **«Asignar a…» en Colas reventaba el servidor desde el 14
  nov** (un campo de JSON tras `||` sin paréntesis; lo cazó la prueba nueva `nota9u`, de Sonnet): arreglado con el guardián `jsonTrasConcatenar`.
  Falta: correr `nota9u` y `alreves9u`/`alreves9b2` en local, revisión dirigida 44951093908, subir.
  **Reparto de hoy (regla 14):** Opus escribió 9t8 y está con 9t9, y revisó aparte (solo lectura) a quién le llega cada nota de las 265
  «internas» (encontró 4 mal marcadas y 8 columnas que salen en «Descargar mis datos»: LAUNCH y REVISION); Sonnet escribió las hojas y `nota9u`;
  Fable diagnosticó el rojo, corrigió lo que encontró la revisión, el CI y las carreras, y revisó y corrió todo antes de subir.
  **Reglas nuevas:** una prueba que fabrica una fila la fabrica como la escribiría el servidor (misma llave, mismo estado); un contador del CI
  que no pudo leer no dice cero; lo delegado que toca a quién le llega un texto lo revisa otro modelo siguiendo el dato hasta su destino.
- **21 nov (noche, tarde) · `main` y `pruebas` = bb3842e, sandbox comprobado desde fuera** (estado-sandbox 44933387357: salud con commit
  bb3842e2, **0206 aplicada, 205 migraciones**, `/`, `/buscar`, `/publica`, `/comunidad` en 200). Evidencia: revisión completa **44927840579
  VERDE, 0 rojas y 0 inestables** (corrieron `din9t7` 39 ✓, `din9t7b` 44 ✓, `alreves9k` 38/38, `alreves6e`). Subió **dinero 9t7** (las
  devoluciones y reversiones atascadas le preguntan a Stripe; «Resolver a mano» pregunta antes y cierra la alerta en el acto si Stripe dice
  que sí salió). **Encargos en curso (worktrees desde 8aa46a0):** dinero 9t8 (Opus) y las hojas de confirmar del Super Admin (Sonnet, con el
  servidor local `:3100`). Al volver cada uno: fusionar, revisar, tipos/guardianes/Semgrep, **el carril de al revés entero**, pruebas contra el
  servidor, CI completo, subir.
- **21 nov (noche, más) · dinero 9t7 en la rama de trabajo (8aa46a0), todavía NO en `main` (`main` y `pruebas` = cc7b947, sandbox en 879c16b +
  documentos).** 9t7 = las devoluciones y las reversiones atascadas le preguntan a Stripe, y «Resolver a mano» pregunta antes de marcar
  (migración **0206**; Opus; quedó fuera la devolución del patrocinio). Revisado por Fable: tipos, guardianes, Semgrep 0, al revés, contrato con
  stripe-mock, 21 pruebas contra el servidor local. Prueba de navegador `din9t7b` (Sonnet, 44 ✓) y un arreglo que salió de ahí: la alerta se
  cierra en el acto cuando Stripe dice que sí salió. **CI:** la completa 44922339414 (5257f25) salió ROJA por dos pruebas al revés, ninguna del
  producto: `alreves9k` (el guardián `alertasDelDinero` quedó flojo: apretado) y `alreves6e` (un caso viejo: la prueba de contrato ahora llama
  dos veces a revertir); punta a punta y dispositivos, en verde. Corriendo: la completa **44927840579** sobre 8aa46a0. Verde con 3 inestables o
  menos → `git push origin <ese commit o el HEAD si solo hay documentos>:main …:pruebas` y comprobar en el sandbox que la 0206 quedó aplicada
  (205 migraciones). **Encargos en curso (worktrees desde 8aa46a0):** dinero 9t8 (Opus: contrastar y cerrar lo que quedó de 9t3–9t7, empezando
  por la devolución del patrocinio; base aislada) y las hojas de confirmar del Super Admin (Sonnet: un solo título y la nota que dice a quién
  le llega; tiene el servidor local `:3100`).
  **Regla para los encargos (nueva, de hoy):** quien toca un archivo corre TODAS las pruebas al revés que lo nombran (`grep -l` en
  `pruebas/alreves/`), no solo las de su tanda; y quien orquesta corre el carril de al revés entero antes de dar por buena una tanda que toque
  guardianes o la prueba de contrato.
- **21 nov (noche) · `main` y `pruebas` = 879c16b, sandbox comprobado desde fuera** (estado-sandbox 44919500455: salud con commit 879c16b1,
  **0205 aplicada, 204 migraciones**, `/`, `/buscar`, `/publica`, `/comunidad` en 200). Evidencia: revisión completa **44915220253 VERDE, 0 rojas
  y 0 inestables** (comprobado en los registros que corrieron `din9t6b` 46 ✓, `rev9u2` 46 ✓, `app8a`, `dm9t`). Subió lo que esperaba en la rama
  de trabajo: la hoja «Elegir cuál vale» con monto, fecha e id de cada opción (0205, Opus); su prueba de navegador `din9t6b` (Sonnet); el
  arreglo del texto largo que ensanchaba la pantalla en teléfono (filas del panel `Bloques.tsx` y piezas del Super Admin por el script de
  portado; guardián `textosLargos`; Sonnet); «Para mirar» elige entre las que siguen publicadas (causa de `rev9u2` inestable; Fable); la
  renovación cerrada por la consulta conserva la marca de la tarjeta (Fable). **En curso:** dinero 9t7 (devoluciones y reversiones atascadas:
  anotadas antes con su dato, consulta pasada la llave, «Resolver a mano» que pregunta antes), lo escribe Opus en su worktree desde ca5e556;
  al volver: fusionar, revisar (migración 0206, lo de dinero lo revisa Fable), tipos/guardianes/Semgrep/al revés, contrato con stripe-mock,
  `base.sh` + `servir.sh` y las `din9t*` + su prueba de navegador en local, CI completo, subir. **Pendiente para producción (sin cambios):** una
  confirmación completa (dos veces + barajada + anchos) con 3 inestables o menos; la causa del toque en el detalle del panel en iPad.
- **21 nov (tarde, más) · `main` y `pruebas` = 280ff61, sandbox comprobado desde fuera** (estado-sandbox 44912311667: salud con commit 280ff616,
  **0204 aplicada, 203 migraciones**). Evidencia: revisión completa **44908076139 VERDE, 0 rojas y 1 inestable** (`rev9u2`). Subió **dinero 9t6**
  (renovar una retención es una intención; «Elegir cuál vale» en las alertas `gateway_review`; lo escribió Opus, lo revisó Fable).
  **En la rama de trabajo (a40850c), todavía NO en `main`:** (1) la renovación cerrada por la consulta conserva la marca de la tarjeta;
  (2) `din9t6b`, la prueba de navegador de «Elegir cuál vale» (Sonnet): pasa en local y **falla en el CI dirigido 44908921751 en teléfono** por un
  desborde real (la pestaña Ingresos mide 459 px en una pantalla de 390: una cadena larga sin espacios en el detalle de una alerta; y una ficha de
  plantilla que no se parte) → arreglo encargado a Sonnet en el script de portado del sistema de diseño (`AdminRow`, `ReasonConfirm`), con el
  servidor local cedido; (3) la hoja con monto y fecha de cada opción (migración **0205**, Opus; revisado: tipos, guardianes, Semgrep, al revés
  161/161, `din9t6` 58 ✓ y `din9t6b` 42 ✓ en local); (4) «Para mirar» elige las cinco entre las que siguen publicadas (causa de `rev9u2`
  inestable; guardián y al revés hechos; **falta correr `rev9u2` y `rev9u` contra el servidor**). **Sigue:** recibir el arreglo del desborde,
  revisarlo, correr en local `din9t6b rev9u2 rev9u din9k` y las del admin, CI (completo, porque toca una pieza del sistema de diseño que usa todo
  el Super Admin), y subir.
- **21 nov (tarde, después) · `main` y `pruebas` = c704b47, sandbox comprobado desde fuera** (estado-sandbox 44905950003: salud con commit
  c704b47b, **0203 aplicada, 202 migraciones**, servicio de video reiniciado, `/`, `/buscar`, `/publica`, `/comunidad` en 200). Evidencia:
  revisión completa **44902103048 VERDE, 0 rojas y 1 inestable** (`app8a`, arreglada después en la rama de trabajo: esperaba poco). Subió:
  **dinero 9t5** (el servidor le pregunta a Stripe), **medios en flujo** (video sin 120 MB en memoria, fotos privadas en flujo) y el arreglo de
  la foto privada que colgaba el pedido. **En curso:** dinero 9t6 (lo que quedó de 9t5: retenciones con «sin respuesta», cerrar `gateway_review`,
  devoluciones atascadas) lo escribe Opus en su worktree; al volver lo revisa Fable (tipos, guardianes, al revés, `din9t6` y las de dinero contra
  el servidor local) antes del CI. **Sigue pendiente para producción:** una confirmación completa (dos veces + barajada + anchos) con 3 inestables
  o menos; la causa del toque en el detalle del panel en iPad (`dlv2f4`, la sonda sigue puesta).
- **21 nov (tarde) · la revisión completa 44892361124 (9t5 + medios en flujo, b7e4273) salió ROJA por dos pruebas: `dm9t` (25 min, se detiene) y
  `rev9u2` (30 s esperando la página).** Causa real, del producto: una foto privada que no está en el almacén dejaba el pedido colgado (el fetch
  de Next parte el cuerpo de un GET sin `signal`; `abrirObjeto` esperaba un cancel que no termina). Arreglado y con guardián (LAUNCH, «Una foto
  privada que no está en el almacén…»). Comprobado en local contra el servidor de verdad (base y almacén locales recreados: los contenedores de
  hace 9 días ya no arrancaban): `dm9t`, `rev9u2` y las otras nueve pruebas de fotos privadas en verde; tipos, guardianes, textos, al revés.
  **`main` y `pruebas` siguen en ab11fc0.** Sigue: revisión completa sobre el HEAD de la rama de trabajo; verde con 3 inestables o menos →
  `git push origin HEAD:main HEAD:pruebas` y comprobar en el sandbox que la 0203 quedó aplicada.
  **Regla para los encargos (nueva):** lo que toca una ruta servida se prueba contra el servidor de verdad (`pruebas/correr.mjs`), no solo con
  dobles; si el agente no puede levantarlo, lo dice y lo corre quien orquesta antes del CI.
- **21 nov (mediodía) · `main` y `pruebas` = ab11fc0, sandbox comprobado desde fuera** (estado-sandbox 44892363540: commit ab11fc04, migración
  0202 aplicada, 201 migraciones, salud OK, `/`, `/buscar` y `/publica` en 200). Evidencia: revisión completa **44888202039 VERDE, 0 rojas y 0
  inestables**. Subió: dinero 9t4, «código escrito manda» (Publica, pago del pedido, boletos), `push8c`, teléfonos de prueba 570-555, `plan4f`,
  la sonda de `dlv2f4`. **Todavía NO en `main` (rama de trabajo = b7e4273):** dinero 9t5 (0203) y «medios en flujo»; su revisión completa es la
  **44892361124** (la 44889132454 salió roja solo por Semgrep: `veredicto` metía el nombre de la tabla del parámetro en el SQL; cerrado con una
  lista fija). Si sale verde con 3 inestables o menos: `git push origin b7e4273:main b7e4273:pruebas` (o el HEAD si solo se añadieron
  documentos) y comprobar en el sandbox que la 0203 quedó aplicada.
- **21 nov (media mañana) · cómo se llegó (lo de abajo ya subió, salvo 9t5 y medios en flujo):**
  - **Rama de trabajo = ab11fc0.** Lleva, en orden: la fusión de **dinero 9t4** (planes del Hogar, rentas y patrocinios con el cobro anotado;
    migración **0202**; lo escribió Opus) · la **sonda de `dlv2f4`** (12 aperturas del detalle del panel entre 1024 y 1199; ver LAUNCH) ·
    **«código escrito manda»** (Publica, pago del pedido y boletos: un código escrito sin «Aplicar» ya no se pierde ni cobra precio completo
    callado; guardián `codigoEscritoManda`, al revés `alreves9tpromo` 18/18; lo escribió Fable y lo revisó Opus aparte) · `push8c` espera al
    service worker activo · teléfonos de prueba 570-555 en `din9t…din9t4` (guardián `telefonoDePrueba555`) y `plan4f` rechaza un período sin cobrar.
  - **CI:** la revisión completa de 9t4 sola (44884103116) salió **ROJA** por dos pruebas, no por el producto (`din9t4`: teléfono con un dígito
    de menos; `plan4f`: reusaba un período ya cobrado); arregladas en ab11fc0. Corriendo: **44888202039** (completa sobre ab11fc0) y
    **44885700254** (completa con anchos sobre 98af974: saldrá roja por `plan4f`, sirve para leer la sonda bajo carga). Si 44888202039 sale
    verde con 3 inestables o menos: `git push origin ab11fc0:main ab11fc0:pruebas`, comprobar el sandbox (`estado-sandbox.yml`, que la 0202 esté
    aplicada) y anotarlo aquí.
  - **Dinero 9t5 FUSIONADO en la rama de trabajo (0537f12 y lo que sigue), sin CI todavía:** «preguntarle a la pasarela» (`lib/consulta-pasarela.ts`,
    `gateway_checks`, alerta `gateway_review`, `sent_at` en Pro, migración **0203**) y «ya cobrado no se queda mudo». Aquí: tipos, guardianes,
    textos y `alreves9tdinero` 126/126. Falta: su revisión completa en el CI (din9t5, din9t4, din9t3, plan4f, renta4f, pat002, pat003 y la prueba de
    contrato con stripe-mock, que el agente no pudo correr), y después `main`/`pruebas`. Lo que quedó: LAUNCH «lo que quedó de 9t5».
  - **«Medios en flujo» FUSIONADO en la rama de trabajo, sin CI todavía (sin migración):** el video del negocio por disco y en trozos (+612 MB →
    +25 MB medidos con `scripts/carga/memoria-medios.mjs`), cupo de videos a la vez (`lib/topes.ts › tomarCupo`), el servicio de video contesta
    en binario (`services/video/app.py`: el despliegue lo reconstruye con `up -d --build video`), `lib/entrega-privada.ts` (flujo + ETag/304,
    siempre `private, no-store`). Aquí: tipos, guardianes, `medios9tflujo` 41 ✓, `alreves9tflujo` 15/15. Falta en el CI: `vid001` con ffmpeg de
    verdad. En el sandbox: subir un video real y mirar la memoria del contenedor.
  - **Ningún agente en curso.**
  - **Sin resolver:** el toque que no entra en el detalle del panel en el iPad (`dlv2f4`, `pro4l2`): la sonda corrió 24 aperturas sin fallar
    en una corrida sola (la ventana mide 70..742, se desplaza 269 de 371 y el toque entra); falta cazarlo bajo carga. `rev9u` sin confirmar.
- **21 nov (mañana) · al día:**
  - **OJO (21 nov, visto después):** la confirmación 44856657972 salió verde en el CI pero tuvo **4 inestables** (push8c, rev9u, cre9h, dlv2f4). Por la
    decisión AG (más de 3 = roja) NO vale como confirmación para producción: el CI contaba el tope por parte, no por corrida. Arreglado en
    `ci.yml` (el trabajo «tuberia» cuenta las de toda la corrida; guardián `tuberiaNoSeSalta`). El sandbox no se toca (le basta la revisión
    rápida, decisión AF). Hace falta otra confirmación completa con 3 o menos antes de hablar de producción.
  - **Antes (madrugada): `main` y `pruebas` = dbd3130** (confirmación completa **44856657972 VERDE** sobre 207fef9: dinero 9t, fotos privadas F3 con la migración
    0197, tope de cuenta nueva solo para públicas, doble toque del panel, `?w=` de las privadas, `correo2q`). Cerradas 27 líneas «9 dispositivos»
    de LAUNCH (queda la de 7f, que además pide correr `msg2p` con El Compa apagado). Inestables anotadas en LAUNCH: push8c, rev9u, cre9h, dlv2f4.
  - **`main` y `pruebas` = 59676bd, sandbox comprobado desde fuera (200 migraciones, hasta la 0201):** dinero 9t2 (0198) y 9t3 (0199), copias por
    texto de una foto quitada (0200), zona horaria de la ciudad validada (0201), pareja Desde/Hasta, bloque «Fotos a la medida» del Super Admin
    (F4), `?w=` de las privadas, **zoom al escribir (16 px en táctil; medido en el sandbox con `scripts/sandbox/pesar-fotos.cjs`)**, visor de
    retenidas (410 con permiso y sin archivo), tope de inestables por corrida. Evidencia: CI completo 44872463837 (todo verde y 0 inestables
    salvo vid001, rev9u2 y fot9uadmin, arregladas y verdes en las dirigidas 44875887036 y 44876495491) + los al revés tocados corridos aquí.
    Capturas nuevas aprobadas: solo `pruebas/visual/buscar/` en táctil (REVISION).
  - **Sin resolver:** `pro4l2` como requisito no puede tocar «Pasó la consulta» (dejó roja la programada 44851886841 sobre `main` por `ayu4m`);
    causa desconocida, el registro ya dirá el motivo.
- **21 nov (madrugada) · dónde quedó cada cosa, para retomar:**
  - **En la rama de trabajo (207fef9), todavía NO en `main`/`pruebas`:** dinero 9t (Opus, rama `dinero-9t`: `devolverPago` en dos pasos, barrido
    `barrerDevolucionesPago`, `decidirSop` por caso, Anular con candado, disputas con estado en el `where`; prueba `din9t`), fotos privadas F3
    (Opus, rama `fotos-f3`: `privado/o/`, ruta `/api/medios/privada/[id]`, `lib/fotos-privadas.ts`, migración **0197**, 5 catálogos validan contra
    `media`, `purgarFotosAyuda` en el barrido, tope de cuenta nueva solo para públicas) y el arreglo de `correo2q` para la segunda vuelta.
    Fable revisó las dos entregas y corrió tipos, guardianes, textos y sus al revés (22/22 y 49/49).
  - **CI:** la confirmación completa 44847327303 (b66f22e) salió ROJA: seis pruebas por el tope de fotos de cuenta nueva al correr dos veces
    (cit3e, ayu4g, res4s, tra4y2, noc4d, pre4e; adm4y por depender de tra4y2) y `correo2q` por la llave del correo de mesa. Las dos causas están
    arregladas. Corre la confirmación nueva **44856657972** sobre 207fef9 (incluye además el doble toque del panel, de Sonnet, y `?w=` en las fotos privadas): si sale verde → `main` y `pruebas`, `estado-sandbox`, y
    `python3 $S/cerrar9.py 44856657972` para las 28 líneas «9 dispositivos» de LAUNCH. La subida real de una foto privada y su ruta solo se
    prueban en el CI (aquí no hay almacén).
  - **Agente en curso:** Opus en `dinero-9t2` (los nueve puntos de «Dinero por clase, 21 nov» de LAUNCH; si necesita migración es la 0198).
    Al volver: revisar, fusionar, tipos/guardianes/textos, CI. **Ya fusionado:** Sonnet, `panel-doble-toque` (`pasoSrv` y la pieza `Paso` en
    `packages/ui/src/panel/Bloques.tsx`, `c.run` devuelve si guardó, guardián `pasoQueSuma`, prueba `toque9t` que solo corre en el CI), revisado
    por Fable; y `?w=` de las fotos privadas en `packages/ui/src/foto.ts` (Fable).
  - **Pendiente de F3 (LAUNCH):** plazo de retención y acceso del equipo sin caso abierto esperan al fundador (REVISION, 21 nov).
- **20 nov (tarde) · dónde quedó cada cosa, para retomar:**
  - **Fotos a la medida (decisión AI):** F1+F2 en `main`, `pruebas` y el sandbox (commit 2963479, migración 0195 aplicada; visto desde fuera con
    `estado-sandbox`). Falta la medida con fotos de cámara reales del fundador (REVISION), F3 (privadas con `?w=`) y F4 (bloque del Super Admin).
  - **20 nov (noche) · al día:** R1+R2 de la revisión de fotos + la corrección de privadas (`fotos-r1b`) + la caché de paquetes del CI están en
    `main`, `pruebas` y el sandbox (acecb47, CI 44831568174 verde, migración 0196 aplicada). R3 (pantallas, Sonnet, rama `fotos-r3`) fusionada
    en la rama de trabajo (3d87e69) y esperando su CI 44835545111. La auditoría del dinero y el panel entraron antes (764ef85). El Inicio está
    en PAUSA: el fundador descartó dos rondas (código real A/B/C y maquetas Reel/Muro/Conversación) y traerá referencias.
  - **Revisión automática de fotos (decisión AJ, plan `docs/diseno/plan/fotos-revision-automatica.md`):** R1+R2 hechas por Opus en la rama local
    `fotos-r1` (migración 0196, `lib/fotos-decision.ts` pura, `lib/fotos-revision.ts`, `lib/fotos-segunda-opinion.ts`, visor `/api/medios/revision/[id]`).
    Revisada por Fable y DEVUELTA con tres correcciones antes de fusionar: (1) `destino=privado` en la subida para que una foto que va solo a un
    negocio nunca llegue a la segunda opinión (marca en `media`, comprobada dentro de `esPublica`); (2) la pauta ya no rechaza carteles ni volantes;
    (3) pie de commits. Después: fusionar, correr todo, R3 (Sonnet: estado y «Pedir revisión», Auto-moderación, reporte diario, ayuda), CI, sandbox.
  - **Auditoría del Super Admin en la transacción del cambio** (devoluciones, conciliación, planes, Ayuda con monto, disputas; Opus, rama
    `auditoria-tx` ya fusionada en la rama de trabajo) y **panel: la llave de un paso es su rótulo**: verificadas aquí (tipos, guardianes, al revés,
    dep4c en el navegador); esperan la revisión rápida del CI para ir a `main`/`pruebas`. Cuatro riesgos de dinero vistos de paso → LAUNCH (9t).
  - **CI:** tres corridas del día cayeron en la instalación de paquetes del entorno (no en pruebas de la app). Lo último visto (44807211977): el
    candado de dpkg lo tenía OTRO apt-get y nuestro apt ni empezó → ahora se espera al apt del sistema (hasta 15 min, diciendo quién lo ocupa) en vez
    de matarlo. Es hipótesis hasta leer el aviso «apt del sistema ocupado» en la corrida 44814175223. Guardián nuevo `alrevesConSuTexto`
    (`node pruebas/alreves/textos.cjs`, 8 s): un caso al revés que ya no encuentra su texto se ve aquí, no en el CI 40 min después.
  - **Diseño paso a paso (pedido del fundador, 20 nov):** las variantes se construyen con el código real en una rama aparte y se le enseñan en un
    artifact con capturas de teléfono y escritorio; solo la elegida entra. Primera ronda: tres variantes del Inicio (A «Ahora mismo», B «¿Qué
    necesitas hoy?», C «La guía de tu ciudad») en la rama local `diseno-inicio`, ruta `/diseno/inicio/[v]` (Sonnet). Capturas con fotos:
    guion `capturar.cjs` del scratchpad (entrega las fotos de Pexels a la página; `images.pexels.com` se añadió a los hosts del entorno).
  - **Pendiente sin causa todavía:** `dlv2f4` en el iPad horizontal (WebKit) no pudo tocar «Aceptar» dos veces (LAUNCH → 9t, con diagnóstico nuevo).
- **9t · 24 px en el escritorio y 44 en el resto (20 nov):** AA 2.5.8 exigido a 1440 en las pantallas clave y el Super Admin (a11y9c); buscador del
  escritorio a 24 (TACTIL `T24`), reseñas «Útil/Editar/Reportar» a 44, 82 controles con forma de enlace (botones y role=link/button) a `min-h-11`; guardián botonTextoConAlto (lee la etiqueta entera, aunque el onClick lleve «=>»).
- **9t · confirmación 44685003383 (20 nov) cazó 4 más, todas de pruebas o del iPad:** (1) pat003 esperaba los días de un patrocinio por la duración
  y ponía «ahora + 7 días» (el producto termina a medianoche) → fixture como el producto y `patrocinio_dias_comprados` (patrocinioDiasPorCalendario
  ahora también mira pruebas/e2e); (2) vec9m medía contra 390 fijo → contra el viewport del dispositivo; (3) el goto de WebKit sin «load»
  devolvía null → devuelve la respuesta del documento (gotoDevuelveRespuesta; neg9n20 en el iPad); (4) el tope de 12 MB se probaba con un fetch
  de 13 MB armado en WebKit, que llega a medias (400) → `pruebas/lib/subida-cruda.cjs` desde Node (msg9t, dm9t) y la app avisa antes de subir
  (`TOPE_FOTO` en `lib/subir-foto.ts`; topeFotoSinNavegador). alreves9tsubida 12/12. Los CI dirigidos 44704998727/44707074106 cazaron dos
  más: pat003 en la pausa (mismo arreglo, por calendario) y msg9t en el iPad/SE: la foto se ponía en el input escondido del chat recién cargado y
  la miniatura no salía → `pruebas/lib/elegir-foto.cjs` elige como una persona (toca «Agregar una foto», selector, archivo; si no se sube, dice el
  status) en el chat y en el panel (fotoComoPersona; alreves9tsubida 15/15). CI dirigido 44726480909: iPad, SE y 1024 en verde.
- **9t · confirmación 44658035571 (20 nov) cazó 4 clases, arregladas con guardián y al revés:** (1) a11y9c medía la bienvenida de /entrar en vez de
  /comunidad (Marisol sin Comunidad en una base nueva) → precondición propia + «es la pantalla pedida» + letra grande restaurada en un finally (por
  eso caía apt4f después); (2) OnbTopBar con botones de 44 pedía 405 px en la celda de grid de Entrar → la página se ensanchaba y «Continuar» quedaba
  fuera (vec9m) → `minWidth: 0` por la tabla TACTIL, vec9m mide el ancho; (3) Noche ofrecía esta noche horas a ahora + 15 que enviar() rechaza hasta
  + 19 → `MESA_CERCA_MIN` 20 (guardián nocheHorasQueSeEnvian, alreves9tnoche); noc4c contaba horas duplicadas (tira de teléfono y escritorio); (4)
  dinero: patrocinio «hoy» comprado en la última hora contaba 6 días → devolvía el precio entero → 0194 `patrocinio_dias_comprados` por el calendario
  de la ciudad (guardián patrocinioDiasPorCalendario, alreves9tpatrocinio, pat002 lo comprueba a las 11:30 PM).
- **Fase 3 · Belleza COMPLETA (6 nov):** 3a (servicios y reglas de citas) 3b (ficha › Servicios, hoja, Booking con depósito, motor de disponibilidad) y 3c (Tu cita completa: otra hora, cambiar, cancelar con devolución, voy tarde, vencer, recordatorios, hora libre, calificar; Panel › Hoy/detalle/Clientes de citas; Mi cuenta; `lib/citas-flujo.ts`, `lib/citas-panel.ts`, migración 0045) hechos. 3d (página de la silla, cuenta de cobro propia de cada silla rentada, reseñas «Con Kelvin»; migración 0046, semilla 0012, `lib/sillas.ts`) y 3e (Ayuda con la cita con fotos, respuesta del negocio con decisión y devolución del depósito, revisión de To'Latino; Admin › Transacciones › Citas; migración 0047, `lib/ayuda-cita.ts`) hechos. **Fase 4 · Las otras 14 categorías en curso**, empezando por Hogar + Auto: plan en `docs/diseno/plan/fase4-hogar-auto.md` (bloques 4a–4g). 4a hecho (servicios con forma de cobrar `svc_kind`/`svc_attrs`, Tu herramienta `trade_settings`, depósito por forma y trabajo grande, filtros derivados, Super Admin; migración 0048, semilla 0013 generada con `scripts/semilla/extraer-hogar-auto.cjs`, `lib/oficios.ts`, `app/panel/Oficios.tsx`). 4b hecho (ficha › Servicios con Tu vehículo / Tu casa y compatibilidad, Booking `/n/{id}/visita` con franja de 2 h en Hogar, depósito por forma, permiso del landlord; `lib/oficios-publico.ts`, `lib/visitas.ts`, migración 0049). 4c hecho (la cita/visita en curso: Auto recibido · trabajando · listo · entregado; Hogar en camino · llegué · trabajando · terminé · no había nadie; el cliente cierra con «Ya lo recogí» / «Todo bien»; panel con los datos del carro o la casa; migración 0050). 4d hecho (estimado / precio completo línea por línea con plantillas, «algo más» con foto, lo final que solo baja, retención solo de lo aprobado, liquidación con captura parcial y liberación, renovación de retenciones de más de 7 días, impuesto en datos `tax_rules`; migración 0051, semilla 0014, `lib/estimados.ts`, `app/panel/Estimado.tsx`, `cita/[num]/EstimadoCliente.tsx`). 4e-1 hecho (pre-estimado con fotos: pedir, responder con rango / hay que verlo / no lo hacemos, vencer a las 24 h y mandar otra vez, reservar con él y compararlo con el estimado; migración 0052 `service_requests` + `request_targets`, `lib/solicitudes.ts`, `/n/{id}/preestimado`, `/pre/{num}`). 4e-2 hecho (presupuesto a hasta 3: candidatos Pro por tipo de trabajo y zona, 48 h, comparar, reservar la visita de uno y cerrar los otros con aviso; `/n/{id}/presupuestos`). 4e-3 hecho (emergencia 24/7: a todos los Pro con 24 h que hacen ese trabajo y llegan; el primero que acepta la toma sin carreras y se vuelve visita «en camino»; 15 min → nadie disponible; `/emergencia`, panel arriba en Hoy). 4f-1 hecho (planes del hogar: día fijo mensual o meses fijos, hoy $0, cobro fuera de sesión cada mes con comisión, visitas como citas de $0, saltar/pausar/reanudar/cancelar, reintentos del banco y cambiar la tarjeta; migración 0053, semilla 0015, `lib/planes.ts`, `/n/{id}/plan`, `/plan/{num}`). 4f-2 hecho (renta de herramienta: pestaña Tienda, apartar 48 h con la unidad bloqueada, «La recogió» con renta cobrada y depósito retenido, «Un día más», tarde del depósito con captura parcial, daño con foto que decide el cliente o la cola «Daños de rentas» del Super Admin, tarjeta rechazada y cambio, vencer, renovar el depósito, interruptores en Tu herramienta; migración 0054 `rentals`, semilla 0016, `lib/rentas.ts`, `/n/{id}/rentar`, `/renta/{num}`, `app/panel/Rentas.tsx`). 4f-3 hecho (apartar productos: la Tienda de Auto y Hogar con hoja ¿cuántos?, Tu apartado en el teléfono, 3 pasos, unidades reservadas, la tienda confirma / falta uno / no lo tiene, guardado 48 h, lo recogió, vencer, cancelar, gomas por medida; migración 0055, semilla 0017, `lib/apartados.ts`, `/n/{id}/apartar`, `/apartado/{num}`, `app/panel/Apartados.tsx`; guardianes barraDoble y parametroSinTipo). 4g-1 hecho (reseña de Hogar y Auto: dato de la visita guardado por el servidor, preguntas por rubro, ≤2 ★ → Ayuda, marcas en la tarjeta). 4g-2 hecho (ayuda con la visita y con la cita: motivos por rubro, foto obligatoria, devolución de lo cobrado en la app; migración 0056; guardián rubroComoBooleano). 4g-3 hecho (Super Admin › Transacciones con Planes, Rentas y Apartados; Mi cuenta con su sección). **Hogar + Auto completos.** **Doctores + Profesionales en curso** (plan `docs/diseno/plan/fase4-salud-pro.md`, 4h–4m): 4h-1 hecho (migración 0057: formas de cobrar, health_settings, pro_settings, catálogo de seguros de PA, licencias de salud y de persona, user_insurances; editor de servicios con «Cómo lo cobras»; semilla 0018 con 192 servicios). 4h-2 hecho (Tu herramienta: «Seguros e idiomas» de Doctores y «Licencias y el total por escrito» de Profesionales, cada toque se guarda; filtros derivados `recalcularFiltrosSP`; Super Admin 360 › Lo que vende en solo lectura; `lib/salud-pro.ts`, `app/panel/SaludPro.tsx`; guardián pestanaVende). 4h-3 hecho (SU LICENCIA de cada profesional del equipo con su número, cola y 360 con la persona, filtro «El médico habla español» de licencias verificadas; Super Admin › Catálogo › Seguros (ocultar con motivo); Mi cuenta › Mis seguros con solo los últimos 4; `lib/mis-seguros.ts`, `lib/nombre.ts`; guardián nombreConTitulo). 4i hecho (ficha de Salud: Servicios con el precio según tu seguro, «Tu seguro» con cuenta o solo esta visita, compatibilidad que nunca bloquea, hoja con IMPORTANTE y ¿Con quién? solo con licencia verificada, sin cita con espera fresca, Resumen con datos y cómo funciona; `lib/salud-compat.ts`, `lib/salud-publico.ts`, `app/(app)/n/[id]/Salud.tsx`). 4j-1 hecho (Booking de Doctores `/n/{id}/consulta` en 3 pasos; `lib/citas-salud.ts` sobre el motor de citas, solo profesionales con licencia verificada; motivo y nota CIFRADA en `op_private` (migración 0058, `lib/cifrado.ts`, DATOS_SECRET); avisos neutros `sal_*`; la cita de Salud en `/cita/{num}`; guardián privacidadSalud). 4j-2 hecho (panel con seguro, motivo y nota descifrada solo ahí; «No aceptamos su seguro» → el paciente elige en 2 h o se libera sola; seguir sin seguro; avisos neutros en todo el flujo (migración 0059, mapa SAL_C/SAL_N); notas borradas a los 30 d). 4k hecho (ficha de Profesionales: el TOTAL honorario + gobierno, notas legales y no legales, hoja con EL TOTAL y ¿con quién? con su licencia, Resumen con datos y cómo funciona; `lib/pro-publico.ts`, `app/(app)/n/[id]/Pro.tsx`). 4l-1 hecho (la consulta: `/n/{id}/tramite` en 3 pasos con licencia, modo, situación y nota cifrada; `lib/citas-pro.ts` sobre el motor de Salud (`prepararSP`); avisos a la oficina sin el trámite (migración 0060); la consulta en `/cita/{num}` y en el panel). 4l-2 hecho (el total por escrito: migraciones 0061–0062 `written_totals` con versiones, aceptación con hora/versión/IP inmutable y suma garantizada por la base; `lib/total-escrito.ts`; panel «Pasó la consulta» → «Mandar el total» → «Terminó el trámite»; cliente aceptar con extras / no contratar; vence a 30 d). 4m-1 hecho (reseña de Doctores y Profesionales: dato de la cita sin plan ni número de seguro, total por escrito, preguntas por rubro, filtro de datos de salud o del caso `lib/resenas-filtro.ts` en servidor y teléfono, marcas, «Lo que importa en Salud / en un trámite» con 6 barras; guardián resenaPrivada). 4m-2 hecho (ayuda con la cita de Doctores y con el trámite de Profesionales: motivos por rubro, «corregir el cobro a mi seguro» y «terminar lo acordado», fotos PRIVADAS `/api/ayuda/foto` con permiso y auditoría que se borran del almacenamiento a los 90 días, avisos neutros de Salud, «ley» → licencias a revisión; migración 0063, `lib/ayuda-motivos.ts`; guardián fotoAyudaPrivada). 4m-3 hecho (Super Admin › Transacciones con pestañas Doctores y Profesionales: Doctores sin servicio, motivo ni nota, solo si el seguro se aceptó; Profesionales con el total por escrito y el paso; Analítica › Doctores y Profesionales con seguro aceptado, «no aceptamos su seguro», no llegó, tiempo de respuesta, consulta → contrató, «cobró el total» y motivos de ayuda, solo cifras; ayuda de El Compa: total-por-escrito, licencias-que-puede-hacer, privacidad-de-datos-de-salud). **Doctores + Profesionales completos.** Configuración de sus plazos (2 h seguro, 30 d total, 24/48 h ayuda, días de borrado) llega con Configuración (Fase 5). **Mercados + Tiendas en curso** (plan `docs/diseno/plan/fase4-mercados-tiendas.md`, 4n–4s): 4n-1 hecho (migración 0064: `shop_kind`, EBT, 21+ solo en tienda, `item_variants` tallas, `retail_settings`, envío por correo, comisión `merc`; semilla 0019 con 15 mercados y 16 tiendas generada por `scripts/semilla/extraer-mercados-tiendas.cjs`; Tu herramienta «Balanza y pedidos» y «Tallas y apartados» con filtros derivados `lib/retail.ts`; 360 › Lo que vende de Mercados y Tiendas; comisiones de Planes/Rentas/Mercado ya se pueden cambiar en Super Admin). 4n-2 hecho (Lo que vendes › Productos: el constructor del Menú con module shop — cómo se vende, tallas que entran en 0 y se quitan sin borrarse, EBT, 21+ siempre solo en la tienda, solo en la tienda; guardián productosModulo). 4n-3 hecho (envío por correo de Tiendas en Tu herramienta). **4n completo.** 4o hecho (ficha de Mercados: Productos con /lb, hoja con estimado y corte/punto, carrito de un mercado a la vez, «¿Lo pesan delante de ti?»). 4p hecho (pedido del mercado: migración 0065 con `final_cents` calculado por la base y foto obligatoria por línea pesada, `lib/mercado.ts` crear/aceptar/pesar/no hay/sustituto con OK/mandar/«Está bien, cobrar» con captura parcial de lo real/listo/entregado/vencer/reparar, `/n/{id}/mercado`, `/mercado/{num}`, Panel › Hoy › Pedidos del mercado con pesar y foto, Super Admin › Transacciones › Mercado, Mi cuenta › Pedidos; `repararPagos` ya no captura completo un pedido por peso; guardianes capturaMercado y detalleEnRuta). 4q-1 hecho (Tiendas: pestaña Productos, talla obligatoria y reservada, horas de Tu herramienta 24/48/72, «Falta esa talla · ofrecer otra»; migración 0066; guardián horasApartado). 4q-2 hecho (envío de la tienda: se retiene al pedir, se cobra lo que se envía al marcar «Enviado» nunca más de lo retenido, seguimiento, entregado, liberar si no pasa; migración 0067; guardianes capturaMercado ampliado y sumaSinTipo). 4r hecho (layaway: acuerdo por escrito inmutable con IP y versión, abono retenido → cobrado al confirmar, pagar en la app o en la tienda sin cobros solos, atraso, cancelar con lo abonado menos el cargo; migración 0068, `lib/layaway.ts` + `layaway-comun.ts`; guardián layawayAceptado). 4s hecho (reseñas de Mercados y Tiendas con dato del pedido/apartado y «Lo que importa»; ayuda con el pedido y con la compra sobre el motor de la ayuda con la cita; migración 0069; Super Admin › Analítica › Mercados y Tiendas y Transacciones con talla, envío y plan; /mercado compacto y guardián barraFijaCompacta ampliado). **Mercados + Tiendas completos.** **Fiestas + Transporte en curso** (plan `docs/diseno/plan/fase4-fiestas-transporte.md`, 4t–4z): 4t hecho (migraciones 0070–0071: formas de cobrar de Fiestas `pack hora unid fijo visita cotiza`, `fiesta_settings` con depósito, invitados, eventos por día, días que aparta y días para cancelar gratis, `party_days` manual/reserva, `user_event_plans`; Tu herramienta «Calendario y depósito» `app/panel/Fiestas.tsx`; filtros derivados con fechas reales «Libre este sábado / domingo / el sábado siguiente» que cambian a medianoche; semilla 0020 con 26 negocios; guardián fechaFijaTaxonomia). 4u hecho (migración 0072: «Tu fecha» con solo el día; la ficha de Fiestas `lib/fiestas-publico.ts` + `app/(app)/n/[id]/Fiesta.tsx`: Tu fecha con semáforo, servicios con «Libre/Ocupada el …», hoja con INCLUYE y «Pedir la fecha» / «Ver otra fecha», Resumen con la línea, hechos y cómo funciona, riel y barra, FAQ automática; sin cuenta la fecha vive en el teléfono y pasa a la cuenta al entrar; Buscar › Fiestas con el chip «Tu fecha»; el texto del depósito de Belleza/Hogar/Auto corregido a «se retiene al enviar» con el guardián depositoRetenido). 4v-1 hecho (migración 0073: fiesta `party` F-5101…; `lib/fiestas-reservas.ts` pedirFecha con candado por día, depósito retenido y cobrado al confirmar, confirmar ocupa el día y declina sola las demás del día lleno, otra hora, no puedo, vence a 24 h, cancelar por días, el negocio cancela con motivo, terminó, barrido; Booking `/n/{id}/fiesta`, `/fiesta/{num}`, Panel › Hoy › Fiestas; arreglo de repararPagos con change_proposed y guardián reparaVivas). 4v-2 hecho (Mi cuenta › Citas y reservas con las fiestas; Super Admin › Transacciones › Fiestas con depósito, acuerdo y quién canceló; guardián candadoFiesta). 4w hecho (migración 0074: svc_kind asiento/priv/caja, `trans_settings`, `trip_runs` con «quedan» derivado, licencias de Transporte, comisión `viaje`; `lib/transporte.ts` + `transporte-comun.ts`: tipo por subcategoría, salidas del día al vuelo, vendidos en la oficina, «No sale», filtros derivados; editor de servicios rubro `trans`; `app/panel/Transporte.tsx`; Super Admin 360; semilla 0021 con 10 negocios y licencias; guardián asientosDerivados). 4x hecho (ficha de Transporte: `lib/trans-publico.ts` + `app/(app)/n/[id]/Viaje.tsx`, precio cerrado con lo que incluye, la próxima salida con asientos, licencia verificada o «en revisión» según el tipo, caja con sale/llega, FAQ por tipo). 4y-1 hecho (migración 0075: viaje `trip` V-9101…, `run_seats` y avisos; `lib/viajes.ts`: asiento o vehículo completo, total retenido → cobrado al confirmar, asientos con candado por salida (la última plaza no se vende dos veces), otra salida / otra hora, no hay cupo, vence, cancelar ≥24 h devuelve todo y <24 h cobra la mitad, va tarde / salió / llegó, Abordó / No llegó, el negocio cancela la salida y devuelve a todos; Booking `/n/{id}/viaje`, `/viaje/{num}`, Panel › Hoy › Viajes y Salidas `app/panel/ViajesPanel.tsx`; Mi cuenta con los viajes; la cifra «Esperan tu respuesta» suma fiestas, viajes y mercado con el guardián esperanCuentan). 4y-2 hecho (migración 0076: media 'trip', motivo 'destinatario' en op_private, avisos de envío y precio; caja con 1–4 cajas, recogida y DESTINATARIO cifrado que no sale en avisos ni vistas públicas, pasos recogida → salió con rastreo → entregada; mudanza con fotos privadas, hoy $0, el negocio manda el precio cerrado (written_totals, 48 h, versiones), el cliente acepta con tarjeta = retener y cobrar, «No, gracias», vence; `lib/envios.ts`; dueños de prueba Yolanda y Ramón en la semilla 0021). 4y-3a hecho (Super Admin › Transacciones › Viajes; «Devolver» de viajes y fiestas con el guardián devolverCoincide). 4y-3b hecho (migración 0077: el chofer de la salida es un repartidor del equipo, `lib/chofer.ts`, Panel › salida › Chofer, /repartidor › Tus salidas con Abordó/Salió/Llegó; aviso automático «tu salida todavía no sale» una sola vez). Barrido central hecho (0078 `system_jobs`, `lib/barrido.ts` corre las 15 tareas con un candado, POST /api/interno/barrido con BARRIDO_TOKEN del entorno, servicio «barrido» en el docker-compose del sandbox, nginx bloquea /api/interno, guardián barridoCompleto). 4y-4 hecho: renta de vehículos (0079 licencia revisada y odómetro en rentals; semilla 0022; pestaña «Rentar» en la ficha de Transporte; panel con licencia + 21 y millas, millas de más por el camino del daño). 4z-1 hecho (reseñas de Fiestas y Transporte con dato de la reserva, preguntas, marcas y «Lo que importa»). 4z-2 hecho (ayuda con la fiesta y con el viaje sobre el motor de ayuda-cita, migración 0080, «manejo inseguro» directo y con prioridad; guardián detalleSinBarra). 4z-3 hecho (Analítica › Fiestas y Transporte; guardián pestanasAnalitica; docs del negocio). **Fiestas + Transporte completos.** Las colas «Salidas canceladas» y «Retenciones que fallaron» quedan anotadas para Configuración/colas (Fase 5): hoy se ven en Transacciones y Analítica. Grupo **Noche** (plan `docs/diseno/plan/fase4-noche.md`): **4na hecho** (migración 0081 `noche_settings` + `night_posts` solo inserción + licencia `pa_plcb` + comisión `noche`; `lib/noche.ts` y `lib/noche-comun.ts`; Panel › Lo que vendes › «Esta noche» con cada toque en el historial, la fila desde Hoy, editor de servicios de Noche (entrada que sigue al cover, lista, mesa con cuántas hay, VIP, noche especial, por fecha); tarjeta y filtros derivados recalculados por el barrido (tarea `noche`); Super Admin 360 › Lo que vende con «Esta noche» en solo lectura, historial y tipo del local; semilla 0023 con dueño de prueba Héctor 5705550366 en La Terraza; guardianes coverConHistoria, filaNoFalsa, alcoholNoSeVende). **4nb hecho** (`lib/noche-publico.ts` + `n/[id]/Noche.tsx`: tarjeta de esta noche y de la fila con su hora real, pestaña «Esta noche»/«Mañana viernes»/«Para tu fecha», Entrada y Lista que siguen a la herramienta, hoja con personas y depósito, FAQ y licencia de licor; DJ y promotor «Por contrato» sin horario ni dirección). **4nc hecho** (migración 0082: `night_seq` N-7101, `night_date`, `door_code` único por local y noche, avisos; `lib/noche-reservas.ts`: lista $0 al instante con código, mesa con depósito retenido → cobrado al confirmar, otra hora, no hay mesa, vence (barrido `nocheReservas`), cancelar antes/después del corte con la hora real, la puerta (entraron, no llegaron, sin identificación), el local cancela con devolución completa, «pasó la noche» a las 6 AM, SMS si sube el cover; pantallas `/n/[id]/noche` (3 pasos) y `/noche/[num]`; Mi cuenta; Panel › Hoy (esperan, mesas de esta noche, la lista para la puerta con búsqueda) y detalle; guardianes coverNuncaEnLaApp, depositoNoche, mesasSinSobreventa, codigoPuerta, sinImagenDeID, nocheCruzaMedianoche; prueba de carrera: 3 clientes por la última mesa VIP → 1). **4nd hecho** (reseña verificada de una noche con entrada: preguntas de noche, dato de la reserva, «Lo que importa de noche» y marcas en la tarjeta; Ayuda con la noche sobre el mismo motor: migración 0083 (cover, lista, mesa, minimo), «No me descontaron el depósito» con foto del recibo, «Me sentí inseguro» directo a To'Latino con prioridad, el bloque de ayuda en el panel; arreglo de clase: los porcentajes de «Lo que importa» con nombres en mayúscula (fechaOk, fotosOk, coverOk) llegaban en minúsculas desde Postgres y no salían; guardián aliasConComillas). **4ne hecho · NOCHE COMPLETA (7 nov):** Super Admin › Transacciones › **Noche** (lista o mesa, noche, personas, cuántos entraron, cómo cerró, depósito y lo devuelto; nunca el código; «Devolver depósito · noche»); Colas **«Mesas no respetadas»** y **«Sin identificación»** (migración 0084; `lib/noche-vigilar.ts`: 3 en 30 noches abren un caso por local desde la puerta real; el caso lista cada noche y decide «Pausar mesas y lista» o «Revisado, sin cambios», con auditoría); la ayuda «Me sentí inseguro» va primero en Colas y las ayudas de fiesta, viaje y noche ya dicen su nombre (`AYUDA_DE`); Analítica › **Noche** (mesas confirmadas en 60 min, vencidas, no respetadas, depósitos, % de la lista que entró, el cover que subió después de publicado, «la fila, como decía», «cobraron más cover» por 100 noches, licencias de licor vencidas); docs `panel-mesas-y-lista`, `licencia-de-licor`, `admin-analitica`; guardianes colasEnLaBase y txConNombre. **Grupo Educación + Niños + Deporte** (plan `docs/diseno/plan/fase4-edu-ninos-deporte.md`, bloques 4ea–4eg): **4ea hecho (7 nov)** — migración 0085 (`svc_kind` curso · mes · semana · clase; `class_groups` con cupos derivados; `insc_settings`; licencias de escuelas; comisión `insc`; check `items_matricula_check`), `lib/inscripciones-comun.ts` (motor común con `VOC` por rubro), `lib/edu.ts` (herramienta, abrir / quitar grupo, tarjeta y filtros derivados, barrido `edu`), editor de cursos en Servicios, Tu herramienta «Grupos y cupos» (`app/panel/Edu.tsx`), Super Admin 360 en solo lectura, semilla 0024 (15 escuelas, 35 cursos, 57 grupos; dueña de prueba Miriam 5705550377), guardianes matriculaMenor y asientosDerivados ampliado. **4eb hecho (7 nov)** — migración 0086 (Niños en `insc_settings`, `care_openings`, licencia `pa_dhs_childcare`, `op_private` motivo `nino`, `licencias_refrescar` deriva «lic» de Niños SOLO de la licencia del DHS verificada: se cayó el «con licencia» falso de 5 lugares), `lib/ninos-comun.ts`, `lib/ninos.ts` (herramienta, cupos por edad, tarjeta y filtros, barrido `ninos`), `lib/ninos-privado.ts` (único lugar de los datos del niño: cifrados, mínimos, purga a los 30 días, barrido `ninosPurga`), «Cupos y licencia» y programas de Niños sobre el motor de Educación (sin plan, $0 = gratis), Super Admin 360 + vencer y retirar una licencia verificada, semilla 0025 (21 lugares, 4 licencias del DHS de ejemplo; dueña de prueba Altagracia 5705550388), guardianes licenciaNoSeFinge, ninosSinDatosSensibles, ninosNotaCifrada y avisoNinosNeutro. **4ec hecho (7 nov)** — migración 0087 (contrato, salirse antes con check «sin contrato = $0», inscripción, guardería, fecha límite de la liga, sueltos), `lib/deporte-comun.ts` y `lib/deporte.ts` (precios en el ítem como única fuente, tarjeta y filtros, barrido `deporte`), «Membresías y contrato» y «Liga e inscripciones» en el panel, editor de servicios de Deporte (temporada por equipo o por jugador explícito), Super Admin 360, semilla 0026 (11 lugares; dueño de prueba Anthony 5705550411), guardián cancelarSiempreSePuede. **4ed hecho (7 nov)** — la ficha de las tres: `lib/inscripciones-publico.ts` (`inscPublica`: cursos, programas y membresías con sus grupos y cupos, Tu herramienta de Niños y Deporte; nunca el enlace de la clase en línea ni dato de inscritos o niños) y `n/[id]/Insc.tsx` (tarjeta de arriba por rubro y tipo: «¿QUÉ TE LLEVAS AL FINAL?» / «¿TIENE LICENCIA?» + «¿HAY CUPO?» / «¿DESDE QUÉ EDAD?» / «¿HAY CONTRATO?» + CUOTA / «¿QUÉ INCLUYE LA CUOTA?»; pestaña «Cursos» / «Programas» / «Membresías» / «Liga y canchas» con precio y meta; hoja con TE LLEVAS, INCLUYE, VA APARTE, grupos y cómo se paga; riel con el horario sacado de los grupos reales; barra; Free sin inscribirse por la app); FAQ automática por rubro (la de Tu página gana); las páginas de categoría ya cuentan «De noche» / «Con licencia» / «Sin contrato» con los derivados; ayuda `educacion-ninos-deporte-en-la-ficha`; guardián enlaceSoloInscritos. **4ee hecho (7 nov)** — migración 0088 (`insc_seq` I-4101, `waitlist_entries`, `plan_terms` y `plan_marks` solo inserción, avisos `insc_*` sin nombre del niño); `lib/inscripciones.ts` (inscribirme con candado `insc:{negocio}`, cupo de grupo o banda de edad que la base no deja pasar, matrícula de un curso RETENIDA al enviar y COBRADA al confirmar, todo lo demás en el lugar; otro grupo con el cupo movido; no hay cupo; vence; cancelar antes de empezar = devolución exacta y después = se queda; el grupo no abre = devolución a todos; baja de membresía con constancia y 72 h; lista de espera con oferta de 48 h y la siguiente sola; primera clase gratis una vez cada 90 días; datos del niño cifrados vía `ninos-privado.ts`, en el panel con auditoría; barrido `inscripciones`); pantallas `/n/{id}/inscribirme` (3 pasos) y `/insc/{num}`; la hoja de la ficha lleva a inscribirse con Pro; Mi cuenta › Citas y reservas; Panel › Hoy, Lo que vendes › Inscripciones y el detalle; ayuda `inscribirse` y `panel-inscripciones`; guardianes soloMatriculaEnLaApp, matriculaInscripcion, gruposSinSobreventa y copiaDelPrecio (probados al revés); prueba de carrera: 3 por el último cupo → 1. **4ef hecho (7 nov)** — migración 0089 (motivos cert · horario · ensena · lic · cuidado · salir · equipo; lo que se pide otro_grupo · arreglar · cancelar_membresia); Ayuda con la inscripción sobre el motor de ayuda-cita (`/insc/{num}/ayuda`, en curso o hasta 7 días después; «No cuidaron bien a mi niño» directo a To'Latino con el aviso de ChildLine; «No tenían licencia» abre la cola Licencias; fotos de Niños privadas; el bloque de ayuda en el detalle del panel); reseña verificada de inscripción (preguntas por rubro, dato de la inscripción con el certificado, «Lo que importa en un curso / con los niños / en deporte» de 12 meses; membresía reseñable a las 4 semanas; Niños sin fotos y el servidor rechaza el nombre del niño); arreglo de clase: la lista de ayudas de Hoy mandaba la noche (N-) a «Cita» (guardián prefijosAyuda); guardián ninosSinFotoPublica; ayuda `resena-y-ayuda-de-inscripciones`. **4eg hecho · EDUCACIÓN + NIÑOS + DEPORTE COMPLETOS (7 nov):** Super Admin › Transacciones › **Inscripciones** (rubro, curso, grupo, matrícula y cómo cerró; nunca datos de un niño; «Devolver matrícula»); Colas **«Cuidado de niños»** (la ayuda va directo, primera en la lista; ver los datos del niño exige rol Soporte/Admin y motivo, queda en la auditoría), **«No me dejan cancelar»** y **«Grupos que no abrieron»** (3 en 90 días; revisar o pausar inscripciones) — migración 0090, la cola sale del motivo (`COLA_AYUDA_SQL`); arreglo de clase: en Colas las ayudas de fiestas, viajes y noche caían en la vista del pedido de comida; Analítica › **Educación · Niños · Deporte** (solo cifras); ayuda `privacidad-de-datos-de-ninos`, `cuidado-de-ninos`, `licencia-de-guarderia` y `admin-analitica`; guardián colaAyudaRuteada; migraciones 0085–0090 aplicadas dos veces sin duplicar; lista de cierre §8 marcada. Grupo **Iglesias + Bienes Raíces + Venta de Autos**: plan en `docs/diseno/plan/fase4-iglesias-inmuebles-autos.md` (bloques 4ia–4ig). **4ia hecho (7 nov)** — migración 0091 (`worship_times` con índice por ciudad, día y hora; `fe_settings`; `insc_settings.rubro` suma `fe`; trigger `items_fe_sin_deposito`: ningún ítem de Iglesias lleva depósito; un curso gratis ya cabe en `items_matricula_check`; sellos `pa_funeraria`, `fe_doj`, `irs_501c3` sin verificar), `lib/fe-comun.ts` y `lib/fe.ts` (tipo por subcategoría, atajos MISA y CULTO, al menos una misa o un culto, «Otro horario», «Se acabó por hoy» que se apaga solo, precio total de la funeraria en el ítem, tarjeta y filtros derivados por variante, barrido `fe`), «Horarios y ayuda» · «La ayuda de hoy» · «Precios y repatriación» en el panel, editor de servicios de Iglesias (gratis · donativo sugerido · precio total solo funerarias · curso con grupos; nunca depósito), Tus licencias para Iglesias, Super Admin 360 (herramienta, horarios, línea fija y la forma de cada servicio), semilla 0027_fe (19 lugares; dueño de prueba Padre Luis 5705550422), guardián ayudaGratisIglesia (9 pruebas al revés), ayuda `horarios-y-ayuda`. **4ib hecho (7 nov)** — migración 0092 (`items.svc_kind` suma `renta`/`venta` y una casa en venta pasa el tope de $100,000 de un ítem; `property_listings` con «Para mudarte» y cuota estimada derivados, depósito ≤ 2 meses, animales de servicio siempre, cuartos con «solo la zona» y mayores de 62 solo con declaración en checks de la base, GIST y parciales; `class_groups.purpose` `insc`/`visita`/`prueba` para que las horas de visita no se mezclen con Educación; `inm_settings`; `fair_housing_phrases` sembrada ES/EN; sellos `pa_corredor`, `nmls_inm`, `pa_avaluador`, `inspector_vivienda` sin verificar), `lib/inmuebles-comun.ts` (tipos, líneas fijas, pie de igualdad, animales de servicio, estafas, `cuotaTexto` siempre «estimada»), `lib/vivienda-justa.ts` (`revisarTexto`, lista de fábrica + la del Admin), `lib/inmuebles.ts` (`guardarPropiedad` con todo validado en el servidor, «Para mudarte» y cuota estimada calculados, frase frenada a la auditoría, Free = 5 a la vista, horas de visita 14 días adelante, herramienta un toque a la vez sobre la propiedad, filtros y tarjeta derivados, barrido `inmuebles`), panel «Propiedades» (lista con estados y editor completo, hueco #1) y «Propiedades y visitas» · «Casas en venta» · «Préstamos y requisitos» · «Cuartos y lo que incluye», Tus licencias para Bienes Raíces, las propiedades fuera de Servicios y de las citas con depósito, Super Admin 360 (solo lectura, ocultar con motivo, revisar mayores) y Catálogo › Vivienda justa (solo Admin, con auditoría), semilla 0028_inmuebles (17 negocios, 26 propiedades revisadas a mano; dueña de prueba Yesenia Batista 5705550433), guardianes viviendaJusta, direccionAlConfirmar, cuotaEstimada, sinDatosDeCredito, sinDineroEnVisitas y propiedadNoEsServicio (13 pruebas al revés), ayudas `propiedades-y-visitas` y `vivienda-justa`, punta a punta `inm4ib` (teléfono y escritorio) verde. **4ic hecho (7 nov)** — migración 0093 (`items.svc_kind` suma `auto` y un vehículo llega a $500,000; `vin_valido()` con el dígito verificador; `vehicle_listings` con VIN, año, marca, modelo, versión, carrocería, millaje u horas, título, historial declarado, inspección de PA, garantía, «no va por la calle», CDL y el total en la puerta comprobado por la base (`otd = precio + impuesto + placas + cargo`), pago de ejemplo todo o nada (enganche, APR, meses) y compre aquí pague aquí con total pagado y tasa, salvage nunca por la calle, índices parciales y trigram; `dealer_settings`; tope del cargo del dealer en `platform_config` ($477, a verificar) con trigger; `tax_rules` NEG-DEALER 6 %; sellos `pa_dealer`, `pa_vendedor_autos`, `pa_venta_plazos`, `nmls_dealer` sin verificar), `lib/autos-comun.ts` (tipos, líneas fijas, salvage, «no es obligatoria», Buyers Guide, `puertaTexto`, `pagoTexto` / `bhphTexto` siempre «estimado, sujeto a aprobación», `vinValido`, `notasCarro`, resumen L321), `lib/autos.ts` (`enLaPuerta` única fórmula, `pagoEjemplo`, `totalBhph`, `guardarCarro` con todo validado, `cotizarCarro` en vivo, estados, herramienta un toque a la vez que recalcula todos los carros en la misma transacción, filtros y tarjeta sin términos de crédito sueltos, `cambiarTopeCargo` y `recalcularTodosPorLotes` por cursor, barrido `autos`), panel «Inventario» (lista y editor, hueco #2) y «Inventario del lote», Tus licencias para Autos, los vehículos fuera de Servicios y de las citas, Super Admin 360 (solo lectura, ocultar con motivo) y Catálogo › Cargo del dealer (solo Admin, auditado, recalcula por lotes), semilla 0029_autos (17 negocios, 28 vehículos revisados a mano con VIN de prueba válidos; dueño de prueba Juan Polanco 5705550444), guardianes totalEnLaPuerta, vinValido, tituloSalvage y carroNoEsServicio, cuotaEstimada, sinDatosDeCredito, sinDineroEnVisitas y propiedadNoEsServicio ampliados (33 pruebas al revés), ayuda `inventario-del-lote`, punta a punta `autos4ic` (teléfono y escritorio) verde. **4id hecho (7 nov)** — sin migración: `lib/fe-publico.ts`, `lib/inmuebles-publico.ts` (solo la zona de cada propiedad, nunca la calle ni el punto; un cuarto siempre «solo la zona»), `lib/autos-publico.ts` (lee el total en la puerta del servidor; pago de ejemplo solo con enganche, tasa y meses) con FAQ y tarjeta de Hoy por tipo; fichas `Fe.tsx`, `Inmueble.tsx`, `Dealer.tsx` sobre `Kit4i.tsx` (tarjeta de arriba, notas, lista, hoja, riel, barra; pie de igualdad de oportunidad y animales de servicio en toda propiedad; línea del salvage en fila y hoja; funeraria «Pedir información» = contacto sin presión), variantes Free / sin local / 24 h, rótulo de reseñas por rubro, tarjeta de Iglesias «Ver detalles»; categorías Iglesias, Bienes raíces y Venta de autos con su cifra de `filter_values`; guardianes direccionAlConfirmar, viviendaJusta, totalEnLaPuerta, tituloSalvage, licenciaNoSeFinge y ayudaGratisIglesia ampliados + `freeNoPromete` y `clienteSinServidor` nuevos (23 pruebas al revés); ayuda `iglesias-inmuebles-autos-en-la-ficha`; punta a punta `fic4id` verde (y fic4d, fe4ia, inm4ib, autos4ic, nin4b sin regresión). Pedir en la app (visita, prueba, fecha) queda para 4ie: hoy la hoja ofrece llamar o escribir. **4ie hecho (7 nov)** — migración 0094 (`visit_seq` P-8101, índices de `visit`, check `operations_nota_sin_numeros`, `class_groups` de prueba «cualquier carro» sin `item_id`, `dealer_settings.test_pattern`/`test_cupo`, `op_private` motivos `casa` y `fe`, cola `plantones`, avisos `vis_*`, `biz_vis*`, `insc_fe_*` e `insc_fen_*` neutros); `lib/visitas-inm-comun.ts` + `lib/visitas-inm.ts` (pedir con candado `ver:{grupo}`, una viva por persona, tope Free 10, nota tapada, copia del total; responder · otra hora · aceptar/no me sirve · cancelar · Pasó/No vino · `retirarAnuncio` enganchado a Rentada/Vendida/Oculta · barrido: 4 h hábiles y nunca después de la hora − 1 h, «Pasó» a las 24 h, recordatorio 2 h, horas de prueba, purga a 30 días); Iglesias por el motor de inscripciones (`rubro fe`, «Pedir fecha» con franja, catecismo para mi hijo, consejería con nota cifrada, avisos neutros, $0); pantallas `/n/{id}/ver` y `/vis/{num}`, fichas cableadas (Free va directo a pedir), Mi cuenta, Panel › Hoy/Visitas/detalle (dirección de la casa solo confirmada y auditada), Tu herramienta › horas de prueba; Super Admin › Transacciones › Visitas y Colas › Plantones; semilla 0031 (horas de prueba); guardianes `notaSinNumeros`, `avisoFeNeutro` y ampliados `sinDineroEnVisitas`, `direccionAlConfirmar`, `sinDatosDeCredito`, `copiaDelPrecio`, `freeNoPromete`, `gruposSinSobreventa`; docs `pedir-visita-y-prueba-de-manejo`, `panel-visitas`. Punta a punta `vis4ie.cjs` verde. **4if hecho (7 nov)** — migración 0095 (motivos `idioma · ver · mudar · fotos · precio · titulo`, lo que se pide `llamar · otra_visita · arreglar_antes`, `help_requests.outside_refund` («Me lo devolvieron») y `paused_*` (la pausa mientras se revisa), cola `estafa` «Posible estafa», avisos `help_directo`, `fe_help_*` neutros, `biz_vis_help`, `biz_fe_help`, `biz_help_pausa/reanuda/sancion/devuelto`); rubros `fe · inm · dealer` en `lib/ayuda-cita.ts` (`NUM` acepta `D-`, elegible al pasar o confirmada con la hora ya llegada y hasta 7 días, en `ayudaDeCita` y `pedirAyudaCita`; `SIN_DINERO`: nada vuelve a una tarjeta, «Me lo devolvieron» / «No me lo devolvieron»), `lib/ayuda-estafa.ts` (pausa la propiedad, el carro o «Pedir fecha» y lo reanuda; sanción = advertencia en `sanctions` y el anuncio fuera; sin cobros), `COLA_AYUDA_SQL` → `estafa`; reseñas de las tres (preguntas del prototipo, dato con la copia del total, «Se rentó antes» / «No llegaron», «Lo que importa» con rótulos que salen de la pregunta, «De N visitas y citas por To'Latino en los últimos 12 meses.», Iglesias sin fotos, funeraria sin filtro «Verificadas»); pantallas `/vis/[num]/ayuda`, Ayuda en `/vis/[num]` y «Ayuda con la iglesia» en `/insc`, panel (Hoy y detalle de la visita), Super Admin › Colas › Posible estafa (sancionar, sin acción, pausar o reanudar mientras decide). Arreglo de clase: al resolver To'Latino una ayuda de fiesta, viaje, noche o inscripción, el aviso enlazaba a `/pedido/…`. Guardianes `sinDineroEnAyuda`, `feSinFotoPublica`, `avisoAyudaPorTipo` y ampliados `fotoAyudaPrivada`, `colaAyudaRuteada` (14 pruebas al revés). Docs `resena-y-ayuda-con-tu-visita`, `panel-visitas`, `iglesias-inmuebles-autos-en-la-ficha`. Punta a punta `ayu4if` (teléfono y escritorio). **4ig hecho (7 nov)** — **IGLESIAS + BIENES RAÍCES + VENTA DE AUTOS COMPLETOS · FASE 4 CERRADA:** migración 0096 (cola «Vivienda justa» con casos por negocio —textos frenados por la lista, 30 días— y por propiedad —declaración de mayores de 62—, plantillas `biz_mayores_ok`, `biz_mayores_no`, `biz_vivienda_aviso` ES/EN, índice de frenadas); `lib/vivienda-cola.ts` (abrir casos al frenar y al guardar «para mayores»; «Confirmar mayores» / «No se confirma» igual desde Colas y Negocios 360°, con aviso); Colas › **Vivienda justa** («Advertir al negocio» con sanción y aviso o «Revisado, sin acción»; el caso muestra la zona, no la calle); **Licencias** de las tres: el barrido (`barrerLicencias`) las devuelve a la cola 14 días antes de su revisión y con prioridad si pasó, la lista dice «revisión por vencer» o «vencida desde…» y el sello solo cambia cuando una persona mira el registro; Analítica › **Iglesias · Bienes Raíces · Autos** (solicitudes por propiedad y por carro, % confirmadas a tiempo, % vencidas, plantones, días hasta rentar o vender, a la vista por ciudad, % «el total fue el que vi», ayudas por cada 100 visitas, pausados por estafa, frenadas, licencias; nunca por religión ni crédito); arreglo encontrado por la prueba contra SQL: «a tiempo» comparaba con `respond_by`, que se limpia al confirmar (daba 0 %). Guardianes nuevos `colaConVista` (una cola sin su vista caía en la de «Recomendaciones»), `avisoConPlantilla` (clave de aviso sin plantilla ES/EN) y `analiticaSinCreencias`, los tres probados al revés. Docs `iglesias-horarios-y-ayuda`, `rentar-o-comprar`, `comprar-un-carro`, `privacidad-de-tus-datos-en-visitas`, `licencias-inmuebles-y-autos` y al día `admin-analitica`, `vivienda-justa`, `licencia`, `horarios-y-ayuda`, `propiedades-y-visitas`, `inventario-del-lote`. Punta a punta `adm4ig` (81 comprobaciones, escritorio y teléfono, incluido el triángulo de las tres, «No se puede» y el tope de Free) y en verde `fe4ia`, `inm4ib`, `autos4ic`, `fic4id`, `vis4ie`, `ayu4if` y las regresiones `ins4e`, `ayu4f`, `adm4eg`, `vi4b`; 0001–0096 en base nueva y 0091–0096 dos veces más sin error. Lista de cierre §8 marcada salvo dos con su motivo (la CI no corre punta a punta ni 9 dispositivos; este bloque no se subió). **Fase 4 cerrada:** las 14 categorías (Hogar + Auto, Doctores + Profesionales, Mercados + Tiendas, Fiestas + Transporte, Noche, Educación + Niños + Deporte, Iglesias + Bienes Raíces + Venta de Autos) con cliente, panel y Super Admin; falta el OK del fundador en el sandbox con las guías de `docs/REVISION.md`. **Fase 5 · Comunidad en curso** (plan `docs/diseno/plan/fase5-comunidad.md`, bloques 5a–5i; El Patio fuera, decisión G). **5a hecho (7 nov)** — migración 0097 (`city_official_accounts` de las 5 ciudades, `community_profiles` con contadores derivados y `rank_level` (lo escribe 5f), `com_posts` (pregunta · recomendación · encuesta · publicación; ubicación = centro del barrio puesta por la base, invitado, aviso de Salud, `hot`, contadores y encuesta derivados por trigger, índices del muro por (ciudad, hot|publish_at, id) y GIST), `com_comments`, `com_votes`, `com_poll_votes`, `com_saves`, `user_blocks`, `com_hidden_for`, `com_edits` (solo inserción), `com_sin_datos()` en publicaciones, comentarios y bio, `content_reports` ampliado, avisos `com_hide`/`com_restore` sin SMS); semilla 0032 generada con `scripts/semilla/extraer-comunidad.cjs` (15 vecinos + la cuenta oficial, 14 publicaciones, 26 comentarios, votantes de prueba para que los conteos cuadren); `lib/comunidad-filtro.ts` (único lugar de las reglas al escribir: teléfonos, correos, números privados, direcciones exactas, 911), `lib/comunidad.ts` (muro con cursor + votos propios + perfiles en caché, `sinBloqueos`, publicar/editar 30 min/borrar con Deshacer, votar, encuesta, guardar), pantallas `/comunidad` (muro de registro sin cuenta), `/comunidad/nuevo`, `/comunidad/p/[id]` (noindex), Super Admin › Contenido › **Publicaciones** (ocultar/restaurar con motivo y aviso, fijar 7 días, bloquear comentarios; auditado). Guardianes nuevos `comunidadSinTelefonos`, `ubicacionDeBarrio`, `bloqueoMutuo`, `feedConCursor`, `comunidadSoloConCuenta`, `noTePromuevas` y `emergencia911` ampliado (19 pruebas al revés). Doc `comunidad-el-muro` y `admin-contenido` al día. Punta a punta `com5a` (teléfono y escritorio, 55 comprobaciones) y `adm4ig` en verde; `adm2i` falla en Transacciones (cuenta de 90 días desactualizada en la prueba, no tocado aquí). **5b hecho (7 nov)** — migración 0098 (`com_votes.counted`: lo propio lo rechaza la base y el voto de otra cuenta del mismo dispositivo queda callado; `com_votar()` = el toque con candado por persona (mismo toque quita, otro signo cambia); contadores, score y `hot` por suma atómica en el trigger, solo los votos que cuentan; `com_thread_recs` derivado (votos, cuántos lo recomiendan y el comentario más votado por negocio del hilo, recalculado bajo candado de su fila); comentario de solo negocio permitido, oculto con motivo; forma del hilo (un nivel, `reply_to` del mismo hilo) y mejor respuesta (raíz visible de otra persona → `solved_at`) impuestas en la base; encuestas: la base rechaza fuera de plazo u opción, `poll_closed_at` = resultado avisado una vez; `com_mentions`; índices del hilo; avisos `com_comment`, `com_reply`, `com_mention`, `com_best`, `com_votes_10`, `com_poll_closed`, `com_cm_hide`, `com_cm_restore` sin SMS); `lib/comunidad-hilo.ts` (`hilo` raíces de 20 por votos o recientes con cursor + destacada + recomendados con % del servidor, `respuestas` a pedido, `comentar` con filtro, límites, sanción, negocio no propio y avisos sin bloqueos, `votar` publicación/comentario, `meSirvio`, `votarEncuesta` con % del servidor, `guardar`, `barrerEncuestas` en el barrido como «cerrarEncuestas»); `avisarMuchos` en `lib/avisos.ts`; pantalla `/comunidad/p/[id]` con el hilo (`Hilo.tsx`: TopAnswer, AlsoRecommended, CommentCard, ReplyThread; escritorio en el mismo hilo con Esc/Ctrl+Enter, teléfono con barra abajo; «Sumar mi voto»); Super Admin › Contenido › **Comentarios de vecinos** (ocultar/restaurar con motivo y aviso; auditado). Guardianes nuevos `votoUnico`, `saldoDerivado`, `bloqueoAlEscribir`, `avisoComunidadSinSms`; `comunidadSinTelefonos`, `noTePromuevas`, `comunidadSoloConCuenta` ampliados (19/19 al revés de 5b, 19/19 de 5a). Doc `comunidad-comentar-votar-y-encuestas` nueva; `comunidad-el-muro` y `admin-contenido` al día. Punta a punta `com5b` (teléfono y escritorio, 67 comprobaciones, incluye 80 toques de voto en paralelo en la base con contador exacto), `com5a` (55) y `adm2i` en verde. **5c hecho (7 nov)** — vecinos y mensajes entre vecinos. Migración **0099** (`dm_threads`/`dm_messages` con derivados solo por trigger y `dm_leido()`, sin teléfonos en la base, mensaje solo a quien te sigue o ya te escribió y nada con un bloqueo, impuesto también por la base; seguir con un bloqueo rechazado; bloquear deja de seguir en los dos sentidos y cierra la conversación, Deshacer lo devuelve; `content_reports` 'dm' y cola `chat` 'dm_thread'; `users.interests`; `community_profiles.adult` (18+ como declaración sí/no + fecha, nunca fecha de nacimiento); `notifications.actor_user_id`; plantillas `com_follow`, `dm_message`, `dm_hide` sin SMS). `lib/vecinos.ts` (perfilVecino, seguir, bloquear, silenciar, deshacer, listas, sugeridos, editarPerfil, bienvenida; `sinBloqueo` de personas y `sinBloqueos` de contenido), `lib/mensajes-vecinos.ts` (misConversaciones, conversacion, enviar, reportarConversacion; 10 nuevas al día), `lib/admin-dm.ts` (único que lee DM, solo con caso y reporte abiertos), `lib/admin-vecinos.ts`. La bandeja esconde avisos de alguien con un bloqueo. Pantallas: `/comunidad/v/[id]` (APP-COM-VECINO, mi perfil editable), `/comunidad/mensajes` y `/[id]` (APP-COM-MENSAJES/CHAT), pasos 3–5 de 2au + bienvenida + aviso de menor en `/entrar`, Mi cuenta › **Vecinos**, menú de publicación y comentario con ver perfil · silenciar · bloquear; Super Admin › Usuarios 360° › **Comunidad** y Colas › Mensajes reportados con DM. Clase cazada: un segundo reporte de la misma conversación reventaba por la llave única (también en 2p): ahora se reabre (guardián `reporteConLlave`). Guardianes nuevos `bloqueoTodasLasSuperficies`, `consultaConBloqueos`, `dmSoloConReporte`, `mensajesSinTelefonos`, `mensajeSoloAQuienTeSigue`, `sinFechaDeNacimiento`, `reporteConLlave` (29/29 al revés; 5a 19/19, 5b 19/19). Doc `comunidad-vecinos-seguir-bloquear-y-mensajes` nueva; `cuenta-entrar`, `admin-usuarios`, `mensajes`, `comunidad-el-muro` al día. Punta a punta `com5c` (teléfono y escritorio, 98 comprobaciones, pasa dos veces seguidas), `com5a`, `com5b` y `msg2p` en verde. **5d hecho (7 nov)** — reportar, auto-moderación, antiabuso, sanciones y apelaciones. Migración **0100** (`mod_rules` 6 reglas +
autohide, `mod_terms` ES/EN, `mod_flags` solo inserción, `appeals` AP-101… con `sanctioned_by` puesto por la base y decisión de otra persona
impuesta por trigger y check, colas `repUsr`/`apel`, `sanctions.ref_*`, `content_reports.device`, `media.status 'review'`, límites en
`platform_config`, plantillas sin SMS). `lib/moderacion.ts` (reglas, `limiteDia` día local con candado, `efectoSancion`, `revisarAlEscribir`,
`marcar`, `reportar`, `autoOcultar` por personas/dispositivos distintos, `revisarFotosCom`, `rafagaResenas`, `redDeCuentas`, barrido
«moderacion»), `lib/apelaciones.ts` (avisos con Apelar, `aplicarSancion`, `apelar`, `decidirApelacion`), `lib/moderacion-img.ts` +
**servicio propio `services/moderacion-img`** (NudeNet ONNX, MIT, en el compose; caído = revisión manual). Reportar en publicación,
comentario, perfil y conversación (3 pasos); Mi cuenta › Avisos de moderación (apelar); línea del 988; Super Admin › **Confianza y
seguridad** (`/admin/confianza`) y Contenido › **Auto-moderación**; casos de la Comunidad en Colas. Guardianes `ocultarAvisaYApela`,
`apelacionOtraPersona`, `libroSoloInsercion`, `limitesEnServidor`, `reportesSinManada` (34/34 al revés); e2e `com5d` 80 ✓. Ayuda:
comunidad-reportar-y-apelar.md, admin-confianza-y-seguridad.md. **5e hecho (7 nov)** — Hoy en el barrio y cuenta oficial por ciudad: migración
0101 (`business_posts.hoy_off_*` + `hoy_avisado_at`, índice de Hoy, `post_en_hoy()`, `com_fijada_una()`, plantillas `hoy_guardado` y
`hoy_retirada`); `lib/hoy.ts` (`hoyEnElBarrio` agrupado por negocio con cursor, `quedanEnHoy`, aviso a quien sigue), `lib/oficial.ts`
(`publicarOficial` con programar y fijar, `fijarOficial`), `lib/comunidad-portada.ts` (Recomendados por vecinos, la oficial de la semana,
`buscarVecinos` solo con sesión); `/comunidad/hoy` público (StoryCard 8a, chips, «quedan N h») y pestaña dentro de la Comunidad + carrusel
en el muro, Inicio y Negocios; Negocios › «Recomendados por vecinos»; Buscar › Vecinos y «Pregúntale al barrio»; Novedades (panel y
ficha) dicen «En Hoy en el barrio · quedan N h»; Super Admin › Contenido › **Hoy en el barrio** (Retirar / Devolver con motivo y aviso al
negocio) y **Cuenta oficial** (escribir, programar, fijar). Guardianes `oficialNoEsPersona`, `hoySoloEnVivo`, `buscarVecinosConSesion`
(+ `comunidadSinTelefonos` ampliado; 23/23 al revés); e2e `com5e` 62 ✓. Ayuda: hoy-en-el-barrio.md, admin-cuenta-oficial.md,
admin-contenido.md, buscar.md. **5f hecho (7 nov)** — Puntos, rangos, insignias y Tabla del Barrio: migración 0102 (`points_rules`,
`points_entries` de solo inserción con tope del día en la base e idempotente por persona + regla + referencia, `ranks` renombrables con
puntos mínimos y condición, `badges` / `user_badges`, `monthly_boards` / `board_closures` derivadas, `referral_codes` / `referrals`,
`com_posts.featured_*`; funciones `pts_sumar`, `pts_revertir(_objetivo)`, `pts_restaurar_objetivo`, `pts_ajustar`, `pts_rango` (único que
escribe el rango; el rango solo sube con `rank_floor`), `pts_piso`, `tabla_excluir`, `tabla_cerrar`; triggers de ocultar/borrar/volver
en publicaciones, comentarios y reseñas; plantillas `gam_*` sin SMS); semilla de pruebas `0033_puntos.sql` (U.pts, U.rk, U.bdg y TABLA
sep/ago del prototipo, el mes anterior cerrado → Ramón General del Barrio); `lib/puntos.ts`, `lib/tabla.ts`, `lib/invitar.ts`,
`lib/admin-gam.ts`; ganchos en votar, «Sumar mi voto», «Me sirvió», reseña verificada (+15 y «SARGENTO · N RESEÑAS · +15 PUNTOS» en la
tarjeta), primera recomendación con 3 votos (+50), apelación levantada; pantallas `/comunidad/rango` (APP-GAM-RANGO) y `/comunidad/tabla`
(APP-GAM-TABLA, tercera pestaña), insignias en el perfil, columna de escritorio con tu rango y la Tabla, «Destacar en Negocios»
(Sargento Mayor) con «DESTACADA», Invita vecinos con código NOMBRE-N y `/i/{código}`; Super Admin › **Gamification** (Rangos con vista
previa, Puntos y tope, Tabla del Barrio con excluir y «Cerrar el mes») y Usuarios 360° › Comunidad › Puntos (ajustar ± con tope por rol,
Coronel); barrido `tablaCongelar`, `tablaCerrar` (día 3), `referidos`. Guardianes `topeDiario` (nuevo) + `libroSoloInsercion`,
`saldoDerivado`, `votoUnico`, `oficialNoEsPersona` ampliados (28/28 al revés); e2e `com5f` 60 ✓. Ayuda: comunidad-puntos-rangos-y-tabla.md,
admin-gamificacion.md. **5g hecho (7 nov)** — Monedas y cupones de negocios: migración 0103 (`coin_rules`, `coin_entries` solo
inserción con `reverses_id` e idempotente, `community_profiles.coins` derivado con check ≥ 0, `mon_bienvenida` / `mon_premios_mes` /
`mon_gastar` (perfil `for update`) / `mon_devolver` / `mon_ajustar`; `coupons` (costo 80–1,000 lo fija To'Latino, cupo del mes, días,
pending · live · paused · ended con `paused_by`) y `coupon_redemptions` (TL-CQ-xxxx único sin 0/O/1/I, issued → used una vez o → expired
con las monedas de vuelta) con `cup_canjear` / `cup_validar` / `cup_vencer`; el cierre de la Tabla acredita el premio y cuenta los canjes;
la bienvenida ya hecha y el mes ya cerrado se acreditaron), semilla `0034_monedas_cupones.sql` (los 5 COUPONS y +100 a cada vecino de
prueba con el libro). `lib/monedas.ts`, `lib/cupones.ts`, `lib/monedas-comun.ts`; APP-GAM-MONEDAS (`/comunidad/monedas`), monedas en Mi
perfil, Tu rango y la tarjeta de vecino de Mi cuenta; panel › Tu página › **Cupones por monedas** (`CuponesPanel.tsx`,
`acciones-cupones.ts`: crear, editar, pausar, terminar, **Validar un código**); Super Admin › Gamification › **Monedas** y **Cupones**,
Usuarios 360° › Comunidad › Monedas (ajuste ±); avisos `gam_monedas*`, `gam_cupon_usado`, `biz_cupon_*` (sin SMS); barrido
`vencerCupones`. Guardianes `monedasSinDinero` y `cuponUnaVez` (nuevos) + `libroSoloInsercion`, `saldoDerivado` ampliados (42/42 al
revés); e2e `com5g` 73 ✓ (carrera de la última unidad, doble canje, código usado dos veces, vencer con el reloj movido). Ayuda:
monedas-y-cupones.md, panel-cupones-por-monedas.md, admin-gamificacion.md al día. **5h hecho (7 nov)** — «Ver traducción» propia (D3):
migración 0104 (`ugc_translations` derivada, pk `(target_kind, target_id, dst_lang, src_hash)` con sha-256 del texto, `engine`, `ms`;
`ugc_translation_uses` + `trad_usar` = límite por persona o dispositivo por hora, `com_traduccion_hora` 60; `reviews.reply_lang` y
`post_comments.lang`). `lib/traductor.ts` (único cliente del traductor: solo `TRADUCTOR_URL`, 3 s, detectar 1.5 s, corta-circuito 5
fallas → 60 s), `lib/traduccion.ts` (`traducir`: límite → texto visible para quien pide → caché → servicio → guarda),
`lib/traduccion-comun.ts`; idioma detectado al publicar (antes de la transacción; respaldo: el de la app) en publicaciones, ediciones,
comentarios, reseñas, respuestas del negocio y comentarios de Novedades. Acción `acciones-traducir.ts` y `Traducir.tsx`
(`useTraducir` → prop `translate` de PostCard / CommentCard / TopAnswer / ReplyThread / ReviewCard; `LineaTr` en la respuesta del negocio y
Novedades): «Ver traducción» → «Traduciendo…» → «Ver original · Traducción automática del inglés»; error «La traducción no está
disponible ahora.» + Reintentar; nunca en lo propio. Super Admin ve siempre el original; Auto-moderación muestra si el traductor responde
y el tope (con auditoría). Infra: servicio `traductor` (LibreTranslate **v1.9.6**, AGPL-3.0 sin modificar, solo es/en, red `interna`
sin salida, 1.5 GB) + `traductor-modelos` (baja los modelos una vez al volumen), perfil «traductor», `deploy.sh` 3g aparte con `|| true`.
Guardianes nuevos `traduccionPropia`, `traductorEnPerfil`, `adminVeOriginal`, `traductorFueraDeTx` (31/31 al revés); e2e `com5h` 37 ✓
**con un traductor de mentira solo de prueba** (el LibreTranslate real NO corrió aquí: la imagen se bajó, pero los modelos de argos-net.com
están bloqueados por la red de esta sesión; verlo en el sandbox). Ayuda: ver-traduccion.md, admin-confianza-y-seguridad.md al día.
**5i hecho (8 nov)** — Super Admin completo de la fase, Configuración, avisos de la Comunidad, analítica y ayuda: migración 0105 (`config_keys`: catálogo de `platform_config` con tipo, mínimo, máximo, de fábrica, unidad, sección, etiqueta ES/EN, `editable`/`bloqueo` y `edit_in`; 32 claves: los plazos y límites de la Comunidad, el tope de puntos y los diferidos de la Fase 4; `cfg_int()` único lector de la base, acotado; trigger `platform_config_limites` que rechaza fuera de límites o no entero; `pts_tope()` lee el catálogo; grupo de avisos `community`, `notifications.held_digest`/`digest_id`, `notif_digests` (uno por persona y día local) y plantilla `com_resumen`; vistas `com_analitica_dia` y `com_canjes_negocio_dia` y `com_activos_por_rango()` por ciudad y día, sin personas). `lib/config.ts` (`valor`, `valores`, `cfgSql`, `cambiarConfig` con límites y auditoría antes → después; caché 15 s); la Comunidad (límites, editar, apelar, encuesta, traducciones, cupón), Gamification, Catálogo › Cargo del dealer y los plazos de Doctores y Profesionales, Noche, Educación + Niños + Deporte e Iglesias + Bienes Raíces + Autos leen de ahí (los de la Fase 4 en SOLO LECTURA hasta que sus textos lean el valor). Super Admin › Sistema › **Configuración** (`Configuracion.tsx`, `acciones-config.ts`, solo Admin); **Contenido** con las 7 pestañas del prototipo, filtros (ciudad, tipo, estado, reporte, votos, autor, rango, invitados), cursor, **el hilo** con el comentario marcado (`HiloAdmin.tsx`), **«Ocultar los N reportados»** con progreso y fallos parciales (nunca la cuenta oficial) y **mover de ciudad** (`acciones-contenido.ts`); **Usuarios 360° › Comunidad** con sub-pestañas (Publicaciones · Comentarios · Seguidores y siguiendo · Puntos y monedas · Cupones y referidos) y «Abrir caso de red de cuentas», filtros de la lista por rango y reportes; **Notificaciones › Solo Comunidad**; **Analítica › Comunidad**; Mi cuenta › Avisos › Comunidad (Respuestas y votos · Un resumen al día · Mensajes de vecinos) y el resumen diario en el barrido (`resumenComunidad`, sin lo de alguien bloqueado). Guardianes nuevos `configDesdeUnLugar`, `configConLimites`, `analiticaSinPersonas`, `loteNoTocaOficial` (26/26 al revés; `filaNoFalsa`, `totalEnLaPuerta`, `topeDiario`, `mensajeSoloAQuienTeSigue` al día con el catálogo); e2e `adm5i` 56 ✓. 0001–0105 en base nueva y 0097–0105 dos veces más sin error; semillas de pruebas en base nueva. Ayuda nueva admin-configuracion.md; al día admin-contenido, admin-usuarios, admin-analitica, admin-gamificacion, admin-confianza-y-seguridad, notificaciones, novedades, panel-cupones-por-monedas, comunidad-el-muro, comunidad-reportar-y-apelar, ver-traduccion. Suite de la fase: `com5a` OK com5a · `com5b` OK com5b · `com5c` OK com5c · `com5d` OK com5d · `com5e` OK com5e · `com5f` com5f: todo bien · `com5g` com5g: todo bien · `com5h` com5h: todo bien · `adm5i` adm5i ✓ todo · `adm2i` OK · `adm4ig` OK adm4ig (una sola corrida seguida, 9 nov; com5b, com5c, com5f y com5g ajustadas a las sub-pestañas nuevas del Super Admin). Lista de cierre §8 marcada salvo lo que dice su motivo (CI y 9 dispositivos, base de carga de 1 M, LibreTranslate real). **Fase 5 cerrada:** Comunidad (muro, hilo, vecinos y mensajes, moderación y apelaciones, Hoy en el barrio y cuenta oficial, puntos, rangos y Tabla, monedas y cupones, «Ver traducción») con cliente, panel y Super Admin; El Patio fuera (decisión G); falta el OK del fundador en el sandbox con las guías de `docs/REVISION.md` (### 5i trae el paso a paso de toda la fase). Sigue **Fase 6 · Eventos** — plan del grupo.
- **Fase 6 · Eventos — plan escrito (9 nov):** `docs/diseno/plan/fase6-eventos.md`, bloques 6a–6j, migraciones 0106–0115 (una por bloque), semillas desde 0035; defaults de las preguntas en su §6/§9 (van a `docs/REVISION.md` al construir). **6a hecho (9 nov)** — base de eventos, crear y editar en el Panel, Publica tu evento y revisión: migración 0106
(`event_formats` + `event_format_categories` + `event_genres` (TLEvP.FMT/CAT/GEN), `events` con estados, `pending` para el cambio que
importa con la versión anterior en vivo, `version`, `origin`, boletos/mesas/extras como configuración (`tickets_cfg`, `tables_cfg`,
`addons_cfg` con `evt_extras_ok`: sin alcohol, botellas ni hookah) que 6c pasa a sus tablas; `event_dates` con `listable` derivado por
trigger (`evt_listable`: publicado, aprobado, sin ocultar) y `evt_sincronizar_fechas`; `event_lineup`, `event_review_log` (solo inserción),
`event_organizers` (verificado / bloqueado); trigger `events_antes` (en vivo solo aprobado; sin persona que apruebe solo verificado;
bloqueado no envía ni publica; un evento no se borra); cola `evt`; apelaciones `event` y `evt_org` (`appeals_antes` ampliado); plantillas
`evt_*` (SMS solo aprobado y rechazado); claves `evt_*` en Configuración › Eventos), semilla `0035_eventos.sql` (13 eventos de negocios de
prueba en cada estado; la Parroquia es organizador verificado). Código: `lib/evt-comun.ts`, `lib/evt.ts`, `lib/evt-revision.ts`,
`app/panel/EventosPanel.tsx` + `acciones-eventos.ts` (Panel › Eventos: lista `evrow`, Lo que puedes publicar, editor por formato con
calendario `cal`, Traducir con el traductor propio, Así lo ve el cliente, Para guardar falta, Enviar a revisión / Publicar, Repetir otro
día, ficha `evhd` con el estado de la revisión), `app/(app)/eventos/publicar/` (Publica tu evento), Super Admin `/admin/eventos` (Eventos ·
Organizadores, ficha) + `ColasEventos.tsx` (Colas › Eventos a revisar con el plazo de Configuración) + N360 › Contenido › Eventos,
bloques `evrow`/`cal`/`evhd` portados a `packages/ui/src/panel/Bloques.tsx`. Guardián nuevo `revisionAntesDePublicar`; ampliados
`alcoholNoSeVende`, `colaConVista` (ColasEventos + plazo de Configuración, sin comentarios), `ocultarAvisaYApela`, `configDesdeUnLugar` /
`configConLimites` (catálogo en varias migraciones) — 26/26 al revés (`alreves6a.cjs`; `alreves5i` sigue 26/26). e2e `evt6a` (66 ✓,
teléfono y escritorio), `adm5i` y `adm4ig` verdes. Ayuda: panel-eventos-crear, publica-tu-evento, admin-eventos-y-boletos. Revisar en el
sandbox: `docs/REVISION.md` «### 6a». **6b hecho (10 nov)** — el módulo Eventos del cliente: migración 0107 (`evt_listable` suma el
módulo Eventos del negocio — categoría que lo admite, interruptor `modules_on`, pausa `modules_off` del admin, negocio activo — y el
organizador sin bloquear, recalculado por triggers en businesses / event_organizers / categories; `rsvps` con el cupo contado por la base:
fila de la fecha `for update` antes de contar, contador `rsvp_n`/`going_n` por trigger y último control después de sumar; los derivados
de una fecha solo con la marca `tl.evt_derivado`; el cupo no baja de lo guardado; `events.venue_zip`; novedad con `link_kind 'event'` y
`post_en_vivo` que exige el evento en vivo; `app_events` + ver_evento/rsvp/guardar_evento/compartir_evento; plantillas rsvp_ok,
rsvp_recordatorio, rsvp_vence, evt_guardado_cerca (sin SMS); clave `rsvp_guarda_min`; backfill del módulo a quien ya tiene eventos).
Código: `lib/evt-publico.ts` (lista con cursor (starts_at, id) sobre el índice where listable, Esta noche, destacado, ficha, Ficha › Eventos,
Inicio, Buscar, Ciudad, últimos RSVP), `lib/rsvp.ts` (RSVP, Ya no voy, Mis eventos, barrido `vencerRsvp` + `barrerRecordatoriosEvt`),
`PUNTO_EVENTO`/`DIRECCION_EVENTO` en `lib/punto.ts`; pantallas `/eventos` (APP-EVT-BUSQ), `/eventos/esta-noche` (APP-EVT-NOCHE),
`/eventos/[slug]` (APP-EVT-LISTING oscura/clara, JSON-LD schema.org/Event); Ficha › Eventos, Inicio › Esta semana, Buscar › Eventos,
Ciudad (N eventos), Noche (la noche especial con `event_id` abre su evento), Novedades › botón Evento → Hoy en el barrio, Mi cuenta ›
Guardados › Eventos; panel: interruptor del módulo (Eventos solo donde aplica), Lo que vendes › Eventos, QUIÉN VA, «otro lugar» con código
postal ubicado con el geocodificador propio (`dir_ubicar`); Super Admin: ficha › sale al público + últimos RSVP, N360 › Pausar Eventos.
Guardianes nuevos `eventosSoloListables`, `eventosConCursor`, `rsvpConCupo`; ampliados `hoySoloEnVivo`, `puntoPublico`,
`configDesdeUnLugar` — 31/31 al revés (`alreves6b.cjs`; `alreves6a` sigue 26/26). e2e `evt6b` (79 ✓, teléfono y escritorio, incluye 3 a la
vez por los últimos lugares en la pantalla y 10 a la vez en la base) y regresión `evt6a`, `adm5i`, `com5e`, `noc4a`, `noc4b`. Ayuda:
eventos-buscar-y-ver, rsvp-gratis, eventos-en-la-ficha; novedades, noche-en-la-ficha, panel-eventos-crear y admin-eventos-y-boletos al día.
Revisar en el sandbox: `docs/REVISION.md` «### 6b». **6c hecho (10 nov)** — boletos, mesas, extras y códigos: migración 0108
(`ticket_types` · `event_tables` · `event_addons` desde la configuración del evento con `evt_sincronizar_venta` (evt_sincronizar_fechas la
llama; lo quitado se apaga, la cantidad no baja de lo vendido o apartado), existencia por fecha `ticket_stock` / `table_stock` con check
`sold_n + held_n <= quantity`, `discount_codes` (tope con check) + `discount_attempts` (solo inserción), `ticket_holds` (el apartado; vence
a `evt_apartado_min`), `tickets` (código TL-XXX-0000, `qr_ver`, estados; lo comprado no cambia; `sold_n` de la fecha por trigger),
`ticket_log` (solo inserción), `qr_keys` (solo la llave pública), orden B-9401…, `payments.transfer_group`, recibo `receipt_tickets`,
plantillas `bol_comprado` / `bol_reemitido` / `bol_anulado` / `bol_reenviado` / `evt_venta` (sin SMS), claves `evt_apartado_min`,
`evt_boletos_por_orden_max`, `evt_boletos_persona_fecha_max`, `evt_codigo_intentos_max`, `evt_apartados_vivos_max`), semilla
`0036_boletos.sql` (códigos TERRAZA10 y AMIGOS5 y dos órdenes pagadas con el simulador para el Jueves de Bachata; en una base nueva sin
equipo solo los códigos). Código: `lib/boletos.ts` (apartar con update condicional, soltar, `vencerApartados` y `repararBoletos` en el
barrido, `pagarBoletos` autorizar → boletos → capturar con candado por apartado, la orden, Mis boletos, el boleto, ventas del panel),
`lib/boletos-qr.ts` (Ed25519 con la llave del entorno `QR_LLAVE_PRIVADA` — la genera `infra/pruebas/deploy.sh` —, verificación con la
pública, matriz con el generador de Project Nayuki (MIT) dentro del repo `lib/qr/qrcodegen.ts`), `lib/codigos-evt.ts`,
`lib/boletos-admin.ts`, `lib/pagos/pasarela.ts` `retenerPlataforma` / `capturarPlataforma` (+ simulador y contrato), recibo por correo;
pantallas `/eventos/{evento}/boletos` (APP-EVT-BOLETOS), `/eventos/pagar/{apartado}` (APP-EVT-PAGO), `/eventos/orden/B-…` (APP-EVT-ORDEN),
Mi cuenta › Boletos y el boleto (USR-BOLETOS / USR-BOLETO), la ficha con «Boletos» / Agotado / Venta pausada / cerrada / no disponible
(Free y sin Cobros no venden); panel: barra de venta en la lista y la venta en la ficha (VENDIDO · MESAS · ÓRDENES, boletos, mesas · quién
las tiene, dinero con la comisión, códigos, compradores con Reenviar); Super Admin: Buscar boleto (código, orden, teléfono, nombre o el
texto del QR con su firma), la ficha del boleto con Reenviar · Reemitir · Anular, KPI BOLETOS EMITIDOS · BRUTO BOLETOS, la venta en la
ficha del evento, Transacciones › Boletos. `TicketQR` del sistema de diseño dibuja la matriz real (parche en `scripts/portar-sistema.mjs`).
Guardianes nuevos `boletosSinSobreventa`, `apartadoLoLlevaElServidor`, `nadaSeCobraSinBoleto`, `precioConCargos`, `qrFirmado`,
`qrSinDatosPersonales`, `boletosSoloSuyos`, `libroBoletos`; ampliados `dineroDelServidor`, `capturaMercado` — 42/42 al revés
(`alreves6c.cjs`; `alreves6a` 26/26, `alreves6b` 31/31). e2e `evt6c` (teléfono y escritorio, contra el simulador; ver REVISION).
Ayuda: comprar-boletos, mis-boletos-y-el-qr, panel-eventos-boletos-mesas-y-extras, panel-eventos-codigos; pagar-con-tarjeta y
admin-eventos-y-boletos al día. Revisar en el sandbox: `docs/REVISION.md` «### 6c» (con la revisión de seguridad). **6d hecho (10 nov)** —
después de comprar: migración 0109 (`ticket_transfers` (token de un uso guardado como sha256, teléfono cifrado + huella, «••NN», una
pendiente por boleto, nunca la recibe quien la manda, solo desde pendiente y antes de vencer), cortesías en `tickets` (`comp_name`,
`comp_phone_enc`, `comp_by`; check sin dinero; solo en una orden sin cobro; nunca devueltas), `tickets_antes` ampliado, `tickets_libera`
(al devolver, la base suelta el lugar), `bol_vigente` (válido y sin transferencia pendiente), `refunds.initiated_by 'buyer'` + `attempts`
/ `last_error` / `done_at` + trigger `refunds_tope` (pendiente + hecho ≤ cobrado, pago bloqueado), `ticket_refund_lines` (única por boleto y
por extra; `fee_kept_cents` / `fee_waived_cents`; solo inserción), `sim_refunds` (el simulador devuelve una vez por llave), `waitlist` (FIFO por
`created_at` inmutable) + `ticket_holds.waitlist_id`, `phone_messages` (SMS a un número sin cuenta, cifrado), motivos B- en `help_requests`,
plantillas bol_transfer_in / bol_cortesia / espera_lugar (SMS) y bol_transfer_ok / bol_transfer_vuelve / espera_vence / bol_cancelado /
bol_devuelto / evt_devolucion, claves bol_transferir_h · bol_cancelar_h · espera_oferta_min · evt_cortesias_max · bol_transferencias_dia_max).
Código: `lib/boletos-despues.ts` (transferir, deshacer, vencer, ver y recibir, cambiar el nombre, previo y cancelar con devolución en dos
pasos + `ejecutarDevolucion` + barrido `barrerDevolucionesBoletos`, devolver desde el panel, dar y quitar cortesías, lo del panel),
`lib/espera.ts` (ofrecer en orden con candado por fecha, barrido `barrerEspera`, anotarse, salir, panel, avisar a la lista),
`lib/boletos.ts` (la fila primero al apartar y al mostrar; la oferta vencida no se reaparta; el boleto enviado sin QR; ventanas; recibidos en
Mis boletos), `pasarela.devolver` (cobro de la plataforma sin reverse_transfer; simulador por llave), `devolverPago` (cuenta lo pendiente),
`avisarTelefono`, `huella` (cifrado), ayuda B- en `ayuda-cita.ts` (rubro «evt», directo a To'Latino) + `cabezaAyudaBoletos`; pantallas: la
orden (Transferir boletos, Ayuda con esta orden, ENVIADOS con Deshacer, política, devolución), las hojas Transferir · ¿Qué pasó? · Cancelar
· Cambiar un nombre (`app/(app)/eventos/Despues.tsx`), el boleto (Transferir este boleto, Deshacer, Cambiar el nombre), `/eventos/recibir/
[token]` (hueco #4), `/eventos/orden/B-…/ayuda` (APP-EVT-AYUDA-PAGO, hueco #3), la ficha con la lista de espera, el pago «SE LIBERÓ UN
LUGAR»; panel: Devolver, CORTESÍAS, DEVOLUCIONES, TRANSFERIDOS, LISTA DE ESPERA con Avisar a la lista, AYUDA CON ÓRDENES; Super Admin: el
boleto con su historial (transferencias, devolución, cortesía), la ficha del evento con cortesías · transferidos · lista de espera, Colas ›
Ayuda con una orden de boletos, Transacciones sin cortesías. Guardianes nuevos `qrViejoNoEntra`, `cortesiaSinDinero`, `listaDeEsperaEnOrden`,
`devolucionUnaVez`; ampliados `devolverCoincide`, `dineroDelServidor`, `boletosSinSobreventa`, `libroBoletos` — 42/42 al revés
(`alreves6d.cjs`). e2e `evt6d` (teléfono y escritorio, contra el simulador; ver REVISION). Ayuda: transferir-boletos,
cancelar-y-devoluciones-de-boletos, lista-de-espera, ayuda-con-la-orden-de-boletos, panel-eventos-cortesias-y-devoluciones; comprar-boletos,
mis-boletos-y-el-qr y admin-eventos-y-boletos al día. Revisar en el sandbox: `docs/REVISION.md` «### 6d» (con la revisión de seguridad).
**6e hecho (10 nov)** — cambios del evento y dinero del organizador: migración 0110 (`event_changes` / `event_notices` / `ticket_choices`
de solo inserción; `event_cancellations` (una por fecha o evento, running → done); `event_settlements` por fecha con `pay_on` (el martes,
`evt_pago_dia`) y el trigger que decide todo al pasar a 'paying' (fecha terminada, martes llegado, sin disputas abiertas, sin devoluciones
pendientes ni cobros a medias, sin boletos vivos de una fecha cancelada, cuenta habilitada y sin pausar, sin la retención del organizador nuevo;
montos de `evt_liq_calc` y deuda de `evt_liq_deuda` con candado por negocio; llave única `evt-liq-<fecha>`; fija una vez en camino);
`event_settlement_reversals` (nunca más de lo transferido); `sim_transfers` / `sim_transfer_reversals`; `events.sales_frozen_*` (+ trigger
`events_congelado`); `event_organizers.payout_cleared_*`; `refunds.initiated_by 'event_moved'`; colas `evtcx` y `evtpago`; plantillas
evt_cancelado / evt_fecha_cancelada / evt_movido / evt_hora_cambio (SMS críticos), evt_aviso (sin SMS), evt_devolucion_total, evt_pago,
evt_pago_retenido, evt_venta_congelada; claves evt_aviso_max, evt_pago_dia, evt_retener_nuevo_cents, evt_cancelaciones_confianza,
evt_cancelaciones_dias, evt_ajuste_dias, evt_cancelar_lote; índices de la liquidación). Sin semilla. Código: `lib/evt-cambios.ts` (pausar /
reanudar, congelar, mover con avisos, elegir «Me quedo» / «Devolución total», cancelar una fecha o el evento con devolución total en lote
reanudable + avisos una vez + Confianza, avisos a los que van, lo del panel, la orden y la ficha), `lib/evt-liquidacion.ts` (crear, liquidar el
martes, retener automático, pagar con la llave, reparar, revertir deudas, retener / soltar del admin, panel, admin y CSV),
`boletos-despues.anotarDevolucionTotal`, `boletos.soltarApartadosDe`, `rsvp.moverRsvps`, `pasarela.transferir` / `revertirTransferencia`
(+ simulador y contrato), evidencia de disputas de boletos; barrido evtCancelaciones · evtLiquidar · evtLiquidacionesReparar · evtAjustes.
Pantallas: panel (`app/panel/EventosCambios.tsx`: VENTA, cambiar fecha u hora, cancelar con QUÉ CANCELAS · ¿POR QUÉ?, AVISOS A LOS QUE VAN,
DINERO DEL EVENTO; Cobros › PAGOS DE EVENTOS, Cobros con tarjeta para organizadores), la orden (cambió de fecha con la elección, cancelado por
el organizador, avisos), la ficha (Cambió de fecha, aviso en Antes de ir) y la página de un evento cancelado; Super Admin: la ficha del evento
(cambios, dinero por fecha, Congelar ventas, Cancelar y devolver todo), `/admin/eventos/liquidaciones` (KPI, filtros, retener / soltar, CSV),
Colas «Organizadores que cancelan» y «Pagos de eventos retenidos». Guardianes nuevos `scriptsSeLeen` (node --check a scripts/ e infra/: la
falla del CI de 6d), `contratoCubreLaPasarela`, `devolucionTotalAlCancelar`, `pagoDespuesDelEvento`, `avisoEventoSmsSoloCritico`,
`libroCambiosEvento`, `dineroSinDesbordar` (centavos × centavos en bigint: Transacciones, Ingresos, 360 › Dinero y Cobros se caían con un
cobro de $2,250 — corregido en los 6 lugares); ampliados `revisionAntesDePublicar` (reanudar un pausado aprobado) y `devolverCoincide` (el cuerpo
de cada acción, también cancelar) — 38/38 al revés (`alreves6e.cjs`; `alreves6a` 26/26, `alreves6b` 31/31, `alreves6c` 42/42, `alreves6d` 42/42). Contrato de Stripe
corrido en local contra stripe-mock (todas las llamadas). e2e `evt6e` 96 ✓ (teléfono y escritorio; ver REVISION) y regresión evt6d 126 ✓, evt6c 70 ✓,
disp2r, ing2s y adm5i verdes; base nueva (migraciones dos veces + semillas + semillas cambiadas) sale 0. Ayuda: panel-eventos-cancelar-cambiar-y-avisar, panel-eventos-cobros, si-cambia-o-se-cancela-un-evento; disputas,
admin-negocio-dinero y admin-eventos-y-boletos al día. Revisar en el sandbox: `docs/REVISION.md` «### 6e» (con la revisión de seguridad).
**6f hecho (10 nov)** — series y eventos de varios días: migración 0111 (`events.rep` validado (`evt_rep_ok`: cada semana con sus días, cada
2 semanas, cada mes / «el último»), `day_hours` (horario por día), `day_cap` (aforo por día), `dates_until`; check de la forma (una fecha ·
serie · varios días, sin mesas en varios días) y trigger `events_forma` (topes de Configuración `evt_fechas_max` / `evt_dias_seguidos_max`
leídos en el momento; con boletos vendidos la duración no cambia); `event_dates.serie_dia` (de qué día de la regla salió) y `moved_at`;
**`evt_generar_fechas`** (la base genera las fechas de la regla hasta `evt_dias_adelante`, nunca salta ni mueve una fecha con gente:
`evt_fecha_con_gente`; la movida a mano no vuelve a su hora; lo que sale de la regla queda «skipped»; nada se borra) y `evt_sincronizar_fechas`
/ `evt_sincronizar_venta` reemplazadas (boletos «Vale para» un día: `ticket_types.valid_day`; la existencia de varios días vive en el ancla =
el último día: `evt_ancla`); **`event_day_stock`** con check `capacity = 0 or sold_n + held_n <= capacity` y el trigger `ticket_stock_dia`
(el pase cuenta en todos los días; ninguna ruta pasa del aforo de un día); `tickets_dias` (la base pone `valid_days` al emitir) y el gancho de
la puerta `bol_fechas_validas` / `bol_vale_en`; `bol_tipo_hasta` (un boleto de un día se vende hasta el corte de su día, el pase hasta el del
primero); `evt_extender_series` (barrido: crea las fechas que el horizonte alcanza y marca «done» las que pasaron); plantilla `evt_artista`
(sin SMS); claves de Configuración al día), semilla **`0037_series.sql`** (el sancocho cada domingo, la vigilia cada mes, el festival de 3
días; 0035 sin tocar; la puerta y el evento privado del plan pasan a 0038 y 0039). Código: `lib/evt-comun.ts` (Repite, `fechasSerie` / `repL` /
`spanL` / `valeL`: la misma regla para mostrar), `lib/evt.ts` (normalizar y escribir la duración, `chequeoVenta` con las fechas con gente,
`errorDeLaBase`, `fechasDe` en una consulta, lista y ficha del panel con la próxima fecha), `lib/evt-series.ts` (saltar / volver a poner,
artista solo esta fecha con aviso, VENDIDOS POR DÍA, `extenderSeries`), `lib/evt-cambios.ts` (mover UNA fecha de una serie con `moved_at`;
varios días se cancela entero), `lib/boletos.ts` (aforo por día en lo que queda, corte por día, ancla, «Vale solo el…», la ficha del panel
de LA FECHA QUE ESTÁS VIENDO), `lib/espera.ts` (la fecha que se ve / el ancla), `lib/evt-publico.ts` (una serie sale UNA vez en cada lista con
`PRIMERA` dentro del filtro y el cursor de siempre; «CADA JUEVES · +N FECHAS»; la ficha con FECHAS · CADA …, rango, DÍAS Y HORARIO, programa de
esa fecha y la venta en el ancla); pantallas: editor (`app/panel/EventosSeries.tsx`: DURACIÓN · SE REPITE · QUÉ DÍAS · CUÁNTAS FECHAS · CUÁNTOS
DÍAS · Horario distinto cada día · Crear un boleto por cada día + pase · VALE PARA · Aforo por día; el calendario marca la serie y salta),
la ficha del panel (FECHA QUE ESTÁS VIENDO, FECHAS con Saltar / Volver a ponerla, QUIÉN SE PRESENTA · SOLO ESTA FECHA, POR DÍA · CUÁNTOS VAN,
VENDIDOS POR DÍA, «Cambiar el {fecha}», QUÉ CANCELAS), cliente (lista, ficha, boletos, orden y boleto con el rango y «Vale…»), Super Admin
(lista «Cada jueves · N por delante» / «3 días», ficha FECHAS / DÍAS, LO QUE CAMBIA · Se repite); bloques `evhd` (hasDates) y `chart`
portados del Panel v2 a `packages/ui/src/panel/Bloques.tsx`; barrido `evtSeries`. Guardianes nuevos `fechasLasGeneraLaBase`, `aforoPorDia`,
`serieUnaVezEnLista` — 22/22 al revés (`alreves6f.cjs`). e2e `evt6f` (teléfono 390 y escritorio 1360, contra el simulador; ver REVISION) y
regresión evt6a 66 ✓, evt6b (la copia de 6c, evt6b-6c) 79 ✓, evt6c 71 ✓, evt6d 127 ✓, evt6e 97 ✓ y adm5i 56 ✓ (evt6b: la cifra «N EVENTOS» ahora cuenta eventos, no fechas: prueba al día); base nueva (migraciones dos veces +
semillas + semillas cambiadas) sale 0. Ayuda: panel-eventos-series-y-varios-dias; eventos-buscar-y-ver, panel-eventos-crear y
admin-eventos-y-boletos al día. Revisar en el sandbox: `docs/REVISION.md` «### 6f».
**6g hecho (10 nov)** — la Puerta en línea (D1: solo escanea): migración 0112 (`door_staff` (invitados por el negocio con nombre + teléfono cifrado +
huella + «··1234», código de 7 días, alcance todos / algunos eventos del mismo negocio, `role 'scan'`, tope `puerta_porteros_max`; quitar = 'removed'
y la base cierra sus sesiones en el acto), `door_sessions` (una puerta abierta por persona y fecha, de portero o de miembro con «evt»; NOTIFY al
cerrarse), **`puerta_puede` / `puerta_acceso`** (portero activo con ESE evento o miembro con «evt», negocio activo, evento publicado, ventana del día
`puerta_ventana_h`), **`ticket_scans`** (solo inserción; id uuid del teléfono = idempotencia; solo `puerta_registrar` escribe, con la marca tl.puerta;
el trigger suma `door_counts` por puerta y `event_dates.entered_n` / `inside_n` y hace NOTIFY 'puerta'), **`ticket_entries`** (la fila que se bloquea
por boleto y fecha; check entered_n ≤ admits; un pase entra una vez cada día), **`puerta_entrada`** (fila del boleto bloqueada: versión del QR,
anulado, devuelto, reemplazado, transferencia pendiente = bol_vigente, otro día = bol_vale_en, otro evento, reentrada, hora de cerrar la puerta,
aforo del día / RSVP / por puerta; primera entrada → 'used'), `puerta_rsvp` (entran N de M; `rsvps.arrived_n`; rsvp_n cuenta a los que llegaron),
`puerta_contar` (entrada libre), `puerta_noche` (registra; marca noche-reservas), `door_table_numbers`, `door_incidents`, `door_searches`,
`events.door_close_after_min` / `door_caps`, plantillas puerta_invitado (SMS) / puerta_asignado / puerta_abre / puerta_incidencia, claves
puerta_*), semilla **`0038_puerta.sql`** (Junior y Karla activos en La Terraza). Código: `lib/puerta.ts` (accesoPuerta, misPuertas, abrirPuerta,
escanearQR con la firma Ed25519 por la llave pública y la pregunta de grupo / ID, entradaManual, marcarRsvp, contar, lista / llegada de la noche,
buscar con límite, lista con cursor, aforo, mesas, incidencias, equipo, últimos, cierre, barrido), `lib/puerta-equipo.ts` (invitar / aceptar /
quitar / asignar porteros, REGLAS DE PUERTA, el panel), `lib/puerta-admin.ts`, `lib/puerta-vivo.ts` (LISTEN 'puerta' → SSE), `lib/puerta-comun.ts`,
`noche-reservas.listaEnLaPuerta` / `marcarLlegada`; `/api/puerta/escanear` y `/api/puerta/vivo` (SSE); pantallas: **To'Latino Puerta**
(`app/(puerta)/puerta`: tus puertas + código, Escanear con cámara (BarcodeDetector o jsQR 1.4.0 Apache-2.0 en un Worker, dentro del repo en
`public/puerta/`), Buscar, Lista, Lista de la noche, Aforo, Mesas, Incidencias, Equipo, Cierre), el panel (`EventosPuerta.tsx`: PUERTA,
PORTEROS, REGLAS DE PUERTA, modo puerta con la misma cámara y el Monitor en vivo), Super Admin › Modo puerta (`/admin/eventos/puerta`) y ESCANEOS
del boleto, Mi cuenta «Usado · entraste a las …» / «VÁLIDO · OTRO DÍA». Guardianes nuevos `sinVentaEnLaPuerta`, `porteroSoloSuEvento`,
`escaneoIdempotente`; ampliados `codigoPuerta`, `libroSoloInsercion`, `avisoEventoSmsSoloCritico` (puerta_invitado) — 33/33 al revés
(`alreves6g.cjs`). e2e `evt6g` 105 ✓ (teléfono 390 y escritorio 1360; cámara falsa de Chromium con el QR real) y regresión evt6c 70 ✓, evt6d
126 ✓, evt6e 96 ✓, evt6f 87 ✓, adm5i ✓, noc4c ✓ (con el reloj movido más: su −2000 min no alcanza cuando la noche abierta es en 2 días); base
nueva (migraciones dos veces + semillas + semillas cambiadas) sale 0. Escaneo en línea local: p50 21 ms, p95 26 ms (sin base de carga). Ayuda:
puerta-escanear, panel-porteros-y-modo-puerta, admin-puerta-auditoria; lista-y-mesa-de-noche, panel-mesas-y-lista, admin-eventos-y-boletos,
mis-boletos-y-el-qr y panel-eventos-series-y-varios-dias al día. Revisar en el sandbox: `docs/REVISION.md` «### 6g» (con la revisión de seguridad).
**6h hecho (10 nov)** — la Puerta sin conexión (decisión T #23; D1: solo escanea): migración 0113 (`door_packages` (el paquete de cada sesión SIN
el contenido: huella, filas, vence a fin + `puerta_paquete_h`, revocado al cerrarse la sesión por trigger y por el barrido `puertaPaquetes`),
`puerta_paquete_filas(fecha, desde)` (= door_delta: lo único que viaja; sin teléfonos, correos ni montos), `door_syncs` (solo inserción: cada
subida con su desfase de reloj), `ticket_scans` suma la hora que cuenta (`at_eff`), desfase, reloj desviado, lo que decidió el teléfono y la
subida, **`ticket_scan_fixes`** (solo inserción: las correcciones cuando al subir otra puerta cambia quién ganó) + vista **`ticket_scans_ef`**
(la resolución vigente), **`puerta_offline` / `puerta_rehacer`** (idempotente por el id del teléfono, «ajeno» si es de otra puerta, la sesión de
esa persona —cerrada por ella, el panel o el barrido sube hasta que vence; revocada o portero quitado no—, lo que valía al subir → rejected +
incidencia «sin_valor», el primero por la hora corregida gana y el otro «duplicate» + incidencia «duplicado»), `door_sessions.ended_by 'revoked'`
(«Revocar este teléfono», también después de cerrada), `door_incidents` automáticas, claves `puerta_paquete_h` 6, `puerta_sync_seg` 15,
`puerta_offline_aviso_min` 10, `puerta_sync_lote` 200, `puerta_reloj_desvio_seg` 120). Código: `lib/puerta-paquete.ts` (armar firmado con la
llave Ed25519 del QR, prefijo TLPK1, y cifrado AES-256-GCM con la llave derivada de la sesión + persona + teléfono; cambios desde un cursor),
`lib/puerta-sync.ts` (`aplicarCola` por `/api/puerta/escanear` `{tipo:"cola"}`: desfase medido en cada subida, door_syncs, aviso al
organizador), `/api/puerta/paquete`, `/api/puerta/llaves` (públicas), `lib/cifrado.llaveDerivada` (HKDF), `boletos-qr.firmarPaquete /
llavesPublicas`; en el teléfono `app/(puerta)/puerta/sin-conexion/` (IndexedDB cifrado con llave no exportable, verificación Ed25519 con WebCrypto
o @noble/ed25519 2.3.0 MIT vendida en `lib/ed25519/`, decidir con las reglas de `puerta_entrada`, cola cifrada, buscar sin señal,
`usePuertaLocal`: preparar → poner al día cada 15 s → subir en orden → borrar al cerrar / revocar / vencer), la línea **EN LÍNEA / SIN
CONEXIÓN · N POR SUBIR · lista de las …**, el aviso grande a los 10 min, la pantalla sin señal `/puerta/sin-conexion` (estática), el service
worker propio `public/puerta/sw.js` (alcance /puerta: solo la cáscara y archivos con huella) y el manifiesto (instalable); el panel (Monitor:
cada teléfono con lo subido sin conexión, repetidos, reloj, **Revocar este teléfono**; incidencias automáticas) y el Super Admin (sesiones,
incidencias, ESCANEOS con SIN CONEXIÓN / REPETIDO / hora corregida / reloj desviado); **el QR del cliente sin señal** (`lib/boletos-sin-conexion.ts`:
cifrado con la cookie `tl_bk` de la sesión, borrado al salir; `public/sw-boletos.js` + la cáscara estática `/cuenta/boletos/sin-conexion`).
Guardianes nuevos `paqueteMinimo`, `choqueDePuertaDeterminista`, `sinConexionSinDatosAjenos`; ampliados `escaneoIdempotente` y `qrViejoNoEntra`
(sin conexión) — 45/45 al revés (`alreves6h.cjs`). e2e `evt6h` 88 ✓ (teléfono 390; panel, Super Admin y Mi cuenta sin señal 1360; Playwright
sin red y service worker; ver REVISION «### 6h») y regresión evt6g 105 ✓, evt6c 70 ✓, evt6d 126 ✓, adm5i ✓; base nueva (migraciones dos veces +
semillas + semillas cambiadas) sale 0.
Ayuda: puerta-sin-conexion (nueva, ES/EN); puerta-escanear, panel-porteros-y-modo-puerta, admin-puerta-auditoria y mis-boletos-y-el-qr al día.
Revisar en el sandbox: `docs/REVISION.md` «### 6h» (con la revisión de seguridad y cómo probar sin señal en un teléfono de verdad).
**6i hecho (10 nov)** — el evento privado (la solicitud de un grupo grande a un restaurante, §6 #9): migración 0114 (`private_event_settings` (el
interruptor y sus reglas: personas mín./máx., días de anticipación, % de depósito 10–50, áreas + «Todo el local» con su cargo, menús con precio por
persona o «que me propongan», extras), operación `private_event` con número **EP-4101…** (`private_event_seq`; el prefijo no choca), **`private_event_quotes`**
(SOLO INSERCIÓN; el trigger calcula cada línea, subtotal, impuesto de la ciudad (`tax_rules` NEG-FOOD 6 %), total, depósito (% del negocio; en un cambio,
lo ya pagado), el plazo de cancelar escrito en la propuesta y hasta cuándo vale), **`private_event_acceptances`** (solo inserción; la base revisa última
versión, vigencia, estado y dueño; una con depósito por solicitud), **`private_event_asks`** (solo inserción: «pedir un cambio»), vista
`private_event_quotes_ef` (estado derivado), comisión `evp` 8 %, 9 claves evp_* y 20 plantillas evp_*), semilla **`0039_evento_privado.sql`** (Sabor 40 ·
Fogón 60 · Bahía 30 y una solicitud en cada estado de Lucía Paredes, +15705550561). Patrón seguido: la mudanza de 4y-2 (propuesta versionada, aceptar la
versión exacta, retener y cobrar en la misma pasada con destino al restaurante) + cancelar de Fiestas/Noche. Código: `lib/evento-privado.ts` (ajustes,
pedir sin dinero, proponer / otra fecha / cambio, no puedo, aceptar y pagar, pedir un cambio, aceptar o rechazar un cambio, no gracias, cancelar con la
regla del acuerdo, el restaurante cancela con devolución completa, `vencerEvp` en el barrido: sin respuesta, propuesta y cambio que vencen, recordatorio
del día antes, «Pasó el evento», devoluciones a medias con la misma llave), `lib/evento-privado-comun.ts`; pantallas: **Pedir evento privado**
(`/n/[id]/evento-privado`, 3 pasos / una página), **tu solicitud** (`/privado/[num]`, 7 estados, la propuesta, la tarjeta del depósito, pedir un cambio,
cancelar) y `/privado/[num]/ayuda`; Reservar «9+» → «Pedir evento privado»; panel (`EventoPrivado.tsx`: Reservaciones › Evento privado, Hoy, el
detalle con la propuesta línea por línea, otra fecha, no puedo, el cambio y cancelar); Mensajes con el contexto «Evento privado #EP-…»; ayuda (rubro
`evp`, motivos, Colas › Soporte); Mi cuenta › Citas y reservas; Super Admin › Transacciones › Evento privado (con Devolver). Guardianes nuevos
`depositoDeLaPropuesta`, `devolucionEvpAcotada`, `evpSinTelefonos`; ampliados `libroSoloInsercion`, `prefijosAyuda` (prefijos de dos letras),
`avisoEventoSmsSoloCritico` — 40/40 al revés (`alreves6i.cjs`). e2e `evt6i` 74 ✓ (teléfono 390; panel, cliente y Super Admin 1360; contra el
simulador; ver REVISION «### 6i») y regresión fie4v ✓, rsv2e ✓, evt6c 70 ✓, adm5i ✓; base nueva (migraciones dos veces + semillas + semillas cambiadas)
sale 0. Ayuda: evento-privado y panel-evento-privado (nuevas, ES/EN); reservar-mesa, panel-reservaciones, ayuda-con-la-fiesta-y-el-viaje,
admin-configuracion y admin-contenido al día. Revisar en el sandbox: `docs/REVISION.md` «### 6i» (con la revisión de seguridad).
**6j hecho (10 nov)** — Super Admin completo de la fase, Configuración › Eventos, avisos de Eventos, analítica, Mi cuenta y ayuda: migración
**0115** (`config_keys`: evt_recordatorio_hora 10, evt_aforo_aviso_pct 90, evt_senal_ordenes_n 4 / _min 10, evt_senal_cadena_n 2 — 47 claves de
Eventos — y evt_pago_dia en SOLO LECTURA porque los textos dicen «el martes»; grupo de avisos **`events`** con prefs evt · evtR · evtG, lo crítico sin
interruptor, las evp_* fuera de citas, plantillas nuevas bol_recordatorio, bol_es_hoy, evt_aforo90, evt_ajuste_admin; **`evt_avisos_enviados`** (solo
inserción: cada aviso automático una vez); **`event_dates.sales_extended_until`** con check ≤ inicio y `bol_venta_hasta` redefinida; **`event_stock_overrides`**
(solo inserción) + trigger `evt_cupo_admin` en ticket_stock / table_stock / event_day_stock (el ajuste de To'Latino manda sobre el editor; el check
de cada tabla sigue); `event_changes` suma capacity_adjusted y sales_extended; `event_format_categories.enabled`; `mod_flags` regla `evt`; vistas
**`evt_senales`** (ráfaga, cadena, duplicado, contracargo), **`evt_sobreventa`** (alerta viva), **`evt_analitica_dia`**, **`evt_asistencia_dia`**,
**`evt_ventas_negocio_dia`**, **`evp_analitica_dia`** (por ciudad, día local y formato, sin personas)). Código: `lib/evt-admin.ts` (cupos de una fecha,
ajustarCupo, extenderVenta, sobreventa, senalesEvt / abrirCasoEvt, actividadEventos, eventos360, catálogo), `lib/evt-avisos.ts` (barrido:
bolRecordatorios y evtAforo), `lib/avisos.ts` (grupo events; **el título también se llena**), `lib/rsvp.ts` lee la hora de Configuración,
`lib/evt.ts` (formatosDe con el catálogo: apagar no deja a nadie sin editar lo suyo; la lista del panel con lo próximo primero), `lib/mi-cuenta.ts`
(Tu semana con boletos, RSVP y evento privado), `lib/admin-analitica.ts` (eventosAnalitica), la puerta lee `puerta_ventana_h`. Pantallas: Super Admin ›
Eventos y boletos (KPI con la comisión, alerta de sobreventa, pestaña **Catálogo**, ficha con CUPOS · Ajustar cupo · Extender ventas), Inicio con la
alerta, Configuración en subgrupos, Confianza › Fraude › EVENTOS Y BOLETOS con «Abrir caso», Usuarios 360° › **Actividad**, Negocios 360° ›
Eventos (liquidaciones y cancelaciones), Analítica › **Eventos**, Notificaciones › **Solo Eventos**; Mi cuenta › Avisos › **Eventos** y Tu semana;
el panel dice «To'Latino ajustó tu evento». Guardianes nuevos `avisoTituloLleno`, `eventosCriticoSiempreLlega`, `ajusteAdminConRegla`,
`listaConTopeLoQueImporta`; ampliados `analiticaSinPersonas`, `libroSoloInsercion`, `configDesdeUnLugar` — `alreves6j` 29/29. e2e **`adm6j` 63 ✓**.
Corrida seguida de la fase (una sola, 10 nov): `evt6a` evt6a OK · `evt6b-6c` ✗ (React #418 una vez; sola: evt6b OK dos veces) · `evt6c` 70 ✓ ·
`evt6d` 126 ✓ · `evt6e` 96 ✓ · `evt6f` 87 ✓ · `evt6g` 105 ✓ · `evt6h` 88 ✓ · `evt6i` ✗ (paso de 52 s con reloj real; sola: 74 ✓) · `adm6j` 63 ✓ ·
`adm5i` ✓ todo. Base nueva (migraciones dos veces + semillas + semillas cambiadas) sale 0. Ayuda al día: admin-eventos-y-boletos,
admin-configuracion, notificaciones, admin-analitica, mi-cuenta, admin-confianza-y-seguridad, admin-usuarios. Revisar en el sandbox: `docs/REVISION.md`
«### 6j» (el paso a paso de toda la Fase 6).
**Fase 6 completa (10 nov):** Eventos — publicar y revisar, el módulo y la ficha, RSVP, boletos / mesas / extras / códigos con QR firmado, después
de comprar (transferir, cancelar, cortesías, lista de espera, ayuda B-), cambios del evento y liquidación del martes, series y varios días, la Puerta
en línea y sin conexión, evento privado, y el Super Admin, Configuración, avisos y analítica de todo — con cliente, panel y Super Admin. Lista de
cierre §8 marcada salvo lo que dice su motivo (CI y 9 dispositivos, base de carga de 1 M, suites de Pedidos / Reservaciones / Noche en el CI). Falta
el OK del fundador en el sandbox con las guías de `docs/REVISION.md` («### 6j» trae el paso a paso de toda la fase).
Sigue **Fase 7 · El Compa** — plan del grupo.
**Fase 7 · El Compa — plan escrito (10 nov):** `docs/diseno/plan/fase7-compa.md` (bloques 7a–7i, migraciones 0116–0124, semillas 0040–0042, preguntas #1–#18 con su default). 
**7a hecho (10 nov)** — La ayuda como base de conocimiento y el Centro de ayuda: migración **0116** (`help_topics` 10 temas con su audiencia,
`help_articles` (slug = archivo, título ES/EN, audiencia vecino · negocio · portero · equipo con checks: admin-* = equipo, panel-* = negocio,
puerta-* = portero; tema de su audiencia por trigger; live · paused · retired; `city_id` null = todas), `help_chunks` (≤ 1 800 letras, `tsv` GENERADO
spanish/english sin acentos con pesos título/encabezado/cuerpo, GIN + (audience, lang), trigger: un trozo nunca más abierto que su artículo;
solo-equipo = «equipo»), `help_article_log` SOLO INSERCIÓN, `ayuda_indexar()` idempotente por sha256, `ayuda_retirar()`, `ayuda_consulta()`
(prefijo + sinónimos «query» del Catálogo, and/or), Configuración › **El Compa** (`ayuda_trozos_max` 4, `ayuda_umbral_rank` 50 ‰, solo lectura hasta 7c)).
**docs/ayuda normalizada** (151 archivos: los 149 + `centro-de-ayuda`, `admin-ayuda`): forma única (`scripts/ayuda/forma.mjs`): título «ES · EN»,
`_Pantallas … Versión … Audiencia … Tema_`, secciones en español y una sola `## English` (antes 4 formas y ~35 sin inglés de verdad: se escribió el
inglés de 14 y se juntó el de los demás), sin «Fase N» / bloques / «llega con …» fuera de `<!-- solo-equipo -->` (los «Para El Compa» y lo
interno de admin-equipo quedan solo-equipo), y hechos viejos corregidos contra el código (tarjeta en pedidos, devoluciones a la tarjeta, boletos
que «abren pronto», series, Booking de Doctores y de Auto/Hogar, SMS de citas y mesas, monedas de bienvenida, puntos, Repartidor, Transacciones con
dinero…; lista en REVISION 7a). `scripts/ayuda/indexar.mjs` (SQL a psql; `deploy.sh` 3c-bis con `node:22-alpine`, sin red, `|| log`; CI lo corre
dos veces). Código: `lib/compa/ayuda-indice.ts` (`audienciasDe` con la sesión, `temasAyuda`, `listaAyuda`, `buscarAyuda` GIN con rango y caída a
«cualquiera» y al otro idioma, `articulo`, `titulosVisibles`, `ayudaAdmin`, `pausarAyuda`); pantallas **`/ayuda`** (Centro de ayuda: buscador, chips
de tema, tarjetas por tema; escritorio con Temas y «¿No encontraste lo que buscas?») y **`/ayuda/[slug]`** (artículo con «See in English / Ver en
español», secciones en tarjetas, «Más en {tema}», 404 si no es de tu audiencia, «se está revisando» si está pausado), `md.tsx` (Markdown sin HTML
crudo; «`otro.md`» → enlace solo si lo puedes leer); Super Admin › **Textos y páginas › Ayuda** (`/admin/textos`, cms: cifras, filtros, cursor,
Pausar / Volver a usar con motivo, historial). Enlaces: Mi cuenta › Ayuda (y navegación de escritorio), Panel › Más › Ayuda (`/ayuda?t=panel`),
To'Latino Puerta › Cómo funciona la puerta. De paso: 3 textos de pantalla viejos («la venta en la app abre pronto» en Publica tu evento y el editor de
eventos; «(Fase 2)» en Equipo). Guardianes **`ayudaConForma`**, **`ayudaSinFaseInterna`** (también textos de pantallas), **`compaAyudaPorAudiencia`**
y `libroSoloInsercion` ampliado (36/36 al revés, `alreves7a`); e2e `ayu7a` 56 ✓ (vecino sin y con cuenta, dueña, portero, Admin; pausar ↔ volver;
reindexar sin cambios). Sigue **7b** (Soporte: casos TK-, Mi cuenta › Ayuda y soporte, panel y Super Admin › Soporte; semilla 0040).
**7b hecho (10 nov)** — Soporte: casos con To'Latino. Migración **0117** (`support_cases` TK-5201… de su secuencia, estados new · in_progress ·
waiting · resolved · reopened · merged, prioridad, asignado, plazo `sla_due_at` en **horas hábiles** (`soporte_sla`: Configuración › Soporte, hora de
la ciudad), «¿Se resolvió?», enlazado y unido, clave «un toque = un caso»; la **cola `ticket` la lleva la base** (trigger: entra cuando le toca al
equipo, sale cuando le toca a la persona); `support_messages` SOLO INSERCIÓN con notas internas, foto privada y rechazo de tarjeta/SSN en la base;
`support_macros` ES/EN sin HTML (6 de fábrica); `support_refunds` con **el tope del rol puesto por la base** (`soporte_tope_devolver`: Soporte $50 por
caso sumando lo devuelto, Finanzas/Admin hasta lo cobrado) y llave tk- única; plantillas sop_*; Configuración › Soporte (7 claves); Finanzas ve
Soporte). Semilla **0040** (Dayana Soporte, Omar Finanzas, Marisol; 7 casos en cada estado, uno de seguridad ALTA vencido, uno con pedido pagado de
$85 en El Fogón, uno de un negocio). Código: `lib/soporte.ts` (la persona: `abrirCaso`, `misCasos`, `casoVecino`, `escribirCaso`, «Ya se resolvió»,
`calificarCaso`, `abrirCasoDesdeCompa` para 7c/7d), `lib/soporte-equipo.ts` (el equipo: lista y cifras, ficha con contexto, tomar, responder con
macro, nota interna, resolver, **resolver y devolver** por `devolverPago`, pasar a Finanzas, unir, ligar, reabrir, ocultar, macros, barrido de
plazo), `lib/compa/tapar.ts`, `lib/soporte-comun.ts`; pantallas **`/soporte`** (APP-SOPORTE tal cual; `?negocio=` = Panel › Más › Ayuda y Soporte),
Mi cuenta › **Ayuda y soporte** (y navegación), Super Admin › **Soporte** (`/admin/soporte`: Abiertos · Míos · Escalados · Resueltos · Macros, ficha),
Colas › «Soporte · casos», Usuarios 360° y Negocios 360° › Soporte; los «escríbenos» del Centro de ayuda y del panel abren Soporte. Guardianes
**`soporteCasoConSla`**, **`notaInternaNoSale`**, **`soporteDevolverConTope`**, **`compaTapaSecretos`** (Soporte, con vectores), **`soporteSoloSuyos`**,
**`macroSinHtml`**, **`prefijoSoporte`**, **`soporteSoloInsercion`** (45/45 al revés, `alreves7b`); e2e **`sop7b` 104 ✓** (390 y 1360). Ayuda:
`soporte`, `panel-ayuda-y-soporte`, `admin-soporte`; `mi-cuenta`, `centro-de-ayuda`, `admin-configuracion` al día. Sigue **7c** (el motor de El Compa:
interfaz del modelo, tapado, verificador, acciones, tope e interruptores; migración 0118).
**7c hecho (10 nov)** — El motor de El Compa (sin pantallas de vecino: llegan en 7d). Migración **0118** (`compa_conversations` CP-6101… con
`outcome` y `turns_n` DERIVADOS por la base; `compa_messages` SOLO INSERCIÓN con rechazo de tarjeta/SSN; `compa_actions` lista cerrada
`cancel_request · open_screen · go_to_panel`, id de un uso, proposed → confirming → confirmed/failed/expired una sola vez; `compa_handoffs`;
`compa_models` (precios en microdólares + 10 % de EE. UU.; Haiku 5.5 cotidiano, Sonnet 5.5 copiloto, «simulador» con precio de Haiku);
**el tope en la base**: `compa_spend_month` + `compa_reservations` + `compa_usage` (libro sin texto) con `compa_reservar` (reserva el máximo con la
condición gastado + reservado + máximo ≤ tope en una sentencia), `compa_anotar` (liquida con los tokens reales, aviso al 80 %), `compa_marcar_tope`,
`compa_soltar_reservas` (barrido); `compa_pauses` por ciudad/negocio; feature_flags `compa.use.*` y `compa.channel.*`; sección Super Admin
`compa` (Admin todo, Soporte ver/editar, Lectura ver); plantillas `compa_tope_80/100`; Configuración › El Compa (11 claves nuevas; `ayuda_trozos_max`
y `ayuda_umbral_rank` pasan a editables)). Código `lib/compa/`: `modelo.ts` (interfaz, esquema JSON, bloques de DATOS, `motorActivo`),
`modelo-claude.ts` (Messages API por fetch, versión 2026-10-21, `output_config.format` + esfuerzo bajo, `inference_geo us`, caché del sistema,
AbortSignal; ÚNICO que lee `ANTHROPIC_API_KEY`), `modelo-simulador.ts` (determinista e INGENUO: obedece inyecciones para probar al servidor; guarda
lo que recibe; no existe en producción), `modelo-reglas.ts` (reglas fijas del prototipo con la ayuda), `reglas.ts` (emergencia, dinero, seguridad,
cuenta y «quiero una persona» antes del modelo), `verificar.ts`, `tope.ts` (`gastar`, `anotarUso`, `gastoDelMes`, aviso al equipo Admin),
`interruptores.ts` (nivel, canal, ciudad, negocio; candado de producción `TOLATINO_COMPA=encendido`), `contexto-vecino.ts` (solo la sesión, op1…op10,
sin Salud/Profesionales/inscripciones/op_private), `acciones.ts` (`validarAccion`, `proponer`, `confirmar` en otra petición por `CANCELABLES` =
`citaCliente`/`rsvCliente` «cancelar», `descartar`, `vencerAcciones`), `persona.ts` (`pasarAPersona` → `abrirCasoDesdeCompa`), `conversacion.ts`
(`turno`, `cerrarConversaciones`), `admin-compa.ts`; `ayuda-indice.ts` suma `trozosCompa`. Ruta SOLO de pruebas `/api/interno/compa` (404 en
producción, token del barrido, sesión y mismo origen). Barrido: `compaConversaciones`, `compaAcciones`, `compaReservas`. Super Admin › **El Compa · IA**
(`/admin/compa`: gasto del mes con barra y tope, POR NIVEL, POR CANAL, POR CIUDAD, POR NEGOCIO, MODELO, REGLAS FIJAS, HISTORIAL; Conversaciones sin
texto con cursor) y alerta del tope en Inicio. Compose pasa `ANTHROPIC_API_KEY` (vacía hasta que el fundador abra la cuenta). Guardianes
**`compaSoloServidor`**, **`compaUnSoloProveedor`**, **`compaPorElTope`**, **`costosIA`** (parte IA de Costos), **`compaSinDinero`**,
**`compaAccionConfirmada`**, **`compaSoloSusDatos`**, **`compaSinDatosSensibles`**, **`compaTapaEnElMotor`**, **`compaSalidaLimpia`**,
**`compaInterruptores`**, **`compaSinRutaCritica`** + `compaAyudaPorAudiencia` y `libroSoloInsercion` ampliados (66/66 al revés, `alreves7c`); e2e
**`compa7c` 111 ✓** (motor con el simulador + Super Admin 390 y 1360). Ayuda: `admin-el-compa`, `privacidad-de-el-compa`. Sin dependencia nueva.
Sigue **7d** (El Compa para vecinos: hoja 2as en cada operación y pasos 2at en Soporte, `acciones-compa.ts` sobre `turno`/`confirmar`; migración 0119,
semilla 0041).
**7d hecho (10 nov)** — El Compa para vecinos. Migración **0119** (`operation_events.actor` suma «compa»; `help_requests.origin` form|compa DERIVADO
por la base (El Compa abrió ese formulario en las 2 h anteriores, `step_key 'formulario'`); **`compa_reads`** solo inserción (se adelanta de 0124);
plantilla `compa_caso`; analítica `compa_abrir · compa_mensaje · compa_accion · compa_persona`); semilla **0041** (una conversación por resultado:
resolvió solo, acción confirmada con la reservación cancelada por «compa», a una persona por dinero / seguridad / lo pidió, cuenta, no sabe; y
repara el pedido de la 0040 sin hora de listo). Código: `lib/compa/hoja.ts` (lectura barata y a prueba de fallas: `estadoVecino`,
`vecinoDisponible` (nivel, canal, ciudad de la persona y de la operación, negocio, tope), `opVecino`, `hojaDe`, `opsVecino`, `razonesDe` por tipo y
estado; nunca Salud/Pro/Niños/op_private); `conversacion.ts` suma `paso()` (los toques fijos sin modelo: preparar la cancelación por
`validarAccion`, abrir la operación o el formulario, persona, Mi cuenta) y `turno()` acepta la operación de la hoja; `persona.ts` con tema;
`citaCliente`/`rsvCliente` con `por: "compa"`; `tope.ts` `alTope`; `soporte.ts` avisa `compa_caso`; `admin-compa.ts` filtros canal/CP- y
**`fichaConversacion`** (compa:editar, lectura anotada antes de leer). Pantallas: **hoja 2as** en las 11 páginas «Ayuda con …» (`hoja-ayuda.tsx`:
antes del formulario, sobre la pantalla de la operación; `?de=compa` = el formulario; null/falla = lo de siempre), **2at** `/soporte/compa`,
`CompaVecino.tsx` (CompaFrame sheet/page con el aviso de IA + «QUÉ VE Y QUIÉN LO LEE», «Con una persona», Así queda + barra de confirmar,
Tu caso pasó a Soporte, fuente con enlace), acciones reales `acciones-compa.ts` (`compaTurno`, `compaPaso`, `compaConfirmar`, `compaDescartar`:
mismo origen + sesión + límites), Soporte «El Compa te ayuda al instante» + «Escríbenos», Mi cuenta (fila y Privacidad › El Compa), Super Admin ›
El Compa › Conversaciones (CANAL, CP-, ficha con hilo, acciones y QUIÉN LA LEYÓ). `next.config` sirve `/…/assets/x` (logo del avatar).
Guardianes **`compaSiempreIA`**, **`compaHojaSinRomper`**, **`compaLecturaAnotada`** + `compaSinRutaCritica`, `compaAccionConfirmada`,
`compaSoloSusDatos`, `compaInterruptores`, `compaSinDinero`, `libroSoloInsercion` ampliados (33/33 al revés `alreves7d`; 66/66 `alreves7c`); e2e
**`compa7d` 140 ✓** (390 y 1360); `compa7c` 111 ✓, `sop7b` 104 ✓, `adm5i` ✓; `ayuda2i`, `cit3e`, `ayu4if`, `ayu4z` ✓ con El Compa apagado y (salvo
`ayu4if`) al tope. Ayuda: **`el-compa`** nueva; las 9 `ayuda-con-*`/`resena-y-ayuda-*`, `soporte`, `privacidad-de-el-compa`, `mi-cuenta`,
`admin-el-compa` al día. Sigue **7e** (El Compa en el panel: `DASH-COMPA`, guía del panel `compa_panel_guide`, `go_to_panel`; migración 0120).
**7e hecho (11 nov)** — El Compa en el panel (`DASH-COMPA`). Migración **0120** (`compa_panel_guide`: 20 secciones = la navegación del panel
(las rutas de `page.tsx` + los apartados de Tu página), cada una con la **parte** que pide `accesoPanel`, cuándo aplica (siempre · vende ·
eventos · entrega · licencias), título y «qué hay» ES/EN, la ayuda que la explica (`help_slugs`) y las palabras con que el servidor la reconoce;
no se borra; plantilla `compa_caso_negocio`; sin semilla). Código: `lib/compa/contexto-panel.ts` (`contextoPanel(userId, negocio)`: vuelve a
comprobar en la base que es miembro activo; reparte la guía con la regla de `accesoPanel` en `secciones` (lo único que ve el modelo) y
`prohibidas`; cifras solo de sus partes; nunca clientes, teléfonos ni montos; `seccionPedida` por palabras), `conversacion.ts` (**`consultar()`**:
la llamada al modelo de TODOS los usos —gastar → modelo → anotarUso → verificar— sale de `turno`; **`SISTEMA_PANEL`**, **`turnoPanel`** (interruptores
«owner» de la ciudad y el negocio + tope → límites → tapar → dinero/seguridad/cuenta/negocio/persona sin modelo → sección prohibida = «Eso lo ve
el dueño» → ayuda vecino+negocio sin la de partes ajenas → Haiku → `go_to_panel` solo a SUS secciones; acción rechazada = reglas), `hiloPanel`,
`cerrarPanel`), `acciones.ts` (`go_to_panel` contra el mapa del servidor; confirmar relee la guía y pide `accesoPanel` con su parte; la lista
fija mínima de 7c se fue), `persona.ts` (caso DEL NEGOCIO: pago · cuenta · técnico; seguridad = cuenta alta), `reglas.ts` (`detectarPanel`,
líneas `dueno` y `panelApagado`), `modelo-reglas.ts` (`responderPanelConReglas`), simulador con el uso panel (ingenuo), `asistente-panel.ts`
(lectura barata para la pantalla, con `.catch`), `soporte.ts` (origen «compa» con negocio + aviso `compa_caso_negocio`). Pantalla **Panel ›
El Compa** (`/panel/{negocio}/compa`, `CompaPanel.tsx` con los bloques del panel: nota fija de IA, hilo con «EL COMPA · IA · SEGÚN …», «Ir a
{sección}», el artículo, «Tu caso pasó a Soporte · TK-» con «Ver mi caso», chips de sus partes, Preguntar · Con una persona · Empezar de nuevo;
apagado/tope = «no disponible» + Ayuda y Soporte); en TU NEGOCIO (escritorio) y en Más (teléfono, ahora para todo miembro). Acciones
`app/panel/acciones-compa.ts` (mismo origen + sesión + `accesoPanel`). Super Admin: Conversaciones con cifras por nivel (DÓNDE › Panel del
negocio) y **Negocios 360° › El Compa** (cifras de 30 días, sin texto). Guardianes **`guiaDelPanelCompleta`** (nuevo) + `compaSoloSusDatos`,
`compaInterruptores`, `compaSalidaLimpia`, `compaSiempreIA`, `compaSinRutaCritica`, `compaTapaEnElMotor` ampliados (36/36 al revés
`alreves7e`; 66/66 `alreves7c`, 33/33 `alreves7d`, 45/45 `alreves7b`, 36/36 `alreves7a`); e2e **`compa7e` 117 ✓** (390 y 1360);
`compa7d` 140 ✓, `sop7b` 104 ✓, `compa7c` 111 ✓, `adm5i` ✓; 0120 dos veces en local y en una base nueva (semillas dos veces). Ayuda:
**`panel-el-compa`** nueva; `panel`, `panel-ayuda-y-soporte`, `admin-el-compa`, `admin-negocios` al día. Sigue **7f** (respuestas automáticas
Pro y «Sugerir respuesta con El Compa»; migración 0121, semilla 0042).
**7f hecho (11 nov)** — Respuestas automáticas de El Compa (Pro) en Mensajes y «Sugerir respuesta con El Compa». Migración **0121**
(`compa_negocio_pro()` = Pro AHORA; `compa_business_settings` apagadas de fábrica, «cuándo» closed, temas, canales {app}, nota {es,en} ≤ 400, la
base no deja encender sin Pro (`compa_solo_pro`) ni borrar; `chat_messages.compa`; `chat_threads.compa_pending_until` y `compa_off_*` (apagar en
una conversación); `compa_conversations.chat_thread_id`; `compa_handoffs.chat_message_id`; motivo de reporte «compa»; avisos `compa_te_paso`,
`compa_auto_apagado`, `compa_auto_levantado`; claves `compa_auto_hilo_max` 6, `compa_auto_dia_negocio` 200, `compa_auto_espera_min` bloqueada).
Semilla **0042** (Sabor Dominicano encendidas con la nota del diseño y dos conversaciones de ejemplo; Rosa, moderadora con «Hoy y pedidos»;
Barbería El Primo apagada por el equipo si hay un Admin). Código: `lib/compa/contexto-negocio.ts` (la página pública por temas, tapada),
`respuesta-auto.ts` (puerta barata: `compaContestara`, `contestarAuto` por after() y el barrido, ajustes del panel, estado en Mensajes, Super
Admin), `conversacion.ts` (`debeContestarAuto`, `SISTEMA_AUTO`/`SISTEMA_BORRADOR`, `respuestaAuto` = servidor antes del modelo → consultar →
`verificarAuto` → reglas; `turnoAuto` con reclamo de 90 s, límite por conversación, la presentación, pasar al negocio y «como antes» con la fija;
`probarAuto`; `borradorNegocio` que nunca envía), `verificar.ts` (`verificarAuto`), `reglas.ts` (`detectarAuto`, `LINEAS_AUTO`), `modelo-reglas.ts`
(`responderAutoConReglas`), simulador con el uso auto_reply (ingenuo), `interruptores.ts` (`pausaAuto`, `hiloApagado`, `apagarEnHilo`);
`lib/mensajes.ts` (con El Compa no sale la fija; sin él, la de siempre texto a texto; `ponerRespuestaFija`). Pantallas: Panel › El Compa ›
RESPUESTAS AUTOMÁTICAS (Free → candado; interruptor, CUÁNDO, temas, POR DÓNDE, reglas fijas, la nota con «Traducir», Pruébalo como cliente, LO QUE
CONTESTÓ EL COMPA) y la cabecera «…con Pro, contesta a tus clientes…»; Panel › Mensajes (fila «El Compa contesta por ti», «EL COMPA · IA» en el
hilo, «Sugerir respuesta con El Compa»); Mi cuenta › chat («EL COMPA · IA», «El Compa está escribiendo…», reportar «Una respuesta de El Compa»);
Super Admin › El Compa › **Negocios**, Negocios 360° › El Compa › «Apagar El Compa aquí», Colas › Mensajes reportados con «Apagar El Compa aquí»
en la conversación. Guardianes **`compaRespuestaAuto`**, **`borradorSoloBorrador`**, **`compaSiempreIAMensajes`**, **`ordenSinTexto`** +
`compaSalidaLimpia`, `compaTapaEnElMotor`, `compaInterruptores`, `compaSinRutaCritica`, `compaSiempreIA` ampliados (40/40 al revés `alreves7f`; 36/36 `alreves7e`, 33/33 `alreves7d`, 66/66 `alreves7c`); e2e **`compa7f` 130 ✓**
(390 y 1360); `msg2p` ✓ con El Compa apagado y al tope, `compa7e` 117 ✓ (su comparación de Mensajes deja fuera la fila nueva de 7f), `compa7d` 140 ✓, `adm5i` ✓; 0121 dos veces en local y en una base nueva (semillas dos
veces). Ayuda: **`panel-respuestas-automaticas`** nueva; `mensajes`, `panel-el-compa`, `admin-el-compa` al día. Bug de clase cazado: `id::text …
order by id` ordena el texto (LAUNCH, tarea sugerida). Sigue **7g** (copiloto del equipo en Super Admin › Soporte; migración 0122).
**7g hecho (11 nov)** — El copiloto del equipo en Super Admin › Soporte (caso TK-) y en Colas › Ayuda con pedidos y citas (ayuda escalada H-).
Migración **0122** (`compa_drafts` SOLO INSERCIÓN: resumen, borrador, siguiente paso, macro y ayuda sugeridas, motor; lo único que se anota UNA vez
es si se usó —tal cual · editado · descartado— y el mensaje que salió, y la base revisa que ese mensaje sea de ESE caso, de ESA persona del equipo,
para la persona y `from_draft`; `support_messages.from_draft` con su regla de solo inserción redefinida; `compa_conversations.help_request_id`;
clave `compa_copiloto_dia_staff` 200; sin semilla). Código: `lib/compa/contexto-copiloto.ts` (`contextoCopiloto(s: Staff, …)` con las MISMAS
lecturas de la ficha: `casoEquipo` (sop:ver + sus ciudades) con sop:editar, o `caso` de Colas (su rol y su ciudad) con colas:aprobar y solo la cola
«sop»; nunca Salud, Profesionales, inscripciones ni op_private —lo dice la base—; tapado y sin teléfonos ni correos; notas internas aparte y
marcadas; tu_rol con el tope de «Resolver y devolver»), `conversacion.ts` (`consultar()` acepta el esquema y el verificador del uso;
**`SISTEMA_COPILOTO`** fijo; **`borradorCopiloto`**: interruptor «copiloto» → límite por persona del equipo al día → su conversación de ese caso →
ayuda de TODAS las audiencias → Sonnet por el tope → `verificarCopiloto` → si falla, borrador de reglas; solo escribe `compa_messages` (draft) y
`compa_drafts`), `modelo.ts` (`ESQUEMA_COPILOTO`; `Entrada.esquema`), `modelo-claude.ts` (el esquema del uso), `verificar.ts`
(**`verificarCopiloto`**: promesas de dinero/sanciones, «ya lo hice», montos/porcentajes/plazos solo de lo que la persona ya ve, nada de una nota
interna —5 palabras o un número—, emoji, enlaces, teléfonos, tapado; macro de la lista; «Resolver y devolver» solo si su rol puede), `modelo-reglas.ts`
(`borradorCopilotoConReglas`), simulador con el uso copilot (ingenuo + fallas guionadas), `copiloto.ts` (`copilotoDisponible` barata),
`soporte-equipo.ts` (`responder` con el borrador → `from_draft` y tal cual/editado; `casoEquipo.ciudad`), `acciones-colas.ts` (`decidirSop` anota el
borrador de la ayuda), `admin-compa.ts` (cifras del copiloto), barrido `compaBorradores` (un día sin enviar = descartado). Pantallas: **Super Admin ›
Soporte** (en «A la persona»: «Sugerir respuesta con El Compa» / «Otro borrador con El Compa», la nota «EL COMPA · {resumen} Siguiente paso: …»,
«(sin IA: borrador de reglas)», el borrador al campo RESPUESTA, «Revísalo antes de enviar: sale con tu nombre.»; Enviar como siempre), **Colas ›
Ayuda con pedidos y citas** (la nota, el BORRADOR y «Resolver con un mensaje» que abre con él), **El Compa › Conversaciones › COPILOTO EN SOPORTE ·
30 D**; acción `app/admin/acciones-copiloto.ts` (mismo origen, sesión, permiso de la acción que alimenta). Guardianes **`copilotoSoloBorrador`**
(nuevo) + `compaSoloSusDatos`, `compaSinDatosSensibles`, `compaSalidaLimpia`, `compaSinRutaCritica`, `libroSoloInsercion` ampliados (43/43 al revés
`alreves7g`; 45/45 `alreves7b` y 66/66 `alreves7c` con dos casos apuntados al código nuevo; 36/36 7a, 33/33 7d, 36/36 7e, 40/40 7f); e2e
**`compa7g` 92 ✓** (390 y 1360); `sop7b` 104 ✓, `compa7c` 111 ✓, `compa7f` 130 ✓, `adm5i` ✓; 0122 dos veces en local y en una base nueva (semillas
dos veces). Ayuda: `admin-soporte`, `admin-el-compa` al día (indexadas). Sigue **7h** (WhatsApp y SMS con enlace; migración 0123).
**7h hecho (11 nov)** — El Compa por WhatsApp y SMS con enlace de un uso (vecinos y respuestas automáticas). Migración **0123**
(`compa_channel_numbers` (los números que reciben: de To'Latino o de un negocio; Telnyx · Meta · «sim» de prueba; se retiran, no se borran);
`compa_inbound` SOLO INSERCIÓN salvo su procesamiento, que solo avanza, y la purga (único por proveedor + id del mensaje; teléfono como huella
HMAC y cifrado; texto TAPADO; la base rechaza tarjeta/SSN); `compa_canal_rechazos` (cuántos por día, proveedor y motivo, sin nada de lo que
traían); `compa_outbound` (lo que salió o NO salió y por qué: simulado · enviado · fallo · apagado · baja · silencio · ventana · sin_proveedor;
sin el token del enlace); `compa_links` (sha256 del token, una acción y una cuenta, vence a `compa_link_min`, se usa una vez);
`compa_canal_consent` SOLO INSERCIÓN (STOP/START por teléfono y número; encender/apagar el canal en Mi cuenta por trigger sobre
`users.notif_prefs.cpa`) + `compa_canal_en_baja()`; `compa_conversations.surface` suma «channel»; `compa_messages.contact_phone_hash` (alguien
sin cuenta a un negocio); `sms_status` suma «baja» en avisos y `phone_messages`; claves `compa_link_min` 30, `compa_canal_msgs_dia` 30,
`compa_canal_respuesta_min` 5, `compa_canal_retener_dias` 30, `compa_canal_firma_seg` 300; sin semilla). Código: `lib/compa/canales-proveedor.ts`
(ÚNICO que habla con Telnyx/Meta y lee sus secretos: firma Ed25519 de Telnyx sobre «hora|cuerpo» con ventana, HMAC de Meta en tiempo constante,
reto del webhook, lectura de las entradas, `mandar` texto plano), `lib/compa/canales.ts` (`recibir` idempotente → `procesar` aparte: STOP /
START / HELP primero → límite por teléfono → el número decide: To'Latino = `turno` del vecino SOLO con teléfono verificado de UNA cuenta activa
que encendió el canal (si no, la misma respuesta fija) · un negocio = `respuestaAutoCanal` (7f, sin datos de cuentas); acciones → enlace de un
uso; `enviar` vuelve a leer canal, baja, ventana de 24 h de WhatsApp y horas de silencio; barrido `barrerCanales` (retoma y purga); Super Admin;
simulador), `lib/compa/enlace.ts` (`crearEnlace`, `leerEnlace`, `usarEnlace` → `confirmar(…, "link")`), `conversacion.ts` (`turno` con superficie
«channel» y la acción que vive lo que el enlace; `respuestaAutoCanal`; `registroCanalNegocio`), `interruptores.ts` (`canalEncendido`),
`acciones.ts` (`proponer` con minutos), `avisos.ts` (STOP apaga también los SMS de avisos). Rutas: **`/api/compa/entrada/{telnyx|whatsapp}`**
(firma antes de leer; 401/400/413; 200 al instante y el turno con `after()`), **`/compa/e/{token}`** (sin sesión → Entrar; otra cuenta → «es de
otra cuenta»; con la cuenta → «Así queda» y confirmar; usado, vencido, inexistente). Pantallas: Mi cuenta › Avisos › **EL COMPA** «Hablar con El
Compa por WhatsApp y SMS» (apagado de fábrica); Panel › El Compa › **POR DÓNDE** con WhatsApp y SMS (solo con número conectado) y el registro
con «Cliente en WhatsApp»; Super Admin › El Compa › **Canales** (cifras, modo, números con Conectar/Retirar, REGISTRO DE ENTRADA sin texto ni
teléfono, SIMULADOR del sandbox). `scripts/contrato-canales/` (la especificación oficial de Telnyx y de Meta valida las llamadas reales; en CI).
Compose pasa `TELNYX_PUBLIC_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN` (vacíos). Guardián **`canalConFirma`** (nuevo) +
`libroSoloInsercion`, `compaTapaSecretos`, `compaTapaEnElMotor`, `compaSiempreIA`, `privacidadSalud`, `barridoCompleto` ampliados (50/50 al revés
`alreves7h`; 36/45/66/33/36/40/43 de 7a–7g otra vez); e2e **`compa7h` 224 ✓** (390 y 1360); `compa7d` 140 ✓, `compa7f` 130 ✓, `adm5i` ✓; contrato
de los canales ✓; 0123 dos veces en local y en una base nueva (semillas dos veces). Ayuda: **`el-compa-por-whatsapp-y-sms`** nueva;
`panel-respuestas-automaticas`, `admin-el-compa`, `privacidad-de-el-compa` al día (indexadas). Sigue **7i** (Super Admin completo de El Compa y
Soporte, Configuración, avisos, analítica, purga; migración 0124).
**7i hecho (11 nov) — FASE 7 · EL COMPA COMPLETA** (falta la corrida de CI, la hace la sesión principal). Migración **0124**
(`compa_reviews` «Marcar respuesta incorrecta» con motivo de lista cerrada y nota, una viva por conversación, se quita una vez con motivo y no se
borra; `compa_unknowns` «Lo que El Compa no supo» con la pregunta TAPADA, audiencia e idioma, sin la persona, estado que solo avanza open → noted →
fixed con el artículo; **la purga**: `purged_at` en conversaciones, mensajes, pasos a una persona, borradores, casos y mensajes de Soporte, y cada
tabla de solo inserción admite UNA actualización que vacía el texto sin tocar nada más; `compa_purgar(lim)` = conversaciones cerradas de más de
`compa_retener_meses` + cuentas borradas (D5: pasado `delete_at`) con sus casos, el copiloto de esos casos y sus conversaciones cerradas;
`compa_retener_meses` pasa a editable; grupo de avisos **`support`** sin interruptor (sop_recibido, sop_respuesta, sop_resuelto, compa_caso,
compa_caso_negocio); vistas **`compa_analitica_dia`** y **`soporte_analitica_dia`** sin personas). Semilla **0043** (dos «no supo» abiertas —vecino
y negocio—, una anotada y una marcada por Soporte si existe). Código: `lib/compa/admin-compa.ts` (`resumenCompa`, `marcarConversacion`,
`quitarMarca`, `decidirNoSupo`, `modelosPorPapel`/`cambiarModelo`, `compaDeUsuario`; ficha con marca, purga e HISTORIAL; todo limitado a las
ciudades de quien mira), `lib/compa/purga.ts` (`barrerRetencion` en el barrido; borra las fotos de los casos purgados), `conversacion.ts`
(`anotarNoSupo` en vecino y panel), `admin-analitica.ts` (`compaSoporteAnalitica`), `soporte-equipo.ts` (plazo de 30 días; mensaje purgado).
Pantallas: Super Admin › El Compa (**Resumen** por defecto con KPI, HBars, copiloto, marcadas, horario y LO QUE EL COMPA NO SUPO con Anotado /
Corregido en…; Conversaciones con «Marcadas» y la ficha con Marcar / Quitar la marca), Configuración (MODELO DE CADA PAPEL; la línea del horario en
Soporte), Notificaciones (Solo Soporte y El Compa; regla), Analítica › **El Compa y Soporte**, Usuarios 360° › **El Compa**, Soporte (PLAZO
CUMPLIDO · FUERA DE PLAZO · DESDE EL COMPA), Mi cuenta › Avisos › **SOPORTE**. Guardianes **`retencionQueCorre`**, **`soporteSiempreLlega`** (nuevos)
+ `analiticaSinPersonas`, `libroSoloInsercion`, `compaLecturaAnotada`, `compaTapaEnElMotor` ampliados (35/35 al revés `alreves7i`); e2e **`adm7i`
113 ✓** (390 y 1360); `compa7d` 140 ✓, `compa7f` 130 ✓, `compa7h` 224 ✓, `adm5i` ✓, `sop7b` 104 ✓, `compa7e` 117 ✓, `compa7c` 112 ✓ y `compa7g` 92 ✓
(estas dos con la pestaña nueva por defecto); 0124 dos veces en local y en una base nueva (semillas dos veces, la segunda con las huellas
cambiadas). Ayuda: `admin-el-compa`, `admin-configuracion`, `notificaciones`, `admin-analitica`, `mi-cuenta`, `admin-usuarios`, `admin-negocios`,
`admin-soporte` al día (indexadas). Sigue la **Fase 8** (ver `docs/PLAN.md`).

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

## Fase 8 · plan escrito (11 nov)
`docs/diseno/plan/fase8-apps.md`: 8a–8i, migraciones 0125–0133, semillas 0044–0047. **Requisito previo:** `pruebas.tolatino.com` con HTTPS detrás
de Cloudflare (Paquete 8-0; hoy el sandbox es HTTP en la IP). Pedir el Paquete 8-1 (D-U-N-S, Apple, Google, Firebase) al empezar 8a. Sin
cuentas de tienda, 8h llega hasta la firma y el APK propio. Hoy no hay push de ningún tipo, ni passkeys, ni colector de errores, ni
`/privacidad` / `/terminos` públicas: el plan los construye.

## Fase 8 · 8a hecho — sin el dominio (11 nov)
- **Hecho:** migración **0125** (`app_clients` desde `apps/mobile/apps.json`, sesiones con app/plataforma/versión, `app_events` con app y
  plataforma, el **llavero** `store_secrets` + `store_secret_reads` solo inserción, código `llavero`, secciones Apps e Integraciones, claves
  `app_min_build_*` / `app_aviso_build_*`, interruptores `app.cascara.*`). `apps/mobile/` (apps.json, `scripts/generar.mjs` → configs de
  Capacitor, Info.plist + InfoPlist.strings es/en + PrivacyInfo, manifiestos y strings de cada sabor, `ios/project.yml` (XcodeGen, 4 targets),
  `android/` (4 sabores); plugins propios TLLocal, TLPantalla, TLReporte y TLAlcance en Swift y Java; `islas.mjs`, `iconos.mjs`, humo de CI).
  Servidor: `lib/app-nativa*.ts` (rótulo TLApp, alcance, compuerta), middleware (cada app a su entrada; lo ajeno a `/app/fuera`), CSP, sesiones,
  Soporte con la app y la versión. Puente `lib/nativo/*` (puente, almacén, externo, pantalla, permisos, reporte, inicio); Puerta, Mis boletos y
  Repartidor por el almacén; isla nueva `/repartidor/sin-conexion`. Pantallas `/app/actualizar`, `/app/pausa`, `/app/fuera`, `/app/sin-senal`,
  el aviso suave y la hoja previa de permisos. Super Admin › Sistema › **Apps** e **Integraciones** (llavero con código otra vez); Usuarios 360°
  con app y versión. CI `.github/workflows/cascaras.yml`. Ayuda `apps-de-to-latino`, `admin-sistema-apps`, `admin-llaves-de-las-tiendas`.
- **Probado:** `app8a` 110 comprobaciones (390 y 1360); 11 guardianes nuevos, 55/55 al revés (`alreves8a`); migraciones dos veces en la base
  local y en una base nueva (+ semillas dos veces); regresión adm7i 113, compa7d 140, evt6g 105, evt6h 88, rep2l 17.
- **Bloqueado / no hecho aquí:** el dominio (Paquete 8-0, del fundador). Android e iOS no se compilaron en esta máquina (red y sin Xcode): lo hace
  el CI la primera vez. Todo en LAUNCH-CHECKLIST «Fase 8 · 8a».
- **Sigue:** 8b (enlaces universales; necesita el dominio). Mientras, se puede adelantar 8c (Web Push) y 8f.

## Fase 8 · 8c hecho — avisos push propios (11 nov)
- **Hecho:** migración **0126** (renumerada: el plan decía 0127; 8b tomará 0127) — `push_tokens` (cifrado + huella, atado a la sesión; salir o
  bloquear la sesión lo revoca en la misma transacción), `push_outbox` (único aviso×token), `push_deliveries` (solo inserción, sin personas),
  `notifications.push_status/opened_at/opened_via`, `sms_status` «respaldo»/«ahorrado», plantillas con `push`, `push_private` (forzado en Salud,
  Niños, Soporte, moderación y cuenta), `app`, `sms_mode`; Configuración `push_*`; interruptores `push.webpush/apns/fcm`; plantilla `push_prueba`.
  Semilla **0044_push.sql** (teléfonos «sim» de Héctor, Lucía, Yolanda, Juan y Karla; historial en cada resultado). `lib/push/` (webpush RFC
  8291/8292 propio, apns HTTP/2 + JWT, fcm v1 + OAuth, llaves (VAPID del entorno o derivada; APNs/FCM del llavero), tokens, cola + trabajador +
  barrido, admin). `avisar()`/`avisarMuchos()`/resumen encolan; `smsRespaldo()`. `/sw-push.js`, `manifest.webmanifest` + íconos, `/app/aviso/{id}`,
  `/api/interno/push` + servicio `push` del compose, VAPID en `deploy.sh`. Cliente: `lib/nativo/avisos.ts` (plugin oficial
  `@capacitor/push-notifications` 8.1.3 o Web Push), hoja previa en el momento útil, Mi cuenta › Avisos «En este teléfono», Panel › Más › Tus apps.
  Super Admin: Integraciones › Push, Notificaciones (push por plantilla + pestaña Push), Usuarios 360° › Avisos push. Nativo: plugin en las 4 apps
  (generar.mjs), POST_NOTIFICATIONS y Firebase sin analítica en los sabores, `aps-environment`, `AppDelegate+Avisos.swift`. CI: contrato de push.
  Ayuda `avisos-en-tu-telefono`, `panel-avisos`, `admin-push`; `notificaciones` y `mi-cuenta` al día. Arreglo aparte: `lib/uuid.ts` (en HTTP se
  caían pedir/reservar/pagar/escanear).
- **Probado:** `push8c` 86 (390 y 1360), contrato 54, `alreves8c` 37/37 (pushConPlantilla, pushPrivadoSinTexto, smsSoloRespaldo, pushFueraDeTx,
  tokensCifrados, pushSoloServiciosConocidos, pushSinDuplicados, swPushSoloAbre, pushAbreSuApp, uuidSinContextoSeguro; permisosMinimos y
  privacidadSalud ampliados), migraciones y semillas dos veces (local y base nueva), 10 000 avisos (media 4,98 ms), regresión app8a 110,
  adm7i 114, compa7d 140, evt6g 105, rep2l 17, avisos2j 14.
- **Bloqueado / no hecho aquí:** Web Push en el iPhone espera el dominio (Paquete 8-0); APNs/FCM reales esperan las llaves (8-2); Android e iOS
  los compila el CI. Todo en LAUNCH-CHECKLIST «Fase 8 · 8c».
- **Sigue:** 8b (necesita el dominio) o 8d/8f.

## Fase 8 · 8f hecho — programa beta, «Reportar un problema», errores y cierres propios (11 nov)
- **Hecho:** migración **0127** (renumerada: el plan decía 0130; 8b tomará la siguiente libre) — `app_builds` (build creciente por app, plataforma y
  canal; el estado solo avanza; se retira con motivo), `beta_testers` (correo de Apple cifrado + huella; quitar una vez con motivo), `apk_links`
  (solo la huella del enlace; usar o anular una vez), `app_error_groups` (derivados: las cifras las escribe solo la base), `app_error_events` (solo
  inserción, sin personas; la base rechaza correos, teléfonos, «?x=», tarjetas y SSN; purga por `errores_retener_dias`), `app_error_alerts` (una por
  grupo, tipo y build), `support_case_logs` (registro y captura del reporte; la purga D5 lo vacía), `support_cases.origin` + `reporte_app`;
  Configuración `errores_*`, `reporte_logs_kb`, `beta_agitar`, `apk_enlace_horas`; interruptores `app.reportar` y `app.errores`; avisos `err_vivo`,
  `beta_testflight`, `beta_apk`, `beta_quitado`. Semilla **0045_apps_beta.sql** (builds en cada estado, testers, tres grupos de errores, un reporte).
  Servidor: `/api/errores` + `lib/errores/` (tapar, huella, simbolizar con los mapas del servidor, ingesta con topes, Salud, «Errores en vivo» en el
  barrido), `lib/reportar.ts` (`reportarProblema` → `abrirCaso` tema técnico, origen `reporte_app`, logs en la misma transacción), `lib/beta.ts`
  (TestFlight interno por `lib/tiendas/asc.ts`, Play interno pendiente en la consola, APK propio con enlace de un uso), `lib/tiendas/apk-prueba.ts`.
  Mapas de fuente: `productionBrowserSourceMaps` + `scripts/mapas-privados.mjs` después de `next build` (fuera de `.next/static`), nginx niega `*.map`,
  las islas no los copian. Cliente: `lib/nativo/errores.ts` (colector), `lib/nativo/reporte.ts` (captura, agitar, cierres), Arranque (agitar solo
  fuera de producción). Pantallas: `/soporte/reportar` (hueco #5) con entradas en Mi cuenta › Ayuda y soporte, Panel › Más, Repartidor › Perfil y
  Puerta; `/beta/apk/{ficha}`. Super Admin › Sistema › Apps: Versiones, Testers, Salud · errores (ficha), Reportes; Soporte muestra el registro.
  Nativo (poco y aparte): `TLReporteBeta.swift` / `.java` + `ultimaCaptura`, `agitar`, `cierres` en TLReporte. Contrato `scripts/contrato-tiendas`
  (App Store Connect con la especificación OpenAPI 4.6 fijada en `asc.json`; Google Play) + simulador `scripts/tiendas-sim`; CI: el contrato y que no
  quede un `.map` en lo servido. Ayuda `reportar-un-problema`, `admin-errores-y-beta`; `admin-sistema-apps` al día.
- **Probado:** `beta8f` 95 (390 y 1360), contrato de las tiendas 46, `alreves8f` 52/52 (erroresTapados, ingestaLimitada, erroresSinPersonas,
  reporteConConsentimiento, erroresEnVivo, mapasPrivados, apkUnUso, tiendasSimuladorAislado, pluginViejoNoRompe; colaConVista ampliado), tsc,
  build y todos los guardianes; migraciones y semillas dos veces (local y base nueva); regresión app8a 110, push8c 86, adm7i 113, rep2l 17, evt6g
  105, sop7b 104 (con la búsqueda por número: la base local acumula ~180 casos abiertos y el caso nuevo ya no sale en la primera página; ver REVISION).
- **Bloqueado / no hecho aquí:** TestFlight y App Store Connect de verdad (Paquete 8-2); Play interno por API no existe (Grupos de Google o la consola);
  los APK de verdad y los símbolos nativos los sube 8h; iOS y Android los compila el CI. Todo en LAUNCH-CHECKLIST «Fase 8 · 8f».
- **Sigue:** 8b (necesita el dominio), 8d o 8e.

## Fase 8 · 8e hecho — lo nativo de cada app (11 nov)
- **Hecho:** migración **0128** (renumerada: el plan decía 0129; 8d y 8b tomarán las siguientes libres) — `delivery_tracks` (una ruta abierta por
  entrega; nace solo con «Voy por el pedido» o «Recogí»; token del teléfono como huella, nuevo en cada arranque; lo derivado lo escribe la base; se
  cierra sola al entregar, cancelar o cambiar de repartidor: trigger `operations_ruta`), `delivery_positions` (solo inserción; `ruta_activa` +
  ciudad + antes de empezar + velocidad imposible en la base; BRIN + GIST; purga a los `ubic_retener_dias` con `ruta_purgar`), NOTIFY 'ruta',
  Configuración › Apps `ubic_cada_s`, `ubic_min_m`, `ubic_retener_dias` (14), `ubic_cliente_desde`, `ubic_vel_max_mps`, `ubic_vieja_s`;
  interruptor `app.ubicacion_vivo`. Semilla **0046_ruta.sql** (desde 0045): una entrega activa de Héctor con 30 posiciones y una entregada ayer.
  Servidor: `lib/ruta.ts`, `lib/ruta-vivo.ts`, `POST /api/ruta/posicion` (solo el token), SSE `/api/ruta/vivo` (cliente desde «Recogí» sin rastro;
  negocio con rastro; lo demás 404), paso «Voy por el pedido» en `lib/repartidor.ts`, Transacciones › «Ver recorrido» (motivo en la auditoría
  antes de ver), la purga en el barrido. Pantallas: banda «Compartiendo tu ubicación» (Repartidor), mapa en vivo en el pedido del cliente y en el
  panel (RadiusMap del sistema; bloque `mapa` en el renderizador del panel), «Escanear cupón» (panel, con el lector de la Puerta) y el QR del código
  del vecino, Puerta › Más › «Fijar la Puerta en esta pantalla» (Android) / Acceso guiado (iPhone), linterna nativa en iPhone, brillo del QR del
  boleto, compartir y háptica por el puente (`lib/nativo/ruta.ts`, `compartir.ts`, `haptica.ts`; `pantalla.ts` ampliado). Nativo: plugin **TLRuta**
  (Android `TLRutaPlugin` + `TLRutaServicio` en primer plano de tipo location con el aviso fijo; iOS CLLocationManager con modo de fondo e
  indicador; solo al servidor de la cáscara), TLPantalla con fijar/soltar/fijada y linterna (solo en los targets con cámara), `@capacitor/share`
  8.0.3 y `@capacitor/haptics` 8.0.2; `apps.json`/`generar.mjs`: Repartidor «entrega» (ubicación mientras se usa, FOREGROUND_SERVICE_LOCATION,
  UIBackgroundModes location), VIBRATE con Haptics. Humo de Android: ruta GPS contra `scripts/humo/ruta-sim.mjs`. Ayuda: `repartidor-ubicacion`,
  `seguimiento-del-pedido`, `puerta-sin-senal`, `puerta-fijar-pantalla`; `panel-entrega`, `panel-cupones-por-monedas`, `monedas-y-cupones`,
  `admin-configuracion` al día.
- **Probado:** `app8e` 64 comprobaciones (390 y 1360), `alreves8e` 53/53 (ubicacionSoloEntregaActiva, rutaSoloDeLosTres, posicionesConPurga,
  rutaSoloNuestroServidor, compartirPorElPuente, brilloSeDevuelve, fijarConConfirmacion; permisosMinimos y nativoConRespaldo ampliados; y
  pluginViejoNoRompe con TLRuta), tsc, build y todos los guardianes; migración y semilla dos veces (local y base nueva); regresión rep2l 17,
  evt6g 105, evt6h 88, app8a 110, push8c 86, beta8f 95, com5g 73 (una a la vez). CI «Cáscaras» en `claude/vibrant-franklin-krutwa`: corrida
  43027119917 (ea1018f): Android 4 sabores e iOS 4 targets compilan, las 4 apps de iOS abren, el servicio de la ruta arranca con el aviso fijo y
  junta posiciones, pero el humo falló porque el sabor prohíbe HTTP hacia el simulador → arreglado en 0bb56e0 (solo depuración); corrida
  43030337172 (0bb56e0): la ruta funciona de punta a punta (posiciones con el token, pantalla apagada, cola en modo avión que sube en lote,
  410 → se detiene solo, detener()) y solo falló la comprobación del tipo del servicio (dumpsys escribe «types=00000008») → 23a3a7c; corrida
  **43031740708 (23a3a7c): verde** (Android: los 4 sabores + emulador con la ruta; iOS: 4 targets, las 4 abren).
- **Bloqueado / no hecho aquí:** la ruta en un iPhone real (el simulador solo compila y abre), la web del Repartidor en el sandbox (HTTP sin dominio:
  sin geolocalización), las teselas en las capturas locales, la medida de carga. Todo en LAUNCH-CHECKLIST «Fase 8 · 8e».
- **Sigue:** 8b (necesita el dominio), 8d o 8g.

## Fase 8 · 8g hecho — el boleto en Apple Wallet y Google Wallet (11 nov)
- **Hecho:** migración **0129** (renumerada: el plan decía 0131) — `ticket_passes` (un pase por boleto y plataforma; serie al azar; el token del
  servicio web solo como huella; `version` derivada: solo `pase_tocar()`; un pase anulado no vuelve), `pass_devices` (token de push cifrado +
  huella), `pass_registrations` (estado del aviso por registro; límite por teléfono por hora en la base), `pass_log` (solo inserción), triggers
  en `tickets` / `event_dates` / `events` que tocan el pase EN LA MISMA TRANSACCIÓN (anulan lo que ya no vale), `pase_generico()` (Fe, Salud,
  Niños), `store_secrets.kind` + `pass_type_csr`, Configuración › Apps `pase_*`, interruptores `app.wallet.apple` / `app.wallet.google`,
  aviso `pase_cert_vence`. Semilla **0047_pases.sql** (un pase vivo de Yokasta y uno anulado por la vía de verdad). Servidor: `lib/pases/`
  (`der.ts` CMS separada + CSR propios, `zip.ts`, `apple.ts` pass.json ES/EN + .pkpass, `apns-pase.ts` APNs con TLS de cliente, `google.ts`
  clase/objeto/«Guardar», `credenciales.ts`, `certificado.ts` solicitud → .cer → vencimiento, `pases.ts` emitir, servicio web, trabajador,
  `pronto.ts`, `admin.ts`); `boletoParaPase()` en `lib/boletos.ts` (la misma vista que la pantalla); rutas `/api/pases/v1/…` (PassKit),
  `/api/pases/apple/{código}`, `/api/admin/llavero/solicitud`; el .cer por `/api/admin/llavero`; `pasesPronto()` en cada acción que cambia un
  boleto, una fecha o un evento; el trabajador en `/api/interno/push` y en el barrido. Pantallas: el bloque «GUÁRDALO EN TU TELÉFONO» del boleto
  (insignias provisionales, hueco #9), Super Admin › Eventos › el boleto › WALLET y Sistema › Integraciones › Wallet. Contrato
  `scripts/contrato-wallet` (en CI) y simulador `scripts/wallet-sim` (Google + AIA + APNs con TLS de cliente; cadena de prueba al vuelo).
  Ayuda `boletos-en-wallet`; `admin-eventos-y-boletos`, `admin-llaves-de-las-tiendas`, `mis-boletos-y-el-qr` al día.
- **Probado:** `wal8g` 97 comprobaciones (390 y 1360), contrato de Wallet 42, `alreves8g` 33/33 (paseMismoQr, paseSigueAlBoleto,
  tokenDePase; libroSoloInsercion, tokensCifrados, pushSoloServiciosConocidos, llavesFueraDelRepo y rutasVivas ampliados), tsc, build y todos los
  guardianes; migración y semilla dos veces (local y base nueva); contratos de push 54 y tiendas 40; regresión evt6c 70, evt6d 126 (con El Compa de vecinos apagado mientras corre: con él encendido, «Ayuda con esta orden» abre la hoja de El Compa desde 7d y el paso 11 de evt6d —escrito antes— se queda en 113/126; no es de 8g), evt6e 96, evt6g 105, evt6h 88, push8c 86, beta8f 95, app8e 64 (una a la vez).
- **Bloqueado / no hecho aquí:** el certificado del Pass Type ID y la cuenta de emisor de Google (Paquete 8-2, opcional); el iPhone no agrega el
  pase hasta que haya HTTPS (Paquete 8-0); el arte oficial de los botones (licencias de Apple y Google, del fundador); los botones en el correo.
  Todo en LAUNCH-CHECKLIST «Fase 8 · 8g».
- **Sigue:** 8b (necesita el dominio), 8d o 8h.

## Fase 8 · 8d hecho — entrar con Face ID o huella (llaves de acceso) en la web; TLLlave nativo compilado y apagado hasta 8b (11 nov)
- **Hecho:** migración **0130** (renumerada: el plan decía 0128; sin semilla) — `passkeys` (credencial única en todo el sistema, llave pública,
  contador que solo sube en la base, dónde nació: app, plataforma, sesión y dispositivo; nunca se borra: quitada por la persona, revocada por el
  equipo con motivo o quitada por el sistema), `webauthn_challenges` (solo la huella, vence en `passkey_reto_s`, un uso en la base, se purgan los
  vencidos), `passkey_log` (solo inserción), `sessions.via` + `passkey_id`, `users.llave_ofrecida_at`, `account_changes` kind `passkey` y by
  `sistema`, avisos crit `cuenta_llave_nueva` / `cuenta_llave_quitada`, Configuración › Apps `passkey_max`, `passkey_reto_s`, `passkey_retos_hora`,
  `passkey_fallos_hora`, interruptor `cuenta.llaves`. Servidor: `@simplewebauthn/server` **14.0.3** fijo (dependencias ASN.1 fijadas por
  `pnpm.overrides`), `lib/llaves/config.ts` (RP ID y orígenes del entorno: `PASSKEY_RP_ID`, `PASSKEY_ORIGENES`; solo https o http://localhost del
  dominio; se ofrecen solo si el origen de la petición está en la lista), `lib/llaves/llaves.ts` (`retoRegistro`, `registrar`, `retoEntrar`,
  `entrar`, `ofrecerUnaVez`, `quitar`, `revocarEn`, `quitarTodasEn`, `llavesDe360`, `purgarRetos`), `lib/cuenta.ts` **`abrirSesionEn`** (la única
  puerta de la sesión: el código y la llave pasan por las mismas revisiones) y `ponerSesion`; rutas `/api/cuenta/llave/{entrar/reto, entrar,
  registro/reto, registro, oferta}`; la purga en el barrido; `Permissions-Policy` con publickey-credentials. Cliente: `lib/nativo/llave.ts` (TLLlave o
  `navigator.credentials`; nada sin contexto seguro; en una cáscara sin TLLlave, nada). Pantallas: Entrar «Usar mi llave de acceso», la hoja «Entra la
  próxima vez con Face ID / tu huella» (`app/entrar/HojaLlave.tsx`), Mi cuenta › Privacidad › Llaves de acceso, Super Admin › Usuarios 360° ›
  Seguridad › LLAVES DE ACCESO (revocar con motivo, aviso y auditoría; restablecer la verificación también las quita), Sistema › Equipo (con / sin
  llave). Nativo: plugin **TLLlave** (`apps/mobile/plugins/tl-llave`: iOS AuthenticationServices, Android Credential Manager con androidx.credentials
  1.5.0) en las 4 apps por `apps.json`/`generar.mjs`, **apagado** (`llaves.activas: false`) hasta que 8b sirva AASA `webcredentials` y assetlinks
  `get_login_creds`; humo de Android que lo pregunta en cada app. Ayuda `entrar-con-face-id`; `mi-cuenta` y `admin-usuarios` al día.
- **Probado:** `llave8d` **90** comprobaciones (390 y 1360; autenticador virtual de Chromium por CDP: registrar, salir, entrar sin SMS, la misma
  sesión, reto repetido / vencido / inventado / de otra cuenta, llave de otra cuenta por userHandle y por id, quitar, suspendida, baneada, este
  dispositivo y el de origen bloqueados, sesión de origen bloqueada, verificación restablecida, borrado programado cancelado y el de To'Latino no,
  borrándose, contador que retrocede (con firma buena se quita; sin firma buena NO), límites, tope, paredes de la base, TLLlave por el puente simulado,
  Super Admin, HTTP en una IP sin botón y el SMS igual, interruptor apagado); `alreves8d` **41/41** (5 guardianes nuevos: `retoUnUso`,
  `llaveDeSuCuenta`, `passkeyNoSaltaBloqueo`, `clonSoloConFirma`, `llaveSoloDondeSePuede`; y `libroSoloInsercion`, `nativoConRespaldo`,
  `pluginViejoNoRompe`, `accionesConAcceso` cubriendo 8d), tsc, build y todos los guardianes; migración dos veces en la base local y en una base nueva
  (`tlci-db`, 130 migraciones + 54 semillas, dos veces). CI «Cáscaras» en `claude/vibrant-franklin-krutwa`: corrida **43055393415 (756b9ff) verde**
  (Android 4 sabores + emulador; iOS 4 targets compilan y abren, con TLLlave) y **43058696975 (e6f4a07)** con el humo de TLLlave en las 4 apps de
  Android («plugin: true, disponible: no, obtener: opciones»). Regresión (una a la vez): cuenta2h 29, adm7i 113, beta8f 95, app8a 110, wal8g 97,
  app8e 64 (la primera vez 52: el número al azar del vecino del cupón cayó en uno que ya lo había canjeado; otra vez, 64), push8c 86 (la primera vez
  85: un error de hidratación en el 360°, que arreglé mostrando la última vez de una llave con fecha y no «hace N min»; después la agenda de Hoy del
  panel de Sabor Dominicano tenía 167 pedidos de prueba aceptados de hoy y el pedido nuevo ya no salía: los marqué hechos en la base local y pasó).
  `usr1l` (Fase 1) no pasa por datos acumulados, no por 8d: busca «Marisol» y abre «Marisol Gómez» (semilla del 7 nov) y Marisol comparte
  dispositivo con 2 cuentas desde el 10 nov.
- **Bloqueado / no hecho aquí:** usar las llaves en el sandbox espera el dominio con HTTPS (Paquete 8-0); TLLlave de verdad en iPhone y Android
  espera 8b (AASA, assetlinks, dominio asociado) y 8h (origen android:apk-key-hash de la llave de firma); obligatorias para el equipo, Fase 9.
  Todo en LAUNCH-CHECKLIST «Fase 8 · 8d».
- **Sigue:** 8b (necesita el dominio) u 8h.

## Fase 8 · 8h hecho hasta donde llegan el dominio y las cuentas — la tubería de las tiendas (11 nov)
- **Hecho:** migración **0131** (renumerada: el plan decía 0132; sin semilla) — `ci_oidc_jti` (jti pk: el mismo token no entra dos veces; solo
  inserción y purga de lo vencido), `ci_oidc_log` (cada intento con su motivo, solo inserción; lo que dice el token solo con la firma buena),
  `store_submissions` (solo inserción; `revision_publica` y `lanzamiento` rechazados por la base sin `app.tiendas.publico` y sin el OK del
  fundador), `build_requests` («Pedir un build»; no se borra, el estado solo avanza), `app_builds` + `symbols_key`, `bundle_key`, `request_id`,
  `store_build_id` (una vez; sabor de producción y canal «tienda» rechazados sin el interruptor), `store_secrets.kind` + `github_token`,
  Configuración › Apps `tiendas_pedidos_hora`, `tiendas_oidc_fallos_min`, `tiendas_archivo_mb`, interruptores `app.tiendas.tuberia` (encendido)
  y `app.tiendas.publico` (apagado). Servidor: `lib/tiendas/oidc.ts` (el JWT de GitHub con `node:crypto`: RS256 exacto, kid del JWKS ≥ 2048, firma,
  emisor, audiencia, repo e ids, dueño, entorno, sub, rama, evento, flujo, runner, sin PR, tiempos), `lib/tiendas/tuberia.ts` (autenticar: HTTPS de
  nginx → tope → interruptor → token → jti en una inserción; las llaves de cada job con la contraseña del almacén derivada; registrar y avanzar
  builds; archivos al almacén privado; Play interno desde el servidor; TestFlight procesado por Apple → grupo interno; el barrido; «Pedir un build»;
  lo que ve el Super Admin), `lib/tiendas/play.ts` (Android Publisher v3), `lib/tiendas/github.ts` (workflow_dispatch), `lib/tiendas/asc.ts`
  (builds y grupo interno), `lib/tiendas/direcciones.ts` (todas las direcciones; `ASC_API_URL` se mudó de lib/beta.ts), rutas
  `/api/tiendas/{oidc,build,archivo}`, nginx `/api/tiendas/archivo` hasta 200 MB. Pantallas: Sistema › Apps › **Versiones** en vivo (cifras, lo que
  necesita la tubería, «Pedir un build», pedidos, cada build con símbolos, pedido y envío) e **Integraciones** (token de GitHub, LECTURAS DEL CI,
  INTENTOS DE LA TUBERÍA). CI: `.github/workflows/tiendas.yml` (plan + versión + islas, el contrato del OIDC con el token REAL, Android y iOS por
  matriz de las 4 apps en el entorno `tiendas`; sondeo HTTPS antes de mandar un token; llaves en un directorio temporal borrado con `if: always()`;
  sin el dominio: llave desechable «NO PARA DISTRIBUIR» y archivo de iPhone sin firma), `scripts/tiendas/ci.mjs`, `apps/mobile/scripts/version.mjs`
  + `apps/mobile/versiones.json` (una versión con la huella de lo nativo), firma release en `build.gradle` (solo con `TL_FIRMA_ALMACEN`).
  Contratos: `scripts/contrato-oidc` (nuevo, también en ci.yml) y `scripts/contrato-tiendas` ampliado; simuladores `scripts/tiendas-sim/github.cjs`
  y `play.cjs`, `sim.cjs` con builds. Guardianes nuevos `oidcEstricto`, `versionCoherente`, `tiendaSoloProduccion`, `flujosBienFormados`; ampliados `llavesFueraDelRepo`,
  `tiendasSimuladorAislado`, `libroSoloInsercion`. Ayuda `admin-tuberia-de-apps`; `admin-llaves-de-las-tiendas`, `admin-errores-y-beta` y
  `admin-configuracion` al día.
- **Probado:** `tien8h` **106** comprobaciones (API: cada rechazo —HTTP, sin token, otro repo o id, main, produccion, otro entorno, otra audiencia,
  vencido, PR, cascaras.yml, runner propio, alg none, HS256 con la llave pública, kid desconocido, otra firma—, apagado, el mismo token dos veces
  y a la vez, las llaves de cada job y la contraseña derivada que abre el .p12, lecturas con run y commit, builds y archivos, Play interno contra el
  simulador del descubrimiento oficial, TestFlight procesado y en el grupo interno, INVALID, build ajeno, no creciente, el servidor decide,
  símbolos, tope de tamaño, paredes de la base, tope por minuto; pantallas a 390 y 1360: Versiones, «Pedir un build» sin token y con él —el
  workflow_dispatch con los inputs que declara tiendas.yml—, la pantalla que se pone al día sola, Integraciones, Soporte sin botón ni llaves),
  `alreves8h` **51/51**, contrato del OIDC **49** (54 en CI con el token real), contrato de las tiendas **62**, tsc, build y todos los guardianes; migración dos veces en la base
  local y en una base nueva (131 migraciones + semillas dos veces). Regresión (una a la vez): beta8f 95, app8a 110 (con «0 DE 9» llaves: el tipo
  nuevo; la primera vez 56 por esa espera), wal8g 97, llave8d 90 (la primera vez falló porque serví sin las variables de 8d: `servir8h.sh` ahora
  sale de `servir8d.sh`), adm7i 113. La primera corrida de beta8f falló en el APK de un uso porque `tien8h` dejaba sus builds del CI en la base
  (el enlace tomó el APK de la prueba): `tien8h` ahora los quita al terminar.
- **CI «Tiendas»** (`claude/vibrant-franklin-krutwa`; como un flujo nuevo no se lanza a mano hasta estar en la rama por defecto, un commit
  TEMPORAL lo hizo correr también en esta rama y el último commit lo quita): corrida **43072031036** (82c6364): plan + versión + islas en verde, el
  **contrato del OIDC con el token REAL de GitHub** contra su JWKS real en verde (54: repo 1283030677, dueño 281237548, entorno `tiendas` —GitHub
  lo creó al primer uso—, push, github-hosted, flujo tiendas.yml, vida 300 s; con solo «pruebas» permitida, este run sale por «rama»; con el cuerpo
  cambiado, «firma»), los 4 archivos de iPhone (Release, iphoneos, **sin firma**, 1.0.0 (101)) en verde y el sondeo dijo «pruebas.tolatino.com no
  contesta por HTTPS (ENOTFOUND)» sin mandar ningún token; los 4 de Android fallaron porque la variable SABOR del job (el sabor de Gradle) pisaba la
  de generar.mjs → 67d11d1 (VARIANTE); esa corrida (43074283366) GitHub ni la empezó: el reemplazo dejó la salida «ios» repetida → 37b609d; corrida
  **43074403264** (37b609d): los 4 sabores compilan el .aab y el .apk release **firmados con la llave desechable** (apksigner: «CN=NO PARA
  DISTRIBUIR…») y «✓ llaves borradas»; la firma del .aab no se comprobaba de verdad (tail -1) → 1286ea5 (pipefail y «jar verified»); cancelé esa
  corrida para no esperar sus iOS en cola; corrida **43075242906** (1286ea5): **verde** en el segundo intento (el iOS de Repartidor del primero se
  canceló a los 15 min sin conseguir una Mac de GitHub; con «re-run failed» pasó): plan, OIDC real, Android ×4 (firmado, «jar verified») e iOS ×4.
  Las dos fallas del flujo dejaron el guardián nuevo **`flujosBienFormados`** (ninguna llave repetida en un flujo; SABOR solo «pruebas»):
  `alreves8h` **51/51**.
- **Bloqueado / no hecho aquí:** HTTPS del sandbox (Paquete 8-0) y las cuentas y llaves (8-1/8-2): sin ellos nada se sube; crear la llave de subida
  en el primer job (falta el pedido OIDC que la guarda), el primer TestFlight real, simbolizar con los dSYM, la huella de la firma de Google hacia
  assetlinks y las llaves de acceso, la configuración de Firebase en el CI, reglas del entorno `tiendas`. Todo en LAUNCH-CHECKLIST «Fase 8 · 8h».
- **Sigue:** 8b (necesita el dominio) u 8i.

## Fase 8 · 8i hecho hasta donde llegan el dominio y las cuentas — fichas, privacidad, reglas de las tiendas y cuentas de revisión (11 nov) · FASE 8 CERRADA SALVO 8b
- **Hecho:** migración **0132** (renumerada: el plan decía 0133) — `store_listings` (copia de lo subido, solo inserción, con los topes de cada
  tienda en la base), `store_screenshots` (almacén privado, nada se borra), `data_inventory` (rastreo siempre false; semilla repetible
  `inventario_datos.sql` generada del inventario), `review_accounts` + `review_account_log` (solo inserción), `founder_steps` (solo inserción),
  `otp_codes.channel` «revision», interruptor `app.revision.cuentas` (apagado), Configuración › Apps `revision_intentos_hora` y `fichas_subidas_dia`;
  la base no deja guardar tarjetas a una cuenta de revisión y exige su negocio oculto. Semilla **0048_revision.sql** (sandbox: 4 cuentas
  +1 484 555 0181…0184 y el negocio oculto «To’Latino Revisión»). Fichas ES/EN de las 4 apps (`apps/mobile/tiendas/*/{es,en}.md` → `fichas.json`,
  `apps/mobile/scripts/fichas.mjs`); `apps/mobile/inventario-datos.json` (18 categorías) → `privacidad.mjs`: etiquetas de Apple, CSV de Data safety,
  `PrivacyInfo.xcprivacy` por target (API de razón requerida reales; versión nativa **1.0.1**), `salidas.json` y la semilla; `/privacidad` pública
  (borrador versión 0). Servidor: `lib/tiendas/{fichas,paquete,revision,reglas}.ts`, ASC (ficha, clasificación, notas, capturas) y Play (ficha,
  capturas, Data safety) en `asc.ts`/`play.ts`, `/api/tiendas/archivo?tipo=captura`, `/api/admin/tiendas/data-safety`. Pro fuera de las apps (ctaPro,
  estado del plan, compuerta en planSeguir/planDeshacer; el bloque `lock` admite ir sin botón); Mi cuenta y ajustes en Negocios y Puerta. Pantallas:
  Sistema › Apps › **Fichas y revisión**, **Lo que te toca**, **Declaraciones**; **Analítica › Apps**; Mi cuenta › Privacidad enlaza /privacidad.
  CI: `scripts/tiendas/capturas.mjs`, `capturas-android.sh`, `ci.mjs capturas` y el job «capturas» de `tiendas.yml` (a pedido); deploy.sh crea los
  `REVISION_CODIGO_*`. Guardianes nuevos `fichaEnLimites`, `privacidadCoherente`, `sinCompraDigitalEnApp`, `borrarCuentaEnCadaApp`,
  `sinProntoEnTienda` (aviso), `revisionAcotada`; ampliados `appNoAutoriza`, `llavesFueraDelRepo`, `semilla`, `direccionAlConfirmar`. Ayuda
  `admin-fichas-y-revision`, `privacidad`; `admin-sistema-apps`, `admin-configuracion`, `apps-de-to-latino`, `plan-pro` al día.
- **Probado:** `fich8i` **104** comprobaciones (390 y 1360, con y sin TLApp: /privacidad y /soporte sin sesión; la web ofrece Pro y Negocios iOS y
  Android en 9 pantallas no; el servidor rechaza volver a Pro con el rótulo de la app; Borrar mi cuenta en las 4 apps con sus cuentas de revisión;
  la cuenta de revisión entra con su código, nunca se muestra, código malo y el de otra cuenta no entran, no guarda tarjeta ni paga — la pasarela lo
  frena y lo anota —, su negocio no se ve, desactivarla y apagar el interruptor la cortan también con un código ya pedido; Fichas sin llaves → sin
  llave; con llaves → 16 borradores en los simuladores, nada a revisión; Lo que te toca, Declaraciones, el CSV, Analítica › Apps, Configuración),
  `alreves8i` **50/50**, contrato de las tiendas **86** (24 nuevas), contrato de Stripe, tsc, build y todos los guardianes; migración dos veces en la
  base local y en una base nueva (132 migraciones + semillas dos veces). Capturas de las fichas en local (con Chromium; aquí no hay WebKit): 16 juegos
  (4 apps × 2 tiendas × ES/EN) de 5 o 6, todas sin texto cortado; la Puerta en inglés fallaba la primera vez (intentaba abrir otra puerta en vez de
  reusar la abierta) → corregido y repetido: 20 de la Puerta.
- **Regresión (una a la vez):** app8a 110, beta8f 95, tien8h 106, llave8d 90, adm7i 113, cuenta2h OK (borrar la cuenta). `planes2n` (Fase 2) **falla**
  esperando el texto «Pedidos (Comida, Mercados, Tiendas)» en Super Admin › Planes › comisiones: ese texto salió del código el 6 nov (4n-1); la
  prueba está vieja, no es de 8i (Pro y su compra quedan cubiertos por `fich8i`).
- **CI** (`claude/vibrant-franklin-krutwa`, a mano): **Cáscaras 43091158128 (099df8c) verde** (Android 4 sabores + emulador; iOS 4 targets con los
  PrivacyInfo.xcprivacy nuevos y la versión 1.0.1). **Tiendas 43091151175 (099df8c):** plan, OIDC con el token real y Android · cliente en verde; el
  job «capturas» **falló**: con WebKit primero la sesión no quedaba (la cookie Secure por http) → a31b114 (la entrada en Chromium para todas).
  **Tiendas 43092711241 (a31b114):** el job «capturas» **falló** otra vez: en una base recién sembrada Sabor Dominicano no tiene dueño, el
  repartidor de la semilla 0046 no existe y los eventos de La Terraza están en revisión → d9a1d09 (Barbería El Primo, el repartidor creado antes de
  la semilla y el evento publicado; probado en una base nueva: `puerta_puede` = t; y en local, 24 capturas de Negocios). **Tiendas 43095423083 y
  43096938976 (d9a1d09): `startup_failure`** sin jobs, y **direcciones.yml 43097589711** (sin cambios) también: GitHub no está arrancando corridas
  en este momento (no es el flujo: actionlint limpio). **No verificado en CI:** el job «capturas» con los últimos arreglos ni las capturas de la
  cáscara real en el emulador (ese paso nunca llegó a correr).
- **Bloqueado / no hecho aquí:** subir de verdad las fichas, capturas, clasificación y notas (Paquetes 8-1/8-2: cuentas, llaves y apps creadas);
  capturas de iPhone en el simulador real (XCUITest); Data safety por la API (decisión del fundador); cuentas de revisión de producción (Fase 9);
  Apple App Privacy y las declaraciones de Google (Paquete 8-3, a mano con la pantalla Declaraciones). Todo en LAUNCH-CHECKLIST «Fase 8 · 8i».
- **Fase 8:** 8a, 8c, 8d, 8e, 8f, 8g, 8h y 8i hechos hasta donde llegan el dominio y las cuentas. **Queda 8b** (enlaces universales y App Links),
  que espera el dominio con HTTPS (Paquete 8-0).
- **Sigue:** 8b (necesita el dominio con HTTPS, Paquete 8-0).

## Fase 9 · plan escrito (11 nov)
`docs/diseno/plan/fase9-apertura.md`: 22 bloques en tres grupos; migraciones **0133–0145** (grupo A; B y C toman la siguiente libre), semillas
**0049–0056** (solo pruebas). Nada construido todavía.
- **Grupo A · ya, en el sandbox, sin el fundador (encadenado, AB):** 9a orden (las pruebas de punta a punta al repo, las viejas al día, LAUNCH
  auditada con destino) · 9b tubería completa (9 dispositivos, visual, axe, Semgrep, velocidad) y escala 1M · 9c accesibilidad del sistema de diseño ·
  9d exportar mis datos, borrado definitivo a 30 días, retenciones, fusionar · 9e legales por estado (PA) y aceptación · 9f CMS completo · 9g Analítica
  completa y reporte diario · 9h Crecimiento, landing de acceso anticipado, QR de calle, SEO · 9i Ciudades (asistente, `beta`) · 9j Sistema completo y
  segundo factor del equipo · 9k dinero real listo · 9l avisos, correo y canales · 9m lo diferido del vecino · 9n lo diferido del negocio, Repartidor y
  operación · 9o producción como código y ensayada (sobre sellado, respaldos con restauración probada, vuelta atrás, monitoreo, manual de incidentes).
- **Grupo B · espera paquete:** 9p (8-0 dominio: 8b y lo que necesita HTTPS) · 9q (9-1 Stripe, Telnyx 10DLC, WhatsApp, SES, Anthropic) · 9r (8-1/8-2/8-3
  tiendas) · 9s (9-2 abogado y contador).
- **Grupo C · producción con OK:** 9t acceso anticipado (OK-1) · 9u beta en Hazleton y apps a revisión (OK-2) · 9v apertura de las cinco (OK-3).
- **LAUNCH-CHECKLIST:** 535 pendientes (532 casillas + 3 viñetas) mapeadas por línea en el Anexo A: 403 (a) sandbox, 113 (b) paquete del fundador, 19
  (c) encendido de producción. Muchas de las viejas ya están hechas: 9a las verifica contra lo servido.
- **Hallazgos al escribir el plan:** las ~220 pruebas de punta a punta (y 37 al revés) **no están en el repo** (viven en el directorio temporal de la
  sesión de trabajo): 9a las sube a `pruebas/` antes que nada. `sinProntoEnTienda` cuenta `PantallaPronto` (ciudad «próximamente») como si fuera
  «En construcción»: 9a lo parte en dos guardianes. Las llaves de terceros no tienen camino al servidor (el sobre sellado de 9o lo resuelve).
  `planes2n` sigue fallando por un texto viejo (9a).
- **Pedir ya los paquetes** (tardan): 8-0, 8-1/8-2/8-3, 9-1, 9-2, 9-3; 9-4 va llegando; 9-5 al final.
- **Sigue:** 9a.

## Fase 9 · 9a — orden antes de cerrar (11–12 nov)
**Hecho (rama `claude/vibrant-franklin-krutwa`):**
- **Las pruebas al repo** (`pruebas/`): **159 de punta a punta** (`pruebas/e2e`, las 158 reales del scratchpad + `rsvp9a`) y **39 al revés**
  (`pruebas/alreves`: las 36 `alreves5a…8i`, `alreves8a-puente.mjs`, `alreves8e-senal.sh` y `alreves9a`). Fuera quedaron las de depuración y de
  un solo uso (`dbg*`, `cap*`, `shot*`, `*.pre*`, `*-dbg`, `*-smoke`, `humo*`, `t*`, `mira*`, `bench8c-run` → 9b…). Variantes elegidas: `edu4a_r` →
  `edu4a`, `sop7b-8f` → `sop7b`, `usr1l-8d` → `usr1l`; `evt6b` quedó reemplazada por `evt6b-6c`.
- **Un solo servidor de pruebas** `pruebas/servir/servir.sh [completo|basico]` (reemplaza `servir*.sh` y `servidor.sh`; `SOLO=servir`,
  `TRADUCTOR_URL`), `base.sh` (crea o enciende la base y Garage; migraciones y semilla con `pruebas/fakecompose.sh`), `recursos.sh` (jsQR, el
  generador de QR, los documentos de descubrimiento de Google con su huella, fotos de prueba, el venv de la moderación) y **`pruebas/correr.mjs`**
  (una, `--grupo faseN|varios|alreves`, `--todas`, `--desde`, `--saltar`, `--paralelo` = al revés | punta a punta; una a la vez por carril, con
  candado; las del Super Admin al final de su fase; tabla y `resumen.json` con las ✓). Ayudantes en `pruebas/lib/` (`entorno.cjs`, `g6-comun.cjs`,
  `stub-traductor.cjs`, `compa7d-familias.sql`), `pruebas/q.sh`.
- **Sin secretos (el repo es público):** las pruebas leen todo de `$PRUEBAS_SALIDA/secretos.env` (fuera del repo; `servir.sh` genera al azar
  `AUTH_SECRET`, `BARRIDO_TOKEN`, `DATOS_SECRET`, `STRIPE_WEBHOOK_SECRET`, WhatsApp, la llave del QR, la de Telnyx y los cuatro `REVISION_CODIGO_*`;
  `base.sh` la contraseña de la base y de Garage). Teléfonos solo 555 (el `570-554-…` de 1i pasó a `570-555-7747`; los de `publica` también),
  correos `@example.com`, sin rutas de la máquina. Guardián **`pruebaSinSecretos`**; grep del diff antes de cada commit (hex/base64 largos,
  `sk_`, `-----BEGIN`, `secret=`, `/tmp/claude`, `/home/user`): solo huellas públicas y datos de prueba marcados `GUARDIAN-OK`.
- **Guardianes:** `sinProntoEnTienda` partido en **`sinEnConstruccion`** (falla siempre; `Pronto.tsx` borrado; las secciones del Super Admin
  pendientes —hoy `mkt`— solo avisan hasta `TOLATINO_FASE=9`) y **`revisionVeCiudadAbierta`** (cuentas de revisión, su negocio y los probadores de
  la beta en una ciudad que la semilla abre; `beta` cuenta sola cuando 9i lo agregue); **`launchConDestino`**, **`e2eEnElRepo`** (excepciones con
  motivo: `evt6b`, `servir8d`, `servir8h`, `orden9a`, `sop7b-8f`, `usr1l-8d`, `bench8c-run`); `pedidoHorasOpcionales` ampliado. `alreves9a` **28/28**. `qrFirmado`, `compaUnSoloProveedor` y
  `traduccionPropia` ya no miran las pruebas al revés (inyectan el defecto a propósito).
- **Arreglo de la app:** el detalle de un pedido sin hora de respuesta decía «Si no respondes antes de las null» (lo cazó `pednull`).
- **Semilla `0049_base_nueva.sql`** (solo sandbox): Ana, Juan y Lucía en una base nueva y los bloques de 0044/0045/0046 repetidos; las líneas del
  pedido de El Fogón (0040). Probada en una base nueva (`tl9a-nueva-db`: 6 push, 3 testers, el caso de Lucía, 60 posiciones, 1 Admin) y dos veces.
- **Pruebas viejas al día:** planes2n, pedidos2c, pednull (su propio pedido), usr1l, noc4c, pagos2d (ya no borra pagos, devoluciones, disputas,
  tarjetas ni cuentas de cobro de toda la base), ayuda2i y cit3e (tampoco borran todas las solicitudes ni la cola), ayu4if, ayu4z, ayu4f, ayu4g,
  ayu4m, noc4d, res4s y evt6d (con El Compa encendido entran por la hoja o con `?de=compa`), las colas cruzadas por `subject_kind` (antes
  mezclaban casos de otras colas), adm4eg/adm4ig/adm4ne/sop7b (su cola, no la lista general de cientos), barr (el barrido ya tiene más de 60
  tareas), dep4c, ins4e, correo2q, cuenta2h; alreves5a/5b/5c/5e/5f/6b apuntan al texto y a la última definición de hoy.
- **LAUNCH auditada:** 535 pendientes por el Anexo A. **9a-V (89):** 56 hechas con su evidencia en la línea, 33 con lo que falta en su bloque
  (9n 14, 9l 6, 9m 5, 9b 3, 9o/9i/9r/9k/9q 1 c/u). **9a-D (63):** 36 cerradas con su decisión (REVISION «9a»), **25 a `docs/DESPUES-DE-ABRIR.md`**
  (DA-01…DA-25), 2 abiertas (→ 9p, → 9v). **9a-P (13):** 12 hechas, 1 → 9n (semilla de Noche). Las 3 viñetas sueltas de «Plan Pro» son casillas.
  **Hoy: 409 pendientes, todas con destino** (9b 70, 9c 7, 9d 11, 9e 3, 9f 9, 9g 8, 9h 2, 9i 4, 9j 9, 9k 19, 9l 29, 9m 30, 9n 65, 9o 6, 9p 18,
  9q 25, 9r 29, 9s 38, 9t 5, 9u 11, 9v 4, Paquete 9-4 4, Paquete 9-5 2); 104 marcadas en 9a. Dos hallazgos del CI (capturas de Android que
  pierden el emulador; humo de Android inestable en modo avión) y la regresión roja → 9b.
**Probado:** `orden9a` = `node pruebas/correr.mjs --todas` en la base local, una a la vez: **169/198 en verde, 6 397 ✓ (96 min)**; las 39 al revés
en verde (1 431 ✓). Volviendo a correr solo las 29 rojas: **pasan em4e y renta4f** (dependen del orden) → **171/198**. **Quedan 27 rojas** (salida
real en `$PRUEBAS_SALIDA/res/<nombre>.out`; destino **9b**, LAUNCH «Fase 9 · 9a»):
- fases 1–2, la pantalla cambió y no volvieron a correr desde el 5–6 nov: admin1i, cat1m, rec1j, lic, rec («Timeout»), rec2 (espera «Mandarme el
  código», que ya no está en Recuperar), menu2a-f (espera «Agotar»), free2b (espera «Free: N de N pedidos»), cit3b («mañana 10:00 y 10:30 ocupadas»);
- datos acumulados o cuentas compartidas: adm2i («Transacciones: 3729 en 90 días» no coincide con la cifra de la pantalla), plan4f («cancelado ·
  cobrado en total $298»; la tarjeta de Marisol la cambian otras pruebas), adm4ne («Devolver desde el Super Admin funciona en una noche»), adm4y
  («se ve la salida cancelada por el negocio»), wal8g («el certificado nuevo … versión 4 reemplaza al anterior»), sop7b («Colas › Soporte · casos
  también lo muestra»), adm7i («Soporte de Allentown (Sofía) no abre una conversación de Hazleton»), compa7d, fich8i («Idioma y cuenta» del
  Repartidor; la cuenta de revisión SÍ entra con su código al azar), evt6i (no ve «Aceptar y pagar»), disp2r («evidencia: línea de tiempo»), adm6j
  («la hora del recordatorio sale de Configuración (8 PM)»: a esa hora la configuración tope es 20);
- dependen del orden (pasaron solas en esta sesión): cit3e, ayu4g, noc4b, tra4y, vis4ie; y msg2p («una sola automática cada 12 h»), ya de 9b.
`node guardianes/run.mjs` limpio; `tsc` 0. Sin migración. **No hecho en 9a:** la regresión en el CI y las 27 rojas (9b).
- **Sigue:** 9b.

## Fase 9 · 9b-1 — la regresión entera en verde en una base nueva, dos veces seguidas y en otro orden (12 nov)
**Hecho (rama `claude/vibrant-franklin-krutwa`):**
- **El punto de partida, medido:** una base NUEVA (`base.sh`: migraciones + todas las semillas del sandbox) con las pruebas como las dejó 9a:
  **134/198 en verde** (64 rojas; en la base vieja eran 27). Las causas, por familia:
  - **Datos que solo existían en la base vieja:** `barberia-7747` (admin1i, panel, rec1j, fich8i), Pedro dueño de Sabor Dominicano y su cuenta de
    cobro (≈40 pruebas del panel), el dueño de La Patria y del Bufete (lic, pro4l, pro4l2, svc4h2), las tarjetas de Marisol con ids de otra base,
    su dirección de casa, Beto/Lucía/Sofía del equipo, la licencia de Luis (sal4i), las filas de ajustes que creaba un panel.
  - **Ids fijos de la base vieja** (servicios, la sección 318, los eventos 2/3/7/11/12, el tipo de boleto 15): ahora por nombre o por título.
  - **Lo que hace otra prueba:** `pruebas/lib/requiere.cjs` lo pide en voz alta y, si no está, corre la prueba que lo hace.
  - **La hora y el día:** horas de silencio del SMS, eventos «de hoy», el local que no abre hoy, las salidas de 48 h, la cita de «mañana», la
    caché de 15 s, el barrido de notas de 1 por minuto; y en la aceptación: el negocio que deja de tomar pedidos 15 min antes de cerrar (dlvsrv)
    y la noche de Noche/Puerta que cambia a las 6 AM (`lejosDelCambioDeNoche`).
  - **Topes de un día de las mismas cuentas** (`sinTopeDeAyuda`, `sinTopesComunidad`) y la cuenta de menos de 24 h que tiene la mitad (com5c).
  - **Pantallas y textos que cambiaron** (free2b, autos4ic, com5d, disp2r, avisos2j, evt6b-6c, msg2p) e **inestables de verdad** (sal4j y pro4l
    buscaban texto en lo cifrado con `convert_from(…, 'LATIN1')`).
  - **Lo que una prueba deja y la siguiente hereda:** cuenta2h dejaba a Marisol en Allentown (adm7i), rep2l borraba al repartidor de la cuenta
    de revisión (fich8i), menu2a-f dejaba «Res guisada» agotada y adm2i contaba las cortesías (segunda corrida en la misma base).
- **Arreglos de la app (cada clase con su guardián y su caso al revés en `alreves9b1`, 13/13):**
  - `?ciudad=<id>` de Recomendar (`parametroCiudadDelSelector`); la fila de etiquetas de PostCard (`etiquetasSeEnvuelven`); «hoy» en UTC en el
    servidor (`hoyEnLaCiudad`, `lib/fecha-local.ts`).
  - **Repartidor sin equipo sin camino a Borrar mi cuenta** (Apple 5.1.1(v)): las filas de cuenta también en ese estado
    (`borrarCuentaEnCadaApp` ampliado). Lo destapó fich8i.
  - **Error 418 de hidratación en «hace N min»** (17 pantallas del cliente con `Date.now()` al pintar): `lib/ahora.tsx` (`useAhora`, el
    instante del servidor en la raíz) (`ahoraDeLaHidratacion`). Lo destapó adm7i en /soporte.
  - **La Puerta ofrecía «Entró 1» en una reserva terminada** y el servidor lo rechazaba (`listaPuertaCoherente`). Lo destapó evt6g.
  - **Los bloques del panel se desmontaban** cuando aparecía otro arriba (las plantillas del estimado): se perdía lo escrito en «QUÉ ES» y el
    foco (`bloquesConLlave`, `llavesDeBloques` en `packages/ui`). Lo destapó est4d, 1 de cada 3 corridas.
- **adm7i NO era un fallo de seguridad:** Sofía (Soporte de Allentown) abría la conversación de Marisol porque cuenta2h la había dejado en
  Allentown; con una de Hazleton el servidor responde «Esa conversación no existe» y no anota lectura. adm7i ahora comprueba los dos lados.
- **Semilla `0050_duenos_base_nueva.sql`** (solo sandbox), **`base.sh` indexa el Centro de ayuda**, **`correr.mjs --barajar [semilla]`**,
  ayudantes en `pruebas/lib/negocio-nuevo.cjs`. Sin migración.
- **Android en el CI:** humo de Cáscaras en verde (43152344555) y capturas de las fichas en verde (43162239412, `-gpu guest`).
**Probado (corridas enteras, `node pruebas/correr.mjs --todas`, una a la vez, servidor de :3100 construido con el commit de cada una):**
| corrida (12 nov, UTC) | base | resultado | rojas (causa → arreglo) |
|---|---|---|---|
| A 08:01 (cd2971e) | nueva | 196/199 · 7 038 ✓ | com5c (cuenta de <24 h), adm7i (418 en /soporte), dlvsrv (4:45 AM) |
| B1 09:55 | nueva | 198/199 · 7 070 ✓ | evt6g (la Puerta ofrecía «Entró 1» en una mesa terminada) |
| B2 11:52 | nueva | 197/199 · 7 070 ✓ | est4d (bloques del panel), evt6i (50 s con la máquina cargada) |
| **B3 13:45 (8c0ee26)** | **nueva** | **199/199 · 7 120 ✓ · 104 min** | — |
| B4 15:29 | la de B3 (2.ª vez) | 197/199 · 7 107 ✓ | menu2a-f, adm2i (lo que dejaba la corrida anterior) |
| B5 17:13 | la de B3 (3.ª vez) | 194/199 · 6 988 ✓ | pq4e (hora), tra4y + adm4y (días gastados), ayu7a (ancho), beta8f (sin causa) |
| C 18:58 (872ce01) | nueva | 198/199 · 7 096 ✓ | compa7d (tope de 1 centavo) |
| D 20:41 (05cd5ca) | nueva | 198/199 · 7 113 ✓ | compa7h (Tokio pasó a las 7 AM a mitad de la prueba) |
| F 22:26 (5e138d6) | nueva | parada en 171/199 (169 ✓, 2 ✗) por costo | noc4c (corte de esta noche ya pasado a las 6 PM), noc4d (dependía de noc4c) |

Cada roja se arregló en su raíz y se volvió a correr SOLA en verde (las de F: noc4c, noc4d y compa7h 3/3, 276 ✓). **No hubo dos corridas
enteras seguidas en verde ni la corrida `--barajar`**: por costo, la confirmación pasa al CI de 9b-2 (LAUNCH «Fase 9 · 9b-1»).
`node guardianes/run.mjs` limpio; `tsc` 0.
- **Sigue:** 9b-2 (la regresión en el CI, por grupos, cada uno con su base nueva) y lo de LAUNCH «Fase 9 · 9b-1».

## Fase 9 · 9b-2 — la tubería completa en el CI (13 nov)
- **Hecho:** `ci.yml` con los trabajos `verificar` (tipos · build · guardianes · contrato con Stripe · base nueva), `seguridad` (`pnpm audit` y Semgrep con las
  reglas de `semgrep/`), `web` (un solo build para todos), `regresion` (las pruebas al revés en un carril y TODA la punta a punta en otro, en el orden de las
  fases y una a la vez sobre una base nueva: repartida por grupos fallaban 30 de 199 por datos heredados, no por la app), `dispositivos` (los 9: iPhone SE, 15, 15 Pro
  Max, Pixel, Galaxy, iPad y escritorio 1024 · 1280 · 1440, WebKit y Chromium: capturas aprobadas de `pruebas/visual/`, axe WCAG AA y presupuesto de velocidad),
  `confirmacion` (a mano, `confirmar=si`) y `tuberia`, que solo da verde si todo lo anterior dio verde y nada se saltó. A mano: `alcance` (todo · pantallas ·
  regresion), `solo` (una o varias pruebas por nombre, para afinar una roja sin esperar 80 min), `aprobar`, `medir`, `confirmar`. Programado a dos horas del día.
- **Guardianes nuevos:** `tuberiaVisual`, `tuberiaAccesibilidad`, `tuberiaSeguridad`, `tuberiaVelocidad`, `tuberiaNoSeSalta` (con `pruebas/alreves/alreves9b2.cjs`
  y `tub9b.cjs`).
- **Causas de CI y de pruebas (no de la app) que salieron y se arreglaron en su raíz:**
  - **Capturas que cambian solas con la hora o el día** («Abierto hasta 9 PM», «Listo a las 8:48», «Quedan 22 h», los eventos de esta semana, una lista
    «Abierto ahora» que crece): `comparar.cjs` pinta del mismo gris, en las dos imágenes, lo que cambia con la hora (por el texto) y las secciones que
    `pantallas.json` nombra (`titulos`, `desde`); lo demás se compara igual (0,5 %). Antes fallaban 1 a 5 pantallas por dispositivo según la hora de la corrida.
    Cuando una difiere, el registro dice la franja y las zonas tapadas (el CI no deja bajar las imágenes).
  - **evt6d compraba un solo boleto:** evt6c deja la Configuración `evt_boletos_por_orden_max = 1` y la borra, pero el servidor la guarda 15 s; evt6d empezaba antes
    y veía «MÁX. 1 POR PERSONA». evt6c espera a que caduque y evt6d espera a que el contador marque cada toque (y dice lo que veía si no).
  - **noc4c / noc4d / cit3c de noche:** pasadas las 11 PM de Nueva York a la noche de hoy le queda una sola hora («Otra hora» se apaga) y la cita de dentro de una
    hora cae mañana (Hoy no la trae). La app estaba bien; las pruebas toman la noche con 2 horas y comprueban Hoy solo si es el mismo día.
  - **publica y an1n:** el teléfono «nuevo» salía de la hora y a veces era el de una cuenta ya creada: `pruebas/lib/telefono-libre.cjs` elige uno sin cuenta.
  - **disp9b:** la primera visita a `/eventos` en frío pasó de 30 s en WebKit (iPad): 90 s.
  - Python 3.12 para la moderación de fotos, historia completa del repo para las pruebas al revés, la cola de cada roja en el registro del CI.
- **Probado (CI, rama `claude/vibrant-franklin-krutwa`, workflow «CI», a mano):**
  | corrida | qué | resultado |
  |---|---|---|
  | 43352981241 (0d48e08) | regresión | 158/160 (an1n, evt6d) |
  | 43363905986 | todo | 156/160 + 5 dispositivos con capturas distintas por la hora |
  | 43381789310 | todo | 159/160 · 5 714 ✓ (solo publica: teléfono repetido) · 9 dispositivos en verde |
  | **43392515329** | **todo** | **corrida completa en verde: 43392515329** (tipos · build · guardianes, Semgrep + `pnpm audit`, al revés 42/42, 160/160 · 5 719 ✓ en 81 min de punta a punta, 9 dispositivos, `tuberia`) |
  | 43404378080 | pantallas (cambio con un color a pelo) | frenada por `tokens` en «verificar» (el guardián cazó el hex antes que la captura) |
  | **43405265633** | pantallas (fondo de `main` y `[data-screen-label]` con `--tl-action`) | **corrida frenada por un cambio visual sin aprobar: 43405265633** (9 de 9 dispositivos rojos, de 8,9 % a 36,9 % de la pantalla distinta; `tuberia` en rojo) |
  El cambio visual se revirtió en el commit siguiente; `apps/` queda igual que antes de la prueba.
- **Seguridad:** Semgrep (reglas propias) y `pnpm audit --audit-level high` en verde en todas las corridas; sin hallazgos nuevos.
- **No cerrado:** la confirmación a mano (43406644136) salió roja: «dos veces seguidas» 1 roja (compa7e en la segunda vuelta) y «barajada» ~15 rojas
  por orden; pasa a 9b-3 (LAUNCH «→ 9b · (9b-2) La corrida de confirmación»).
- **Sigue:** 9b-3 (escala 1M, migración 0133, topes compartidos), la confirmación del CI en verde y lo de LAUNCH «Fase 9 · 9b-2».

## Fase 9 · 9b-3 — la escala 1M, los topes compartidos y las pruebas que no dependen del orden (13 nov)
- **Hecho (rama `claude/vibrant-franklin-krutwa`):**
  - **Migración `0133_escala.sql`:** `rate_counters` (unlogged; `tope_sumar`, `corte_estado` / `corte_resultado`, `topes_purgar`); avisos `tl_config` (NOTIFY) en
    platform_config, config_keys, feature_flags, cities, mod_rules, mod_terms y synonyms; **`app_events` particionada por mes** (BRIN por partición, partición por omisión
    que `app_events_mes` reparte; la tabla se copia y se cambia de nombre en la misma transacción, con sus vistas) + **`app_events_dia`** + `eventos_retener_meses` (13);
    `refrescar_busqueda` CONCURRENTLY + `search_vocab_refreshed_at` (el barrido, cada hora); derivados que el barrido rehace cada 10 min: `com_analitica_dia_cache`,
    `content_counts_cache`, `com_rangos_ciudad`, `com_activos_cache`, `com_recomendados_cache`; índices por fecha y parciales (Contenido, ocultos, sancionados, la
    primera respuesta de una publicación); **`jit = off`** en la base. Aplicada dos veces (la segunda no cambia nada) en local y en cada CI.
  - **Topes compartidos** (`lib/topes.ts`): errores (global, por teléfono, por conexión; descartados en 24 h), Wallet por dirección, la posición del repartidor (una por
    segundo por token) y los corta-circuitos del traductor y de la moderación de fotos. **Configuración al instante** en todos los procesos (`lib/cambios-config.ts`).
  - **Guardianes nuevos:** `topeCompartido`, `copiaQueSeOlvida`, `consultaUnaVez` (un CTE con una función nuestra sin `materialized`), `pruebasIndependientes`;
    **`parametroSinTipo`** deduce los tipos de cada `$n` desde las migraciones (L176); **`ordenSinTexto`** a todo el código (L1052, 50 consultas arregladas). Al revés:
    `alreves9b3` 21/21 (y al día alreves5a, 5i, 6b, 6d, 6f, 8f).
  - **La carga** (`scripts/carga/`: `comunidad-1m`, `eventos-1m`, `apps-1m`, `compa-1m`, `analitica-1m`, `correr.mjs`): genera en una base desechable y **mide el código
    real de la app** (los módulos de `apps/web/lib` cargados con jiti), con su p50/p95 contra el presupuesto de cada fase y el `EXPLAIN ANALYZE` de la consulta más lenta
    de lo que pasa del presupuesto; lo que la app contesta con «no» cuenta como error. Corre en GitHub Actions (flujo a mano **«Carga 1M»**, `.github/workflows/carga.yml`):
    Postgres 16 + PostGIS como el sandbox, 1 M de vecinos y ~33 M de filas, sin máquina aparte.
  - **Lo que la carga sacó y se arregló aquí** (cada uno con su medida antes → después): la lista de Eventos 1,3 s (las fechas por ventanas en orden; la cuenta por
    evento; sin JIT); el muro 840 ms (las 21 primero con `= any(array(…))`; el radio por ventanas); Analítica › Comunidad 7 s → derivado; Contenido 24,7 s (lo
    reportado desde los reportes, lo nuevo por fecha, totales cada 10 min; comparada contra la versión de antes, igual); la búsqueda de la ayuda 60 → 2 ms
    (`materialized`); el embudo 438 ms (una pasada); Recomendados 580 ms (candidatos del resumen); Gamificación 1,8 s; Usuarios 900 ms; la Tabla 250 ms; Hoy 72 ms.
  - **Pruebas que no dependen del orden ni de la vuelta anterior:** el corredor cierra entre una prueba y otra las ventanas de un minuto (la espera de 30 s entre
    códigos, `rate_counters`, búsquedas de la puerta); cada prueba dice su punto de partida o pide la que lo hace (com5g, adm6j, correo2q, rep2l, rev2g, renov4d,
    pre4e, msg2p, compa7f, fic4id, tra4w, dep4c), noc4a acepta «anoche» pasadas las 6 AM, compa7e toma su foto de antes en cada modo, com5h comprueba el corte
    compartido. Ninguna se reintenta. **Semilla del sandbox `0051_eventos_modulo.sql`**: los negocios de la semilla con eventos tienen el módulo Eventos encendido
    (en una base nueva La Terraza no lo tenía y sus eventos daban 404: evt6e, evt6g, fich8i).
  - **Lo que sacó la confirmación del CI (43457194098, barajada con la semilla 1486178388) y se arregló de raíz:** EN CIRCULACIÓN (Super Admin ›
    Gamificación › Monedas) salía del resumen del barrido (hasta 10 min atrás; com5g en las tres corridas): ahora es el resumen + lo que entró al
    libro de monedas desde entonces + quien no tiene ciudad, exacto (índice `coin_entries_fecha_idx`; guardián **`saldoAlDia`**). compa7e comparaba
    dos fotos del panel con las 12:00 en medio («12 PM» → «12:01 PM»): `pruebas/lib/sin-reloj.cjs` quita la hora, el saludo y el día (compa7d/e/f/g;
    guardián **`fotoSinReloj`**). pre4e creaba su casa solo si Marisol no tenía ninguna y fi4b le dejaba otra: la prueba crea la SUYA y la hace la de
    por omisión (también pq4e, plan4f, em4e y la CR-V; guardián **`precondicionPropia`**).
    En la siguiente (43473084085: barajada 160/160, punta a punta 160/160, «dos veces seguidas» 160 y 159) tra4w, en la segunda vuelta, elegía la
    salida de un servicio que él mismo quitó al empezar: elige la que la herramienta muestra (guardián **`salidaComoLaPagina`**).
  - **Ayuda:** `admin-configuracion` (topes entre todos los servidores; meses de la analítica), `admin-analitica` y `admin-contenido` (cifras cada 10 minutos).
- **Medido (escala 1, flujo «Carga 1M»; p95 salvo lo que dice otra unidad):** 58/63 y 57/63 dentro del presupuesto en dos corridas iguales sobre el mismo
  código (la segunda con un `checkpoint` después de generar). Lo que falla en las dos: la Tabla y «mi lugar» (→ 9m) y el p95 de las posiciones durante el
  ritmo (→ 9t). Lo que falla en una: votar (cola), la búsqueda por nombre de la puerta (→ 9n), subir 500 escaneos (→ 9r) y el barrido de la Comunidad (→ 9m):
  son de una sola vuelta o están en el borde, y el runner comparte disco y CPU con la base (LAUNCH «Fase 9 · 9b-3»).
  | medida | línea | presupuesto | carga 43457199398 | carga 43460154153 |
  |---|---|---|---|---|
  | muro-top | L578 | 50 ms | ✓ 6 ms | ✓ 8,1 ms |
  | muro-nuevo | L578 | 50 ms | ✓ 6,3 ms | ✓ 5,6 ms |
  | muro-pagina-6 | L578 | 50 ms | ✓ 3,9 ms | ✓ 3,6 ms |
  | muro-5-millas | L578 | 50 ms | ✓ 6,7 ms | ✓ 6,6 ms |
  | muro-siguiendo | L603 | 50 ms | ✓ 37,1 ms | ✓ 5 ms |
  | hilo-500 | L588 | 60 ms | ✓ 4,3 ms | ✓ 3,8 ms |
  | votar | L588 | 30 ms | ✗ 60,1 ms | ✓ 14,3 ms |
  | encuesta-100k | L590 | — | ✓ 6941,1 ms | ✓ 4138 ms |
  | mensajes | L603 | 50 ms | ✓ 2,7 ms | ✓ 6,4 ms |
  | seguidores | L603 | 50 ms | ✓ 3,1 ms | ✓ 2,8 ms |
  | siguiendo | L603 | 50 ms | ✓ 2,9 ms | ✓ 2,7 ms |
  | auto-ocultar | L627 | 30 ms | ✓ 1 ms | ✓ 2,5 ms |
  | revisar-al-escribir | L627 | 50 ms | ✓ 0,7 ms | ✓ 0,8 ms |
  | red-de-cuentas | L627 | 5000 ms | ✓ 1,5 ms | ✓ 1,8 ms |
  | barrido-comunidad | L631 | 10000 ms | ✓ 8552,3 ms | ✗ 10751,5 ms |
  | hoy | L631 | 40 ms | ✓ 15,6 ms | ✓ 16,8 ms |
  | recomendados | L631 | 50 ms | ✓ 14,3 ms | ✓ 13,5 ms |
  | tabla | L648 | 40 ms | ✗ 89,3 ms | ✗ 84,7 ms |
  | tabla-corta | L648 | 40 ms | ✗ 85,8 ms | ✗ 86,3 ms |
  | cupones | L665 | 50 ms | ✓ 9,6 ms | ✓ 10 ms |
  | mis-canjes | L665 | 50 ms | ✓ 0,5 ms | ✓ 0,6 ms |
  | en-circulacion | L665 | 300 ms | ✓ 224,1 ms | ✓ 202,8 ms |
  | contenido | L701 | 80 ms | ✓ 75,4 ms | ✓ 76,6 ms |
  | contenido-totales | L701 | 10000 ms | ✓ 1253,3 ms | ✓ 1283,9 ms |
  | contenido-reportados | L701 | 80 ms | ✓ 60,3 ms | ✓ 75,7 ms |
  | contenido-p2 | L701 | 80 ms | ✓ 76,2 ms | ✓ 71,4 ms |
  | analitica-comunidad-al-dia | L701 | 10000 ms | ✓ 1031,3 ms | ✓ 2260 ms |
  | analitica-comunidad | L701 | 300 ms | ✓ 2,4 ms | ✓ 1,8 ms |
  | resumen-diario | L701 | 30000 ms | ✓ 2,2 ms | ✓ 1,4 ms |
  | usuarios-p1 | L193 | 80 ms | ✓ 50 ms | ✓ 48 ms |
  | usuarios-p100 | L193 | 80 ms | ✓ 48,8 ms | ✓ 55,8 ms |
  | categoria-p1 | L76 | 50 ms | ✓ 33,4 ms | ✓ 30,6 ms |
  | categoria-p50 | L76 | 50 ms | ✓ 34,6 ms | ✓ 32,9 ms |
  | eventos-lista | L747 | 50 ms | ✓ 11,4 ms | ✓ 13,4 ms |
  | eventos-lista-p6 | L747 | 50 ms | ✓ 5,3 ms | ✓ 5,3 ms |
  | eventos-finde | L851 | 50 ms | ✓ 13,7 ms | ✓ 14,9 ms |
  | evento-ficha | L747 | 40 ms | ✓ 2,2 ms | ✓ 2,3 ms |
  | puerta-escanear | L869 | 150 ms | ✓ 5,6 ms | ✓ 8 ms |
  | puerta-buscar-nombre | L869 | 150 ms | ✓ 131 ms | ✗ 159,9 ms |
  | paquete | L898 | 1000 ms | ✓ 251,9 ms | ✓ 239,4 ms |
  | paquete-tamano | L898 | 1024 KB | ✓ 165 KB | ✓ 165 KB |
  | paquete-50k | L898 | — | ✓ 1232,4 ms | ✓ 1209,8 ms |
  | subir-500 | L898 | 2000 ms | ✓ 1348,7 ms | ✗ 2217,1 ms |
  | avisar | L1210 | 30 ms | ✓ 1,5 ms | ✓ 1,8 ms |
  | mis-avisos | L1210 | 50 ms | ✓ 0,5 ms | ✓ 0,6 ms |
  | posicion | L1260 | 30 ms | ✓ 3,9 ms | ✓ 3,6 ms |
  | posiciones-por-segundo | L1260 | — | ✓ 189 por segundo | ✓ 200 por segundo |
  | posiciones-p95-en-ritmo | L1260 | 30 ms | ✗ 2860,4 ms | ✗ 673,2 ms |
  | posiciones-que-faltaron | L1260 | 10 por segundo de menos | ✗ 11 por segundo de menos | ✓ 0 por segundo de menos |
  | ayuda-buscar | 7d | 30 ms | ✓ 4,9 ms | ✓ 5,1 ms |
  | compa-contexto | 7c | 50 ms | ✓ 1 ms | ✓ 0,9 ms |
  | compa-conversaciones | 7i | 80 ms | ✓ 15,7 ms | ✓ 15,2 ms |
  | compa-ficha | 7i | 80 ms | ✓ 22,3 ms | ✓ 7,1 ms |
  | particiones | L207 | — | ✓ 17 particiones | ✓ 17 particiones |
  | embudo-30d | L207 | 300 ms | ✓ 217,2 ms | ✓ 261,7 ms |
  | embudo-7d | L207 | 300 ms | ✓ 51,9 ms | ✓ 64,9 ms |
  | analitica-gente | L207 | 300 ms | ✓ 71,6 ms | ✓ 65 ms |
  | analitica-apps | L207 | 300 ms | ✓ 50,8 ms | ✓ 56,9 ms |
  | al-dia | L207 | 5000 ms | ✓ 55,7 ms | ✓ 57,8 ms |
  | retencion | L207 | 30000 ms | ✓ 542,5 ms | ✓ 567,2 ms |
  | resumen-dia | L207 | — | ✓ 661 filas | ✓ 630 filas |
- **Tercera confirmación (14 nov, corrida 43537190801 sobre cc448a5):** «dos veces seguidas» siguió; «barajada» dio 6 rojos y «todas las fases» 1, cuatro clases:
  - **La tarjeta de Marisol se daba por hecha:** fie4v, est4d (y por `requiere` res4z, res4g, ana4z) corrieron antes que cit3e en una base nueva; sin
    tarjeta, «Enviar solicitud» / «Aprobar» no se encendía. Ahora fie4v, est4d, tra4y, tra4y2, noc4c y barr la guardan (`tarjeta()` de
    negocio-nuevo.cjs). Guardián `tarjetaPropia`.
  - **El tope de mensajes de El Compa por persona (20 por hora):** compa7c se lo dejaba lleno a Marisol y la hoja de ayuda de ayu4g/ayu4z contestaba
    «llegaste al límite». `sinTopeDeAyuda()` corre también sus mensajes de El Compa.
  - **Lo que hacía otra prueba:** adm4s necesitaba el apartado con envío de env4q (ahora `requiere`); adm4ig, la membresía de Yesenia en la
    vivienda para mayores que le daba inm4ib (ahora la crea ella). Esta clase la caza la carrera «barajada» misma.
  - **Una espera que no esperaba:** cit3c tocaba «Llegó · en atención» y esperaba /en atención/, que el botón ya cumplía; ahora espera la base.
    Guardián `esperaQueEspera` (también «No llegó» → /no llegó/).
  - **Las capturas de los teléfonos fallaban de noche (corrida 43549458698):** la ficha y el panel de Sabor Dominicano se aprobaron abiertos; a las
    10 PM de Hazleton salían «Cerrado · abre mañana» y lo de abajo se corría (2–6 % distinto). No era 9c. `correr.mjs` deja abiertos hoy los
    negocios de `pantallas.json` «abiertos» mientras captura y devuelve el horario al final. Guardián `capturaSinHora`. La hora de cerrar es de un dígito, como la aprobada: «hasta 11:59 PM» ocupaba otra línea en el Galaxy.
  - **Cuarta confirmación (corrida 43549458698, con 9c):** 15 rojos cayeron en una línea: `sinTopeDeAyuda` corría `compa_messages` (solo inserción)
    sin el modo réplica → ahora como compa7c; guardián `libroEnAyudantes`. Además: com5b tocaba el «Responder» de un comentario (9c lo volvió
    botón con ese nombre) en vez del de enviar; a11y9c (primera corrida) miraba los días antes de elegir cuántos son; compa7h y su tope de El Compa;
    adm4eg pedía la matrícula de ins4e después de mirar la pestaña. noc4c y env4q (dentro de requiere) cayeron por tiempo: ahora dicen qué muestra
    la página, y `requiere` imprime lo que dice algo (✓, error, adónde llegó) en vez de la cola del registro de Playwright.
  - **Quinta confirmación (corrida 43556167290, de noche en Hazleton):** un bug de la app: **un negocio abierto las 24 horas dejaba de tomar
    pedidos a las 11:30 PM** (lib/pedir.ts contaba el «último pedido» desde la medianoche); arreglado, guardián `veinticuatroHoras`, y las pruebas
    escriben un día entero como 00:00–00:00 (no 00:00–23:59). Además: evt6b-6c espera a que pase la medianoche si faltan <15 min
    (`lejosDeMedianoche`); merc4p abre el mercado mientras corre (`abiertoTodoElDia`); rev2g, res4s y tx4g piden con `requiere` lo que dejan
    pedidos2c, merc4p, renta4f, plan4f y apt4f; fic4d pone la matrícula del curso; evt6g usa un teléfono libre; a11y9c toca el boleto visible.
  - **Sexta confirmación (corrida 43563245945):** «todas las fases» y «dos veces seguidas» solo con a11y9c (en el paso 2 de Publica tocaba el «−» de
    una pregunta de número, que en el mínimo no hace nada; ahora el «+»). Barajada: adm4ig ahora crea la membresía de Luis en la despensa (antes se
    la daba fe4ia) y retira sus licencias de prueba aunque se caiga a la mitad (si no, autos4ic e inm4ib, y por requiere vis4ie, compa7d y fic4id,
    no veían «sin verificar»); nov2g vuelve a poner en vivo su oferta de la semilla (a11y9c la paraba).
  - Al revés: alreves9b3 27/27. La confirmación nueva corre sobre la punta con 9c (una sola corrida para los dos).
- **No cerrado o con destino:** ver LAUNCH «→ 9b» (lo que queda), «Fase 9 · 9b-3» y las líneas movidas a 9c, 9g, 9j, 9l, 9m, 9n, 9o, 9q, 9r y 9t con su porqué.

## Fase 9 · 9c — accesibilidad WCAG AA del sistema de diseño (14 nov)
- **Hecho:**
  - **Los 190 clics mudos del sistema de diseño** (`<div>` y `<span>` con `onClick` y nada más, en 38 módulos de `packages/ui/src/ds`: AdminBar 23, Thread 16,
    SiteHeader 17, Patio 11, DeliveryPrefs 10, OnbTopBar 10, CompaFrame 10, MenuItemRow 8…) tienen ahora rol, foco, Enter / Espacio y nombre. No se hicieron 190
    parches a mano: un solo **motor** en `scripts/portar-sistema.mjs` (`accesibilizar`, con la tabla `A11Y` del tipo de cada clic) recorre cada módulo y, con
    `__ds_scope.__btn(clic, nombre, extra, dentro)` (definido en el `scope.js` que genera el mismo script), le agrega `role="button"`, `tabIndex`, `onKeyDown`
    (solo con el foco en el propio elemento) y, si no hay texto que lo nombre, `aria-label` en un prop nuevo con valor por defecto ES/EN. **Se ve igual**: ni un estilo
    ni la estructura cambian. Decisión L: lo mismo se produce al volver a portar (`sistemaSincronizado` lo comprueba).
    - Tipos de la tabla: botón (el texto lo nombra) · botón con nombre en un prop · decorativo (fondos de hojas, zonas de toque repetidas: `role="presentation"` +
      `aria-hidden`) · envoltura que solo detiene el clic · **contenedor clicable con controles de verdad dentro** (tarjeta de negocio, fila y tarjeta del plato con su «+»,
      el buscador con su ciudad, el negocio recomendado de Comunidad): no puede ser un botón (axe: «interactivo anidado»), así que el teclado entra por el nombre
      (un `<span role="button">` dentro) y el clic del ratón sigue subiendo al contenedor · solo foco y teclado para lo que ya trae su rol (tab, option, el − y + del plato)
      · interruptor · casilla.
    - **QtyStepper y el «+» del menú:** «Uno menos» / «Uno más», «Quitar», «Agregar» y «Cantidad: N» eran texto fijo en español: ahora son props con ES/EN
      (`decLabel`, `incLabel`, `removeLabel`, `addLabel`, `qtyLabel`); las cinco pantallas que los usan pasan el idioma.
    - **AuthSheet:** región `role="alert"` siempre presente (vacía y sin altura mientras no hay error), campos con nombre, `aria-invalid` y `aria-describedby`.
  - **Las pantallas también** (`apps/web`): 147 `<div>/<span>` con `onClick` (con `role="button"` o `role="link"` pero sin foco ni teclado, o sin rol) usan `{...tec(clic)}`
    (`apps/web/lib/tec.ts`: foco, Enter y Espacio). Los 18 `role="button"` de `packages/ui/src/panel/Bloques.tsx` también.
  - **Foco visible global** (`apps/web/app/globals.css`): contorno de 2 px en el morado de marca con `:focus-visible` (solo teclado) en todo lo enfocable; `!important`
    porque muchos controles traen `outline: none` en su estilo en línea.
- **Guardianes:** `sistemaClicMudo` en **0** (antes tope 190; ya no es un trinquete: cualquier `<div>/<span>` con `onClick` sin `__btn` / `__key` / rol con `tabIndex` /
  `role="presentation"` falla) · `panelClicMudo` en **0** (antes 18) · nuevo **`clicConTeclado`** (lo mismo para las pantallas de `apps/web`). `botonAccesible` (Button e
  IconButton con rol, foco, teclado y nombre) sigue en verde.
- **Prueba nueva (punta a punta): `a11y9c`** — solo con el teclado (cada paso es «llevar el foco al control y apretar Enter o Espacio»; falla si el control no se
  puede enfocar, no está en el orden de Tab o no tiene nombre): pedir (agregar un plato, abrir el pedido, «Ir a pagar», «Enviar pedido»), reservar una mesa (cuántos, día,
  hora, ocasión, enviar), comprar un boleto («Uno más» con Espacio, Continuar, Pagar), publicar un negocio (el asistente de `/publica` entero, hasta «PUBLICADA») y entrar al
  Super Admin y moverse por su menú; además Tab a Tab (cada elemento con foco se ve, el foco avanza y no se atrapa), ningún control con rol fuera del orden de
  tabulación, y el árbol de accesibilidad de Playwright (`ariaSnapshot`: «VoiceOver simulado») trae «Agregar», «Uno más», «Uno menos», los radios de día y hora, la
  campana y la cuenta del Super Admin con su nombre. Informa (sin fallar) cuántos controles miden menos de 44 px. **No se corrió en local** (la sesión no tenía Docker):
  la primera corrida es la del CI.
- **Ayuda:** `docs/ayuda/accesibilidad.md` (vecino, ES/EN; también es el texto de la página de Accesibilidad de 9e).
- **Probado aquí:** `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `pnpm --filter web build` en verde; re-portar produce el mismo árbol (`sistemaSincronizado`).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9c»):** contraste de texto AA y objetivos de 44 px (cambian las capturas aprobadas: necesitan tu OK), nombres EN de los íconos
  sin texto en las pantallas que no pasan `lang`, hojas sin trampa de foco ni Escape, flechas entre pestañas, el foco sobre fondos oscuros.

## Fase 9 · 9d — tus datos: exportar, borrar a los 30 días, retener y fusionar cuentas (14 nov)
- **Hecho (rama local `fase9-9d`, sobre e462364):**
  - **Un solo mapa** `packages/db/mapa-de-datos.json` → `node scripts/datos/mapa.mjs` → semilla repetible `packages/db/seeds/mapa_datos.sql` → tabla **`data_map`**
    (278 filas: por tabla y columna, persona / equipo / teléfono; borrar, vaciar, seudonimizar o guardar con su porqué; el archivo donde se exporta; si se mueve al
    fusionar). Lo que la purga escribe sale de una lista cerrada de valores (el generador y `lib/datos/mapa.ts` lo revisan). `sinPersona` para las tablas personales
    sin columna de persona (registro técnico de Soporte, errores).
  - **Migración `0134_mis_datos.sql`:** `data_map`; `data_exports` (uno vivo por persona y negocio, sin borrar: vence; un uso en la base); `purge_runs` y `purge_items`
    (solo inserción); `account_merges` (solo inserción, `approved_by <> requested_by`); `users.phone` vacío solo en una cuenta `deleted`/`merged`; los textos mínimos
    (reseña, publicación, comentario, mensaje, calle) admiten el vacío solo en su estado de quitado; `otp_codes` propósito `data_export`; `account_changes` «export»;
    `dm_messages_antes` con la purga (`tl.purga`); `ticket_scans.purged_at` y `escaneos_retener()` (`tl.retencion`); `datos_vaciar_derivados()` (el último mensaje
    de una conversación lo vacía la base); `datos_purga_pendiente(cuenta, teléfono)`; Configuración › **Retención** (`export_cada_dias` 7, `export_vence_h` 24,
    `purga_lote` 1000, `retener_escaneos_meses` 13, `retener_doc_reclamo_dias` 90, `retener_sesiones_dias` 400, `retener_busquedas_dias` 90,
    `retener_codigos_dias` 7); plantillas `datos_export_listo`, `datos_export_negocio`, `cuenta_borrada`. Aplicada dos veces en local (la segunda no cambia nada).
  - **Servidor (`apps/web/lib/datos/`):** `mapa.ts` (lee `data_map`), `exportar.ts` (el ZIP JSON + CSV + LEEME ES/EN por el mapa, solo sus filas y sin columnas de
    otra persona; el del negocio con lo que el panel muestra; el barrido lo arma al almacén privado `privado/exportes/`; bajar = POST, una vez, 24 h, 404 a otra
    cuenta), `purgar.ts` (D5 por el mapa en una transacción por cuenta: fotos fuera de Garage, `soporte_purgar_casos` y `compa_purgar_conversaciones` de 7i,
    negocios sin otro dueño quedan sin dueño y su Pro termina, traducciones derivadas, avisos por push sin texto, la cuenta al final con teléfono vacío y «Cuenta
    borrada»; comprueba con `datos_purga_pendiente` y anota `purge_runs`/`purge_items`), `retener.ts` (las cinco retenciones nuevas), `fusionar.ts` (por el mapa,
    sin chocar con lo que la otra cuenta ya tiene), `terminos.ts`, `admin.ts`. En el barrido: `datosPurga`, `datosArchivos`, `datosArchivosVencer`, `retenciones`.
    `abrirSesionEn`: pasada la fecha ya no entra (y entrar ya no cancela un borrado vencido).
  - **Pantallas:** Mi cuenta › Ajustes › Privacidad › **Descargar mis datos** (`/cuenta/ajustes/privacidad/datos`, USR-DATOS) y **Términos que aceptaste**
    (`/terminos`, USR-TERMINOS); Panel › Más › **Exportar los datos del negocio** (`/panel/{id}/exportar`, solo el dueño); Super Admin › Usuarios 360° ›
    **Privacidad** (sus archivos, «Exportar sus datos» = el mismo ZIP, borrado y su purga tabla por tabla, Ver como de solo lectura con motivo auditado antes, términos,
    avisos que recibe, **Fusionar** con dos personas por Cambios sensibles `mergeUser`); Colas › Cambios sensibles aplica la fusión; Sistema › Configuración ›
    **Retención** (las claves nuevas y las que ya corrían en su sección). Todo compuesto con piezas existentes (REVISION 9d).
  - **Guardianes:** **`mapaDeDatos`** (reemplaza y amplía `privacidadCoherente`: toda columna `references users` de las migraciones —también varias por línea y las
    de un `add column`— está en el mapa; toda tabla del inventario también; tablas y columnas existen; semilla al día), **`purgaCompleta`** (estático + la prueba),
    **`exportaSoloLoSuyo`**, **`enlaceUnUsoSinGet`**, **`retencionQueCorre`** ampliado (`retener_*` corre en el barrido y tiene su prueba con el reloj movido),
    `barridoCompleto` mira también `lib/datos/`. Al revés: **`alreves9d` 23/23**; `alreves8i` (49/49) y `alreves7i` (35/35) al día.
  - **Semilla del sandbox `0052_mis_datos.sql`** (el plan decía 0049): Borra Mañana (borra en 1 día), Borra Ayer (31 días: el barrido la purga), Datos Listos (archivo
    pedido), Datos Vencidos (archivo vencido).
  - **Ayuda:** `descargar-mis-datos` (vecino), `panel-exportar-los-datos` (negocio; cada artículo es de una sola audiencia), `borrar-mi-cuenta` (nuevo, lo que pasa
    exactamente a los 30 días) y `admin-privacidad` (equipo). Las cuatro pasan `ayudaConForma` y el indexador.
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina, un S3 de mentira en lugar de Garage, Chrome del sistema, perfil `basico`):**
  `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `pnpm build` en verde; la purga corrida sobre las 307 cuentas de la semilla → 307/307 completas;
  **`datos9d` 61 ✓ dos veces seguidas** (pedir con el código, el barrido lo arma, GET 303 sin gastarlo, otra cuenta 404, bajar una vez → 410, vence, el del negocio
  sin teléfonos ni direcciones, +30 días → `datos_purga_pendiente` en 0 y cada tabla, «Cuenta borrada» en el panel, el mismo teléfono = cuenta nueva, las cinco
  retenciones con el reloj movido, fusionar con una persona → no y con otra → sí); `usr1l`, `cuenta2h` y `adm7i` (117 ✓) siguen en verde. **No se corrió la
  regresión entera** ni la matriz de 9 dispositivos: eso es del CI (LAUNCH «Fase 9 · 9d»).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9d»):** el aviso `cuenta_borrada` y la retención de `phone_messages` (9l), Términos de uso con versión y /privacidad
  desde el mapa (9e), «Cuenta borrada» en inglés (9f), pedir el archivo con la llave de acceso y el tope de 20 000 filas por parte (9m), la corrida del CI (9b).

## Fase 9 · 9e — legales por estado, aceptar los términos nuevos y la web legal (14 nov)
- **Hecho (rama local `fase9-9e`, sobre b5ff90a):**
  - **El repo es la fuente**, como la ayuda: `docs/legal/{us,us-pa}/{clave}.{es,en}.md` (14 páginas: las 11 generales y las adendas de PA de Términos, Privacidad
    y Vivienda justa), BORRADOR de Claude, sobrios, sacados de lo que el producto hace (el inventario, el mapa de datos, las cookies reales, las reglas de la
    Comunidad, la ayuda), con cada hueco del abogado marcado «[pendiente: …]». Forma única en `scripts/legal/forma.mjs` (título, metadatos con el estado del
    texto, resumen, «Lo que cambió» de 1 a 3 puntos, secciones; ES y EN con las mismas secciones; solo enlaces internos).
  - **Migración `0135_legal.sql`:** `legal_pages` (una fila por versión con los dos idiomas: título, resumen, cuerpo, lo que cambió, sha256, de dónde sale;
    borrador → revisado con `reviewed_by_counsel` → publicado con quién, cuándo, motivo, `effective_at` y `force_accept` (solo Términos y Privacidad) →
    retirado; el texto de una versión nunca cambia; nada se borra); `legal_page_log` y `legal_acceptances` (solo inserción; una vez por persona, negocio y
    versión; solo se acepta lo publicado, o en el sandbox lo que se ve); `users.legal_state`; `legal_indexar` / `legal_retirar` / `legal_vigente` /
    `legal_entorno` (falla cerrada: sin la fila «entorno = pruebas» de la semilla 0053, la base es producción y no publica sin el abogado). Aplicada dos
    veces (migrar.sh y el archivo a mano otra vez): la segunda no cambia nada.
  - **Servidor:** `scripts/legal/indexar.mjs` (sha256 de los dos idiomas; lo mismo otra vez = «iguales»; un cambio = versión nueva en borrador; lo que ya no
    está y no se publicó = retirado; nunca publica) en `deploy.sh` (3c-ter, después de la ayuda; si falla, la app sigue), `pruebas/servir/base.sh` y un paso
    del CI (dos veces, y sin la semilla del sandbox publicar sin revisión → `legal_revisado`). `lib/legal.ts`: `paginaPara(persona, clave)` (la general y la
    adenda del estado), `aceptar` / `aceptarEn` (la versión vigente; con la hoja, solo la que se vio), `faltaAceptar`, `sinAceptarVigente` y lo del Super
    Admin (`paginasAdmin`, `versionesAdmin`, `diferencias`, `marcarRevisada`, `publicarLegal` —en producción solo revisada, aquí y en la base—, `retirarLegal`;
    libro y auditoría en la misma transacción). El mapa de datos suma `legal_acceptances` (se guarda por ley; archivo `terminos_aceptados`), `legal_pages`,
    `legal_page_log` (equipo) y `users.legal_state` (se vacía al purgar).
  - **Pantallas:** las once rutas públicas (`app/(app)/{clave}/page.tsx` → `_legal/PaginaLegal.tsx`, plantilla «To'Latino Página»: rótulo, título, resumen,
    versión y vigencia o BORRADOR, una tarjeta por sección, la adenda de PA, «Más en …», «¿No encontraste lo que buscas?» y el pie `SiteFooter` con todas);
    `/privacidad` con su texto de docs/legal y debajo los datos del inventario y «Qué pasa con cada dato al borrar tu cuenta» (`privacidadDelMapa`). La hoja
    «Aceptar los términos nuevos» (`HojaTerminos`, hueco #5) en Inicio y en Hoy del panel. Pagar dice «Al enviar el pedido aceptas…» en el primer pedido y lo
    anota; Publica tu negocio lo dice en el último paso y lo anota en su transacción (con el negocio). «Términos que aceptaste» (9d) suma `legal_acceptances`.
    Super Admin › Textos y páginas › **Páginas** (`/admin/textos/paginas`). Todo compuesto con piezas existentes (REVISION 9e).
  - **Guardianes:** **`legalRevisado`** (la base no publica sin revisión fuera del sandbox; `legal_entorno` falla cerrada; la fila «entorno» solo la escribe la
    semilla del sandbox; `publicarLegal` no publica sin revisión en producción; el indexador nunca publica; con TOLATINO_FASE=9 un BORRADOR en docs/legal
    rompe el build, antes solo avisa), **`legalUnaFuente`** (forma y pares ES/EN; cada clave con su página y su ruta que pinta `<PaginaLegal>`; ningún .ts/.tsx
    copia 16 palabras seguidas de un texto legal), `libroSoloInsercion` (aceptaciones y libro de solo inserción, una vez por versión, solo `lib/legal.ts` las
    escribe), `idioma` (cada página legal en los dos idiomas con las mismas secciones). Al revés: **`alreves9e` 18/18**; `alreves8i` y `alreves9d` siguen en verde.
  - **Prueba nueva `leg9e`** (72 ✓): las once páginas sin sesión en ES y EN, la adenda de PA, el pie con las once, /privacidad con el inventario y el mapa; el
    primer pedido y Publica tu negocio anotan; una versión nueva publicada desde el Super Admin con «pide aceptar otra vez» → la hoja en Inicio (no encima del
    pedido abierto, que sigue igual), «Acepto» anotado una vez (la fila repetida la rechaza la base; una aceptación no se cambia), «Términos que aceptaste»,
    aceptaciones solo en cifras; en modo producción simulado publicar sin revisión → rechazado (pantalla y base), con la revisión del abogado → publicado;
    retirar. Lo que publica lo retira al terminar. `fich8i` al día con la /privacidad nueva.
  - **Ayuda:** `terminos-y-privacidad` (vecino), `panel-terminos-y-privacidad` (negocio; cada artículo es de una audiencia) y `admin-paginas-legales` (equipo).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina, un S3 de mentira, Chrome del sistema, perfil `basico`, en :3110):** `node guardianes/run.mjs` →
  «sin fallos»; `tsc --noEmit` limpio; `pnpm build` en verde; 0135 dos veces sin cambios; el indexador dos veces («14 nuevas» y luego «14 iguales»);
  **`leg9e` 72 ✓ dos veces seguidas** en la misma base; `alreves9e` 18/18; `datos9d` 61 ✓; `alreves8i` 49 ✓ y `alreves9d` 23/23. `fich8i` no corre entera en
  local (pide los simuladores de las tiendas y los documentos de Google): su paso 1 (/privacidad) se comprobó aparte con las mismas aserciones (8 ✓).
  **No se corrió la regresión entera** ni la matriz de 9 dispositivos: eso es del CI (LAUNCH «Fase 9 · 9e»).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9e»):** el texto final de las 14 páginas y el agente DMCA (9s, el abogado), dónde más se anota la aceptación (9s),
  el pie en todas las páginas y Páginas en inglés (9f), la corrida del CI (9b) y el índice legal en producción (9t).

## Fase 9 · 9f — Textos y páginas completo: cadenas, rótulos, Home por ciudad y anuncios (14 nov)
- **Hecho (rama local `fase9-9f`, sobre 0f36d89; en subbloques):**
  - **9f-1 · Datos y servidor.** Migración **`0136_cms.sql`**: `cms_strings` (la 0001 dejó una de otra forma, vacía y sin uso: se renombra a `cms_strings_0001`, no se borra) con la
    llave `ÁREA-MÓDULO-PANTALLA.clave`, `text {es,en}`, `code_text` (lo que dice el código), `status` (vivo / borrador), `en_state` (pendiente / traducido / revisado), `max_len`, `locked`,
    `edited`, `version`; **`cms_string_versions`** (solo inserción; la escribe la propia base con quién y por qué: `tl.cms_por` / `tl.cms_motivo`, sin ellos `cms_sin_autor`); la base impone
    el **largo** (`cms_largo`), las **marcas {x}** del código (`cms_marcas`), el **no vacío** (`cms_vacia`), la **línea fija** (`cms_linea_fija`: solo la cambia `cms_indexar`, el
    despliegue) y que lo que dice el código solo lo cambie un despliegue (`cms_codigo`); **`city_home_config`** (aviso ES/EN y bloques encendidos con su orden) y **`announcements`**
    (desde/hasta, 31 días como máximo, para todos o solo vecinos; no se edita ni se borra: se retira con motivo); el interruptor `web.pie_todas` (apagado). Cada cambio avisa por
    NOTIFY (canal `tl_config`). Aplicada dos veces: la segunda no cambia nada. Mapa de datos al día (4 tablas, 287 filas).
    **Extractor** `scripts/cms/extraer.mjs` → `apps/web/lib/cms-cadenas.json` (214 cadenas: `T`, el texto del Inicio `lib/textos-home.ts`, las líneas fijas de §1c `lib/textos-fijas.ts`, el
    nombre de la cuenta borrada `lib/textos-cuenta.ts` y la línea fija de cada categoría de `packages/db/seeds/lineas.sql`; 22 con candado) e **indexador** `scripts/cms/indexar.mjs`
    (deploy.sh 3c-quater, `pruebas/servir/base.sh` y un paso del CI; lo mismo otra vez = «213 iguales»; lo editado se respeta salvo que ya no quepa). **`lib/cms.ts`**: la base primero y el código
    de respaldo (copia de 15 s que NOTIFY vacía; si la base no responde, sale el código); `cadena()`, `pantalla()` y `textosT()` (T con lo editado). **Semilla `0054_cms.sql`** (el plan decía 0050):
    un anuncio vivo (Allentown, así el Inicio de Hazleton de las capturas no cambia) y uno vencido (Hazleton).
    **El Inicio de la ciudad** lee el CMS: aviso, bloques (un bloque apagado ni se consulta; el orden por `order` de CSS) y el banner de Anuncios (InfoCard); sus textos ya no van escritos en
    `Inicio.tsx`. Las páginas del servidor (layout, ficha, silla, galería, categoría, Negocios) leen `textosT()`.
  - **9f-2 · Super Admin › Textos y páginas** con cinco pestañas: Ayuda, Páginas, **Cadenas** (buscar, pantalla, estado, ES/EN lado a lado, largo máximo, editar con motivo, volver al código, borrador /
    publicar, inglés revisado con `cms:aprobar`, historial, candado en las líneas fijas), **Rótulos por categoría** (nombre y nombre corto en los dos idiomas; el corto en español es la URL y no se
    cambia) y **Home por ciudad** (aviso, interruptores y Subir / Bajar, anuncios con fechas, retirar). **La sección entera sale en español e inglés** (selector Español / English, cookie `tl_lang`):
    cierra «Páginas en inglés» de 9e. **«Cuenta borrada» / «Deleted account»** en el panel de Pedidos (`nombreVisible`). **El pie de la web** bajo el Inicio, la ficha y Buscar detrás de `web.pie_todas`
    (apagado de fábrica: Páginas lo enciende con motivo).
  - **Guardianes:** **`cadenaConLlave`** (catálogo = lo que sale del código, llaves que existen, pantallas migradas sin `E2` a mano, el servidor lee `textosT`, el Inicio lee el CMS; trinquete de `E2` como aviso
    hasta TOLATINO_FASE=9), **`lineaFijaBloqueada`** (las seis de §1c palabra por palabra contra el plan, 911 y «Nadie te garantiza un resultado» con candado, la base y la app las rechazan, solo `cms_indexar`
    pone `tl.cms_indexar`), **`cmsConLimite`**, **`cmsSoloInsercion`**, **`cuentaBorradaBilingue`**, **`pieSinCapturas`**; `idioma` suma que toda cadena trae los dos idiomas. Al revés: **`alreves9f` 30/30**.
  - **Prueba nueva `cms9f`** (91 ✓): editar una cadena → el vecino sin sesión la ve al instante en ES y en EN (y en el teléfono), con su versión (motivo y quién) y su auditoría; sin la tabla de cadenas la
    pantalla sale con el texto del código; borrador / publicar / volver al código; historial; líneas fijas sin Editar y rechazadas por la base; marcas, largo, vacío y autor; inglés revisado; Rótulos; Home de
    Hazleton (aviso ES/EN, un bloque apagado, el orden) y de Allentown (con un bloque apagado, el de Hazleton sin tocar); anuncios (vivo, próximo, vencido, retirado, solo vecinos, no se edita ni se borra, más de
    31 días rechazado); el Super Admin en inglés en las cinco pestañas y de vuelta; el rol sin Textos y páginas no entra; el pie apagado / encendido en Inicio, ficha y Buscar; «Cuenta borrada» / «Deleted account».
  - **Ayuda:** `admin-textos-y-paginas` (equipo, ES/EN).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina, un S3 de mentira, Chrome del sistema, perfil `basico`, en :3110):** `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `pnpm build`
  en verde; 0136 dos veces sin cambios; el indexador dos veces (213 nuevas y luego 0); **`cms9f` 91 ✓ dos veces seguidas**; `alreves9f` 30/30. **No se corrió la regresión entera** ni la matriz de 9 dispositivos
  (CI), ni `pruebas/visual` (las capturas aprobadas no se tocaron a propósito: el pie nace apagado y el anuncio vivo de la semilla está en Allentown).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9f»):** más cadenas por el CMS (~16 000 `E2` a mano), el resto del Super Admin en inglés, la ayuda (inglés ampliado y editor de cambios propuestos), «Cuenta borrada» en los
  demás paneles, anuncios para negocios, encender el pie (necesita tu OK con las capturas), las líneas fijas que esperan su pantalla y las corridas del CI.


## Fase 9 · 9g — Analítica completa, base de análisis y el reporte diario al fundador (14 nov)
- **Hecho (rama del worktree, sobre `fase9-9f` 9067e89; las tres correcciones del sandbox de `main` —3cc3599, 425b58a, 1a64dd5— no están en esta rama: se juntan al integrar):**
  - **Migración `0137_analitica.sql`:** derivados que escribe SOLO el barrido (trigger `derivado_no_editable` con la marca `tl.metricas_barrido`, que solo `metricas_resumir` enciende y
    apaga): **`metricas_dinero_dia`** (por ciudad, día local y tipo de operación: operaciones cobradas, bruto, comisión, devoluciones, devuelto, citas cerradas y «no llegó»),
    **`metricas_pro_dia`** (pruebas que empiezan, con tarjeta, que terminan, primeros cobros, cobrado, a Free y la foto del día: MRR, Pro pagando, en prueba) y **`metricas_retencion`**
    (cohortes semanales por ciudad, D1/D7/D30 con su base; sin personas). Las seis vistas que agregaban toda la historia en cada lectura (`evt_analitica_dia`, `evt_asistencia_dia`,
    `evt_ventas_negocio_dia`, `evp_analitica_dia`, `compa_analitica_dia`, `soporte_analitica_dia`; LAUNCH L948, L1143) pasan a tablas `*_cache` con las mismas columnas; las vistas siguen
    como definición y leen solo desde `analitica_desde()`. `metricas_al_dia()` rehace los últimos 40 días cada 10 min y la historia entera una vez al día (pasadas las 3 AM).
    `business_views_daily.unicos` + `business_view_marks` (huella con la sal del día, se suelta a los 2 días), **`scheduled_reports`** (se pausa, no se borra), **`founder_reports`**
    (solo inserción, uno por día y tipo: `diario` | `alerta`), plantillas de correo `report` y `founder_daily`, avisos `reporte_diario` y `reporte_no_salio` (sin SMS), interruptor
    `reporte.diario` (encendido) e índices de las ventanas. Probada en un Postgres 16 + PostGIS local: 0001–0137 y las semillas en una base nueva, 0137 dos veces sin cambios.
  - **Semilla `0055_analitica.sql`** (el plan decía 0051): 40 vecinos de muestra (570-555-0801…0840) con sus días de vuelta, 90 días de pedidos, visitas de Hogar y mesas cobradas en
    Hazleton con devoluciones, la historia Pro de cuatro negocios que ya se ven Pro o Free, búsquedas sin resultado y pre-estimados; al final `metricas_resumir`. Dos veces sin cambios.
  - **Servidor:** `lib/db-analisis.ts` (`DATABASE_URL_ANALISIS`, de solo lectura; sin ella, la misma base); `lib/admin-analitica.ts` lee todo por ahí y suma `dinero`,
    `retencionCohortes`, `embudos`, `busquedasSinResultado` (2 o más personas), `contactosYVistas`, `hogarAuto`, `ciudadViva`; `lib/analitica-derivados.ts` (el barrido:
    `barrerAnalitica`, y los derivados de la Comunidad que estaban en admin-analitica); `lib/reportes.ts` (programar con auditoría, `barrerReportes` a las 8:00); `lib/reporte-diario.ts`
    (7:30 AM a los Admins por correo y push con «lo que necesita de ti» de `loQueTeToca()`, alerta si a las 8:00 no salió o salió tarde, «Mándamelo ahora»; la conciliación (9k) y
    la vuelta atrás (9o) tienen su lugar y dicen que todavía no). «Llamar» en una semilla se cuenta (`registrarToqueSemilla`, L175); vistas sin repetidos (L127); Soporte lee la tabla.
  - **Super Admin › Analítica:** pestañas nuevas **Dinero**, **Hogar y Auto** y **Reportes** (programados con interruptor y frecuencia; reporte diario de 14 días, alertas y «Lo que
    necesita de ti»); Resumen con el embudo hasta «El negocio aceptó», vistas sin repetidos y semillas; Gente con retención por cohorte y los embudos del vecino y del negocio paso a
    paso; Búsquedas sin oferta con las búsquedas sin resultado. Lo nuevo y las pestañas en español e inglés. **Inicio** con «Ciudad viva».
  - **Guardianes:** `derivadoNoEditable`, `analisisPorReplica`, `reporteDiarioSale` (nuevos) y `analiticaSinPersonas` ampliado (lo nuevo y los correos). **`alreves9g` 29/29.**
    `alreves6j` y `alreves7i` al día con las tablas `_cache`.
  - **Prueba nueva `ana9g`** (cada pestaña a 390 y 1360; Dinero contra los cobros y la fórmula de la semilla; derivados no editables y tablas = vistas; retención y embudos;
    búsquedas sin resultado; «Llamar» en una semilla y vistas sin repetidos; Hogar y Auto; programar, recibir en el simulador y pausar; Solo lectura; reporte diario y «Mándamelo
    ahora»; Inicio con ciudad viva). `adm6j` y `adm7i` rehacen los derivados antes de comparar.
  - **Ayuda:** `admin-analitica` al día y **`reporte-diario`** (equipo, ES/EN).
- **Probado aquí (sin Docker):** `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `pnpm --filter web build` en verde; las funciones reales de Analítica, de los reportes y del reporte
  diario (con su alerta, adelantando la hora) contra la base local con la semilla; `alreves9g` 29/29; las al revés que tocan los archivos cambiados, en verde salvo tres casos que ya
  fallaban antes y no son de 9g y no tocan sus archivos (`alreves6d` devolverCoincide; `alreves6h` paqueteMinimo y sinConexionSinDatosAjenos; `alreves7b`, `7c`, `7g`, `8e`, `8f`: casos de
  El Compa, las apps y las tiendas cuyo texto ya no está). **`ana9g` en verde: 85 ✓ dos veces seguidas** (y antes 83 ✓ dos veces antes de las 7:30, que no prueba el reporte del día) contra
  el servidor construido (`.next/standalone`) en :3197 y la base local con las semillas, con un `docker` de mentira que manda el psql de la prueba a esa base. `an1n` y `adm7i` no
  pudieron correr en esta máquina (an1n: el Chrome sin pantalla cuenta como robot; adm7i: El Compa sin el índice de la ayuda): quedan para el CI. No se corrió `pruebas/visual`.
- **No cerrado, con destino (LAUNCH «Fase 9 · 9g»):** grabación de sesiones (→ 9s), Web Vitals propios (→ 9j), el panel con vistas sin repetidos (→ 9n), los guardianes del build en el
  reporte (→ 9j), la conciliación en el reporte (→ 9k), las vueltas atrás en el reporte (→ 9o) y las corridas del CI.

## Fase 9 · 9j — Super Admin › Sistema completo y la seguridad del equipo (14 nov)
- **Hecho (rama de trabajo del bloque, sobre d1cfe41; en paralelo con 9g, 9h y 9k):**
  - **Migración `0140_sistema.sql`** (dos veces sin cambios): `staff_mfa` (TOTP: secreto cifrado, 10 huellas de recuperación, `last_step` que solo sube; nada se borra, se
    revoca), `sessions.mfa_at / mfa_via`, `staff_mfa_log` (solo inserción), `staff_mfa_pruebas` (solo sandbox, teléfonos 570-555), `backup_runs` y `restore_drills` (solo
    inserción), `health_checks` (solo inserción, purga a 30 días con `tl.retencion = 'salud'`), `maintenance_windows` (se cancela, no se edita ni se borra), `key_rotations`
    y `break_glass` (solo inserción), `app_error_groups.kind` + `servidor`, `feature_flags.scope / scopable` con `flag_cubeta` y `flag_para` (`app.reportar` acotable),
    `founder_steps` admite 9-1 a 9-5, avisos `llave_vence` y `equipo_dos_pasos`. **Semilla `0057_sistema.sql`** (el plan decía 0054): la lista del equipo de las pruebas,
    respaldos de cada tipo (uno falló), dos restauraciones (una buena con RTO, una que falló) y un error del servidor tapado. Mapa de datos e inventario al día.
  - **Segundo factor obligatorio** (`lib/equipo/totp.ts` RFC 6238 con node:crypto, ventana ±1; `lib/equipo/dos-pasos.ts`): `staff()` devuelve null y `requerir()` manda a
    `/admin/dos-pasos` sin el segundo factor de la sesión (llave de acceso o app de códigos); el marco no pinta secciones ni colas; alta con QR una vez y 10 códigos de
    recuperación una vez; código usado no vuelve; bloqueo a los 5 intentos malos en 15 min; un Admin restablece (motivo, auditoría, aviso). Las pruebas de siempre: el
    equipo de ficción de la semilla entra marcado «pruebas» solo con el código en pantalla (imposible en producción). Sistema › Equipo dice el segundo factor de cada uno.
  - **Sistema** suma **Flags** (por ciudad y porcentaje, con motivo), **Salud** (lo que mide el barrido cada 5 min, errores 24 h, tareas con error, llaves que vencen,
    mantenimiento programado), **Respaldos** (la restauración de prueba arriba) y **Estados** (los 9), en español e inglés. **Errores del servidor** con
    `instrumentation.ts` → `recibirErrorServidor` (el mismo tapado y agrupado). **Llaves que vencen:** aviso a los Admins a 30 / 7 días y vencida; cada reemplazo en
    `key_rotations`. **Build mínimo** nunca por encima del último disponible (producción). **Lo que te toca** con los paquetes 9-1 a 9-5 (9-4.1 lo marca el sistema).
    **Vidrio roto** para las fotos de las ayudas de Salud (`/api/admin/vidrio` y Colas › «Ver con motivo»; `ayu4m` al día).
  - **Guardianes nuevos** (al final de `run.mjs`): `equipoConDosPasos`, `totpPropio`, `erroresDelServidor`, `llaveConVencimiento`, `flagPorPersona`, `vidrioRoto`,
    `minimoDisponible`; `privacidadSalud` suma `dos-pasos.ts` a los que abren un cifrado. Al revés: **`alreves9j` 32/32**, guardianes limpios después.
  - **Prueba nueva `sis9j`** (78 ✓): ver la cabecera del archivo. **Ayuda:** `admin-sistema`, `admin-segundo-factor` (ES/EN).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina, el build standalone en :3100 con perfil básico, Chromium de Playwright, un `docker exec` de mentira
  hacia esa base):** `node guardianes/run.mjs` → sin fallos; `tsc --noEmit` limpio; `pnpm build` en verde; 0140 dos veces; 0057 dos veces; **`sis9j` 78 ✓ dos veces
  seguidas**; `alreves9j` 32/32. **No corrió aquí:** `ayu4m` (necesita Garage para la foto), las demás pruebas que entran como equipo (la regresión entera en el CI) y
  la matriz de 9 dispositivos. El QR del alta no se decodificó aquí (sale del mismo generador del boleto; el secreto en texto sí se probó).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9j»):** respaldos reales y restauración semanal, despliegues, Prometheus / Uptime Kuma, la página de mantenimiento y el aviso
  24 h antes (9o); el segundo paso con la llave dentro de una sesión de SMS (9p); cambiar la app o pedir códigos nuevos por cuenta propia y más interruptores acotables
  (9n); símbolos nativos, Novedades de Google, Apple Pay / Google Pay y el Smart App Banner (9r); el resto del Super Admin en inglés (9f); la corrida del CI (hito de 9k).

## Fase 9 · 9h — Crecimiento, la landing de acceso anticipado, los QR de calle y el SEO (14 nov)
- **Hecho (rama del worktree, sobre d1cfe41; en paralelo con 9g, 9j y 9k):**
  - **Datos · migración `0138_crecimiento.sql`** (0137 es de 9g): **`campaigns`** (segmento, canal, plantilla, título y texto ES/EN, enlace propio, hora, estados borrador → por aprobar →
    programada → enviando → enviada / retirada; `approved_by <> created_by` en la base; nada se edita: se retira) y **`campaign_sends`** (solo inserción, único por campaña y persona: enviado, tope,
    sin correo); **`short_links`** (código de 7 letras sin las que se confunden; el destino es SIEMPRE una ruta propia, la base lo impone; no se borra ni cambia de destino: se retira) y
    **`link_scans`** (solo inserción: código, hora, ciudad, web/app y clase de navegador; **sin IP, dispositivo ni cuenta**) con su derivado **`link_scan_days`** (lo cuenta la base; nadie más
    lo escribe); **`featured`** (fijar o quitar de la rotación de Negocios › Destacados por unos días, con motivo; tope por ciudad con candado en la base); **`promo_codes`** (HZL30 deja el
    código y vive aquí; el de cada promotor) y **`business_referrals`** (traído → calificado → pagado / rechazado; un rechazado o pagado no cambia); `users.is_promoter`;
    **`early_access`** (la lista de la landing: la cuenta, el código postal, la ciudad o «CP xxxxx», lo del negocio, el QR de origen, el idioma; **sin copiar el teléfono**, sin IP ni
    dispositivo; los números de **Fundadores** los pone la base con candado por ciudad y entregan la insignia de siempre; no se borra salvo la purga a los 30 días); el índice parcial de
    quién tiene «Novedades» por ciudad; las plantillas `mkt_campana_app|push|sms` (grupo mkt, se apagan con «Novedades») y `mkt_promotor`; `email_outbox.tpl` suma `campaign`; el
    interruptor **`growth.landing`** (apagado); **Configuración › Crecimiento** (11 claves: campañas por semana 2, SMS por mes 1, aprobar desde 1 000, lote 500, destacados por ciudad 6 y días 7,
    fundadores 500 vecinos / 100 negocios, promotor: operaciones 5, recompensa $10, días de prueba 60). Mapa de datos al día (7 tablas, 301 filas) e inventario (`campaigns.body` no es de
    una persona). Aplicada en una base nueva (137 migraciones) y la semilla dos veces sin errores.
  - **Semilla `0056_crecimiento.sql`** (0055 es de 9k; todo `is_test`): tres enlaces con 40 escaneos cada uno, una campaña programada y una enviada (con sus envíos), un destacado que ya
    terminó y un negocio Free quitado de la rotación (la vitrina de los Pro y las capturas aprobadas no cambian), un promotor (PABLO42) con un negocio traído y **20 entradas** en la lista con
    códigos postales de las cinco ciudades y dos de fuera (teléfonos 570-555-95xx y 96xx).
  - **Servidor** `lib/crecimiento/`: `enlaces.ts` (crear, retirar, escanear sin personas —un robot no cuenta—, escaneos por día y por web/app), `campanas.ts` (el segmento SIEMPRE con
    «Novedades» encendido; de noche no sale; tope por semana y por SMS por mes; a más del umbral, otra persona aprueba; sale por lotes del barrido en una sola escritura por lote; cada quien en
    su idioma; en la app y push por `avisarMuchos`, SMS por `avisar`, correo por la bandeja con su pie de baja), `destacados.ts`, `promotores.ts` (nombrar, retirar, el antiabuso de 5d, calificar
    en el barrido), `lista.ts` (código postal → ciudad, el código de entrada de siempre con sus topes, la lista y «Avísame», quitarse), `volante.ts` (el **PDF propio** del volante y el cartel:
    carta y media carta, sin librerías) y `admin.ts`. `/q/{código}` (redirige solo a la ruta propia del enlace, deja la ciudad puesta y el código de origen 30 días). El barrido suma `campanas`
    y `promotores`. Publica tu negocio lee los códigos de `promo_codes` (y sus días); el panel (Hoy) dice «Tu página se ve el día que abra {ciudad}» cuando la ciudad no está abierta.
    **Mi cuenta › Avisos** suma **«Novedades de To'Latino»** (apagado de fábrica; encenderlo enciende su push).
  - **Pantallas:** **la landing** (`/acceso`; en `/` solo con `growth.landing`: producción en acceso anticipado, 9t) — Coming Soon v3 compuesta con el sistema (hueco #1): hero con las dos
    líneas fijas de §1c, código postal + teléfono + «Tengo un negocio», la vitrina que rota (casos marcados EJEMPLO), «Aquí cabe cualquier negocio», Lo que viene, Cómo llega, Para negocios
    (Free, Pro con el precio del plan, Fundadores), 8 preguntas, Comparte (WhatsApp y copiar), el pie legal y la barra fija «Avísame» en el teléfono; estados: sin señal, ya anotada, código
    equivocado o vencido, de fuera («Pide tu ciudad»), con negocio («Publica tu negocio»), quitarse. Textos por el CMS (`lib/textos-acceso.ts`, APP-LANDING-PRE, 129 cadenas).
    **Super Admin › Crecimiento** (`/admin/crecimiento`, sale de «Fase 9» en `admin-nav.ts`): cifras, Semilla, Promotores, Campañas, Destacados, Enlaces y QR (crear, PDF, escaneos por
    día, retirar) y Lista de espera (por ciudad, código postal, negocios por tipo, «Pide tu ciudad», la fecha de la landing oculta o visible; **sin teléfonos ni nombres**), en ES/EN.
  - **SEO:** `robots.txt` por entorno (el sandbox `Disallow: /`), noindex en toda página fuera de producción, la cabecera `X-Robots-Tag` en nginx-pruebas, **el mapa del sitio**
    (`/sitemap.xml` + `/mapa-del-sitio/{n}.xml`: Inicio, Negocios, Eventos, categorías con negocios, cada negocio activo y cada evento público de las ciudades abiertas, la ayuda de vecinos, las
    páginas legales y la landing; partes de 45 000 por huella del id, sin OFFSET; **solo en producción y calculado al pedirlo**), y la ficha con canónico, Open Graph y **schema.org/LocalBusiness**;
    la categoría con su canónico.
  - **Guardianes (al final del objeto):** **`enlaceSoloPropio`**, **`escaneosSinPersonas`** (amplía `analiticaSinPersonas` a los escaneos y a la lista; separado para no chocar con 9g),
    **`campanaConPermiso`**, **`sandboxNoSeIndexa`**, **`listaConPermiso`**, **`promotorAntiabuso`**; `idioma` cubre la landing por el CMS. Se tocaron dos listas de guardianes viejos con su
    porqué: `promesaSms` anota `lib/textos-acceso.ts` (el SMS de la apertura, LAUNCH → 9q) y `appNoAutoriza` deja que el escaneo lea si vino de la app (solo para contar).
  - **Ayuda:** `acceso-anticipado` (vecino y negocio) y `admin-crecimiento` (equipo), ES/EN; `publica` (el código de un promotor; el propio no vale) y `notificaciones` («Novedades») al día.
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina en un cluster propio, un S3 de mentira, Chrome del sistema, el build standalone en :3119):** `node guardianes/run.mjs` →
  «sin fallos»; `tsc --noEmit` limpio; `pnpm build` en verde; 0138 y la semilla 0056 en una base nueva (y la semilla otra vez sin cambios); **`cre9h` 95 ✓ dos veces seguidas** (la primera corrida cazó un
  error de verdad: el antiabuso del promotor tenía al revés el orden de `pts_mismo_dispositivo` y rechazaba a todos; corregido y con su caso al revés); **`alreves9h` 53/53** y los guardianes limpios. El mapa del sitio de producción se miró con el servidor local en modo producción (REVISION 9h). **No se corrió** la regresión
  entera, la matriz de 9 dispositivos ni `pruebas/visual` (el menú del admin cambia un poco: LAUNCH → 9b).
- **Para quien junte las ramas:** 0138 vuelve a escribir el `check` de `config_keys.section` con `crecimiento` al final; si 0140 (9j) o 0141 (9k) también lo reescriben, su lista tiene que
  incluir `crecimiento` (si no, la migración siguiente falla con las claves de 0138 ya puestas). Lo mismo con `email_outbox_tpl_check` (`campaign`) si 9l lo toca. `lib/config.ts` (`ClaveConfig`,
  `Seccion`) y `Configuracion.tsx` (`SECCION`) tienen una línea de 9h cada uno.
- **Para 9i (Ciudades):** la pieza compartida mínima ya está: quien se anota en la landing queda en `city_waitlist` (source `coming_soon`) y en `early_access` (`notified_at` vacío). El
  asistente de apertura avisa a esa lista una sola vez y marca `notified_at`; la lista de espera por ciudad para su paso «Avisar a la lista» sale de `listaEspera()` (lib/crecimiento/admin.ts).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9h»):** el SMS de la apertura (9q), avisar a la lista (9i), el Inicio del admin con la lista (9i, cambia una captura), pagar al promotor (9k),
  destacar eventos (9m), «Free con N ítems» y la insignia de negocio fundador en la ficha (9n), correo de campañas con baja de un toque (9l), encender la landing en producción (9t), el Smart
  App Banner (9u) y las corridas del CI (9b).

## Fase 9 · 9k — dinero real listo: conciliación diaria, pagos al banco, disputas con evidencia, 3-D Secure y la huella de la tarjeta (14 nov)
- **Hecho (rama del worktree de 9k, sobre d1cfe41):**
  - **Migración `0141_conciliacion.sql`** (aplicada dos veces en local: la segunda no cambia nada): `recon_runs`, `recon_diffs` y `recon_diff_notes` (solo inserción; la base revisa al
    confirmar que la corrida dice cuántas diferencias tiene, su suma y su día: `recon_runs_cuadra`, diferida) y **`conciliacion_del_dia(día)`**; `money_alerts` y `money_alert_notes`
    (solo inserción; una alerta por tipo y objeto); el camino manual `refunds.manual_*` y `event_settlement_reversals.manual_*` (`dinero_a_mano`: una vez, con quién y nota; resuelta a
    mano no pasa a hecha); `payouts` (el libro de los pagos al banco: no se borra ni cambia su monto) y `sim_payouts`; `dispute_evidence` (de una fila solo cambian, una vez, su archivo en
    Stripe y cuándo se envió), `disputes.evidence_submitted_at` / `due_alert_at`, `sim_files`, `sim_disputes`, `sim_dispute_submissions`; **`payment_actions`** (la verificación
    3-D Secure a nombre de quien paga: solo cambia de estado y solo hacia adelante) y `sim_intents.requires_action` / `capture_method`; `payment_methods.card_fingerprint` y
    `payments.card_fingerprint` con `tarjetas_en_varias_cuentas()`; **Configuración › Dinero** (sección nueva, agregada a la lista que haya sin pisar la de otro bloque):
    `pagos_banco_dia` 2 (martes, no editable), `conciliacion_hora` 6, `dinero_alerta_intentos` 5, `disputa_alerta_dias` 3, `verificacion_min` 30, `tarjeta_cuentas_senal` 3; avisos
    `pro_verify` y `din_alerta`. Mapa de datos al día (294 filas).
  - **La conciliación diaria (el guardián del dinero, HERRAMIENTAS #20):** `lib/conciliacion.ts` compara, objeto por objeto y por día UTC, lo que dice Stripe (`pasarela.delDia`: la
    API paginada y los payouts por cuenta conectada; en el sandbox, el simulador) con el libro: cobros (y los de Pro y las verificaciones), devoluciones, transferencias, reversiones,
    payouts, disputas y **retenciones sueltas** (L416). La corre el barrido a su hora (`conciliarAyer`, una vez) con su vigilante (`vigilarConciliacion`); una diferencia sin dueño o
    una corrida que falló avisa al instante al equipo de dinero. **Para el reporte diario de 9g: `conciliacionDelDia(día)` en `lib/conciliacion.ts`, o en SQL `select * from
    conciliacion_del_dia('AAAA-MM-DD')`** → si corrió, su estado (`cuadra` / `diferencias` / `fallo` / `sin_correr`), cuántas diferencias, cuántas **sin dueño** y los totales de
    Stripe y del libro. Solo lectura.
  - **Pagos al banco los martes:** `cuentaCrear` nace con el calendario semanal del martes (reanudar vuelve al martes); el libro `payouts` por el webhook `payout.*`; en el sandbox,
    `lib/pagos-banco.ts` paga los martes el saldo de cada cuenta simulada no pausada (una vez por cuenta y fecha).
  - **Disputas con evidencia:** Super Admin › **Transacciones › Disputas** (`/admin/transacciones/disputas`, la cola de 120 h con el plazo y el estado de la evidencia); en el caso de
    Colas, **ARCHIVOS PARA EL BANCO**: el recibo en PDF, la conversación (sin teléfonos) y la constancia de entrega (`lib/pdf-simple.ts`, propio), al almacén privado, subidos por la API
    de archivos (`stripeArchivo` / `pasarela.subirEvidencia`) y mandados en un solo envío; si uno no sube, no se envía nada. La alerta al equipo 3 días antes del plazo.
  - **3-D Secure completo** (L355, L382, L759): la hoja **«Tu banco pide confirmar»** (`app/(app)/pago/Verificacion.tsx`: Stripe.js `handleNextAction`, o `confirmCardPayment` con la
    tarjeta guardada en una renovación; en el sandbox, la tarjeta 4000 0027 6000 3184 y el banco simulado), `lib/pagos/verificacion.ts` (solo quien paga; el servidor mira el estado en
    Stripe; lo que nadie verifica vence en el barrido) y la pasarela que **reusa la retención verificada con la misma llave** (nunca cobra dos veces). En pedidos, mercado, tiendas
    (envío y abono), el pago del plan de apartado y boletos (`useVerificacion` + `pideVerificar`). La **renovación de Pro** avisa al dueño con el enlace `/pago/verificar?pi=<pi>` y completa
    el período una vez (`completarRenovacion`; también por el webhook); antes de otro intento, la verificación vieja se mira (si ya cobró, no se cobra otra vez) y se suelta.
  - **La huella de la tarjeta** (L760, L938): al guardar una tarjeta y en cada cobro; el máximo de boletos por persona la cuenta; **Confianza › Fraude** muestra «la misma tarjeta en
    varias cuentas».
  - **Alertas que Stripe nunca hace** (L800, L821): devolución atascada, transferencia sin saldo para revertir, disputa por vencer, pago al banco que falló y la conciliación que no
    corrió, en **Planes › Ingresos › Alertas del dinero** con «Me hago cargo», «Resuelta» y **«Resolver a mano»** (resuelta fuera de Stripe: el barrido nunca la vuelve a pedir).
  - **Devolver repartido** (L448, L455): `devolverOperacion` reparte entre los cobros, cada parte con su llave; Transacciones devuelve también planes y rentas; la ayuda con la cita, por ahí.
  - **Mi cuenta › Ajustes › Pagos** (L360): tus tarjetas y «Quitar». El proceso del plan Pro en el barrido (L377). Inicio del Super Admin: **«EL DINERO NO CUADRA»**.
  - **Contrato con Stripe** (L817): `correr.sh` le da a la pasarela un doble de la base y `prueba.cjs` prueba `cliente`, `intento`, `huella`, `delDia`, `subirEvidencia` y la evidencia con
    archivos; `contratoCubreLaPasarela` ya no tiene excepciones.
  - **Semilla `0058_conciliacion.sql`** (solo sandbox): el lado del simulador de lo sembrado (128 cobros y 6 devoluciones en la base local) y dos días de la conciliación (uno que cuadra
    y uno con dos diferencias con dueño). Aplicada dos veces: la segunda no cambia nada.
  - **Guardianes nuevos:** `conciliacionDiaria`, `tresDSecure`, `huellaDeTarjeta`, `alertasDelDinero`, `disputaConEvidencia`, `pagoAlBancoMartes`, `devolverRepartido`,
    `simuladorDeDinero`; ampliados `contratoCubreLaPasarela` y `dineroDelServidor`. **`alreves9k` 38/38**; `alreves6d` tenía un caso que ya no encontraba su texto (la lista DEVUELVE
    de 6i): al día.
  - **Ayuda:** `admin-conciliacion` y `admin-disputas` (equipo), `panel-cobros` (negocio) y `pagar-con-tarjeta` al día (3-D Secure y quitar una tarjeta).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina):** `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `next build` en verde; 0141 y la semilla 0058
  dos veces sin cambios; la lógica del servidor de 9k compilada aparte y corrida contra la base local: **41 ✓** (un día que cuadra y uno con una retención suelta y un cobro que Stripe no
  tiene, con su alerta una vez; la corrida y sus filas no se cambian y una corrida que miente sobre sus diferencias no entra; 3-D Secure: pide, la misma verificación sin otro cobro,
  otra persona no la completa, verificada → retenido con el MISMO cobro, «No fui yo» → otro intento con otra llave; la huella; los pagos al banco una vez por cuenta y fecha; una disputa
  con sus tres PDF subidos y enviados al simulador; devolver $14 de $10 + $6 → 10 + 4 y el reintento no repite; la renovación de Pro con 3-D Secure → aviso al dueño → confirmada → Pro
  activo con un solo cobro y procesar otra vez no cobra; la devolución atascada → una alerta y su camino manual; las lecturas del Super Admin). El contrato se compiló y se probó
  `cliente` con el doble de la base contra una API falsa. **`din9k` 39 ✓ dos veces seguidas en la misma base** (el build servido en local, perfil basico con un S3 de mentira y
  Chrome del sistema; los cinco casos del plan y quitar una tarjeta, 390 y 1360); al correrla salieron y se arreglaron: el enlace de la renovación pasó a `/pago/verificar?pi=…` (el id
  del simulador lleva «:» y «.», que una ruta no dejaba pasar: 404 para el dueño), la hoja va fuera de la página que la abre, y la prueba elige un día sin alerta (una por día).
  **No se corrió:** el contrato con stripe-mock (no hay Docker): su primera corrida es la del CI, como la regresión entera (LAUNCH «Fase 9 · 9k» → 9b).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9k»):** 3-D Secure en los demás flujos y «Volver a Pro» con la hoja en el panel (9n), la foto de la entrega en la evidencia (9n), reponer un
  pedido sin costo y la prueba del rechazo al aprobar un estimado (9n), el webhook y la conciliación con Stripe de verdad y el saldo negativo de las cuentas conectadas (9q), la
  corrida del CI (9b).

## Fase 9 · 9i — Ciudades: el asistente de apertura, la regla, la lista de espera, el estado «beta» y los barrios de las cinco (14 nov)
- **Hecho (rama del worktree de 9i, sobre 677761f; en paralelo con 9l y 9o):**
  - **Migración `0139_ciudades.sql`** (aplicada en una base nueva —antes de 0140/0141— y en una base con 0140/0141 ya puestas —el orden del sandbox—, y otra vez sin cambios):
    `cities.status` suma **`beta`** (+ `beta_at`, `closed_at`); **`city_open_rules`** (por ciudad: negocios listos 30 **o** 300 en la lista, y 1 en comida, belleza, hogar, fiestas e
    iglesias; `ok`/`checked_at` los escribe el servidor); **`city_launches`** (en curso → abierta con sus 7 pasos / cancelada con motivo) y **`city_launch_steps`** (paso 1–7 con quién,
    evidencia y motivo; **solo avanza, de uno en uno; no se cambia ni se borra**); **`city_close_requests`** (lo pide una persona, lo aprueba OTRA: `decided_by <> requested_by`);
    **`city_status_log`** (solo inserción: cada cambio de estado, por dónde —asistente, cierre, el equipo, directo— quién y por qué); **`city_beta_invites`** (se quitan, no se borran) y
    **`ciudad_abierta_para(ciudad, persona)`** (on → todos; beta → invitaciones vivas y cuentas de revisión activas); el trigger **`cities_estado`**: a «on» solo con `tl.apertura` (un
    asistente de esa ciudad, en curso, con los pasos 1–6) y bajar una ciudad abierta o en beta solo con `tl.cierre` (un cierre aprobado por otra persona) — fuera de la base del sandbox
    (`ciudades_sandbox()`: el entorno «pruebas» o la semilla de pruebas aplicada) no hay otro camino; **`NOTIFY 'ciudades'`** en cada cambio de `cities`, `zones` y `city_beta_invites`;
    `zones` con `edited_*` y `retired_*` (no se borran); `city_waitlist.notice_result`/`notice_launch_id` y **`city_notices`** (un aviso de apertura por persona y ciudad, solo
    inserción); la plantilla **`ciudad_abierta`** (tx, push primero, SMS solo de respaldo); `email_outbox.tpl` suma `city_open` y `config_keys.section` suma `ciudades` (agregados a la
    lista que haya); **Configuración › Ciudades**: `ciudad_aviso_lote` 500. Mapa de datos (330 filas) e inventario al día.
  - **Barrios de las cinco** (L64): `packages/db/seeds/zonas.sql` (configuración real, corre en todos los entornos) ahora sale de `scripts/catalogo/extraer-ciudad.cjs` con Hazleton del
    prototipo y **Allentown, Wilkes-Barre, Scranton y Reading** de `scripts/catalogo/barrios-ciudades.json` (6 barrios con su centro y 14–15 pueblos cercanos por ciudad; puntos
    aproximados, el equipo local los revisa: LAUNCH → 9t). Un barrio que el equipo corrigió o retiró ya no lo pisa la semilla (`where zones.edited_at is null`).
  - **Semilla `0059_ciudades.sql`** (el plan decía 0053; solo sandbox): Reading en **beta** con una vecina invitada (Inés, 570-555-9701) y su equipo local de ficción (Raúl, Ciudad
    manager de Reading, 570-555-9702, en `staff_mfa_pruebas` como 0057). No abre ninguna ciudad.
  - **Servidor** `lib/ciudades/`: `apertura.ts` (la evidencia de cada paso calculada en vivo y guardada al confirmar; el asistente solo avanza; abrir (paso 7) y «Abrir igual» de un
    Admin; «Comprobar» = la regla + las líneas pendientes de la LAUNCH que nombran a la ciudad —leídas del archivo que viaja con el build, `outputFileTracingIncludes`; en producción
    frenan, en el sandbox se anotan— + el commit; beta, invitar y quitar; pedir, aprobar, rechazar y retirar un cierre; la regla; radio, zona horaria e impuesto; barrios),
    `aviso.ts` (el barrido avisa a la lista de la ciudad que abrió: por partes, de 9 AM a 9 PM de la ciudad, una vez por persona y ciudad, en la app/push, SMS si no tiene la app, correo
    verificado; quien pidió sin cuenta no recibe nada), `admin.ts`, `launch.ts`, `comun.ts`. **Beta para invitados:** `ubicacion()` y el selector ven las ciudades con `vista()` (la de esa
    persona, sin guardarla en memoria); Comunidad, «Mi ciudad», el panel («Tu página se ve el día que abra…») y los vecinos deciden «abierta» con `ciudad_abierta_para`. **Al instante (L71):**
    lib/cambios-config.ts escucha también `ciudades`. El barrido suma `avisoApertura`.
  - **Super Admin › Ciudades completo (ADM-CIUD):** el listado (estado, lista de espera, negocios listos contra la meta, % de la regla, paso del asistente, cierre por aprobar, la fecha de
    la landing y «Pide tu ciudad») y el detalle (`/admin/ciudades/{id}`): cifras, la cuenta oficial y el equipo local, el aviso a la lista, **el asistente** (en el teléfono un paso por
    pantalla, en escritorio la línea de los 7), la beta y sus invitaciones, la regla por categoría clave, las categorías con negocios, radio, zona horaria, impuesto, **barrios** (agregar,
    corregir, retirar) y pueblos, «Pedir cierre» y el historial. ES/EN por el idioma del admin. **Inicio del Super Admin:** la cifra «LISTA DE ESPERA» y «CIERRE DE CIUDAD POR APROBAR».
  - **Guardianes nuevos** (al final de `run.mjs`): **`ciudadConAsistente`**, **`ciudadAlInstante`**, **`betaSoloInvitados`** (al escribirlo cazó «Mi ciudad»: la lista para elegir no
    traía la ciudad en beta), **`listaAvisadaUnaVez`** y **`parametroDeMas`** (una consulta que recibe más valores que los $n que usa: ciu9i cazó así el aviso que nunca salía);
    `revisionVeCiudadAbierta` sigue en verde (ya lee `beta` de 0139). **`alreves9i` 46/46**, guardianes limpios después.
  - **Prueba nueva `ciu9i`** (61 ✓): ver la cabecera del archivo. **Ayuda:** `ciudades-que-abren` (vecino) y `admin-ciudades` (equipo), ES/EN.
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina en un cluster propio, un `docker exec` de mentira hacia esa base, el build standalone en :3149, Chrome del sistema):**
  `node guardianes/run.mjs` → «sin fallos»; `tsc --noEmit` limpio; `pnpm --filter web build` en verde (la LAUNCH viaja en `.next/standalone/docs/`); 0139 + semillas en una base nueva y
  en el orden del sandbox (0139 después de 0140/0141), dos veces, y 0059 y zonas.sql otra vez a mano: sin errores ni cambios; **`ciu9i` 61 ✓ dos veces seguidas** en la misma base (las
  primeras corridas cazaron dos errores de verdad: el parámetro de más del aviso —guardián `parametroDeMas`— y una comprobación de la prueba que esperaba otro mensaje); capturas a 390
  y 1360 miradas. **No se corrió:** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` (el Inicio del admin suma una cifra: LAUNCH → 9b).
- **Para quien junte las ramas:** 0139 agrega `ciudades` a `config_keys_section_check` y `city_open` a `email_outbox_tpl_check` sobre la lista que haya (si 9l reescribe esos checks con
  una lista fija, tiene que incluirlos). La plantilla `ciudad_abierta` va con `on conflict do nothing` (si 9l la define también, que use la misma clave o `on conflict`). Archivos que
  otros tocan: `guardianes/run.mjs` (5 guardianes al final), `lib/barrido.ts` (una tarea), `lib/config.ts` y `Configuracion.tsx` (una línea cada uno), `app/admin/page.tsx`,
  `lib/correo/index.ts` (`Tpl`), `next.config.ts`, `packages/db/mapa-de-datos.json` (8 tablas al final; se regenera con `node scripts/datos/mapa.mjs`), `pruebas/lib/negocio-nuevo.cjs`
  (Raúl en `EQUIPO`) y los docs.
- **No cerrado, con destino (LAUNCH «Fase 9 · 9i»):** el selector de ciudad del encabezado del admin (9n), lo que queda de «Mi ciudad» (9m), el equipo local de las otras ciudades
  (Paquete 9-4), revisar los barrios en el lugar (9t), el impuesto con el contador (9s), Hazleton en beta (9u), abrir las cinco con el asistente (9v), las corridas del CI y la captura
  de `admin-hoy` (9b).

## Fase 9 · 9o — Producción como código y ensayada (14 nov)
- **Hecho (rama del worktree de 9o, sobre 15c2d5a; en paralelo con 9i y 9l):**
  - **El paquete común `infra/comun/`** (fase9 §3.2, «mismo paquete»): `lib.sh` (los secretos que nacen en el servidor con las recetas de siempre, el diagnóstico,
    liberar disco, los índices de la ayuda, lo legal y las cadenas, la comprobación de salud), `registro.sh` (deploy_releases, incident_log y server_keys desde bash, con
    variables de psql, nunca SQL armado), `sellado.sh` (el **sobre sellado** con age: llave X25519 por máquina, la pública en /estado/llave.txt, abre solo los nombres de la
    lista cerrada; un sobre para otro servidor no abre y se dice), `sobres-privados.sh` (lo que nace en una máquina y otra necesita viaja cifrado para su llave, solo por la
    red privada), `recuperacion.sh` (una máquina reconstruida recupera sus llaves de siempre, también su llave age, del sobre de recuperación), `azulverde.sh` (migraciones →
    color nuevo → **puerta de salud** de 3 respuestas → nginx → **10 minutos de vigilancia** con 5xx, p95, errores nuevos y /api/salud, umbrales en Configuración →
    **vuelta atrás sola**, anotada con lo medido, incidente y aviso), `psql-remoto.sh`, `mantenimiento.sh` (la ventana en nginx), `secretos.json` (la **lista cerrada** de
    variables de producción con su dueño), `respaldos/` (pgBackRest completo diario + diferencial 6 h + WAL continuo, cifrado, 35 días de PITR; fotos con rclone; el sobre de
    recuperación de cada máquina; la **restauración de prueba** semanal en un contenedor desechable con `migrar.sh --verificar` —nuevo— y consultas de control), `monitoreo/`
    (Prometheus, 14 alertas cada una con su caso del manual, Alertmanager → correo directo y la app, blackbox desde fuera, postgres_exporter con las cifras de la plataforma),
    `mantenimiento/index.html` (del sistema de diseño con la línea fija, `scripts/produccion/mantenimiento.mjs`) y los rangos de Cloudflare de respaldo.
  - **`infra/produccion/`**: tres máquinas (base con su disco, app azul/verde, réplica que lee para Analítica, vigila y restaura), `cloud-init.yml` sin SSH, compose de cada
    una, `nginx-produccion.conf` (dominio, IP real solo desde Cloudflare, certificado de origen, mantenimiento, el registro que lee la vigilancia), `deploy.sh` por rol,
    `tolatino-sync` que **solo avanza** (fast-forward, el commit pasó por pruebas, etiqueta `ok-produccion/*` con el OK del fundador → founder_ok_ref), la imagen de la base
    con pgBackRest y las reglas de Cloudflare. **`infra/ensayo/`**: su entorno (cuarta máquina «almacen» con Garage y TLS propio), su estado para el guion. **`infra/pruebas/`**:
    `deploy.sh` carga el paquete común sin cambiar lo que hace (traza igual: ver abajo), más tres pasos que no pueden tumbarlo (el sobre sellado, anotar el despliegue y la
    huella de la llave), y el `cloud-init.yml` del sandbox (solo para reconstruirlo).
  - **`scripts/produccion/`**: `hetzner.sh` (API sin imprimir el token), `maquinas.sh` (crear y reconstruir), `firewall.sh` (80/443 solo desde Cloudflare, sin 22), `cloudflare.sh`
    (DNS, Full strict, certificado de origen desde la solicitud del servidor, WAF sin desafío para Apple/Google/Stripe/tiendas/pases, el límite por IP L683, caché), `sellar.sh`,
    `reconstruir.sh`, `promover.sh` y **`ensayo.sh`** (el ensayo completo). Flujos nuevos: `testigo.yml` (el segundo testigo cada 10 min; verde mientras no haya producción),
    `ensayo.yml` y `reconstruir.yml` (a mano), y un paso nuevo en `ci.yml` (`pruebas/infra/correr.sh` con Docker de verdad y la imagen de la base).
  - **Migración `0145_despliegues.sql`** (dos veces sin cambios): `deploy_releases` (solo inserción; sin OK no entra uno de producción), `incident_log` (solo inserción, el cierre una
    vez), `server_keys` (huella y vencimiento de las llaves fuera del llavero, con `server_key_anotar` y key_rotations), `health_checks` suma `vigia`, respaldos y restauraciones
    admiten `ensayo`, `despliegues_estado`, `vueltas_atras_del_dia`, Configuración › **Despliegues** (6 claves), el anuncio del mantenimiento (notice_at, maintenance_id), avisos
    `despliegue_vuelta`, `respaldo_alerta` y `monitoreo_alerta`. **Semilla `0061_despliegues.sql`** (solo sandbox, dos veces sin cambios). Mapa de datos al día (318 filas).
  - **App:** Super Admin › Sistema › **Despliegues** (nueva pestaña: la versión que sirve, cada despliegue con su resultado y lo medido, incidentes con «Cerrar»), Salud con los
    últimos despliegues, las máquinas de Prometheus y las llaves del servidor; `/api/salud` dice `barrido_s` y `vigia_s`; `/api/interno/alerta` (Alertmanager → incidente +
    aviso); el reporte diario cuenta las vueltas atrás; barrido: `despliegues`, `respaldosVigilar` (crítico si la restauración falla o no corre en 8 días) y
    `mantenimientoAviso` (anuncio en el Inicio de cada ciudad 24 h antes, por lib/cms-admin.ts con autor y auditoría; se retira si se cancela).
  - **Guardianes nuevos:** `mismoPaquete`, `produccionSoloAvanza`, `migracionReversible`, `selladoSoloSuServidor`, `secretoConDueno`, `respaldoRestaurado`, `mantenimientoFijo`;
    ampliados `semilla` y `modoPruebas` (producción, el paquete común y el ensayo), `ayudaConForma`, `qrFirmado` y `compaSoloServidor` (reconocen el paquete común).
    **`alreves9o` 39/39**, guardianes limpios después.
  - **Manual de incidentes `docs/incidentes/`** (15 casos + `simulacros.md`) y la ayuda **`admin-despliegues-y-respaldos`** (ES/EN).
- **Probado aquí (sin Docker; Postgres 16 + PostGIS propio en :5496, pgBackRest 2.50 instalado, age, shellcheck 0.11):** `node guardianes/run.mjs` → sin fallos; `tsc --noEmit`
  limpio; `pnpm --filter web build` en verde; 0145 aplicada dos veces por migrar.sh en una base nueva (141 migraciones; la segunda no aplica nada) y otra vez a mano sin error;
  las semillas del sandbox en esa base y 0061 dos veces; `pruebas/infra/correr.sh` (como root): bash -n y shellcheck de 31 scripts, los compose y el monitoreo revisados en
  Python (sin `docker compose config`: no hay Docker; en el CI sí), la página de mantenimiento al día, **azul/verde 21/21**, **sobre sellado y recuperación 17/17** (age de
  verdad), **tolatino-sync de producción solo avanza 12/12** (repo de mentira: sin la etiqueta del OK, fuera de pruebas o reescribiendo la historia se rechaza; una vuelta atrás no se reintenta; al escribirla cazó que la etiqueta llegada después no se bajaba en un clon superficial), **traza del sandbox igual** (672 pasos del deploy.sh de antes contra 675 del nuevo: los 3 de más son de 9o), **PITR de verdad 8/8** con la plantilla de producción.
  **Despliegues en el navegador** (build standalone en :3196, Chrome del sistema, 390 y 1360, entrando como el Admin de pruebas): 21 ✓ (los tres resultados, incidentes,
  umbrales, sin desborde, cerrar un incidente → cerrado una vez y en la auditoría, Salud con los despliegues, Configuración › Despliegues, la página de mantenimiento, sin
  errores de la página).
- **No corrió (y por qué):** el **ensayo completo** en máquinas desechables (necesita el token del proveedor del proyecto de pruebas y crea máquinas que se cobran; listo en
  `ensayo.yml` / `ensayo.sh`; LAUNCH «Fase 9 · 9o»); `docker compose config` y la imagen de la base (sin Docker aquí; paso nuevo del CI); Cloudflare por la API (sin zona, 9p).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9o»):** el ensayo (9o), la corrida del CI (9o), lo que necesita el Paquete 9-3 (proveedor, almacén de los respaldos, token,
  llave de recuperación), Cloudflare (9p), el SMS crítico sin la app (9t), reconstruir base y réplica en máquinas (9t), la pausa del lanzamiento por fases (9u), la CPU de los
  mapas de fuente y la auditoría de Semgrep (9t).

## Fase 9 · 9l — avisos, correo y canales listos (14 nov)
- **Hecho (rama del worktree de 9l, sobre 677761f; 9i ya juntado en la rama: «ciudad_abierta» y «city_open» son de 9i y 9l no manda su propio aviso de apertura):**
  - **Migración `0142_canales.sql`** (dos veces en una base nueva 0001–0142 + semillas hasta 0059: la segunda no cambia nada). Los CHECK que listan valores se AMPLÍAN
    con `pg_temp.ampliar_check` (nunca una lista fija): notifications / phone_messages / compa_outbound «entregado», compa_outbound kind «soporte» y «plantilla»,
    compa_inbound result «tope_global», support_cases origin «correo», email_outbox tpl «support_reply», «support_ack», «weekly», config_keys section «avisos».
    - **El único camino de los SMS:** `sms_outbox` (teléfono y texto CIFRADOS, solo avanza: pendiente → enviado → entregado / reintento / falló / vencido / sin proveedor;
      no se borra; la retención los vacía) y `sms_attempts` (solo inserción; su resultado final llega una vez). `notifications.sms_id`, `phone_messages.sms_id` y
      `compa_outbound.sms_id / delivered_at`; `phone_messages` deja de guardar para siempre (teléfono y texto vacíos a `retener_sms_dias`).
    - `notif_templates.sms_enlace` (el enlace de seguimiento en el SMS), `notif_once` (un aviso una vez por objeto; solo inserción), `canal_alertas` (tope de remitentes),
      `wa_templates` + `wa_template_events` (8 plantillas de WhatsApp: código, boletos, cita, soporte · ES/EN, nacen en borrador), `support_email_in` (solo inserción, tapado,
      la base rechaza tarjeta o seguro social; ids únicos de SNS y SES), `support_replies_out`, `email_verifications.revoked_at`, `email_unsubscribes`.
    - **21 plantillas nuevas** (ES y EN): cuenta_codigo (el código para entrar, editable, siempre con {codigo}), cuenta_tel_cambio, rsv_hoy, ord_tarde, ord_entregado,
      sello_ok / sello_info / sello_no, biz_resumen_semana, pro_d20, pro_ultimo, rec_negocio, rec_publico, busqueda_hay, equipo_invitado, biz_quedan_pocos, biz_resena,
      foto_rep_quitada / foto_rep_queda, canal_tope (y ciudad_abierta, que es de 9i). `biz_job` pasa a SMS de respaldo.
    - **Configuración › Avisos y canales** (sección nueva): sms_reintentos 3, sms_reintento_min 2, canal_remitentes_min 60, canal_stop_propia 1, soporte_whatsapp 1,
      pedido_tarde_min 15; **Retención**: retener_sms_dias 90, retener_correo_entrante_dias 365.
  - **Servidor:**
    - `lib/sms/` (index: enviarSms, intentar, anotarEntrega, reintentarSms, entregaSms; simulador.ts con los números mágicos 0911/0912/0913; codigo.ts). Avisos
      (`lib/avisos.ts`), SMS a teléfonos sin cuenta, el código para entrar y el reclamo (`lib/cuenta.ts`: en producción ya no es «sin proveedor» siempre) y El Compa por
      SMS (`lib/compa/canales.ts`) salen por ahí; solo `canales-proveedor.ts` habla con Telnyx (el `fetch` propio de avisos.ts se fue).
    - Webhooks: `message.finalized` de Telnyx, los `statuses` de Meta y `message_template_status_update` se leen DESPUÉS de la firma (`lib/canales/estados.ts`).
    - **Tope global de remitentes** por minuto con alerta a los Admins (una cada 10 min); **una sola respuesta de STOP** (la nuestra o la del proveedor).
    - Plantillas de WhatsApp: `lib/canales/plantillas-wa.ts` («Mandar a Meta» con `crearPlantillaMeta`; simulador en el sandbox), `mandarPlantilla` (escribir primero).
    - **Correo:** verificar con enlace de un uso (el nuevo anula los anteriores), baja de un toque de las campañas (List-Unsubscribe + Post en SES, «Darme de baja»
      al pie, `/api/correo/baja`), botones de Wallet en el recibo de boletos (`armarReciboBoletos`), el resumen semanal del barrio (`weekly`).
    - **Correo entrante de Soporte** (`lib/correo/entrante.ts`, `/api/correo/entrada`): firma de SNS con el certificado de sns.*.amazonaws.com y el tema propio
      (`CORREO_SNS_TEMA`; sin él nada entra), veredictos de SES, correo CONFIRMADO de una cuenta → caso TK- origen «correo» tapado; el número en el asunto vuelve al caso.
    - **Soporte fuera de la app** (`lib/soporte-canales.ts`): la respuesta del equipo por correo y, si el caso entró por WhatsApp, por WhatsApp dentro de las 24 h
      (fuera, la plantilla aprobada).
    - Avisos enganchados: sello decidido, resultado de la foto reportada, invitación al equipo y «Reenviar» por SMS, «X te recomendó» (una vez por teléfono), quedan
      pocos, reseña nueva, «cambiaste tu número» al número viejo, «Tu cuenta se borró» al purgar, «Tu pedido llegó», y en el barrido (`lib/canales/barrido.ts`):
      pedido tarde, «Hoy tienes mesa», «ya publicó», «Avísame cuando haya», prueba Pro día 20 y último (10 AM), resumen semanal (lunes 9 AM). `avisarMesa` respeta
      el «Avísame por SMS» de la reservación.
    - `pushsubscriptionchange` en `/sw-push.js` → `/api/push/renovar` (mismo origen y sesión).
    - Contrato de los canales fijo a un commit y su sha256 (Telnyx bf2eb8e…, Meta e96a1c9…) y con las funciones nuevas: **31 ✓** (encontró que Meta pide
      `language.policy` en una plantilla: arreglado).
  - **Super Admin:** Notificaciones › **SMS y WhatsApp** (entrega de cada SMS sin teléfono, reintentos, el tope y sus alertas, WhatsApp entregados) y **Plantillas de
    WhatsApp** (estado en Meta, «Mandar a Meta», simular la respuesta en el sandbox), en ES y EN; Soporte › **Por correo** y el canal «Correo a Soporte» en la ficha.
  - **Guardianes:** nuevos `smsConReintento` y `correoEntranteFirmado`; ampliados `promesaSms` (SIN excepciones: cada promesa dice qué plantilla la cumple, con SMS
    y que alguien la manda), `avisoConPlantilla` (el SMS de enviarSms y las plantillas de correo contra la base), `canalConFirma` (avisos de entrega después de la
    firma, contrato fijo y completo), `smsSoloRespaldo` (el único camino), `privacidadSalud` (lib/sms abre su cifrado). **`alreves9l` 41/41**; `alreves7h` al día
    (la última definición de compa_outbound_antes es la de 0142): 50/50.
  - **Ayuda:** `notificaciones`, `soporte`, `mi-cuenta` al día y **`admin-notificaciones`** nueva (ES/EN).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS de la máquina en un cluster propio :5449, el build standalone en :3155, Chrome del sistema, un `docker exec` de
  mentira hacia esa base):** `node guardianes/run.mjs` → sin fallos; `tsc --noEmit` limpio; `pnpm --filter web build` en verde; base nueva 0001–0142 y semillas
  hasta 0059, 0142 otra vez sin cambios; **`avi9l` 123 ✓ dos veces seguidas** (las 21 plantillas en ES y EN con su SMS entregado por el simulador; reintento →
  entregado, inválido sin reintento, proveedor caído; message.finalized firmado una vez y el de un intento viejo no mueve nada; 61 remitentes → tope y alerta;
  correo a Soporte firmado, otro tema y spam fuera, sin cuenta, caso TK- tapado, respuesta al mismo caso y la respuesta del equipo por correo; retención de SMS y
  de correo con el reloj movido; verificar el correo de un uso; baja de un toque; pushsubscriptionchange; «Tu cuenta se borró»; recibo con los botones de Wallet;
  Notificaciones y Soporte a 390 y 1360, ES y EN). Contrato de los canales 31 ✓ con las especificaciones fijas. Al revés: 9l 41/41, 7h 50/50, 5d 34/34,
  6i 40/40, 7i 35/35, 8i 49/49, 9d 23/23; **8c 36/37: el caso de `permisosMinimos` no encuentra su texto en apps/mobile/apps.json — igual en la rama base, no es de 9l.**
- **No corrió aquí:** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` (Notificaciones y Soporte suman pestañas: cambia su captura) → CI (9b);
  Telnyx, Meta y SES de verdad → 9q.
- **Para quien junte las ramas:** `guardianes/run.mjs` (dos guardianes al final, después de los de 9k; 9i ya junto), `lib/barrido.ts` (tres tareas del barrido: la de los avisos de 9l, la de los SMS y la del
  correo entrante), `lib/config.ts` (claves de 9l y sección «avisos»), `Configuracion.tsx` (SECCION.avisos), `lib/correo/index.ts` (`Tpl`, `mandar` con cabeceras,
  la baja), `lib/correo/plantillas.ts` (marco con `wallet` y `baja`), `lib/correo/recibos.ts` (armarReciboBoletos), `mapa-de-datos.json` (5 tablas: wa_templates,
  wa_template_events, support_email_in, email_unsubscribes, sms_outbox; regenerado), `infra/pruebas/docker-compose.yml` y `pruebas/servir/servir.sh` (TELNYX_FROM,
  WHATSAPP_WABA_ID, CORREO_SNS_TEMA, CORREO_SNS_HOSTS en el perfil completo), los docs.

## Fase 9 · 9m — lo diferido del vecino que entra antes de abrir (14 nov)
- **Hecho (rama del worktree de 9m, sobre claude/vibrant-franklin-krutwa a7441f9):**
  - **Migración `0143_vecino.sql`** (no depende de 0144/0145; los CHECK se AMPLÍAN con `pg_temp.ampliar_check`):
    - **Direcciones de todo EE. UU. (decisión AC):** `geo_streets` con estado, lugar y fuente; tablas `geo_points` (puntos de dirección de OpenAddresses y de los
      condados que los publican), `geo_places` (TIGER PLACE), `geo_zips` (ZCTA) y `geo_names` (los nombres que se autocompletan: índice por prefijo
      `text_pattern_ops`, por estado y trigram GIN); `geo_loads` por estado y tipo. Funciones `dir_partes`, `dir_resolver` (punto → rango → calle), `dir_ubicar`
      (la de siempre, misma firma), `dir_sugerir` (prefijo con tope en el estado y luego en el país, KNN al punto, la ciudad y el estado escritos, difuso solo
      si no hay prefijo), `dir_inversa` (punto ≤ 40 m o tramo ≤ 150 m con su lado y paridad), `geo_nombres_rehacer`. `user_addresses` con lugar, estado y
      `pin_at` (calidad «punto» y «puerta»); `businesses.geo_fixed_*` (el punto que corrigió el Super Admin).
    - Mensajes en vivo: disparadores `chat_messages_vivo` y `dm_messages_vivo` (`pg_notify('mensajes', …)` sin el texto) y `chat_messages_sin_secretos`.
    - `search_alerts.kind` (búsqueda / vacantes, una de vacantes por ciudad), plantilla `vacante_nueva`, `content_reports` acepta «job», `review_topics`,
      `vehicle_recalls`, `users.voice_search`, la fila «Dirección y mapa» de la guía del panel.
  - **Direcciones:** `infra/direcciones/generar.sh` reescrito: por estado (TIGER ADDRFEAT + PLACE + ZCTA + OpenAddresses), en paralelo (`PARALELO`) y
    reanudable, volumen aparte, refresco a los 90 días, `ESTADOS=todos` para el país, `CONDADOS_MUESTRA` para un disco chico. API propia `/api/direcciones`
    (sugerir y al revés, con tope de 250 ms y de peticiones); `DireccionCampo` (autocompletar mientras se escribe, «Usar mi ubicación», código postal) y
    `MapaPin` (pin ajustable sobre las teselas propias) en **Mis direcciones, el checkout con delivery (las mismas direcciones), Publica tu negocio, Panel ›
    Tu página › Dirección y mapa y Super Admin › Negocio 360 › Punto en el mapa** (con motivo y auditoría). El pin se acepta a ≤ 250 m de la dirección o
    ≤ 3 km del centro de su código postal. Medida nacional (`scripts/carga/direcciones-1m.mjs`: 5,9 M nombres, 2 M tramos, 2 M puntos): 12/12 dentro de
    100 ms (p95 máx. 19 ms). `infra/mapa/generar.sh` con `MAPA_REGION=us` para el mapa base del país.
  - **Lo del vecino:** onboarding pasos 3–5 y Fundadores (ya servido en 5c; probado), mini mapa propio en el Inicio (escritorio) y en la ficha, «Cómo llegar»
    por `lib/como-llegar.ts` (Mapas del iPhone, la app de Android, la web en una computadora; 25 lugares cambiados), pines por recuadro cuando pasan de 400,
    chips en dos líneas, «¿Es tu negocio?», `HojaEntrar` (AuthSheet bilingüe con errores), «Lleva o es» en la hoja del plato, «Lo que más mencionan»
    (`lib/temas.ts`, barrido), reportar novedad y vacante, vacantes en Buscar y «Avísame de nuevas vacantes» (barrido una vez por vacante), Mi cuenta ›
    Avisos › Tus alertas con «Quitar», **Mensajes en vivo** (SSE propio `/api/vivo` + LISTEN/NOTIFY; se quitaron los intervalos de 4–5 s, también el del
    panel), tarjeta y seguro social tapados en Mensajes, retiros de NHTSA (`infra/retiros/generar.sh`, mensual) en la hoja del carro, `/buscar/inventario`
    (casa o carro), Mi cuenta › Pagos › Movimientos, Mis boletos guarda todos los próximos, sesiones con «Este iPhone · To'Latino 1.0 (12)», Buscar con la
    voz con su aviso y su interruptor en Privacidad.
  - **Guardianes:** nuevos `direccionSinTerceros`, `autocompletarRapido`, `mensajesEnVivo`, `mensajesTapados`; `guiaDelPanelCompleta` lee las filas de todas
    las migraciones. **`alreves9m` 36/36**; `alreves7e` 36/36.
  - **Ayuda:** nuevas `direcciones` y `pagos-y-movimientos`; al día `mapa`, `mensajes`, `buscar`, `mi-cuenta` (ES/EN).
- **Probado aquí (sin Docker: Postgres 16 + PostGIS en un cluster propio :5497, el build standalone en :3171, un `docker exec` de mentira):**
  `node guardianes/run.mjs` → sin fallos; `tsc --noEmit` limpio; `pnpm --filter web build` en verde; base nueva 0001–0143 + semillas repetibles + semilla de
  pruebas hasta 0061, luego 0143 dos veces más sin errores y `migrar.sh` otra vez «al día»; **`dir9m` 29 ✓ y `vec9m` 50 ✓, dos veces seguidas cada una**
  (un mensaje llega al otro teléfono en 12 ms desde que se guarda y en 38 ms el que entra directo en la base; quieta, la conversación no pregunta nada;
  cada pieza a 390 y 1360 en ES y EN sin scroll de lado); `pruebas/infra/direcciones.test.sh` 19/19 (Pensilvania + muestra de CA/TX/NY con archivos del
  formato de TIGER y OpenAddresses, reanudable, «al día», al revés, ≤ 100 ms).
- **No corrió aquí:** las cargas reales de TIGER, OpenAddresses y NHTSA (la red de esta máquina no llega a census.gov, openaddresses.io ni nhtsa.gov) →
  workflow «Direcciones» (ampliado) y `tolatino-pruebas-1`; el orden del sandbox (0143 después de 0144/0145, que no están en esta rama); la regresión entera,
  la matriz de 9 dispositivos y `pruebas/visual` → CI (9b). Teselas: en local no hay servidor de teselas (el mini mapa sale sin fondo).
- **Para quien junte las ramas:** `guardianes/run.mjs` (cuatro guardianes al final y el cambio en `guiaDelPanelCompleta`), `app/panel/Panel.tsx` (PARTS «dir»,
  `RefrescoVivo`, sin el intervalo de 5 s) y `app/panel/[id]/[[...r]]/page.tsx` (SUBS «dir»), `app/repartidor/Repartidor.tsx` y `SinSenalRep.tsx` (una línea:
  «Cómo llegar»), `app/admin/acciones-negocios.ts` (`puntoCorregir` al final; ocultar cierra reportes), `lib/barrido.ts` (tareas «vacantes» y «temasResenas»),
  `lib/canales/barrido.ts` (alertas solo kind «busqueda»), LAUNCH L49 (Publica (1) hecho, línea de 9n), `mapa-de-datos.json` e `inventario-datos.json`
  (regenerados), `scripts/portar-sistema.mjs` (AuthSheet y BusinessCard), `infra/*/deploy.sh` (direcciones y retiros) y `pruebas/infra/traza-sandbox.sh`,
  `scripts/carga/correr.mjs`, `pruebas/e2e/menu2b.cjs` (sin sesión → la hoja «Entra para pedir»).

## Fase 9 · 9n — Lo diferido del negocio, el Repartidor y la operación del Super Admin (14 nov)
- **Hecho (rama del worktree de 9n, sobre a7441f9; en paralelo con 9m):**
  - **Migración `0144_negocio.sql`** (dos veces en una base nueva —antes de 0145— y otra vez a mano sobre una base con 0145: sin cambios). Los CHECK se AMPLÍAN
    (`pg_temp.ampliar_check`: media «delivery», cola «entrega», sujeto «delivery_incident», secciones «repartidor» y «colas», special_hours «vacation» y «own»).
    - **Repartidor:** `delivery_settings.proof` y `.pickup_code` (apagados de fábrica); `delivery_codes` (el código del cliente y el de recogida, 4 cifras de azar fuerte,
      nacen solos al aceptar un delivery: trigger `operations_codigos`); `delivery_proofs` (foto / código / negocio; solo inserción) y el trigger **`operations_prueba`**
      (la base no deja cerrar sin prueba un delivery con repartidor de un negocio que la pide); `delivery_offers` (una abierta por pedido; solo cambia de estado) y
      `delivery_offer_replies` (solo inserción); `delivery_messages` (lo que el repartidor le escribe al cliente; solo inserción); `delivery_incidents` (se resuelven
      una vez) y `driver_sanctions` (solo se levantan, una vez; un baneo lo levanta otra persona) con `repartidor_sancionado()`; sección **«dlv»** en la matriz.
    - **Colas:** `queue_roles` (quién ve cada cola, sembrada con lo que decía el código), `staff_holidays` y `soporte_sla` que no los cuenta; Configuración › **Colas**
      (`cola_tomado_min` y `cola_sla_*` de las 24 colas con plazo fijo) y › **Repartidor** (`oferta_seg`, `entrega_codigo_intentos`, `entrega_foto_dias`, `rep_mensajes_max`).
    - **Horario:** `special_hours` con `status` (nada se borra) y `holiday_key`; `holiday_catalog` (2026–2027); **`negocio_abierto`** mira días especiales activos y la temporada.
    - **Avisos:** `notif_templates.biz_pref` y `business_notif_prefs`; plantillas `drv_oferta`, `drv_sancion`, `biz_oferta_ok`, `biz_oferta_vencio`, `ord_rep_msg`.
    - `insc_grupos_n` e `insc_grupos_dias` pasan a editables (Colas › Grupos que no abrieron lee el valor: `textoCola`).
  - **Semilla `0063_repartidor.sql`** (el plan decía 0056, de 9h): Sabor Dominicano pide código y prueba, una entrega de ayer con código, una incidencia abierta en Colas.
  - **Repartidor:** `lib/repartidor.ts` (sin el teléfono del cliente; código de recogida; la prueba con la foto de ESTE pedido o el código del cliente con tope; un
    accidente abre incidencia; la sanción frena «en línea»), `lib/repartidor-ofertas.ts` (ofrecer, «Aceptar» inicia la ruta, rechazar, vencer en el barrido; escribir
    al cliente sin teléfonos ni enlaces), `/api/repartidor/foto` (privada, `privado/e/`, sin metadatos) y `/api/entrega/foto/[id]` (cliente, negocio, equipo con
    auditoría; lo demás 404), la pantalla (oferta con cuenta regresiva del servidor, «Escribir», «Llamar al negocio», código, «Tomar foto»), el pedido del cliente
    (su código, los mensajes, la foto) y el panel (Entrega › «AL RECOGER Y AL ENTREGAR», «Ofrecer», la oferta abierta, el código de recogida y «Ya se lo di», la prueba).
    La foto va en la evidencia de la disputa (`foto_entrega` → `uncategorized_file`).
  - **Super Admin › Repartidores (ADM-DLV):** lista con filtros y cursor, 360°, incidencias (también en Colas, cola «entrega») y sanciones (`lib/repartidor-admin.ts`,
    `app/admin/acciones-repartidores.ts`). **Colas:** J/K/A/R, lote en escritorio (Tomar, Asignar a…, Soltar), «Asignar a…», el «tomado» que vence (barrido
    `colasTomado`), Colas › Ajustes (quién ve cada cola y feriados del equipo), plazos desde Configuración (también Confianza, que tenía su copia).
  - **Panel:** Horario con feriados, vacaciones, días propios y «Abro por temporada»; Más › **Lo que te avisamos** (`avisarNegocio` lo mira).
  - **Guardianes nuevos:** `entregaConPrueba`, `sinTelefonoAlRepartidor`, `diaEspecialActivo`; ampliados `ubicacionSoloEntregaActiva` («Aceptar» la oferta abre la
    ruta, solo en `aceptarOferta`), `colasEnLaBase` (reconoce `ampliar_check`), `disputaConEvidencia` (la foto); `colaConVista` y `configDesdeUnLugar` en verde.
    **`alreves9n` 24/24**; `alreves9k` al día (38/38 esperados con su caso nuevo).
  - **Ayuda:** nuevas `panel-horario`, `repartidor-prueba-de-entrega`, `admin-repartidores`, `admin-colas`; `panel-avisos` al día (ES/EN).
  - Mapa de datos al día (8 tablas; `delivery_messages` en sinPersona) y las salidas de privacidad regeneradas.
- **Probado aquí (sin Docker: Postgres 16 + PostGIS en un cluster propio :5491, un `docker exec` de mentira hacia esa base, un almacén S3 de mentira para las fotos,
  el build standalone en :3191 y el Chrome del sistema):** `node guardianes/run.mjs` → sin fallos (2469 archivos); `tsc --noEmit` limpio; `pnpm --filter web build` en
  verde; base nueva 0001–0145 con 0144 (144 migraciones) dos veces (la segunda no aplica nada) y 0144 otra vez a mano sobre una base con 0145, sin error; las semillas del
  sandbox dos veces (0063 sin cambios la segunda); **`neg9n` 50 ✓ dos veces seguidas** (entre corrida y corrida, lo que hace `correr.mjs`: las ventanas de un minuto y,
  aquí, los códigos de esta hora de 127.0.0.1 —el tope de 20 por IP y hora—); capturas a 390 y 1360 revisadas (oferta, prueba con foto, escribir, cliente, panel con el
  código de recogida, ADM-DLV lista y 360°, Colas › Ajustes, el texto de Configuración, Horario, Lo que te avisamos). Al revés: **9n 24/24**, 9k 38/38, 6a 26/26,
  8e 52/53 (el caso de `permisosMinimos` no encuentra su texto en apps.json: igual que alreves8c en la rama base, no es de 9n).
- **No corrió aquí:** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` → CI (9b; cambian capturas del panel de Entrega, el detalle del pedido y el
  Repartidor). La foto con Garage de verdad (aquí, el almacén de mentira).
- **No cerrado, con destino (LAUNCH «Fase 9 · 9n»):** lo del bloque que no entró en esta pasada (cada línea «→ 9n» abierta conserva su texto), el resto de Configuración
  en solo lectura, asignación automática y programados del Repartidor, el tope de 200 casos por vista, la temporada en el calendario de citas.
- **Para quien junte las ramas:** `guardianes/run.mjs` (tres guardianes al final, después de `mantenimientoFijo`; cambios en `ubicacionSoloEntregaActiva`,
  `colasEnLaBase`, `disputaConEvidencia`), `lib/config.ts` (claves de 9n y secciones «repartidor» y «colas»), `Configuracion.tsx` (SECCION), `lib/barrido.ts` (tres
  tareas después de `avisoApertura`), `lib/admin.ts` (`Staff.colas`), `lib/colas.ts` (`slaCfg` en cada cola, la cola «entrega»; `colasDelRol` ya no existe),
  `lib/admin-nav.ts` (dlv), `lib/avisos.ts` (`avisarNegocio`), `lib/pedidos.ts`, `lib/pedir.ts`, `app/panel/Panel.tsx`, `app/panel/acciones.ts`, `mapa-de-datos.json`
  e `inventario-datos.json` (regenerados), docs.

## Fase 9 · 9n-2 — El panel del negocio y la página del negocio (14 nov)
- **Hecho (rama worktree-9n2-panel, sobre 586c3fb):**
  - **Migración `0146_panel.sql`** (dos veces sin cambios; CHECK ampliados con `pg_temp.ampliar_check`): `business_members.accepted_at`, plantillas del equipo (`biz_equipo_acepto`, `biz_equipo_pide`,
    `equipo_quitado`, `equipo_unirse_ok/no`; el SMS de `equipo_invitado` lleva enlace), `review_requests` y `review_reply_history` (solo inserción), `reviews.reply_offer/reply_edited_at/reply_edits`,
    `announcements.audience` + «negocios», `business_posts.job_id/followers_notified_at` + link «job» y `post_en_vivo` con la vacante, plantillas `resena_pedir`, `nov_seguidores`, `nov_oferta_seguidores`,
    la bandera `panel.vistas_unicas` (apagada). Semilla `0064_panel.sql` (invitación de prueba `/e/PruebaEq`).
  - **Piezas:** aceptar la invitación `/e/{código}` y sus avisos; «Cuenta borrada» en todos los paneles (`traducirBorradas`); Pedir reseña; no-show del negocio; «quiere arreglarlo» y editar la respuesta;
    validar cupón en Hoy; Panel › Eventos con cursor; anuncios para negocios en Hoy; aviso del organizador por la auto-moderación; pedido programado que cruza la medianoche; To'Latino Negocios sin negocio;
    «Últimos 30 días» y Populares por lo más pedido; Novedades (galería, «Ver vacante», avisar a seguidores, pedidos de la oferta); «Traducir con El Compa» (vacantes y plato); vistas sin repetidos tras bandera.
  - **Guardianes nuevos (12):** invitacionDeEquipoSegura, cuentaBorradaEnTodosLosPaneles, resenaPedidaUnaVez, respuestaDeResenaConHistorial, avisoDelOrganizadorModerado, novedadAvisaUnaVez,
    programadoCruzaMedianoche, eventosPanelConCursor, negociosSinNegocio, popularesPorLoMasPedido, noShowSoloDelNegocio, anuncioDeNegociosEnElPanel; ajustados listaConTopeLoQueImporta, promesaSms, appNoAutoriza.
    **`alreves9n2` 25/25**; `alreves6j` 29/29 (caso actualizado), `alreves9f` 30/30. Mapa de datos al día.
  - **Ayuda (ES/EN):** nuevas `panel-equipo-invitacion`, `panel-resenas-pedir-y-arreglarlo`, `panel-novedades-seguidores-y-vacante`, `panel-menu-populares-y-30-dias`, `panel-hoy-cupon-anuncios-y-reservas`.
- **Probado aquí** (Postgres 16 propio :5501, build standalone :3201, `docker` de mentira): `node guardianes/run.mjs` sin fallos; `tsc --noEmit` limpio; build en verde; `pan9n2` **90 ✓ dos veces seguidas**
  (390 y 1360, ES y EN; capturas revisadas).
- **No cerrado:** cupón para seguidores, «Repetir» y «Escribir», «Quién tiene licencia aquí», pestaña Staff, horario por módulo (citas), editor de Tienda/Renta, «Si no contestas en 10 min», bandeja de SMS del
  negocio, selector «Negocios» del Super Admin (ver LAUNCH). No corrió: la foto de la invitación con almacén real, la regresión entera y la matriz de 9 dispositivos (CI).
- **Para quien junte las ramas:** `guardianes/run.mjs` (guardianes al final; `CUMPLIDAS` de promesaSms, `OK` de appNoAutoriza, regex de listaConTopeLoQueImporta), `app/panel/Panel.tsx` (Panel envuelve a PanelBase),
  `lib/panel.ts`, `app/panel/[id]/[[...r]]/page.tsx`, `lib/pedir.ts`, `lib/novedades.ts`, `mapa-de-datos.json`/`mapa_datos.sql`, `pruebas/alreves/alreves6j.cjs`, docs.

## Fase 9 · 9n-3 — El Super Admin y Configuración (14 nov)
- **Hecho (rama `worktree-9n3-admin`, sobre 586c3fb):**
  - **Migración `0147_admin.sql`** (dos veces, la segunda sin cambios; los CHECK se AMPLÍAN con `pg_temp.ampliar_check`): `noche_corte_min` y Noche editable; tipo `rsvp` en `event_stock_overrides` + trigger `events_cupo_admin`; `app.ubicacion_vivo` «scopable»; `admin_messages` (solo inserción, vaciable con la purga) y plantillas `msg_equipo` / `msg_equipo_sms`; `mod_sancion` con SMS de respaldo; `staff_mfa_log` suma `cambio_app` y `codigos_nuevos`. Semilla `0065_noche_demo.sql` (solo sandbox).
  - **Super Admin:** buscador global ⌘K (`/admin/buscar`); selector de ciudad que filtra todas las secciones (`Staff.cities`, cookie httpOnly, nunca más que el rol); Colas de a 50 con conteos exactos (adiós al tope de 200); Negocios por cursor, 5 filtros nuevos y Exportar CSV; Usuarios 360° › Enviar mensaje; ajuste del cupo de un RSVP; Mis dos pasos (`/admin/seguridad`).
  - **Guardianes nuevos:** `colasSinTope`, `ciudadDelSelector`, `mensajeDelEquipo`, `negociosPorCursor`, `dosPasosPropios`, `buscadorAcotado`, `nocheEditable`, `rsvpCupoAdmin`, `semillaNocheDemo`; ampliados `ajusteAdminConRegla` (dos caminos) y `flagPorPersona` (lee todas las migraciones desde 0140). **`alreves9n3` 40/40.**
  - **Ayuda (ES/EN):** nueva `admin-buscador-y-ciudad`; al día `admin-colas`, `admin-negocios`, `admin-usuarios`, `admin-segundo-factor`, `admin-configuracion`, `admin-eventos-y-boletos`, `admin-sistema`. Mapa de datos y salidas de privacidad regenerados (`admin_messages`).
- **Probado aquí (cluster propio :5502, `docker` de mentira, build standalone :3202):** `node guardianes/run.mjs` sin fallos; `tsc --noEmit` limpio; `pnpm build` en verde; base nueva 0001–0147 y 0147 otra vez a mano sin error; **`adm9n3` 93 ✓ dos veces seguidas** (1360 y 390; limpia lo suyo); capturas revisadas (buscador, ciudad, colas, negocios, códigos nuevos).
- **No corrió aquí:** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` (cambian las capturas de Colas, Negocios, el encabezado del admin y el estado de Noche) → CI.
- **No cerrado:** ver «Lo que no entró en 9n-3» en LAUNCH-CHECKLIST (Configuración en solo lectura salvo Noche, Reclamos/Duplicados, Catálogo, Actividad/Dinero/Comunidad, apelar desde Entrar, 5f, 4ig, 7g, 9h).
- **Para quien junte las ramas:** `lib/admin.ts` (`Staff` suma `ciudadesRol` y `ciudadVista`), `app/admin/ui.tsx` y `layout.tsx` (encabezado), `lib/admin-colas.ts` (`listaCasos` devuelve `hay`, `pag`), `lib/admin-negocios.ts`, `lib/noche-reservas.ts`, `lib/ruta.ts`, `lib/apelaciones.ts` (`sinSms` solo en advertencias), `guardianes/run.mjs` (nueve guardianes al final; `textos-armados.json`), `config.ts` (clave `noche_corte_min`), `mapa-de-datos.json` e `inventario-datos.json`. Si 0146/0148 también usan 0147, renumerar.

## Fase 9 · 9n-4 — El dinero y los flujos que faltan (14 nov)
- **Hecho (rama `worktree-9n4-dinero`, sobre 586c3fb; en paralelo con 0146 · pantallas del panel y 0147 · Super Admin / Configuración):**
  - **Migración `0148_dinero2.sql`** (dos veces: la segunda no cambia nada; los CHECK se AMPLÍAN con `pg_temp.ampliar_check`): `help_requests.replacement_op_id`
    y `.warranty_op_id` (únicos: una reposición y una garantía por solicitud; una vez puestas no cambian), `.outside_pending_at` (lo pone la base al pasar a
    «pending») y `.outside_reminded_at`; `outside_refund` admite `expired` y `closed_by` admite `system`; `payments_cobro_hasta_lo_retenido` (NOT VALID: de un cobro
    nunca se cobra más de lo retenido, para todo lo nuevo); `delivery_settings.auto_offer`; Configuración: `rep_auto_intentos` (3) y `rep_programado_min` (30) en
    Repartidor, `ayuda_devuelto_dias` (14) en Iglesias, Bienes Raíces y Autos; 9 avisos nuevos (ES/EN). Sin semilla nueva (no hizo falta).
  - **3-D Secure en todos los flujos que cobran con la persona en la app (L1685):** citas (depósito), visitas, inscripciones, noche, fiestas, viajes, evento
    privado, mudanza (precio cerrado), estimado y «algo más» pasan quien paga (`usuario`) y devuelven la hoja (`bancoPide` en `lib/pagos/verificacion.ts`);
    cada pantalla (`useVerificacion` + `{V.hoja}`) vuelve a enviar lo MISMO con la MISMA clave: la pasarela reusa el cobro verificado. Un bug de 9k: una
    verificación pendiente cuyo intento quedó en `requires_payment_method` (tarjeta rechazada o autenticación fallida) volvía a abrir la hoja; ahora solo
    `requires_action` la abre y la otra queda en «fallo» (otro intento, otra llave).
  - **«Volver a Pro» con la hoja en Tu plan (L1688)** y un bug de dinero: la verificación de «Volver a Pro» desde Free (status `ended`) no activaba Pro
    (`completarRenovacion` no aceptaba `ended`): el banco cobraba y el plan seguía en Free. Ahora el período empieza ese minuto, con `back_to_pro`; en sesión no
    sale además el aviso con el enlace; al confirmar solo se vuelve a leer el plan.
  - **Mercado (L487, L488, L490):** «Pedir OK por $X más» (la base calcula lo que falta), «Está bien, cobrar» = el OK: retiene esos $X como cobro `extra` en la
    MISMA tarjeta (con 3-D Secure) y `liquidarMercado` cobra lo real entre las dos retenciones sin pasar de lo de cada una (comisión en proporción); «No, que
    corten»; sin el OK no se marca listo; el sustituto por libra (se pesa con su foto); el recordatorio a los 10 min de mandar el peso (una vez por peso).
  - **Reponer sin costo (L339):** en el panel al responder la ayuda («Reponer sin costo») y en Colas («Resolver y reponer»): un pedido NUEVO de $0
    (`pay_mode 'none'`, $0 por plato, fuera del tope de Free) aceptado, con su código de entrega (sigue el flujo del negocio y del Repartidor). «Resolver y
    devolver» también para la ayuda de un pedido de comida (con el permiso de dinero).
  - **La visita de garantía a $0 (L458):** «Reservar la visita sin cargo» en la ayuda de Auto y Hogar cuando el negocio aceptó «que vuelva sin cargo» → el
    Booking del mismo servicio con `?warr=H-…`: $0, sin depósito ni tarjeta; el servidor revisa que la garantía es suya, del mismo negocio y servicio,
    aceptada y sin usar.
  - **4if «Me lo devolvieron» (L561):** recordatorio a la mitad y cierre solo a los `ayuda_devuelto_dias`, avisos neutros; la persona lo ve en su solicitud.
  - **Repartidor (L1787):** «Ofrecer solo a los repartidores» (Panel › Entrega; `lib/repartidor-auto.ts` en el barrido): la oferta de 9n sin que nadie la
    mande, con tope y un aviso «Nadie tomó el pedido»; los programados se ofrecen y se recuerdan 30 min antes de estar listos.
  - **Recordatorio de la visita del plan (L437):** confirmado que sale para la visita de $0, y ahora con «Mañana es tu visita» y su franja (`plan_visita`).
  - **Noche (L501):** la noche especial dice el precio real del boleto más barato a la venta y su fecha («Desde $15 · BOLETO · MAR 17 NOV»), «Comprar boletos».
  - **Guardianes nuevos:** `tresDSecureEnTodos` (la clase: todo cobro en sesión con quien paga, todo «accion» por la hoja, cada pantalla con la hoja y la
    misma clave, solo `requires_action`, «Volver a Pro»), `okPorMas`, `sustitutoPorLibra`, `reponerSinCosto`, `garantiaSinCargo`, `devueltoSeCierra`,
    `repartoSolo`, `recordatorioVisitaPlan`; ampliado `capturaMercado`. **`alreves9n4` 42/42.**
  - **Ayuda (ES/EN, FAQ):** `pagar-con-tarjeta`, `pedido-del-mercado`, `ayuda-con-el-pedido`, `panel-ayuda-y-soporte`, `ayuda-con-la-visita`,
    `iglesias-horarios-y-ayuda`, `panel-entrega`, `repartidor`, `planes-del-hogar`, `plan-pro`, `noche-en-la-ficha`, `admin-soporte`, `admin-configuracion`.
- **Revisión de seguridad (dinero, cuentas, permisos):** cada monto lo decide el servidor (la hoja muestra el de la verificación; el OK por más sale de
  `totales`; la reposición y la garantía son $0 en el servidor, no en la pantalla); llaves: el OK por más `merc-mas-<op>-<monto>-<tarjeta>`, la captura por
  intento (`cap-<pi>`), una reposición y una garantía por solicitud (índice único + `… is null` en el update), «Volver a Pro» nunca vuelve a cobrar al
  confirmar y `completarRenovacion` anota una vez por `idem_key`; lo cobrado ≤ lo retenido (CHECK nuevo) y lo devuelto ≤ lo cobrado (el de siempre);
  permisos: el OK por más solo con la tarjeta del primer cobro de ESA persona (`p.user_id = $2`), «No, que corten» y la garantía solo de la persona dueña, reponer
  con el acceso «Hoy y pedidos» del negocio de la ayuda o `colas:aprobar` con las ciudades del rol (y auditoría), «Ofrecer solo» con el acceso de Entrega
  (auditado); la oferta sola es la de 9n (sin el teléfono del cliente); la verificación sigue siendo solo de quien paga (payment_actions).
- **Probado aquí (Postgres 16 + PostGIS en un cluster propio :5503, un `docker exec` de mentira hacia esa base, un S3 y una moderación de mentira, el build
  standalone en :3203 y Chromium de Playwright):** `node guardianes/run.mjs` → sin fallos; `tsc --noEmit` limpio; `pnpm --filter web build` en verde; 0148 dos
  veces sin cambios (base 0001–0148); **`din9n4` 90 ✓ dos veces seguidas** (390 y 1360, ES y EN; A cita con 3-D Secure y «No fui yo», B estimado rechazado → otra
  tarjeta → la hoja y «algo más», C fiesta, mesa VIP e inscripción, D mercado completo, E «Volver a Pro», F reponer y la garantía, G barrido: plan, «Me lo
  devolvieron», Repartidor, noche especial); **`alreves9n4` 42/42**; el contrato con stripe-mock (por primera vez fuera del CI: 32 ✓); las de dinero que ya
  existían: pagos2d 22 ✓, din9k 39 ✓, est4d 38 ✓, merc4p 20 ✓ (con una espera que le faltaba antes de pesar: la página aún no mostraba el campo).
  Los flujos que este bloque tocó, otra vez en el navegador: cit3b 36 ✓, fie4v 26 ✓, noc4c 26 ✓, ins4e 41 ✓, tra4w 17 ✓, evt6i 76 ✓, neg9n 51 ✓, ayuda2i 13 ✓,
  plan2m 15 ✓, env4q 23 ✓ (le faltaba guardar SU dirección: en una base nueva Marisol no tenía ninguna; `direccion()` como pide 9b-3) y vis4ie 53 ✓ (falló
  mientras din9n4 dejaba una visita de prueba con `what` inventado que tumbaba Panel › Visitas: la prueba ahora la arma como la app y se repararon las
  filas que había dejado).
- **Al revés que ya existían, contra el código de 9n-4:** 9k 38/38, 9n 24/24, 9b3 39/39, 5i 26/26, 6c, 6d y 6i sin ✗. `alreves7b` sale con 2 ✗ que NO son de
  este bloque (sus casos cambian 0117_soporte.sql y 0122_compa_copiloto.sql, pero 0144 de 9n redefinió esas funciones y el guardián ya mira la última): queda
  en LAUNCH → 9b.
- **No corrió aquí:** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` → CI (cambian las capturas de las pantallas que cobran, el pedido del
  mercado, Tu plan, Entrega y la ficha de Noche). Visitas (Booking con depósito), viajes, evento privado y mudanza con 3-D Secure: por el guardián y `tsc`, sin
  su propia prueba de navegador en din9n4.
- **No cerrado, con destino (LAUNCH):** el envío del mercado con el repartidor propio (L489, sigue → 9n: el Repartidor trabaja con pedidos de comida); las
  rentas con 3-D Secure al recogerlas (línea nueva → 9q: se cobran sin la persona en la app).
- **Para quien junte las ramas:** `guardianes/run.mjs` (nueve guardianes después de `tresDSecure`; `capturaMercado` ampliado), `lib/config.ts` (tres claves
  después de las del Repartidor de 9n), `lib/barrido.ts` (dos tareas después de `colasTomado`), `app/panel/Panel.tsx` (el hook `V` y «Volver a Pro»),
  `app/panel/Entrega.tsx`, `Pedidos.tsx`, `MercadoPanel.tsx`, `acciones-*.ts`, `app/admin/Colas.tsx` y `acciones-colas.ts` (Resolver y reponer / devolver de
  un pedido), `lib/pedidos.ts` (`autoOffer`), las pantallas que cobran, `docs/ayuda/admin-configuracion.md`, migración 0148.

## Fase 9 · 9b-3 — la confirmación del CI con todo junto (14 nov)
- **Qué:** 9g, 9h, 9i, 9j, 9k, 9l, 9m, 9n, 9n-2, 9n-3, 9n-4 y 9o juntos en `claude/vibrant-franklin-krutwa`; la confirmación completa del CI (decisión AD:
  hito de cierre de 9b-3) — tipos, build, guardianes, seguridad, al revés, todas las fases, barajada, dos veces seguidas y los 9 dispositivos.
- **Primera vuelta (43630040130):** 12 rojos + al revés 30/31. **Segunda (43643679396):** 4 rojos (vec9m en las tres, cit3e, compa7d y merc4p en la
  barajada); dispositivos, seguridad, al revés y build en verde.
- **Clases cazadas y su guardián** (al revés `alreves9b3` 44/44):
  - `ciudadSinAmbiguedad` — el selector de ciudad del admin (9n-3) también dice «Hazleton…Reading»: un `getByText('<ciudad>')` sin acotar choca.
  - `retiradoNoCuenta` — nada se borra: una prueba que retira repartidores no puede buscarlos por teléfono sin mirar el estado.
  - `precioVuelve` — una prueba que cambia el precio de un producto de la semilla lo devuelve al salir (ret4n subía la pierna 10¢ y merc4p contaba $36.57).
  - Noche en `eventosSoloListables` (`lib/noche-publico.ts` lee fechas solo listables; al revés `alreves6b` 32/32).
  - El resto eran precondiciones de orden que ahora cada prueba se pone (free2b y menu2b abren Sabor; adm4m pide la cita de salud de sal4j; vec9m pone la
    etiqueta antes de abrir la ficha; cit3e espera el cierre —reembolso y cierre son dos escrituras—; compa7d usa a la dueña de la cita).
- **Sigue:** la tercera vuelta de confirmación; en verde → `main` y `pruebas` avanzan (el sandbox recibe de golpe las migraciones 0133–0148: mirarlo).

## Fase 9 · 9n-5 — los plazos de la Fase 4 se cambian desde Configuración (15 nov)
- **Qué:** las 12 claves que estaban en SOLO LECTURA (`insc_*`, `ninos_purga_dias`, `fe_responder_h`, `vis_*`, `sp_*`, `ayuda_negocio_h`) ahora las dicen
  las pantallas, el panel, el Super Admin, la analítica y los avisos con el valor de Configuración; la migración **0149** las abre y cambia 7 plantillas de
  aviso a `{horas}`/`{hours}`. Helper `lib/plazo-txt.ts` (horasTxt/diasTxt). Las ayudas dicen que los plazos los fija To'Latino en Configuración.
- **Arreglado de paso:** la ayuda con el pedido y la de las citas vencían a 24 h fijas aunque escalaban con la clave (ahora las dos con la clave); la purga de
  notas de Salud borraba también lo del niño y la casa con su plazo (ahora cada razón con el suyo).
- **Guardianes:** `plazoAbiertoSeLee` (el número de fábrica no vuelve a un texto), `purgaPorRazon`; al revés `alreves9b3` 47/47. `tsc` limpio; 0149 aplicada
  dos veces sobre una copia local en 0148 (idempotente). Hecho en paralelo con dos ayudantes (visitas; salud y pro) y juntado aquí.
- **No corrió aquí:** e2e (sin Docker) → CI.

## Fase 9 · 9n-6 — más plazos a Configuración y la confirmación del CI (15 nov)
- **9n-6 (0150_plazos_abiertos2):** el día de pago de eventos (`evt_pago_dia`) se edita y el panel/Super Admin dicen ese día; sección nueva
  «Hogar y Auto» (`sol_pre_h` 24 h, `sol_pq_h` 48 h, `sol_em_min` 15 min, `apartado_h` 48 h: motor y textos); `free_ops_cap` entra al catálogo
  (las 12 lecturas pasan a `cfg_int`); Analítica dice los días de `lic_aviso_dias`. `pagos_banco_dia` sigue fijo (decisión del fundador).
  Abierto: `tax_rules` editables (pide pantalla nueva: el fundador decide), el apartado de rentas 48 h, la validez de 7 días del pre-estimado.
- **Confirmación completa (run 43659397723, f9c80e4):** todas las fases y los 9 dispositivos en verde. Dos rojos de independencia:
  · barajada: `sis9j` — un «teléfono libre al azar» de din9n4 tomó el de Rita (570-555-0961). Arreglo: `pruebas/lib/telefonos-fijos.cjs`
    (los generadores saltan los números que otra prueba usa por su número). Guardián `telefonoAlAzarRespetaFijos`.
  · dos veces seguidas: `pan9n2` — la segunda vuelta corrió a las 10:51 PM del Este y el SMS «tx» quedó en silencio. Arreglo: apaga el
    silencio de quien invita. Guardián `smsFueraDeSilencio`. Al revés 50/50.
- Siguiente: CI dirigido (9n-5 + 9n-6 + los dos arreglos) y, en verde, la confirmación completa otra vez para cerrar 9b-3.

## Fase 9 · 9n-7 — licencias de todas las categorías y apelar desde «Entrar» (15 nov)
- **Licencias (LAUNCH 4ig):** el barrido devuelve a la cola «Licencias» las de TODAS las categorías (no solo Iglesias, Bienes Raíces y Autos), 14 días
  antes de su revisión (vencida = prioridad alta); nadie la marca vencida sin mirarla. Índice parcial **0151** (`licenses_vence_idx`). Guardián
  `licenciasVuelvenTodas`; adm4ig §3 con la CDL de un chofer.
- **Apelar una suspensión o un baneo (LAUNCH 5d):** tras el código por SMS, «Entrar» muestra el bloque «APELAR» (20–500 letras, una vez, 14 días) con una
  ficha firmada de 30 min (HMAC, sin sesión; `/api/cuenta/apelar`); si ya apeló, dice cómo va. La respuesta a esa apelación sale por SMS (**0152**: apel_lifted
  y apel_upheld con `sin_push`; el resto de apelaciones sigue sin SMS). Guardián `apelarSinSesionConFicha`; e2e nuevo `apl9n7`; al revés `alreves9n` 27/27.
- **Rangos (LAUNCH 5f):** Gamification › Rangos › «Cambiar lo que pide» (Vecino a Comandante): puntos mínimos (entre el rango de abajo y el de
  arriba), el número de la condición y los días de Comandante, con vista previa Antes/Ahora ES/EN, motivo y auditoría; el texto «Para subir» se
  reescribe con `reqDeCond` (lib/puntos-comun.ts). Guardián `rangoDiceLoQuePide`; com5f §12b (lo deja como estaba).
- **El Compa · CUÁNDO (LAUNCH 7f):** «Fuera de tu horario», «Si no contestas en N min» y «Siempre, al instante» en Panel › El Compa (y la fila
  de Mensajes dice el elegido). La espera vive en `chat_threads.compa_wait_until` (**0153**, con índice parcial) y el barrido la pasa al turno;
  `compa_auto_espera_min` se abre en Configuración. Guardián `compaRespuestaAuto` actualizado (al revés `alreves7f` 41/41); compa7f §12.
- **Soporte · copiloto (LAUNCH 7g):** «Resolver» y «Resolver y devolver» con el texto del borrador marcan `from_draft` y el borrador queda «tal cual» o
  «editado», como «Enviar» (`borradorDe`/`usarBorrador` en lib/soporte-equipo.ts). Guardián `copilotoSoloBorrador` cubre los tres (al revés 44/44); compa7g §3b.
- **Anuncios para negocios:** Super Admin › Textos › Inicio › «¿A QUIÉN?» › Negocios (sale en Hoy del panel, nunca en el Inicio); cms9f lo crea por la pantalla.
- **Campañas · «Free con N ítems»:** chips «ÍTEMS EN SU CATÁLOGO» (5/10/20/50+, solo dueños) en Crecimiento › Campañas; la cuenta usa `items_biz_idx` con `limit`. cre9h lo comprueba.
- **Publica · «Publicar otro negocio» (L49 (11)):** en A1 publicado; el publicado pasa a `onboarding_drafts_done` (**0154**, solo inserción, en el mapa de datos) y el borrador empieza en blanco; tope 5 negocios por cuenta. publica.cjs lo prueba.
- **Citas · la última cita termina antes de cerrar (L128):** Panel › Citas › «LA ÚLTIMA CITA TERMINA» (al cerrar, 15/30 min, 1 h antes; **0155**
  `booking_policies.close_cut_min`); `huecos` lo aplica. Guardián `corteDeCitas` (al revés 29/29); svc3a y cit3b lo prueban.
- **Negocio 360° · «Mensaje al dueño»:** la misma pieza que «Enviar mensaje» de Usuarios 360° (app o SMS, sin enlaces, motivo interno, 3 al día por
  negocio); plantillas `biz_msg_equipo` / `biz_msg_equipo_sms` (**0156**, el push abre su panel); `admin_messages` con target_kind 'business'. adm9n3 lo prueba.
- **Negocio 360° · «Destacar»:** fija el negocio en Destacados de su ciudad como Crecimiento › Destacados (mkt:editar, tope por ciudad de la base); adm9n3.
- **Negocio 360° · «Invitar a reclamar»:** SMS `reclamar_invita` (**0157**) al teléfono de un negocio sin dueño con el enlace a /recuperar/{id}; una vez cada 30 días; adm9n3.
- **9b-3 CERRADA:** la confirmación completa (run 43683346297, ffb35d0) salió toda en verde: todas las fases, barajada, dos veces seguidas, al revés,
  los 9 dispositivos, seguridad y la tubería completa.
- **9n-7 · CI dirigido:** run 43698497496 (681b429) con adm4ig adm9n3 apl9n7 cit3b cms9f com5f compa7f compa7g cre9h publica svc3a com5d msg2p llave8d y todas las al revés.
- **9n-7 · en verde y arriba:** compa7g falló una vez (comparaba el from_draft unido con «t»; Postgres da «true»): arreglada la prueba + guardián
  `boolUnidoEsTrue`; rerun 43702153876 todo en verde. 9n-7 pasó a `main` y `pruebas` (4189bd6).

## Fase 9 · 9n-8 — Negocios: Posibles duplicados, Reclamos y los cambios sensibles de un negocio (15 nov)
- **Migración 0158** (`0158_negocios_duplicados.sql`): `biz_norm_name` / `biz_first_word` (inmutables, sin acentos) + índice GIN de trigramas;
  `business_dup_pairs` (DERIVADO: lo escribe el trigger `businesses_dup` al crear o renombrar; tope 50 vecinos por el índice) y
  `business_dup_decisions` («No es duplicado», solo inserción, en el mapa de datos como equipo); `removed_reason` 'transfer' y 'merged';
  plantillas `biz_categoria_cambio`, `biz_transferido_nuevo`, `biz_transferido_antes` (support), `biz_fusionado`.
- **Negocios › Lista · Posibles duplicados · Reclamos** (prototipo secNeg): `lib/admin-negocios-dup.ts` (pares con los nombres de hoy y su estado,
  cursor; reclamos por decidir + «Sin reclamar» con su última invitación); `app/admin/DupFila.tsx` (Fusionar con «QUEDA», No es duplicado).
- **Cambios sensibles de un negocio:** se PIDEN en el 360° (Cambiar categoría, Transferir dueño por teléfono) o en Posibles duplicados (Fusionar):
  `pedirFusion` / `pedirCategoria` / `pedirTransferencia` / `noEsDuplicado` (acciones-negocios.ts, `encolarCambio`); se APLICAN en Colas por OTRA
  persona (`decidirCambio` → `lib/negocio-cambios.ts`: fusionar mueve reseñas sin chocar, seguidores y guardados, deja el duplicado «merged» y su
  ficha redirige; no se aplica con operaciones abiertas ni Pro pagado; transferir con dueño, solo Admin). El 360° dice lo que espera en la cola,
  «Fusionado con …» y en Confianza sus posibles duplicados. Colas muestra el caso (queda/se cierra, de → a, dueño hoy → nuevo).
- **Guardián `cambioNegocioOtraPersona`** (al revés alreves9n 35/35). **e2e `neg9n8`** (escritorio pide, teléfono aplica). Ayuda: admin-negocios.md.

## Fase 9 · 9n-9 — Usuarios: cifras de cada persona y pestaña Dinero (15 nov)
- **Migración 0159** (`0159_usuarios_cifras.sql`): `user_stats_cache` (DERIVADO: pedidos, citas, reportes por persona; lo recalcula
  `user_stats_refresh` desde los triggers de `operations` y `content_reports`; en el mapa de datos: se borra con la cuenta) + índices
  `payments_usuario_idx`, `users_promotores_idx`, `community_profiles_rango_idx`.
- **Lista de Usuarios:** QUIÉN › Promotores; ORDENAR › Más compras / Más reportes / Rango; columnas RANGO y ACTIVIDAD; «Con reportes» ya no
  recorre los reportes (usa la cifra).
- **Usuarios 360°:** PEDIDOS · CITAS · RANGO arriba (`cifras360`) y la pestaña **Dinero** (`dinero360`, solo tx:ver).
- **Guardián `cifrasUsuarioDerivadas`** (al revés alreves9n 38/38). **e2e `usr9n9`**. Ayuda: admin-usuarios.md.

## Fase 9 · 9n-10 — Días especiales y temporada en todos los calendarios (15 nov)
- **Clase cazada:** el estado abierto/cerrado miraba feriados, vacaciones y temporada, pero los calendarios a futuro armaban el día con el horario de la
  semana. Ahora `lib/dias-especiales.ts` (`diasEspeciales`, `horasDelDia`, `rangosDia`, `cerradoElDia`) y, en SQL, `negocio_dia_cerrado` (**0160**,
  + índice de special_hours por negocio y fechas). Lo usan citas (temporada), reservaciones, pedidos programados de hoy, Noche, apartados, rentas,
  mercado, planes, entrevistas y visitas.
- **Guardián `calendarioConDiasEspeciales`** (al revés alreves9n 42/42; `diaEspecialActivo` apunta ahora a lib/dias-especiales.ts). cit3b §6a.
- **neg9n8:** el CI falló porque la prueba buscaba `<button>` y los del sistema de diseño son `[role=button]`: arreglada + guardián `botonEsRole`.

## Fase 9 · 9n-11 — Novedades que se repiten (15 nov)
- **Migración 0161:** `business_posts.repeat_days / repeat_min / repeat_dur / repeat_until / repeat_n` (con su check) y las funciones
  `novedad_siguiente` (se salta los días cerrados con `negocio_dia_cerrado`) y `novedad_fin` (3/6/24 h o hasta que cierra).
- **Panel › Novedades:** «Repetir» con las piezas del diseño (QUÉ DÍAS, O ELIGE LOS DÍAS, Sale a las, CADA VEZ SE VE, HASTA CUÁNDO, la nota de lo que
  pasará y el aviso de seguidores); VENCE no sale cuando se repite; la lista dice «Se repite · L · X · V · 11:00 AM · próxima …».
- **Barrido `novedadesRepetir`** (`repetirNovedades`): la que dejó de verse vuelve a salir el siguiente día que toca (misma publicación).
- **Guardián `novedadRepetida`** (al revés alreves9n 45/45). nov2g lo prueba (editor → base → barrido → lista). Ayuda: panel-novedades-seguidores-y-vacante.md.
- **9n-12 · «Escribir» en una novedad:** link_kind 'msg' (**0162**), chip «Escribir» en el editor y en la ficha «Escríbele a {negocio}» → Mensajes (solo con dueño); nov2g.
- **9n-8 a 9n-12 · CI dirigido en verde** (runs 43709354083 + 43713010446: neg9n8, usr9n9, cit3b, nov2g, pan9n2, adm9n3, datos9d, rec1j, admin1i, usr1l, rsv2e, menu2b, noc4c, apt4f, renta4f, merc4p, plan4f, jobs2g, vis4ie, neg9n y al revés). Pasan a `main` y `pruebas`.
- **9n-13 · Quitar acceso al panel** a alguien del equipo desde el 360° › Equipo (**0163** `panel_off_at/by/reason` + avisos `biz_equipo_sin_acceso/con_acceso`); accesoPanel y misNegocios lo respetan. Guardián `panelSinAccesoBloqueado` (al revés 47/47); neg9n8 §4b.
- **9n-14 · Visitas con las horas de un día especial:** **0164** `negocio_rangos_dia`; visitas-inm (horas y plazo) la usan; guardián ampliado (al revés 48/48); vis4ie §10b. L252 «Devolver dinero» ya existía (cerrada).
- **9n-15 · Publica tu negocio sigue al Catálogo:** subcategorías nuevas salen y las apagadas no (`catalogoVivo`); cat1m §4b. Configuración en solo lectura: cerrada (solo `pagos_banco_dia`, por decisión).
- **9n-16 · Editor de lo que se renta** en el panel (Hogar y Transporte): agregar, editar, encender/apagar y quitar; unidades nunca por debajo de las vivas. renta4f §10–11.
- **9n-17 · Puerta: buscar por nombre con índice** (**0165** `tickets.door_name` derivado + trigramas); la carga `eventos` lo mide.
- **9n-18 · Negocio 360° › Operación** (del prototipo): cifras 90/30 días, vistas 7 días, toques, Free, operaciones por tipo → Transacciones. neg9n8 §6.
- **9f-4a · Super Admin en inglés, la base:** contexto de idioma (`idioma-admin.tsx`, `useE()`), marco, menú y confirmar con motivo. adm9n3 §11. Siguen los módulos.
- **9f-4b…m · Todo el Super Admin en inglés** (≈60 pantallas; seis agentes en paralelo, revisado y subido por grupos). Queda en español lo que arma el servidor (va con 9f-3).
- **9f-4n · Lo que faltaba del Super Admin en inglés:** el hilo de Contenido (HiloAdmin), el correo de la bandeja, las pestañas de categorías de Negocios,
  el primer Admin (Arranque) y «Sin acceso»; Eventos y el 360° pasan el idioma a los ayudantes de la cola (estado, acciones del organizador, ficha).
  Al revés `analiticaSinPersonas` apunta a la nota bilingüe (CI 43740085317 lo cazó).
- **9c-2 · Contraste AA del texto gris:** ink al 40–55 % → ink al 60 % (5:1 sobre blanco y papel) en el sistema portado (`contraste()` en
  `scripts/portar-sistema.mjs`), en las pantallas y piezas propias (`scripts/contraste-aa.mjs`: style color, Icon color, text-[…], text-ink/40…55; sombras,
  bordes, fondos y contornos no) y en los tokens (`--tl-text-muted`, `--tl-text-faint`). Guardián **`contrasteTexto`** (al revés **alreves9c** 6/6, con un caso
  al derecho: una sombra no es texto). Falta: que axe lo confirme en las pantallas clave y aprobar las capturas nuevas (cambia el gris en todas).
- **9c-3 · Flechas entre pestañas:** ← → en círculo, Inicio y Fin (`__ds_scope.__flechas` por el script de portar; `flechas()` en `lib/tec.ts`; PanelBloques).
  a11y9c lo prueba en la ficha.
- **9c-4 · Hojas con teclado:** `app/FocoHojas.tsx` en el layout raíz (foco al abrir, Tab que da la vuelta, Escape, foco de vuelta) para toda hoja
  `role="dialog" aria-modal="true"`; 8 hojas con nombre nuevo, 7 capas que pasan a diálogo. Guardián **`hojaAccesible`** (alreves9c 11/11); a11y9c lo prueba
  en «Tu pedido». Foco visible sobre oscuros: medido (Brand 4,6 / 4,2 / 3,8 : 1 sobre tinta, dark-2, dark-3; mínimo 3): cerrado sin cambio.
- **9c-5 · Nombres EN de los íconos sin texto:** el script de portar agrega `lang` a los componentes que nombran sus íconos (el EN no salía nunca) y
  `ReplyThread` lo pasa a cada respuesta; las pantallas lo pasan (Super Admin, Entrar, Publica, Hoy, El Compa, Comunidad, reseñas).
- **9c-6 · Anchos extremos:** trabajo nocturno **`anchos`** del CI: toda la punta a punta en iPhone SE, iPad y escritorio 1024 (a mano `anchos=si`); en
  «tuberia»; `tuberiaNoSeSalta` lo vigila.
- **9c-7 · Íconos que no existían** (camera, undo, download, chevronUp, receipt) → del sistema; guardián **`iconoExiste`**.
- **9c-8 · Sin salto al cargar (CLS):** las pantallas pintaban primero el teléfono (useState(390)) y saltaban al escritorio: CLS 0,91 en el Inicio del
  Super Admin y 0,26 en Mi cuenta (1280). Ahora el primer pintado usa la estimación del servidor (`lib/ancho.ts`: cookie `tl_ancho` o el tipo de
  dispositivo) por `<AnchoInicial>` en los layouts de la app, el panel y el Super Admin; un solo `useAncho()` (`app/_ancho/Ancho.tsx`). Guardián
  **`anchoSinSalto`**. Presupuesto de CLS de vuelta a 0,1 en las seis pantallas y `axe-conocidas.json` vacío (el CI lo confirma).
- **CI 43746703196** (dirigido + 9 dispositivos): las capturas cambian < 0,11 % con el gris nuevo (siguen aprobadas); axe ya sin
  `scrollable-region-focusable` y con un solo contraste (BottomNav al 34 %, corregido); com5a y sal4i usaban «Escape no cierra» (ahora sí cierra:
  pruebas al día); a11y9c encontró que el foco no volvía a la barra desmontada (FocoHojas la busca por su `data-screen-label`).
- Alreves9c: **17/17** (contrasteTexto, hojaAccesible, tuberiaNoSeSalta, iconoExiste, anchoSinSalto).
- **9n-19 · Impuestos en el Super Admin (L471):** Planes › Impuestos (vigente + programadas por ciudad y categoría; «Programar cambio» con motivo →
  regla nueva desde ahora / el 1.º del mes que viene / el 1.º de enero). **0166** (created_by, reason, solo inserción). `firmaTotales` de Autos con la
  regla vigente de cada ciudad (antes max(id)). Guardián **`impuestoSoloNuevo`** (alreves9c 20/20); adm9n3 §12; ayuda admin-planes.
- **9c-8b · El otro salto:** SeccionesMovil del Super Admin, el AppShell, el pie legal, Recuperar, Licencia y la página de acceso decidían escritorio con
  useState(false) + matchMedia; ahora con el ancho estimado (`anchoSinSalto` caza los dos patrones). CI 43749374007: Mi cuenta 0,26 → 0,02 y el panel 0,05 →
  0,002 en escritorio; axe en cero en los 8 dispositivos con la lista de «conocidas» vacía.
- **9j-2 · Web Vitals de teléfonos reales (L1629):** `Vitales.tsx` en el layout raíz → `/api/vitales` → **0167** `web_vitals_dia` (por día, familia de ruta,
  perfil y métrica; tres cubetas; sin personas) → Sistema › Salud. Flag `app.vitals`. Guardián **`vitalesSinPersonas`** (alreves9c 26/26); sis9j §9.
- **Regresión completa CI 43749374007 (ff687fd):** 176/179 de punta a punta; al revés 57/59 (casos viejos que apuntaban al layout y a la lista de axe:
  reapuntados). Los tres rojos, arreglados en 3f99c21: a11y9c (la barra que abre «Tu pedido» se desmonta en el mismo instante: FocoHojas recuerda el último
  foco con focusin), disp9b (el teléfono por defecto de la prueba usaba User-Agent de escritorio y la cookie del ancho se escribía a los 400 ms: ahora al
  montar, y la prueba emula el teléfono completo) y sop7b (dependía de casos vencidos de otras pruebas: ahora vence uno propio). Escritorio 1280: el Inicio
  del Super Admin seguía en CLS 0,91 por SeccionesMovil (arreglado en 1d06358). Siguiente corrida completa: 43759335047.

- **9j/9k · Reporte diario completo (L1633, L1635):** el reporte lleva la conciliación de ayer con Stripe («cuadra», «no cuadra · $», «no corrió ayer»)
  y el último despliegue (commit, resultado, entorno) de `deploy_releases`. Analítica › Dinero suma «CONCILIACIÓN CON STRIPE» del período (solo para
  quien ve todas las ciudades: Stripe no sabe de ciudades). Ayuda: reporte-diario.md y admin-analitica.md. ana9g lo comprueba contra la base.
- **9f · Copiloto en el idioma del equipo (L1105):** resumen, siguiente paso y avisos en el idioma del Super Admin (`tl_lang`); el borrador, en el de la
  persona. compa7g. En curso: el inglés completo de 143 artículos de ayuda (L992/L1607), en cuatro grupos.
- **9f-5 · La ayuda (L992, L998, L1607):** inglés completo en los 210 artículos (165 rehechos en cinco grupos, español intacto byte a byte; 78–105 % del
  español). Editor por sección en Textos y páginas › Ayuda (0168 `help_edits`, `repo_sha256`, `ayuda_editar`/`ayuda_deshacer`, `ayuda_indexar` que no pisa lo
  editado mientras el archivo no cambie); `/api/ayuda/ediciones` + workflow «Ayuda editada»; guardián `ayudaEditadaRepoManda` (alreves9f5 10/10, con
  `depositoRetenido` ampliado a frases partidas); e2e `ayu9f5`. Corregidos de paso: el depósito de Hogar/Auto, las opciones de cobro de Fiestas y Wallet.
- **9n-20 · «Ver como cliente» de un negocio no activo (L147):** ficha(…, { equipo: true }) solo para el equipo con neg:ver, desde el 360° (`?equipo=1`),
  con aviso VISTA DEL EQUIPO (InfoCard), auditada y sin contar como vista. Guardián `fichaOcultaSoloEquipo` (alreves9n20 5/5); e2e `neg9n20`.
- **9n-21 · Cupón para seguidores (L311):** 0169 (`business_posts.kind 'cupon'` + código/descuento/mínimo/usos, `operations.discount_cents`, `follower_coupon_uses`
  con trigger de vuelta); `lib/cupon-seguidores.ts` (cuponDe en la transacción de crearPedido); pago con «Código de cupón» del prototipo; ficha, pedido, panel,
  Transacciones y el editor del panel. Guardián `cuponDelServidor` (alreves9n21 9/9); e2e `cup9n21`; ayuda (panel-novedades, novedades, pedir-comida).
- **Confirmación completa CI 43759335047 (3f99c21) en verde** → main y pruebas en 3f99c21. Cerradas en LAUNCH las 15 líneas que esperaban esa corrida (contraste
  axe, CLS, a11y9c, datos9d, leg9e, cms9f, ana9g, sis9j/ayu4m, cre9h, din9k, ciu9i, avi9l, dir9m/vec9m, neg9n, evt6b-6c/evt6i). Corrida dirigida de lo nuevo
  (reporte, ayuda, editor, ver como cliente, cupón): 43769029540.
- **CI dirigido 43769029540: 3 rojos arreglados (625ca52).** neg9n20 (el negocio nuevo no tenía `business_stats_cache`, la ficha la une → 404), cup9n21
  (`psql -At` también imprime «INSERT 0 1»: el id del cupón salía roto) y alreves7g (ancla vieja). La misma clase estaba en push8c y dir9m (este anotaba
  códigos postales ya existentes como nuevos y los borraba al final). Guardián `returningConPsqlCallado` + caso al revés en alreves9n21 (10/10).
  Corrida dirigida nueva: 43773487639.
- **C-005 · Ficha nueva del negocio (Belleza Pro)** — canvas `tolatino-master+` (`project/entrega/cambios.md`, paquete C-005 → C-008). `FichaNueva.tsx` +
  `lib/ficha-nueva.ts` (tabla por categoría); Booking acepta `?i=&h=` (validados) y abre en Detalles si la hora sigue libre. Guardianes `fichaNuevaSoloPro`
  y `valorDeCliente` (alrevesC005 5/5); e2e `fic005` (21 ✓ local); `cit3b`/`silla3d` a la ficha nueva; ayuda `pagina-del-negocio-pro.md`. Sigue C-006.
- **Primera corrida de `anchos` (CI 43785123795, e066763): en rojo.** Regresión 180/182 (msg2p tiempo, cit3e), iPhone SE 136/182 (casi todo «Load failed» /
  «access control checks»: errores de WebKit con el emulador de iPhone; hay que revisar cómo corre la punta a punta en ese ancho), iPad 81/182 y escritorio
  1024 142/182. No se cierran las líneas «9 dispositivos» de LAUNCH; queda como bloque propio después del paquete C-005 → C-008.
- **C-006 · Ficha nueva en las demás categorías (Pro)** — adaptador por categoría en `FichaNueva.tsx` (pestaña, hoja, barra, tarjeta y Resumen de
  siempre), pestañas Tienda/Renta y Reservar, `equipo` en `lib/ficha.ts`, una sola copia por aparato (`lib/ancho`), `?tab=` en computadora baja a su
  sección. Guardián `fichaNuevaSoloPro` ampliado (alrevesC005 8/8); e2e `fic006` (111 ✓ local); fie4u, tra4x, apt4f, menu2b y rsv2e a la ficha nueva.
  Salud: «SIN SEGURO» ya no sale dos veces. Sigue C-007.
- **C-007 · La ficha nueva reemplaza APP-NEG-LISTING de los Pro (Free igual)** — interruptor `ficha_nueva_pro` (migración 0170, sección
  «negocios» de Configuración; de fábrica 1); `page.tsx` lo lee en cada visita. Guardián `fichaNuevaSoloPro` (alrevesC005 9/9); e2e `fic007`
  (22 ✓ local); ayuda `admin-configuracion.md`. Sigue C-008.
- **C-008 · Menú con fotos y botón + (Comida, Mercado, Tienda)** — `MenuMovil card`, `MeMenu`/`MeOrderBar` (Mercado), `TiendaTab c pop`; «Lo más pedido»
  real con `ventasSqlDe("market_order"|"hold")` + `populares` (merc-publico, `tiendaPopulares`). Guardián `fichaNuevaSoloPro` (alrevesC005 11/11);
  e2e `fic008` (10 ✓ local); merc4o, apt4q, lay4r, env4q, res4s al menú «C». Pendiente: precio anterior tachado (LAUNCH).
- **C-006 → C-008 · lo que cazó la regresión completa (CI 43820574424, 179/186)** — la pestaña lleva el nombre de cada tipo (`vende.tabL`: despensa
  «Ayuda», no «Misas»); DJ y promotor sin local: «Por contrato» y sin «Cómo llegar»; la ficha nueva usa `useAncho()` (guarda la cookie `tl_ancho`: sin
  ella el panel que se abría después pintaba primero la computadora); el navegador manda su ancho (`Accept-CH: Sec-CH-Viewport-Width`, `lib/ancho.ts`
  lo lee primero). Guardianes `anchoSinSalto` y `fichaNuevaSoloPro` ampliados (alrevesC005 14/14). Pruebas: nin4b/inm4ib/autos4ic esperan la fila
  del panel, cup9n21 espera el cupón visible, dir9m abre Horario en el Pixel, rev1 acepta la sección de reseñas de la computadora.
  **Regresión completa CI 43838619809: 186/186 en verde (7266 ✓, 92 min). 8514e1d en `main` y `pruebas`; el sandbox lo sirve (estado-sandbox: commit
  8514e1d, 170 migraciones, salud ok). Paquete C-005 → C-008 cerrado.** Sigue: el bloque de anchos (WebKit «Load failed») y lo de LAUNCH del paquete.
- **Anchos (1) · f306378 (CI 43873696989):** regresión 186/186; escritorio 1024 182/186, iPhone SE 165/186, iPad 160/186 (antes 142, 136 y 81).
  La precarga de dispositivos pone la tableta como se usa (teléfono en vertical, escritorio en horizontal), respeta el agente propio de cada prueba,
  abre Chromium para lo que solo existe ahí y filtra el ruido de WebKit al navegar; el detalle del panel entre 1024 y 1199 es la misma pieza que la
  columna; las pruebas miden «sin scroll de lado» contra la ventana (guardián `anchoContraLaVentana`, alrevesAnchos).
- **Anchos (2) · a7f6f15 (CI 43898185881):** regresión 186/186; escritorio 1024 185/186, iPhone SE 180/186, iPad 178/186. Lo que cazó la corrida anterior:
  · **Redirecciones relativas** (`lib/ir-a.ts`): /i/[code], correo/baja, datos/archivo, pases/apple, app/aviso y /q armaban la dirección con
    `req.url` o `req.nextUrl.origin` = el host del proceso (`http://0.0.0.0:3100` en el servidor independiente): Safari no lo abre y detrás de nginx
    era una dirección interna. Guardián `redireccionRelativa` (+ `enlaceSoloPropio` al día).
  · **Fondo del panel inerte** con la hoja o la ventana del detalle abierta (guardián `panelFondoInerte`): «Confirmar» de la lista ya no competía
    con el del detalle a 1024 (pro4l, ayu4if, sal4j2).
  · **AdminBar a 375**: el selector de ciudad cede y corta con «…» (Safari se salía 9 px; con «Wilkes-Barre» también a 390). Parche en
    `scripts/portar-sistema.mjs`.
  · **/api/vitales** pasado el tope responde 204 (el 429 era un error en la consola de Safari); la etiqueta del aparato dice «iPad».
  · Pruebas: ruido RSC de Safari, goto que no empezó (una vez y avisa), rueda en el iPad, Chromium forzado conserva su agente (push8c),
    llave8d (CDP) en Chromium; dlv2f4, com5a, adm9n3, free2b, dir2f, wal8g, push8c, disp9b al día; diagnóstico en dir2f y din9n4.
  · Guardianes en verde; alrevesAnchos 7/7, alreves9c 27/27, alreves9h 53/53. WebKit no se puede instalar en este contenedor (la descarga se
    permitió en la red pero instalar navegadores no está autorizado aquí): lo de Safari se prueba en CI.
  · Siguen sin explicar (diagnóstico en la corrida): app8e (Safari no sube posiciones), dir9m (pin del mapa), din9n4 (botón apagado en el iPad).
- **Anchos (3) · 8e90791 (CI 43929902521 en curso):**
  · **Cookies con una sola regla** (`lib/cookie-segura.ts`, guardián `cookieSegura`, alrevesAnchos 10/10): la marca Secure sale de la conexión
    real (x-forwarded-proto), como la sesión. La ciudad del Super Admin la decidía NODE_ENV (Safari la tiraba en http: adm9n3 en el SE y el iPad);
    el idioma, la ciudad que miras, el dispositivo y la invitación no la llevaban nunca. Comprobado con curl: con https sale Secure, con http no.
  · Pruebas: app8e reintenta el 429 del token (la página manda con el mismo; escritorio 1024); free2b espera el aviso; wal8g en el iPad, una
    insignia; la precarga dice en qué quedó la página si «load» no sale en 30 s (silla3d, app8a, evt6b-6c) y va otra vez.
  · din9n4 y dir2f pasaron en la corrida 2; dir9m y app8e llevan su diagnóstico/arreglo a esta.
- **C-001 · Video de presentación del negocio + anillo de Hoy (Pro)** — canvas `tolatino-master+` («Video del negocio · variantes»). Migración
  0172 (`business_videos` con estados revision/aprobado/rechazado/quitado/reemplazado, uno en revisión y uno aprobado por negocio; cola
  «Medios» con `business_video`; `video_max_s` 10–60, de fábrica 30; plantillas `biz_video_ok`/`biz_video_no`). **Servicio propio
  `services/video`** (Python + ffmpeg, :8791, en el compose del sandbox y de producción): recorta, 720p, H.264+AAC, sin metadatos, portada del
  segundo 1; el original nunca se guarda. `POST /api/negocio/video` (Pro, mismo origen, acceso «page», 120 MB, 10 al día; nginx abre solo esa
  ruta). Panel › Tu página › Fotos: «VIDEO DE PRESENTACIÓN · PRO» (Free con candado → planes), subir con progreso, en revisión, aprobado
  (Cambiar / Quitar), no aprobado con motivo, «HOY EN EL BARRIO · TU ANILLO» e Instagram «Pronto». Super Admin › Colas › Medios: ver el video,
  «Aprobar video» / «No aprobar» con motivos propios, aviso al negocio, auditoría. Público: `BusinessCard` (parche en portar-sistema) con el video
  (solo se mueve el del centro; ahorro de datos / reducir movimiento = quieto), el anillo y `VisorHoy`; portada de video en la ficha (nueva y
  de siempre); la ficha de siempre lleva el anillo en el logo. `videosVivos` y `historiasDeNegocios`: una consulta por lista. Guardián
  `videoSoloAprobado` (alrevesC001 5/5); e2e `vid001` (CI instala ffmpeg; servir.sh pasa VIDEO_URL); ayuda `video-del-negocio.md` y
  `novedades.md`. Visto en el navegador local (390 y 1360): tarjeta con video, ring, visor y portada.
- **C-002 · Página de categoría D + Patrocinados** — canvas `tolatino-master+` («Página de categoría (variantes)», sección D y «Cómo compra el
  negocio su patrocinio»). `APP-NEG-CAT`: portada 150/210, un solo buscador (teléfono: sobre la portada y el header sin buscador; computadora:
  el del header busca dentro de la categoría, `BuscadorPagina`), radio en la portada, una fila de pestañas (filas + Antojos), vitrina
  «Patrocinados», tarjeta Pro `oneLine` (parche en portar-sistema: foto 150, una línea, un botón; «HOY» solo con algo de hoy). Migración 0173
  (`sponsorships` con estados y candado por categoría y ciudad, `sponsorship_payments` solo inserción, `sponsorship_stats` derivadas,
  `sponsorship_entries`/`sponsorship_views` una por persona o dispositivo y día, `sponsorship_waits`, 4 claves en Configuración › Crecimiento,
  6 plantillas de aviso, fila de la guía de El Compa). Panel › Cobros y plan › Patrocinio (elegir, revisar y pagar por el simulador, activo,
  sin puestos + reservar + Avísame; en la app solo el estado). Super Admin › Crecimiento › Patrocinios (filtro por estado, cursor, Terminar
  con motivo). Barrido `patrocinios` (empieza, vence, renueva o termina, avisa a quien espera, pedidos al día); la conciliación diaria lee
  `sponsorship_payments`. Mapa de datos al día. Guardián `patrocinioDelServidor` (alrevesC002 20/20); e2e `pat002`; ayuda
  `patrocinados.md`, `negocios-explorar.md` y `admin-crecimiento.md` al día.
- **C-003 · Página de Eventos por días (D) + Patrocinados de eventos** — canvas `tolatino-master+` («Eventos (variantes)», sección D, y el
  prototipo APP-EVT-BUSQ / Panel v2 evPat / Super Admin secMkt «pat»). `APP-EVT-BUSQ`: Patrocinado grande que se desliza (PATROCINADO; en la
  computadora la fila «Patrocinados», `PatrocinadosEventos.tsx`), calendario con HOY en el centro (zona de la ciudad; pasados atenuados y sin
  toque; punto con eventos, `diasConEventos`), el día por la dirección (`?dia=`, el servidor decide) con su número, sus historias (anillo
  morado sólido; hoy → «Esta noche», otro día → el evento), una fila de tipos y la lista del día (`eventosCiudad` con el día, 20 por página con
  cursor; un evento de varios días sale en cada día). Fuera: la franja del precio, «Ver como historias», la fila de fechas, el destacado y el
  panel oscuro. Migración 0174 (`event_sponsorships` con estados, candado por ciudad y reglas en la base; el libro, las entradas, las vistas,
  las cifras y «Avísame» de 0173 aceptan `evento`; `patrocinio_evt_cifras_al_dia` = boletos y RSVP; 3 claves en Configuración › Crecimiento;
  7 plantillas de aviso). `lib/patrocinio-evento.ts` (1 semana / 1 mes / hasta el evento, reservar sin puestos, renovar solo, terminar,
  barrido: evento cancelado o que pasó termina solo). Panel › Eventos › el evento › **Patrocinar** (+ Ver página y Copiar enlace;
  `PatrocinioEvento.tsx`, `acciones-patrocinio-evento.ts`: Cobros y Eventos, mismo origen, no en la app). Super Admin › Crecimiento ›
  Patrocinios con los grupos Negocios y Eventos (cursor propio, Terminar con motivo). Mapa de datos al día. Guardián
  `patrocinioEventoDelServidor` (alrevesC003 28/28); e2e `pat003`; evt6b-6c y evt6f al calendario; ayuda `patrocinados.md`,
  `eventos-buscar-y-ver.md`, `panel-eventos-crear.md`, `admin-crecimiento.md`.
- **C-001 → C-003 · cierre (17 nov)** — regresión completa CI 43996571745: 186/189; los 3 rojos eran de las pruebas (fic008 y noc4a dependían
  de la hora y el día: la semilla cierra Sabor Dominicano a las 9 PM y la discoteca no abre los lunes; ayu7a no contaba los artículos nuevos del
  panel) → precondiciones propias (`abiertoTodoElDia` + recalcular la tarjeta de Noche) y en verde en CI (44009533905, 44010352059). Antes, la
  corrida dirigida cazó que `accept="image/*"` abría un «comentario» para los guardianes (sinComent) y mensajesEnVivo dejaba de ver 66 líneas
  del panel: arreglado en sinComent (alreves9m 36/36). **aa33f76 en `main` y `pruebas`.** Anchos (misma corrida): escritorio 1024 sin rojos
  propios; iPhone SE 5 y iPad 6 de Safari (silla3d, app8a, dir9m ya conocidos; nuevos inm4ib, noc4d, pan9n2 en el SE y ayu4z, tra4y, app8e en el
  iPad) → bloque «Anchos (4)» antes de producción (LAUNCH 9b).
- **Anchos (4) · 17 nov** — CI 44028911097 (3aa2102): regresión completa en verde → **3aa2102 en `main` y `pruebas`** (sandbox sano en
  3aa2102). Lo de Safari arreglado en las pruebas (inm4ib, pan9n2, app8e, silla3d, noc4d, ayu4z, tra4y; envolturas WebKit para «load» y las
  fuentes en `dispositivo-precarga.cjs`). Queda **dir9m en el iPad (WebKit)**: el mapa no se arrastra y con flechas el pin no llega al guardar;
  en Chromium a ancho de iPad todo pasa → mirar a mano en un iPad (REVISION «Pin en el iPad», LAUNCH).
- **Anchos (5) · 17 nov** — rojos nuevos de la misma corrida: escritorio 1024 autos4ic; iPhone SE evt6a, app8a, vec9m.
  · **vec9m era real:** el panel no ponía al día la lista de Mensajes al conectarse en vivo la primera vez (lo que llegaba entre el pintado y la
    conexión no lo traía ningún aviso). `RefrescoVivo` ahora se pone al día en cada «listo»; guardián `mensajesEnVivo` + 2 al revés (alreves9m 38/38).
  · Pruebas: autos4ic tocaba el segundo «+» / interruptor antes de que se pintara el primero (helper `alternar`); evt6a escribía antes de hidratar
    (vuelve a escribir hasta que sale la barra); app8a leía «Sin señal» y el almacén antes de hidratar (espera la condición, no un tiempo).
- **C-002 / C-003 · Patrocinios: devoluciones, 3-D Secure, pausa y vistas sin el equipo (17 nov)** — migración **0175**: la base decide cuánto se
  devuelve al terminar (`patrocinio_devolucion`) y lo escribe una vez; UNA fila 'devolucion' por patrocinio en el libro (solo inserción, nunca más
  que lo cobrado); pausa del patrocinio de un evento (`paused_at`/`paused_secs`/`extended_secs`, el fin solo se alarga lo pausado y repasa los
  puestos); `patrocinio_vistas` sin el dueño ni su equipo y sin lo pausado. `lib/patrocinio.ts`: compra en sesión retenida con la hoja del banco
  y capturada al guardar, `devolverPatrocinio` (pasarela.devolver, llave por patrocinio, auditoría, aviso) y `devolverPendientes` en el barrido;
  `lib/patrocinio-evento.ts`: evento cancelado devuelve, oculto o con Eventos apagado se pausa y al volver sigue alargado. Panel (hoja del banco,
  «Cancelar reserva» devuelve todo, recibos con devoluciones, EN PAUSA) y Super Admin (Terminar con «Devolver lo que no se usó · $X»). La
  conciliación lee las devoluciones. Guardianes ampliados (alrevesC002 41/41, alrevesC003 41/41); pat002 86 ✓ y pat003 101 ✓ en local (Chromium, `next dev`); ayuda
  `patrocinados.md` y `admin-crecimiento.md`; decisiones en REVISION («Patrocinios: devoluciones, 3-D Secure y pausa»).
- **17 nov · b8d3700 en `main` y `pruebas`** (sandbox sano, 175 migraciones): Anchos (5) en verde en los tres anchos (app8a con su propio boleto)
  y el bloque de patrocinios (0175: devoluciones, 3-D Secure, pausa del evento oculto, vistas sin el equipo) con CI dirigido 10/10 + al revés 67/67.
  Siguiente: lo de 9n que no espera al fundador (LAUNCH «→ 9n»).
- **9n · Envío del mercado con el repartidor (17 nov)** — migración **0177** (códigos, ruta en vivo y prueba del repartidor también para
  `market_order`); el envío del mercado listo sale por el mismo Repartidor (oferta, asignar, «Ofrecer solo», código de recogida, mapa, prueba) y
  lo real se cobra una vez al «Entregado» del repartidor; sin repartidores, el camino de antes. Panel › Entrega en el mercado. Guardián
  `mercadoConRepartidor` (alrevesMercRep 21/21); e2e `merc9n` 57 ✓ y merc4p 20, rep2l 17, neg9n 51, din9n4 (D, G) 44, app8e 68 en local
  (`next build` + `next start`). LAUNCH marcado; REVISION «Envío del mercado con el repartidor».
- **17 nov · 71b99db en `main` y `pruebas`** (sandbox sano, 177 migraciones):
  · **0176 Direcciones:** desde 0143, «435 Hamilton St, 18101» salía «calle» a 2 km (el Censo la llama «W Hamilton St»). Sin punto cardinal escrito
    valen N/S/E/W si su número cae en el tramo; con él nunca se cambia. Guardián `calleSinPuntoCardinal` (alreves9m 41/41). El workflow
    «Direcciones» volvió a verde (5/6 con su número; 412 N Wyoming St es un hueco del Censo: «calle», honesto) y la segunda carga dice «al día».
  · **0177 Mercado con el Repartidor** (LAUNCH L494): oferta → código de recogida → ruta en vivo → código del cliente → «Entregado» con prueba,
    cobro del peso real una sola vez al entregar; el mercado no cierra solo un pedido que lleva un repartidor. Guardián `mercadoConRepartidor`
    (alrevesMercRep 21/21), e2e merc9n 57 ✓; CI dirigido 15/15 + al revés 68/68. Decisiones en REVISION «Envío del mercado con el repartidor».
  · app8a y app8e con su precondición propia (boleto y dirección «Casa»).
  · Corrida completa (regresión ×2 + barajada, tres anchos, 9 dispositivos, capturas, axe, velocidad): CI 44081105072, en curso.
- **17 nov · Negocios demo (pedido del fundador):** 850 (17 categorías × 5 subcategorías × 10, 170 por ciudad), Pro, historia desde 2016;
  generadores deterministas `scripts/semilla/demos/grupo-{a,b,c,d}.mjs` (node sin red); `deploy.sh` genera el SQL (~140 MB, fuera del repo) y lo
  aplica con `migrar.sh --semilla-pruebas` desde `infra/pruebas/demos/`. Comprobado en una base nueva: 17 archivos sin errores en 3 min 22 s
  (100 048 operaciones, 29 017 reseñas en total). El CI no los carga. Detalle y enlaces en REVISION «Negocios demo».
- **18 nov · Grupo A (lo que no espera al fundador):**
  · **9n · Auditoría en la misma transacción** (ed2669e): 104 acciones del panel en 19 archivos + 7 puntos de lib (patrocinios, reseñas,
    repartidor, simulador) escriben `audit_entries` con el MISMO cliente que el cambio (`tx`, `enTx`, `txAuditada`/`AlGuardar` en `lib/db.ts`;
    cobros y avisos siguen después del commit). Guardián `auditoriaEnLaTransaccion` (alreves9n22 10/10); regresión completa en verde.
    `eventos.cancelar` audita `por_devolver` (las devoluciones van por partes y su avance queda en `event_cancellations`).
  · **Safari en los anchos extremos:** el repartidor en la web pide una lectura fresca si el GPS se calla dos intervalos (merc9n verde en SE e
    iPad); evt6d espera el SMS de la cortesía. Escritorio 1024 190/190, SE 189/190 → todo; en el iPad queda dir9m (a mano, REVISION).
  · **PITR de verdad en el CI** (8/8): Postgres 16 del repositorio oficial PGDG + pgBackRest; en el CI ya no se salta en silencio.
  · **Pruebas que dependían de la hora** (la corrida de hito de madrugada): cre9h un huso por hora, ana9g el día de su semilla, pat002/pat003
    devuelven 7 de 7 si no se usó ningún día; ciu9i dice qué ve si no carga. 6/6 en verde de madrugada (CI 44251270054).
  · Corrida completa de hito otra vez: CI 44257931432.
  · **cdab22d en `main` y `pruebas`** (Catálogo completo 0179 + 9f-3 todas las pantallas por el CMS, sus detalles en sus entradas): regresión completa
    CI 44353056767 en verde en todas las fases, escritorio 1024 y iPhone SE (193/193); iPad 192/193 (solo dir9m, el pin en WebKit, a mano en REVISION).
    Pruebas que fallaban solo barajadas o en el iPad, arregladas: pre4e (espera el reenvío en la base), ayu4f (toca el «Confirmar» que recibe el toque;
    iPad en verde, CI 44335846619), menu2b (pickup fijo también sin sesión), ciu9i (espera «Avísame» y dice qué ve). El extractor de cadenas y los
    guardianes listan los archivos sin repetidos (en un merge con conflicto `git ls-files` repetía cada archivo por etapa).
  · **Cotizaciones y Staff por ciudad** en `main` y `pruebas` (0a5f02f): CI dirigido 44375486236 en verde (12 pruebas, tres anchos, al revés). Ver su entrada.
  · **9n · Catálogo completo** (LAUNCH L214, migración **0179**): Super Admin › Catálogo edita, mueve (el código no cambia), fusiona (los negocios y
    los sinónimos pasan; el nombre viejo queda como sinónimo; «Separar» lo deshace) y quita subcategorías; categoría y módulo **activos por
    ciudad** (la categoría apagada no sale en Negocios, su página, Buscar, el mapa ni Publica; el módulo usa la pausa de Negocios 360° para toda la
    ciudad, con trigger para los nuevos); **plantilla de horario y ejemplos** de Publica por categoría (sembrados con lo que se veía); **límites
    Free/Pro** en Configuración (free_items, free_fotos, pro_fotos, free_equipo + free_ops_cap), editables por un Admin y leídos por la ficha, el menú,
    el panel y Publica. Cada edición dice a cuántos negocios afecta y se audita en la misma transacción. Guardianes catalogoCompleto,
    categoriaPorCiudad, moduloPorCiudad, plantillasDePublica, limitesDelPlan (alrevesCat9n 29/29); e2e **cat9n 51 ✓** y cat1m, mapa, ciudad, fie4u en
    local (Postgres 16 + `next build` + `next start`, Chromium). Ayuda `admin-catalogo.md`; decisiones en REVISION «Catálogo completo»; pendientes
    nuevos en LAUNCH (Free en Servicios/Tienda, Cotizaciones y Staff por ciudad, estado sin diseño de la categoría apagada).
  · **9n · Cotizaciones y Staff por ciudad** (LAUNCH «→ 9n · Cotizaciones y Staff por ciudad», sin migración nueva): `cot` y `staff` leen la pausa
    `modules_off` y entran a MODULOS_POR_CIUDAD (ya son los 12). Cotizaciones = pedir precio antes de reservar (pre-estimado y «hasta 3» de Auto/Hogar,
    mudanza de Transporte, total por escrito de Fiestas): la página no lo ofrece y el servidor lo rechaza (`lib/modulo-pausa.ts`; `solicitudes.ts`,
    `viajes.ts`, `fiestas-reservas.ts`); Staff = presentación del equipo en la ficha (`ficha.ts` equipoOff, FichaNueva), reservar NO cambia.
    Negocios 360° (`moduloPausar`, N360) y el panel (nota con el motivo) también. Guardián moduloPorCiudad con LECTORES por clave (una clave sin lector
    falla); alrevesCat9n con los defectos nuevos (42/42); e2e **cat9n2 48 ✓** (Hazleton a 390 y 1360, y de vuelta; cat9n sigue en 51 ✓), tipos, `next build` y guardianes limpios en local (Postgres 16, `next start`, Chromium). Ayuda `admin-catalogo.md`; decisiones en REVISION «Cotizaciones y Staff por ciudad».
- **17 nov · Demos ronda 2 (pedido del fundador: 10 por CADA subcategoría + 200+ eventos):** 21 agentes Sonnet en worktrees, uno por
  categoría + 2 para la semilla existente + 2 de eventos; generadores `scripts/semilla/demos/r2-*.mjs` (solo leen los de la ronda 1).
  Integración en una base nueva (copia de tl_demos): ≈ 6.700 negocios nuevos (todas las subcategorías ≥ 10), 446 de la semilla llenados,
  ≈ 385 eventos (190 con boletos: 6.399 órdenes / 16.071 boletos; 195 gratis/RSVP), calendario con eventos todos los días ×120 en las 5
  ciudades; segunda aplicación sin cambios. Choques de id entre agentes: 2 (Comida↔Mercado), renombrados. Arreglos de paso: matrículas de la
  ronda 1 ligadas a su grupo (`d/grupos.mjs`), cupos recalculados (`zz-cupos-demo.sql`), y `deploy.sh` carga los demos APARTE
  (`systemd-run tolatino-demos`) porque la carga completa supera el tope de 1 h del servicio. Páginas mirada en el navegador (15 fichas, Eventos
  ×5). Iglesias (NEG-FE 06–43) quedó fuera de la primera tanda (tope de 20 agentes) y entró después: 380 más; las 17 categorías con ≥ 10 en cada subcategoría. **En el sandbox (a8ef238):** carga aparte de 16:56 a 18:32 EST (Profesionales y Salud 24 min cada uno), negocios y eventos comprobados con «Estado del sandbox» (`/estado/demos.txt`). Detalle en REVISION «Demos ronda 2».
- **17 nov · 8b6eaf9 en `main` y `pruebas`** — corrida completa (CI 44081105072) y sus arreglos:
  · **Accesibilidad de la ficha nueva (9c):** grises de texto con corchetes (`text-ink/[.42]`, 47 archivos) a ink 60 %, fila de plato agotado
    (parche en portar-sistema: solo la foto apagada), botones de 24 px (guardián `objetivoTactil`), controles anidados en las filas de 10 fichas
    (guardián `sinInteractivoAnidado`); alreves9c 39/39. Capturas aprobadas renovadas (54) y los 9 aparatos en verde (capturas, axe, velocidad).
  · **Pruebas:** regresión 189/190 → evt6g (carrera con la auditoría) arreglada y en verde; 7 pruebas que dependían del orden o de repetirse
    con su precondición propia (guardianes `silencioPropio`, `cupoPropio`); Safari: en WebKit cada fill espera al campo conectado a React.
  · **Abiertos:** merc9n y dir9m en Safari (a mano en iPhone/iPad, REVISION); auditoría en la misma transacción (LAUNCH → 9n).
- **18 nov · 9n · Auditoría en la misma transacción que el cambio** (LAUNCH «→ 9n», lo que evt6g cazó como carrera el 17 nov): 104 acciones
  del panel en 19 `acciones-*.ts` guardaban el cambio y después escribían `audit_entries` con otro `db().query`; ahora el renglón va con el
  cliente de la transacción del cambio. Patrón (lib/db.ts): `tx()` en la acción cuando el SQL es suyo; `enTx(cx, …)` para lib simple (puerta);
  `alGuardar` / `txAuditada` cuando lib cobra, devuelve o avisa fuera de la base (la auditoría entra en la transacción que anota el cambio,
  Stripe y los avisos siguen después). También lib y api de la misma clase: pedir reseña, patrocinios con `auditar*(null, …)`, el barrido que
  suelta casos tomados y el simulador de Cobros. Payloads iguales salvo cancelar un evento o una fecha: `por_devolver` en vez de
  `devueltas`/`pendientes` (las devoluciones corren después en lotes; su avance está en `event_cancellations`). Guardián
  `auditoriaEnLaTransaccion` (alreves9n22 10/10; anclas de alreves5g y alreves7f al día). tsc + guardianes en verde; e2e no corrió en local
  (sin Docker ni Playwright aquí): va al CI dirigido.
- **18 nov · 9n · Ofertas de productos en Mercado y Tienda** (LAUNCH «Tachado en Mercado y Tienda»): migración **0178** (`oferta_precio()` solo
  para un artículo del negocio de la oferta y nunca un producto de 21+; disparador `business_posts_oferta_item`). Panel › Novedades › Oferta elige
  un producto del catálogo como un plato (por libra, la oferta es por libra; lo de 21+ no sale); la ficha del mercado y la Tienda (nueva y de
  siempre) muestran el precio de la oferta con el de siempre tachado (`PrecioAntes`, «Antes»); el pedido del mercado, su sustituto y el apartado
  (y su plan) cobran `oferta_precio()`; «Pedidos desde la oferta» cuenta también pedidos del mercado y apartados. Super Admin: la oculta desde
  Contenido como cualquier novedad (sin cambio). Guardián `ofertaProductoDelServidor` (alrevesOfe9n 15/15; alreves5e/5h/8e/9c/9n/9n2/9n20/9n4/
  C005/MercRep en verde); e2e `ofe9n` 34 ✓ y fic008 17 ✓ en local (base local Postgres 16 con migraciones + semilla, `next build`, Chromium);
  tsc + build + guardianes en verde. Ayuda: novedades, ficha-mercado, apartar-productos.
- **18 nov · 9f-3 · Todas las pantallas por el CMS** (LAUNCH «9f-3 · Más cadenas por el CMS»; REVISION «Todas las pantallas por el CMS (18 nov)»): cada
  `E2` local pasa por la fábrica compartida `dosIdiomas(es, a, b)` (`apps/web/lib/dos-idiomas.ts`, sin imports: sin ediciones es `es ? a : b`; con
  ediciones busca el par exacto del código). Codemod idempotente `scripts/cms/e2-al-cms.mjs` (262 definiciones convertidas en 198 archivos, 9 pasan el
  de otro `c.E2`, 0 sin convertir; `--verificar`; volver a correrlo tras unir ramas no cambia nada). El extractor lee cada `E2("…", "…")` fijo con el
  árbol de TypeScript → `apps/web/lib/cms-cadenas-e2.json` (9 948 pares de 15 147 llamadas, una línea por cadena, 2,0 MB; llave
  `<PANTALLA>.e2-<12 de la huella>`, la pantalla se queda; `donde` y `n` por cadena; 44 con candado: 911, «nadie te garantiza», El Compa IA, líneas
  fijas y lo que un guardián exige); `scripts/cms/huella.mjs` compartido; el indexador manda las 10 294 en tandas (1,8 s la primera vez, 0,24 s sin
  cambios). Servidor: `edicionesE2()` en `lib/cms.ts` (solo lo editado y vivo de las `.e2-`, copia de 15 s, NOTIFY la vuelve a leer al momento,
  `instrumentation.ts` la carga al arrancar); el layout raíz la espera y la pasa a `app/_cms/EdicionesE2.tsx`, que la pone en el navegador durante
  el render (sin parpadeo ni diferencias al hidratar). Super Admin › Cadenas: las de E2 con sus lugares («en N lugares», aviso al editar, archivos en
  el historial), pantallas por niveles, búsqueda también por el texto del código, huérfanas fuera de la lista. Buscar.tsx y Hoy.tsx ya no leen `T`
  (textosT en su página). Guardianes: `cadenaConLlave` (trinquete: 0 definiciones de E2 sin `dosIdiomas`, rompe el build; catálogo de E2 al día),
  nuevo `e2PorElCms`, `lineaFijaBloqueada`/`cmsConLimite`/`idioma` también sobre las de E2; `erroresDelServidor` sigue cazando (instrumentation.ts
  con una sola condición por función). Al revés: alreves9f3 37/37 (y alreves9f 30/30, alreves9b1 13/13, alreves9j 32/32, alreves8a 55/55, alreves9c
  39/39, alreves9h 53/53). e2e en local (Postgres 16 tl_cms9f3, `next build` standalone en :3180, Chromium): **cms9f3** 48 ✓ (servidor y cliente,
  390/1360, ES/EN, sin JavaScript, base caída, volver al código, candado, huérfanas), cms9f 94 ✓, fic005 21 ✓, fic006 111 ✓, fic007 22 ✓, fic008 17 ✓,
  pan9n2 90 ✓, ofe9n 34 ✓, adm9n3 112 ✓, vec9m 50 ✓, usr9n9 14 ✓, apl9n7 30 ✓, rsvp9a 13 ✓, disp9b 57 ✓. neg9n se cortó en «Foto de la entrega
  lista» (aquí no corre el almacén de fotos: Garage); panel, menu2b, com5e, evt6a, an1n, lay4r, pro4l, sal4i y rep2l no corrieron aquí (apuntan a :3100
  fijo o piden los recursos de pruebas/servir/recursos.sh). Una corrida de cms9f3 de seis vio un #418 de React (diferencia de HTML, no de texto) en
  1360 · es; no se repitió en las otras cinco ni en 96 cargas de sonda con y sin ediciones: queda para el CI de 9 dispositivos. Ayuda: `admin-textos-y-paginas`.
- **18 nov · 9n-23 · «Panel del dueño», solo lectura del equipo** (LAUNCH L147 «Acciones del 360°» → ✓, la línea queda completa; REVISION «9n-23 — Panel
  del dueño», decisión por defecto AB): el 360° abre `/panel/{id}?equipo=1`. `accesoPanelSoloLectura` (lib/panel.ts: staff() con neg:ver, ciudades del
  rol, nunca un fusionado; acceso de dueño con `soloVer`) lo llama SOLO la página del panel, si no es del negocio y trae el `?equipo=1`; las 44
  acciones y las rutas siguen con `accesoPanel` (miembro activo), así que todo cambio lo rechaza el servidor («Solo lectura: no se guardó nada · …»).
  Cada sección va a `audit_entries` (`negocio.ver_panel`, en `tx`, una vez cada 10 min por sección; verbo en el historial del 360°, también para
  `negocio.ver_como_cliente`). `lib/vista-equipo.ts` marca la petición (cache de React, solo la página): mirar no marca leído (conversacionNegocio) ni
  visto (solicitudPanel, verSolicitud), no cobra (repararPagos, repararEstimados, procesar), no lee Stripe ni muestra tarjetas o términos de quien mira,
  y no abre lo cifrado de op_private (niño, nota de consejería, nota/motivo de salud y trámites, casa de la prueba de manejo, destinatario); los
  vencimientos por hora (vencer*/barrer*) se dejan: son los del barrido de cada minuto. Pantalla: InfoCard «VISTA DEL EQUIPO · SOLO LECTURA» fija
  (AvisoSoloLectura), «Guardar» apagado, ?equipo=1 conservado al navegar, sin SSE en vivo, sin Exportar; Dirección y mapa lee del servidor
  (lib/direccion-negocio.ts). Guardián `panelEquipoSoloLectura` (alreves9n23 27/27; `guiaDelPanelCompleta` acepta `const dueno = await accesoPanel`);
  e2e `neg9n23` escrita (390/1360, ES/EN, rechazo con la base igual, sin marcar leído, vecino y equipo sin neg:ver «Sin acceso», el dueño igual): no
  corrió aquí (sin Docker), va al CI dirigido. tsc + guardianes en verde. Ayuda `admin-negocios` (ES/EN).
- **18–19 nov · Pin del iPad, pruebas barajadas y Panel del dueño en main y pruebas (b43f54d, sandbox al día, 179 migraciones):** el mapa del
  pin quedaba «agarrado» si Safari perdía el soltar de un arrastre y el siguiente movimiento (camino a «Guardar») devolvía el pin a donde empezó:
  se guardaba otro punto que el que se veía. MapaPin y Mapa solo siguen al mismo puntero, con el botón apretado si es ratón, y se sueltan al perder
  la captura o con las flechas (guardián `arrastreSeSuelta`, alrevesArrastre 6/6). La confirmación de hito 44388908080 cazó pruebas que dependían
  del orden (cat9n2 miraba el nombre en toda la ficha; app8a leía la base antes de tiempo y dejaba la app en pausa al caerse; cat9n y menu2b
  dependían de la novedad y del tope de Free que dejaban otras; dir9m esperaba la web en el contexto de escritorio del iPad): cada una con su
  precondición propia. 9n-23 «Panel del dueño» (agente): ver arriba en REVISION; neg9n23 en verde en 4 anchos (CI 44418076255). CI dirigidos
  44408239441, 44409877973, 44416311337 y 44418076255 en verde. Confirmación de hito otra vez: 44428582194.
- **19 nov · 9t · Buscar: platos y servicios y el desplegable de escritorio; Mi cuenta: Apartados y letra más grande** (LAUNCH «Buscar — pendientes con su
  módulo» y «Boletos, Mensajes, … letra más grande» → ✓; dos líneas nuevas → 9t: servicios de las demás categorías y lo que falta del desplegable, y platos
  guardados sin diseño del control; REVISION «9t»). Migración **0180** (`items.search_doc` con disparador + GIN parcial `items_search_gin`; vocabulario aparte
  `search_vocab_platos` que refresca el mismo `refrescar_busqueda()` —expandir, `search_vocab` no se toca—; `users.big_text`). `lib/visible-publico.ts`: UNA
  regla de lo que la ficha muestra (PLATO_VIVO, SECCION_MENU_VISIBLE, SERVICIO_VIVO, SERVICIO_BELLEZA, ALGUIEN_LO_HACE) que ahora leen pedir.ts, citas.ts,
  oficios/salud/pro-publico.ts y Buscar. `lib/buscar-platos.ts` (los negocios de Buscar con DESDE; Menú encendido y sin pausa, sección visible, Free solo
  sus `free_items`; Belleza con alguien que lo hace; Auto/Hogar, Doctores y Profesionales sin pausa; precio con `oferta_precio`, servicios «Precio en la
  ficha»): sección en Todo, pestaña `itm` (chips por categoría, «Precio más bajo», hasta 40) y sugerencias; «nada» cuenta también los platos. El
  desplegable (`buscar/Desplegable.tsx`, SearchPanel 2w): el buscador del encabezado en escritorio lo abre sobre la página; explorar, sugerencias y la
  vista previa (`/api/buscar?drop=1`: tarjeta, plato, subcategoría con sus negocios, evento, conteos; `?explorar=1`); la categoría pasa su alcance
  (`usarBuscadorPagina(…, cat)`). Mi cuenta: Apartados vivos en Pedidos › Todos (`apartadosActivos`, punto público); «Letra más grande» en Ajustes (yo()
  la trae, AppShell pone `data-letra`, `globals.css` zoom 1.12). Guardianes `buscarPlatosComoLaFicha`, `letraGrandeDelServidor`, `apartadosEnMiCuenta`
  (y `propiedadNoEsServicio`/`carroNoEsServicio` leen el filtro de visible-publico con `conVisibles`); al revés **alreves9t 32/32**. e2e **bus9t 51 ✓** dos
  veces seguidas en local (Postgres 16 `tl_9t` con 180 migraciones, `next build` standalone en :3190, Chrome, un `docker exec` de mentira hacia psql):
  sugerencias, Todo, pestaña, ficha; oculto / sección invisible / Menú pausado / Free fuera de sus platos (y la ficha Free igual) / servicio que nadie hace
  no salen; desplegable con vista previa, ↓/Enter/Esc, EN; Apartados; letra grande desde el servidor en otro navegador y sin scroll de lado a 390 en 6
  pantallas. tsc + guardianes + extraer --verificar en verde. Ayuda: `buscar`, `mi-cuenta` (ES/EN). Sin diseño (REVISION): guardar un plato.
- **19 nov · 9t-2 · Buscar: servicios de las demás categorías y lo que faltaba del desplegable** (LAUNCH «Buscar · servicios de las demás
  categorías y lo que falta del desplegable» → ✓; línea nueva → 9t: propiedades, carros y productos, decisión del fundador; REVISION «9t-2»). Sin
  migración (el índice `items_search_gin` de 0180 lo cubre). `lib/visible-publico.ts` suma `CURSO_INSC` y `SERVICIO_NOCHE` (la Lista solo encendida,
  la noche especial solo con su evento en vivo) y ahora lo leen también `fiestas-publico`, `trans-publico`, `noche-publico`, `inscripciones-publico`
  y `fe-publico`; `lib/buscar-platos.ts`: REGLA y CATS_PLATOS con Fiestas, Transporte, Noche, Educación/Niños/Deporte e Iglesias (cada una con la
  pausa de Servicios de su ficha), `NEGOCIOS_POR_PLATO` (negocios() encaja por el nombre de lo que vende, `soloNombre`: misma regla, mismo índice, la ciudad que se ve) y
  `porQue()` (la razón «Tiene … · $12» para toda la página en una consulta, precio de ficha con `oferta_precio`, sin número para un servicio; el
  nombre gana, `textoRazon` en `buscar/platos.ts`). La fila (SearchResultRow `why`), la tarjeta (primer chip) y las sugerencias («TIENE …») la
  muestran. El plato abre su hoja: `hrefPlato` → `/n/<id>?tab=menu&plato=<id>`, la ficha (de siempre y nueva) lo abre una vez al hidratar con
  `mn.abrir` (que ahora dice si pudo: agotado, horario, sin pedidos → queda el Menú). El desplegable: micrófono con la lógica de la página
  (`buscar/voz.ts`, `useVoz`, que también usa Buscar.tsx; el aviso dentro del panel; lo que eligió llega en `?explorar=1`) y el chip de la ciudad
  (abre «Ciudad que estás viendo» bajo el chip). Guardianes `buscarPlatosComoLaFicha` (ampliado; las piezas de platos() se miran en platos()),
  `negocioPorLoQueVende`, `platoAbreSuHoja`, `vozDelDesplegable`; al revés **alreves9tbus 44/44** (y alreves9t 32/32). e2e **bus9t 85 ✓** dos
  veces seguidas en local (copia `tl_bus3` de la base local Postgres 16 con 0181, `next build` standalone en :3193, Chromium; sin Docker: un
  `docker exec` de mentira hacia psql fuera del repo): las 7 categorías, pausa / Lista apagada / noche sin evento / no-curso no salen (y su ficha
  tampoco), la razón en tarjeta, fila y sugerencia (ES/EN, el nombre gana), la hoja del plato a 390 y 1360, micrófono con su aviso, sin micrófono
  con la voz apagada, el chip abre la ciudad. tsc + build + guardianes + extraer --verificar en verde. Ayuda: `buscar` (ES/EN).
- **19 nov · 9t · «No pudo» de una mesa y Mi ciudad (1f-2)** (LAUNCH «Avísame si se libera (lista de espera) y Otros restaurantes con mesa» y «Mi ciudad — lo
  que queda de 1f-2» → ✓; REVISION «9t — No pudo…» y «9t — Mi ciudad…», decisiones por defecto AB): migración **0180** (`reservation_waitlist`: estados
  waiting → offered → taken / left / expired, una viva por persona, restaurante, hora y personas, nada se borra salvo la purga de una cuenta; plantilla
  `rsv_libre` sin_push; `rsv_espera_min` en Configuración › Avisos). `lib/mesa-espera.ts`: anotarse solo la dueña de la solicitud que no se pudo y solo si
  esa hora sigue llena (`motorMesa` en lib/reservas.ts: el mismo motor de «Elegir hora»); el barrido `esperaMesas` (cada minuto) vence lo pasado y, con el
  candado del restaurante, guarda la mesa a la primera de la fila (retención a su nombre) y le avisa UNA vez (notif_once, después de la transacción; en
  sus horas de silencio no se le ofrece). Pantalla «no pudo» (prototipo rsvStVals): «Otros restaurantes con mesa» (`otrosConMesa`: misma ciudad, activos,
  Pro, Reservaciones sin pausa; ≤ 24 candidatos en 6 lecturas, sin N+1; ≤ 5), «Avísame si se libera a esa hora» / «Estás en la lista de espera» y «Se
  liberó una mesa · Tomar la mesa / No, gracias»; la solicitud con la mesa guardada cuenta sus minutos (RsvHold.min). Mi cuenta › Avisos › Tus alertas
  lista las mesas en espera con «Quitar»; Super Admin › Transacciones muestra el estado de la lista. Mi ciudad: «Desde dónde medimos» con Casa / Trabajo
  (`puntosGuardados`, «dir:<id>»; el punto lo pone el servidor y nunca viaja a la pantalla ni a la cookie), «Entra para medir desde tu casa o tu trabajo» y
  «Qué es Mi ciudad» → ayuda ciudades-que-abren. Guardianes `esperaMesaUnaVez`, `otrosConMesaDeLaCiudad`, `medirDesdeTuDireccion` (alreves9t2 31/31).
  e2e en local (copia de la base local Postgres 16 con 0180, `next build` standalone en :3197, Chromium; sin Docker: el `sql()` de la prueba se pasó a
  psql local en una copia fuera del repo): **rsv9t** 37 ✓ y **ciu9t** 29 ✓ (390/1360, ES/EN). tsc + build + guardianes en verde; CMS verificado. Ayuda:
  `reservar-mesa`, `ciudad` (ES/EN).
- **19 nov · Confirmación de hito (44428582194) y el tope de «Ayuda con …» (9t):** la confirmación completa en b43f54d salió con 3 rojos
  de pruebas, ninguno de la app: pedidos2c y vec9m (barajada) hacían clic antes de que React conectara el elemento (el interruptor no
  cambió y «Guardar» siguió apagado; el plato no abrió su hoja) → `pruebas/lib/hidratado.cjs` espera las props de React de ESE elemento
  antes del clic; menu2b (ancho 1024) esperaba el «load» de la ficha con fotos y video (30 s) → espera el HTML y la hidratación, no el
  «load». El tope de ayudas: `ayuda_tope_dia` (0182, Configuración › Soporte, 1–50, de fábrica 5) en vez del 5 fijo en lib/ayuda.ts y
  lib/ayuda-cita.ts, leído con `cfgSql` en la misma consulta que cuenta (la seguridad nunca se frena); prueba de punta a punta `ayu9t`
  (persona nueva, tope 2 → la tercera se rechaza, la de ayer no cuenta, tope 3 → pasa), guardián `topeAyudaDeConfig` y `alreves9t3`
  (8/8); la ayuda (pedido y cita) dice «en 24 horas (To’Latino puede ajustar ese número)». En paralelo (agentes): auditoría de las
  consultas con texto interpolado (Semgrep en modo taint) y lo que faltaba de Buscar (servicios de las demás categorías, «Tiene … · $»,
  abrir el plato directo, micrófono y ciudad en el desplegable de escritorio).
- **19 nov · 9t · SQL armado con texto: auditoría y la regla de Semgrep por flujo de datos** (LAUNCH «Semgrep `tolatino-sql-con-texto-interpolado`
  solo ve nombres de afuera» → ✓). **Ninguna inyección real.** `semgrep/tolatino.yml`: la regla pasa a **modo taint** — fuente = todo parámetro de
  cualquier función (con nombre, flecha, desestructurado; Semgrep sin cuenta mira función por función, así que lo que una acción pasa a lib cuenta
  como de afuera) más `cookies()`, `headers()`, `req.json()/text()/formData()`, `req.nextUrl`, `new URL(…).searchParams`; propagador `w.push(…)`;
  sumidero = el texto de `.query(…)` en sus **dos** formas; limpiadores = Number/parseInt/Math.*/aritmética/comparaciones/typeof, `MAPA[x]`, el
  `.length` solo del arreglo de parámetros armado ahí (`const v = [...]`; un `{ length: "…" }` de una acción no limpia) y `centroSQL`/`radioSQL`/`CTE`/
  `ident` (revisados, una sola definición). Hallazgos: 72 en 46 archivos (de 802 consultas con `${…}` en el texto, de 5 721 `.query` en apps/web), cada
  uno seguido hasta su origen y marcado `// nosemgrep: … — <porqué>`: ayudantes privados (`set`/`add`/`put`/`leer(where)`/`op`/`opDe`) cuyas llamadas
  son todas literales (comprobado con un script por archivo), filtros que ya pasaron por `leerFiltros*`, mapas fijos, `DUENO(q)`, el uuid de
  `DE_MIEMBRO` (regex sin comillas posibles) y los fragmentos de `data_map` (solo los escribe la semilla, validados). Además, a mano, las 337
  plantillas de apps con algo que no es constante (lo que taint no ve: valores de la base, código de módulo): constantes, la zona horaria de la ciudad
  como subconsulta, `data_map`. **La regla vieja estaba rota de dos formas que nadie veía:** no reconocía ninguna `await x.query<Tipo>(…)` como
  consulta (2 544 de 5 721, el 44 %) y Semgrep se saltaba pedazos de 4 archivos que no sabe leer (`import("…").T[]` en acciones-colas
  —decidirCambio—, acciones-eventos, sistema/salud y usePuertaLocal; `/<!--/` en compa/ayuda-indice) sin que el CI lo contara: ahora
  `Array<import("…").T>` y `/<!-{2}/`, y el CI falla si `--json-output` trae `errors`. El CI corre también `semgrep --test semgrep/` con la prueba
  `semgrep/tolatino.ts` (13 casos que tiene que cazar —parámetro, nombres que la vieja no miraba, desestructurado, flecha, `w.push`+`join`, por
  variable, `await c.query<T>`, `query<T>` en Promise.all, FormData, req.json(), searchParams, cookies(), `.map`, `.length` de afuera— y 7 que no);
  quitar el sumidero `await …<T>` la hace fallar («missed lines: [50]»). Endurecido sin ser bug: `buscar.ts` limit/offset siempre enteros acotados.
  Guardián nuevo `semgrepSqlPorFlujo` (modo taint, fuentes, las dos formas del sumidero, `.length` acotado, limpiadores con nombre revisados y únicos,
  la prueba con sus casos, el CI con --test y con los errores de lectura, cada `nosemgrep` con regla y porqué, sin las dos formas que Semgrep no lee);
  alreves9t4 14/14. Local: `semgrep --test semgrep/` ✓, `semgrep scan --config semgrep/ --error … apps packages services scripts` 0 hallazgos y 0
  errores de lectura, tsc ✓, guardianes ✓.
- **19 nov · 9t · Destacar eventos** (LAUNCH «Destacar eventos» → ✓). **0183**: `featured` (0138, solo negocios) lleva también eventos: `event_id`,
  `placement` 'negocios' | 'eventos' (check: un evento nunca lleva negocio y solo «fijar»), `featured_reglas` reescrita con su rama de eventos (candado
  por ciudad, evento de esa ciudad no cancelado con una fecha listable por delante de `from_at`, uno vivo por evento, `destacados_evt_a_la_vez` ≥
  `destacados_evt_por_ciudad` → `destacados_evt_tope`; lo cancelado, oculto o pasado no cuenta) y la de negocios igual que antes; nada se borra ni se
  edita. **Super Admin › Crecimiento › Destacados** pasa a dos grupos (NEGOCIOS como estaba, EVENTOS nuevo: lo que sale hoy, los fijados con estado y
  «Retirar», «Fijar un evento» con DESDE / HASTA y buscar por nombre sobre `events.tsv`); `lib/crecimiento/destacados.ts` (fijarDestacadoEvento,
  retirarDestacado para los dos, buscarEventoDestacar) con mkt:editar, ciudad de quien fija (la ciudad sale del evento, nunca de la pantalla), motivo,
  máx. 30 días y auditoría en la misma transacción. La ficha del evento en el Super Admin: DESTACADO EN EVENTOS con «Retirar», o «Destacar en
  Eventos» (desde hoy hasta …). **/eventos**: `destacadosEventos` (vivo ahora, VIVO, no cancelado, PRIMERA, en el radio, sin lo que ya está en
  Patrocinados, tope de Configuración) → «Destacados en {ciudad}» entre Patrocinados y el calendario (SectionHeader + Cartel, como Negocios ›
  Destacados) y `eventosCiudad` pone lo fijado primero en la primera página del día y lo salta en todas (cursor igual). **Panel › Eventos**:
  DESTACADO POR TO'LATINO en la fila y en la ficha (sin el motivo interno). Guardián `destacarEventosDelServidor`, alreves9tevt 27/27. Local: tsc ✓,
  guardianes ✓, CMS --verificar ✓; la migración aplicada sobre una copia de la base local (Postgres 16) y probada a mano (tope, programado, otra
  ciudad, cancelado, ocultar libera el puesto, borrar/editar/retirado no vuelve); `next dev` contra esa copia: /eventos (hoy y otro día: fijado
  primero), Crecimiento › Destacados, la ficha del Super Admin y Panel › Eventos renderizan con lo esperado (compilados por `next dev`). **e2e evt9t
  escrita y sin correr** (aquí no hay Docker ni Playwright) y **`next build` no corrió** (la máquina se quedó sin disco a mitad: queda para el CI). Ayuda: `eventos-buscar-y-ver`, `panel-eventos-crear`, `admin-crecimiento` (ES/EN).
- **19 nov · 9t · Pedir tus datos y borrar tu cuenta con la llave de acceso** (LAUNCH «Pedir el archivo con la llave de acceso» → ✓; REVISION «9t — Pedir
  tus datos y borrar tu cuenta con la llave de acceso», decisiones por defecto AB): Descargar mis datos, Exportar los datos del negocio (el dueño) y
  Borrar mi cuenta se confirman con el código por SMS **o** con la llave (Face ID / huella): «Pedir con Face ID» / «Borrar con Face ID» y «Mejor con un
  código»; sin llave, donde no se ofrecen (`llavesAqui`) o en un dispositivo que no puede, solo el código, como antes. Migración **0184**
  (`webauthn_challenges.purpose` + `data_export` / `account_delete`, siempre con cuenta; `passkey_log` + `confirmo` / `confirmar_fallo` con dos índices
  parciales). `lib/llaves/llaves.ts`: la verificación de la firma sale de `entrar` a **`firmaDeLlave`** (la única: entrar y confirmar; un solo
  `verifyAuthenticationResponse`); `retoConfirmar` (reto de ESE propósito, de esta cuenta y este dispositivo, `passkey_reto_s`, verificación requerida,
  `allowCredentials` = sus llaves vivas), `confirmarConLlave` (tope `passkey_fallos_hora` por cuenta y por dirección; el reto se gasta antes de la
  firma; llave viva de ESTA cuenta) → una prueba opaca (WeakMap privado, un uso) que `usarConfirmacionEn` gasta DENTRO de la transacción del pedido
  (`pedirArchivo`, data_export) o del borrado (`borrarCuenta`, account_delete): propósito y cuenta iguales, contador quieto con la llave bloqueada, este
  dispositivo y donde nació la llave sin bloqueo, cuenta activa, teléfono verificado; «confirmo» en el libro. Acciones `archivoRetoLlave`,
  `archivoPedirLlave`, `borrarRetoLlave`, `borrarConLlave` (propósito fijo en el servidor). Super Admin › Usuarios 360° › Seguridad cuenta las
  confirmaciones de cada llave. Guardián nuevo `confirmarConLlave`; `retoUnUso`, `llaveDeSuCuenta`, `passkeyNoSaltaBloqueo` y `clonSoloConFirma` miran la
  firma compartida (alreves9tllave 30/30, alreves8d 41/41). e2e **llave9t** 44 ✓ dos veces seguidas en local (copia `tl_9tllave` de la base local
  Postgres 16 con 0181, 0182 y 0184; `next build` standalone en :3184 con RP ID localhost; Chromium con el autenticador virtual; sin Docker: un `docker
  exec` de mentira hacia psql fuera del repo): sin llave solo el código; con llave pedir sin SMS; la misma firma otra vez; el reto de entrar no pide el
  archivo, el del archivo no entra ni borra, el del borrado no pide el archivo (un intento con otro propósito no gasta el reto); la llave y el
  userHandle de otra cuenta; verificación restablecida, dispositivo bloqueado, cuenta suspendida, tope; interruptor apagado; «Mejor con un código»;
  borrar con la llave (1360) y cancelar; la llave quitada. Lo que no cubre: Exportar del negocio de punta a punta (misma acción y el mismo pedido) y
  las apps (TLLlave ya respeta `allowCredentials`). **llave8d** en la misma copia: §1–12 en verde (83 ✓: entrar con la firma compartida, contador y clon,
  bloqueos, userHandle); §13 no corre en local (necesita la segunda dirección del CI, 192.0.2.2). tsc + build + guardianes + extraer --verificar en
  verde. Ayuda: descargar-mis-datos,
  borrar-mi-cuenta, panel-exportar-los-datos, entrar-con-face-id, admin-usuarios (ES/EN).
- **19 nov · La fila «Llamar · Escribir · Cómo llegar» de la ficha Pro se salía (bug real) y lo que destapó la tanda de corridas:** con la app
  servida en local (base `tl_loc` al día con 184 migraciones y la semilla de pruebas; `pruebas/servir/servir.sh basico`) y Playwright: en tres
  columnas iguales «Cómo llegar» (122 px) no cabía en su tercio (111 px a 390, 106 a 375): se salía del margen derecho en TODAS las fichas Pro,
  y con letra grande en el iPhone SE la página se movía de lado (bus9t). Ahora la fila se acomoda (flex-wrap, cada botón con lo suyo); con
  letra grande o a 320 el tercero baja a otra fila. Nuevo `pruebas/lib/caben.cjs` (botón contra su caja) en fic005 y bus9t, guardián
  `botonesQueCaben`, `alreves19caben` 6/6. Además: vec9m abre el negocio todo el día (a las 11 PM la hoja del plato no se abre: solo si se
  puede pedir); ciu9t espera el encabezado de escritorio (la cookie tl_ancho del teléfono pinta primero el de teléfono); `sin-reloj` quita
  «hace N min/h» (compa7e dos veces seguidas); bus9t trae su propio apartado; alreves8a al día; age en CI cuando una dirigida nombra al revés.
- **19 nov · En main y pruebas (a62303c):** el tope de ayuda (0182), Buscar 9t-2, mesa en espera y Mi ciudad (0181), Destacar eventos (0183), el
  archivo y Borrar mi cuenta con la llave (0184), la auditoría del SQL con Semgrep por flujo, la fila de acciones de la ficha Pro y las filas
  de Buscar que se salían. Corridas dirigidas en verde en los 4 anchos: 44469203576 (Eventos, pat003, dlv2f4 en el iPad), 44474177557 (bus9t,
  fic005, vec9m, al revés), 44460944263 (llave). En el camino: «Destacar» decía el tope viejo de la caché (bug, arreglado; también en negocios);
  evt9t, pat003 y alreves6f al día; serieUnaVezEnLista mira las dos lecturas de eventosCiudad. La app se sirve en local
  (`tl_loc` + `servir.sh basico` + docker falso que manda el SQL de las pruebas a la base local) para reproducir sin esperar a CI.
- **19 nov · Área de toque de 44 px REVERTIDA otra vez (revert de 9f416b9):** en el CI, a11y9c (su propia prueba) falló en todos los anchos: un
  toque junto a la pestaña «Jobs» (71×43, 1 px corta en el runner) no le llegaba, y a 320 con letra grande «Agregar» (29×31) quedaba sin área;
  en local pasaba. Se queda el arreglo real que encontró (el nombre del encabezado a 320 con letra grande; guardián botonesQueCaben). Se rehace
  con una prueba que reproduzca el runner (LAUNCH «Objetivos táctiles de 44 px» vuelve a [ ]).
- **19 nov · La pantalla responde en el mismo toque (pedido del fundador: «el sitio se queda como enganchado»):** (1) **barra de navegación** fina
  arriba (`app/BarraNavegacion.tsx`, color de acción) que sale en el toque de un enlace y también de un botón con router.push (el aviso oficial
  de Next `instrumentation-client.ts` → «tl:navega»; la casi totalidad de la app navega con botones: 797 router.push) y avanza hasta que llega
  la página; la mueve el DOM directo (un setState dentro de la transición de Next esperaba a la página nueva: así se quedó quieta la primera
  vez). (2) **esqueletos** (`Esq/EsqTexto/EsqCirculo/EsqZona` nuevos en packages/ui con el «fondo de foto mientras carga»; `app/_esqueletos.tsx`:
  ficha, muro, lista, Super Admin) que pone `app/Pendiente.tsx` en el marco de la app y del Super Admin a los 120 ms del toque (sin parpadeo
  si la página llega antes), solo si cambia la ruta. **No loading.tsx:** el flujo en dos partes deja un instante una copia escondida del
  contenido (fic005 y a11y9c fallaron con «strict mode»); el guardián lo prohíbe. Local: nav9t 17 ✓ (barra a 80 ms con la página frenada 2,5 s,
  esqueleto en lugar de la vieja, sin dos contenidos), fic005 22 ✓, menu2b 22 ✓, a11y9c 68 ✓ (se corta en la subida de fotos de Publica: sin
  almacén local). Guardián `respondeAlToque`, `alreves9tnav` 13/13. **0189**: índice del «ganador del mes» de la Tabla (lo más lento después de
  0188 en la carga: 61 ms; carga 44529824949: Tabla p95 89 → 59 ms, votar 7 ms, barrido 7,3 s).
- **19 nov · 9t · «Mi lugar» de la Tabla del Barrio con histograma (0188):** contaba en el índice a todos los de delante (p95 86 ms con 580 mil
  vecinos en una ciudad; presupuesto 40). La base mantiene `monthly_board_hist` (ciudad, mes, pestaña, valor → cuántos, sin excluidos; trigger de
  monthly_boards, guardia por pg_trigger_depth, primer llenado con la Tabla bloqueada) y «mi lugar» suma los valores mayores. Local: 200 de 200
  posiciones iguales a la cuenta vieja; 60 mil vecinos en una ciudad 12,3 → 1,9 ms; después de com5f el histograma sigue exacto (0 diferencias).
  Guardián `tablaConHistograma`, `alreves9thist` 5/5. Medida a 1 M: corrida `carga` (comunidad) de este commit.
- **19 nov · «Otros restaurantes con mesa» solo de la misma categoría** (rsv9t lo cazó en CI): salían los 5 más cercanos con Reservaciones de
  CUALQUIER categoría (karaokes y bares de Noche, que también toman mesa) y un restaurante lleno ofrecía un karaoke. `otrosConMesa` filtra
  `b.category_id = o.category_id`; guardián otrosConMesaDeLaCiudad (+2 reglas), alreves9t2 32/32; rsv9t usa El Fogón (sí) y Mariscos La Bahía
  (en pausa) y comprueba que ningún lugar de Noche sale. Local: rsv9t 38 ✓. **Foto de Mensajes de más de 12 MB:** si el navegador no manda el
  tamaño por adelantado (iPad en CI) la ruta respondía 400; ahora 413 también después de leerla (msg9t y dm9t dicen qué llegó).
- **19 nov · 9t · Mensajes: fotos subidas y nunca mandadas:** el barrido (`fotosSinEnviar` → `lib/mensajes-purga.ts`) saca del almacén privado la
  foto con owner_id 'pendiente' de más de 24 h (las mismas 24 h en que tomarFoto deja mandarla) y la fila queda con purged_at/«sin_enviar»; una
  enviada nunca se toca. msg9t §5b (CI: necesita el almacén), guardián `fotosSinEnviarSePurgan`, `alreves9tpurga` 6/6; ayuda mensajes.md ES/EN.
- **19 nov · 9t · Exportar sin corte:** «Descargar mis datos», «Exportar los datos del negocio» y Usuarios 360° › Exportar ya no cortan un archivo en
  20 000 filas: `lib/datos/exportar.ts` arma las consultas (`datosDeCuenta`/`datosDeNegocio` devuelven SQL, sin limit), `porPartes` las lee con un
  cursor (declare/fetch 20 000) y `armarZip` comprime cada parte al llegar (`lib/pases/zip.ts` `zipPorPartes`, `zip()` igual que antes); «Ver como»
  usa `vistaPrevia` (cuenta + 3 filas). LEEME con filas y partes (ES/EN); `sections` con `_partes` y `_ms`. Local: 45 004 avisos → 3 partes, 1,9 s,
  191 MB. `exp9t` (CI: necesita el almacén), guardián `exportarSinCorte`, `alreves9texp` 9/9; ayuda descargar-mis-datos y panel-exportar.
- **19 nov · REVERTIDO el mismo día (commit «Revert» de 4bb49b4):** la confirmación completa 44485797353 salió roja en todos los anchos: el `::after` de un
  control tapa la caja del vecino que está en OTRO contenedor (el logo «To’Latino» de la cabecera, 28 → 44 px, pisa «Ver las 3 fotos» de la ficha) y
  los clics de menu2b, rsv2e, apt4f, apt4q, fic4id, avisos2j caducan; a11y9c (la propia prueba del bloque) también lo caza. Se rehace aparte
  (LAUNCH «Objetivos táctiles de 44 px» vuelve a [ ]): lo de abajo describe el intento, no lo que está en main.
- **19 nov · 9t · Objetivos táctiles de 44 px, sin cambiar lo que se ve** (LAUNCH «Objetivos táctiles de 44 px» → ✓; queda «Área de toque de las
  piezas con sombra o recortadas», con el OK visual del contraste; REVISION «9t — Objetivos táctiles de 44 px»). **`packages/ui/src/toque.css`**
  (importado por globals.css, exportado por el paquete): `[data-toque=""]` = position relative + `::after` invisible centrado con
  max(−tope, min(0, 50 % − 22 px)) por lado → 44 × 44 de toque; `--tl-toque-x/-y` (@property inherits: false: el tope del grupo vale para sus hijos
  directos; el primero y el último crecen enteros hacia afuera) y `--tl-toque-arriba/-abajo/-izq/-der` (se heredan: bordes de carrusel, costuras).
  **Quién lo pone:** `scripts/portar-sistema.mjs` (scope.js `__btn`/`__key`, `toque`: cada `role:` de control y cada `<button>` en la misma línea;
  `data-toque: 'sombra'` a los controles con sombra hacia fuera y al Button «action»; `'recorte'` al «− / +» del plato; CartLine con costura de 4 px;
  `gruposToque`: el contenedor de dos o más controles —o una lista— con `gap` recibe la mitad del gap con la MISMA expresión, eje según flex/columna/
  wrap/grid: 54 grupos); `Bloques.tsx` a mano (`data-toque=""` en 34 controles, `tope()`/`lados()` en 13 contenedores); `globals.css «9t · toque»`:
  los `gap-*` de Tailwind de las pantallas (gap-0 … gap-10, fila → x, columna → y, wrap/grid → los dos). **Medido** (`pruebas/lib/toque.cjs`, lo usa
  a11y9c en la ficha, «Tu pedido», la reserva, los boletos, publica y el Super Admin): el área real de cada pieza (caja ∪ ::after resuelto por el
  navegador, recortada por overflow respetando el bloque contenedor) → cortos / vecinos / topeSinVecino / pisan (caja de otro control o de un
  campo, o dos áreas que se cruzan) / sinArea / recortados; y `toqueInvisible`: captura completa con las áreas y sin ellas (se quita `data-toque` un
  momento), con el anillo del foco del teclado puesto, pixelmatch 0,005 sin suavizado SOLO junto a los controles (32 px alrededor: fuera de ahí,
  Chromium cambia el suavizado de un texto en otra capa —el «0» de VoteBar en /sistema— y no cuenta) + scrollWidth/scrollHeight del documento y de
  cada carrusel. Falla en el teléfono: cortos, pisan, pixeles distintos, scroll; en el escritorio los cortos se informan. **Lo que cazó la comparación:**
  la sombra del Button «action» pasaba por encima del texto de abajo (paint order de un elemento posicionado: 251 pixeles, hasta 9 niveles) → `sombra`;
  la esquina redondeada del AddPill (hasta 68 niveles) → `recorte`; el suavizado de íconos/bordes en posiciones fraccionarias (1–8 niveles) no cuenta.
  Guardián **`toqueDe44`** (toque.css sin nada que se dibuje, fórmula, topes, primero/último; scope.js; cada rol y `<button>` del sistema y de los
  .tsx de packages/ui; razones conocidas; cada `gap-*` que usa apps/web con sus tres líneas; a11y9c mide) — **alreves9ttoque 25/25** (incluye
  `sistemaSincronizado` sin el paso del script). Verificación local: `next dev` + Chrome 153 (Playwright de /opt/node-tools) sobre /sistema y un banco
  temporal (borrado) con los 130 componentes y todos sus `on*`, a 390 (iPhone, táctil) y 1440: 0 cortos, 0 pisan, 0 pixeles distintos, 0 cambios
  de scroll; al revés a mano del banco: con las sombras con área la comparación da 609 pixeles distintos, sin los topes 5 áreas que se cruzan; un
  `touchscreen.tap` 2–6 px fuera de la caja dispara el clic del control. tsc ✓, guardianes ✓. **No corrió:** a11y9c (sin Docker ni base aquí) ni
  WebKit (no hay en esta máquina): el CI lo confirma; los bloques del panel no se midieron en el navegador (sin datos). El contraste AA no se tocó.
- **19 nov · 9t · Mensajes: fotos en el chat y «Ver traducción» ES↔EN** (LAUNCH «Mensajes (2p)» → ✓; lo que quedó en «Mensajes · lo que quedó de 9t»;
  REVISION «9t — Mensajes: fotos en el chat y Ver traducción»). Migración **0185**: `media.owner_kind 'chat'` + `check_note` + `media_chat_privada`
  (privada y bajo «privado/m/»), `chat_messages.media_id` (índice único: una foto, un mensaje) y `lang`, el cuerpo vacío permitido con foto, la foto
  solo de personas, el aviso en vivo al decidir la foto (`media_chat_vivo`), `ugc_translations` + 'chat_message' y `datos_purga_pendiente` que la
  cuenta (y `purgar.ts` que la borra; el mapa de datos purga las fotos 'chat'). **Subir** `/api/mensajes/foto` (mismo origen, sesión, 12 MB, 50 Mpx,
  30/h, sharp sin metadatos, modelo propio al subir: visible o en revisión con su nota) y **ver** `/api/mensajes/foto/{id}` (quien la subió; las partes
  solo revisada y con el mensaje sin ocultar; el equipo con caso abierto en su cola y ciudad, auditado; no-store). `lib/mensajes.ts`: `tomarFoto` /
  `ponerFoto` en la transacción del envío (solo la propia, sin usar; en revisión → `marcar` → cola medios), `conFoto` (la dirección solo a quien la
  puede ver), el idioma detectado ANTES de la transacción. Pantallas: Mi cuenta (composer de Soporte: IconButton «image», miniatura, «Quitar foto»;
  la foto en la burbuja; «Foto en revisión» / «Foto quitada por To’Latino»; vuelve a traer desde la foto en revisión), panel (bloque de fotos
  «Agregar una foto», el `thread` del sistema con `img`/`imgL`/`tr`), `traducirCon` (useTraducir sin hook para el panel), Super Admin (Colas › Medios
  «Foto de Mensajes», «Está bien» / «Quitar foto» con auditoría; Mensajes reportados con la miniatura). El Compa recibe «[foto]». Guardián nuevo
  `fotoMensajePrivada`; `traductorFueraDeTx` mira enviarCliente/enviarNegocio; `mensajesTapados` acepta `limpiar(texto, conFoto)`. **alreves9tmsg
  27/27**; guardianes ✓; tsc ✓; extraer --verificar ✓; la migración aplicada dos veces sobre un Postgres 16 de prueba con el esquema mínimo (las 5
  restricciones rechazan lo que deben; el aviso en vivo sale). e2e **msg9t** escrita (fotos, revisión, aprobar y quitar, topes, regla apagada,
  traducción con el stub, Super Admin ve el original) — **no corrió aquí** (sin Docker ni base): la corre el CI. Ayuda: mensajes.md y
  admin-confianza-y-seguridad.md (ES/EN).
- **19 nov · 9t · Objetivos táctiles de 44 px, REHECHO (el área se decide al tocar)** (LAUNCH «Objetivos táctiles de 44 px» → ✓; REVISION «9t —
  Objetivos táctiles de 44 px», rehecho). El primer intento (4bb49b4, revertido en 3b82b7d) agrandaba con estilos un `::after` por control: el área
  de uno pisaba la caja de un control de OTRO contenedor (los topes por grupo solo sabían de los hermanos) y volver posicionado cada control
  cambiaba pixeles. Ahora **`packages/ui/src/toque.ts`** (exportado como `@tolatino/ui/toque`, montado una vez en el layout raíz con
  `apps/web/app/AreaDeToque.tsx`, como FocoHojas) decide cada toque con lo que el navegador tiene bajo el dedo (como el TouchDelegate de
  Android): solo dedo o lápiz (`pointerType`), un toque que no se movió; lo de debajo no es ni está dentro de nada ACCIONABLE (controles,
  enlaces, campos, etiquetas, lienzos, videos, `data-toque="no"`) ni tiene acción propia (cursor de mano, manejadores de React entre él y el
  control: la fila del plato, el mapa, la galería, el fondo de una hoja); de lo accionable a menos de 22 px que SE VE, el más cercano (empate =
  nadie) es un control, el dedo está en su área de 44 × 44 y es de la misma capa (hoja, encabezado fijo). Se decide en `pointerdown` (sin los
  eventos de ratón de compatibilidad), se activa con `click()` en `pointerup` y el clic de Chrome de ese mismo toque se descarta (por tiempo, no
  por lugar: Chrome corrige el punto del toque hacia lo tocable). Sin estilos ni elementos: la página es la misma pixel a pixel por construcción.
  **Medida** (`pruebas/lib/toque.cjs`, reescrita): bajando la página de a una vista, cada caja de control y de campo (5 × 5 puntos) es de él —ni
  un hit-test nativo fuera de su propia caja (lo revertido) ni el área se lo da a otro—; el anillo del área de 44 de cada control chico, punto
  por punto, es suyo o de un vecino / otra capa / lo de debajo con acción propia (si no, CORTO); un toque REAL (`touchscreen.tap`) junto a un
  control le llega a él solo y uno en la caja de otro, a ese otro; y la página con el área y en pausa, igual pixel a pixel. **a11y9c** la usa en
  la ficha, «Tu pedido», la reserva, los boletos y publica, y en una sección nueva a 320 y 375 con y sin letra grande (`users.big_text`). **Lo que
  cazó:** a 320 con letra grande el nombre «To’Latino» del encabezado se salía de su caja y tapaba el botón del idioma (un toque ahí abría Inicio)
  → `globals.css`: ahí, y solo ahí, el nombre baja a 17 px. Guardián **`toqueDe44`** (las reglas de `destinoToque` y su orden, ACCIONABLE /
  CONTROL, 44, solo dedo, descartar el clic, no pinta nada, montado y exportado, ningún .css con `data-toque` / `--tl-toque`, el arreglo de
  320, a11y9c mide); **`alreves9ttoque2` 29/29** (22 del guardián + crear un .css con el área; y en el navegador, con toque.ts sin tipos en una
  página de prueba: limpia sale limpia; la versión con `::after` → «To’Latino» pisa «Ver las 3 fotos» de otro contenedor; sin «propio» y con la
  distancia mal → pisa; sin área / área de 36 → cortos; sin descartar el clic → el toque cuenta dos veces). **Corrido en local** (base copiada
  `tl_toque`, el build de este árbol servido en una red aparte para no tocar el :3100 de la otra sesión): a11y9c 151 ✓ (sin el tramo de fotos de
  publica: no hay Garage aquí), menu2b 22 ✓, rsv2e 30 ✓, apt4f 28 ✓, apt4q 24 ✓, fic4id 39 ✓, avisos2j 14 ✓, fic005 22 ✓, bus9t 85 ✓ (la
  primera vez rojo por un apartado que apt4f/apt4q dejaron confirmado en la misma base; cancelado, verde); guardianes ✓; tsc ✓ (apps/web y
  packages/ui). **No corrió:** WebKit (no hay en esta máquina) ni un iPhone real; el tramo de fotos de a11y9c. Con el ratón no se amplía (decisión
  por defecto en REVISION).
- **19 nov · 9t · Mensajes ENTRE VECINOS: fotos y «Ver traducción» ES↔EN** (LAUNCH «Mensajes · lo que quedó de 9t» (2) → ✓; REVISION «9t — Mensajes
  entre vecinos: fotos y Ver traducción»). Migración **0187**: `media.owner_kind 'dm'` + `media_dm_privada` (privada, «privado/m/»), índices del tope por
  hora y de la purga de 24 h (`media_msj_subidas_idx`, `media_msj_pendientes_idx`), `dm_messages.media_id` (único) y `lang`; `dm_messages_antes` (un
  mensaje no cambia su foto ni su idioma; la foto es una 'dm' privada de quien escribe; lo de 0134 igual), `dm_messages_despues` («Foto · Photo»),
  `media_dm_vivo` (aviso en vivo al decidir la foto), `ugc_translations` + 'dm_message', `datos_purga_pendiente` la cuenta. **Bug de paso:**
  `dm_messages_body_check` exigía 1–1000 letras siempre y la purga de una cuenta (body '' con hidden_at) chocaba: la purga de alguien con mensajes entre
  vecinos fallaba; ahora body '' vale con hidden_at o con la foto (dm9t §2 lo prueba). Código: la misma subida con `para=dm` (solo con la Comunidad
  completa; el tope de 30/h cuenta las dos clases), ver (`fotoDeVecinos`: quien la subió; la otra persona revisada por `fotoDmVecino` —abierta, sin
  bloqueo, sin ocultar—; el equipo con caso de medios o conversación reportada —`admin-dm.ts dmFotoConReporte` con CON_REPORTE— en su cola y ciudad,
  auditado), `lib/mensajes-vecinos.ts` (tomarFoto/ponerFoto después de otraPersona, idioma antes de la transacción, `conFoto`, `FUENTE_TR_DM`,
  `MENSAJES_DE` para la purga: dmSoloConReporte sigue igual), `traduccion.ts` (dm_message: cuenta + Comunidad), Super Admin (Colas › Medios «Foto de
  Mensajes entre vecinos» —solo la foto y quién la mandó, rama ANTES de la de la Comunidad—; Mensajes entre vecinos reportados con la foto; decidir
  igual que la del chat), `mensajes-purga.ts` (chat y dm), mapa de datos (fotos 'dm'). Pantalla APP-COM-CHAT: IconButton «image», miniatura con
  «Quitar foto», la foto en la burbuja, «Foto en revisión» / «EN REVISIÓN» / «Foto quitada por To’Latino.», «Ver traducción» (LineaTr); la lista dice
  «Foto». Guardián nuevo **`fotoDmPrivada`**; `fotosSinEnviarSePurgan` y `traductorFueraDeTx` ampliados; `fotoMensajePrivada` mira la auditoría y las
  colas dentro de GET (la rama de vecinos ya no puede tapar que falten en la del chat); alreves5c actualizado a los textos nuevos. **Corrido aquí**
  (Postgres 16 local, copia de tl_loc → tl_dm9t, build del worktree servida en :3197, traductor de mentira): tsc ✓; guardianes ✓; **alreves9tdm
  29/29**, alreves9tmsg 27/27, alreves9tpurga 6/6, alreves5c 29/29, alreves9m 41/41; **com5c ✓**; **dm9t** §1 (traducción, caché, X no traduce), §2
  (base) y **F1** (foto simulada: enviar, revisión, Colas, en vivo, quitar, reporte auditado, bloqueo, la de otro / la vieja) ✓; **F2 (subida real,
  metadatos, 413/415/403, purga de 24 h) no corrió**: no hay almacén de fotos local (503) — la corre el CI. Capturas a 390 miradas (d9t-1…10).
  Ayuda: comunidad-vecinos-seguir-bloquear-y-mensajes.md y admin-confianza-y-seguridad.md (ES/EN).
- **19 nov · 9t · Confirmación 44546763705 (f24bc53): 203/205 en todos los carriles; los dos rojos eran precondiciones de la prueba.** msg9t daba
  por hecho que el servicio de imágenes (:8790) estaba apagado y com5d lo deja encendido → msg9t lo apaga mientras dura y lo vuelve a encender;
  nav9t buscaba Café Quisqueya en Inicio (depende de lo que dejan las pruebas anteriores) → parte de Buscar; en orden barajado fic005 caía porque
  svc3a le deja una opción a «Fade» → fic005 lo deja sin opciones mientras corre y lo devuelve. Reproducido y verde en local (nav9t 17 ✓, fic005
  22 ✓ con la opción puesta y roto sin el arreglo). Corrida dirigida 44571384488 (com5d → msg9t, svc3a → fic005, nav9t).
- **19 nov · 9t · Tabla del Barrio con 1 M:** carga 44571463348 (7 M filas): Tabla p95 3.5 ms, tabla corta 1.7 ms (presupuesto 40; antes 86) con
  0188 + 0189. LAUNCH 5f → ✓. Todo lo demás de la Comunidad dentro de su presupuesto (barrido 9.2 s de 10).
- **19 nov · 9t · La foto de un mensaje que el equipo aprueba avisa a la otra parte** (LAUNCH «Mensajes · lo que quedó de 9t» (4) → ✓):
  `decidirFotoCom` (solo lo que estaba en revisión) → `avisarFotoAprobada` (biz_msg / msg_user, nada con bloqueo) y `avisarFotoDmAprobada`
  (dm_message; nada con la conversación cerrada, bloqueo o silencio), fuera de la transacción. Guardián **fotoAprobadaAvisa**, alreves9tfotoaviso
  9/9; dm9t verde en local con la comprobación nueva; msg9t la lleva (corre en el CI: necesita el almacén). Ayuda ES/EN: mensajes.md y
  comunidad-vecinos-seguir-bloquear-y-mensajes.md.
- **19 nov · 9t · El barrido de la Comunidad en una pasada** (LAUNCH «El barrido de la Comunidad con 1 M de vecinos»): migración **0190**
  redefine `com_cifras_resumir`: «activos por rango» sale de UNA pasada (la última actividad de cada vecino por ciudad en 90 días, contada para
  los cortes de 7, 30 y 90) en vez de tres. Local (105 mil publicaciones, 526 mil comentarios, 306 mil votos): 2,4–2,9 s → 1,5 s, el mismo
  resultado fila por fila y 0 diferencias contra `com_activos_por_rango` en cada ciudad y período (98 filas). com5e lo compara en cada corrida
  (63 ✓ local). Guardián **resumenComunidadUnaPasada**, alreves9tresumen 4/4. La medida con 1 M va en la carga de la Comunidad.
- **19 nov · 9t · Barrido de la Comunidad por partes** (0191 + 0192): la carga 44577890861 midió cada parte con 1 M (rangos 0,7 s · activos 7,5 s ·
  Recomendados 0,5 s; el total 11,7 s en un runner lento: «contenido» y «categoría» también salieron ~1,5× más lentos sin tocarlos). Rangos y
  Recomendados siguen cada 10 min (tope 10 s); los activos por rango 7/30/90 pasan a cada hora con tope propio de 15 s (REVISION: decidido por mí,
  reversible). Ayuda de Analítica ES/EN al día. Guardián resumenComunidadUnaPasada ampliado, alreves9tresumen 7/7.
- **19 nov · 9t · Barrido de la Comunidad dentro de sus topes** (carga 44581283913): vuelta de 10 min 2,1 s (de 10), activos cada hora 9,7 s (de 15). LAUNCH ✓.
  La imagen nueva del runner (20261111.196.1) es ~1,5× más lenta en todo (generar la carga misma también): «contenido» y «categoría» se pasan
  de su presupuesto en las tres últimas cargas sin cambios en su código (anotado en LAUNCH «Lo de una sola vuelta varía en el runner»).
- **19 nov · 9t · Confirmación 44573806469 (fb642c0): «todas las fases» y «al revés» en verde; 5 carriles con UNA roja cada uno, arregladas:**
  (1) **Subidas con tope aunque el navegador no avise el tamaño** (iPad/SE: msg9t 13 MB daba 400): `lib/subida.ts` `leerFormulario` lee por partes,
  no guarda nada pasado el tope y termina de recibir (tirándolo) para que llegue el 413 y no un corte; en las 7 rutas de subida (fotos de
  medios, Mensajes, Ayuda, Reclamo, Repartidor, video del negocio, llavero). Prueba nueva **sub9t** (13 MB por partes y con tamaño → 413 en
  Mensajes, Ayuda y Reclamo; local contra un servidor con almacén de mentira: los 6 413 ✓), guardián **subidaConTope**, alreves9tsubida 5/5.
  (2) **nav9t** «dos veces seguidas»: Next a veces manda trozos VACÍOS aparte (metadatos y el lugar de la barra; 1 de 80 en local): la prueba
  ahora falla solo si llega CONTENIDO escondido o esqueleto. (3) **cit3b** barajada: bus9t devolvía «Fade» sin el precio de cada silla →
  bus9t guarda y devuelve el precio, y cit3b pone los precios de la semilla como precondición propia. (4) **menu2a-f** escritorio 1024: el
  segundo toque al interruptor llegaba antes de tiempo → la prueba mira la base y vuelve a tocar si sigue agotado. Local: menu2a-f 11 ✓, nav9t
  17 ✓, bus9t 87 ✓, cit3b 38 ✓.
- **19 nov · 9t · Platos guardados** (OK del fundador a la propuesta de REVISION «Guardar un plato»; LAUNCH «Platos guardados» cerrada): en la hoja
  del plato (y la ventana de escritorio) el cuadro del corazón de la barra de la vacante (50 px) a la izquierda del contador, `aria-label` «Guardar
  plato» / «Save dish» con `aria-pressed`, rojo y lleno al guardar; sin sesión lleva a /entrar y vuelve a la hoja de ese plato (?plato=). Migración
  **0193** `item_saves` (id, user_id, item_id, city_id del negocio, created_at, removed_at): nada se borra (quitar pone `removed_at`, volver a guardar
  crea otra fila; disparador: sin DELETE salvo la purga con tl.purga, una fila quitada no vuelve), una viva por persona y plato (índice único parcial),
  índice (user_id, created_at desc). `lib/platos-guardados.ts`: `guardarPlato` (candado por persona y plato; solo un plato que su página muestra,
  con la regla de la ficha: Comida activo, Menú encendido sin pausa, PLATO_VIVO en SECCION_MENU_VISIBLE, Free con sus primeros `free_items`),
  `platosGuardadosDe` (una consulta por ficha, en la tanda de `menuPublico`), `misPlatosGuardados` (100, una consulta, precio con la oferta de quien
  mira, `disponible` con la MISMA regla). Acción `platoGuardar` (acciones-platos.ts, `quien()`). Mi cuenta › Guardados: chip «Platos y productos · N»
  (favV), filas con foto, plato, NEGOCIO, precio y «Pedir» (abre la hoja del plato en su menú); el que ya no sale: «NO DISPONIBLE», sin precio ni
  «Pedir»; «Editar» → «Quitar»; vacío con el corazón. El conteo de Guardados del Resumen suma los platos vivos. Espejo: el 360° del Super Admin no
  lista guardados (no se inventó); su «Ver como» y el archivo de la persona salen del mapa de datos, que ahora trae `item_saves` (exporta
  `platos_guardados`, purga borrar, fusión mover). Guardián **platosGuardadosSinBorrar**, **alreves9tplatos** 27/27. e2e **plat9t** 38 ✓ en local
  (base `tl_loc` con 0193; `next build` standalone en :3155 con secretos propios fuera del repo; `docker exec` de mentira hacia psql): sin sesión →
  /entrar y vuelta; guardar, recargar (marcado), lista con precio y «Pedir» → hoja; quitar (fila queda) y volver a guardar (fila nueva); oculto →
  «No disponible» sin «Pedir», «Quitar» desde Mi cuenta; 1360 y EN. tsc + build + guardianes en verde. Ayuda: mi-cuenta (ES/EN).
- **19 nov · 9t · Platos guardados en Mercados y Tiendas** (OK del fundador: el mismo corazón y la misma tabla `item_saves`): una sola pieza
  `app/(app)/n/[id]/Corazon.tsx` (`CorazonGuardar` + `useGuardados`: aria-pressed, rojo, sin sesión a /entrar y de vuelta a ESA hoja) en la hoja del
  plato, la del producto del mercado («Guardar producto», a la izquierda de la barra) y la del artículo de la tienda (también la de Auto, Hogar y
  Transporte, que es la misma). `?producto=<id>` abre la hoja (mercado: `?tab=svc`; tienda: `?tab=shop`). `lib/visible-publico.ts` +
  `PRODUCTO_MERCADO_VIVO` y `ARTICULO_TIENDA_VIVO`, que ahora leen `mercPublico` y `tiendaVenta` (una sola definición); `guardarPlato` y la lista
  usan `EN_SU_PAGINA` = plato, producto o artículo con la regla de su ficha (tope 200 / 120 como sus listas; lo que va en plan, solo con el plan
  encendido). Lo guardado llega en la tanda de cada ficha (`mercPublico`, la tienda en page.tsx). Guardados: «$X/lb» en lo que va por libra; «Pedir»
  (menú, mercado que toma pedidos), «Ver» (mercado sin pedidos) o «Apartar» (tienda). Guardián `platosGuardadosSinBorrar` ampliado (una pieza del
  corazón, las tres hojas, las reglas por módulo), alreves9tplatos y plat9t §7 (La Cosecha «Pollo entero» por libra y Boutique Yaritza «Cartera»).
- **19 nov · 9t · Objetivos táctiles de 44 px, de verdad** (LAUNCH «Objetivos táctiles de 44 px» → ✓; REVISION «9t — Objetivos táctiles de 44
  px, de verdad», a mirar; decisión del fundador: agrandar lo que lo necesita). La CAJA de cada control mide ≥ 44 × 44; nada de áreas invisibles
  (los dos intentos anteriores, `::after` y «decidida al tocar», se revirtieron). Sistema por la tabla `TACTIL` de `scripts/portar-sistema.mjs`
  (sobre lo ya portado; `sistemaSincronizado` igual): Button md/sm, IconButton, Chip con clic, Tabs, «Ver todo» de SectionHeader, encabezado
  (idioma, campana, avatar, logo, buscador y ciudad; el nombre «To’Latino» se ajusta con unidades del contenedor y, sin sitio, queda el logo:
  `globals.css` `[data-marca]`), AddPill (cerrado: el cuadrito igual en una caja de 44 sobre la foto; abierto «− n +» de 44), QtyStepper, «Editar»
  de CartLine, VoteBar (votar 44 × 44 con el número encima, fila que se envuelve), «⋯» y texto de la publicación, AdminBar en el teléfono (la
  ciudad en su fila), AdminRow, Completa tu cuenta, BusinessRow (se encoge; la etiqueta baja). Los NOMBRES que son botón (plato, negocio,
  autor) crecen a 44 con relleno y margen negativo dentro de su fila (el menú no se mueve; antes 18 px). Pantallas: Buscar, la ficha y sus
  reservas (enlaces de acción `min-h-11`), Comunidad, Eventos, Mi cuenta, las X de cerrar (36 → 44), Inicio (categorías en columnas que caben).
  Medido en local (`next build` standalone en :3156 contra `tl_loc`, Chromium) en 10 pantallas clave: controles < 44 a 390 de 401 → 0, a 320
  con letra grande de 315 → 0 (y 0 a 320, 360, 375, 430 y 834); < 24 en la ficha de 17 → 0. Nuevo `pruebas/lib/tactil.cjs` (chicos con lista
  de permitidos de 2 reglas con razón, pisan —ninguna caja le quita el toque a otro control—, desbordan); a11y9c lo EXIGE en las pantallas clave a
  390 y 320 con letra grande, el Super Admin a 390 y 320, «Tu pedido» y el AA 24 de la ficha. Guardián `objetivosTactiles`, `alreves9ttactil`
  17/17. Cazó además (y quedó arreglado): «To’Latino» encima de «ES» a 320 (ya pasaba con letra grande), «Abierto ahora» de Inicio 303 px en
  275, «Compartir» de Comunidad fuera de su fila a 320 con letra grande, «Mercados»/«Doctores» fuera de su cuadro a 320. Pendiente (LAUNCH,
  nueva línea): el escritorio (24 px AA) y las pantallas fuera de las clave.
