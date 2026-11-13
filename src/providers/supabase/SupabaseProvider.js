// Ajusta la ruta si tu archivo del cliente está en otro lugar
import supabase from './supabaseClient';

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
 * 4. `conteo` tiene columna `updated_at timestamp default now()`.
 *    `obtenerUltimosMovimientos` ordena por ella para obtener el
 *    orden cronológico real de los movimientos.
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

  async obtenerSecciones() {
    const { data, error } = await supabase
      .from('maestroSeccion')
      .select('seccion, stat')
      .order('seccion', { ascending: true });

    if (error) {
      console.error('Error obteniendo secciones:', error);
      throw error;
    }

    return data || [];
  },

  async obtenerAreas(seccion) {
    const { data, error } = await supabase
      .from('maestroArea')
      .select('area, stat')
      .eq('seccion', seccion)
      .order('area', { ascending: true });

    if (error) throw error;

    return data || [];
  },

  async obtenerUbicacionesArea(seccion, area) {
    const { data, error } = await supabase
      .from('maestroUbicacion')
      .select('subzona, stat')
      .eq('seccion', seccion)
      .eq('area', area)
      .order('subzona', { ascending: true });

    if (error) throw error;

    return (data || []).map((ubicacion) => ({
      subzona: ubicacion.subzona,
      stat: ubicacion.stat,
      ubicacion:
        `${seccion}-${area}-${ubicacion.subzona}`,
    }));
  },

  async finalizarUbicacion(ubicacion) {
    const [seccion, area, subzona] = ubicacion.split('-');

    if (!seccion || !area || !subzona) {
      throw new Error('Código de ubicación inválido');
    }

    const { data, error } = await supabase.rpc(
      'finalizar_ubicacion',
      {
        p_seccion: seccion,
        p_area: area,
        p_subzona: subzona,
      }
    );

    if (error) throw error;

    return {
      seccion: data?.seccion ?? seccion,
      area: data?.area ?? area,
      subzona: data?.subzona ?? subzona,
      stat: data?.stat ?? 'Fin',
    };
  },

  async obtenerEstadoUbicaciones() {
  const { data, error } = await supabase
    .from('maestroSeccion')
    .select(`
      seccion,
      stat,
      maestroArea (
        area,
        stat,
        maestroUbicacion (
          subzona,
          stat
        )
      )
    `);

  if (error) throw error;

  return data;
},

  async obtenerUbicacion(codigoUbicacion) {
    const { seccion, area, subzona } =
      parseUbicacionId(codigoUbicacion);

    if (!seccion || !area || !subzona) {
      return null;
    }

    const { data, error } = await supabase
      .from('maestroUbicacion')
      .select('seccion, area, subzona, stat')
      .eq('seccion', seccion)
      .eq('area', area)
      .eq('subzona', subzona)
      .maybeSingle();

    if (error) throw error;
    return data;
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
   * MAESTRO COMPLETO (copia local offline)
   * ======================================================= */

  /**
   * Descarga TODO el maestro de artículos de una sola vez.
   *
   * Son ~211.000 filas, así que pedirlas por REST serían ~212
   * peticiones (PostgREST devuelve 1.000 por petición) y unos
   * 40 segundos. La RPC `descargar_maestro_articulos()` lo
   * resuelve en una.
   *
   * Devuelve `{ codigos, sic, genericos }`: solo lo
   * necesario para validar y para avisar de los SIC y
   * rechazar los genéricos. No se copia `dsca` porque ocupa
   * la mitad del tamaño y el CSV local tampoco la guarda.
   *
   * Ver `supabase/migrations/20261014_maestro_genericos.sql`.
   */
  async obtenerMaestroArticulos() {

    const { data, error } = await supabase.rpc(
      'descargar_maestro_articulos'
    );

    if (error) throw error;

    return {
      codigos: data?.codigos ?? [],
      sic: data?.sic ?? [],
      genericos: data?.genericos ?? [],
      descripciones: data?.descripciones ?? {},
      unidades: data?.unidades ?? {},
    };
  },

  /* =======================================================
   * MOVIMIENTOS (tabla `conteo`)
   * ======================================================= */

  async guardarMovimiento({ ubicacion, articulo, cantidad, matricula }) {

    const { data, error } = await supabase.rpc(
      'guardar_movimiento',
      {
        p_ubicacion: ubicacion,
        p_articulo: articulo,
        p_cantidad: cantidad,
        p_matricula: matricula ?? null,
      }
    );

    if (error) throw error;

    return {
      ubicacion: data?.ubicacion ?? ubicacion,
      articulo: data?.articulo ?? articulo,
      cantidad: data?.cantidad ?? cantidad,
      matricula: data?.matricula ?? matricula ?? null,
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
    const { data, error } = await supabase
      .from('conteo')
      .select(
        `
        ubicacion,
        item,
        cant,
        matricula,
        updated_at,
        maestroArticulo (
          dsca,
          tipo
        )
      `
      )
      .order('updated_at', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return (data || []).map((row) => ({
      ubicacion: row.ubicacion,
      articulo: row.item,
      cantidad: row.cant,
      matricula: row.matricula ?? null,
      updated_at: row.updated_at ?? null,
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