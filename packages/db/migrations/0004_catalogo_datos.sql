-- 0004 · Datos del catálogo: 17 categorías y sus subcategorías.
-- GENERADO por scripts/taxonomia.mjs desde docs/diseno/plan/taxonomia-negocios.md. No editar a mano.
-- Idempotente: inserta lo nuevo y actualiza nombres; nunca borra (lo que el Super Admin apagó sigue apagado).
begin;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-AUTO', 1, '{"es":"Servicios de Auto","en":"Auto Services"}'::jsonb, '{"es":"Auto","en":"Auto"}'::jsonb, 'car', '["F-CITA","F-OBRA"]'::jsonb, '["svc","citas","cot","shop","renta","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-01', 'NEG-AUTO', 1, '{"es":"Mecánico general","en":"Mechanic – general repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-02', 'NEG-AUTO', 2, '{"es":"Mecánico a domicilio","en":"Mobile mechanic"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-03', 'NEG-AUTO', 3, '{"es":"Cambio de aceite","en":"Oil change & lube"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-04', 'NEG-AUTO', 4, '{"es":"Diagnóstico y escáner","en":"Diagnostics & check engine"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-05', 'NEG-AUTO', 5, '{"es":"Frenos","en":"Brakes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-06', 'NEG-AUTO', 6, '{"es":"Suspensión y alineación","en":"Suspension & alignment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-07', 'NEG-AUTO', 7, '{"es":"Transmisión","en":"Transmission"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-08', 'NEG-AUTO', 8, '{"es":"Motor y reconstrucción","en":"Engine repair & rebuild"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-09', 'NEG-AUTO', 9, '{"es":"Eléctrico automotriz","en":"Electrical & wiring"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-10', 'NEG-AUTO', 10, '{"es":"Aire acondicionado y calefacción","en":"AC & heating"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-11', 'NEG-AUTO', 11, '{"es":"Radiadores","en":"Radiator & cooling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-12', 'NEG-AUTO', 12, '{"es":"Escape y mofles","en":"Exhaust & mufflers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-13', 'NEG-AUTO', 13, '{"es":"Llantas y rines","en":"Tires & wheels"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-14', 'NEG-AUTO', 14, '{"es":"Reparación de rines","en":"Rim repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-15', 'NEG-AUTO', 15, '{"es":"Baterías y paso de corriente","en":"Batteries & jumpstart"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-16', 'NEG-AUTO', 16, '{"es":"Hojalatería y choques","en":"Body shop & collision"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-17', 'NEG-AUTO', 17, '{"es":"Pintura automotriz","en":"Paint & touch-up"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-18', 'NEG-AUTO', 18, '{"es":"Reparación de golpes sin pintura","en":"Dent removal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-19', 'NEG-AUTO', 19, '{"es":"Cristales y parabrisas","en":"Auto glass & windshield"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-20', 'NEG-AUTO', 20, '{"es":"Papel ahumado","en":"Window tinting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-21', 'NEG-AUTO', 21, '{"es":"Vinilos y rotulado","en":"Wraps & vinyl"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-22', 'NEG-AUTO', 22, '{"es":"Detallado y cerámico","en":"Detailing & ceramic coating"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-23', 'NEG-AUTO', 23, '{"es":"Lavado de autos","en":"Car wash"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-24', 'NEG-AUTO', 24, '{"es":"Lavado a domicilio","en":"Mobile car wash"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-25', 'NEG-AUTO', 25, '{"es":"Tapicería automotriz","en":"Upholstery & interiors"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-26', 'NEG-AUTO', 26, '{"es":"Audio, alarmas y accesorios","en":"Audio, alarms & accessories"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-27', 'NEG-AUTO', 27, '{"es":"Preparación y tuning","en":"Performance & tuning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-28', 'NEG-AUTO', 28, '{"es":"Levantamiento y off-road","en":"Lift kits & off-road"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-29', 'NEG-AUTO', 29, '{"es":"Diésel y camión pesado","en":"Diesel & heavy truck repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-30', 'NEG-AUTO', 30, '{"es":"Mantenimiento de flotas","en":"Fleet maintenance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-31', 'NEG-AUTO', 31, '{"es":"Motos y cuatrimotos","en":"Motorcycle & ATV repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-32', 'NEG-AUTO', 32, '{"es":"Casas rodantes y tráileres","en":"RV & trailer repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-33', 'NEG-AUTO', 33, '{"es":"Cerrajero y llaves de auto","en":"Auto locksmith & keys"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-34', 'NEG-AUTO', 34, '{"es":"Grúas","en":"Towing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-35', 'NEG-AUTO', 35, '{"es":"Auxilio en carretera","en":"Roadside assistance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-36', 'NEG-AUTO', 36, '{"es":"Inspección estatal y emisiones","en":"State inspection & emissions"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-37', 'NEG-AUTO', 37, '{"es":"Repuestos y autopartes","en":"Auto parts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-38', 'NEG-AUTO', 38, '{"es":"deshuesadero","en":"Salvage yard / Yonke"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-39', 'NEG-AUTO', 39, '{"es":"Traslado de vehículos","en":"Auto transport"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-AUTO-40', 'NEG-AUTO', 40, '{"es":"Revisión antes de comprar","en":"Pre-purchase inspection"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-BELL', 2, '{"es":"Belleza y Salud","en":"Beauty and Health"}'::jsonb, '{"es":"Belleza","en":"Beauty"}'::jsonb, 'scissors', '["F-CITA"]'::jsonb, '["svc","citas","shop","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-01', 'NEG-BELL', 1, '{"es":"Barbería","en":"Barbershop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-02', 'NEG-BELL', 2, '{"es":"Barbero a domicilio","en":"Mobile barber"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-03', 'NEG-BELL', 3, '{"es":"Cortes para niños","en":"Kids haircuts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-04', 'NEG-BELL', 4, '{"es":"Barba y arreglo masculino","en":"Beard & grooming"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-05', 'NEG-BELL', 5, '{"es":"Salón de belleza","en":"Hair salon"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-06', 'NEG-BELL', 6, '{"es":"Tinte y mechas","en":"Hair coloring & highlights"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-07', 'NEG-BELL', 7, '{"es":"Trenzas y extensiones","en":"Braids & extensions"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-08', 'NEG-BELL', 8, '{"es":"Keratina y alisados","en":"Keratin & blowouts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-09', 'NEG-BELL', 9, '{"es":"Especialista en rizos","en":"Curly hair specialist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-10', 'NEG-BELL', 10, '{"es":"Tratamiento de caída de cabello","en":"Hair loss treatment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-11', 'NEG-BELL', 11, '{"es":"Pelucas","en":"Wigs & hairpieces"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-12', 'NEG-BELL', 12, '{"es":"Peinado de novia y quinceañera","en":"Bridal & quinceañera styling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-13', 'NEG-BELL', 13, '{"es":"Maquillista","en":"Makeup artist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-14', 'NEG-BELL', 14, '{"es":"Uñas, manicura y pedicura","en":"Nails – manicure & pedicure"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-15', 'NEG-BELL', 15, '{"es":"Acrílico y gel","en":"Acrylics & gel"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-16', 'NEG-BELL', 16, '{"es":"Diseño de uñas","en":"Nail art"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-17', 'NEG-BELL', 17, '{"es":"Extensiones de pestañas","en":"Eyelash extensions"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-18', 'NEG-BELL', 18, '{"es":"Lifting de pestañas","en":"Lash lift"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-19', 'NEG-BELL', 19, '{"es":"Cejas y microblading","en":"Eyebrows & microblading"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-20', 'NEG-BELL', 20, '{"es":"Hilo","en":"Threading"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-21', 'NEG-BELL', 21, '{"es":"Depilación con cera","en":"Waxing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-22', 'NEG-BELL', 22, '{"es":"Depilación láser","en":"Laser hair removal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-23', 'NEG-BELL', 23, '{"es":"Faciales y estética","en":"Facials & esthetician"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-24', 'NEG-BELL', 24, '{"es":"Tratamiento de acné y piel","en":"Acne & skin treatment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-25', 'NEG-BELL', 25, '{"es":"Masajes","en":"Massage therapy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-26', 'NEG-BELL', 26, '{"es":"Masaje relajante y en pareja","en":"Relaxing & couples massage"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-27', 'NEG-BELL', 27, '{"es":"Masaje deportivo y profundo","en":"Sports & deep tissue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-28', 'NEG-BELL', 28, '{"es":"Drenaje linfático y post-operatorio","en":"Lymphatic & post-op massage"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-29', 'NEG-BELL', 29, '{"es":"Spa y sauna","en":"Spa & sauna"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-30', 'NEG-BELL', 30, '{"es":"Moldeamiento corporal","en":"Body contouring"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-31', 'NEG-BELL', 31, '{"es":"Blanqueamiento dental cosmético","en":"Cosmetic teeth whitening"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-32', 'NEG-BELL', 32, '{"es":"Tatuajes","en":"Tattoo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-33', 'NEG-BELL', 33, '{"es":"Borrado de tatuajes","en":"Tattoo removal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-34', 'NEG-BELL', 34, '{"es":"Perforaciones","en":"Piercing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-35', 'NEG-BELL', 35, '{"es":"Maquillaje permanente","en":"Permanent makeup"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-36', 'NEG-BELL', 36, '{"es":"Nutrición y control de peso","en":"Nutrition & weight coaching"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-37', 'NEG-BELL', 37, '{"es":"Vitaminas y suplementos","en":"Vitamins & supplements"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-38', 'NEG-BELL', 38, '{"es":"Productos naturales y herbales","en":"Natural & herbal products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-39', 'NEG-BELL', 39, '{"es":"Tienda de productos de belleza","en":"Beauty supply store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-BELL-40', 'NEG-BELL', 40, '{"es":"Belleza a domicilio","en":"Mobile beauty service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-FOOD', 3, '{"es":"Comida y Bebidas","en":"Food and Drinks"}'::jsonb, '{"es":"Comida","en":"Food"}'::jsonb, 'restaurant', '["F-COMIDA"]'::jsonb, '["menu","pedidos","rsv","cot","shop","staff","eventos","nov","jobs"]'::jsonb, 'menu', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-01', 'NEG-FOOD', 1, '{"es":"Comida casera","en":"Homemade food"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-02', 'NEG-FOOD', 2, '{"es":"Cocina de fin de semana","en":"Weekend-only cook"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-03', 'NEG-FOOD', 3, '{"es":"Comida preparada por semana","en":"Meal prep"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-04', 'NEG-FOOD', 4, '{"es":"Chef privado","en":"Personal chef"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-05', 'NEG-FOOD', 5, '{"es":"Catering y banquetes","en":"Catering"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-06', 'NEG-FOOD', 6, '{"es":"Camión de comida","en":"Food truck"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-07', 'NEG-FOOD', 7, '{"es":"Vendedor ambulante","en":"Street vendor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-08', 'NEG-FOOD', 8, '{"es":"Cocina solo para entrega","en":"Delivery-only kitchen"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-09', 'NEG-FOOD', 9, '{"es":"Mexicana","en":"Mexican"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-10', 'NEG-FOOD', 10, '{"es":"Dominicana","en":"Dominican"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-11', 'NEG-FOOD', 11, '{"es":"Puertorriqueña","en":"Puerto Rican"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-12', 'NEG-FOOD', 12, '{"es":"Cubana","en":"Cuban"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-13', 'NEG-FOOD', 13, '{"es":"Colombiana","en":"Colombian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-14', 'NEG-FOOD', 14, '{"es":"Venezolana","en":"Venezuelan"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-15', 'NEG-FOOD', 15, '{"es":"Peruana","en":"Peruvian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-16', 'NEG-FOOD', 16, '{"es":"Ecuatoriana","en":"Ecuadorian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-17', 'NEG-FOOD', 17, '{"es":"Salvadoreña","en":"Salvadoran"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-18', 'NEG-FOOD', 18, '{"es":"Guatemalteca","en":"Guatemalan"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-19', 'NEG-FOOD', 19, '{"es":"Hondureña","en":"Honduran"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-20', 'NEG-FOOD', 20, '{"es":"Argentina","en":"Argentinian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-21', 'NEG-FOOD', 21, '{"es":"Brasileña","en":"Brazilian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-22', 'NEG-FOOD', 22, '{"es":"Española","en":"Spanish"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-23', 'NEG-FOOD', 23, '{"es":"Fusión latina","en":"Latin fusion"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-24', 'NEG-FOOD', 24, '{"es":"Americana","en":"American & diner"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-25', 'NEG-FOOD', 25, '{"es":"China y asiática","en":"Chinese & Asian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-26', 'NEG-FOOD', 26, '{"es":"Italiana y pizza","en":"Italian & pizza"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-27', 'NEG-FOOD', 27, '{"es":"Tacos","en":"Taquería"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-28', 'NEG-FOOD', 28, '{"es":"Pupusas","en":"Pupusería"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-29', 'NEG-FOOD', 29, '{"es":"Arepas","en":"Arepas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-30', 'NEG-FOOD', 30, '{"es":"Empanadas","en":"Empanadas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-31', 'NEG-FOOD', 31, '{"es":"Tamales","en":"Tamales"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-32', 'NEG-FOOD', 32, '{"es":"Mariscos","en":"Seafood"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-33', 'NEG-FOOD', 33, '{"es":"Parrilla y carnes","en":"Grill & steakhouse"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-34', 'NEG-FOOD', 34, '{"es":"BBQ & asados","en":"BBQ & asados"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-35', 'NEG-FOOD', 35, '{"es":"Pollo asado","en":"Rotisserie chicken"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-36', 'NEG-FOOD', 36, '{"es":"Pollo frito y alitas","en":"Fried chicken & wings"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-37', 'NEG-FOOD', 37, '{"es":"Sandwiches & tortas","en":"Sandwiches & tortas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-38', 'NEG-FOOD', 38, '{"es":"Hamburguesas","en":"Burgers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-39', 'NEG-FOOD', 39, '{"es":"Desayunos","en":"Breakfast"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-40', 'NEG-FOOD', 40, '{"es":"Buffet","en":"Buffet"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-41', 'NEG-FOOD', 41, '{"es":"Vegetariana y vegana","en":"Vegetarian & vegan"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-42', 'NEG-FOOD', 42, '{"es":"Panadería","en":"Bakery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-43', 'NEG-FOOD', 43, '{"es":"Repostería y pasteles","en":"Cakes & pastry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-44', 'NEG-FOOD', 44, '{"es":"Decoración de pasteles","en":"Cake decorator"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-45', 'NEG-FOOD', 45, '{"es":"Postres","en":"Desserts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-46', 'NEG-FOOD', 46, '{"es":"Heladería y paletería","en":"Ice cream & paletas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-47', 'NEG-FOOD', 47, '{"es":"Antojitos y dulces","en":"Snacks & candy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-48', 'NEG-FOOD', 48, '{"es":"Jugos y batidos","en":"Juices & smoothies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-49', 'NEG-FOOD', 49, '{"es":"Cafetería","en":"Coffee shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-50', 'NEG-FOOD', 50, '{"es":"Bebidas especiales","en":"Bubble tea & specialty drinks"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-51', 'NEG-FOOD', 51, '{"es":"Aguas frescas & raspados","en":"Aguas frescas & raspados"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-52', 'NEG-FOOD', 52, '{"es":"Bartender y barra móvil","en":"Bartender & mobile bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FOOD-53', 'NEG-FOOD', 53, '{"es":"Hielo y agua","en":"Ice & bottled water"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-HOGAR', 4, '{"es":"Servicios del Hogar","en":"Home Services"}'::jsonb, '{"es":"Hogar","en":"Home"}'::jsonb, 'wrench', '["F-OBRA"]'::jsonb, '["svc","citas","cot","shop","renta","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-01', 'NEG-HOGAR', 1, '{"es":"Multiservicios","en":"Handyman"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-02', 'NEG-HOGAR', 2, '{"es":"Plomería","en":"Plumbing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-03', 'NEG-HOGAR', 3, '{"es":"Destape de drenajes","en":"Drain & sewer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-04', 'NEG-HOGAR', 4, '{"es":"Calentadores de agua","en":"Water heater"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-05', 'NEG-HOGAR', 5, '{"es":"Electricista","en":"Electrician"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-06', 'NEG-HOGAR', 6, '{"es":"Aire acondicionado y calefacción","en":"HVAC – AC & heating"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-07', 'NEG-HOGAR', 7, '{"es":"Calderas y hornos","en":"Boiler & furnace"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-08', 'NEG-HOGAR', 8, '{"es":"Reparación de electrodomésticos","en":"Appliance repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-09', 'NEG-HOGAR', 9, '{"es":"Carpintería","en":"Carpentry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-10', 'NEG-HOGAR', 10, '{"es":"Gabinetes y cubiertas","en":"Cabinets & countertops"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-11', 'NEG-HOGAR', 11, '{"es":"Pisos de cerámica","en":"Flooring – tile"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-12', 'NEG-HOGAR', 12, '{"es":"Pisos de madera y vinil","en":"Flooring – wood & vinyl"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-13', 'NEG-HOGAR', 13, '{"es":"Alfombra: instalación y limpieza","en":"Carpet install & cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-14', 'NEG-HOGAR', 14, '{"es":"Pintura interior","en":"Interior painting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-15', 'NEG-HOGAR', 15, '{"es":"Pintura exterior","en":"Exterior painting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-16', 'NEG-HOGAR', 16, '{"es":"Tablaroca y yeso","en":"Drywall & plaster"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-17', 'NEG-HOGAR', 17, '{"es":"Albañilería y concreto","en":"Masonry & concrete"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-18', 'NEG-HOGAR', 18, '{"es":"Estructura y armazón","en":"Framing & structural"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-19', 'NEG-HOGAR', 19, '{"es":"Remodelación completa","en":"Full remodeling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-20', 'NEG-HOGAR', 20, '{"es":"Remodelación de cocina","en":"Kitchen remodel"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-21', 'NEG-HOGAR', 21, '{"es":"Remodelación de baño","en":"Bathroom remodel"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-22', 'NEG-HOGAR', 22, '{"es":"Terminado de sótano","en":"Basement finishing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-23', 'NEG-HOGAR', 23, '{"es":"Techos","en":"Roofing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-24', 'NEG-HOGAR', 24, '{"es":"Canaletas","en":"Gutters"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-25', 'NEG-HOGAR', 25, '{"es":"Recubrimiento exterior","en":"Siding"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-26', 'NEG-HOGAR', 26, '{"es":"Ventanas y puertas","en":"Windows & doors"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-27', 'NEG-HOGAR', 27, '{"es":"Aislamiento","en":"Insulation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-28', 'NEG-HOGAR', 28, '{"es":"Cimientos e impermeabilización","en":"Foundation & waterproofing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-29', 'NEG-HOGAR', 29, '{"es":"Chimeneas","en":"Chimney service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-30', 'NEG-HOGAR', 30, '{"es":"Soldadura y herrería","en":"Welding & metal work"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-31', 'NEG-HOGAR', 31, '{"es":"Cercas","en":"Fencing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-32', 'NEG-HOGAR', 32, '{"es":"Terrazas y patios","en":"Decks & patios"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-33', 'NEG-HOGAR', 33, '{"es":"Entradas de concreto","en":"Concrete driveways"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-34', 'NEG-HOGAR', 34, '{"es":"Jardinería y paisajismo","en":"Landscaping"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-35', 'NEG-HOGAR', 35, '{"es":"Corte de césped","en":"Lawn care & mowing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-36', 'NEG-HOGAR', 36, '{"es":"Poda y remoción de árboles","en":"Tree service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-37', 'NEG-HOGAR', 37, '{"es":"Remoción de nieve","en":"Snow removal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-38', 'NEG-HOGAR', 38, '{"es":"Riego","en":"Sprinklers & irrigation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-39', 'NEG-HOGAR', 39, '{"es":"Piscinas y jacuzzis","en":"Pools & spas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-40', 'NEG-HOGAR', 40, '{"es":"Control de plagas","en":"Pest control"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-41', 'NEG-HOGAR', 41, '{"es":"Limpieza de casas","en":"House cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-42', 'NEG-HOGAR', 42, '{"es":"Limpieza profunda y de salida","en":"Deep & move-out cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-43', 'NEG-HOGAR', 43, '{"es":"Limpieza comercial","en":"Commercial cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-44', 'NEG-HOGAR', 44, '{"es":"Limpieza de ventanas","en":"Window cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-45', 'NEG-HOGAR', 45, '{"es":"Lavado a presión","en":"Pressure washing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-46', 'NEG-HOGAR', 46, '{"es":"Retiro de escombros y basura","en":"Junk removal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-47', 'NEG-HOGAR', 47, '{"es":"Mudanzas","en":"Moving"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-48', 'NEG-HOGAR', 48, '{"es":"Servicio de empaque","en":"Packing service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-49', 'NEG-HOGAR', 49, '{"es":"Armado de muebles","en":"Furniture assembly"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-50', 'NEG-HOGAR', 50, '{"es":"Tapicería y reparación de muebles","en":"Upholstery & furniture repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-51', 'NEG-HOGAR', 51, '{"es":"Puertas de garaje","en":"Garage doors"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-52', 'NEG-HOGAR', 52, '{"es":"Cerrajero","en":"Locksmith"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-53', 'NEG-HOGAR', 53, '{"es":"Cámaras y alarmas","en":"Security cameras & alarms"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-54', 'NEG-HOGAR', 54, '{"es":"Instalación de TV y casa inteligente","en":"TV mounting & smart home"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-55', 'NEG-HOGAR', 55, '{"es":"Instalación de internet y satélite","en":"Internet & satellite install"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-56', 'NEG-HOGAR', 56, '{"es":"Paneles solares","en":"Solar panels"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-57', 'NEG-HOGAR', 57, '{"es":"Generadores","en":"Generators"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-HOGAR-58', 'NEG-HOGAR', 58, '{"es":"Reparaciones para inspección","en":"Home inspection prep & repairs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-NOCHE', 5, '{"es":"Vida Nocturna","en":"Night Life"}'::jsonb, '{"es":"Noche","en":"Nightlife"}'::jsonb, 'drink', '["F-NOCHE"]'::jsonb, '["svc","rsv","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-01', 'NEG-NOCHE', 1, '{"es":"Bar","en":"Bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-02', 'NEG-NOCHE', 2, '{"es":"Bar deportivo","en":"Sports bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-03', 'NEG-NOCHE', 3, '{"es":"Cantina","en":"Cantina"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-04', 'NEG-NOCHE', 4, '{"es":"Lounge","en":"Lounge"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-05', 'NEG-NOCHE', 5, '{"es":"Discoteca","en":"Nightclub"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-06', 'NEG-NOCHE', 6, '{"es":"Club de salsa y bachata","en":"Latin dance club"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-07', 'NEG-NOCHE', 7, '{"es":"Noche de banda y norteño","en":"Banda & norteño night"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-08', 'NEG-NOCHE', 8, '{"es":"Noche urbana","en":"Reggaetón & urbano night"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-09', 'NEG-NOCHE', 9, '{"es":"Local de música en vivo","en":"Live music venue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-10', 'NEG-NOCHE', 10, '{"es":"Sala de conciertos","en":"Concert venue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-11', 'NEG-NOCHE', 11, '{"es":"Karaoke","en":"Karaoke"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-12', 'NEG-NOCHE', 12, '{"es":"Salón de hookah","en":"Hookah lounge"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-13', 'NEG-NOCHE', 13, '{"es":"Billar","en":"Billiards & pool hall"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-14', 'NEG-NOCHE', 14, '{"es":"Bar de juegos","en":"Darts & games bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-15', 'NEG-NOCHE', 15, '{"es":"Cervecería","en":"Brewery & taproom"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-16', 'NEG-NOCHE', 16, '{"es":"Bar de vinos","en":"Wine bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-17', 'NEG-NOCHE', 17, '{"es":"Coctelería","en":"Cocktail bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-18', 'NEG-NOCHE', 18, '{"es":"Terraza","en":"Rooftop & terrace"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-19', 'NEG-NOCHE', 19, '{"es":"Comedia y espectáculos","en":"Comedy & show"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-20', 'NEG-NOCHE', 20, '{"es":"Noches temáticas","en":"Ladies night & themed nights"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-21', 'NEG-NOCHE', 21, '{"es":"After-hours","en":"After-hours"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-22', 'NEG-NOCHE', 22, '{"es":"Promotor de eventos nocturnos","en":"Event promoter"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-23', 'NEG-NOCHE', 23, '{"es":"DJ de discoteca","en":"Nightclub DJ"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-24', 'NEG-NOCHE', 24, '{"es":"Servicio VIP","en":"Bottle service & VIP tables"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NOCHE-25', 'NEG-NOCHE', 25, '{"es":"Local para fiestas privadas","en":"Private party venue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-MERC', 6, '{"es":"Mercados y Bodegas","en":"Markets and Bodegas"}'::jsonb, '{"es":"Mercados","en":"Markets"}'::jsonb, 'cart', '["F-RETAIL"]'::jsonb, '["shop","pedidos","staff","eventos","nov","jobs"]'::jsonb, 'shop', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-01', 'NEG-MERC', 1, '{"es":"Bodega de la esquina","en":"Bodega / corner store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-02', 'NEG-MERC', 2, '{"es":"Supermercado latino","en":"Latin supermarket"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-03', 'NEG-MERC', 3, '{"es":"Abarrotes","en":"Grocery store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-04', 'NEG-MERC', 4, '{"es":"Carnicería","en":"Butcher shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-05', 'NEG-MERC', 5, '{"es":"Pescadería","en":"Fish market"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-06', 'NEG-MERC', 6, '{"es":"Frutas y verduras","en":"Produce market"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-07', 'NEG-MERC', 7, '{"es":"Tortillería","en":"Tortillería"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-08', 'NEG-MERC', 8, '{"es":"Delicatessen y comida lista","en":"Deli & prepared foods"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-09', 'NEG-MERC', 9, '{"es":"Congelados","en":"Frozen foods"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-10', 'NEG-MERC', 10, '{"es":"Quesos y lácteos","en":"Cheese & dairy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-11', 'NEG-MERC', 11, '{"es":"Especias y granos","en":"Spices & dried goods"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-12', 'NEG-MERC', 12, '{"es":"Productos mexicanos","en":"Mexican products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-13', 'NEG-MERC', 13, '{"es":"Productos dominicanos","en":"Dominican products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-14', 'NEG-MERC', 14, '{"es":"Productos centroamericanos","en":"Central American products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-15', 'NEG-MERC', 15, '{"es":"Productos sudamericanos","en":"South American products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-16', 'NEG-MERC', 16, '{"es":"Productos del Caribe","en":"Caribbean products"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-17', 'NEG-MERC', 17, '{"es":"Mayorista","en":"Wholesale & mayoreo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-18', 'NEG-MERC', 18, '{"es":"Mercado de agricultores","en":"Farmers market"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-19', 'NEG-MERC', 19, '{"es":"Tienda de conveniencia","en":"Convenience store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-20', 'NEG-MERC', 20, '{"es":"Tienda de a dólar","en":"Dollar & discount store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-21', 'NEG-MERC', 21, '{"es":"Licorería","en":"Liquor store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-22', 'NEG-MERC', 22, '{"es":"Cerveza y vino","en":"Beer & wine"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-23', 'NEG-MERC', 23, '{"es":"Tabaquería","en":"Smoke shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-24', 'NEG-MERC', 24, '{"es":"Vape shop","en":"Vape shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-25', 'NEG-MERC', 25, '{"es":"Botánica y hierbas","en":"Botánica & herbs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-26', 'NEG-MERC', 26, '{"es":"Agua e hielo","en":"Water & ice"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-27', 'NEG-MERC', 27, '{"es":"Alimento para mascotas","en":"Pet food"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-28', 'NEG-MERC', 28, '{"es":"Panadería dentro del mercado","en":"Bakery counter inside market"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-29', 'NEG-MERC', 29, '{"es":"Servicios de dinero en bodega","en":"Money services inside bodega"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-MERC-30', 'NEG-MERC', 30, '{"es":"Entrega a domicilio del mercado","en":"Home delivery from market"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-FIESTA', 7, '{"es":"Fiestas y Celebraciones","en":"Party and Celebrations"}'::jsonb, '{"es":"Fiestas","en":"Parties"}'::jsonb, 'party', '["F-EVENTO"]'::jsonb, '["svc","citas","cot","renta","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-01', 'NEG-FIESTA', 1, '{"es":"Organizador de eventos","en":"Event planner"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-02', 'NEG-FIESTA', 2, '{"es":"Organizador de quinceañeras","en":"Quinceañera planner"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-03', 'NEG-FIESTA', 3, '{"es":"Organizador de bodas","en":"Wedding planner"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-04', 'NEG-FIESTA', 4, '{"es":"Organizador de baby shower","en":"Baby shower planner"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-05', 'NEG-FIESTA', 5, '{"es":"Fiestas de cumpleaños","en":"Birthday parties"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-06', 'NEG-FIESTA', 6, '{"es":"Eventos corporativos","en":"Corporate events"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-07', 'NEG-FIESTA', 7, '{"es":"Salón de fiestas","en":"Party venue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-08', 'NEG-FIESTA', 8, '{"es":"Montaje en patio","en":"Backyard & outdoor setup"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-09', 'NEG-FIESTA', 9, '{"es":"Renta de artículos para fiesta","en":"Party rentals"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-10', 'NEG-FIESTA', 10, '{"es":"Renta de mesas y sillas","en":"Tables & chairs rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-11', 'NEG-FIESTA', 11, '{"es":"Renta de carpas","en":"Tents & canopies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-12', 'NEG-FIESTA', 12, '{"es":"Mantelería","en":"Linens & covers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-13', 'NEG-FIESTA', 13, '{"es":"Decoración y centros de mesa","en":"Décor & centerpieces"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-14', 'NEG-FIESTA', 14, '{"es":"Decoración con globos","en":"Balloon décor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-15', 'NEG-FIESTA', 15, '{"es":"Fondos y arcos","en":"Backdrops & arches"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-16', 'NEG-FIESTA', 16, '{"es":"Iluminación y sonido","en":"Lighting & sound"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-17', 'NEG-FIESTA', 17, '{"es":"Escenario y pista","en":"Stage & dance floor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-18', 'NEG-FIESTA', 18, '{"es":"Brincolines e inflables","en":"Bounce house & inflatables"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-19', 'NEG-FIESTA', 19, '{"es":"Juegos y renta de feria","en":"Games & carnival rentals"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-20', 'NEG-FIESTA', 20, '{"es":"Piñatas","en":"Piñatas"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-21', 'NEG-FIESTA', 21, '{"es":"Mesa de dulces","en":"Candy table"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-22', 'NEG-FIESTA', 22, '{"es":"Fuente de chocolate","en":"Chocolate fountain"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-23', 'NEG-FIESTA', 23, '{"es":"Pastel y postres de evento","en":"Cake & desserts for events"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-24', 'NEG-FIESTA', 24, '{"es":"Taquiza y parrillada","en":"Taco & grill catering"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-25', 'NEG-FIESTA', 25, '{"es":"Servicio de bartender","en":"Bartender service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-26', 'NEG-FIESTA', 26, '{"es":"Meseros","en":"Waitstaff"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-27', 'NEG-FIESTA', 27, '{"es":"Barra móvil","en":"Portable bar"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-28', 'NEG-FIESTA', 28, '{"es":"Baños portátiles","en":"Portable restrooms"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-29', 'NEG-FIESTA', 29, '{"es":"Plantas de luz","en":"Generators & power"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-30', 'NEG-FIESTA', 30, '{"es":"Florería","en":"Florist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-31', 'NEG-FIESTA', 31, '{"es":"Invitaciones e impresión","en":"Invitations & printing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-32', 'NEG-FIESTA', 32, '{"es":"Tienda de artículos de fiesta","en":"Party supply store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-33', 'NEG-FIESTA', 33, '{"es":"DJ","en":"DJ"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-34', 'NEG-FIESTA', 34, '{"es":"Renta de sonido","en":"Sound system rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-35', 'NEG-FIESTA', 35, '{"es":"Mariachi","en":"Mariachi"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-36', 'NEG-FIESTA', 36, '{"es":"Banda & norteño","en":"Banda & norteño"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-37', 'NEG-FIESTA', 37, '{"es":"Trío & serenata","en":"Trío & serenata"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-38', 'NEG-FIESTA', 38, '{"es":"Grupo musical","en":"Live band"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-39', 'NEG-FIESTA', 39, '{"es":"Cantante","en":"Solo singer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-40', 'NEG-FIESTA', 40, '{"es":"Maestro de ceremonias y animador","en":"MC & animator"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-41', 'NEG-FIESTA', 41, '{"es":"Payasos","en":"Clowns"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-42', 'NEG-FIESTA', 42, '{"es":"Personajes y botargas","en":"Character animators"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-43', 'NEG-FIESTA', 43, '{"es":"Pintacaritas","en":"Face painting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-44', 'NEG-FIESTA', 44, '{"es":"Mago","en":"Magician"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-45', 'NEG-FIESTA', 45, '{"es":"Bailarines y hora loca","en":"Dancers & hora loca"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-46', 'NEG-FIESTA', 46, '{"es":"Entretenimiento infantil","en":"Kids entertainment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-47', 'NEG-FIESTA', 47, '{"es":"Fotógrafo","en":"Photographer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-48', 'NEG-FIESTA', 48, '{"es":"Videógrafo","en":"Videographer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-49', 'NEG-FIESTA', 49, '{"es":"Fotografía con dron","en":"Drone photography"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-50', 'NEG-FIESTA', 50, '{"es":"Cabina de fotos","en":"Photo booth"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-51', 'NEG-FIESTA', 51, '{"es":"Cabina 360","en":"360 photo booth"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-52', 'NEG-FIESTA', 52, '{"es":"Limosina y party bus","en":"Limo & party bus"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-53', 'NEG-FIESTA', 53, '{"es":"Chambelanes y coreografía","en":"Chambelanes & choreography"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-54', 'NEG-FIESTA', 54, '{"es":"Renta de vestidos y trajes","en":"Dress & tuxedo rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-55', 'NEG-FIESTA', 55, '{"es":"Coordinación de ceremonia religiosa","en":"Religious ceremony coordination"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FIESTA-56', 'NEG-FIESTA', 56, '{"es":"Pirotecnia y chispas frías","en":"Fireworks & cold sparks"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-SALUD', 8, '{"es":"Doctores y Medicina","en":"Doctors and Medicine"}'::jsonb, '{"es":"Salud","en":"Health"}'::jsonb, 'medical', '["F-SALUD"]'::jsonb, '["svc","citas","shop","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-01', 'NEG-SALUD', 1, '{"es":"Medicina general","en":"Primary care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-02', 'NEG-SALUD', 2, '{"es":"Clínica sin cita y urgencias","en":"Walk-in & urgent care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-03', 'NEG-SALUD', 3, '{"es":"Clínica comunitaria de bajo costo","en":"Community clinic – sliding scale"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-04', 'NEG-SALUD', 4, '{"es":"Pediatría","en":"Pediatrics"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-05', 'NEG-SALUD', 5, '{"es":"Ginecología y obstetricia","en":"OB-GYN"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-06', 'NEG-SALUD', 6, '{"es":"Control prenatal","en":"Prenatal care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-07', 'NEG-SALUD', 7, '{"es":"Partera y doula","en":"Midwife & doula"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-08', 'NEG-SALUD', 8, '{"es":"Fertilidad","en":"Fertility"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-09', 'NEG-SALUD', 9, '{"es":"Planificación familiar","en":"Family planning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-10', 'NEG-SALUD', 10, '{"es":"Dentista","en":"Dentist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-11', 'NEG-SALUD', 11, '{"es":"Ortodoncia","en":"Orthodontist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-12', 'NEG-SALUD', 12, '{"es":"Cirugía oral","en":"Oral surgery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-13', 'NEG-SALUD', 13, '{"es":"Prótesis e implantes","en":"Dentures & implants"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-14', 'NEG-SALUD', 14, '{"es":"Dentista infantil","en":"Pediatric dentist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-15', 'NEG-SALUD', 15, '{"es":"Optometría","en":"Optometrist & eye exam"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-16', 'NEG-SALUD', 16, '{"es":"Óptica y lentes","en":"Optical shop & glasses"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-17', 'NEG-SALUD', 17, '{"es":"Dermatología","en":"Dermatology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-18', 'NEG-SALUD', 18, '{"es":"Cardiología","en":"Cardiology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-19', 'NEG-SALUD', 19, '{"es":"Endocrinología y diabetes","en":"Endocrinology & diabetes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-20', 'NEG-SALUD', 20, '{"es":"Gastroenterología","en":"Gastroenterology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-21', 'NEG-SALUD', 21, '{"es":"Neurología","en":"Neurology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-22', 'NEG-SALUD', 22, '{"es":"Neumología","en":"Pulmonology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-23', 'NEG-SALUD', 23, '{"es":"Urología","en":"Urology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-24', 'NEG-SALUD', 24, '{"es":"Nefrología","en":"Nephrology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-25', 'NEG-SALUD', 25, '{"es":"Reumatología","en":"Rheumatology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-26', 'NEG-SALUD', 26, '{"es":"Ortopedia","en":"Orthopedics"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-27', 'NEG-SALUD', 27, '{"es":"Medicina deportiva","en":"Sports medicine"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-28', 'NEG-SALUD', 28, '{"es":"Podología","en":"Podiatry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-29', 'NEG-SALUD', 29, '{"es":"Otorrinolaringología","en":"ENT"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-30', 'NEG-SALUD', 30, '{"es":"Alergias y asma","en":"Allergy & asthma"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-31', 'NEG-SALUD', 31, '{"es":"Oncología","en":"Oncology"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-32', 'NEG-SALUD', 32, '{"es":"Manejo del dolor","en":"Pain management"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-33', 'NEG-SALUD', 33, '{"es":"Quiropráctico","en":"Chiropractor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-34', 'NEG-SALUD', 34, '{"es":"Terapia física","en":"Physical therapy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-35', 'NEG-SALUD', 35, '{"es":"Terapia ocupacional","en":"Occupational therapy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-36', 'NEG-SALUD', 36, '{"es":"Terapia del habla","en":"Speech therapy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-37', 'NEG-SALUD', 37, '{"es":"Psicología y consejería","en":"Psychology & counseling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-38', 'NEG-SALUD', 38, '{"es":"Psiquiatría","en":"Psychiatry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-39', 'NEG-SALUD', 39, '{"es":"Terapia familiar y de pareja","en":"Family & couples therapy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-40', 'NEG-SALUD', 40, '{"es":"Adicciones y recuperación","en":"Addiction & recovery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-41', 'NEG-SALUD', 41, '{"es":"Nutriólogo","en":"Nutritionist"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-42', 'NEG-SALUD', 42, '{"es":"Clínica de pérdida de peso","en":"Weight loss clinic"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-43', 'NEG-SALUD', 43, '{"es":"Medicina estética","en":"Aesthetic medicine"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-44', 'NEG-SALUD', 44, '{"es":"Terapia intravenosa y bienestar","en":"IV therapy & wellness"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-45', 'NEG-SALUD', 45, '{"es":"Vacunas","en":"Vaccinations"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-46', 'NEG-SALUD', 46, '{"es":"Laboratorio y análisis","en":"Lab & bloodwork"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-47', 'NEG-SALUD', 47, '{"es":"Imagenología y rayos X","en":"Imaging & X-ray"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-48', 'NEG-SALUD', 48, '{"es":"Farmacia","en":"Pharmacy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-49', 'NEG-SALUD', 49, '{"es":"Farmacia de preparación","en":"Compounding pharmacy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-50', 'NEG-SALUD', 50, '{"es":"Equipo médico","en":"Medical equipment & supplies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-51', 'NEG-SALUD', 51, '{"es":"Aparatos auditivos","en":"Hearing aids"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-52', 'NEG-SALUD', 52, '{"es":"Cuidador a domicilio","en":"Home health aide"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-53', 'NEG-SALUD', 53, '{"es":"Enfermería a domicilio","en":"Home nursing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-54', 'NEG-SALUD', 54, '{"es":"Cuidado de adultos mayores","en":"Elder care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-55', 'NEG-SALUD', 55, '{"es":"Cuidados paliativos","en":"Hospice & palliative"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-56', 'NEG-SALUD', 56, '{"es":"Transporte médico","en":"Non-emergency medical transport"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-57', 'NEG-SALUD', 57, '{"es":"Telemedicina","en":"Telemedicine"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-58', 'NEG-SALUD', 58, '{"es":"Clínica del sueño","en":"Sleep clinic"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-59', 'NEG-SALUD', 59, '{"es":"Exámenes médicos laborales y DOT","en":"Occupational & DOT physicals"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-SALUD-60', 'NEG-SALUD', 60, '{"es":"Veterinario","en":"Veterinarian"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-PRO', 9, '{"es":"Servicios Profesionales","en":"Professional Services"}'::jsonb, '{"es":"Profesionales","en":"Pros"}'::jsonb, 'brief', '["F-PRO"]'::jsonb, '["svc","citas","cot","staff","eventos","nov","jobs"]'::jsonb, 'svc', false)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-01', 'NEG-PRO', 1, '{"es":"Abogado de inmigración","en":"Immigration attorney"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-02', 'NEG-PRO', 2, '{"es":"Ayuda con documentos de inmigración","en":"Immigration document help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-03', 'NEG-PRO', 3, '{"es":"Trámites de consulado y pasaporte","en":"Consulate & passport help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-04', 'NEG-PRO', 4, '{"es":"Abogado general","en":"General attorney"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-05', 'NEG-PRO', 5, '{"es":"Derecho familiar","en":"Family law"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-06', 'NEG-PRO', 6, '{"es":"Divorcio y custodia","en":"Divorce & custody"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-07', 'NEG-PRO', 7, '{"es":"Defensa penal","en":"Criminal defense"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-08', 'NEG-PRO', 8, '{"es":"Multas de tránsito y DUI","en":"Traffic tickets & DUI"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-09', 'NEG-PRO', 9, '{"es":"Accidentes y lesiones","en":"Personal injury & accidents"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-10', 'NEG-PRO', 10, '{"es":"Compensación laboral","en":"Workers'' comp"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-11', 'NEG-PRO', 11, '{"es":"Bancarrota","en":"Bankruptcy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-12', 'NEG-PRO', 12, '{"es":"Abogado de bienes raíces","en":"Real estate attorney"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-13', 'NEG-PRO', 13, '{"es":"Testamentos y sucesiones","en":"Wills & estate"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-14', 'NEG-PRO', 14, '{"es":"Fianzas","en":"Bail bonds"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-15', 'NEG-PRO', 15, '{"es":"Notario público","en":"Notary public"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-16', 'NEG-PRO', 16, '{"es":"Apostilla y legalización","en":"Apostille & document legalization"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-17', 'NEG-PRO', 17, '{"es":"Traducción e interpretación","en":"Translation & interpretation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-18', 'NEG-PRO', 18, '{"es":"Traducción certificada","en":"Certified document translation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-19', 'NEG-PRO', 19, '{"es":"Contador","en":"Accountant"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-20', 'NEG-PRO', 20, '{"es":"Preparación de impuestos","en":"Tax preparation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-21', 'NEG-PRO', 21, '{"es":"Solicitud de ITIN","en":"ITIN application"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-22', 'NEG-PRO', 22, '{"es":"Contabilidad y libros","en":"Bookkeeping"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-23', 'NEG-PRO', 23, '{"es":"Nómina","en":"Payroll"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-24', 'NEG-PRO', 24, '{"es":"Formación de empresa y LLC","en":"Business formation & LLC"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-25', 'NEG-PRO', 25, '{"es":"Licencias y permisos","en":"Licenses & permits"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-26', 'NEG-PRO', 26, '{"es":"Consultoría de negocios","en":"Business consulting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-27', 'NEG-PRO', 27, '{"es":"Seguros de auto","en":"Insurance agent – auto"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-28', 'NEG-PRO', 28, '{"es":"Seguros de casa y renta","en":"Insurance agent – home & renters"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-29', 'NEG-PRO', 29, '{"es":"Seguros de vida y salud","en":"Insurance agent – life & health"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-30', 'NEG-PRO', 30, '{"es":"Seguros comerciales","en":"Commercial & business insurance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-31', 'NEG-PRO', 31, '{"es":"Envío de dinero y remesas","en":"Money transfer & remittances"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-32', 'NEG-PRO', 32, '{"es":"Cambio de cheques","en":"Check cashing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-33', 'NEG-PRO', 33, '{"es":"Pago de servicios","en":"Bill payment services"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-34', 'NEG-PRO', 34, '{"es":"Asesor financiero","en":"Financial advisor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-35', 'NEG-PRO', 35, '{"es":"Reparación de crédito","en":"Credit repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-36', 'NEG-PRO', 36, '{"es":"Préstamos","en":"Loans & lending"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-37', 'NEG-PRO', 37, '{"es":"Broker hipotecario","en":"Mortgage broker"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-38', 'NEG-PRO', 38, '{"es":"Diseño web","en":"Web design"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-39', 'NEG-PRO', 39, '{"es":"Diseño gráfico y logotipos","en":"Graphic design & logo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-40', 'NEG-PRO', 40, '{"es":"Imprenta y rótulos","en":"Printing & signs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-41', 'NEG-PRO', 41, '{"es":"Bordado y serigrafía","en":"Embroidery & screen printing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-42', 'NEG-PRO', 42, '{"es":"Mercadeo y redes sociales","en":"Marketing & social media"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-43', 'NEG-PRO', 43, '{"es":"Fotografía comercial","en":"Commercial photography"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-44', 'NEG-PRO', 44, '{"es":"Producción de video","en":"Video production"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-45', 'NEG-PRO', 45, '{"es":"Desarrollo de software y apps","en":"Software & app development"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-46', 'NEG-PRO', 46, '{"es":"Soporte técnico","en":"IT support"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-47', 'NEG-PRO', 47, '{"es":"Reparación de computadoras","en":"Computer repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-48', 'NEG-PRO', 48, '{"es":"Reparación de celulares","en":"Phone & tablet repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-49', 'NEG-PRO', 49, '{"es":"Agencia de empleo","en":"Staffing & employment agency"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-50', 'NEG-PRO', 50, '{"es":"Recursos humanos y cumplimiento","en":"HR & compliance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-51', 'NEG-PRO', 51, '{"es":"Seguridad privada","en":"Security guard services"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-52', 'NEG-PRO', 52, '{"es":"Investigador privado","en":"Private investigator"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-53', 'NEG-PRO', 53, '{"es":"Mensajería","en":"Courier & document delivery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-54', 'NEG-PRO', 54, '{"es":"Despacho de camiones","en":"Truck dispatch"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-55', 'NEG-PRO', 55, '{"es":"Cumplimiento CDL y DOT","en":"CDL & DOT compliance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-56', 'NEG-PRO', 56, '{"es":"Arquitectura","en":"Architecture"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-57', 'NEG-PRO', 57, '{"es":"Ingeniería","en":"Engineering"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-58', 'NEG-PRO', 58, '{"es":"Topografía","en":"Surveying"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-59', 'NEG-PRO', 59, '{"es":"Diseño de interiores","en":"Interior design"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-PRO-60', 'NEG-PRO', 60, '{"es":"Oficiante de bodas y eventos","en":"Wedding & event officiant"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-TIENDA', 10, '{"es":"Tiendas","en":"Shops & Stores"}'::jsonb, '{"es":"Tiendas","en":"Shops"}'::jsonb, 'bag', '["F-RETAIL"]'::jsonb, '["shop","pedidos","svc","citas","renta","staff","eventos","nov","jobs"]'::jsonb, 'shop', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-01', 'NEG-TIENDA', 1, '{"es":"Ropa de mujer","en":"Women''s clothing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-02', 'NEG-TIENDA', 2, '{"es":"Ropa de hombre","en":"Men''s clothing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-03', 'NEG-TIENDA', 3, '{"es":"Ropa de niños","en":"Children''s clothing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-04', 'NEG-TIENDA', 4, '{"es":"Vestidos de quinceañera y novia","en":"Quinceañera & bridal dresses"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-05', 'NEG-TIENDA', 5, '{"es":"Ropa formal y trajes","en":"Formal wear & tuxedos"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-06', 'NEG-TIENDA', 6, '{"es":"Ropa vaquera, botas y sombreros","en":"Western wear – boots & hats"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-07', 'NEG-TIENDA', 7, '{"es":"Zapatería","en":"Shoes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-08', 'NEG-TIENDA', 8, '{"es":"Tenis y ropa urbana","en":"Sneakers & streetwear"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-09', 'NEG-TIENDA', 9, '{"es":"Uniformes y ropa de trabajo","en":"Uniforms & workwear"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-10', 'NEG-TIENDA', 10, '{"es":"Camisetas personalizadas","en":"Custom t-shirts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-11', 'NEG-TIENDA', 11, '{"es":"Sastrería y arreglos de ropa","en":"Tailor & alterations"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-12', 'NEG-TIENDA', 12, '{"es":"Tintorería","en":"Dry cleaning"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-13', 'NEG-TIENDA', 13, '{"es":"Lavandería","en":"Laundromat"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-14', 'NEG-TIENDA', 14, '{"es":"Joyería","en":"Jewelry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-15', 'NEG-TIENDA', 15, '{"es":"Reparación de relojes y joyas","en":"Watch & jewelry repair"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-16', 'NEG-TIENDA', 16, '{"es":"Accesorios y bolsos","en":"Accessories & bags"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-17', 'NEG-TIENDA', 17, '{"es":"Ropa de segunda","en":"Thrift & second hand"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-18', 'NEG-TIENDA', 18, '{"es":"Consignación","en":"Consignment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-19', 'NEG-TIENDA', 19, '{"es":"Casa de empeño","en":"Pawn shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-20', 'NEG-TIENDA', 20, '{"es":"Mueblería","en":"Furniture store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-21', 'NEG-TIENDA', 21, '{"es":"Colchones","en":"Mattresses"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-22', 'NEG-TIENDA', 22, '{"es":"Decoración del hogar","en":"Home décor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-23', 'NEG-TIENDA', 23, '{"es":"Artículos de cocina","en":"Kitchenware"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-24', 'NEG-TIENDA', 24, '{"es":"Electrodomésticos","en":"Appliances"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-25', 'NEG-TIENDA', 25, '{"es":"Electrónica","en":"Electronics"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-26', 'NEG-TIENDA', 26, '{"es":"Tienda de celulares y planes","en":"Cell phone store & plans"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-27', 'NEG-TIENDA', 27, '{"es":"Computadoras","en":"Computers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-28', 'NEG-TIENDA', 28, '{"es":"Videojuegos","en":"Video games"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-29', 'NEG-TIENDA', 29, '{"es":"Instrumentos musicales","en":"Musical instruments"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-30', 'NEG-TIENDA', 30, '{"es":"Artículos deportivos","en":"Sporting goods"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-31', 'NEG-TIENDA', 31, '{"es":"Bicicletería","en":"Bicycle shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-32', 'NEG-TIENDA', 32, '{"es":"Juguetería","en":"Toy store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-33', 'NEG-TIENDA', 33, '{"es":"Artículos para bebé","en":"Baby gear"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-34', 'NEG-TIENDA', 34, '{"es":"Tienda de regalos","en":"Gift shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-35', 'NEG-TIENDA', 35, '{"es":"Florería","en":"Flower shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-36', 'NEG-TIENDA', 36, '{"es":"Artículos de fiesta","en":"Party supplies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-37', 'NEG-TIENDA', 37, '{"es":"Artículos religiosos","en":"Religious goods"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-38', 'NEG-TIENDA', 38, '{"es":"Productos de belleza","en":"Beauty supply"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-39', 'NEG-TIENDA', 39, '{"es":"Ferretería","en":"Hardware store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-40', 'NEG-TIENDA', 40, '{"es":"Tienda de pinturas","en":"Paint store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-41', 'NEG-TIENDA', 41, '{"es":"Materiales de construcción","en":"Building materials"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-42', 'NEG-TIENDA', 42, '{"es":"Vivero y jardinería","en":"Garden center & nursery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-43', 'NEG-TIENDA', 43, '{"es":"Tienda de autopartes","en":"Auto parts store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-44', 'NEG-TIENDA', 44, '{"es":"Renta de herramienta","en":"Tool rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-45', 'NEG-TIENDA', 45, '{"es":"Tienda de mascotas","en":"Pet shop"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-46', 'NEG-TIENDA', 46, '{"es":"Estética canina","en":"Pet grooming"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-47', 'NEG-TIENDA', 47, '{"es":"Librería y papelería","en":"Book & stationery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-48', 'NEG-TIENDA', 48, '{"es":"Trofeos y grabados","en":"Trophies & engraving"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-49', 'NEG-TIENDA', 49, '{"es":"Telas y mercería","en":"Fabric & sewing supplies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-50', 'NEG-TIENDA', 50, '{"es":"Manualidades y material para piñatas","en":"Craft & piñata supplies"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-51', 'NEG-TIENDA', 51, '{"es":"Tienda en línea","en":"Online store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TIENDA-52', 'NEG-TIENDA', 52, '{"es":"Vendedor móvil","en":"Mobile & pop-up vendor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-TRANS', 11, '{"es":"Transporte","en":"Transportation"}'::jsonb, '{"es":"Transporte","en":"Rides"}'::jsonb, 'truck', '["F-TRANSPORTE"]'::jsonb, '["svc","citas","cot","renta","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-01', 'NEG-TRANS', 1, '{"es":"Viajes locales","en":"Local ride"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-02', 'NEG-TRANS', 2, '{"es":"Traslado al aeropuerto","en":"Airport transfer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-03', 'NEG-TRANS', 3, '{"es":"Camioneta de larga distancia","en":"Long-distance van"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-04', 'NEG-TRANS', 4, '{"es":"Shuttle entre ciudades","en":"Intercity shuttle"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-05', 'NEG-TRANS', 5, '{"es":"Viajes entre estados","en":"Cross-state trips"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-06', 'NEG-TRANS', 6, '{"es":"Transporte de empleados","en":"Employee shuttle"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-07', 'NEG-TRANS', 7, '{"es":"Transporte de trabajadores","en":"Farm & labor transport"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-08', 'NEG-TRANS', 8, '{"es":"Transporte escolar","en":"School & kids transport"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-09', 'NEG-TRANS', 9, '{"es":"Traslados médicos y de adultos mayores","en":"Senior & medical rides"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-10', 'NEG-TRANS', 10, '{"es":"Conductor designado","en":"Designated driver"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-11', 'NEG-TRANS', 11, '{"es":"Chofer privado","en":"Chauffeur service"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-12', 'NEG-TRANS', 12, '{"es":"Limosina y party bus","en":"Limo & party bus"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-13', 'NEG-TRANS', 13, '{"es":"Repartidor y mensajería","en":"Delivery courier"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-14', 'NEG-TRANS', 14, '{"es":"Mensajería el mismo día","en":"Same-day courier"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-15', 'NEG-TRANS', 15, '{"es":"Repartidor de comida","en":"Food delivery driver"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-16', 'NEG-TRANS', 16, '{"es":"Entrega de compras","en":"Grocery delivery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-17', 'NEG-TRANS', 17, '{"es":"Envíos a Latinoamérica","en":"Package to Latin America"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-18', 'NEG-TRANS', 18, '{"es":"Carga y flete","en":"Freight & cargo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-19', 'NEG-TRANS', 19, '{"es":"Camión de caja y hotshot","en":"Box truck & hotshot"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-20', 'NEG-TRANS', 20, '{"es":"Tráiler y transporte CDL","en":"Semi & CDL trucking"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-21', 'NEG-TRANS', 21, '{"es":"Traslado de maquinaria","en":"Equipment hauling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-22', 'NEG-TRANS', 22, '{"es":"Traslado de vehículos","en":"Vehicle shipping"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-23', 'NEG-TRANS', 23, '{"es":"Grúas","en":"Towing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-24', 'NEG-TRANS', 24, '{"es":"Camión de mudanza con chofer","en":"Moving trucks with driver"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-25', 'NEG-TRANS', 25, '{"es":"Renta de autos","en":"Car rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-26', 'NEG-TRANS', 26, '{"es":"Renta de camionetas","en":"Van & truck rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-27', 'NEG-TRANS', 27, '{"es":"Renta de remolques","en":"Trailer rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-28', 'NEG-TRANS', 28, '{"es":"Reparto en moto","en":"Motorcycle delivery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-29', 'NEG-TRANS', 29, '{"es":"Mensajería en bicicleta","en":"Bike courier"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-TRANS-30', 'NEG-TRANS', 30, '{"es":"Traslado de botes y casas rodantes","en":"Boat & RV transport"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-EDU', 12, '{"es":"Cursos y Educación","en":"Courses & Education"}'::jsonb, '{"es":"Cursos","en":"Courses"}'::jsonb, 'grid', '["F-EDUCACION"]'::jsonb, '["svc","citas","shop","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-01', 'NEG-EDU', 1, '{"es":"Clases de inglés","en":"English classes – ESL"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-02', 'NEG-EDU', 2, '{"es":"Clases de español","en":"Spanish classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-03', 'NEG-EDU', 3, '{"es":"Práctica de conversación en inglés","en":"Conversational English practice"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-04', 'NEG-EDU', 4, '{"es":"Preparación para ciudadanía","en":"Citizenship & civics prep"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-05', 'NEG-EDU', 5, '{"es":"GED y preparatoria abierta","en":"GED & high school equivalency"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-06', 'NEG-EDU', 6, '{"es":"Educación básica para adultos","en":"Adult basic education"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-07', 'NEG-EDU', 7, '{"es":"Tutoría de matemáticas","en":"Tutoring – math"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-08', 'NEG-EDU', 8, '{"es":"Tutoría de lectura y escritura","en":"Tutoring – reading & writing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-09', 'NEG-EDU', 9, '{"es":"Ayuda con tareas","en":"Homework help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-10', 'NEG-EDU', 10, '{"es":"Preparación SAT y ACT","en":"Test prep – SAT & ACT"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-11', 'NEG-EDU', 11, '{"es":"Asesoría universitaria y FAFSA","en":"College advising & FAFSA"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-12', 'NEG-EDU', 12, '{"es":"Ayuda con becas","en":"Scholarship help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-13', 'NEG-EDU', 13, '{"es":"Educación financiera","en":"Financial literacy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-14', 'NEG-EDU', 14, '{"es":"Computación básica","en":"Computer & digital skills"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-15', 'NEG-EDU', 15, '{"es":"Programas de oficina","en":"Office software"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-16', 'NEG-EDU', 16, '{"es":"Programación","en":"Coding & programming"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-17', 'NEG-EDU', 17, '{"es":"Curso de marketing digital","en":"Digital marketing course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-18', 'NEG-EDU', 18, '{"es":"Negocios y emprendimiento","en":"Business & entrepreneurship"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-19', 'NEG-EDU', 19, '{"es":"Curso de contabilidad","en":"Bookkeeping course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-20', 'NEG-EDU', 20, '{"es":"Escuela de oficios","en":"Trade school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-21', 'NEG-EDU', 21, '{"es":"Escuela de CDL","en":"CDL school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-22', 'NEG-EDU', 22, '{"es":"Escuela de manejo","en":"Driving school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-23', 'NEG-EDU', 23, '{"es":"Escuela de barbería","en":"Barber school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-24', 'NEG-EDU', 24, '{"es":"Escuela de cosmetología","en":"Cosmetology school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-25', 'NEG-EDU', 25, '{"es":"Curso de uñas","en":"Nail tech course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-26', 'NEG-EDU', 26, '{"es":"Curso de pestañas y cejas","en":"Lash & brow course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-27', 'NEG-EDU', 27, '{"es":"Curso de maquillaje","en":"Makeup course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-28', 'NEG-EDU', 28, '{"es":"Curso de soldadura","en":"Welding course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-29', 'NEG-EDU', 29, '{"es":"Certificación HVAC","en":"HVAC certification"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-30', 'NEG-EDU', 30, '{"es":"Capacitación en electricidad y plomería","en":"Electrical & plumbing training"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-31', 'NEG-EDU', 31, '{"es":"Seguridad en construcción OSHA","en":"Construction safety – OSHA"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-32', 'NEG-EDU', 32, '{"es":"Manejo de alimentos","en":"Food handler & ServSafe"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-33', 'NEG-EDU', 33, '{"es":"Primeros auxilios y CPR","en":"First aid & CPR"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-34', 'NEG-EDU', 34, '{"es":"Certificación de cuidador","en":"Home health aide certification"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-35', 'NEG-EDU', 35, '{"es":"Curso de asistente médico","en":"Medical assistant course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-36', 'NEG-EDU', 36, '{"es":"Curso de licencia inmobiliaria","en":"Real estate license course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-37', 'NEG-EDU', 37, '{"es":"Curso de licencia de seguros","en":"Insurance license course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-38', 'NEG-EDU', 38, '{"es":"Capacitación de notario","en":"Notary training"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-39', 'NEG-EDU', 39, '{"es":"Curso de preparador de impuestos","en":"Tax preparer course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-40', 'NEG-EDU', 40, '{"es":"Clases de música","en":"Music lessons"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-41', 'NEG-EDU', 41, '{"es":"Clases de salsa y bachata","en":"Dance classes – salsa & bachata"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-42', 'NEG-EDU', 42, '{"es":"Danza folclórica","en":"Folkloric dance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-43', 'NEG-EDU', 43, '{"es":"Clases de arte","en":"Art classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-44', 'NEG-EDU', 44, '{"es":"Clases de cocina","en":"Cooking classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-45', 'NEG-EDU', 45, '{"es":"Clases de costura","en":"Sewing classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-46', 'NEG-EDU', 46, '{"es":"Curso de fotografía","en":"Photography course"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-47', 'NEG-EDU', 47, '{"es":"Oratoria","en":"Public speaking"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-EDU-48', 'NEG-EDU', 48, '{"es":"Coaching personal y de carrera","en":"Personal & career coaching"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-NINOS', 13, '{"es":"Niños","en":"Children"}'::jsonb, '{"es":"Niños","en":"Kids"}'::jsonb, 'smile', '["F-NINOS"]'::jsonb, '["svc","citas","shop","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-01', 'NEG-NINOS', 1, '{"es":"Guardería","en":"Daycare center"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-02', 'NEG-NINOS', 2, '{"es":"Cuidado infantil en casa","en":"Home daycare"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-03', 'NEG-NINOS', 3, '{"es":"Preescolar","en":"Preschool"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-04', 'NEG-NINOS', 4, '{"es":"Programa Pre-K","en":"Pre-K program"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-05', 'NEG-NINOS', 5, '{"es":"Programas subsidiados","en":"Head Start & subsidized programs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-06', 'NEG-NINOS', 6, '{"es":"Niñera por horas","en":"Babysitter"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-07', 'NEG-NINOS', 7, '{"es":"Nana de tiempo completo","en":"Nanny"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-08', 'NEG-NINOS', 8, '{"es":"Cuidado de noche y fin de semana","en":"Overnight & weekend care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-09', 'NEG-NINOS', 9, '{"es":"Cuidado después de la escuela","en":"After-school care"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-10', 'NEG-NINOS', 10, '{"es":"Campamento de verano","en":"Summer camp"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-11', 'NEG-NINOS', 11, '{"es":"Campamento de invierno y primavera","en":"Winter & spring camp"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-12', 'NEG-NINOS', 12, '{"es":"Tutoría para niños","en":"Kids tutoring"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-13', 'NEG-NINOS', 13, '{"es":"Programas bilingües","en":"Bilingual learning programs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-14', 'NEG-NINOS', 14, '{"es":"Cortes de cabello para niños","en":"Kids haircuts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-15', 'NEG-NINOS', 15, '{"es":"Gimnasia para niños","en":"Kids gym & tumbling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-16', 'NEG-NINOS', 16, '{"es":"Fútbol infantil","en":"Kids soccer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-17', 'NEG-NINOS', 17, '{"es":"Béisbol infantil","en":"Kids baseball"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-18', 'NEG-NINOS', 18, '{"es":"Básquetbol infantil","en":"Kids basketball"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-19', 'NEG-NINOS', 19, '{"es":"Artes marciales para niños","en":"Kids martial arts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-20', 'NEG-NINOS', 20, '{"es":"Clases de natación","en":"Swim lessons"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-21', 'NEG-NINOS', 21, '{"es":"Baile para niños","en":"Kids dance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-22', 'NEG-NINOS', 22, '{"es":"Música para niños","en":"Kids music lessons"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-23', 'NEG-NINOS', 23, '{"es":"Arte para niños","en":"Kids art classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-24', 'NEG-NINOS', 24, '{"es":"Área de juegos techada","en":"Indoor playground"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-25', 'NEG-NINOS', 25, '{"es":"Parque de trampolines","en":"Trampoline park"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-26', 'NEG-NINOS', 26, '{"es":"Entretenimiento de fiestas infantiles","en":"Kids party entertainment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-27', 'NEG-NINOS', 27, '{"es":"Terapias infantiles","en":"Speech & occupational therapy for kids"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-28', 'NEG-NINOS', 28, '{"es":"Apoyo a necesidades especiales","en":"Special needs support"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-29', 'NEG-NINOS', 29, '{"es":"Clases para padres","en":"Parenting classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-30', 'NEG-NINOS', 30, '{"es":"Apoyo de lactancia y recién nacido","en":"Lactation & newborn support"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-31', 'NEG-NINOS', 31, '{"es":"Renta de artículos de bebé","en":"Baby gear rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-32', 'NEG-NINOS', 32, '{"es":"Fotografía infantil","en":"Kids photography"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-33', 'NEG-NINOS', 33, '{"es":"Ayuda con WIC y asistencia familiar","en":"WIC & family assistance help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-34', 'NEG-NINOS', 34, '{"es":"Ayuda con inscripción escolar","en":"School enrollment help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-NINOS-35', 'NEG-NINOS', 35, '{"es":"Recursos de acogida y adopción","en":"Foster & adoption resources"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-DEPORTE', 14, '{"es":"Vida Activa y Deporte","en":"Active Life & Sport"}'::jsonb, '{"es":"Deporte","en":"Sports"}'::jsonb, 'bolt', '["F-DEPORTE"]'::jsonb, '["svc","citas","shop","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-01', 'NEG-DEPORTE', 1, '{"es":"Gimnasio","en":"Gym"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-02', 'NEG-DEPORTE', 2, '{"es":"Gimnasio 24 horas","en":"24-hour gym"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-03', 'NEG-DEPORTE', 3, '{"es":"Entrenador personal","en":"Personal trainer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-04', 'NEG-DEPORTE', 4, '{"es":"Clases grupales","en":"Group fitness classes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-05', 'NEG-DEPORTE', 5, '{"es":"Zumba y baile fitness","en":"Zumba & dance fitness"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-06', 'NEG-DEPORTE', 6, '{"es":"Spinning","en":"Spinning & cycling studio"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-07', 'NEG-DEPORTE', 7, '{"es":"CrossFit","en":"CrossFit"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-08', 'NEG-DEPORTE', 8, '{"es":"Levantamiento de pesas","en":"Weightlifting & powerlifting"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-09', 'NEG-DEPORTE', 9, '{"es":"Gimnasio de boxeo","en":"Boxing gym"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-10', 'NEG-DEPORTE', 10, '{"es":"MMA & jiu-jitsu","en":"MMA & jiu-jitsu"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-11', 'NEG-DEPORTE', 11, '{"es":"Karate & taekwondo","en":"Karate & taekwondo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-12', 'NEG-DEPORTE', 12, '{"es":"Lucha","en":"Wrestling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-13', 'NEG-DEPORTE', 13, '{"es":"Yoga","en":"Yoga"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-14', 'NEG-DEPORTE', 14, '{"es":"Pilates","en":"Pilates"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-15', 'NEG-DEPORTE', 15, '{"es":"Estiramiento y movilidad","en":"Stretching & mobility"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-16', 'NEG-DEPORTE', 16, '{"es":"Nutrición deportiva","en":"Nutrition & body composition"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-17', 'NEG-DEPORTE', 17, '{"es":"Liga de fútbol","en":"Soccer league"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-18', 'NEG-DEPORTE', 18, '{"es":"Fútbol rápido","en":"Indoor soccer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-19', 'NEG-DEPORTE', 19, '{"es":"Renta de canchas","en":"Field & court rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-20', 'NEG-DEPORTE', 20, '{"es":"Liga de básquetbol","en":"Basketball league"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-21', 'NEG-DEPORTE', 21, '{"es":"Voleibol","en":"Volleyball"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-22', 'NEG-DEPORTE', 22, '{"es":"Liga de béisbol y softbol","en":"Baseball & softball league"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-23', 'NEG-DEPORTE', 23, '{"es":"Flag football","en":"Flag football"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-24', 'NEG-DEPORTE', 24, '{"es":"Boliche","en":"Bowling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-25', 'NEG-DEPORTE', 25, '{"es":"Golf","en":"Golf & driving range"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-26', 'NEG-DEPORTE', 26, '{"es":"Tenis y pickleball","en":"Tennis & pickleball"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-27', 'NEG-DEPORTE', 27, '{"es":"Alberca y clases","en":"Swimming pool & lessons"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-28', 'NEG-DEPORTE', 28, '{"es":"Club de corredores","en":"Running club"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-29', 'NEG-DEPORTE', 29, '{"es":"Club ciclista","en":"Cycling club"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-30', 'NEG-DEPORTE', 30, '{"es":"Senderismo y aire libre","en":"Hiking & outdoors"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-31', 'NEG-DEPORTE', 31, '{"es":"Pesca","en":"Fishing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-32', 'NEG-DEPORTE', 32, '{"es":"Cacería y campo de tiro","en":"Hunting & gun range"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-33', 'NEG-DEPORTE', 33, '{"es":"Paintball & airsoft","en":"Paintball & airsoft"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-34', 'NEG-DEPORTE', 34, '{"es":"Go-karts","en":"Go-karts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-35', 'NEG-DEPORTE', 35, '{"es":"Parque de patinetas","en":"Skate park"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-36', 'NEG-DEPORTE', 36, '{"es":"Patinaje sobre hielo","en":"Ice skating"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-37', 'NEG-DEPORTE', 37, '{"es":"Escalada","en":"Rock climbing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-38', 'NEG-DEPORTE', 38, '{"es":"Equitación","en":"Horseback riding"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-39', 'NEG-DEPORTE', 39, '{"es":"Charreada y rodeo","en":"Charrería & rodeo"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-40', 'NEG-DEPORTE', 40, '{"es":"Centro recreativo","en":"Recreation center"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-41', 'NEG-DEPORTE', 41, '{"es":"Entrenadores y árbitros","en":"Coaches & referees"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-42', 'NEG-DEPORTE', 42, '{"es":"Academia deportiva juvenil","en":"Youth sports academy"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEPORTE-43', 'NEG-DEPORTE', 43, '{"es":"Organizador de torneos","en":"Sports event organizer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-FE', 15, '{"es":"Iglesias y Religión","en":"Churches & Religion"}'::jsonb, '{"es":"Iglesias","en":"Churches"}'::jsonb, 'building', '["F-FE"]'::jsonb, '["svc","citas","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-01', 'NEG-FE', 1, '{"es":"Parroquia católica","en":"Catholic parish"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-02', 'NEG-FE', 2, '{"es":"Misa en español","en":"Mass in Spanish"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-03', 'NEG-FE', 3, '{"es":"Iglesia evangélica","en":"Evangelical church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-04', 'NEG-FE', 4, '{"es":"Iglesia pentecostal","en":"Pentecostal church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-05', 'NEG-FE', 5, '{"es":"Iglesia bautista","en":"Baptist church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-06', 'NEG-FE', 6, '{"es":"Iglesia metodista","en":"Methodist church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-07', 'NEG-FE', 7, '{"es":"Iglesia adventista","en":"Adventist church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-08', 'NEG-FE', 8, '{"es":"Iglesia no denominacional","en":"Non-denominational church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-09', 'NEG-FE', 9, '{"es":"Salón de los Testigos de Jehová","en":"Jehovah''s Witnesses hall"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-10', 'NEG-FE', 10, '{"es":"Capilla de los Santos","en":"LDS ward"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-11', 'NEG-FE', 11, '{"es":"Iglesia ortodoxa","en":"Orthodox church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-12', 'NEG-FE', 12, '{"es":"Mezquita","en":"Mosque"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-13', 'NEG-FE', 13, '{"es":"Sinagoga","en":"Synagogue"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-14', 'NEG-FE', 14, '{"es":"Ministerio cristiano","en":"Christian ministry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-15', 'NEG-FE', 15, '{"es":"Ministerio juvenil","en":"Youth ministry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-16', 'NEG-FE', 16, '{"es":"Ministerio de damas","en":"Women''s ministry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-17', 'NEG-FE', 17, '{"es":"Ministerio de varones","en":"Men''s ministry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-18', 'NEG-FE', 18, '{"es":"Alabanza y coro","en":"Worship & choir"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-19', 'NEG-FE', 19, '{"es":"Estudio bíblico y células","en":"Bible study & cell groups"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-20', 'NEG-FE', 20, '{"es":"Escuela dominical","en":"Sunday school"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-21', 'NEG-FE', 21, '{"es":"Catecismo y preparación de sacramentos","en":"Catechism & sacrament prep"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-22', 'NEG-FE', 22, '{"es":"Bautizos","en":"Baptism"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-23', 'NEG-FE', 23, '{"es":"Primera comunión y confirmación","en":"First communion & confirmation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-24', 'NEG-FE', 24, '{"es":"Misa de quinceañera","en":"Quinceañera mass"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-25', 'NEG-FE', 25, '{"es":"Bodas religiosas","en":"Religious weddings"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-26', 'NEG-FE', 26, '{"es":"Consejería matrimonial y familiar","en":"Marriage & family counseling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-27', 'NEG-FE', 27, '{"es":"Consejería cristiana","en":"Christian counseling"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-28', 'NEG-FE', 28, '{"es":"Ministerio de recuperación","en":"Addiction recovery ministry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-29', 'NEG-FE', 29, '{"es":"Servicios funerarios","en":"Funeral services"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-30', 'NEG-FE', 30, '{"es":"Funeraria","en":"Funeral home"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-31', 'NEG-FE', 31, '{"es":"Cremación","en":"Cremation"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-32', 'NEG-FE', 32, '{"es":"Repatriación de restos","en":"Repatriation of remains"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-33', 'NEG-FE', 33, '{"es":"Servicio memorial y novenario","en":"Memorial & novenario"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-34', 'NEG-FE', 34, '{"es":"Capellanía","en":"Hospital & prison chaplain"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-35', 'NEG-FE', 35, '{"es":"Línea de oración","en":"Prayer line & support"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-36', 'NEG-FE', 36, '{"es":"Despensa de alimentos","en":"Food pantry"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-37', 'NEG-FE', 37, '{"es":"Donación de ropa","en":"Clothing donations"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-38', 'NEG-FE', 38, '{"es":"Refugio y ayuda de emergencia","en":"Shelter & emergency aid"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-39', 'NEG-FE', 39, '{"es":"Ayuda migratoria de la iglesia","en":"Immigration help through church"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-40', 'NEG-FE', 40, '{"es":"Labor comunitaria y misiones","en":"Community outreach & missions"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-41', 'NEG-FE', 41, '{"es":"Oportunidades de voluntariado","en":"Volunteer opportunities"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-42', 'NEG-FE', 42, '{"es":"Tienda de artículos religiosos","en":"Religious goods store"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-FE-43', 'NEG-FE', 43, '{"es":"Tradiciones espirituales y botánica","en":"Spiritual traditions & botánica"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-INMUEBLE', 16, '{"es":"Bienes Raíces","en":"Real Estate"}'::jsonb, '{"es":"Casas","en":"Homes"}'::jsonb, 'key', '["F-INMUEBLE"]'::jsonb, '["svc","citas","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-01', 'NEG-INMUEBLE', 1, '{"es":"Agente inmobiliario","en":"Real estate agent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-02', 'NEG-INMUEBLE', 2, '{"es":"Agente bilingüe","en":"Bilingual realtor"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-03', 'NEG-INMUEBLE', 3, '{"es":"Agente del comprador","en":"Buyer''s agent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-04', 'NEG-INMUEBLE', 4, '{"es":"Agente del vendedor","en":"Seller''s agent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-05', 'NEG-INMUEBLE', 5, '{"es":"Casas en venta","en":"Homes for sale"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-06', 'NEG-INMUEBLE', 6, '{"es":"Condominios y townhouses","en":"Condos & townhomes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-07', 'NEG-INMUEBLE', 7, '{"es":"Obra nueva","en":"New construction"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-08', 'NEG-INMUEBLE', 8, '{"es":"Multifamiliar e inversión","en":"Multi-family & investment"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-09', 'NEG-INMUEBLE', 9, '{"es":"Terrenos","en":"Land & lots"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-10', 'NEG-INMUEBLE', 10, '{"es":"Propiedad rural","en":"Farm & rural property"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-11', 'NEG-INMUEBLE', 11, '{"es":"Casas móviles","en":"Mobile & manufactured homes"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-12', 'NEG-INMUEBLE', 12, '{"es":"Parques de casas móviles","en":"Mobile home parks"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-13', 'NEG-INMUEBLE', 13, '{"es":"Propiedad comercial en venta","en":"Commercial property for sale"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-14', 'NEG-INMUEBLE', 14, '{"es":"Apartamentos en renta","en":"Apartments for rent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-15', 'NEG-INMUEBLE', 15, '{"es":"Casas en renta","en":"Houses for rent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-16', 'NEG-INMUEBLE', 16, '{"es":"Cuartos en renta","en":"Rooms for rent"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-17', 'NEG-INMUEBLE', 17, '{"es":"Vivienda compartida","en":"Shared housing & roommates"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-18', 'NEG-INMUEBLE', 18, '{"es":"Renta corta y amueblada","en":"Short-term & furnished rentals"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-19', 'NEG-INMUEBLE', 19, '{"es":"Section 8 y vivienda accesible","en":"Section 8 & affordable housing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-20', 'NEG-INMUEBLE', 20, '{"es":"Vivienda para adultos mayores","en":"Senior housing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-21', 'NEG-INMUEBLE', 21, '{"es":"Programas para primer comprador","en":"First-time buyer programs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-22', 'NEG-INMUEBLE', 22, '{"es":"Hipoteca con ITIN o sin crédito","en":"ITIN & no-credit mortgage"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-23', 'NEG-INMUEBLE', 23, '{"es":"Precalificación hipotecaria","en":"Mortgage pre-approval"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-24', 'NEG-INMUEBLE', 24, '{"es":"Ayuda con el enganche","en":"Down payment assistance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-25', 'NEG-INMUEBLE', 25, '{"es":"Avalúo","en":"Home appraisal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-26', 'NEG-INMUEBLE', 26, '{"es":"Inspección de vivienda","en":"Home inspection"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-27', 'NEG-INMUEBLE', 27, '{"es":"Título y cierre","en":"Title & escrow"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-28', 'NEG-INMUEBLE', 28, '{"es":"Administración de propiedades","en":"Property management"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-29', 'NEG-INMUEBLE', 29, '{"es":"Servicios para propietarios","en":"Landlord services"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-30', 'NEG-INMUEBLE', 30, '{"es":"Ayuda y derechos del inquilino","en":"Tenant help & rights"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-31', 'NEG-INMUEBLE', 31, '{"es":"Ayuda con desalojo","en":"Eviction help"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-32', 'NEG-INMUEBLE', 32, '{"es":"Renta con opción a compra","en":"Rent-to-own"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-33', 'NEG-INMUEBLE', 33, '{"es":"Compradores en efectivo","en":"Cash home buyers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-34', 'NEG-INMUEBLE', 34, '{"es":"Ejecución hipotecaria y venta corta","en":"Foreclosure & short sale"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-35', 'NEG-INMUEBLE', 35, '{"es":"Servicios de HOA","en":"HOA services"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-36', 'NEG-INMUEBLE', 36, '{"es":"Fotografía inmobiliaria","en":"Real estate photography"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-37', 'NEG-INMUEBLE', 37, '{"es":"Ambientación para venta","en":"Staging"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-38', 'NEG-INMUEBLE', 38, '{"es":"Oficinas","en":"Office space"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-39', 'NEG-INMUEBLE', 39, '{"es":"Local comercial","en":"Retail space & storefront"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-40', 'NEG-INMUEBLE', 40, '{"es":"Bodega industrial","en":"Warehouse & industrial"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-41', 'NEG-INMUEBLE', 41, '{"es":"Renta de cocina comercial","en":"Commercial kitchen rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-42', 'NEG-INMUEBLE', 42, '{"es":"Renta de espacio para eventos","en":"Event space rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-43', 'NEG-INMUEBLE', 43, '{"es":"Bodegas de almacenamiento","en":"Storage units"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-44', 'NEG-INMUEBLE', 44, '{"es":"Renta de estacionamiento","en":"Parking & lot rental"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-INMUEBLE-45', 'NEG-INMUEBLE', 45, '{"es":"Grupo de inversión inmobiliaria","en":"Real estate investing group"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into categories (id, sort, name, short, icon, filter_families, allowed_modules, main_module, short_provisional)
values ('NEG-DEALER', 17, '{"es":"Venta de Autos","en":"Car Dealers"}'::jsonb, '{"es":"Autos","en":"Cars"}'::jsonb, 'car', '["F-VEHICULO"]'::jsonb, '["svc","citas","cot","staff","eventos","nov","jobs"]'::jsonb, 'svc', true)
on conflict (id) do update set sort = excluded.sort, name = excluded.name, icon = excluded.icon,
  filter_families = excluded.filter_families, allowed_modules = excluded.allowed_modules, main_module = excluded.main_module;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-01', 'NEG-DEALER', 1, '{"es":"Agencia de autos nuevos","en":"New car dealer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-02', 'NEG-DEALER', 2, '{"es":"Lote de autos usados","en":"Used car dealer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-03', 'NEG-DEALER', 3, '{"es":"Lote independiente","en":"Independent lot"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-04', 'NEG-DEALER', 4, '{"es":"Compre aquí pague aquí","en":"Buy here pay here"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-05', 'NEG-DEALER', 5, '{"es":"Sin crédito","en":"No credit needed"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-06', 'NEG-DEALER', 6, '{"es":"Financiamiento con ITIN","en":"ITIN financing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-07', 'NEG-DEALER', 7, '{"es":"Financiamiento para primer comprador","en":"First-time buyer financing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-08', 'NEG-DEALER', 8, '{"es":"Certificados usados","en":"Certified pre-owned"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-09', 'NEG-DEALER', 9, '{"es":"Autos de lujo","en":"Luxury & exotic"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-10', 'NEG-DEALER', 10, '{"es":"Camionetas y pickups","en":"Trucks & pickups"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-11', 'NEG-DEALER', 11, '{"es":"SUVs","en":"SUVs"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-12', 'NEG-DEALER', 12, '{"es":"Vans y minivans","en":"Vans & minivans"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-13', 'NEG-DEALER', 13, '{"es":"Vehículos de trabajo","en":"Work & commercial vehicles"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-14', 'NEG-DEALER', 14, '{"es":"Venta a flotas","en":"Fleet sales"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-15', 'NEG-DEALER', 15, '{"es":"Camiones de caja","en":"Box trucks"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-16', 'NEG-DEALER', 16, '{"es":"Tráileres","en":"Semi trucks"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-17', 'NEG-DEALER', 17, '{"es":"Remolques","en":"Trailers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-18', 'NEG-DEALER', 18, '{"es":"Motocicletas","en":"Motorcycles"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-19', 'NEG-DEALER', 19, '{"es":"Cuatrimotos","en":"ATV & UTV"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-20', 'NEG-DEALER', 20, '{"es":"Scooters","en":"Scooters & mopeds"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-21', 'NEG-DEALER', 21, '{"es":"Botes y motos acuáticas","en":"Boats & jet skis"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-22', 'NEG-DEALER', 22, '{"es":"Casas rodantes","en":"RV & campers"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-23', 'NEG-DEALER', 23, '{"es":"Carritos de golf","en":"Golf carts"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-24', 'NEG-DEALER', 24, '{"es":"Clásicos y proyectos","en":"Classic & project cars"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-25', 'NEG-DEALER', 25, '{"es":"Título salvage y reconstruido","en":"Salvage & rebuilt title"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-26', 'NEG-DEALER', 26, '{"es":"Subasta de autos","en":"Auto auction"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-27', 'NEG-DEALER', 27, '{"es":"Distribuidor mayorista","en":"Wholesale dealer"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-28', 'NEG-DEALER', 28, '{"es":"Broker y buscador de autos","en":"Car broker & finder"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-29', 'NEG-DEALER', 29, '{"es":"Venta en consignación","en":"Consignment sales"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-30', 'NEG-DEALER', 30, '{"es":"Cambio y avalúo","en":"Trade-in & appraisal"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-31', 'NEG-DEALER', 31, '{"es":"Compra de autos en efectivo","en":"Cash for cars"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-32', 'NEG-DEALER', 32, '{"es":"Venta por dueño","en":"Private seller listings"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-33', 'NEG-DEALER', 33, '{"es":"Financiamiento del dealer","en":"Dealer financing"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-34', 'NEG-DEALER', 34, '{"es":"Garantía extendida","en":"Extended warranty"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-35', 'NEG-DEALER', 35, '{"es":"Seguro y GAP","en":"GAP & dealer insurance"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-36', 'NEG-DEALER', 36, '{"es":"Placas, título y registro","en":"Tag, title & registration"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-37', 'NEG-DEALER', 37, '{"es":"Taller del dealer","en":"Dealer service department"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-38', 'NEG-DEALER', 38, '{"es":"Prueba y entrega a domicilio","en":"Home test drive & delivery"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
insert into subcategories (id, category_id, sort, name) values ('NEG-DEALER-39', 'NEG-DEALER', 39, '{"es":"Exportación y envío de vehículos","en":"Export & vehicle shipping"}'::jsonb)
on conflict (id) do update set sort = excluded.sort, name = excluded.name;
commit;
