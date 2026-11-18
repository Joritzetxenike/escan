/* =======================================================
 * RPC: guardar_movimiento v2
 * =======================================================
 *
 * Sustituye a 20261113000100_rpc_guardar_movimiento.sql. Misma
 * firma y mismo resultado: la app no cambia su llamada.
 *
 * 1. Asignación al enum `stat` (antes fallaba siempre)
 *    La v1 hacía `set stat = 'Proceso'::text`. `stat` es un enum
 *    y Postgres no convierte por asignación de `text` a enum:
 *    cada llamada fallaba con `column "stat" is of type ... but
 *    expression is of type text`. PL/pgSQL no comprueba tipos al
 *    crear la función, por eso la migración se aplicaba sin
 *    error. Aquí se usa un literal SIN tipo ('Proceso'), que se
 *    resuelve al tipo de la columna sea cual sea el nombre del
 *    enum.
 *
 * 2. Ubicación inexistente → error
 *    `conteo.ubicacion` no tiene FK. La v1 guardaba igualmente
 *    filas de ubicaciones que no existen en el maestro.
 *
 * 3. Ubicación en `Fin` → error
 *    La v1 ponía `Proceso` sin mirar nada: un guardado que
 *    llegaba tarde (cola offline, otro dispositivo) reabría una
 *    ubicación ya terminada y su área/sección. Ahora se rechaza
 *    con `hint = 'UBICACION_TERMINADA'`, que la app reconoce.
 *
 * 4. Serialización por sección
 *    Se bloquea la fila de la sección antes de tocar nada, igual
 *    que `actualizar_estado_ubicacion` (web-admin). Así un
 *    guardado y una finalización simultáneos de la misma sección
 *    no se cruzan (uno espera al otro y ve su resultado).
 *
 * Errores (para PostgREST / supabase-js):
 *   P0002  Ubicación no encontrada
 *   P0001  Ubicación terminada   (hint: UBICACION_TERMINADA)
 * ======================================================= */

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
  v_stat text;
begin
  -- Parsear seccion-area-subzona
  v_seccion := split_part(p_ubicacion, '-', 1);
  v_area    := split_part(p_ubicacion, '-', 2);
  v_subzona := split_part(p_ubicacion, '-', 3);

  -- Serializar por sección (mismo orden de bloqueo que el web-admin)
  perform 1
     from public."maestroSeccion"
    where seccion = v_seccion
      for update;

  -- La ubicación debe existir y no estar terminada
  select stat::text
    into v_stat
    from public."maestroUbicacion"
   where seccion = v_seccion
     and area = v_area
     and subzona = v_subzona
     for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Ubicación no encontrada: %s', p_ubicacion);
  end if;

  if v_stat = 'Fin' then
    raise exception using
      errcode = 'P0001',
      message = format('La ubicación %s está terminada y no admite más movimientos', p_ubicacion),
      hint = 'UBICACION_TERMINADA';
  end if;

  -- 1. Upsert en conteo (PK compuesta ubicacion,item)
  insert into public."conteo" (ubicacion, item, cant, matricula, updated_at)
  values (p_ubicacion, p_articulo, p_cantidad, p_matricula, now())
  on conflict (ubicacion, item) do update
    set cant = excluded.cant,
        matricula = coalesce(excluded.matricula, public."conteo".matricula),
        updated_at = now();

  -- 2. Ubicacion => Proceso (literal sin tipo: se adapta al enum)
  update public."maestroUbicacion"
     set stat = 'Proceso'
   where seccion = v_seccion
     and area = v_area
     and subzona = v_subzona;

  -- 3. Area => Proceso
  update public."maestroArea"
     set stat = 'Proceso'
   where seccion = v_seccion
     and area = v_area;

  -- 4. Seccion => Proceso
  update public."maestroSeccion"
     set stat = 'Proceso'
   where seccion = v_seccion;

  return jsonb_build_object(
    'ubicacion', p_ubicacion,
    'articulo', p_articulo,
    'cantidad', p_cantidad,
    'matricula', p_matricula,
    'stat', 'Proceso'
  );
end;
$$;

comment on function public.guardar_movimiento(character varying, character varying, smallint, character varying)
  is 'Upsert transaccional en conteo + Proceso en ubicacion/area/seccion. Rechaza ubicaciones inexistentes o en Fin';

grant execute on function public.guardar_movimiento(character varying, character varying, smallint, character varying) to anon, authenticated;
