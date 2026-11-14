# Servidor perdido

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** critica · **caso:** `servidor-perdido`

## Cómo se nota
- `MaquinaCaida` (una máquina no contesta por la red privada 3 min); el proveedor la da por perdida.

## Qué hace el sistema solo
- Las otras dos siguen; si es la de la app, nginx no está: Cloudflare muestra su error (la página de mantenimiento vive en la app).

## Qué hace Claude
- `scripts/produccion/reconstruir.sh ENTORNO ROL` (en el flujo con el entorno de GitHub): la máquina nueva nace con el mismo cloud-init y `TOLATINO_RECONSTRUIR=1`, publica una llave provisional, recibe su sobre de recuperación (de la llave de recuperación) y vuelve a tener sus llaves de siempre; los sobres sellados del repo vuelven a abrir. Si es la app: `cloudflare.sh dns` con la IP nueva. Si es la base: su disco aparte se vuelve a montar (o PITR desde el almacén si se perdió). Objetivo ≤ 1 h (medido en el ensayo).

## Qué se le dice al fundador
- «La máquina X se perdió a las HH:MM; la reconstruí en N minutos; se perdió / no se perdió nada.»

## Qué se les dice a los vecinos
- La página de mantenimiento (o el error de Cloudflare si fue la app) mientras dura; anuncio si pasa de 30 minutos.
