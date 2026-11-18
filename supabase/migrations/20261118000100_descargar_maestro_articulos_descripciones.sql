/* =======================================================
 * COPIA LOCAL DEL MAESTRO — DESCRIPCIONES + TIEMPO MÁXIMO
 * =======================================================
 *
 * Sustituye a 20261118000000_descargar_maestro_articulos_unidades.sql.
 * Devuelve lo mismo (`codigos`, `sic`, `genericos`,
 * `unidad_defecto`, `unidades`) y además:
 *
 *   descripciones : { item: dsca }
 *
 * La app ya sabía guardarlas y mostrarlas (pantalla del CSV en
 * Lista, modal de cantidad, artículo ya contado, entrada manual,
 * últimos escaneados), pero la RPC no las mandaba y salía `—`.
 * Con ellas se ven también SIN conexión.
 *
 * Coste: la descarga pasa de ~4 MB a ~14 MB (se comprime bien
 * por HTTP). Se omiten las descripciones vacías o `-` porque la
 * app ya muestra `—` cuando no hay.
 *
 * TIEMPO MÁXIMO
 * Las peticiones con la clave pública (`anon`) tienen un
 * `statement_timeout` corto (~3 s). Con ~279.000 artículos la
 * versión anterior ya tardaba 1,4 s en caliente y fallaba por
 * tiempo en frío ("canceling statement due to statement
 * timeout"). Con las descripciones tarda más. `set
 * statement_timeout` en la función lo amplía SOLO para esta
 * llamada (PostgREST aplica los ajustes de la función a la
 * transacción); el resto de peticiones de `anon` siguen con su
 * límite.
 * ======================================================= */

create or replace function public.descargar_maestro_articulos()
returns jsonb
language sql
stable
set search_path = public
set statement_timeout = '30s'
as $$
  with defecto as (
    select m.unit
      from public."maestroArticulo" m
     where m.unit is not null
     group by m.unit
     order by count(*) desc
     limit 1
  )
  select jsonb_build_object(
    'codigos',
      coalesce(
        (select jsonb_agg(m.item) from public."maestroArticulo" m),
        '[]'::jsonb
      ),
    'sic',
      coalesce(
        (
          select jsonb_agg(m.item)
            from public."maestroArticulo" m
           where upper(m.tipo::text) = 'SIC'
        ),
        '[]'::jsonb
      ),
    'genericos',
      coalesce(
        (
          select jsonb_agg(m.item)
            from public."maestroArticulo" m
           where upper(m.tipo::text) in ('GEN', 'GENERICO')
        ),
        '[]'::jsonb
      ),
    'descripciones',
      coalesce(
        (
          select jsonb_object_agg(m.item, m.dsca)
            from public."maestroArticulo" m
           where m.dsca is not null
             and m.dsca not in ('', '-')
        ),
        '{}'::jsonb
      ),
    'unidad_defecto',
      (select unit from defecto),
    'unidades',
      coalesce(
        (
          select jsonb_object_agg(m.item, coalesce(m.unit, ''))
            from public."maestroArticulo" m
           where m.unit is distinct from (select unit from defecto)
        ),
        '{}'::jsonb
      )
  );
$$;

comment on function public.descargar_maestro_articulos()
  is 'Maestro de artículos para la copia local: {codigos, sic, genericos, descripciones, unidad_defecto, unidades (solo excepciones)}';

grant execute on function public.descargar_maestro_articulos()
  to anon, authenticated;
