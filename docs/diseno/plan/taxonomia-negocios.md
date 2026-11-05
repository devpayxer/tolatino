# To' Latino — Módulo 2: Negocios
## Taxonomía de categorías, subcategorías y filtros

Documento de referencia. Es la **fuente de verdad del catálogo**: ninguna
pantalla puede inventar categorías fuera de aquí. 17 categorías principales
declaradas por el usuario; las subcategorías son propuesta completa a validar.

Notación: `English / Español` (la interfaz es bilingüe, todo rótulo es traducible).

Convención de código: `NEG-<CAT>-<NN>` (ej. `NEG-AUTO-03`).

---

## Arquitectura de la búsqueda (patrón canónico)

Pantalla de búsqueda del módulo Negocios:
1. **Categorías principales** (17) en grid.
2. **Subcategorías** de la categoría elegida.
3. **Filtros dependientes del tipo de negocio** (no todos los filtros existen
   en todas las categorías: comida trae delivery/pickup, barbería trae cita /
   a domicilio, etc.).

### Filtros globales (presentes en toda categoría)
- Ciudad / zona (City Based) y radio en millas
- Abierto ahora / horario
- Verificado por To' Latino
- Calificación mínima (estrellas)
- Rango de precio
- Idioma de atención (español / inglés / ambos)
- Acepta pago en línea vs solo contacto
- Con local vs a domicilio / móvil
- Con fotos reales
- Nuevo en la plataforma
- Ordenar por: relevancia, cercanía, mejor calificado, más reseñas, más nuevo

### Familias de filtros (se asignan por categoría)
- **F-COMIDA**: delivery, pickup, dine-in, catering, menú del día, tipo de
  cocina, país de la cocina, vegetariano/vegano, halal, sin gluten, desayuno /
  almuerzo / cena, pedido anticipado, mínimo de orden, zona de entrega, propina
  incluida, abierto de noche, fin de semana solamente.
- **F-CITA** (servicios con agenda: belleza, salud, autos, clases): acepta
  citas, walk-in, a domicilio, en local, disponibilidad hoy / esta semana,
  duración del servicio, atiende hombres / mujeres / niños, unisex, primera
  cita gratis, emergencia 24/7.
- **F-OBRA** (servicios de casa y oficios): presupuesto gratis, cobra por hora
  o por trabajo, licencia, seguro, garantía del trabajo, emergencia 24/7,
  años de experiencia, trabaja fines de semana, zona de servicio en millas,
  tamaño del trabajo (pequeño / mediano / grande).
- **F-RETAIL** (tiendas y mercados): pickup en tienda, envío, pago en efectivo,
  EBT / SNAP, layaway / apartado, mayoreo, marcas o países de producto,
  estacionamiento, abierto domingos.
- **F-INMUEBLE**: comprar / rentar / cuarto, precio, recámaras, baños, pies
  cuadrados, amueblado, mascotas, utilidades incluidas, Section 8, sin crédito,
  ITIN, disponible desde, depósito, estacionamiento, lavandería.
- **F-VEHICULO**: marca, modelo, año, precio, millaje, transmisión,
  combustible, tracción, título limpio / salvage, financiamiento sin crédito,
  acepta ITIN, enganche, garantía, acepta trade-in.
- **F-EVENTO** (fiestas): tipo de evento, fecha disponible, capacidad de
  invitados, paquetes, incluye montaje, incluye traslado, depósito, tiempo de
  reserva mínimo, precio por hora / por paquete.
- **F-SALUD**: acepta seguro, acepta Medicaid / Medicare, sin seguro / precio
  fijo, escala según ingreso, sin papeles / sin ID, telemedicina, personal
  bilingüe, mismo día, especialidad, atiende niños.
- **F-EDUCACION**: presencial / en línea / híbrido, horario (mañana, tarde,
  noche, fin de semana), duración, certificación oficial, en español, precio
  por curso o por mes, plan de pagos, para principiantes.
- **F-DEPORTE**: tipo de actividad, nivel, individual / grupal / liga, edad,
  membresía o pago por visita, guardería en el sitio, techado / al aire libre.
- **F-FE**: misa o servicio en español, denominación, horario de servicios,
  para jóvenes, ayuda comunitaria (despensa, ropa, refugio), transporte,
  servicios de bodas / bautizos / funerales.
- **F-NOCHE**: música (salsa, bachata, banda, reggaetón, mixto), edad mínima,
  cover, mesas / reservación, terraza, karaoke, deportes en pantalla, hora de
  cierre, código de vestimenta.
- **F-PRO** (servicios profesionales): consulta gratis, atiende en español,
  precio fijo o por hora, remoto / presencial, urgencia, licencia / colegiado,
  plan de pagos.
- **F-TRANSPORTE**: tipo de servicio, capacidad, distancia (local / larga),
  precio por viaje o por milla, disponible hoy, 24/7, asiento de niño,
  equipaje, carga pesada, cruza estados.
- **F-NINOS**: edad atendida, licencia estatal, horario extendido, acepta
  subsidio / voucher, comidas incluidas, transporte, en español, cupos
  disponibles.

---

## 1 — Auto Services / Servicios de Auto  `NEG-AUTO`
Filtros: F-CITA + F-OBRA

1. Mechanic – general repair / Mecánico general
2. Mobile mechanic / Mecánico a domicilio
3. Oil change & lube / Cambio de aceite
4. Diagnostics & check engine / Diagnóstico y escáner
5. Brakes / Frenos
6. Suspension & alignment / Suspensión y alineación
7. Transmission / Transmisión
8. Engine repair & rebuild / Motor y reconstrucción
9. Electrical & wiring / Eléctrico automotriz
10. AC & heating / Aire acondicionado y calefacción
11. Radiator & cooling / Radiadores
12. Exhaust & mufflers / Escape y mofles
13. Tires & wheels / Llantas y rines
14. Rim repair / Reparación de rines
15. Batteries & jumpstart / Baterías y paso de corriente
16. Body shop & collision / Hojalatería y choques
17. Paint & touch-up / Pintura automotriz
18. Dent removal / Reparación de golpes sin pintura
19. Auto glass & windshield / Cristales y parabrisas
20. Window tinting / Papel ahumado
21. Wraps & vinyl / Vinilos y rotulado
22. Detailing & ceramic coating / Detallado y cerámico
23. Car wash / Lavado de autos
24. Mobile car wash / Lavado a domicilio
25. Upholstery & interiors / Tapicería automotriz
26. Audio, alarms & accessories / Audio, alarmas y accesorios
27. Performance & tuning / Preparación y tuning
28. Lift kits & off-road / Levantamiento y off-road
29. Diesel & heavy truck repair / Diésel y camión pesado
30. Fleet maintenance / Mantenimiento de flotas
31. Motorcycle & ATV repair / Motos y cuatrimotos
32. RV & trailer repair / Casas rodantes y tráileres
33. Auto locksmith & keys / Cerrajero y llaves de auto
34. Towing / Grúas
35. Roadside assistance / Auxilio en carretera
36. State inspection & emissions / Inspección estatal y emisiones
37. Auto parts / Repuestos y autopartes
38. Salvage yard / Yonke / deshuesadero
39. Auto transport / Traslado de vehículos
40. Pre-purchase inspection / Revisión antes de comprar

## 2 — Beauty and Health / Belleza y Salud  `NEG-BELL`
Filtros: F-CITA

1. Barbershop / Barbería
2. Mobile barber / Barbero a domicilio
3. Kids haircuts / Cortes para niños
4. Beard & grooming / Barba y arreglo masculino
5. Hair salon / Salón de belleza
6. Hair coloring & highlights / Tinte y mechas
7. Braids & extensions / Trenzas y extensiones
8. Keratin & blowouts / Keratina y alisados
9. Curly hair specialist / Especialista en rizos
10. Hair loss treatment / Tratamiento de caída de cabello
11. Wigs & hairpieces / Pelucas
12. Bridal & quinceañera styling / Peinado de novia y quinceañera
13. Makeup artist / Maquillista
14. Nails – manicure & pedicure / Uñas, manicura y pedicura
15. Acrylics & gel / Acrílico y gel
16. Nail art / Diseño de uñas
17. Eyelash extensions / Extensiones de pestañas
18. Lash lift / Lifting de pestañas
19. Eyebrows & microblading / Cejas y microblading
20. Threading / Hilo
21. Waxing / Depilación con cera
22. Laser hair removal / Depilación láser
23. Facials & esthetician / Faciales y estética
24. Acne & skin treatment / Tratamiento de acné y piel
25. Massage therapy / Masajes
26. Relaxing & couples massage / Masaje relajante y en pareja
27. Sports & deep tissue / Masaje deportivo y profundo
28. Lymphatic & post-op massage / Drenaje linfático y post-operatorio
29. Spa & sauna / Spa y sauna
30. Body contouring / Moldeamiento corporal
31. Cosmetic teeth whitening / Blanqueamiento dental cosmético
32. Tattoo / Tatuajes
33. Tattoo removal / Borrado de tatuajes
34. Piercing / Perforaciones
35. Permanent makeup / Maquillaje permanente
36. Nutrition & weight coaching / Nutrición y control de peso
37. Vitamins & supplements / Vitaminas y suplementos
38. Natural & herbal products / Productos naturales y herbales
39. Beauty supply store / Tienda de productos de belleza
40. Mobile beauty service / Belleza a domicilio

## 3 — Food and Drinks / Comida y Bebidas  `NEG-FOOD`
Filtros: F-COMIDA

1. Homemade food / Comida casera (el chambero que cocina)
2. Weekend-only cook / Cocina de fin de semana
3. Meal prep / Comida preparada por semana
4. Personal chef / Chef privado
5. Catering / Catering y banquetes
6. Food truck / Camión de comida
7. Street vendor / Vendedor ambulante
8. Delivery-only kitchen / Cocina solo para entrega
9. Mexican / Mexicana
10. Dominican / Dominicana
11. Puerto Rican / Puertorriqueña
12. Cuban / Cubana
13. Colombian / Colombiana
14. Venezuelan / Venezolana
15. Peruvian / Peruana
16. Ecuadorian / Ecuatoriana
17. Salvadoran / Salvadoreña
18. Guatemalan / Guatemalteca
19. Honduran / Hondureña
20. Argentinian / Argentina
21. Brazilian / Brasileña
22. Spanish / Española
23. Latin fusion / Fusión latina
24. American & diner / Americana
25. Chinese & Asian / China y asiática
26. Italian & pizza / Italiana y pizza
27. Taquería / Tacos
28. Pupusería / Pupusas
29. Arepas
30. Empanadas
31. Tamales
32. Seafood / Mariscos
33. Grill & steakhouse / Parrilla y carnes
34. BBQ & asados
35. Rotisserie chicken / Pollo asado
36. Fried chicken & wings / Pollo frito y alitas
37. Sandwiches & tortas
38. Burgers / Hamburguesas
39. Breakfast / Desayunos
40. Buffet
41. Vegetarian & vegan / Vegetariana y vegana
42. Bakery / Panadería
43. Cakes & pastry / Repostería y pasteles
44. Cake decorator / Decoración de pasteles
45. Desserts / Postres
46. Ice cream & paletas / Heladería y paletería
47. Snacks & candy / Antojitos y dulces
48. Juices & smoothies / Jugos y batidos
49. Coffee shop / Cafetería
50. Bubble tea & specialty drinks / Bebidas especiales
51. Aguas frescas & raspados
52. Bartender & mobile bar / Bartender y barra móvil
53. Ice & bottled water / Hielo y agua

**Secciones en la página de categoría (patrón 2h · 11b, solo presentación; la lista de arriba no cambia):**
- Por país (con bandera, orden por comunidad en Hazleton): Dominicana, Puertorriqueña, Mexicana, Colombiana, Salvadoreña, Guatemalteca, Hondureña, Venezolana, Peruana, Ecuatoriana, Cubana, Argentina, Brasileña, Española, Fusión latina.
- Platos: Pollo asado, Tacos, Empanadas, Pupusas, Arepas, Tamales, Mariscos, Parrilla y carnes, BBQ y asados, Pollo frito y alitas, Sandwiches y tortas, Hamburguesas, Italiana y pizza, China y asiática, Americana, Desayunos, Buffet, Vegetariana y vegana.
- Pan y dulces: Panadería, Repostería y pasteles, Postres, Heladería y paletería, Antojitos y dulces, Decoración de pasteles.
- Bebidas: Cafetería, Jugos y batidos, Aguas frescas y raspados, Bebidas especiales, Bartender y barra móvil, Hielo y agua.
- Casera, calle y encargo: Comida casera, Cocina de fin de semana, Catering, Camión de comida, Vendedor ambulante, Comida preparada por semana, Chef privado, Cocina solo para entrega.

## 4 — Home Services / Servicios del Hogar  `NEG-HOGAR`
Filtros: F-OBRA

1. Handyman / Multiservicios
2. Plumbing / Plomería
3. Drain & sewer / Destape de drenajes
4. Water heater / Calentadores de agua
5. Electrician / Electricista
6. HVAC – AC & heating / Aire acondicionado y calefacción
7. Boiler & furnace / Calderas y hornos
8. Appliance repair / Reparación de electrodomésticos
9. Carpentry / Carpintería
10. Cabinets & countertops / Gabinetes y cubiertas
11. Flooring – tile / Pisos de cerámica
12. Flooring – wood & vinyl / Pisos de madera y vinil
13. Carpet install & cleaning / Alfombra: instalación y limpieza
14. Interior painting / Pintura interior
15. Exterior painting / Pintura exterior
16. Drywall & plaster / Tablaroca y yeso
17. Masonry & concrete / Albañilería y concreto
18. Framing & structural / Estructura y armazón
19. Full remodeling / Remodelación completa
20. Kitchen remodel / Remodelación de cocina
21. Bathroom remodel / Remodelación de baño
22. Basement finishing / Terminado de sótano
23. Roofing / Techos
24. Gutters / Canaletas
25. Siding / Recubrimiento exterior
26. Windows & doors / Ventanas y puertas
27. Insulation / Aislamiento
28. Foundation & waterproofing / Cimientos e impermeabilización
29. Chimney service / Chimeneas
30. Welding & metal work / Soldadura y herrería
31. Fencing / Cercas
32. Decks & patios / Terrazas y patios
33. Concrete driveways / Entradas de concreto
34. Landscaping / Jardinería y paisajismo
35. Lawn care & mowing / Corte de césped
36. Tree service / Poda y remoción de árboles
37. Snow removal / Remoción de nieve
38. Sprinklers & irrigation / Riego
39. Pools & spas / Piscinas y jacuzzis
40. Pest control / Control de plagas
41. House cleaning / Limpieza de casas
42. Deep & move-out cleaning / Limpieza profunda y de salida
43. Commercial cleaning / Limpieza comercial
44. Window cleaning / Limpieza de ventanas
45. Pressure washing / Lavado a presión
46. Junk removal / Retiro de escombros y basura
47. Moving / Mudanzas
48. Packing service / Servicio de empaque
49. Furniture assembly / Armado de muebles
50. Upholstery & furniture repair / Tapicería y reparación de muebles
51. Garage doors / Puertas de garaje
52. Locksmith / Cerrajero
53. Security cameras & alarms / Cámaras y alarmas
54. TV mounting & smart home / Instalación de TV y casa inteligente
55. Internet & satellite install / Instalación de internet y satélite
56. Solar panels / Paneles solares
57. Generators / Generadores
58. Home inspection prep & repairs / Reparaciones para inspección

## 5 — Night Life / Vida Nocturna  `NEG-NOCHE`
Filtros: F-NOCHE

1. Bar
2. Sports bar / Bar deportivo
3. Cantina
4. Lounge
5. Nightclub / Discoteca
6. Latin dance club / Club de salsa y bachata
7. Banda & norteño night / Noche de banda y norteño
8. Reggaetón & urbano night / Noche urbana
9. Live music venue / Local de música en vivo
10. Concert venue / Sala de conciertos
11. Karaoke
12. Hookah lounge / Salón de hookah
13. Billiards & pool hall / Billar
14. Darts & games bar / Bar de juegos
15. Brewery & taproom / Cervecería
16. Wine bar / Bar de vinos
17. Cocktail bar / Coctelería
18. Rooftop & terrace / Terraza
19. Comedy & show / Comedia y espectáculos
20. Ladies night & themed nights / Noches temáticas
21. After-hours
22. Event promoter / Promotor de eventos nocturnos
23. Nightclub DJ / DJ de discoteca
24. Bottle service & VIP tables / Servicio VIP
25. Private party venue / Local para fiestas privadas

## 6 — Markets and Bodegas / Mercados y Bodegas  `NEG-MERC`
Filtros: F-RETAIL

1. Bodega / corner store / Bodega de la esquina
2. Latin supermarket / Supermercado latino
3. Grocery store / Abarrotes
4. Butcher shop / Carnicería
5. Fish market / Pescadería
6. Produce market / Frutas y verduras
7. Tortillería
8. Deli & prepared foods / Delicatessen y comida lista
9. Frozen foods / Congelados
10. Cheese & dairy / Quesos y lácteos
11. Spices & dried goods / Especias y granos
12. Mexican products / Productos mexicanos
13. Dominican products / Productos dominicanos
14. Central American products / Productos centroamericanos
15. South American products / Productos sudamericanos
16. Caribbean products / Productos del Caribe
17. Wholesale & mayoreo / Mayorista
18. Farmers market / Mercado de agricultores
19. Convenience store / Tienda de conveniencia
20. Dollar & discount store / Tienda de a dólar
21. Liquor store / Licorería
22. Beer & wine / Cerveza y vino
23. Smoke shop / Tabaquería
24. Vape shop
25. Botánica & herbs / Botánica y hierbas
26. Water & ice / Agua e hielo
27. Pet food / Alimento para mascotas
28. Bakery counter inside market / Panadería dentro del mercado
29. Money services inside bodega / Servicios de dinero en bodega
30. Home delivery from market / Entrega a domicilio del mercado

## 7 — Party and Celebrations / Fiestas y Celebraciones  `NEG-FIESTA`
Filtros: F-EVENTO

1. Event planner / Organizador de eventos
2. Quinceañera planner / Organizador de quinceañeras
3. Wedding planner / Organizador de bodas
4. Baby shower planner / Organizador de baby shower
5. Birthday parties / Fiestas de cumpleaños
6. Corporate events / Eventos corporativos
7. Party venue / Salón de fiestas
8. Backyard & outdoor setup / Montaje en patio
9. Party rentals / Renta de artículos para fiesta
10. Tables & chairs rental / Renta de mesas y sillas
11. Tents & canopies / Renta de carpas
12. Linens & covers / Mantelería
13. Décor & centerpieces / Decoración y centros de mesa
14. Balloon décor / Decoración con globos
15. Backdrops & arches / Fondos y arcos
16. Lighting & sound / Iluminación y sonido
17. Stage & dance floor / Escenario y pista
18. Bounce house & inflatables / Brincolines e inflables
19. Games & carnival rentals / Juegos y renta de feria
20. Piñatas
21. Candy table / Mesa de dulces
22. Chocolate fountain / Fuente de chocolate
23. Cake & desserts for events / Pastel y postres de evento
24. Taco & grill catering / Taquiza y parrillada
25. Bartender service / Servicio de bartender
26. Waitstaff / Meseros
27. Portable bar / Barra móvil
28. Portable restrooms / Baños portátiles
29. Generators & power / Plantas de luz
30. Florist / Florería
31. Invitations & printing / Invitaciones e impresión
32. Party supply store / Tienda de artículos de fiesta
33. DJ
34. Sound system rental / Renta de sonido
35. Mariachi
36. Banda & norteño
37. Trío & serenata
38. Live band / Grupo musical
39. Solo singer / Cantante
40. MC & animator / Maestro de ceremonias y animador
41. Clowns / Payasos
42. Character animators / Personajes y botargas
43. Face painting / Pintacaritas
44. Magician / Mago
45. Dancers & hora loca / Bailarines y hora loca
46. Kids entertainment / Entretenimiento infantil
47. Photographer / Fotógrafo
48. Videographer / Videógrafo
49. Drone photography / Fotografía con dron
50. Photo booth / Cabina de fotos
51. 360 photo booth / Cabina 360
52. Limo & party bus / Limosina y party bus
53. Chambelanes & choreography / Chambelanes y coreografía
54. Dress & tuxedo rental / Renta de vestidos y trajes
55. Religious ceremony coordination / Coordinación de ceremonia religiosa
56. Fireworks & cold sparks / Pirotecnia y chispas frías

## 8 — Doctors and Medicine / Doctores y Medicina  `NEG-SALUD`
Filtros: F-SALUD

1. Primary care / Medicina general
2. Walk-in & urgent care / Clínica sin cita y urgencias
3. Community clinic – sliding scale / Clínica comunitaria de bajo costo
4. Pediatrics / Pediatría
5. OB-GYN / Ginecología y obstetricia
6. Prenatal care / Control prenatal
7. Midwife & doula / Partera y doula
8. Fertility / Fertilidad
9. Family planning / Planificación familiar
10. Dentist / Dentista
11. Orthodontist / Ortodoncia
12. Oral surgery / Cirugía oral
13. Dentures & implants / Prótesis e implantes
14. Pediatric dentist / Dentista infantil
15. Optometrist & eye exam / Optometría
16. Optical shop & glasses / Óptica y lentes
17. Dermatology / Dermatología
18. Cardiology / Cardiología
19. Endocrinology & diabetes / Endocrinología y diabetes
20. Gastroenterology / Gastroenterología
21. Neurology / Neurología
22. Pulmonology / Neumología
23. Urology / Urología
24. Nephrology / Nefrología
25. Rheumatology / Reumatología
26. Orthopedics / Ortopedia
27. Sports medicine / Medicina deportiva
28. Podiatry / Podología
29. ENT / Otorrinolaringología
30. Allergy & asthma / Alergias y asma
31. Oncology / Oncología
32. Pain management / Manejo del dolor
33. Chiropractor / Quiropráctico
34. Physical therapy / Terapia física
35. Occupational therapy / Terapia ocupacional
36. Speech therapy / Terapia del habla
37. Psychology & counseling / Psicología y consejería
38. Psychiatry / Psiquiatría
39. Family & couples therapy / Terapia familiar y de pareja
40. Addiction & recovery / Adicciones y recuperación
41. Nutritionist / Nutriólogo
42. Weight loss clinic / Clínica de pérdida de peso
43. Aesthetic medicine / Medicina estética
44. IV therapy & wellness / Terapia intravenosa y bienestar
45. Vaccinations / Vacunas
46. Lab & bloodwork / Laboratorio y análisis
47. Imaging & X-ray / Imagenología y rayos X
48. Pharmacy / Farmacia
49. Compounding pharmacy / Farmacia de preparación
50. Medical equipment & supplies / Equipo médico
51. Hearing aids / Aparatos auditivos
52. Home health aide / Cuidador a domicilio
53. Home nursing / Enfermería a domicilio
54. Elder care / Cuidado de adultos mayores
55. Hospice & palliative / Cuidados paliativos
56. Non-emergency medical transport / Transporte médico
57. Telemedicine / Telemedicina
58. Sleep clinic / Clínica del sueño
59. Occupational & DOT physicals / Exámenes médicos laborales y DOT
60. Veterinarian / Veterinario

## 9 — Professional Services / Servicios Profesionales  `NEG-PRO`
Filtros: F-PRO

1. Immigration attorney / Abogado de inmigración
2. Immigration document help / Ayuda con documentos de inmigración
3. Consulate & passport help / Trámites de consulado y pasaporte
4. General attorney / Abogado general
5. Family law / Derecho familiar
6. Divorce & custody / Divorcio y custodia
7. Criminal defense / Defensa penal
8. Traffic tickets & DUI / Multas de tránsito y DUI
9. Personal injury & accidents / Accidentes y lesiones
10. Workers' comp / Compensación laboral
11. Bankruptcy / Bancarrota
12. Real estate attorney / Abogado de bienes raíces
13. Wills & estate / Testamentos y sucesiones
14. Bail bonds / Fianzas
15. Notary public / Notario público
16. Apostille & document legalization / Apostilla y legalización
17. Translation & interpretation / Traducción e interpretación
18. Certified document translation / Traducción certificada
19. Accountant / Contador
20. Tax preparation / Preparación de impuestos
21. ITIN application / Solicitud de ITIN
22. Bookkeeping / Contabilidad y libros
23. Payroll / Nómina
24. Business formation & LLC / Formación de empresa y LLC
25. Licenses & permits / Licencias y permisos
26. Business consulting / Consultoría de negocios
27. Insurance agent – auto / Seguros de auto
28. Insurance agent – home & renters / Seguros de casa y renta
29. Insurance agent – life & health / Seguros de vida y salud
30. Commercial & business insurance / Seguros comerciales
31. Money transfer & remittances / Envío de dinero y remesas
32. Check cashing / Cambio de cheques
33. Bill payment services / Pago de servicios
34. Financial advisor / Asesor financiero
35. Credit repair / Reparación de crédito
36. Loans & lending / Préstamos
37. Mortgage broker / Broker hipotecario
38. Web design / Diseño web
39. Graphic design & logo / Diseño gráfico y logotipos
40. Printing & signs / Imprenta y rótulos
41. Embroidery & screen printing / Bordado y serigrafía
42. Marketing & social media / Mercadeo y redes sociales
43. Commercial photography / Fotografía comercial
44. Video production / Producción de video
45. Software & app development / Desarrollo de software y apps
46. IT support / Soporte técnico
47. Computer repair / Reparación de computadoras
48. Phone & tablet repair / Reparación de celulares
49. Staffing & employment agency / Agencia de empleo
50. HR & compliance / Recursos humanos y cumplimiento
51. Security guard services / Seguridad privada
52. Private investigator / Investigador privado
53. Courier & document delivery / Mensajería
54. Truck dispatch / Despacho de camiones
55. CDL & DOT compliance / Cumplimiento CDL y DOT
56. Architecture / Arquitectura
57. Engineering / Ingeniería
58. Surveying / Topografía
59. Interior design / Diseño de interiores
60. Wedding & event officiant / Oficiante de bodas y eventos

## 10 — Shops & Stores / Tiendas  `NEG-TIENDA`
Filtros: F-RETAIL

1. Women's clothing / Ropa de mujer
2. Men's clothing / Ropa de hombre
3. Children's clothing / Ropa de niños
4. Quinceañera & bridal dresses / Vestidos de quinceañera y novia
5. Formal wear & tuxedos / Ropa formal y trajes
6. Western wear – boots & hats / Ropa vaquera, botas y sombreros
7. Shoes / Zapatería
8. Sneakers & streetwear / Tenis y ropa urbana
9. Uniforms & workwear / Uniformes y ropa de trabajo
10. Custom t-shirts / Camisetas personalizadas
11. Tailor & alterations / Sastrería y arreglos de ropa
12. Dry cleaning / Tintorería
13. Laundromat / Lavandería
14. Jewelry / Joyería
15. Watch & jewelry repair / Reparación de relojes y joyas
16. Accessories & bags / Accesorios y bolsos
17. Thrift & second hand / Ropa de segunda
18. Consignment / Consignación
19. Pawn shop / Casa de empeño
20. Furniture store / Mueblería
21. Mattresses / Colchones
22. Home décor / Decoración del hogar
23. Kitchenware / Artículos de cocina
24. Appliances / Electrodomésticos
25. Electronics / Electrónica
26. Cell phone store & plans / Tienda de celulares y planes
27. Computers / Computadoras
28. Video games / Videojuegos
29. Musical instruments / Instrumentos musicales
30. Sporting goods / Artículos deportivos
31. Bicycle shop / Bicicletería
32. Toy store / Juguetería
33. Baby gear / Artículos para bebé
34. Gift shop / Tienda de regalos
35. Flower shop / Florería
36. Party supplies / Artículos de fiesta
37. Religious goods / Artículos religiosos
38. Beauty supply / Productos de belleza
39. Hardware store / Ferretería
40. Paint store / Tienda de pinturas
41. Building materials / Materiales de construcción
42. Garden center & nursery / Vivero y jardinería
43. Auto parts store / Tienda de autopartes
44. Tool rental / Renta de herramienta
45. Pet shop / Tienda de mascotas
46. Pet grooming / Estética canina
47. Book & stationery / Librería y papelería
48. Trophies & engraving / Trofeos y grabados
49. Fabric & sewing supplies / Telas y mercería
50. Craft & piñata supplies / Manualidades y material para piñatas
51. Online store / Tienda en línea
52. Mobile & pop-up vendor / Vendedor móvil

## 11 — Transportation / Transporte  `NEG-TRANS`
Filtros: F-TRANSPORTE

1. Local ride / Viajes locales
2. Airport transfer / Traslado al aeropuerto
3. Long-distance van / Camioneta de larga distancia
4. Intercity shuttle / Shuttle entre ciudades
5. Cross-state trips / Viajes entre estados
6. Employee shuttle / Transporte de empleados
7. Farm & labor transport / Transporte de trabajadores
8. School & kids transport / Transporte escolar
9. Senior & medical rides / Traslados médicos y de adultos mayores
10. Designated driver / Conductor designado
11. Chauffeur service / Chofer privado
12. Limo & party bus / Limosina y party bus
13. Delivery courier / Repartidor y mensajería
14. Same-day courier / Mensajería el mismo día
15. Food delivery driver / Repartidor de comida
16. Grocery delivery / Entrega de compras
17. Package to Latin America / Envíos a Latinoamérica
18. Freight & cargo / Carga y flete
19. Box truck & hotshot / Camión de caja y hotshot
20. Semi & CDL trucking / Tráiler y transporte CDL
21. Equipment hauling / Traslado de maquinaria
22. Vehicle shipping / Traslado de vehículos
23. Towing / Grúas
24. Moving trucks with driver / Camión de mudanza con chofer
25. Car rental / Renta de autos
26. Van & truck rental / Renta de camionetas
27. Trailer rental / Renta de remolques
28. Motorcycle delivery / Reparto en moto
29. Bike courier / Mensajería en bicicleta
30. Boat & RV transport / Traslado de botes y casas rodantes

## 12 — Courses & Education / Cursos y Educación  `NEG-EDU`
Filtros: F-EDUCACION

1. English classes – ESL / Clases de inglés
2. Spanish classes / Clases de español
3. Conversational English practice / Práctica de conversación en inglés
4. Citizenship & civics prep / Preparación para ciudadanía
5. GED & high school equivalency / GED y preparatoria abierta
6. Adult basic education / Educación básica para adultos
7. Tutoring – math / Tutoría de matemáticas
8. Tutoring – reading & writing / Tutoría de lectura y escritura
9. Homework help / Ayuda con tareas
10. Test prep – SAT & ACT / Preparación SAT y ACT
11. College advising & FAFSA / Asesoría universitaria y FAFSA
12. Scholarship help / Ayuda con becas
13. Financial literacy / Educación financiera
14. Computer & digital skills / Computación básica
15. Office software / Programas de oficina
16. Coding & programming / Programación
17. Digital marketing course / Curso de marketing digital
18. Business & entrepreneurship / Negocios y emprendimiento
19. Bookkeeping course / Curso de contabilidad
20. Trade school / Escuela de oficios
21. CDL school / Escuela de CDL
22. Driving school / Escuela de manejo
23. Barber school / Escuela de barbería
24. Cosmetology school / Escuela de cosmetología
25. Nail tech course / Curso de uñas
26. Lash & brow course / Curso de pestañas y cejas
27. Makeup course / Curso de maquillaje
28. Welding course / Curso de soldadura
29. HVAC certification / Certificación HVAC
30. Electrical & plumbing training / Capacitación en electricidad y plomería
31. Construction safety – OSHA / Seguridad en construcción OSHA
32. Food handler & ServSafe / Manejo de alimentos
33. First aid & CPR / Primeros auxilios y CPR
34. Home health aide certification / Certificación de cuidador
35. Medical assistant course / Curso de asistente médico
36. Real estate license course / Curso de licencia inmobiliaria
37. Insurance license course / Curso de licencia de seguros
38. Notary training / Capacitación de notario
39. Tax preparer course / Curso de preparador de impuestos
40. Music lessons / Clases de música
41. Dance classes – salsa & bachata / Clases de salsa y bachata
42. Folkloric dance / Danza folclórica
43. Art classes / Clases de arte
44. Cooking classes / Clases de cocina
45. Sewing classes / Clases de costura
46. Photography course / Curso de fotografía
47. Public speaking / Oratoria
48. Personal & career coaching / Coaching personal y de carrera

## 13 — Children / Niños  `NEG-NINOS`
Filtros: F-NINOS

1. Daycare center / Guardería
2. Home daycare / Cuidado infantil en casa
3. Preschool / Preescolar
4. Pre-K program / Programa Pre-K
5. Head Start & subsidized programs / Programas subsidiados
6. Babysitter / Niñera por horas
7. Nanny / Nana de tiempo completo
8. Overnight & weekend care / Cuidado de noche y fin de semana
9. After-school care / Cuidado después de la escuela
10. Summer camp / Campamento de verano
11. Winter & spring camp / Campamento de invierno y primavera
12. Kids tutoring / Tutoría para niños
13. Bilingual learning programs / Programas bilingües
14. Kids haircuts / Cortes de cabello para niños
15. Kids gym & tumbling / Gimnasia para niños
16. Kids soccer / Fútbol infantil
17. Kids baseball / Béisbol infantil
18. Kids basketball / Básquetbol infantil
19. Kids martial arts / Artes marciales para niños
20. Swim lessons / Clases de natación
21. Kids dance / Baile para niños
22. Kids music lessons / Música para niños
23. Kids art classes / Arte para niños
24. Indoor playground / Área de juegos techada
25. Trampoline park / Parque de trampolines
26. Kids party entertainment / Entretenimiento de fiestas infantiles
27. Speech & occupational therapy for kids / Terapias infantiles
28. Special needs support / Apoyo a necesidades especiales
29. Parenting classes / Clases para padres
30. Lactation & newborn support / Apoyo de lactancia y recién nacido
31. Baby gear rental / Renta de artículos de bebé
32. Kids photography / Fotografía infantil
33. WIC & family assistance help / Ayuda con WIC y asistencia familiar
34. School enrollment help / Ayuda con inscripción escolar
35. Foster & adoption resources / Recursos de acogida y adopción

## 14 — Active Life & Sport / Vida Activa y Deporte  `NEG-DEPORTE`
Filtros: F-DEPORTE

1. Gym / Gimnasio
2. 24-hour gym / Gimnasio 24 horas
3. Personal trainer / Entrenador personal
4. Group fitness classes / Clases grupales
5. Zumba & dance fitness / Zumba y baile fitness
6. Spinning & cycling studio / Spinning
7. CrossFit
8. Weightlifting & powerlifting / Levantamiento de pesas
9. Boxing gym / Gimnasio de boxeo
10. MMA & jiu-jitsu
11. Karate & taekwondo
12. Wrestling / Lucha
13. Yoga
14. Pilates
15. Stretching & mobility / Estiramiento y movilidad
16. Nutrition & body composition / Nutrición deportiva
17. Soccer league / Liga de fútbol
18. Indoor soccer / Fútbol rápido
19. Field & court rental / Renta de canchas
20. Basketball league / Liga de básquetbol
21. Volleyball / Voleibol
22. Baseball & softball league / Liga de béisbol y softbol
23. Flag football
24. Bowling / Boliche
25. Golf & driving range / Golf
26. Tennis & pickleball / Tenis y pickleball
27. Swimming pool & lessons / Alberca y clases
28. Running club / Club de corredores
29. Cycling club / Club ciclista
30. Hiking & outdoors / Senderismo y aire libre
31. Fishing / Pesca
32. Hunting & gun range / Cacería y campo de tiro
33. Paintball & airsoft
34. Go-karts
35. Skate park / Parque de patinetas
36. Ice skating / Patinaje sobre hielo
37. Rock climbing / Escalada
38. Horseback riding / Equitación
39. Charrería & rodeo / Charreada y rodeo
40. Recreation center / Centro recreativo
41. Coaches & referees / Entrenadores y árbitros
42. Youth sports academy / Academia deportiva juvenil
43. Sports event organizer / Organizador de torneos

## 15 — Churches & Religion / Iglesias y Religión  `NEG-FE`
Filtros: F-FE

1. Catholic parish / Parroquia católica
2. Mass in Spanish / Misa en español
3. Evangelical church / Iglesia evangélica
4. Pentecostal church / Iglesia pentecostal
5. Baptist church / Iglesia bautista
6. Methodist church / Iglesia metodista
7. Adventist church / Iglesia adventista
8. Non-denominational church / Iglesia no denominacional
9. Jehovah's Witnesses hall / Salón de los Testigos de Jehová
10. LDS ward / Capilla de los Santos
11. Orthodox church / Iglesia ortodoxa
12. Mosque / Mezquita
13. Synagogue / Sinagoga
14. Christian ministry / Ministerio cristiano
15. Youth ministry / Ministerio juvenil
16. Women's ministry / Ministerio de damas
17. Men's ministry / Ministerio de varones
18. Worship & choir / Alabanza y coro
19. Bible study & cell groups / Estudio bíblico y células
20. Sunday school / Escuela dominical
21. Catechism & sacrament prep / Catecismo y preparación de sacramentos
22. Baptism / Bautizos
23. First communion & confirmation / Primera comunión y confirmación
24. Quinceañera mass / Misa de quinceañera
25. Religious weddings / Bodas religiosas
26. Marriage & family counseling / Consejería matrimonial y familiar
27. Christian counseling / Consejería cristiana
28. Addiction recovery ministry / Ministerio de recuperación
29. Funeral services / Servicios funerarios
30. Funeral home / Funeraria
31. Cremation / Cremación
32. Repatriation of remains / Repatriación de restos
33. Memorial & novenario / Servicio memorial y novenario
34. Hospital & prison chaplain / Capellanía
35. Prayer line & support / Línea de oración
36. Food pantry / Despensa de alimentos
37. Clothing donations / Donación de ropa
38. Shelter & emergency aid / Refugio y ayuda de emergencia
39. Immigration help through church / Ayuda migratoria de la iglesia
40. Community outreach & missions / Labor comunitaria y misiones
41. Volunteer opportunities / Oportunidades de voluntariado
42. Religious goods store / Tienda de artículos religiosos
43. Spiritual traditions & botánica / Tradiciones espirituales y botánica

## 16 — Real Estate / Bienes Raíces  `NEG-INMUEBLE`
Filtros: F-INMUEBLE

1. Real estate agent / Agente inmobiliario
2. Bilingual realtor / Agente bilingüe
3. Buyer's agent / Agente del comprador
4. Seller's agent / Agente del vendedor
5. Homes for sale / Casas en venta
6. Condos & townhomes / Condominios y townhouses
7. New construction / Obra nueva
8. Multi-family & investment / Multifamiliar e inversión
9. Land & lots / Terrenos
10. Farm & rural property / Propiedad rural
11. Mobile & manufactured homes / Casas móviles
12. Mobile home parks / Parques de casas móviles
13. Commercial property for sale / Propiedad comercial en venta
14. Apartments for rent / Apartamentos en renta
15. Houses for rent / Casas en renta
16. Rooms for rent / Cuartos en renta
17. Shared housing & roommates / Vivienda compartida
18. Short-term & furnished rentals / Renta corta y amueblada
19. Section 8 & affordable housing / Section 8 y vivienda accesible
20. Senior housing / Vivienda para adultos mayores
21. First-time buyer programs / Programas para primer comprador
22. ITIN & no-credit mortgage / Hipoteca con ITIN o sin crédito
23. Mortgage pre-approval / Precalificación hipotecaria
24. Down payment assistance / Ayuda con el enganche
25. Home appraisal / Avalúo
26. Home inspection / Inspección de vivienda
27. Title & escrow / Título y cierre
28. Property management / Administración de propiedades
29. Landlord services / Servicios para propietarios
30. Tenant help & rights / Ayuda y derechos del inquilino
31. Eviction help / Ayuda con desalojo
32. Rent-to-own / Renta con opción a compra
33. Cash home buyers / Compradores en efectivo
34. Foreclosure & short sale / Ejecución hipotecaria y venta corta
35. HOA services / Servicios de HOA
36. Real estate photography / Fotografía inmobiliaria
37. Staging / Ambientación para venta
38. Office space / Oficinas
39. Retail space & storefront / Local comercial
40. Warehouse & industrial / Bodega industrial
41. Commercial kitchen rental / Renta de cocina comercial
42. Event space rental / Renta de espacio para eventos
43. Storage units / Bodegas de almacenamiento
44. Parking & lot rental / Renta de estacionamiento
45. Real estate investing group / Grupo de inversión inmobiliaria

## 17 — Car Dealers / Venta de Autos  `NEG-DEALER`
Filtros: F-VEHICULO

1. New car dealer / Agencia de autos nuevos
2. Used car dealer / Lote de autos usados
3. Independent lot / Lote independiente
4. Buy here pay here / Compre aquí pague aquí
5. No credit needed / Sin crédito
6. ITIN financing / Financiamiento con ITIN
7. First-time buyer financing / Financiamiento para primer comprador
8. Certified pre-owned / Certificados usados
9. Luxury & exotic / Autos de lujo
10. Trucks & pickups / Camionetas y pickups
11. SUVs
12. Vans & minivans / Vans y minivans
13. Work & commercial vehicles / Vehículos de trabajo
14. Fleet sales / Venta a flotas
15. Box trucks / Camiones de caja
16. Semi trucks / Tráileres
17. Trailers / Remolques
18. Motorcycles / Motocicletas
19. ATV & UTV / Cuatrimotos
20. Scooters & mopeds / Scooters
21. Boats & jet skis / Botes y motos acuáticas
22. RV & campers / Casas rodantes
23. Golf carts / Carritos de golf
24. Classic & project cars / Clásicos y proyectos
25. Salvage & rebuilt title / Título salvage y reconstruido
26. Auto auction / Subasta de autos
27. Wholesale dealer / Distribuidor mayorista
28. Car broker & finder / Broker y buscador de autos
29. Consignment sales / Venta en consignación
30. Trade-in & appraisal / Cambio y avalúo
31. Cash for cars / Compra de autos en efectivo
32. Private seller listings / Venta por dueño
33. Dealer financing / Financiamiento del dealer
34. Extended warranty / Garantía extendida
35. GAP & dealer insurance / Seguro y GAP
36. Tag, title & registration / Placas, título y registro
37. Dealer service department / Taller del dealer
38. Home test drive & delivery / Prueba y entrega a domicilio
39. Export & vehicle shipping / Exportación y envío de vehículos

---

## Reglas de la taxonomía
1. Una categoría principal **nunca se elimina ni se renombra** sin anotarlo aquí.
2. Un negocio pertenece a **una categoría principal** y hasta **3 subcategorías**.
3. Las subcategorías marcadas como enlace entre módulos (comida ↔ fiestas,
   autopartes ↔ autos) apuntan al mismo negocio, no se duplican.
4. Cada categoría declara su **familia de filtros**; los filtros globales
   siempre están presentes.
5. Toda subcategoría nueva se agrega a este archivo antes de existir en pantalla.
