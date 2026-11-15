# Reporte diario · Daily report

_Pantallas: el correo «Tu reporte de hoy» y el aviso en el teléfono de los Admins; **Super Admin › Analítica › Reportes** (`/admin/analitica?tab=rep`)
con los últimos 14 días, sus alertas y **Mándamelo ahora**. Lo reciben y lo ven los Admins. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
Cada día a las **7:30 AM de Hazleton** el sistema arma el reporte del día anterior y lo manda **por correo y como aviso (push)** a cada Admin activo
(el correo, a quien tiene correo en su cuenta). Lleva:
- **Negocios nuevos** de ayer (cuántos y los nombres de los primeros).
- **Operaciones:** enviadas, aceptadas, hechas y canceladas.
- **Dinero:** vendido en línea, comisión, devuelto y el MRR de Pro. La **conciliación con Stripe** de ayer: «cuadra», «no cuadra» con la
  diferencia, o «no corrió ayer» si esa noche no corrió.
- **Errores:** grupos de errores nuevos y cuántos hubo, y las tareas del barrido que fallaron.
- **Último despliegue:** su versión (commit), si salió bien o se volvió atrás, y dónde (pruebas o producción).
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
Every day at **7:30 AM Hazleton time** the system builds the report for the previous day and sends it **by email and as a notification (push)** to
every active Admin (the email, to whoever has an email on their account). It carries:
- **New businesses** from yesterday (how many and the names of the first ones).
- **Operations:** sent, accepted, done and canceled.
- **Money:** sold online, commission, refunded and the Pro MRR. Yesterday's **reconciliation with Stripe**: «it matches», «it does not match» with
  the difference, or «it did not run yesterday» if it did not run that night.
- **Errors:** new error groups and how many there were, and the sweep tasks that failed.
- **Last deploy:** its version (commit), whether it went well or was rolled back, and where (testing or production).
- **Rollbacks:** it has its own line, which says there are none yet while automatic rollback is not on.
- **Overdue queues** (those that went past their deadline) and the **Support past deadline** cases.
- **Live guardians:** ticket overselling, unreviewed errors and how much of its monthly cap El Compa has used.
- **What needs you:** the steps that are yours and still pending in System › Apps › «Your steps» (the domain, the Apple and Google accounts,
  the keys…). If there are none, it says «Nothing for now».

Only figures, business names and your steps: **never a person** (no names, no phones, no emails of neighbors).

### How to use it
- **Reading it:** it reaches you on its own. Tapping the notification opens Analytics › Reports.
- **Seeing it later:** Analytics › **Reports** shows the ones from the last 14 days with the time they went out, to how many emails and
  notifications, and **what needs you** from the newest (each step opens «Your steps»).
- **Send it to me now:** in Analytics › Reports, it sends you today's, built at that moment, to your email and as a notification. It is a
  copy: it does not count as the day's report and it goes to the audit log.
- **Turning it off:** it is the `reporte.diario` switch (on by default).

### What happens in each case
- **It goes out once a day.** It is stored (with its figures and where it went) and cannot be changed or deleted. If the system goes down halfway,
  when it comes back it finishes without repeating the emails or notifications that already went out.
- **If it did not go out by 8:00, or it went out after 8:00:** the **day's alert** stays in Analytics › Reports, the notice «The daily report
  did not go out» reaches the Admins and the task is left with an error in the system. Only one alert per day.
- **It does not sound at night:** the notification respects quiet hours (10 PM to 7 AM); at 7:30 it already arrives.
- **In the sandbox** the email does not really go out: it stays in the Super Admin's email simulator.
- **With no email on your account** you only get the notification; add your email in My account › Profile.

### FAQ
**Why is it about the previous day?** At 7:30 today is only starting; the report counts what happened yesterday (Hazleton time) and today's MRR.

**Why doesn't the notification show the figures?** Team notifications do not show their content on the lock screen: the full text is in the
bell and in the email.

**Do other roles see it?** No. Only Admins receive it and see it in Reports; the others schedule their own email reports in Analytics ›
Reports.
