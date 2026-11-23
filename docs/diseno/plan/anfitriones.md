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

## Qué quedó fuera
- **5b Noticias por RSS/Atom** (diseñado, no construido): tabla `com_host_sources` (país, tema, voz, url https, host, activa), lectura en el barrido
  con `fetch` propio: solo https, solo hosts de la tabla, `redirect: "manual"` (una redirección a otro host se descarta), resolver DNS y rechazar
  IP privadas/loopback/link-local/metadata (y re-validar la IP de la conexión), tiempo 5 s y tamaño 512 KB; de cada nota título, enlace, fecha y
  huella (sha256 del enlace normalizado) en `com_host_news` para no repetir; resumen propio de 2–3 líneas por el modelo + el enlace; nunca el
  texto del artículo. En pruebas, servidor de mentira en `scripts/proveedores-sim/`. En producción, sin fuentes.
- Avatares ilustrados (hoy iniciales del sistema).
- Tipo «eventos de la semana» y «empleos» probados por plantilla y guardián, no por e2e (la e2e usa «negocio nuevo»).
- Copia de las voces en inglés (hoy publican en español; responden en el idioma de la publicación).
