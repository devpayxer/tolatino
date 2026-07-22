// Comprehensive test-data generator for Hazleton PA + The Bronx NY.
// Usage: node gen-all.mjs <CategoryId>   -> prints SQL for that category (both cities).
//        node gen-all.mjs EXTRAS         -> events + community posts (both cities).
// Covers every rubro/module + addons, endorsements, promos, delivery, staff, updates.
const CAT = process.argv[2];
const q = (s) => s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const geo = (lat, lng) => `st_setsrid(st_makepoint(${lng},${lat}),4326)::geography`;
const out = ['begin;'];
const P = (s) => out.push(s);
const letters = 'abcdefghijklmnopqrstuvwxyz';

const HRS_REST = [[[600,1200]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1380]],[[540,1380]]];
const HRS_SHOP = [[[]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1200]],[[600,1020]]].map((d,i)=>i===0?[[600,1020]]:d);
const HRS_SVC  = [[],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1200]],[[600,960]]];

const CITIES = [
  { code:'hz', tag:'1', city:'Hazleton, PA', lat:40.9584, lng:-75.9746, tz:'America/New_York', ac:'570', zip:'18201',
    streets:['W Broad St','N Wyoming St','E Diamond Ave','N Church St','Alter St','James St','N Vine St','Peace St','Carson St','W 15th St','N Laurel St','E Mine St'] },
  { code:'bx', tag:'2', city:'The Bronx, NY', lat:40.8498, lng:-73.8664, tz:'America/New_York', ac:'718', zip:'10451',
    streets:['E 149th St','Southern Blvd','Westchester Ave','Grand Concourse','E Tremont Ave','White Plains Rd','Willis Ave','Jerome Ave','Fordham Rd','E 138th St','Melrose Ave','Bruckner Blvd'] },
];
const REVIEWS = [
  ['Excelente atención, muy recomendado.','Great service, highly recommend.'],
  ['Calidad y buen precio, volveré.','Quality and good price, I’ll be back.'],
  ['Muy profesionales y puntuales.','Very professional and on time.'],
  ['El mejor del área, sin duda.','The best in the area, no doubt.'],
  ['Trato amable y en español.','Friendly service, in Spanish.'],
  ['Quedé muy satisfecho con todo.','I was very satisfied with everything.'],
  ['Rápido, limpio y confiable.','Fast, clean and reliable.'],
  ['Los recomiendo con los ojos cerrados.','I recommend them 100%.'],
];
const ENDORSE = ['Súper recomendado 👍','De confianza','Muy buen servicio','Aquí me atienden bien','El mejor del barrio'];

// ---- rubro content templates (per category) ----
// Each returns { modules, configCol, config, items:[{section,name,en,descEs,descEn,price,attrs}] , extraModules }
function menuCfg(cats, paid, mods){ return { categories:cats.map(([id,es,en],i)=>({id,es,en,icon:'🍽️',tile:['#FCEBD6','#E4ECFB','#E3F5EA'][i%3],visible:true})), mods:mods||[], dayparts:[], promos: paid?[{id:'pr1',type:'percent',es:'AMIGO10',en:'AMIGO10',descEs:'10% en tu primer pedido',descEn:'10% off your first order',value:10,status:'active',code:'AMIGO10',minOrder:10}]:[], tags:['Popular','Nuevo'], automation:{auto86:true,notifyLow:true,resetDaily:false,backorders:false}, ordering: paid }; }
function svcCfg(cats, paid, addons, providers, autoConfirm){ return { categories:cats.map(([id,es,en],i)=>({id,es,en,icon:'✨',tile:['#F1EFFA','#FBE9F0','#E3F5EA'][i%3],visible:true})), addons:addons||[], tags:['Cita','Sin espera'], booking:paid, autoConfirm:!!autoConfirm, promos: paid?[{id:'pr1',type:'percent',es:'NUEVO15',en:'NEW15',descEs:'15% primera cita',descEn:'15% first visit',value:15,status:'active',code:'NUEVO15'}]:[], providers:providers||[] }; }
function prodCfg(cats, paid, optionSets){ return { categories:cats.map(([id,es,en],i)=>({id,es,en,icon:'🛍️',tile:['#E4ECFB','#FCF1C7','#FBE9F0'][i%3],visible:true})), optionSets:optionSets||[], collections:[], discounts: paid?[{id:'d1',code:'ENVIO0',type:'shipping',descEs:'Envío gratis +$50',descEn:'Free shipping over $50',auto:true,minOrder:50,status:'active'}]:[], tags:['Oferta','Nuevo'], automation:{trackStock:true,notifyLow:true,hideOutOfStock:false,backorders:false}, selling:paid }; }
function rentCfg(cats, paid, addons){ return { categories:cats.map(([id,es,en],i)=>({id,es,en,icon:'📦',tile:['#E4ECFB','#FCEFD6','#E3F5EA'][i%3],visible:true})), addons:addons||[], policies:[{id:'dep',es:'Depósito reembolsable',en:'Refundable deposit',default:true},{id:'clean',es:'Devolver limpio',en:'Return clean',default:true}], tags:['Renta','Evento'], renting:paid, autoConfirm:false, promos:[] }; }

const M_EXTRAS = {id:'extras',es:'Extras',en:'Extras',single:false,required:false,options:[{es:'Queso extra',en:'Extra cheese',price:1.5},{es:'Aguacate',en:'Avocado',price:2},{es:'Jalapeños',en:'Jalapeños',price:0.75}]};
const M_SIZE = {id:'tamano',es:'Tamaño',en:'Size',single:true,required:true,options:[{es:'Chico',en:'Small',price:0},{es:'Mediano',en:'Medium',price:1.5},{es:'Grande',en:'Large',price:3}]};
const A_SVC = [{id:'a1',es:'Tratamiento profundo',en:'Deep treatment',price:15},{id:'a2',es:'Diseño extra',en:'Extra styling',price:10},{id:'a3',es:'Producto premium',en:'Premium product',price:12}];
const OPT_SET = [{id:'talla',es:'Talla',en:'Size',single:true,values:[{es:'S',price:0},{es:'M',price:0},{es:'L',price:2},{es:'XL',price:4}]},{id:'color',es:'Color',en:'Color',single:true,values:[{es:'Negro',price:0},{es:'Blanco',price:0},{es:'Rojo',price:0}]}];
const A_RENT = [{id:'r1',es:'Entrega a domicilio',en:'Delivery',price:40},{id:'r2',es:'Montaje',en:'Setup',price:60},{id:'r3',es:'Seguro',en:'Insurance',price:25}];

// item builders per rubro; itemsFor(cat) returns array [section,name,en,descEs,descEn,price,modsArr?]
const T = {
  // MENU categories
  FoodDrinks:{rubro:'menu',token:'food',hrs:HRS_REST,tile:['#FCEBD6','#F6DCBF'],
    cats:[['tacos','Tacos','Tacos'],['platillos','Platillos','Plates'],['bebidas','Bebidas','Drinks']], mods:[M_EXTRAS,M_SIZE],
    names:['Taquería El Sol','Tacos Don Chente','Mariscos La Costa','Pupusería Cuscatlán','El Sabor Dominicano','Pollo Rico','Panadería La Espiga','Pizzería Napoli','Sabor Colombiano'],
    items:[['tacos','Taco al pastor','Al pastor taco','Con piña y cilantro','With pineapple & cilantro',3.25,['extras']],['tacos','Taco de birria','Birria taco','Res y consomé','Beef & consommé',3.75,['extras']],['tacos','Taco de asada','Steak taco','A la parrilla','Grilled',3.5,['extras']],['tacos','Taco de pollo','Chicken taco','Adobado','Marinated',3.0,['extras']],['platillos','Burrito grande','Big burrito','Arroz, frijol y carne','Rice, beans & meat',10.5,['extras']],['platillos','Quesadilla','Quesadilla','Con queso Oaxaca','With Oaxaca cheese',8.5,['extras']],['platillos','Torta','Torta','Pan telera','Telera roll',9.0,['extras']],['platillos','Sopa de tortilla','Tortilla soup','Con aguacate','With avocado',7.5,[]],['bebidas','Agua de horchata','Horchata','Casera','House-made',3.5,['tamano']],['bebidas','Agua de jamaica','Hibiscus','Refrescante','Refreshing',3.5,['tamano']],['bebidas','Refresco','Soda','Varios','Assorted',2.0,['tamano']],['bebidas','Café de olla','Café de olla','Canela','Cinnamon',2.5,[]]]},
  NightLife:{rubro:'menu',token:'night',hrs:[[[]],[],[],[[1080,1560]],[[1080,1560]],[[1080,1620]],[[1080,1620]]].map((d,i)=>i<3?[]:d),tile:['#E8E4FB','#DCD6F6'],
    cats:[['tragos','Tragos','Cocktails'],['cervezas','Cervezas','Beers'],['botanas','Botanas','Snacks']], mods:[M_SIZE],
    names:['Bar La Cantina','Cervecería El Barrio','Club Tropikal','Lounge Azul','Karaoke Estrella','Billar El As','Terraza Sunset','Mezcalería Oaxaca','Bar Deportivo Gol'],
    items:[['tragos','Margarita','Margarita','Clásica de limón','Classic lime',9,['tamano']],['tragos','Paloma','Paloma','Tequila y toronja','Tequila & grapefruit',9,['tamano']],['tragos','Mojito','Mojito','Ron y hierbabuena','Rum & mint',9,['tamano']],['tragos','Michelada','Michelada','Preparada','Prepared',7,['tamano']],['cervezas','Corona','Corona','Botella','Bottle',5,[]],['cervezas','Modelo','Modelo','Botella','Bottle',5,[]],['cervezas','Cerveza artesanal','Craft beer','Del barril','On tap',7,['tamano']],['botanas','Nachos','Nachos','Con queso','With cheese',9,['extras']],['botanas','Alitas (8)','Wings (8)','BBQ o buffalo','BBQ or buffalo',11,[]],['botanas','Guacamole','Guacamole','Con totopos','With chips',8,[]],['botanas','Papas a la francesa','Fries','Grandes','Large',6,['extras']],['botanas','Tabla de quesos','Cheese board','Para compartir','To share',14,[]]]},
  // SERVICES categories
  BeautyHealth:{rubro:'services',token:'beauty',hrs:HRS_SVC,tile:['#FBE9F0','#F5D8E6'], alsoProducts:true,
    cats:[['cortes','Cortes','Haircuts'],['color','Color','Color'],['unas','Uñas','Nails']],
    names:['Salón Bella Vida','Barbería Los Panas','Estética Glamour','Nails & Spa Luz','Studio Cabello','Color Bar Latina','Barbershop El Rey','Spa Serenidad','Salón Caribeña'],
    items:[['cortes','Corte de dama','Women’s haircut','Corte y peinado','Cut & style',35,45],['cortes','Corte de caballero','Men’s haircut','Clásico o fade','Classic or fade',20,30],['cortes','Corte de niño','Kids haircut','Hasta 10 años','Under 10',15,20],['cortes','Barba y afeitado','Beard & shave','Toalla caliente','Hot towel',18,25],['color','Tinte completo','Full color','Un tono','Single tone',75,90],['color','Rayitos / mechas','Highlights','Parcial o completo','Partial or full',110,120],['color','Keratina','Keratin','Alaciado','Straightening',150,120],['unas','Manicure','Manicure','Regular o gel','Regular or gel',25,40],['unas','Pedicure spa','Spa pedicure','Con masaje','With massage',35,50],['unas','Uñas acrílicas','Acrylic nails','Set completo','Full set',45,60],['unas','Diseño de uñas','Nail art','Por uña','Per nail',5,10],['cortes','Peinado de evento','Event styling','Recogido','Updo',55,60]],
    products:[['prod','Shampoo profesional','Pro shampoo','500ml','500ml',18],['prod','Cera para peinar','Styling wax','Fijación fuerte','Strong hold',12],['prod','Aceite para barba','Beard oil','Nutre e hidrata','Nourishes',15]]},
  HealthMedicine:{rubro:'services',token:'health',hrs:HRS_SVC,tile:['#E3F5EA','#D6EFDF'],
    cats:[['consultas','Consultas','Consults'],['dental','Dental','Dental'],['estudios','Estudios','Tests']],
    names:['Clínica Familiar Sana','Dental Sonrisa','Óptica Visión','Consultorio Dr. Ramos','Clínica de la Mujer','Pediatría Feliz','Fisioterapia Activa','Farmacia y Consultas','Salud Total'],
    items:[['consultas','Consulta general','General consult','Medicina familiar','Family medicine',60,30],['consultas','Consulta pediátrica','Pediatric visit','Niños y bebés','Kids & babies',70,30],['consultas','Chequeo anual','Annual checkup','Completo','Complete',120,45],['consultas','Consulta de la mujer','Women’s consult','Ginecología','OB-GYN',90,30],['dental','Limpieza dental','Dental cleaning','Profilaxis','Prophylaxis',80,45],['dental','Extracción','Extraction','Simple','Simple',120,30],['dental','Resina / empaste','Filling','Por pieza','Per tooth',110,40],['estudios','Examen de la vista','Eye exam','Con receta','With prescription',50,30],['estudios','Laboratorio básico','Basic lab','Sangre','Bloodwork',45,15],['estudios','Vacuna','Vaccine','Varias','Various',35,15],['consultas','Terapia física','Physical therapy','Por sesión','Per session',70,45],['consultas','Consejería','Counseling','Salud mental','Mental health',80,50]]},
  AutoServices:{rubro:'services',token:'auto',hrs:HRS_SVC,tile:['#E7EEFB','#DAE5F6'], alsoProducts:true,
    cats:[['mecanica','Mecánica','Mechanic'],['llantas','Llantas','Tires'],['estetica','Estética','Detailing']],
    names:['Don Beto Mecánica','Taller Hermanos Reyes','Mecánica Boricua','Llantera El Rayo','Auto Detailing Sol','Taller Aparicio','Frenos y Suspensión','AutoEléctrico Rápido','Body Shop El Jefe'],
    items:[['mecanica','Cambio de aceite','Oil change','Aceite y filtro','Oil & filter',45,30],['mecanica','Afinación','Tune-up','Completa','Full',180,90],['mecanica','Frenos (par)','Brakes (pair)','Balatas y rectificado','Pads & resurface',160,90],['mecanica','Diagnóstico','Diagnostics','Escaneo','Scan',60,45],['mecanica','Cambio de batería','Battery swap','Instalada','Installed',140,30],['llantas','Llanta nueva','New tire','Instalada','Installed',95,20],['llantas','Alineación','Alignment','4 ruedas','4-wheel',80,45],['llantas','Balanceo','Balancing','4 ruedas','4-wheel',50,30],['llantas','Reparación de ponchadura','Flat repair','Parche','Patch',25,20],['estetica','Lavado completo','Full wash','Interior y exterior','In & out',30,45],['estetica','Detallado premium','Premium detail','Encerado','Waxed',150,180],['estetica','Polarizado','Window tint','Todo el auto','Full car',220,120]],
    products:[['prod','Aceite sintético 5W-30','Synthetic oil 5W-30','Galón','Gallon',28],['prod','Limpiaparabrisas (par)','Wipers (pair)','Universales','Universal',22],['prod','Aromatizante','Air freshener','Varios','Assorted',5]]},
  HomeServices:{rubro:'services',token:'home',hrs:HRS_SVC,tile:['#FCF1C7','#F6E8AE'],
    cats:[['reparacion','Reparación','Repair'],['limpieza','Limpieza','Cleaning'],['exterior','Exterior','Outdoor']],
    names:['Plomería El Águila','Electricidad Segura','Limpieza Brillante','Jardinería Verde','Pintura Pro','Control de Plagas Max','Handyman Rápido','Techos y Más','Mudanzas El Fuerte'],
    items:[['reparacion','Servicio de plomería','Plumbing service','Por hora','Per hour',85,60],['reparacion','Servicio eléctrico','Electrical service','Por hora','Per hour',90,60],['reparacion','Destape de drenaje','Drain cleaning','Con máquina','With machine',150,90],['reparacion','Handyman','Handyman','Reparaciones varias','General repairs',65,60],['limpieza','Limpieza de casa','House cleaning','Estándar','Standard',120,120],['limpieza','Limpieza profunda','Deep cleaning','A fondo','Thorough',220,240],['limpieza','Limpieza de alfombras','Carpet cleaning','Por cuarto','Per room',45,45],['exterior','Corte de césped','Lawn care','Frente y patio','Front & back',50,45],['exterior','Poda de árboles','Tree trimming','Por árbol','Per tree',120,90],['exterior','Lavado a presión','Pressure washing','Cochera/patio','Driveway/patio',150,90],['reparacion','Pintura interior','Interior painting','Por cuarto','Per room',250,300],['exterior','Fumigación','Pest control','Tratamiento','Treatment',120,60]]},
  ProServices:{rubro:'services',token:'pro',hrs:HRS_SVC,tile:['#E8E4FB','#DCD6F6'],
    cats:[['legal','Legal','Legal'],['finanzas','Finanzas','Finance'],['tramites','Trámites','Documents']],
    names:['Abogada Ramírez','Inmigración Vargas','Contador Pérez','Taxes Rápidos','Seguros La Confianza','Envíos de Dinero','Traducciones Global','Notario Público','Reparación de Crédito'],
    items:[['legal','Consulta legal','Legal consult','30 minutos','30 minutes',80,30],['legal','Caso de inmigración','Immigration case','Evaluación','Evaluation',150,60],['legal','Poder notarial','Power of attorney','Notariado','Notarized',60,30],['finanzas','Preparación de taxes','Tax prep','Personal','Personal',120,45],['finanzas','Taxes con negocio','Business taxes','Schedule C','Schedule C',250,60],['finanzas','Contabilidad mensual','Monthly bookkeeping','Pequeño negocio','Small biz',180,60],['tramites','Traducción certificada','Certified translation','Por página','Per page',30,15],['tramites','Notarización','Notarization','Por documento','Per document',15,15],['tramites','Cambio de cheques','Check cashing','Comisión 1%','1% fee',5,10],['finanzas','Reparación de crédito','Credit repair','Plan mensual','Monthly plan',99,30],['legal','Fianzas','Bail bonds','Consulta','Consult',100,30],['tramites','Envío de dinero','Money transfer','A Latinoamérica','To Latin America',8,10]]},
  Transportation:{rubro:'services',token:'trans',hrs:HRS_SVC,tile:['#E5EFFB','#D7E5F6'],
    cats:[['viajes','Viajes','Rides'],['mudanzas','Mudanzas','Moving'],['envios','Envíos','Shipping']],
    names:['Taxi Latino','Transporte El Rápido','Chofer Privado','Mudanzas El Fuerte','Fletes Hernández','Envíos a Latinoamérica','Charter Bus Tours','Transporte al Aeropuerto','Paquetería Express'],
    items:[['viajes','Viaje local','Local ride','Dentro de la ciudad','In-city',25,20],['viajes','Viaje al aeropuerto','Airport ride','Ida','One way',75,60],['viajes','Chofer por hora','Hourly driver','Mínimo 2h','2h min',40,60],['mudanzas','Mudanza local','Local move','Camión y 2 hombres','Truck & 2 movers',180,180],['mudanzas','Flete','Hauling','Por carga','Per load',120,90],['mudanzas','Ayudante de carga','Loading help','Por hora','Per hour',45,60],['envios','Paquete a México','Package to Mexico','Por libra','Per pound',4,15],['envios','Encomienda','Parcel','Puerta a puerta','Door to door',60,20],['envios','Mensajería local','Local courier','Mismo día','Same day',20,30],['viajes','Renta de van','Van rental','Por día','Per day',110,30],['viajes','Transporte escolar','School transport','Mensual','Monthly',200,20],['viajes','Tour charter','Charter tour','Grupo','Group',450,60]]},
  Education:{rubro:'services',token:'edu',hrs:HRS_SVC,tile:['#F1EFFA','#E5DEF9'],
    cats:[['idiomas','Idiomas','Languages'],['academico','Académico','Academic'],['oficios','Oficios','Trades']],
    names:['Clases de Inglés ESL','Academia de Español','Tutoría Matemáticas','Escuela de Manejo','CDL Truck School','Ciudadanía USA','Clases de Música','Computación Básica','GED en Español'],
    items:[['idiomas','Clase de inglés (ESL)','English class','Grupo, por mes','Group, monthly',90,60],['idiomas','Inglés privado','Private English','Por hora','Per hour',35,60],['idiomas','Clase de español','Spanish class','Por mes','Monthly',85,60],['idiomas','Preparación ciudadanía','Citizenship prep','Curso','Course',150,60],['academico','Tutoría de matemáticas','Math tutoring','Por hora','Per hour',30,60],['academico','Preparación GED','GED prep','Por mes','Monthly',120,90],['academico','Regularización','Academic support','Por hora','Per hour',28,60],['oficios','Escuela de manejo','Driving school','Paquete 5 clases','5-class pack',300,60],['oficios','CDL comercial','CDL training','Curso completo','Full course',2500,240],['oficios','Cosmetología','Cosmetology','Por mes','Monthly',400,120],['academico','Clases de computación','Computer classes','Por mes','Monthly',80,60],['idiomas','Clase de música','Music lesson','Guitarra o piano','Guitar or piano',40,45]]},
  Children:{rubro:'services',token:'kids',hrs:HRS_SVC,tile:['#FBE9F0','#F5D8E6'], alsoProducts:true,
    cats:[['cuidado','Cuidado','Care'],['clases','Clases','Classes'],['fiestas','Fiestas','Parties']],
    names:['Guardería Los Angelitos','Preescolar Arcoíris','Niñera de Confianza','Clases de Baile Kids','Fútbol Infantil','Música para Niños','Fotografía Infantil','Terapia Infantil','Campamento de Verano'],
    items:[['cuidado','Guardería (día)','Daycare (day)','Tiempo completo','Full day',45,480],['cuidado','Medio día','Half day','Mañana o tarde','AM or PM',28,240],['cuidado','Niñera por hora','Babysitting','Por hora','Per hour',18,60],['clases','Clase de baile','Dance class','Por mes','Monthly',60,60],['clases','Fútbol infantil','Kids soccer','Por mes','Monthly',55,90],['clases','Clase de música','Music class','Por mes','Monthly',65,45],['clases','Tutoría infantil','Kids tutoring','Por hora','Per hour',25,60],['fiestas','Paquete de fiesta','Party package','Hasta 20 niños','Up to 20 kids',350,180],['fiestas','Fotografía infantil','Kids photography','Sesión','Session',120,60],['fiestas','Show infantil','Kids show','Payaso/botarga','Clown/mascot',200,90],['cuidado','Campamento (semana)','Camp (week)','Verano','Summer',180,2400],['clases','Terapia infantil','Child therapy','Por sesión','Per session',90,50]],
    products:[['prod','Ropa infantil','Kids clothing','Varias tallas','Various sizes',18],['prod','Juguete educativo','Educational toy','3+ años','Ages 3+',22],['prod','Mochila escolar','School backpack','Con diseño','With design',25]]},
  Sports:{rubro:'services',token:'sport',hrs:HRS_SVC,tile:['#E3F5EA','#D6EFDF'], alsoRental:true,
    cats:[['gym','Gimnasio','Gym'],['clases','Clases','Classes'],['deportes','Deportes','Sports']],
    names:['Gimnasio Fuerza','CrossFit Latino','Estudio de Yoga','Zumba con Ritmo','Academia de Boxeo','Artes Marciales Dragón','Liga de Fútbol','Entrenador Personal','Spinning Studio'],
    items:[['gym','Membresía mensual','Monthly membership','Acceso completo','Full access',40,30],['gym','Pase diario','Day pass','Un día','One day',12,30],['gym','Entrenador personal','Personal trainer','Por sesión','Per session',50,60],['clases','Clase de yoga','Yoga class','Por clase','Per class',15,60],['clases','Zumba','Zumba','Por clase','Per class',12,60],['clases','Spinning','Spinning','Por clase','Per class',15,45],['clases','Boxeo','Boxing','Por clase','Per class',18,60],['deportes','Liga de fútbol','Soccer league','Por temporada','Per season',120,90],['deportes','Renta de cancha','Field rental','Por hora','Per hour',80,60],['deportes','Artes marciales','Martial arts','Por mes','Monthly',75,60],['clases','Pilates','Pilates','Por clase','Per class',18,55],['gym','Membresía familiar','Family membership','Hasta 4','Up to 4',90,30]],
    rental:[['rental','Renta de cancha (hora)','Field rental (hr)','Fútbol 7','7-a-side',80,'general']]},
  // RENTAL category
  Party:{rubro:'rental',token:'party',hrs:HRS_SVC,tile:['#EFEBFF','#E5DEF9'], alsoServices:true, addons:A_RENT,
    cats:[['inflables','Inflables','Bounce'],['mobiliario','Mobiliario','Furniture'],['sonido','Sonido','Sound']],
    names:['Renta El Festejo','Inflables Diversión','Salón La Bendición','Sonido y Luces DJ','Carpas y Toldos','Mesas y Sillas Pro','Vajilla Elegante','Brincolines Fiesta','Decoración Encanto'],
    items:[['inflables','Brincolín grande','Large bounce house','Todo el día','All day',150,'general'],['inflables','Inflable con resbaladilla','Slide bouncer','Todo el día','All day',220,'general'],['inflables','Casa de pelotas','Ball pit','Todo el día','All day',120,'general'],['mobiliario','Mesa redonda','Round table','Por día','Per day',12,'general'],['mobiliario','Silla plegable','Folding chair','Por día','Per day',2,'general'],['mobiliario','Mesa larga','Long table','Por día','Per day',15,'general'],['mobiliario','Carpa 10x20','Tent 10x20','Por día','Per day',180,'general'],['sonido','Bocina y micrófono','Speaker & mic','Por día','Per day',90,'general'],['sonido','Luces de fiesta','Party lights','Por día','Per day',70,'general'],['sonido','Paquete DJ','DJ package','4 horas','4 hours',400,'general'],['mobiliario','Vajilla (100)','Tableware (100)','Por día','Per day',120,'general'],['inflables','Máquina de algodón','Cotton candy machine','Por día','Per day',80,'general']],
    depMap:{ 'Brincolín grande':100,'Inflable con resbaladilla':150,'Carpa 10x20':200,'Paquete DJ':200,'Bocina y micrófono':80,'Vajilla (100)':200 },
    services:[['svc','Servicio de meseros','Waitstaff','Por persona/evento','Per server',150,'general']]},
  // PRODUCTS categories
  Grocery:{rubro:'products',token:'groc',hrs:HRS_SHOP,tile:['#E3F5EA','#D6EFDF'],
    cats:[['abarrotes','Abarrotes','Grocery'],['carnes','Carnes','Meat'],['frescos','Frescos','Fresh']],
    names:['Supermercado La Latina','Carnicería El Buen Corte','Tortillería La Fresca','Frutería del Valle','Abarrotes Mi Tierra','Cremería Doña Rosa','Panadería La Espiga','Hierbería Natural','Licorería El Barril'],
    items:[['abarrotes','Frijol pinto (2lb)','Pinto beans (2lb)','Bolsa','Bag',3.99],['abarrotes','Arroz (5lb)','Rice (5lb)','Bolsa','Bag',5.49],['abarrotes','Maseca (4lb)','Corn masa (4lb)','Para tortillas','For tortillas',4.29],['abarrotes','Aceite (1L)','Oil (1L)','Vegetal','Vegetable',4.99],['carnes','Bistec de res (lb)','Beef steak (lb)','Fresco','Fresh',6.99],['carnes','Pollo entero (lb)','Whole chicken (lb)','Fresco','Fresh',1.99],['carnes','Carne molida (lb)','Ground beef (lb)','80/20','80/20',5.49],['carnes','Chorizo (lb)','Chorizo (lb)','Casero','House-made',5.99],['frescos','Aguacate (c/u)','Avocado (each)','Hass','Hass',1.25],['frescos','Tomate (lb)','Tomato (lb)','Fresco','Fresh',1.49],['frescos','Cilantro (manojo)','Cilantro (bunch)','Fresco','Fresh',0.99],['frescos','Chile jalapeño (lb)','Jalapeño (lb)','Fresco','Fresh',1.79]]},
  Shops:{rubro:'products',token:'shop',hrs:HRS_SHOP,tile:['#E4ECFB','#D7E5F6'], variants:OPT_SET,
    cats:[['ropa','Ropa','Clothing'],['calzado','Calzado','Shoes'],['accesorios','Accesorios','Accessories']],
    names:['Boutique Elegancia','Ropa Vaquera El Rancho','Zapatería El Paso','Joyería Brillo','Electrónica Digital','Muebles del Hogar','Regalos y Detalles','Botas Charras','Perfumería Aroma'],
    items:[['ropa','Camisa vaquera','Western shirt','Bordada','Embroidered',39.99],['ropa','Vestido de fiesta','Party dress','Varios colores','Various colors',59.99],['ropa','Playera','T-shirt','Algodón','Cotton',15.99],['ropa','Chamarra','Jacket','Mezclilla','Denim',49.99],['calzado','Botas vaqueras','Cowboy boots','Piel','Leather',129.99],['calzado','Tenis','Sneakers','Deportivos','Athletic',54.99],['calzado','Zapatos de vestir','Dress shoes','Formal','Formal',69.99],['accesorios','Cinturón piteado','Tooled belt','Piel','Leather',45.0],['accesorios','Sombrero','Hat','Varias tallas','Various sizes',59.99],['accesorios','Cadena de plata','Silver chain','925','925',89.99],['accesorios','Perfume','Perfume','Importado','Imported',49.99],['ropa','Pantalón','Pants','Mezclilla','Denim',34.99]]},
  // EVENTS/DISPLAY category
  Churches:{rubro:'events',token:'church',hrs:HRS_SVC,tile:['#EFEBFF','#E5DEF9'],
    cats:[['servicios','Servicios','Services']],
    names:['Iglesia Católica San José','Iglesia Cristiana Vida','Ministerio Getsemaní','Templo El Redentor','Iglesia Pentecostal Fe','Casa de Oración','Iglesia Evangélica Luz','Comunidad de Fe','Parroquia Guadalupe'],
    items:[]},
};

function bizName(t, city, ci, paid){ const base = t.names[ci % t.names.length]; return `${base}${paid?'':' Express'} ${city.code==='bx'?'Bronx':'Hazleton'}`; }

function emitCategory(catId){
  const t = T[catId];
  if(!t){ throw new Error('unknown cat '+catId); }
  const subs = SUBS[catId];
  for(const C of CITIES){
    let idx=0;
    for(const paid of [true,false].flatMap(p=>Array(9).fill(p))){
      const letter = letters[idx];
      const email = `${letter}@${t.token}${C.tag}.com`;
      const conceptI = idx % 9;
      const name = bizName(t, C, conceptI, paid);
      const tier = paid ? (idx%3===0?'premium':'verified') : 'free';
      const slug = `${C.code}-${t.token}-${paid?'p':'f'}${idx}`;
      const sub = subs[idx % subs.length];
      const st = C.streets[idx % C.streets.length];
      const addr = `${100+idx*11} ${st}`;
      const phone = `(${C.ac}) 555-${String(2000+idx).slice(-4)}`;
      const lat = C.lat + Math.sin(idx*1.7+(C.code==='bx'?1:0))*0.013;
      const lng = C.lng + Math.cos(idx*2.3+(C.code==='bx'?1:0))*0.013;
      const priceLvl = ['$','$$','$$$'][idx%3];
      // modules + config
      let modules={menu:false,services:false,bookings:false,products:false,rental:false,events:false,updates:false,staff:false};
      let cfgCol=null, cfg=null;
      const items=[];
      if(t.rubro==='menu'){ modules.menu=true; cfgCol='menu_config'; cfg=menuCfg(t.cats,paid,t.mods);
        t.items.forEach((it,i)=>items.push({kind:'menu',section:it[0],name:it[1],price:it[5],descEs:it[3],attrs:{en:it[2],descEn:it[4],mods:paid?(it[6]||[]):[],popular:i<3,isNew:i>=t.items.length-2}})); }
      else if(t.rubro==='services'){ modules.services=true; modules.bookings=paid; cfgCol='service_config';
        cfg=svcCfg(t.cats,paid,A_SVC,paid?[{id:'p1',name:'Ana',tagEs:'Especialista',tagEn:'Specialist',color:'#7B61FF',active:true},{id:'p2',name:'Luis',tagEs:'Senior',tagEn:'Senior',color:'#1F9D57',active:true}]:[], idx%2===0);
        t.items.forEach((it,i)=>items.push({kind:'service',section:it[0],name:it[1],price:it[5],descEs:it[3],attrs:{en:it[2],descEn:it[4],durationMin:it[6]||45,addons:paid?['a1','a2']:[],popular:i<3}})); }
      else if(t.rubro==='products'){ modules.products=true; cfgCol='product_config'; cfg=prodCfg(t.cats,paid,t.variants||[]);
        t.items.forEach((it,i)=>items.push({kind:'product',section:it[0],name:it[1],price:it[5],descEs:it[3],attrs:{en:it[2],descEn:it[4],stock:'in',optionSets:(t.variants&&it[0]==='ropa')?['talla','color']:[],popular:i<3}})); }
      else if(t.rubro==='rental'){ modules.rental=true; cfgCol='rental_config'; cfg=rentCfg(t.cats,paid,t.addons);
        t.items.forEach((it,i)=>{const dep=(t.depMap&&t.depMap[it[1]])||0; items.push({kind:'rental',section:it[6]||'general',name:it[1],price:it[5],descEs:it[3],attrs:{nameEn:it[2],descEn:it[4],day:it[5],week:Math.round(it[5]*5),hour:null,dep,stock:3,out:0,addons:paid?['r1','r2']:[],tile:t.tile[0]}});}); }
      else if(t.rubro==='events'){ modules.events=true; modules.updates=true; } // churches: display + events
      // secondary modules
      if(paid){ modules.updates=true; modules.staff=true; if(t.rubro!=='menu'&&t.rubro!=='events') modules.events=true; }
      if(t.alsoProducts&&paid){ modules.products=true; }
      if(t.alsoServices&&paid){ modules.services=true; modules.bookings=true; }
      if(t.alsoRental&&paid){ modules.rental=true; }
      // owner + business
      P(`select public._seed_user(${q(email)}, ${q('Dueño '+name.split(' ').slice(0,2).join(' '))}, ${q((name.match(/[A-Z]/g)||['T','L']).slice(0,2).join(''))}, '#7B61FF', ${q(C.city)}, ${lat}, ${lng});`);
      const settings = (t.rubro==='menu'&&paid) ? {shipping:{delivery:{on:idx%2===0,fee:'3.99'}},delivery_ops:{minOrder:'15'},tips:{on:true,minOrder:0}} : {};
      const acceptsMsg = paid && idx%2===1;
      const cols=['slug','name','category_id','tier','price_level','about_es','about_en','specialty_es','specialty_en','address','city','phone','is_open','photo_seed','tile_a','tile_b','subcategories','owner_id','features','hours','modules','settings','location','timezone','connect_charges_enabled','accepts_messages','message_channel','message_phone'];
      const vals=[q(slug),q(name),q(catId),q(tier),q(priceLvl),
        q('En '+name.split(' Bronx')[0].split(' Hazleton')[0]+' ofrecemos '+sub.toLowerCase()+' con calidad y trato en español.'),
        q(sub+' with quality and Spanish-speaking service.'),
        q('Especialidad · '+sub), q('Specialty · '+sub),
        q(addr), q(C.city), q(phone), 'true', q('tolatino'), q(t.tile[0]), q(t.tile[1]),
        `array[${q(sub)}]::text[]`, `(select id from auth.users where email=${q(email)})`,
        `array['Se habla español','Estacionamiento']::text[]`, J(t.hrs), J(modules), J(settings),
        geo(lat,lng), q(C.tz), 'false', acceptsMsg?'true':'false', acceptsMsg?q('whatsapp'):'null', acceptsMsg?q(phone):'null'];
      if(cfgCol){ cols.push(cfgCol); vals.push(J(cfg)); }
      P(`insert into public.businesses (${cols.join(',')}) values (${vals.join(',')}) on conflict (slug) do nothing;`);
      // items
      items.forEach((it,i)=>P(`insert into public.business_items (business_id,kind,name,description,price,section,available,sort,attrs) values ((select id from businesses where slug=${q(slug)}),${q(it.kind)},${q(it.name)},${q(it.descEs)},${it.price},${q(it.section)},true,${i},${J(it.attrs)});`));
      // also-products for services categories
      if(t.alsoProducts&&paid&&t.products){ t.products.forEach((pr,i)=>P(`insert into public.business_items (business_id,kind,name,description,price,section,available,sort,attrs) values ((select id from businesses where slug=${q(slug)}),'product',${q(pr[1])},${q(pr[3])},${pr[5]},'prod',true,${i},${J({en:pr[2],descEn:pr[4],stock:'in'})});`));
        // add product_config so Tienda shows
        P(`update businesses set product_config=${J(prodCfg([['prod','Productos','Products']],true,[]))} where slug=${q(slug)};`); }
      if(t.alsoServices&&paid&&t.services){ t.services.forEach((sv,i)=>P(`insert into public.business_items (business_id,kind,name,description,price,section,available,sort,attrs) values ((select id from businesses where slug=${q(slug)}),'service',${q(sv[1])},${q(sv[3])},${sv[5]},'general',true,${i},${J({en:sv[2],descEn:sv[4],durationMin:60})});`));
        P(`update businesses set service_config=${J(svcCfg([['general','Servicios','Services']],true,A_SVC,[],false))} where slug=${q(slug)};`); }
      if(t.alsoRental&&paid&&t.rental){ t.rental.forEach((rt,i)=>P(`insert into public.business_items (business_id,kind,name,description,price,section,available,sort,attrs) values ((select id from businesses where slug=${q(slug)}),'rental',${q(rt[1])},${q(rt[3])},${rt[5]},'general',true,${i},${J({nameEn:rt[2],descEn:rt[4],day:rt[5],dep:50,stock:2,out:0})});`));
        P(`update businesses set rental_config=${J(rentCfg([['general','Renta','Rental']],true,A_RENT))} where slug=${q(slug)};`); }
      // reviews (same-city users)
      const nrev = paid ? (5+idx%4) : (3+idx%3);
      for(let r=0;r<nrev;r++){ const un=((r+idx)%9)+1; const rating=(r%7===0)?4:5; const b=REVIEWS[(r+idx)%REVIEWS.length];
        P(`insert into public.reviews (business_id,author_name,author_initials,rating,body_es,body_en,featured,user_id) select b.id,p.display_name,p.initials,${rating},${q(b[0])},${q(b[1])},${r===0},p.id from businesses b, profiles p where b.slug=${q(slug)} and p.id=(select id from auth.users where email=${q(un+'@'+C.tag+'.com')}) on conflict (business_id,user_id) do nothing;`); }
      // endorsements ("recomendados")
      const nend = paid ? (4+idx%5) : (1+idx%3);
      for(let e=0;e<nend;e++){ const un=((e+idx*2)%9)+1;
        P(`insert into public.business_endorsements (business_id,user_id,note) select b.id,(select id from auth.users where email=${q(un+'@'+C.tag+'.com')}),${q(ENDORSE[(e+idx)%ENDORSE.length])} from businesses b where b.slug=${q(slug)} on conflict do nothing;`); }
      // staff + updates (paid)
      if(paid){ ['Gerente','Recepción','Especialista','Asistente'].forEach((ti,i)=>P(`insert into public.business_staff (business_id,name,role,title_es,title_en,invited) values ((select id from businesses where slug=${q(slug)}),${q(['Roberto G.','María C.','Luis R.','Ana S.'][i])},${q(i===0?'manager':'staff')},${q(ti)},${q(['Manager','Front desk','Specialist','Assistant'][i])},false);`));
        P(`insert into public.business_updates (business_id,kind,body_es,body_en,status) values ((select id from businesses where slug=${q(slug)}),'offer',${q('¡Promoción de apertura! Pregunta por AMIGO10.')},${q('Opening promo! Ask for AMIGO10.')},'live');`);
        P(`insert into public.business_updates (business_id,kind,body_es,body_en,status) values ((select id from businesses where slug=${q(slug)}),'news',${q('Ya estamos abiertos y atendiendo en español. ¡Los esperamos!')},${q('Now open, serving in Spanish. Come by!')},'live');`);
      }
      idx++;
    }
  }
}

// EXTRAS: events (with tiers + promo) + community posts
function emitExtras(){
  for(const C of CITIES){
    // 3 events per city, owned by existing seeded owners (party/night/church)
    const evs=[
      {slug:`${C.code}-ev-baile`, title:'Noche de Baile Latino', ven:'Salón La Bendición', cat:'musica', owner:`a@party${C.tag}.com`, tiers:[['General',15,200],['VIP',35,40]], promo:['BAILE20','percent',20]},
      {slug:`${C.code}-ev-pulga`, title:'Pulga Comunitaria', ven:'Parque Central', cat:'mercado', owner:`b@party${C.tag}.com`, tiers:[['Entrada',0,null]], promo:null},
      {slug:`${C.code}-ev-festival`, title:'Festival de la Comida', ven:'Plaza del Pueblo', cat:'comida', owner:`a@food${C.tag}.com`, tiers:[['General',10,300],['Familiar',25,100]], promo:['FAMILIA15','percent',15]},
    ];
    for(const e of evs){
      const lat=C.lat+ (Math.random?0:0); // deterministic-ish
      P(`insert into public.events (slug,title_es,title_en,venue_es,venue_en,cat,city,starts_at,ends_at,time_label_es,time_label_en,price_label,desc_es,desc_en,tile_a,tile_b,location,owner_id,status)
values (${q(e.slug)},${q(e.title)},${q(e.title)},${q(e.ven)},${q(e.ven)},${q(e.cat)},${q(C.city)}, now()+interval '20 days', now()+interval '20 days'+interval '4 hours','Sáb · 7:00 pm','Sat · 7:00 pm',${e.tiers[0][1]>0?q('$'+e.tiers[0][1]):'null'},
${q('Evento comunitario para toda la familia. ¡Música, comida y diversión!')},${q('Community event for the whole family. Music, food and fun!')},'#E5DEF9','#D9CEF3',
${geo(C.lat+0.01,C.lng+0.01)},(select id from auth.users where email=${q(e.owner)}),'published') on conflict (slug) do nothing;`);
      e.tiers.forEach((ti,i)=>P(`insert into public.event_tiers (event_id,name_es,name_en,price,capacity,sort,visible) select id,${q(ti[0])},${q(ti[0])},${ti[1]},${ti[2]==null?'null':ti[2]},${i},true from events where slug=${q(e.slug)};`));
      if(e.promo) P(`insert into public.event_promo_codes (event_id,code,kind,value,active) select id,${q(e.promo[0])},${q(e.promo[1])},${e.promo[2]},true from events where slug=${q(e.slug)};`);
    }
    // community posts by regular users
    const posts=[
      ['rec','¿Ya probaron los tacos al pastor por aquí? ¡Increíbles! 🌮','Have you tried the al pastor tacos around here? Amazing! 🌮',1],
      ['ask','¿Alguien recomienda un buen mecánico que no cobre de más? 🚗','Anyone recommend a good honest mechanic? 🚗',2],
      ['ask','Busco salón para cortarme el cabello este fin, ¿ideas? 💇','Looking for a salon this weekend, ideas? 💇',3],
      ['local','Mañana hay pulga comunitaria en el parque, ¡lleven efectivo! ☀️','Community flea market at the park tomorrow, bring cash! ☀️',4],
      ['rec','La panadería nueva tiene un pan dulce buenísimo 🥐','The new bakery has amazing pan dulce 🥐',5],
      ['poll','¿Cuál es la mejor comida latina del área?','What’s the best Latino food around here?',6],
      ['ask','¿Dónde puedo tomar clases de inglés (ESL) económicas?','Where can I take affordable English (ESL) classes?',7],
      ['local','Se renta salón para quinceañeras, muy bonito 🎉','Quinceañera hall for rent, very nice 🎉',8],
    ];
    posts.forEach((p,i)=>{
      const un=(i%9)+1; const isPoll=p[0]==='poll';
      P(`insert into public.posts (type,author_name,author_initials,author_color,hood,city,body_es,body_en,poll_options,poll_votes,author_id,lat,lng)
select ${q(p[0])},pr.display_name,pr.initials,pr.avatar_color,${q(C.code==='bx'?'The Bronx':'Downtown')},${q(C.city)},${q(p[1])},${q(p[2])},
${isPoll?q(JSON.stringify(['Tacos','Pupusas','Mofongo','Arepas']))+'::jsonb':'null'},${isPoll?q(JSON.stringify([24,18,15,12]))+'::jsonb':'null'},
pr.id, ${C.lat}+${(i-4)*0.002}, ${C.lng}+${(i-4)*0.002} from profiles pr where pr.id=(select id from auth.users where email=${q(un+'@'+C.tag+'.com')});`);
    });
  }
}

// subcategory lists (es) per category — distinct subcat per business
const SUBS = {
  FoodDrinks:['Taquería','Mariscos','Pupusería','Dominicana','Pollo asado','Panadería','Pizza','Colombiana','Cafetería','Antojitos','Cubana','Peruana','Venezolana','Comida rápida','Desayunos','Heladería','Jugos y licuados','Comida saludable'],
  NightLife:['Bar','Cantina','Bar deportivo','Cervecería','Discoteca','Antro','Salón de baile','Karaoke','Billar','Lounge','Terraza','Música en vivo','Hookah','Bar de vinos','Mezcalería','Pulquería','Bar','Cantina'],
  BeautyHealth:['Salón de belleza','Barbería','Estilista','Uñas','Tinte y color','Pestañas','Cejas','Maquillaje','Spa','Masajes','Faciales','Depilación','Microblading','Trenzas','Manicure y pedicure','Barbería','Salón de belleza','Uñas'],
  HealthMedicine:['Clínica','Médico general','Dentista','Farmacia','Óptica','Pediatra','Ginecólogo','Quiropráctico','Fisioterapia','Psicólogo','Nutriólogo','Laboratorio','Vacunas','Dermatólogo','Terapia / consejería','Clínica','Dentista','Óptica'],
  AutoServices:['Taller mecánico','Cambio de aceite','Frenos','Llantas','Alineación y balanceo','Detallado','Autolavado','Polarizado','Diagnóstico','Transmisiones','Suspensión','Eléctrico automotriz','Hojalatería y pintura','Aire acondicionado','Afinación','Taller mecánico','Llantas','Detallado'],
  HomeServices:['Plomería','Electricidad','Limpieza de casa','Jardinería','Pintura','Control de plagas','Handyman','Techos','Mudanzas','Remodelación','Aire y calefacción','Carpintería','Pisos','Lavado a presión','Cercas','Plomería','Limpieza de casa','Jardinería'],
  ProServices:['Abogado','Abogado de inmigración','Contador','Preparación de taxes','Seguros','Envío de dinero','Traducción','Notario','Reparación de crédito','Bienes raíces','Fianzas','Reparación de celulares','Diseño gráfico','Páginas web','Marketing','Abogado','Contador','Traducción'],
  Transportation:['Taxi','Transporte privado','Chofer','Aeropuerto','Mudanzas','Fletes','Mensajería','Envíos a Latinoamérica','Renta de autos','Renta de camionetas','Autobuses / charter','Grúas','Transporte escolar','Paquetería','Encomiendas','Taxi','Mudanzas','Envíos a Latinoamérica'],
  Education:['Clases de inglés (ESL)','Clases de español','Tutoría','Escuela de manejo','Manejo comercial (CDL)','Ciudadanía','Preparación GED','Música','Computación','Matemáticas','Cosmetología','Baile','Arte','Idiomas','Regularización','Clases de inglés (ESL)','Tutoría','Escuela de manejo'],
  Children:['Guardería','Preescolar','Niñera','Clases para niños','Deportes para niños','Música para niños','Fotografía infantil','Terapia infantil','Campamentos','Fiestas infantiles','Ropa infantil','Juguetes','Cuidado de niños','Baile para niños','Tutoría infantil','Guardería','Niñera','Fiestas infantiles'],
  Sports:['Gimnasio','Entrenador personal','CrossFit','Yoga','Zumba','Spinning','Boxeo','Artes marciales','Fútbol','Natación','Pilates','Baile fitness','Tenis','Ligas de fútbol','Ciclismo','Gimnasio','Yoga','Fútbol'],
  Party:['Salón de fiestas','DJ','Renta de sonido','Mariachi','Payasos','Brincolines','Renta de inflables','Renta de sillas y mesas','Renta de carpas','Renta de vajilla','Catering','Taquiza','Decoración','Globos','Fotografía','Salón de fiestas','Brincolines','DJ'],
  Grocery:['Supermercado','Carnicería','Tortillería','Frutería','Abarrotes','Cremería','Panadería','Hierbería','Licorería','Pollería','Pescadería','Tienda latina','Productos importados','Dulcería','Especias','Supermercado','Carnicería','Tortillería'],
  Shops:['Ropa','Boutique','Ropa vaquera','Botas','Zapatería','Joyería','Electrónica','Muebles','Regalos','Juguetería','Perfumería','Vestidos de quinceañera','Celulares','Artículos religiosos','Cosméticos','Ropa','Zapatería','Joyería'],
  Churches:['Iglesia católica','Iglesia cristiana','Iglesia evangélica','Iglesia pentecostal','Ministerios','Grupos juveniles','Estudio bíblico','Coro','Retiros','Consejería','Ayuda social','Banco de alimentos','Templo','Voluntariado','Bautizos','Iglesia católica','Iglesia cristiana','Ministerios'],
};

if(CAT==='EXTRAS'){ emitExtras(); } else { emitCategory(CAT); }
P('commit;');
P(`select '${CAT}' as done, (select count(*) from businesses where slug ~ '^(hz|bx)-') as total_biz;`);
console.log(out.join('\n'));
