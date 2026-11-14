# Simulacros · lo medido

_Manual interno (9o; fase9-apertura.md §3.4: «se provoca cada caso en la máquina de ensayo y se mide; los de producción se repiten antes de OK-3»).
Objetivos: **RPO ≤ 5 min · RTO ≤ 1 h · vuelta atrás ≤ 10 min · reconstruir una máquina ≤ 1 h**. Cada fila dice dónde corrió y con qué salida; lo que
no corrió lo dice._

## 1. Sin servidor (14 nov 2026, en la sesión de 9o) — corrió

| Simulacro | Dónde | Resultado |
|---|---|---|
| Azul/verde y vuelta atrás (puerta de salud, 5xx, p95, errores nuevos, salud que cae, migración que falla, nginx que no acepta) | `pruebas/infra/azulverde.test.sh` (docker, curl y nginx de mentira; vigilancia de 6 s) | **21/21** |
| Sobre sellado: abre el suyo, el de otro servidor NO abre y deja el valor de antes, nombres fuera de la lista no se abren | `pruebas/infra/sellado.test.sh` (age de verdad) | **17/17** (con sobres privados y recuperación) |
| Perder una máquina → recupera sus llaves de siempre del sobre de recuperación (rama de recuperación), vuelve a tener su llave age | `pruebas/infra/sellado.test.sh` | ✓ (lógica; la máquina de verdad, en el ensayo) |
| Dato borrado → PITR a OTRA base con la plantilla de pgBackRest de producción (cifrada; almacén en carpeta) | `pruebas/infra/pitr-local.sh` (Postgres 16 + pgBackRest 2.50 de verdad) | **8/8** · la fila borrada vuelve en la copia, la base de verdad sin tocar, el almacén sin el dato en claro · RTO de la base de juguete: 2 s |
| Producción solo avanza: sin la etiqueta del OK, fuera de pruebas o reescribiendo la historia no se despliega; una vuelta atrás no se reintenta sola | `pruebas/infra/sync.test.sh` (repo de mentira, tolatino-sync de verdad) | **12/12** |
| El sandbox vivo no cambia con el paquete común | `pruebas/infra/traza-sandbox.sh` (la traza de 672 pasos del deploy.sh de antes contra el nuevo, con las mismas migraciones y semillas) | igual salvo los 3 pasos nuevos de 9o (la huella de la imagen y dos anotaciones en la base): 675 |

## 2. El ensayo en máquinas desechables — NO corrió todavía

Necesita el token del proveedor del proyecto de pruebas y crea máquinas que se cobran por hora (centavos): lo lanza la sesión principal con el flujo
**Ensayo de producción** (`.github/workflows/ensayo.yml`, a mano) o `scripts/produccion/ensayo.sh`. Al terminar, sus cifras van aquí:

| Simulacro (prod9o) | Medida | Valor |
|---|---|---|
| Primer despliegue sano (cuatro máquinas desde cero) | `primer_despliegue_s` | — |
| Sobre sellado para otro servidor → no abre | `sobre_ajeno` | — |
| Versión que rompe `/api/salud` → vuelta atrás sola, anotada, con incidente | `vuelta_atras_desde_push_s`, `vuelta_atras_rollback_s` | — |
| Migración expandir → contraer | `expandir_s`, `contraer_s` | — |
| RPO observado (archive_timeout 60 s) | `RPO_OBSERVADO_S` | — |
| Dato borrado → PITR a otra base | `PITR_S`, `PITR_RECUPERADO` | — |
| Restauración de prueba con su consulta de control | `RESTAURACION` (RTO) | — |
| Garage borra de verdad (L468) | `GARAGE_BORRA` | — |
| Perder la app → reconstruir con cloud-init + sobre | `reconstruir_app_s` (≤ 3600) | — |

## 3. En producción antes de OK-3 (9t) — pendiente

Los mismos, sobre producción en acceso anticipado (sin vecinos todavía), con el almacén de verdad en otra región y Cloudflare delante.
