-- 9j-2 · Web Vitals de teléfonos reales (RUM, LAUNCH L1629): LCP, INP y CLS medidos en el teléfono o la computadora de quien usa To'Latino,
-- sin terceros (nada de analítica ajena: guardián sinRastreo) y SIN PERSONAS: solo cifras por día, familia de ruta (los números y nombres
-- de la ruta se vuelven «:x»), perfil (teléfono o escritorio) y métrica, contadas en tres cubetas (bueno · por mejorar · malo, los umbrales
-- de Google). Una fila por combinación y día (se suma con upsert): a 1M de personas sigue siendo una tabla chica. Lo que se mide en el
-- laboratorio sigue en el CI (pruebas/velocidad/presupuesto.json). Se apaga con el flag app.vitals. Idempotente; nada se borra.

create table if not exists web_vitals_dia (
  dia date not null,
  familia text not null check (char_length(familia) between 1 and 80),
  perfil text not null check (perfil in ('telefono', 'escritorio')),
  metrica text not null check (metrica in ('lcp', 'inp', 'cls')),
  n int not null default 0 check (n >= 0),
  buenos int not null default 0 check (buenos >= 0),
  medios int not null default 0 check (medios >= 0),
  malos int not null default 0 check (malos >= 0),
  primary key (dia, familia, perfil, metrica),
  constraint web_vitals_dia_suma check (buenos + medios + malos = n)
);

insert into feature_flags (key, enabled, note) values
  ('app.vitals', true, 'Web Vitals de teléfonos reales (LCP, INP, CLS): solo cifras por día y ruta, sin personas. Apagado: la puerta /api/vitales no guarda nada.')
on conflict (key) do nothing;
