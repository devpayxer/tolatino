/* Ronda 2 · Venta de Autos: lo que vende cada familia. Cada modelo: marca, modelo, versiones, WMI (3), VDS (5), precio de lista nuevo (USD), años, y lo suyo.
   wmi/vds son de ficción con la forma de un VIN (sin I, O ni Q); el dígito verificador lo pone crearVin(). Los botes y carritos de golf no llevan VIN. */
const C = (make, model, trims, wmi, vds, base, y0, y1, o = {}) => ({ make, model, trims, wmi, vds, base, y: [y0, y1], fuel: "gasolina", drive: "fwd", trans: "automatica", ...o });

const PICKUP = [
  C("Ford", "F-150", ["XL", "XLT 4x4", "Lariat 4x4"], "1FT", "FW1E5", 38000, 2012, 2023, { drive: "4x4" }),
  C("Chevrolet", "Silverado 1500", ["WT", "LT", "LT 4x4"], "1GC", "UKEEC", 40000, 2012, 2023, { drive: "4x4" }),
  C("Ram", "1500", ["Tradesman", "Big Horn 4x4", "Laramie 4x4"], "1C6", "SRFTX", 39000, 2012, 2023, { drive: "4x4" }),
  C("Toyota", "Tacoma", ["SR", "SR5 4x4", "TRD Sport 4x4"], "5TF", "RZ5AN", 36000, 2012, 2023, { drive: "4x4" }),
  C("Toyota", "Tundra", ["SR5", "SR5 4x4", "Limited 4x4"], "5TF", "DY5F1", 44000, 2012, 2023, { drive: "4x4" }),
  C("GMC", "Sierra 1500", ["Base", "SLE 4x4", "Elevation 4x4"], "1GT", "P1EEC", 41000, 2013, 2023, { drive: "4x4" }),
  C("Nissan", "Frontier", ["S", "SV 4x4", "PRO-4X 4x4"], "1N6", "ED0EK", 31000, 2012, 2023, { drive: "4x4" }),
  C("Ford", "Ranger", ["XL", "XLT 4x4"], "1FT", "ER4FK", 33000, 2019, 2023, { drive: "4x4" }),
  C("Honda", "Ridgeline", ["Sport", "RTL AWD"], "5FP", "YU4F5", 38000, 2017, 2023, { drive: "awd" }),
  C("Chevrolet", "Colorado", ["WT", "LT 4x4"], "1GC", "GTBEA", 32000, 2015, 2023, { drive: "4x4" }),
  C("Ford", "F-250 Super Duty", ["XL", "XLT 4x4"], "1FT", "BW2BT", 48000, 2013, 2022, { drive: "4x4", fuel: "diesel" }),
].map((m) => ({ ...m, body: "pickup", foto: "33623775" }));
const SUV = [
  C("Toyota", "RAV4", ["LE", "XLE", "LE AWD"], "2T3", "BFREV", 30000, 2013, 2023, { drive: "awd" }),
  C("Honda", "CR-V", ["LX", "EX", "EX AWD"], "2HK", "RW2H5", 31000, 2013, 2023, { drive: "awd", trans: "cvt" }),
  C("Nissan", "Rogue", ["S", "SV", "SV AWD"], "5N1", "AT3MV", 28000, 2013, 2022, { drive: "awd", trans: "cvt" }),
  C("Ford", "Explorer", ["Base", "XLT 4WD", "Limited 4WD"], "1FM", "5K8DH", 38000, 2013, 2022, { drive: "awd" }),
  C("Chevrolet", "Equinox", ["LS", "LT AWD", "Premier AWD"], "2GN", "AXNEV", 29000, 2013, 2023, { drive: "awd" }),
  C("Jeep", "Grand Cherokee", ["Laredo 4x4", "Limited 4x4"], "1C4", "RJFAG", 42000, 2013, 2022, { drive: "4x4" }),
  C("Jeep", "Wrangler", ["Sport 4x4", "Sahara 4x4"], "1C4", "HJXDG", 36000, 2012, 2023, { drive: "4x4" }),
  C("Hyundai", "Tucson", ["SE", "SEL AWD"], "KM8", "J3CAL", 27000, 2014, 2023, { drive: "awd" }),
  C("Kia", "Sportage", ["LX", "EX AWD"], "KNA", "PX3AF", 27000, 2014, 2023, { drive: "awd" }),
  C("Subaru", "Forester", ["Base", "Premium AWD"], "JF2", "SKAFC", 29000, 2013, 2023, { drive: "awd", trans: "cvt" }),
  C("Mazda", "CX-5", ["Sport", "Touring AWD"], "JM3", "KFBCM", 29000, 2014, 2023, { drive: "awd" }),
  C("Chevrolet", "Tahoe", ["LS 4WD", "LT 4WD"], "1GN", "SKBKC", 55000, 2013, 2022, { drive: "4x4" }),
  C("Toyota", "Highlander", ["LE", "XLE AWD"], "5TD", "ZZRFH", 39000, 2014, 2023, { drive: "awd" }),
].map((m) => ({ ...m, body: "suv", foto: "33623770" }));
const VAN = [
  C("Toyota", "Sienna", ["LE", "XLE"], "5TD", "KK3DC", 38000, 2012, 2022, { foto: "20846594" }),
  C("Honda", "Odyssey", ["LX", "EX-L"], "5FN", "RL5G1", 36000, 2013, 2023, { foto: "1638459" }),
  C("Chrysler", "Pacifica", ["Touring", "Touring L"], "2C4", "RC1BG", 38000, 2017, 2023, { foto: "1638459" }),
  C("Dodge", "Grand Caravan", ["SE", "SXT"], "2C4", "RDGBG", 30000, 2012, 2020, { foto: "1592261" }),
  C("Kia", "Sedona", ["LX", "EX"], "KNDM", "B4C3X", 33000, 2015, 2021, { foto: "1592261", wmi: "KND" }),
  C("Chrysler", "Town & Country", ["Touring"], "2C4", "RC1BG", 31000, 2012, 2016, { foto: "1638459" }),
  C("Ford", "Transit Connect", ["XLT Wagon"], "NM0", "GE9F2", 27000, 2014, 2019, { foto: "1592261" }),
].map((m) => ({ ...m, body: "van" }));
const TRABAJO = [
  C("Ford", "Transit 250 carga", ["Base", "Techo medio"], "1FT", "BW2XM", 38000, 2015, 2023, { foto: "2449454", fuel: "gasolina", drive: "rwd" }),
  C("Ram", "ProMaster 1500", ["Techo bajo", "Techo alto"], "3C6", "TRVAG", 36000, 2015, 2023, { foto: "2449454" }),
  C("Chevrolet", "Express 2500", ["Carga", "Pasajeros"], "1GC", "WGAGA", 37000, 2012, 2022, { foto: "2449454", drive: "rwd" }),
  C("Mercedes-Benz", "Sprinter 2500", ["Techo alto", "Largo"], "W1Y", "4DDVG", 52000, 2015, 2022, { foto: "2449454", fuel: "diesel", drive: "rwd" }),
  C("Nissan", "NV200", ["S", "SV"], "3N6", "CM0LN", 24000, 2013, 2021, { foto: "2449454" }),
  C("GMC", "Savana 2500", ["Carga"], "1GT", "W7AGA", 37000, 2012, 2022, { foto: "2449454", drive: "rwd" }),
].map((m) => ({ ...m, body: "trabajo" }));
const FLOTA = [...TRABAJO, ...PICKUP.filter((m) => ["F-150", "Silverado 1500", "Ram 1500", "Colorado"].includes(m.model)).map((m) => ({ ...m, trims: ["XL / WT / Tradesman"], foto: "2449454" }))];
const CAJA = [
  C("Isuzu", "NPR-HD caja 16 pies", ["Diésel"], "JAL", "C4W16", 56000, 2012, 2022, { fuel: "diesel", drive: "rwd" }),
  C("Hino", "195 caja 18 pies", ["Estándar"], "5PV", "NE8JE", 62000, 2012, 2022, { fuel: "diesel", drive: "rwd" }),
  C("Ford", "F-650 caja 22 pies", ["Diésel"], "3FR", "F6HC9", 78000, 2013, 2021, { fuel: "diesel", drive: "rwd" }),
  C("Freightliner", "M2 106 caja 26 pies", ["Rampa elevadora"], "1FV", "ACWDA", 98000, 2012, 2021, { fuel: "diesel", drive: "rwd", cdl: true }),
  C("Isuzu", "FTR caja 20 pies", ["Diésel"], "JAL", "F4W17", 66000, 2013, 2022, { fuel: "diesel", drive: "rwd" }),
  C("Chevrolet", "Express 3500 caja 12 pies", ["Cutaway"], "1GB", "WGXFG", 46000, 2012, 2020, { drive: "rwd" }),
].map((m) => ({ ...m, body: "caja", foto: "2449454" }));
const SEMI = [
  C("Freightliner", "Cascadia 125", ["Dormitorio", "Dormitorio alto"], "1FU", "JJXYB", 150000, 2012, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "manual" }),
  C("Kenworth", "T680", ["Dormitorio 76"], "1XK", "YD49X", 165000, 2014, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "manual" }),
  C("Peterbilt", "579", ["Dormitorio 72"], "1XP", "BD49X", 168000, 2014, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "manual" }),
  C("Volvo", "VNL 760", ["Dormitorio"], "4V4", "NC9EH", 160000, 2014, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "automatica" }),
  C("International", "LT625", ["Dormitorio"], "3HS", "DDAAN", 140000, 2018, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "automatica" }),
  C("Mack", "Anthem 64T", ["Dormitorio"], "1M1", "AN3FH", 158000, 2018, 2022, { fuel: "diesel", drive: "rwd", cdl: true, trans: "manual" }),
].map((m) => ({ ...m, body: "trailer", foto: "2199293", dep: 0.93, floor: 24000 }));
const REMOLQUE = [
  C("Big Tex", "Utilitario 70PI 16 pies", ["Rampa trasera"], "16V", "PJ162", 4800, 2013, 2024, { fuel: null, drive: null, trans: null }),
  C("PJ Trailers", "Car hauler 20 pies", ["Rampas"], "4P5", "CH203", 9800, 2013, 2024, { fuel: null, drive: null, trans: null }),
  C("Load Trail", "Volteo 14 pies", ["Hidráulico"], "4ZE", "DT143", 11500, 2014, 2024, { fuel: null, drive: null, trans: null }),
  C("Haulmark", "Cerrado 7x16", ["Puerta rampa"], "16H", "EC716", 8200, 2013, 2024, { fuel: null, drive: null, trans: null }),
  C("Cargo Mate", "Cerrado 8.5x20", ["Doble eje"], "5NH", "EC820", 11800, 2014, 2024, { fuel: null, drive: null, trans: null }),
  C("Iron Bull", "Plataforma 20 pies", ["Doble eje"], "7K3", "FB202", 7600, 2014, 2024, { fuel: null, drive: null, trans: null }),
  C("Sure-Trac", "Plataforma inclinable 18 pies", ["Tilt"], "5JW", "TL182", 9400, 2015, 2024, { fuel: null, drive: null, trans: null }),
].map((m) => ({ ...m, body: "remolque", foto: "2199293", dep: 0.93, floor: 1200 }));
const MOTO = [
  C("Honda", "CBR500R", ["ABS"], "MLH", "PC476", 7000, 2014, 2023, { drive: null, trans: "manual" }),
  C("Honda", "Rebel 500", ["Estándar"], "JH2", "PC609", 6500, 2017, 2023, { drive: null, trans: "manual" }),
  C("Yamaha", "MT-07", ["Estándar"], "JYA", "RM47E", 7700, 2015, 2023, { drive: null, trans: "manual" }),
  C("Kawasaki", "Ninja 400", ["ABS"], "JKA", "EX400", 5700, 2018, 2023, { drive: null, trans: "manual" }),
  C("Suzuki", "GSX-R600", ["Deportiva"], "JS1", "GN2DC", 11500, 2012, 2020, { drive: null, trans: "manual" }),
  C("Harley-Davidson", "Sportster 883", ["Iron"], "1HD", "4CS31", 9500, 2012, 2021, { drive: null, trans: "manual", dep: 0.93 }),
  C("Triumph", "Bonneville T100", ["Estándar"], "SMT", "DC24A", 11500, 2016, 2023, { drive: null, trans: "manual" }),
  C("Kawasaki", "Vulcan S", ["ABS"], "JKA", "EN650", 7500, 2015, 2023, { drive: null, trans: "manual" }),
  C("Yamaha", "V Star 250", ["Estándar"], "JYA", "VG25E", 4500, 2012, 2021, { drive: null, trans: "manual" }),
].map((m) => ({ ...m, body: "moto", dep: m.dep ?? 0.9, floor: 1500, foto: ["2116475", "1715193", "1413412"][m.model.length % 3], mi: [1500, 4500] }));
const ATV = [
  C("Polaris", "Sportsman 570", ["EPS"], "4XA", "SH57A", 8500, 2013, 2023, { drive: "4x4", trans: "automatica" }),
  C("Can-Am", "Outlander 570", ["XT"], "3JB", "LB57A", 9500, 2014, 2023, { drive: "4x4" }),
  C("Honda", "FourTrax Rancher", ["4x4"], "1HF", "TE40A", 7200, 2012, 2023, { drive: "4x4" }),
  C("Yamaha", "Grizzly 700", ["EPS"], "5Y4", "AM70A", 9800, 2013, 2022, { drive: "4x4" }),
  C("Kawasaki", "Brute Force 750", ["4x4i"], "JKB", "VF75A", 9000, 2012, 2021, { drive: "4x4" }),
  C("Polaris", "Ranger 570 (UTV)", ["Full-Size"], "4XA", "RM57A", 12500, 2014, 2023, { drive: "4x4" }),
  C("Can-Am", "Defender HD8 (UTV)", ["DPS"], "3JB", "AV8HA", 15500, 2017, 2023, { drive: "4x4" }),
].map((m) => ({ ...m, body: "cuatrimoto", dep: 0.9, floor: 2200, foto: ["2116475", "1715193", "1413412"][m.model.length % 3], street: false }));
const SCOOTER = [
  C("Vespa", "Primavera 150", ["Estándar"], "ZAP", "M8200", 5500, 2014, 2023, { drive: null, trans: "cvt" }),
  C("Honda", "Ruckus", ["50"], "RLH", "AF540", 3300, 2012, 2022, { drive: null, trans: "cvt" }),
  C("Yamaha", "Zuma 125", ["Estándar"], "RKR", "SE5JA", 3700, 2013, 2023, { drive: null, trans: "cvt" }),
  C("Genuine", "Buddy 125", ["Estándar"], "RFB", "BY125", 3400, 2014, 2022, { drive: null, trans: "cvt" }),
  C("Kymco", "Agility 125", ["Estándar"], "RFB", "AG125", 2800, 2013, 2022, { drive: null, trans: "cvt" }),
  C("Honda", "PCX150", ["ABS"], "RLH", "KF301", 3800, 2014, 2022, { drive: null, trans: "cvt" }),
].map((m) => ({ ...m, body: "scooter", dep: 0.9, floor: 900, foto: ["2116475", "1715193", "1413412"][m.model.length % 3], mi: [800, 3500] }));
const BOTE = [
  C("Bayliner", "VR5 Bowrider 19 pies", ["Mercruiser"], null, null, 32000, 2012, 2022, { fuel: "gasolina", drive: null, trans: null }),
  C("Tracker", "Pro Guide V-16", ["Mercury 25"], null, null, 18000, 2013, 2023, { drive: null, trans: null }),
  C("Boston Whaler", "130 Super Sport", ["Mercury 40"], null, null, 21000, 2013, 2023, { drive: null, trans: null }),
  C("Sea-Doo", "Spark (moto acuática)", ["2 plazas"], null, null, 7500, 2015, 2023, { drive: null, trans: null }),
  C("Yamaha", "WaveRunner EX (moto acuática)", ["Deluxe"], null, null, 10500, 2015, 2023, { drive: null, trans: null }),
  C("Lund", "Fury 1650", ["Mercury 60"], null, null, 20000, 2013, 2022, { drive: null, trans: null }),
  C("Sun Tracker", "Party Barge 20", ["Pontón"], null, null, 27000, 2014, 2023, { drive: null, trans: null }),
].map((m) => ({ ...m, body: "bote", dep: 0.93, floor: 3500, foto: ["296278", "2533092"][m.model.length % 2], horas: true }));
const RV = [
  C("Jayco", "Jay Flight 28BHS", ["Tráiler de viaje"], "1UJ", "BJ28B", 32000, 2013, 2023, { fuel: null, drive: null, trans: null }),
  C("Forest River", "Salem 27RE", ["Tráiler de viaje"], "4X4", "SA27R", 30000, 2013, 2023, { fuel: null, drive: null, trans: null }),
  C("Winnebago", "Minnie Winnie 22R", ["Clase C"], "1F6", "MW22R", 98000, 2013, 2022, { fuel: "gasolina", drive: "rwd" }),
  C("Thor", "Chateau 24F", ["Clase C"], "1F6", "CH24F", 92000, 2014, 2022, { fuel: "gasolina", drive: "rwd" }),
  C("Coachmen", "Freelander 21QB", ["Clase C"], "1F6", "FL21R", 85000, 2013, 2021, { fuel: "gasolina", drive: "rwd" }),
  C("Keystone", "Passport 2400BH", ["Tráiler de viaje"], "4YD", "PP24B", 31000, 2014, 2023, { fuel: null, drive: null, trans: null }),
  C("Grand Design", "Imagine 2500RL", ["Tráiler de viaje"], "573", "GM25R", 36000, 2016, 2023, { fuel: null, drive: null, trans: null }),
].map((m) => ({ ...m, body: "rv", dep: 0.92, floor: 8000, foto: ["296278", "2533092"][m.model.length % 2] }));
const GOLF = [
  C("Club Car", "Onward 4 pasajeros", ["Eléctrico"], null, null, 13500, 2016, 2024, { fuel: "electrico", drive: null, trans: null }),
  C("E-Z-GO", "TXT 2 pasajeros", ["Gasolina"], null, null, 9500, 2012, 2023, { drive: null, trans: null }),
  C("Yamaha", "Drive2", ["Eléctrico"], null, null, 10500, 2015, 2024, { fuel: "electrico", drive: null, trans: null }),
  C("ICON", "i40 4 asientos", ["Eléctrico"], null, null, 9800, 2019, 2024, { fuel: "electrico", drive: null, trans: null }),
  C("Club Car", "Precedent", ["Eléctrico"], null, null, 9000, 2012, 2021, { fuel: "electrico", drive: null, trans: null }),
].map((m) => ({ ...m, body: "golf", dep: 0.9, floor: 2800, foto: ["296278", "2533092"][m.model.length % 2], street: false }));
const LUX = [
  C("Mercedes-Benz", "E 350", ["Sedán"], "W1K", "ZF5KB", 62000, 2016, 2023, { drive: "rwd" }),
  C("BMW", "530i", ["xDrive"], "WBA", "JA7C5", 59000, 2017, 2023, { drive: "awd" }),
  C("Audi", "Q5", ["Premium Plus"], "WA1", "BNAFY", 49000, 2016, 2023, { drive: "awd" }),
  C("Lexus", "RX 350", ["AWD"], "2T2", "HZMDA", 47000, 2016, 2023, { drive: "awd" }),
  C("Cadillac", "Escalade", ["Luxury 4WD"], "1GY", "S4BKJ", 82000, 2016, 2023, { drive: "4x4" }),
  C("Porsche", "Macan", ["Base"], "WP1", "AA2A5", 58000, 2016, 2023, { drive: "awd" }),
  C("Land Rover", "Range Rover Sport", ["HSE"], "SAL", "WR2FK", 78000, 2016, 2022, { drive: "4x4", fuel: "gasolina" }),
  C("Tesla", "Model 3", ["Long Range"], "5YJ", "3E1EB", 46000, 2018, 2023, { drive: "awd", fuel: "electrico" }),
  C("Chevrolet", "Corvette Stingray", ["3LT"], "1G1", "YC2D4", 70000, 2015, 2022, { drive: "rwd", trans: "manual" }),
  C("Maserati", "Ghibli", ["S Q4"], "ZAM", "57XSA", 85000, 2016, 2021, { drive: "awd" }),
].map((m) => ({ ...m, body: m.model === "Q5" || m.model === "RX 350" || m.model === "Macan" || m.model.startsWith("Range") || m.model === "Escalade" ? "suv" : "carro", dep: 0.88, floor: 12000, foto: ["977003", "1974520", "3156482"][m.model.length % 3] }));
/* Clásicos: precio de ficha directo (lo = bajo, hi = alto); antes de 1981 no hay VIN de 17 caracteres. */
const CLASICO = [
  { make: "Ford", model: "Mustang Fastback", year: 1965, body: "carro", lo: 32000, hi: 56000, trans: "manual", drive: "rwd", proyecto: false },
  { make: "Chevrolet", model: "Camaro SS", year: 1969, body: "carro", lo: 45000, hi: 78000, trans: "automatica", drive: "rwd", proyecto: false },
  { make: "Chevrolet", model: "C10 pickup", year: 1967, body: "pickup", lo: 22000, hi: 42000, trans: "manual", drive: "rwd", proyecto: false },
  { make: "Volkswagen", model: "Beetle", year: 1972, body: "carro", lo: 9500, hi: 18000, trans: "manual", drive: "rwd", proyecto: false },
  { make: "Chevrolet", model: "Bel Air", year: 1957, body: "carro", lo: 38000, hi: 68000, trans: "automatica", drive: "rwd", proyecto: false },
  { make: "Dodge", model: "Charger", year: 1974, body: "carro", lo: 8500, hi: 22000, trans: "automatica", drive: "rwd", proyecto: true },
  { make: "Ford", model: "F-100", year: 1966, body: "pickup", lo: 6500, hi: 16000, trans: "manual", drive: "rwd", proyecto: true },
  { make: "Pontiac", model: "Firebird", year: 1978, body: "carro", lo: 7500, hi: 19000, trans: "automatica", drive: "rwd", proyecto: true },
  { make: "Mazda", model: "Miata", year: 1991, body: "carro", lo: 7500, hi: 14000, trans: "manual", drive: "rwd", wmi: "JM1", vds: "NA351" },
  { make: "Toyota", model: "Pickup 4x4", year: 1988, body: "pickup", lo: 9000, hi: 18000, trans: "manual", drive: "4x4", wmi: "JT4", vds: "RN63R" },
  { make: "Buick", model: "Regal Grand National", year: 1987, body: "carro", lo: 24000, hi: 48000, trans: "automatica", drive: "rwd", wmi: "1G4", vds: "GJ47Y" },
  { make: "Jeep", model: "CJ-7", year: 1984, body: "suv", lo: 9000, hi: 21000, trans: "manual", drive: "4x4", wmi: "1JC", vds: "CM87E" },
  { make: "Ford", model: "Bronco", year: 1976, body: "suv", lo: 16000, hi: 38000, trans: "manual", drive: "4x4", proyecto: true },
  { make: "Oldsmobile", model: "Cutlass Supreme", year: 1973, body: "carro", lo: 6500, hi: 14000, trans: "automatica", drive: "rwd", proyecto: true },
].map((m) => ({ ...m, fuel: "gasolina", foto: ["977003", "1974520", "3156482"][m.model.length % 3] }));

export const FAMILIAS = {
  cert: { body: "carro", modelos: [
    C("Toyota", "Camry", ["LE", "SE", "XLE"], "4T1", "BF1FK", 28000, 2018, 2023, { body: "carro", foto: "11285174" }),
    C("Toyota", "Corolla", ["LE", "SE"], "2T1", "BURHE", 22500, 2018, 2023, { body: "carro", foto: "2127039" }),
    C("Honda", "Accord", ["LX", "EX", "Sport"], "1HG", "CR2F3", 28000, 2018, 2023, { body: "carro", trans: "cvt", foto: "16350076" }),
    C("Honda", "CR-V", ["EX", "EX AWD"], "2HK", "RW2H5", 31000, 2018, 2023, { body: "suv", drive: "awd", trans: "cvt", foto: "116675" }),
    C("Toyota", "RAV4", ["XLE", "XLE AWD"], "2T3", "BFREV", 30000, 2018, 2023, { body: "suv", drive: "awd", foto: "28086865" }),
    C("Nissan", "Altima", ["SV", "SR"], "1N4", "AL3AP", 26000, 2018, 2023, { body: "carro", trans: "cvt", foto: "5864402" }),
    C("Hyundai", "Tucson", ["SE", "SEL AWD"], "KM8", "J3CAL", 27000, 2018, 2023, { body: "suv", drive: "awd", foto: "4173197" }),
    C("Ford", "Escape", ["SE", "SEL AWD"], "1FM", "CU9GD", 29000, 2018, 2023, { body: "suv", drive: "awd", foto: "4173197" }),
  ], cert: true },
  lux: { body: "carro", modelos: LUX },
  pickup: { body: "pickup", modelos: PICKUP },
  suv: { body: "suv", modelos: SUV },
  van: { body: "van", modelos: VAN },
  trabajo: { body: "trabajo", modelos: TRABAJO },
  flota: { body: "trabajo", modelos: FLOTA },
  caja: { body: "caja", modelos: CAJA },
  semi: { body: "trailer", modelos: SEMI },
  remolque: { body: "remolque", modelos: REMOLQUE },
  moto: { body: "moto", modelos: MOTO },
  atv: { body: "cuatrimoto", modelos: ATV },
  scooter: { body: "scooter", modelos: SCOOTER },
  bote: { body: "bote", modelos: BOTE },
  rv: { body: "rv", modelos: RV },
  golf: { body: "golf", modelos: GOLF },
  clasico: { body: "carro", clasicos: CLASICO },
  salv: { body: "carro", modelos: [...PICKUP.slice(0, 4), ...SUV.slice(0, 6), ...[
    C("Honda", "Civic", ["LX", "EX", "Sport"], "2HG", "FC2F5", 24000, 2012, 2021, { body: "carro", trans: "cvt", foto: "6794821" }),
    C("Toyota", "Camry", ["LE", "SE"], "4T1", "BF1FK", 28000, 2012, 2021, { body: "carro", foto: "11285174" }),
    C("Nissan", "Altima", ["S", "SV"], "1N4", "AL3AP", 26000, 2012, 2021, { body: "carro", trans: "cvt", foto: "5864402" }),
  ].map((m) => ({ ...m }))] },
  broker: { body: "carro", modelos: [...SUV.slice(0, 5), ...PICKUP.slice(0, 3), ...VAN.slice(0, 2), ...[
    C("Toyota", "Corolla", ["LE", "SE"], "2T1", "BURHE", 22500, 2012, 2022, { body: "carro", trans: "cvt", foto: "2127039" }),
    C("Honda", "Accord", ["LX", "EX"], "1HG", "CR2F3", 28000, 2012, 2022, { body: "carro", trans: "cvt", foto: "16350076" }),
    C("Honda", "Civic", ["LX", "EX"], "2HG", "FC2F5", 24000, 2012, 2022, { body: "carro", trans: "cvt", foto: "6794821" }),
    C("Toyota", "Camry", ["LE", "SE"], "4T1", "BF1FK", 28000, 2012, 2022, { body: "carro", foto: "11285174" }),
  ]] },
  casa: { body: "carro", modelos: [...SUV.slice(0, 4), ...PICKUP.slice(0, 2), ...[
    C("Honda", "Civic", ["LX", "EX", "Sport"], "2HG", "FC2F5", 24000, 2013, 2022, { body: "carro", trans: "cvt", foto: "6794821" }),
    C("Toyota", "Camry", ["LE", "SE", "XLE"], "4T1", "BF1FK", 28000, 2013, 2022, { body: "carro", foto: "11285174" }),
    C("Toyota", "Corolla", ["LE", "SE"], "2T1", "BURHE", 22500, 2013, 2022, { body: "carro", trans: "cvt", foto: "2127039" }),
    C("Honda", "Accord", ["LX", "EX"], "1HG", "CR2F3", 28000, 2013, 2022, { body: "carro", trans: "cvt", foto: "16350076" }),
  ]] },
};
FAMILIAS.dueno = FAMILIAS.broker;
FAMILIAS.consig = FAMILIAS.broker;
