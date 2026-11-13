/* =======================================================
 * RPC: guardar_movimiento (transaccional)
 * =======================================================
 *
 * Aplica en UNA sola transacción:
 *   1. upsert en conteo (ubicacion, item, cant, matricula, updated_at)
 *   2. maestroUbicacion.stat = 'Proceso'
 *   3. maestroArea.stat = 'Proceso'
 *   4. maestroSeccion.stat = 'Proceso'
 *
 * Si cualquiera de las 4 falla, se deshace todo. Evita el
 * estado intermedio que dejaban las 4 peticiones separadas
 * desde el cliente.
 *
 * Los nombres de tabla llevan comillas dobles porque en esta
 * BD se crearon entrecomilladas (maximoArticulo, conteo, etc.)
 * y Postgres las pliega a minusculas sin comillas.
 *
 * El tipo stat es un enum; se compara como texto.
 */

create or replace function public.guardar_movimiento(
  p_ubicacion character varying,
  p_articulo character varying,
  p_cantidad smallint,
  p_matricula character varying default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_seccion text;
  v_area text;
  v_subzona text;
  v_result jsonb;
begin
  -- Parsear seccion-area-subzona
  v_seccion := split_part(p_ubicacion, '-', 1);
  v_area    := split_part(p_ubicacion, '-', 2);
  v_subzona := split_part(p_ubicacion, '-', 3);

  -- 1. Upsert en conteo (PK compuesta ubicacion,item)
  insert into public."conteo" (ubicacion, item, cant, matricula, updated_at)
  values (p_ubicacion, p_articulo, p_cantidad, p_matricula, now())
  on conflict (ubicacion, item) do update
    set cant = excluded.cant,
        matricula = coalesce(excluded.matricula, public."conteo".matricula),
        updated_at = now();

  -- 2. Ubicacion => Proceso
  update public."maestroUbicacion"
     set stat = 'Proceso'::text
   where seccion = v_seccion
     and area = v_area
     and subzona = v_subzona;

  -- 3. Area => Proceso (solo si existe el area para esa seccion)
  update public."maestroArea"
     set stat = 'Proceso'::text
   where seccion = v_seccion
     and area = v_area;

  -- 4. Seccion => Proceso
  update public."maestroSeccion"
     set stat = 'Proceso'::text
   where seccion = v_seccion;

  v_result := jsonb_build_object(
    'ubicacion', p_ubicacion,
    'articulo', p_articulo,
    'cantidad', p_cantidad,
    'matricula', p_matricula,
    'stat', 'Proceso'
  );

  return v_result;
end;
$$;

comment on function public.guardar_movimiento(character varying, character varying, smallint, character varying)
  is 'Upsert transaccional en conteo + propaga Proceso a ubicacion/area/seccion';

grant execute on function public.guardar_movimiento(character varying, character varying, smallint, character varying) to anon, authenticated;
