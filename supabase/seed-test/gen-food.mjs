// Generator: FoodDrinks sample for Hazleton + Bronx. Emits SQL to stdout.
const q = (s) => s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const geo = (lat, lng) => `st_setsrid(st_makepoint(${lng},${lat}),4326)::geography`;
const out = ['begin;'];
const P = (s) => out.push(s);

// restaurant hours: Sun..Sat, minutes-of-day
const HRS_REST = [[[600,1200]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1380]],[[540,1380]]];

// 9 concepts; each used as one PAID + one FREE per city (=18/city)
const CONCEPTS = [
  { key:'taqueria', sub:'Taquería', price:'$', tile:['#FCEBD6','#F6DCBF'],
    cats:[['tacos','Tacos','Tacos'],['platillos','Platillos','Plates'],['bebidas','Bebidas','Drinks']],
    items:[
      ['tacos','Taco al pastor','Al pastor taco','Con piña, cebolla y cilantro','Pineapple, onion & cilantro',3.25],
      ['tacos','Taco de birria','Birria taco','Res consomé y queso','Beef in consommé with cheese',3.75],
      ['tacos','Taco de asada','Carne asada taco','Bistec a la parrilla','Grilled steak',3.50],
      ['tacos','Taco de suadero','Suadero taco','Res suave dorada','Tender griddled beef',3.25],
      ['tacos','Taco de pollo','Chicken taco','Pollo adobado','Marinated chicken',3.00],
      ['platillos','Quesabirria (3)','Quesabirria (3)','Tres tacos con consomé','Three tacos with consommé',12.50],
      ['platillos','Burrito grande','Big burrito','Arroz, frijol y tu carne','Rice, beans & your meat',10.50],
      ['platillos','Torta al pastor','Al pastor torta','Pan telera bien servida','Loaded telera roll',9.75],
      ['platillos','Sopa de tortilla','Tortilla soup','Con aguacate y queso','With avocado & cheese',7.50],
      ['bebidas','Agua de horchata','Horchata','Grande, casera','Large, house-made',3.50],
      ['bebidas','Agua de jamaica','Hibiscus water','Refrescante','Refreshing',3.50],
      ['bebidas','Jarritos','Jarritos','Varios sabores','Assorted flavors',2.50],
    ]},
  { key:'mariscos', sub:'Mariscos', price:'$$', tile:['#E4ECFB','#D7E5F6'],
    cats:[['ceviches','Ceviches','Ceviches'],['calientes','Platillos calientes','Hot plates'],['bebidas','Bebidas','Drinks']],
    items:[
      ['ceviches','Ceviche de camarón','Shrimp ceviche','Limón, tomate y cilantro','Lime, tomato & cilantro',13.50],
      ['ceviches','Ceviche mixto','Mixed ceviche','Camarón y pescado','Shrimp & fish',15.00],
      ['ceviches','Aguachile verde','Green aguachile','Picante con pepino','Spicy with cucumber',14.50],
      ['ceviches','Coctel de camarón','Shrimp cocktail','Salsa de tomate y aguacate','Tomato salsa & avocado',13.00],
      ['calientes','Camarones a la diabla','Diabla shrimp','Salsa picante','Spicy sauce',17.50],
      ['calientes','Pescado frito','Fried whole fish','Mojarra entera','Whole tilapia',16.00],
      ['calientes','Caldo de mariscos','Seafood soup','Surtido del día','Daily assortment',15.50],
      ['calientes','Tacos de camarón (3)','Shrimp tacos (3)','Empanizados','Breaded',12.00],
      ['calientes','Filete empanizado','Breaded fillet','Con arroz y ensalada','With rice & salad',15.00],
      ['bebidas','Michelada preparada','Michelada','Clásica o cubana','Classic or cubana',7.00],
      ['bebidas','Agua de coco','Coconut water','Natural','Natural',4.00],
      ['bebidas','Limonada','Lemonade','Mineral o natural','Sparkling or still',3.50],
    ]},
  { key:'pupuseria', sub:'Pupusería', price:'$', tile:['#E3F5EA','#D6EFDF'],
    cats:[['pupusas','Pupusas','Pupusas'],['platillos','Platillos','Plates'],['bebidas','Bebidas','Drinks']],
    items:[
      ['pupusas','Pupusa de queso','Cheese pupusa','Masa recién hecha','Fresh masa',2.75],
      ['pupusas','Pupusa revuelta','Revuelta pupusa','Chicharrón, frijol y queso','Pork, bean & cheese',3.25],
      ['pupusas','Pupusa de loroco','Loroco pupusa','Con queso','With cheese',3.25],
      ['pupusas','Pupusa de frijol','Bean pupusa','Con queso','With cheese',3.00],
      ['pupusas','Pupusa de ayote','Squash pupusa','Vegetariana','Vegetarian',3.25],
      ['platillos','Yuca frita con chicharrón','Yuca with pork','Curtido y salsa','Slaw & salsa',9.50],
      ['platillos','Tamal de elote','Corn tamal','Dulce','Sweet',3.50],
      ['platillos','Plato típico','Típico plate','Casamiento, plátano y crema','Rice-beans, plantain & cream',11.00],
      ['platillos','Pollo encebollado','Onion chicken','Con arroz','With rice',12.00],
      ['bebidas','Horchata salvadoreña','Salvadoran horchata','Con morro','With morro seed',3.50],
      ['bebidas','Ensalada (bebida)','Fruit drink','Bebida de frutas','Fruit beverage',4.00],
      ['bebidas','Café con leche','Coffee with milk','Caliente','Hot',2.50],
    ]},
  { key:'dominicana', sub:'Dominicana', price:'$$', tile:['#FBE9F0','#F5D8E6'],
    cats:[['desayunos','Desayunos','Breakfast'],['platos','Platos fuertes','Mains'],['bebidas','Bebidas','Drinks']],
    items:[
      ['desayunos','Mangú tres golpes','Mangú tres golpes','Plátano, huevo, queso y salami','Plantain, egg, cheese & salami',10.50],
      ['desayunos','Mangú con salami','Mangú with salami','Clásico','Classic',8.50],
      ['desayunos','Huevos con salami','Eggs & salami','Con tostones','With tostones',8.00],
      ['platos','Mofongo con camarón','Shrimp mofongo','Plátano majado','Mashed plantain',15.50],
      ['platos','La bandera','La bandera','Arroz, habichuela y carne','Rice, beans & meat',13.00],
      ['platos','Pollo guisado','Stewed chicken','Con arroz y habichuela','With rice & beans',12.50],
      ['platos','Chicharrón de pollo','Chicharrón de pollo','Con tostones','With tostones',12.00],
      ['platos','Sancocho','Sancocho','Guiso de siete carnes','Seven-meat stew',14.50],
      ['platos','Pernil con moro','Pernil with moro','Cerdo y arroz moro','Pork & rice moro',13.50],
      ['bebidas','Morir soñando','Morir soñando','Naranja y leche','Orange & milk',4.00],
      ['bebidas','Jugo de chinola','Passion fruit juice','Natural','Natural',4.00],
      ['bebidas','Malta','Malta','Fría','Cold',2.50],
    ]},
  { key:'pollo', sub:'Pollo asado', price:'$', tile:['#FCF1C7','#F6E8AE'],
    cats:[['pollo','Pollo','Chicken'],['acomp','Acompañamientos','Sides'],['bebidas','Bebidas','Drinks']],
    items:[
      ['pollo','Pollo entero asado','Whole roast chicken','Al carbón','Charcoal-grilled',13.99],
      ['pollo','Medio pollo','Half chicken','Con dos sides','With two sides',8.99],
      ['pollo','Cuarto de pollo','Quarter chicken','Pierna y muslo','Leg & thigh',5.99],
      ['pollo','Combo familiar','Family combo','Pollo entero + 3 sides','Whole chicken + 3 sides',22.99],
      ['acomp','Arroz','Rice','Blanco o amarillo','White or yellow',3.00],
      ['acomp','Frijoles','Beans','Refritos o de olla','Refried or whole',3.00],
      ['acomp','Tostones','Tostones','Plátano frito','Fried plantain',4.00],
      ['acomp','Ensalada','Salad','Fresca','Fresh',3.50],
      ['acomp','Yuca','Yuca','Con mojo','With mojo',4.00],
      ['bebidas','Refresco','Soda','Lata','Can',1.75],
      ['bebidas','Agua fresca','Agua fresca','Del día','Of the day',3.00],
      ['bebidas','Jugo natural','Fresh juice','Varios','Assorted',3.50],
    ]},
  { key:'panaderia', sub:'Panadería', price:'$', tile:['#F1EFFA','#E5DEF9'],
    cats:[['pan','Pan dulce','Sweet bread'],['pasteles','Pasteles','Cakes'],['cafe','Café','Coffee']],
    items:[
      ['pan','Concha','Concha','Vainilla o chocolate','Vanilla or chocolate',1.50],
      ['pan','Oreja','Palmier','Hojaldre','Puff pastry',1.75],
      ['pan','Cuernito','Croissant','Recién horneado','Freshly baked',2.00],
      ['pan','Empanada de piña','Pineapple empanada','Rellena','Filled',1.75],
      ['pan','Bolillo','Bolillo','Para tortas','For tortas',0.75],
      ['pan','Mantecada','Mantecada','Panque suave','Soft muffin',1.50],
      ['pasteles','Pastel tres leches (rebanada)','Tres leches slice','Cremoso','Creamy',4.50],
      ['pasteles','Pastel de fresa (rebanada)','Strawberry cake slice','Con fruta','With fruit',4.50],
      ['pasteles','Gelatina','Gelatin cup','De mosaico','Mosaic',2.50],
      ['pasteles','Flan','Flan','Casero','House-made',3.00],
      ['cafe','Café de olla','Café de olla','Canela y piloncillo','Cinnamon & piloncillo',2.50],
      ['cafe','Champurrado','Champurrado','Espeso','Thick',3.00],
    ]},
  { key:'pizza', sub:'Pizza', price:'$$', tile:['#FDE7EF','#F8CFDD'],
    cats:[['pizzas','Pizzas','Pizzas'],['extras','Extras','Extras'],['bebidas','Bebidas','Drinks']],
    items:[
      ['pizzas','Pizza de pepperoni (grande)','Pepperoni pizza (L)','Clásica','Classic',15.99],
      ['pizzas','Pizza de queso (grande)','Cheese pizza (L)','Tres quesos','Three cheese',13.99],
      ['pizzas','Pizza suprema','Supreme pizza','Todo incluido','The works',18.99],
      ['pizzas','Pizza hawaiana','Hawaiian pizza','Jamón y piña','Ham & pineapple',16.50],
      ['pizzas','Pizza mexicana','Mexican pizza','Chorizo y jalapeño','Chorizo & jalapeño',17.50],
      ['extras','Calzone','Calzone','Relleno de queso','Cheese-stuffed',10.50],
      ['extras','Pan de ajo','Garlic bread','Con queso','With cheese',5.50],
      ['extras','Alitas (8)','Wings (8)','BBQ o buffalo','BBQ or buffalo',10.99],
      ['extras','Ensalada César','Caesar salad','Fresca','Fresh',7.50],
      ['bebidas','Refresco 2L','2L soda','Para compartir','To share',3.50],
      ['bebidas','Refresco lata','Canned soda','Frío','Cold',1.75],
      ['bebidas','Agua embotellada','Bottled water','500ml','500ml',1.50],
    ]},
  { key:'colombiana', sub:'Colombiana', price:'$$', tile:['#FCEFD6','#F6E0B8'],
    cats:[['tipicos','Típicos','Typical'],['arepas','Arepas y empanadas','Arepas & empanadas'],['bebidas','Bebidas','Drinks']],
    items:[
      ['tipicos','Bandeja paisa','Bandeja paisa','Completa','The works',16.99],
      ['tipicos','Sancocho de gallina','Hen sancocho','Con mazorca','With corn',13.50],
      ['tipicos','Churrasco','Churrasco','Con chimichurri','With chimichurri',18.00],
      ['tipicos','Cazuela de frijoles','Bean cazuela','Con chicharrón','With pork',12.50],
      ['arepas','Arepa de huevo','Egg arepa','Frita','Fried',4.50],
      ['arepas','Arepa con queso','Cheese arepa','A la plancha','Griddled',3.50],
      ['arepas','Empanada de carne','Beef empanada','Con ají','With ají',2.00],
      ['arepas','Empanada de pollo','Chicken empanada','Con ají','With ají',2.00],
      ['arepas','Patacón con todo','Loaded patacón','Carne y queso','Meat & cheese',9.50],
      ['bebidas','Jugo de lulo','Lulo juice','Natural','Natural',4.00],
      ['bebidas','Jugo de guanábana','Soursop juice','Natural','Natural',4.00],
      ['bebidas','Colombiana (soda)','Colombiana soda','Fría','Cold',2.50],
    ]},
  { key:'cafe', sub:'Café', price:'$', tile:['#EDE7DF','#E0D5C7'],
    cats:[['cafe','Café','Coffee'],['comida','Para comer','To eat'],['frios','Fríos','Cold']],
    items:[
      ['cafe','Espresso','Espresso','Doble carga','Double shot',2.50],
      ['cafe','Cappuccino','Cappuccino','Espuma cremosa','Creamy foam',3.75],
      ['cafe','Latte','Latte','Caliente','Hot',4.00],
      ['cafe','Café americano','Americano','Grande','Large',2.75],
      ['cafe','Café con leche','Café con leche','Estilo latino','Latino style',3.00],
      ['comida','Sándwich cubano','Cuban sandwich','Prensado','Pressed',8.50],
      ['comida','Croissant de jamón','Ham croissant','Con queso','With cheese',5.50],
      ['comida','Tostada francesa','French toast','Con miel','With honey',6.50],
      ['comida','Empanada','Empanada','Del día','Of the day',2.50],
      ['frios','Frappé de café','Coffee frappé','Con crema','With cream',5.50],
      ['frios','Café helado','Iced coffee','Grande','Large',4.00],
      ['frios','Smoothie de mango','Mango smoothie','Natural','Natural',5.50],
    ]},
];

const REVIEW_BODIES = [
  ['Comí riquísimo, súper recomendado.','Ate so well, highly recommend.'],
  ['Sabor muy auténtico, como en casa.','Very authentic flavor, like home.'],
  ['Buen precio y porciones generosas.','Great price and generous portions.'],
  ['El servicio fue rápido y amable.','Service was fast and friendly.'],
  ['Mi lugar favorito del barrio.','My favorite spot in the neighborhood.'],
  ['Todo fresco y bien preparado.','Everything fresh and well made.'],
  ['Volveré con toda la familia.','I’ll be back with the whole family.'],
  ['Se pasaron, quedé bien satisfecho.','They nailed it, left very satisfied.'],
];

const CITIES = [
  { code:'hz', tag:'1', city:'Hazleton, PA', lat:40.9584, lng:-75.9746, tz:'America/New_York',
    streets:['W Broad St','N Wyoming St','E Diamond Ave','N Church St','Alter St','James St','N Vine St','Peace St','Carson St'] },
  { code:'bx', tag:'2', city:'The Bronx, NY', lat:40.8498, lng:-73.8664, tz:'America/New_York',
    streets:['E 149th St','Southern Blvd','Westchester Ave','Grand Concourse','E Tremont Ave','White Plains Rd','Willis Ave','Jerome Ave','Fordham Rd'] },
];

// business name pools per concept (varied per city)
const NAMEP = {
  taqueria:['Taquería El Sol','Tacos Don Chente','Taquería La Bendición'],
  mariscos:['Mariscos La Costa','El Camarón Feliz','Mariscos Sinaloa'],
  pupuseria:['Pupusería Salvadoreña','Sabor Cuscatlán','Pupusas La Ceiba'],
  dominicana:['El Sabor Dominicano','Quisqueya Restaurant','La Bandera Dominicana'],
  pollo:['Pollo Rico','El Pollo Dorado','Asadero La Brasa'],
  panaderia:['Panadería La Espiga','Pan Dulce México','La Migaja Dorada'],
  pizza:['Pizzería Napoli','La Pizza del Barrio','Bella Pizza'],
  colombiana:['Sabor Colombiano','El Paisa','La Arepa Dorada'],
  cafe:['Café Aroma','El Cafecito','Latino Coffee House'],
};
const OWNERP = ['Elena','Marco','Sandra','Rubén','Teresa','Jorge','Paola','Andrés','Verónica'];
const letters = 'abcdefghijklmnopqrstuvwxyz';

for (const C of CITIES) {
  let idx = 0;
  for (let ci = 0; ci < CONCEPTS.length; ci++) {
    const concept = CONCEPTS[ci];
    for (const paid of [true, false]) {
      const letter = letters[idx];
      const email = `${letter}@food${C.tag}.com`;
      const ownerName = `${OWNERP[ci % OWNERP.length]} ${paid?'Paid':'Free'}`.replace(' Paid','').replace(' Free','') + ' ' + (paid?'R.':'M.');
      const bizName = NAMEP[concept.key][ (paid?0:1) % NAMEP[concept.key].length ] + (C.code==='bx' ? ' Bronx' : ' Hazleton');
      const tier = paid ? (idx % 3 === 0 ? 'premium' : 'verified') : 'free';
      const slug = `${C.code}-${concept.key}-${paid?'p':'f'}${idx}`;
      const st = C.streets[idx % C.streets.length];
      const num = 100 + idx*13;
      const addr = `${num} ${st}`;
      const phone = C.code==='hz' ? `(570) 555-${String(1000+idx).slice(-4)}` : `(718) 555-${String(1000+idx).slice(-4)}`;
      const lat = C.lat + (Math.sin(idx*1.7)*0.012);
      const lng = C.lng + (Math.cos(idx*2.3)*0.012);
      const modules = paid
        ? {menu:true,services:false,bookings:false,products:false,rental:false,events:true,updates:true,staff:true}
        : {menu:true,services:false,bookings:false,products:false,rental:false,events:false,updates:false,staff:false};
      const menuCats = concept.cats.map(([id,es,en],i)=>({id,es,en,icon:'🍽️',tile:concept.tile[i%2],visible:true}));
      const menuConfig = { categories:menuCats, mods:[], dayparts:[], promos:[], tags:[],
        automation:{auto86:true,notifyLow:true,resetDaily:false,backorders:false}, ordering: paid };
      // owner user
      P(`select public._seed_user(${q(email)}, ${q(ownerName)}, ${q(ownerName.split(' ').map(w=>w[0]).join('').slice(0,2))}, '#7B61FF', ${q(C.city)}, ${lat}, ${lng});`);
      // business
      P(`insert into public.businesses (slug,name,category_id,tier,price_level,about_es,about_en,specialty_es,specialty_en,address,city,phone,is_open,photo_seed,tile_a,tile_b,subcategories,owner_id,features,hours,modules,settings,menu_config,location,timezone,connect_charges_enabled)
values (${q(slug)},${q(bizName)},'FoodDrinks',${q(tier)},${q(concept.price)},
${q('Cocina '+concept.sub.toLowerCase()+' hecha con cariño para la comunidad.')},${q(concept.sub+' cooking made with care for the community.')},
${q('Especialidad · '+concept.sub)},${q('Specialty · '+concept.sub)},
${q(addr)},${q(C.city)},${q(phone)},true,'tolatino',${q(concept.tile[0])},${q(concept.tile[1])},
array[${q(concept.sub)}]::text[], (select id from auth.users where email=${q(email)}),
array['Se habla español','Para llevar']::text[], ${J(HRS_REST)}, ${J(modules)}, ${J({})}, ${J(menuConfig)},
${geo(lat,lng)}, ${q(C.tz)}, false)
on conflict (slug) do nothing;`);
      // menu items
      concept.items.forEach((it,i)=>{
        const [section,name,en,descEs,descEn,price] = it;
        const attrs = { en, descEn, popular: i<2, isNew:false };
        P(`insert into public.business_items (business_id,kind,name,description,price,section,available,sort,attrs)
values ((select id from businesses where slug=${q(slug)}),'menu',${q(name)},${q(descEs)},${price},${q(section)},true,${i},${J(attrs)});`);
      });
      // reviews from same-city regular users (distinct users, 4-8)
      const nrev = 4 + (idx % 5);
      for (let r=0;r<nrev;r++){
        const userNum = ((r + idx) % 9) + 1;
        const uemail = `${userNum}@${C.tag}.com`;
        const rating = (r % 6 === 0) ? 4 : 5;
        const body = REVIEW_BODIES[(r+idx)%REVIEW_BODIES.length];
        P(`insert into public.reviews (business_id,author_name,author_initials,rating,body_es,body_en,featured,user_id)
select b.id, p.display_name, p.initials, ${rating}, ${q(body[0])}, ${q(body[1])}, ${r===0}, p.id
from businesses b, profiles p where b.slug=${q(slug)} and p.id=(select id from auth.users where email=${q(uemail)})
on conflict (business_id,user_id) do nothing;`);
      }
      // staff (paid only)
      if (paid){
        const staff = [['Gerente general','General manager','manager'],['Cocinero principal','Head cook','staff'],['Cajera','Cashier','staff'],['Mesero','Server','staff']];
        staff.forEach((s,i)=>P(`insert into public.business_staff (business_id,name,role,title_es,title_en,invited)
values ((select id from businesses where slug=${q(slug)}),${q(['Roberto','María','Lucía','Diego'][i]+' '+['G.','C.','R.','S.'][i])},${q(s[2])},${q(s[0])},${q(s[1])},false);`));
        // updates
        P(`insert into public.business_updates (business_id,kind,body_es,body_en,status)
values ((select id from businesses where slug=${q(slug)}),'offer',${q('¡Promoción de apertura! 10% de descuento esta semana.')},${q('Opening promo! 10% off this week.')},'live');`);
        P(`insert into public.business_updates (business_id,kind,body_es,body_en,status)
values ((select id from businesses where slug=${q(slug)}),'news',${q('Ya abrimos de lunes a domingo. ¡Los esperamos!')},${q('Now open Monday to Sunday. Come by!')},'live');`);
      }
      idx++;
    }
  }
}

P('commit;');
P(`select (select count(*) from businesses where category_id='FoodDrinks') as food_biz, (select count(*) from business_items where kind='menu') as menu_items, (select count(*) from reviews where user_id is not null) as user_reviews;`);
console.log(out.join('\n'));
