/* =======================================================
 * RPC: finalizar_ubicacion (transaccional)
 * =======================================================
 *
 * Aplica en UNA sola transacción:
 *   1. maestroUbicacion.stat = 'Fin'
 *   2. Si todas las ubicaciones del area estan en 'Fin'
 *      => maestroArea.stat = 'Fin'
 *   3. Si todas las areas de la seccion estan en 'Fin'
 *      => maestroSeccion.stat = 'Fin'
 *
 * Si cualquier paso falla, se deshace todo. Evita el estado
 * intermedio que dejaban las 5 peticiones separadas desde el
 * cliente.
 *
 * Los nombres de tabla llevan comillas dobles porque en esta
 * BD se crearon entrecomilladas y Postgres las pliega a
 * minusculas sin comillas.
 *
 * El tipo stat es un enum; se caste a ::text para comparar y
 * se asigna con ::"Stat" para respetar el tipo enum.
 */

create or replace function public.finalizar_ubicacion(
  p_seccion character varying,
  p_area character varying,
  p_subzona character varying
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_total_ubicaciones integer;
  v_ubicaciones_fin integer;
  v_total_areas integer;
  v_areas_fin integer;
  v_result jsonb;
begin
  -- Verificar que la ubicacion existe
  perform 1
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area
     and subzona = p_subzona
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ubicacion no encontrada';
  end if;

  -- 1. Ubicacion => Fin
  update public."maestroUbicacion"
     set stat = 'Fin'::"Stat"
   where seccion = p_seccion
     and area = p_area
     and subzona = p_subzona;

  -- 2. Verificar si todas las ubicaciones del area estan en Fin
  select count(*),
         count(*) filter (where stat::text = 'Fin')
    into v_total_ubicaciones, v_ubicaciones_fin
    from public."maestroUbicacion"
   where seccion = p_seccion
     and area = p_area;

  if v_total_ubicaciones > 0
     and v_ubicaciones_fin = v_total_ubicaciones then

    update public."maestroArea"
       set stat = 'Fin'::"Stat"
     where seccion = p_seccion
       and area = p_area;

    -- 3. Verificar si todas las areas de la seccion estan en Fin
    select count(*),
           count(*) filter (where stat::text = 'Fin')
      into v_total_areas, v_areas_fin
      from public."maestroArea"
     where seccion = p_seccion;

    if v_total_areas > 0
       and v_areas_fin = v_total_areas then

      update public."maestroSeccion"
         set stat = 'Fin'::"Stat"
       where seccion = p_seccion;

    end if;

  end if;

  v_result := jsonb_build_object(
    'seccion', p_seccion,
    'area', p_area,
    'subzona', p_subzona,
    'ubicacion', concat_ws('-', p_seccion, p_area, p_subzona),
    'stat', 'Fin'
  );

  return v_result;
end;
$$;

comment on function public.finalizar_ubicacion(character varying, character varying, character varying)
  is 'Finaliza una ubicacion y propaga Fin a area/seccion si corresponde, en una transaccion';

grant execute on function public.finalizar_ubicacion(character varying, character varying, character varying) to anon, authenticated;
