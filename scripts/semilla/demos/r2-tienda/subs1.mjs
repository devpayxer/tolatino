/* Ronda 2 · TIENDA · subcategorías 06–19. Datos compactos: names (10), ab (about es ## en, con {n} {o} {f} {st}), dd (descripción por defecto), tax (c = ropa 0 %, resto 6 %),
   hrs (patrón de horario), ly (prob. de plan de pagos), shp (prob. de envío), ret (días de cambio posibles), role, faq (q es|q en|a es|a en), items (líneas «es | en / dólares / tallas»;
   «# es | en» abre una sección). Todo ficticio. */
export const SUBS1 = {
  "06": {
    names: "Botas y Sombreros El Rodeo|Western Wear Don Chuy|Vaquero Auténtico Boot Co|La Hebilla de Plata|Rancho Latino Moda Vaquera|Botas Tejanas Los Camperos|El Corral Western Store|Sombreros Hacienda Real|Vaquera Fina Jaripeo|Casa Vaquera Los Alazanes".split("|"),
    ab: "{n} vende ropa vaquera en {st} desde {f}: botas de piel, sombreros, cinturones con hebilla y camisas de rodeo. {o} te toma la talla del pie y del sombrero. ## {n} has sold western wear on {st} since {f}: leather boots, hats, buckle belts and rodeo shirts. {o} measures your boot and hat size.",
    dd: ["Piel y costuras reforzadas. Apártalo en la app y pruébatelo en la tienda.", "Leather and reinforced stitching. Hold it in the app and try it on in store."],
    tax: "c", hrs: "A", ly: 0.1, shp: 0.4, ret: [7, 15], role: ["Dueño y bootero", "Owner and bootmaker"],
    faq: ["¿Cómo sé mi talla de sombrero?|How do I know my hat size?|Medimos tu cabeza en la tienda; si no estás seguro, apártalo y lo ajustamos.|We measure your head in store; if unsure, hold it and we fit it."],
    items: `# Botas | Boots
Bota vaquera de piel | Leather cowboy boot / 169 / z
Bota de avestruz | Ostrich-print boot / 249 / z
Bota de trabajo vaquera | Western work boot / 129 / z
Botín corto | Ankle boot / 109 / z
Bota para dama | Women's western boot / 139 / zw
# Sombreros | Hats
Sombrero de fieltro | Felt hat / 79 / hat
Sombrero de paja | Straw hat / 45 / hat
Texana de rodeo | Rodeo cap / 25
# Camisas y jeans | Shirts and jeans
Camisa vaquera bordada | Embroidered western shirt / 49 / h
Jeans corte bota | Bootcut jeans / 42 / hp
Chaleco de mezclilla | Denim vest / 55 / h
# Cinturones y hebillas | Belts and buckles
Cinturón piteado | Tooled leather belt / 49
Hebilla de plata | Silver belt buckle / 35
Corbata de lazo | Bolo tie / 22`,
  },
  "07": {
    names: "Zapatería La Bota Fina|Calzado Don Memo|Zapatos Pasos Firmes|Zapatería Mundial Hispana|Calzado Comodidad Total|Zapatería El Buen Paso|Calzado Fino Familiar|Zapatería Siempre Cómodos|Zapatos y Más Rosales|Calzado Los Hermanos Peña".split("|"),
    ab: "Zapatería familiar en {st} desde {f}: calzado de vestir, casual, deportivo y de trabajo para toda la familia. {o} te ayuda a medir el pie. Apartas el par en la app y pagas en la caja. ## Family shoe store on {st} since {f}: dress, casual, athletic and work shoes for the whole family. {o} helps you measure your foot. Hold the pair in the app and pay at the register.",
    dd: ["Hay varias tallas en existencia. Apártalo en la app.", "Several sizes in stock. Hold it in the app."],
    tax: "c", hrs: "A", ly: 0.05, shp: 0.5, ret: [15, 30], role: ["Dueño y zapatero", "Owner and shoemaker"],
    faq: ["¿Hacen reparaciones?|Do you repair shoes?|Cambiamos tapas y suelas; pregunta en la caja.|We replace heel caps and soles; ask at the register."],
    items: `# Hombre | Men
Zapato de vestir | Dress shoe / 79 / z
Mocasín de piel | Leather loafer / 69 / z
Zapato casual | Casual shoe / 55 / z
Bota de trabajo | Work boot / 95 / z
# Mujer | Women
Zapatilla de tacón | Heeled pump / 59 / zw
Sandalia | Sandal / 35 / zw
Zapato plano | Flat / 39 / zw
Bota de invierno | Winter boot / 85 / zw
# Niños | Kids
Zapato escolar | School shoe / 38 / zn
Tenis de niño | Kids sneaker / 39 / zn
# Cuidado | Care
Crema para zapatos | Shoe polish / 6
Plantillas de gel | Gel insoles / 14
Agujetas (3 pares) | Shoelaces (3 pairs) / 5`,
  },
  "08": {
    names: "Sneaker Spot Latino|Urbano Kicks|La Esquina Streetwear|Fresh Pisada|Drip Latino Store|Calle y Tenis|Hype Corner PA|Kicks y Gorras El Parce|Streetwear Barrio Alto|Tenis Limitados El Flaco".split("|"),
    ab: "{n} vende tenis y ropa urbana en {st} desde {f}: lanzamientos, gorras, sudaderas y accesorios. {o} te avisa cuando llegan tallas nuevas. Todo original, con recibo. ## {n} sells sneakers and streetwear on {st} since {f}: releases, caps, hoodies and accessories. {o} lets you know when new sizes arrive. All authentic, with receipt.",
    dd: ["Original, con recibo. Apártalo en la app antes de que se agote tu talla.", "Authentic, with receipt. Hold it in the app before your size sells out."],
    tax: "c", hrs: "C", ly: 0, shp: 0.7, ret: [7, 15], role: ["Dueño y comprador", "Owner and buyer"],
    faq: ["¿Los tenis son originales?|Are the sneakers authentic?|Sí, todos con recibo del distribuidor.|Yes, all with the distributor's receipt."],
    items: `# Tenis | Sneakers
Tenis de básquetbol | Basketball sneaker / 130 / z
Tenis de correr | Running sneaker / 95 / z
Tenis clásicos de cuero | Classic leather sneaker / 85 / z
Tenis de plataforma | Platform sneaker / 90 / zw
# Ropa urbana | Streetwear
Sudadera con capucha | Hoodie / 59 / h
Camiseta estampada | Graphic tee / 29 / h
Pants jogger | Jogger pants / 49 / h
Chamarra bomber | Bomber jacket / 89 / h
# Gorras y accesorios | Caps and accessories
Gorra ajustable | Snapback cap / 28
Mochila urbana | Urban backpack / 45
Calcetines deportivos (3) | Sport socks (3) / 14
Kit de limpieza de tenis | Sneaker cleaning kit / 18`,
  },
  "09": {
    names: "Uniformes La Eficiencia|Ropa de Trabajo Don Ramiro|Uniformes Profesionales Cruz|Workwear Latino|Uniformes y Botas El Obrero|Casa del Uniforme Hispano|Uniformes Santa Rita|Ropa de Trabajo Los Hermanos|Scrubs y Uniformes Vida|Trabajo Seguro Uniformes".split("|"),
    ab: "Uniformes y ropa de trabajo en {st} desde {f}: scrubs, camisas de trabajo, chalecos, botas de seguridad y bordado con el nombre de tu empresa. {o} atiende pedidos por docena. ## Uniforms and workwear on {st} since {f}: scrubs, work shirts, vests, safety boots and embroidery with your company name. {o} handles orders by the dozen.",
    dd: ["Resistente para el trabajo diario. Pide por docena y bordamos el logo.", "Built for daily work. Order by the dozen and we embroider the logo."],
    tax: "c", hrs: "B", ly: 0, shp: 0.5, ret: [15, 30], role: ["Dueño", "Owner"],
    faq: ["¿Bordan el nombre de la empresa?|Do you embroider company names?|Sí; el bordado tarda de 3 a 5 días.|Yes; embroidery takes 3 to 5 days."],
    items: `# Uniformes médicos | Scrubs
Top de scrubs | Scrub top / 18 / us
Pantalón de scrubs | Scrub pants / 20 / us
Bata de laboratorio | Lab coat / 32 / us
# Ropa de trabajo | Workwear
Camisa de trabajo | Work shirt / 24 / h
Pantalón de trabajo | Work pants / 34 / hp
Overol | Coveralls / 49 / h
Chaleco reflectivo | Reflective vest / 14 / h
# Calzado de seguridad | Safety footwear
Bota con punta de acero | Steel-toe boot / 89 / z
Zapato antideslizante | Non-slip shoe / 54 / z
# Accesorios | Accessories
Guantes de trabajo | Work gloves / 9
Casco | Hard hat / 16
Delantal | Apron / 12`,
  },
  "10": {
    names: "Camisetas a Su Gusto|Estampados La Flecha|Tee Shop Personalizados|Playeras Orgullo Latino|Estampa Express|Camisetas Familia y Fiesta|Impresiones El Colibrí|Playeras para Equipos Cruz|Diseños Mi Pueblo|Gráfica Rápida Camisetas".split("|"),
    ab: "{n} estampa camisetas, gorras y tazas en {st} desde {f}: equipos, familias, eventos y negocios. {o} te muestra el diseño antes de imprimir. Pedidos desde una pieza. ## {n} prints t-shirts, caps and mugs on {st} since {f}: teams, families, events and businesses. {o} shows you the design before printing. Orders from a single piece.",
    dd: ["Se imprime con tu diseño. Listo en 2 a 4 días.", "Printed with your design. Ready in 2 to 4 days."],
    tax: "c", hrs: "B", ly: 0, shp: 0.6, ret: [0], role: ["Dueño y diseñador", "Owner and designer"],
    faq: ["¿Puedo traer mi propio diseño?|Can I bring my own design?|Sí, en PNG o PDF; si no lo tienes, lo hacemos contigo.|Yes, as PNG or PDF; if you do not have one we make it with you."],
    items: `# Camisetas | T-shirts
Camiseta personalizada | Custom t-shirt / 18 / m
Camiseta de manga larga | Long-sleeve tee / 24 / m
Camiseta para equipo (10 piezas) | Team tee (10 pieces) / 120 / m
Camiseta infantil | Kids tee / 15 / n
# Sudaderas y gorras | Hoodies and caps
Sudadera personalizada | Custom hoodie / 38 / m
Gorra bordada | Embroidered cap / 22
# Tazas y regalos | Mugs and gifts
Taza con foto | Photo mug / 14
Termo personalizado | Custom tumbler / 24
Bolsa de tela | Tote bag / 12
# Eventos | Events
Playeras de quinceañera (8) | Quinceañera tees (8) / 96 / m
Playeras de reunión familiar (12) | Family reunion tees (12) / 130 / m`,
  },
  "11": {
    names: "Sastrería Don Anselmo|Arreglos Rápidos La Aguja|Sastrería Fino Corte|Costura y Ajustes Doña Meche|Sastre Hispano Ajustes|Arreglos de Ropa El Dedal|Sastrería Hilo y Aguja|Ajustes Express Lupita|Sastrería La Medida Justa|Costurera Hermanas Núñez".split("|"),
    ab: "Sastrería y arreglos en {st} desde {f}: bajos, cinturas, cierres, vestidos de quince y trajes. {o} toma las medidas y los ajustes salen en 2 a 3 días. ## Tailor and alterations on {st} since {f}: hems, waists, zippers, quinceañera dresses and suits. {o} takes your measurements and alterations are ready in 2 to 3 days.",
    dd: ["Precio base; confirmamos al ver la prenda. Deja tu prenda y recoge en 2 a 3 días.", "Base price; confirmed once we see the garment. Drop it off and pick up in 2 to 3 days."],
    tax: 0, hrs: "B", ly: 0, shp: 0, ret: [0], role: ["Dueña y sastre", "Owner and tailor"],
    faq: ["¿Cuánto tardan los arreglos?|How long do alterations take?|De 2 a 3 días; urgentes en 24 horas con cargo extra.|2 to 3 days; rush in 24 hours for an extra fee."],
    items: `# Arreglos básicos | Basic alterations
Bajo de pantalón | Pants hem / 12
Bajo con dobladillo original | Original-hem pants hem / 18
Ajuste de cintura | Waist adjustment / 18
Cambio de cierre | Zipper replacement / 16
Parches y remiendos | Patches and mending / 8
# Trajes y saco | Suits and jackets
Acortar mangas de saco | Shorten jacket sleeves / 28
Ajuste de saco | Jacket tailoring / 45
Ajuste de pantalón de traje | Suit pants tailoring / 22
# Vestidos | Dresses
Bajo de vestido | Dress hem / 25
Ajuste de vestido de quince | Quinceañera dress fitting / 85
Ajuste de vestido de novia | Wedding dress fitting / 120
# Extras | Extras
Botones (juego) | Buttons (set) / 6
Servicio urgente 24 h | Rush service 24 h / 15`,
  },
  "12": {
    names: "Tintorería Blanca Nieves|Tintorería El Buen Planchado|Lavado en Seco Don Efraín|Tintorería Express Latina|Tintorería La Elegancia|Dry Clean Hispano|Tintorería Cristal|Lavado y Planchado Esperanza|Tintorería Los Trajes|Tintorería Brillo Fino".split("|"),
    ab: "Tintorería en {st} desde {f}: lavado en seco, planchado, trajes, vestidos de novia y cortinas. {o} te entrega en 2 días; recoges con tu número en la caja. ## Dry cleaner on {st} since {f}: dry cleaning, pressing, suits, wedding gowns and drapes. {o} has it back in 2 days; pick up with your number at the counter.",
    dd: ["Precio por prenda. Déjala y recoge en 2 días.", "Price per garment. Drop it off and pick up in 2 days."],
    tax: 0, hrs: "B", ly: 0, shp: 0, ret: [0], role: ["Dueño", "Owner"],
    faq: ["¿Quitan manchas difíciles?|Do you treat tough stains?|Lo intentamos sin costo extra; avísanos qué la manchó.|We try at no extra cost; tell us what caused it."],
    items: `# Ropa diaria | Everyday clothing
Camisa lavada y planchada | Shirt laundered and pressed / 3.5
Pantalón | Pants / 7
Falda | Skirt / 7
Blusa | Blouse / 7
Suéter | Sweater / 8
# Trajes y vestidos | Suits and dresses
Traje de 2 piezas | Two-piece suit / 17
Saco | Jacket / 9
Vestido | Dress / 14
Vestido de novia | Wedding gown / 150
Vestido de quinceañera | Quinceañera gown / 90
# Hogar | Household
Cortinas (por panel) | Drapes (per panel) / 18
Edredón | Comforter / 28
Chamarra de invierno | Winter coat / 24
# Extras | Extras
Planchado solo (docena) | Pressing only (dozen) / 24
Servicio urgente 24 h | Rush service 24 h / 8`,
  },
  "13": {
    names: "Lavandería Burbujas Felices|Lavandería El Lavadero|Coin Laundry Hispano|Lavandería Aguas Claras|Lavandería La Esquina|Laundromat Los Vecinos|Lavandería Ropa Limpia|Lavandería Espuma Blanca|Lavandería Buen Vecino|Lavandería 24 Horas Don Beto".split("|"),
    ab: "Lavandería en {st} desde {f}: lavadoras de varios tamaños, secadoras, servicio de lavado y doblado, detergente y suavizante. {o} atiende todos los días. ## Laundromat on {st} since {f}: washers of several sizes, dryers, wash and fold service, detergent and softener. {o} is here every day.",
    dd: ["Lo recoges o lo pagas en la caja. Sin cargos escondidos.", "Pick it up or pay at the counter. No hidden fees."],
    tax: 0, hrs: "D", ly: 0, shp: 0, ret: [0], role: ["Dueño", "Owner"],
    faq: ["¿Cuánto cuesta lavar y doblar?|How much is wash and fold?|Cobramos por libra; el mínimo son 10 libras.|We charge by the pound; the minimum is 10 pounds."],
    items: `# Servicio de lavado | Wash service
Lavado y doblado (10 lb) | Wash and fold (10 lb) / 12
Lavado y doblado (20 lb) | Wash and fold (20 lb) / 22
Lavado de edredón | Comforter wash / 18
Secado extra | Extra drying / 4
# Tarjetas | Cards
Tarjeta de lavandería $20 | Laundry card $20 / 20
Tarjeta de lavandería $50 | Laundry card $50 / 50
# Productos | Supplies
Detergente líquido | Liquid detergent / 7
Suavizante | Fabric softener / 5
Bolsa de lavandería | Laundry bag / 6
Hojas para secadora | Dryer sheets / 4`,
  },
  "14": {
    names: "Joyería Oro de Ley|Joyería La Perla Dorada|Joyería Brillo Eterno|Joyería Diamante del Valle|Joyería Los Quilates|Joyas Alma Latina|Joyería Sol y Luna|Joyería El Tesoro|Joyería Real Dorado|Joyería Reina Isabel".split("|"),
    ab: "{n} vende joyería de oro y plata en {st} desde {f}: cadenas, anillos, aretes, medallas y relojes. {o} te explica los quilates y hace grabados. Compramos oro. ## {n} sells gold and silver jewelry on {st} since {f}: chains, rings, earrings, medals and watches. {o} explains karats and does engraving. We buy gold.",
    dd: ["Oro y plata con garantía. Pasa a verlo y a probártelo.", "Gold and silver with warranty. Come see it and try it on."],
    tax: 6, hrs: "A", ly: 0.5, shp: 0.5, ret: [15, 30], role: ["Dueño y joyero", "Owner and jeweler"],
    faq: ["¿Compran oro?|Do you buy gold?|Sí; pesamos y pagamos el mismo día con identificación.|Yes; we weigh and pay the same day with ID."],
    items: `# Oro | Gold
Cadena de oro 14k | 14k gold chain / 349
Anillo de oro 10k | 10k gold ring / 189 / rg
Aretes de oro 14k | 14k gold earrings / 129
Medalla de la Virgen | Virgin medal / 159
Pulsera de oro | Gold bracelet / 279
# Plata | Silver
Cadena de plata | Silver chain / 59
Aretes de plata | Silver earrings / 28
Anillo de plata | Silver ring / 35 / rg
# Quinceañera y boda | Quinceañera and wedding
Juego de aretes y collar | Earring and necklace set / 85
Argollas de matrimonio | Wedding bands / 299
# Relojes | Watches
Reloj de pulsera | Wristwatch / 79
Cambio de pila | Battery replacement / 10
# Servicios | Services
Grabado | Engraving / 20
Limpieza de joyas | Jewelry cleaning / 10`,
  },
  "15": {
    names: "Relojería El Tic Tac|Reparación de Relojes Don Gerardo|Relojes y Joyas Servicio Fino|Taller de Relojería Hispano|Relojería La Manecilla|Reparación de Joyas Brillante|Relojería Tiempo Exacto|Taller de Joyas El Orfebre|Relojería Santa Lucía|Relojes Servicio Rápido".split("|"),
    ab: "Reparación de relojes y joyas en {st} desde {f}: pilas, correas, cristales, soldadura, ajuste de anillos y limpieza. {o} te da el precio al ver la pieza. ## Watch and jewelry repair on {st} since {f}: batteries, straps, crystals, soldering, ring sizing and cleaning. {o} gives you the price once the piece is seen.",
    dd: ["Precio base; confirmamos al ver la pieza. Deja tu pieza y recoge cuando esté lista.", "Base price; confirmed once we see the piece. Drop it off and pick up when ready."],
    tax: 0, hrs: "B", ly: 0, shp: 0.2, ret: [0], role: ["Dueño y relojero", "Owner and watchmaker"],
    faq: ["¿Cuánto tarda una reparación?|How long does a repair take?|Pilas y correas, el mismo día; mecanismos, de 5 a 10 días.|Batteries and straps same day; movements 5 to 10 days."],
    items: `# Relojes | Watches
Cambio de pila | Battery replacement / 12
Cambio de correa | Strap replacement / 18
Cristal nuevo | New crystal / 35
Limpieza de mecanismo | Movement cleaning / 85
Prueba de agua | Water resistance test / 15
# Joyas | Jewelry
Ajuste de anillo | Ring sizing / 30
Soldadura de cadena | Chain soldering / 20
Cambio de broche | Clasp replacement / 25
Reposición de piedra | Stone replacement / 40
Limpieza y pulido | Cleaning and polish / 15
# Accesorios | Accessories
Correa de piel | Leather strap / 24
Correa de metal | Metal strap / 32
Pilas surtidas | Assorted batteries / 6`,
  },
  "16": {
    names: "Bolsos y Más Carolina|Accesorios Dulce Moda|La Carterita|Bolsos Elegantes Miriam|Accesorios Bella Dama|Moda y Bolsos Zoila|Carteras Hispanas|El Bolso de la Abuela|Accesorios Oro y Plata|Boutique de Bolsos Yaneth".split("|"),
    ab: "Bolsos, carteras, bufandas, cinturones y bisutería en {st} desde {f}. {o} te ayuda a combinar tu accesorio. Aparta en la app y paga en la caja. ## Handbags, wallets, scarves, belts and costume jewelry on {st} since {f}. {o} helps you match your accessory. Hold in the app and pay at the register.",
    dd: ["Varios colores. Apártalo en la app y paga en la caja.", "Several colors. Hold it in the app and pay at the register."],
    tax: 6, hrs: "A", ly: 0, shp: 0.6, ret: [7, 15], role: ["Dueña", "Owner"],
    faq: [],
    items: `# Bolsos | Handbags
Bolso de mano | Handbag / 39
Bolso grande tipo tote | Tote bag / 45
Mochila de moda | Fashion backpack / 42
Bolso cruzado | Crossbody bag / 35
# Carteras | Wallets
Cartera de mujer | Women's wallet / 24
Cartera de hombre | Men's wallet / 28
Monedero | Coin purse / 9
# Accesorios | Accessories
Bufanda | Scarf / 16
Cinturón | Belt / 19
Sombrero de sol | Sun hat / 22
Lentes de sol | Sunglasses / 14
# Bisutería | Costume jewelry
Collar | Necklace / 12
Aretes | Earrings / 8
Pulsera | Bracelet / 10`,
  },
  "17": {
    names: "Ropa de Segunda La Ganga|Segunda Mano Doña Tere|Thrift Latino El Tesoro|La Pulga Ropa Usada|Segundas La Buena Onda|Ropa Usada Buena y Barata|Thrift Shop Casa Verde|Cambalache Familiar|El Ropero de Lucy|Ropa Reusable Los Primos".split("|"),
    ab: "Ropa de segunda en {st} desde {f}: ropa limpia y revisada para toda la familia a precios bajos. {o} surte nuevo cada semana. Parte de lo que se junta va a la despensa de la comunidad. ## Second-hand clothing on {st} since {f}: clean, checked clothes for the whole family at low prices. {o} restocks every week. Part of what is raised goes to the community pantry.",
    dd: ["Usado en buen estado, lavado y revisado.", "Pre-owned in good condition, washed and checked."],
    tax: "c", hrs: "A", ly: 0, shp: 0, ret: [7], role: ["Dueña", "Owner"],
    faq: ["¿Aceptan donaciones de ropa?|Do you accept clothing donations?|Sí, limpia y en buen estado; pregunta por el horario de recibo.|Yes, clean and in good condition; ask about drop-off hours."],
    items: `# Mujer | Women
Blusa usada | Pre-owned blouse / 5 / m
Jeans usados | Pre-owned jeans / 8 / mn
Vestido usado | Pre-owned dress / 10 / m
Suéter usado | Pre-owned sweater / 7 / m
# Hombre | Men
Camisa usada | Pre-owned shirt / 5 / h
Pantalón usado | Pre-owned pants / 8 / hp
Chamarra usada | Pre-owned jacket / 14 / h
# Niños | Kids
Conjunto infantil usado | Pre-owned kids set / 6 / n
Abrigo infantil usado | Pre-owned kids coat / 9 / n
# Hogar | Home
Sábanas usadas | Pre-owned sheets / 8
Cobija usada | Pre-owned blanket / 10
Bolsa de ropa (por libra) | Clothing bag (per pound) / 2`,
  },
  "18": {
    names: "Consignación Elegante|Casa de Consignación Rosa|Consignación Buen Gusto|Consigna y Gana|Boutique de Consignación Lázaro|Consignación Segunda Vida|El Closet de Consignación|Consignación Mi Barrio|Consignación Tesoros Finos|Consignación La Oportunidad".split("|"),
    ab: "{n} vende en consignación en {st} desde {f}: ropa de marca, muebles, joyas y artículos del hogar. {o} recibe tus cosas, las vende y te paga tu parte. ## {n} sells on consignment on {st} since {f}: name-brand clothing, furniture, jewelry and home goods. {o} takes your items, sells them and pays your share.",
    dd: ["Pieza única en consignación. Si se vende, se acabó.", "One-of-a-kind consignment piece. When it sells, it is gone."],
    tax: "c", hrs: "A", ly: 0, shp: 0.1, ret: [0], role: ["Dueña", "Owner"],
    faq: ["¿Cuánto me pagan por mis cosas?|How much do I get for my items?|Recibes el 50 % del precio de venta al venderse.|You receive 50% of the sale price when it sells."],
    items: `# Ropa de marca | Name-brand clothing
Abrigo de lana | Wool coat / 65 / m
Vestido de marca | Designer dress / 48 / m
Bolso de marca | Designer handbag / 85
Zapatos de piel | Leather shoes / 40 / zw
# Hogar | Home
Lámpara de mesa | Table lamp / 28
Juego de platos | Dish set / 35
Espejo con marco | Framed mirror / 45
# Muebles | Furniture
Silla de comedor | Dining chair / 30
Mesa de centro | Coffee table / 70
Cómoda | Dresser / 120
# Joyas | Jewelry
Collar de plata | Silver necklace / 38
Reloj usado | Pre-owned watch / 55`,
  },
  "19": {
    names: "Casa de Empeño La Confianza|Empeños El Buen Trato|Pawn Hispano Dinero Rápido|Casa de Empeño Don Raúl|Empeño y Joyería Sol|Préstamos y Empeños La Garantía|Empeños Familiares Núñez|Pawn Shop Centro|Casa de Empeño El Amigo|Empeños y Ventas La Cumbre".split("|"),
    ab: "Casa de empeño en {st} desde {f}: préstamos con oro, herramientas, electrónica e instrumentos como garantía, y venta de artículos no reclamados. {o} te da un precio justo y claro, sin letra chica. ## Pawn shop on {st} since {f}: loans against gold, tools, electronics and instruments, and sale of unclaimed items. {o} gives you a fair, clear price with no fine print.",
    dd: ["Artículo no reclamado, revisado y con garantía de 30 días.", "Unclaimed item, inspected and with a 30-day warranty."],
    tax: 6, hrs: "F", ly: 0.2, shp: 0.2, ret: [7], role: ["Dueño", "Owner"],
    faq: ["¿Cuánto tiempo tengo para recuperar mi artículo?|How long do I have to get my item back?|Tienes 90 días, y puedes renovar pagando el interés.|You have 90 days, and you can renew by paying the interest."],
    items: `# Joyas | Jewelry
Cadena de oro usada | Pre-owned gold chain / 289
Anillo de oro usado | Pre-owned gold ring / 169 / rg
Reloj de marca | Brand watch / 220
# Herramientas | Tools
Taladro inalámbrico | Cordless drill / 59
Sierra circular | Circular saw / 65
Juego de llaves | Wrench set / 40
# Electrónica | Electronics
Televisor 43 pulgadas | 43-inch TV / 130
Consola de videojuegos | Game console / 160
Laptop usada | Pre-owned laptop / 180
Bocina Bluetooth | Bluetooth speaker / 45
# Instrumentos | Instruments
Guitarra acústica | Acoustic guitar / 110
Teclado eléctrico | Electric keyboard / 125`,
  },
};
