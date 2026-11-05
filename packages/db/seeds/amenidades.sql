-- GENERADO por scripts/catalogo/generar-amenidades-sql.mjs desde apps/web/lib/onb/datos.ts. No editar a mano.
-- categories vacío = sirve para todas las categorías.
begin;
insert into amenities (key, icon, label, categories, sort) values ('estacionamiento', 'parking', '{"es":"Estacionamiento","en":"Parking"}'::jsonb, '{}', 1)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('wi-fi', 'wifi', '{"es":"Wi-Fi","en":"Wi-Fi"}'::jsonb, '{}', 2)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('acepta-tarjeta', 'card', '{"es":"Acepta tarjeta","en":"Takes cards"}'::jsonb, '{}', 3)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('para-ninos', 'smile', '{"es":"Para niños","en":"Kid friendly"}'::jsonb, '{}', 4)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('accesible', 'check', '{"es":"Accesible","en":"Accessible"}'::jsonb, '{}', 5)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('mesas-adentro', 'restaurant', '{"es":"Mesas adentro","en":"Indoor seating"}'::jsonb, '{NEG-FOOD}', 6)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('para-llevar', 'bag', '{"es":"Para llevar","en":"Takeout"}'::jsonb, '{NEG-FOOD}', 7)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('catering', 'party', '{"es":"Catering","en":"Catering"}'::jsonb, '{NEG-FOOD}', 8)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('sin-cita', 'clock', '{"es":"Sin cita","en":"Walk-ins"}'::jsonb, '{NEG-BELL}', 9)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('sala-de-espera', 'coffee', '{"es":"Sala de espera","en":"Waiting area"}'::jsonb, '{NEG-BELL,NEG-AUTO}', 10)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('productos-a-la-venta', 'bag', '{"es":"Productos a la venta","en":"Products for sale"}'::jsonb, '{NEG-BELL}', 11)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('te-llevan', 'car', '{"es":"Te llevan","en":"Shuttle ride"}'::jsonb, '{NEG-AUTO}', 12)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('grua-propia', 'truck', '{"es":"Grúa propia","en":"Own tow truck"}'::jsonb, '{NEG-AUTO}', 13)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('garantia', 'shield', '{"es":"Garantía","en":"Warranty"}'::jsonb, '{NEG-AUTO,NEG-DEALER}', 14)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('presupuesto-gratis', 'edit', '{"es":"Presupuesto gratis","en":"Free estimate"}'::jsonb, '{NEG-HOGAR}', 15)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('emergencia-24-7', 'emergency', '{"es":"Emergencia 24/7","en":"24/7 emergency"}'::jsonb, '{NEG-HOGAR}', 16)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('con-licencia', 'law', '{"es":"Con licencia","en":"Licensed"}'::jsonb, '{NEG-HOGAR,NEG-PRO}', 17)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('con-seguro', 'insurance', '{"es":"Con seguro","en":"Insured"}'::jsonb, '{NEG-HOGAR}', 18)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('terraza', 'coffee', '{"es":"Terraza","en":"Terrace"}'::jsonb, '{NEG-NOCHE}', 19)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('musica-en-vivo', 'mic', '{"es":"Música en vivo","en":"Live music"}'::jsonb, '{NEG-NOCHE}', 20)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('karaoke', 'mic', '{"es":"Karaoke","en":"Karaoke"}'::jsonb, '{NEG-NOCHE}', 21)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('deportes-en-pantalla', 'grid', '{"es":"Deportes en pantalla","en":"Sports on TV"}'::jsonb, '{NEG-NOCHE}', 22)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('ebt-snap', 'card', '{"es":"EBT / SNAP","en":"EBT / SNAP"}'::jsonb, '{NEG-MERC}', 23)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('carniceria', 'scale', '{"es":"Carnicería","en":"Butcher counter"}'::jsonb, '{NEG-MERC}', 24)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('entrega-a-domicilio', 'truck', '{"es":"Entrega a domicilio","en":"Home delivery"}'::jsonb, '{NEG-MERC}', 25)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('montaje-incluido', 'party', '{"es":"Montaje incluido","en":"Setup included"}'::jsonb, '{NEG-FIESTA}', 26)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('traslado', 'truck', '{"es":"Traslado","en":"Delivery"}'::jsonb, '{NEG-FIESTA}', 27)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('paquetes', 'dateFree', '{"es":"Paquetes","en":"Packages"}'::jsonb, '{NEG-FIESTA}', 28)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('acepta-seguro', 'insurance', '{"es":"Acepta seguro","en":"Takes insurance"}'::jsonb, '{NEG-SALUD}', 29)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('precio-sin-seguro', 'dollar', '{"es":"Precio sin seguro","en":"Self-pay price"}'::jsonb, '{NEG-SALUD}', 30)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('telemedicina', 'phone', '{"es":"Telemedicina","en":"Telehealth"}'::jsonb, '{NEG-SALUD}', 31)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('atiende-ninos', 'smile', '{"es":"Atiende niños","en":"Sees children"}'::jsonb, '{NEG-SALUD}', 32)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('consulta-gratis', 'chat', '{"es":"Consulta gratis","en":"Free consultation"}'::jsonb, '{NEG-PRO}', 33)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('por-video-o-telefono', 'globe', '{"es":"Por video o teléfono","en":"By video or phone"}'::jsonb, '{NEG-PRO}', 34)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('plan-de-pagos', 'wallet', '{"es":"Plan de pagos","en":"Payment plan"}'::jsonb, '{NEG-PRO,NEG-EDU}', 35)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('apartado', 'lock', '{"es":"Apartado","en":"Layaway"}'::jsonb, '{NEG-TIENDA}', 36)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('envio', 'truck', '{"es":"Envío","en":"Shipping"}'::jsonb, '{NEG-TIENDA}', 37)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('pickup-en-tienda', 'store', '{"es":"Pickup en tienda","en":"In-store pickup"}'::jsonb, '{NEG-TIENDA}', 38)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('asiento-de-nino', 'smile', '{"es":"Asiento de niño","en":"Child seat"}'::jsonb, '{NEG-TRANS}', 39)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('equipaje', 'bag', '{"es":"Equipaje","en":"Luggage"}'::jsonb, '{NEG-TRANS}', 40)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('24-7', 'clock', '{"es":"24/7","en":"24/7"}'::jsonb, '{NEG-TRANS}', 41)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('cruza-estados', 'globe', '{"es":"Cruza estados","en":"Crosses state lines"}'::jsonb, '{NEG-TRANS}', 42)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('en-linea', 'globe', '{"es":"En línea","en":"Online"}'::jsonb, '{NEG-EDU}', 43)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('certificado', 'verified', '{"es":"Certificado","en":"Certificate"}'::jsonb, '{NEG-EDU}', 44)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('licencia-del-estado', 'verified', '{"es":"Licencia del estado","en":"State license"}'::jsonb, '{NEG-NINOS}', 45)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('comidas-incluidas', 'restaurant', '{"es":"Comidas incluidas","en":"Meals included"}'::jsonb, '{NEG-NINOS}', 46)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('transporte', 'truck', '{"es":"Transporte","en":"Transportation"}'::jsonb, '{NEG-NINOS,NEG-FE}', 47)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('acepta-subsidio', 'wallet', '{"es":"Acepta subsidio","en":"Takes subsidy"}'::jsonb, '{NEG-NINOS}', 48)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('cuidan-a-los-ninos', 'smile', '{"es":"Cuidan a los niños","en":"Childcare"}'::jsonb, '{NEG-DEPORTE}', 49)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('sin-contrato', 'check', '{"es":"Sin contrato","en":"No contract"}'::jsonb, '{NEG-DEPORTE}', 50)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('duchas', 'water', '{"es":"Duchas","en":"Showers"}'::jsonb, '{NEG-DEPORTE}', 51)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('despensa', 'bag', '{"es":"Despensa","en":"Food pantry"}'::jsonb, '{NEG-FE}', 52)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('para-jovenes', 'users', '{"es":"Para jóvenes","en":"Youth group"}'::jsonb, '{NEG-FE}', 53)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('acepta-itin', 'key', '{"es":"Acepta ITIN","en":"Accepts ITIN"}'::jsonb, '{NEG-INMUEBLE,NEG-DEALER}', 54)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('section-8', 'home', '{"es":"Section 8","en":"Section 8"}'::jsonb, '{NEG-INMUEBLE}', 55)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('mascotas', 'heart', '{"es":"Mascotas","en":"Pets OK"}'::jsonb, '{NEG-INMUEBLE}', 56)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('financiamiento', 'wallet', '{"es":"Financiamiento","en":"Financing"}'::jsonb, '{NEG-DEALER}', 57)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
insert into amenities (key, icon, label, categories, sort) values ('trade-in', 'car', '{"es":"Trade-in","en":"Trade-in"}'::jsonb, '{NEG-DEALER}', 58)
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;
update businesses b set amenities = (select coalesce(array_agg(coalesce(a.key, x) order by o), '{}') from unnest(b.amenities) with ordinality u(x, o) left join amenities a on a.label->>'es' = x)
 where exists (select 1 from unnest(b.amenities) x join amenities a on a.label->>'es' = x);
commit;
