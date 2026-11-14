# Certificado vencido

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `certificado-vencido`

## Cómo se nota
- `CertificadoVence` (menos de 21 días); `llave_vence` avisa a los Admins 30 y 7 días antes (server_keys: el certificado de origen).

## Qué hace el sistema solo
- El de Cloudflare hacia los vecinos lo renueva Cloudflare; el de origen dura 15 años.

## Qué hace Claude
- Pedir otro con `cloudflare.sh origen` (la llave nueva nace en el servidor), sellarlo (ORIGEN_CERT) y desplegar.

## Qué se le dice al fundador
- «El certificado X vencía el …; ya está renovado.»

## Qué se les dice a los vecinos
- Nada.
