# Negocios demo del sandbox (17 nov)

850 negocios: 10 en cada una de las 5 subcategorías principales de las 17 categorías, repartidos en las 5 ciudades, con historia de años
(reseñas, pedidos, citas, reservas, novedades, seguidores). Los genera `scripts/semilla/demos/*.mjs` (deterministas: la misma salida cada vez).

- **Solo el sandbox:** `infra/pruebas/deploy.sh` aplica esta carpeta después de la semilla de siempre. El CI no la carga (sus pruebas cuentan sobre
  la semilla de siempre) y producción nunca (`migrar.sh --semilla-pruebas` tiene su candado).
- Cada negocio lleva `is_demo = true`; cada archivo es idempotente (llaves fijas, `on conflict`) y se vuelve a aplicar si cambia.
- Teléfonos ficticios: dueños 570-555-9xxx, clientes 570-555-8xxx (rangos por grupo de categorías, ver cada generador).
