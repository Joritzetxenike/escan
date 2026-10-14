/* =======================================================
 * COPIA LOCAL DEL MAESTRO DE ARTÍCULOS — GENÉRICOS
 * =======================================================
 *
 * La validación local ya distinguía MRP y SIC: `codigos`
 * trae todos los `item` y `sic` el subconjunto de tipo SIC,
 * para avisar al operario sin volver a consultar.
 *
 * Faltaba saber qué artículos son genéricos. En el maestro
 * los tipos son MRP, SIC y genérico, así que se añade
 * `genericos` con el mismo patrón que `sic`: una llamada más
 * dentro de la misma RPC (una sola petición, sin tocar la
 * red más veces).
 *
 * El tipo es un enum (`public.tipo`), no texto: hay que
 * castear a `::text` para poder comparar.
 *
 * NOTA: convive con la definición de
 * `20261004_maestro_snapshot.sql`; este fichero la reemplaza
 * añadiendo `genericos`.
 * ======================================================= */

create or replace function public.descargar_maestro_articulos()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'codigos',
      coalesce(
        (
          select jsonb_agg(m.item)
          from public."maestroArticulo" m
        ),
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
      )
  );
$$;

comment on function public.descargar_maestro_articulos()
  is 'Devuelve {codigos, sic, genericos}: maestro de artículos para la copia local offline';

grant execute on function public.descargar_maestro_articulos()
  to anon, authenticated;
