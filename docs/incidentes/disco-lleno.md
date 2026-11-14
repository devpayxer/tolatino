# Disco lleno

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `disco-lleno`

## Cómo se nota
- `DiscoLleno` (> 85 % 10 min) o `DiscoSeLlenaEn24h` (al ritmo de las últimas 6 h se llena en un día). En el sandbox, `/estado/diag.txt` y Salud › Disco.

## Qué hace el sistema solo
- Cada despliegue libera lo que Docker puede rehacer si pasa del 85 % (caché de builds, imágenes sin uso; nunca volúmenes) y guarda solo la imagen que sirve y 3 anteriores.
- `journald` rota solo; Prometheus guarda 30 días; los WAL viejos los limpia pgBackRest con la retención de 35 días.

## Qué hace Claude
- Ver qué crece (Salud › Máquinas). Si es la base: agrandar el disco aparte por la API del proveedor (sin reiniciar) y anotarlo. Si es Garage: lo mismo con su disco.
- Si es la app: revisar registros que crecen sin rotar y corregirlo en el repo.

## Qué se le dice al fundador
- «El disco de X llegó al N %. Lo agrandé a N GB (cuesta $N más al mes) / limpié …»

## Qué se les dice a los vecinos
- Nada, salvo que haya caído la app (ver `app-no-responde.md`).
