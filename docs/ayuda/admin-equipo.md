# Super Admin: equipo, permisos y auditoría · Super Admin: team, permissions and audit

_Pantallas: ADM-HOME, ADM-USR, ADM-CIUD, ADM-CAT, ADM-SYS. Solo para el equipo. Versión: 5 nov 2026. Audiencia: equipo. Tema: equipo._

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

## Lo que falta en el Super Admin
<!-- solo-equipo -->
Crecimiento y el resto de Textos y páginas (el editor de textos) llegan con la apertura; El Compa (IA) y los casos de Soporte, con
El Compa. Textos y páginas › **Ayuda** ya está: ver `admin-ayuda.md`.

## English

### What it does
The Super Admin is the To'Latino team's dashboard. Each team member signs in with **their own neighbor account** (their phone)
and sees only the sections their **role** allows. Every action on another person asks for a **reason** and goes to the
**audit log**, which nobody can edit or delete.

### Roles (set in System › Permissions)
Admin (everything) · City manager · Verifier · Content moderator · Support · Finance · Read only.

### How to use it
- **First Admin:** the very first time, with nobody on the team, `/admin` asks for the **bootstrap code**. It works once.
- **Add someone:** System › Add to team → their phone (they must already have an account) + role + reason.
- **Remove someone:** System › Remove from team → reason. They lose access at once; their neighbor account stays.
- **Change a permission:** System › Permissions → pick the role → tap the box → reason. (The Admin cannot lose System, so it
  can always be undone.)
- **Close a user's sessions:** Users → the person → Sign out or Block device → reason.

### What happens in each case
Someone without a role opens `/admin`: «This area is for the To'Latino team». A role opens a section it has no permission for: back
to the admin home with «Your role does not have permission for that». Adding a phone with no account: «The person has to create
their account first». A closed session means the person signs in again with their phone on that device.

### What is still missing in the Super Admin
<!-- solo-equipo -->
Growth and the rest of Texts and pages (the content editor) come with the launch; El Compa (AI) and Support cases come with El Compa.
