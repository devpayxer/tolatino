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
