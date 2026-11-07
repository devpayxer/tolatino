# Super Admin · Analítica · Super Admin · Analytics

_Pantalla: ADM-ANALIT (`/admin/analitica`), teléfono y escritorio. Versión: Fase 1 · bloque 1n (6 nov 2026). Para el
equipo de To'Latino (y El Compa como copiloto del equipo)._

## Qué hace
Muestra lo que pasa en la plataforma con **datos propios**: nada sale a Google, Meta ni a otra empresa. Período de 7, 30
o 90 días, solo de tus ciudades.
- **Resumen:** el embudo del directorio, contado en personas (cuenta o dispositivo): cuántas buscaron o abrieron una
  categoría → cuántas abrieron una ficha → cuántas tocaron Llamar, WhatsApp o Cómo llegar.
- **Gente y negocios:** vecinos con cuenta y nuevos del período, % activos (entraron en el período), negocios Pro y
  Free, % verificados, retención de las cuentas nuevas (vuelven el día 1, 7 y 30) y negocios por categoría.
- **Soporte y confianza:** vecinos con sanción activa, % de casos de las colas decididos dentro de su plazo y las colas
  abiertas con su plazo.
- **Doctores y Profesionales · Mercados y Tiendas · Fiestas y Transporte:** solo cifras de cada grupo (fases 4h–4z).
- **Noche (4ne):** mesas y VIP pedidas, **% confirmadas en 60 minutos**, % vencidas sin respuesta, **mesas no respetadas**
  (el local canceló una mesa ya confirmada o el cliente pidió ayuda porque no le respetaron la mesa o la lista), depósitos
  (cobrado, retenido, devuelto y lo que **se quedó con el local**), **% de la lista que entró** (de las noches ya cerradas),
  **veces que el cover subió después de publicado** esa misma noche (sale del historial «Esta noche», que nunca se borra),
  **% «la fila, como decía»** en las reseñas, ayudas **«cobraron más cover» por cada 100 noches** y **licencias de licor
  vencidas** (PLCB). Debajo, los motivos de ayuda de la noche.
- **Educación · Niños · Deporte (4eg):** inscripciones pedidas por rubro, **% confirmadas en 24 h**, % vencidas, **grupos que no
  abrieron**, **ocupación de los grupos**, matrículas (cobrado, retenido, devuelto y lo que **se quedó con el lugar**), gente en **lista
  de espera** y días en promedio, **bajas de membresía** pedidas y confirmadas en 72 h, % «cobraron el total» y «certificado prometido»
  en las reseñas, **ayudas por cada 100 inscripciones** y **guarderías con licencia DHS vigente**. Nunca datos de un niño ni de un inscrito.
- **Búsquedas sin oferta:** lo que buscaron y no había (pidieron aviso), con enlace a Catálogo.
- **Exportar:** Negocios, Historial y Búsquedas sin oferta en CSV (abre en Excel o Sheets). Permiso analit · exportar;
  cada descarga queda en la auditoría.

## Qué se cuenta y qué no
| Se guarda | No se guarda |
|---|---|
| El evento (ver categoría, ver ficha, buscar, contactar, entrar, registrarse, publicar negocio, recomendar, reclamar, reportar foto, pedir aviso), la cuenta o el dispositivo, la ciudad y datos del evento (p. ej. cuántos resultados tuvo una búsqueda) | Nombre, teléfono, correo, IP ni lo que la persona escribe en un formulario |
| Un día activo por cuenta y por dispositivo | Robots y buscadores (no cuentan) |

El dispositivo es un número al azar en una cookie que solo lee el servidor de To'Latino; si la persona borra las
cookies, cuenta como dispositivo nuevo.

## Preguntas frecuentes
**¿Por qué la retención dice que todavía no hay datos?** Hacen falta cuentas nuevas con al menos 1, 7 o 30 días de edad.

**¿Por qué «el cover subió» cuenta solo subidas?** Bajar el cover en la noche es a favor del cliente. Cada subida queda
con su hora en el historial del local (Negocios 360° › Esta noche) y a los que estaban en la lista les llega el aviso.

**¿«Mesas no respetadas» es lo mismo que la cola?** Es el total del período. La cola «Mesas no respetadas» se abre sola
cuando un mismo local llega a 3 en 30 noches.

**¿Dónde están vendido, comisión, operaciones, rangos y comunidad?** Llegan con los pedidos, las citas y Comunidad.

---

## English
Analytics shows what happens on the platform with first-party data only (nothing goes to third parties), for 7, 30 or
90 days in your cities: the directory funnel (search or open a category → open a business page → tap Call, WhatsApp
or Directions, counted in people), people and businesses (neighbors, new, % active, Pro/Free, % verified, new-account
retention on day 1/7/30, businesses by category), support and trust (sanctioned, % of queue cases decided within SLA,
open queues), searches without supply, and CSV exports (businesses, history, searches without supply; audited). Events
store the account or a random device id, the city and event data — never name, phone, email, IP or form text; bots
are not counted. Money, community and ranks arrive with their modules.

Per-category tabs show numbers only. **Night (4ne):** table and VIP requests, % confirmed within 60 minutes, % expired
without a reply, tables not honored (the venue cancelled a confirmed table or the customer asked for help because the
table or list spot was not honored), deposits (charged, held, refunded and kept by the venue), % of the guest list that
got in, times the cover went up after it was posted that same night (from the append-only «Tonight» history), % of
reviews saying «the line was as posted», «charged more cover» help requests per 100 nights and expired liquor licenses
(PLCB), plus the night's help reasons.
