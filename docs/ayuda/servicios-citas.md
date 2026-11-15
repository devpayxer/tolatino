# Servicios y reglas de citas · Services and booking rules

_Pantallas: Panel › Lo que vendes › **Servicios** (`/panel/{negocio}/mod/servicios`), el editor de cada servicio, **Cómo trabaja tu negocio**,
**Citas** (`/panel/{negocio}/mod/citas`) y **Sillas** (`/panel/{negocio}/mod/sillas`); Super Admin › Negocio 360° › **Lo que vende** (negocios de
belleza). Versión: 6 nov 2026. Audiencia: negocio. Tema: panel._

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
  llegada, si el cliente elige con quién y **cuándo termina la última cita**: al cerrar, o 15 min, 30 min o 1 h antes
  (tu página no ofrece horas que terminen después; sirve para recoger y cerrar a tiempo).
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

## English

### What it does
- **Services:** each service has a category (Haircuts, Beard…), name and description (ES and optional EN), photo, **duration** and **time between
  appointments** (cleanup: the schedule leaves it free, the client does not see it), price, «from · varies» and up to 3 groups of **options** that change
  price and time («Hair length: Short · Long +$5 +10 min»). The **Extras** (wash, design…) are added to any service. They are ordered with Move up/Move down,
  hidden from the page without losing them, or removed (nothing is deleted).
- **How your business works:** with **employees** (the business's price), **on commission** (the business's price, you set the %) or **chair rental** (each
  chair sets its own price and schedule; you collect the rent). If chairs are rented, the editor asks for each chair's price; empty = that chair does not do it.
- **Appointments (rules):** confirm instantly or review each request, how long you take to reply (15 min, 30 min, 1 h, 3 h), deposit ($0, $5, $10, $20, $50),
  until when you can cancel for free (2, 4, 24 or 72 h before), arrival grace period, whether the client chooses who with and **when the last appointment ends**:
  at closing, or 15 min, 30 min or 1 h before (your page does not offer times that end later; it helps you tidy up and close on time).
- **Chairs:** with rented chairs, each barber decides their own rules (instant or not, how long they take, deposit) and whether they receive online appointments.
- **To'Latino:** in Business 360° › What it sells it can **pause Services** or **pause Appointments** and **hide a service**, always with a reason; the owner
  sees the reason in their panel. Everything goes in the audit log.

### What happens in each case
| Case | What happens |
|---|---|
| Service without a name, price or category | It is not saved: «Type the service name» / «Set a price» / «Pick the category». |
| Options | Maximum 3 groups of 2 to 5 options; a group without a name or with fewer than 2 options is not saved. Duration between 5 min and 8 h. |
| Rented chair without a price on a service | That chair does not offer it; the client does not see the chair for that service. |
| You switch from «chair rental» to «employees» | The per-chair prices are saved but not used; everyone charges the business's price. |
| You hide a service | It stops showing on your page; it is not deleted and you show it again whenever you want. |
| To'Latino pauses Appointments | Your page says «call or stop by»; the appointments already requested continue. You see the reason at the top of the panel. |
| To'Latino hides a service | It shows «Hidden by To'Latino» with the reason; it cannot be shown again from the panel. |

### FAQ
**Does the client see the time between appointments?** No. They only see the service's duration with the options they choose.
**Who decides the deposit if I rent chairs?** Each chair. The business's rules apply to anyone who does not have their own.
**Can I have services and a menu at the same time?** What you sell adapts to the category: beauty uses Services.
