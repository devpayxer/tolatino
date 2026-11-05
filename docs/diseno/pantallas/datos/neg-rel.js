/* Relacionados: negocios conectados por decisión de los dos (el negocio propone, el otro acepta). Tipos: sucursal · mismo dueño.
   La relación es de dos lados: na = nota que ve el cliente en la página de a (describe a b) · nb = nota en la página de b (describe a a). */
(function () {
  const REL = [
    { a: 'sabor-dominicano', b: 'sabor-dominicano-alter', k: 'sucursal', na: ['Nuestra segunda cocina, en Alter St. La misma carta y los mismos precios.', 'Our second kitchen, on Alter St. Same menu, same prices.'], nb: ['Donde empezó todo en 2014, en Wyoming St. La misma carta y los mismos precios.', 'Where it all began in 2014, on Wyoming St. Same menu, same prices.'] },
    { a: 'sabor-dominicano', b: 'catering-hazleton', k: 'dueno', na: ['El catering de la familia Peña: bautizos, bodas y cumpleaños.', "The Peña family's catering: baptisms, weddings and birthdays."], nb: ['El restaurante de la familia Peña, en Wyoming St.', "The Peña family's restaurant, on Wyoming St."] },
    { a: 'sabor-dominicano', b: 'flan-y-mas', k: 'dueno', na: ['Los flanes de doña Rosa, los sábados y domingos.', "Doña Rosa's flans, on Saturdays and Sundays."], nb: ['El restaurante de doña Rosa, en Wyoming St.', "Doña Rosa's restaurant, on Wyoming St."] }
  ];
  window.TLRel = { REL };
})();
