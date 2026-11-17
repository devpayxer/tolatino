/* r2-semilla-1 · bancos de TIENDA, NOCHE, BELL, SALUD, PRO y DEPORTE por subcategoría. Línea: «es|en|dólares|(minutos|tipo)». Sin emoji; Salud sin detalle médico en texto público. */
const P = (txt, sec = "Catálogo|Catalog") => txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const [es, en, p, a, b] = l.split("|");
  return { es, en, p: Math.round(parseFloat(p) * 100), a, b, sec };
});
const secs = (o) => o;

/* ── TIENDA (shop). Tercer campo = dólares; cuarto = unidad o «serv» para servicios. ── */
export const TIENDA = {
  "NEG-TIENDA-01": P(`Blusa de algodón|Cotton blouse|24.99
Vestido casual|Casual dress|39.99
Jeans de mujer|Women's jeans|34.99
Falda larga|Long skirt|29.99
Chaqueta ligera|Light jacket|44.99
Suéter tejido|Knit sweater|32.99
Pijama de dos piezas|Two-piece pajamas|22.99
Leggings deportivos|Athletic leggings|19.99
Bufanda de invierno|Winter scarf|14.99
Cinturón de cuero|Leather belt|16.99
Vestido de fiesta|Party dress|79.99
Conjunto deportivo|Athletic set|36.99`, "Ropa|Clothing"),
  "NEG-TIENDA-02": P(`Camisa de vestir|Dress shirt|34.99
Camisa guayabera|Guayabera shirt|39.99
Jeans de hombre|Men's jeans|36.99
Pantalón de vestir|Dress pants|42.99
Playera de algodón|Cotton tee|12.99
Chaqueta de cuero sintético|Faux leather jacket|69.99
Sudadera con capucha|Hoodie|34.99
Shorts deportivos|Athletic shorts|17.99
Cinturón de cuero|Leather belt|18.99
Gorra de beisbol|Baseball cap|14.99
Calcetines (6 pares)|Socks (6 pairs)|12.99
Traje de dos piezas|Two-piece suit|149.99`, "Ropa|Clothing"),
  "NEG-TIENDA-04": P(`Vestido de quinceañera|Quinceañera gown|399.00
Vestido de novia sencillo|Simple wedding gown|499.00
Vestido de dama de honor|Bridesmaid dress|129.00
Corona y accesorios de quince|Quince crown and accessories|45.00
Zapatillas de fiesta|Party heels|59.00
Vestido de primera comunión|First communion dress|89.00
Velo de novia|Bridal veil|49.00
Guantes de gala|Formal gloves|18.00
Arreglo de talle y largo|Hem and waist alteration|60.00|serv
Prueba y ajuste de vestido|Gown fitting and adjustment|35.00|serv`, "Vestidos|Gowns"),
  "NEG-TIENDA-07": P(`Zapato de vestir de hombre|Men's dress shoe|69.99
Zapato casual de mujer|Women's casual shoe|54.99
Botas de trabajo|Work boots|89.99
Sandalias de cuero|Leather sandals|34.99
Botines de mujer|Women's ankle boots|64.99
Zapato escolar|School shoe|39.99
Tenis de caminar|Walking sneakers|59.99
Chancletas|Flip-flops|12.99
Plantillas ortopédicas|Orthotic insoles|19.99
Limpiador y betún|Polish and cleaner|8.99
Cordones (3 pares)|Shoelaces (3 pairs)|5.99`, "Calzado|Footwear"),
  "NEG-TIENDA-08": P(`Tenis urbanos de edición limitada|Limited edition sneakers|129.99
Tenis de correr|Running sneakers|89.99
Sudadera de marca|Brand hoodie|59.99
Gorra plana|Snapback cap|29.99
Pantalón jogger|Jogger pants|44.99
Playera gráfica|Graphic tee|24.99
Mochila urbana|Urban backpack|39.99
Calcetas deportivas (3)|Sport socks (3)|14.99
Cadena de acero|Steel chain|24.99
Limpiador de tenis|Sneaker cleaner|11.99`, "Calzado y ropa|Footwear and apparel"),
  "NEG-TIENDA-11": P(`Dobladillo de pantalón|Pants hem|12.00|serv
Ajuste de cintura|Waist adjustment|18.00|serv
Cambio de cierre|Zipper replacement|15.00|serv
Arreglo de vestido|Dress alteration|35.00|serv
Acortar mangas de saco|Shorten jacket sleeves|28.00|serv
Parche y remiendo|Patch and mend|10.00|serv
Ajuste de traje completo|Full suit tailoring|75.00|serv
Bordado de nombre o logo|Name or logo embroidery|20.00|serv
Confección de uniforme|Uniform making|45.00|serv`, "Arreglos|Alterations"),
  "NEG-TIENDA-13": P(`Lavado y doblado (por libra)|Wash and fold (per lb)|1.69|lb
Lavado de edredón|Comforter wash|22.00|serv
Tintorería de saco|Suit dry cleaning|12.00|serv
Tintorería de vestido|Dress dry cleaning|15.00|serv
Lavado de camisas (por pieza)|Shirt laundering (each)|2.50|serv
Planchado (por pieza)|Pressing (each)|2.00|serv
Recogida y entrega a domicilio|Pickup and delivery|6.00|serv
Servicio exprés el mismo día|Same-day express|8.00|serv
Detergente y suavizante|Detergent and softener|3.50`, "Lavandería|Laundry"),
  "NEG-TIENDA-14": P(`Cadena de oro 14k|14k gold chain|189.00
Aretes de plata|Silver earrings|39.00
Pulsera de plata|Silver bracelet|49.00
Anillo de compromiso|Engagement ring|450.00
Argollas de matrimonio (par)|Wedding bands (pair)|320.00
Medalla religiosa de oro|Gold religious medal|120.00
Reloj de pulsera|Wristwatch|79.00
Collar con inicial|Initial necklace|59.00
Limpieza de joyas|Jewelry cleaning|10.00|serv
Reparación de cadena|Chain repair|25.00|serv`, "Joyería|Jewelry"),
  "NEG-TIENDA-17": P(`Jeans usados (cada uno)|Used jeans (each)|8.00
Chaqueta de invierno usada|Used winter coat|18.00
Vestido usado|Used dress|9.00
Camisa de vestir usada|Used dress shirt|6.00
Zapatos usados|Used shoes|10.00
Ropa de niño (bolsa)|Kids clothes (bag)|15.00
Suéter usado|Used sweater|7.00
Bolso de mano|Handbag|12.00
Abrigo de lana|Wool coat|25.00
Ropa de cama (juego)|Bed linens (set)|14.00`, "Ropa de segunda|Secondhand"),
  "NEG-TIENDA-19": P(`Guitarra acústica|Acoustic guitar|120.00
Herramientas eléctricas (juego)|Power tool set|85.00
Televisor de 40 pulgadas|40-inch TV|130.00
Consola de videojuegos|Game console|180.00
Laptop reacondicionada|Refurbished laptop|220.00
Cadena de oro usada|Used gold chain|150.00
Bicicleta de montaña|Mountain bike|110.00
Teléfono desbloqueado|Unlocked phone|140.00
Bocina bluetooth|Bluetooth speaker|35.00
Anillo usado|Used ring|90.00`, "Artículos|Items"),
  "NEG-TIENDA-20": P(`Sofá de tres plazas|Three-seat sofa|649.00
Juego de comedor de seis sillas|Six-chair dining set|799.00
Cama matrimonial con colchón|Queen bed with mattress|599.00
Mesa de centro|Coffee table|149.00
Cómoda de cinco gavetas|Five-drawer dresser|329.00
Escritorio de oficina|Office desk|199.00
Librero de cuatro estantes|Four-shelf bookcase|119.00
Closet de dos puertas|Two-door wardrobe|279.00
Mesa de noche (par)|Nightstands (pair)|129.00
Entrega y armado|Delivery and assembly|60.00|serv`, "Muebles|Furniture"),
  "NEG-TIENDA-22": P(`Espejo decorativo|Decorative mirror|59.00
Juego de cortinas|Curtain set|39.00
Cojines decorativos (par)|Decorative pillows (pair)|24.00
Lámpara de mesa|Table lamp|34.00
Cuadro enmarcado|Framed art|45.00
Alfombra de 5 x 7 pies|5 x 7 ft rug|99.00
Florero de cerámica|Ceramic vase|22.00
Velas aromáticas (3)|Scented candles (3)|18.00
Manteles de mesa|Table linens|27.00
Reloj de pared|Wall clock|29.00`, "Decoración|Decor"),
  "NEG-TIENDA-24": P(`Refrigerador de 18 pies|18 cu ft refrigerator|699.00
Lavadora de carga frontal|Front-load washer|549.00
Secadora eléctrica|Electric dryer|499.00
Estufa de gas|Gas range|449.00
Microondas|Microwave|99.00
Licuadora|Blender|39.00
Olla de presión eléctrica|Electric pressure cooker|79.00
Aspiradora|Vacuum cleaner|129.00
Ventilador de torre|Tower fan|59.00
Instalación y retiro del aparato viejo|Installation and haul-away|75.00|serv`, "Electrodomésticos|Appliances"),
  "NEG-TIENDA-26": P(`Plan de celular ilimitado|Unlimited phone plan|35.00|plan
Plan prepago mensual|Monthly prepaid plan|25.00|plan
Recarga internacional|International top-up|10.00
Funda protectora|Protective case|12.00
Protector de pantalla|Screen protector|9.00
Cargador rápido|Fast charger|19.00
Audífonos inalámbricos|Wireless earbuds|29.00
Teléfono desbloqueado de gama media|Mid-range unlocked phone|249.00
Cambio de pantalla|Screen replacement|89.00|serv
Desbloqueo de teléfono|Phone unlocking|25.00|serv`, "Celulares|Phones"),
  "NEG-TIENDA-27": P(`Laptop de 15 pulgadas|15-inch laptop|449.00
Computadora de escritorio|Desktop computer|399.00
Monitor de 24 pulgadas|24-inch monitor|119.00
Teclado y mouse inalámbricos|Wireless keyboard and mouse|29.00
Impresora multifunción|All-in-one printer|89.00
Disco duro externo 1 TB|1 TB external drive|59.00
Cable HDMI|HDMI cable|9.00
Mochila para laptop|Laptop backpack|35.00
Limpieza y mantenimiento|Cleaning and tune-up|49.00|serv
Reparación de computadora|Computer repair|59.00|serv`, "Computadoras|Computers"),
  "NEG-TIENDA-29": P(`Guitarra acústica de estudio|Student acoustic guitar|139.00
Teclado de 61 teclas|61-key keyboard|179.00
Bongós|Bongos|89.00
Güiro|Güiro|24.00
Maracas (par)|Maracas (pair)|18.00
Cuatro puertorriqueño|Puerto Rican cuatro|169.00
Cuerdas de guitarra|Guitar strings|9.00
Afinador digital|Digital tuner|14.00
Cable para instrumento|Instrument cable|12.00
Clases de guitarra (4 sesiones)|Guitar lessons (4 sessions)|120.00|serv`, "Instrumentos|Instruments"),
  "NEG-TIENDA-31": P(`Bicicleta de montaña|Mountain bike|329.00
Bicicleta urbana|City bike|279.00
Bicicleta para niño|Kids bike|139.00
Casco|Helmet|29.00
Candado de cadena|Chain lock|24.00
Luces delantera y trasera|Front and rear lights|19.00
Cámara de repuesto|Spare tube|8.00
Ajuste y afinación|Tune-up|55.00|serv
Cambio de llanta|Tire change|20.00|serv
Bomba de aire de piso|Floor pump|22.00`, "Bicicletas|Bicycles"),
  "NEG-TIENDA-32": P(`Muñeca clásica|Classic doll|19.00
Carrito de control remoto|Remote control car|29.00
Rompecabezas de 500 piezas|500-piece puzzle|14.00
Juego de bloques|Building block set|24.00
Juego de mesa familiar|Family board game|22.00
Pelota de fútbol|Soccer ball|15.00
Set de arte para niños|Kids art set|18.00
Peluche mediano|Medium plush toy|16.00
Bicicleta de equilibrio|Balance bike|49.00
Lotería mexicana|Mexican loteria game|12.00`, "Juguetes|Toys"),
  "NEG-TIENDA-35": P(`Ramo de rosas (docena)|Dozen roses|55.00
Arreglo de girasoles|Sunflower arrangement|39.00
Ramo de flores mixtas|Mixed bouquet|35.00
Centro de mesa|Table centerpiece|45.00
Corona fúnebre|Funeral wreath|95.00
Ramo de novia|Bridal bouquet|120.00
Planta de interior|Indoor plant|18.00
Globo con mensaje|Message balloon|8.00
Caja de chocolates|Chocolate box|14.00
Entrega el mismo día|Same-day delivery|10.00|serv`, "Flores|Flowers"),
  "NEG-TIENDA-37": P(`Biblia de estudio|Study Bible|29.00
Rosario de madera|Wooden rosary|8.00
Imagen de la Virgen 12 pulgadas|Virgin statue 12 in|39.00
Vela votiva (caja)|Votive candles (box)|18.00
Crucifijo de pared|Wall crucifix|15.00
Medalla bendecida|Blessed medal|9.00
Libro de oraciones|Prayer book|12.00
Vestido de primera comunión|First communion dress|79.00
Incienso e incensario|Incense and burner|16.00
Tarjetas de oración (paquete)|Prayer cards (pack)|6.00`, "Artículos religiosos|Religious goods"),
  "NEG-TIENDA-38": P(`Champú para rizos|Curl shampoo|12.00
Acondicionador sin sulfato|Sulfate-free conditioner|12.00
Crema para peinar|Styling cream|10.00
Aceite de coco|Coconut oil|9.00
Tinte para el cabello|Hair color|8.00
Esmalte de uñas|Nail polish|5.00
Set de brochas|Brush set|22.00
Base de maquillaje|Foundation|14.00
Mascarilla capilar|Hair mask|15.00
Gel fijador|Styling gel|7.00`, "Belleza|Beauty"),
  "NEG-TIENDA-39": P(`Martillo de 16 oz|16 oz hammer|14.00
Juego de destornilladores|Screwdriver set|19.00
Taladro inalámbrico|Cordless drill|79.00
Cinta métrica 25 pies|25 ft tape measure|9.00
Pintura blanca (galón)|White paint (gallon)|32.00
Brocha y rodillo|Brush and roller set|15.00
Cables de extensión|Extension cord|16.00
Llave inglesa ajustable|Adjustable wrench|12.00
Tornillos surtidos (caja)|Assorted screws (box)|11.00
Corte de llaves|Key cutting|3.00|serv`, "Ferretería|Hardware"),
  "NEG-TIENDA-41": P(`Saco de cemento 94 lb|94 lb cement bag|14.00
Tablón de pino 2x4x8|2x4x8 pine stud|6.00
Hoja de panel de yeso|Drywall sheet|15.00
Bloques de concreto|Concrete blocks|2.50
Arena (por bolsa)|Sand (per bag)|5.50
Rollo de aislante|Insulation roll|45.00
Tubo de PVC 10 pies|10 ft PVC pipe|9.00
Clavos 5 lb|5 lb nails|12.00
Entrega al sitio de trabajo|Job-site delivery|75.00|serv
Corte de madera a medida|Custom wood cutting|10.00|serv`, "Materiales|Materials"),
  "NEG-TIENDA-43": P(`Filtro de aceite|Oil filter|8.00
Pastillas de freno delanteras|Front brake pads|39.00
Batería de auto|Car battery|129.00
Limpiaparabrisas (par)|Wiper blades (pair)|24.00
Bujías (juego)|Spark plugs (set)|28.00
Aceite sintético 5 qt|Synthetic oil 5 qt|29.00
Foco de faro|Headlight bulb|14.00
Anticongelante galón|Antifreeze gallon|15.00
Instalación de batería|Battery installation|20.00|serv
Escáner de códigos de falla|Fault code scan|25.00|serv`, "Autopartes|Auto parts"),
  "NEG-TIENDA-45": P(`Alimento para perro 15 lb|Dog food 15 lb|24.00
Alimento para gato 10 lb|Cat food 10 lb|19.00
Cama para mascota|Pet bed|29.00
Correa y collar|Leash and collar set|18.00
Jaula para pájaros|Bird cage|49.00
Pecera de 10 galones|10-gallon aquarium|59.00
Juguetes masticables|Chew toys|9.00
Arena para gato|Cat litter|12.00
Baño y corte de pelo|Grooming|40.00|serv
Transportadora|Pet carrier|35.00`, "Mascotas|Pets"),
  "NEG-TIENDA-47": P(`Cuaderno profesional|Notebook|3.00
Paquete de lápices (12)|Pencils (12)|3.50
Mochila escolar|School backpack|24.00
Libro de lectura en español|Spanish reading book|14.00
Diccionario español-inglés|Spanish-English dictionary|18.00
Carpeta y separadores|Binder and dividers|6.00
Calculadora científica|Scientific calculator|16.00
Resma de papel|Ream of paper|7.00
Fotocopias (por hoja)|Photocopies (per page)|0.15|serv
Encuadernado|Binding|5.00|serv`, "Librería|Bookstore"),
  "NEG-TIENDA-49": P(`Tela de algodón (por yarda)|Cotton fabric (per yard)|5.00|yd
Tela para vestido (por yarda)|Dress fabric (per yard)|8.00|yd
Encaje (por yarda)|Lace (per yard)|9.00|yd
Hilo (carrete)|Thread spool|1.50
Agujas surtidas|Assorted needles|3.00
Botones surtidos (bolsa)|Assorted buttons (bag)|4.00
Cierres (3)|Zippers (3)|4.50
Elástico (por yarda)|Elastic (per yard)|1.50|yd
Tijeras de costura|Sewing scissors|14.00
Cinta métrica de costura|Sewing tape measure|2.50`, "Telas y mercería|Fabric and notions"),
  "NEG-TIENDA-51": P(`Camiseta con tu diseño|Custom printed tee|19.99
Taza personalizada|Custom mug|12.99
Llavero grabado|Engraved keychain|7.99
Bandera de país (3 x 5 pies)|Country flag (3 x 5 ft)|18.99
Colgante con inicial|Initial pendant|16.99
Canasta de regalo|Gift basket|39.99
Tarjeta de regalo digital|Digital gift card|25.00
Envío a todo el país|Nationwide shipping|7.99|serv
Cojín con foto|Photo pillow|22.99
Calendario familiar|Family calendar|14.99`, "Tienda en línea|Online shop"),
  "NEG-TIENDA-52": P(`Paquete de ropa de segunda|Secondhand clothing bundle|20.00
Artesanías (cada una)|Handicrafts (each)|9.00
Fundas de celular|Phone cases|8.00
Accesorios para el cabello|Hair accessories|5.00
Gafas de sol|Sunglasses|10.00
Perfumes de imitación|Fragrance dupes|15.00
Cargadores de auto|Car chargers|9.00
Bolsos de mano|Handbags|18.00
Gorras|Caps|10.00
Pulseras tejidas|Woven bracelets|4.00`, "Vendedor móvil|Mobile vendor"),
};
export const TIENDA_DEFAULT = TIENDA["NEG-TIENDA-01"];

/* ── NOCHE: venue = noches (lista/cover/mesa/vip); no-venue = servicios por reserva. ── */
export const NOCHE_VENUE = (cover) => [
  { es: "Entrada", en: "Entry", p: cover || 500, a: "60", b: "cover", de: ["Se paga en la puerta. Lo que ves en la app es lo que pagas.", "Paid at the door. What you see in the app is what you pay."] },
  { es: "Mesa para el grupo", en: "Table for the group", p: 3000, a: "60", b: "mesa", de: ["Hasta 6 personas. Se guarda 30 minutos después de tu hora.", "Up to 6 people. Held 30 minutes after your time."] },
  { es: "Mesa en la terraza", en: "Terrace table", p: 4000, a: "60", b: "mesa", de: ["Hasta 4 personas, al aire libre.", "Up to 4 people, outdoors."] },
  { es: "Mesa para cumpleaños", en: "Birthday table", p: 6000, a: "60", b: "mesa", de: ["Hasta 12 personas, con la música que pidas.", "Up to 12 people, with the music you ask for."] },
  { es: "Mesa VIP con botella", en: "VIP table with bottle", p: 20000, a: "60", b: "vip", de: ["Hasta 8 personas, una botella de la casa y mezcladores.", "Up to 8 people, a house bottle and mixers."] },
];
export const NOCHE_SERV = {
  "NEG-NOCHE-22": P(`Promoción de tu evento (paquete básico)|Event promotion (basic package)|250.00|60|fecha
Promoción de tu evento (paquete completo)|Event promotion (full package)|600.00|60|fecha
Lista de invitados y control de puerta|Guest list and door control|180.00|60|fecha
Flyers digitales y redes|Digital flyers and social media|120.00|60|fecha
Reserva de mesas para tu grupo|Group table booking|90.00|60|fecha
Cena y fiesta para 20 personas|Dinner and party for 20|450.00|60|fecha`, "Servicios|Services"),
  "NEG-NOCHE-23": P(`DJ para fiesta (3 horas)|DJ for a party (3 hours)|350.00|180|fecha
DJ para boda (5 horas)|DJ for a wedding (5 hours)|750.00|300|fecha
DJ para quinceañera (5 horas)|DJ for a quinceañera (5 hours)|700.00|300|fecha
Sonido e iluminación (paquete)|Sound and lighting (package)|250.00|60|fecha
Animador y micrófono|MC and microphone|150.00|60|fecha
Hora extra|Extra hour|100.00|60|fecha
Mezcla de salsa, bachata y reguetón (solo música)|Salsa, bachata and reggaeton mix (music only)|200.00|120|fecha`, "DJ|DJ"),
  "NEG-NOCHE-25": P(`Salón para 50 personas (5 horas)|Hall for 50 guests (5 hours)|650.00|300|fecha
Salón para 100 personas (5 horas)|Hall for 100 guests (5 hours)|1100.00|300|fecha
Salón para 150 personas (5 horas)|Hall for 150 guests (5 hours)|1600.00|300|fecha
Mesas y sillas incluidas|Tables and chairs included|0.00|60|fecha
Hora extra|Extra hour|150.00|60|fecha
Cocina y barra disponibles|Kitchen and bar access|200.00|60|fecha
Limpieza posterior|Post-event cleaning|120.00|60|fecha`, "Salón|Venue"),
};

/* ── SERVICIOS por cita: [es|en|dólares|minutos|tipo] ── */
const GEN = (c) => ({ BELL: [], SALUD: [], PRO: [], DEPORTE: [] }[c]);
export const BELL = {
  "NEG-BELL-06": P(`Tinte completo|Full color|90.00|120
Mechas|Highlights|130.00|150
Retoque de raíz|Root touch-up|60.00|90
Balayage|Balayage|180.00|180
Matiz y tratamiento|Toner and treatment|45.00|45
Corte y peinado|Cut and style|45.00|60
Tratamiento de hidratación|Hydration treatment|35.00|30`),
  "NEG-BELL-07": P(`Trenzas pequeñas|Small braids|180.00|300
Trenzas medianas|Medium braids|140.00|240
Trenzas de caja|Box braids|150.00|270
Trenzas pegadas (cornrows)|Cornrows|70.00|120
Twists senegaleses|Senegalese twists|160.00|270
Extensiones de cabello natural|Natural hair extensions|120.00|150
Retoque de trenzas|Braid touch-up|50.00|60
Lavado y secado antes de trenzar|Wash and blow-dry before braiding|25.00|30`),
  "NEG-BELL-08": P(`Keratina brasileña|Brazilian keratin|180.00|180
Alisado orgánico|Organic smoothing|150.00|150
Tratamiento de botox capilar|Hair botox treatment|120.00|120
Retoque de keratina|Keratin touch-up|90.00|90
Lavado y secado|Wash and blow-dry|35.00|45
Corte con keratina|Cut with keratin|210.00|200
Mascarilla de reparación|Repair mask|30.00|30`),
  "NEG-BELL-09": P(`Corte para rizos|Curly cut|60.00|60
Definición de rizos|Curl definition|45.00|45
Tratamiento hidratante para rizos|Curl hydration treatment|40.00|45
Lavado y difusor|Wash and diffuse|35.00|45
Rizos con kit de productos|Curls with product kit|75.00|75
Consulta de cuidado del rizo|Curl care consultation|25.00|30
Corte de niños con rizos|Kids curly cut|35.00|40`),
  "NEG-BELL-10": P(`Evaluación del cuero cabelludo|Scalp evaluation|40.00|30
Tratamiento fortalecedor|Strengthening treatment|75.00|45
Masaje capilar con ampolletas|Scalp massage with ampoules|55.00|40
Plan de 4 sesiones|4-session plan|240.00|45
Terapia con láser de baja intensidad|Low-level laser therapy|90.00|40
Champú y loción de venta|Shampoo and lotion (retail)|28.00|15`),
  "NEG-BELL-11": P(`Peluca de cabello natural|Natural hair wig|350.00|60
Peluca sintética|Synthetic wig|90.00|45
Ajuste y corte de peluca|Wig fitting and cut|50.00|45
Instalación de peluca|Wig installation|70.00|60
Lavado y peinado de peluca|Wig wash and style|45.00|45
Peluca con encaje frontal|Lace front wig|280.00|60
Gorro y accesorios|Wig cap and accessories|15.00|15`),
  "NEG-BELL-12": P(`Peinado de novia|Bridal hairstyle|120.00|90
Peinado de quinceañera|Quinceañera hairstyle|90.00|75
Prueba de peinado|Hairstyle trial|60.00|60
Maquillaje de novia|Bridal makeup|150.00|90
Peinado y maquillaje de damas (cada una)|Bridesmaid hair and makeup (each)|110.00|90
Servicio a domicilio el día del evento|On-site service on event day|80.00|30
Retoque durante la fiesta|Touch-up during the event|50.00|30`),
  "NEG-BELL-14": P(`Manicura clásica|Classic manicure|25.00|40
Pedicura clásica|Classic pedicure|35.00|50
Uñas de gel|Gel nails|45.00|60
Uñas acrílicas|Acrylic nails|55.00|90
Relleno de acrílico|Acrylic fill|40.00|60
Pedicura spa|Spa pedicure|50.00|60
Diseño de uñas (por uña)|Nail art (per nail)|5.00|10
Manicura y pedicura|Manicure and pedicure|55.00|90`),
  "NEG-BELL-17": P(`Pestañas clásicas|Classic lashes|110.00|120
Pestañas híbridas|Hybrid lashes|130.00|135
Pestañas de volumen|Volume lashes|150.00|150
Relleno de pestañas|Lash fill|65.00|75
Retiro de pestañas|Lash removal|20.00|30
Levantamiento de pestañas|Lash lift|75.00|60
Cejas con henna|Henna brows|40.00|40`),
  "NEG-BELL-20": P(`Cejas con hilo|Eyebrow threading|12.00|15
Labio superior con hilo|Upper lip threading|7.00|10
Rostro completo con hilo|Full face threading|30.00|30
Cejas con diseño y tinte|Brow design and tint|25.00|25
Barbilla|Chin|7.00|10
Patillas|Sideburns|8.00|10
Paquete de cejas y labio|Brows and lip package|17.00|20`),
  "NEG-BELL-22": P(`Láser en axilas|Underarm laser|60.00|20
Láser en piernas completas|Full legs laser|220.00|60
Láser en bikini|Bikini laser|90.00|30
Láser en rostro|Face laser|70.00|25
Paquete de 6 sesiones en axilas|6-session underarm package|300.00|20
Consulta y prueba de piel|Consultation and patch test|0.00|20
Láser en espalda|Back laser|180.00|45`),
  "NEG-BELL-23": P(`Facial de limpieza profunda|Deep cleansing facial|70.00|60
Facial hidratante|Hydrating facial|65.00|60
Facial antiedad|Anti-aging facial|90.00|75
Microdermoabrasión|Microdermabrasion|85.00|60
Peeling suave|Gentle peel|80.00|45
Limpieza facial para adolescentes|Teen facial|50.00|45
Mascarilla de colágeno|Collagen mask|25.00|20`),
  "NEG-BELL-25": P(`Masaje relajante 60 min|Relaxing massage 60 min|75.00|60
Masaje de tejido profundo|Deep tissue massage|90.00|60
Masaje con piedras calientes|Hot stone massage|100.00|75
Masaje de espalda y cuello|Back and neck massage|45.00|30
Masaje para embarazadas|Prenatal massage|85.00|60
Masaje en pareja|Couples massage|160.00|60
Reflexología de pies|Foot reflexology|45.00|30`),
  "NEG-BELL-28": P(`Drenaje linfático|Lymphatic drainage|80.00|60
Paquete de 5 drenajes|5-session drainage package|350.00|60
Masaje modelador|Body-contouring massage|85.00|60
Cuidado después de cirugía (sesión)|Post-surgery care (session)|90.00|60
Reducción con ultrasonido|Ultrasound body treatment|70.00|45
Faja y venda de compresión|Compression garment and wrap|45.00|15`),
  "NEG-BELL-29": P(`Sauna infrarroja 30 min|Infrared sauna 30 min|35.00|30
Circuito de spa (sauna y vapor)|Spa circuit (sauna and steam)|55.00|90
Envoltura corporal|Body wrap|85.00|60
Exfoliación corporal|Body scrub|70.00|45
Día de spa para dos|Spa day for two|240.00|180
Masaje y sauna|Massage and sauna|95.00|90
Membresía mensual de sauna|Monthly sauna membership|99.00|30`),
  "NEG-BELL-31": P(`Blanqueamiento en consultorio|In-office whitening|250.00|60
Kit de blanqueamiento para casa|Take-home whitening kit|120.00|20
Retoque de blanqueamiento|Whitening touch-up|90.00|30
Consulta y evaluación|Consultation and evaluation|0.00|20
Limpieza antes del blanqueamiento|Pre-whitening cleaning|70.00|40
Protector de encías|Gum protector|25.00|10`),
  "NEG-BELL-32": P(`Tatuaje pequeño (hasta 3 pulgadas)|Small tattoo (up to 3 in)|100.00|60
Tatuaje mediano|Medium tattoo|250.00|150
Tatuaje de manga (por sesión)|Sleeve tattoo (per session)|400.00|240
Retoque de tatuaje|Tattoo touch-up|60.00|45
Diseño personalizado|Custom design|50.00|45
Perforación|Piercing|45.00|20
Consulta de diseño|Design consultation|0.00|20`),
  "NEG-BELL-36": P(`Consulta de nutrición|Nutrition consultation|70.00|45
Plan de alimentación personalizado|Personalized meal plan|120.00|60
Seguimiento semanal|Weekly follow-up|40.00|30
Plan de 8 semanas|8-week plan|280.00|45
Medición de composición corporal|Body composition scan|30.00|20
Taller de cocina saludable|Healthy cooking workshop|35.00|90`),
  "NEG-BELL-38": P(`Té de hierbas para dormir|Herbal sleep tea|8.00|15
Jarabe natural de miel y limón|Natural honey and lemon syrup|12.00|15
Cápsulas de moringa|Moringa capsules|18.00|15
Aloe vera orgánico|Organic aloe vera|10.00|15
Aceite de coco prensado en frío|Cold-pressed coconut oil|14.00|15
Consulta de hierbas y bienestar|Herbs and wellness consultation|30.00|30
Canasta de regalo natural|Natural gift basket|40.00|15`),
  "NEG-BELL-39": P(`Set de cuidado de la piel|Skincare set|45.00|15
Perfume importado|Imported perfume|55.00|15
Paleta de sombras|Eyeshadow palette|28.00|15
Plancha de cabello|Flat iron|65.00|15
Crema corporal|Body cream|14.00|15
Asesoría de maquillaje|Makeup advice|30.00|30
Tarjeta de regalo|Gift card|25.00|15`),
  "NEG-BELL-40": P(`Corte a domicilio|At-home haircut|50.00|45
Peinado a domicilio|At-home styling|60.00|60
Manicura a domicilio|At-home manicure|45.00|45
Maquillaje a domicilio|At-home makeup|70.00|60
Servicio para fiesta (hasta 4 personas)|Party service (up to 4 people)|220.00|180
Cargo por distancia (más de 10 millas)|Distance fee (over 10 miles)|10.00|5
Tinte a domicilio|At-home color|90.00|120`),
};
export const SALUD = {
  def: (n) => P(`Consulta nueva|New patient visit|${n}|40|cons
Consulta de seguimiento|Follow-up visit|${Math.round(n * 0.7)}|25|cons
Consulta por video|Video visit|${Math.round(n * 0.8)}|20|tele
Evaluación con seguro|Visit with insurance|0|30|free`),
  "NEG-SALUD-07": P(`Primera consulta de embarazo|First prenatal visit|120|60|cons
Consulta de seguimiento|Prenatal follow-up|80|40|cons
Clase de preparación al parto|Birth preparation class|60|90|cons
Acompañamiento de doula (por sesión)|Doula support (per session)|150|120|cons
Visita en casa después del parto|Postpartum home visit|90|60|cons
Consulta de lactancia|Lactation consult|70|45|cons`),
  "NEG-SALUD-08": P(`Consulta inicial de fertilidad|Initial fertility consult|180|60|cons
Consulta de seguimiento|Follow-up consult|110|30|cons
Consulta por video|Video consult|120|30|tele
Orientación sobre opciones de tratamiento|Treatment options counseling|100|45|cons
Plan de acompañamiento (3 meses)|Care plan (3 months)|450|45|cons`),
  "NEG-SALUD-10": P(`Limpieza dental|Dental cleaning|95|50|proc
Examen dental y radiografías|Dental exam and X-rays|120|45|proc
Empaste|Filling|150|45|proc
Consulta de emergencia dental|Dental emergency visit|110|30|walk
Blanqueamiento dental|Teeth whitening|280|60|proc
Corona dental|Dental crown|900|90|proc
Consulta para niños|Kids dental visit|70|30|cons
Examen gratis con seguro|Free exam with insurance|0|40|free`),
  "NEG-SALUD-12": P(`Consulta de cirugía oral|Oral surgery consult|90|30|cons
Extracción simple|Simple extraction|180|45|proc
Extracción de muelas del juicio|Wisdom teeth removal|350|60|proc
Implante dental (consulta y plan)|Dental implant (consult and plan)|120|45|cons
Revisión después de la cirugía|Post-surgery check|0|20|free`),
  "NEG-SALUD-15": P(`Examen de la vista|Eye exam|85|40|cons
Examen de la vista para niños|Kids eye exam|70|30|cons
Adaptación de lentes de contacto|Contact lens fitting|110|40|proc
Lentes con receta (consulta y armazón)|Prescription glasses (visit and frames)|160|45|proc
Revisión de lentes|Glasses adjustment|0|15|free
Examen gratis con seguro|Free exam with insurance|0|40|free`),
  "NEG-SALUD-17": P(`Consulta dermatológica|Dermatology visit|140|30|cons
Revisión de lunares|Skin check|120|30|cons
Consulta por video|Video visit|100|20|tele
Tratamiento de acné (consulta)|Acne treatment visit|130|30|cons
Consulta con seguro|Visit with insurance|0|30|free`),
  "NEG-SALUD-18": P(`Consulta de cardiología|Cardiology visit|220|45|cons
Electrocardiograma|EKG|90|20|proc
Seguimiento|Follow-up|130|30|cons
Consulta por video|Video visit|150|30|tele
Consulta con seguro|Visit with insurance|0|40|free`),
  "NEG-SALUD-20": P(`Consulta de gastroenterología|Gastroenterology visit|190|40|cons
Seguimiento|Follow-up|120|25|cons
Consulta por video|Video visit|130|25|tele
Orientación sobre pruebas de detección|Screening guidance|100|30|cons
Consulta con seguro|Visit with insurance|0|40|free`),
  "NEG-SALUD-21": P(`Consulta de neurología|Neurology visit|230|45|cons
Seguimiento|Follow-up|140|30|cons
Consulta por video|Video visit|160|30|tele
Consulta con seguro|Visit with insurance|0|40|free`),
  "NEG-SALUD-26": P(`Consulta de ortopedia|Orthopedic visit|180|40|cons
Seguimiento|Follow-up|110|25|cons
Consulta por video|Video visit|120|25|tele
Colocación de férula o bota|Splint or boot fitting|90|30|proc
Consulta con seguro|Visit with insurance|0|40|free`),
  "NEG-SALUD-29": P(`Consulta de oído, nariz y garganta|ENT visit|170|35|cons
Examen de audición|Hearing test|90|30|proc
Seguimiento|Follow-up|110|25|cons
Consulta por video|Video visit|120|25|tele
Consulta con seguro|Visit with insurance|0|35|free`),
  "NEG-SALUD-31": P(`Consulta de oncología|Oncology consult|260|60|cons
Segunda opinión|Second opinion|300|60|cons
Seguimiento|Follow-up|150|30|cons
Consulta por video|Video visit|180|30|tele
Orientación a familiares|Family counseling|90|45|cons`),
  "NEG-SALUD-33": P(`Primera consulta quiropráctica|First chiropractic visit|90|45|cons
Ajuste quiropráctico|Chiropractic adjustment|50|20|proc
Plan de 6 sesiones|6-session plan|240|30|proc
Masaje terapéutico|Therapeutic massage|70|45|proc
Evaluación postural|Posture evaluation|40|30|cons`),
  "NEG-SALUD-34": P(`Evaluación de terapia física|Physical therapy evaluation|110|50|cons
Sesión de terapia física|Physical therapy session|85|45|proc
Plan de 8 sesiones|8-session plan|600|45|proc
Terapia después de una lesión|Post-injury therapy|95|45|proc
Sesión por video|Video session|60|30|tele
Sesión con seguro|Session with insurance|0|45|free`),
  "NEG-SALUD-36": P(`Evaluación del habla|Speech evaluation|130|60|cons
Sesión de terapia del habla|Speech therapy session|85|45|proc
Plan de 8 sesiones|8-session plan|600|45|proc
Sesión por video|Video session|65|30|tele
Orientación a padres|Parent guidance|60|30|cons
Sesión con seguro|Session with insurance|0|45|free`),
  "NEG-SALUD-37": P(`Primera sesión de consejería|First counseling session|110|60|cons
Sesión individual|Individual session|90|50|cons
Sesión de pareja|Couples session|120|60|cons
Sesión por video|Video session|80|50|tele
Sesión según tus ingresos|Income-based session|30|50|cons
Sesión con seguro|Session with insurance|0|50|free`),
  "NEG-SALUD-38": P(`Evaluación inicial|Initial evaluation|250|60|cons
Seguimiento|Follow-up|130|30|cons
Consulta por video|Video visit|140|30|tele
Consulta con seguro|Visit with insurance|0|40|free`),
  "NEG-SALUD-41": P(`Consulta de nutrición|Nutrition consult|80|50|cons
Seguimiento|Follow-up|45|30|cons
Plan de alimentación|Meal plan|120|45|cons
Consulta por video|Video visit|60|30|tele
Consulta con seguro|Visit with insurance|0|45|free`),
  "NEG-SALUD-42": P(`Consulta inicial de control de peso|Initial weight management visit|120|45|cons
Seguimiento mensual|Monthly follow-up|70|30|cons
Plan de 12 semanas|12-week plan|480|30|cons
Consulta por video|Video visit|60|30|tele
Medición corporal|Body measurement|25|15|proc`),
  "NEG-SALUD-44": P(`Consulta de bienestar|Wellness consult|60|30|cons
Sesión de hidratación|Hydration session|140|60|proc
Sesión de vitaminas|Vitamin session|180|60|proc
Plan mensual de bienestar|Monthly wellness plan|450|60|proc
Consulta por video|Video consult|50|20|tele`),
  "NEG-SALUD-46": P(`Análisis de sangre completo|Complete blood panel|65|15|proc
Perfil de colesterol|Cholesterol panel|40|15|proc
Análisis de orina|Urine test|25|10|proc
Prueba de glucosa|Glucose test|20|10|proc
Resultados por la app|Results in the app|0|5|free
Paquete de chequeo anual|Annual checkup package|140|20|proc
Toma de muestra a domicilio|Home sample collection|45|30|proc`),
  "NEG-SALUD-48": P(`Surtir receta|Fill a prescription|0|10|free
Transferir receta de otra farmacia|Transfer a prescription|0|10|free
Vacuna contra la gripe|Flu shot|0|15|free
Medicamentos de venta libre|Over-the-counter medicines|0|10|walk
Consulta con el farmacéutico|Pharmacist consult|0|15|cons
Entrega de recetas a domicilio|Prescription delivery|5|10|proc
Revisión de medicamentos|Medication review|0|20|free`),
  "NEG-SALUD-49": P(`Preparación de fórmula magistral|Compounded formula|45|30|proc
Consulta con el farmacéutico|Pharmacist consult|0|20|free
Transferir receta|Prescription transfer|0|10|free
Entrega a domicilio|Home delivery|6|15|proc
Revisión de medicamentos|Medication review|0|20|free`),
  "NEG-SALUD-51": P(`Examen de audición|Hearing test|0|40|free
Adaptación de audífonos|Hearing aid fitting|90|45|proc
Audífonos (consulta y plan)|Hearing aids (consult and plan)|60|40|cons
Limpieza y ajuste|Cleaning and adjustment|25|20|proc
Baterías (paquete)|Batteries (pack)|10|10|proc`),
  "NEG-SALUD-52": P(`Cuidado a domicilio (por hora)|Home care (per hour)|28|60|cons
Turno de 4 horas|4-hour shift|105|240|cons
Turno de 8 horas|8-hour shift|200|480|cons
Visita de evaluación sin costo|Free evaluation visit|0|45|free
Acompañamiento a citas|Appointment companion|35|120|cons
Cuidado durante la noche|Overnight care|180|600|cons`),
  "NEG-SALUD-53": P(`Visita de enfermería a domicilio|Home nursing visit|95|60|cons
Curaciones y cuidados|Wound and dressing care|80|45|proc
Visita de evaluación|Evaluation visit|0|45|free
Plan semanal de visitas|Weekly visit plan|320|60|cons
Aplicación de inyecciones|Injection administration|45|20|proc`),
  "NEG-SALUD-56": P(`Viaje a cita médica (ida y vuelta)|Medical trip (round trip)|55|60|cons
Viaje con silla de ruedas|Wheelchair-accessible trip|75|60|cons
Viaje de larga distancia (más de 30 millas)|Long-distance trip (30+ miles)|130|120|cons
Acompañante incluido|Companion included|0|5|free
Recogida el mismo día|Same-day pickup|65|60|cons`),
};
export const PRO = {
  def: (n) => P(`Consulta inicial|Initial consultation|${n}|30|cons
Revisión de documentos|Document review|${Math.round(n * 0.6)}|30|fijo
Servicio por hora|Hourly service|${Math.round(n * 1.2)}|60|hora
Cotización sin costo|Free quote|0|20|cons`),
  "NEG-PRO-07": P(`Consulta de defensa penal|Criminal defense consult|100|45|cons
Revisión de acusaciones|Charge review|250|60|fijo
Representación en audiencia|Hearing representation|900|120|cotiza
Consulta urgente el mismo día|Same-day urgent consult|150|30|cons
Honorarios por hora|Hourly rate|300|60|hora`),
  "NEG-PRO-09": P(`Consulta sin costo por accidente|Free accident consultation|0|30|cons
Revisión de caso con aseguradora|Insurance case review|0|45|cons
Representación (honorario por resultado)|Representation (contingency fee)|0|60|pct
Reunión con el abogado|Attorney meeting|0|45|cons`),
  "NEG-PRO-11": P(`Consulta de bancarrota|Bankruptcy consult|75|45|cons
Revisión de deudas|Debt review|120|45|fijo
Presentación de Capítulo 7|Chapter 7 filing|1400|120|fijo
Presentación de Capítulo 13|Chapter 13 filing|3200|120|cotiza
Plan de pagos|Payment plan|0|20|cons`),
  "NEG-PRO-14": P(`Fianza de delito menor|Misdemeanor bail bond|0|30|pct
Fianza de delito mayor|Felony bail bond|0|45|pct
Consulta sin costo|Free consultation|0|20|cons
Atención las 24 horas|24-hour service|0|15|walk
Plan de pagos de la fianza|Bail payment plan|0|20|cons`),
  "NEG-PRO-15": P(`Notarización de un documento|Notarize a document|15|15|fijo
Notarización de poder|Power of attorney notarization|25|20|fijo
Notarización móvil a domicilio|Mobile notary|50|45|fijo
Apostilla y legalización|Apostille and legalization|60|30|fijo
Cartas y declaraciones juradas|Letters and affidavits|20|20|fijo
Notarización de documentos de viaje de menores|Minor travel document notarization|25|20|fijo`),
  "NEG-PRO-18": P(`Traducción certificada de acta (1 página)|Certified birth certificate translation (1 page)|35|30|fijo
Traducción certificada de documentos|Certified document translation|45|30|fijo
Traducción de antecedentes|Record translation|50|30|fijo
Traducción urgente 24 horas|24-hour rush translation|75|30|fijo
Intérprete para citas|Appointment interpreter|60|60|hora
Intérprete para audiencias|Hearing interpreter|85|60|hora`),
  "NEG-PRO-19": P(`Consulta contable|Accounting consultation|75|45|cons
Contabilidad mensual para negocios|Monthly bookkeeping|250|60|fijo
Nómina mensual (hasta 5 empleados)|Monthly payroll (up to 5 employees)|180|45|fijo
Declaración de impuestos del negocio|Business tax return|450|90|fijo
Registro de negocio (LLC)|Business registration (LLC)|350|60|fijo
Servicio por hora|Hourly service|90|60|hora`),
  "NEG-PRO-20": P(`Declaración de impuestos personal|Personal tax return|120|60|fijo
Declaración con ITIN|Return with ITIN|150|60|fijo
Declaración con negocio propio|Return with self-employment|220|75|fijo
Declaración de años anteriores|Prior-year return|140|60|fijo
Solicitud de ITIN|ITIN application|100|45|fijo
Consulta sin costo|Free consultation|0|20|cons`),
  "NEG-PRO-26": P(`Consulta de negocios|Business consultation|90|45|cons
Plan de negocio|Business plan|600|120|fijo
Estudio de mercado local|Local market study|450|90|fijo
Asesoría mensual|Monthly advising|300|60|fijo
Apertura de negocio paso a paso|Start-up step by step|500|90|fijo
Servicio por hora|Hourly service|110|60|hora`),
  "NEG-PRO-27": P(`Cotización de seguro de auto|Auto insurance quote|0|20|cons
Cambio de póliza|Policy change|0|20|cons
Seguro para varios autos|Multi-car insurance|0|30|cons
Seguro para conductores nuevos|New driver insurance|0|30|cons
Revisión de cobertura|Coverage review|0|25|cons`),
  "NEG-PRO-31": P(`Envío de dinero a Latinoamérica|Money transfer to Latin America|8|10|fijo
Envío mayor de $500|Transfer over $500|12|10|fijo
Pago de cuentas|Bill payment|3|10|fijo
Cambio de cheques|Check cashing|0|10|pct
Giros postales|Money orders|2|10|fijo
Recargas de teléfono|Phone top-ups|0|5|fijo`),
  "NEG-PRO-35": P(`Revisión de reporte de crédito|Credit report review|0|30|cons
Plan de reparación de crédito (mensual)|Credit repair plan (monthly)|99|45|fijo
Disputa de cuentas|Account disputes|0|30|fijo
Consejería para comprar casa|Home-buying counseling|60|45|cons
Plan para aumentar el puntaje|Score-building plan|150|45|fijo`),
  "NEG-PRO-37": P(`Consulta hipotecaria sin costo|Free mortgage consult|0|30|cons
Precalificación|Pre-qualification|0|30|cons
Préstamo con ITIN|ITIN loan|0|45|cons
Préstamo FHA|FHA loan|0|45|cons
Refinanciamiento|Refinancing|0|45|cons`),
  "NEG-PRO-38": P(`Sitio web de una página|One-page website|450|60|fijo
Sitio web de negocio (5 páginas)|Business website (5 pages)|1200|90|fijo
Tienda en línea|Online store|2200|90|cotiza
Mantenimiento mensual|Monthly maintenance|60|30|fijo
Diseño de logo|Logo design|200|60|fijo
Consulta sin costo|Free consultation|0|20|cons`),
  "NEG-PRO-40": P(`Tarjetas de presentación (500)|Business cards (500)|45|20|fijo
Volantes (500)|Flyers (500)|60|20|fijo
Lona o banner|Banner|85|20|fijo
Rótulo para negocio|Business sign|350|30|cotiza
Playeras con tu logo (12)|Logo tees (12)|180|20|fijo
Diseño incluido|Design included|0|20|cons`),
  "NEG-PRO-43": P(`Sesión de fotos de negocio|Business photo session|250|120|fijo
Fotos de producto (hasta 20)|Product photos (up to 20)|300|120|fijo
Retrato profesional|Professional portrait|120|45|fijo
Video corto para redes|Short social video|350|120|fijo
Fotos de restaurante o tienda|Restaurant or store photos|400|150|fijo
Consulta sin costo|Free consultation|0|20|cons`),
  "NEG-PRO-45": P(`Consulta de software|Software consultation|120|45|cons
Aplicación móvil sencilla|Simple mobile app|4500|120|cotiza
Sistema de citas para tu negocio|Booking system for your business|1800|90|cotiza
Mantenimiento mensual|Monthly maintenance|150|30|fijo
Servicio por hora|Hourly service|95|60|hora`),
  "NEG-PRO-48": P(`Cambio de pantalla|Screen replacement|89|45|fijo
Cambio de batería|Battery replacement|59|30|fijo
Puerto de carga|Charging port repair|69|45|fijo
Desbloqueo|Unlocking|35|30|fijo
Diagnóstico sin costo|Free diagnosis|0|15|cons
Reparación el mismo día|Same-day repair|99|60|fijo`),
  "NEG-PRO-49": P(`Búsqueda de empleo (candidato)|Job search (candidate)|0|30|cons
Colocación de personal para empresas|Staffing for businesses|0|45|pct
Revisión de currículum|Résumé review|35|30|fijo
Preparación de entrevista|Interview prep|45|45|fijo
Registro de candidatos|Candidate registration|0|20|cons`),
  "NEG-PRO-51": P(`Guardia de seguridad por hora|Security guard per hour|30|60|hora
Seguridad para eventos|Event security|400|240|cotiza
Revisión de seguridad del local|Site security review|150|60|fijo
Patrullaje nocturno|Night patrol|45|60|hora
Consulta sin costo|Free consultation|0|20|cons`),
  "NEG-PRO-53": P(`Entrega local el mismo día|Same-day local delivery|12|30|fijo
Entrega de documentos|Document delivery|15|30|fijo
Paquete de entregas semanales|Weekly delivery package|150|30|fijo
Entrega urgente (1 hora)|Rush delivery (1 hour)|25|30|fijo
Recogida a domicilio|Home pickup|8|20|fijo`),
  "NEG-PRO-54": P(`Despacho de carga local|Local freight dispatch|120|45|fijo
Despacho para dueño-operador|Owner-operator dispatch|0|30|pct
Búsqueda de cargas de regreso|Backhaul search|0|30|pct
Papeleo y permisos|Paperwork and permits|80|45|fijo
Consulta sin costo|Free consultation|0|20|cons`),
  "NEG-PRO-56": P(`Consulta de arquitectura|Architecture consultation|120|45|cons
Planos de remodelación|Remodel plans|900|120|cotiza
Planos para permiso|Permit drawings|1500|120|cotiza
Visita al sitio|Site visit|150|60|fijo
Diseño de ampliación|Addition design|2800|120|cotiza
Servicio por hora|Hourly service|110|60|hora`),
  "NEG-PRO-59": P(`Consulta de diseño de interiores|Interior design consult|90|45|cons
Diseño de un cuarto|Single room design|450|90|fijo
Diseño de casa completa|Whole-home design|2200|120|cotiza
Selección de muebles y colores|Furniture and color selection|220|60|fijo
Visita y medidas|Visit and measurements|80|45|fijo`),
  "NEG-PRO-60": P(`Ceremonia de boda civil|Civil wedding ceremony|250|60|fijo
Ceremonia personalizada|Custom ceremony|400|90|fijo
Renovación de votos|Vow renewal|200|45|fijo
Maestro de ceremonias para eventos|Event emcee|180|120|fijo
Consulta sin costo|Free consultation|0|20|cons`),
};
export const DEPORTE = {
  def: (n) => P(`Clase de prueba|Trial class|0|60|clase
Clase suelta|Drop-in class|${n}|60|clase
Membresía mensual|Monthly membership|${n * 5}|60|mes
Plan de 10 clases|10-class pack|${n * 8}|60|mes`),
  "NEG-DEPORTE-06": P(`Clase de spinning|Spinning class|18|45|clase
Paquete de 10 clases|10-class pack|150|45|mes
Membresía mensual ilimitada|Unlimited monthly membership|89|45|mes
Clase de prueba|Trial class|0|45|clase
Alquiler de zapatos|Shoe rental|3|5|clase`),
  "NEG-DEPORTE-07": P(`Clase de CrossFit|CrossFit class|20|60|clase
Membresía mensual|Monthly membership|140|60|mes
Introducción para principiantes|Beginner on-ramp|99|60|curso
Clase de prueba|Trial class|0|60|clase
Entrenamiento personal|Personal training|65|60|clase`),
  "NEG-DEPORTE-09": P(`Clase de boxeo|Boxing class|15|60|clase
Membresía mensual|Monthly membership|60|60|mes
Entrenamiento personal de boxeo|Personal boxing training|60|60|clase
Clase de prueba|Trial class|0|60|clase
Clases para jóvenes|Youth classes|40|60|mes`),
  "NEG-DEPORTE-11": P(`Clases de karate (mensualidad)|Karate classes (monthly)|85|60|mes
Clases de taekwondo (mensualidad)|Taekwondo classes (monthly)|85|60|mes
Clase de prueba|Trial class|0|60|clase
Examen de cinturón|Belt exam|40|60|curso
Uniforme|Uniform|35|10|clase`),
  "NEG-DEPORTE-13": P(`Clase de yoga|Yoga class|15|60|clase
Membresía mensual|Monthly membership|79|60|mes
Paquete de 10 clases|10-class pack|120|60|mes
Clase de prueba|Trial class|0|60|clase
Taller de fin de semana|Weekend workshop|45|120|curso`),
  "NEG-DEPORTE-14": P(`Clase de Pilates|Pilates class|20|55|clase
Membresía mensual|Monthly membership|99|55|mes
Clase privada|Private class|70|55|clase
Clase de prueba|Trial class|0|55|clase
Paquete de 8 clases|8-class pack|140|55|mes`),
  "NEG-DEPORTE-17": P(`Inscripción a la liga de fútbol|Soccer league sign-up|90|60|curso
Cuota por partido|Match fee|10|60|clase
Equipo completo|Full team registration|900|60|curso
Torneo de fin de semana|Weekend tournament|150|120|curso
Uniforme del equipo|Team uniform|30|10|clase`),
  "NEG-DEPORTE-20": P(`Inscripción a la liga de básquetbol|Basketball league sign-up|85|60|curso
Cuota por partido|Match fee|10|60|clase
Equipo completo|Full team registration|850|60|curso
Cancha por hora|Court rental per hour|45|60|hora
Clínica para jóvenes|Youth clinic|60|90|curso`),
  "NEG-DEPORTE-22": P(`Inscripción a la liga de béisbol|Baseball league sign-up|95|60|curso
Inscripción a la liga de softbol|Softball league sign-up|95|60|curso
Equipo completo|Full team registration|950|60|curso
Cuota por partido|Match fee|12|60|clase
Práctica en la jaula de bateo|Batting cage session|15|30|hora`),
  "NEG-DEPORTE-24": P(`Línea de boliche (por persona)|Bowling game (per person)|6|30|hora
Pista por hora|Lane per hour|35|60|hora
Alquiler de zapatos|Shoe rental|4|5|clase
Liga semanal|Weekly league|18|120|curso
Fiesta de cumpleaños (hasta 10)|Birthday party (up to 10)|190|120|curso`),
  "NEG-DEPORTE-25": P(`Green fee 9 hoyos|9-hole green fee|25|120|hora
Green fee 18 hoyos|18-hole green fee|40|240|hora
Carrito de golf|Golf cart|15|60|clase
Clase de golf|Golf lesson|60|45|clase
Membresía anual|Annual membership|900|60|mes`),
  "NEG-DEPORTE-27": P(`Entrada a la alberca|Pool entry|6|60|clase
Clases de natación para niños|Kids swim lessons|90|45|curso
Clases de natación para adultos|Adult swim lessons|110|45|curso
Membresía mensual|Monthly membership|45|60|mes
Clase de aquagym|Aqua fitness class|12|45|clase`),
  "NEG-DEPORTE-28": P(`Membresía del club de corredores|Running club membership|30|60|mes
Entrenamiento grupal semanal|Weekly group training|0|60|clase
Plan para tu primera carrera de 5K|First 5K plan|60|60|curso
Inscripción a carreras del club|Club race registration|25|60|curso
Camiseta del club|Club shirt|20|10|clase`),
  "NEG-DEPORTE-29": P(`Membresía del club ciclista|Cycling club membership|35|60|mes
Salida grupal de fin de semana|Weekend group ride|0|120|clase
Taller de mecánica básica|Basic bike mechanics workshop|30|90|curso
Clase para principiantes|Beginner class|25|60|clase
Jersey del club|Club jersey|55|10|clase`),
  "NEG-DEPORTE-31": P(`Salida de pesca de medio día|Half-day fishing trip|120|240|hora
Salida de pesca de día completo|Full-day fishing trip|220|480|hora
Alquiler de equipo|Gear rental|30|60|clase
Clase de pesca para principiantes|Beginner fishing class|45|90|curso
Licencia y orientación|License guidance|15|20|clase`),
  "NEG-DEPORTE-33": P(`Partida de paintball (hasta 10)|Paintball game (up to 10)|200|90|hora
Equipo completo por persona|Full gear per person|35|15|clase
Bolsa de municiones (500)|Paint bag (500)|30|10|clase
Fiesta de cumpleaños|Birthday party|320|120|curso
Partida de airsoft|Airsoft game|150|90|hora`),
  "NEG-DEPORTE-36": P(`Entrada a la pista de hielo|Ice rink entry|9|60|hora
Alquiler de patines|Skate rental|5|5|clase
Clase de patinaje para niños|Kids skating class|85|45|curso
Clase de patinaje para adultos|Adult skating class|95|45|curso
Fiesta de cumpleaños|Birthday party|240|120|curso`),
  "NEG-DEPORTE-37": P(`Entrada al muro de escalada|Climbing wall entry|18|120|hora
Alquiler de equipo|Gear rental|8|5|clase
Clase de introducción|Intro class|45|90|curso
Membresía mensual|Monthly membership|85|60|mes
Clase para niños|Kids class|30|60|clase`),
};
export const DEPORTE_NUM = (sub) => ({ "NEG-DEPORTE-01": 12, "NEG-DEPORTE-05": 10 }[sub] ?? 15);
export { P, GEN, secs };
