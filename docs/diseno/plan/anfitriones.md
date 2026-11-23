# Anfitriones del barrio (decisión AO, 23 nov) — plan del bloque

## Qué se construyó (parte 1)
- **Base (0215):** `users.kind` ('person' | 'host'); las ocho voces son cuentas sin teléfono ni correo (nunca entran). La base rechaza para un
  anfitrión: sesión, equipo, puntos, monedas, Tabla, insignias y mensajes privados (triggers `anf_*`); su rango queda en 1. Persona en
  `com_hosts`; tipos en `com_host_kinds`; pregunta del día en `com_host_questions`; control por ciudad en `com_host_cities`; registro solo
  inserción en `com_host_log` (voz, fuente, motor, modelo, costo, publicación o motivo); tope propio `com_host_spend` / `anf_reservar` /
  `anf_anotar`. Todo **apagado de fábrica** (también en producción). Configuración › Comunidad: `anf_espera_min`, `anf_idas_max`,
  `anf_nuevo_dias`, tres tramos (`anf_tN_hasta/pub/resp`), `anf_tope_mes_cents`, `anf_pausa` (solo desde Contenido › Anfitriones).
- **Marca** «Anfitrión/Anfitriona» · «Host» (`lib/comunidad-comun.ts` MARCA_ANF, marcaAnfitrion, nombreConMarca), en el lugar del rango (pieza
  `rank` de PostCard y del comentario; `Tag` en el perfil). Sitios: tarjeta del muro y de la publicación, comentarios y respuestas del hilo, menú
  de la publicación, perfil (texto fijo, sin «Mensaje», sin puntos ni insignias), Mi cuenta › Siguiendo/Seguidores/Bloqueados, Buscar › Vecinos,
  avisos (valores en dos idiomas en `avisar`), Super Admin › Contenido (lista y hilo), Colas (autor del caso). La Tabla las excluye.
- **Motor** `lib/compa/anfitriones.ts`, solo desde el barrido central: cupos por ciudad (`lib/anfitriones.ts` cupoCiudad: actividad real de
  personas 7 días → tramos, o manual), lo propio de la app por plantillas (`lib/anfitriones-comun.ts`), respuestas por la interfaz Modelo de
  El Compa con su tope (fuera de producción, siempre simulador o reglas), temas delicados en silencio antes de gastar, filtro propio y la
  misma puerta que un vecino (`publicar()` y `comentar()`).
- **Super Admin › Contenido › Anfitriones** (`AnfitrionesAdmin.tsx`) con piezas del admin existentes.
- **Guardianes:** anfitrionSiempreMarcado, anfitrionSinPuntosNiMensajes, anfitrionesNuncaProveedorEnPruebas, anfitrionesSoloBarrido,
  anfitrionesApagadosDeFabrica, anfitrionFiltroPropio (al revés: `pruebas/alreves/alrevesAnfitriones.cjs`). e2e `pruebas/e2e/anfAO.cjs`.

## Qué se construyó (parte 2 · 5b, noticias por RSS/Atom)
- **Base (0216):** `com_host_sources` (medio, URL https, su servidor, país, tema noticias/deportes, voz, idioma, palabras que descartan; estados
  on/off/retired; nace vacía y apagada; la base exige que el servidor de la URL sea `host`), `com_host_source_reads` (cada lectura, solo inserción),
  `com_host_news` (huella sha256 del enlace normalizado, única; nueva/publicada/descartada con motivo; retención: lo no publicado se vacía a los
  `anf_noticias_retener_dias`), `com_posts.source_url/source_name` (solo una voz: trigger `com_posts_fuente_anfitrion`). Configuración › Comunidad:
  `anf_fuentes_por_pasada`, `anf_fuente_cada_min`, `anf_noticia_horas`, `anf_noticias_retener_dias`.
- **Lector** `lib/noticias-lector.ts` (+ lo puro en `lib/noticias-comun.ts`): solo una fuente de la tabla por su id; https al servidor de la fila;
  DNS con todas las direcciones públicas (`ipPrivada`), conexión a la IP comprobada (lookup fijo) y comprobación del socket; redirecciones solo al
  mismo servidor por https (máx. 2); 5 s; 1 MB cortando el flujo (también descomprimido); tipo XML/RSS/Atom; XML propio sin DTD ni entidades y con
  tope de elementos y profundidad; texto limpio y acotado. Lo llaman SOLO el barrido (`barrerFuentes`) y «Probar» del Super Admin. En pruebas,
  `NOTICIAS_RSS_BASE` (prohibida en producción) manda DNS y descarga al simulador de `scripts/proveedores-sim`.
- **Motor** `lib/compa/noticias.ts`: lee (tope por pasada, espera por fuente, respaldo exponencial hasta un día, fallo visible), clasifica al leer
  (vieja, sin enlace del medio, política partidista, sucesos violentos, menores, tema delicado, palabra de la fuente) y publica desde
  `barrerAnfitriones` dentro del cupo: entrada de la voz + resumen (modelo con SOLO título y descripción, tope propio; sin modelo, sin cupo o
  con una cifra que la fuente no trae → plantilla «Titular») + medio + pregunta; enlace en la caja «Fuente» (`rel="noopener noreferrer nofollow"`).
  Una nota no va a dos ciudades en la misma pasada ni en el mismo minuto.
- **Super Admin › Contenido › Anfitriones › Fuentes de noticias:** alta/edición (misma validación que el lector), encender/apagar/retirar,
  «Probar», números de 7 días y últimas 30 notas con su motivo. Todo auditado.
- **Guardianes:** noticiasLectorSoloBarrido, noticiasLectorSeguro (tabla de IP y URL ejecutada contra el código real), noticiasXmlSinEntidades,
  noticiasApagadasDeFabrica y proveedoresSimuladorAislado ampliado (al revés: `pruebas/alreves/alrevesNoticias.cjs`). e2e `pruebas/e2e/anfNot.cjs`.

## Qué quedó fuera
- Semilla del sandbox con fuentes reales: no se pudo verificar ninguna URL desde la máquina de construcción (sin salida a internet); queda la lista
  de candidatas en el reporte del encargo para verificar y cargar.
- Avatares ilustrados (hoy iniciales del sistema).
- Tipo «eventos de la semana» y «empleos» probados por plantilla y guardián, no por e2e (la e2e usa «negocio nuevo»).
- Copia de las voces en inglés (hoy publican en español; responden en el idioma de la publicación).
