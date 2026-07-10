window.TOLATINO_MENU = {
 "restaurant": {
  "name": "Burger Amigo",
  "tagline": "Hamburguesas · Pollo · Desayuno",
  "rating": 4.8,
  "reviews": 2140,
  "priceLevel": "$",
  "cuisine": "Comida rápida · Americana",
  "distance": "1.2 mi",
  "etaMin": 20,
  "etaMax": 35,
  "deliveryFee": 1.99,
  "serviceRate": 0.1,
  "taxRate": 0.0825,
  "smallOrderFee": 2,
  "minFree": 15,
  "address": "5821 Bellaire Blvd, Houston, TX",
  "neighborhood": "Gulfton",
  "hours": "Abierto ahora · cierra 11:00 pm",
  "open": true,
  "tileA": "#F1E6FA",
  "tileB": "#E6D4F3",
  "accent": "#E8954A",
  "dealText": "2×1 en Combos los martes"
 },
 "groups": {
  "size3": {
   "name": "Tamaño",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Mediano",
     0
    ],
    [
     "Grande",
     0.8
    ],
    [
     "Gigante",
     1.5
    ]
   ]
  },
  "coffeeSize": {
   "name": "Tamaño",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Chico",
     0
    ],
    [
     "Mediano",
     0.6
    ],
    [
     "Grande",
     1.1
    ]
   ]
  },
  "patty": {
   "name": "La carne",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Sencilla",
     0
    ],
    [
     "Doble",
     1.8
    ],
    [
     "Triple",
     3.2
    ]
   ]
  },
  "bread": {
   "name": "Tipo de pan",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Clásico",
     0
    ],
    [
     "Brioche",
     0.5
    ],
    [
     "Integral",
     0
    ],
    [
     "Sin pan (envuelto en lechuga)",
     0
    ]
   ]
  },
  "cheese": {
   "name": "Queso extra",
   "type": "multi",
   "required": false,
   "max": 3,
   "opts": [
    [
     "Americano",
     0.6
    ],
    [
     "Cheddar",
     0.6
    ],
    [
     "Suizo",
     0.7
    ],
    [
     "Pepper Jack",
     0.7
    ]
   ]
  },
  "addBurger": {
   "name": "Agrégale extras",
   "type": "multi",
   "required": false,
   "max": 6,
   "opts": [
    [
     "Tocino",
     1.2
    ],
    [
     "Aguacate",
     1.5
    ],
    [
     "Huevo estrellado",
     1
    ],
    [
     "Jalapeños",
     0.5
    ],
    [
     "Cebolla caramelizada",
     0.7
    ],
    [
     "Champiñones",
     0.8
    ],
    [
     "Aros de cebolla",
     0.9
    ]
   ]
  },
  "addBreak": {
   "name": "Agrégale extras",
   "type": "multi",
   "required": false,
   "max": 5,
   "opts": [
    [
     "Huevo extra",
     1
    ],
    [
     "Tocino",
     1.2
    ],
    [
     "Salchicha",
     1.2
    ],
    [
     "Queso",
     0.6
    ],
    [
     "Aguacate",
     1.5
    ]
   ]
  },
  "addSalad": {
   "name": "Agrégale extras",
   "type": "multi",
   "required": false,
   "max": 5,
   "opts": [
    [
     "Aguacate",
     1.5
    ],
    [
     "Queso feta",
     0.7
    ],
    [
     "Tocino",
     1
    ],
    [
     "Crotones",
     0.4
    ],
    [
     "Nuez",
     0.6
    ]
   ]
  },
  "sauce": {
   "name": "Salsas",
   "type": "multi",
   "required": false,
   "max": 4,
   "opts": [
    [
     "Ketchup",
     0
    ],
    [
     "Mayonesa",
     0
    ],
    [
     "Mostaza",
     0
    ],
    [
     "Mayo chipotle",
     0.3
    ],
    [
     "BBQ",
     0.3
    ],
    [
     "Ranch",
     0.3
    ],
    [
     "Buffalo picante",
     0.3
    ],
    [
     "Salsa Amigo",
     0.4
    ]
   ]
  },
  "remove": {
   "name": "Quítale algo",
   "type": "multi",
   "required": false,
   "opts": [
    [
     "Sin cebolla",
     0
    ],
    [
     "Sin pepinillo",
     0
    ],
    [
     "Sin lechuga",
     0
    ],
    [
     "Sin tomate",
     0
    ],
    [
     "Sin salsa",
     0
    ]
   ]
  },
  "drink": {
   "name": "Elige tu bebida",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Coca-Cola",
     0
    ],
    [
     "Coca sin azúcar",
     0
    ],
    [
     "Sprite",
     0
    ],
    [
     "Fanta",
     0
    ],
    [
     "Té helado",
     0
    ],
    [
     "Agua embotellada",
     0
    ],
    [
     "Jugo de naranja",
     0.5
    ]
   ]
  },
  "friesType": {
   "name": "Elige tu acompañamiento",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Papas clásicas",
     0
    ],
    [
     "Papas gajo",
     0.6
    ],
    [
     "Aros de cebolla",
     0.8
    ],
    [
     "Ensalada pequeña",
     0.5
    ],
    [
     "Papas con queso",
     1.2
    ]
   ]
  },
  "milk": {
   "name": "Tipo de leche",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Entera",
     0
    ],
    [
     "Descremada",
     0
    ],
    [
     "Avena",
     0.6
    ],
    [
     "Almendra",
     0.6
    ],
    [
     "Deslactosada",
     0.4
    ]
   ]
  },
  "sweet": {
   "name": "Nivel de dulce",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Normal",
     0
    ],
    [
     "Poco dulce",
     0
    ],
    [
     "Extra dulce",
     0
    ],
    [
     "Sin azúcar",
     0
    ]
   ]
  },
  "temp": {
   "name": "Temperatura",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Caliente",
     0
    ],
    [
     "Con hielo",
     0
    ]
   ]
  },
  "shots": {
   "name": "Shots de espresso",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Sencillo",
     0
    ],
    [
     "Doble",
     0.8
    ],
    [
     "Triple",
     1.5
    ]
   ]
  },
  "toppings": {
   "name": "Toppings",
   "type": "multi",
   "required": false,
   "max": 4,
   "opts": [
    [
     "Crema batida",
     0.5
    ],
    [
     "Chispas de chocolate",
     0.4
    ],
    [
     "Caramelo",
     0.5
    ],
    [
     "Salsa de chocolate",
     0.5
    ],
    [
     "Nuez",
     0.6
    ],
    [
     "Cereza",
     0.3
    ]
   ]
  },
  "dressing": {
   "name": "Aderezo",
   "type": "single",
   "required": true,
   "opts": [
    [
     "César",
     0
    ],
    [
     "Ranch",
     0
    ],
    [
     "Balsámico",
     0
    ],
    [
     "Aceite y limón",
     0
    ],
    [
     "Chipotle",
     0
    ],
    [
     "Sin aderezo",
     0
    ]
   ]
  },
  "protein": {
   "name": "Proteína",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Pollo a la parrilla",
     0
    ],
    [
     "Pollo crujiente",
     0
    ],
    [
     "Camarón",
     2.5
    ],
    [
     "Res asada",
     1.5
    ],
    [
     "Sin proteína",
     -1
    ]
   ]
  },
  "ice": {
   "name": "Hielo",
   "type": "single",
   "required": false,
   "opts": [
    [
     "Normal",
     0
    ],
    [
     "Poco hielo",
     0
    ],
    [
     "Sin hielo",
     0
    ]
   ]
  },
  "kidsSide": {
   "name": "Acompañamiento",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Papitas",
     0
    ],
    [
     "Rodajas de manzana",
     0
    ],
    [
     "Zanahorias",
     0
    ]
   ]
  },
  "kidsDrink": {
   "name": "Bebida",
   "type": "single",
   "required": true,
   "opts": [
    [
     "Jugo de manzana",
     0
    ],
    [
     "Leche",
     0
    ],
    [
     "Agua",
     0
    ],
    [
     "Refresco chico",
     0.4
    ]
   ]
  }
 },
 "categories": [
  {
   "id": "combos",
   "name": "Combos",
   "icon": "bag",
   "tileA": "#FCE7CF",
   "tileB": "#F7D6B4",
   "items": [
    {
     "id": 1,
     "cat": "combos",
     "name": "Combo Amigo Clásico",
     "desc": "Hamburguesa con queso, papas medianas y bebida.",
     "price": 6.99,
     "kcal": 1050,
     "badge": "Popular",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 2,
     "cat": "combos",
     "name": "Combo Doble Amigo",
     "desc": "Doble carne, doble queso, papas y bebida.",
     "price": 8.99,
     "kcal": 1340,
     "badge": "",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 3,
     "cat": "combos",
     "name": "Combo Pollo Crujiente",
     "desc": "Sándwich de pollo crujiente, papas y bebida.",
     "price": 7.99,
     "kcal": 1120,
     "badge": "Popular",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 4,
     "cat": "combos",
     "name": "Combo BBQ Bacon",
     "desc": "Hamburguesa BBQ con tocino, papas y bebida.",
     "price": 9.49,
     "kcal": 1290,
     "badge": "",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 5,
     "cat": "combos",
     "name": "Combo Nuggets 10 pz",
     "desc": "Diez nuggets, papas y bebida.",
     "price": 8.49,
     "kcal": 980,
     "badge": "",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 6,
     "cat": "combos",
     "name": "Combo Rey Amigo",
     "desc": "Triple carne premium, papas grandes y bebida.",
     "price": 11.99,
     "kcal": 1620,
     "badge": "Nuevo",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 7,
     "cat": "combos",
     "name": "Combo Picante",
     "desc": "Hamburguesa jalapeño, papas y bebida.",
     "price": 8.49,
     "kcal": 1180,
     "badge": "Picante",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 8,
     "cat": "combos",
     "name": "Combo Vegano",
     "desc": "Hamburguesa de planta, papas y bebida.",
     "price": 8.99,
     "kcal": 890,
     "badge": "Vegano",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 9,
     "cat": "combos",
     "name": "Combo Fish Amigo",
     "desc": "Sándwich de pescado, papas y bebida.",
     "price": 7.99,
     "kcal": 1010,
     "badge": "",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 10,
     "cat": "combos",
     "name": "Combo Desayuno",
     "desc": "Muffin de huevo, hash brown y café.",
     "price": 5.99,
     "kcal": 720,
     "badge": "",
     "mods": [
      "friesType",
      "drink",
      "addBurger",
      "sauce",
      "remove"
     ]
    }
   ]
  },
  {
   "id": "burgers",
   "name": "Hamburguesas",
   "icon": "burger",
   "tileA": "#FBE0CE",
   "tileB": "#F3C9AE",
   "items": [
    {
     "id": 11,
     "cat": "burgers",
     "name": "Hamburguesa con Queso",
     "desc": "Carne, queso americano, pepinillo y cebolla.",
     "price": 3.49,
     "kcal": 300,
     "badge": "Popular",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 12,
     "cat": "burgers",
     "name": "Doble con Queso",
     "desc": "Doble carne y doble queso americano.",
     "price": 4.99,
     "kcal": 445,
     "badge": "",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 13,
     "cat": "burgers",
     "name": "Cuarto de Libra",
     "desc": "Un cuarto de libra de carne, queso y cebolla.",
     "price": 5.49,
     "kcal": 520,
     "badge": "Popular",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 14,
     "cat": "burgers",
     "name": "Rey Amigo",
     "desc": "Triple carne premium, tocino y cheddar.",
     "price": 8.99,
     "kcal": 780,
     "badge": "Nuevo",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 15,
     "cat": "burgers",
     "name": "BBQ Bacon",
     "desc": "Salsa BBQ, tocino y aros de cebolla.",
     "price": 6.49,
     "kcal": 640,
     "badge": "",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 16,
     "cat": "burgers",
     "name": "Jalapeño Fire",
     "desc": "Jalapeños, pepper jack y salsa picante.",
     "price": 5.99,
     "kcal": 560,
     "badge": "Picante",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 17,
     "cat": "burgers",
     "name": "Hamburguesa Ranchera",
     "desc": "Carne, aguacate y pico de gallo.",
     "price": 6.29,
     "kcal": 590,
     "badge": "",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 18,
     "cat": "burgers",
     "name": "Mushroom Swiss",
     "desc": "Champiñones salteados y queso suizo.",
     "price": 6.49,
     "kcal": 610,
     "badge": "",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 19,
     "cat": "burgers",
     "name": "Hamburguesa de Planta",
     "desc": "Carne vegetal, lechuga y tomate.",
     "price": 6.99,
     "kcal": 480,
     "badge": "Vegano",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    },
    {
     "id": 20,
     "cat": "burgers",
     "name": "Hamburguesa Sencilla",
     "desc": "Carne, lechuga, tomate y mayonesa.",
     "price": 2.99,
     "kcal": 280,
     "badge": "",
     "mods": [
      "patty",
      "cheese",
      "addBurger",
      "sauce",
      "remove",
      "bread"
     ]
    }
   ]
  },
  {
   "id": "chicken",
   "name": "Pollo",
   "icon": "drumstick",
   "tileA": "#FCEFCF",
   "tileB": "#F4E0A6",
   "items": [
    {
     "id": 21,
     "cat": "chicken",
     "name": "Sándwich de Pollo Crujiente",
     "desc": "Pechuga empanizada y pepinillo.",
     "price": 4.99,
     "kcal": 470,
     "badge": "Popular",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 22,
     "cat": "chicken",
     "name": "Sándwich de Pollo Picante",
     "desc": "Empanizado picante con mayo chipotle.",
     "price": 5.29,
     "kcal": 490,
     "badge": "Picante",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 23,
     "cat": "chicken",
     "name": "Nuggets (6 pz)",
     "desc": "Nuggets de pollo de pechuga blanca.",
     "price": 3.99,
     "kcal": 250,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 24,
     "cat": "chicken",
     "name": "Nuggets (10 pz)",
     "desc": "Nuggets de pollo de pechuga blanca.",
     "price": 5.99,
     "kcal": 420,
     "badge": "Popular",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 25,
     "cat": "chicken",
     "name": "Tenders (3 pz)",
     "desc": "Tiras de pollo crujiente.",
     "price": 4.49,
     "kcal": 380,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 26,
     "cat": "chicken",
     "name": "Tenders (5 pz)",
     "desc": "Tiras de pollo crujiente.",
     "price": 6.49,
     "kcal": 630,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 27,
     "cat": "chicken",
     "name": "Sándwich Deluxe",
     "desc": "Pollo, lechuga, tomate y mayonesa.",
     "price": 5.79,
     "kcal": 530,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 28,
     "cat": "chicken",
     "name": "Wrap de Pollo",
     "desc": "Pollo crujiente en tortilla de harina.",
     "price": 4.29,
     "kcal": 340,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 29,
     "cat": "chicken",
     "name": "Alitas BBQ (6 pz)",
     "desc": "Alitas glaseadas con salsa BBQ.",
     "price": 6.99,
     "kcal": 540,
     "badge": "Nuevo",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 30,
     "cat": "chicken",
     "name": "Pollo a la Parrilla",
     "desc": "Pechuga a la parrilla, sin empanizar.",
     "price": 5.49,
     "kcal": 320,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    }
   ]
  },
  {
   "id": "breakfast",
   "name": "Desayuno",
   "icon": "sun",
   "tileA": "#FEF0BE",
   "tileB": "#FBE39A",
   "items": [
    {
     "id": 31,
     "cat": "breakfast",
     "name": "Muffin de Huevo",
     "desc": "Huevo, jamón y queso en muffin inglés.",
     "price": 3.49,
     "kcal": 300,
     "badge": "Popular",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 32,
     "cat": "breakfast",
     "name": "Muffin de Salchicha",
     "desc": "Salchicha, huevo y queso.",
     "price": 3.79,
     "kcal": 480,
     "badge": "",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 33,
     "cat": "breakfast",
     "name": "Burrito de Desayuno",
     "desc": "Huevo, salchicha, papa y queso.",
     "price": 2.49,
     "kcal": 300,
     "badge": "",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 34,
     "cat": "breakfast",
     "name": "Hotcakes (3 pz)",
     "desc": "Con mantequilla y miel de maple.",
     "price": 4.29,
     "kcal": 580,
     "badge": "Popular",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 35,
     "cat": "breakfast",
     "name": "Hash Browns",
     "desc": "Papa rallada dorada y crujiente.",
     "price": 1.99,
     "kcal": 140,
     "badge": "",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 36,
     "cat": "breakfast",
     "name": "Bagel de Tocino",
     "desc": "Bagel con huevo, tocino y queso.",
     "price": 4.49,
     "kcal": 520,
     "badge": "",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 37,
     "cat": "breakfast",
     "name": "Big Desayuno",
     "desc": "Huevos, salchicha, hash brown y hotcakes.",
     "price": 6.49,
     "kcal": 1150,
     "badge": "",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 38,
     "cat": "breakfast",
     "name": "Parfait de Yogurt",
     "desc": "Yogurt, granola y fresas.",
     "price": 2.99,
     "kcal": 210,
     "badge": "Vegetariano",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 39,
     "cat": "breakfast",
     "name": "Chilaquiles Amigo",
     "desc": "Totopos, salsa, huevo y crema.",
     "price": 5.49,
     "kcal": 620,
     "badge": "Nuevo",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    },
    {
     "id": 40,
     "cat": "breakfast",
     "name": "Avena Caliente",
     "desc": "Avena con manzana y arándano.",
     "price": 2.79,
     "kcal": 320,
     "badge": "Vegetariano",
     "mods": [
      "addBreak",
      "sauce",
      "remove"
     ]
    }
   ]
  },
  {
   "id": "sides",
   "name": "Papas y Sides",
   "icon": "fries",
   "tileA": "#FCE9C6",
   "tileB": "#F5D89E",
   "items": [
    {
     "id": 41,
     "cat": "sides",
     "name": "Papas Fritas (Medianas)",
     "desc": "Doradas y crujientes por fuera.",
     "price": 2.49,
     "kcal": 320,
     "badge": "Popular",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 42,
     "cat": "sides",
     "name": "Papas Fritas (Grandes)",
     "desc": "Doradas y crujientes por fuera.",
     "price": 2.99,
     "kcal": 490,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 43,
     "cat": "sides",
     "name": "Papas Gajo",
     "desc": "Papas gajo sazonadas con especias.",
     "price": 3.29,
     "kcal": 380,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 44,
     "cat": "sides",
     "name": "Aros de Cebolla",
     "desc": "Empanizados y crujientes.",
     "price": 3.49,
     "kcal": 410,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 45,
     "cat": "sides",
     "name": "Papas con Queso",
     "desc": "Papas cubiertas de queso cheddar.",
     "price": 3.99,
     "kcal": 560,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 46,
     "cat": "sides",
     "name": "Papas Locas",
     "desc": "Papas, queso, tocino y jalapeño.",
     "price": 4.99,
     "kcal": 680,
     "badge": "Picante",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 47,
     "cat": "sides",
     "name": "Mozzarella Sticks (4 pz)",
     "desc": "Con salsa marinara.",
     "price": 3.99,
     "kcal": 350,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 48,
     "cat": "sides",
     "name": "Elote Amigo",
     "desc": "Elote con crema, queso y chile.",
     "price": 3.49,
     "kcal": 280,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 49,
     "cat": "sides",
     "name": "Ensalada Pequeña",
     "desc": "Mix verde con aderezo a elegir.",
     "price": 2.99,
     "kcal": 90,
     "badge": "Vegetariano",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 50,
     "cat": "sides",
     "name": "Puré con Gravy",
     "desc": "Puré de papa con gravy de la casa.",
     "price": 2.79,
     "kcal": 240,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    }
   ]
  },
  {
   "id": "kids",
   "name": "Cajita Amigo",
   "icon": "smile",
   "tileA": "#E3EEFB",
   "tileB": "#CFE0F5",
   "items": [
    {
     "id": 51,
     "cat": "kids",
     "name": "Cajita Hamburguesa",
     "desc": "Hamburguesa, papitas, bebida y juguete.",
     "price": 4.99,
     "kcal": 500,
     "badge": "Popular",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 52,
     "cat": "kids",
     "name": "Cajita Nuggets (4 pz)",
     "desc": "Nuggets, papitas, bebida y juguete.",
     "price": 4.99,
     "kcal": 470,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 53,
     "cat": "kids",
     "name": "Cajita Pollo",
     "desc": "Tenders, papitas y bebida.",
     "price": 5.29,
     "kcal": 490,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 54,
     "cat": "kids",
     "name": "Cajita Queso",
     "desc": "Hamburguesa con queso, papitas y bebida.",
     "price": 5.19,
     "kcal": 530,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 55,
     "cat": "kids",
     "name": "Cajita Saludable",
     "desc": "Nuggets, rodajas de manzana y leche.",
     "price": 5.49,
     "kcal": 380,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 56,
     "cat": "kids",
     "name": "Cajita Hotdog",
     "desc": "Hotdog, papitas y bebida.",
     "price": 4.79,
     "kcal": 450,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 57,
     "cat": "kids",
     "name": "Cajita Wrap",
     "desc": "Wrap de pollo, uvas y agua.",
     "price": 5.29,
     "kcal": 360,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 58,
     "cat": "kids",
     "name": "Cajita Desayuno",
     "desc": "Mini hotcakes y leche.",
     "price": 4.49,
     "kcal": 400,
     "badge": "",
     "mods": [
      "kidsSide",
      "kidsDrink",
      "sauce"
     ]
    },
    {
     "id": 59,
     "cat": "kids",
     "name": "Leche Chica",
     "desc": "Leche entera o descremada.",
     "price": 1.29,
     "kcal": 100,
     "badge": "",
     "mods": []
    },
    {
     "id": 60,
     "cat": "kids",
     "name": "Rodajas de Manzana",
     "desc": "Snack de manzana fresca.",
     "price": 1.49,
     "kcal": 40,
     "badge": "Vegetariano",
     "mods": []
    }
   ]
  },
  {
   "id": "salads",
   "name": "Ensaladas",
   "icon": "leaf",
   "tileA": "#E1F3E7",
   "tileB": "#CFE6C9",
   "items": [
    {
     "id": 61,
     "cat": "salads",
     "name": "Ensalada César con Pollo",
     "desc": "Romana, pollo, parmesano y crotones.",
     "price": 6.99,
     "kcal": 470,
     "badge": "Popular",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 62,
     "cat": "salads",
     "name": "Ensalada del Chef",
     "desc": "Jamón, pavo, queso y huevo.",
     "price": 6.49,
     "kcal": 380,
     "badge": "",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 63,
     "cat": "salads",
     "name": "Ensalada Suroeste",
     "desc": "Pollo, frijol negro, elote y pico.",
     "price": 6.99,
     "kcal": 440,
     "badge": "Picante",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 64,
     "cat": "salads",
     "name": "Ensalada Griega",
     "desc": "Feta, aceituna, pepino y tomate.",
     "price": 6.29,
     "kcal": 320,
     "badge": "Vegetariano",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 65,
     "cat": "salads",
     "name": "Ensalada de Fresa",
     "desc": "Fresa, nuez y queso de cabra.",
     "price": 6.49,
     "kcal": 350,
     "badge": "Vegetariano",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 66,
     "cat": "salads",
     "name": "Ensalada Cobb",
     "desc": "Tocino, huevo, aguacate y pollo.",
     "price": 7.49,
     "kcal": 520,
     "badge": "",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 67,
     "cat": "salads",
     "name": "Bowl de Quinoa",
     "desc": "Quinoa, verduras y aderezo tahini.",
     "price": 6.99,
     "kcal": 410,
     "badge": "Vegano",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 68,
     "cat": "salads",
     "name": "Ensalada Caprese",
     "desc": "Mozzarella, tomate y albahaca.",
     "price": 5.99,
     "kcal": 300,
     "badge": "Vegetariano",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 69,
     "cat": "salads",
     "name": "Ensalada Asiática",
     "desc": "Pollo, mandarina y almendra.",
     "price": 6.99,
     "kcal": 430,
     "badge": "",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    },
    {
     "id": 70,
     "cat": "salads",
     "name": "Ensalada Jardín",
     "desc": "Mix de verduras frescas de la casa.",
     "price": 4.99,
     "kcal": 150,
     "badge": "Vegano",
     "mods": [
      "dressing",
      "protein",
      "addSalad"
     ]
    }
   ]
  },
  {
   "id": "wraps",
   "name": "Wraps",
   "icon": "wrap",
   "tileA": "#EFE7D2",
   "tileB": "#E0D3B4",
   "items": [
    {
     "id": 71,
     "cat": "wraps",
     "name": "Wrap César",
     "desc": "Pollo crujiente, romana y aderezo césar.",
     "price": 4.49,
     "kcal": 440,
     "badge": "Popular",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 72,
     "cat": "wraps",
     "name": "Wrap Ranchero",
     "desc": "Pollo, tocino y aderezo ranch.",
     "price": 4.79,
     "kcal": 520,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 73,
     "cat": "wraps",
     "name": "Wrap Picante",
     "desc": "Pollo picante, jalapeño y chipotle.",
     "price": 4.79,
     "kcal": 480,
     "badge": "Picante",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 74,
     "cat": "wraps",
     "name": "Wrap de Res",
     "desc": "Carne, queso y pico de gallo.",
     "price": 5.29,
     "kcal": 560,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 75,
     "cat": "wraps",
     "name": "Wrap Vegano",
     "desc": "Falafel, hummus y verduras.",
     "price": 4.99,
     "kcal": 380,
     "badge": "Vegano",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 76,
     "cat": "wraps",
     "name": "Wrap Griego",
     "desc": "Pollo, feta y salsa tzatziki.",
     "price": 4.99,
     "kcal": 460,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 77,
     "cat": "wraps",
     "name": "Wrap Desayuno",
     "desc": "Huevo, tocino y queso.",
     "price": 3.99,
     "kcal": 400,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 78,
     "cat": "wraps",
     "name": "Wrap BBQ",
     "desc": "Pollo, salsa BBQ y aros de cebolla.",
     "price": 5.29,
     "kcal": 540,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 79,
     "cat": "wraps",
     "name": "Wrap de Pescado",
     "desc": "Pescado crujiente y salsa tártara.",
     "price": 5.49,
     "kcal": 500,
     "badge": "",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    },
    {
     "id": 80,
     "cat": "wraps",
     "name": "Wrap Buffalo",
     "desc": "Pollo buffalo y blue cheese.",
     "price": 5.29,
     "kcal": 520,
     "badge": "Picante",
     "mods": [
      "sauce",
      "addBurger",
      "remove"
     ]
    }
   ]
  },
  {
   "id": "desserts",
   "name": "Postres",
   "icon": "icecream",
   "tileA": "#FBE6EF",
   "tileB": "#F4CFDF",
   "items": [
    {
     "id": 81,
     "cat": "desserts",
     "name": "Cono de Vainilla",
     "desc": "Helado suave de vainilla.",
     "price": 1.49,
     "kcal": 200,
     "badge": "Popular",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 82,
     "cat": "desserts",
     "name": "Sundae de Chocolate",
     "desc": "Helado con salsa de chocolate.",
     "price": 2.49,
     "kcal": 330,
     "badge": "",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 83,
     "cat": "desserts",
     "name": "Sundae de Caramelo",
     "desc": "Helado con caramelo y nuez.",
     "price": 2.69,
     "kcal": 360,
     "badge": "",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 84,
     "cat": "desserts",
     "name": "McFlurry Oreo",
     "desc": "Helado batido con galleta Oreo.",
     "price": 3.49,
     "kcal": 510,
     "badge": "Popular",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 85,
     "cat": "desserts",
     "name": "Pay de Manzana",
     "desc": "Empanada caliente de manzana.",
     "price": 1.99,
     "kcal": 240,
     "badge": "",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 86,
     "cat": "desserts",
     "name": "Pay de Cajeta",
     "desc": "Empanada caliente de cajeta.",
     "price": 2.19,
     "kcal": 260,
     "badge": "Nuevo",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 87,
     "cat": "desserts",
     "name": "Galletas (3 pz)",
     "desc": "Galletas con chispas de chocolate.",
     "price": 1.99,
     "kcal": 350,
     "badge": "",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 88,
     "cat": "desserts",
     "name": "Churros (5 pz)",
     "desc": "Con azúcar y canela.",
     "price": 2.99,
     "kcal": 330,
     "badge": "Nuevo",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 89,
     "cat": "desserts",
     "name": "Brownie Caliente",
     "desc": "Brownie tibio con helado.",
     "price": 3.29,
     "kcal": 480,
     "badge": "",
     "mods": [
      "toppings"
     ]
    },
    {
     "id": 90,
     "cat": "desserts",
     "name": "Flan Amigo",
     "desc": "Flan casero de vainilla.",
     "price": 2.79,
     "kcal": 290,
     "badge": "Nuevo",
     "mods": [
      "toppings"
     ]
    }
   ]
  },
  {
   "id": "coffee",
   "name": "Café",
   "icon": "coffee",
   "tileA": "#EADCCC",
   "tileB": "#DAC3A9",
   "items": [
    {
     "id": 91,
     "cat": "coffee",
     "name": "Café Americano",
     "desc": "Café negro recién preparado.",
     "price": 1.49,
     "kcal": 5,
     "badge": "Popular",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 92,
     "cat": "coffee",
     "name": "Latte",
     "desc": "Espresso con leche vaporizada.",
     "price": 2.99,
     "kcal": 190,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 93,
     "cat": "coffee",
     "name": "Cappuccino",
     "desc": "Espresso, leche y espuma cremosa.",
     "price": 2.99,
     "kcal": 150,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 94,
     "cat": "coffee",
     "name": "Café Helado",
     "desc": "Café frío servido con hielo.",
     "price": 2.49,
     "kcal": 140,
     "badge": "Popular",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 95,
     "cat": "coffee",
     "name": "Mocha",
     "desc": "Espresso, chocolate y leche.",
     "price": 3.29,
     "kcal": 290,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 96,
     "cat": "coffee",
     "name": "Caramel Macchiato",
     "desc": "Espresso, caramelo y leche.",
     "price": 3.49,
     "kcal": 300,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 97,
     "cat": "coffee",
     "name": "Frappé de Caramelo",
     "desc": "Bebida helada batida con caramelo.",
     "price": 3.79,
     "kcal": 420,
     "badge": "Popular",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 98,
     "cat": "coffee",
     "name": "Frappé de Mocha",
     "desc": "Bebida helada de chocolate.",
     "price": 3.79,
     "kcal": 440,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 99,
     "cat": "coffee",
     "name": "Chocolate Caliente",
     "desc": "Cacao con leche vaporizada.",
     "price": 2.49,
     "kcal": 320,
     "badge": "",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    },
    {
     "id": 100,
     "cat": "coffee",
     "name": "Chai Latte",
     "desc": "Té especiado con leche.",
     "price": 2.99,
     "kcal": 240,
     "badge": "Vegetariano",
     "mods": [
      "coffeeSize",
      "milk",
      "sweet",
      "temp",
      "shots"
     ]
    }
   ]
  },
  {
   "id": "drinks",
   "name": "Bebidas",
   "icon": "cup",
   "tileA": "#E1ECFB",
   "tileB": "#CCDDF4",
   "items": [
    {
     "id": 101,
     "cat": "drinks",
     "name": "Refresco (Mediano)",
     "desc": "Coca-Cola, Sprite o Fanta.",
     "price": 1.49,
     "kcal": 150,
     "badge": "Popular",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 102,
     "cat": "drinks",
     "name": "Refresco (Grande)",
     "desc": "Coca-Cola, Sprite o Fanta.",
     "price": 1.79,
     "kcal": 220,
     "badge": "",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 103,
     "cat": "drinks",
     "name": "Agua Embotellada",
     "desc": "Agua purificada de 600 ml.",
     "price": 1.49,
     "kcal": 0,
     "badge": "Vegano",
     "mods": []
    },
    {
     "id": 104,
     "cat": "drinks",
     "name": "Jugo de Naranja",
     "desc": "Jugo 100% natural.",
     "price": 2.29,
     "kcal": 150,
     "badge": "Vegetariano",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 105,
     "cat": "drinks",
     "name": "Limonada",
     "desc": "Limonada fresca de la casa.",
     "price": 2.49,
     "kcal": 160,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 106,
     "cat": "drinks",
     "name": "Té Helado",
     "desc": "Té negro servido con hielo.",
     "price": 1.79,
     "kcal": 90,
     "badge": "",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 107,
     "cat": "drinks",
     "name": "Agua de Horchata",
     "desc": "Bebida de arroz con canela.",
     "price": 2.49,
     "kcal": 220,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 108,
     "cat": "drinks",
     "name": "Agua de Jamaica",
     "desc": "Flor de jamaica bien fría.",
     "price": 2.29,
     "kcal": 100,
     "badge": "Vegano",
     "mods": [
      "size3",
      "ice"
     ]
    },
    {
     "id": 109,
     "cat": "drinks",
     "name": "Leche",
     "desc": "Entera o descremada.",
     "price": 1.29,
     "kcal": 100,
     "badge": "",
     "mods": []
    },
    {
     "id": 110,
     "cat": "drinks",
     "name": "Bebida Energética",
     "desc": "Bebida energética bien fría.",
     "price": 2.99,
     "kcal": 210,
     "badge": "",
     "mods": [
      "size3",
      "ice"
     ]
    }
   ]
  },
  {
   "id": "shakes",
   "name": "Malteadas",
   "icon": "shake",
   "tileA": "#F3DEEB",
   "tileB": "#E7C3D8",
   "items": [
    {
     "id": 111,
     "cat": "shakes",
     "name": "Malteada de Vainilla",
     "desc": "Clásica y cremosa de vainilla.",
     "price": 3.49,
     "kcal": 530,
     "badge": "Popular",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 112,
     "cat": "shakes",
     "name": "Malteada de Chocolate",
     "desc": "Chocolate cremoso.",
     "price": 3.49,
     "kcal": 560,
     "badge": "Popular",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 113,
     "cat": "shakes",
     "name": "Malteada de Fresa",
     "desc": "Fresa natural.",
     "price": 3.49,
     "kcal": 540,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 114,
     "cat": "shakes",
     "name": "Malteada de Oreo",
     "desc": "Con galleta Oreo triturada.",
     "price": 3.99,
     "kcal": 620,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 115,
     "cat": "shakes",
     "name": "Malteada de Cajeta",
     "desc": "Dulce de leche casero.",
     "price": 3.99,
     "kcal": 640,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 116,
     "cat": "shakes",
     "name": "Malteada de Café",
     "desc": "Con un shot de espresso.",
     "price": 3.99,
     "kcal": 510,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 117,
     "cat": "shakes",
     "name": "Float de Root Beer",
     "desc": "Refresco con bola de helado.",
     "price": 3.29,
     "kcal": 380,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 118,
     "cat": "shakes",
     "name": "Malteada de Plátano",
     "desc": "Plátano con vainilla.",
     "price": 3.79,
     "kcal": 550,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 119,
     "cat": "shakes",
     "name": "Malteada de Menta",
     "desc": "Menta con chispas de chocolate.",
     "price": 3.99,
     "kcal": 580,
     "badge": "",
     "mods": [
      "size3",
      "toppings"
     ]
    },
    {
     "id": 120,
     "cat": "shakes",
     "name": "Malteada Nutella",
     "desc": "Avellana y chocolate.",
     "price": 4.29,
     "kcal": 660,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "toppings"
     ]
    }
   ]
  },
  {
   "id": "snacks",
   "name": "Snacks",
   "icon": "star",
   "tileA": "#FCE0D7",
   "tileB": "#F5C7B9",
   "items": [
    {
     "id": 121,
     "cat": "snacks",
     "name": "Mozzarella Sticks (6 pz)",
     "desc": "Con salsa marinara.",
     "price": 4.49,
     "kcal": 520,
     "badge": "Popular",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 122,
     "cat": "snacks",
     "name": "Jalapeño Poppers (6 pz)",
     "desc": "Rellenos de queso crema.",
     "price": 4.79,
     "kcal": 480,
     "badge": "Picante",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 123,
     "cat": "snacks",
     "name": "Nachos con Queso",
     "desc": "Totopos con queso cheddar.",
     "price": 3.99,
     "kcal": 560,
     "badge": "",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 124,
     "cat": "snacks",
     "name": "Palitos de Pan",
     "desc": "Con salsa de ajo.",
     "price": 3.49,
     "kcal": 380,
     "badge": "Vegetariano",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 125,
     "cat": "snacks",
     "name": "Dedos de Pollo (3 pz)",
     "desc": "Crujientes con salsa a elegir.",
     "price": 4.99,
     "kcal": 420,
     "badge": "",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 126,
     "cat": "snacks",
     "name": "Taquitos (3 pz)",
     "desc": "Taquitos dorados de res.",
     "price": 3.99,
     "kcal": 340,
     "badge": "",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 127,
     "cat": "snacks",
     "name": "Empanadas (2 pz)",
     "desc": "De carne o de queso.",
     "price": 3.79,
     "kcal": 360,
     "badge": "Nuevo",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 128,
     "cat": "snacks",
     "name": "Papas Rellenas",
     "desc": "Papa rellena de carne molida.",
     "price": 2.99,
     "kcal": 290,
     "badge": "",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 129,
     "cat": "snacks",
     "name": "Aros de Cebolla (Grande)",
     "desc": "Porción grande para compartir.",
     "price": 3.99,
     "kcal": 490,
     "badge": "",
     "mods": [
      "sauce"
     ]
    },
    {
     "id": 130,
     "cat": "snacks",
     "name": "Edamame",
     "desc": "Vainas de soya con sal de mar.",
     "price": 3.29,
     "kcal": 180,
     "badge": "Vegano",
     "mods": [
      "sauce"
     ]
    }
   ]
  },
  {
   "id": "family",
   "name": "Para Compartir",
   "icon": "users",
   "tileA": "#EBE6FB",
   "tileB": "#DBD1F3",
   "items": [
    {
     "id": 131,
     "cat": "family",
     "name": "Caja Familiar (4 Burgers)",
     "desc": "Cuatro hamburguesas y papas grandes.",
     "price": 22.99,
     "kcal": 3200,
     "badge": "Popular",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 132,
     "cat": "family",
     "name": "20 Nuggets",
     "desc": "Para compartir en familia.",
     "price": 9.99,
     "kcal": 840,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 133,
     "cat": "family",
     "name": "40 Nuggets",
     "desc": "La fiesta de nuggets.",
     "price": 17.99,
     "kcal": 1680,
     "badge": "Popular",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 134,
     "cat": "family",
     "name": "Bucket de Alitas (12 pz)",
     "desc": "Alitas variadas con salsas.",
     "price": 13.99,
     "kcal": 1080,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 135,
     "cat": "family",
     "name": "Combo Familiar Pollo",
     "desc": "Tenders, papas y bebidas.",
     "price": 24.99,
     "kcal": 2800,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 136,
     "cat": "family",
     "name": "Caja Mixta Amigo",
     "desc": "Burgers, pollo y sides.",
     "price": 27.99,
     "kcal": 3400,
     "badge": "Nuevo",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 137,
     "cat": "family",
     "name": "Papas Familiares",
     "desc": "Porción grande para compartir.",
     "price": 5.99,
     "kcal": 980,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 138,
     "cat": "family",
     "name": "Party Pack Desayuno",
     "desc": "Seis muffins variados.",
     "price": 18.99,
     "kcal": 1800,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 139,
     "cat": "family",
     "name": "Bandeja de Postres",
     "desc": "Surtido de postres de la casa.",
     "price": 12.99,
     "kcal": 1600,
     "badge": "",
     "mods": [
      "drink",
      "friesType"
     ]
    },
    {
     "id": 140,
     "cat": "family",
     "name": "Jarra de Bebida",
     "desc": "Un galón de tu refresco favorito.",
     "price": 4.99,
     "kcal": 800,
     "badge": "",
     "mods": []
    }
   ]
  },
  {
   "id": "limited",
   "name": "Edición Limitada",
   "icon": "sparkle",
   "tileA": "#F7E7C2",
   "tileB": "#EED59B",
   "items": [
    {
     "id": 141,
     "cat": "limited",
     "name": "Amigo Rib",
     "desc": "Cerdo BBQ, cebolla y pepinillo.",
     "price": 6.49,
     "kcal": 520,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 142,
     "cat": "limited",
     "name": "Burger Navideña",
     "desc": "Edición festiva por tiempo limitado.",
     "price": 7.99,
     "kcal": 640,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 143,
     "cat": "limited",
     "name": "Malteada de Calabaza",
     "desc": "Sabor de temporada.",
     "price": 4.29,
     "kcal": 560,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 144,
     "cat": "limited",
     "name": "Combo Torneo",
     "desc": "Edición especial deportiva.",
     "price": 10.99,
     "kcal": 1400,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 145,
     "cat": "limited",
     "name": "Pollo Nashville",
     "desc": "Pollo picante estilo Nashville.",
     "price": 6.99,
     "kcal": 610,
     "badge": "Picante",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 146,
     "cat": "limited",
     "name": "Burger de Trufa",
     "desc": "Champiñón y aceite de trufa.",
     "price": 9.99,
     "kcal": 720,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 147,
     "cat": "limited",
     "name": "Postre de Temporada",
     "desc": "Sabor limitado del mes.",
     "price": 3.99,
     "kcal": 420,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 148,
     "cat": "limited",
     "name": "Wrap Baja",
     "desc": "Pescado estilo Baja con col.",
     "price": 5.99,
     "kcal": 540,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 149,
     "cat": "limited",
     "name": "Refresco de Edición",
     "desc": "Sabor especial por tiempo limitado.",
     "price": 1.99,
     "kcal": 180,
     "badge": "",
     "mods": [
      "size3",
      "sauce"
     ]
    },
    {
     "id": 150,
     "cat": "limited",
     "name": "Café de Temporada",
     "desc": "Especias de temporada.",
     "price": 3.49,
     "kcal": 300,
     "badge": "Nuevo",
     "mods": [
      "size3",
      "sauce"
     ]
    }
   ]
  }
 ]
};
