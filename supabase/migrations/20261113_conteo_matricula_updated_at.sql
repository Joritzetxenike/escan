/* =======================================================
 * CONTEO: añadir matricula y updated_at
 * =======================================================
 *
 * - matricula: guarda el operario que registro el movimiento.
 *   Se rellena desde authService.obtenerMatricula() en la app.
 *   Columna nullable al inicio para no romper consultas
 *   existentes ni datos historicos.
 * - updated_at: marca de tiempo real de cada upsert, para
 *   ordenar los "ultimos movimientos" cronologicamente.
 *
 * Ambas columnas se añaden sin NOT NULL para mantener
 * compatibilidad con filas ya insertadas.
 */

alter table public."conteo"
  add column if not exists matricula character varying;

alter table public."conteo"
  add column if not exists updated_at timestamp with time zone default now();

comment on column public."conteo".matricula is
  'Matricula del operario que realizo el movimiento';
comment on column public."conteo".updated_at is
  'Fecha y hora de la ultima actualizacion de la fila';
