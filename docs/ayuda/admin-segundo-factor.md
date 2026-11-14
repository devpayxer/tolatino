# Super Admin: los dos pasos del equipo · Super Admin: the team's two steps

_Pantallas: **Super Admin › Dos pasos** (`/admin/dos-pasos`), **Sistema › Equipo y permisos** (`/admin/sistema`). Toda persona del equipo, en cada sesión. Restablecer los dos pasos de otra persona: Sistema · editar. Teléfono y escritorio. Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
«Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.» Para entrar al Super Admin, cada persona del equipo da
**dos pasos en cada sesión**: el código por SMS de siempre (o su llave de acceso) **y** uno de estos:
- **La llave de acceso** (Face ID o huella): una sesión abierta con la llave ya trae los dos pasos.
- **La app de códigos** del teléfono (Google Authenticator, 1Password, Authy u otra): un código de 6 números que cambia cada 30 segundos.
Sin el segundo paso no abre ninguna pantalla, acción ni ruta del Super Admin; la cuenta de vecino sigue igual que siempre.

## Cómo se usa
- **La primera vez:** al abrir el Super Admin, **Mostrar mi código QR** → escanéalo con tu app de códigos (o escribe el secreto que sale debajo) →
  escribe el código de 6 números → **Confirmar**. Salen tus **10 códigos de recuperación**: guárdalos (gestor de contraseñas o papel) y toca
  **Ya los guardé**. El QR y los códigos se muestran **una sola vez**.
- **Cada vez que entras con SMS:** el Super Admin pide el código de tu app. Escríbelo y **Entrar**.
- **Si perdiste el teléfono con la app:** **Usar un código de recuperación** → uno de tus 10 → entras. Cada uno sirve una vez y te avisamos al usarlo.
  Después pídele a un Admin que restablezca tus dos pasos para dar de alta la app en el teléfono nuevo.
- **Restablecer los dos pasos de otra persona** (Sistema › Equipo y permisos › **Restablecer sus dos pasos**, con motivo): su app de códigos deja de
  servir, sus sesiones vuelven a pedir el segundo paso y le llega un aviso. La da de alta otra vez al entrar. Tus propios dos pasos los restablece otra
  persona del equipo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Entras con SMS y no tienes segundo paso | El Super Admin te lleva a dar de alta tu app de códigos. |
| Entras con tu llave de acceso | Ya tienes los dos pasos: entras directo. |
| Tienes llave de acceso pero entraste con SMS | Te pide salir y entrar con la llave (un SMS solo no puede agregar otro paso). Si la perdiste, un Admin restablece. |
| Escribes un código que ya usaste | «Ese código ya se usó. Espera el siguiente.» Un código sirve una sola vez. |
| La hora del teléfono está un poco corrida | Se aceptan el código de ahora, el de antes y el de después (30 segundos de margen). |
| 5 intentos malos en 15 minutos | «Demasiados intentos.» Espera o pide a un Admin que restablezca; ni el código bueno entra mientras tanto. |
| Usas un código de recuperación | Entras; ese código ya no sirve y te avisamos cuántos te quedan. |
| Un Admin restablece tus dos pasos | Tu app vieja deja de servir y das de alta la nueva al entrar; te llega el aviso. |

Todo queda anotado (altas, códigos, intentos malos, bloqueos y restablecer) y lo que cambia un segundo paso, en la auditoría. El secreto de la app se
guarda cifrado y los códigos de recuperación solo como huella: nadie del equipo los puede leer.

## Preguntas frecuentes
- **¿Por qué no basta el SMS?** Porque quien se queda con tu número (cambio de chip) recibiría tus códigos. El segundo paso vive solo en tu teléfono.
- **¿Puedo usar cualquier app de códigos?** Sí: cualquier app que lea códigos QR de seis números (TOTP).
- **¿Y si cambio de teléfono?** Pasa tu app de códigos al teléfono nuevo, o pide a un Admin que restablezca y da de alta la app otra vez.

## Solo en el sandbox
<!-- solo-equipo -->
El equipo de ficción de las pruebas automáticas (teléfonos 570-555 de la semilla) entra sin segundo paso **solo** mientras el código de entrada se
muestra en pantalla (el modo pruebas, que no puede existir en producción). Sistema › Equipo lo dice en su fila: «MODO PRUEBAS: entra sin segundo factor».
Cualquier otra persona, también en el sandbox, da sus dos pasos.

## English

### What it does
«Your team account needs your passkey or your code app. SMS alone is not enough.» To enter the Super Admin, each team member takes **two steps in every
session**: the usual SMS code (or their passkey) **and** one of these:
- **The passkey** (Face ID or fingerprint): a session opened with the passkey already has both steps.
- **The code app** on the phone (Google Authenticator, 1Password, Authy or another): a 6-digit code that changes every 30 seconds.
Without the second step no Super Admin screen, action or route opens; the neighbor account stays the same as always.

### How to use it
- **The first time:** when you open the Super Admin, **Show my QR code** → scan it with your code app (or type the secret shown below) → type the 6-digit
  code → **Confirm**. Your **10 recovery codes** appear: save them (password manager or paper) and tap **I saved them**. The QR and the codes are shown
  **only once**.
- **Every time you sign in with SMS:** the Super Admin asks for the code from your app. Type it and **Enter**.
- **If you lost the phone with the app:** **Use a recovery code** → one of your 10 → you are in. Each works once and we notify you when you use it. Then ask
  an Admin to reset your two steps so you can set up the app on the new phone.
- **Reset another person's two steps** (System › Team and permissions › **Reset their two steps**, with a reason): their code app stops working, their
  sessions ask for the second step again and they get a notice. They set it up again when they enter. Your own two steps are reset by another team member.

### What happens in each case
No second step yet: the Super Admin takes you to set up your code app. Signed in with your passkey: you already have both steps. You have a passkey but
signed in with SMS: you are asked to sign out and use the passkey (SMS alone cannot add another step); if you lost it, an Admin resets. A code you already
used: «That code was already used. Wait for the next one.» Phone time slightly off: the current, previous and next codes are accepted (30 seconds of
margin). 5 wrong attempts in 15 minutes: «Too many attempts», wait or ask an Admin to reset; not even the right code works meanwhile. A recovery code: you
are in, that code no longer works and we tell you how many are left. An Admin resets your two steps: your old app stops working, you set up the new one
when you enter, and you get a notice. Everything is logged, and changes to a second step go to the audit log. The app secret is stored encrypted and
recovery codes only as a fingerprint: nobody on the team can read them.

### FAQ
- **Why is SMS not enough?** Because whoever takes over your number (SIM swap) would get your codes. The second step lives only on your phone.
- **Can I use any code app?** Yes: any app that reads six-digit QR codes (TOTP).
- **What if I change phones?** Move your code app to the new phone, or ask an Admin to reset and set the app up again.

### Only in the sandbox
<!-- solo-equipo -->
The fictional team of the automated tests (seeded 570-555 phones) enters without a second step **only** while the sign-in code is shown on screen (test
mode, which cannot exist in production). System › Team says so on their row: «MODO PRUEBAS: entra sin segundo factor». Anyone else, also in the sandbox,
takes both steps.
