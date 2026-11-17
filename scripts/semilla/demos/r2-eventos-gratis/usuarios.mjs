/* Vecinos de prueba para los RSVP: 500 usuarios ficticios, +1 717 555 7500 – 7999 (rango reservado de este generador), 100 por ciudad. */
import { CIUDADES } from "./plantillas.mjs";

const NOMBRES = ["Camila", "Mateo", "Valentina", "Santiago", "Isabela", "Sebastián", "Daniela", "Nicolás", "Lucía", "Emiliano", "Mariana", "Joaquín", "Paula", "Andrés", "Renata", "Gabriel",
  "Carolina", "Samuel", "Natalia", "Diego", "Fernanda", "Tomás", "Alejandra", "Martín", "Ximena", "Rafael", "Julieta", "Esteban", "Andrea", "Leandro", "Sofía", "Iván",
  "Karla", "Bruno", "Elena", "Hugo", "Yesenia", "Omar", "Marisol", "Ernesto", "Rosa", "Felipe", "Jazmín", "Arturo", "Miriam", "Cristian", "Patricia", "Ramiro", "Noemí", "Julián"];
const APELLIDOS = ["Rivera", "Mendoza", "Castillo", "Ortega", "Salazar", "Vargas", "Peña", "Guerrero", "Ibarra", "Domínguez", "Cabrera", "Fuentes", "Núñez", "Rojas", "Maldonado", "Aguirre",
  "Paredes", "Villalobos", "Acosta", "Benítez", "Cordero", "Delgado", "Espinoza", "Figueroa", "Gallegos", "Herrera", "Lara", "Montes", "Navarro", "Orozco", "Quintero", "Reyes",
  "Solís", "Tapia", "Urbina", "Valdez", "Zamora", "Bautista", "Cruz", "Durán"];

export const PRIMER = 7500, TOTAL = 500;
export const usuarios = () => Array.from({ length: TOTAL }, (_, i) => ({
  p: `+1717555${PRIMER + i}`,
  f: NOMBRES[(i * 7 + 3) % NOMBRES.length],
  l: APELLIDOS[(i * 11 + Math.floor(i / 40)) % APELLIDOS.length],
  c: CIUDADES[Math.floor(i / 100)],
  g: i % 9 === 0 ? "en" : "es",
  i,
}));
