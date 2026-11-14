# Dato borrado por error

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `dato-borrado`

## Cómo se nota
- Alguien del equipo o un error de código borró o cambió algo que no debía (la auditoría lo dice).

## Qué hace el sistema solo
- Nada se borra de verdad en la app (estados); lo que sí se borró está en el respaldo continuo (35 días).

## Qué hace Claude
- **Nunca restaurar encima.** PITR a OTRA base: en la réplica, `RESTAURAR_COPIA=nombre bash infra/comun/respaldos/restaurar-prueba.sh 'AAAA-MM-DD HH:MM:SS+00'` (el instante de antes) deja la copia corriendo; se lee lo puntual y se vuelve a escribir en la de verdad con una migración o una acción con auditoría; después se borra la copia.
- Probado en local con la plantilla de producción (`pruebas/infra/pitr-local.sh`) y en el ensayo.

## Qué se le dice al fundador
- «Se borró X a las HH:MM; lo recuperé del respaldo de las HH:MM (N filas).»

## Qué se les dice a los vecinos
- A quien le afectó, un aviso de que ya está de vuelta.
