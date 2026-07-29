// Ajusta la ruta si tu archivo del cliente está en otro lugar
import supabase from '../supabaseClient';

/**
 * NOTAS / SUPUESTOS sobre el esquema recibido:
 *
 * 1. No existe una tabla "movimientos" en el esquema. Se usa la tabla
 *    `conteo` (ubicacion, item, cant) como el equivalente a "movimiento".
 *
 * 2. `conteo.ubicacion` es un varchar que codifica toda la fila de
 *    `maestroUbicacion` en un solo valor, con formato
 *    "seccion-area-subzona" (p.ej. "xx-yy-zz"). Esto coincide con lo
 *    que ya hace CsvProvider (un archivo por ubicación, mismo string).
 *
 * 3. Hacia afuera, esta clase usa los mismos nombres de campo que
 *    CsvProvider: `ubicacion`, `articulo`, `cantidad` — aunque en la
 *    tabla `conteo` las columnas reales se llamen `item` y `cant`.
 *    Así ambos providers son intercambiables sin tocar el resto de la app.
 *
 * 4. `conteo` no tiene columna de fecha/hora, así que
 *    `obtenerUltimosMovimientos` no puede ordenar por fecha real.
 *    Se ordena por `ubicacion, item` como aproximación. Si necesitas
 *    orden cronológico real, habría que añadir una columna
 *    `updated_at timestamp default now()` a la tabla `conteo`.
 */

// ---------- Helpers de formato de ubicación ----------

function buildUbicacionId(seccion, area, subzona) {
  return `${seccion}-${area}-${subzona}`;
}

function parseUbicacionId(ubicacionId) {
  const [seccion, area, subzona] = ubicacionId.split('-');
  return { seccion, area, subzona };
}

const SupabaseProvider = {
  /* =======================================================
   * UBICACIONES
   * ======================================================= */

  async obtenerUbicaciones() {
    const { data, error } = await supabase
      .from('maestroUbicacion')
      .select('seccion, area, subzona, stat');

    if (error) throw error;

    return (data || []).map((u) => ({
      ubicacion: buildUbicacionId(u.seccion, u.area, u.subzona),
      seccion: u.seccion,
      area: u.area,
      subzona: u.subzona,
      stat: u.stat,
    }));
  },

  async obtenerEstadoUbicaciones() {
    const { data, error } = await supabase
      .from('maestroUbicacion')
      .select('seccion, area, subzona, stat');

    if (error) throw error;

    return (data || []).map((u) => ({
      ubicacion: buildUbicacionId(u.seccion, u.area, u.subzona),
      stat: u.stat,
    }));
  },

  async obtenerArticulosUbicacion(ubicacion) {
    const { data, error } = await supabase
      .from('conteo')
      .select(
        `
        item,
        cant,
        ubicacion,
        maestroArticulo (
          dsca,
          tipo
        )
      `
      )
      .eq('ubicacion', ubicacion);

    if (error) throw error;

    return (data || []).map((row) => ({
      ubicacion: row.ubicacion,
      articulo: row.item,
      cantidad: row.cant,
      dsca: row.maestroArticulo?.dsca ?? null,
      tipo: row.maestroArticulo?.tipo ?? null,
    }));
  },

  /* =======================================================
   * ARTÍCULOS
   * ======================================================= */

  async existeArticulo(codigoArticulo) {
    const { data, error } = await supabase
      .from('maestroArticulo')
      .select('item')
      .eq('item', codigoArticulo)
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  },

  async obtenerArticulo(codigoArticulo) {
    const { data, error } = await supabase
      .from('maestroArticulo')
      .select('item, dsca, tipo')
      .eq('item', codigoArticulo)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /* =======================================================
   * MOVIMIENTOS (tabla `conteo`)
   * ======================================================= */

  async guardarMovimiento({ ubicacion, articulo, cantidad }) {
    const { data, error } = await supabase
      .from('conteo')
      .upsert(
        { ubicacion, item: articulo, cant: cantidad },
        { onConflict: 'ubicacion,item' }
      )
      .select()
      .single();

    if (error) throw error;

    return {
      ubicacion: data.ubicacion,
      articulo: data.item,
      cantidad: data.cant,
    };
  },

  async actualizarMovimiento({ ubicacion, articulo, cantidad }) {
    const { data, error } = await supabase
      .from('conteo')
      .update({ cant: cantidad })
      .eq('ubicacion', ubicacion)
      .eq('item', articulo)
      .select()
      .single();

    if (error) throw error;

    return {
      ubicacion: data.ubicacion,
      articulo: data.item,
      cantidad: data.cant,
    };
  },

  async eliminarMovimiento(ubicacion, articulo) {
    const { error } = await supabase
      .from('conteo')
      .delete()
      .eq('ubicacion', ubicacion)
      .eq('item', articulo);

    if (error) throw error;
    return true;
  },

  async obtenerUltimosMovimientos(limite = 20) {
    // No hay columna de fecha en `conteo`; se ordena por ubicacion/item
    // como aproximación. Ver nota al inicio del archivo.
    const { data, error } = await supabase
      .from('conteo')
      .select(
        `
        ubicacion,
        item,
        cant,
        maestroArticulo (
          dsca,
          tipo
        )
      `
      )
      .order('ubicacion', { ascending: false })
      .order('item', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return (data || []).map((row) => ({
      ubicacion: row.ubicacion,
      articulo: row.item,
      cantidad: row.cant,
      dsca: row.maestroArticulo?.dsca ?? null,
      tipo: row.maestroArticulo?.tipo ?? null,
    }));
  },

  /* =======================================================
   * SINCRONIZACIÓN
   * ======================================================= */

  async estaDisponible() {
    // Consulta ligera para comprobar conectividad con Supabase
    const { error } = await supabase
      .from('maestroSeccion')
      .select('seccion', { count: 'exact', head: true });

    return !error;
  },

  async sincronizar() {
    // Supabase trabaja en tiempo real (no hay cola local que sincronizar
    // en este provider). Se deja como no-op para cumplir la interfaz.
    // Si en el futuro añades una cola offline (p.ej. AsyncStorage),
    // implementa aquí el envío de los movimientos pendientes.
    return true;
  },
};

export default SupabaseProvider;