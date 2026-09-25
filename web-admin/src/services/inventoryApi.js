import { getSupabase } from '../lib/supabase';
import { STATUSES, resumirEstados } from '../lib/estados';

const normalizeSearch = (value) =>
  value
    .trim()
    .replace(/[%_,()]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function obtenerResumen() {
  const client = getSupabase();
  const { data, error } = await client
    .from('maestroSeccion')
    .select(
      'seccion, stat, maestroArea(area, stat, maestroUbicacion(subzona, stat))',
    )
    .order('seccion', { ascending: true });

  if (error) {
    throw error;
  }

  return resumirEstados(data || []);
}

export async function listarUbicaciones({
  seccion = '',
  area = '',
  estado = '',
  search = '',
  page = 1,
  pageSize = 25,
} = {}) {
  const client = getSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = client
    .from('maestroUbicacion')
    .select('seccion, area, subzona, stat', { count: 'exact' });

  if (seccion) {
    query = query.eq('seccion', seccion);
  }

  if (area) {
    query = query.eq('area', area);
  }

  if (estado) {
    query = query.eq('stat', estado);
  }

  const cleanSearch = normalizeSearch(search);

  if (cleanSearch) {
    query = query.or(
      [
        `seccion.ilike.%${cleanSearch}%`,
        `area.ilike.%${cleanSearch}%`,
        `subzona.ilike.%${cleanSearch}%`,
      ].join(','),
    );
  }

  const { data, error, count } = await query
    .order('seccion', { ascending: true })
    .order('area', { ascending: true })
    .order('subzona', { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    items: (data || []).map((row) => ({
      ...row,
      ubicacion: `${row.seccion}-${row.area}-${row.subzona}`,
    })),
    total: count || 0,
  };
}

export async function obtenerArticulosUbicacion({
  ubicacion,
  page = 1,
  pageSize = 25,
} = {}) {
  const client = getSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client
    .from('conteo')
    .select(
      'ubicacion, item, cant, maestroArticulo(dsca, tipo)',
      { count: 'exact' },
    )
    .eq('ubicacion', ubicacion)
    .order('item', { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    items: (data || []).map((row) => ({
      ubicacion: row.ubicacion,
      articulo: row.item,
      cantidad: row.cant,
      descripcion: row.maestroArticulo?.dsca || '',
      tipo: row.maestroArticulo?.tipo || '',
    })),
    total: count || 0,
  };
}

export async function actualizarEstadoUbicacion({
  seccion,
  area,
  subzona,
  stat,
}) {
  if (!STATUSES.includes(stat)) {
    throw new Error('El estado seleccionado no es válido');
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('actualizar_estado_ubicacion', {
    p_seccion: seccion,
    p_area: area,
    p_subzona: subzona,
    p_stat: stat,
  });

  if (error) {
    throw error;
  }

  return data;
}
