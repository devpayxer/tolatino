# Para el contador · For the accountant

_Documento para el contador. Versión: 23 nov 2026. Son preguntas, no asesoría. Español primero; la versión en inglés está completa al final, bajo «English»._

## Qué es To'Latino

- To'Latino es una plataforma para la comunidad latina en Estados Unidos, organizada por ciudad. Abrirá con cinco ciudades de Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton y Reading.
- Reúne negocios (17 categorías: comida, belleza, salud, hogar, autos, bienes raíces, iglesias, niños, eventos y más), una comunidad de vecinos y eventos con boletos.
- Los pagos con tarjeta los procesa Stripe: cada negocio cobra en su propia cuenta conectada y To'Latino se queda una comisión; los boletos de eventos se cobran en la cuenta de To'Latino y se transfieren al organizador. Los negocios pagan además una suscripción mensual opcional (Pro).
- Hay un sitio web, cuatro apps y un asistente de inteligencia artificial llamado El Compa.
- Todavía no está abierta al público. Todo lo que sigue se construyó y se probó en un entorno de pruebas con datos de ejemplo; producción nace vacía.

## Qué se le pide

Respuestas por escrito, por número de pregunta (C-01, C-02…). Basta con «sí», «no» o «hay que cambiar X», y una línea con la razón si quiere. Si una pregunta necesita datos que no le dimos, dígalo y se los mandamos. Cuando sus respuestas lleguen como documento, las aplicamos a las reglas de impuesto y a los recibos del producto; las tasas por ciudad y categoría son datos que se cambian sin reconstruir nada.

Estas son preguntas, no conclusiones. Donde decimos «el plan asume», es lo que escribió el equipo sin ser contador y, en varios casos, sin haberlo verificado; se lo mostramos para que lo confirme o lo corrija. Nada de eso es asesoría fiscal nuestra. Hay preguntas paralelas para el abogado (A-02, A-14, A-23, A-37); las respuestas de ambos deben coincidir.

## Cómo está ordenado

Por tema. Dentro de cada tema, primero lo que bloquea abrir. Cada pregunta trae: la pregunta, qué hace hoy To'Latino (hechos), qué asumimos, qué cambiaría según su respuesta, si bloquea abrir y, en letra pequeña, de dónde sale (es para nosotros).

Bloquea abrir: «sí» = sin su respuesta no abrimos con esa parte encendida y afecta a todos; «una parte» = afecta a una función o categoría concreta, esa parte espera su respuesta y el fundador decide si abre sin ella; «no» = no impide abrir. Es una asignación nuestra: corríjala si no coincide.

## Índice de temas

| Tema | Preguntas | Bloquean abrir |
|---|---|---|
| La empresa y sus registros | 1 (C-01) | 1 |
| Impuesto de ventas de lo que venden los negocios | 5 (C-02 – C-06) | 4 |
| Lo que cobra To'Latino por sí misma | 1 (C-07) | 1 |
| Dinero de otros que pasa por To'Latino | 4 (C-08 – C-11) | 3 |
| Libros y reportes | 1 (C-12) | 0 |
| **Total** | **12** | **9** |

## Las preguntas

### La empresa y sus registros

#### C-01 · Registros fiscales antes de abrir

**La pregunta.** ¿Qué registros fiscales hacen falta antes de abrir (federal, de Pennsylvania y local en las cinco ciudades) y qué estructura de empresa conviene para los impuestos?

**Qué hace hoy To'Latino.** El repositorio no dice si To'Latino ya existe como empresa constituida, con qué nombre ni con qué registros fiscales. Stripe (verificación del negocio y del dueño, banco de la plataforma), Apple y Google piden esos datos para abrir sus cuentas. Hay una pregunta paralela para el abogado (A-02).

**Qué asumimos.** Sin supuesto. Es un dato que nos falta.

**Qué cambiaría según la respuesta.** Cuándo podemos abrir las cuentas de Stripe, Apple y Google y a nombre de quién.

**Bloquea abrir: sí.**

_Para nosotros: pregunta nueva de este documento, sin línea en LAUNCH todavía._

### Impuesto de ventas de lo que venden los negocios

#### C-02 · Reparaciones de Auto y Hogar: piezas, materiales y mano de obra

**La pregunta.** En una reparación de carro o de casa, ¿qué parte del estimado paga impuesto de ventas de Pennsylvania: solo las piezas o materiales, también la mano de obra, o depende del tipo de trabajo?

**Qué hace hoy To'Latino.** El estimado de Auto y Hogar aplica 6 % a las piezas o materiales y 0 % a la mano de obra, con la misma regla en las cinco ciudades. El cliente ve el impuesto antes de aprobar y cada estimado guarda una copia de la tasa que tuvo. La regla vive en datos por ciudad y categoría; un cambio es una regla nueva desde una fecha, hecha por un administrador con motivo.

**Qué asumimos.** Es lo que dice el diseño («6 % de PA solo en piezas o materiales»). El plan anota, sin haberlo verificado, que la mano de obra de reparación de vehículos suele ser gravable y que en mejoras a inmuebles el contratista paga el impuesto de los materiales.

**Qué cambiaría según la respuesta.** La regla de impuesto por ciudad y categoría en datos, el cálculo del estimado y lo que el cliente ve.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Impuesto de Auto y Hogar (validar con contador)»; «Validar con el contador: impuesto de PA solo sobre piezas/materiales»._

#### C-03 · Comida preparada y eventos privados en restaurantes

**La pregunta.** ¿Es correcto el 6 % sobre la comida preparada? ¿Aplica algún impuesto local? ¿Pagan impuesto «Todo el local» o la decoración en un evento privado? ¿Y el envío y la propina en un pedido a domicilio?

**Qué hace hoy To'Latino.** En los pedidos, cada plato lleva 6 % o sin impuesto (lo elige el negocio al crear el plato; 6 % de fábrica) y se calcula sobre lo que queda después de un descuento. El envío y la propina van íntegros al negocio y no pagan impuesto. En un evento privado en un restaurante, el 6 % de la ciudad se calcula sobre todo el subtotal (comida, «Todo el local» y decoración); es la misma regla en las cinco ciudades.

**Qué asumimos.** El plan sembró 6 % en las cinco ciudades. No sabemos si hay impuesto local ni si «Todo el local» o la decoración lo pagan.

**Qué cambiaría según la respuesta.** La regla de comida preparada por ciudad, qué partes del evento privado pagan impuesto y cómo se muestra al cliente.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD)»._

#### C-04 · Impuesto de cada ciudad y quién lo mantiene

**La pregunta.** ¿Hay diferencias entre Hazleton, Allentown, Wilkes-Barre, Scranton y Reading en el impuesto sobre lo que se vende en To'Latino, y cada cuánto y quién debe revisarlo?

**Qué hace hoy To'Latino.** Las cinco ciudades nacen en 6 % (el de Pennsylvania). Un administrador puede programar una regla nueva por ciudad y categoría, desde una fecha y con motivo; vale para lo que se cobre desde ese momento y lo ya cobrado conserva su tasa. La adenda de Pennsylvania de los Términos dice que cuando un negocio cobra impuesto de ventas se muestra en el total antes de enviar, y deja en blanco («[pendiente]») el impuesto de la comida preparada y los impuestos locales de cada ciudad.

**Qué asumimos.** Sin supuesto sobre diferencias locales: solo sembramos el 6 % del estado en todas.

**Qué cambiaría según la respuesta.** Las tasas por ciudad y categoría, y un calendario para revisarlas.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «El impuesto de cada ciudad lo confirma el contador»._

#### C-05 · Mercados y tiendas: qué es exento y qué no

**La pregunta.** En los mercados y tiendas, ¿qué productos deben cobrar impuesto y cuáles son exentos (víveres, comida lista, artículos de limpieza, ropa), y cómo debemos pedir al negocio que los marque?

**Qué hace hoy To'Latino.** Cada producto lleva 6 % o sin impuesto, lo marca el negocio al crear el producto (6 % de fábrica). En los productos que se pesan, el impuesto se calcula sobre el monto final ya pesado. No hay todavía una regla por sección de tienda (víveres, ropa).

**Qué asumimos.** El plan anota, sin verificar, que en Pennsylvania la comida para la casa suele estar exenta, la comida lista y los artículos de limpieza no, y la mayoría de la ropa sí está exenta. No tenemos línea propia en la lista de pendientes; la estamos añadiendo.

**Qué cambiaría según la respuesta.** Si el sistema debe sembrar exentos por sección y cómo se lo explicamos al negocio.

**Bloquea abrir: sí.**

_Para nosotros: pregunta nueva de este documento, sin línea en LAUNCH todavía._

#### C-06 · Autos: el total «en la puerta»

**La pregunta.** En la venta de un carro en un dealer, ¿pagan impuesto el cargo del dealer y las placas, y el carro entregado a cambio baja el impuesto?

**Qué hace hoy To'Latino.** La ficha muestra un total «en la puerta» estimado: el precio más 6 % de impuesto de la ciudad sobre el precio, sin incluir el cargo del dealer ni las placas. La venta ocurre en el dealer, no en la app, y To'Latino no cobra nada del carro. Hay una pregunta paralela para el abogado sobre el tope del cargo (A-37).

**Qué asumimos.** Es lo que hoy se calcula; el plan pide confirmar si el cargo y las placas pagan impuesto y si el carro a cambio baja el impuesto.

**Qué cambiaría según la respuesta.** La fórmula del total en la puerta y lo que dice la ficha.

**Bloquea abrir: una parte (afecta a una función o categoría; esa parte espera su respuesta y el fundador decide si abre sin ella).**

_Para nosotros: LAUNCH «4ic · Tope del cargo del dealer de PA»._

### Lo que cobra To'Latino por sí misma

#### C-07 · Ingresos propios de To'Latino: Pro, patrocinios y comisiones

**La pregunta.** ¿Alguno de los cobros propios de To'Latino (suscripción Pro, patrocinios y destacados, comisiones) lleva impuesto de ventas de Pennsylvania o exige un registro? ¿Qué debe decir el recibo que mandamos?

**Qué hace hoy To'Latino.** Pro cuesta $14.99 al mes (el año, 10 meses), con 30 días de prueba sin tarjeta y sin impuesto agregado. Cada cobro manda un recibo por correo con plan, periodo, tarjeta y un total único; no tiene línea de impuesto ni número de factura. Los patrocinios son puestos pagados en listas y eventos con precio fijado en Configuración. La comisión sobre cada operación se descuenta del pago al negocio (pedidos 10 %, citas 8 %, apartados 6 %, boletos 5 % + $1; valores iniciales, ajustables).

**Qué asumimos.** Sin supuesto: hoy no se agrega impuesto a nada de lo que cobra To'Latino.

**Qué cambiaría según la respuesta.** Si se agrega una línea de impuesto, un número de factura o un registro, y qué dice el recibo.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «Recibo por correo de cada cobro de Pro e impuesto»._

### Dinero de otros que pasa por To'Latino

#### C-08 · Cobros con destino a los negocios y declaración de pagos

**La pregunta.** Cuando To'Latino cobra con tarjeta (pedidos, citas, depósitos, planes, rentas) y el dinero va a la cuenta del negocio, ¿quién reporta esos pagos al fisco (Stripe, To'Latino o ambos), y qué debemos darle a cada negocio (por ejemplo, un resumen anual)?

**Qué hace hoy To'Latino.** El cobro lo procesa Stripe con una cuenta conectada por negocio (Connect, tipo Express). La tarjeta se retiene al enviar, se cobra cuando el negocio acepta y el dinero va a la cuenta del negocio menos la comisión de To'Latino. El impuesto cobrado va incluido en lo que se transfiere al negocio; To'Latino no lo declara ni lo paga. To'Latino no recoge ni guarda el número de identificación fiscal de los negocios: lo pide Stripe al conectar la cuenta. Hoy To'Latino no genera ningún formulario fiscal.

**Qué asumimos.** Sin supuesto. Hay una pregunta paralela para el abogado (A-14).

**Qué cambiaría según la respuesta.** Qué formularios o resúmenes generamos para los negocios y quién los emite.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…»._

#### C-09 · Boletos: dinero retenido hasta el martes y pagos a organizadores

**La pregunta.** ¿Cómo debe registrarse el dinero de los boletos que To'Latino cobra y transfiere después al organizador (¿pasivo hasta pagar?), qué debe reportarse sobre cada organizador (1099-K u otro) y cuál es el ingreso de To'Latino en cada boleto?

**Qué hace hoy To'Latino.** El cobro de boletos se queda en la cuenta de Stripe de To'Latino y se transfiere al organizador el martes siguiente a cada fecha. Lo que recibe es lo cobrado menos devoluciones, menos lo perdido en disputas y menos la comisión (5 % + $1 por boleto, que sale de lo del organizador). La base calcula el monto del libro y solo deja pagar una fecha terminada y sin disputas. Una devolución o disputa de una fecha ya pagada se resta de la siguiente liquidación del organizador; si no hay otra en el plazo, se revierte la transferencia. El primer evento de un organizador nuevo que pase de $2,000 se retiene hasta que Confianza lo revisa. Si se cancela una fecha, cada orden se devuelve al 100 % sin comisión y To'Latino absorbe el costo de la tarjeta.

**Qué asumimos.** Sin supuesto. Hay una pregunta paralela para el abogado (A-14).

**Qué cambiaría según la respuesta.** El tratamiento en libros, los reportes para organizadores y la forma de liquidar.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6e · Abogado: To'Latino como comerciante del cobro…»; «6c · Abogado: ley de reventa de boletos de PA…»._

#### C-10 · Impuesto de diversiones sobre boletos

**La pregunta.** Si alguna de las cinco ciudades o el estado cobra un impuesto sobre boletos de diversiones, ¿quién debe recaudarlo y declararlo (el organizador o To'Latino) y cómo debe aparecer en el boleto y en el recibo?

**Qué hace hoy To'Latino.** Los boletos se venden con la línea de impuesto en 0 %. El precio que ve el comprador incluye todos los cargos. To'Latino no calcula ni paga ningún impuesto de diversiones.

**Qué asumimos.** Sin supuesto. Hay una pregunta paralela para el abogado (A-23).

**Qué cambiaría según la respuesta.** Una línea de impuesto por ciudad en los boletos y quién lo declara.

**Bloquea abrir: sí.**

_Para nosotros: LAUNCH «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…»._

#### C-11 · Recompensa al promotor

**La pregunta.** Cuando To'Latino le pague a un vecino promotor por traer un negocio, ¿qué registros o formularios pide ese pago?

**Qué hace hoy To'Latino.** Un vecino con código de promotor trae un negocio; cuando el negocio llega a 5 pedidos o citas hechos, la recompensa (por defecto $10, ajustable) queda anotada como «pendiente de pago». El pago real todavía no se hace: pasar a «pagado» llega con el dinero real. Un negocio cuenta para un solo promotor y la recompensa se rechaza si el dueño es el propio promotor o comparte dispositivo con él.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Qué datos pedimos al promotor antes de pagarle y cómo se registra el pago.

**Bloquea abrir: no.**

_Para nosotros: LAUNCH «Pagar la recompensa del promotor a la Wallet»._

### Libros y reportes

#### C-12 · Qué reportes necesita ver cada mes

**La pregunta.** ¿Qué reportes, con qué detalle y con qué frecuencia necesita recibir de To'Latino para llevar los libros (comisiones, boletos retenidos, devoluciones, costo de la tarjeta, impuesto cobrado por ciudad)?

**Qué hace hoy To'Latino.** El Super Admin tiene vistas del dinero, el detalle de cada transacción y una conciliación contra Stripe, con alertas cuando algo no cuadra (por ejemplo, una devolución atascada). El costo de la tarjeta de una devolución absorbida se estima hoy (2.9 % + 30 ¢ por orden devuelta) mientras no esté Stripe real; con Stripe real se leerá el costo de cada cobro. Todo movimiento de dinero deja un asiento de auditoría que solo se inserta.

**Qué asumimos.** Sin supuesto.

**Qué cambiaría según la respuesta.** Qué reportes construimos o exportamos y con qué cortes.

**Bloquea abrir: no.**

_Para nosotros: pregunta nueva de este documento, sin línea en LAUNCH todavía._

## Lo que ya decidió el fundador y no se pregunta

Lo siguiente ya está decidido; no hace falta que lo cuestione, salvo que su respuesta a alguna pregunta lo contradiga (entonces dígalo).

- **Decisión A.** Se abre al público cuando esté todo (salvo El Patio); las cinco ciudades abren juntas.
- **Decisión X.** Las ciudades son cinco de Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton y Reading.
- **Decisión O.** Se construye lo propio y se paga solo lo que no se puede replicar; la lista de lo que se paga está en el plan y solo crece por decisión del fundador.
- **Decisión G.** El Patio queda fuera; cuando se haga, los premios serán solo en monedas (sin valor en dinero).
- **Otras decisiones (sin letra: están en el plan y en la lista de pendientes).** Los pagos con tarjeta se hacen con Stripe (cuenta de la plataforma y cuentas conectadas de cada negocio); Pro cuesta $14.99 al mes; la comisión de cada operación es un valor de Configuración que el fundador puede cambiar.

## De qué línea sale cada pregunta

Para nosotros: cuando lleguen las respuestas, cada línea de la lista de pendientes (LAUNCH) se cierra con su pregunta.

| Pregunta | Línea de LAUNCH (primeras palabras) |
|---|---|
| C-01 · Registros fiscales antes de abrir | (sin línea: pregunta nueva) |
| C-02 · Reparaciones de Auto y Hogar: piezas, materiales y mano de obra | «Impuesto de Auto y Hogar (validar con contador)»; «Validar con el contador: impuesto de PA solo sobre piezas/materiales» |
| C-03 · Comida preparada y eventos privados en restaurantes | «6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD)» |
| C-04 · Impuesto de cada ciudad y quién lo mantiene | «El impuesto de cada ciudad lo confirma el contador» |
| C-05 · Mercados y tiendas: qué es exento y qué no | (sin línea: pregunta nueva) |
| C-06 · Autos: el total «en la puerta» | «4ic · Tope del cargo del dealer de PA» |
| C-07 · Ingresos propios de To'Latino: Pro, patrocinios y comisiones | «Recibo por correo de cada cobro de Pro e impuesto» |
| C-08 · Cobros con destino a los negocios y declaración de pagos | «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…» |
| C-09 · Boletos: dinero retenido hasta el martes y pagos a organizadores | «6e · Abogado: To'Latino como comerciante del cobro…»; «6c · Abogado: ley de reventa de boletos de PA…» |
| C-10 · Impuesto de diversiones sobre boletos | «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…» |
| C-11 · Recompensa al promotor | «Pagar la recompensa del promotor a la Wallet» |
| C-12 · Qué reportes necesita ver cada mes | (sin línea: pregunta nueva) |


## English

### What To'Latino is

- To'Latino is a platform for the Latino community in the United States, organized by city. It will open with five Pennsylvania cities: Hazleton, Allentown, Wilkes-Barre, Scranton and Reading.
- It brings together businesses (17 categories: food, beauty, health, home, cars, real estate, churches, children, events and more), a neighbor community and ticketed events.
- Card payments are processed by Stripe: each business is paid into its own connected account and To'Latino keeps a commission; event tickets are charged in To'Latino's account and transferred to the organizer. Businesses also pay an optional monthly subscription (Pro).
- There is a website, four apps and an artificial-intelligence assistant called El Compa.
- It is not yet open to the public. Everything below was built and tested in a test environment with sample data; production starts empty.

### What we ask of you

Written answers, by question number (C-01, C-02…). "Yes", "no" or "change X" is enough, plus one line of reasoning if you wish. If a question needs data we did not give, say so and we will send it. When your answers arrive as a document, we apply them to the tax rules and receipts in the product; rates by city and category are data that change without rebuilding anything.

These are questions, not conclusions. Where we say "the plan assumes", it is what the team wrote without being accountants and, in several cases, without having verified it; we show it so you can confirm or correct it. None of it is tax advice from us. There are parallel questions for the lawyer (A-02, A-14, A-23, A-37); the answers of both must agree.

### How it is organized

By topic. Within each topic, what blocks opening comes first. Each question has: the question, what To'Latino does today (facts), what we assume, what would change depending on your answer, whether it blocks opening and, in small print, where it comes from (that is for us).

Blocks opening: "yes" = without your answer we do not open with that part turned on and it affects everyone; "one part" = it affects a specific feature or category, that part waits for your answer and the founder decides whether to open without it; "no" = it does not prevent opening. This assignment is ours: please correct it if it does not match.

### Topic index

| Topic | Questions | Block opening |
|---|---|---|
| The company and its registrations | 1 (C-01) | 1 |
| Sales tax on what businesses sell | 5 (C-02 – C-06) | 4 |
| What To'Latino charges for itself | 1 (C-07) | 1 |
| Other people's money that passes through To'Latino | 4 (C-08 – C-11) | 3 |
| Books and reports | 1 (C-12) | 0 |
| **Total** | **12** | **9** |

### The questions

#### The company and its registrations

##### C-01 · Tax registrations before opening

**The question.** What tax registrations are needed before opening (federal, Pennsylvania and local in the five cities) and what company structure suits taxes?

**What To'Latino does today.** Our records do not say whether To'Latino already exists as a formed company, under what name or with what tax registrations. Stripe (business and owner verification, the platform's bank), Apple and Google ask for those details to open their accounts. There is a parallel question for the lawyer (A-02).

**What we assume.** No assumption. It is a piece of information we are missing.

**What would change depending on the answer.** When we can open the Stripe, Apple and Google accounts and in whose name.

**Blocks opening: yes.**

_For us: a new question in this document, with no LAUNCH line yet._

#### Sales tax on what businesses sell

##### C-02 · Auto and Home repairs: parts, materials and labor

**The question.** In a car or house repair, which part of the estimate pays Pennsylvania sales tax: only parts or materials, also labor, or does it depend on the type of work?

**What To'Latino does today.** The Auto and Home estimate applies 6% to parts or materials and 0% to labor, with the same rule in all five cities. The customer sees the tax before approving and each estimate keeps a copy of the rate it had. The rule lives in data by city and category; a change is a new rule from a date, made by an administrator with a reason.

**What we assume.** This is what the design says ("PA 6% only on parts or materials"). The plan notes, without having verified it, that labor on vehicle repairs is often taxable and that on improvements to real property the contractor pays tax on the materials.

**What would change depending on the answer.** The tax rule by city and category in data, the estimate calculation and what the customer sees.

**Blocks opening: yes.**

_For us: LAUNCH "Impuesto de Auto y Hogar (validar con contador)»; «Validar con el contador: impuesto de PA solo sobre piezas/materiales" (in Spanish, as in our checklist)._

##### C-03 · Prepared food and private events at restaurants

**The question.** Is 6% on prepared food correct? Does any local tax apply? Do "Whole venue" or decoration pay tax at a private event? And delivery fee and tip on a delivery order?

**What To'Latino does today.** In orders, each dish carries 6% or no tax (the business chooses when creating the dish; 6% by default) and it is calculated on what remains after a discount. Delivery fee and tip go in full to the business and carry no tax. At a private event at a restaurant, the city's 6% is calculated on the whole subtotal (food, "Whole venue" and decoration); it is the same rule in all five cities.

**What we assume.** The plan seeded 6% in the five cities. We do not know whether there is a local tax or whether "Whole venue" or decoration pay it.

**What would change depending on the answer.** The prepared-food rule by city, which parts of a private event pay tax and how it is shown to the customer.

**Blocks opening: yes.**

_For us: LAUNCH "6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD)" (in Spanish, as in our checklist)._

##### C-04 · Each city's tax and who maintains it

**The question.** Are there differences among Hazleton, Allentown, Wilkes-Barre, Scranton and Reading in the tax on what is sold on To'Latino, and how often and by whom should it be reviewed?

**What To'Latino does today.** The five cities start at 6% (Pennsylvania's rate). An administrator can schedule a new rule per city and category, from a date and with a reason; it applies to what is charged from that moment and what was already charged keeps its rate. The Pennsylvania addendum to the Terms says that when a business charges sales tax it is shown in the total before sending, and leaves blank ("[pending]") the prepared-food tax and each city's local taxes.

**What we assume.** No assumption about local differences: we only seeded the state's 6% everywhere.

**What would change depending on the answer.** The rates per city and category, and a calendar to review them.

**Blocks opening: yes.**

_For us: LAUNCH "El impuesto de cada ciudad lo confirma el contador" (in Spanish, as in our checklist)._

##### C-05 · Markets and stores: what is exempt and what is not

**The question.** In markets and stores, which products must charge tax and which are exempt (groceries, ready-to-eat food, cleaning supplies, clothing), and how should we ask the business to mark them?

**What To'Latino does today.** Each product carries 6% or no tax, marked by the business when creating the product (6% by default). For weighed products, tax is calculated on the final, weighed amount. There is not yet a rule per store section (groceries, clothing).

**What we assume.** The plan notes, unverified, that in Pennsylvania food for the home is usually exempt, ready-to-eat food and cleaning supplies are not, and most clothing is exempt. We have no line of our own in the checklist; we are adding one.

**What would change depending on the answer.** Whether the system should seed exemptions by section and how we explain it to the business.

**Blocks opening: yes.**

_For us: a new question in this document, with no LAUNCH line yet._

##### C-06 · Autos: the "out the door" total

**The question.** On a car sale at a dealer, do the dealer fee and plates pay tax, and does a trade-in reduce the tax?

**What To'Latino does today.** The listing shows an estimated "out the door" total: the price plus 6% city tax on the price, not including the dealer fee or plates. The sale takes place at the dealer, not in the app, and To'Latino collects nothing for the car. There is a parallel question for the lawyer about the fee cap (A-37).

**What we assume.** This is what is calculated today; the plan asks to confirm whether the fee and plates pay tax and whether a trade-in reduces the tax.

**What would change depending on the answer.** The out-the-door formula and what the listing says.

**Blocks opening: one part (affects a feature or category; that part waits for your answer and the founder decides whether to open without it).**

_For us: LAUNCH "4ic · Tope del cargo del dealer de PA" (in Spanish, as in our checklist)._

#### What To'Latino charges for itself

##### C-07 · To'Latino's own revenue: Pro, sponsorships and commissions

**The question.** Does any of To'Latino's own charges (Pro subscription, sponsorships and featured spots, commissions) carry Pennsylvania sales tax or require a registration? What should the receipt we send say?

**What To'Latino does today.** Pro costs $14.99 per month (the year, 10 months), with a 30-day trial that asks for no card and no added tax. Each charge sends an email receipt with plan, period, card and a single total; it has no tax line or invoice number. Sponsorships are paid spots in lists and events with a price set in Settings. The commission on each operation is deducted from the payment to the business (orders 10%, appointments 8%, layaways 6%, tickets 5% + $1; initial, adjustable values).

**What we assume.** No assumption: today no tax is added to anything To'Latino charges.

**What would change depending on the answer.** Whether a tax line, an invoice number or a registration is added, and what the receipt says.

**Blocks opening: yes.**

_For us: LAUNCH "Recibo por correo de cada cobro de Pro e impuesto" (in Spanish, as in our checklist)._

#### Other people's money that passes through To'Latino

##### C-08 · Charges routed to businesses and payment reporting

**The question.** When To'Latino charges a card (orders, appointments, deposits, plans, rentals) and the money goes to the business's account, who reports those payments to the tax authorities (Stripe, To'Latino or both), and what should we give each business (for example, an annual summary)?

**What To'Latino does today.** The charge is processed by Stripe with one connected account per business (Connect, Express type). The card is held when sent, charged when the business accepts, and the money goes to the business's account minus To'Latino's commission. The tax collected is included in what is transferred to the business; To'Latino neither reports nor pays it. To'Latino does not collect or store the businesses' tax identification numbers: Stripe asks for them when connecting the account. Today To'Latino generates no tax form.

**What we assume.** No assumption. There is a parallel question for the lawyer (A-14).

**What would change depending on the answer.** Which forms or summaries we generate for businesses and who issues them.

**Blocks opening: yes.**

_For us: LAUNCH "6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…" (in Spanish, as in our checklist)._

##### C-09 · Tickets: money held until Tuesday and payments to organizers

**The question.** How should the ticket money that To'Latino collects and later transfers to the organizer be recorded (a liability until paid?), what must be reported about each organizer (1099-K or other) and what is To'Latino's revenue on each ticket?

**What To'Latino does today.** The ticket charge stays in To'Latino's Stripe account and is transferred to the organizer on the Tuesday after each date. What they receive is what was charged minus refunds, minus what was lost in disputes and minus the commission (5% + $1 per ticket, taken out of the organizer's share). The database calculates the amount from the ledger and only allows paying a finished date with no disputes. A refund or dispute on an already paid date is deducted from the organizer's next settlement; if there is no other within the period, the transfer is reversed. A new organizer's first event above $2,000 is held until a trust reviewer checks it. If a date is cancelled, every order is refunded 100% with no commission and To'Latino absorbs the card cost.

**What we assume.** No assumption. There is a parallel question for the lawyer (A-14).

**What would change depending on the answer.** The bookkeeping treatment, the reports for organizers and how settlement is done.

**Blocks opening: yes.**

_For us: LAUNCH "6e · Abogado: To'Latino como comerciante del cobro…»; «6c · Abogado: ley de reventa de boletos de PA…" (in Spanish, as in our checklist)._

##### C-10 · Amusement tax on tickets

**The question.** If any of the five cities or the state levies a tax on amusement tickets, who must collect and report it (the organizer or To'Latino) and how should it appear on the ticket and the receipt?

**What To'Latino does today.** Tickets are sold with the tax line at 0%. The price the buyer sees includes all fees. To'Latino neither calculates nor pays any amusement tax.

**What we assume.** No assumption. There is a parallel question for the lawyer (A-23).

**What would change depending on the answer.** A per-city tax line on tickets and who reports it.

**Blocks opening: yes.**

_For us: LAUNCH "6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…" (in Spanish, as in our checklist)._

##### C-11 · Promoter reward

**The question.** When To'Latino pays a neighbor promoter for bringing in a business, what records or forms does that payment require?

**What To'Latino does today.** A neighbor with a promoter code brings in a business; when the business reaches 5 completed orders or appointments, the reward ($10 by default, adjustable) is recorded as "pending payment". The actual payment is not made yet: moving to "paid" arrives with real money. A business counts for only one promoter and the reward is rejected if the owner is the promoter or shares a device with them.

**What we assume.** No assumption.

**What would change depending on the answer.** What data we ask the promoter for before paying and how the payment is recorded.

**Blocks opening: no.**

_For us: LAUNCH "Pagar la recompensa del promotor a la Wallet" (in Spanish, as in our checklist)._

#### Books and reports

##### C-12 · What reports you need each month

**The question.** What reports, at what level of detail and how often do you need from To'Latino to keep the books (commissions, held ticket money, refunds, card cost, tax collected by city)?

**What To'Latino does today.** The Super Admin has money views, the detail of each transaction and a reconciliation against Stripe, with alerts when something does not match (for example a stuck refund). The card cost of an absorbed refund is estimated today (2.9% + 30¢ per refunded order) until real Stripe is connected; with real Stripe, each charge's cost will be read. Every money movement leaves an insert-only audit entry.

**What we assume.** No assumption.

**What would change depending on the answer.** Which reports we build or export and with what breakdowns.

**Blocks opening: no.**

_For us: a new question in this document, with no LAUNCH line yet._

### What the founder has already decided and is not asked

The following is already decided; you need not question it, unless your answer to a question contradicts it (then please say so).

- **Decision A.** The platform opens to the public when everything is ready (except El Patio); the five cities open together.
- **Decision X.** The cities are five in Pennsylvania: Hazleton, Allentown, Wilkes-Barre, Scranton and Reading.
- **Decision O.** We build our own and pay only for what cannot be replicated; the list of paid services is in the plan and only grows by the founder's decision.
- **Decision G.** El Patio is outside; when built, prizes will be coins only (no cash value).
- **Other decisions (no letter: they are in the plan and the checklist).** Card payments are made with Stripe (the platform account and each business's connected account); Pro costs $14.99 per month; each operation's commission is a Settings value the founder can change.

### Which line each question comes from

For us: when the answers arrive, each line of our pending list (LAUNCH) is closed with its question.

| Question | LAUNCH line (first words, in Spanish) |
|---|---|
| C-01 · Tax registrations before opening | (no line: new question) |
| C-02 · Auto and Home repairs: parts, materials and labor | «Impuesto de Auto y Hogar (validar con contador)»; «Validar con el contador: impuesto de PA solo sobre piezas/materiales» |
| C-03 · Prepared food and private events at restaurants | «6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD)» |
| C-04 · Each city's tax and who maintains it | «El impuesto de cada ciudad lo confirma el contador» |
| C-05 · Markets and stores: what is exempt and what is not | (no line: new question) |
| C-06 · Autos: the "out the door" total | «4ic · Tope del cargo del dealer de PA» |
| C-07 · To'Latino's own revenue: Pro, sponsorships and commissions | «Recibo por correo de cada cobro de Pro e impuesto» |
| C-08 · Charges routed to businesses and payment reporting | «6c · Abogado: ley de reventa de boletos de PA…»; «6e · Abogado: To'Latino como comerciante del cobro…» |
| C-09 · Tickets: money held until Tuesday and payments to organizers | «6e · Abogado: To'Latino como comerciante del cobro…»; «6c · Abogado: ley de reventa de boletos de PA…» |
| C-10 · Amusement tax on tickets | «6c · Abogado: ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad…» |
| C-11 · Promoter reward | «Pagar la recompensa del promotor a la Wallet» |
| C-12 · What reports you need each month | (no line: new question) |
