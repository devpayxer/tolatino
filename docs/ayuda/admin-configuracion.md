# Super Admin · Configuración · Super Admin · Settings

_Pantalla: **Super Admin › Sistema › Configuración** (`/admin/sistema/configuracion`; pestañas Equipo y permisos · Configuración). Teléfono
y escritorio. Versión: Fase 5 · bloque 5i (8 nov 2026). Ver: permiso de Sistema. Cambiar: **solo un Admin**._

## Qué hace
- Junta en un solo lugar los **plazos y límites de la plataforma** que antes vivían escritos en el código: los de la Comunidad y los que
  quedaron pendientes de la Fase 4. Cada valor tiene **unidad**, **valor de fábrica**, **mínimo y máximo**, y quién lo cambió por última vez.
- Por sección: **Comunidad** (publicaciones, comentarios, votos, conversaciones nuevas y reportes por persona al día; minutos para editar una
  publicación; días para apelar; lo más que dura una encuesta; «Ver traducción» por hora; hora del resumen diario; días que se proponen para
  un cupón) · **Gamification** (tope de puntos al día) · **Doctores y Profesionales** · **Noche** · **Educación · Niños · Deporte** ·
  **Iglesias · Bienes Raíces · Autos** · **Eventos** (6i · evento privado: depósito de fábrica 25 %, cancelar gratis 72 h, el restaurante responde
  en 24 h, una propuesta vale 24 h, anticipación mínima 3 días, hasta 180 días adelante, 3 solicitudes abiertas por persona, 10 propuestas y
  3 «pedir un cambio» por solicitud; el plazo para cancelar queda escrito en cada propuesta al mandarla).
- **CAMBIADO**: el valor ya no es el de fábrica.
- **SOLO LECTURA**: el valor ya se lee de aquí, pero todavía no se cambia porque algún texto que ve la persona dice el número (por ejemplo
  «24 h»). La fila dice cuál. Se abre cuando ese texto lea el valor (anotado en LAUNCH-CHECKLIST).
- **Se cambia en su pantalla**: el tope del cargo del dealer va a Catálogo › Cargo del dealer (al bajarlo, baja a los dealers que lo pasan).
- **Auto-ocultar por reportes** se ve aquí y se cambia en Contenido › Auto-moderación, junto con el interruptor de su regla.

## Cómo se usa
1. Toca el valor. 2. Escribe el valor nuevo (número entero). 3. Elige o escribe el motivo. 4. **Guardar**.
- Aplica **desde ahora en todas las ciudades**. Lo que ya pasó no cambia (una publicación editada sigue editada).
- Queda en la auditoría con **antes → después**, quién y el motivo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Valor dentro de sus límites | Se guarda, aplica al instante y queda en la auditoría. |
| Fuera de sus límites (p. ej. 2 min para editar, mínimo 5) | «Entre 5 min y 1,440 min.» No se guarda. La base también lo rechaza. |
| No es un número entero | «Escribe un número entero.» |
| El mismo valor | «Ya tiene ese valor.» |
| Fila SOLO LECTURA | «Todavía no se cambia aquí: …» con el motivo. |
| No eres Admin | Ves los valores; «Solo un Admin cambia la configuración.» |
| Límites del día y traducciones | También se cambian en Contenido › Auto-moderación: es el mismo valor y la misma auditoría. |
| Varios servidores | Cada uno ve el valor nuevo en 15 segundos como mucho. |

## Preguntas frecuentes
- **¿Bajar los minutos para editar afecta lo ya publicado?** Desde ese momento, solo se edita lo que esté dentro del plazo nuevo.
- **¿Cómo vuelvo al valor de fábrica?** Escribe el valor de fábrica que dice la fila (motivo «Volver al de fábrica»).
- **¿Por qué hay valores que no puedo cambiar?** Porque una pantalla le dice el número a la persona; cambiarlo aquí haría falso ese texto.

## Para El Compa
- Explica qué hace cada valor y su valor actual (la pantalla lo dice); nunca cambies un valor por alguien: solo un Admin, con motivo.

## English
_Screen: **Super Admin › System › Settings**. View: System permission. Change: **Admin only**._
- **What it does:** platform deadlines and limits in one place (Community limits per day, minutes to edit a post, days to appeal, longest
  poll, translations per hour, daily digest hour, proposed coupon days; points cap; the Phase 4 deadlines). Each has a unit, a factory value,
  a minimum and a maximum, and who changed it last. **CHANGED** = not the factory value. **READ ONLY** = read from here but not editable yet
  because a screen tells people the number. The dealer fee cap is changed in Catalog (it also lowers dealers above it).
- **How to use:** tap the value → new whole number → reason → **Save**. Applies now in every city; logged before → after with the reason.
- **Each case:** out of bounds → refused («Between 5 min and 1,440 min»), the database also refuses it; not a whole number → refused;
  read only → says why; not Admin → view only. Other servers see the change within 15 seconds.
- **FAQ:** lowering the edit minutes applies from now on; to go back, type the factory value.
