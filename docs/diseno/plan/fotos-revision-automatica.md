# Revisión automática de las fotos públicas — plan (decisión AJ, 20 nov)

**Por qué:** el fundador está solo y no puede revisar fotos a mano. Hoy `/api/medios` (portada y galería del negocio, menú, reseñas, eventos,
novedades, foto de perfil) publica sin mirar; solo Mensajes y Comunidad pasan por el modelo propio. **Decidido:** el sistema decide solo, en
cuatro capas; al fundador solo le llegan las apelaciones y un resumen en su reporte diario.

## Lo que pasa con cada foto pública
| Capa | Qué mira | Resultado |
|---|---|---|
| 1 · Modelo propio (el de Mensajes: `revisarImagen`) al subir | puntaje de desnudez | **limpia** (< duda) → visible al instante · **clara** (≥ rechazo) → rechazada sola, con aviso y «Pedir revisión» · **dudosa** (entre las dos) → retenida, pasa a la capa 2 |
| 2 · Segunda opinión (Claude con visión, por la interfaz `Modelo` de El Compa) | pauta fija: desnudez o sexual, violencia gráfica, documento de identidad / tarjeta / datos personales, captura de pantalla o anuncio ajeno, menores en situación indebida | **publicar** o **rechazar** (con motivo y «Pedir revisión»). Si no está segura, se queda retenida y se ofrece «Pedir revisión» |
| 3 · Reportes de usuarios | N cuentas distintas (por defecto 3; no cuentan cuentas recién creadas ni la misma persona dos veces) | la foto se oculta sola, el dueño recibe el aviso y pasa a la capa 2 para el veredicto |
| 4 · Confianza ganada | negocio verificado (reclamado o con licencia verificada), con ≥ 10 fotos visibles y ninguna quitada en 90 días | sus dudosas se publican sin pasar por la capa 2 (las claras se rechazan igual). Cuenta nueva (< 7 días): tope de fotos por hora más bajo |

## Reglas que no se rompen
- **Nunca sale de casa una foto privada:** a la capa 2 solo van fotos destinadas a ser públicas. Mensajes, ayuda, entrega y reclamo siguen como
  están (modelo propio y nada más). Guardián.
- **Una foto retenida o rechazada no se ve en ninguna pantalla** (ni en la ficha, ni en listas, ni en el menú, ni en `menu_items.photos`) y **su
  archivo deja de ser público** (sale de `n/` a una llave privada, con sus variantes; nada se borra: estados). Si se aprueba, vuelve.
- **Quien sube siempre sabe qué pasó:** al subir («se publica», «está en revisión», «no podemos publicarla: motivo»), y por aviso cuando cambia.
- **Toda decisión queda en la auditoría** (solo inserción): qué capa, puntaje, motivo, modelo y versión. El servidor decide; el cliente muestra.
- **Si el modelo propio o Claude no responden:** la foto queda retenida y el barrido reintenta; nunca se publica «por si acaso» y nunca se pierde.
- **Interruptores y topes en Configuración** (como El Compa): cada capa se enciende y apaga, umbrales con límites, tope mensual de gasto de la
  capa 2. Con la capa 2 apagada o sin presupuesto, las dudosas quedan retenidas con «Pedir revisión».
- **Apelación:** «Pedir revisión» crea un caso en la cola «Medios marcados» (la de siempre). Es lo único que llega a una persona.
- **Sin dinero ni datos sensibles a Claude:** va la imagen reducida (≤ 640 px) y la pauta; nada de quién la subió.

## Espejo y triángulo
- **Quien sube** (vecino o negocio): el estado de su foto donde ya se ven sus fotos (etiqueta «EN REVISIÓN» que ya existe), el motivo y el botón.
- **Panel del negocio:** sus fotos retenidas o rechazadas, con motivo y «Pedir revisión».
- **Super Admin:** Contenido › Auto-moderación con las cuatro capas, sus umbrales y el gasto; la cola «Medios marcados» recibe las apelaciones;
  el reporte diario trae cuántas se publicaron, retuvieron, rechazaron (por capa) y cinco al azar para mirar.
- **Ayuda** (`docs/ayuda/`): para quien sube y para el equipo.

## Fases y quién (regla 14)
| Fase | Qué | Quién |
|---|---|---|
| R1 | Capas 1 y 4 en `/api/medios`, estados, sacar el archivo de lo público, avisos, apelación, auditoría, barrido de reintentos, pruebas con simuladores, guardianes | Opus |
| R2 | Capa 2 (pauta, interfaz `Modelo`, tope y gasto, simulador) y capa 3 (umbral de reportes) | Opus |
| R3 | Pantallas: estado y «Pedir revisión» donde se ven las fotos propias, Auto-moderación en el Super Admin, bloque del reporte diario, ayuda | Sonnet |
| Siempre | Plan, revisión de cada entrega (lo sensible lo revisa otro modelo que el que lo escribió), guardianes/tipos/pruebas, sandbox | Fable |

## Valores por defecto (se cambian en Configuración; anotados en REVISION para el fundador)
duda 0.60 (el de hoy) · rechazo 0.85 · reportes 3 · confianza: verificado + 10 fotos + 0 quitadas en 90 días · cuenta nueva: 10 fotos por hora.
