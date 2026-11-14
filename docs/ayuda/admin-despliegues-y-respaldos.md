# Super Admin: Despliegues, respaldos y la vuelta atrás · Super Admin: Deploys, backups and rollback

_Pantallas: **Super Admin › Sistema › Despliegues** (`/admin/sistema/despliegues`), **Respaldos** (`/admin/sistema/respaldos`) y **Salud** (`/admin/sistema/salud`), y **Configuración › Despliegues**. Ver: Sistema · ver. Cerrar un incidente y cambiar los umbrales: Sistema · editar. Teléfono y escritorio. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Despliegues:** cada versión que salió, en el orden en que terminó: su commit, si **sirvió**, si **volvió atrás** o si **no salió**, cuántas
  migraciones aplicó, en cuánto quedó sana, lo que midió la vigilancia (errores del servidor, lentitud y errores nuevos) y, en producción, **el OK que la dejó pasar** (la frase
  del fundador con su fecha). Arriba: la versión que sirve ahora, el último despliegue, las vueltas atrás de 7 días y los incidentes abiertos.
- **La vuelta atrás sola:** en producción, la versión nueva arranca junto a la vieja y solo recibe a los vecinos cuando `/api/salud` contesta bien 3
  veces seguidas. Después se vigila 10 minutos; si pasa un umbral, vuelve sola a la anterior (que siguió arrancada), queda anotado, se abre un incidente
  y el equipo recibe el aviso (push y SMS). El reporte diario cuenta las vueltas atrás de ayer.
- **Incidentes:** lo que abren la vuelta atrás y el monitoreo (Prometheus, desde la réplica), cada uno con su caso del manual interno y su severidad.
  Se cierran con lo que se hizo; nada se borra.
- **Respaldos:** la base se respalda sola (completo cada día, diferencial cada 6 horas y el registro continuo, a otra región, cifrado), las fotos cada
  día y el sobre de llaves de recuperación de cada máquina. Cada semana una **restauración de prueba** en una copia desechable dice si de verdad se puede
  volver (y cuánto tarda). Si falla o no corre en 8 días, alerta crítica.
- **Mantenimiento programado:** se programa en Salud. Desde 24 horas antes (Configuración › Despliegues) sale un anuncio en el Inicio de cada ciudad;
  durante la ventana, en producción, las páginas de los vecinos muestran «Estamos haciendo un cambio. Volvemos en unos minutos.» El Super Admin, la
  entrada y las rutas de la API (cobros, tiendas, pases) siguen. Si se cancela, sus anuncios se retiran solos.
- **Salud** suma las máquinas de producción (CPU, memoria, disco) y las llaves del servidor que vencen (certificado de origen, llave de los respaldos).

## Cómo se usa
- **Ver qué pasó con un despliegue:** Despliegues → la fila: resultado, motivo y lo medido.
- **Cerrar un incidente:** Despliegues → Incidentes → **Cerrar** → qué se hizo (10 letras o más).
- **Cambiar cuándo vuelve atrás sola:** Configuración › Despliegues → el umbral → valor y motivo (con sus límites; queda en la auditoría).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| La versión nueva no contesta en `/api/salud` | No llega a los vecinos: se apaga y queda **NO SALIÓ**; la anterior sigue. |
| Después de cambiar, suben los errores del servidor | Vuelve sola a la anterior, **VOLVIÓ ATRÁS** con el motivo, incidente abierto y aviso al equipo. |
| Una migración falla al desplegar | **NO SALIÓ**; la base queda como estaba (cada archivo es una transacción). |
| La restauración de prueba falla | Respaldos lo dice en rojo y llega la alerta crítica; ningún respaldo cuenta hasta que una salga bien. |
| Se pierde una máquina | Se reconstruye con su mismo archivo de arranque y su sobre de recuperación (objetivo: una hora). |
| Sandbox | Un solo servidor: cada despliegue queda anotado, sin azul/verde ni vuelta atrás sola. |

## Preguntas frecuentes
- **¿Se puede borrar un despliegue o un incidente?** No: se anotan una vez; un incidente solo se cierra.
- **¿Quién sube una versión a producción?** Nadie a mano: solo avanza a un commit que ya pasó por el sandbox con el CI en verde y con el OK del fundador.

## Lo que todavía no está
<!-- solo-equipo -->
Producción no está encendida (9t): en el sandbox, Despliegues muestra los despliegues del sandbox y Respaldos su semilla. El ensayo completo en máquinas
desechables (vuelta atrás, restauración, reconstruir la app) está listo para correr y sus cifras van al manual de incidentes.

## English

### What it does
- **Deploys:** every version that went out, in the order it finished: its commit, whether it **served**, **rolled back** or **did not go out**, how many
  migrations it applied, how long it took to be healthy, what the watch measured (server errors, slowness and new errors) and, in production, **the OK that let it through**
  (the founder's phrase and date). At the top: the version serving now, the latest deploy, rollbacks in 7 days and open incidents.
- **Automatic rollback:** in production the new version starts next to the old one and only gets neighbors once `/api/salud` answers well 3 times in a row.
  Then it is watched for 10 minutes; if a threshold is crossed it goes back to the previous one on its own (which kept running), it is logged, an incident
  opens and the team gets notified (push and SMS). The daily report counts yesterday's rollbacks.
- **Incidents:** opened by rollbacks and monitoring (Prometheus, from the replica), each with its internal runbook case and severity. They are closed with
  what was done; nothing is deleted.
- **Backups:** the database is backed up on its own (full daily, differential every 6 hours and the continuous log, to another region, encrypted), photos
  daily and each machine's recovery key envelope. Every week a **test restore** on a throwaway copy tells whether it really restores (and how long it takes).
  If it fails or does not run in 8 days, critical alert.
- **Scheduled maintenance:** scheduled in Health. From 24 hours before (Settings › Deploys) an announcement shows on each city Home; during the window, in
  production, neighbor pages show «We are making a change. Back in a few minutes.» The Super Admin, sign-in and API routes (payments, stores, passes) keep
  working. If it is cancelled, its announcements are retired on their own.
- **Health** adds production machines (CPU, memory, disk) and server keys that expire (origin certificate, backup key).

### How to use it
- **See what happened with a deploy:** Deploys → the row: result, reason and measurements.
- **Close an incident:** Deploys → Incidents → **Close** → what was done (10 characters or more).
- **Change when it rolls back on its own:** Settings › Deploys → the threshold → value and reason (within its limits; it goes to the audit log).

### What happens in each case
The new version does not answer `/api/salud`: it never reaches neighbors, it is stopped and marked **DID NOT GO OUT**; the previous one keeps serving. After
switching, server errors go up: it goes back on its own, **ROLLED BACK** with the reason, an open incident and a team notice. A migration fails while deploying:
**DID NOT GO OUT**; the database stays as it was. The test restore fails: Backups says so in red and the critical alert arrives. A machine is lost: it is
rebuilt with the same boot file and its recovery envelope (target: one hour). Sandbox: one server, every deploy is logged, no blue/green and no automatic
rollback.

### FAQ
- **Can a deploy or an incident be deleted?** No: they are logged once; an incident is only closed.
- **Who puts a version in production?** Nobody by hand: it only moves forward to a commit that already went through the sandbox with green CI and the
  founder's OK.

### What is not here yet
<!-- solo-equipo -->
Production is not on yet (9t): in the sandbox, Deploys shows the sandbox deploys and Backups its seed. The full rehearsal on throwaway machines (rollback,
restore, rebuilding the app) is ready to run and its numbers go to the incident runbook.
