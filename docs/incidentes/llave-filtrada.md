# Llave filtrada

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** critica · **caso:** `llave-filtrada`

## Cómo se nota
- Una llave aparece donde no debe (un registro, un commit, un aviso del proveedor); el guardián `secretos` caza las del repo antes de subir.

## Qué hace el sistema solo
- Las llaves de terceros viven solo selladas; las que nacen en el servidor nunca salen (salvo en el sobre de recuperación cifrado).

## Qué hace Claude
- Rotar YA: en el proveedor (nueva llave) → sellarla (`scripts/produccion/sellar.sh sellar …`) → commit → el servidor la abre; la vieja se revoca en el proveedor. Cada reemplazo queda en `key_rotations`. Si es una que nace en el servidor (AUTH_SECRET…): plan de rotación con su efecto (todas las sesiones salen) y el OK del fundador.

## Qué se le dice al fundador
- «La llave X pudo verse en Y. La cambié a las HH:MM; efecto: …»

## Qué se les dice a los vecinos
- Solo si afectó sus datos (aviso por la ley de cada estado, con el abogado).
