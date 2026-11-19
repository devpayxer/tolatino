-- 9t · La Tabla del Barrio: el «ganador del mes» (mb.position = 1) se buscaba recorriendo toda la ciudad (61 ms con 580 mil vecinos en la carga;
-- lo más lento de la Tabla después de 0188). Un índice parcial: solo las filas con el puesto 1 (una por ciudad y mes cerrado).
create index if not exists monthly_boards_ganador_idx on monthly_boards (city_id, month) where position = 1;
