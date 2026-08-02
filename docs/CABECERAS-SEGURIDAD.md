# Cabeceras de seguridad (2026-08-02)

Se configuran en `vercel.json` → `headers`, y aplican a **todas** las rutas.
Antes el sitio solo mandaba `Strict-Transport-Security` (esa la pone Vercel sola).

## Las tres que hay

| Cabecera | Valor | Qué evita |
|---|---|---|
| `X-Frame-Options` | `SAMEORIGIN` | Que alguien meta To'Latino dentro de un `<iframe>` en otra web y engañe al usuario para que pulse "Pagar" o "Iniciar sesión" creyendo que pulsa otra cosa (*clickjacking*). Con login y pagos de por medio, es la que más importa. |
| `X-Content-Type-Options` | `nosniff` | Que el navegador adivine el tipo de un archivo y acabe ejecutando como script algo que se subió como imagen. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Que al salir del sitio se filtre la ruta completa (por ejemplo el enlace de un pedido o de una reserva) a webs de terceros. Se manda solo el dominio. |

**`SAMEORIGIN`, no `DENY`:** la app incrusta iframes de terceros (mapas en
Eventos y Bienes Raíces) y los de Stripe dentro de la hoja de pago. Eso es
incrustar hacia AFUERA y esta cabecera no lo toca — solo controla quién puede
incrustarnos a NOSOTROS. `SAMEORIGIN` deja la puerta abierta por si algún día
la app necesita enmarcar una pantalla propia; `DENY` la cerraría del todo.

## Las que NO se pusieron, y por qué

- **`Permissions-Policy`**: parecía buena idea hasta mirar qué usa la app.
  Necesita **geolocalización** (el radio de 30 millas de Comunidad), **cámara**
  (el escáner de códigos QR de los boletos) y **notificaciones**. Una política
  restrictiva las apagaría en silencio y el fallo sería dificilísimo de
  diagnosticar. Si algún día se pone, hay que enumerar `self` para esas tres y
  probar cada flujo, no copiar una plantilla de internet.
- **`Content-Security-Policy`**: es la más potente y también la que más rompe.
  El sitio carga Stripe, tipografías de Google, mapas de OSM y usa estilos en
  línea (`styled-jsx` y los `style=` del handoff). Una CSP mal calibrada deja
  la pantalla en blanco o mata el pago. Merece su propia tarea, con
  `Content-Security-Policy-Report-Only` primero durante unos días para ver qué
  bloquearía antes de aplicarla de verdad. Anotado en LAUNCH-CHECKLIST.

## Cómo se comprueba

No se puede en local (`next build` genera archivos estáticos; las cabeceras las
pone Vercel al servir). Se verifica contra el sitio desplegado:

```
curl -sS -I https://tolatino.com/ | grep -iE "x-frame|x-content-type|referrer-policy|strict-transport"
```

Deben salir las cuatro.
