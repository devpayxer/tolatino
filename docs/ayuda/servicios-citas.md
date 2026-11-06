# Servicios y reglas de citas · Services and booking rules

_Pantallas: Panel › Lo que vendes › **Servicios** (`/panel/{negocio}/mod/servicios`), el editor de cada servicio,
**Cómo trabaja tu negocio**, **Citas** (`/panel/{negocio}/mod/citas`) y **Sillas** (`/panel/{negocio}/mod/sillas`);
Super Admin › Negocio 360° › **Lo que vende** (negocios de belleza). Versión: Fase 3 · bloque 3a (6 nov 2026)._

## Qué hace
- **Servicios:** cada servicio tiene categoría (Cortes, Barba…), nombre y descripción (ES y EN opcional), foto,
  **duración** y **tiempo entre citas** (la limpieza: la agenda lo deja libre, el cliente no lo ve), precio, «desde ·
  varía» y hasta 3 grupos de **opciones** que cambian precio y tiempo («Largo del pelo: Corto · Largo +$5 +10 min»).
  Los **Extras** (lavado, diseño…) se añaden a cualquier servicio. Se ordenan con Subir/Bajar, se ocultan de la página
  sin perderlos o se quitan (nada se borra).
- **Cómo trabaja tu negocio:** con **empleados** (precio del local), **a comisión** (precio del local, tú pones el %) o
  **rentan silla** (cada silla pone su precio y su agenda; tú cobras la renta). Si rentan silla, el editor pide el
  precio de cada silla; vacío = esa silla no lo hace.
- **Citas (reglas):** confirmar al instante o revisar cada solicitud, cuánto tardas en contestar (15 min, 30 min, 1 h,
  3 h), depósito ($0, $5, $10, $20, $50), hasta cuándo se cancela gratis (2, 4, 24 o 72 h antes), tolerancia de
  llegada y si el cliente elige con quién.
- **Sillas:** con sillas rentadas, cada barbero decide sus reglas (al instante o no, cuánto tarda, depósito) y si recibe
  citas en línea.
- **To'Latino:** en Negocio 360° › Lo que vende puede **pausar Servicios** o **pausar Citas** y **ocultar un servicio**,
  siempre con motivo; el dueño ve el motivo en su panel. Todo queda en la auditoría.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Servicio sin nombre, sin precio o sin categoría | No se guarda: «Escribe el nombre del servicio» / «Ponle precio» / «Elige la categoría». |
| Opciones | Máximo 3 grupos de 2 a 5 opciones; un grupo sin nombre o con menos de 2 opciones no se guarda. Duración entre 5 min y 8 h. |
| Silla rentada sin precio en un servicio | Esa silla no lo ofrece; el cliente no la ve para ese servicio. |
| Cambias de «rentan silla» a «empleados» | Los precios por silla se guardan pero no se usan; todos cobran el precio del local. |
| Ocultas un servicio | Deja de salir en tu página; no se borra y lo vuelves a mostrar cuando quieras. |
| To'Latino pausa Citas | Tu página dice «llama o pasa por el local»; las citas ya pedidas siguen. Ves el motivo arriba en el panel. |
| To'Latino oculta un servicio | Sale «Oculto por To'Latino» con el motivo; no se puede volver a mostrar desde el panel. |

## Preguntas frecuentes
**¿El cliente ve el tiempo entre citas?** No. Solo ve la duración del servicio con las opciones que elija.
**¿Quién decide el depósito si rento sillas?** Cada silla. Las reglas del negocio valen para quien no tenga las suyas.
**¿Puedo tener servicios y menú a la vez?** Lo que vendes se adapta a la categoría: belleza usa Servicios.

---

## English
**Services** have a category, name and description (Spanish, optional English), photo, duration and clean-up time (kept
free on the calendar, never shown to customers), price, "from · varies" and up to 3 option groups that change price and
time; **Extras** can be added to any service. Reorder, hide (nothing is deleted) or remove. **How your business works**:
employees, commission or chair rental (each chair sets its own price; blank means that chair doesn't offer it).
**Booking rules**: instant confirm or review, response time (15 min–3 h), deposit ($0–$50), free cancellation window
(2–72 h), arrival tolerance and staff choice. With chair rental each chair sets its own rules. To'Latino can pause
Services or Booking and hide a service, always with a reason the owner sees in the panel; existing appointments continue.
