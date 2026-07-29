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

  if (error) {
    console.error('Error obteniendo estructura de ubicaciones:', error);
    throw error;
  }

  return (data || []).map((seccion) => ({
    seccion: seccion.seccion,
    stat: seccion.stat,

    areas: (seccion.maestroArea || []).map((area) => ({
      area: area.area,
      stat: area.stat,

      ubicaciones: (area.maestroUbicacion || []).map((ubicacion) => ({
        subzona: ubicacion.subzona,
        stat: ubicacion.stat,

        ubicacion:
          `${seccion.seccion}-${area.area}-${ubicacion.subzona}`,
      })),
    })),
  }));
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

  console.log('=== GUARDAR MOVIMIENTO ===');
  console.log('Ubicación:', ubicacion);
  console.log('Artículo:', articulo);
  console.log('Cantidad:', cantidad);

  // ==========================================
  // 1. GUARDAR CONTEO
  // ==========================================

  const { data, error } = await supabase
    .from('conteo')
    .upsert(
      {
        ubicacion,
        item: articulo,
        cant: cantidad,
      },
      {
        onConflict: 'ubicacion,item',
      }
    )
    .select()
    .single();

  console.log('CONTEO:', data);
  console.log('ERROR CONTEO:', error);

  if (error) throw error;


  const [seccion, area, subzona] = ubicacion.split('-');

  // ==========================================
  // 2. UBICACIÓN
  // ==========================================

  console.log('Actualizando maestroUbicacion...');

  const { data: ubicacionData, error: ubicacionError } = await supabase
    .from('maestroUbicacion')
    .update({ stat: 'Proceso' })
    .eq('seccion', seccion)
    .eq('area', area)
    .eq('subzona', subzona)
    .select();

  console.log('UBICACION DATA:', ubicacionData);
  console.log('UBICACION ERROR:', ubicacionError);

  if (ubicacionError) throw ubicacionError;


  // ==========================================
  // 3. ÁREA
  // ==========================================

  console.log('Actualizando maestroArea...');

  const { data: areaData, error: areaError } = await supabase
    .from('maestroArea')
    .update({ stat: 'Proceso' })
    .eq('seccion', seccion)
    .eq('area', area)
    .select();

  console.log('AREA DATA:', areaData);
  console.log('AREA ERROR:', areaError);

  if (areaError) throw areaError;


  // ==========================================
  // 4. SECCIÓN
  // ==========================================

  console.log('Actualizando maestroSeccion...');

  const { data: seccionData, error: seccionError } = await supabase
    .from('maestroSeccion')
    .update({ stat: 'Proceso' })
    .eq('seccion', seccion)
    .select();

  console.log('SECCION DATA:', seccionData);
  console.log('SECCION ERROR:', seccionError);

  if (seccionError) throw seccionError;


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