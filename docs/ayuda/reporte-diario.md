# Reporte diario · Daily report

_Pantallas: el correo «Tu reporte de hoy» y el aviso en el teléfono de los Admins; **Super Admin › Analítica › Reportes** (`/admin/analitica?tab=rep`)
con los últimos 14 días, sus alertas y **Mándamelo ahora**. Lo reciben y lo ven los Admins. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
Cada día a las **7:30 AM de Hazleton** el sistema arma el reporte del día anterior y lo manda **por correo y como aviso (push)** a cada Admin activo
(el correo, a quien tiene correo en su cuenta). Lleva:
- **Negocios nuevos** de ayer (cuántos y los nombres de los primeros).
- **Operaciones:** enviadas, aceptadas, hechas y canceladas.
- **Dinero:** vendido en línea, comisión, devuelto y el MRR de Pro. La **conciliación con Stripe** tiene su renglón, que dice que todavía no sale
  mientras no esté lista.
- **Errores:** grupos de errores nuevos y cuántos hubo, y las tareas del barrido que fallaron.
- **Vueltas atrás:** tiene su renglón, que dice que todavía no hay mientras la vuelta atrás automática no esté encendida.
- **Colas vencidas** (las que pasaron su plazo) y los casos de **Soporte fuera de plazo**.
- **Guardianes en vivo:** sobreventa de boletos, errores sin revisar y cuánto va El Compa de su tope del mes.
- **Lo que necesita de ti:** los pasos que te tocan y siguen pendientes en Sistema › Apps › «Lo que te toca» (el dominio, las cuentas de Apple y
  Google, las llaves…). Si no hay ninguno, dice «Nada por ahora».

Solo cifras, nombres de negocios y tus pasos: **nunca una persona** (ni nombres, ni teléfonos, ni correos de vecinos).

## Cómo se usa
- **Leerlo:** te llega solo. Tocar el aviso abre Analítica › Reportes.
- **Verlo después:** Analítica › **Reportes** muestra los de los últimos 14 días con la hora en que salieron, a cuántos correos y avisos, y **lo que
  necesita de ti** del más nuevo (cada paso abre «Lo que te toca»).
- **Mándamelo ahora:** en Analítica › Reportes, te manda el de hoy armado en ese momento, a tu correo y como aviso. Es una copia: no cuenta como el
  reporte del día y queda en la auditoría.
- **Apagarlo:** es el interruptor `reporte.diario` (encendido de fábrica).

## Qué pasa en cada caso
- **Sale una vez al día.** Queda guardado (con sus cifras y a dónde salió) y no se puede cambiar ni borrar. Si el sistema se cae a la mitad, al volver
  termina sin repetir los correos ni los avisos que ya salieron.
- **Si a las 8:00 no salió, o salió después de las 8:00:** queda la **alerta del día** en Analítica › Reportes, llega a los Admins el aviso «El
  reporte diario no salió» y la tarea queda con error en el sistema. Una sola alerta por día.
- **De noche no suena:** el aviso respeta las horas de silencio (de 10 PM a 7 AM); a las 7:30 ya llega.
- **En el sandbox** el correo no sale de verdad: queda en el simulador de correo del Super Admin.
- **Sin correo en tu cuenta** te llega solo el aviso; agrega tu correo en Mi cuenta › Perfil.

## Preguntas frecuentes
**¿Por qué es del día anterior?** A las 7:30 el día de hoy apenas empieza; el reporte cuenta lo que pasó ayer (hora de Hazleton) y el MRR de hoy.

**¿Por qué el aviso no dice las cifras?** Los avisos del equipo no muestran su contenido en la pantalla bloqueada: el texto completo está en la
campana y en el correo.

**¿Lo ven otros roles?** No. Solo los Admins lo reciben y lo ven en Reportes; los demás programan sus propios reportes por correo en Analítica ›
Reportes.

## English
### What it does
Every day at **7:30 AM Hazleton time** the system builds the previous day's report and sends it **by email and as a push notification** to each
active Admin (the email, to those with an email on their account). It has: **new businesses** from yesterday; **transactions** sent, accepted, done
and cancelled; **money** sold online, commission, refunded and Pro MRR (the **Stripe reconciliation** line says it does not show yet while it is not
ready); **errors** (new error groups, how many, and sweep tasks that failed); **rollbacks** (its line says there are none yet while automatic
rollback is not on); **overdue queues** and **Support past deadline**; **live guardians** (ticket overselling, unreviewed errors, El Compa's share of
its monthly cap); and **what needs you**: your pending steps in System › Apps › «Your part» (or «Nothing for now»). Figures, business names and your
steps only: never a person.

### How to use it
It arrives on its own; tapping the notification opens Analytics › Reports, which lists the last 14 days with the time each went out, how many emails
and notifications, and **what needs you** from the newest one. **Send it to me now** sends today's, built at that moment, to your email and as a
notification; it is a copy, does not count as the day's report and is audited. The switch is `reporte.diario` (on by default).

### What happens in each case
It goes out once a day and is stored (its figures and where it went); it cannot be changed or deleted. If the system stops halfway, it finishes
without repeating emails or notifications. **If by 8:00 it has not gone out, or it went out after 8:00,** the day's alert appears in Analytics ›
Reports, Admins get «The daily report did not go out» and the task is marked with an error; one alert per day. The notification respects quiet hours
(10 PM to 7 AM). In the sandbox the email stays in the Super Admin's email simulator. Without an email on your account you only get the notification.

### FAQ
**Why yesterday?** At 7:30 today has just started; the report counts what happened yesterday (Hazleton time) and today's MRR.

**Why does the notification not show the figures?** Team notifications do not show their content on the lock screen; the full text is in the bell
and the email.

**Do other roles see it?** No, only Admins; other roles schedule their own email reports in Analytics › Reports.
