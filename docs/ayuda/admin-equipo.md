# Super Admin · equipo, permisos y auditoría (ayuda interna)

_Pantallas: ADM-HOME, ADM-USR, ADM-CIUD, ADM-CAT, ADM-SYS. Versión: Fase 0 (5 nov 2026). Solo para el equipo._

## Qué hace
El Super Admin es el panel del equipo de To'Latino. Cada persona del equipo entra con **su misma cuenta de vecino**
(su teléfono) y ve solo las secciones que su **rol** permite. Toda acción sobre otra persona pide **motivo** y queda
en la **auditoría**, que nadie puede editar ni borrar.

## Roles (se ajustan en Sistema › Permisos)
Admin (todo) · Ciudad manager · Verificador · Moderador de contenido · Soporte · Finanzas · Solo lectura.

## Cómo se usa
- **Primer Admin:** la primera vez, sin nadie en el equipo, `/admin` pide el **código de arranque**. Sirve una sola vez.
- **Agregar a alguien:** Sistema › Agregar al equipo → su teléfono (ya debe tener cuenta) + rol + motivo.
- **Quitar a alguien:** Sistema › Quitar del equipo → motivo. Pierde el acceso al instante; su cuenta de vecino sigue.
- **Cambiar un permiso:** Sistema › Permisos → elige el rol → toca la casilla → motivo. (El Admin no puede perder
  Sistema, para no quedarse sin poder deshacerlo.)
- **Cerrar sesiones de un usuario:** Usuarios → la persona → Cerrar sesión o Bloquear dispositivo → motivo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Alguien sin rol abre `/admin` | «Esta zona es del equipo de To'Latino». |
| Un rol abre una sección sin permiso | Vuelve al Inicio del admin con el aviso «Tu rol no tiene permiso para eso». |
| Se agrega un teléfono sin cuenta | «La persona tiene que crear su cuenta primero». |
| Se cierra una sesión | La persona tiene que volver a entrar con su teléfono en ese dispositivo. |

## Lo que todavía no está (y cuándo)
Colas, Negocios y Analítica (Fase 1) · Transacciones, Soporte, Planes, Notificaciones, Contenido (Fase 2) ·
Confianza y Gamification (Fase 5) · Eventos (Fase 6) · Crecimiento, Textos y abrir ciudades (Fase 9).
